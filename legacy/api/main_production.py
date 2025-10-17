"""
Legacy production server implementation (archived).
Moved from src/api/main_production.py during deprecated cleanup.
"""

from __future__ import annotations

# Original contents preserved for reference.
# NOTE: This module is no longer referenced by the application.

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
from services.api.auth import (
    get_db, authenticate_partner, create_access_token, 
    require_partner_access, get_current_partner, init_partners_if_needed,
    check_transaction_approval, get_password_hash
)
from services.api.models import (
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
        # ... legacy initialization omitted for brevity ...
        pass
    finally:
        db.close()

# Placeholder FastAPI app to preserve structure
app = FastAPI(lifespan=lifespan)

# Root
@app.get("/")
async def root():
    return {"status": "legacy-archived"}

if __name__ == "__main__":
    logger.info("Starting legacy production API Server (archived)")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")

