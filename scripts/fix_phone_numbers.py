"""
Fix corrupted phone numbers in advisory_students table
Run this once to clean up phone numbers with extra 1s
"""
import sqlite3
import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

DB_PATH = "data/ngi_capital.db"

def clean_phone_number(phone: str) -> str:
    """Clean up phone number format"""
    if not phone:
        return ""
    
    # Remove all non-digits
    digits = ''.join(c for c in phone if c.isdigit())
    
    # If it has too many digits (like 11119167929605), try to extract the valid 10-digit number
    if len(digits) > 11:
        # Look for a valid 10-digit sequence
        # Try to find area code (916) pattern
        if '916' in digits:
            idx = digits.index('916')
            potential = digits[idx:idx+10]
            if len(potential) == 10:
                digits = potential
        else:
            # Take last 10 digits as fallback
            digits = digits[-10:]
    
    # Handle 11 digits starting with 1 (US country code)
    if len(digits) == 11 and digits.startswith('1'):
        digits = digits[1:]  # Remove leading 1
    
    # If we have exactly 10 digits, format as +1XXXXXXXXXX
    if len(digits) == 10:
        return f"+1{digits}"
    elif len(digits) == 0:
        return ""
    else:
        # Invalid length, return as-is with + prefix
        return f"+{digits}"

def main():
    if not os.path.exists(DB_PATH):
        print(f"Database not found: {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all students with phone numbers
    cursor.execute("SELECT id, email, phone FROM advisory_students WHERE phone IS NOT NULL AND phone != ''")
    students = cursor.fetchall()
    
    print(f"Found {len(students)} students with phone numbers")
    print("-" * 80)
    
    updates = 0
    for student_id, email, old_phone in students:
        new_phone = clean_phone_number(old_phone)
        
        if old_phone != new_phone:
            print(f"Student: {email}")
            print(f"  Old: {old_phone}")
            print(f"  New: {new_phone}")
            
            cursor.execute(
                "UPDATE advisory_students SET phone = ?, updated_at = datetime('now') WHERE id = ?",
                (new_phone, student_id)
            )
            updates += 1
            print("  UPDATED")
            print()
    
    conn.commit()
    conn.close()
    
    print("-" * 80)
    print(f"Updated {updates} phone numbers")
    print("Done!")

if __name__ == "__main__":
    main()

