"""
Nightly tax calendar refresh for all active entities.
Usage: run inside API container context with ENV vars configured.
"""
import os
import sqlite3
import requests

API = os.getenv('API_BASE', 'http://localhost:8001')
DB_PATH = os.getenv('DATABASE_PATH') or 'ngi_capital.db'

def main():
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        rows = cur.execute("SELECT id FROM entities WHERE is_active = 1").fetchall()
        for (eid,) in rows:
            try:
                r = requests.post(f"{API}/api/tax/refresh-calendar", params={"entity": eid}, timeout=10)
                print("entity", eid, "->", r.status_code)
            except Exception as e:
                print("entity", eid, "failed:", e)
        conn.close()
    except Exception as e:
        print("error:", e)

if __name__ == '__main__':
    main()

