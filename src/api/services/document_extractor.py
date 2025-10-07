"""
NGI Capital - AI Document Extraction Service
Extracts structured data from PDFs, Word docs, and images

Author: NGI Capital Development Team
Date: October 3, 2025
"""

import os
import re
from typing import Dict, Any, List, Optional
from datetime import datetime
from decimal import Decimal
import PyPDF2
import docx
from PIL import Image
import pytesseract


async def extract_document_data(
    file_path: str,
    document_type: str,
    category: str
) -> Dict[str, Any]:
    """
    Extract structured data from document
    Returns: {data: dict, confidence: float, text: str}
    """
    
    file_ext = os.path.splitext(file_path)[1].lower()
    
    # Extract text based on file type
    if file_ext == ".pdf":
        text = extract_text_from_pdf(file_path)
    elif file_ext in [".doc", ".docx"]:
        text = extract_text_from_word(file_path)
    elif file_ext in [".jpg", ".jpeg", ".png"]:
        text = extract_text_from_image(file_path)
    else:
        text = ""
    
    # Extract structured data based on document type
    extracted_data = {}
    confidence = 0.0
    
    if category == "formation":
        extracted_data, confidence = extract_formation_data(text, document_type)
    elif category == "banking":
        extracted_data, confidence = extract_banking_data(text, document_type)
    elif category == "invoices":
        extracted_data, confidence = extract_invoice_data(text)
    elif category == "bills":
        extracted_data, confidence = extract_bill_data(text)
    elif category == "receipts":
        extracted_data, confidence = extract_receipt_data(text)
    elif category == "internal_controls":
        extracted_data, confidence = extract_controls_data(text)
    else:
        extracted_data = {"raw_text": text}
        confidence = 0.5
    
    return {
        "data": extracted_data,
        "confidence": confidence,
        "text": text[:5000]  # First 5000 chars for search
    }


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF"""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        return ""


def extract_text_from_word(file_path: str) -> str:
    """Extract text from Word document"""
    try:
        doc = docx.Document(file_path)
        text = "\n".join([para.text for para in doc.paragraphs])
        return text.strip()
    except Exception as e:
        print(f"Error extracting Word text: {e}")
        return ""


def extract_text_from_image(file_path: str) -> str:
    """Extract text from image using OCR"""
    try:
        image = Image.open(file_path)
        text = pytesseract.image_to_string(image)
        return text.strip()
    except Exception as e:
        print(f"Error extracting image text: {e}")
        return ""


# ============================================================================
# FORMATION DOCUMENTS EXTRACTION
# ============================================================================

def extract_formation_data(text: str, document_type: str) -> tuple[Dict, float]:
    """Extract data from formation documents"""
    
    data = {}
    confidence_score = 0.0
    
    # EIN extraction
    ein_pattern = r'\b\d{2}-\d{7}\b'
    ein_match = re.search(ein_pattern, text)
    if ein_match:
        data["ein"] = ein_match.group()
        confidence_score += 0.3
    
    # State extraction
    state_pattern = r'\b(Delaware|DE|California|CA|New York|NY|Texas|TX)\b'
    state_match = re.search(state_pattern, text, re.IGNORECASE)
    if state_match:
        data["state"] = state_match.group().upper()
        confidence_score += 0.2
    
    # Date extraction
    date_pattern = r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b'
    date_matches = re.findall(date_pattern, text)
    if date_matches:
        data["dates_found"] = date_matches[:3]  # First 3 dates
        confidence_score += 0.2
    
    # Entity name (look for "Articles of" pattern)
    if "articles of incorporation" in text.lower():
        data["document_type"] = "Articles of Incorporation"
        confidence_score += 0.3
    elif "certificate of conversion" in text.lower():
        data["document_type"] = "Certificate of Conversion"
        confidence_score += 0.3
    elif "operating agreement" in text.lower():
        data["document_type"] = "Operating Agreement"
        confidence_score += 0.3
    
    return data, min(confidence_score, 1.0)


# ============================================================================
# BANKING DOCUMENTS EXTRACTION
# ============================================================================

def extract_banking_data(text: str, document_type: str) -> tuple[Dict, float]:
    """Extract data from banking documents"""
    
    data = {}
    confidence_score = 0.0
    
    # Account number (last 4 digits)
    account_pattern = r'account.*?(\d{4})'
    account_match = re.search(account_pattern, text, re.IGNORECASE)
    if account_match:
        data["account_last_4"] = account_match.group(1)
        confidence_score += 0.3
    
    # Statement period
    period_pattern = r'statement period.*?(\d{1,2}/\d{1,2}/\d{2,4}).*?(\d{1,2}/\d{1,2}/\d{2,4})'
    period_match = re.search(period_pattern, text, re.IGNORECASE)
    if period_match:
        data["period_start"] = period_match.group(1)
        data["period_end"] = period_match.group(2)
        confidence_score += 0.3
    
    # Balance extraction
    balance_pattern = r'ending balance.*?\$?([\d,]+\.\d{2})'
    balance_match = re.search(balance_pattern, text, re.IGNORECASE)
    if balance_match:
        data["ending_balance"] = balance_match.group(1).replace(',', '')
        confidence_score += 0.4
    
    return data, min(confidence_score, 1.0)


# ============================================================================
# INVOICE/BILL EXTRACTION
# ============================================================================

def extract_invoice_data(text: str) -> tuple[Dict, float]:
    """Extract data from invoices"""
    
    data = {}
    confidence_score = 0.0
    
    # Invoice number
    invoice_pattern = r'invoice\s*#?\s*:?\s*([A-Z0-9-]+)'
    invoice_match = re.search(invoice_pattern, text, re.IGNORECASE)
    if invoice_match:
        data["invoice_number"] = invoice_match.group(1)
        confidence_score += 0.3
    
    # Date
    date_pattern = r'(?:invoice date|date).*?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
    date_match = re.search(date_pattern, text, re.IGNORECASE)
    if date_match:
        data["invoice_date"] = date_match.group(1)
        confidence_score += 0.2
    
    # Amount
    amount_pattern = r'(?:total|amount due|balance).*?\$?([\d,]+\.\d{2})'
    amount_match = re.search(amount_pattern, text, re.IGNORECASE)
    if amount_match:
        data["amount"] = amount_match.group(1).replace(',', '')
        confidence_score += 0.4
    
    # Vendor/Customer
    if "bill to" in text.lower():
        vendor_section = text[text.lower().find("bill to"):text.lower().find("bill to")+200]
        lines = vendor_section.split('\n')
        if len(lines) > 1:
            data["vendor_name"] = lines[1].strip()
            confidence_score += 0.1
    
    return data, min(confidence_score, 1.0)


def extract_bill_data(text: str) -> tuple[Dict, float]:
    """Extract data from bills (vendor invoices)"""
    return extract_invoice_data(text)  # Similar structure


def extract_receipt_data(text: str) -> tuple[Dict, float]:
    """Extract data from receipts"""
    
    data = {}
    confidence_score = 0.0
    
    # Merchant name (usually at top)
    lines = text.split('\n')
    if len(lines) > 0:
        data["merchant"] = lines[0].strip()
        confidence_score += 0.2
    
    # Date
    date_pattern = r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b'
    date_match = re.search(date_pattern, text)
    if date_match:
        data["date"] = date_match.group(1)
        confidence_score += 0.2
    
    # Total amount
    total_pattern = r'(?:total|amount).*?\$?([\d,]+\.\d{2})'
    total_match = re.search(total_pattern, text, re.IGNORECASE)
    if total_match:
        data["total"] = total_match.group(1).replace(',', '')
        confidence_score += 0.5
    
    # Tax
    tax_pattern = r'tax.*?\$?([\d,]+\.\d{2})'
    tax_match = re.search(tax_pattern, text, re.IGNORECASE)
    if tax_match:
        data["tax"] = tax_match.group(1).replace(',', '')
        confidence_score += 0.1
    
    return data, min(confidence_score, 1.0)


# ============================================================================
# INTERNAL CONTROLS EXTRACTION
# ============================================================================

def extract_controls_data(text: str) -> tuple[Dict, float]:
    """Extract internal controls from document"""
    
    data = {}
    confidence_score = 0.0
    
    controls = []
    
    # Look for control patterns
    control_patterns = [
        r'(control\s+(?:id|number|#).*?:.*?)(?=control\s+(?:id|number|#)|\Z)',
        r'(IC-[A-Z]{2,4}-\d{3}.*?)(?=IC-[A-Z]{2,4}-\d{3}|\Z)'
    ]
    
    for pattern in control_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
        for match in matches:
            control_text = match.group(1)
            
            # Extract control ID
            id_match = re.search(r'(IC-[A-Z]{2,4}-\d{3})', control_text, re.IGNORECASE)
            if id_match:
                control_id = id_match.group(1)
                
                # Extract frequency
                frequency = "Unknown"
                if re.search(r'\b(daily|weekly|monthly|quarterly|annual)\b', control_text, re.IGNORECASE):
                    frequency_match = re.search(r'\b(daily|weekly|monthly|quarterly|annual)\b', control_text, re.IGNORECASE)
                    frequency = frequency_match.group(1).capitalize()
                
                controls.append({
                    "control_id": control_id,
                    "frequency": frequency,
                    "text_snippet": control_text[:200]
                })
                
                confidence_score += 0.1
    
    if controls:
        data["controls_found"] = controls
        data["control_count"] = len(controls)
        confidence_score = min(confidence_score, 0.9)
    else:
        # Try to identify control categories
        categories = []
        if re.search(r'cash\s+disbursement', text, re.IGNORECASE):
            categories.append("Cash Disbursements")
        if re.search(r'revenue|sales', text, re.IGNORECASE):
            categories.append("Revenue")
        if re.search(r'financial\s+reporting', text, re.IGNORECASE):
            categories.append("Financial Reporting")
        if re.search(r'authorization', text, re.IGNORECASE):
            categories.append("Authorization")
        
        if categories:
            data["categories"] = categories
            confidence_score = 0.5
    
    return data, min(confidence_score, 1.0)


# ============================================================================
# BATCH PROCESSING
# ============================================================================

async def process_batch_documents(db, document_ids: List[int]):
    """
    Process a batch of documents for extraction
    Called asynchronously after batch upload
    """
    from ..models_accounting import AccountingDocument
    from sqlalchemy import select
    
    for doc_id in document_ids:
        try:
            result = await db.execute(
                select(AccountingDocument).where(AccountingDocument.id == doc_id)
            )
            document = result.scalar_one_or_none()
            
            if not document:
                continue
            
            # Extract
            extraction_result = await extract_document_data(
                document.file_path,
                document.document_type,
                document.category
            )
            
            # Update document
            document.extracted_data = extraction_result.get("data", {})
            document.extraction_confidence = Decimal(str(extraction_result.get("confidence", 0.0)))
            document.searchable_text = extraction_result.get("text", "")
            document.processing_status = "extracted"
            
        except Exception as e:
            print(f"Error processing document {doc_id}: {e}")
            document.processing_status = "failed"
    
    await db.commit()

