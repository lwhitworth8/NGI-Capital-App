"""
NGI Capital Internal Application - Production API Server
=========================================================
Complete FastAPI implementation with real authentication, database integration,
and all business logic for the NGI Capital internal control system.
"""

import logging
import os
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any
from decimal import Decimal

from fastapi import FastAPI, Request, HTTPException, status, Depends, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import create_engine, func, and_, or_, desc
from sqlalchemy.orm import Session, sessionmaker
import uvicorn

# Import our modules
from src.api.auth import (
    get_db, authenticate_partner, create_access_token, 
    require_partner_access, get_current_partner, init_partners_if_needed,
    check_transaction_approval, get_password_hash
)
from src.api.models import (
    Base, Partners as Partner, Entities as Entity, Transactions as Transaction, 
    JournalEntries as JournalEntry, JournalEntryLines as JournalLineItem,
    ChartOfAccounts as ChartOfAccount, Documents as Document, 
    BankAccounts as BankAccount, BankTransactions as BankTransaction, AuditLog
)

# Ensure logs directory exists
os.makedirs('logs', exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/api_production.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Database setup
DATABASE_URL = "sqlite:///ngi_capital.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Pydantic models for request/response
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    partner_name: str
    ownership_percentage: float

class TransactionCreate(BaseModel):
    entity_id: int
    transaction_date: datetime
    amount: float = Field(gt=0)
    transaction_type: str
    description: str
    category: Optional[str] = None
    vendor: Optional[str] = None

class TransactionApproval(BaseModel):
    approval_notes: Optional[str] = None

class EntityCreate(BaseModel):
    legal_name: str
    entity_type: str
    ein: Optional[str] = None
    formation_date: Optional[datetime] = None
    state: Optional[str] = None
    parent_entity_id: Optional[int] = None

class DashboardMetrics(BaseModel):
    total_assets: float
    monthly_revenue: float
    monthly_expenses: float
    entity_count: int
    pending_approvals: int
    cash_position: float
    recent_activity: List[Dict[str, Any]]

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("NGI Capital Production API Server starting up...")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    
    # Initialize partner accounts
    init_partners_if_needed()
    logger.info("Partner accounts initialized")
    
    # Initialize default entities if needed
    db = SessionLocal()
    try:
        # Check if NGI Capital LLC exists
        ngi_llc = db.query(Entity).filter(Entity.legal_name == "NGI Capital LLC").first()
        if not ngi_llc:
            ngi_llc = Entity(
                legal_name="NGI Capital LLC",
                entity_type="LLC",
                ein="88-3957014",
                formation_date=datetime(2024, 7, 16),
                state="Delaware",
                file_number="7816542",
                registered_agent="Corporate Service Company",
                registered_address="251 Little Falls Drive, Wilmington, DE 19808",
                status="active",
                is_active=True
            )
            db.add(ngi_llc)
            db.commit()
            logger.info("Created NGI Capital LLC entity")
            
            # Create other entities
            entities_to_create = [
                {
                    "legal_name": "NGI Capital, Inc.",
                    "entity_type": "C-Corp",
                    "state": "Delaware",
                    "parent_entity_id": ngi_llc.id,
                    "status": "converting"
                },
                {
                    "legal_name": "The Creator Terminal, Inc.",
                    "entity_type": "C-Corp",
                    "state": "Delaware",
                    "parent_entity_id": ngi_llc.id,
                    "status": "pre-formation"
                },
                {
                    "legal_name": "NGI Capital Advisory LLC",
                    "entity_type": "LLC",
                    "state": "Delaware",
                    "parent_entity_id": ngi_llc.id,
                    "status": "pre-formation"
                }
            ]
            
            for entity_data in entities_to_create:
                entity = Entity(**entity_data, is_active=True)
                db.add(entity)
            
            db.commit()
            logger.info("Created subsidiary entities")
    
    except Exception as e:
        logger.error(f"Error initializing entities: {str(e)}")
        db.rollback()
    finally:
        db.close()
    
    logger.info("NGI Capital Production API Server startup complete")
    
    yield  # Server is running
    
    # Shutdown
    logger.info("NGI Capital Production API Server shutting down...")

# Create FastAPI application
app = FastAPI(
    title="NGI Capital Internal System API",
    description="Production API for NGI Capital internal control system",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://internal.ngicapital.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Audit logging helper
def log_audit_action(db: Session, partner_id: int, action: str, entity_type: str, 
                     entity_id: Optional[int] = None, details: Optional[Dict] = None):
    """Log an audit action"""
    try:
        audit_log = AuditLog(
            partner_id=partner_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            ip_address="127.0.0.1",  # In production, get from request
            timestamp=datetime.utcnow()
        )
        db.add(audit_log)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log audit action: {str(e)}")

# ==================== AUTHENTICATION ENDPOINTS ====================

@app.post("/api/auth/login", response_model=LoginResponse, tags=["Authentication"])
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate partner and return JWT token"""
    
    # Verify partner email domain
    if not request.email.endswith("@ngicapitaladvisory.com"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to NGI Capital partners"
        )
    
    # Authenticate partner
    partner = authenticate_partner(db, request.email, request.password)
    
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": partner.email},
        expires_delta=timedelta(hours=12)
    )
    
    # Log audit action
    log_audit_action(db, partner.id, "LOGIN", "Partner", partner.id)
    
    return LoginResponse(
        access_token=access_token,
        expires_in=43200,  # 12 hours in seconds
        partner_name=partner.name,
        ownership_percentage=float(partner.ownership_percentage)
    )

@app.post("/api/auth/logout", tags=["Authentication"])
async def logout(
    current_partner: Dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Logout partner"""
    log_audit_action(db, current_partner["id"], "LOGOUT", "Partner", current_partner["id"])
    return {"message": "Successfully logged out"}

@app.get("/api/auth/me", tags=["Authentication"])
async def get_me(current_partner: Dict = Depends(get_current_partner)):
    """Get current authenticated partner information"""
    return current_partner

# ==================== DASHBOARD ENDPOINTS ====================

@app.get("/api/dashboard/metrics", response_model=DashboardMetrics, tags=["Dashboard"])
async def get_dashboard_metrics(
    current_partner: Dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get dashboard metrics for authenticated partner"""
    
    # Get entity count
    entity_count = db.query(Entity).filter(Entity.is_active == True).count()
    
    # Get current month date range
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    
    # Calculate monthly revenue (placeholder - would query transactions)
    monthly_revenue = db.query(func.sum(Transaction.amount)).filter(
        and_(
            Transaction.transaction_date >= month_start,
            Transaction.transaction_type == "revenue",
            Transaction.approval_status == "approved"
        )
    ).scalar() or 0.0
    
    # Calculate monthly expenses
    monthly_expenses = db.query(func.sum(Transaction.amount)).filter(
        and_(
            Transaction.transaction_date >= month_start,
            Transaction.transaction_type == "expense",
            Transaction.approval_status == "approved"
        )
    ).scalar() or 0.0
    
    # Get pending approvals count
    pending_approvals = db.query(Transaction).filter(
        and_(
            Transaction.approval_status == "pending",
            Transaction.amount > 500,
            Transaction.created_by != current_partner["email"]
        )
    ).count()
    
    # Calculate cash position (sum of all bank account balances)
    cash_position = db.query(func.sum(BankAccount.current_balance)).scalar() or 0.0
    
    # Calculate total assets (placeholder - would include more asset types)
    total_assets = cash_position  # Simplified for now
    
    # Get recent activity
    recent_transactions = db.query(Transaction).order_by(
        desc(Transaction.created_at)
    ).limit(10).all()
    
    recent_activity = []
    for tx in recent_transactions:
        entity = db.query(Entity).filter(Entity.id == tx.entity_id).first()
        recent_activity.append({
            "id": tx.id,
            "date": tx.transaction_date.isoformat(),
            "amount": float(tx.amount),
            "type": tx.transaction_type,
            "description": tx.description,
            "entity": entity.legal_name if entity else "Unknown",
            "status": tx.approval_status
        })
    
    return DashboardMetrics(
        total_assets=float(total_assets),
        monthly_revenue=float(monthly_revenue),
        monthly_expenses=float(monthly_expenses),
        entity_count=entity_count,
        pending_approvals=pending_approvals,
        cash_position=float(cash_position),
        recent_activity=recent_activity
    )

# ==================== ENTITY ENDPOINTS ====================

@app.get("/api/entities", tags=["Entities"])
async def get_entities(
    current_partner: Dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get all active entities"""
    entities = db.query(Entity).filter(Entity.is_active == True).all()
    
    result = []
    for entity in entities:
        # Get parent entity name if exists
        parent_name = None
        if entity.parent_entity_id:
            parent = db.query(Entity).filter(Entity.id == entity.parent_entity_id).first()
            parent_name = parent.legal_name if parent else None
        
        result.append({
            "id": entity.id,
            "legal_name": entity.legal_name,
            "entity_type": entity.entity_type,
            "ein": entity.ein,
            "formation_date": entity.formation_date.isoformat() if entity.formation_date else None,
            "state": entity.state,
            "status": entity.status,
            "parent_entity": parent_name,
            "file_number": entity.file_number,
            "registered_agent": entity.registered_agent,
            "registered_address": entity.registered_address
        })
    
    return result

@app.post("/api/entities", tags=["Entities"])
async def create_entity(
    entity: EntityCreate,
    current_partner: Dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Create a new entity"""
    
    # Check if entity with same name exists
    existing = db.query(Entity).filter(Entity.legal_name == entity.legal_name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Entity with this name already exists"
        )
    
    # Create new entity
    new_entity = Entity(
        legal_name=entity.legal_name,
        entity_type=entity.entity_type,
        ein=entity.ein,
        formation_date=entity.formation_date,
        state=entity.state,
        parent_entity_id=entity.parent_entity_id,
        status="active",
        is_active=True
    )
    
    db.add(new_entity)
    db.commit()
    db.refresh(new_entity)
    
    # Log audit action
    log_audit_action(db, current_partner["id"], "CREATE", "Entity", new_entity.id, 
                     {"legal_name": entity.legal_name})
    
    return {"message": "Entity created successfully", "entity_id": new_entity.id}

# ==================== TRANSACTION ENDPOINTS ====================

@app.get("/api/transactions", tags=["Transactions"])
async def get_transactions(
    entity_id: Optional[int] = None,
    status: Optional[str] = None,
    current_partner: Dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get transactions with optional filters"""
    
    query = db.query(Transaction)
    
    if entity_id:
        query = query.filter(Transaction.entity_id == entity_id)
    
    if status:
        query = query.filter(Transaction.approval_status == status)
    
    transactions = query.order_by(desc(Transaction.transaction_date)).limit(100).all()
    
    result = []
    for tx in transactions:
        entity = db.query(Entity).filter(Entity.id == tx.entity_id).first()
        result.append({
            "id": tx.id,
            "entity": entity.legal_name if entity else "Unknown",
            "date": tx.transaction_date.isoformat(),
            "amount": float(tx.amount),
            "type": tx.transaction_type,
            "description": tx.description,
            "category": tx.category,
            "vendor": tx.vendor,
            "created_by": tx.created_by,
            "approved_by": tx.approved_by,
            "status": tx.approval_status,
            "requires_approval": float(tx.amount) > 500
        })
    
    return result

@app.post("/api/transactions", tags=["Transactions"])
async def create_transaction(
    transaction: TransactionCreate,
    current_partner: Dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Create a new transaction"""
    
    # Verify entity exists
    entity = db.query(Entity).filter(Entity.id == transaction.entity_id).first()
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entity not found"
        )
    
    # Determine approval status
    approval_status = "approved" if transaction.amount <= 500 else "pending"
    
    # Create transaction
    new_transaction = Transaction(
        entity_id=transaction.entity_id,
        transaction_date=transaction.transaction_date,
        amount=transaction.amount,
        transaction_type=transaction.transaction_type,
        description=transaction.description,
        category=transaction.category,
        vendor=transaction.vendor,
        created_by=current_partner["email"],
        approval_status=approval_status,
        created_at=datetime.utcnow()
    )
    
    # Auto-approve if amount <= $500
    if transaction.amount <= 500:
        new_transaction.approved_by = "auto"
        new_transaction.approved_at = datetime.utcnow()
    
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    
    # Log audit action
    log_audit_action(db, current_partner["id"], "CREATE", "Transaction", new_transaction.id,
                     {"amount": float(transaction.amount), "type": transaction.transaction_type})
    
    return {
        "message": "Transaction created successfully",
        "transaction_id": new_transaction.id,
        "status": approval_status,
        "requires_approval": transaction.amount > 500
    }

@app.put("/api/transactions/{transaction_id}/approve", tags=["Transactions"])
async def approve_transaction(
    transaction_id: int,
    approval: TransactionApproval,
    current_partner: Dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Approve a pending transaction"""
    
    # Get transaction
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    # Check if already approved
    if transaction.approval_status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transaction is already {transaction.approval_status}"
        )
    
    # Verify not self-approval
    if transaction.created_by == current_partner["email"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot approve your own transaction"
        )
    
    # Approve transaction
    transaction.approved_by = current_partner["email"]
    transaction.approved_at = datetime.utcnow()
    transaction.approval_status = "approved"
    transaction.approval_notes = approval.approval_notes
    
    db.commit()
    
    # Log audit action
    log_audit_action(db, current_partner["id"], "APPROVE", "Transaction", transaction_id,
                     {"amount": float(transaction.amount)})
    
    return {"message": "Transaction approved successfully"}

@app.put("/api/transactions/{transaction_id}/reject", tags=["Transactions"])
async def reject_transaction(
    transaction_id: int,
    rejection: TransactionApproval,
    current_partner: Dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Reject a pending transaction"""
    
    # Get transaction
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    # Check if already processed
    if transaction.approval_status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transaction is already {transaction.approval_status}"
        )
    
    # Reject transaction
    transaction.approved_by = current_partner["email"]
    transaction.approved_at = datetime.utcnow()
    transaction.approval_status = "rejected"
    transaction.approval_notes = rejection.approval_notes
    
    db.commit()
    
    # Log audit action
    log_audit_action(db, current_partner["id"], "REJECT", "Transaction", transaction_id,
                     {"amount": float(transaction.amount), "reason": rejection.approval_notes})
    
    return {"message": "Transaction rejected"}

# ==================== PARTNER ENDPOINTS ====================

@app.get("/api/partners", tags=["Partners"])
async def get_partners(
    current_partner: Dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get all partners"""
    partners = db.query(Partner).filter(Partner.is_active == True).all()
    
    result = []
    for partner in partners:
        result.append({
            "id": partner.id,
            "name": partner.name,
            "email": partner.email,
            "ownership_percentage": float(partner.ownership_percentage),
            "capital_account_balance": float(partner.capital_account_balance),
            "last_login": partner.last_login.isoformat() if partner.last_login else None
        })
    
    return result

# ==================== DOCUMENT ENDPOINTS ====================

@app.post("/api/documents/upload", tags=["Documents"])
async def upload_document(
    entity_id: str = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_partner: Dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Upload and process a document"""
    
    # Create uploads directory if it doesn't exist
    os.makedirs("uploads", exist_ok=True)
    
    # Save file
    file_path = f"uploads/{entity_id}_{document_type}_{file.filename}"
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Create document record
    document = Document(
        entity_id=entity_id,
        document_type_id=document_type,
        file_name=file.filename,
        file_path=file_path,
        file_size=len(content),
        upload_date=datetime.utcnow(),
        uploaded_by=current_partner["email"],
        status="uploaded"
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    # Log audit action
    log_audit_action(db, current_partner["id"], "UPLOAD", "Document", document.id,
                     {"filename": file.filename, "type": document_type})
    
    return {
        "message": "Document uploaded successfully",
        "document_id": document.id,
        "status": "uploaded"
    }

@app.get("/api/documents", tags=["Documents"])
async def get_documents(
    entity_id: Optional[str] = None,
    current_partner: Dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get documents with optional entity filter"""
    
    query = db.query(Document)
    
    if entity_id:
        query = query.filter(Document.entity_id == entity_id)
    
    documents = query.order_by(desc(Document.upload_date)).all()
    
    result = []
    for doc in documents:
        result.append({
            "id": doc.id,
            "entity_id": doc.entity_id,
            "document_type": doc.document_type_id,
            "file_name": doc.file_name,
            "file_size": doc.file_size,
            "upload_date": doc.upload_date.isoformat(),
            "uploaded_by": doc.uploaded_by,
            "status": doc.status,
            "extracted_data": doc.extracted_data
        })
    
    return result

# ==================== HEALTH CHECK ENDPOINTS ====================

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        db = SessionLocal()
        partner_count = db.query(Partner).count()
        entity_count = db.query(Entity).count()
        db.close()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected",
            "partners": partner_count,
            "entities": entity_count
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
        )

@app.get("/api/health", tags=["Health"])
async def api_health_check():
    """API health check endpoint"""
    return await health_check()

# ==================== ROOT ENDPOINT ====================

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "name": "NGI Capital Internal System API",
        "version": "2.0.0",
        "status": "production",
        "docs_url": "/docs",
        "health_url": "/health"
    }

# Run the application
if __name__ == "__main__":
    logger.info("Starting NGI Capital Production API Server")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )