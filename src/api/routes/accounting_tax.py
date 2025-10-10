"""
Tax Compliance Routes
Full Federal and State Tax Management (ASC 740, IRC)
"""

from fastapi import APIRouter, Query, HTTPException, Depends, UploadFile, File, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_
from datetime import date, datetime
from typing import List, Optional
import logging

from ..database_async import get_async_db
from src.api.models_tax import TaxPayment, TaxProvision, TaxReturn, TaxDeadline
from src.api.services.tax_provision_service import TaxProvisionService
from src.api.services.tax_document_processor import TaxDocumentProcessor
from pydantic import BaseModel

router = APIRouter(prefix="/api/accounting/tax", tags=["Tax Compliance"])
logger = logging.getLogger(__name__)


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class TaxPaymentCreate(BaseModel):
    """Create tax payment"""
    tax_type: str
    tax_period: str
    payment_date: str
    amount_paid: float
    payment_method: Optional[str] = "Online"
    confirmation_number: Optional[str] = None
    notes: Optional[str] = None


class TaxProvisionRequest(BaseModel):
    """Calculate tax provision"""
    year: int
    period: str = "Annual"


class TaxReturnCreate(BaseModel):
    """Create tax return record"""
    return_type: str
    tax_year: int
    due_date: str
    extension_filed: bool = False
    extended_due_date: Optional[str] = None


# ============================================================================
# TAX PAYMENTS
# ============================================================================

@router.get("/payments")
async def get_tax_payments(
    entity_id: int = Query(...),
    tax_type: Optional[str] = Query(None),
    tax_year: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all tax payments
    
    - **entity_id**: Entity ID (required)
    - **tax_type**: Filter by tax type (optional)
    - **tax_year**: Filter by tax year (optional)
    """
    try:
        query = select(TaxPayment).where(TaxPayment.entity_id == entity_id)
        
        if tax_type:
            query = query.where(TaxPayment.tax_type == tax_type)
        if tax_year:
            query = query.where(TaxPayment.tax_year == tax_year)
        
        query = query.order_by(TaxPayment.payment_date.desc())
        
        result = await db.execute(query)
        payments = result.scalars().all()
        
        return {
            "success": True,
            "payments": [
                {
                    "id": p.id,
                    "payment_number": p.payment_number,
                    "tax_type": p.tax_type,
                    "tax_period": p.tax_period,
                    "tax_year": p.tax_year,
                    "payment_date": p.payment_date.isoformat(),
                    "amount_paid": float(p.amount_paid),
                    "payment_method": p.payment_method,
                    "confirmation_number": p.confirmation_number,
                    "status": p.status,
                    "journal_entry_id": p.journal_entry_id,
                    "notes": p.notes
                }
                for p in payments
            ]
        }
    
    except Exception as e:
        logger.error(f"Error fetching tax payments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payments")
async def create_tax_payment(
    entity_id: int = Query(...),
    payment: TaxPaymentCreate = Body(...),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Create tax payment manually
    """
    try:
        processor = TaxDocumentProcessor(db)
        
        # Convert request to extracted_data format
        extracted_data = {
            "tax_type": payment.tax_type,
            "tax_period": payment.tax_period,
            "payment_date": payment.payment_date,
            "amount": payment.amount_paid,
            "payment_method": payment.payment_method,
            "confirmation_number": payment.confirmation_number
        }
        
        # Process as if from document
        payment_id = await processor.process_tax_payment_document(
            document_id=None,  # Manual entry, no document
            entity_id=entity_id,
            extracted_data=extracted_data
        )
        
        # Get created payment
        tax_payment = await db.get(TaxPayment, payment_id)
        
        return {
            "success": True,
            "message": "Tax payment created successfully",
            "payment_id": payment_id,
            "journal_entry_id": tax_payment.journal_entry_id
        }
    
    except Exception as e:
        logger.error(f"Error creating tax payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payments/summary")
async def get_tax_payments_summary(
    entity_id: int = Query(...),
    year: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_async_db)
):
    """Get tax payments summary by type and year"""
    try:
        query = select(
            TaxPayment.tax_type,
            TaxPayment.tax_year,
            func.count(TaxPayment.id).label('count'),
            func.sum(TaxPayment.amount_paid).label('total_paid')
        ).where(
            TaxPayment.entity_id == entity_id
        )
        
        if year:
            query = query.where(TaxPayment.tax_year == year)
        
        query = query.group_by(TaxPayment.tax_type, TaxPayment.tax_year)
        
        result = await db.execute(query)
        rows = result.all()
        
        summary = {}
        for row in rows:
            year_key = str(row.tax_year)
            if year_key not in summary:
                summary[year_key] = {}
            summary[year_key][row.tax_type] = {
                "count": row.count,
                "total_paid": float(row.total_paid)
            }
        
        return {
            "success": True,
            "summary": summary
        }
    
    except Exception as e:
        logger.error(f"Error fetching tax summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# TAX PROVISION (ASC 740)
# ============================================================================

@router.post("/provision/calculate")
async def calculate_tax_provision(
    entity_id: int = Query(...),
    request: TaxProvisionRequest = Body(...),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Calculate income tax provision per ASC 740
    
    Includes:
    - Book-tax differences (M-1 reconciliation)
    - Current tax expense
    - Deferred tax calculation
    - Effective tax rate
    """
    try:
        service = TaxProvisionService(db)
        
        result = await service.calculate_provision(
            entity_id=entity_id,
            year=request.year,
            period=request.period
        )
        
        return {
            "success": True,
            "message": "Tax provision calculated successfully",
            "provision": result
        }
    
    except Exception as e:
        logger.error(f"Error calculating tax provision: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/provision")
async def get_tax_provisions(
    entity_id: int = Query(...),
    year: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_async_db)
):
    """Get all tax provisions"""
    try:
        query = select(TaxProvision).where(TaxProvision.entity_id == entity_id)
        
        if year:
            query = query.where(TaxProvision.provision_year == year)
        
        query = query.order_by(TaxProvision.provision_year.desc())
        
        result = await db.execute(query)
        provisions = result.scalars().all()
        
        return {
            "success": True,
            "provisions": [
                {
                    "id": p.id,
                    "provision_year": p.provision_year,
                    "provision_period": p.provision_period,
                    "pretax_book_income": float(p.pretax_book_income),
                    "taxable_income": float(p.taxable_income),
                    "m1_additions": p.m1_additions,
                    "m1_subtractions": p.m1_subtractions,
                    "current_federal_tax": float(p.current_federal_tax),
                    "current_state_tax": float(p.current_state_tax),
                    "total_current_tax": float(p.total_current_tax),
                    "deferred_tax_asset": float(p.deferred_tax_asset),
                    "deferred_tax_liability": float(p.deferred_tax_liability),
                    "net_deferred_tax": float(p.net_deferred_tax),
                    "total_tax_provision": float(p.total_tax_provision),
                    "effective_tax_rate": float(p.effective_tax_rate),
                    "status": p.status,
                    "journal_entry_id": p.journal_entry_id
                }
                for p in provisions
            ]
        }
    
    except Exception as e:
        logger.error(f"Error fetching tax provisions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/provision/{provision_id}/create-je")
async def create_provision_je(
    provision_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Create journal entry for tax provision"""
    try:
        service = TaxProvisionService(db)
        je_id = await service.create_provision_journal_entry(provision_id)
        
        return {
            "success": True,
            "message": "Provision JE created successfully",
            "journal_entry_id": je_id
        }
    
    except Exception as e:
        logger.error(f"Error creating provision JE: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# TAX RETURNS
# ============================================================================

@router.get("/returns")
async def get_tax_returns(
    entity_id: int = Query(...),
    tax_year: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_async_db)
):
    """Get all tax returns"""
    try:
        query = select(TaxReturn).where(TaxReturn.entity_id == entity_id)
        
        if tax_year:
            query = query.where(TaxReturn.tax_year == tax_year)
        
        query = query.order_by(TaxReturn.tax_year.desc())
        
        result = await db.execute(query)
        returns = result.scalars().all()
        
        return {
            "success": True,
            "returns": [
                {
                    "id": r.id,
                    "return_type": r.return_type,
                    "tax_year": r.tax_year,
                    "filing_period": r.filing_period,
                    "due_date": r.due_date.isoformat(),
                    "extension_filed": r.extension_filed,
                    "extended_due_date": r.extended_due_date.isoformat() if r.extended_due_date else None,
                    "filing_date": r.filing_date.isoformat() if r.filing_date else None,
                    "taxable_income": float(r.taxable_income) if r.taxable_income else None,
                    "total_tax": float(r.total_tax) if r.total_tax else None,
                    "balance_due": float(r.balance_due) if r.balance_due else None,
                    "refund_amount": float(r.refund_amount) if r.refund_amount else None,
                    "status": r.status,
                    "confirmation_number": r.confirmation_number
                }
                for r in returns
            ]
        }
    
    except Exception as e:
        logger.error(f"Error fetching tax returns: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/returns")
async def create_tax_return(
    entity_id: int = Query(...),
    tax_return: TaxReturnCreate = Body(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Create tax return record"""
    try:
        return_record = TaxReturn(
            entity_id=entity_id,
            return_type=tax_return.return_type,
            tax_year=tax_return.tax_year,
            due_date=datetime.strptime(tax_return.due_date, "%Y-%m-%d").date(),
            extension_filed=tax_return.extension_filed,
            extended_due_date=datetime.strptime(tax_return.extended_due_date, "%Y-%m-%d").date() if tax_return.extended_due_date else None,
            status="not_filed"
        )
        
        db.add(return_record)
        await db.commit()
        await db.refresh(return_record)
        
        return {
            "success": True,
            "message": "Tax return record created",
            "return_id": return_record.id
        }
    
    except Exception as e:
        logger.error(f"Error creating tax return: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# TAX DEADLINES
# ============================================================================

@router.get("/deadlines")
async def get_tax_deadlines(
    entity_id: int = Query(...),
    year: Optional[int] = Query(None),
    upcoming_only: bool = Query(False),
    db: AsyncSession = Depends(get_async_db)
):
    """Get tax deadlines"""
    try:
        query = select(TaxDeadline).where(TaxDeadline.entity_id == entity_id)
        
        if year:
            query = query.where(TaxDeadline.tax_year == year)
        
        if upcoming_only:
            today = date.today()
            query = query.where(
                and_(
                    TaxDeadline.due_date >= today,
                    TaxDeadline.is_completed == False
                )
            )
        
        query = query.order_by(TaxDeadline.due_date.asc())
        
        result = await db.execute(query)
        deadlines = result.scalars().all()
        
        return {
            "success": True,
            "deadlines": [
                {
                    "id": d.id,
                    "deadline_name": d.deadline_name,
                    "deadline_type": d.deadline_type,
                    "tax_form": d.tax_form,
                    "due_date": d.due_date.isoformat(),
                    "tax_year": d.tax_year,
                    "tax_period": d.tax_period,
                    "is_completed": d.is_completed,
                    "completed_date": d.completed_date.isoformat() if d.completed_date else None,
                    "notes": d.notes
                }
                for d in deadlines
            ]
        }
    
    except Exception as e:
        logger.error(f"Error fetching tax deadlines: {e}")
        raise HTTPException(status_code=500, detail=str(e))

