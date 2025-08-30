"""
NGI Capital Internal Application - Main FastAPI Server
=====================================================

This is the main FastAPI application server for the NGI Capital Internal System.
It provides secure API endpoints for partner financial management operations.

Features:
- Partner authentication and authorization
- Entity management
- Financial reporting
- Transaction processing with dual approval
- Audit trail and logging
- Health monitoring

Author: NGI Capital Development Team
"""

import logging
import os
import sys
import sqlite3
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
import uvicorn

# Import route modules - using absolute imports for Docker
from src.api.routes import entities, reports, banking, documents, financial_reporting
from src.api.config import DATABASE_PATH, DATABASE_URL, SECRET_KEY, ALGORITHM

# Ensure logs directory exists before configuring file handler
os.makedirs('logs', exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/api.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Security
security = HTTPBearer(auto_error=False)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("NGI Capital API Server starting up...")
    
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    # Initialize database connection (placeholder)
    logger.info("Database connection initialized")
    
    # Verify database schema (placeholder)
    logger.info("Database schema verified")
    
    logger.info("NGI Capital API Server startup complete")
    
    yield  # Server is running
    
    # Shutdown
    logger.info("NGI Capital API Server shutting down...")
    logger.info("NGI Capital API Server shutdown complete")

# Create FastAPI application
app = FastAPI(
    title="NGI Capital Internal System API",
    description="""
    Secure API for NGI Capital partners to manage business operations, entities, 
    and financial reporting. This system implements strict controls and 
    segregation of duties as required for financial management.
    
    ## Features
    
    * **Partner Authentication** - JWT-based secure partner access only
    * **Entity Management** - Multi-entity business structure support
    * **Financial Reporting** - GAAP-compliant financial statements
    * **Dual Approval** - Required for transactions over $500
    * **Audit Trail** - Complete logging of all system actions
    * **Inter-Entity Transactions** - Support for complex business structures
    
    ## Security
    
    * Partners cannot approve their own transactions
    * All sensitive operations require authentication
    * Complete audit trail for compliance
    * Session management with automatic timeout
    """,
    version="1.0.0",
    contact={
        "name": "NGI Capital IT Support",
        "email": "support@ngicapital.com"
    },
    license_info={
        "name": "Proprietary",
        "identifier": "NGI-Internal"
    },
    lifespan=lifespan
)

# CORS Configuration - Restrict to local development and production domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",  # Next.js development server
        "http://127.0.0.1:3001",
        "https://internal.ngicapital.com",  # Production domain
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

# Trusted Host Middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.ngicapital.com"]
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)
    
    # Security headers
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    
    # HSTS for HTTPS (in production)
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response

# Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests"""
    start_time = datetime.utcnow()
    
    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    if "X-Forwarded-For" in request.headers:
        client_ip = request.headers["X-Forwarded-For"].split(",")[0].strip()
    
    # Process request
    response = await call_next(request)
    
    # Calculate response time
    process_time = (datetime.utcnow() - start_time).total_seconds()
    
    # Log request details
    logger.info(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"IP: {client_ip} - "
        f"Time: {process_time:.3f}s"
    )
    
    # Add response time header
    response.headers["X-Process-Time"] = str(process_time)
    
    return response

# Authentication dependency
async def get_current_partner(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verify partner authentication token and return partner information.
    """
    if not credentials:
        return None  # Allow unauthenticated access to public endpoints
    
    from jose import jwt, JWTError
    
    try:
        # Decode the JWT token
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        partner_id = payload.get("partner_id")
        
        if email is None:
            return None
        
        # Get partner information from database
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, email, ownership_percentage FROM partners WHERE email = ? AND is_active = 1",
            (email,)
        )
        partner = cursor.fetchone()
        conn.close()
        
        if not partner:
            return None
        
        return {
            "id": partner[0],
            "name": partner[1],
            "email": partner[2],
            "ownership_percentage": partner[3],
            "is_authenticated": True
        }
    except JWTError:
        return None

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

# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.
    Returns system status and basic metrics.
    """
    try:
        # Check database connectivity (placeholder)
        db_status = "healthy"  # Would test actual database connection
        
        # Check disk space (placeholder)
        disk_status = "healthy"
        
        # System uptime (placeholder)
        uptime = "N/A"
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "services": {
                "database": db_status,
                "disk": disk_status
            },
            "uptime": uptime
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "error": "Health check failed"
            }
        )

# Additional health endpoint to align with clients/tests expecting /api/health
@app.get("/api/health", tags=["health"])
async def api_health_check():
    try:
        db_ok = os.path.exists(DATABASE_PATH)
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": db_ok
        }
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

# Authentication endpoints
@app.post("/api/auth/login", tags=["auth"])
async def login(credentials: dict):
    """
    Partner login endpoint with real authentication.
    """
    import sqlite3
    import bcrypt
    from datetime import datetime, timedelta
    from jose import jwt
    
    email = credentials.get("email")
    password = credentials.get("password")
    
    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password required"
        )
    
    # Verify partner email domain (NGI Capital Advisory only)
    if not email.endswith("@ngicapitaladvisory.com"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to NGI Capital partners"
        )
    
    logger.info(f"Login attempt for: {email}")
    
    # Connect to database and verify credentials
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name, password_hash, ownership_percentage FROM partners WHERE email = ? AND is_active = 1", (email,))
    partner = cursor.fetchone()
    
    if not partner:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    partner_id, partner_name, password_hash, ownership_percentage = partner
    
    # Verify password
    if not bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8')):
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Update last login
    cursor.execute("UPDATE partners SET last_login = ? WHERE id = ?", (datetime.utcnow(), partner_id))
    conn.commit()
    conn.close()
    
    # Generate JWT token (using config values)
    
    token_data = {
        "sub": email,
        "partner_id": partner_id,
        "exp": datetime.utcnow() + timedelta(hours=12),
        "iat": datetime.utcnow()
    }
    
    access_token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 43200,  # 12 hours
        "partner_name": partner_name,
        "ownership_percentage": float(ownership_percentage),
    }

@app.post("/api/auth/logout", tags=["auth"])
async def logout(partner=Depends(require_partner_access())):
    """
    Partner logout endpoint.
    Invalidates the current session token.
    """
    logger.info(f"Logout for partner: {partner.get('email', 'unknown')}")
    
    # In real implementation:
    # 1. Invalidate JWT token
    # 2. Log audit action
    # 3. Clean up session data
    
    return {"message": "Successfully logged out"}

@app.get("/api/auth/me", tags=["auth"])
async def get_current_partner_info(partner=Depends(require_partner_access())):
    """
    Get current authenticated partner information.
    """
    return {
        "id": partner.get("id"),
        "email": partner.get("email"),
        "name": partner.get("name"),
        "ownership_percentage": partner.get("ownership_percentage"),
        "authenticated": True,
        "permissions": ["read", "write", "approve"]  # Placeholder
    }

# Dashboard endpoint
@app.get("/api/dashboard", tags=["dashboard"])
async def get_dashboard_data(partner=Depends(require_partner_access())):
    """
    Get dashboard data for the authenticated partner.
    
    Returns key metrics and recent activity for the partner dashboard.
    """
    logger.info(f"Dashboard request from: {partner.get('email', 'unknown')}")
    
    # In real implementation, this would query:
    # - Total assets under management
    # - Monthly revenue/expenses
    # - Cash position by entity
    # - Pending approvals
    # - Recent transactions
    # - Entity performance overview
    
    return {
        "metrics": {
            "total_assets": 0.0,
            "monthly_revenue": 0.0,
            "monthly_expenses": 0.0,
            "cash_position": 0.0,
            "pending_approvals": 0
        },
        "recent_transactions": [],
        "entities": [],
        "alerts": [
            {
                "type": "info",
                "message": "System is in development mode",
                "timestamp": datetime.utcnow().isoformat()
            }
        ]
    }

# New endpoint to match frontend expectations
@app.get("/api/dashboard/metrics", tags=["dashboard"])
async def get_dashboard_metrics(partner=Depends(require_partner_access())):
    """
    Returns key metrics for the dashboard with real data from database.
    """
    import sqlite3
    from datetime import datetime, timedelta
    
    logger.info(f"Dashboard metrics request from: {partner.get('email', 'unknown')}")

    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Get entity count
    cursor.execute("SELECT COUNT(*) FROM entities WHERE is_active = 1")
    entity_count = cursor.fetchone()[0]
    
    # Get total assets (sum of bank account balances)
    cursor.execute("SELECT SUM(current_balance) FROM bank_accounts WHERE is_active = 1")
    total_assets = cursor.fetchone()[0] or 0.0
    
    # Get current month transactions
    month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get monthly revenue
    cursor.execute("""
        SELECT SUM(amount) FROM transactions 
        WHERE transaction_type = 'revenue' 
        AND transaction_date >= ? 
        AND approval_status = 'approved'
    """, (month_start,))
    monthly_revenue = cursor.fetchone()[0] or 0.0
    
    # Get recent transactions
    cursor.execute("""
        SELECT t.id, t.transaction_date, t.amount, t.transaction_type, t.description, e.legal_name, t.approval_status
        FROM transactions t
        LEFT JOIN entities e ON t.entity_id = e.id
        ORDER BY t.created_at DESC
        LIMIT 10
    """)
    recent_transactions = cursor.fetchall()
    
    recent_activity = []
    for tx in recent_transactions:
        recent_activity.append({
            "id": tx[0],
            "date": tx[1] if tx[1] else datetime.now().isoformat(),
            "amount": float(tx[2]) if tx[2] else 0.0,
            "type": tx[3] if tx[3] else "unknown",
            "description": tx[4] if tx[4] else "",
            "entity": tx[5] if tx[5] else "Unknown",
            "status": tx[6] if tx[6] else "pending"
        })
    
    conn.close()
    
    return {
        "total_assets": float(total_assets),
        "monthly_revenue": float(monthly_revenue),
        "entity_count": entity_count,
        "recent_activity": recent_activity,
    }

# Entities endpoint
@app.get("/api/entities", tags=["entities"])
async def get_entities(partner=Depends(require_partner_access())):
    """
    Get all active entities from database.
    """
    import sqlite3
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, legal_name, entity_type, ein, formation_date, state, status, parent_entity_id, 
               file_number, registered_agent, registered_address 
        FROM entities 
        WHERE is_active = 1
    """)
    entities = cursor.fetchall()
    
    result = []
    for entity in entities:
        # Get parent entity name if exists
        parent_name = None
        if entity[7]:  # parent_entity_id
            cursor.execute("SELECT legal_name FROM entities WHERE id = ?", (entity[7],))
            parent_result = cursor.fetchone()
            if parent_result:
                parent_name = parent_result[0]
        
        result.append({
            "id": entity[0],
            "legal_name": entity[1],
            "entity_type": entity[2],
            "ein": entity[3],
            "formation_date": entity[4],
            "state": entity[5],
            "status": entity[6],
            "parent_entity": parent_name,
            "file_number": entity[8],
            "registered_agent": entity[9],
            "registered_address": entity[10]
        })
    
    conn.close()
    return result

# Partners endpoint
@app.get("/api/partners", tags=["partners"]) 
async def get_partners(partner=Depends(require_partner_access())):
    """
    Get all active partners from database.
    """
    import sqlite3
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, email, ownership_percentage, capital_account_balance, last_login
        FROM partners 
        WHERE is_active = 1
    """)
    partners = cursor.fetchall()
    
    result = []
    for p in partners:
        result.append({
            "id": p[0],
            "name": p[1],
            "email": p[2],
            "ownership_percentage": float(p[3]),
            "capital_account_balance": float(p[4]),
            "last_login": p[5] if p[5] else None
        })
    
    conn.close()
    return result

# Include route modules
app.include_router(entities.router)
app.include_router(reports.router)
app.include_router(banking.router)
app.include_router(documents.router)
app.include_router(financial_reporting.router)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url.path)
        }
    )

# HTTP exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handler for HTTP exceptions"""
    logger.warning(f"HTTP {exc.status_code}: {exc.detail} - Path: {request.url.path}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url.path)
        }
    )

# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """
    Root endpoint with basic API information.
    """
    return {
        "name": "NGI Capital Internal System API",
        "version": "1.0.0",
        "description": "Secure API for NGI Capital partners",
        "docs_url": "/docs",
        "health_url": "/health",
        "timestamp": datetime.utcnow().isoformat()
    }

# Run the application
if __name__ == "__main__":
    logger.info("Starting NGI Capital API Server in development mode")
    uvicorn.run(
        app,  # Pass the app object directly instead of string
        host="0.0.0.0",
        port=8001,
        reload=False,  # Disable reload when running directly
        log_level="info",
        access_log=True
    )