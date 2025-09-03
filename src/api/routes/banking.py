"""
Mercury Bank integration routes for NGI Capital Internal System
Production-ready sync with:
- Account + transaction sync from Mercury API (using MERCURY_API_KEY / MERCURY_API_SECRET)
- Persistence to bank_accounts and bank_transactions (idempotent)
- Sync cursor tracking per account
- Auto-match transactions to document-generated draft/posted journal entries
- Reconciliation queue (unmatched transactions)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, Dict, Any, List
from datetime import datetime, date, timedelta
from decimal import Decimal
import logging
import os
import requests
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text
from src.api.database import get_db

logger = logging.getLogger(__name__)

# Mercury API Configuration
MERCURY_API_KEY = os.getenv("MERCURY_API_KEY", "")
MERCURY_API_SECRET = os.getenv("MERCURY_API_SECRET", "")
MERCURY_API_BASE_URL = os.getenv("MERCURY_API_BASE_URL", os.getenv("MERCURY_API_BASE_URL", "https://api.mercury.com/api/v1"))
MERCURY_ENVIRONMENT = os.getenv("MERCURY_ENVIRONMENT", "sandbox").lower()

router = APIRouter(
    prefix="/api/banking",
    tags=["banking"]
)

def _ensure_bank_tables(db: Session):
    # Minimal schemas (idempotent)
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS bank_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            bank_name TEXT DEFAULT 'Mercury',
            account_name TEXT,
            account_number TEXT,
            account_number_masked TEXT,
            account_type TEXT,
            mercury_account_id TEXT UNIQUE,
            mercury_account_status TEXT,
            is_primary INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            last_sync TEXT,
            current_balance REAL,
            available_balance REAL,
            pending_balance REAL,
            currency TEXT
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS bank_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bank_account_id INTEGER,
            external_transaction_id TEXT UNIQUE,
            transaction_date TEXT,
            posted_date TEXT,
            amount REAL,
            description TEXT,
            transaction_type TEXT,
            balance_after REAL,
            is_reconciled INTEGER DEFAULT 0,
            reconciled_transaction_id INTEGER,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """
    ))
    db.execute(sa_text(
        """
        CREATE TABLE IF NOT EXISTS bank_sync_state (
            bank_account_id INTEGER PRIMARY KEY,
            last_cursor TEXT,
            last_sync TEXT
        )
        """
    ))
    db.commit()


def _resolve_mercury_creds(entity: Optional[str]) -> Dict[str, Optional[str]]:
    """Resolve API credentials by entity slug; fallback to global env vars.
    Slugs supported: 'ngi-capital-llc', 'ngi-capital-inc', 'creator-terminal'.
    """
    mapping = {
        'ngi-capital-llc': (
            os.getenv('NGI_CAPITAL_LLC_MERCURY_API_KEY'),
            os.getenv('NGI_CAPITAL_LLC_MERCURY_API_SECRET')
        ),
        'ngi-capital-inc': (
            os.getenv('NGI_CAPITAL_INC_MERCURY_API_KEY'),
            os.getenv('NGI_CAPITAL_INC_MERCURY_API_SECRET')
        ),
        'creator-terminal': (
            os.getenv('CREATOR_TERMINAL_MERCURY_API_KEY'),
            os.getenv('CREATOR_TERMINAL_MERCURY_API_SECRET')
        ),
    }
    if entity and entity in mapping:
        k, s = mapping[entity]
        if k:
            return {"key": k, "secret": s}
    # Fallback to globals
    return {"key": MERCURY_API_KEY or None, "secret": MERCURY_API_SECRET or None}


class MercuryClient:
    def __init__(self, key: Optional[str] = None, secret: Optional[str] = None):
        self.base = MERCURY_API_BASE_URL.rstrip('/')
        self.key = key or MERCURY_API_KEY
        self.secret = secret or MERCURY_API_SECRET
        if not self.key:
            logger.warning("Mercury API key not set; sync will return empty unless mocked in tests")

    def _headers(self) -> Dict[str, str]:
        h = {"Accept": "application/json"}
        # Support either Authorization bearer or X-API-Key style based on env
        if self.key and self.secret:
            h["X-API-Key"] = self.key
            h["X-API-Secret"] = self.secret
        elif self.key:
            h["Authorization"] = f"Bearer {self.key}"
        return h

    def list_accounts(self) -> List[Dict[str, Any]]:
        if not self.key:
            return []
        try:
            url = f"{self.base}/accounts"
            r = requests.get(url, headers=self._headers(), timeout=30)
            r.raise_for_status()
            data = r.json()
            # Normalize
            if isinstance(data, dict) and 'accounts' in data:
                return data['accounts']
            if isinstance(data, list):
                return data
            return []
        except Exception as e:
            logger.warning("Mercury list_accounts failed: %s", str(e))
            return []

    def list_transactions(self, account_id: str, cursor: Optional[str] = None) -> Dict[str, Any]:
        if not self.key:
            return {"transactions": [], "next_cursor": None}
        try:
            params = {}
            if cursor:
                params['cursor'] = cursor
            url = f"{self.base}/accounts/{account_id}/transactions"
            r = requests.get(url, headers=self._headers(), params=params or None, timeout=30)
            r.raise_for_status()
            data = r.json()
            if isinstance(data, dict):
                return {
                    "transactions": data.get('transactions') or data.get('data') or [],
                    "next_cursor": data.get('next_cursor') or data.get('nextCursor') or None,
                }
            return {"transactions": [], "next_cursor": None}
        except Exception as e:
            logger.warning("Mercury list_transactions failed: %s", str(e))
            return {"transactions": [], "next_cursor": None}


def _upsert_account(db: Session, acct: Dict[str, Any]) -> int:
    """Insert/update bank_accounts by mercury_account_id; return internal id"""
    _ensure_bank_tables(db)
    maid = str(acct.get('id') or acct.get('account_id') or '')
    if not maid:
        return 0
    row = db.execute(sa_text("SELECT id FROM bank_accounts WHERE mercury_account_id = :x"), {"x": maid}).fetchone()
    # Determine available columns
    cols = []
    try:
        for c in db.execute(sa_text("SELECT name FROM pragma_table_info('bank_accounts')")):
            cols.append(c[0])
    except Exception:
        pass
    fields_all = {
        "account_name": acct.get('name') or acct.get('accountName') or 'Mercury Account',
        "account_number_masked": acct.get('last4') or acct.get('mask') or '****',
        "account_type": acct.get('type') or acct.get('accountType') or 'checking',
        "mercury_account_status": acct.get('status') or 'active',
        "current_balance": float(acct.get('current_balance') or acct.get('currentBalance') or 0),
        "available_balance": float(acct.get('available_balance') or acct.get('availableBalance') or 0),
        "pending_balance": float(acct.get('pending_balance') or acct.get('pendingBalance') or 0),
        "currency": acct.get('currency') or 'USD',
    }
    # Filter to existing columns (excluding mercury_account_id/last_sync handled separately)
    fields = {k: v for k, v in fields_all.items() if k in cols}
    if row:
        if fields:
            sets = ", ".join([f"{k} = :{k}" for k in fields.keys()])
            extra = ", last_sync = :ls" if 'last_sync' in cols else ""
            db.execute(sa_text(f"UPDATE bank_accounts SET {sets}{extra} WHERE id = :id"), {**fields, "ls": datetime.utcnow().isoformat(sep=' '), "id": int(row[0])})
            db.commit()
        return int(row[0])
    else:
        # Compose dynamic insert
        insert_cols = []
        insert_vals = []
        params: Dict[str, Any] = {}
        for k, v in fields.items():
            insert_cols.append(k); insert_vals.append(f":{k}"); params[k] = v
        # mandatory unique id and optional last_sync
        insert_cols.append('mercury_account_id'); insert_vals.append(':maid'); params['maid'] = maid
        if 'last_sync' in cols:
            insert_cols.append('last_sync'); insert_vals.append(':ls'); params['ls'] = datetime.utcnow().isoformat(sep=' ')
        sql = f"INSERT INTO bank_accounts ({', '.join(insert_cols)}) VALUES ({', '.join(insert_vals)})"
        db.execute(sa_text(sql), params)
        db.commit()
        # Re-select to be robust across schemas
        rid = db.execute(sa_text("SELECT id FROM bank_accounts WHERE mercury_account_id = :x"), {"x": maid}).fetchone()
        return int((rid or [0])[0] or 0)


def _insert_transactions(db: Session, bank_account_id: int, txns: List[Dict[str, Any]]) -> int:
    inserted = 0
    # Determine available columns on bank_transactions
    cols = []
    try:
        for c in db.execute(sa_text("SELECT name FROM pragma_table_info('bank_transactions')")):
            cols.append(c[0])
    except Exception:
        pass
    for t in txns:
        ext_id = str(t.get('id') or t.get('transaction_id') or '')
        if not ext_id:
            continue
        row = db.execute(sa_text("SELECT id FROM bank_transactions WHERE external_transaction_id = :x"), {"x": ext_id}).fetchone()
        if row:
            continue
        amt = t.get('amount')
        try:
            amt = float(amt)
        except Exception:
            amt = 0.0
        # Build dynamic insert to tolerate minimal schemas
        insert_cols = ['bank_account_id', 'external_transaction_id']
        insert_vals = [':ba', ':x']
        params = {"ba": bank_account_id, "x": ext_id}
        # Optional columns
        if 'transaction_date' in cols:
            insert_cols.append('transaction_date'); insert_vals.append(':td'); params['td'] = t.get('transaction_date') or t.get('date') or datetime.utcnow().date().isoformat()
        if 'posted_date' in cols:
            insert_cols.append('posted_date'); insert_vals.append(':pd'); params['pd'] = t.get('posted_date') or t.get('date_posted') or datetime.utcnow().date().isoformat()
        if 'amount' in cols:
            insert_cols.append('amount'); insert_vals.append(':amt'); params['amt'] = amt
        if 'description' in cols:
            insert_cols.append('description'); insert_vals.append(':desc'); params['desc'] = t.get('description') or t.get('details') or ''
        if 'transaction_type' in cols:
            insert_cols.append('transaction_type'); insert_vals.append(':tt'); params['tt'] = t.get('type') or t.get('transaction_type') or ''
        if 'balance_after' in cols:
            insert_cols.append('balance_after'); insert_vals.append(':bal'); params['bal'] = float(t.get('balance') or t.get('balance_after') or 0)
        if 'is_reconciled' in cols:
            insert_cols.append('is_reconciled'); insert_vals.append('0')
        sql = f"INSERT INTO bank_transactions ({', '.join(insert_cols)}) VALUES ({', '.join(insert_vals)})"
        db.execute(sa_text(sql), params)
        inserted += 1
    db.commit()
    return inserted


def _auto_match_transactions(db: Session, tolerance: float = 0.01, days: int = 3) -> int:
    """Match bank txns to journal entries created from documents by amount/vendor/date proximity"""
    # Load candidate txns
    rows = db.execute(sa_text(
        "SELECT id, amount, description, transaction_date FROM bank_transactions WHERE is_reconciled = 0"
    )).fetchall()
    matched = 0
    # Determine updatable columns
    bt_cols = []
    try:
        for c in db.execute(sa_text("SELECT name FROM pragma_table_info('bank_transactions')")):
            bt_cols.append(c[0])
    except Exception:
        pass
    for tid, amount, desc, tdate in rows:
        # Normalize sign: assume outgoing payments are negative; match absolute
        amt = abs(float(amount or 0))
        # Find doc_metadata with same total and vendor matching description
        cands = db.execute(sa_text(
            "SELECT id, vendor, total, journal_entry_id, issue_date FROM doc_metadata WHERE total IS NOT NULL AND journal_entry_id IS NOT NULL"
        )).fetchall()
        best = None
        for did, vendor, total, je_id, issue_date in cands:
            try:
                tot = abs(float(total or 0))
            except Exception:
                continue
            if abs(tot - amt) <= tolerance:
                name_ok = True
                if vendor and isinstance(vendor, str) and vendor.strip():
                    name_ok = vendor.lower() in (desc or '').lower()
                # date proximity
                prox_ok = True
                try:
                    if tdate and issue_date:
                        dt_tx = datetime.fromisoformat(str(tdate))
                        dt_is = datetime.fromisoformat(str(issue_date)) if not isinstance(issue_date, (int, float)) else datetime.utcnow()
                        prox_ok = abs((dt_tx.date() - dt_is.date()).days) <= days
                except Exception:
                    prox_ok = True
                if name_ok and prox_ok:
                    best = (je_id, did)
                    break
        if best:
            je_id, did = best
            # Build update tolerant to missing columns
            if 'reconciled_transaction_id' in bt_cols:
                db.execute(sa_text("UPDATE bank_transactions SET is_reconciled = 1, reconciled_transaction_id = :je WHERE id = :id"), {"je": int(je_id), "id": int(tid)})
            else:
                db.execute(sa_text("UPDATE bank_transactions SET is_reconciled = 1 WHERE id = :id"), {"id": int(tid)})
            matched += 1
    db.commit()
    return matched


@router.get("/accounts")
async def get_bank_accounts(db: Session = Depends(get_db)):
    _ensure_bank_tables(db)
    rows = db.execute(sa_text("SELECT id, account_name, account_number_masked, account_type, current_balance, available_balance, currency FROM bank_accounts WHERE is_active = 1"), {}).fetchall()
    accounts = [
        {
            "id": r[0],
            "name": r[1],
            "account_number": r[2],
            "type": r[3],
            "available_balance": float(r[5] if len(r) > 5 else (r[4] or 0.0)),
            "current_balance": float(r[4] or 0.0),
            "currency": r[6] or 'USD',
        }
        for r in rows
    ]
    return {"accounts": accounts}

@router.get("/transactions")
async def get_transactions(limit: int = Query(100, le=500), offset: int = Query(0, ge=0), account_id: Optional[int] = None, db: Session = Depends(get_db)):
    _ensure_bank_tables(db)
    where = []
    params: Dict[str, Any] = {"lim": int(limit), "off": int(offset)}
    if account_id:
        where.append("bank_account_id = :ba"); params["ba"] = int(account_id)
    sql = "SELECT id, bank_account_id, transaction_date, amount, description, transaction_type, is_reconciled, reconciled_transaction_id FROM bank_transactions"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY datetime(transaction_date) DESC, id DESC LIMIT :lim OFFSET :off"
    rows = db.execute(sa_text(sql), params).fetchall()
    items = [
        {
            "id": r[0],
            "bank_account_id": r[1],
            "transaction_date": r[2],
            "amount": float(r[3] or 0),
            "description": r[4] or '',
            "transaction_type": r[5] or '',
            "is_reconciled": bool(r[6]),
            "reconciled_transaction_id": r[7],
        }
        for r in rows
    ]
    return {"total": len(items), "transactions": items}

@router.post("/mercury/sync")
async def mercury_sync(entity: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Sync accounts and transactions from Mercury. Idempotent; attempts incremental using cursors."""
    _ensure_bank_tables(db)
    creds = _resolve_mercury_creds(entity)
    # Be resilient to monkeypatched constructor without kwargs (tests)
    try:
        client = MercuryClient(key=creds.get('key'), secret=creds.get('secret'))  # type: ignore[arg-type]
    except TypeError:
        client = MercuryClient()  # type: ignore[call-arg]
        try:
            setattr(client, 'key', creds.get('key'))
            setattr(client, 'secret', creds.get('secret'))
        except Exception:
            pass
    accounts = client.list_accounts() or []
    synced = {"accounts": 0, "transactions": 0, "matched": 0}
    for a in accounts:
        aid = _upsert_account(db, a)
        synced["accounts"] += 1
        # Load cursor
        st = db.execute(sa_text("SELECT last_cursor FROM bank_sync_state WHERE bank_account_id = :id"), {"id": aid or 0}).fetchone()
        cursor = st[0] if st else None
        # Fetch transactions, possibly paginated by cursor
        while True:
            page = client.list_transactions(a.get('id') or a.get('account_id') or '', cursor)
            txns = page.get('transactions') or []
            if not isinstance(txns, list):
                txns = []
            inserted = _insert_transactions(db, aid or 0, txns)
            synced["transactions"] += inserted
            cursor = page.get('next_cursor')
            # Update cursor state
            if st:
                db.execute(sa_text("UPDATE bank_sync_state SET last_cursor = :c, last_sync = :ls WHERE bank_account_id = :id"), {"c": cursor, "ls": datetime.utcnow().isoformat(sep=' '), "id": aid or 0})
            else:
                db.execute(sa_text("INSERT INTO bank_sync_state (bank_account_id, last_cursor, last_sync) VALUES (:id, :c, :ls)"), {"id": aid or 0, "c": cursor, "ls": datetime.utcnow().isoformat(sep=' ')})
                st = (cursor,)
            db.commit()
            if not cursor:
                break
    # Auto-match
    try:
        matched = _auto_match_transactions(db)
        synced["matched"] = matched
    except Exception as e:
        logger.warning("auto-match failed: %s", str(e))
    return synced

@router.get("/reconciliation/unmatched")
async def list_unmatched(limit: int = 100, db: Session = Depends(get_db)):
    _ensure_bank_tables(db)
    rows = db.execute(sa_text(
        "SELECT id, bank_account_id, transaction_date, amount, description FROM bank_transactions WHERE is_reconciled = 0 ORDER BY datetime(transaction_date) DESC, id DESC LIMIT :lim"
    ), {"lim": int(limit)}).fetchall()
    return [
        {
            "id": r[0],
            "bank_account_id": r[1],
            "transaction_date": r[2],
            "amount": float(r[3] or 0),
            "description": r[4] or '',
        }
        for r in rows
    ]


@router.post("/reconciliation/match")
async def manual_match(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Manually match a bank transaction to a journal entry. Payload: { txn_id, journal_entry_id }"""
    tid = int(payload.get('txn_id') or 0)
    je = int(payload.get('journal_entry_id') or 0)
    if not tid or not je:
        raise HTTPException(status_code=422, detail="txn_id and journal_entry_id required")
    cols = []
    try:
        for c in db.execute(sa_text("SELECT name FROM pragma_table_info('bank_transactions')")):
            cols.append(c[0])
    except Exception:
        pass
    if 'reconciled_transaction_id' in cols:
        db.execute(sa_text("UPDATE bank_transactions SET is_reconciled = 1, reconciled_transaction_id = :je WHERE id = :id"), {"je": je, "id": tid})
    else:
        db.execute(sa_text("UPDATE bank_transactions SET is_reconciled = 1 WHERE id = :id"), {"id": tid})
    db.commit()
    return {"message": "matched"}


@router.post("/reconciliation/split")
async def split_transaction(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Split a transaction into multiple parts. Payload: { txn_id, splits: [{ amount, description }] }"""
    tid = int(payload.get('txn_id') or 0)
    splits = payload.get('splits') or []
    if not tid or not isinstance(splits, list) or not splits:
        raise HTTPException(status_code=422, detail="txn_id and splits required")
    row = db.execute(sa_text("SELECT bank_account_id, amount, description, transaction_date, transaction_type, balance_after FROM bank_transactions WHERE id = :id"), {"id": tid}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Transaction not found")
    ba, amt, desc, tdate, ttype, bal = row
    total = 0.0
    for s in splits:
        try: total += float(s.get('amount') or 0)
        except Exception: pass
    if round(abs(total) - abs(float(amt or 0)), 2) != 0:
        raise HTTPException(status_code=400, detail="Split amounts must sum to original amount")
    # Update original to first split, insert the rest
    first = splits[0]
    db.execute(sa_text("UPDATE bank_transactions SET amount = :a, description = :d WHERE id = :id"), {"a": float(first.get('amount') or 0), "d": (first.get('description') or desc), "id": tid})
    for s in splits[1:]:
        db.execute(sa_text("INSERT INTO bank_transactions (bank_account_id, external_transaction_id, transaction_date, posted_date, amount, description, transaction_type, balance_after, is_reconciled) VALUES (:ba, :x, :td, :pd, :amt, :desc, :tt, :bal, 0)"), {
            "ba": ba, "x": f"split_{tid}_{datetime.utcnow().timestamp()}", "td": tdate, "pd": tdate, "amt": float(s.get('amount') or 0), "desc": s.get('description') or desc, "tt": ttype, "bal": bal or 0.0
        })
    db.commit()
    return {"message": "split", "parts": len(splits)}


@router.post("/reconciliation/create-je")
async def create_je_from_txn(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Create a journal entry from an unmatched bank transaction.
    Payload: { txn_id, entity_id, debit_account_id, credit_account_id, description? }
    """
    tid = int(payload.get('txn_id') or 0)
    eid = int(payload.get('entity_id') or 0)
    acc_dr = int(payload.get('debit_account_id') or 0)
    acc_cr = int(payload.get('credit_account_id') or 0)
    if not (tid and eid and acc_dr and acc_cr):
        raise HTTPException(status_code=422, detail="txn_id, entity_id, debit_account_id, credit_account_id required")
    row = db.execute(sa_text("SELECT amount, description, transaction_date FROM bank_transactions WHERE id = :id"), {"id": tid}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Transaction not found")
    amt, desc, tdate = row
    amt = abs(float(amt or 0))
    from sqlalchemy import text as _text
    db.execute(_text("INSERT INTO journal_entries (entity_id, entry_number, entry_date, description, total_debit, total_credit, approval_status, is_posted) VALUES (:e,:no,:dt,:ds,:td,:tc,'pending',0)"), {
        "e": eid, "no": f"BANK-{eid:03d}-{int(datetime.utcnow().timestamp())}", "dt": tdate or datetime.utcnow().date().isoformat(), "ds": payload.get('description') or (desc or 'Bank reconciliation'), "td": amt, "tc": amt
    })
    jeid = int(db.execute(_text("SELECT last_insert_rowid()")).fetchone()[0])
    db.execute(_text("INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, description, debit_amount, credit_amount) VALUES (:je,:a,1,'Bank JE',:d,0)"), {"je": jeid, "a": acc_dr, "d": amt})
    db.execute(_text("INSERT INTO journal_entry_lines (journal_entry_id, account_id, line_number, description, debit_amount, credit_amount) VALUES (:je,:a,2,'Bank JE',0,:c)"), {"je": jeid, "a": acc_cr, "c": amt})
    # Mark txn reconciled
    try:
        cols = [r[0] for r in db.execute(sa_text("SELECT name FROM pragma_table_info('bank_transactions')")).fetchall()]
        if 'reconciled_transaction_id' in cols:
            db.execute(sa_text("UPDATE bank_transactions SET is_reconciled = 1, reconciled_transaction_id = :je WHERE id = :id"), {"je": jeid, "id": tid})
        else:
            db.execute(sa_text("UPDATE bank_transactions SET is_reconciled = 1 WHERE id = :id"), {"id": tid})
    except Exception:
        pass
    db.commit(); return {"id": jeid, "message": "created"}


@router.get("/reconciliation/stats")
async def reconciliation_stats(db: Session = Depends(get_db)):
    """Return cleared percentage per account."""
    rows = db.execute(sa_text("SELECT ba.id, ba.account_name, SUM(CASE WHEN bt.is_reconciled = 1 THEN 1 ELSE 0 END) as cleared, COUNT(bt.id) as total FROM bank_accounts ba LEFT JOIN bank_transactions bt ON bt.bank_account_id = ba.id GROUP BY ba.id, ba.account_name"), {}).fetchall()
    out = []
    for id_, name, cleared, total in rows:
        pct = (float(cleared or 0) / float(total or 1)) * 100.0
        out.append({"bank_account_id": id_, "account_name": name, "cleared": int(cleared or 0), "total": int(total or 0), "percent": round(pct, 1)})
    return out

@router.get("/pending-approvals")
async def get_pending_approvals(db: Session = Depends(get_db)):
    # Integrate with accounting transactions table if present
    try:
        rows = db.execute(sa_text("SELECT COUNT(1) FROM transactions WHERE approval_status = 'pending'"), {}).fetchone()
        cnt = int(rows[0] or 0)
    except Exception:
        cnt = 0
    return {"pending_count": cnt, "transactions": []}
