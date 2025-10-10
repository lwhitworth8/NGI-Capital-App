"""
NGI Capital - Bill to Journal Entry Automation
Auto-create journal entries for vendor bills

Author: NGI Capital Development Team
Date: October 10, 2025
"""

from decimal import Decimal
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from ..models_ap import VendorBill, VendorBillLine, Vendor
from ..models_accounting import JournalEntry, JournalEntryLine, ChartOfAccounts
from ..utils.datetime_utils import get_pst_now

logger = logging.getLogger(__name__)


async def get_account_by_number(entity_id: int, account_number: str, db: AsyncSession) -> Optional[int]:
    """
    Get account ID by account number
    
    Args:
        entity_id: Entity ID
        account_number: Account number (e.g., "20110")
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
        prefix: Entry prefix (e.g., "AP", "PMT")
        db: Database session
        
    Returns:
        Entry number (e.g., "AP-2025-00001")
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


async def suggest_expense_account(description: str, vendor_name: str, entity_id: int, db: AsyncSession) -> Optional[int]:
    """
    Suggest appropriate expense account based on description and vendor
    
    Args:
        description: Line item description
        vendor_name: Vendor name
        entity_id: Entity ID
        db: Database session
        
    Returns:
        Account ID or None (defaults to G&A if not found)
    """
    description_lower = description.lower()
    vendor_lower = vendor_name.lower()
    
    # Mapping of keywords to account numbers
    account_mapping = {
        "60210": ["software", "saas", "subscription", "cloud", "api", "openai", "claude", "anthropic", "github", "vercel", "aws", "azure"],
        "60220": ["internet", "hosting", "domain", "dns", "bandwidth"],
        "60410": ["legal", "attorney", "law", "compliance", "filing"],
        "60420": ["accounting", "bookkeeping", "audit", "tax preparation"],
        "60430": ["consulting", "advisor", "consultant"],
        "60510": ["marketing", "advertising", "ad", "campaign", "promotion"],
        "60520": ["website", "web design", "seo"],
        "60610": ["office", "supplies", "stationery"],
        "60620": ["insurance", "liability", "e&o", "workers comp"],
        "60630": ["utilities", "electric", "power", "telephone"],
        "60110": ["salary", "wage", "payroll", "compensation"],
        "60120": ["bonus", "incentive"],
        "60140": ["health", "medical", "dental", "vision", "benefits"],
        "60310": ["rent", "lease", "office space"],
        "60320": ["maintenance", "repair", "cleaning"],
    }
    
    # Check description and vendor name against keywords
    for account_number, keywords in account_mapping.items():
        for keyword in keywords:
            if keyword in description_lower or keyword in vendor_lower:
                account_id = await get_account_by_number(entity_id, account_number, db)
                if account_id:
                    return account_id
    
    # Default to General and Administrative (60650)
    return await get_account_by_number(entity_id, "60650", db)


async def create_bill_journal_entry(bill_id: int, db: AsyncSession) -> JournalEntry:
    """
    Auto-create journal entry for vendor bill
    
    Journal Entry:
    DR: Expense Account(s)
    CR: Accounts Payable (20110)
    
    Args:
        bill_id: Bill ID
        db: Database session
        
    Returns:
        Created JournalEntry
    """
    # Fetch bill
    result = await db.execute(
        select(VendorBill).where(VendorBill.id == bill_id)
    )
    bill = result.scalar_one()
    
    # Fetch vendor for description
    vendor_result = await db.execute(
        select(Vendor).where(Vendor.id == bill.vendor_id)
    )
    vendor = vendor_result.scalar_one()
    
    # Fetch bill lines
    lines_result = await db.execute(
        select(VendorBillLine).where(VendorBillLine.bill_id == bill_id).order_by(VendorBillLine.line_number)
    )
    bill_lines = lines_result.scalars().all()
    
    # Create journal entry
    entry_number = await generate_entry_number(bill.entity_id, "AP", db)
    
    je = JournalEntry(
        entity_id=bill.entity_id,
        entry_number=entry_number,
        entry_date=bill.bill_date,
        fiscal_year=bill.bill_date.year,
        fiscal_period=bill.bill_date.month,
        entry_type="Standard",
        memo=f"Bill {bill.bill_number} - {vendor.vendor_name}",
        reference=bill.bill_number,
        source_type="VendorBill",
        source_id=str(bill_id),
        status="draft",
        workflow_stage=0,
        created_by_email="system@ngicapitaladvisory.com",
        created_at=get_pst_now()
    )
    
    db.add(je)
    await db.flush()  # Get JE ID
    
    # Create debit lines for expenses
    line_number = 1
    expense_by_account = {}
    
    for bill_line in bill_lines:
        if bill_line.expense_account_id:
            account_id = bill_line.expense_account_id
        else:
            # Auto-suggest account
            account_id = await suggest_expense_account(
                bill_line.description, 
                vendor.vendor_name,
                bill.entity_id,
                db
            )
        
        if account_id not in expense_by_account:
            expense_by_account[account_id] = {
                "amount": Decimal("0.00"),
                "descriptions": []
            }
        expense_by_account[account_id]["amount"] += bill_line.total_amount
        expense_by_account[account_id]["descriptions"].append(bill_line.description)
    
    # Create DR lines for each expense account
    for account_id, data in expense_by_account.items():
        description = "; ".join(data["descriptions"][:2])  # Max 2 descriptions
        if len(data["descriptions"]) > 2:
            description += f" (+ {len(data['descriptions']) - 2} more)"
        
        je_line = JournalEntryLine(
            journal_entry_id=je.id,
            line_number=line_number,
            account_id=account_id,
            debit_amount=data["amount"],
            credit_amount=Decimal("0.00"),
            description=description,
            created_at=get_pst_now()
        )
        db.add(je_line)
        line_number += 1
    
    # CR: Accounts Payable
    ap_account_id = await get_account_by_number(bill.entity_id, "20110", db)
    if not ap_account_id:
        logger.error(f"AP account (20110) not found for entity {bill.entity_id}")
        raise ValueError("Accounts Payable account not found")
    
    je_line_ap = JournalEntryLine(
        journal_entry_id=je.id,
        line_number=line_number,
        account_id=ap_account_id,
        debit_amount=Decimal("0.00"),
        credit_amount=bill.total_amount,
        description=f"AP - Bill {bill.bill_number}",
        created_at=get_pst_now()
    )
    db.add(je_line_ap)
    
    await db.commit()
    
    # Update bill with JE link
    bill.journal_entry_id = je.id
    await db.commit()
    
    logger.info(f"Created journal entry {je.entry_number} for bill {bill.bill_number}")
    
    return je


async def create_bill_payment_journal_entry(
    bill_id: int,
    payment_amount: Decimal,
    payment_date,
    payment_method: str,
    db: AsyncSession
) -> JournalEntry:
    """
    Create journal entry for bill payment
    
    Journal Entry:
    DR: Accounts Payable (20110)
    CR: Cash (10110)
    
    Args:
        bill_id: Bill ID
        payment_amount: Amount paid
        payment_date: Date payment made
        payment_method: Payment method
        db: Database session
        
    Returns:
        Created JournalEntry
    """
    # Fetch bill
    result = await db.execute(
        select(VendorBill).where(VendorBill.id == bill_id)
    )
    bill = result.scalar_one()
    
    # Create journal entry
    entry_number = await generate_entry_number(bill.entity_id, "PMT", db)
    
    je = JournalEntry(
        entity_id=bill.entity_id,
        entry_number=entry_number,
        entry_date=payment_date,
        fiscal_year=payment_date.year,
        fiscal_period=payment_date.month,
        entry_type="Standard",
        memo=f"Payment for Bill {bill.bill_number} via {payment_method}",
        reference=bill.bill_number,
        source_type="BillPayment",
        source_id=str(bill_id),
        status="draft",
        workflow_stage=0,
        created_by_email="system@ngicapitaladvisory.com",
        created_at=get_pst_now()
    )
    
    db.add(je)
    await db.flush()
    
    # Line 1: DR Accounts Payable
    ap_account_id = await get_account_by_number(bill.entity_id, "20110", db)
    if not ap_account_id:
        logger.error(f"AP account (20110) not found for entity {bill.entity_id}")
        raise ValueError("Accounts Payable account not found")
    
    je_line_1 = JournalEntryLine(
        journal_entry_id=je.id,
        line_number=1,
        account_id=ap_account_id,
        debit_amount=payment_amount,
        credit_amount=Decimal("0.00"),
        description=f"Payment - Bill {bill.bill_number}",
        created_at=get_pst_now()
    )
    db.add(je_line_1)
    
    # Line 2: CR Cash
    cash_account_id = await get_account_by_number(bill.entity_id, "10110", db)
    if not cash_account_id:
        logger.error(f"Cash account (10110) not found for entity {bill.entity_id}")
        raise ValueError("Cash account not found")
    
    je_line_2 = JournalEntryLine(
        journal_entry_id=je.id,
        line_number=2,
        account_id=cash_account_id,
        debit_amount=Decimal("0.00"),
        credit_amount=payment_amount,
        description=f"Payment made - Bill {bill.bill_number}",
        created_at=get_pst_now()
    )
    db.add(je_line_2)
    
    await db.commit()
    
    logger.info(f"Created payment journal entry {je.entry_number} for bill {bill.bill_number}")
    
    return je

