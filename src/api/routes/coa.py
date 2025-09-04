"""
COA Templates and Apply Endpoints
Provides a US GAAP 5-digit startup template and applies it idempotently per entity.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text
from typing import Dict, Any, List
from src.api.database import get_db

router = APIRouter(prefix="/api/coa", tags=["coa"])


US_GAAP_STARTUP: List[Dict[str, Any]] = [
    # Assets 1xxxx
    {"code":"11100","name":"Cash - Operating","type":"asset","normal":"debit","group":"Assets","subgroup":"Cash and Cash Equivalents"},
    {"code":"11300","name":"Accounts Receivable","type":"asset","normal":"debit","group":"Assets","subgroup":"Accounts Receivable"},
    {"code":"11500","name":"Prepaid Expenses","type":"asset","normal":"debit","group":"Assets","subgroup":"Prepaid Expenses"},
    {"code":"15000","name":"Fixed Assets","type":"asset","normal":"debit","group":"Assets","subgroup":"Property and Equipment"},
    {"code":"15900","name":"Accumulated Depreciation","type":"asset","normal":"credit","group":"Assets","subgroup":"Property and Equipment"},
    # Liabilities 2xxxx
    {"code":"21100","name":"Accounts Payable","type":"liability","normal":"credit","group":"Liabilities","subgroup":"Current Liabilities"},
    {"code":"21300","name":"Accrued Expenses","type":"liability","normal":"credit","group":"Liabilities","subgroup":"Current Liabilities"},
    {"code":"21500","name":"Deferred Revenue","type":"liability","normal":"credit","group":"Liabilities","subgroup":"Current Liabilities"},
    # Equity 3xxxx
    {"code":"31000","name":"Common Stock/Units","type":"equity","normal":"credit","group":"Equity","subgroup":"Stockholders' Equity"},
    {"code":"31100","name":"Additional Paid-In Capital","type":"equity","normal":"credit","group":"Equity","subgroup":"Stockholders' Equity"},
    {"code":"33000","name":"Retained Earnings","type":"equity","normal":"credit","group":"Equity","subgroup":"Retained Earnings"},
    # Revenue 4xxxx
    {"code":"41000","name":"Revenue","type":"revenue","normal":"credit","group":"Revenue","subgroup":"Operating Revenue"},
    {"code":"42000","name":"Other Income","type":"revenue","normal":"credit","group":"Revenue","subgroup":"Other Income"},
    # Expenses 5xxxx
    {"code":"51000","name":"Cost of Revenue","type":"expense","normal":"debit","group":"Expenses","subgroup":"Cost of Revenue"},
    {"code":"52100","name":"Payroll & Benefits","type":"expense","normal":"debit","group":"Expenses","subgroup":"Operating Expenses"},
    {"code":"52200","name":"Cloud & Hosting","type":"expense","normal":"debit","group":"Expenses","subgroup":"Operating Expenses"},
    {"code":"52300","name":"Software & Tools","type":"expense","normal":"debit","group":"Expenses","subgroup":"Operating Expenses"},
    {"code":"52400","name":"Rent & Office","type":"expense","normal":"debit","group":"Expenses","subgroup":"Operating Expenses"},
    {"code":"52500","name":"Professional Fees","type":"expense","normal":"debit","group":"Expenses","subgroup":"Operating Expenses"},
    {"code":"52900","name":"Other Operating Expenses","type":"expense","normal":"debit","group":"Expenses","subgroup":"Operating Expenses"},
]


@router.get("/templates")
async def list_templates():
    return [{"id":"US_GAAP_STARTUP","name":"US GAAP Startup (5-digit)","accounts":len(US_GAAP_STARTUP)}]


@router.post("/apply-template")
async def apply_template(entity_id: int = Query(...), template_id: str = Query("US_GAAP_STARTUP"), db: Session = Depends(get_db)):
    if template_id != "US_GAAP_STARTUP":
        raise HTTPException(status_code=404, detail="Unknown template")
    # Ensure tables
    db.execute(sa_text("""
        CREATE TABLE IF NOT EXISTS chart_of_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            account_code TEXT,
            account_name TEXT,
            account_type TEXT,
            normal_balance TEXT,
            is_active INTEGER DEFAULT 1
        )
    """))
    db.execute(sa_text("""
        CREATE TABLE IF NOT EXISTS coa_reporting_map (
            entity_id INTEGER,
            account_code TEXT,
            group_name TEXT,
            subgroup_name TEXT
        )
    """))
    db.commit()
    created = 0
    for a in US_GAAP_STARTUP:
        exists = db.execute(sa_text("SELECT 1 FROM chart_of_accounts WHERE entity_id = :e AND account_code = :c"), {"e": entity_id, "c": a["code"]}).fetchone()
        if not exists:
            db.execute(sa_text("INSERT INTO chart_of_accounts (entity_id, account_code, account_name, account_type, normal_balance, is_active) VALUES (:e,:c,:n,:t,:nb,1)"), {
                "e": entity_id, "c": a["code"], "n": a["name"], "t": a["type"], "nb": a["normal"]
            })
            created += 1
        # Upsert reporting map
        db.execute(sa_text("DELETE FROM coa_reporting_map WHERE entity_id = :e AND account_code = :c"), {"e": entity_id, "c": a["code"]})
        db.execute(sa_text("INSERT INTO coa_reporting_map (entity_id, account_code, group_name, subgroup_name) VALUES (:e,:c,:g,:sg)"), {"e": entity_id, "c": a["code"], "g": a["group"], "sg": a["subgroup"]})
    db.commit()
    return {"message": "template applied", "entity_id": entity_id, "created": created}

