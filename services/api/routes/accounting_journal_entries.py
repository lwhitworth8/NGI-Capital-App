"""
Minimal Journal Entries API (manual, dual-approval)
---------------------------------------------------
Workflow: draft -> pending_first_approval -> pending_final_approval -> posted.
Supports: create/update draft, list/get, submit, approve, reject, link document.
No auto-JE creation. Includes ASC (primary_asc_topic) in responses.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update, delete, and_, func
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

from ..database_async import get_async_db
from ..models_accounting import (
    JournalEntry, JournalEntryLine, ChartOfAccounts,
    AccountingEntity, JournalEntryAuditLog, JournalEntryAttachment
)
from ..models_accounting_part2 import AccountingDocument
from ..models_ar import Invoice
from ..models import Partners as Partner
from ..utils.datetime_utils import get_pst_now
from ..services.xbrl_taxonomy_service import get_xbrl_service
import os


router = APIRouter(prefix="/api/accounting/journal-entries", tags=["Accounting - Journal Entries"])


# ---------------------- Schemas ----------------------

class JELineInput(BaseModel):
    account_id: int
    debit_amount: Decimal = Decimal("0.00")
    credit_amount: Decimal = Decimal("0.00")
    description: Optional[str] = None

class JECreateRequest(BaseModel):
    entity_id: int
    entry_date: date
    entry_type: str = "Standard"
    memo: Optional[str] = None
    reference: Optional[str] = None
    lines: List[JELineInput]
    # Optional header metadata for audit completeness
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    currency: Optional[str] = None
    exchange_rate: Optional[float] = None
    reversing: Optional[bool] = None
    reversal_date: Optional[date] = None

class JEUpdateRequest(BaseModel):
    entry_date: Optional[date] = None
    entry_type: Optional[str] = None
    memo: Optional[str] = None
    reference: Optional[str] = None
    lines: Optional[List[JELineInput]] = None
    # Same header metadata fields available for update
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    currency: Optional[str] = None
    exchange_rate: Optional[float] = None
    reversing: Optional[bool] = None
    reversal_date: Optional[date] = None

class JELineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    line_number: int
    account_id: int
    account_number: str
    account_name: str
    debit_amount: float
    credit_amount: float
    description: Optional[str] = None
    primary_asc_topic: Optional[str] = None
    xbrl_element_name: Optional[str] = None
    xbrl_standard_label: Optional[str] = None

class JEResponse(BaseModel):
    id: int
    entry_number: str
    entity_id: int
    entity_name: str
    entry_date: date
    fiscal_year: int
    fiscal_period: int
    entry_type: str
    memo: Optional[str]
    reference: Optional[str]
    status: str
    workflow_stage: int
    created_by_name: str
    created_at: datetime
    first_approved_by_name: Optional[str] = None
    final_approved_by_name: Optional[str] = None
    posted_at: Optional[datetime] = None
    is_locked: bool
    document_id: Optional[int] = None
    lines: List[JELineResponse]
    total_debits: float
    total_credits: float
    attachments: List[dict] = []
    extracted_data: Optional[dict] = None


# ---------------------- Helpers ----------------------

async def _get_partner_name(db: AsyncSession, partner_id: Optional[int]) -> Optional[str]:
    if not partner_id:
        return None
    res = await db.execute(select(Partner).where(Partner.id == partner_id))
    p = res.scalar_one_or_none()
    return p.name if p else None

async def _generate_entry_number(db: AsyncSession, fiscal_year: int) -> str:
    res = await db.execute(select(JournalEntry).where(JournalEntry.fiscal_year == fiscal_year))
    count = len(res.scalars().all())
    return f"JE-{fiscal_year}-{(count + 1):06d}"

async def _build_line_responses(db: AsyncSession, je_id: int) -> List[JELineResponse]:
    res = await db.execute(select(JournalEntryLine).where(JournalEntryLine.journal_entry_id == je_id).order_by(JournalEntryLine.line_number))
    lines = res.scalars().all()
    out: List[JELineResponse] = []
    for ln in lines:
        acc = await db.execute(select(ChartOfAccounts).where(ChartOfAccounts.id == ln.account_id))
        acc_row = acc.scalar_one_or_none()
        out.append(JELineResponse(
            id=ln.id,
            line_number=ln.line_number,
            account_id=ln.account_id,
            account_number=acc_row.account_number if acc_row else "",
            account_name=acc_row.account_name if acc_row else "",
            debit_amount=float(ln.debit_amount),
            credit_amount=float(ln.credit_amount),
            description=ln.description,
            primary_asc_topic=(ln.primary_asc_topic or (acc_row.primary_asc_topic if acc_row else None)),
            xbrl_element_name=ln.xbrl_element_name,
            xbrl_standard_label=ln.xbrl_standard_label,
        ))
    return out

async def _build_response(db: AsyncSession, je: JournalEntry) -> JEResponse:
    en = await db.execute(select(AccountingEntity.entity_name).where(AccountingEntity.id == je.entity_id))
    entity_name = en.scalar_one_or_none() or "Unknown Entity"
    created_by = await _get_partner_name(db, je.created_by_id)
    first_name = await _get_partner_name(db, je.first_approved_by_id)
    final_name = await _get_partner_name(db, je.final_approved_by_id)
    lines = await _build_line_responses(db, je.id)
    # Attachments
    atts_res = await db.execute(
        select(JournalEntryAttachment, AccountingDocument)
        .join(AccountingDocument, AccountingDocument.id == JournalEntryAttachment.document_id)
        .where(JournalEntryAttachment.journal_entry_id == je.id)
        .order_by(JournalEntryAttachment.display_order, JournalEntryAttachment.id)
    )
    attachments = []
    for att, doc in atts_res:
        attachments.append({
            "document_id": att.document_id,
            "attachment_id": att.id,
            "is_primary": att.is_primary,
            "display_order": att.display_order,
            "filename": getattr(doc, "filename", None) or getattr(doc, "original_name", None),
            "original_name": getattr(doc, "original_name", None) or getattr(doc, "filename", None),
            "category": getattr(doc, "category", None),
            "upload_date": getattr(doc, "upload_date", None) or getattr(doc, "created_at", None),
        })
    total_debits = sum(l.debit_amount for l in lines)
    total_credits = sum(l.credit_amount for l in lines)
    return JEResponse(
        id=je.id,
        entry_number=je.entry_number,
        entity_id=je.entity_id,
        entity_name=entity_name,
        entry_date=je.entry_date,
        fiscal_year=je.fiscal_year,
        fiscal_period=je.fiscal_period,
        entry_type=je.entry_type,
        memo=je.memo,
        reference=je.reference,
        status=je.status,
        workflow_stage=je.workflow_stage,
        created_by_name=created_by or "",
        created_at=je.created_at,
        first_approved_by_name=first_name,
        final_approved_by_name=final_name,
        posted_at=je.posted_at,
        is_locked=je.is_locked,
        document_id=je.document_id,
        lines=lines,
        total_debits=float(total_debits),
        total_credits=float(total_credits),
        attachments=attachments,
        extracted_data=getattr(je, "extracted_data", None),
    )

def _validate_lines_basic(lines: List[JELineInput]):
    if len(lines) < 2:
        raise HTTPException(status_code=400, detail="Journal entry must have at least 2 lines")
    for ln in lines:
        if ln.debit_amount < 0 or ln.credit_amount < 0:
            raise HTTPException(status_code=400, detail="Amounts cannot be negative")
        if (ln.debit_amount > 0 and ln.credit_amount > 0) or (ln.debit_amount == 0 and ln.credit_amount == 0):
            raise HTTPException(status_code=400, detail="Each line must have either debit or credit (not both or neither)")
    deb = sum(ln.debit_amount for ln in lines)
    cred = sum(ln.credit_amount for ln in lines)
    if deb != cred:
        raise HTTPException(status_code=400, detail=f"Entry must be balanced. Debits={deb}, Credits={cred}")


# ---------------------- Routes ----------------------

@router.get("/")
async def list_journal_entries(
    entity_id: int = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    res = await db.execute(
        select(JournalEntry).where(JournalEntry.entity_id == entity_id).order_by(desc(JournalEntry.entry_date), desc(JournalEntry.id))
    )
    entries = res.scalars().all()
    return [await _build_response(db, e) for e in entries]


@router.get("/{entry_id}")
async def get_journal_entry(entry_id: int, db: AsyncSession = Depends(get_async_db)):
    res = await db.execute(select(JournalEntry).where(JournalEntry.id == entry_id))
    je = res.scalar_one_or_none()
    if not je:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return await _build_response(db, je)


@router.post("/")
async def create_journal_entry(req: JECreateRequest, db: AsyncSession = Depends(get_async_db)):
    # Validate entity
    ent = await db.execute(select(AccountingEntity).where(AccountingEntity.id == req.entity_id))
    if not ent.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Entity not found")

    _validate_lines_basic(req.lines)

    # Validate accounts and allow_posting
    for ln in req.lines:
        acc = await db.execute(select(ChartOfAccounts).where(ChartOfAccounts.id == ln.account_id))
        acc_row = acc.scalar_one_or_none()
        if not acc_row:
            raise HTTPException(status_code=400, detail=f"Account {ln.account_id} not found")
        if not acc_row.allow_posting:
            raise HTTPException(status_code=400, detail=f"Account {acc_row.account_number} does not allow posting")

    fiscal_year = req.entry_date.year
    fiscal_period = req.entry_date.month
    entry_number = await _generate_entry_number(db, fiscal_year)

    je = JournalEntry(
        entity_id=req.entity_id,
        entry_number=entry_number,
        entry_date=req.entry_date,
        fiscal_year=fiscal_year,
        fiscal_period=fiscal_period,
        entry_type=req.entry_type,
        memo=req.memo,
        reference=req.reference,
        source_type="ManualEntry",
        status="draft",
        workflow_stage=0,
        created_by_id=1,  # TODO: integrate real auth
        created_at=get_pst_now(),
        is_locked=False,
        is_reversing=bool(req.reversing) if req.reversing is not None else False,
    )
    # Store optional header metadata into extracted_data for audit context
    header_meta = {}
    if req.vendor_name is not None:
        header_meta["vendor_name"] = req.vendor_name
    if req.invoice_number is not None:
        header_meta["invoice_number"] = req.invoice_number
    if req.invoice_date is not None:
        header_meta["invoice_date"] = req.invoice_date.isoformat()
    if req.due_date is not None:
        header_meta["due_date"] = req.due_date.isoformat()
    if req.currency is not None:
        header_meta["currency"] = req.currency
    if req.exchange_rate is not None:
        header_meta["exchange_rate"] = req.exchange_rate
    if req.reversing is not None:
        header_meta["reversing"] = req.reversing
    if req.reversal_date is not None:
        header_meta["reversal_date"] = req.reversal_date.isoformat()
    if header_meta:
        je.extracted_data = header_meta
    db.add(je)
    await db.flush()

    # Add lines (with XBRL enrichment)
    line_no = 1
    xbrl = get_xbrl_service()
    for ln in req.lines:
        # Resolve COA row for mapping and validation (already validated above)
        acc = await db.execute(select(ChartOfAccounts).where(ChartOfAccounts.id == ln.account_id))
        acc_row = acc.scalar_one_or_none()

        # Determine XBRL fields using COA mapping when available
        xbrl_element_name = acc_row.xbrl_element_name if acc_row else None
        xbrl_standard_label = None
        primary_asc_topic = None
        try:
            if xbrl_element_name:
                el = xbrl.get_element(xbrl_element_name)
                if el:
                    xbrl_standard_label = el.get('standard_label')
                    primary_asc_topic = acc_row.primary_asc_topic or el.get('primary_asc_topic')
            else:
                # Fallback: keep hints only (do not set element on line if COA not mapped)
                primary_asc_topic = acc_row.primary_asc_topic if acc_row else None
        except Exception:
            # Non-fatal; proceed without XBRL enrichment
            pass

        db.add(JournalEntryLine(
            journal_entry_id=je.id,
            line_number=line_no,
            account_id=ln.account_id,
            debit_amount=ln.debit_amount,
            credit_amount=ln.credit_amount,
            description=ln.description,
            xbrl_element_name=xbrl_element_name,
            xbrl_standard_label=xbrl_standard_label,
            primary_asc_topic=primary_asc_topic,
        ))
        line_no += 1

    # Audit
    db.add(JournalEntryAuditLog(
        journal_entry_id=je.id,
        action="created",
        performed_by_id=1,
        performed_at=get_pst_now(),
        comment="JE created"
    ))

    await db.commit()
    await db.refresh(je)
    return await _build_response(db, je)


@router.put("/{entry_id}")
async def update_journal_entry(entry_id: int, req: JEUpdateRequest, db: AsyncSession = Depends(get_async_db)):
    res = await db.execute(select(JournalEntry).where(JournalEntry.id == entry_id))
    je = res.scalar_one_or_none()
    if not je:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    if je.status != "draft" or je.workflow_stage != 0 or je.is_locked:
        raise HTTPException(status_code=400, detail="Only draft entries can be edited")

    # If lines provided, validate
    if req.lines is not None:
        _validate_lines_basic(req.lines)
        for ln in req.lines:
            acc = await db.execute(select(ChartOfAccounts).where(ChartOfAccounts.id == ln.account_id))
            acc_row = acc.scalar_one_or_none()
            if not acc_row:
                raise HTTPException(status_code=400, detail=f"Account {ln.account_id} not found")
            if not acc_row.allow_posting:
                raise HTTPException(status_code=400, detail=f"Account {acc_row.account_number} does not allow posting")

    # Update header
    if req.entry_date is not None:
        je.entry_date = req.entry_date
        je.fiscal_year = req.entry_date.year
        je.fiscal_period = req.entry_date.month
    if req.entry_type is not None:
        je.entry_type = req.entry_type
    if req.memo is not None:
        je.memo = req.memo
    if req.reference is not None:
        je.reference = req.reference
    if req.reversing is not None:
        je.is_reversing = bool(req.reversing)

    # Merge header metadata into extracted_data if provided
    meta_updates = {}
    if req.vendor_name is not None:
        meta_updates["vendor_name"] = req.vendor_name
    if req.invoice_number is not None:
        meta_updates["invoice_number"] = req.invoice_number
    if req.invoice_date is not None:
        meta_updates["invoice_date"] = req.invoice_date.isoformat()
    if req.due_date is not None:
        meta_updates["due_date"] = req.due_date.isoformat()
    if req.currency is not None:
        meta_updates["currency"] = req.currency
    if req.exchange_rate is not None:
        meta_updates["exchange_rate"] = req.exchange_rate
    if req.reversing is not None:
        meta_updates["reversing"] = req.reversing
    if req.reversal_date is not None:
        meta_updates["reversal_date"] = req.reversal_date.isoformat()
    if meta_updates:
        try:
            existing = je.extracted_data or {}
            if not isinstance(existing, dict):
                existing = {}
        except Exception:
            existing = {}
        existing.update(meta_updates)
        je.extracted_data = existing

    # Replace lines if provided
    if req.lines is not None:
        await db.execute(delete(JournalEntryLine).where(JournalEntryLine.journal_entry_id == je.id))
        await db.flush()
        line_no = 1
        xbrl = get_xbrl_service()
        for ln in req.lines:
            acc = await db.execute(select(ChartOfAccounts).where(ChartOfAccounts.id == ln.account_id))
            acc_row = acc.scalar_one_or_none()

            xbrl_element_name = acc_row.xbrl_element_name if acc_row else None
            xbrl_standard_label = None
            primary_asc_topic = None
            try:
                if xbrl_element_name:
                    el = xbrl.get_element(xbrl_element_name)
                    if el:
                        xbrl_standard_label = el.get('standard_label')
                        primary_asc_topic = acc_row.primary_asc_topic or el.get('primary_asc_topic')
                else:
                    primary_asc_topic = acc_row.primary_asc_topic if acc_row else None
            except Exception:
                pass

            db.add(JournalEntryLine(
                journal_entry_id=je.id,
                line_number=line_no,
                account_id=ln.account_id,
                debit_amount=ln.debit_amount,
                credit_amount=ln.credit_amount,
                description=ln.description,
                xbrl_element_name=xbrl_element_name,
                xbrl_standard_label=xbrl_standard_label,
                primary_asc_topic=primary_asc_topic,
            ))
            line_no += 1

    await db.commit()
    await db.refresh(je)
    # Audit: edited
    try:
        db.add(JournalEntryAuditLog(
            journal_entry_id=je.id,
            action="edited",
            performed_by_id=None,
            performed_at=get_pst_now(),
            comment="JE draft updated"
        ))
        await db.commit()
    except Exception:
        pass
    return await _build_response(db, je)


class JEPatchRequest(BaseModel):
    document_id: Optional[int] = None
    memo: Optional[str] = None
    reference: Optional[str] = None


@router.patch("/{entry_id}")
async def patch_journal_entry(entry_id: int, req: JEPatchRequest, db: AsyncSession = Depends(get_async_db)):
    res = await db.execute(select(JournalEntry).where(JournalEntry.id == entry_id))
    je = res.scalar_one_or_none()
    if not je:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    if je.is_locked:
        raise HTTPException(status_code=400, detail="Entry is locked")

    if req.document_id is not None:
        je.document_id = req.document_id
    if req.memo is not None:
        je.memo = req.memo
    if req.reference is not None:
        je.reference = req.reference

    je.updated_at = get_pst_now()
    await db.commit()
    # Audit: edited (patch)
    try:
        db.add(JournalEntryAuditLog(
            journal_entry_id=je.id,
            action="edited",
            performed_by_id=None,
            performed_at=get_pst_now(),
            comment="JE patched"
        ))
        await db.commit()
    except Exception:
        pass
    await db.refresh(je)
    return await _build_response(db, je)


@router.post("/{entry_id}/submit")
async def submit_for_approval(entry_id: int, db: AsyncSession = Depends(get_async_db)):
    res = await db.execute(select(JournalEntry).where(JournalEntry.id == entry_id))
    je = res.scalar_one_or_none()
    if not je:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    if je.status != "draft":
        raise HTTPException(status_code=400, detail=f"Cannot submit entry with status: {je.status}")

    # Policy: require a linked supporting document unless explicitly allowed
    require_doc = os.getenv("REQUIRE_DOCUMENT_ON_SUBMIT", "1").strip() not in ("0", "false", "False")
    if require_doc and not je.document_id:
        raise HTTPException(status_code=400, detail="Supporting document required before submission")

    # Ensure still balanced
    lns = await db.execute(select(JournalEntryLine).where(JournalEntryLine.journal_entry_id == entry_id))
    lines = lns.scalars().all()
    deb = sum(ln.debit_amount for ln in lines)
    cred = sum(ln.credit_amount for ln in lines)
    if deb != cred or len(lines) < 2:
        raise HTTPException(status_code=400, detail="Entry must be balanced with at least 2 lines")

    # Move to first approval stage
    je.status = "pending_first_approval"
    je.workflow_stage = 1
    je.updated_at = get_pst_now()
    # Audit log: submitted
    try:
        db.add(JournalEntryAuditLog(
            journal_entry_id=je.id,
            action="submitted",
            performed_by_id=je.created_by_id or None,
            performed_at=get_pst_now(),
            comment="JE submitted for first approval"
        ))
    except Exception:
        pass
    await db.commit()
    return {"success": True, "message": "Submitted for approval", "status": je.status, "workflow_stage": je.workflow_stage}


class ApprovalBody(BaseModel):
    approver_email: Optional[str] = None


@router.post("/{entry_id}/approve")
async def approve_and_post(entry_id: int, body: ApprovalBody | None = None, db: AsyncSession = Depends(get_async_db)):
    # Load entry
    res = await db.execute(select(JournalEntry).where(JournalEntry.id == entry_id))
    je = res.scalar_one_or_none()
    if not je:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    # Resolve approver identity if provided
    approver_email = (body.approver_email if body else None)
    approver_id: Optional[int] = None
    if approver_email:
        pres = await db.execute(select(Partner).where(Partner.email == approver_email))
        p = pres.scalar_one_or_none()
        if not p:
            raise HTTPException(status_code=400, detail="Approver not found")
        approver_id = getattr(p, "id", None)

    # Enforce segregation of duties
    if approver_id and je.created_by_id and approver_id == je.created_by_id:
        raise HTTPException(status_code=400, detail="Self-approval is not allowed")

    # First approval -> move to final approval stage
    if je.status == "pending_first_approval":
        je.first_approved_by_id = approver_id
        je.first_approved_by_email = approver_email
        je.first_approved_at = get_pst_now()
        je.status = "pending_final_approval"
        je.workflow_stage = 2
        je.updated_at = get_pst_now()
        # Audit log: first approval
        try:
            db.add(JournalEntryAuditLog(
                journal_entry_id=je.id,
                action="approved",
                performed_by_id=approver_id or None,
                performed_at=get_pst_now(),
                comment="first_approval"
            ))
        except Exception:
            pass
        await db.commit()
        return {"success": True, "message": "First approval recorded", "status": je.status, "workflow_stage": je.workflow_stage}

    # Final approval -> auto post and lock
    if je.status == "pending_final_approval":
        if approver_id and (approver_id == je.created_by_id or (je.first_approved_by_id and approver_id == je.first_approved_by_id)):
            raise HTTPException(status_code=400, detail="Final approver must differ from creator and first approver")
        je.final_approved_by_id = approver_id
        je.final_approved_by_email = approver_email
        je.final_approved_at = get_pst_now()
        je.status = "posted"
        je.workflow_stage = 4
        je.posted_at = get_pst_now()
        je.is_locked = True
        je.updated_at = get_pst_now()
        # Audit logs: final approval and posted
        try:
            db.add(JournalEntryAuditLog(
                journal_entry_id=je.id,
                action="approved",
                performed_by_id=approver_id or None,
                performed_at=get_pst_now(),
                comment="final_approval"
            ))
            db.add(JournalEntryAuditLog(
                journal_entry_id=je.id,
                action="posted",
                performed_by_id=approver_id or None,
                performed_at=get_pst_now(),
                comment="auto-post on final approval"
            ))
        except Exception:
            pass
        await db.commit()
        return {"success": True, "message": "Entry approved and posted", "status": je.status, "workflow_stage": je.workflow_stage}

    raise HTTPException(status_code=400, detail=f"Invalid status for approval: {je.status}")


@router.post("/{entry_id}/post")
async def post_entry(entry_id: int, db: AsyncSession = Depends(get_async_db)):
    res = await db.execute(select(JournalEntry).where(JournalEntry.id == entry_id))
    je = res.scalar_one_or_none()
    if not je:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    if je.status == "posted" and je.is_locked:
        return {"success": True, "message": "Entry already posted", "status": je.status}
    if je.status not in ("approved",):
        raise HTTPException(status_code=400, detail=f"Cannot post entry with status: {je.status}")
    # Post without changing approvals (for UI compatibility)
    je.status = "posted"
    je.workflow_stage = 4
    je.posted_at = get_pst_now()
    je.is_locked = True
    je.updated_at = get_pst_now()
    # Audit log: posted (fallback)
    try:
        db.add(JournalEntryAuditLog(
            journal_entry_id=je.id,
            action="posted",
            performed_by_id=None,
            performed_at=get_pst_now(),
            comment="manual post endpoint"
        ))
    except Exception:
        pass
    await db.commit()
    return {"success": True, "message": "Entry posted", "status": je.status, "workflow_stage": je.workflow_stage}


class RejectBody(BaseModel):
    reason: Optional[str] = None


@router.post("/{entry_id}/reject")
async def reject_entry(entry_id: int, body: RejectBody, db: AsyncSession = Depends(get_async_db)):
    res = await db.execute(select(JournalEntry).where(JournalEntry.id == entry_id))
    je = res.scalar_one_or_none()
    if not je:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    if je.status not in ("pending_first_approval", "pending_final_approval"):
        raise HTTPException(status_code=400, detail=f"Invalid status for rejection: {je.status}")
    je.status = "draft"
    je.workflow_stage = 0
    je.rejection_reason = body.reason or ""
    je.updated_at = get_pst_now()
    # Audit log: rejected
    try:
        db.add(JournalEntryAuditLog(
            journal_entry_id=je.id,
            action="rejected",
            performed_by_id=None,
            performed_at=get_pst_now(),
            comment=je.rejection_reason
        ))
    except Exception:
        pass
    await db.commit()
    return {"success": True, "message": "Entry rejected", "status": je.status, "workflow_stage": je.workflow_stage}


class LinkDocBody(BaseModel):
    document_id: int


@router.post("/{entry_id}/attachments")
async def link_document(entry_id: int, body: LinkDocBody, db: AsyncSession = Depends(get_async_db)):
    res = await db.execute(select(JournalEntry).where(JournalEntry.id == entry_id))
    je = res.scalar_one_or_none()
    if not je:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    # Single primary document link for v1
    je.document_id = body.document_id
    je.updated_at = get_pst_now()
    await db.commit()
    return {"success": True, "message": "Document linked"}


# Placeholders for bank candidates/links (Planning: handle small credit cashbacks)
@router.get("/{entry_id}/bank-candidates")
async def bank_candidates(entry_id: int):
    return {"candidates": []}

@router.post("/{entry_id}/bank-links")
async def bank_link(entry_id: int):
    return {"success": False, "message": "Bank link not implemented in Phase 1"}


class XBRLHintResponse(BaseModel):
    mapped_element_name: Optional[str] = None
    mapped_primary_asc_topic: Optional[str] = None
    suggestions: List[dict] = []


@router.get("/xbrl-hints")
async def xbrl_hints(account_id: int = Query(...), db: AsyncSession = Depends(get_async_db)):
    # Load account
    acc = await db.execute(select(ChartOfAccounts).where(ChartOfAccounts.id == account_id))
    account = acc.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    svc = get_xbrl_service()
    mapped_name = account.xbrl_element_name
    mapped_topic = account.primary_asc_topic
    suggestions: List[dict] = []

    try:
        # Suggest based on account type and (optionally) balance
        for name in svc.get_elements_for_account_type(account.account_type):
            el = svc.get_element(name)
            if el:
                suggestions.append({
                    "element_name": el.get("element_name"),
                    "standard_label": el.get("standard_label"),
                    "primary_asc_topic": el.get("primary_asc_topic"),
                    "balance_type": el.get("balance_type"),
                    "period_type": el.get("period_type"),
                })
    except Exception:
        pass

    return XBRLHintResponse(
        mapped_element_name=mapped_name,
        mapped_primary_asc_topic=mapped_topic,
        suggestions=suggestions[:10],
    )


@router.get("/xbrl-search")
async def xbrl_search(
    keyword: str = Query(...),
    account_type: Optional[str] = Query(None),
    balance_type: Optional[str] = Query(None),
    period_type: Optional[str] = Query(None),
    limit: int = Query(25),
):
    """Search XBRL taxonomy elements by keyword with optional filters"""
    svc = get_xbrl_service()
    out = []
    try:
        if account_type or balance_type or period_type or limit != 25:
            out = svc.search_elements_advanced(keyword, account_type=account_type, balance_type=balance_type, period_type=period_type, limit=min(max(limit,1),50))
        else:
            for el in svc.search_elements(keyword, limit=limit):
                out.append({
                    "element_name": el.get("element_name"),
                    "standard_label": el.get("standard_label"),
                    "primary_asc_topic": el.get("primary_asc_topic"),
                    "balance_type": el.get("balance_type"),
                    "period_type": el.get("period_type"),
                    "documentation_snippet": (el.get("documentation") or "")[:240] if el.get("documentation") else None,
                })
    except Exception:
        pass
    return {"results": out}


@router.get("/xbrl-element")
async def xbrl_element(name: str = Query(...)):
    """Get detailed XBRL element information including documentation and ASC refs"""
    svc = get_xbrl_service()
    try:
        el = svc.get_element(name)
    except Exception:
        el = None
    if not el:
        raise HTTPException(status_code=404, detail="XBRL element not found")
    # Enrich with helpful outbound links (no scraping)
    try:
        el["related_links"] = svc.get_related_links(name)
    except Exception:
        pass
    return el


# ---------------------- Backfill Attachments (Phase 0) ----------------------

async def _ensure_attachments_table(db: AsyncSession):
    def _create_table(sync_conn):
        try:
            JournalEntryAttachment.__table__.create(bind=sync_conn, checkfirst=True)
        except Exception:
            pass
    await db.run_sync(_create_table)


@router.post("/attachments/backfill")
async def backfill_journal_entry_attachments(db: AsyncSession = Depends(get_async_db)):
    """
    One-time backfill: copy non-null journal_entries.document_id into attachments.
    Idempotent and safe to run multiple times.
    """
    await _ensure_attachments_table(db)

    # Find all JEs with a legacy document_id
    res = await db.execute(select(JournalEntry).where(JournalEntry.document_id.is_not(None)))
    entries = res.scalars().all()

    created = 0
    skipped = 0

    for je in entries:
        # Check if an attachment already exists for this pair
        exists_q = await db.execute(
            select(JournalEntryAttachment).where(
                and_(
                    JournalEntryAttachment.journal_entry_id == je.id,
                    JournalEntryAttachment.document_id == je.document_id
                )
            )
        )
        att = exists_q.scalar_one_or_none()
        if att:
            skipped += 1
            continue

        # Determine if any attachment exists for this JE to set primary flag
        primary_q = await db.execute(
            select(JournalEntryAttachment).where(JournalEntryAttachment.journal_entry_id == je.id)
        )
        has_any = primary_q.first() is not None

        db.add(JournalEntryAttachment(
            journal_entry_id=je.id,
            document_id=je.document_id,  # type: ignore[arg-type]
            display_order=0,
            is_primary=(not has_any)
        ))
        created += 1

    if created > 0:
        await db.commit()

    return {"success": True, "created": created, "skipped": skipped, "total_with_legacy": len(entries)}


# ---------------------- Attachments CRUD (Phase 1) ----------------------

class AttachDocumentsBody(BaseModel):
    document_ids: List[int]
    set_primary_document_id: Optional[int] = None


class ReorderAttachmentsBody(BaseModel):
    ordered_document_ids: List[int]
    primary_document_id: Optional[int] = None


@router.get("/{entry_id}/attachments")
async def list_attachments(entry_id: int, db: AsyncSession = Depends(get_async_db)):
    res = await db.execute(select(JournalEntry).where(JournalEntry.id == entry_id))
    je = res.scalar_one_or_none()
    if not je:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    atts_res = await db.execute(
        select(JournalEntryAttachment, AccountingDocument)
        .join(AccountingDocument, AccountingDocument.id == JournalEntryAttachment.document_id)
        .where(JournalEntryAttachment.journal_entry_id == entry_id)
        .order_by(JournalEntryAttachment.display_order, JournalEntryAttachment.id)
    )
    out = []
    for att, doc in atts_res:
        out.append({
            "attachment_id": att.id,
            "document_id": att.document_id,
            "is_primary": att.is_primary,
            "display_order": att.display_order,
            "filename": getattr(doc, "filename", None) or getattr(doc, "original_name", None),
            "original_name": getattr(doc, "original_name", None) or getattr(doc, "filename", None),
            "category": getattr(doc, "category", None),
            "upload_date": (getattr(doc, "upload_date", None) or getattr(doc, "created_at", None)),
        })
    return {"attachments": out}


@router.post("/{entry_id}/attachments")
async def attach_documents(entry_id: int, body: AttachDocumentsBody, db: AsyncSession = Depends(get_async_db)):
    res = await db.execute(select(JournalEntry).where(JournalEntry.id == entry_id))
    je = res.scalar_one_or_none()
    if not je:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    if je.is_locked:
        raise HTTPException(status_code=400, detail="Entry is locked; cannot modify attachments")

    await _ensure_attachments_table(db)

    created = 0
    for doc_id in body.document_ids:
        # Ensure document exists (optional safety)
        dres = await db.execute(select(AccountingDocument).where(AccountingDocument.id == doc_id))
        doc = dres.scalar_one_or_none()
        if not doc:
            continue
        exists = await db.execute(
            select(JournalEntryAttachment).where(
                and_(
                    JournalEntryAttachment.journal_entry_id == entry_id,
                    JournalEntryAttachment.document_id == doc_id,
                )
            )
        )
        if exists.scalar_one_or_none():
            continue
        # Determine next display order
        max_order_res = await db.execute(
            select(func.max(JournalEntryAttachment.display_order)).where(JournalEntryAttachment.journal_entry_id == entry_id)
        )
        next_order = (max_order_res.scalar() or 0) + 1
        att = JournalEntryAttachment(
            journal_entry_id=entry_id,
            document_id=doc_id,
            display_order=next_order,
            is_primary=False,
        )
        db.add(att)
        created += 1

    # Handle primary
    if body.set_primary_document_id is not None:
        await db.execute(
            update(JournalEntryAttachment)
            .where(JournalEntryAttachment.journal_entry_id == entry_id)
            .values(is_primary=False)
        )
        await db.execute(
            update(JournalEntryAttachment)
            .where(
                and_(
                    JournalEntryAttachment.journal_entry_id == entry_id,
                    JournalEntryAttachment.document_id == body.set_primary_document_id,
                )
            )
            .values(is_primary=True)
        )

    if created > 0 or body.set_primary_document_id is not None:
        await db.commit()
        # Audit log
        try:
            for doc_id in body.document_ids:
                db.add(JournalEntryAuditLog(
                    journal_entry_id=entry_id,
                    action="attachment_linked",
                    performed_by_id=0,
                    performed_at=get_pst_now(),
                    new_value={"document_id": doc_id}
                ))
            if body.set_primary_document_id is not None:
                db.add(JournalEntryAuditLog(
                    journal_entry_id=entry_id,
                    action="attachment_primary_set",
                    performed_by_id=0,
                    performed_at=get_pst_now(),
                    new_value={"document_id": body.set_primary_document_id}
                ))
            await db.commit()
        except Exception:
            pass

    return {"success": True, "created": created}


@router.delete("/{entry_id}/attachments/{document_id}")
async def detach_document(entry_id: int, document_id: int, db: AsyncSession = Depends(get_async_db)):
    res = await db.execute(select(JournalEntry).where(JournalEntry.id == entry_id))
    je = res.scalar_one_or_none()
    if not je:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    if je.is_locked:
        raise HTTPException(status_code=400, detail="Entry is locked; cannot modify attachments")

    del_res = await db.execute(
        delete(JournalEntryAttachment).where(
            and_(
                JournalEntryAttachment.journal_entry_id == entry_id,
                JournalEntryAttachment.document_id == document_id,
            )
        )
    )
    await db.commit()
    try:
        db.add(JournalEntryAuditLog(
            journal_entry_id=entry_id,
            action="attachment_unlinked",
            performed_by_id=0,
            performed_at=get_pst_now(),
            old_value={"document_id": document_id}
        ))
        await db.commit()
    except Exception:
        pass
    return {"success": True, "deleted": del_res.rowcount or 0}


@router.patch("/{entry_id}/attachments/reorder")
async def reorder_attachments(entry_id: int, body: ReorderAttachmentsBody, db: AsyncSession = Depends(get_async_db)):
    res = await db.execute(select(JournalEntry).where(JournalEntry.id == entry_id))
    je = res.scalar_one_or_none()
    if not je:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    if je.is_locked:
        raise HTTPException(status_code=400, detail="Entry is locked; cannot modify attachments")

    order_map = {doc_id: idx for idx, doc_id in enumerate(body.ordered_document_ids)}
    # Update display_order for attachments present in order_map
    for doc_id, idx in order_map.items():
        await db.execute(
            update(JournalEntryAttachment)
            .where(
                and_(
                    JournalEntryAttachment.journal_entry_id == entry_id,
                    JournalEntryAttachment.document_id == doc_id,
                )
            )
            .values(display_order=idx)
        )

    # Update primary if provided
    if body.primary_document_id is not None:
        await db.execute(
            update(JournalEntryAttachment)
            .where(JournalEntryAttachment.journal_entry_id == entry_id)
            .values(is_primary=False)
        )
        await db.execute(
            update(JournalEntryAttachment)
            .where(
                and_(
                    JournalEntryAttachment.journal_entry_id == entry_id,
                    JournalEntryAttachment.document_id == body.primary_document_id,
                )
            )
            .values(is_primary=True)
        )

    await db.commit()
    try:
        db.add(JournalEntryAuditLog(
            journal_entry_id=entry_id,
            action="attachment_reordered",
            performed_by_id=0,
            performed_at=get_pst_now(),
            new_value={"ordered_document_ids": body.ordered_document_ids, "primary_document_id": body.primary_document_id}
        ))
        await db.commit()
    except Exception:
        pass
    return {"success": True}

