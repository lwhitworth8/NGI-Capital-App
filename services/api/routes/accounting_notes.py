"""
NGI Capital - Financial Statement Notes Management API
Handles notes to financial statements for US GAAP compliance

Author: NGI Capital Development Team
Date: October 6, 2025
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from pydantic import BaseModel

from ..database_async import get_async_db
from ..models_accounting import AccountingEntity

router = APIRouter(
    prefix="/api/accounting/notes",
    tags=["Accounting - Financial Statement Notes"]
)


class NoteItem(BaseModel):
    account_number: Optional[str] = None
    account_name: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None


class FinancialNote(BaseModel):
    id: Optional[int] = None
    entity_id: int
    statement_type: str  # 'balance_sheet', 'income_statement', 'cash_flow', 'equity', 'comprehensive_income'
    note_number: str
    note_title: str
    note_content: str
    is_required: bool = False
    is_custom: bool = True
    note_items: List[NoteItem] = []


class NoteResponse(BaseModel):
    success: bool
    message: str
    note: Optional[FinancialNote] = None


@router.get("/{entity_id}")
async def get_entity_notes(
    entity_id: int,
    statement_type: Optional[str] = Query(None, description="Filter by statement type"),
    db: AsyncSession = Depends(get_async_db)
):
    """Get all financial statement notes for an entity"""
    
    # Verify entity exists
    entity = await db.get(AccountingEntity, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Build query
    query = text("""
        SELECT fn.*, 
               GROUP_CONCAT(fni.account_number || '|' || fni.account_name || '|' || 
                           COALESCE(fni.amount, 0) || '|' || COALESCE(fni.description, ''), '|||') as items
        FROM financial_statement_notes fn
        LEFT JOIN financial_statement_note_items fni ON fn.id = fni.note_id
        WHERE fn.entity_id = :entity_id
    """)
    
    params = {"entity_id": entity_id}
    if statement_type:
        query = text(str(query) + " AND fn.statement_type = :statement_type")
        params["statement_type"] = statement_type
    
    query = text(str(query) + " GROUP BY fn.id ORDER BY fn.statement_type, CAST(fn.note_number AS INTEGER)")
    
    result = await db.execute(query, params)
    rows = result.fetchall()
    
    notes = []
    for row in rows:
        note_items = []
        if row.items:
            for item_str in row.items.split('|||'):
                if item_str.strip():
                    parts = item_str.split('|')
                    if len(parts) >= 4:
                        note_items.append(NoteItem(
                            account_number=parts[0] if parts[0] else None,
                            account_name=parts[1] if parts[1] else None,
                            amount=float(parts[2]) if parts[2] and parts[2] != '0' else None,
                            description=parts[3] if parts[3] else None
                        ))
        
        notes.append(FinancialNote(
            id=row.id,
            entity_id=row.entity_id,
            statement_type=row.statement_type,
            note_number=row.note_number,
            note_title=row.note_title,
            note_content=row.note_content,
            is_required=bool(row.is_required),
            is_custom=bool(row.is_custom),
            note_items=note_items
        ))
    
    return {"notes": notes}


@router.post("/", response_model=NoteResponse)
async def create_note(
    note: FinancialNote,
    db: AsyncSession = Depends(get_async_db)
):
    """Create a new financial statement note"""
    
    # Verify entity exists
    entity = await db.get(AccountingEntity, note.entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Insert note
    result = await db.execute(text("""
        INSERT INTO financial_statement_notes 
        (entity_id, statement_type, note_number, note_title, note_content, is_required, is_custom)
        VALUES (:entity_id, :statement_type, :note_number, :note_title, :note_content, :is_required, :is_custom)
    """), {
        "entity_id": note.entity_id,
        "statement_type": note.statement_type,
        "note_number": note.note_number,
        "note_title": note.note_title,
        "note_content": note.note_content,
        "is_required": note.is_required,
        "is_custom": note.is_custom
    })
    
    note_id = result.lastrowid
    
    # Insert note items
    for item in note.note_items:
        await db.execute(text("""
            INSERT INTO financial_statement_note_items 
            (note_id, account_number, account_name, amount, description)
            VALUES (:note_id, :account_number, :account_name, :amount, :description)
        """), {
            "note_id": note_id,
            "account_number": item.account_number,
            "account_name": item.account_name,
            "amount": item.amount,
            "description": item.description
        })
    
    await db.commit()
    
    return NoteResponse(
        success=True,
        message="Note created successfully",
        note=note
    )


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    note: FinancialNote,
    db: AsyncSession = Depends(get_async_db)
):
    """Update an existing financial statement note"""
    
    # Check if note exists
    result = await db.execute(text("""
        SELECT id FROM financial_statement_notes WHERE id = :note_id
    """), {"note_id": note_id})
    
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Update note
    await db.execute(text("""
        UPDATE financial_statement_notes 
        SET statement_type = :statement_type, note_number = :note_number, 
            note_title = :note_title, note_content = :note_content,
            is_required = :is_required, is_custom = :is_custom
        WHERE id = :note_id
    """), {
        "note_id": note_id,
        "statement_type": note.statement_type,
        "note_number": note.note_number,
        "note_title": note.note_title,
        "note_content": note.note_content,
        "is_required": note.is_required,
        "is_custom": note.is_custom
    })
    
    # Delete existing items and insert new ones
    await db.execute(text("""
        DELETE FROM financial_statement_note_items WHERE note_id = :note_id
    """), {"note_id": note_id})
    
    for item in note.note_items:
        await db.execute(text("""
            INSERT INTO financial_statement_note_items 
            (note_id, account_number, account_name, amount, description)
            VALUES (:note_id, :account_number, :account_name, :amount, :description)
        """), {
            "note_id": note_id,
            "account_number": item.account_number,
            "account_name": item.account_name,
            "amount": item.amount,
            "description": item.description
        })
    
    await db.commit()
    
    return NoteResponse(
        success=True,
        message="Note updated successfully",
        note=note
    )


@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Delete a financial statement note"""
    
    # Check if note exists
    result = await db.execute(text("""
        SELECT id FROM financial_statement_notes WHERE id = :note_id
    """), {"note_id": note_id})
    
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Delete note items first
    await db.execute(text("""
        DELETE FROM financial_statement_note_items WHERE note_id = :note_id
    """), {"note_id": note_id})
    
    # Delete note
    await db.execute(text("""
        DELETE FROM financial_statement_notes WHERE id = :note_id
    """), {"note_id": note_id})
    
    await db.commit()
    
    return {"success": True, "message": "Note deleted successfully"}


@router.get("/templates/required")
async def get_required_notes_templates():
    """Get templates for required US GAAP notes"""
    
    return {
        "templates": [
            {
                "statement_type": "balance_sheet",
                "note_number": "1",
                "note_title": "Summary of Significant Accounting Policies",
                "note_content": "The Company prepares its financial statements in accordance with accounting principles generally accepted in the United States of America (U.S. GAAP). The preparation of financial statements in conformity with U.S. GAAP requires management to make estimates and assumptions that affect the reported amounts of assets and liabilities and disclosure of contingent assets and liabilities at the date of the financial statements and the reported amounts of revenues and expenses during the reporting period.",
                "is_required": True
            },
            {
                "statement_type": "balance_sheet", 
                "note_number": "2",
                "note_title": "Cash and Cash Equivalents",
                "note_content": "Cash and cash equivalents consist of cash on hand and in banks and short-term investments with original maturities of three months or less. The Company maintains cash balances at various financial institutions that may exceed federally insured limits.",
                "is_required": True
            },
            {
                "statement_type": "balance_sheet",
                "note_number": "3", 
                "note_title": "Property and Equipment",
                "note_content": "Property and equipment are stated at cost less accumulated depreciation. Depreciation is computed using the straight-line method over the estimated useful lives of the assets. The estimated useful lives are as follows:",
                "is_required": True
            },
            {
                "statement_type": "income_statement",
                "note_number": "4",
                "note_title": "Revenue Recognition",
                "note_content": "The Company recognizes revenue in accordance with ASC 606, Revenue from Contracts with Customers. Revenue is recognized when control of goods or services is transferred to the customer in an amount that reflects the consideration the Company expects to be entitled to receive in exchange for those goods or services.",
                "is_required": True
            },
            {
                "statement_type": "income_statement",
                "note_number": "5",
                "note_title": "Income Taxes",
                "note_content": "The Company accounts for income taxes under the asset and liability method. Deferred tax assets and liabilities are recognized for the future tax consequences attributable to differences between the financial statement carrying amounts of existing assets and liabilities and their respective tax bases.",
                "is_required": True
            }
        ]
    }




