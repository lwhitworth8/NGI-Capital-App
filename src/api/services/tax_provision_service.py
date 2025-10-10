"""
Tax Provision Calculation Service
ASC 740 Compliance - Income Tax Accounting
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import date
from decimal import Decimal
from typing import Dict, List
import logging

from src.api.models_accounting import AccountingEntity, JournalEntry, JournalEntryLine, ChartOfAccounts
from src.api.models_tax import TaxProvision
from src.api.models_fixed_assets import FixedAsset, DepreciationEntry
from src.api.utils.datetime_utils import get_pst_now

logger = logging.getLogger(__name__)


class TaxProvisionService:
    """Calculate income tax provision per ASC 740"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def calculate_provision(
        self,
        entity_id: int,
        year: int,
        period: str = "Annual"
    ) -> Dict:
        """
        Calculate comprehensive income tax provision
        
        Steps per ASC 740:
        1. Calculate pretax book income
        2. Identify book-tax differences (M-1 reconciliation)
        3. Calculate taxable income
        4. Calculate current tax expense
        5. Calculate deferred tax
        6. Calculate total provision and effective rate
        """
        entity = await self.db.get(AccountingEntity, entity_id)
        if not entity:
            raise ValueError(f"Entity {entity_id} not found")
        
        # Step 1: Get pretax book income from income statement
        pretax_income = await self._get_pretax_income(entity_id, year)
        
        # Step 2: Calculate M-1 reconciliation (book-tax differences)
        m1_additions, m1_subtractions = await self._calculate_m1_reconciliation(entity_id, year)
        
        total_m1_additions = sum(Decimal(str(v)) for v in m1_additions.values())
        total_m1_subtractions = sum(Decimal(str(v)) for v in m1_subtractions.values())
        
        # Step 3: Calculate taxable income
        taxable_income = pretax_income + total_m1_additions - total_m1_subtractions
        
        # Step 4: Calculate current tax expense
        current_tax = await self._calculate_current_tax(entity, taxable_income)
        
        # Step 5: Calculate deferred tax
        deferred_tax = await self._calculate_deferred_tax(entity_id, year)
        
        # Step 6: Calculate total provision
        total_provision = current_tax['total'] + deferred_tax['net']
        effective_rate = (total_provision / pretax_income) if pretax_income != 0 else Decimal("0")
        
        # Create provision record
        provision = TaxProvision(
            entity_id=entity_id,
            provision_year=year,
            provision_period=period,
            pretax_book_income=float(pretax_income),
            m1_additions=m1_additions,
            m1_subtractions=m1_subtractions,
            total_m1_additions=float(total_m1_additions),
            total_m1_subtractions=float(total_m1_subtractions),
            taxable_income=float(taxable_income),
            federal_taxable_income=float(taxable_income),
            state_taxable_income=float(taxable_income),
            federal_tax_rate=float(current_tax['federal_rate']),
            state_tax_rate=float(current_tax['state_rate']),
            current_federal_tax=float(current_tax['federal']),
            current_state_tax=float(current_tax['state']),
            total_current_tax=float(current_tax['total']),
            temporary_differences=deferred_tax['differences'],
            deferred_tax_asset=float(deferred_tax['dta']),
            deferred_tax_liability=float(deferred_tax['dtl']),
            net_deferred_tax=float(deferred_tax['net']),
            total_tax_provision=float(total_provision),
            effective_tax_rate=float(effective_rate),
            status="calculated",
            calculation_date=get_pst_now()
        )
        
        self.db.add(provision)
        await self.db.commit()
        await self.db.refresh(provision)
        
        return {
            "provision_id": provision.id,
            "pretax_book_income": float(pretax_income),
            "m1_additions": m1_additions,
            "m1_subtractions": m1_subtractions,
            "taxable_income": float(taxable_income),
            "current_tax": current_tax,
            "deferred_tax": deferred_tax,
            "total_provision": float(total_provision),
            "effective_rate": float(effective_rate)
        }
    
    async def _get_pretax_income(self, entity_id: int, year: int) -> Decimal:
        """Get pretax income from posted journal entries"""
        year_start = date(year, 1, 1)
        year_end = date(year, 12, 31)
        
        # Query all revenue and expense accounts
        result = await self.db.execute(
            select(
                JournalEntryLine.account_id,
                ChartOfAccounts.account_type,
                func.sum(JournalEntryLine.credit_amount).label('total_credit'),
                func.sum(JournalEntryLine.debit_amount).label('total_debit')
            ).join(
                ChartOfAccounts, JournalEntryLine.account_id == ChartOfAccounts.id
            ).join(
                JournalEntry, JournalEntryLine.journal_entry_id == JournalEntry.id
            ).where(
                and_(
                    JournalEntry.entity_id == entity_id,
                    JournalEntry.entry_date >= year_start,
                    JournalEntry.entry_date <= year_end,
                    JournalEntry.status == "posted",
                    ChartOfAccounts.account_type.in_(["Revenue", "Expense", "Other Income", "Other Expense"])
                )
            ).group_by(JournalEntryLine.account_id, ChartOfAccounts.account_type)
        )
        
        rows = result.all()
        
        revenue = Decimal("0")
        expenses = Decimal("0")
        
        for row in rows:
            if row.account_type in ["Revenue", "Other Income"]:
                revenue += Decimal(str(row.total_credit or 0)) - Decimal(str(row.total_debit or 0))
            else:  # Expense, Other Expense
                expenses += Decimal(str(row.total_debit or 0)) - Decimal(str(row.total_credit or 0))
        
        return revenue - expenses
    
    async def _calculate_m1_reconciliation(self, entity_id: int, year: int) -> tuple:
        """
        Calculate Schedule M-1 reconciliation
        Book-Tax Differences per IRC regulations
        """
        m1_additions = {}
        m1_subtractions = {}
        
        year_start = date(year, 1, 1)
        year_end = date(year, 12, 31)
        
        # Common M-1 additions:
        
        # 1. Meals & Entertainment (50% non-deductible)
        meals_result = await self.db.execute(
            select(func.sum(JournalEntryLine.debit_amount)).join(
                ChartOfAccounts, JournalEntryLine.account_id == ChartOfAccounts.id
            ).join(
                JournalEntry, JournalEntryLine.journal_entry_id == JournalEntry.id
            ).where(
                and_(
                    JournalEntry.entity_id == entity_id,
                    JournalEntry.entry_date >= year_start,
                    JournalEntry.entry_date <= year_end,
                    JournalEntry.status == "posted",
                    ChartOfAccounts.account_number.in_(["60640", "60641"])  # Meals & Entertainment accounts
                )
            )
        )
        meals_total = meals_result.scalar() or 0
        if meals_total > 0:
            m1_additions["Meals & Entertainment (50% disallowance)"] = float(Decimal(str(meals_total)) * Decimal("0.5"))
        
        # 2. Penalties and Fines (100% non-deductible)
        penalties_result = await self.db.execute(
            select(func.sum(JournalEntryLine.debit_amount)).join(
                ChartOfAccounts, JournalEntryLine.account_id == ChartOfAccounts.id
            ).join(
                JournalEntry, JournalEntryLine.journal_entry_id == JournalEntry.id
            ).where(
                and_(
                    JournalEntry.entity_id == entity_id,
                    JournalEntry.entry_date >= year_start,
                    JournalEntry.entry_date <= year_end,
                    JournalEntry.status == "posted",
                    ChartOfAccounts.account_number == "60650"  # Penalties & Fines
                )
            )
        )
        penalties_total = penalties_result.scalar() or 0
        if penalties_total > 0:
            m1_additions["Penalties and Fines (non-deductible)"] = float(penalties_total)
        
        # 3. Book depreciation vs Tax depreciation difference
        book_depreciation = await self._get_book_depreciation(entity_id, year)
        tax_depreciation = await self._get_tax_depreciation(entity_id, year)
        
        if book_depreciation > tax_depreciation:
            m1_additions["Excess book depreciation over tax"] = float(book_depreciation - tax_depreciation)
        elif tax_depreciation > book_depreciation:
            m1_subtractions["Excess tax depreciation over book"] = float(tax_depreciation - book_depreciation)
        
        # Common M-1 subtractions:
        
        # 1. Municipal bond interest (tax-exempt)
        muni_interest_result = await self.db.execute(
            select(func.sum(JournalEntryLine.credit_amount)).join(
                ChartOfAccounts, JournalEntryLine.account_id == ChartOfAccounts.id
            ).join(
                JournalEntry, JournalEntryLine.journal_entry_id == JournalEntry.id
            ).where(
                and_(
                    JournalEntry.entity_id == entity_id,
                    JournalEntry.entry_date >= year_start,
                    JournalEntry.entry_date <= year_end,
                    JournalEntry.status == "posted",
                    ChartOfAccounts.account_number == "40220"  # Municipal Bond Interest
                )
            )
        )
        muni_interest = muni_interest_result.scalar() or 0
        if muni_interest > 0:
            m1_subtractions["Municipal bond interest (tax-exempt)"] = float(muni_interest)
        
        return m1_additions, m1_subtractions
    
    async def _get_book_depreciation(self, entity_id: int, year: int) -> Decimal:
        """Get book depreciation from posted JEs"""
        year_start = date(year, 1, 1)
        year_end = date(year, 12, 31)
        
        result = await self.db.execute(
            select(func.sum(DepreciationEntry.depreciation_amount)).where(
                and_(
                    DepreciationEntry.entity_id == entity_id,
                    DepreciationEntry.period_date >= year_start,
                    DepreciationEntry.period_date <= year_end
                )
            )
        )
        total = result.scalar()
        return Decimal(str(total or 0))
    
    async def _get_tax_depreciation(self, entity_id: int, year: int) -> Decimal:
        """Calculate tax depreciation (MACRS or Section 179)"""
        # For simplicity, using straight-line for both
        # In production, implement full MACRS tables and Section 179
        return await self._get_book_depreciation(entity_id, year)
    
    async def _calculate_current_tax(self, entity: AccountingEntity, taxable_income: Decimal) -> Dict:
        """Calculate current federal and state income tax"""
        
        # Tax rates (2025)
        if entity.entity_type == "C-Corp":
            federal_rate = Decimal("0.21")  # Flat 21% for C-Corps
            state_rate = Decimal("0.0884")  # California 8.84%
        elif entity.entity_type == "S-Corp":
            # S-Corps are pass-through, but calculate for provision
            federal_rate = Decimal("0.37")  # Top individual rate
            state_rate = Decimal("0.133")  # California top rate
        else:  # LLC
            # LLCs are pass-through
            federal_rate = Decimal("0.37")
            state_rate = Decimal("0.133")
        
        federal_tax = taxable_income * federal_rate
        state_tax = taxable_income * state_rate
        total_tax = federal_tax + state_tax
        
        return {
            "federal": federal_tax,
            "state": state_tax,
            "total": total_tax,
            "federal_rate": federal_rate,
            "state_rate": state_rate
        }
    
    async def _calculate_deferred_tax(self, entity_id: int, year: int) -> Dict:
        """
        Calculate deferred tax assets and liabilities
        Per ASC 740, based on temporary differences
        """
        differences = {}
        dta = Decimal("0")  # Deferred Tax Asset
        dtl = Decimal("0")  # Deferred Tax Liability
        
        # Temporary difference: Depreciation (book vs tax)
        assets_result = await self.db.execute(
            select(FixedAsset).where(
                and_(
                    FixedAsset.entity_id == entity_id,
                    FixedAsset.status.in_(["In Service", "Fully Depreciated"])
                )
            )
        )
        assets = assets_result.scalars().all()
        
        for asset in assets:
            book_basis = float(asset.acquisition_cost) - float(asset.accumulated_depreciation or 0)
            # Assuming tax basis is same for simplicity
            # In production, calculate actual tax basis with MACRS
            tax_basis = book_basis
            
            difference = book_basis - tax_basis
            
            if difference != 0:
                differences[asset.asset_name] = {
                    "book_basis": book_basis,
                    "tax_basis": tax_basis,
                    "difference": difference
                }
                
                # If book > tax, DTL (we'll pay more tax later)
                # If tax > book, DTA (we'll pay less tax later)
                tax_rate = Decimal("0.2984")  # Combined federal + state
                if difference > 0:
                    dtl += Decimal(str(difference)) * tax_rate
                else:
                    dta += abs(Decimal(str(difference))) * tax_rate
        
        net_deferred = dtl - dta
        
        return {
            "differences": differences,
            "dta": dta,
            "dtl": dtl,
            "net": net_deferred
        }
    
    async def create_provision_journal_entry(self, provision_id: int) -> int:
        """
        Create JE for tax provision
        DR: Income Tax Expense
        CR: Current Tax Payable (federal and state)
        DR/CR: Deferred Tax Asset/Liability
        """
        provision = await self.db.get(TaxProvision, provision_id)
        if not provision:
            raise ValueError(f"Provision {provision_id} not found")
        
        from src.api.models_accounting import JournalEntry
        
        je = JournalEntry(
            entity_id=provision.entity_id,
            entry_number=f"TAX-{provision.provision_year}-{provision.id}",
            entry_date=date(provision.provision_year, 12, 31),
            entry_type="Adjusting",
            memo=f"Income tax provision - {provision.provision_year}",
            source_type="Tax Provision",
            source_id=str(provision_id),
            status="draft",
            workflow_stage=0,
            created_by_email="system@ngi",
            created_at=get_pst_now()
        )
        
        # DR: Income Tax Expense
        je.lines.append(JournalEntryLine(
            line_number=1,
            account_id=await self._get_account_by_number(provision.entity_id, "70110"),  # Income Tax Expense
            debit_amount=provision.total_tax_provision,
            credit_amount=0,
            description=f"Income tax provision {provision.provision_year}"
        ))
        
        # CR: Current Federal Tax Payable
        je.lines.append(JournalEntryLine(
            line_number=2,
            account_id=await self._get_account_by_number(provision.entity_id, "20240"),  # Federal Tax Payable
            debit_amount=0,
            credit_amount=provision.current_federal_tax,
            description="Current federal tax"
        ))
        
        # CR: Current State Tax Payable
        je.lines.append(JournalEntryLine(
            line_number=3,
            account_id=await self._get_account_by_number(provision.entity_id, "20250"),  # State Tax Payable
            debit_amount=0,
            credit_amount=provision.current_state_tax,
            description="Current state tax"
        ))
        
        # Deferred tax (if applicable)
        if provision.net_deferred_tax != 0:
            if provision.net_deferred_tax > 0:  # DTL
                je.lines.append(JournalEntryLine(
                    line_number=4,
                    account_id=await self._get_account_by_number(provision.entity_id, "25110"),  # Deferred Tax Liability
                    debit_amount=0,
                    credit_amount=abs(provision.net_deferred_tax),
                    description="Deferred tax liability"
                ))
            else:  # DTA
                je.lines.append(JournalEntryLine(
                    line_number=4,
                    account_id=await self._get_account_by_number(provision.entity_id, "10710"),  # Deferred Tax Asset
                    debit_amount=abs(provision.net_deferred_tax),
                    credit_amount=0,
                    description="Deferred tax asset"
                ))
        
        self.db.add(je)
        await self.db.commit()
        await self.db.refresh(je)
        
        # Link provision to JE
        provision.journal_entry_id = je.id
        await self.db.commit()
        
        return je.id
    
    async def _get_account_by_number(self, entity_id: int, account_number: str) -> int:
        """Get account ID by account number"""
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
            raise ValueError(f"Account {account_number} not found for entity {entity_id}")
        return account_id

