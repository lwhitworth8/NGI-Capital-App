"""
Quotes API
----------
Store and retrieve inspirational or finance-related quotes for the dashboard.

Endpoints:
- GET    /api/quotes            -> list quotes (optional limit)
- POST   /api/quotes            -> create a quote { text, author?, source? }
- DELETE /api/quotes/{id}       -> delete a quote (optional; soft governance)
- GET    /api/quotes/random     -> return one random quote

SQLite schema (simple) created on demand.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text

from services.api.database import get_db
from services.api.auth_deps import require_clerk_user


router = APIRouter(prefix="/api/quotes", tags=["quotes"])


def _ensure_table(db: Session) -> None:
    db.execute(
        sa_text(
            """
            CREATE TABLE IF NOT EXISTS quotes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                author TEXT,
                source TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
            """
        )
    )


@router.get("")
async def list_quotes(limit: int = Query(50, ge=1, le=500), db: Session = Depends(get_db), user=Depends(require_clerk_user)):
    _ensure_table(db)
    rows = db.execute(sa_text("SELECT id, text, author, source, created_at FROM quotes ORDER BY id DESC LIMIT :lim"), {"lim": limit}).fetchall()
    return [
        {"id": r[0], "text": r[1], "author": r[2], "source": r[3], "created_at": r[4]} for r in rows
    ]


@router.post("")
async def create_quote(payload: Dict[str, Any], db: Session = Depends(get_db), user=Depends(require_clerk_user)):
    _ensure_table(db)
    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=422, detail="text is required")
    author = (payload.get("author") or "").strip() or None
    source = (payload.get("source") or "").strip() or None
    db.execute(sa_text("INSERT INTO quotes (text, author, source, created_at) VALUES (:t, :a, :s, datetime('now'))"), {"t": text, "a": author, "s": source})
    new_id = int(db.execute(sa_text("SELECT last_insert_rowid()")).scalar() or 0)
    db.commit()
    return {"id": new_id, "text": text, "author": author, "source": source}


@router.delete("/{quote_id}")
async def delete_quote(quote_id: int = Path(..., ge=1), db: Session = Depends(get_db), user=Depends(require_clerk_user)):
    _ensure_table(db)
    db.execute(sa_text("DELETE FROM quotes WHERE id = :id"), {"id": quote_id})
    db.commit()
    return {"deleted": True}


@router.get("/random")
async def random_quote(db: Session = Depends(get_db), user=Depends(require_clerk_user)):
    _ensure_table(db)
    row = db.execute(sa_text("SELECT id, text, author, source FROM quotes ORDER BY RANDOM() LIMIT 1")).fetchone()
    if row:
        return {"id": row[0], "text": row[1], "author": row[2], "source": row[3]}
    # Fallback default quote if no records
    return {
        "id": None,
        "text": (
            "In the old legend the wise men finally boiled down the history of mortal affairs into the single phrase, \"This too will pass.\" "
            "Confronted with a like challenge to distill the secret of sound investment into three words, we venture the motto, MARGIN OF SAFETY."
        ),
        "author": "Benjamin Graham",
        "source": None,
    }
