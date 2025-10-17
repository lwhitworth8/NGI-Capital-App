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
import os

logger = logging.getLogger(__name__)

from ..database_async import get_async_db
from ..models_ar import Customer, Invoice, InvoiceLine, InvoicePayment
from ..services.invoice_generator import generate_invoice_pdf
from ..models_accounting import (
    JournalEntry, JournalEntryLine, ChartOfAccounts, JournalEntryAttachment
)
from ..models_accounting_part2 import AccountingDocument
from sqlalchemy import select as sa_select
# Manual JE (draft) creation for AR – no unified service
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
    credit_limit: Optional[Decimal] = None
    tax_id: Optional[str] = None
    tax_exempt: Optional[bool] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class InvoiceLineCreate(BaseModel):
    description: str
    quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    amount: Optional[Decimal] = None  # amount-first override
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
    bank_transaction_id: Optional[int] = None
    notes: Optional[str] = None


class InvoiceUpdate(BaseModel):
    customer_id: Optional[int] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    payment_terms: Optional[str] = None
    lines: Optional[List[InvoiceLineCreate]] = None
    tax_rate: Optional[Decimal] = None
    memo: Optional[str] = None
    internal_notes: Optional[str] = None


class InvoiceStatusUpdate(BaseModel):
    status: str  # draft, sent, paid, partially_paid, overdue


# ============================================================================
# LOOKUPS
# ============================================================================

@router.get("/revenue-accounts")
async def get_revenue_accounts(
    entity_id: int = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """List posting revenue accounts for an entity for invoice line selection."""
    try:
        result = await db.execute(
            sa_select(ChartOfAccounts).where(
                ChartOfAccounts.entity_id == entity_id,
                ChartOfAccounts.allow_posting == True,
                ChartOfAccounts.account_type.ilike("%Revenue%")
            ).order_by(ChartOfAccounts.account_number)
        )
        rows = result.scalars().all()
        return {
            "success": True,
            "accounts": [
                {
                    "id": r.id,
                    "account_number": r.account_number,
                    "account_name": r.account_name
                }
                for r in rows
            ]
        }
    except Exception as e:
        logger.error(f"Error getting revenue accounts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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


@router.get("/invoices/next-number")
async def get_next_invoice_number(
    entity_id: int = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Return the next invoice number using the same scheme as creation."""
    try:
        result = await db.execute(
            select(func.count(Invoice.id)).where(Invoice.entity_id == entity_id)
        )
        count = result.scalar() or 0
        next_no = f"INV-{datetime.now().year}-{str(count + 1).zfill(5)}"
        return {"success": True, "next_invoice_number": next_no}
    except Exception as e:
        logger.error(f"Error getting next invoice number: {str(e)}")
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
        
        # Calculate totals (amount-first: amount overrides qty*rate)
        line_totals: List[Decimal] = []
        for line in invoice_data.lines:
            if line.amount is not None:
                line_totals.append(Decimal(str(line.amount)))
            else:
                qty = Decimal(str(line.quantity)) if line.quantity is not None else Decimal("0")
                rate = Decimal(str(line.unit_price)) if line.unit_price is not None else Decimal("0")
                line_totals.append((qty * rate).quantize(Decimal("0.01")))
        subtotal = sum(line_totals, Decimal("0.00"))
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
            # Compute per-line totals using amount-first
            if line_data.amount is not None:
                line_total = Decimal(str(line_data.amount))
                qty = Decimal("0")
                rate = Decimal("0")
            else:
                qty = Decimal(str(line_data.quantity)) if line_data.quantity is not None else Decimal("0")
                rate = Decimal(str(line_data.unit_price)) if line_data.unit_price is not None else Decimal("0")
                line_total = (qty * rate).quantize(Decimal("0.01"))
            invoice_line = InvoiceLine(
                invoice_id=invoice.id,
                line_number=idx,
                description=line_data.description,
                quantity=qty,
                unit_price=rate,
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
                # store pdf path on invoice for later retrieval/attachments
                invoice.pdf_file_path = pdf_path
                await db.commit()
            except Exception as e:
                logger.error(f"Error generating invoice PDF: {str(e)}")
                # Continue even if PDF generation fails
        
        # Create manual draft journal entry if requested
        je_id = None
        if create_je:
            try:
                # Ensure COA exists (seed if missing minimal accounts)
                # Find AR account 10310; if not found, attempt seed
                ar_acc = await db.execute(
                    sa_select(ChartOfAccounts).where(
                        ChartOfAccounts.entity_id == entity_id,
                        ChartOfAccounts.account_number == "10310"
                    )
                )
                ar_acc_row = ar_acc.scalar_one_or_none()
                if not ar_acc_row:
                    raise HTTPException(status_code=400, detail="AR account 10310 not found in COA")

                # Determine revenue accounts per line; fallback to 40110 Advisory Fees
                lines_result = await db.execute(
                    sa_select(InvoiceLine).where(InvoiceLine.invoice_id == invoice.id)
                )
                invoice_lines = lines_result.scalars().all()

                rev_accounts: list[tuple[int, Decimal, str]] = []  # (account_id, amount, desc)
                total_credit = Decimal("0.00")
                for ln in invoice_lines:
                    acct_id = ln.revenue_account_id
                    if not acct_id:
                        # Try default revenue 40110
                        rev_acc = await db.execute(
                            sa_select(ChartOfAccounts.id).where(
                                ChartOfAccounts.entity_id == entity_id,
                                ChartOfAccounts.account_number == "40110"
                            )
                        )
                        acct_id = rev_acc.scalar_one_or_none()
                        if not acct_id:
                            # Fallback: first posting revenue account
                            any_rev = await db.execute(
                                sa_select(ChartOfAccounts.id).where(
                                    ChartOfAccounts.entity_id == entity_id,
                                    ChartOfAccounts.account_type.ilike("%Revenue%"),
                                    ChartOfAccounts.allow_posting == True
                                ).limit(1)
                            )
                            acct_id = any_rev.scalar_one_or_none()
                    if not acct_id:
                        raise HTTPException(status_code=400, detail="No revenue account available for invoice line")
                    amt = ln.total_amount
                    total_credit += amt
                    rev_accounts.append((int(acct_id), amt, ln.description))

                # Generate JE number (JE-YYYY-NNNNNN sequential by year)
                fiscal_year = invoice.invoice_date.year
                res = await db.execute(sa_select(JournalEntry).where(JournalEntry.fiscal_year == fiscal_year))
                count_year = len(res.scalars().all())
                entry_number = f"JE-{fiscal_year}-{(count_year + 1):06d}"

                # Create JE header (draft)
                je = JournalEntry(
                    entry_number=entry_number,
                    entity_id=entity_id,
                    entry_date=invoice.invoice_date,
                    fiscal_year=fiscal_year,
                    fiscal_period=invoice.invoice_date.month,
                    entry_type="Standard",
                    memo=f"AR Invoice {invoice.invoice_number}",
                    reference=invoice.invoice_number,
                    source_type="AR_Invoice",
                    source_id=str(invoice.id),
                    status="draft",
                    workflow_stage=0,
                    created_by_id=1,
                    created_at=get_pst_now()
                )
                db.add(je)
                await db.flush()

                # JE lines: Dr AR, Cr revenue by lines
                ln_no = 1
                db.add(JournalEntryLine(
                    journal_entry_id=je.id,
                    line_number=ln_no,
                    account_id=ar_acc_row.id,
                    debit_amount=invoice.total_amount,
                    credit_amount=Decimal("0.00"),
                    description=f"Invoice {invoice.invoice_number}"
                ))
                ln_no += 1
                for acc_id, amt, desc_txt in rev_accounts:
                    db.add(JournalEntryLine(
                        journal_entry_id=je.id,
                        line_number=ln_no,
                        account_id=acc_id,
                        debit_amount=Decimal("0.00"),
                        credit_amount=amt,
                        description=desc_txt or f"Invoice {invoice.invoice_number}"
                    ))
                    ln_no += 1

                # Persist JE
                await db.commit()
                await db.refresh(je)
                je_id = je.id

                # Attach generated invoice PDF to JE as AccountingDocument
                if pdf_path:
                    try:
                        doc = AccountingDocument(
                            entity_id=entity_id,
                            document_type="invoice",
                            category="invoices",
                            filename=pdf_path.split("/")[-1],
                            file_path=pdf_path,
                            file_size_bytes=None,
                            mime_type="application/pdf",
                            uploaded_by_id=1,
                            processing_status="uploaded",
                            workflow_status="pending",
                            extracted_data={
                                "invoice_id": invoice.id,
                                "invoice_number": invoice.invoice_number,
                                "customer_id": invoice.customer_id
                            }
                        )
                        db.add(doc)
                        await db.flush()
                        db.add(JournalEntryAttachment(
                            journal_entry_id=je_id,
                            document_id=doc.id,
                            display_order=0,
                            is_primary=True
                        ))
                        await db.commit()
                    except Exception as e:
                        logger.warning(f"Could not attach invoice PDF to JE: {e}")

                # Link JE to invoice
                invoice.journal_entry_id = je_id
                await db.commit()
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error creating draft JE for invoice: {str(e)}")
                # continue without failing invoice creation

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


@router.put("/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    db: AsyncSession = Depends(get_async_db)
):
    """Update draft invoice only"""
    try:
        result = await db.execute(
            select(Invoice).where(Invoice.id == invoice_id)
        )
        invoice = result.scalar_one_or_none()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        if invoice.status != "draft":
            raise HTTPException(status_code=400, detail="Only draft invoices can be edited")
        
        # Update basic fields
        update_data = invoice_data.model_dump(exclude_unset=True, exclude={'lines'})
        for field, value in update_data.items():
            if value is not None:
                setattr(invoice, field, value)
        
        # Handle lines update if provided
        if invoice_data.lines is not None:
            # Delete existing lines
            from sqlalchemy import delete
            await db.execute(
                delete(InvoiceLine).where(InvoiceLine.invoice_id == invoice_id)
            )
            
            # Recalculate totals
            line_totals: List[Decimal] = []
            for line in invoice_data.lines:
                if line.amount is not None:
                    line_totals.append(Decimal(str(line.amount)))
                else:
                    qty = Decimal(str(line.quantity)) if line.quantity is not None else Decimal("0")
                    rate = Decimal(str(line.unit_price)) if line.unit_price is not None else Decimal("0")
                    line_totals.append((qty * rate).quantize(Decimal("0.01")))
            
            subtotal = sum(line_totals, Decimal("0.00"))
            tax_amount = Decimal("0.00")
            if invoice.tax_rate:
                tax_amount = (subtotal * invoice.tax_rate / 100).quantize(Decimal("0.01"))
            total_amount = subtotal + tax_amount
            
            invoice.subtotal = subtotal
            invoice.tax_amount = tax_amount
            invoice.total_amount = total_amount
            invoice.amount_due = total_amount - invoice.amount_paid
            
            # Create new lines
            for idx, line_data in enumerate(invoice_data.lines, 1):
                if line_data.amount is not None:
                    line_total = Decimal(str(line_data.amount))
                    qty = Decimal("0")
                    rate = Decimal("0")
                else:
                    qty = Decimal(str(line_data.quantity)) if line_data.quantity is not None else Decimal("0")
                    rate = Decimal(str(line_data.unit_price)) if line_data.unit_price is not None else Decimal("0")
                    line_total = (qty * rate).quantize(Decimal("0.01"))
                
                invoice_line = InvoiceLine(
                    invoice_id=invoice.id,
                    line_number=idx,
                    description=line_data.description,
                    quantity=qty,
                    unit_price=rate,
                    total_amount=line_total,
                    revenue_account_id=line_data.revenue_account_id,
                    performance_obligation_description=line_data.performance_obligation_description,
                    created_at=get_pst_now()
                )
                db.add(invoice_line)
        
        invoice.updated_at = get_pst_now()
        await db.commit()
        
        # Regenerate PDF
        try:
            pdf_path = await generate_invoice_pdf(invoice.id, db)
            invoice.pdf_file_path = pdf_path
            await db.commit()
        except Exception as e:
            logger.error(f"Error regenerating invoice PDF: {str(e)}")
        
        return {
            "success": True,
            "message": "Invoice updated successfully",
            "pdf_path": invoice.pdf_file_path
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating invoice: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Delete draft invoice only"""
    try:
        result = await db.execute(
            select(Invoice).where(Invoice.id == invoice_id)
        )
        invoice = result.scalar_one_or_none()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        if invoice.status != "draft":
            raise HTTPException(status_code=400, detail="Only draft invoices can be deleted")
        
        # Delete PDF file if exists
        if invoice.pdf_file_path and os.path.exists(invoice.pdf_file_path):
            try:
                os.remove(invoice.pdf_file_path)
            except Exception as e:
                logger.warning(f"Could not delete PDF file: {str(e)}")
        
        # Delete invoice (cascade will handle lines and payments)
        await db.delete(invoice)
        await db.commit()
        
        return {
            "success": True,
            "message": "Invoice deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting invoice: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/invoices/{invoice_id}/status")
async def update_invoice_status(
    invoice_id: int,
    status_data: InvoiceStatusUpdate,
    db: AsyncSession = Depends(get_async_db)
):
    """Update invoice status with workflow validation"""
    try:
        result = await db.execute(
            select(Invoice).where(Invoice.id == invoice_id)
        )
        invoice = result.scalar_one_or_none()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        current_status = invoice.status
        new_status = status_data.status
        
        # Validate status transitions
        valid_transitions = {
            "draft": ["sent"],
            "sent": ["paid", "partially_paid", "overdue"],
            "partially_paid": ["paid", "overdue"],
            "overdue": ["paid", "partially_paid"],
            "paid": []  # Final state
        }
        
        if new_status not in valid_transitions.get(current_status, []):
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid status transition from {current_status} to {new_status}"
            )
        
        # Update status
        invoice.status = new_status
        
        # Set timestamps
        if new_status == "sent" and current_status == "draft":
            invoice.sent_at = get_pst_now()
        elif new_status == "paid":
            invoice.paid_date = date.today()
        
        # Check for overdue status
        if new_status in ["sent", "partially_paid"] and invoice.due_date < date.today():
            invoice.status = "overdue"
        
        await db.commit()
        
        return {
            "success": True,
            "message": f"Invoice status updated to {invoice.status}",
            "status": invoice.status,
            "sent_at": invoice.sent_at.isoformat() if invoice.sent_at else None,
            "paid_date": invoice.paid_date.isoformat() if invoice.paid_date else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating invoice status: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# REPORTS
# ============================================================================

@router.get("/reports/ar-aging")
async def ar_aging_report(
    entity_id: int = Query(...),
    as_of: date = Query(default_factory=lambda: date.today()),
    db: AsyncSession = Depends(get_async_db)
):
    """Compute AR aging buckets from invoices and payments (SQLAlchemy models)."""
    try:
        # Fetch invoices for entity
        inv_res = await db.execute(
            sa_select(Invoice).where(
                Invoice.entity_id == entity_id,
                Invoice.status != "cancelled"
            )
        )
        invoices = inv_res.scalars().all()

        buckets = {"0_30": [], "31_60": [], "61_90": [], ">90": []}
        totals = {"0_30": 0.0, "31_60": 0.0, "61_90": 0.0, ">90": 0.0}

        for inv in invoices:
            # Sum payments up to as_of
            pay_res = await db.execute(
                sa_select(func.coalesce(func.sum(InvoicePayment.payment_amount), 0)).where(
                    InvoicePayment.invoice_id == inv.id,
                    InvoicePayment.payment_date <= as_of
                )
            )
            paid = Decimal(str(pay_res.scalar() or 0))
            open_amt = (inv.total_amount or Decimal("0.00")) - paid
            if open_amt <= Decimal("0.00"):
                continue

            # Determine days past due
            try:
                days_past_due = (as_of - inv.due_date).days
            except Exception:
                days_past_due = 0

            bucket_key = "0_30"
            if days_past_due > 90:
                bucket_key = ">90"
            elif days_past_due > 60:
                bucket_key = "61_90"
            elif days_past_due > 30:
                bucket_key = "31_60"

            item = {
                "invoice_id": inv.id,
                "invoice_number": inv.invoice_number,
                "invoice_date": inv.invoice_date.isoformat(),
                "due_date": inv.due_date.isoformat(),
                "total_amount": float(inv.total_amount or 0),
                "amount_paid": float(paid),
                "open_amount": float(open_amt),
                "days_past_due": max(0, days_past_due),
                "status": inv.status,
            }
            buckets[bucket_key].append(item)
            totals[bucket_key] += float(open_amt)

        return {
            "success": True,
            "entity_id": entity_id,
            "as_of": as_of.isoformat(),
            "buckets": buckets,
            "totals": {k: round(v, 2) for k, v in totals.items()},
            "total_open_ar": round(sum(totals.values()), 2),
        }
    except Exception as e:
        logger.error(f"Error generating AR aging report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/ar-summary")
async def ar_summary_dashboard(
    entity_id: int = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Get AR summary dashboard metrics"""
    try:
        # Total AR by status
        status_result = await db.execute(
            select(
                Invoice.status,
                func.count(Invoice.id).label("count"),
                func.sum(Invoice.amount_due).label("total_amount")
            ).where(
                Invoice.entity_id == entity_id,
                Invoice.status.in_(["sent", "partially_paid", "overdue"])
            ).group_by(Invoice.status)
        )
        status_totals = {row.status: {"count": row.count, "amount": float(row.total_amount or 0)} for row in status_result}
        
        # Overdue invoices
        overdue_result = await db.execute(
            select(
                func.count(Invoice.id).label("count"),
                func.sum(Invoice.amount_due).label("total_amount")
            ).where(
                Invoice.entity_id == entity_id,
                Invoice.status == "overdue"
            )
        )
        overdue = overdue_result.first()
        
        # Get all open invoices and calculate aging in Python
        open_invoices_result = await db.execute(
            select(Invoice.amount_due, Invoice.due_date).where(
                Invoice.entity_id == entity_id,
                Invoice.status.in_(["sent", "partially_paid", "overdue"])
            )
        )
        open_invoices = open_invoices_result.fetchall()
        
        # Calculate aging buckets
        aging = {"0_30": 0, "31_60": 0, "61_90": 0, "over_90": 0}
        today = date.today()
        
        for invoice in open_invoices:
            days_overdue = (today - invoice.due_date).days
            amount = float(invoice.amount_due or 0)
            
            if days_overdue <= 30:
                aging["0_30"] += amount
            elif days_overdue <= 60:
                aging["31_60"] += amount
            elif days_overdue <= 90:
                aging["61_90"] += amount
            else:
                aging["over_90"] += amount
        
        return {
            "success": True,
            "entity_id": entity_id,
            "status_totals": status_totals,
            "overdue": {
                "count": overdue.count or 0,
                "amount": float(overdue.total_amount or 0)
            },
            "aging": aging,
            "total_open_ar": sum(aging.values())
        }
    except Exception as e:
        logger.error(f"Error generating AR summary: {str(e)}")
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
    """Record payment received for invoice with automatic bank transaction matching"""
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
            bank_transaction_id=payment_data.bank_transaction_id,
            notes=payment_data.notes,
            recorded_by_email="system@ngicapitaladvisory.com",  # TODO: Get from auth
            created_at=get_pst_now()
        )
        
        db.add(payment)
        await db.flush()
        
        # Update invoice
        invoice.amount_paid += payment_data.payment_amount
        invoice.amount_due = invoice.total_amount - invoice.amount_paid
        
        if invoice.amount_due <= Decimal("0.01"):
            invoice.status = "paid"
            invoice.paid_date = payment_data.payment_date
        elif invoice.amount_paid > 0:
            invoice.status = "partially_paid"
        
        await db.flush()
        
        # Handle bank transaction matching and journal entry creation
        je_id = None
        if payment_data.bank_transaction_id and create_je:
            try:
                # Import BankTransaction model
                from ..models_accounting_part2 import BankTransaction
                
                # Get bank transaction
                bank_txn_result = await db.execute(
                    select(BankTransaction).where(BankTransaction.id == payment_data.bank_transaction_id)
                )
                bank_txn = bank_txn_result.scalar_one_or_none()
                
                if bank_txn:
                    # Update bank transaction as matched
                    bank_txn.is_matched = True
                    bank_txn.matched_at = get_pst_now()
                    bank_txn.matched_by_id = 1  # TODO: Get from auth
                    bank_txn.status = "matched"
                    
                    # Create journal entry: Dr Cash, Cr AR
                    from ..models_accounting import JournalEntry, JournalEntryLine, ChartOfAccounts
                    
                    # Get cash account (first bank account's GL account)
                    cash_acc_result = await db.execute(
                        select(ChartOfAccounts).where(
                            ChartOfAccounts.entity_id == invoice.entity_id,
                            ChartOfAccounts.account_type == "Asset",
                            ChartOfAccounts.account_number.like("101%")  # Cash accounts
                        ).limit(1)
                    )
                    cash_acc = cash_acc_result.scalar_one_or_none()
                    
                    if cash_acc:
                        # Generate JE number
                        fiscal_year = payment_data.payment_date.year
                        je_count_result = await db.execute(
                            select(func.count(JournalEntry.id)).where(JournalEntry.fiscal_year == fiscal_year)
                        )
                        je_count = je_count_result.scalar() or 0
                        entry_number = f"JE-{fiscal_year}-{(je_count + 1):06d}"
                        
                        # Create JE
                        je = JournalEntry(
                            entry_number=entry_number,
                            entity_id=invoice.entity_id,
                            entry_date=payment_data.payment_date,
                            fiscal_year=fiscal_year,
                            fiscal_period=payment_data.payment_date.month,
                            entry_type="Standard",
                            memo=f"Payment received for invoice {invoice.invoice_number}",
                            reference=invoice.invoice_number,
                            source_type="AR_Payment",
                            source_id=str(payment.id),
                            status="draft",
                            workflow_stage=0,
                            created_by_id=1,
                            created_at=get_pst_now()
                        )
                        db.add(je)
                        await db.flush()
                        
                        # Get AR account
                        ar_acc_result = await db.execute(
                            select(ChartOfAccounts).where(
                                ChartOfAccounts.entity_id == invoice.entity_id,
                                ChartOfAccounts.account_number == "10310"  # AR account
                            )
                        )
                        ar_acc = ar_acc_result.scalar_one_or_none()
                        
                        if ar_acc:
                            # JE lines: Dr Cash, Cr AR
                            db.add(JournalEntryLine(
                                journal_entry_id=je.id,
                                line_number=1,
                                account_id=cash_acc.id,
                                debit_amount=payment_data.payment_amount,
                                credit_amount=Decimal("0.00"),
                                description=f"Payment for invoice {invoice.invoice_number}"
                            ))
                            
                            db.add(JournalEntryLine(
                                journal_entry_id=je.id,
                                line_number=2,
                                account_id=ar_acc.id,
                                debit_amount=Decimal("0.00"),
                                credit_amount=payment_data.payment_amount,
                                description=f"Payment for invoice {invoice.invoice_number}"
                            ))
                            
                            # Link bank transaction to JE
                            bank_txn.matched_journal_entry_id = je.id
                            je_id = je.id
                            
                            # Link payment to JE
                            payment.journal_entry_id = je.id
                            
                            await db.commit()
                        else:
                            logger.warning("AR account 10310 not found for payment JE")
                    else:
                        logger.warning("Cash account not found for payment JE")
                else:
                    logger.warning(f"Bank transaction {payment_data.bank_transaction_id} not found")
            except Exception as e:
                logger.error(f"Error creating payment journal entry: {str(e)}")
                # Continue without failing payment recording
        
        await db.commit()
        
        return {
            "success": True,
            "message": "Payment recorded successfully",
            "payment": {
                "id": payment.id,
                "payment_amount": float(payment.payment_amount),
                "journal_entry_id": je_id,
                "bank_transaction_id": payment.bank_transaction_id
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
