"""
Authentication and Authorization Module
========================================
Handles JWT token generation, validation, and password hashing for the NGI Capital system.
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import HTTPException, Security, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
try:
    from .config import DATABASE_URL
except Exception:
    DATABASE_URL = "sqlite:///ngi_capital.db"

try:
    from .models import Partners as Partner
except ImportError:
    from models import Partners as Partner

# Configure logging
logger = logging.getLogger(__name__)

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "ngi-capital-secret-key-2025-secure-internal-app")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 720  # 12 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer security
security = HTTPBearer(auto_error=False)

# Database setup (use central config when available)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Dict[str, Any]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logger.error(f"Token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def authenticate_partner(db: Session, email: str, password: str) -> Optional[Partner]:
    """Authenticate a partner by email and password"""
    partner = db.query(Partner).filter(Partner.email == email).first()
    
    if not partner:
        logger.warning(f"Login attempt for non-existent partner: {email}")
        return None
    
    if not partner.is_active:
        logger.warning(f"Login attempt for inactive partner: {email}")
        return None
    
    if not verify_password(password, partner.password_hash):
        logger.warning(f"Invalid password for partner: {email}")
        return None
    
    # Update last login
    partner.last_login = datetime.utcnow()
    db.commit()
    
    logger.info(f"Successful login for partner: {email}")
    return partner

async def get_current_partner(request: Request, credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict[str, Any]:
    """Get the current authenticated partner from JWT token.
    Supports Authorization: Bearer token or HttpOnly cookie 'auth_token'.
    """
    token = None
    if credentials and getattr(credentials, 'credentials', None):
        token = credentials.credentials
    else:
        token = request.cookies.get('auth_token')

    try:
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        payload = verify_token(token)
        email = payload.get("sub")
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get partner from database
        db = next(get_db())
        partner = db.query(Partner).filter(Partner.email == email).first()
        
        if not partner or not partner.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Partner not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        result = {
            "id": partner.id,
            "email": partner.email,
            "name": partner.name,
            "ownership_percentage": float(partner.ownership_percentage),
            "is_authenticated": True
        }
        return result
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    finally:
        try:
            db.close()
        except Exception:
            pass

def require_partner_access():
    """Dependency to require authenticated partner access"""
    async def _require_partner(partner=Depends(get_current_partner)):
        if not partner or not partner.get("is_authenticated"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Partner authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return partner
    return _require_partner

def check_transaction_approval(transaction_amount: float, created_by_id: int, approved_by_id: int) -> bool:
    """
    Check if a transaction approval is valid based on business rules:
    1. No self-approval
    2. Dual authorization required for transactions > $500
    """
    # No self-approval
    if created_by_id == approved_by_id:
        logger.warning(f"Self-approval attempt by partner ID: {created_by_id}")
        return False
    
    # Dual authorization required for transactions > $500
    if transaction_amount > 500 and not approved_by_id:
        logger.warning(f"Transaction > $500 requires dual authorization. Amount: ${transaction_amount}")
        return False
    
    return True

def init_partners_if_needed():
    """Initialize partner accounts if they don't exist"""
    db = next(get_db())
    try:
        # Check if partners exist
        andre = db.query(Partner).filter(Partner.email == "anurmamade@ngicapitaladvisory.com").first()
        landon = db.query(Partner).filter(Partner.email == "lwhitworth@ngicapitaladvisory.com").first()
        
        if not andre:
            andre = Partner(
                email="anurmamade@ngicapitaladvisory.com",
                name="Andre Nurmamade",
                password_hash=get_password_hash("TempPassword123!"),
                ownership_percentage=50.0,
                capital_account_balance=0.0,
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(andre)
            logger.info("Created partner account for Andre Nurmamade")
        
        if not landon:
            landon = Partner(
                email="lwhitworth@ngicapitaladvisory.com",
                name="Landon Whitworth",
                password_hash=get_password_hash("TempPassword123!"),
                ownership_percentage=50.0,
                capital_account_balance=0.0,
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(landon)
            logger.info("Created partner account for Landon Whitworth")
        
        db.commit()
        
    except Exception as e:
        logger.error(f"Error initializing partners: {str(e)}")
        db.rollback()
    finally:
        db.close()
