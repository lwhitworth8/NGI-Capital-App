"""
NGI Capital - Invoice to Journal Entry Automation
ASC 606 Revenue Recognition Automation

Author: NGI Capital Development Team
Date: October 10, 2025
"""

from decimal import Decimal
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from ..models_ar import Invoice, InvoiceLine, Customer
from ..models_accounting import JournalEntry, JournalEntryLine, ChartOfAccounts
from ..utils.datetime_utils import get_pst_now

logger = logging.getLogger(__name__)


async def get_account_by_number(entity_id: int, account_number: str, db: AsyncSession) -> Optional[int]:
    """
    Get account ID by account number
    
    Args:
        entity_id: Entity ID
        account_number: Account number (e.g., "10310")
        db: Database session
        
    Returns:
        Account ID or None
    """
    result = await db.execute(
        select(ChartOfAccounts).where(
            ChartOfAccounts.entity_id == entity_id,
            ChartOfAccounts.account_number == account_number
        )
    )
    account = result.scalar_one_or_none()
    return account.id if account else None


async def generate_entry_number(entity_id: int, prefix: str, db: AsyncSession) -> str:
    """
    Generate sequential journal entry number
    
    Args:
        entity_id: Entity ID
        prefix: Entry prefix (e.g., "AR", "AP")
        db: Database session
        
    Returns:
        Entry number (e.g., "AR-2025-00001")
    """
    from datetime import datetime
    
    # Get count of entries this year with this prefix
    current_year = datetime.now().year
    result = await db.execute(
        select(JournalEntry).where(
            JournalEntry.entity_id == entity_id,
            JournalEntry.entry_number.like(f"{prefix}-{current_year}%")
        )
    )
    count = len(result.scalars().all())
    
    # Generate sequential number
    sequence = str(count + 1).zfill(5)
    return f"{prefix}-{current_year}-{sequence}"


async def create_invoice_journal_entry(invoice_id: int, db: AsyncSession) -> JournalEntry:
    """
    Auto-create journal entry for invoice per ASC 606
    
    Revenue Recognition Rules (ASC 606):
    1. Identify the contract with customer
    2. Identify performance obligations
    3. Determine transaction price
    4. Allocate price to performance obligations
    5. Recognize revenue when (or as) performance obligation satisfied
    
    Journal Entry:
    DR: Accounts Receivable (10310)
    CR: Service Revenue (40110)
    CR: Sales Tax Payable (20260) [if applicable]
    
    Args:
        invoice_id: Invoice ID
        db: Database session
        
    Returns:
        Created JournalEntry
    """
    # Fetch invoice
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one()
    
    # Fetch customer for description
    customer_result = await db.execute(
        select(Customer).where(Customer.id == invoice.customer_id)
    )
    customer = customer_result.scalar_one()
    
    # Fetch invoice lines
    lines_result = await db.execute(
        select(InvoiceLine).where(InvoiceLine.invoice_id == invoice_id)
    )
    invoice_lines = lines_result.scalars().all()
    
    # Create journal entry
    entry_number = await generate_entry_number(invoice.entity_id, "AR", db)
    
    je = JournalEntry(
        entity_id=invoice.entity_id,
        entry_number=entry_number,
        entry_date=invoice.invoice_date,
        fiscal_year=invoice.invoice_date.year,
        fiscal_period=invoice.invoice_date.month,
        entry_type="Standard",
        memo=f"Invoice {invoice.invoice_number} - {customer.customer_name}",
        reference=invoice.invoice_number,
        source_type="Invoice",
        source_id=str(invoice_id),
        status="draft",
        workflow_stage=0,
        created_by_email="system@ngicapitaladvisory.com",
        created_at=get_pst_now()
    )
    
    db.add(je)
    await db.flush()  # Get JE ID
    
    # Line 1: DR Accounts Receivable
    ar_account_id = await get_account_by_number(invoice.entity_id, "10310", db)
    if not ar_account_id:
        logger.error(f"AR account (10310) not found for entity {invoice.entity_id}")
        raise ValueError("Accounts Receivable account not found")
    
    je_line_1 = JournalEntryLine(
        journal_entry_id=je.id,
        line_number=1,
        account_id=ar_account_id,
        debit_amount=invoice.total_amount,
        credit_amount=Decimal("0.00"),
        description=f"AR - Invoice {invoice.invoice_number}",
        created_at=get_pst_now()
    )
    db.add(je_line_1)
    
    # Line 2: CR Service Revenue
    # Check if invoice lines have specific revenue accounts
    revenue_by_account = {}
    
    for inv_line in invoice_lines:
        if inv_line.revenue_account_id:
            account_id = inv_line.revenue_account_id
        else:
            # Default to Service Revenue (40110)
            account_id = await get_account_by_number(invoice.entity_id, "40110", db)
        
        if account_id not in revenue_by_account:
            revenue_by_account[account_id] = Decimal("0.00")
        revenue_by_account[account_id] += inv_line.total_amount
    
    # Create revenue lines
    line_number = 2
    for account_id, amount in revenue_by_account.items():
        je_line = JournalEntryLine(
            journal_entry_id=je.id,
            line_number=line_number,
            account_id=account_id,
            debit_amount=Decimal("0.00"),
            credit_amount=amount,
            description=f"Revenue - Invoice {invoice.invoice_number}",
            created_at=get_pst_now()
        )
        db.add(je_line)
        line_number += 1
    
    # Line 3: CR Sales Tax Payable (if applicable)
    if invoice.tax_amount > 0:
        tax_account_id = await get_account_by_number(invoice.entity_id, "20260", db)
        if tax_account_id:
            je_line_tax = JournalEntryLine(
                journal_entry_id=je.id,
                line_number=line_number,
                account_id=tax_account_id,
                debit_amount=Decimal("0.00"),
                credit_amount=invoice.tax_amount,
                description=f"Sales Tax - Invoice {invoice.invoice_number}",
                created_at=get_pst_now()
            )
            db.add(je_line_tax)
    
    await db.commit()
    
    # Update invoice with JE link
    invoice.journal_entry_id = je.id
    await db.commit()
    
    logger.info(f"Created journal entry {je.entry_number} for invoice {invoice.invoice_number}")
    
    return je


async def create_payment_journal_entry(
    invoice_id: int,
    payment_amount: Decimal,
    payment_date,
    payment_method: str,
    db: AsyncSession
) -> JournalEntry:
    """
    Create journal entry for invoice payment received
    
    Journal Entry:
    DR: Cash (10110)
    CR: Accounts Receivable (10310)
    
    Args:
        invoice_id: Invoice ID
        payment_amount: Amount received
        payment_date: Date payment received
        payment_method: Payment method
        db: Database session
        
    Returns:
        Created JournalEntry
    """
    # Fetch invoice
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one()
    
    # Create journal entry
    entry_number = await generate_entry_number(invoice.entity_id, "RCPT", db)
    
    je = JournalEntry(
        entity_id=invoice.entity_id,
        entry_number=entry_number,
        entry_date=payment_date,
        fiscal_year=payment_date.year,
        fiscal_period=payment_date.month,
        entry_type="Standard",
        memo=f"Payment received for Invoice {invoice.invoice_number} via {payment_method}",
        reference=invoice.invoice_number,
        source_type="InvoicePayment",
        source_id=str(invoice_id),
        status="draft",
        workflow_stage=0,
        created_by_email="system@ngicapitaladvisory.com",
        created_at=get_pst_now()
    )
    
    db.add(je)
    await db.flush()
    
    # Line 1: DR Cash
    cash_account_id = await get_account_by_number(invoice.entity_id, "10110", db)
    if not cash_account_id:
        logger.error(f"Cash account (10110) not found for entity {invoice.entity_id}")
        raise ValueError("Cash account not found")
    
    je_line_1 = JournalEntryLine(
        journal_entry_id=je.id,
        line_number=1,
        account_id=cash_account_id,
        debit_amount=payment_amount,
        credit_amount=Decimal("0.00"),
        description=f"Payment received - Invoice {invoice.invoice_number}",
        created_at=get_pst_now()
    )
    db.add(je_line_1)
    
    # Line 2: CR Accounts Receivable
    ar_account_id = await get_account_by_number(invoice.entity_id, "10310", db)
    je_line_2 = JournalEntryLine(
        journal_entry_id=je.id,
        line_number=2,
        account_id=ar_account_id,
        debit_amount=Decimal("0.00"),
        credit_amount=payment_amount,
        description=f"Payment applied - Invoice {invoice.invoice_number}",
        created_at=get_pst_now()
    )
    db.add(je_line_2)
    
    await db.commit()
    
    logger.info(f"Created payment journal entry {je.entry_number} for invoice {invoice.invoice_number}")
    
    return je

