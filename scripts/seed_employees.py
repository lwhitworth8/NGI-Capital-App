"""
Seed employees for NGI Capital entities
Landon Whitworth (CEO & Co-Founder) and Andre Nurmamade (Co-Founder, CFO & COO)
"""

from datetime import date
from src.api.database import get_db
from src.api.models import Partners  # Using existing Partners model for employees


def seed_employees():
    """
    Seed the 2 co-founders as employees/partners
    """
    db = next(get_db())
    try:
        # Check if employees already exist
        existing_landon = db.query(Partners).filter_by(email="landon@ngicapital.com").first()
        existing_andre = db.query(Partners).filter_by(email="andre@ngicapital.com").first()
        
        if existing_landon and existing_andre:
            print("[INFO] Employees already seeded")
            return
        
        employees = []
        
        # Landon Whitworth - CEO & Co-Founder
        if not existing_landon:
            landon = Partners(
                email="landon@ngicapital.com",
                name="Landon Whitworth (CEO & Co-Founder)",
                password_hash="hashed_placeholder",  # Placeholder, will be set by auth system
                ownership_percentage=50.0,  # 50% ownership
                # capital_account_balance will be calculated from accounting documents
                is_active=True,
            )
            employees.append(landon)
            db.add(landon)
        
        # Andre Nurmamade - Co-Founder, CFO & COO
        if not existing_andre:
            andre = Partners(
                email="andre@ngicapital.com",
                name="Andre Nurmamade (Co-Founder, CFO & COO)",
                password_hash="hashed_placeholder",  # Placeholder, will be set by auth system
                ownership_percentage=50.0,  # 50% ownership
                # capital_account_balance will be calculated from accounting documents
                is_active=True,
            )
            employees.append(andre)
            db.add(andre)
        
        if employees:
            db.commit()
            print(f"[SUCCESS] Seeded {len(employees)} employee(s)!")
            for emp in employees:
                print(f"  - {emp.name}")
        else:
            print("[INFO] All employees already exist")
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to seed employees: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_employees()

