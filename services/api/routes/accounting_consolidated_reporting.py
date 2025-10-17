"""
Consolidated Reporting API Routes for NGI Capital Accounting Module
Implements Epic 8: Consolidated Reporting
Multi-entity financial consolidation with intercompany eliminations
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from ..database_async import get_async_db
from ..models_accounting import AccountingEntity, ChartOfAccounts, JournalEntry, JournalEntryLine
from ..models_accounting_part3 import IntercompanyTransaction, ConsolidatedFinancialStatement

router = APIRouter(prefix="/accounting/consolidated-reporting", tags=["accounting-consolidated"])


@router.get("/entities-hierarchy")
async def get_entities_hierarchy(
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get organizational hierarchy of all entities
    Shows parent-subsidiary relationships for consolidation
    """
    # Get all entities
    entities_stmt = select(AccountingEntity).where(AccountingEntity.is_active == True)
    result = await db.execute(entities_stmt)
    entities = result.scalars().all()
    
    # Build hierarchy
    entities_by_id = {e.id: e for e in entities}
    hierarchy = []
    
    for entity in entities:
        if entity.parent_entity_id is None:
            # This is a parent entity
            children = [e for e in entities if e.parent_entity_id == entity.id]
            hierarchy.append({
                "id": entity.id,
                "name": entity.entity_name,
                "type": entity.entity_type,
                "ein": entity.ein,
                "is_parent": True,
                "children": [
                    {
                        "id": child.id,
                        "name": child.entity_name,
                        "type": child.entity_type,
                        "ein": child.ein
                    }
                    for child in children
                ]
            })
    
    return {
        "hierarchy": hierarchy,
        "total_entities": len(entities),
        "parent_entities": len(hierarchy),
        "subsidiary_entities": sum(len(h["children"]) for h in hierarchy)
    }


@router.post("/generate-consolidated-financials")
async def generate_consolidated_financials(
    period_start: str,
    period_end: str,
    parent_entity_id: int,
    include_subsidiaries: List[int],
    db: AsyncSession = Depends(get_async_db)
):
    """
    Generate consolidated financial statements
    Combines parent + all subsidiaries with intercompany eliminations
    """
    period_start_date = datetime.fromisoformat(period_start)
    period_end_date = datetime.fromisoformat(period_end)
    
    # Get parent entity
    parent_stmt = select(AccountingEntity).where(AccountingEntity.id == parent_entity_id)
    parent_result = await db.execute(parent_stmt)
    parent_entity = parent_result.scalar_one_or_none()
    
    if not parent_entity:
        raise HTTPException(status_code=404, detail="Parent entity not found")
    
    # Get all entities to consolidate
    all_entity_ids = [parent_entity_id] + include_subsidiaries
    
    # Build consolidated trial balance
    consolidated_accounts = {}
    
    for entity_id in all_entity_ids:
        # Get all journal entries for this entity in the period
        entries_stmt = select(JournalEntry).where(
            and_(
                JournalEntry.entity_id == entity_id,
                JournalEntry.entry_date >= period_start_date,
                JournalEntry.entry_date <= period_end_date,
                JournalEntry.status == "Posted"
            )
        )
        entries_result = await db.execute(entries_stmt)
        entries = entries_result.scalars().all()
        
        # Aggregate by account
        for entry in entries:
            lines_stmt = select(JournalEntryLine).where(JournalEntryLine.journal_entry_id == entry.id)
            lines_result = await db.execute(lines_stmt)
            lines = lines_result.scalars().all()
            
            for line in lines:
                account_stmt = select(ChartOfAccounts).where(ChartOfAccounts.id == line.account_id)
                account_result = await db.execute(account_stmt)
                account = account_result.scalar_one_or_none()
                
                if account:
                    account_key = f"{account.account_number}_{account.account_name}"
                    
                    if account_key not in consolidated_accounts:
                        consolidated_accounts[account_key] = {
                            "account_number": account.account_number,
                            "account_name": account.account_name,
                            "account_type": account.account_type,
                            "debit": Decimal("0.00"),
                            "credit": Decimal("0.00")
                        }
                    
                    if line.debit_amount:
                        consolidated_accounts[account_key]["debit"] += line.debit_amount
                    if line.credit_amount:
                        consolidated_accounts[account_key]["credit"] += line.credit_amount
    
    # Get intercompany transactions for elimination
    ic_stmt = select(IntercompanyTransaction).where(
        and_(
            IntercompanyTransaction.transaction_date >= period_start_date,
            IntercompanyTransaction.transaction_date <= period_end_date,
            or_(
                IntercompanyTransaction.source_entity_id.in_(all_entity_ids),
                IntercompanyTransaction.target_entity_id.in_(all_entity_ids)
            )
        )
    )
    ic_result = await db.execute(ic_stmt)
    ic_transactions = ic_result.scalars().all()
    
    total_eliminations = sum(ic.transaction_amount for ic in ic_transactions)
    
    # Create consolidated financial statement record
    consolidated_statement = ConsolidatedFinancialStatement(
        parent_entity_id=parent_entity_id,
        period_start=period_start_date,
        period_end=period_end_date,
        included_entities=all_entity_ids,
        consolidation_method="Full Consolidation",
        intercompany_eliminations=total_eliminations,
        consolidated_data={
            "accounts": {k: {
                "account_number": v["account_number"],
                "account_name": v["account_name"],
                "account_type": v["account_type"],
                "debit": float(v["debit"]),
                "credit": float(v["credit"]),
                "balance": float(v["debit"] - v["credit"])
            } for k, v in consolidated_accounts.items()},
            "eliminations": {
                "intercompany_revenue": float(sum(ic.transaction_amount for ic in ic_transactions if ic.transaction_type == "Revenue")),
                "intercompany_expenses": float(sum(ic.transaction_amount for ic in ic_transactions if ic.transaction_type == "Expense")),
                "intercompany_receivables": float(sum(ic.transaction_amount for ic in ic_transactions if ic.transaction_type == "Receivable")),
                "intercompany_payables": float(sum(ic.transaction_amount for ic in ic_transactions if ic.transaction_type == "Payable"))
            }
        },
        generated_by=current_user["email"],
        generated_at=datetime.now()
    )
    db.add(consolidated_statement)
    await db.commit()
    await db.refresh(consolidated_statement)
    
    # Build financial statements from consolidated data
    balance_sheet = _build_balance_sheet(consolidated_accounts)
    income_statement = _build_income_statement(consolidated_accounts)
    
    return {
        "success": True,
        "consolidated_statement_id": consolidated_statement.id,
        "period": {
            "start": period_start,
            "end": period_end
        },
        "entities_included": all_entity_ids,
        "intercompany_eliminations": float(total_eliminations),
        "balance_sheet": balance_sheet,
        "income_statement": income_statement,
        "summary": {
            "total_assets": balance_sheet["total_assets"],
            "total_liabilities": balance_sheet["total_liabilities"],
            "total_equity": balance_sheet["total_equity"],
            "net_income": income_statement["net_income"]
        }
    }


@router.get("/intercompany-transactions")
async def get_intercompany_transactions(
    entity_id: Optional[int] = None,
    transaction_type: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all intercompany transactions for elimination tracking
    """
    query = select(IntercompanyTransaction)
    
    if entity_id:
        query = query.where(
            or_(
                IntercompanyTransaction.source_entity_id == entity_id,
                IntercompanyTransaction.target_entity_id == entity_id
            )
        )
    
    if transaction_type:
        query = query.where(IntercompanyTransaction.transaction_type == transaction_type)
    
    query = query.order_by(IntercompanyTransaction.transaction_date.desc())
    
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    return {
        "intercompany_transactions": [
            {
                "id": ic.id,
                "transaction_date": ic.transaction_date.isoformat(),
                "source_entity_id": ic.source_entity_id,
                "target_entity_id": ic.target_entity_id,
                "transaction_type": ic.transaction_type,
                "transaction_amount": float(ic.transaction_amount),
                "description": ic.transaction_description,
                "is_eliminated": ic.is_eliminated,
                "elimination_entry_id": ic.elimination_entry_id
            }
            for ic in transactions
        ],
        "total_transactions": len(transactions),
        "total_amount": float(sum(ic.transaction_amount for ic in transactions))
    }


@router.get("/consolidated-history")
async def get_consolidated_history(
    parent_entity_id: Optional[int] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get history of all consolidated financial statements
    """
    query = select(ConsolidatedFinancialStatement)
    
    if parent_entity_id:
        query = query.where(ConsolidatedFinancialStatement.parent_entity_id == parent_entity_id)
    
    query = query.order_by(ConsolidatedFinancialStatement.period_end.desc())
    
    result = await db.execute(query)
    statements = result.scalars().all()
    
    return {
        "consolidated_statements": [
            {
                "id": stmt.id,
                "parent_entity_id": stmt.parent_entity_id,
                "period_start": stmt.period_start.isoformat(),
                "period_end": stmt.period_end.isoformat(),
                "included_entities": stmt.included_entities,
                "consolidation_method": stmt.consolidation_method,
                "intercompany_eliminations": float(stmt.intercompany_eliminations) if stmt.intercompany_eliminations else 0,
                "generated_by": stmt.generated_by,
                "generated_at": stmt.generated_at.isoformat()
            }
            for stmt in statements
        ],
        "total_statements": len(statements)
    }


def _build_balance_sheet(accounts_dict):
    """Helper to build balance sheet from account balances"""
    assets = Decimal("0.00")
    liabilities = Decimal("0.00")
    equity = Decimal("0.00")
    
    for account_data in accounts_dict.values():
        balance = account_data["debit"] - account_data["credit"]
        account_type = account_data["account_type"]
        
        if account_type in ["Assets", "Current Assets", "Non-Current Assets"]:
            assets += balance
        elif account_type in ["Liabilities", "Current Liabilities", "Long-term Liabilities"]:
            liabilities += balance
        elif account_type in ["Equity", "Shareholders' Equity"]:
            equity += balance
    
    return {
        "total_assets": float(assets),
        "total_liabilities": float(liabilities),
        "total_equity": float(equity),
        "balance_check": float(assets - liabilities - equity)
    }


def _build_income_statement(accounts_dict):
    """Helper to build income statement from account balances"""
    revenue = Decimal("0.00")
    expenses = Decimal("0.00")
    
    for account_data in accounts_dict.values():
        balance = account_data["credit"] - account_data["debit"]  # Revenue is credit normal
        account_type = account_data["account_type"]
        
        if account_type == "Revenue":
            revenue += balance
        elif account_type in ["Operating Expenses", "Cost of Revenue", "Other Expenses"]:
            expenses += abs(balance)
    
    net_income = revenue - expenses
    
    return {
        "total_revenue": float(revenue),
        "total_expenses": float(expenses),
        "net_income": float(net_income),
        "profit_margin": float((net_income / revenue * 100) if revenue > 0 else 0)
    }

