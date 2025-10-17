"""
NGI Capital - Accounts Payable API Routes
Vendor and Bill management

Author: NGI Capital Development Team
Date: October 10, 2025
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

from ..database_async import get_async_db
from ..models_ap import Vendor, VendorBill, VendorBillLine, VendorBillPayment
# JE automation removed; AP will be updated to new posting flow later
from ..utils.datetime_utils import get_pst_now

router = APIRouter(prefix="/api/accounting/ap", tags=["Accounting - Accounts Payable"])


# ============================================================================
# SCHEMAS
# ============================================================================

class VendorCreate(BaseModel):
    vendor_name: str
    vendor_type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    payment_terms: str = "Net 30"
    autopay_enabled: bool = True
    default_payment_method: Optional[str] = None
    tax_id: Optional[str] = None
    is_1099_vendor: bool = False
    default_expense_account_id: Optional[int] = None
    notes: Optional[str] = None


class VendorUpdate(BaseModel):
    vendor_name: Optional[str] = None
    vendor_type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    payment_terms: Optional[str] = None
    autopay_enabled: Optional[bool] = None
    default_payment_method: Optional[str] = None
    tax_id: Optional[str] = None
    is_1099_vendor: Optional[bool] = None
    default_expense_account_id: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class BillLineCreate(BaseModel):
    description: str
    quantity: Decimal = Decimal("1.00")
    unit_price: Decimal
    expense_account_id: Optional[int] = None


class BillCreate(BaseModel):
    vendor_id: int
    bill_number: str
    bill_date: date
    due_date: Optional[date] = None
    payment_terms: str = "Net 30"
    lines: List[BillLineCreate]
    tax_amount: Optional[Decimal] = None
    memo: Optional[str] = None
    internal_notes: Optional[str] = None


class BillPaymentCreate(BaseModel):
    payment_date: date
    payment_amount: Decimal
    payment_method: str
    reference_number: Optional[str] = None
    notes: Optional[str] = None


# ============================================================================
# VENDOR ROUTES
# ============================================================================

@router.get("/vendors")
async def get_vendors(
    entity_id: int = Query(...),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_1099: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_db)
):
    """Get all vendors for entity with optional filters"""
    try:
        query = select(Vendor).where(Vendor.entity_id == entity_id)
        
        if search:
            query = query.where(
                or_(
                    Vendor.vendor_name.ilike(f"%{search}%"),
                    Vendor.email.ilike(f"%{search}%")
                )
            )
        
        if is_active is not None:
            query = query.where(Vendor.is_active == is_active)
        
        if is_1099 is not None:
            query = query.where(Vendor.is_1099_vendor == is_1099)
        
        query = query.order_by(Vendor.vendor_name).offset(skip).limit(limit)
        
        result = await db.execute(query)
        vendors = result.scalars().all()
        
        return {
            "success": True,
            "vendors": [
                {
                    "id": v.id,
                    "vendor_number": v.vendor_number,
                    "vendor_name": v.vendor_name,
                    "vendor_type": v.vendor_type,
                    "email": v.email,
                    "phone": v.phone,
                    "address": f"{v.address_line1 or ''} {v.city or ''}, {v.state or ''}".strip(),
                    "payment_terms": v.payment_terms,
                    "autopay_enabled": v.autopay_enabled,
                    "is_1099_vendor": v.is_1099_vendor,
                    "is_active": v.is_active,
                    "created_at": v.created_at.isoformat() if v.created_at else None
                }
                for v in vendors
            ]
        }
    except Exception as e:
        logger.error(f"Error getting vendors: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/vendors")
async def create_vendor(
    entity_id: int,
    vendor_data: VendorCreate,
    db: AsyncSession = Depends(get_async_db)
):
    """Create new vendor"""
    try:
        # Generate vendor number
        result = await db.execute(
            select(func.count(Vendor.id)).where(Vendor.entity_id == entity_id)
        )
        count = result.scalar() or 0
        vendor_number = f"VEND-{str(count + 1).zfill(5)}"
        
        vendor = Vendor(
            entity_id=entity_id,
            vendor_number=vendor_number,
            **vendor_data.model_dump()
        )
        
        db.add(vendor)
        await db.commit()
        await db.refresh(vendor)
        
        return {
            "success": True,
            "message": "Vendor created successfully",
            "vendor": {
                "id": vendor.id,
                "vendor_number": vendor.vendor_number,
                "vendor_name": vendor.vendor_name
            }
        }
    except Exception as e:
        logger.error(f"Error creating vendor: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vendors/{vendor_id}")
async def get_vendor(vendor_id: int, db: AsyncSession = Depends(get_async_db)):
    """Get vendor details"""
    try:
        result = await db.execute(
            select(Vendor).where(Vendor.id == vendor_id)
        )
        vendor = result.scalar_one_or_none()
        
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
        
        return {
            "success": True,
            "vendor": {
                "id": vendor.id,
                "vendor_number": vendor.vendor_number,
                "vendor_name": vendor.vendor_name,
                "vendor_type": vendor.vendor_type,
                "email": vendor.email,
                "phone": vendor.phone,
                "website": vendor.website,
                "address_line1": vendor.address_line1,
                "address_line2": vendor.address_line2,
                "city": vendor.city,
                "state": vendor.state,
                "zip_code": vendor.zip_code,
                "payment_terms": vendor.payment_terms,
                "autopay_enabled": vendor.autopay_enabled,
                "default_payment_method": vendor.default_payment_method,
                "tax_id": vendor.tax_id,
                "is_1099_vendor": vendor.is_1099_vendor,
                "default_expense_account_id": vendor.default_expense_account_id,
                "is_active": vendor.is_active,
                "notes": vendor.notes,
                "created_at": vendor.created_at.isoformat() if vendor.created_at else None
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting vendor: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/vendors/{vendor_id}")
async def update_vendor(
    vendor_id: int,
    vendor_data: VendorUpdate,
    db: AsyncSession = Depends(get_async_db)
):
    """Update vendor"""
    try:
        result = await db.execute(
            select(Vendor).where(Vendor.id == vendor_id)
        )
        vendor = result.scalar_one_or_none()
        
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
        
        # Update fields
        update_data = vendor_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(vendor, field, value)
        
        vendor.updated_at = get_pst_now()
        
        await db.commit()
        
        return {
            "success": True,
            "message": "Vendor updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating vendor: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# BILL ROUTES
# ============================================================================

@router.get("/bills")
async def get_bills(
    entity_id: int = Query(...),
    vendor_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_db)
):
    """Get all bills with optional filters"""
    try:
        query = select(VendorBill).where(VendorBill.entity_id == entity_id)
        
        if vendor_id:
            query = query.where(VendorBill.vendor_id == vendor_id)
        
        if status:
            query = query.where(VendorBill.status == status)
        
        if start_date:
            query = query.where(VendorBill.bill_date >= start_date)
        
        if end_date:
            query = query.where(VendorBill.bill_date <= end_date)
        
        query = query.order_by(desc(VendorBill.bill_date)).offset(skip).limit(limit)
        
        result = await db.execute(query)
        bills = result.scalars().all()
        
        # Get vendor names
        bill_data = []
        for bill in bills:
            vendor_result = await db.execute(
                select(Vendor).where(Vendor.id == bill.vendor_id)
            )
            vendor = vendor_result.scalar_one_or_none()
            
            bill_data.append({
                "id": bill.id,
                "bill_number": bill.bill_number,
                "internal_bill_number": bill.internal_bill_number,
                "bill_date": bill.bill_date.isoformat(),
                "due_date": bill.due_date.isoformat(),
                "vendor_name": vendor.vendor_name if vendor else "Unknown",
                "total_amount": float(bill.total_amount),
                "amount_paid": float(bill.amount_paid),
                "amount_due": float(bill.amount_due),
                "status": bill.status,
                "payment_terms": bill.payment_terms,
                "created_at": bill.created_at.isoformat() if bill.created_at else None
            })
        
        return {
            "success": True,
            "bills": bill_data
        }
    except Exception as e:
        logger.error(f"Error getting bills: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bills")
async def create_bill(
    entity_id: int,
    bill_data: BillCreate,
    create_je: bool = True,
    db: AsyncSession = Depends(get_async_db)
):
    """Create new bill"""
    try:
        # Calculate due date if not provided
        due_date = bill_data.due_date
        if not due_date:
            from datetime import timedelta
            days = 30  # Default Net 30
            if "15" in bill_data.payment_terms:
                days = 15
            elif "60" in bill_data.payment_terms:
                days = 60
            due_date = bill_data.bill_date + timedelta(days=days)
        
        # Calculate totals
        subtotal = sum(line.quantity * line.unit_price for line in bill_data.lines)
        tax_amount = bill_data.tax_amount or Decimal("0.00")
        total_amount = subtotal + tax_amount
        
        # Generate internal bill number
        result = await db.execute(
            select(func.count(VendorBill.id)).where(VendorBill.entity_id == entity_id)
        )
        count = result.scalar() or 0
        internal_bill_number = f"BILL-{datetime.now().year}-{str(count + 1).zfill(5)}"
        
        # Create bill
        bill = VendorBill(
            entity_id=entity_id,
            vendor_id=bill_data.vendor_id,
            bill_number=bill_data.bill_number,
            internal_bill_number=internal_bill_number,
            bill_date=bill_data.bill_date,
            due_date=due_date,
            payment_terms=bill_data.payment_terms,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total_amount,
            amount_due=total_amount,
            status="draft",
            memo=bill_data.memo,
            internal_notes=bill_data.internal_notes,
            created_by_email="system@ngicapitaladvisory.com",  # TODO: Get from auth
            created_at=get_pst_now()
        )
        
        db.add(bill)
        await db.flush()
        
        # Create bill lines
        for idx, line_data in enumerate(bill_data.lines, 1):
            line_total = line_data.quantity * line_data.unit_price
            bill_line = VendorBillLine(
                bill_id=bill.id,
                line_number=idx,
                description=line_data.description,
                quantity=line_data.quantity,
                unit_price=line_data.unit_price,
                total_amount=line_total,
                expense_account_id=line_data.expense_account_id,
                created_at=get_pst_now()
            )
            db.add(bill_line)
        
        await db.commit()
        await db.refresh(bill)
        
        # Auto JE creation removed in manual workflow
        je_id = None
        
        return {
            "success": True,
            "message": "Bill created successfully",
            "bill": {
                "id": bill.id,
                "bill_number": bill.bill_number,
                "internal_bill_number": bill.internal_bill_number,
                "total_amount": float(bill.total_amount),
                "journal_entry_id": je_id
            }
        }
    except Exception as e:
        logger.error(f"Error creating bill: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bills/{bill_id}")
async def get_bill(bill_id: int, db: AsyncSession = Depends(get_async_db)):
    """Get bill details with lines"""
    try:
        result = await db.execute(
            select(VendorBill).where(VendorBill.id == bill_id)
        )
        bill = result.scalar_one_or_none()
        
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        
        # Get vendor
        vendor_result = await db.execute(
            select(Vendor).where(Vendor.id == bill.vendor_id)
        )
        vendor = vendor_result.scalar_one_or_none()
        
        # Get lines
        lines_result = await db.execute(
            select(VendorBillLine).where(VendorBillLine.bill_id == bill_id).order_by(VendorBillLine.line_number)
        )
        lines = lines_result.scalars().all()
        
        return {
            "success": True,
            "bill": {
                "id": bill.id,
                "bill_number": bill.bill_number,
                "internal_bill_number": bill.internal_bill_number,
                "bill_date": bill.bill_date.isoformat(),
                "due_date": bill.due_date.isoformat(),
                "vendor": {
                    "id": vendor.id if vendor else None,
                    "vendor_name": vendor.vendor_name if vendor else "Unknown"
                },
                "subtotal": float(bill.subtotal),
                "tax_amount": float(bill.tax_amount),
                "total_amount": float(bill.total_amount),
                "amount_paid": float(bill.amount_paid),
                "amount_due": float(bill.amount_due),
                "status": bill.status,
                "payment_terms": bill.payment_terms,
                "memo": bill.memo,
                "journal_entry_id": bill.journal_entry_id,
                "lines": [
                    {
                        "line_number": line.line_number,
                        "description": line.description,
                        "quantity": float(line.quantity),
                        "unit_price": float(line.unit_price),
                        "total_amount": float(line.total_amount),
                        "expense_account_id": line.expense_account_id
                    }
                    for line in lines
                ]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting bill: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bills/{bill_id}/payments")
async def record_bill_payment(
    bill_id: int,
    payment_data: BillPaymentCreate,
    create_je: bool = True,
    db: AsyncSession = Depends(get_async_db)
):
    """Record payment made for bill"""
    try:
        result = await db.execute(
            select(VendorBill).where(VendorBill.id == bill_id)
        )
        bill = result.scalar_one_or_none()
        
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        
        # Create payment record
        payment = VendorBillPayment(
            bill_id=bill_id,
            payment_date=payment_data.payment_date,
            payment_amount=payment_data.payment_amount,
            payment_method=payment_data.payment_method,
            reference_number=payment_data.reference_number,
            notes=payment_data.notes,
            recorded_by_email="system@ngicapitaladvisory.com",  # TODO: Get from auth
            created_at=get_pst_now()
        )
        
        db.add(payment)
        
        # Update bill
        bill.amount_paid += payment_data.payment_amount
        bill.amount_due = bill.total_amount - bill.amount_paid
        
        if bill.amount_due <= Decimal("0.01"):
            bill.status = "paid"
            bill.paid_date = payment_data.payment_date
            bill.payment_method = payment_data.payment_method
            bill.payment_reference = payment_data.reference_number
        
        await db.flush()
        
        # Create journal entry if requested
        je_id = None
        if create_je:
            try:
                je = await create_bill_payment_journal_entry(
                    bill_id,
                    payment_data.payment_amount,
                    payment_data.payment_date,
                    payment_data.payment_method,
                    db
                )
                payment.journal_entry_id = je.id
                je_id = je.id
            except Exception as e:
                logger.error(f"Error creating payment journal entry: {str(e)}")
        
        await db.commit()
        
        return {
            "success": True,
            "message": "Payment recorded successfully",
            "payment": {
                "id": payment.id,
                "payment_amount": float(payment.payment_amount),
                "journal_entry_id": je_id
            },
            "bill_status": bill.status,
            "amount_due": float(bill.amount_due)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording payment: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/vendors/match-or-create")
async def match_or_create_vendor(
    entity_id: int,
    vendor_name: str,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Match existing vendor or create new one
    Used for document upload processing
    """
    try:
        # Try to find existing vendor by name (fuzzy match)
        result = await db.execute(
            select(Vendor).where(
                Vendor.entity_id == entity_id,
                Vendor.vendor_name.ilike(f"%{vendor_name}%")
            )
        )
        vendor = result.scalar_one_or_none()
        
        if vendor:
            return {
                "success": True,
                "matched": True,
                "vendor": {
                    "id": vendor.id,
                    "vendor_number": vendor.vendor_number,
                    "vendor_name": vendor.vendor_name
                }
            }
        
        # Create new vendor
        result = await db.execute(
            select(func.count(Vendor.id)).where(Vendor.entity_id == entity_id)
        )
        count = result.scalar() or 0
        vendor_number = f"VEND-{str(count + 1).zfill(5)}"
        
        new_vendor = Vendor(
            entity_id=entity_id,
            vendor_number=vendor_number,
            vendor_name=vendor_name,
            email=email,
            phone=phone,
            is_active=True,
            created_at=get_pst_now()
        )
        
        db.add(new_vendor)
        await db.commit()
        await db.refresh(new_vendor)
        
        return {
            "success": True,
            "matched": False,
            "vendor": {
                "id": new_vendor.id,
                "vendor_number": new_vendor.vendor_number,
                "vendor_name": new_vendor.vendor_name
            }
        }
    except Exception as e:
        logger.error(f"Error matching/creating vendor: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
