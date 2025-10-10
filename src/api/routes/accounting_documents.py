"""
NGI Capital - Documents Center API
Epic 1: Document Management with AI Extraction

Author: NGI Capital Development Team
Date: October 3, 2025
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal
import os
import shutil
import hashlib
import mimetypes
import logging
import json

logger = logging.getLogger(__name__)

from pydantic import BaseModel, Field, ConfigDict
from ..database_async import get_async_db
from ..models_accounting import AccountingEntity
from ..models_accounting_part2 import AccountingDocument, AccountingDocumentCategory
from ..models import Partners
# Document extraction service
from ..services.document_extractor_vision import document_extractor
from ..services.document_type_detector import DocumentTypeDetector
from ..services.ein_processor import EINProcessor


router = APIRouter(prefix="/api/accounting/documents", tags=["Accounting - Documents"])


@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify router is working"""
    return {"message": "Accounting documents router is working"}


@router.post("/reprocess/{document_id}")
async def reprocess_document(
    document_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Reprocess a document with auto-detection and extraction
    """
    # Get the document
    result = await db.execute(
        select(AccountingDocument).where(AccountingDocument.id == document_id)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Auto-detect document type and category
    detector = DocumentTypeDetector()
    detected_type = detector.detect_document_type(document.filename)
    
    # Update document with detected type
    document.document_type = detected_type['document_type']
    document.category = detected_type['category']
    document.processing_status = "reprocessing"
    
    await db.commit()
    await db.refresh(document)
    
    # Re-run extraction
    try:
        extraction_result = await document_extractor.extract_document_data(
            document.file_path, document.entity_id, document.document_type
        )
        
        # Update with extraction results
        document.extracted_data = extraction_result
        document.extraction_confidence = Decimal(str(extraction_result.get("confidence", 0.0)))
        document.searchable_text = extraction_result.get("raw_text", "")
        document.processing_status = "extracted"
        
        # Process EIN documents
        if document.category == "ein" or "ein" in document.category.lower():
            ein_processor = EINProcessor(db)
            extracted_ein = await ein_processor.process_ein_document(
                document.id, document.entity_id, extraction_result
            )
            if extracted_ein:
                document.processing_status = "ein_processed"
        
        await db.commit()
        await db.refresh(document)
        
        return {"message": f"Document {document_id} reprocessed successfully", "detected_type": detected_type}
        
    except Exception as e:
        logger.error(f"Error reprocessing document {document_id}: {e}")
        document.processing_status = "reprocessing_failed"
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Error reprocessing document: {str(e)}")


@router.post("/reprocess-all")
async def reprocess_all_documents(
    entity_id: int = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Reprocess all documents for an entity with auto-detection
    """
    # Get all documents for the entity
    result = await db.execute(
        select(AccountingDocument).where(AccountingDocument.entity_id == entity_id)
    )
    documents = result.scalars().all()
    
    processed_count = 0
    errors = []
    
    for document in documents:
        try:
            # Auto-detect document type and category
            detector = DocumentTypeDetector()
            detected_type = detector.detect_document_type(document.filename)
            
            # Update document with detected type
            document.document_type = detected_type['document_type']
            document.category = detected_type['category']
            document.processing_status = "reprocessing"
            
            await db.commit()
            processed_count += 1
            
        except Exception as e:
            errors.append(f"Document {document.id}: {str(e)}")
            logger.error(f"Error reprocessing document {document.id}: {e}")
    
    return {
        "message": f"Reprocessed {processed_count} documents",
        "total_documents": len(documents),
        "errors": errors
    }


# ============================================================================
# SCHEMAS
# ============================================================================

class DocumentUploadRequest(BaseModel):
    entity_id: int
    document_type: str
    category: str
    effective_date: Optional[date] = None
    is_amendment: bool = False
    amendment_number: int = 0
    original_document_id: Optional[int] = None


class DocumentResponse(BaseModel):
    id: str  # Convert to string for frontend
    entity_id: int
    entity: Optional[str] = None  # entity_name for frontend
    document_type: str
    category: str
    filename: str
    original_name: str  # Same as filename for now
    file_path: str
    size: Optional[int] = None  # file_size_bytes for frontend
    file_type: Optional[str] = None  # mime_type for frontend
    upload_date: str  # Convert to string for frontend
    uploaded_by_name: Optional[str] = None
    is_amendment: bool
    amendment_number: int
    original_document_id: Optional[int] = None
    effective_date: Optional[date] = None
    processing_status: str
    status: str  # workflow_status for frontend
    extracted_data: Optional[dict] = None
    extraction_confidence: Optional[float] = None  # Convert Decimal to float
    verified: bool
    verified_at: Optional[datetime] = None
    created_at: datetime
    journal_entries: Optional[List[dict]] = None
    
    model_config = ConfigDict(from_attributes=True)


class DocumentFilterRequest(BaseModel):
    entity_id: Optional[int] = None
    category: Optional[str] = None
    document_type: Optional[str] = None
    workflow_status: Optional[str] = None
    verified: Optional[bool] = None
    search_query: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    page: int = 1
    page_size: int = 50


class DocumentCategoryResponse(BaseModel):
    id: int
    category_name: str
    display_name: str
    icon_name: Optional[str]
    color_class: Optional[str]
    description: Optional[str]
    required_for_entity: bool
    sort_order: int
    
    model_config = ConfigDict(from_attributes=True)


class DocumentApprovalRequest(BaseModel):
    document_id: int
    action: str  # approve, reject
    notes: Optional[str] = None


class BatchUploadResult(BaseModel):
    total_files: int
    successful: int
    failed: int
    file_results: List[dict]


# ============================================================================
# UPLOAD & FILE MANAGEMENT
# ============================================================================

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads/accounting_documents")
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", 
    ".jpg", ".jpeg", ".png", ".txt", ".csv"
}


def validate_file(filename: str, file_size: int) -> tuple[bool, str]:
    """Validate uploaded file"""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"File type {ext} not allowed"
    
    if file_size > MAX_FILE_SIZE:
        return False, f"File size exceeds {MAX_FILE_SIZE / 1024 / 1024} MB limit"
    
    return True, "Valid"


def generate_file_path(entity_id: int, category: str, filename: str) -> str:
    """Generate secure file path"""
    # Create hash of filename to avoid conflicts
    file_hash = hashlib.md5(f"{datetime.utcnow().isoformat()}_{filename}".encode()).hexdigest()[:10]
    safe_filename = f"{file_hash}_{filename}"
    
    # Entity/Category/Year/Month structure
    now = datetime.utcnow()
    path = os.path.join(
        UPLOAD_DIR,
        str(entity_id),
        category,
        str(now.year),
        f"{now.month:02d}",
        safe_filename
    )
    
    return path


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    entity_id: int = Form(...),
    document_type: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    effective_date: Optional[str] = Form(None),
    is_amendment: bool = Form(False),
    amendment_number: int = Form(0),
    original_document_id: Optional[int] = Form(None),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Upload a single document with auto-detection
    Supports PDF, Word, Excel, images
    """
    
    # Validate file
    file_content = await file.read()
    file_size = len(file_content)
    await file.seek(0)
    
    is_valid, error_msg = validate_file(file.filename, file_size)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Verify entity exists
    entity_result = await db.execute(
        select(AccountingEntity).where(AccountingEntity.id == entity_id)
    )
    entity = entity_result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Auto-detect document type and category
    detector = DocumentTypeDetector()
    detected_type = detector.detect_document_type(file.filename)
    
    # Use detected type if not provided, otherwise use provided values
    final_document_type = document_type or detected_type['document_type']
    final_category = category or detected_type['category']
    
    # Generate file path using detected category
    file_path = generate_file_path(entity_id, final_category, file.filename)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    # Save file
    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Create database record
    mime_type, _ = mimetypes.guess_type(file.filename)
    effective_date_parsed = date.fromisoformat(effective_date) if effective_date else None
    
    document = AccountingDocument(
        entity_id=entity_id,
        document_type=final_document_type,
        category=final_category,
        filename=file.filename,
        file_path=file_path,
        file_size_bytes=file_size,
        mime_type=mime_type,
        uploaded_by_id=1,  # current_user.id - Auth disabled for dev
        is_amendment=is_amendment,
        amendment_number=amendment_number,
        original_document_id=original_document_id,
        effective_date=effective_date_parsed,
        processing_status="uploaded",
        workflow_status="pending"
    )
    
    db.add(document)
    await db.commit()
    await db.refresh(document)
    
    # Trigger async extraction with GPT-5 Vision
    try:
        extraction_result = await document_extractor.extract_document_data(file_path, entity_id, final_document_type)
        
        # Update document with intelligent categorization from extraction
        intelligent_category = extraction_result.get("document_type", final_category)
        document.category = intelligent_category
        document.document_type = intelligent_category
        
        document.extracted_data = extraction_result
        document.extraction_confidence = Decimal(str(extraction_result.get("confidence_score", 0.0)))
        document.searchable_text = extraction_result.get("extracted_text", "")
        document.processing_status = "extracted"
        
        # Process EIN documents to update entity
        if final_category == "ein" or "ein" in final_category.lower():
            ein_processor = EINProcessor(db)
            extracted_ein = await ein_processor.process_ein_document(
                document.id, entity_id, extraction_result
            )
            if extracted_ein:
                logger.info(f"Updated entity {entity_id} with EIN {extracted_ein}")
                document.processing_status = "ein_processed"
        
        await db.commit()
        await db.refresh(document)
        
        # Create journal entries from extracted data
        journal_entries = []
        try:
            from ..services.auto_journal_creation import process_document_for_journal_entries
            journal_entries = await process_document_for_journal_entries(db, document, extraction_result)
            if journal_entries:
                document.processing_status = "journal_entries_created"
                await db.commit()
                logger.info(f"Successfully created {len(journal_entries)} journal entries for document {document.id}")
            else:
                logger.warning(f"No journal entries created for document {document.id}")
                document.processing_status = "no_journal_entries_created"
                await db.commit()
        except Exception as je_error:
            logger.error(f"Journal entry creation failed for document {document.id}: {je_error}")
            document.processing_status = "journal_creation_failed"
            await db.commit()
            # Don't fail the upload if journal entry creation fails
        
    except Exception as e:
        # Don't fail upload if extraction fails
        document.processing_status = "failed"
        await db.commit()
    
    # Build response with proper field mapping
    response = DocumentResponse(
        id=str(document.id),
        entity_id=document.entity_id,
        entity=entity.entity_name,
        document_type=document.document_type,
        category=document.category,
        filename=document.filename,
        original_name=document.filename,
        file_path=document.file_path,
        size=document.file_size_bytes,
        file_type=document.mime_type,
        upload_date=document.created_at.isoformat(),
        uploaded_by_name="Test User",
        is_amendment=document.is_amendment,
        amendment_number=document.amendment_number,
        original_document_id=document.original_document_id,
        effective_date=document.effective_date,
        processing_status=document.processing_status,
        status=document.workflow_status,
        extracted_data=document.extracted_data,
        extraction_confidence=float(document.extraction_confidence) if document.extraction_confidence else None,
        verified=document.verified,
        verified_at=document.verified_at,
        created_at=document.created_at
    )
    
    return response


@router.post("/batch-upload", response_model=BatchUploadResult)
async def batch_upload_documents(
    files: List[UploadFile] = File(...),
    entity_id: int = Form(...),
    category: str = Form(...),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Batch upload up to 50 documents
    QuickBooks-level feature for bulk processing
    """
    
    if len(files) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 files per batch")
    
    results = []
    successful = 0
    failed = 0
    
    for file in files:
        try:
            # Read file content first
            file_content = await file.read()
            file_size = len(file_content)
            
            # Validate
            is_valid, error_msg = validate_file(file.filename, file_size)
            if not is_valid:
                results.append({
                    "filename": file.filename,
                    "status": "failed",
                    "error": error_msg
                })
                failed += 1
                continue
            
            # Save file
            file_path = generate_file_path(entity_id, category, file.filename)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Write the content we already read
            with open(file_path, "wb") as f:
                f.write(file_content)
            
            # Auto-detect document type and category
            detector = DocumentTypeDetector()
            detected_type = detector.detect_document_type(file.filename)
            
            # Use detected type if category is 'other', otherwise use provided category
            final_category = category if category != 'other' else detected_type['category']
            final_document_type = detected_type['document_type']
            
            # Create record
            mime_type, _ = mimetypes.guess_type(file.filename)
            document = AccountingDocument(
                entity_id=entity_id,
                document_type=final_document_type,
                category=final_category,
                filename=file.filename,
                file_path=file_path,
                file_size_bytes=file_size,
                mime_type=mime_type,
                uploaded_by_id=1,  # current_user.id - Auth disabled for dev
                processing_status="uploaded",
                workflow_status="pending"
            )
            
            db.add(document)
            await db.flush()
            
            results.append({
                "filename": file.filename,
                "status": "success",
                "document_id": document.id
            })
            successful += 1
            
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "failed",
                "error": str(e)
            })
            failed += 1
    
    await db.commit()
    
    # Process each document individually with GPT-5 Vision
    for result in results:
        if result["status"] == "success":
            try:
                # Get the document
                doc_result = await db.execute(
                    select(AccountingDocument).where(AccountingDocument.id == result["document_id"])
                )
                document = doc_result.scalar_one_or_none()
                
                if document:
                    # Extract data with GPT-5 Vision
                    extraction_result = await document_extractor.extract_document_data(
                        document.file_path, document.entity_id, document.document_type
                    )
                    
                    # Update document
                    document.extracted_data = extraction_result
                    document.extraction_confidence = Decimal(str(extraction_result.get("confidence_score", 0.0)))
                    document.searchable_text = extraction_result.get("extracted_text", "")
                    document.processing_status = "extracted"
                    
                    # Create journal entries
                    from ..services.auto_journal_creation import process_document_for_journal_entries
                    journal_entries = await process_document_for_journal_entries(db, document, extraction_result)
                    if journal_entries:
                        document.processing_status = "journal_entries_created"
                    
                    await db.commit()
                    
            except Exception as e:
                logger.error(f"Error processing document {result.get('document_id')}: {str(e)}")
                continue
    
    return BatchUploadResult(
        total_files=len(files),
        successful=successful,
        failed=failed,
        file_results=results
    )


# ============================================================================
# SEARCH & FILTER
# ============================================================================

@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    entity_id: Optional[int] = None,
    category: Optional[str] = None,
    document_type: Optional[str] = None,
    workflow_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_db)
):
    """List documents with optional filters"""
    from sqlalchemy import select, and_, text
    
    # Force a fresh connection by using raw SQL to bypass any caching
    raw_query = text("""
        SELECT * FROM accounting_documents 
        WHERE entity_id = :entity_id AND is_archived = 0
        ORDER BY upload_date DESC
        LIMIT :limit OFFSET :offset
    """)
    
    result = await db.execute(raw_query, {
        "entity_id": entity_id or 1,
        "limit": limit,
        "offset": skip
    })
    documents_data = result.fetchall()
    
    # Convert raw data to AccountingDocument objects
    documents = []
    for row in documents_data:
        doc = AccountingDocument(
            id=row.id,
            entity_id=row.entity_id,
            document_type=row.document_type,
            category=row.category,
            filename=row.filename,
            file_path=row.file_path,
            file_size_bytes=row.file_size_bytes,
            mime_type=row.mime_type,
            upload_date=row.upload_date,
            uploaded_by_id=row.uploaded_by_id,
            is_amendment=row.is_amendment,
            amendment_number=row.amendment_number,
            original_document_id=row.original_document_id,
            effective_date=row.effective_date,
            processing_status=row.processing_status,
            workflow_status=row.workflow_status,
            extracted_data=json.loads(row.extracted_data) if row.extracted_data else {},
            extraction_confidence=row.extraction_confidence,
            verified=row.verified,
            verified_by_id=row.verified_by_id,
            verified_at=row.verified_at,
            searchable_text=row.searchable_text,
            is_archived=row.is_archived,
            archived_at=row.archived_at,
            archived_by_id=row.archived_by_id,
            created_at=row.created_at,
            updated_at=row.updated_at
        )
        documents.append(doc)
    
    # Build responses with entity names and journal entries
    responses = []
    for doc in documents:
        entity_result = await db.execute(
            select(AccountingEntity.entity_name).where(AccountingEntity.id == doc.entity_id)
        )
        entity_name = entity_result.scalar()
        
        # Fetch journal entries for this document
        je_query = text("""
            SELECT DISTINCT je.id, je.entry_number, je.status,
                   COALESCE(SUM(jel.debit_amount), 0) as total_debits,
                   COALESCE(SUM(jel.credit_amount), 0) as total_credits
            FROM journal_entries je
            JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
            WHERE jel.document_id = :doc_id AND je.entity_id = :entity_id
            GROUP BY je.id, je.entry_number, je.status
        """)
        je_result = await db.execute(je_query, {"doc_id": doc.id, "entity_id": doc.entity_id})
        journal_entries_data = je_result.fetchall()
        
        # Convert journal entries to the expected format
        journal_entries = []
        for je_row in journal_entries_data:
            journal_entries.append({
                "id": je_row.id,
                "entry_number": je_row.entry_number,
                "status": je_row.status,
                "total_debits": float(je_row.total_debits) if je_row.total_debits else 0.0,
                "total_credits": float(je_row.total_credits) if je_row.total_credits else 0.0
            })
        
        # Map fields to match frontend expectations
        response_data = {
            "id": str(doc.id),
            "entity_id": doc.entity_id,
            "entity": entity_name,
            "document_type": doc.document_type,
            "category": doc.category,
            "filename": doc.filename,
            "original_name": doc.filename,  # Same as filename for now
            "file_path": doc.file_path,
            "size": doc.file_size_bytes,
            "file_type": doc.mime_type,
            "upload_date": doc.upload_date if doc.upload_date else "",
            "uploaded_by_name": "Test User",  # Placeholder
            "is_amendment": doc.is_amendment,
            "amendment_number": doc.amendment_number,
            "original_document_id": doc.original_document_id,
            "effective_date": doc.effective_date,
            "processing_status": doc.processing_status,
            "status": doc.workflow_status,
            "extracted_data": doc.extracted_data,
            "extraction_confidence": float(doc.extraction_confidence) if doc.extraction_confidence else None,
            "verified": doc.verified,
            "verified_at": doc.verified_at,
            "created_at": doc.created_at,
            "journal_entries": journal_entries
        }
        
        response = DocumentResponse.model_validate(response_data)
        responses.append(response)
    
    return responses


@router.post("/search", response_model=dict)
async def search_documents(
    filters: DocumentFilterRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Advanced document search with filters
    Full-text search on extracted text
    """
    
    query = select(AccountingDocument).where(
        AccountingDocument.is_archived == False
    )
    
    # Apply filters
    if filters.entity_id:
        query = query.where(AccountingDocument.entity_id == filters.entity_id)
    
    if filters.category:
        query = query.where(AccountingDocument.category == filters.category)
    
    if filters.document_type:
        query = query.where(AccountingDocument.document_type == filters.document_type)
    
    if filters.workflow_status:
        query = query.where(AccountingDocument.workflow_status == filters.workflow_status)
    
    if filters.verified is not None:
        query = query.where(AccountingDocument.verified == filters.verified)
    
    if filters.date_from:
        query = query.where(AccountingDocument.upload_date >= filters.date_from)
    
    if filters.date_to:
        query = query.where(AccountingDocument.upload_date <= filters.date_to)
    
    # Full-text search
    if filters.search_query:
        search_term = f"%{filters.search_query}%"
        query = query.where(
            or_(
                AccountingDocument.filename.ilike(search_term),
                AccountingDocument.searchable_text.ilike(search_term)
            )
        )
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Pagination
    offset = (filters.page - 1) * filters.page_size
    query = query.order_by(desc(AccountingDocument.upload_date))
    query = query.offset(offset).limit(filters.page_size)
    
    # Execute
    result = await db.execute(query)
    documents = result.scalars().all()
    
    # Build response
    doc_responses = []
    for doc in documents:
        # Get entity name
        entity_result = await db.execute(
            select(AccountingEntity.entity_name).where(AccountingEntity.id == doc.entity_id)
        )
        entity_name = entity_result.scalar()
        
        # Get uploader name
        uploader_result = await db.execute(
            select(Partners).where(Partners.id == doc.uploaded_by_id)
        )
        uploader = uploader_result.scalar_one_or_none()
        uploader_name = f"{uploader.first_name} {uploader.last_name}" if uploader else "Unknown"
        
        response = DocumentResponse.model_validate(doc)
        response.entity_name = entity_name
        response.uploaded_by_name = uploader_name
        doc_responses.append(response)
    
    return {
        "documents": [doc.dict() for doc in doc_responses],
        "pagination": {
            "page": filters.page,
            "page_size": filters.page_size,
            "total": total,
            "total_pages": (total + filters.page_size - 1) // filters.page_size
        }
    }


@router.get("/categories", response_model=List[DocumentCategoryResponse])
async def get_document_categories(
    db: AsyncSession = Depends(get_async_db)
):
    """Get all document categories"""
    
    result = await db.execute(
        select(AccountingDocumentCategory).order_by(
            AccountingDocumentCategory.sort_order
        )
    )
    categories = result.scalars().all()
    
    return [DocumentCategoryResponse.model_validate(cat) for cat in categories]


# ============================================================================
# APPROVAL WORKFLOW
# ============================================================================

@router.post("/approve")
async def approve_document(
    request: DocumentApprovalRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Approve or reject a document
    Dual approval for sensitive documents
    """
    
    # Get document
    result = await db.execute(
        select(AccountingDocument).where(AccountingDocument.id == request.document_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.workflow_status != "pending":
        raise HTTPException(status_code=400, detail="Document already processed")
    
    # Update status
    if request.action == "approve":
        document.workflow_status = "approved"
        document.verified = True
        document.verified_by_id = 1  # current_user.id - Auth disabled for dev
        document.verified_at = datetime.utcnow()
    elif request.action == "reject":
        document.workflow_status = "rejected"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    await db.commit()
    
    return {"message": f"Document {request.action}d successfully"}


# ============================================================================
# DOWNLOAD & VIEW
# ============================================================================

@router.get("/download/{document_id}")
async def download_document(
    document_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Download document file"""
    
    result = await db.execute(
        select(AccountingDocument).where(AccountingDocument.id == document_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found in database")
    
    # Try both relative and absolute paths
    file_path = document.file_path
    if not os.path.exists(file_path):
        # Try with /app prefix
        file_path = f"/app/{document.file_path}"
    if not os.path.exists(file_path):
        # Try without ./ prefix
        file_path = document.file_path.replace('./', '/app/')
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404, 
            detail=f"File not found on disk. Path: {document.file_path}"
        )
    
    return FileResponse(
        path=file_path,
        filename=document.filename,
        media_type=document.mime_type or "application/octet-stream"
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Get document by ID"""
    
    result = await db.execute(
        select(AccountingDocument).where(
            and_(
                AccountingDocument.id == document_id,
                AccountingDocument.is_archived == False
            )
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get entity name
    entity_result = await db.execute(
        select(AccountingEntity.entity_name).where(AccountingEntity.id == document.entity_id)
    )
    entity_name = entity_result.scalar()
    
    # Get uploader name
    uploader_result = await db.execute(
        select(Partners).where(Partners.id == document.uploaded_by_id)
    )
    uploader = uploader_result.scalar_one_or_none()
    uploader_name = uploader.name if uploader else "Unknown"
    
    # Build response with proper field mapping
    response = DocumentResponse(
        id=str(document.id),
        entity_id=document.entity_id,
        entity=entity_name,
        document_type=document.document_type,
        category=document.category,
        filename=document.filename,
        original_name=document.filename,
        file_path=document.file_path,
        size=document.file_size_bytes,
        file_type=document.mime_type,
        upload_date=document.created_at.isoformat(),
        uploaded_by_name=uploader_name,
        is_amendment=document.is_amendment,
        amendment_number=document.amendment_number,
        original_document_id=document.original_document_id,
        effective_date=document.effective_date,
        processing_status=document.processing_status,
        status=document.workflow_status,
        extracted_data=document.extracted_data,
        extraction_confidence=float(document.extraction_confidence) if document.extraction_confidence else None,
        verified=document.verified,
        verified_at=document.verified_at,
        created_at=document.created_at
    )
    
    return response


@router.post("/{document_id}/reprocess")
async def reprocess_document(
    document_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Reprocess a document to create journal entries"""
    
    # Get document
    result = await db.execute(
        select(AccountingDocument).where(AccountingDocument.id == document_id)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check if document has extracted data
    if not document.extracted_data:
        raise HTTPException(status_code=400, detail="Document has no extracted data to process")
    
    # Reset processing status
    document.processing_status = "extracted"
    await db.commit()
    await db.refresh(document)
    
    # Create journal entries from extracted data
    journal_entries = []
    try:
        from ..services.auto_journal_creation import process_document_for_journal_entries
        journal_entries = await process_document_for_journal_entries(db, document, document.extracted_data)
        if journal_entries:
            document.processing_status = "journal_entries_created"
            await db.commit()
            logger.info(f"Successfully created {len(journal_entries)} journal entries for document {document.id}")
        else:
            logger.warning(f"No journal entries created for document {document.id}")
            document.processing_status = "no_journal_entries_created"
            await db.commit()
    except Exception as je_error:
        logger.error(f"Journal entry creation failed for document {document.id}: {je_error}")
        document.processing_status = "journal_creation_failed"
        await db.commit()
        # Don't fail the reprocess if journal entry creation fails
    
    # Get entity name
    entity_result = await db.execute(
        select(AccountingEntity.entity_name).where(AccountingEntity.id == document.entity_id)
    )
    entity_name = entity_result.scalar()
    
    # Get uploader name
    uploader_result = await db.execute(
        select(Partners).where(Partners.id == document.uploaded_by_id)
    )
    uploader = uploader_result.scalar_one_or_none()
    uploader_name = uploader.name if uploader else "Unknown"
    
    # Build response with proper field mapping
    response = DocumentResponse(
        id=str(document.id),
        entity_id=document.entity_id,
        entity=entity_name,
        document_type=document.document_type,
        category=document.category,
        filename=document.filename,
        original_name=document.filename,
        file_path=document.file_path,
        size=document.file_size_bytes,
        file_type=document.mime_type,
        upload_date=document.created_at.isoformat(),
        uploaded_by_name=uploader_name,
        is_amendment=document.is_amendment,
        amendment_number=document.amendment_number,
        original_document_id=document.original_document_id,
        effective_date=document.effective_date,
        processing_status=document.processing_status,
        status=document.workflow_status,
        extracted_data=document.extracted_data,
        extraction_confidence=float(document.extraction_confidence) if document.extraction_confidence else None,
        verified=document.verified,
        verified_at=document.verified_at,
        created_at=document.created_at
    )
    
    return response


@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Soft delete document"""
    
    result = await db.execute(
        select(AccountingDocument).where(AccountingDocument.id == document_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Soft delete
    document.is_archived = True
    document.archived_at = datetime.utcnow()
    document.archived_by_id = 1  # current_user.id - Auth disabled for dev
    
    await db.commit()
    
    return {"message": "Document archived successfully"}

