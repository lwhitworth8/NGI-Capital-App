import os
from sqlalchemy import create_engine, text as sa_text
from src.api.config import get_database_path

def main():
    db_path = get_database_path()
    url = f"sqlite:///{db_path}"
    engine = create_engine(url)
    with engine.connect() as conn:
        conn.execute(sa_text("""
        CREATE TABLE IF NOT EXISTS advisory_students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_id INTEGER,
            first_name TEXT,
            last_name TEXT,
            email TEXT UNIQUE,
            school TEXT,
            program TEXT,
            grad_year INTEGER,
            skills TEXT,
            status TEXT,
            resume_url TEXT,
            phone TEXT,
            linkedin_url TEXT,
            gpa DECIMAL(3,2),
            location TEXT,
            status_override TEXT,
            status_override_reason TEXT,
            status_override_at TEXT,
            last_activity_at TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """))
        conn.commit()
        conn.execute(sa_text("DELETE FROM advisory_students WHERE lower(email) = 'lwhitworth@berkeley.edu'"))
        conn.execute(sa_text("""
            INSERT INTO advisory_students (first_name, last_name, email, school, program, grad_year, status, created_at, updated_at)
            VALUES ('Landon','Whitworth','lwhitworth@berkeley.edu','UC Berkeley','Business Administration', 2026, 'prospect', datetime('now'), datetime('now'))
        """))
        conn.commit()
        print('Seeded student lwhitworth@berkeley.edu into', db_path)

if __name__ == '__main__':
    main()

