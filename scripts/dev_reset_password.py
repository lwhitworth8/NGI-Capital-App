#!/usr/bin/env python3
"""
Dev-only helper to set/reset a partner password in the SQLite DB.
Usage:
  python scripts/dev_reset_password.py --email lwhitworth@ngicapitaladvisory.com --password 'NewStrongPassword!'

It will pick the DB path from env var DATABASE_PATH, or fall back to common locations:
  - /app/data/ngi_capital.db (docker)
  - ./ngi_capital.db (repo root)
"""
import os
import sqlite3
import argparse

def resolve_db_path() -> str:
    p = os.getenv('DATABASE_PATH')
    if p and os.path.exists(p):
        return p
    for candidate in (
        '/app/data/ngi_capital.db',
        os.path.abspath('ngi_capital.db'),
        os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ngi_capital.db')),
    ):
        if os.path.exists(candidate):
            return candidate
    return os.path.abspath('ngi_capital.db')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--email', required=True)
    ap.add_argument('--password', required=True)
    args = ap.parse_args()

    try:
        import bcrypt
    except Exception as e:
        print('bcrypt is required in this environment to run this script. Install with: pip install bcrypt')
        raise

    db_path = resolve_db_path()
    if not os.path.exists(db_path):
        raise SystemExit(f'Database not found at: {db_path}')

    pw_hash = bcrypt.hashpw(args.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('PRAGMA journal_mode=WAL')
    cur.execute('UPDATE partners SET password_hash = ?, is_active = 1 WHERE lower(email) = lower(?)', (pw_hash, args.email))
    updated = cur.rowcount
    conn.commit()
    conn.close()
    if updated:
        print(f'Updated password for {args.email}. Rows affected: {updated}')
    else:
        print(f'No partner found for {args.email}. Insert if needed and rerun.')

if __name__ == '__main__':
    main()

