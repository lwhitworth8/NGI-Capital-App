import sqlite3
import os
from datetime import datetime

DB_PATH = os.getenv("DATABASE_PATH", os.path.join("data", "ngi_capital.db"))

def fetchall(conn, sql, params=None):
    cur = conn.execute(sql, params or {})
    return cur.fetchall()

def execsql(conn, sql, params=None):
    conn.execute(sql, params or {})

def table_columns(conn, table):
    try:
        rows = fetchall(conn, f"PRAGMA table_info({table})")
        return [r[1] for r in rows]
    except Exception:
        return []

def align_entities(conn):
    conn.execute("PRAGMA foreign_keys = OFF")
    rows = fetchall(conn, "SELECT id, entity_name FROM accounting_entities")
    name_to_id = { (r[1] or '').lower(): int(r[0]) for r in rows }

    def find_like(substr: str):
        for n, _id in name_to_id.items():
            if substr.lower() in n:
                return _id
        return None

    id_llc = find_like('ngi capital llc') or find_like('ngi capital')
    id_inc = find_like('ngi capital inc') or find_like('c-corp')
    id_advisory = find_like('advisory')
    id_creator = find_like('creator terminal') or find_like('creator')

    # Merge Inc into LLC by updating references then hide Inc
    if id_llc and id_inc and id_inc != id_llc:
        tables = [r[0] for r in fetchall(conn, "SELECT name FROM sqlite_master WHERE type='table'")]
        for t in tables:
            cols = table_columns(conn, t)
            if 'entity_id' in cols:
                execsql(conn, f"UPDATE {t} SET entity_id = ? WHERE entity_id = ?", (id_llc, id_inc))
            if 'from_entity_id' in cols:
                execsql(conn, f"UPDATE {t} SET from_entity_id = ? WHERE from_entity_id = ?", (id_llc, id_inc))
            if 'to_entity_id' in cols:
                execsql(conn, f"UPDATE {t} SET to_entity_id = ? WHERE to_entity_id = ?", (id_llc, id_inc))
        # Ensure is_available column exists
        try:
            execsql(conn, "ALTER TABLE accounting_entities ADD COLUMN is_available INTEGER DEFAULT 1")
        except Exception:
            pass
        execsql(conn, "UPDATE accounting_entities SET is_available = 0, entity_status = 'planned' WHERE id = ?", (id_inc,))

    # Reindex advisory and creator to ids 2 and 3 (best effort)
    def set_pk(current_id, target_id):
        if not current_id or current_id == target_id:
            return
        # Move target if exists
        exists = fetchall(conn, "SELECT id FROM accounting_entities WHERE id = ?", (target_id,))
        if exists:
            tmp_id = 1000 + target_id
            execsql(conn, "UPDATE accounting_entities SET id = ? WHERE id = ?", (tmp_id, target_id))
            # Update references
            tables = [r[0] for r in fetchall(conn, "SELECT name FROM sqlite_master WHERE type='table'")]
            for t in tables:
                cols = table_columns(conn, t)
                if 'entity_id' in cols:
                    execsql(conn, f"UPDATE {t} SET entity_id = ? WHERE entity_id = ?", (tmp_id, target_id))
                if 'from_entity_id' in cols:
                    execsql(conn, f"UPDATE {t} SET from_entity_id = ? WHERE from_entity_id = ?", (tmp_id, target_id))
                if 'to_entity_id' in cols:
                    execsql(conn, f"UPDATE {t} SET to_entity_id = ? WHERE to_entity_id = ?", (tmp_id, target_id))
        # Now set current to target id
        execsql(conn, "UPDATE accounting_entities SET id = ? WHERE id = ?", (target_id, current_id))
        tables = [r[0] for r in fetchall(conn, "SELECT name FROM sqlite_master WHERE type='table'")]
        for t in tables:
            cols = table_columns(conn, t)
            if 'entity_id' in cols:
                execsql(conn, f"UPDATE {t} SET entity_id = ? WHERE entity_id = ?", (target_id, current_id))
            if 'from_entity_id' in cols:
                execsql(conn, f"UPDATE {t} SET from_entity_id = ? WHERE from_entity_id = ?", (target_id, current_id))
            if 'to_entity_id' in cols:
                execsql(conn, f"UPDATE {t} SET to_entity_id = ? WHERE to_entity_id = ?", (target_id, current_id))

    if id_advisory:
        set_pk(id_advisory, 2)
    if id_creator:
        set_pk(id_creator, 3)

    conn.execute("PRAGMA foreign_keys = ON")
    conn.commit()
    return {
        "llc_id": id_llc,
        "inc_id": id_inc,
        "advisory_id": 2 if id_advisory else None,
        "creator_id": 3 if id_creator else None,
        "db_path": DB_PATH,
        "timestamp": datetime.utcnow().isoformat()
    }

def main():
    if not os.path.exists(DB_PATH):
        raise SystemExit(f"DB not found: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    try:
        info_before = fetchall(conn, "SELECT id, entity_name, entity_type, COALESCE(is_available,1) FROM accounting_entities")
        result = align_entities(conn)
        info_after = fetchall(conn, "SELECT id, entity_name, entity_type, COALESCE(is_available,1) FROM accounting_entities ORDER BY id")
        print("Before:")
        for r in info_before:
            print(r)
        print("After:")
        for r in info_after:
            print(r)
        print("Result:")
        print(result)
    finally:
        conn.close()

if __name__ == "__main__":
    main()

