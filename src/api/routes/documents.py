"""
Document Management and Processing System for NGI Capital
Handles document upload, OCR, categorization, and database population
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, status, Depends
from typing import List, Optional, Dict, Any
import os
import uuid
from datetime import datetime, timezone
import logging
import json
import re
from pathlib import Path

# Document processing libraries
import pypdf
from docx import Document as DocxDocument
try:
    import pytesseract
    from PIL import Image
except ImportError:
    # OCR libraries optional for now
    pytesseract = None
    Image = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

# Document storage configuration
UPLOAD_DIR = Path("uploads/documents")
PROCESSED_DIR = Path("uploads/processed")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# Document categories and their keywords for auto-categorization
DOCUMENT_CATEGORIES = {
    "formation": ["articles of incorporation", "certificate of incorporation", "operating agreement", 
                  "bylaws", "formation", "delaware", "registered agent"],
    "tax": ["tax return", "form 1120", "form 1065", "schedule k-1", "ein", "irs", "tax"],
    "receipts": ["invoice", "receipt", "payment", "vendor", "expense", "purchase order"],
    "contracts": ["agreement", "contract", "addendum", "amendment", "terms"],
    "financial": ["balance sheet", "income statement", "cash flow", "p&l", "profit loss", 
                  "financial statement"],
    "compliance": ["license", "permit", "regulatory", "compliance", "audit", "big 4", "private audit", "financial audit"]
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
        """Extract text from PDF files"""
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = pypdf.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            return text
        except Exception as e:
            logger.error(f"Error extracting PDF text: {e}")
            return ""
    
    @staticmethod
    def extract_text_from_docx(file_path: str) -> str:
        """Extract text from Word documents"""
        try:
            doc = DocxDocument(file_path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text
        except Exception as e:
            logger.error(f"Error extracting DOCX text: {e}")
            return ""
    
    @staticmethod
    def extract_text_from_image(file_path: str) -> str:
        """Extract text from images using OCR"""
        try:
            if Image is None or pytesseract is None:
                logger.warning("OCR libraries not installed. Install Pillow and pytesseract for image text extraction.")
                return ""
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
async def process_document(document_id: str):
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
        
        # Prepare response
        result = {
            "document_id": document_id,
            "status": "processed",
            "category": category,
            "entity": entity,
            "extracted_text_length": len(text),
            "data": extracted_data,
            "database_updates": []
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
        
        # Move to processed folder
        processed_path = PROCESSED_DIR / file_path.name
        file_path.rename(processed_path)
        
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
async def get_documents(
    category: Optional[str] = None,
    entity: Optional[str] = None,
    status: Optional[str] = None
):
    """Get list of uploaded documents with filtering"""
    # This would query the database in production
    documents = []
    
    # Scan upload directory for documents
    for file_path in UPLOAD_DIR.iterdir():
        if file_path.is_file():
            documents.append({
                "id": file_path.stem,
                "filename": file_path.name,
                "size": file_path.stat().st_size,
                "upload_date": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                "status": "uploaded"
            })
    
    # Scan processed directory
    for file_path in PROCESSED_DIR.iterdir():
        if file_path.is_file():
            documents.append({
                "id": file_path.stem,
                "filename": file_path.name,
                "size": file_path.stat().st_size,
                "upload_date": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                "status": "processed"
            })
    
    return {
        "documents": documents,
        "total": len(documents)
    }

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