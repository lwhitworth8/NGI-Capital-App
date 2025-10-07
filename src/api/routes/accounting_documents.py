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

from pydantic import BaseModel, Field, ConfigDict
from ..database_async import get_async_db
from ..models_accounting import AccountingEntity
from ..models_accounting_part2 import AccountingDocument, AccountingDocumentCategory
from ..models import Partners
# TODO: Implement document extraction service
# from ..services.document_extractor import extract_document_data, process_batch_documents

# Stub for extraction service (not yet implemented)
async def process_batch_documents(db, document_ids):
    """Placeholder for batch document processing"""
    # TODO: Implement AI extraction
    pass


router = APIRouter(prefix="/api/accounting/documents", tags=["Accounting - Documents"])


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
    id: int
    entity_id: int
    entity_name: Optional[str] = None
    document_type: str
    category: str
    filename: str
    file_path: str
    file_size_bytes: Optional[int]
    mime_type: Optional[str]
    upload_date: datetime
    uploaded_by_name: Optional[str] = None
    is_amendment: bool
    amendment_number: int
    original_document_id: Optional[int] = None
    effective_date: Optional[date] = None
    processing_status: str
    workflow_status: str
    extracted_data: Optional[dict] = None
    extraction_confidence: Optional[Decimal] = None
    verified: bool
    verified_at: Optional[datetime] = None
    created_at: datetime
    
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
    document_type: str = Form(...),
    category: str = Form(...),
    effective_date: Optional[str] = Form(None),
    is_amendment: bool = Form(False),
    amendment_number: int = Form(0),
    original_document_id: Optional[int] = Form(None),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Upload a single document
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
    
    # Generate file path
    file_path = generate_file_path(entity_id, category, file.filename)
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
        document_type=document_type,
        category=category,
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
    
    # Trigger async extraction
    try:
        extraction_result = await extract_document_data(file_path, document_type, category)
        
        document.extracted_data = extraction_result.get("data", {})
        document.extraction_confidence = Decimal(str(extraction_result.get("confidence", 0.0)))
        document.searchable_text = extraction_result.get("text", "")
        document.processing_status = "extracted"
        
        await db.commit()
        await db.refresh(document)
    except Exception as e:
        # Don't fail upload if extraction fails
        document.processing_status = "failed"
        await db.commit()
    
    # Build response
    response = DocumentResponse.model_validate(document)
    response.entity_name = entity.entity_name
    response.uploaded_by_name = "Test User"  # f"{current_user.first_name} {current_user.last_name}" - Auth disabled for dev
    
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
            
            # Create record
            mime_type, _ = mimetypes.guess_type(file.filename)
            document = AccountingDocument(
                entity_id=entity_id,
                document_type="Receipt",  # Default for batch
                category=category,
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
    
    # Queue batch extraction
    document_ids = [r["document_id"] for r in results if r["status"] == "success"]
    await process_batch_documents(db, document_ids)
    
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
    from sqlalchemy import select, and_
    
    query = select(AccountingDocument).where(AccountingDocument.is_archived == False)
    
    if entity_id:
        query = query.where(AccountingDocument.entity_id == entity_id)
    if category:
        query = query.where(AccountingDocument.category == category)
    if document_type:
        query = query.where(AccountingDocument.document_type == document_type)
    if workflow_status:
        query = query.where(AccountingDocument.workflow_status == workflow_status)
    
    query = query.offset(skip).limit(limit).order_by(AccountingDocument.upload_date.desc())
    
    result = await db.execute(query)
    documents = result.scalars().all()
    
    # Build responses with entity names
    responses = []
    for doc in documents:
        entity_result = await db.execute(
            select(AccountingEntity.entity_name).where(AccountingEntity.id == doc.entity_id)
        )
        entity_name = entity_result.scalar()
        
        response = DocumentResponse.model_validate(doc)
        response.entity_name = entity_name
        response.uploaded_by_name = "Test User"  # Placeholder
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
    uploader_name = f"{uploader.first_name} {uploader.last_name}" if uploader else "Unknown"
    
    response = DocumentResponse.model_validate(document)
    response.entity_name = entity_name
    response.uploaded_by_name = uploader_name
    
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

