"""
Validators for NGI Capital Internal System
"""

from decimal import Decimal
from typing import Optional
import re

def validate_transaction_amount(amount: Decimal) -> bool:
    """
    Validate that a transaction amount is positive and within reasonable bounds.
    """
    if amount <= 0:
        return False
    if amount > Decimal('10000000'):  # $10 million max per transaction
        return False
    return True

def validate_ein(ein: Optional[str]) -> bool:
    """
    Validate an Employer Identification Number (EIN) format.
    Format: XX-XXXXXXX where X is a digit
    """
    if not ein:
        return True  # EIN is optional
    pattern = r'^\d{2}-\d{7}$'
    return bool(re.match(pattern, ein))

def validate_email(email: str) -> bool:
    """
    Validate that email is from NGI Capital domain.
    """
    if not email:
        return False
    return email.lower().endswith('@ngicapital.com') or email.lower().endswith('@ngicapitaladvisory.com')

def validate_routing_number(routing_number: str) -> bool:
    """
    Validate US bank routing number (9 digits).
    """
    if not routing_number:
        return False
    if not re.match(r'^\d{9}$', routing_number):
        return False
    
    # Checksum validation for US routing numbers
    digits = [int(d) for d in routing_number]
    checksum = (
        3 * (digits[0] + digits[3] + digits[6]) +
        7 * (digits[1] + digits[4] + digits[7]) +
        (digits[2] + digits[5] + digits[8])
    )
    return checksum % 10 == 0

def validate_account_number(account_number: str) -> bool:
    """
    Validate bank account number format.
    """
    if not account_number:
        return False
    # Account numbers are typically 4-17 digits
    return bool(re.match(r'^\d{4,17}$', account_number))