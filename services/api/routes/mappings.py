"""
Vendor/Category Mappings for Documents → JE routing
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text
from services.api.database_async import get_async_db
import uuid

router = APIRouter(prefix="/api/mappings", tags=["mappings"])


def _ensure_tables(db: Session):
    db.execute(sa_text("""
        CREATE TABLE IF NOT EXISTS vendors (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE,
            default_gl_account_id INTEGER,
            terms_days INTEGER,
            tax_rate REAL,
            is_active INTEGER DEFAULT 1,
            created_at TEXT
        )
    """))
    db.execute(sa_text("""
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE,
            keyword_pattern TEXT,
            default_gl_account_id INTEGER,
            is_active INTEGER DEFAULT 1
        )
    """))
    # Optional alias/regex mapping tables
    db.execute(sa_text("""
        CREATE TABLE IF NOT EXISTS vendor_mappings (
            id TEXT PRIMARY KEY,
            vendor_id TEXT,
            pattern TEXT,
            is_regex INTEGER DEFAULT 0
        )
    """))
    db.execute(sa_text("""
        CREATE TABLE IF NOT EXISTS category_mappings (
            id TEXT PRIMARY KEY,
            category_id TEXT,
            keyword_pattern TEXT,
            default_gl_account_id INTEGER
        )
    """))
    db.commit()


@router.get("/vendors")
async def list_vendors(db: Session = Depends(get_async_db)):
    _ensure_tables(db)
    rows = db.execute(sa_text("SELECT id, name, default_gl_account_id, terms_days, tax_rate, is_active FROM vendors ORDER BY name"), {}).fetchall()
    return [{"id": r[0], "name": r[1], "default_gl_account_id": r[2], "terms_days": r[3], "tax_rate": r[4], "is_active": bool(r[5])} for r in rows]


@router.post("/vendors")
async def create_vendor(payload: Dict[str, Any], db: Session = Depends(get_async_db)):
    _ensure_tables(db)
    vid = str(uuid.uuid4())
    db.execute(sa_text("INSERT INTO vendors (id, name, default_gl_account_id, terms_days, tax_rate, is_active, created_at) VALUES (:id,:n,:acc,:td,:tr,1,datetime('now'))"), {
        "id": vid, "n": (payload.get('name') or '').strip(), "acc": int(payload.get('default_gl_account_id') or 0), "td": int(payload.get('terms_days') or 0), "tr": float(payload.get('tax_rate') or 0.0)
    })
    db.commit(); return {"id": vid}


@router.patch("/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, payload: Dict[str, Any], db: Session = Depends(get_async_db)):
    _ensure_tables(db)
    fields = []
    params: Dict[str, Any] = {"id": vendor_id}
    for k in ("name", "default_gl_account_id", "terms_days", "tax_rate", "is_active"):
        if k in payload:
            fields.append(f"{k} = :{k}")
            params[k] = payload[k]
    if not fields:
        return {"message": "no changes"}
    db.execute(sa_text("UPDATE vendors SET " + ", ".join(fields) + " WHERE id = :id"), params)
    db.commit(); return {"message": "updated"}


@router.delete("/vendors/{vendor_id}")
async def delete_vendor(vendor_id: str, db: Session = Depends(get_async_db)):
    _ensure_tables(db)
    db.execute(sa_text("DELETE FROM vendors WHERE id = :id"), {"id": vendor_id})
    db.commit(); return {"message": "deleted"}


@router.get("/categories")
async def list_categories(db: Session = Depends(get_async_db)):
    _ensure_tables(db)
    rows = db.execute(sa_text("SELECT id, name, keyword_pattern, default_gl_account_id, is_active FROM categories ORDER BY name"), {}).fetchall()
    return [{"id": r[0], "name": r[1], "keyword_pattern": r[2], "default_gl_account_id": r[3], "is_active": bool(r[4])} for r in rows]


@router.post("/categories")
async def create_category(payload: Dict[str, Any], db: Session = Depends(get_async_db)):
    _ensure_tables(db)
    cid = str(uuid.uuid4())
    db.execute(sa_text("INSERT INTO categories (id, name, keyword_pattern, default_gl_account_id, is_active) VALUES (:id,:n,:kp,:acc,1)"), {
        "id": cid, "n": (payload.get('name') or '').strip(), "kp": (payload.get('keyword_pattern') or '').strip(), "acc": int(payload.get('default_gl_account_id') or 0)
    })
    db.commit(); return {"id": cid}


@router.patch("/categories/{category_id}")
async def update_category(category_id: str, payload: Dict[str, Any], db: Session = Depends(get_async_db)):
    _ensure_tables(db)
    fields = []
    params: Dict[str, Any] = {"id": category_id}
    for k in ("name", "keyword_pattern", "default_gl_account_id", "is_active"):
        if k in payload:
            fields.append(f"{k} = :{k}")
            params[k] = payload[k]
    if not fields:
        return {"message": "no changes"}
    db.execute(sa_text("UPDATE categories SET " + ", ".join(fields) + " WHERE id = :id"), params)
    db.commit(); return {"message": "updated"}


@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, db: Session = Depends(get_async_db)):
    _ensure_tables(db)
    db.execute(sa_text("DELETE FROM categories WHERE id = :id"), {"id": category_id})
    db.commit(); return {"message": "deleted"}


@router.get("/vendor-mappings")
async def list_vendor_mappings(db: Session = Depends(get_async_db)):
    _ensure_tables(db)
    rows = db.execute(sa_text("SELECT id, vendor_id, pattern, is_regex FROM vendor_mappings ORDER BY pattern"), {}).fetchall()
    return [{"id": r[0], "vendor_id": r[1], "pattern": r[2], "is_regex": bool(r[3])} for r in rows]


@router.post("/vendor-mappings")
async def create_vendor_mapping(payload: Dict[str, Any], db: Session = Depends(get_async_db)):
    _ensure_tables(db)
    if not payload.get("vendor_id") or not payload.get("pattern"):
        raise HTTPException(status_code=400, detail="vendor_id and pattern required")
    mid = str(uuid.uuid4())
    db.execute(sa_text("INSERT INTO vendor_mappings (id, vendor_id, pattern, is_regex) VALUES (:id,:vid,:pat,:rx)"), {
        "id": mid, "vid": payload["vendor_id"], "pat": (payload.get("pattern") or '').strip(), "rx": 1 if payload.get("is_regex") else 0
    })
    db.commit(); return {"id": mid}


@router.delete("/vendor-mappings/{mapping_id}")
async def delete_vendor_mapping(mapping_id: str, db: Session = Depends(get_async_db)):
    _ensure_tables(db)
    db.execute(sa_text("DELETE FROM vendor_mappings WHERE id = :id"), {"id": mapping_id})
    db.commit(); return {"message": "deleted"}


@router.get("/category-mappings")
async def list_category_mappings(db: Session = Depends(get_async_db)):
    _ensure_tables(db)
    # Expose both dedicated table and the simpler categories table as mappings
    rows = db.execute(sa_text("SELECT id, category_id, keyword_pattern, default_gl_account_id FROM category_mappings"), {}).fetchall()
    cat_rows = db.execute(sa_text("SELECT id, keyword_pattern, default_gl_account_id FROM categories WHERE coalesce(keyword_pattern,'') <> ''"), {}).fetchall()
    items = [{"id": r[0], "category_id": r[1], "keyword_pattern": r[2], "default_gl_account_id": r[3]} for r in rows]
    for r in cat_rows:
        items.append({"id": r[0], "category_id": r[0], "keyword_pattern": r[1], "default_gl_account_id": r[2]})
    return items


@router.post("/category-mappings")
async def create_category_mapping(payload: Dict[str, Any], db: Session = Depends(get_async_db)):
    _ensure_tables(db)
    if not payload.get("keyword_pattern"):
        raise HTTPException(status_code=400, detail="keyword_pattern required")
    mid = str(uuid.uuid4())
    db.execute(sa_text("INSERT INTO category_mappings (id, category_id, keyword_pattern, default_gl_account_id) VALUES (:id,:cid,:kp,:acc)"), {
        "id": mid, "cid": payload.get("category_id"), "kp": (payload.get("keyword_pattern") or '').strip(), "acc": int(payload.get("default_gl_account_id") or 0)
    })
    db.commit(); return {"id": mid}


@router.delete("/category-mappings/{mapping_id}")
async def delete_category_mapping(mapping_id: str, db: Session = Depends(get_async_db)):
    _ensure_tables(db)
    db.execute(sa_text("DELETE FROM category_mappings WHERE id = :id"), {"id": mapping_id})
    db.commit(); return {"message": "deleted"}
