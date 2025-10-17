"""
Minimal Accounting Documents API
--------------------------------
Simple upload + list + view endpoints to support the existing UI.

No extraction, no auto-JE. Users choose category before upload.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, ConfigDict
import json
from typing import List, Optional
from datetime import datetime, date
import os
import hashlib
import mimetypes
import shutil

from ..database_async import get_async_db
from ..models_accounting import AccountingEntity
from ..models_accounting_part2 import AccountingDocument


router = APIRouter(prefix="/api/accounting/documents", tags=["Accounting - Documents"])


# Storage config
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads/accounting_documents")
ABS_UPLOAD_DIR = os.path.abspath(UPLOAD_DIR)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".jpg", ".jpeg", ".png", ".txt", ".csv", ".xps"
}


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    entity_id: int
    entity: Optional[str] = None
    document_type: str
    category: str
    filename: str
    original_name: str
    file_path: str
    size: Optional[int] = None
    file_type: Optional[str] = None
    upload_date: str
    uploaded_by_name: Optional[str] = None
    is_amendment: bool
    amendment_number: int
    original_document_id: Optional[int] = None
    effective_date: Optional[date] = None
    processing_status: str
    status: str
    extracted_data: Optional[dict] = None
    extraction_confidence: Optional[float] = None
    verified: bool
    verified_at: Optional[datetime] = None
    created_at: datetime


class BatchUploadResult(BaseModel):
    total_files: int
    successful: int
    failed: int
    file_results: List[dict]


def _validate_file(filename: str, size: int) -> None:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File size exceeds {MAX_FILE_SIZE // (1024*1024)} MB limit")


def _generate_storage_path(entity_id: int, category: str, original_name: str) -> str:
    # Avoid collisions using a hash based on name+time
    ts = datetime.utcnow().isoformat()
    base, ext = os.path.splitext(original_name)
    digest = hashlib.sha256(f"{original_name}-{ts}".encode("utf-8")).hexdigest()[:16]
    safe_cat = category.strip().lower().replace(" ", "_") or "other"
    # Always write under absolute uploads dir
    return os.path.join(ABS_UPLOAD_DIR, str(entity_id), safe_cat, f"{base}_{digest}{ext}")


def _resolve_existing_file(file_path: str) -> Optional[str]:
    """Resolve stored file path across possible working directories.

    Tries:
    1) As stored
    2) Absolute path of stored
    3) Repo root + stored (if relative)
    4) Parent-of-cwd + stored (if relative)
    """
    try_paths = []

    # 1) As stored
    try_paths.append(file_path)

    # 2) Absolute path of stored
    try_paths.append(os.path.abspath(file_path))

    # Prepare relative without leading ./ or .\\
    rel = file_path
    if rel.startswith("./"):
        rel = rel[2:]
    if rel.startswith(".\\"):
        rel = rel[2:]

    # 3) Repo root + stored (compute repo root relative to this file)
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
    try_paths.append(os.path.join(repo_root, rel))

    # 4) Parent-of-cwd + stored
    parent_cwd = os.path.abspath(os.path.join(os.getcwd(), ".."))
    try_paths.append(os.path.join(parent_cwd, rel))

    for p in try_paths:
        try:
            if p and os.path.exists(p):
                return p
        except Exception:
            continue
    return None


async def _entity_name(db: AsyncSession, entity_id: int) -> Optional[str]:
    res = await db.execute(select(AccountingEntity.entity_name).where(AccountingEntity.id == entity_id))
    return res.scalar_one_or_none()


def _to_response(doc: AccountingDocument, entity_name: Optional[str]) -> DocumentResponse:
    mime = doc.mime_type or mimetypes.guess_type(doc.filename)[0]
    # Coerce extracted_data to dict if legacy rows stored JSON string
    extracted: Optional[dict]
    try:
        if isinstance(doc.extracted_data, str):
            extracted = json.loads(doc.extracted_data)
        else:
            extracted = doc.extracted_data
    except Exception:
        extracted = None
    # Normalize processing status for simplified pipeline (no background processing)
    raw_status = (doc.processing_status or "").strip().lower()
    normalized_status = "extracted"
    if raw_status in {"failed", "extraction_failed"}:
        normalized_status = "failed"

    return DocumentResponse(
        id=str(doc.id),
        entity_id=doc.entity_id,
        entity=entity_name,
        document_type=doc.category,
        category=doc.category,
        filename=doc.filename,
        original_name=doc.filename,
        file_path=doc.file_path,
        size=doc.file_size_bytes,
        file_type=mime,
        upload_date=(doc.upload_date or doc.created_at).isoformat() if getattr(doc, "upload_date", None) else doc.created_at.isoformat(),
        uploaded_by_name=None,
        is_amendment=bool(doc.is_amendment),
        amendment_number=doc.amendment_number or 0,
        original_document_id=doc.original_document_id,
        effective_date=doc.effective_date,
        processing_status=normalized_status,
        status=doc.workflow_status or "draft",
        extracted_data=extracted,
        extraction_confidence=float(doc.extraction_confidence) if doc.extraction_confidence else None,
        verified=bool(doc.verified),
        verified_at=doc.verified_at,
        created_at=doc.created_at,
    )


@router.get("/")
async def list_documents(
    entity_id: int = Query(...),
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_async_db),
):
    q = select(AccountingDocument).where(AccountingDocument.entity_id == entity_id)
    if category:
        q = q.where(AccountingDocument.category == category)
    q = q.order_by(AccountingDocument.created_at.desc())
    res = await db.execute(q)
    docs = res.scalars().all()
    name = await _entity_name(db, entity_id)
    return [_to_response(d, name) for d in docs]


@router.get("/{document_id}")
async def get_document(document_id: int, db: AsyncSession = Depends(get_async_db)):
    res = await db.execute(select(AccountingDocument).where(AccountingDocument.id == document_id))
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    name = await _entity_name(db, doc.entity_id)
    return _to_response(doc, name)


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    entity_id: int = Form(...),
    category: str = Form(...),
    db: AsyncSession = Depends(get_async_db),
):
    content = await file.read()
    _validate_file(file.filename, len(content))

    # Ensure entity exists
    ent = await db.execute(select(AccountingEntity).where(AccountingEntity.id == entity_id))
    if ent.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Entity not found")

    # Build storage path and persist
    abs_path = _generate_storage_path(entity_id, category, file.filename)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    with open(abs_path, "wb") as f:
        f.write(content)

    mime, _ = mimetypes.guess_type(file.filename)
    doc = AccountingDocument(
        entity_id=entity_id,
        document_type=category,
        category=category,
        filename=file.filename,
        file_path=abs_path,
        file_size_bytes=len(content),
        mime_type=mime,
        uploaded_by_id=1,
        is_amendment=False,
        amendment_number=0,
        original_document_id=None,
        effective_date=None,
        processing_status="extracted",
        workflow_status="draft",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    name = await _entity_name(db, entity_id)
    return _to_response(doc, name)


@router.post("/batch-upload")
async def batch_upload(
    files: List[UploadFile] = File(...),
    entity_id: int = Form(...),
    category: str = Form(...),
    db: AsyncSession = Depends(get_async_db),
):
    results: List[dict] = []
    success = 0
    for uf in files:
        try:
            content = await uf.read()
            _validate_file(uf.filename, len(content))
            abs_path = _generate_storage_path(entity_id, category, uf.filename)
            os.makedirs(os.path.dirname(abs_path), exist_ok=True)
            with open(abs_path, "wb") as f:
                f.write(content)
            mime, _ = mimetypes.guess_type(uf.filename)
            doc = AccountingDocument(
                entity_id=entity_id,
                document_type=category,
                category=category,
                filename=uf.filename,
                file_path=abs_path,
                file_size_bytes=len(content),
                mime_type=mime,
                uploaded_by_id=1,
                is_amendment=False,
                amendment_number=0,
                original_document_id=None,
                effective_date=None,
                processing_status="extracted",
                workflow_status="draft",
            )
            db.add(doc)
            await db.commit()
            await db.refresh(doc)
            results.append({"id": str(doc.id), "filename": doc.filename, "status": "ok"})
            success += 1
        except HTTPException as he:
            results.append({"filename": uf.filename, "status": "error", "detail": he.detail})
        except Exception as e:
            results.append({"filename": uf.filename, "status": "error", "detail": str(e)})

    return BatchUploadResult(total_files=len(files), successful=success, failed=len(files) - success, file_results=results)


@router.get("/view/{document_id}")
async def view_document(document_id: int, db: AsyncSession = Depends(get_async_db)):
    res = await db.execute(select(AccountingDocument).where(AccountingDocument.id == document_id))
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    resolved = _resolve_existing_file(doc.file_path)
    if not resolved:
        raise HTTPException(status_code=404, detail="Document not found")
    # Force inline display with correct media type
    ext = os.path.splitext(doc.filename)[1].lower()
    media = doc.mime_type or mimetypes.guess_type(doc.filename)[0] or "application/octet-stream"
    if ext == ".pdf":
        media = "application/pdf"
    headers = {"Content-Disposition": f"inline; filename=\"{doc.filename}\""}
    return FileResponse(path=resolved, media_type=media, headers=headers)


@router.get("/download/{document_id}")
async def download_document(document_id: int, db: AsyncSession = Depends(get_async_db)):
    res = await db.execute(select(AccountingDocument).where(AccountingDocument.id == document_id))
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    resolved = _resolve_existing_file(doc.file_path)
    if not resolved:
        raise HTTPException(status_code=404, detail="Document not found")
    # Explicit attachment for downloads
    media = doc.mime_type or mimetypes.guess_type(doc.filename)[0] or "application/octet-stream"
    headers = {"Content-Disposition": f"attachment; filename=\"{doc.filename}\""}
    return FileResponse(path=resolved, media_type=media, headers=headers)
