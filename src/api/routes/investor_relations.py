"""
Investor Relations API
 - Cap table (derived from partners table)
 - Outreach pipeline (investors, stages)
 - Communications logging
 - Summary reports
All tables are created on demand when missing so tests can run against
the lightweight sqlite schemas.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List, Dict, Any
from datetime import datetime
import sqlite3

from src.api.config import get_database_path, SECRET_KEY, ALGORITHM
from jose import jwt, JWTError

router = APIRouter(prefix="/api/investor-relations", tags=["investor_relations"])
security = HTTPBearer(auto_error=False)


def _db() -> sqlite3.Connection:
    return sqlite3.connect(get_database_path())


def _init_tables(conn: sqlite3.Connection):
    c = conn.cursor()
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS investors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            firm TEXT,
            type TEXT, -- individual, fund, institution, etc
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS investor_outreach (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            investor_id INTEGER NOT NULL,
            stage TEXT NOT NULL, -- sourced, contacted, in_talks, due_diligence, committed, closed, lost
            notes TEXT,
            last_contact_date TIMESTAMP,
            next_action_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(investor_id) REFERENCES investors(id)
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS investor_communications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            investor_id INTEGER NOT NULL,
            subject TEXT,
            message TEXT,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(investor_id) REFERENCES investors(id)
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS investor_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            period_start DATE,
            period_end DATE,
            due_date DATE,
            sent_date DATE,
            UNIQUE(entity_id, period_start, period_end)
        )
        """
    )
    conn.commit()


def _current_partner(creds: HTTPAuthorizationCredentials = Depends(security)):
    if not creds:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Partner authentication required")
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=403, detail="Invalid token")
        return {"email": email}
    except JWTError:
        raise HTTPException(status_code=403, detail="Invalid token")


@router.get("/cap-table")
def cap_table(entity_id: int | None = None, partner=Depends(_current_partner)):
    """Return cap table derived from accounting if available, else partners fallback.
    - LLC: treat equity accounts as member equity lines
    - C‑Corp: report common equity (and detect preferred/warrants if accounts exist)
    """
    conn = _db()
    _init_tables(conn)
    c = conn.cursor()

    # Determine entity type if possible
    entity_type = None
    try:
        c.execute("SELECT entity_type FROM entities WHERE id = ?", (entity_id,))
        row = c.fetchone()
        entity_type = (row[0] if row else None) or None
    except Exception:
        entity_type = None

    # Check for accounting tables
    def has_table(name: str) -> bool:
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (name,))
        return c.fetchone() is not None

    has_coa = has_table('chart_of_accounts')
    has_jel = has_table('journal_entry_lines')
    has_je = has_table('journal_entries')

    def equity_from_accounting() -> dict | None:
        if not (has_coa and has_jel and has_je):
            return None
        params: list = []
        where_entity = ""
        if entity_id is not None:
            where_entity = " AND j.entity_id = ?"
            params.append(entity_id)
        # Sum debit - credit; convert to positive equity value
        c.execute(
            f"""
            SELECT a.account_name, SUM(l.debit_amount - l.credit_amount) AS bal
            FROM journal_entry_lines l
            JOIN journal_entries j ON l.journal_entry_id = j.id
            JOIN chart_of_accounts a ON l.account_id = a.id
            WHERE (a.account_type = 'equity' OR a.account_type = 'EQUITY') {where_entity}
            GROUP BY a.account_name
            """,
            tuple(params),
        )
        rows = c.fetchall()
        if not rows:
            return None
        accounts = []
        for name, bal in rows:
            val = float(abs(bal or 0.0))
            accounts.append({"account": name, "amount": val})
        total = sum(a["amount"] for a in accounts)
        # Simple classification
        instruments: list[dict] = []
        common = 0.0
        members: list[dict] = []
        for a in accounts:
            n = a["account"].lower()
            if 'preferred' in n:
                instruments.append({"type": "preferred_stock", "amount": a["amount"]})
            elif 'warrant' in n:
                instruments.append({"type": "warrants", "amount": a["amount"]})
            elif 'member' in n:
                members.append({"name": a["account"], "equity": a["amount"]})
            elif 'common' in n or 'stock' in n or 'capital stock' in n:
                common += a["amount"]
            else:
                common += a["amount"]
        result: dict = {"total_equity": total}
        if (entity_type or '').lower() == 'llc' or members:
            result["members"] = members or accounts
        else:
            result["common_equity"] = common
            if instruments:
                result["instruments"] = instruments
        return result

    equity = equity_from_accounting()
    if equity is not None:
        conn.close()
        return equity

    # Fallback: partners table (present in tests & dev)
    c.execute(
        "SELECT id, name, email, ownership_percentage, capital_account_balance FROM partners WHERE is_active = 1"
    )
    rows = c.fetchall()
    holders = [
        {
            "id": r[0],
            "name": r[1],
            "email": r[2],
            "ownership_percentage": float(r[3] or 0),
            "capital_account_balance": float(r[4] or 0),
        }
        for r in rows
    ]
    total_ownership = sum(h["ownership_percentage"] for h in holders)
    total_capital = sum(h["capital_account_balance"] for h in holders)
    conn.close()
    return {"holders": holders, "total_ownership": total_ownership, "total_capital": total_capital}


@router.get("/outreach")
def list_outreach(stage: Optional[str] = None, partner=Depends(_current_partner)):
    conn = _db()
    _init_tables(conn)
    c = conn.cursor()
    if stage:
        c.execute(
            """
            SELECT o.id, i.name, i.email, i.firm, o.stage, o.notes, o.last_contact_date, o.next_action_date
            FROM investor_outreach o JOIN investors i ON o.investor_id = i.id
            WHERE o.stage = ?
            ORDER BY o.id DESC
            """,
            (stage,),
        )
    else:
        c.execute(
            """
            SELECT o.id, i.name, i.email, i.firm, o.stage, o.notes, o.last_contact_date, o.next_action_date
            FROM investor_outreach o JOIN investors i ON o.investor_id = i.id
            ORDER BY o.id DESC
            """
        )
    rows = c.fetchall()
    conn.close()
    return [
        {
            "id": r[0],
            "name": r[1],
            "email": r[2],
            "firm": r[3],
            "stage": r[4],
            "notes": r[5],
            "last_contact_date": r[6],
            "next_action_date": r[7],
        }
        for r in rows
    ]


@router.post("/outreach")
def create_outreach(payload: Dict[str, Any], partner=Depends(_current_partner)):
    name = payload.get("name")
    email = payload.get("email")
    firm = payload.get("firm")
    stage = payload.get("stage", "sourced")
    notes = payload.get("notes")
    if not name:
        raise HTTPException(status_code=400, detail="name required")
    conn = _db()
    _init_tables(conn)
    c = conn.cursor()
    # ensure investor exists
    inv_id = None
    if email:
        c.execute("SELECT id FROM investors WHERE email = ?", (email,))
        row = c.fetchone()
        if row:
            inv_id = row[0]
    if inv_id is None:
        c.execute("INSERT INTO investors (name, email, firm) VALUES (?, ?, ?)", (name, email, firm))
        inv_id = c.lastrowid
    # create outreach row
    c.execute(
        "INSERT INTO investor_outreach (investor_id, stage, notes) VALUES (?, ?, ?)",
        (inv_id, stage, notes),
    )
    new_id = c.lastrowid
    conn.commit()
    conn.close()
    return {"id": new_id}


@router.put("/outreach/{outreach_id}")
def update_outreach(outreach_id: int, payload: Dict[str, Any], partner=Depends(_current_partner)):
    stage = payload.get("stage")
    notes = payload.get("notes")
    last_contact = payload.get("last_contact_date")
    next_action = payload.get("next_action_date")
    conn = _db()
    _init_tables(conn)
    c = conn.cursor()
    c.execute("SELECT id FROM investor_outreach WHERE id = ?", (outreach_id,))
    if not c.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Outreach not found")
    c.execute(
        """
        UPDATE investor_outreach 
        SET stage = COALESCE(?, stage),
            notes = COALESCE(?, notes),
            last_contact_date = COALESCE(?, last_contact_date),
            next_action_date = COALESCE(?, next_action_date)
        WHERE id = ?
        """,
        (stage, notes, last_contact, next_action, outreach_id),
    )
    conn.commit()
    conn.close()
    return {"message": "updated"}


@router.delete("/outreach/{outreach_id}")
def delete_outreach(outreach_id: int, partner=Depends(_current_partner)):
    conn = _db()
    _init_tables(conn)
    c = conn.cursor()
    c.execute("DELETE FROM investor_outreach WHERE id = ?", (outreach_id,))
    conn.commit()
    conn.close()
    return {"message": "deleted"}


@router.get("/communications")
def list_communications(investor_id: Optional[int] = None, partner=Depends(_current_partner)):
    conn = _db()
    _init_tables(conn)
    c = conn.cursor()
    if investor_id:
        c.execute(
            """
            SELECT c.id, i.name, i.email, c.subject, c.message, c.sent_at
            FROM investor_communications c JOIN investors i ON c.investor_id = i.id
            WHERE i.id = ? ORDER BY c.id DESC
            """,
            (investor_id,),
        )
    else:
        c.execute(
            """
            SELECT c.id, i.name, i.email, c.subject, c.message, c.sent_at
            FROM investor_communications c JOIN investors i ON c.investor_id = i.id
            ORDER BY c.id DESC
            """
        )
    rows = c.fetchall()
    conn.close()
    return [
        {
            "id": r[0],
            "investor_name": r[1],
            "investor_email": r[2],
            "subject": r[3],
            "message": r[4],
            "sent_at": r[5],
        }
        for r in rows
    ]


@router.post("/communications")
def create_communication(payload: Dict[str, Any], partner=Depends(_current_partner)):
    investor_id = payload.get("investor_id")
    subject = payload.get("subject")
    message = payload.get("message")
    if not investor_id:
        raise HTTPException(status_code=400, detail="investor_id required")
    conn = _db()
    _init_tables(conn)
    c = conn.cursor()
    c.execute("SELECT id FROM investors WHERE id = ?", (investor_id,))
    if not c.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Investor not found")
    c.execute(
        "INSERT INTO investor_communications (investor_id, subject, message) VALUES (?, ?, ?)",
        (investor_id, subject, message),
    )
    new_id = c.lastrowid
    conn.commit()
    conn.close()
    return {"id": new_id}


@router.get("/reports/summary")
def reports_summary(partner=Depends(_current_partner)):
    conn = _db()
    _init_tables(conn)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM investors")
    investors_count = c.fetchone()[0] or 0
    c.execute("SELECT stage, COUNT(*) FROM investor_outreach GROUP BY stage")
    pipeline = {row[0]: row[1] for row in c.fetchall()}
    conn.close()
    return {"investors": investors_count, "pipeline": pipeline}


def _quarter_end(dt: datetime) -> datetime:
    y = dt.year
    if dt.month <= 3:
        return datetime(y, 3, 31)
    elif dt.month <= 6:
        return datetime(y, 6, 30)
    elif dt.month <= 9:
        return datetime(y, 9, 30)
    else:
        return datetime(y, 12, 31)


@router.get("/reports/kpis")
def reports_kpis(partner=Depends(_current_partner)):
    """Top-level KPIs for Investor Relations dashboard."""
    conn = _db()
    _init_tables(conn)
    c = conn.cursor()
    # total investors
    c.execute("SELECT COUNT(*) FROM investors")
    investors = c.fetchone()[0] or 0
    # pipeline (all stages)
    c.execute("SELECT stage, COUNT(*) FROM investor_outreach GROUP BY stage")
    pipeline = {row[0]: row[1] for row in c.fetchall()}
    # communications last 30 days
    try:
        c.execute(
            "SELECT COUNT(*) FROM investor_communications WHERE sent_at >= datetime('now','-30 day')"
        )
        comms_30 = c.fetchone()[0] or 0
    except Exception:
        comms_30 = 0
    # upcoming actions next 14 days
    try:
        c.execute(
            "SELECT COUNT(*) FROM investor_outreach WHERE next_action_date >= date('now') AND next_action_date <= date('now','+14 day')"
        )
        next_actions = c.fetchone()[0] or 0
    except Exception:
        next_actions = 0
    conn.close()
    return {
        "investors": investors,
        "pipeline": pipeline,
        "communications_30": comms_30,
        "upcoming_actions_14": next_actions,
    }


@router.get("/reports/schedule")
def reports_schedule(entity_id: int | None = None, partner=Depends(_current_partner)):
    """Compute reporting schedule: quarter end and due (quarter end + 45 days)."""
    conn = _db()
    _init_tables(conn)
    c = conn.cursor()
    # enumerate entities if table exists
    def has_entities() -> bool:
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='entities'")
        return c.fetchone() is not None
    now = datetime.utcnow()
    q_end = _quarter_end(now)
    due = q_end.replace() if True else q_end  # keep type
    # 45 days after quarter end
    from datetime import timedelta
    due = q_end + timedelta(days=45)
    result: list[dict] = []
    if has_entities():
        if entity_id is not None:
            c.execute("SELECT id, legal_name FROM entities WHERE id = ? AND is_active = 1", (entity_id,))
        else:
            c.execute("SELECT id, legal_name FROM entities WHERE is_active = 1")
        for eid, name in c.fetchall():
            result.append({
                "entity_id": eid,
                "entity_name": name,
                "quarter_end": q_end.isoformat(),
                "report_due": due.isoformat(),
            })
    else:
        result.append({
            "entity_id": entity_id or 0,
            "entity_name": "N/A",
            "quarter_end": q_end.isoformat(),
            "report_due": due.isoformat(),
        })
    conn.close()
    return {"schedule": result}


@router.post("/reports/mark-sent")
def reports_mark_sent(payload: Dict[str, Any], partner=Depends(_current_partner)):
    eid = payload.get("entity_id")
    period_start = payload.get("period_start")
    period_end = payload.get("period_end")
    due_date = payload.get("due_date")
    if not (eid and period_start and period_end):
        raise HTTPException(status_code=400, detail="entity_id, period_start, period_end required")
    conn = _db()
    _init_tables(conn)
    c = conn.cursor()
    # upsert-like behavior
    c.execute(
        "SELECT id FROM investor_reports WHERE entity_id = ? AND period_start = ? AND period_end = ?",
        (eid, period_start, period_end),
    )
    row = c.fetchone()
    if row:
        c.execute("UPDATE investor_reports SET sent_date = date('now') WHERE id = ?", (row[0],))
    else:
        c.execute(
            "INSERT INTO investor_reports (entity_id, period_start, period_end, due_date, sent_date) VALUES (?,?,?,?,date('now'))",
            (eid, period_start, period_end, due_date),
        )
    conn.commit()
    conn.close()
    return {"message": "marked"}
