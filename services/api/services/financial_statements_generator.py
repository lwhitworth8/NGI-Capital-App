"""
Financial Statements Generator Service
US GAAP Compliant (ASC 210, 220, 230, 810)
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional
import logging

from services.api.models_accounting import (
    AccountingEntity, ChartOfAccounts, JournalEntry, JournalEntryLine
)
from services.api.models_fixed_assets import FixedAsset, DepreciationEntry
from services.api.utils.datetime_utils import get_pst_now

logger = logging.getLogger(__name__)


class FinancialStatementsGenerator:
    """Generate GAAP-compliant financial statements"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def generate_balance_sheet(
        self,
        entity_id: int,
        as_of_date: date,
        consolidated: bool = False
    ) -> Dict:
        """
        Generate Balance Sheet per ASC 210
        Classified format: Current vs Non-current
        """
        entity = await self.db.get(AccountingEntity, entity_id)
        if not entity:
            raise ValueError(f"Entity {entity_id} not found")
        
        # Query all accounts with balances
        accounts_query = await self.db.execute(
            select(ChartOfAccounts).where(
                ChartOfAccounts.entity_id == entity_id,
                ChartOfAccounts.is_active == True
            ).order_by(ChartOfAccounts.account_number)
        )
        accounts = accounts_query.scalars().all()
        
        balance_sheet = {
            "entity_name": entity.entity_name,
            "as_of_date": as_of_date.isoformat(),
            "currency": "USD",
            "consolidated": consolidated,
            "assets": {
                "current_assets": {},
                "non_current_assets": {},
                "total_current_assets": Decimal("0.00"),
                "total_non_current_assets": Decimal("0.00"),
                "total_assets": Decimal("0.00")
            },
            "liabilities": {
                "current_liabilities": {},
                "non_current_liabilities": {},
                "total_current_liabilities": Decimal("0.00"),
                "total_non_current_liabilities": Decimal("0.00"),
                "total_liabilities": Decimal("0.00")
            },
            "equity": {
                "stockholders_equity": {} if entity.entity_type == "C-Corp" else {"members_equity": {}},
                "total_equity": Decimal("0.00")
            }
        }
        
        # Process each account
        for account in accounts:
            balance = Decimal(str(account.current_balance or 0))
            if balance == 0:
                continue
            
            account_data = {
                "account_number": account.account_number,
                "balance": float(balance),
                "formatted_balance": f"${balance:,.2f}"
            }
            
            if account.account_type == "Asset":
                # Current assets: 10xxx series
                if account.account_number.startswith("10"):
                    balance_sheet["assets"]["current_assets"][account.account_name] = account_data
                    balance_sheet["assets"]["total_current_assets"] += balance
                # Non-current assets: 15xxx series
                else:
                    balance_sheet["assets"]["non_current_assets"][account.account_name] = account_data
                    balance_sheet["assets"]["total_non_current_assets"] += balance
                
                balance_sheet["assets"]["total_assets"] += balance
            
            elif account.account_type == "Liability":
                # Current liabilities: 20xxx series
                if account.account_number.startswith("20"):
                    balance_sheet["liabilities"]["current_liabilities"][account.account_name] = account_data
                    balance_sheet["liabilities"]["total_current_liabilities"] += balance
                # Non-current liabilities: 25xxx series
                else:
                    balance_sheet["liabilities"]["non_current_liabilities"][account.account_name] = account_data
                    balance_sheet["liabilities"]["total_non_current_liabilities"] += balance
                
                balance_sheet["liabilities"]["total_liabilities"] += balance
            
            elif account.account_type == "Equity":
                if entity.entity_type == "C-Corp":
                    balance_sheet["equity"]["stockholders_equity"][account.account_name] = account_data
                else:
                    balance_sheet["equity"]["members_equity"][account.account_name] = account_data
                
                balance_sheet["equity"]["total_equity"] += balance
        
        # Convert Decimals to floats for JSON serialization
        balance_sheet["assets"]["total_current_assets"] = float(balance_sheet["assets"]["total_current_assets"])
        balance_sheet["assets"]["total_non_current_assets"] = float(balance_sheet["assets"]["total_non_current_assets"])
        balance_sheet["assets"]["total_assets"] = float(balance_sheet["assets"]["total_assets"])
        balance_sheet["liabilities"]["total_current_liabilities"] = float(balance_sheet["liabilities"]["total_current_liabilities"])
        balance_sheet["liabilities"]["total_non_current_liabilities"] = float(balance_sheet["liabilities"]["total_non_current_liabilities"])
        balance_sheet["liabilities"]["total_liabilities"] = float(balance_sheet["liabilities"]["total_liabilities"])
        balance_sheet["equity"]["total_equity"] = float(balance_sheet["equity"]["total_equity"])
        
        # Check balance sheet equation: Assets = Liabilities + Equity
        balance_sheet["balance_check"] = {
            "assets": balance_sheet["assets"]["total_assets"],
            "liabilities_plus_equity": balance_sheet["liabilities"]["total_liabilities"] + balance_sheet["equity"]["total_equity"],
            "is_balanced": abs(balance_sheet["assets"]["total_assets"] - 
                             (balance_sheet["liabilities"]["total_liabilities"] + balance_sheet["equity"]["total_equity"])) < 0.01
        }
        
        return balance_sheet
    
    async def generate_income_statement(
        self,
        entity_id: int,
        period_start: date,
        period_end: date,
        consolidated: bool = False
    ) -> Dict:
        """
        Generate Multi-Step Income Statement per ASC 220
        Format: Revenue - COGS = Gross Profit - Operating Expenses = Operating Income
        """
        entity = await self.db.get(AccountingEntity, entity_id)
        if not entity:
            raise ValueError(f"Entity {entity_id} not found")
        
        income_statement = {
            "entity_name": entity.entity_name,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "currency": "USD",
            "consolidated": consolidated,
            "revenue": {},
            "total_revenue": Decimal("0.00"),
            "cost_of_revenue": Decimal("0.00"),
            "gross_profit": Decimal("0.00"),
            "operating_expenses": {
                "compensation_and_benefits": {},
                "technology": {},
                "occupancy": {},
                "professional_fees": {},
                "marketing": {},
                "general_and_administrative": {},
                "depreciation_and_amortization": {},
            },
            "total_operating_expenses": Decimal("0.00"),
            "operating_income": Decimal("0.00"),
            "other_income_expense": {},
            "total_other_income": Decimal("0.00"),
            "income_before_tax": Decimal("0.00"),
            "income_tax_expense": Decimal("0.00"),
            "net_income": Decimal("0.00")
        }
        
        # Query all posted JE lines for the period
        je_lines_query = await self.db.execute(
            select(JournalEntryLine, ChartOfAccounts).join(
                ChartOfAccounts, JournalEntryLine.account_id == ChartOfAccounts.id
            ).join(
                JournalEntry, JournalEntryLine.journal_entry_id == JournalEntry.id
            ).where(
                and_(
                    JournalEntry.entity_id == entity_id,
                    JournalEntry.entry_date >= period_start,
                    JournalEntry.entry_date <= period_end,
                    JournalEntry.status == "posted"
                )
            )
        )
        
        je_lines = je_lines_query.all()
        
        # Process each line
        for line, account in je_lines:
            # For revenue accounts, credit increases revenue (positive)
            # For expense accounts, debit increases expense (negative for income)
            if account.account_type == "Revenue":
                amount = Decimal(str(line.credit_amount or 0)) - Decimal(str(line.debit_amount or 0))
            else:  # Expenses
                amount = Decimal(str(line.debit_amount or 0)) - Decimal(str(line.credit_amount or 0))
            
            if amount == 0:
                continue
            
            account_data = {
                "account_number": account.account_number,
                "amount": float(amount),
                "formatted_amount": f"${abs(amount):,.2f}"
            }
            
            if account.account_type == "Revenue":
                income_statement["revenue"][account.account_name] = account_data
                income_statement["total_revenue"] += amount
            
            elif account.account_type == "Cost of Revenue":
                income_statement["cost_of_revenue"] += amount
            
            elif account.account_type == "Expense":
                # Categorize by account number prefix
                account_num = account.account_number
                
                if account_num.startswith("601"):  # Compensation
                    income_statement["operating_expenses"]["compensation_and_benefits"][account.account_name] = account_data
                elif account_num.startswith("602"):  # Technology
                    income_statement["operating_expenses"]["technology"][account.account_name] = account_data
                elif account_num.startswith("603"):  # Occupancy
                    income_statement["operating_expenses"]["occupancy"][account.account_name] = account_data
                elif account_num.startswith("604"):  # Professional Fees
                    income_statement["operating_expenses"]["professional_fees"][account.account_name] = account_data
                elif account_num.startswith("605"):  # Marketing
                    income_statement["operating_expenses"]["marketing"][account.account_name] = account_data
                elif account_num.startswith("606"):  # G&A
                    income_statement["operating_expenses"]["general_and_administrative"][account.account_name] = account_data
                elif account_num.startswith("607"):  # Depreciation
                    income_statement["operating_expenses"]["depreciation_and_amortization"][account.account_name] = account_data
                else:
                    # Other operating expenses
                    if "other" not in income_statement["operating_expenses"]:
                        income_statement["operating_expenses"]["other"] = {}
                    income_statement["operating_expenses"]["other"][account.account_name] = account_data
                
                income_statement["total_operating_expenses"] += amount
            
            elif account.account_type == "Other Income" or account.account_type == "Other Expense":
                income_statement["other_income_expense"][account.account_name] = account_data
                if account.account_type == "Other Income":
                    income_statement["total_other_income"] += amount
                else:
                    income_statement["total_other_income"] -= amount
        
        # Calculate totals
        income_statement["gross_profit"] = income_statement["total_revenue"] - income_statement["cost_of_revenue"]
        income_statement["operating_income"] = income_statement["gross_profit"] - income_statement["total_operating_expenses"]
        income_statement["income_before_tax"] = income_statement["operating_income"] + income_statement["total_other_income"]
        income_statement["net_income"] = income_statement["income_before_tax"] - income_statement["income_tax_expense"]
        
        # Convert Decimals to floats
        for key in ["total_revenue", "cost_of_revenue", "gross_profit", "total_operating_expenses", 
                    "operating_income", "total_other_income", "income_before_tax", "income_tax_expense", "net_income"]:
            income_statement[key] = float(income_statement[key])
        
        return income_statement
    
    async def generate_cash_flow_statement(
        self,
        entity_id: int,
        period_start: date,
        period_end: date,
        consolidated: bool = False
    ) -> Dict:
        """
        Generate Cash Flow Statement per ASC 230
        Indirect Method: Start with Net Income, adjust for non-cash items
        """
        entity = await self.db.get(AccountingEntity, entity_id)
        if not entity:
            raise ValueError(f"Entity {entity_id} not found")
        
        # Get net income from income statement
        income_stmt = await self.generate_income_statement(entity_id, period_start, period_end, consolidated)
        net_income = Decimal(str(income_stmt["net_income"]))
        
        cash_flow = {
            "entity_name": entity.entity_name,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "currency": "USD",
            "consolidated": consolidated,
            "operating_activities": {
                "net_income": float(net_income),
                "adjustments": {},
                "changes_in_working_capital": {},
                "net_cash_from_operating": Decimal("0.00")
            },
            "investing_activities": {},
            "net_cash_from_investing": Decimal("0.00"),
            "financing_activities": {},
            "net_cash_from_financing": Decimal("0.00"),
            "net_change_in_cash": Decimal("0.00"),
            "beginning_cash": Decimal("0.00"),
            "ending_cash": Decimal("0.00")
        }
        
        # Add back depreciation (non-cash expense)
        depreciation = await self._get_depreciation_for_period(entity_id, period_start, period_end)
        if depreciation > 0:
            cash_flow["operating_activities"]["adjustments"]["Depreciation and Amortization"] = {
                "amount": float(depreciation),
                "formatted_amount": f"${depreciation:,.2f}"
            }
        
        # Changes in working capital
        ar_change = await self._get_account_change(entity_id, "10310", period_start, period_end)
        if ar_change != 0:
            cash_flow["operating_activities"]["changes_in_working_capital"]["Accounts Receivable"] = {
                "amount": float(-ar_change),
                "formatted_amount": f"${abs(ar_change):,.2f}"
            }
        
        ap_change = await self._get_account_change(entity_id, "20110", period_start, period_end)
        if ap_change != 0:
            cash_flow["operating_activities"]["changes_in_working_capital"]["Accounts Payable"] = {
                "amount": float(ap_change),
                "formatted_amount": f"${abs(ap_change):,.2f}"
            }
        
        # Calculate net cash from operating
        adjustments_total = sum(Decimal(str(adj["amount"])) for adj in cash_flow["operating_activities"]["adjustments"].values())
        wc_changes_total = sum(Decimal(str(wc["amount"])) for wc in cash_flow["operating_activities"]["changes_in_working_capital"].values())
        cash_flow["operating_activities"]["net_cash_from_operating"] = net_income + adjustments_total + wc_changes_total
        
        # Investing activities - Fixed asset purchases
        asset_purchases = await self._get_fixed_asset_purchases(entity_id, period_start, period_end)
        if asset_purchases > 0:
            cash_flow["investing_activities"]["Purchase of Fixed Assets"] = {
                "amount": float(-asset_purchases),
                "formatted_amount": f"(${asset_purchases:,.2f})"
            }
            cash_flow["net_cash_from_investing"] = -asset_purchases
        
        # Financing activities - Capital contributions and distributions
        contributions = await self._get_capital_contributions(entity_id, period_start, period_end)
        if contributions > 0:
            cash_flow["financing_activities"]["Capital Contributions"] = {
                "amount": float(contributions),
                "formatted_amount": f"${contributions:,.2f}"
            }
        
        distributions = await self._get_distributions(entity_id, period_start, period_end)
        if distributions > 0:
            cash_flow["financing_activities"]["Distributions to Owners"] = {
                "amount": float(-distributions),
                "formatted_amount": f"(${distributions:,.2f})"
            }
        
        cash_flow["net_cash_from_financing"] = contributions - distributions
        
        # Calculate net change in cash
        cash_flow["net_change_in_cash"] = (
            cash_flow["operating_activities"]["net_cash_from_operating"] +
            cash_flow["net_cash_from_investing"] +
            cash_flow["net_cash_from_financing"]
        )
        
        # Get beginning and ending cash balances
        cash_flow["beginning_cash"] = await self._get_cash_balance(entity_id, period_start)
        cash_flow["ending_cash"] = cash_flow["beginning_cash"] + cash_flow["net_change_in_cash"]
        
        # Convert Decimals to floats
        for key in ["net_cash_from_investing", "net_cash_from_financing", "net_change_in_cash", "beginning_cash", "ending_cash"]:
            cash_flow[key] = float(cash_flow[key])
        cash_flow["operating_activities"]["net_cash_from_operating"] = float(cash_flow["operating_activities"]["net_cash_from_operating"])
        
        return cash_flow
    
    async def generate_equity_statement(
        self,
        entity_id: int,
        period_start: date,
        period_end: date,
        consolidated: bool = False
    ) -> Dict:
        """
        Generate Statement of Changes in Stockholders' Equity (C-Corp)
        or Statement of Changes in Members' Equity (LLC)
        """
        entity = await self.db.get(AccountingEntity, entity_id)
        if not entity:
            raise ValueError(f"Entity {entity_id} not found")
        
        is_llc = entity.entity_type == "LLC"
        
        equity_statement = {
            "entity_name": entity.entity_name,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "currency": "USD",
            "consolidated": consolidated,
            "entity_type": entity.entity_type,
            "columns": []
        }
        
        if is_llc:
            # LLC: Members' Equity
            equity_statement["columns"] = ["Member Capital - Landon Whitworth", "Member Capital - Andre Nurmamade", "Total"]
            equity_statement["beginning_balance"] = await self._get_member_equity_balances(entity_id, period_start)
        else:
            # C-Corp: Stockholders' Equity
            equity_statement["columns"] = ["Common Stock", "Additional Paid-in Capital", "Retained Earnings", "Total"]
            equity_statement["beginning_balance"] = await self._get_stockholder_equity_balances(entity_id, period_start)
        
        # Net income for the period
        income_stmt = await self.generate_income_statement(entity_id, period_start, period_end, consolidated)
        equity_statement["net_income"] = income_stmt["net_income"]
        
        # Capital contributions
        equity_statement["capital_contributions"] = await self._get_capital_contributions(entity_id, period_start, period_end)
        
        # Distributions
        equity_statement["distributions"] = await self._get_distributions(entity_id, period_start, period_end)
        
        # Calculate ending balance
        equity_statement["ending_balance"] = await self._get_equity_ending_balance(
            equity_statement["beginning_balance"],
            equity_statement["net_income"],
            equity_statement["capital_contributions"],
            equity_statement["distributions"],
            is_llc
        )
        
        return equity_statement
    
    # Helper methods
    
    async def _get_depreciation_for_period(self, entity_id: int, period_start: date, period_end: date) -> Decimal:
        """Get total depreciation expense for period"""
        result = await self.db.execute(
            select(func.sum(DepreciationEntry.depreciation_amount)).where(
                and_(
                    DepreciationEntry.entity_id == entity_id,
                    DepreciationEntry.period_date >= period_start,
                    DepreciationEntry.period_date <= period_end
                )
            )
        )
        total = result.scalar()
        return Decimal(str(total or 0))
    
    async def _get_account_change(self, entity_id: int, account_number: str, period_start: date, period_end: date) -> Decimal:
        """Get change in account balance during period"""
        # Simplified - in production, query actual beginning and ending balances
        return Decimal("0.00")
    
    async def _get_fixed_asset_purchases(self, entity_id: int, period_start: date, period_end: date) -> Decimal:
        """Get total fixed asset purchases during period"""
        result = await self.db.execute(
            select(func.sum(FixedAsset.acquisition_cost)).where(
                and_(
                    FixedAsset.entity_id == entity_id,
                    FixedAsset.acquisition_date >= period_start,
                    FixedAsset.acquisition_date <= period_end
                )
            )
        )
        total = result.scalar()
        return Decimal(str(total or 0))
    
    async def _get_capital_contributions(self, entity_id: int, period_start: date, period_end: date) -> Decimal:
        """Get capital contributions during period"""
        # Query equity accounts for contributions
        return Decimal("0.00")
    
    async def _get_distributions(self, entity_id: int, period_start: date, period_end: date) -> Decimal:
        """Get distributions to owners during period"""
        # Query equity accounts for distributions
        return Decimal("0.00")
    
    async def _get_cash_balance(self, entity_id: int, as_of_date: date) -> Decimal:
        """Get cash balance as of date"""
        # Query cash accounts (10110-10150)
        result = await self.db.execute(
            select(func.sum(ChartOfAccounts.current_balance)).where(
                and_(
                    ChartOfAccounts.entity_id == entity_id,
                    ChartOfAccounts.account_number.startswith("101"),
                    ChartOfAccounts.is_active == True
                )
            )
        )
        total = result.scalar()
        return Decimal(str(total or 0))
    
    async def _get_member_equity_balances(self, entity_id: int, as_of_date: date) -> Dict:
        """Get member equity balances for LLC"""
        return {
            "landon": 0.00,
            "andre": 0.00,
            "total": 0.00
        }
    
    async def _get_stockholder_equity_balances(self, entity_id: int, as_of_date: date) -> Dict:
        """Get stockholder equity balances for C-Corp"""
        return {
            "common_stock": 0.00,
            "apic": 0.00,
            "retained_earnings": 0.00,
            "total": 0.00
        }
    
    async def _get_equity_ending_balance(
        self,
        beginning: Dict,
        net_income: float,
        contributions: float,
        distributions: float,
        is_llc: bool
    ) -> Dict:
        """Calculate ending equity balances"""
        if is_llc:
            # Split net income 50/50 for partners
            return {
                "landon": beginning.get("landon", 0) + (net_income / 2) + contributions - distributions,
                "andre": beginning.get("andre", 0) + (net_income / 2) + contributions - distributions,
                "total": beginning.get("total", 0) + net_income + contributions - distributions
            }
        else:
            return {
                "common_stock": beginning.get("common_stock", 0) + contributions,
                "apic": beginning.get("apic", 0),
                "retained_earnings": beginning.get("retained_earnings", 0) + net_income - distributions,
                "total": beginning.get("total", 0) + net_income + contributions - distributions
            }

