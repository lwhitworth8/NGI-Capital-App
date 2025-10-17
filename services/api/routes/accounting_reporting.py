"""
Financial Reporting Routes
US GAAP Compliant Financial Statements (ASC 210, 220, 230, 810)
"""

from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date, datetime
from typing import Optional
import logging

from ..database_async import get_async_db
from services.api.models_accounting import AccountingEntity
from services.api.services.financial_statements_generator import FinancialStatementsGenerator
from pydantic import BaseModel

router = APIRouter(prefix="/api/accounting/reporting", tags=["Financial Reporting"])
logger = logging.getLogger(__name__)


class StatementRequest(BaseModel):
    """Request model for financial statements"""
    entity_id: int
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    as_of_date: Optional[str] = None
    consolidated: bool = False


@router.get("/balance-sheet")
async def get_balance_sheet(
    entity_id: int = Query(...),
    as_of_date: Optional[str] = Query(None),
    consolidated: bool = Query(False),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Generate Balance Sheet (ASC 210)
    
    - **entity_id**: Entity ID
    - **as_of_date**: Balance sheet date (defaults to today)
    - **consolidated**: Include subsidiaries
    """
    try:
        if not as_of_date:
            as_of = date.today()
        else:
            as_of = datetime.strptime(as_of_date, "%Y-%m-%d").date()
        
        generator = FinancialStatementsGenerator(db)
        balance_sheet = await generator.generate_balance_sheet(entity_id, as_of, consolidated)
        
        return {
            "success": True,
            "statement_type": "Balance Sheet",
            "data": balance_sheet
        }
    
    except Exception as e:
        logger.error(f"Error generating balance sheet: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/income-statement")
async def get_income_statement(
    entity_id: int = Query(...),
    period_start: str = Query(...),
    period_end: str = Query(...),
    consolidated: bool = Query(False),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Generate Income Statement (ASC 220 - Multi-step format)
    
    - **entity_id**: Entity ID
    - **period_start**: Start date (YYYY-MM-DD)
    - **period_end**: End date (YYYY-MM-DD)
    - **consolidated**: Include subsidiaries
    """
    try:
        start_date = datetime.strptime(period_start, "%Y-%m-%d").date()
        end_date = datetime.strptime(period_end, "%Y-%m-%d").date()
        
        generator = FinancialStatementsGenerator(db)
        income_statement = await generator.generate_income_statement(
            entity_id, start_date, end_date, consolidated
        )
        
        return {
            "success": True,
            "statement_type": "Income Statement",
            "data": income_statement
        }
    
    except Exception as e:
        logger.error(f"Error generating income statement: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cash-flow")
async def get_cash_flow_statement(
    entity_id: int = Query(...),
    period_start: str = Query(...),
    period_end: str = Query(...),
    consolidated: bool = Query(False),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Generate Cash Flow Statement (ASC 230 - Indirect Method)
    
    - **entity_id**: Entity ID
    - **period_start**: Start date (YYYY-MM-DD)
    - **period_end**: End date (YYYY-MM-DD)
    - **consolidated**: Include subsidiaries
    """
    try:
        start_date = datetime.strptime(period_start, "%Y-%m-%d").date()
        end_date = datetime.strptime(period_end, "%Y-%m-%d").date()
        
        generator = FinancialStatementsGenerator(db)
        cash_flow = await generator.generate_cash_flow_statement(
            entity_id, start_date, end_date, consolidated
        )
        
        return {
            "success": True,
            "statement_type": "Cash Flow Statement",
            "data": cash_flow
        }
    
    except Exception as e:
        logger.error(f"Error generating cash flow statement: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/equity-statement")
async def get_equity_statement(
    entity_id: int = Query(...),
    period_start: str = Query(...),
    period_end: str = Query(...),
    consolidated: bool = Query(False),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Generate Statement of Stockholders'/Members' Equity
    
    - **entity_id**: Entity ID
    - **period_start**: Start date (YYYY-MM-DD)
    - **period_end**: End date (YYYY-MM-DD)
    - **consolidated**: Include subsidiaries
    """
    try:
        start_date = datetime.strptime(period_start, "%Y-%m-%d").date()
        end_date = datetime.strptime(period_end, "%Y-%m-%d").date()
        
        generator = FinancialStatementsGenerator(db)
        equity_statement = await generator.generate_equity_statement(
            entity_id, start_date, end_date, consolidated
        )
        
        return {
            "success": True,
            "statement_type": "Statement of Changes in Equity",
            "data": equity_statement
        }
    
    except Exception as e:
        logger.error(f"Error generating equity statement: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/full-package")
async def get_full_financial_package(
    entity_id: int = Query(...),
    period_start: str = Query(...),
    period_end: str = Query(...),
    as_of_date: Optional[str] = Query(None),
    consolidated: bool = Query(False),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Generate complete financial statement package
    
    Includes:
    - Balance Sheet
    - Income Statement
    - Cash Flow Statement
    - Statement of Changes in Equity
    
    Returns all four statements in a single response
    """
    try:
        start_date = datetime.strptime(period_start, "%Y-%m-%d").date()
        end_date = datetime.strptime(period_end, "%Y-%m-%d").date()
        
        if not as_of_date:
            as_of = end_date
        else:
            as_of = datetime.strptime(as_of_date, "%Y-%m-%d").date()
        
        generator = FinancialStatementsGenerator(db)
        
        # Generate all statements
        balance_sheet = await generator.generate_balance_sheet(entity_id, as_of, consolidated)
        income_statement = await generator.generate_income_statement(entity_id, start_date, end_date, consolidated)
        cash_flow = await generator.generate_cash_flow_statement(entity_id, start_date, end_date, consolidated)
        equity_statement = await generator.generate_equity_statement(entity_id, start_date, end_date, consolidated)
        
        return {
            "success": True,
            "package_type": "Full Financial Statement Package",
            "entity_id": entity_id,
            "period": {
                "start": period_start,
                "end": period_end,
                "as_of": as_of.isoformat()
            },
            "consolidated": consolidated,
            "statements": {
                "balance_sheet": balance_sheet,
                "income_statement": income_statement,
                "cash_flow": cash_flow,
                "equity_statement": equity_statement
            }
        }
    
    except Exception as e:
        logger.error(f"Error generating full financial package: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trial-balance")
async def get_trial_balance(
    entity_id: int = Query(...),
    as_of_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Generate Trial Balance
    
    Shows all accounts with debit/credit balances
    Verifies total debits = total credits
    """
    try:
        if not as_of_date:
            as_of = date.today()
        else:
            as_of = datetime.strptime(as_of_date, "%Y-%m-%d").date()
        
        from services.api.models_accounting import ChartOfAccounts
        from sqlalchemy import and_
        from decimal import Decimal
        
        # Query all active accounts
        accounts_query = await db.execute(
            select(ChartOfAccounts).where(
                and_(
                    ChartOfAccounts.entity_id == entity_id,
                    ChartOfAccounts.is_active == True
                )
            ).order_by(ChartOfAccounts.account_number)
        )
        accounts = accounts_query.scalars().all()
        
        trial_balance = {
            "entity_id": entity_id,
            "as_of_date": as_of.isoformat(),
            "accounts": [],
            "total_debits": Decimal("0.00"),
            "total_credits": Decimal("0.00"),
            "is_balanced": False
        }
        
        for account in accounts:
            balance = Decimal(str(account.current_balance or 0))
            if balance == 0:
                continue
            
            # Determine if account has normal debit or credit balance
            is_debit_account = account.normal_balance == "Debit"
            
            account_data = {
                "account_number": account.account_number,
                "account_name": account.account_name,
                "account_type": account.account_type,
                "normal_balance": account.normal_balance,
                "debit": float(balance) if (is_debit_account and balance > 0) or (not is_debit_account and balance < 0) else 0.00,
                "credit": float(abs(balance)) if (not is_debit_account and balance > 0) or (is_debit_account and balance < 0) else 0.00
            }
            
            trial_balance["accounts"].append(account_data)
            trial_balance["total_debits"] += Decimal(str(account_data["debit"]))
            trial_balance["total_credits"] += Decimal(str(account_data["credit"]))
        
        # Check if balanced
        trial_balance["total_debits"] = float(trial_balance["total_debits"])
        trial_balance["total_credits"] = float(trial_balance["total_credits"])
        trial_balance["is_balanced"] = abs(trial_balance["total_debits"] - trial_balance["total_credits"]) < 0.01
        trial_balance["difference"] = trial_balance["total_debits"] - trial_balance["total_credits"]
        
        return {
            "success": True,
            "data": trial_balance
        }
    
    except Exception as e:
        logger.error(f"Error generating trial balance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/skeleton-preview")
async def get_skeleton_preview(
    entity_id: int = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get skeleton preview of current financial position
    Shows current balances before period close
    """
    try:
        today = date.today()
        year_start = date(today.year, 1, 1)
        
        generator = FinancialStatementsGenerator(db)
        
        # Generate preview statements
        balance_sheet = await generator.generate_balance_sheet(entity_id, today, False)
        income_statement = await generator.generate_income_statement(entity_id, year_start, today, False)
        
        return {
            "success": True,
            "preview_type": "Skeleton Preview",
            "note": "These are preliminary statements based on current account balances. Final statements available after period close.",
            "as_of": today.isoformat(),
            "statements": {
                "balance_sheet": balance_sheet,
                "income_statement": income_statement
            }
        }
    
    except Exception as e:
        logger.error(f"Error generating skeleton preview: {e}")
        raise HTTPException(status_code=500, detail=str(e))

