#!/usr/bin/env python3
"""
Seed market data into the database for ticker functionality.
This uses the existing database connection and doesn't require external dependencies.
"""
import os
import sys
import sqlite3
from datetime import datetime, timedelta

# Add parent directory to path to import from src
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

DB_PATH = os.getenv('DATABASE_PATH', 'data/ngi_capital.db')

def ensure_schema(conn):
    """Create metrics tables if they don't exist"""
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS metrics (
            id TEXT PRIMARY KEY,
            label TEXT,
            unit TEXT,
            source TEXT,
            frequency TEXT,
            transform TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS metric_history (
            metric_id TEXT NOT NULL,
            ts TEXT NOT NULL,
            value REAL,
            PRIMARY KEY(metric_id, ts)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS metric_latest (
            metric_id TEXT PRIMARY KEY,
            ts TEXT,
            value REAL,
            change_abs REAL,
            change_pct REAL
        )
    """)
    conn.commit()
    print("✓ Database schema ensured")

def seed_metrics_metadata(conn):
    """Insert metrics metadata"""
    metrics = [
        ('^GSPC', 'S&P 500', None, 'yfinance', 'daily', None),
        ('^IXIC', 'NASDAQ Composite', None, 'yfinance', 'daily', None),
        ('^DJI', 'Dow Jones Industrial Average', None, 'yfinance', 'daily', None),
        ('^VIX', 'CBOE Volatility Index', None, 'yfinance', 'daily', None),
        ('^TNX', 'U.S. 10-Year Treasury Yield', '%', 'yfinance', 'daily', None),
        ('^FVX', 'U.S. 5-Year Treasury Yield', '%', 'yfinance', 'daily', None),
        ('^TYX', 'U.S. 30-Year Treasury Yield', '%', 'yfinance', 'daily', None),
        ('DX-Y.NYB', 'U.S. Dollar Index (DXY)', None, 'yfinance', 'daily', None),
        ('EURUSD=X', 'EUR/USD', None, 'yfinance', 'daily', None),
        ('GBPUSD=X', 'GBP/USD', None, 'yfinance', 'daily', None),
        ('USDJPY=X', 'USD/JPY', None, 'yfinance', 'daily', None),
        ('USDCAD=X', 'USD/CAD', None, 'yfinance', 'daily', None),
        ('USDCHF=X', 'USD/CHF', None, 'yfinance', 'daily', None),
        ('AUDUSD=X', 'AUD/USD', None, 'yfinance', 'daily', None),
        ('CL=F', 'WTI Crude', 'USD/bbl', 'yfinance', 'daily', None),
        ('GC=F', 'Gold', 'USD/oz', 'yfinance', 'daily', None),
    ]
    
    cursor = conn.cursor()
    for metric in metrics:
        cursor.execute("""
            INSERT OR REPLACE INTO metrics (id, label, unit, source, frequency, transform)
            VALUES (?, ?, ?, ?, ?, ?)
        """, metric)
    conn.commit()
    print(f"✓ Seeded {len(metrics)} metrics metadata")

def main():
    print(f"Seeding market data into database: {DB_PATH}")
    
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found at {DB_PATH}")
        sys.exit(1)
    
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_schema(conn)
        seed_metrics_metadata(conn)
        print("\n✓ Database seeding complete!")
        print("\nNote: Historical data will be fetched live from Yahoo Finance API")
        print("when you click on ticker items. The frontend API routes handle this automatically.")
    finally:
        conn.close()

if __name__ == '__main__':
    main()

