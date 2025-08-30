"""
NGI Capital Internal Application - Security Utilities

Security utilities for input validation, data sanitization,
and security policy enforcement.
"""

import re
import hashlib
import secrets
import string
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import ipaddress
from decimal import Decimal, InvalidOperation

# Security constants
ALLOWED_PARTNER_EMAILS = [
    "anurmamade@ngicapital.com",
    "lwhitworth@ngicapital.com"
]

SENSITIVE_FIELDS = [
    "password", "password_hash", "ssn", "ein", 
    "account_number", "routing_number", "token"
]

class SecurityValidator:
    """Comprehensive security validation utilities"""
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format and domain"""
        if not email:
            return False
        
        # Basic email format validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return False
        
        # NGI Capital domain validation
        return email.endswith('@ngicapital.com')
    
    @staticmethod
    def validate_partner_authorization(email: str) -> bool:
        """Validate that email is authorized for partner access"""
        return email in ALLOWED_PARTNER_EMAILS
    
    @staticmethod
    def validate_password_strength(password: str) -> Dict[str, Any]:
        """Validate password strength and return detailed feedback"""
        
        result = {
            "is_valid": False,
            "score": 0,
            "feedback": [],
            "requirements_met": {}
        }
        
        if not password:
            result["feedback"].append("Password is required")
            return result
        
        # Check length
        min_length = 12
        has_min_length = len(password) >= min_length
        result["requirements_met"]["min_length"] = has_min_length
        if not has_min_length:
            result["feedback"].append(f"Password must be at least {min_length} characters")
        else:
            result["score"] += 25
        
        # Check for uppercase letters
        has_upper = bool(re.search(r'[A-Z]', password))
        result["requirements_met"]["has_upper"] = has_upper
        if not has_upper:
            result["feedback"].append("Password must contain uppercase letters")
        else:
            result["score"] += 15
        
        # Check for lowercase letters
        has_lower = bool(re.search(r'[a-z]', password))
        result["requirements_met"]["has_lower"] = has_lower
        if not has_lower:
            result["feedback"].append("Password must contain lowercase letters")
        else:
            result["score"] += 15
        
        # Check for numbers
        has_number = bool(re.search(r'\d', password))
        result["requirements_met"]["has_number"] = has_number
        if not has_number:
            result["feedback"].append("Password must contain numbers")
        else:
            result["score"] += 15
        
        # Check for special characters
        has_special = bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password))
        result["requirements_met"]["has_special"] = has_special
        if not has_special:
            result["feedback"].append("Password must contain special characters")
        else:
            result["score"] += 15
        
        # Check for common patterns
        common_patterns = [
            r'123',
            r'password',
            r'admin',
            r'qwerty',
            r'abc'
        ]
        
        has_common_pattern = any(re.search(pattern, password.lower()) for pattern in common_patterns)
        if has_common_pattern:
            result["feedback"].append("Password contains common patterns")
            result["score"] -= 10
        
        # Check for sequential characters
        has_sequence = False
        for i in range(len(password) - 2):
            if ord(password[i]) + 1 == ord(password[i+1]) == ord(password[i+2]) - 1:
                has_sequence = True
                break
        
        if has_sequence:
            result["feedback"].append("Password contains sequential characters")
            result["score"] -= 5
        
        # Final validation
        result["is_valid"] = all(result["requirements_met"].values()) and result["score"] >= 80
        
        if result["is_valid"]:
            result["feedback"] = ["Password meets all security requirements"]
        
        return result
    
    @staticmethod
    def sanitize_input(value: str, max_length: Optional[int] = None) -> str:
        """Sanitize user input to prevent injection attacks"""
        if not value:
            return ""
        
        # Remove null bytes
        value = value.replace('\x00', '')
        
        # Remove or escape potentially dangerous characters
        dangerous_chars = ['<', '>', '"', "'", '&', '\n', '\r', '\t']
        for char in dangerous_chars:
            value = value.replace(char, '')
        
        # Trim whitespace
        value = value.strip()
        
        # Enforce length limit
        if max_length and len(value) > max_length:
            value = value[:max_length]
        
        return value
    
    @staticmethod
    def validate_monetary_amount(amount: str) -> Dict[str, Any]:
        """Validate monetary amounts with precision checks"""
        
        result = {
            "is_valid": False,
            "decimal_value": None,
            "errors": []
        }
        
        if not amount:
            result["errors"].append("Amount is required")
            return result
        
        try:
            # Convert to Decimal for precision
            decimal_amount = Decimal(str(amount))
            
            # Check for negative amounts
            if decimal_amount < 0:
                result["errors"].append("Amount cannot be negative")
                return result
            
            # Check decimal places (max 2 for currency)
            if decimal_amount.as_tuple().exponent < -2:
                result["errors"].append("Amount cannot have more than 2 decimal places")
                return result
            
            # Check maximum value (prevent overflow)
            max_value = Decimal('999999999999.99')  # 1 trillion - 1 cent
            if decimal_amount > max_value:
                result["errors"].append("Amount exceeds maximum allowed value")
                return result
            
            result["is_valid"] = True
            result["decimal_value"] = decimal_amount
            
        except (InvalidOperation, ValueError, TypeError):
            result["errors"].append("Invalid amount format")
        
        return result
    
    @staticmethod
    def validate_account_code(code: str) -> bool:
        """Validate 5-digit account codes"""
        if not code:
            return False
        
        # Must be exactly 5 digits
        return bool(re.match(r'^\d{5}$', code))
    
    @staticmethod
    def validate_ein(ein: str) -> bool:
        """Validate Employer Identification Number format"""
        if not ein:
            return False
        
        # Format: XX-XXXXXXX
        ein_pattern = r'^\d{2}-\d{7}$'
        return bool(re.match(ein_pattern, ein))
    
    @staticmethod
    def validate_ip_address(ip: str) -> bool:
        """Validate IP address format"""
        try:
            ipaddress.ip_address(ip)
            return True
        except ValueError:
            return False
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Generate cryptographically secure random token"""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    @staticmethod
    def hash_sensitive_data(data: str, salt: Optional[str] = None) -> Dict[str, str]:
        """Hash sensitive data with salt"""
        if not salt:
            salt = secrets.token_hex(16)
        
        # Combine data with salt
        salted_data = data + salt
        
        # Create hash
        hash_object = hashlib.sha256(salted_data.encode())
        hash_value = hash_object.hexdigest()
        
        return {
            "hash": hash_value,
            "salt": salt
        }

class AuditLogger:
    """Security audit logging utilities"""
    
    @staticmethod
    def log_security_event(
        event_type: str,
        user_email: Optional[str],
        ip_address: Optional[str],
        details: Dict[str, Any],
        severity: str = "INFO"
    ) -> None:
        """Log security-related events"""
        
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "user_email": user_email,
            "ip_address": ip_address,
            "severity": severity,
            "details": AuditLogger._sanitize_log_data(details)
        }
        
        # In production, this would write to secure log files
        print(f"SECURITY_AUDIT: {log_entry}")
    
    @staticmethod
    def _sanitize_log_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive information from log data"""
        
        sanitized = {}
        
        for key, value in data.items():
            if any(sensitive in key.lower() for sensitive in SENSITIVE_FIELDS):
                sanitized[key] = "[REDACTED]"
            elif isinstance(value, dict):
                sanitized[key] = AuditLogger._sanitize_log_data(value)
            else:
                sanitized[key] = value
        
        return sanitized

class RateLimiter:
    """Rate limiting for API endpoints"""
    
    def __init__(self):
        self._attempts = {}
        self._blocks = {}
    
    def check_rate_limit(
        self,
        identifier: str,
        max_attempts: int = 5,
        window_minutes: int = 15,
        block_minutes: int = 30
    ) -> Dict[str, Any]:
        """Check if identifier is within rate limits"""
        
        now = datetime.utcnow()
        
        # Check if currently blocked
        if identifier in self._blocks:
            if now < self._blocks[identifier]:
                return {
                    "allowed": False,
                    "reason": "temporarily_blocked",
                    "retry_after": self._blocks[identifier]
                }
            else:
                # Block expired
                del self._blocks[identifier]
                if identifier in self._attempts:
                    del self._attempts[identifier]
        
        # Initialize or clean old attempts
        if identifier not in self._attempts:
            self._attempts[identifier] = []
        
        # Remove attempts outside the window
        window_start = now - timedelta(minutes=window_minutes)
        self._attempts[identifier] = [
            attempt for attempt in self._attempts[identifier] 
            if attempt > window_start
        ]
        
        # Check if within limits
        if len(self._attempts[identifier]) >= max_attempts:
            # Block the identifier
            self._blocks[identifier] = now + timedelta(minutes=block_minutes)
            return {
                "allowed": False,
                "reason": "rate_limit_exceeded",
                "retry_after": self._blocks[identifier]
            }
        
        # Add this attempt
        self._attempts[identifier].append(now)
        
        return {
            "allowed": True,
            "attempts_remaining": max_attempts - len(self._attempts[identifier])
        }

class DataEncryption:
    """Data encryption utilities for sensitive information"""
    
    @staticmethod
    def mask_account_number(account_number: str) -> str:
        """Mask account number showing only last 4 digits"""
        if not account_number or len(account_number) < 4:
            return "****"
        
        return "*" * (len(account_number) - 4) + account_number[-4:]
    
    @staticmethod
    def mask_ssn(ssn: str) -> str:
        """Mask SSN showing only last 4 digits"""
        if not ssn:
            return "***-**-****"
        
        # Remove any formatting
        clean_ssn = re.sub(r'\D', '', ssn)
        if len(clean_ssn) != 9:
            return "***-**-****"
        
        return f"***-**-{clean_ssn[-4:]}"
    
    @staticmethod
    def validate_data_integrity(data: str, expected_hash: str) -> bool:
        """Validate data integrity using hash comparison"""
        actual_hash = hashlib.sha256(data.encode()).hexdigest()
        return actual_hash == expected_hash

# Global instances for application use
security_validator = SecurityValidator()
audit_logger = AuditLogger()
rate_limiter = RateLimiter()
data_encryption = DataEncryption()