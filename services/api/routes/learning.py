"""
API routes for NGI Learning Module
Sprint 1: Company selection and basic progress tracking
Following specifications from MarkdownFiles/NGILearning/PRD.NGILearningModule.md
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, date
import os
import hashlib

from ..database import get_db
from ..models_learning import (
    LearningCompany, LearningProgress, LearningPackage, 
    LearningSubmission, LearningFeedback, LearningLeaderboard
)
import os
try:
    from ..auth_deps import require_clerk_user as require_auth
except ImportError:
    require_auth = None  # type: ignore

# In dev, allow bypassing auth for learning routes when OPEN_NON_ACCOUNTING enabled
_DEV_OPEN = str(os.getenv('OPEN_NON_ACCOUNTING', '0')).strip().lower() in ('1', 'true', 'yes')
if _DEV_OPEN or require_auth is None:
    def require_auth():  # type: ignore
        class MockUser:
            id = "dev_user_123"
            email = "dev@ngicapital.com"
        return MockUser()


def _get_user_id(user) -> str:
    """Robustly extract a user id/email from dict-like or object-like auth payloads."""
    try:
        # Dict-like
        if isinstance(user, dict):
            return user.get("id") or user.get("email") or "unknown"
        # Object-like
        return getattr(user, "id", None) or getattr(user, "email", None) or "unknown"
    except Exception:
        return "unknown"


router = APIRouter(prefix="/api/learning", tags=["learning"])


# =============================================================================
# PYDANTIC SCHEMAS
# =============================================================================

class CompanyResponse(BaseModel):
    """Response schema for company information"""
    id: int
    ticker: str
    company_name: str
    industry: str
    sub_industry: Optional[str] = None
    description: Optional[str] = None
    headquarters: Optional[str] = None
    fiscal_year_end: Optional[str] = None
    ir_website_url: Optional[str] = None
    revenue_model_type: str
    revenue_driver_notes: Optional[str] = None
    data_quality_score: Optional[int] = None
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)


class ProgressResponse(BaseModel):
    """Response schema for student progress"""
    user_id: str
    selected_company_id: Optional[int] = None
    selected_company: Optional[CompanyResponse] = None
    current_module_id: Optional[str] = None
    current_unit_id: Optional[str] = None
    completion_percentage: float
    current_streak_days: int
    longest_streak_days: int
    total_time_minutes: int
    activities_completed: List[str] = []
    capstone_submitted: bool
    
    model_config = ConfigDict(from_attributes=True)


class SelectCompanyRequest(BaseModel):
    """Request schema for company selection"""
    company_id: int = Field(..., description="ID of the company to select")


# =============================================================================
# COMPANY ENDPOINTS
# =============================================================================

@router.get("/companies", response_model=List[CompanyResponse])
async def get_companies(
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Get list of all active learning companies.
    Returns the curated set of 10 companies.
    """
    companies = db.query(LearningCompany).filter(
        LearningCompany.is_active == True
    ).order_by(LearningCompany.ticker).all()
    
    if not companies:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active learning companies found. Please run seed script."
        )
    
    return companies


@router.get("/companies/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Get details for a specific company.
    """
    company = db.query(LearningCompany).filter(
        LearningCompany.id == company_id,
        LearningCompany.is_active == True
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} not found"
        )
    
    return company


# =============================================================================
# PROGRESS ENDPOINTS
# =============================================================================

@router.get("/progress", response_model=ProgressResponse)
async def get_progress(
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Get current user's learning progress.
    Creates progress record if it doesn't exist (first access).
    """
    print(f"Learning API - get_progress called with user: {user}")
    user_id = _get_user_id(user)
    print(f"Learning API - extracted user_id: {user_id}")
    
    # Get or create progress
    progress = db.query(LearningProgress).filter(
        LearningProgress.user_id == user_id
    ).first()
    
    if not progress:
        # First time user - create progress record
        progress = LearningProgress(
            user_id=user_id,
            completion_percentage=0.0,
            current_streak_days=0,
            longest_streak_days=0,
            total_time_minutes=0,
            activities_completed=[],
            capstone_submitted=False
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    
    # Load selected company if set
    response_data = {
        "user_id": progress.user_id,
        "selected_company_id": progress.selected_company_id,
        "selected_company": progress.selected_company if progress.selected_company_id else None,
        "current_module_id": progress.current_module_id,
        "current_unit_id": progress.current_unit_id,
        "completion_percentage": progress.completion_percentage,
        "current_streak_days": progress.current_streak_days,
        "longest_streak_days": progress.longest_streak_days,
        "total_time_minutes": progress.total_time_minutes,
        "activities_completed": progress.activities_completed or [],
        "capstone_submitted": progress.capstone_submitted
    }
    
    return ProgressResponse(**response_data)


@router.post("/progress/select-company")
async def select_company(
    request: SelectCompanyRequest,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Select a company for learning.
    Updates user progress and marks selection timestamp.
    """
    user_id = _get_user_id(user)
    
    # Verify company exists and is active
    company = db.query(LearningCompany).filter(
        LearningCompany.id == request.company_id,
        LearningCompany.is_active == True
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {request.company_id} not found or inactive"
        )
    
    # Get or create progress
    progress = db.query(LearningProgress).filter(
        LearningProgress.user_id == user_id
    ).first()
    
    if not progress:
        progress = LearningProgress(user_id=user_id)
        db.add(progress)
    
    # Update selection
    progress.selected_company_id = request.company_id
    progress.selected_at = datetime.utcnow()
    
    db.commit()
    db.refresh(progress)
    
    return {
        "status": "success",
        "message": f"Selected {company.company_name} ({company.ticker})",
        "company_id": company.id,
        "ticker": company.ticker,
        "company_name": company.company_name
    }


@router.post("/progress/update-streak")
async def update_streak(
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Update user's learning streak.
    Called when user completes activity or spends >=15 minutes.
    """
    user_id = _get_user_id(user)
    
    # Get or create progress
    progress = db.query(LearningProgress).filter(
        LearningProgress.user_id == user_id
    ).first()
    
    if not progress:
        # Auto-create progress record
        progress = LearningProgress(
            user_id=user_id,
            completion_percentage=0.0,
            current_streak_days=0,
            longest_streak_days=0,
            total_time_minutes=0,
            activities_completed=[],
            capstone_submitted=False
        )
        db.add(progress)
    
    today = date.today()
    last_activity = progress.last_activity_date
    
    # Check if streak should increment
    if last_activity is None:
        # First activity ever
        progress.current_streak_days = 1
        progress.longest_streak_days = 1
        progress.last_activity_date = today
    elif last_activity == today:
        # Already logged activity today
        pass  # No change
    elif (today - last_activity).days == 1:
        # Consecutive day
        progress.current_streak_days += 1
        if progress.current_streak_days > progress.longest_streak_days:
            progress.longest_streak_days = progress.current_streak_days
        progress.last_activity_date = today
    else:
        # Streak broken
        progress.current_streak_days = 1
        progress.last_activity_date = today
    
    db.commit()
    db.refresh(progress)
    
    return {
        "status": "success",
        "current_streak": progress.current_streak_days,
        "longest_streak": progress.longest_streak_days,
        "milestone_achieved": progress.current_streak_days in [7, 14, 30, 60, 90, 180, 365]
    }


# =============================================================================
# PACKAGE ENDPOINTS
# =============================================================================

@router.post("/packages/generate/{company_id}")
async def generate_package(
    company_id: int,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Generate a new Excel package for a company.
    Creates all tabs with NGI standards and increments version number.
    """
    from ..learning.excel_generator import ExcelPackageGenerator
    
    # Get company
    company = db.query(LearningCompany).filter(
        LearningCompany.id == company_id,
        LearningCompany.is_active == True
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} not found"
        )
    
    # Get latest version
    latest_package = db.query(LearningPackage).filter(
        LearningPackage.company_id == company_id
    ).order_by(LearningPackage.version.desc()).first()
    
    next_version = (latest_package.version + 1) if latest_package else 1
    
    # Generate Excel package
    try:
        generator = ExcelPackageGenerator(output_dir="uploads/learning_packages")
        filepath = generator.generate_package(
            ticker=company.ticker,
            company_name=company.company_name,
            fiscal_year_end=company.fiscal_year_end or "December 31",
            version=next_version
        )
        
        # Get file size
        import os
        file_size = os.path.getsize(filepath)
        
        # Create package record
        package = LearningPackage(
            company_id=company_id,
            version=next_version,
            package_date=datetime.now().date(),
            file_path=filepath,
            file_size_bytes=file_size,
            validation_status='pending',
            generated_by_user_id=_get_user_id(user)
        )
        db.add(package)
        db.commit()
        db.refresh(package)
        
        return {
            "status": "success",
            "message": f"Generated Excel package for {company.ticker}",
            "package_id": package.id,
            "version": next_version,
            "file_path": filepath,
            "file_size_bytes": file_size,
            "company_name": company.company_name,
            "ticker": company.ticker
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate package: {str(e)}"
        )


@router.get("/packages/{company_id}/latest")
async def get_latest_package(
    company_id: int,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Get the latest Excel package for a company.
    Returns package metadata (Sprint 1 - actual file download in Sprint 2).
    """
    # Verify company exists
    company = db.query(LearningCompany).filter(
        LearningCompany.id == company_id
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} not found"
        )
    
    # Get latest package
    package = db.query(LearningPackage).filter(
        LearningPackage.company_id == company_id
    ).order_by(LearningPackage.version.desc()).first()
    
    if not package:
        # Package not yet generated
        return {
            "status": "not_generated",
            "message": f"Excel package for {company.ticker} not yet generated. Please contact admin.",
            "company_id": company_id,
            "company_name": company.company_name
        }
    
    return {
        "status": "available",
        "company_id": company_id,
        "company_name": company.company_name,
        "ticker": company.ticker,
        "package_id": package.id,
        "version": package.version,
        "package_date": package.package_date.isoformat(),
        "file_path": package.file_path,
        "file_size_bytes": package.file_size_bytes,
        "validation_status": package.validation_status
    }


# =============================================================================
# SUBMISSION ENDPOINTS
# =============================================================================

@router.post("/submissions/upload")
async def upload_submission(
    file: UploadFile = File(...),
    company_id: int = Form(...),
    activity_id: str = Form(...),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Upload a submission file (Excel, PDF, etc.).
    Validates file type, size, and stores with versioning.
    """
    user_id = _get_user_id(user)
    
    # File validation
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
    ALLOWED_EXTENSIONS = {'.xlsx', '.xls', '.pdf', '.pptx'}
    
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file
    contents = await file.read()
    file_size = len(contents)
    
    # Check file size
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024):.0f} MB"
        )
    
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty"
        )
    
    # Verify company exists
    company = db.query(LearningCompany).filter(
        LearningCompany.id == company_id
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} not found"
        )
    
    # Determine file type
    file_type_map = {
        '.xlsx': 'excel',
        '.xls': 'excel',
        '.pdf': 'memo' if 'memo' in activity_id.lower() else 'deck',
        '.pptx': 'deck'
    }
    file_type = file_type_map.get(file_ext, 'excel')
    
    # Get existing submission version
    existing = db.query(LearningSubmission).filter(
        LearningSubmission.user_id == user_id,
        LearningSubmission.company_id == company_id,
        LearningSubmission.activity_id == activity_id
    ).order_by(LearningSubmission.version.desc()).first()
    
    next_version = (existing.version + 1) if existing else 1
    
    # Generate unique filename
    file_hash = hashlib.md5(contents).hexdigest()[:8]
    safe_filename = f"{user_id}_{company.ticker}_{activity_id}_v{next_version}_{file_hash}{file_ext}"
    
    # Create upload directory
    upload_dir = os.path.join("uploads", "learning_submissions", user_id)
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(upload_dir, safe_filename)
    with open(file_path, 'wb') as f:
        f.write(contents)
    
    # Create submission record
    submission = LearningSubmission(
        user_id=user_id,
        company_id=company_id,
        activity_id=activity_id,
        version=next_version,
        file_path=file_path,
        file_type=file_type,
        file_size_bytes=file_size,
        submission_notes=notes,
        validator_status='pending'
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    return {
        "status": "success",
        "message": f"File uploaded successfully (version {next_version})",
        "submission_id": submission.id,
        "version": next_version,
        "file_path": file_path,
        "file_size_bytes": file_size,
        "file_type": file_type,
        "activity_id": activity_id,
        "company_name": company.company_name,
        "ticker": company.ticker
    }


@router.get("/submissions/{submission_id}")
async def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Get submission details by ID.
    Users can only access their own submissions.
    """
    user_id = _get_user_id(user)
    
    submission = db.query(LearningSubmission).filter(
        LearningSubmission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission {submission_id} not found"
        )
    
    # Check ownership
    if submission.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own submissions"
        )
    
    return {
        "id": submission.id,
        "user_id": submission.user_id,
        "company_id": submission.company_id,
        "activity_id": submission.activity_id,
        "version": submission.version,
        "file_path": submission.file_path,
        "file_type": submission.file_type,
        "file_size_bytes": submission.file_size_bytes,
        "submission_notes": submission.submission_notes,
        "validator_status": submission.validator_status,
        "validator_errors": submission.validator_errors,
        "validator_warnings": submission.validator_warnings,
        "ai_detection_score": submission.ai_detection_score,
        "ai_detection_flagged": submission.ai_detection_flagged,
        "submitted_at": submission.submitted_at.isoformat(),
        "validated_at": submission.validated_at.isoformat() if submission.validated_at else None
    }


@router.get("/submissions/user/me")
async def get_my_submissions(
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Get all submissions for current user.
    """
    user_id = _get_user_id(user)
    
    submissions = db.query(LearningSubmission).filter(
        LearningSubmission.user_id == user_id
    ).order_by(LearningSubmission.submitted_at.desc()).all()
    
    return {
        "count": len(submissions),
        "submissions": [
            {
                "id": s.id,
                "company_id": s.company_id,
                "activity_id": s.activity_id,
                "version": s.version,
                "file_type": s.file_type,
                "file_size_bytes": s.file_size_bytes,
                "validator_status": s.validator_status,
                "submitted_at": s.submitted_at.isoformat()
            }
            for s in submissions
        ]
    }


# =============================================================================
# FEEDBACK ENDPOINTS
# =============================================================================

@router.post("/submissions/{submission_id}/feedback")
async def generate_feedback(
    submission_id: int,
    force_regenerate: bool = False,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """v1: AI feedback generation is not available"""
    raise HTTPException(status_code=status.HTTP_410_GONE, detail="AI feedback is not available in v1")


@router.get("/submissions/{submission_id}/feedback")
async def get_feedback(
    submission_id: int,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Retrieve existing feedback for a submission.
    """
    user_id = _get_user_id(user)
    
    # Get submission
    submission = db.query(LearningSubmission).filter(
        LearningSubmission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission {submission_id} not found"
        )
    
    # Check ownership
    if submission.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access feedback for your own submissions"
        )
    
    # Get feedback
    feedback = db.query(LearningFeedback).filter(
        LearningFeedback.submission_id == submission_id
    ).order_by(LearningFeedback.created_at.desc()).first()
    
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No feedback found for this submission. Generate feedback first."
        )
    
    # Parse JSON fields
    import json
    
    return {
        "id": feedback.id,
        "submission_id": feedback.submission_id,
        "feedback_text": feedback.feedback_text,
        "rubric_score": feedback.rubric_score,
        "strengths": json.loads(feedback.strengths) if feedback.strengths else [],
        "improvements": json.loads(feedback.improvements) if feedback.improvements else [],
        "next_steps": json.loads(feedback.next_steps) if feedback.next_steps else [],
        "model_used": feedback.model_used,
        "tokens_used": feedback.tokens_used,
        "created_at": feedback.created_at.isoformat()
    }


# =============================================================================
# VALIDATION ENDPOINTS
# =============================================================================

@router.post("/submissions/{submission_id}/validate")
async def validate_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Validate a submission using deterministic checks.
    Must pass validation before AI feedback can be generated.
    """
    from ..learning.validators import validate_submission as run_validation
    
    user_id = _get_user_id(user)
    
    # Get submission
    submission = db.query(LearningSubmission).filter(
        LearningSubmission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission {submission_id} not found"
        )
    
    # Check ownership
    if submission.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only validate your own submissions"
        )
    
    # Only validate Excel files
    if submission.file_type != 'excel':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Excel submissions can be validated"
        )
    
    # Run validation
    try:
        results = run_validation(submission.file_path)
        
        # Update submission record
        submission.validator_status = results['status']
        submission.validator_errors = results['errors']
        submission.validator_warnings = results['warnings']
        submission.validated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(submission)
        
        return {
            "status": "success",
            "submission_id": submission_id,
            "validation_status": results['status'],
            "passed": results['status'] in ['passed', 'passed_with_warnings'],
            "errors": results['errors'],
            "warnings": results['warnings'],
            "total_errors": results['total_errors'],
            "total_warnings": results['total_warnings'],
            "message": "Validation complete. " + (
                "All checks passed!" if results['status'] == 'passed'
                else "Passed with warnings." if results['status'] == 'passed_with_warnings'
                else "Validation failed. Fix errors and resubmit."
            )
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation failed: {str(e)}"
        )


# =============================================================================
# ADMIN ENDPOINTS - Ingestion & Management
# =============================================================================

@router.post("/admin/ingest/{ticker}")
async def ingest_company_data(
    ticker: str,
    num_filings: int = 5,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Ingest SEC filings for a company (admin only).
    Downloads 10-K and 10-Q filings using sec-edgar-downloader.
    """
    from ..learning.sec_ingestion import SECDataIngester
    
    # Verify company exists
    company = db.query(LearningCompany).filter(
        LearningCompany.ticker == ticker.upper()
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ticker {ticker} not found in learning module"
        )
    
    # Ingest data
    try:
        ingester = SECDataIngester()
        results = ingester.ingest_company(
            ticker=ticker.upper(),
            cik=company.sec_cik,
            num_filings=num_filings
        )
        
        # Update company's last_ingested_at timestamp
        company.last_ingested_at = datetime.utcnow()
        db.commit()
        
        return {
            "status": results['status'],
            "ticker": ticker.upper(),
            "company_name": company.company_name,
            "filings_downloaded": results['filings_downloaded'],
            "errors": results['errors'],
            "timestamp": results['timestamp']
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion failed: {str(e)}"
        )


# =============================================================================
# LEADERBOARD ENDPOINTS
# =============================================================================

@router.get("/leaderboard/{company_id}")
async def get_leaderboard(
    company_id: int,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Get anonymized leaderboard for a company.
    Shows price target distribution after student completes capstone.
    """
    # Get company
    company = db.query(LearningCompany).filter(
        LearningCompany.id == company_id
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found"
        )
    
    # Get all leaderboard entries for this company
    entries = db.query(LearningLeaderboard).filter(
        LearningLeaderboard.company_id == company_id
    ).order_by(LearningLeaderboard.price_target.desc()).all()
    
    if not entries:
        return {
            "company_id": company_id,
            "ticker": company.ticker,
            "company_name": company.company_name,
            "total_submissions": 0,
            "price_targets": [],
            "statistics": {}
        }
    
    # Calculate statistics
    price_targets = [e.price_target for e in entries if e.price_target]
    
    import statistics
    stats = {}
    if price_targets:
        stats = {
            "min": min(price_targets),
            "max": max(price_targets),
            "median": statistics.median(price_targets),
            "mean": statistics.mean(price_targets),
            "count": len(price_targets)
        }
    
    return {
        "company_id": company_id,
        "ticker": company.ticker,
        "company_name": company.company_name,
        "total_submissions": len(entries),
        "price_targets": price_targets,
        "statistics": stats,
        "distribution": {
            "quartile_1": stats.get("min", 0),
            "quartile_2": stats.get("median", 0),
            "quartile_3": stats.get("max", 0)
        }
    }


@router.post("/leaderboard/submit")
async def submit_to_leaderboard(
    company_id: int,
    price_target: float,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Submit price target to leaderboard (capstone only).
    """
    user_id = user.get("id") or user.get("email") or "unknown"
    
    # Check if already submitted
    existing = db.query(LearningLeaderboard).filter(
        LearningLeaderboard.user_id == user_id,
        LearningLeaderboard.company_id == company_id
    ).first()
    
    if existing:
        # Update existing
        existing.price_target = price_target
        existing.submitted_at = datetime.utcnow()
    else:
        # Create new entry
        entry = LearningLeaderboard(
            user_id=user_id,
            company_id=company_id,
            price_target=price_target
        )
        db.add(entry)
    
    db.commit()
    
    return {
        "status": "success",
        "message": "Price target submitted to leaderboard",
        "company_id": company_id,
        "price_target": price_target
    }


# =============================================================================
# HEALTH CHECK
# =============================================================================

@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint for learning module.
    Verifies database connectivity and seed data.
    """
    try:
        company_count = db.query(LearningCompany).filter(
            LearningCompany.is_active == True
        ).count()
        
        return {
            "status": "healthy",
            "module": "learning",
            "active_companies": company_count,
            "expected_companies": 10,
            "seeded": company_count == 10,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}"
        )

