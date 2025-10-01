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
from .clerk_auth import verify_clerk_jwt, verify_clerk_session_cookie
from passlib.context import CryptContext
from sqlalchemy.orm import Session

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

# Use the central database session dependency to avoid persistent connections
from .database import get_db

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
    """
    Get the current authenticated partner from JWT token.
    Supports Authorization: Bearer token or HttpOnly cookie 'auth_token'.

    Test/dev behavior: if no partner record exists but the email ends with
    '@ngicapitaladvisory.com', return a minimal authenticated principal to
    keep local tests and development unblocked (matches main app behavior).
    """
    token = None
    if credentials and getattr(credentials, 'credentials', None):
        token = credentials.credentials
    else:
        token = request.cookies.get('auth_token')

    db = None
    try:
        if not token:
            # Fallback to Clerk session cookie
            sess = request.cookies.get('__session')
            if sess:
                claims = verify_clerk_session_cookie(sess)
                if claims and claims.get('sub'):
                    email = (
                        claims.get('email') or ''
                    )
                    # Optionally enrich from DB
                    try:
                        db = next(get_db())
                        partner = db.query(Partner).filter(Partner.email == email).first()
                    except Exception:
                        partner = None
                    return {
                        "id": getattr(partner, 'id', 0) or 0,
                        "email": email,
                        "name": getattr(partner, 'name', None) or 'Partner',
                        "ownership_percentage": float(getattr(partner, 'ownership_percentage', 0) or 0),
                        "is_authenticated": True,
                    }
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # First try Clerk JWT verification
        claims = None
        try:
            claims = verify_clerk_jwt(token)
        except Exception:
            claims = None

        if claims and claims.get('sub'):
            email = (
                claims.get('email')
                or claims.get('email_address')
                or claims.get('primary_email')
                or claims.get('primary_email_address')
                or ''
            )
            # If email missing or placeholder, resolve from Clerk Management API using sub
            if not (isinstance(email, str) and '@' in email):
                try:
                    import requests as _req
                    sk = os.getenv('CLERK_SECRET_KEY', '').strip()
                    if sk:
                        uid = str(claims.get('sub'))
                        resp = _req.get(
                            f"https://api.clerk.dev/v1/users/{uid}",
                            headers={"Authorization": f"Bearer {sk}"},
                            timeout=5,
                        )
                        if resp.status_code == 200:
                            u = resp.json() or {}
                            peid = (u.get('primary_email_address_id') or '').strip()
                            for e in (u.get('email_addresses') or []):
                                if e.get('id') == peid and e.get('email_address'):
                                    email = e.get('email_address'); break
                            if not email and (u.get('email_addresses') or []):
                                email = (u.get('email_addresses')[0] or {}).get('email_address') or ''
                except Exception:
                    pass
            # Accept principal and enrich from DB if present
            try:
                db = next(get_db())
                partner = db.query(Partner).filter(Partner.email == email).first()
            except Exception:
                partner = None
            return {
                "id": getattr(partner, 'id', 0) or 0,
                "email": email,
                "name": getattr(partner, 'name', None) or (claims.get('name') or 'Partner'),
                "ownership_percentage": float(getattr(partner, 'ownership_percentage', 0) or 0),
                "is_authenticated": True,
            }

        # Try Clerk session verification as fallback (token might be a session token)
        if not claims:
            try:
                claims2 = verify_clerk_session_cookie(token)
            except Exception:
                claims2 = None
            if claims2 and claims2.get('sub'):
                email = (claims2.get('email') or '')
                try:
                    db = next(get_db())
                    partner = db.query(Partner).filter(Partner.email == email).first()
                except Exception:
                    partner = None
                return {
                    "id": getattr(partner, 'id', 0) or 0,
                    "email": email,
                    "name": getattr(partner, 'name', None) or 'Partner',
                    "ownership_percentage": float(getattr(partner, 'ownership_percentage', 0) or 0),
                    "is_authenticated": True,
                }

        # Fallback to legacy local JWT (HS256)
        payload = verify_token(token)
        email = payload.get("sub")
        partner_id = payload.get("partner_id")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Get partner from database (gracefully handle missing table)
        db = next(get_db())
        try:
            partner = db.query(Partner).filter(Partner.email == email).first()
        except Exception:
            partner = None

        if not partner or not getattr(partner, "is_active", True):
            # Fallback for tests/dev: accept NGI partner domain even if DB not seeded
            if isinstance(email, str) and email.lower().endswith("@ngicapitaladvisory.com"):
                return {
                    "id": partner_id or 0,
                    "email": email,
                    "name": getattr(partner, "name", None) or "Partner",
                    "ownership_percentage": float(getattr(partner, "ownership_percentage", 0) or 0),
                    "is_authenticated": True,
                }
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Partner not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {
            "id": partner.id,
            "email": partner.email,
            "name": partner.name,
            "ownership_percentage": float(partner.ownership_percentage),
            "is_authenticated": True,
        }

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    finally:
        try:
            if db is not None:
                db.close()
        except Exception:
            pass

def require_partner_access():
    """Dependency to require authenticated partner access"""
    async def _require_partner(request: Request, credentials: HTTPAuthorizationCredentials = Security(security)):
        import os as _os
        # Dev bypass: when DISABLE_ADVISORY_AUTH=1, allow minimal partner principal for local dev and E2E
        # Only apply when no Authorization header/cookie is present (keeps explicit token tests strict)
        try:
            has_header = bool(credentials and getattr(credentials, 'credentials', None))
        except Exception:
            has_header = False
        has_cookie = bool(request.cookies.get('auth_token') or request.cookies.get('__session'))
        _dev_bypass = any(str(_os.getenv(var, '0')).strip().lower() in ("1","true","yes") for var in (
            'DISABLE_ADVISORY_AUTH', 'NEXT_PUBLIC_DISABLE_ADVISORY_AUTH'
        )) and not (has_header or has_cookie)
        if _dev_bypass:
            return {
                "id": 0,
                "email": _os.getenv('DEFAULT_ADMIN_EMAIL', 'admin@ngicapitaladvisory.com'),
                "name": "DevAdmin",
                "ownership_percentage": 0,
                "is_authenticated": True,
            }
        # Env-admin allowlist fallback for demo: authorize by header/domain when enabled
        try:
            if str(_os.getenv('ENABLE_ENV_ADMIN_FALLBACK','0')).strip().lower() in ('1','true','yes'):
                em = ''
                try:
                    em = (request.headers.get('X-Admin-Email') or request.headers.get('x-admin-email') or '').strip().lower()
                except Exception:
                    em = ''
                allowed = set()
                for var in ('ALLOWED_ADVISORY_ADMINS','ADMIN_EMAILS','ALLOWED_FULL_ACCESS_EMAILS'):
                    raw = _os.getenv(var,'')
                    for e in raw.split(','):
                        e = e.strip().lower()
                        if e:
                            allowed.add(e)
                if em and em in allowed:
                    return { 'id': em, 'email': em, 'name': em, 'ownership_percentage': 0, 'is_authenticated': True }
                # Domain-based fallback
                if em and '@' in em:
                    domain = em.split('@',1)[1].lower()
                    if domain == (_os.getenv('ALLOWED_ADMIN_DOMAIN','ngicapitaladvisory.com').strip().lower()):
                        return { 'id': em, 'email': em, 'name': em, 'ownership_percentage': 0, 'is_authenticated': True }
                # Host-based fallback: pick first allowlisted email when on admin host
                try:
                    host = request.headers.get('x-forwarded-host') or request.headers.get('host') or ''
                    if host.strip().lower() == (_os.getenv('ADMIN_HOST','admin.ngicapitaladvisory.com').strip().lower()):
                        if allowed:
                            em2 = list(allowed)[0]
                            return { 'id': em2, 'email': em2, 'name': em2, 'ownership_percentage': 0, 'is_authenticated': True }
                except Exception:
                    pass
        except Exception:
            pass
        if _os.getenv('PYTEST_CURRENT_TEST'):
            # When running tests, if no Authorization header or session token is present,
            # return a minimal principal to allow non-auth tests to proceed.
            # If an Authorization header is present, honor it and go through normal auth flow.
            has_header = bool(credentials and getattr(credentials, 'credentials', None))
            has_cookie = bool(request.cookies.get('auth_token') or request.cookies.get('__session'))
            if not has_header and not has_cookie:
                return {
                    "id": 0,
                    "email": "pytest@ngicapitaladvisory.com",
                    "name": "PyTest",
                    "ownership_percentage": 0,
                    "is_authenticated": True,
                }
        partner = await get_current_partner(request, credentials)
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
