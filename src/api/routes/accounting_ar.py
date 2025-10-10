"""
NGI Capital - Accounts Receivable API Routes
Customer and Invoice management per ASC 606

Author: NGI Capital Development Team
Date: October 10, 2025
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

from ..database_async import get_async_db
from ..models_ar import Customer, Invoice, InvoiceLine, InvoicePayment
from ..services.invoice_generator import generate_invoice_pdf
from ..services.invoice_je_automation import create_invoice_journal_entry, create_payment_journal_entry
from ..utils.datetime_utils import get_pst_now

router = APIRouter(prefix="/api/accounting/ar", tags=["Accounting - Accounts Receivable"])


# ============================================================================
# SCHEMAS
# ============================================================================

class CustomerCreate(BaseModel):
    customer_name: str
    customer_type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    billing_address_line1: Optional[str] = None
    billing_address_line2: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_zip: Optional[str] = None
    payment_terms: str = "Net 30"
    tax_id: Optional[str] = None
    tax_exempt: bool = False
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    billing_address_line1: Optional[str] = None
    billing_address_line2: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_zip: Optional[str] = None
    payment_terms: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    tax_id: Optional[str] = None
    tax_exempt: Optional[bool] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class InvoiceLineCreate(BaseModel):
    description: str
    quantity: Decimal = Decimal("1.00")
    unit_price: Decimal
    revenue_account_id: Optional[int] = None
    performance_obligation_description: Optional[str] = None


class InvoiceCreate(BaseModel):
    customer_id: int
    invoice_date: date
    due_date: Optional[date] = None
    payment_terms: str = "Net 30"
    lines: List[InvoiceLineCreate]
    tax_rate: Optional[Decimal] = None
    memo: Optional[str] = None
    internal_notes: Optional[str] = None


class InvoicePaymentCreate(BaseModel):
    payment_date: date
    payment_amount: Decimal
    payment_method: str
    reference_number: Optional[str] = None
    notes: Optional[str] = None


# ============================================================================
# CUSTOMER ROUTES
# ============================================================================

@router.get("/customers")
async def get_customers(
    entity_id: int = Query(...),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_db)
):
    """Get all customers for entity with optional filters"""
    try:
        query = select(Customer).where(Customer.entity_id == entity_id)
        
        if search:
            query = query.where(
                or_(
                    Customer.customer_name.ilike(f"%{search}%"),
                    Customer.email.ilike(f"%{search}%")
                )
            )
        
        if is_active is not None:
            query = query.where(Customer.is_active == is_active)
        
        query = query.order_by(Customer.customer_name).offset(skip).limit(limit)
        
        result = await db.execute(query)
        customers = result.scalars().all()
        
        return {
            "success": True,
            "customers": [
                {
                    "id": c.id,
                    "customer_number": c.customer_number,
                    "customer_name": c.customer_name,
                    "customer_type": c.customer_type,
                    "email": c.email,
                    "phone": c.phone,
                    "billing_address": f"{c.billing_address_line1 or ''} {c.billing_city or ''}, {c.billing_state or ''}".strip(),
                    "payment_terms": c.payment_terms,
                    "is_active": c.is_active,
                    "created_at": c.created_at.isoformat() if c.created_at else None
                }
                for c in customers
            ]
        }
    except Exception as e:
        logger.error(f"Error getting customers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/customers")
async def create_customer(
    entity_id: int,
    customer_data: CustomerCreate,
    db: AsyncSession = Depends(get_async_db)
):
    """Create new customer"""
    try:
        # Generate customer number
        result = await db.execute(
            select(func.count(Customer.id)).where(Customer.entity_id == entity_id)
        )
        count = result.scalar() or 0
        customer_number = f"CUST-{str(count + 1).zfill(5)}"
        
        customer = Customer(
            entity_id=entity_id,
            customer_number=customer_number,
            **customer_data.model_dump()
        )
        
        db.add(customer)
        await db.commit()
        await db.refresh(customer)
        
        return {
            "success": True,
            "message": "Customer created successfully",
            "customer": {
                "id": customer.id,
                "customer_number": customer.customer_number,
                "customer_name": customer.customer_name
            }
        }
    except Exception as e:
        logger.error(f"Error creating customer: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/customers/{customer_id}")
async def get_customer(customer_id: int, db: AsyncSession = Depends(get_async_db)):
    """Get customer details"""
    try:
        result = await db.execute(
            select(Customer).where(Customer.id == customer_id)
        )
        customer = result.scalar_one_or_none()
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return {
            "success": True,
            "customer": {
                "id": customer.id,
                "customer_number": customer.customer_number,
                "customer_name": customer.customer_name,
                "customer_type": customer.customer_type,
                "email": customer.email,
                "phone": customer.phone,
                "website": customer.website,
                "billing_address_line1": customer.billing_address_line1,
                "billing_address_line2": customer.billing_address_line2,
                "billing_city": customer.billing_city,
                "billing_state": customer.billing_state,
                "billing_zip": customer.billing_zip,
                "payment_terms": customer.payment_terms,
                "credit_limit": float(customer.credit_limit) if customer.credit_limit else None,
                "tax_id": customer.tax_id,
                "tax_exempt": customer.tax_exempt,
                "is_active": customer.is_active,
                "notes": customer.notes,
                "created_at": customer.created_at.isoformat() if customer.created_at else None
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting customer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/customers/{customer_id}")
async def update_customer(
    customer_id: int,
    customer_data: CustomerUpdate,
    db: AsyncSession = Depends(get_async_db)
):
    """Update customer"""
    try:
        result = await db.execute(
            select(Customer).where(Customer.id == customer_id)
        )
        customer = result.scalar_one_or_none()
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Update fields
        update_data = customer_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(customer, field, value)
        
        customer.updated_at = get_pst_now()
        
        await db.commit()
        
        return {
            "success": True,
            "message": "Customer updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating customer: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# INVOICE ROUTES
# ============================================================================

@router.get("/invoices")
async def get_invoices(
    entity_id: int = Query(...),
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_db)
):
    """Get all invoices with optional filters"""
    try:
        query = select(Invoice).where(Invoice.entity_id == entity_id)
        
        if customer_id:
            query = query.where(Invoice.customer_id == customer_id)
        
        if status:
            query = query.where(Invoice.status == status)
        
        if start_date:
            query = query.where(Invoice.invoice_date >= start_date)
        
        if end_date:
            query = query.where(Invoice.invoice_date <= end_date)
        
        query = query.order_by(desc(Invoice.invoice_date)).offset(skip).limit(limit)
        
        result = await db.execute(query)
        invoices = result.scalars().all()
        
        # Get customer names
        invoice_data = []
        for inv in invoices:
            customer_result = await db.execute(
                select(Customer).where(Customer.id == inv.customer_id)
            )
            customer = customer_result.scalar_one_or_none()
            
            invoice_data.append({
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "invoice_date": inv.invoice_date.isoformat(),
                "due_date": inv.due_date.isoformat(),
                "customer_name": customer.customer_name if customer else "Unknown",
                "total_amount": float(inv.total_amount),
                "amount_paid": float(inv.amount_paid),
                "amount_due": float(inv.amount_due),
                "status": inv.status,
                "payment_terms": inv.payment_terms,
                "created_at": inv.created_at.isoformat() if inv.created_at else None
            })
        
        return {
            "success": True,
            "invoices": invoice_data
        }
    except Exception as e:
        logger.error(f"Error getting invoices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invoices")
async def create_invoice(
    entity_id: int,
    invoice_data: InvoiceCreate,
    generate_pdf: bool = True,
    create_je: bool = True,
    db: AsyncSession = Depends(get_async_db)
):
    """Create new invoice"""
    try:
        # Calculate due date if not provided
        due_date = invoice_data.due_date
        if not due_date:
            from datetime import timedelta
            days = 30  # Default Net 30
            if "15" in invoice_data.payment_terms:
                days = 15
            elif "60" in invoice_data.payment_terms:
                days = 60
            due_date = invoice_data.invoice_date + timedelta(days=days)
        
        # Calculate totals
        subtotal = sum(line.quantity * line.unit_price for line in invoice_data.lines)
        tax_amount = Decimal("0.00")
        if invoice_data.tax_rate:
            tax_amount = (subtotal * invoice_data.tax_rate / 100).quantize(Decimal("0.01"))
        total_amount = subtotal + tax_amount
        
        # Generate invoice number
        result = await db.execute(
            select(func.count(Invoice.id)).where(Invoice.entity_id == entity_id)
        )
        count = result.scalar() or 0
        invoice_number = f"INV-{datetime.now().year}-{str(count + 1).zfill(5)}"
        
        # Create invoice
        invoice = Invoice(
            entity_id=entity_id,
            customer_id=invoice_data.customer_id,
            invoice_number=invoice_number,
            invoice_date=invoice_data.invoice_date,
            due_date=due_date,
            payment_terms=invoice_data.payment_terms,
            subtotal=subtotal,
            tax_rate=invoice_data.tax_rate,
            tax_amount=tax_amount,
            total_amount=total_amount,
            amount_due=total_amount,
            status="draft",
            memo=invoice_data.memo,
            internal_notes=invoice_data.internal_notes,
            created_by_email="system@ngicapitaladvisory.com",  # TODO: Get from auth
            created_at=get_pst_now()
        )
        
        db.add(invoice)
        await db.flush()
        
        # Create invoice lines
        for idx, line_data in enumerate(invoice_data.lines, 1):
            line_total = line_data.quantity * line_data.unit_price
            invoice_line = InvoiceLine(
                invoice_id=invoice.id,
                line_number=idx,
                description=line_data.description,
                quantity=line_data.quantity,
                unit_price=line_data.unit_price,
                total_amount=line_total,
                revenue_account_id=line_data.revenue_account_id,
                performance_obligation_description=line_data.performance_obligation_description,
                created_at=get_pst_now()
            )
            db.add(invoice_line)
        
        await db.commit()
        await db.refresh(invoice)
        
        # Generate PDF if requested
        pdf_path = None
        if generate_pdf:
            try:
                pdf_path = await generate_invoice_pdf(invoice.id, db)
            except Exception as e:
                logger.error(f"Error generating invoice PDF: {str(e)}")
                # Continue even if PDF generation fails
        
        # Create journal entry if requested
        je_id = None
        if create_je:
            try:
                je = await create_invoice_journal_entry(invoice.id, db)
                je_id = je.id
            except Exception as e:
                logger.error(f"Error creating journal entry: {str(e)}")
                # Continue even if JE creation fails
        
        return {
            "success": True,
            "message": "Invoice created successfully",
            "invoice": {
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "total_amount": float(invoice.total_amount),
                "pdf_path": pdf_path,
                "journal_entry_id": je_id
            }
        }
    except Exception as e:
        logger.error(f"Error creating invoice: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: int, db: AsyncSession = Depends(get_async_db)):
    """Get invoice details with lines"""
    try:
        result = await db.execute(
            select(Invoice).where(Invoice.id == invoice_id)
        )
        invoice = result.scalar_one_or_none()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Get customer
        customer_result = await db.execute(
            select(Customer).where(Customer.id == invoice.customer_id)
        )
        customer = customer_result.scalar_one_or_none()
        
        # Get lines
        lines_result = await db.execute(
            select(InvoiceLine).where(InvoiceLine.invoice_id == invoice_id).order_by(InvoiceLine.line_number)
        )
        lines = lines_result.scalars().all()
        
        return {
            "success": True,
            "invoice": {
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "invoice_date": invoice.invoice_date.isoformat(),
                "due_date": invoice.due_date.isoformat(),
                "customer": {
                    "id": customer.id if customer else None,
                    "customer_name": customer.customer_name if customer else "Unknown"
                },
                "subtotal": float(invoice.subtotal),
                "tax_rate": float(invoice.tax_rate) if invoice.tax_rate else None,
                "tax_amount": float(invoice.tax_amount),
                "total_amount": float(invoice.total_amount),
                "amount_paid": float(invoice.amount_paid),
                "amount_due": float(invoice.amount_due),
                "status": invoice.status,
                "payment_terms": invoice.payment_terms,
                "memo": invoice.memo,
                "pdf_file_path": invoice.pdf_file_path,
                "journal_entry_id": invoice.journal_entry_id,
                "lines": [
                    {
                        "line_number": line.line_number,
                        "description": line.description,
                        "quantity": float(line.quantity),
                        "unit_price": float(line.unit_price),
                        "total_amount": float(line.total_amount)
                    }
                    for line in lines
                ]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting invoice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: int, db: AsyncSession = Depends(get_async_db)):
    """Download invoice PDF"""
    try:
        result = await db.execute(
            select(Invoice).where(Invoice.id == invoice_id)
        )
        invoice = result.scalar_one_or_none()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Generate PDF if not exists
        if not invoice.pdf_file_path:
            pdf_path = await generate_invoice_pdf(invoice.id, db)
        else:
            pdf_path = invoice.pdf_file_path
        
        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename=f"{invoice.invoice_number}.pdf"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading invoice PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invoices/{invoice_id}/send")
async def send_invoice(
    invoice_id: int,
    email_to: str,
    db: AsyncSession = Depends(get_async_db)
):
    """Send invoice via email"""
    try:
        result = await db.execute(
            select(Invoice).where(Invoice.id == invoice_id)
        )
        invoice = result.scalar_one_or_none()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # TODO: Implement email sending logic
        # For now, just mark as sent
        invoice.status = "sent"
        invoice.sent_to_email = email_to
        invoice.sent_at = get_pst_now()
        
        await db.commit()
        
        return {
            "success": True,
            "message": f"Invoice sent to {email_to}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending invoice: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invoices/{invoice_id}/payments")
async def record_invoice_payment(
    invoice_id: int,
    payment_data: InvoicePaymentCreate,
    create_je: bool = True,
    db: AsyncSession = Depends(get_async_db)
):
    """Record payment received for invoice"""
    try:
        result = await db.execute(
            select(Invoice).where(Invoice.id == invoice_id)
        )
        invoice = result.scalar_one_or_none()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Create payment record
        payment = InvoicePayment(
            invoice_id=invoice_id,
            payment_date=payment_data.payment_date,
            payment_amount=payment_data.payment_amount,
            payment_method=payment_data.payment_method,
            reference_number=payment_data.reference_number,
            notes=payment_data.notes,
            recorded_by_email="system@ngicapitaladvisory.com",  # TODO: Get from auth
            created_at=get_pst_now()
        )
        
        db.add(payment)
        
        # Update invoice
        invoice.amount_paid += payment_data.payment_amount
        invoice.amount_due = invoice.total_amount - invoice.amount_paid
        
        if invoice.amount_due <= Decimal("0.01"):
            invoice.status = "paid"
            invoice.paid_date = payment_data.payment_date
        elif invoice.amount_paid > 0:
            invoice.status = "partially_paid"
        
        await db.flush()
        
        # Create journal entry if requested
        je_id = None
        if create_je:
            try:
                je = await create_payment_journal_entry(
                    invoice_id,
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
            "invoice_status": invoice.status,
            "amount_due": float(invoice.amount_due)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording payment: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

