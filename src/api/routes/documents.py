"""
Document Management and Processing System for NGI Capital
Production-ready document ingestion with:
- Text extraction (PDF via pdfplumber/PyMuPDF fallback pypdf, DOCX via python-docx, images via PaddleOCR or Tesseract)
- Invoice/receipt parsing (invoice2data when available; regex fallback)
- Classification (Invoice, Receipt, Statement, Contract, Other)
- Persistence of structured metadata + raw text (doc_metadata table)
- Auto-creation of Draft Journal Entries (balanced) using simple vendor mapping rules
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, status, Depends, Query
from typing import List, Optional, Dict, Any, Tuple
import os
import uuid
from datetime import datetime, timezone
import logging
import json
import re
from pathlib import Path
import sqlite3
from src.api.config import get_database_path
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text
from src.api.database import get_db

# Document processing libraries (best-effort imports)
try:
    import pdfplumber  # type: ignore
except Exception:  # pragma: no cover - optional
    pdfplumber = None  # type: ignore
try:
    import fitz  # PyMuPDF
except Exception:  # pragma: no cover - optional
    fitz = None  # type: ignore
try:
    import pypdf  # fallback PDF text
except Exception:  # pragma: no cover - optional
    pypdf = None  # type: ignore
try:
    from docx import Document as DocxDocument
except Exception:  # pragma: no cover - optional
    DocxDocument = None  # type: ignore
try:
    # Prefer PaddleOCR if available
    from paddleocr import PaddleOCR  # type: ignore
    _paddle_ocr = PaddleOCR(use_angle_cls=True, lang='en')  # heavy; initialize lazily if import ok
except Exception:  # pragma: no cover - optional
    _paddle_ocr = None
    try:
        import pytesseract  # type: ignore
        from PIL import Image  # type: ignore
    except Exception:
        pytesseract = None  # type: ignore
        Image = None  # type: ignore
try:
    # Invoice/receipt extraction
    from invoice2data.extract import extract_data as i2d_extract  # type: ignore
except Exception:  # pragma: no cover - optional
    i2d_extract = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

# Document storage configuration
UPLOAD_DIR = Path("uploads/documents")
PROCESSED_DIR = Path("uploads/processed")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# Document categories and their keywords for auto-categorization
DOCUMENT_CATEGORIES = {
    "formation": [
        "articles of incorporation",
        "certificate of incorporation",
        "operating agreement",
        "bylaws",
        "formation",
        "delaware",
        "registered agent",
    ],
    "tax": [
        "tax return",
        "form 1120",
        "form 1065",
        "schedule k-1",
        "ein",
        "irs",
        "tax",
    ],
    "receipts": [
        "invoice",
        "receipt",
        "total due",
        "amount due",
        "vendor",
        "purchase order",
        "bill to",
    ],
    "contracts": ["agreement", "contract", "addendum", "amendment", "terms"],
    "financial": [
        "balance sheet",
        "income statement",
        "cash flow",
        "p&l",
        "profit loss",
        "financial statement",
        "statement of operations",
    ],
    "compliance": [
        "license",
        "permit",
        "regulatory",
        "compliance",
        "audit",
        "big 4",
        "private audit",
        "financial audit",
    ],
}

# Entity patterns for auto-detection
ENTITY_PATTERNS = {
    "ngi-capital": ["NGI Capital, Inc", "NGI CAPITAL, INC", "NGI Capital"],
    "ngi-advisory": ["NGI Capital Advisory LLC", "NGI CAPITAL ADVISORY LLC", "Advisory LLC"],
    "creator-terminal": ["The Creator Terminal", "Creator Terminal", "CREATOR TERMINAL"]
}

class DocumentProcessor:
    """Handles document processing, OCR, and data extraction"""
    
    @staticmethod
    def extract_text_from_pdf(file_path: str) -> str:
        """Extract text from PDF files using pdfplumber, PyMuPDF, or pypdf fallback"""
        # Try pdfplumber first
        try:
            if pdfplumber is not None:
                text = []
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        try:
                            text.append(page.extract_text() or "")
                        except Exception:
                            text.append("")
                t = "\n".join(text).strip()
                if t:
                    return t
        except Exception as e:
            logger.debug("pdfplumber failed: %s", str(e))
        # Try PyMuPDF
        try:
            if fitz is not None:
                doc = fitz.open(file_path)
                txt = []
                for p in doc:
                    try:
                        txt.append(p.get_text())
                    except Exception:
                        txt.append("")
                t = "\n".join(txt).strip()
                if t:
                    return t
        except Exception as e:
            logger.debug("PyMuPDF failed: %s", str(e))
        # Fallback: pypdf
        try:
            if pypdf is not None:
                text = ""
                with open(file_path, 'rb') as file:
                    pdf_reader = pypdf.PdfReader(file)
                    for page in pdf_reader.pages:
                        try:
                            text += (page.extract_text() or "") + "\n"
                        except Exception:
                            text += "\n"
                return text
        except Exception as e:
            logger.error(f"Error extracting PDF text: {e}")
        return ""
    
    @staticmethod
    def extract_text_from_docx(file_path: str) -> str:
        """Extract text from Word documents"""
        try:
            if DocxDocument is None:
                return ""
            doc = DocxDocument(file_path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text
        except Exception as e:
            logger.error(f"Error extracting DOCX text: {e}")
            return ""
    
    @staticmethod
    def extract_text_from_image(file_path: str) -> str:
        """Extract text from images using PaddleOCR or Tesseract fallback"""
        try:
            if _paddle_ocr is not None:
                result = _paddle_ocr.ocr(file_path, cls=True)
                # Flatten recognized text
                lines = []
                for page in result or []:
                    for line in page:
                        try:
                            lines.append(line[1][0])
                        except Exception:
                            continue
                return "\n".join(lines)
            # Fallback to Tesseract
            if 'Image' in globals() and 'pytesseract' in globals() and Image is not None and pytesseract is not None:
                image = Image.open(file_path)
                text = pytesseract.image_to_string(image)
                return text
        except Exception as e:
            logger.error(f"Error extracting image text: {e}")
        return ""
    
    @staticmethod
    def categorize_document(text: str, filename: str) -> str:
        """Auto-categorize document based on content"""
        text_lower = text.lower()
        filename_lower = filename.lower()
        
        for category, keywords in DOCUMENT_CATEGORIES.items():
            for keyword in keywords:
                if keyword in text_lower or keyword in filename_lower:
                    return category
        
        # Fallback: simple heuristics
        if re.search(r"\binvoice\b|\breceipt\b|\bbill\b", text_lower):
            return "receipts"
        if re.search(r"\bcontract\b|\bagreement\b", text_lower):
            return "contracts"
        if re.search(r"balance sheet|income statement|cash flow|statement of operations", text_lower):
            return "financial"
        return "uncategorized"
    
    @staticmethod
    def detect_entity(text: str) -> Optional[str]:
        """Detect which entity the document belongs to"""
        # Check for more specific patterns first to avoid false matches
        if "NGI Capital Advisory LLC" in text or "NGI CAPITAL ADVISORY LLC" in text.upper():
            return "ngi-advisory"
        elif "The Creator Terminal" in text or "CREATOR TERMINAL" in text.upper():
            return "creator-terminal"
        elif "NGI Capital" in text or "NGI CAPITAL" in text.upper():
            return "ngi-capital"
        return None
    
    @staticmethod
    def extract_entity_data(text: str, category: str) -> Dict[str, Any]:
        """Extract structured data from document text"""
        data = {}
        # Try invoice2data for receipts/invoices first
        if category == "receipts" and i2d_extract is not None:
            try:
                # invoice2data returns dict or None
                inv = i2d_extract(text)
                if inv:
                    data.update({
                        'vendor': inv.get('issuer') or inv.get('seller') or inv.get('company') or inv.get('issuer_name'),
                        'invoice_number': inv.get('invoice_number') or inv.get('number'),
                        'date': (inv.get('date') or inv.get('invoice_date') or inv.get('date_invoice')),
                        'currency': inv.get('currency'),
                        'total': inv.get('amount') or inv.get('total'),
                        'tax': inv.get('tax') or inv.get('tax_amount'),
                        'line_items': inv.get('lines') or inv.get('items') or [],
                    })
            except Exception:
                pass
        
        if category == "formation":
            # Extract formation document data
            ein_pattern = r'\b\d{2}-\d{7}\b'
            ein_match = re.search(ein_pattern, text)
            if ein_match:
                data['ein'] = ein_match.group()
            
            # Extract state of incorporation
            # First try to match "State of X" pattern
            state_pattern = r'State of ([A-Za-z]+)'
            state_match = re.search(state_pattern, text, re.IGNORECASE)
            if state_match:
                data['state'] = state_match.group(1)
            else:
                # Fallback to direct state names
                state_pattern = r'\b(Delaware|Nevada|Wyoming|California)\b'
                state_match = re.search(state_pattern, text, re.IGNORECASE)
                if state_match:
                    data['state'] = state_match.group(1)
            
            # Extract formation date
            date_pattern = r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b'
            date_match = re.search(date_pattern, text)
            if date_match:
                data['formation_date'] = date_match.group()
            
            # Extract registered agent
            agent_pattern = r'Registered Agent:?\s*([^\n]+)'
            agent_match = re.search(agent_pattern, text, re.IGNORECASE)
            if agent_match:
                data['registered_agent'] = agent_match.group(1).strip()
        
        elif category == "receipts":
            # Extract receipt/invoice data
            amount_pattern = r'\$[\d,]+\.?\d*'
            amounts = re.findall(amount_pattern, text)
            if amounts:
                data['amounts'] = amounts
            
            # Extract vendor name
            vendor_patterns = ['From:', 'Vendor:', 'Company:', 'Bill To:']
            for pattern in vendor_patterns:
                vendor_match = re.search(rf'{re.escape(pattern)}\s*([^\n]+)', text, re.IGNORECASE)
                if vendor_match:
                    data['vendor'] = vendor_match.group(1).strip()
                    break
            
            # Extract invoice number - look for patterns like "Invoice #: XXX"
            invoice_pattern = r'(?:Invoice|Receipt|Order)\s*(?:#|Number|No\.?)\s*:?\s*([\w-]+)'
            invoice_match = re.search(invoice_pattern, text, re.IGNORECASE)
            if invoice_match:
                data['invoice_number'] = invoice_match.group(1)
        
        elif category == "tax":
            # Extract tax document data
            tax_year_pattern = r'(?:Tax Year|Form Year|Year)\s*:?\s*(\d{4})'
            year_match = re.search(tax_year_pattern, text, re.IGNORECASE)
            if year_match:
                data['tax_year'] = year_match.group(1)
            
            # Extract form type
            form_pattern = r'Form\s+([\w-]+)'
            form_match = re.search(form_pattern, text)
            if form_match:
                data['form_type'] = form_match.group(1)
        
        return data

def _ensure_doc_tables(db: Session):
    """Create doc_metadata table if missing (idempotent)"""
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS doc_metadata (
            id TEXT PRIMARY KEY,
            document_id TEXT,
            doc_type TEXT,
            vendor TEXT,
            invoice_number TEXT,
            issue_date TEXT,
            due_date TEXT,
            currency TEXT,
            subtotal REAL,
            tax REAL,
            total REAL,
            raw_text TEXT,
            metadata_json TEXT,
            journal_entry_id INTEGER,
            created_at TEXT,
            updated_at TEXT
        )
        """
    ))
    db.commit()


def _ensure_minimal_accounts(db: Session, entity_id: int) -> Dict[str, int]:
    """Ensure essential accounts exist; return mapping code->id"""
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS chart_of_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            account_code TEXT,
            account_name TEXT,
            account_type TEXT,
            normal_balance TEXT,
            is_active INTEGER DEFAULT 1
        )
        """
    ))
    db.commit()
    def ensure(code: str, name: str, atype: str, normal: str) -> int:
        row = db.execute(sa_text("SELECT id FROM chart_of_accounts WHERE entity_id = :e AND account_code = :c"), {"e": entity_id, "c": code}).fetchone()
        if row:
            return int(row[0])
        db.execute(sa_text(
            "INSERT INTO chart_of_accounts (entity_id, account_code, account_name, account_type, normal_balance, is_active) VALUES (:e,:c,:n,:t,:nb,1)"
        ), {"e": entity_id, "c": code, "n": name, "t": atype, "nb": normal})
        db.commit()
        rid = db.execute(sa_text("SELECT last_insert_rowid()")).scalar()
        return int(rid or 0)
    return {
        'EXP_DEFAULT': ensure('52900', 'Office Supplies', 'expense', 'debit'),
        'AP': ensure('21100', 'Accounts Payable', 'liability', 'credit'),
        'CASH': ensure('11100', 'Cash - Operating', 'asset', 'debit'),
    }


def _create_draft_je_for_invoice(db: Session, entity_id: int, vendor: str, total_amount: float, description: str, reference: str | None) -> int:
    """Create a balanced draft journal entry: debit expense, credit A/P; return JE id"""
    accts = _ensure_minimal_accounts(db, entity_id)
    # Create header
    entry_number = f"JE-{entity_id:03d}-{int(datetime.now().timestamp())}"
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            entry_number TEXT,
            entry_date TEXT,
            description TEXT,
            reference_number TEXT,
            total_debit REAL,
            total_credit REAL,
            approval_status TEXT,
            is_posted INTEGER DEFAULT 0,
            posted_date TEXT
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS journal_entry_lines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            journal_entry_id INTEGER,
            account_id INTEGER,
            line_number INTEGER,
            description TEXT,
            debit_amount REAL,
            credit_amount REAL
        )
        """
    ))
    db.commit()
    db.execute(sa_text(
        "INSERT INTO journal_entries (entity_id, entry_number, entry_date, description, reference_number, total_debit, total_credit, approval_status, is_posted) "
        "VALUES (:eid, :eno, :ed, :desc, :ref, :td, :tc, 'pending', 0)"
    ), {"eid": entity_id, "eno": entry_number, "ed": datetime.utcnow().date().isoformat(), "desc": description, "ref": reference or '', "td": float(total_amount), "tc": float(total_amount)})
    je_id = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0)
    # Lines
    db.execute(sa_text(
        "INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, description, debit_amount, credit_amount) VALUES (:je,:acc,1,:d,:dr,0)"
    ), {"je": je_id, "acc": accts['EXP_DEFAULT'], "d": f"Expense: {vendor}", "dr": float(total_amount)})
    db.execute(sa_text(
        "INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, description, debit_amount, credit_amount) VALUES (:je,:acc,2,:d,0,:cr)"
    ), {"je": je_id, "acc": accts['AP'], "d": f"A/P: {vendor}", "cr": float(total_amount)})
    db.commit()
    return je_id


@router.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    """
    Upload and process multiple documents
    Supports: Word docs (.docx), PDFs, Images for OCR
    """
    uploaded_documents = []
    
    for file in files:
        try:
            # Generate unique filename
            file_id = str(uuid.uuid4())
            file_extension = Path(file.filename).suffix
            saved_filename = f"{file_id}{file_extension}"
            file_path = UPLOAD_DIR / saved_filename
            
            # Save uploaded file
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            # Extract text based on file type
            text = ""
            if file_extension.lower() == '.pdf':
                text = DocumentProcessor.extract_text_from_pdf(str(file_path))
            elif file_extension.lower() in ['.docx', '.doc']:
                text = DocumentProcessor.extract_text_from_docx(str(file_path))
            elif file_extension.lower() in ['.png', '.jpg', '.jpeg', '.tiff']:
                text = DocumentProcessor.extract_text_from_image(str(file_path))
            
            # Auto-categorize and detect entity
            category = DocumentProcessor.categorize_document(text, file.filename)
            entity = DocumentProcessor.detect_entity(text)
            
            # Store document metadata
            document_data = {
                "id": file_id,
                "filename": file.filename,
                "original_name": file.filename,
                "file_type": file_extension,
                "size": len(content),
                "category": category,
                "entity": entity,
                "upload_date": datetime.now(timezone.utc).isoformat(),
                "status": "uploaded",
                "file_path": str(file_path)
            }
            
            uploaded_documents.append(document_data)
            
            logger.info(f"Document uploaded: {file.filename} - Category: {category}, Entity: {entity}")
            
        except Exception as e:
            logger.error(f"Error uploading document {file.filename}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload {file.filename}"
            )
    
    return {
        "message": f"Successfully uploaded {len(uploaded_documents)} documents",
        "documents": uploaded_documents
    }

@router.post("/{document_id}/process")
async def process_document(document_id: str, entity_id: int | None = Query(None), db: Session = Depends(get_db)):
    """
    Process a document to extract data and populate database
    """
    try:
        # Find document file
        document_files = list(UPLOAD_DIR.glob(f"{document_id}.*"))
        if not document_files:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        file_path = document_files[0]
        file_extension = file_path.suffix
        
        # Extract text
        text = ""
        if file_extension.lower() == '.pdf':
            text = DocumentProcessor.extract_text_from_pdf(str(file_path))
        elif file_extension.lower() in ['.docx', '.doc']:
            text = DocumentProcessor.extract_text_from_docx(str(file_path))
        elif file_extension.lower() in ['.png', '.jpg', '.jpeg', '.tiff']:
            text = DocumentProcessor.extract_text_from_image(str(file_path))
        
        # Categorize and extract data
        category = DocumentProcessor.categorize_document(text, file_path.name)
        entity = DocumentProcessor.detect_entity(text)
        extracted_data = DocumentProcessor.extract_entity_data(text, category)

        # Normalize totals and key fields
        vendor = (extracted_data.get('vendor') or '').strip() if isinstance(extracted_data, dict) else ''
        inv_no = (extracted_data.get('invoice_number') or extracted_data.get('invoice') or '').strip() if isinstance(extracted_data, dict) else ''
        currency = (extracted_data.get('currency') or '').strip() if isinstance(extracted_data, dict) else ''
        total_val = None
        tax_val = None
        issue_date = None
        due_date = None
        # Total
        try:
            if 'total' in extracted_data and extracted_data['total'] is not None:
                total_val = float(str(extracted_data['total']).replace('$', '').replace(',', ''))
            elif 'amounts' in extracted_data and extracted_data['amounts']:
                total_val = float(str(extracted_data['amounts'][0]).replace('$', '').replace(',', ''))
        except Exception:
            total_val = None
        # Tax
        try:
            if 'tax' in extracted_data and extracted_data['tax'] is not None:
                tax_val = float(str(extracted_data['tax']).replace('$', '').replace(',', ''))
        except Exception:
            tax_val = None
        # Dates
        for k in ('date', 'invoice_date', 'issue_date'):
            v = extracted_data.get(k) if isinstance(extracted_data, dict) else None
            if v:
                issue_date = str(v)
                break
        due_date = (extracted_data.get('due_date') or None) if isinstance(extracted_data, dict) else None
        
        # Persist metadata and optionally create JE for receipts/invoices
        # Persist metadata if a real DB session is available
        have_db = hasattr(db, 'execute')
        if have_db:
            _ensure_doc_tables(db)
        doc_type = 'Invoice' if category == 'receipts' else ('Tax' if category == 'tax' else ('Formation' if category == 'formation' else 'Other'))
        # Attempt entity_id resolve from text if not provided
        if not entity_id:
            # Best-effort resolution
            try:
                conn = sqlite3.connect(get_database_path()); cur = conn.cursor()
                name_hint = None
                if (entity or '') == 'ngi-advisory':
                    name_hint = 'Advisory'
                elif (entity or '') == 'creator-terminal':
                    name_hint = 'Creator Terminal'
                else:
                    name_hint = 'NGI Capital'
                cur.execute("SELECT id FROM entities WHERE legal_name LIKE ? LIMIT 1", (f"%{name_hint}%",))
                row = cur.fetchone(); conn.close()
                if row: entity_id = int(row[0])
            except Exception:
                entity_id = None
        je_id: Optional[int] = None
        if have_db:
            if doc_type in ('Invoice', 'Receipt') and total_val and (entity_id or 0) != 0:
                try:
                    je_id = _create_draft_je_for_invoice(db, int(entity_id), vendor or 'Vendor', float(total_val), f"Auto JE for {vendor or 'invoice'}", inv_no or document_id)
                except Exception as _e:
                    logger.warning("JE creation failed: %s", str(_e))
                    je_id = None
            # Insert/replace metadata
            db.execute(sa_text(
                "INSERT OR REPLACE INTO doc_metadata (id, document_id, doc_type, vendor, invoice_number, issue_date, due_date, currency, subtotal, tax, total, raw_text, metadata_json, journal_entry_id, created_at, updated_at) "
                "VALUES (:id, :doc, :dt, :ven, :inv, :isdt, :ddt, :cur, :sub, :tax, :tot, :raw, :meta, :je, :cr, :up)"
            ), {
                "id": document_id,
                "doc": document_id,
                "dt": doc_type,
                "ven": vendor or None,
                "inv": inv_no or None,
                "isdt": issue_date or None,
                "ddt": due_date or None,
                "cur": currency or None,
                "sub": float(total_val - (tax_val or 0)) if (total_val is not None and tax_val is not None) else None,
                "tax": float(tax_val) if tax_val is not None else None,
                "tot": float(total_val) if total_val is not None else None,
                "raw": text,
                "meta": json.dumps(extracted_data or {}),
                "je": je_id,
                "cr": datetime.now(timezone.utc).isoformat(),
                "up": datetime.now(timezone.utc).isoformat(),
            })
            db.commit()

        # Prepare response
        result = {
            "document_id": document_id,
            "status": "processed",
            "category": category,
            "entity": entity,
            "extracted_text_length": len(text),
            "data": extracted_data,
            "database_updates": [],
            "doc_type": doc_type,
            "journal_entry_id": je_id,
        }
        
        # Create automated journal entries based on document type
        journal_entries_created = []
        
        if category == "receipts" and extracted_data:
            # Auto-create expense journal entry from receipt
            if 'vendor' in extracted_data and 'amounts' in extracted_data:
                amount_str = extracted_data['amounts'][0] if extracted_data['amounts'] else '0'
                amount = float(amount_str.replace('$', '').replace(',', ''))
                
                journal_entry = {
                    "entry_type": "Automated",
                    "source": "Document Upload",
                    "description": f"Expense - {extracted_data.get('vendor')}",
                    "reference": extracted_data.get('invoice_number', document_id),
                    "lines": [
                        {
                            "account": "52900",  # Office Supplies (example)
                            "account_name": "Office Supplies",
                            "debit": amount,
                            "credit": 0
                        },
                        {
                            "account": "21100",  # Accounts Payable
                            "account_name": "Accounts Payable",
                            "debit": 0,
                            "credit": amount
                        }
                    ]
                }
                journal_entries_created.append(journal_entry)
                
        elif category == "tax" and extracted_data:
            # Auto-create tax provision journal entry
            if 'form_type' in extracted_data:
                journal_entry = {
                    "entry_type": "Automated",
                    "source": "Document Upload",
                    "description": f"Tax provision - {extracted_data.get('form_type')} {extracted_data.get('tax_year', '')}",
                    "reference": document_id,
                    "lines": []
                }
                journal_entries_created.append(journal_entry)
        
        # Simulate database updates based on extracted data
        if category == "formation" and extracted_data:
            if 'ein' in extracted_data:
                result["database_updates"].append({
                    "action": "update_entity",
                    "field": "ein",
                    "value": extracted_data['ein']
                })
            if 'state' in extracted_data:
                result["database_updates"].append({
                    "action": "update_entity",
                    "field": "state_of_incorporation",
                    "value": extracted_data['state']
                })
            if 'formation_date' in extracted_data:
                result["database_updates"].append({
                    "action": "update_entity",
                    "field": "formation_date",
                    "value": extracted_data['formation_date']
                })
        
        elif category == "receipts" and extracted_data:
            if 'amounts' in extracted_data and 'vendor' in extracted_data:
                result["database_updates"].append({
                    "action": "create_transaction",
                    "type": "expense",
                    "vendor": extracted_data.get('vendor'),
                    "amount": extracted_data['amounts'][0] if extracted_data['amounts'] else None,
                    "invoice_number": extracted_data.get('invoice_number')
                })
        
        # Add journal entries to result
        if journal_entries_created:
            result["journal_entries"] = journal_entries_created
            result["database_updates"].append({
                "action": "create_journal_entries",
                "count": len(journal_entries_created),
                "status": "pending_approval"
            })
        
        # If tax-related, persist into tax_documents for the Tax module
        try:
            if category == "tax":
                # best-effort mapping of entity slug to id
                slug = (entity or '').lower()
                name_hint = None
                if slug == 'ngi-advisory':
                    name_hint = 'NGI Capital Advisory'
                elif slug == 'creator-terminal':
                    name_hint = 'Creator Terminal'
                else:
                    name_hint = 'NGI Capital'
                eid = None
                try:
                    conn = sqlite3.connect(get_database_path())
                    cur = conn.cursor()
                    if name_hint:
                        cur.execute("SELECT id FROM entities WHERE legal_name LIKE ? LIMIT 1", (f"%{name_hint}%",))
                        row = cur.fetchone()
                        if row:
                            eid = int(row[0])
                    # derive year/jur/form
                    tax_year = None
                    try:
                        tax_year = int(extracted_data.get('tax_year')) if extracted_data.get('tax_year') else None
                    except Exception:
                        tax_year = None
                    form_type = (extracted_data.get('form_type') or '').upper()
                    text_up = (text or '').upper()
                    jurisdiction = 'FED'
                    if 'DELAWARE' in text_up or form_type.startswith('DE_'):
                        jurisdiction = 'DE'
                    elif 'CALIFORNIA' in text_up or form_type.startswith('CA_'):
                        jurisdiction = 'CA'
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS tax_documents (
                            id TEXT PRIMARY KEY,
                            entity_id INTEGER,
                            year INTEGER,
                            jurisdiction TEXT,
                            form TEXT,
                            title TEXT,
                            file_url TEXT,
                            uploaded_at TEXT DEFAULT (datetime('now'))
                        )
                        """
                    )
                    cur.execute(
                        "INSERT OR REPLACE INTO tax_documents (id, entity_id, year, jurisdiction, form, title, file_url) VALUES (?,?,?,?,?,?,?)",
                        (
                            document_id,
                            eid,
                            tax_year,
                            jurisdiction,
                            form_type,
                            f"{form_type or 'TAX'} {tax_year or ''}".strip(),
                            str(file_path),
                        ),
                    )
                    conn.commit(); conn.close()
                    result["database_updates"].append({"action": "insert_tax_document", "entity_id": eid, "year": tax_year, "jurisdiction": jurisdiction, "form": form_type})
                except Exception as _e:
                    logger.warning("tax_documents insert skipped: %s", str(_e))
        except Exception:
            pass

        # Move to processed folder
        processed_path = PROCESSED_DIR / file_path.name
        try:
            file_path.rename(processed_path)
        except Exception:
            pass
        
        logger.info(f"Document processed: {document_id} - Extracted {len(extracted_data)} data points, Created {len(journal_entries_created)} journal entries")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing document {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process document"
        )

@router.get("/")
async def get_documents(category: Optional[str] = None, doc_type: Optional[str] = None, limit: int = 100, db: Session = Depends(get_db)):
    """List documents with metadata if available"""
    # If called directly by tests (db unresolved), fall back to filesystem scan
    if not hasattr(db, 'execute'):
        documents = []
        for file_path in UPLOAD_DIR.iterdir():
            if file_path.is_file():
                documents.append({
                    "id": file_path.stem,
                    "filename": file_path.name,
                    "size": file_path.stat().st_size,
                    "upload_date": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                    "status": "uploaded"
                })
        for file_path in PROCESSED_DIR.iterdir():
            if file_path.is_file():
                documents.append({
                    "id": file_path.stem,
                    "filename": file_path.name,
                    "size": file_path.stat().st_size,
                    "upload_date": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                    "status": "processed"
                })
        return {"documents": documents, "total": len(documents)}
    # Metadata-backed listing
    _ensure_doc_tables(db)
    where = []
    params: Dict[str, Any] = {}
    if doc_type:
        where.append("doc_type = :dt"); params["dt"] = doc_type
    if category:
        wmap = {'receipts': 'Invoice', 'tax': 'Tax', 'formation': 'Formation'}
        t = wmap.get(category)
        if t:
            where.append("doc_type = :catdt"); params["catdt"] = t
    sql = "SELECT id, doc_type, vendor, invoice_number, issue_date, currency, total, created_at, updated_at FROM doc_metadata"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY datetime(coalesce(updated_at, created_at)) DESC LIMIT :lim"
    params["lim"] = int(limit)
    rows = db.execute(sa_text(sql), params).fetchall()
    items = []
    for r in rows:
        items.append({
            "id": r[0],
            "doc_type": r[1],
            "vendor": r[2],
            "invoice_number": r[3],
            "issue_date": r[4],
            "currency": r[5],
            "total": float(r[6]) if r[6] is not None else None,
            "created_at": r[7],
            "updated_at": r[8],
        })
    return {"documents": items, "total": len(items)}


@router.get("/{document_id}")
async def get_document(document_id: str, db: Session = Depends(get_db)):
    _ensure_doc_tables(db)
    row = db.execute(sa_text(
        "SELECT id, doc_type, vendor, invoice_number, issue_date, due_date, currency, subtotal, tax, total, raw_text, metadata_json, journal_entry_id, created_at, updated_at FROM doc_metadata WHERE id = :id"
    ), {"id": document_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": row[0],
        "doc_type": row[1],
        "vendor": row[2],
        "invoice_number": row[3],
        "issue_date": row[4],
        "due_date": row[5],
        "currency": row[6],
        "subtotal": float(row[7]) if row[7] is not None else None,
        "tax": float(row[8]) if row[8] is not None else None,
        "total": float(row[9]) if row[9] is not None else None,
        "raw_text": row[10] or "",
        "metadata": json.loads(row[11] or '{}'),
        "journal_entry_id": row[12],
        "created_at": row[13],
        "updated_at": row[14],
    }


@router.patch("/{document_id}/metadata")
async def update_document_metadata(document_id: str, patch: Dict[str, Any], db: Session = Depends(get_db)):
    _ensure_doc_tables(db)
    allowed = {"vendor", "invoice_number", "issue_date", "due_date", "currency", "subtotal", "tax", "total"}
    sets = []
    params: Dict[str, Any] = {"id": document_id}
    for k, v in (patch or {}).items():
        if k in allowed:
            sets.append(f"{k} = :{k}"); params[k] = v
    if not sets:
        return {"message": "no changes"}
    sets.append("updated_at = :u"); params["u"] = datetime.now(timezone.utc).isoformat()
    db.execute(sa_text("UPDATE doc_metadata SET " + ", ".join(sets) + " WHERE id = :id"), params)
    db.commit()
    return {"message": "updated"}


@router.post("/{document_id}/post-to-ledger")
async def post_document_journal_entry(document_id: str, db: Session = Depends(get_db)):
    _ensure_doc_tables(db)
    row = db.execute(sa_text("SELECT journal_entry_id FROM doc_metadata WHERE id = :id"), {"id": document_id}).fetchone()
    if not row or not row[0]:
        raise HTTPException(status_code=400, detail="No journal entry linked to document")
    je_id = int(row[0])
    # Approve then post
    try:
        db.execute(sa_text("UPDATE journal_entries SET approval_status = 'approved' WHERE id = :id"), {"id": je_id})
        try:
            db.execute(sa_text("UPDATE journal_entries SET is_posted = 1, posted_date = :ts WHERE id = :id"), {"id": je_id, "ts": datetime.utcnow().isoformat(sep=' ')})
        except Exception:
            db.execute(sa_text("UPDATE journal_entries SET is_posted = 1 WHERE id = :id"), {"id": je_id})
        db.commit()
        return {"message": "posted", "journal_entry_id": je_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to post journal entry: {str(e)}")

@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """Delete a document"""
    try:
        # Check both directories
        deleted = False
        for directory in [UPLOAD_DIR, PROCESSED_DIR]:
            files = list(directory.glob(f"{document_id}.*"))
            for file in files:
                file.unlink()
                deleted = True
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        return {"message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document"
        )
