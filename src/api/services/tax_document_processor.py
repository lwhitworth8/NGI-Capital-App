"""
Tax Document Processor
Auto-creates tax payments and JEs from uploaded documents
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, Optional
import logging

from src.api.models_tax import TaxPayment
from src.api.models_accounting import JournalEntry, JournalEntryLine, ChartOfAccounts
from src.api.utils.datetime_utils import get_pst_now

logger = logging.getLogger(__name__)


class TaxDocumentProcessor:
    """Process tax payment documents and create records"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def process_tax_payment_document(
        self,
        document_id: int,
        entity_id: int,
        extracted_data: Dict
    ) -> int:
        """
        Process uploaded tax payment document
        Creates tax payment record and draft JE
        """
        # Determine tax type from extracted data
        tax_type = self._determine_tax_type(extracted_data)
        
        # Generate payment number
        payment_number = await self._generate_payment_number(entity_id, tax_type)
        
        # Extract payment details
        payment_date = self._parse_date(extracted_data.get("payment_date") or extracted_data.get("date"))
        amount = Decimal(str(extracted_data.get("amount") or extracted_data.get("total_amount", 0)))
        tax_period = extracted_data.get("tax_period", "")
        confirmation_number = extracted_data.get("confirmation_number", "")
        
        # Determine tax year
        tax_year = payment_date.year if payment_date else datetime.now().year
        
        # Create tax payment record
        tax_payment = TaxPayment(
            entity_id=entity_id,
            payment_number=payment_number,
            tax_type=tax_type,
            tax_period=tax_period,
            tax_year=tax_year,
            payment_date=payment_date,
            amount_paid=float(amount),
            payment_method=extracted_data.get("payment_method", "Online"),
            confirmation_number=confirmation_number,
            document_id=document_id,
            status="paid",
            created_at=get_pst_now(),
            created_by_email="system@ngi"
        )
        
        self.db.add(tax_payment)
        await self.db.flush()
        
        # Create journal entry
        je_id = await self._create_tax_payment_je(tax_payment, entity_id)
        tax_payment.journal_entry_id = je_id
        
        await self.db.commit()
        
        logger.info(f"Processed tax payment document: {document_id}, created payment: {tax_payment.id}, JE: {je_id}")
        
        return tax_payment.id
    
    def _determine_tax_type(self, extracted_data: Dict) -> str:
        """Determine tax type from extracted data"""
        description = str(extracted_data.get("description", "")).lower()
        vendor = str(extracted_data.get("vendor_name", "")).lower()
        
        # Federal Income Tax
        if any(keyword in description or keyword in vendor for keyword in ["federal income", "1120", "irs", "federal tax"]):
            return "Federal Income Tax"
        
        # State Income Tax
        if any(keyword in description or keyword in vendor for keyword in ["state income", "california", "ftb", "state tax"]):
            return "State Income Tax"
        
        # Payroll Tax (Form 941)
        if any(keyword in description or keyword in vendor for keyword in ["941", "payroll tax", "employment tax", "fica"]):
            return "Form 941"
        
        # FUTA (Federal Unemployment)
        if any(keyword in description or keyword in vendor for keyword in ["940", "futa", "federal unemployment"]):
            return "FUTA"
        
        # SUTA (State Unemployment - California)
        if any(keyword in description or keyword in vendor for keyword in ["suta", "ui", "unemployment insurance", "edd"]):
            return "SUTA"
        
        # Sales Tax
        if any(keyword in description or keyword in vendor for keyword in ["sales tax", "use tax", "cdtfa"]):
            return "Sales Tax"
        
        # Estimated Tax
        if any(keyword in description or keyword in vendor for keyword in ["estimated", "quarterly"]):
            return "Estimated Tax Payment"
        
        # Default
        return "Other Tax"
    
    def _parse_date(self, date_str: any) -> date:
        """Parse date from various formats"""
        if isinstance(date_str, date):
            return date_str
        if isinstance(date_str, datetime):
            return date_str.date()
        if isinstance(date_str, str):
            # Try various formats
            for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y", "%Y/%m/%d"]:
                try:
                    return datetime.strptime(date_str, fmt).date()
                except ValueError:
                    continue
        # Default to today
        return datetime.now().date()
    
    async def _generate_payment_number(self, entity_id: int, tax_type: str) -> str:
        """Generate unique payment number"""
        # Get count of existing payments for this entity and type
        result = await self.db.execute(
            select(TaxPayment).where(
                and_(
                    TaxPayment.entity_id == entity_id,
                    TaxPayment.tax_type == tax_type
                )
            )
        )
        count = len(result.scalars().all())
        
        # Generate number based on tax type
        type_prefix = {
            "Federal Income Tax": "FIT",
            "State Income Tax": "SIT",
            "Form 941": "941",
            "FUTA": "FUTA",
            "SUTA": "SUTA",
            "Sales Tax": "ST",
            "Estimated Tax Payment": "EST"
        }.get(tax_type, "TAX")
        
        return f"{type_prefix}-{entity_id}-{count + 1:04d}"
    
    async def _create_tax_payment_je(self, tax_payment: TaxPayment, entity_id: int) -> int:
        """
        Create journal entry for tax payment
        DR: Tax Expense or Prepaid Tax (depending on timing)
        CR: Cash
        """
        je = JournalEntry(
            entity_id=entity_id,
            entry_number=f"TAX-PAY-{tax_payment.id}",
            entry_date=tax_payment.payment_date,
            entry_type="Standard",
            memo=f"{tax_payment.tax_type} payment - {tax_payment.tax_period}",
            source_type="Tax Payment",
            source_id=str(tax_payment.id),
            status="draft",
            workflow_stage=0,
            created_by_email="system@ngi",
            created_at=get_pst_now()
        )
        
        # Determine debit account based on tax type
        debit_account = await self._get_tax_expense_account(entity_id, tax_payment.tax_type)
        
        # DR: Tax Expense
        je.lines.append(JournalEntryLine(
            line_number=1,
            account_id=debit_account,
            debit_amount=tax_payment.amount_paid,
            credit_amount=0,
            description=f"{tax_payment.tax_type} - {tax_payment.tax_period}"
        ))
        
        # CR: Cash
        cash_account = await self._get_cash_account(entity_id)
        je.lines.append(JournalEntryLine(
            line_number=2,
            account_id=cash_account,
            debit_amount=0,
            credit_amount=tax_payment.amount_paid,
            description=f"Payment - {tax_payment.confirmation_number}"
        ))
        
        self.db.add(je)
        await self.db.flush()
        
        return je.id
    
    async def _get_tax_expense_account(self, entity_id: int, tax_type: str) -> int:
        """Get appropriate tax expense account based on tax type"""
        # Map tax types to account numbers
        account_mapping = {
            "Federal Income Tax": "70110",  # Income Tax Expense
            "State Income Tax": "70120",  # State Tax Expense
            "Form 941": "60170",  # Payroll Tax Expense
            "FUTA": "60172",  # Federal Unemployment Tax
            "SUTA": "60174",  # State Unemployment Tax
            "Sales Tax": "20260",  # Sales Tax Payable (liability, not expense)
            "Estimated Tax Payment": "70110"  # Income Tax Expense
        }
        
        account_number = account_mapping.get(tax_type, "60690")  # Default: Other Taxes
        
        result = await self.db.execute(
            select(ChartOfAccounts.id).where(
                and_(
                    ChartOfAccounts.entity_id == entity_id,
                    ChartOfAccounts.account_number == account_number
                )
            )
        )
        account_id = result.scalar()
        
        if not account_id:
            # Try default cash account
            logger.warning(f"Tax account {account_number} not found, using default")
            account_id = await self._get_default_expense_account(entity_id)
        
        return account_id
    
    async def _get_cash_account(self, entity_id: int) -> int:
        """Get primary cash account"""
        result = await self.db.execute(
            select(ChartOfAccounts.id).where(
                and_(
                    ChartOfAccounts.entity_id == entity_id,
                    ChartOfAccounts.account_number == "10110"  # Operating Cash
                )
            )
        )
        account_id = result.scalar()
        
        if not account_id:
            logger.error(f"Cash account not found for entity {entity_id}")
            raise ValueError(f"Cash account not found for entity {entity_id}")
        
        return account_id
    
    async def _get_default_expense_account(self, entity_id: int) -> int:
        """Get default expense account as fallback"""
        result = await self.db.execute(
            select(ChartOfAccounts.id).where(
                and_(
                    ChartOfAccounts.entity_id == entity_id,
                    ChartOfAccounts.account_number == "60690"  # Other Expenses
                )
            )
        )
        account_id = result.scalar()
        
        if not account_id:
            raise ValueError(f"Default expense account not found for entity {entity_id}")
        
        return account_id

