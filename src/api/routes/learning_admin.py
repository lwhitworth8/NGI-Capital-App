"""
Admin endpoints for NGI Learning Module talent tracking
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os

from src.api.database import get_db
from src.api.models_learning import (
    LearningProgress,
    LearningSubmission,
    LearningFeedback,
    LearningCompany,
)
# Student model not yet implemented - using user_id strings for now
# require_partner_access not yet implemented
from pydantic import BaseModel

router = APIRouter(prefix="/api/learning/admin", tags=["learning_admin"])


class StudentTalentResponse(BaseModel):
    user_id: str
    name: str
    email: str
    completion_percentage: float
    artifact_quality: float
    improvement_velocity: float
    talent_signal: float
    current_streak: int
    longest_streak: int
    modules_completed: List[str]
    last_activity: Optional[str]
    submissions_count: int
    selected_company: Optional[str] = None
    total_time_invested: int = 0

    class Config:
        from_attributes = True


class TalentListResponse(BaseModel):
    students: List[StudentTalentResponse]
    total_count: int


class ArtifactResponse(BaseModel):
    id: int
    submission_id: int
    file_path: str
    file_type: str
    file_size_bytes: int
    version: int
    submitted_at: str
    validator_status: str
    feedback_score: Optional[float] = None

    class Config:
        from_attributes = True


class ModuleProgressResponse(BaseModel):
    completion: float
    time_invested: int
    last_activity: str


class StudentDetailResponse(BaseModel):
    student: StudentTalentResponse
    artifacts: List[ArtifactResponse]
    progress_by_module: Dict[str, ModuleProgressResponse]
    recent_feedback: List[Dict[str, Any]]


@router.get("/students", response_model=TalentListResponse)
async def get_students(
    sort: str = Query("talent_signal", regex="^(talent_signal|completion|quality|activity)$"),
    filter: str = Query("all", regex="^(all|elite|strong|promising|developing)$"),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    # user=Depends(require_partner_access),  # TODO: Implement auth
    db: Session = Depends(get_db),
):
    """
    Get talent tracking data for all students (admin only)
    
    Calculates talent signal based on:
    - Completion: 30% (modules/activities completed)
    - Artifact Quality: 50% (average feedback scores)
    - Improvement Velocity: 20% (score improvements over time)
    """
    
    # Get all students with learning progress (using user_id strings for now)
    progress_records = db.query(LearningProgress).all()
    
    talent_list = []
    
    for progress in progress_records:
        user_id = progress.user_id
        
        # Calculate completion percentage
        activities_completed = len(progress.activities_completed or [])
        total_activities = 15  # A1-A5 per module * 3 available modules
        completion_percentage = min((activities_completed / total_activities) * 100, 100)
        
        # Calculate artifact quality score
        submissions = db.query(LearningSubmission).filter(
            LearningSubmission.user_id == user_id
        ).all()
        
        submissions_count = len(submissions)
        
        if submissions:
            # Get feedback scores
            feedback_scores = []
            for submission in submissions:
                feedback = db.query(LearningFeedback).filter(
                    LearningFeedback.submission_id == submission.id
                ).first()
                if feedback:
                    feedback_scores.append(feedback.rubric_score)
            
            artifact_quality_score = (
                sum(feedback_scores) / len(feedback_scores) * 10 if feedback_scores else 0
            )
        else:
            artifact_quality_score = 0
        
        # Calculate improvement velocity
        if len(submissions) >= 2:
            # Compare first and last submission scores
            first_feedback = db.query(LearningFeedback).filter(
                LearningFeedback.submission_id == submissions[0].id
            ).first()
            last_feedback = db.query(LearningFeedback).filter(
                LearningFeedback.submission_id == submissions[-1].id
            ).first()
            
            if first_feedback and last_feedback:
                improvement = last_feedback.rubric_score - first_feedback.rubric_score
                improvement_velocity = max(0, min(improvement * 10, 100))  # Scale to 0-100
            else:
                improvement_velocity = 0
        else:
            improvement_velocity = 0
        
        # Calculate talent signal (weighted average)
        talent_signal = (
            completion_percentage * 0.30 +
            artifact_quality_score * 0.50 +
            improvement_velocity * 0.20
        )
        
        # Determine modules completed (simplified)
        modules_completed = []
        if activities_completed >= 5:
            modules_completed.append("Business Foundations")
        if activities_completed >= 10:
            modules_completed.append("Accounting I")
        if activities_completed >= 15:
            modules_completed.append("Finance & Valuation")
        
        # Get selected company
        selected_company = None
        if progress.selected_company_id:
            company = db.query(LearningCompany).filter(
                LearningCompany.id == progress.selected_company_id
            ).first()
            if company:
                selected_company = company.ticker
        
        talent_list.append(
            StudentTalentResponse(
                user_id=user_id,
                name=f"Student {user_id[:8]}",  # Placeholder name
                email=f"student{user_id[:8]}@example.com",  # Placeholder email
                completion_percentage=round(completion_percentage, 1),
                artifact_quality=round(artifact_quality_score, 1),
                improvement_velocity=round(improvement_velocity, 1),
                talent_signal=round(talent_signal, 1),
                current_streak=progress.current_streak_days or 0,
                longest_streak=progress.longest_streak_days or 0,
                modules_completed=modules_completed,
                last_activity=progress.last_activity_date.isoformat() if progress.last_activity_date else None,
                submissions_count=submissions_count,
                selected_company=selected_company,
                total_time_invested=0,  # TODO: Calculate from activity logs
            )
        )
    
    # Apply filter
    if filter == "elite":
        talent_list = [s for s in talent_list if s.talent_signal >= 80]
    elif filter == "strong":
        talent_list = [s for s in talent_list if 60 <= s.talent_signal < 80]
    elif filter == "promising":
        talent_list = [s for s in talent_list if 40 <= s.talent_signal < 60]
    elif filter == "developing":
        talent_list = [s for s in talent_list if s.talent_signal < 40]
    
    # Sort
    if sort == "talent_signal":
        talent_list.sort(key=lambda x: x.talent_signal, reverse=True)
    elif sort == "completion":
        talent_list.sort(key=lambda x: x.completion_percentage, reverse=True)
    elif sort == "quality":
        talent_list.sort(key=lambda x: x.artifact_quality, reverse=True)
    elif sort == "activity":
        talent_list.sort(key=lambda x: x.last_activity or "", reverse=True)
    
    # Paginate
    total_count = len(talent_list)
    talent_list = talent_list[offset : offset + limit]
    
    return TalentListResponse(
        students=talent_list,
        total_count=total_count,
    )


@router.get("/students/{user_id}", response_model=StudentDetailResponse)
async def get_student_detail(
    user_id: str,
    # user=Depends(require_partner_access),  # TODO: Implement auth
    db: Session = Depends(get_db),
):
    """
    Get detailed student data including artifacts and progress (admin only)
    """
    
    progress = db.query(LearningProgress).filter(
        LearningProgress.user_id == user_id
    ).first()
    
    if not progress:
        raise HTTPException(status_code=404, detail="No learning activity found for this student")
    
    # Calculate metrics (same logic as above, but for single student)
    activities_completed = len(progress.activities_completed or [])
    total_activities = 15
    completion_percentage = min((activities_completed / total_activities) * 100, 100)
    
    submissions = db.query(LearningSubmission).filter(
        LearningSubmission.user_id == user_id
    ).all()
    
    submissions_count = len(submissions)
    
    feedback_scores = []
    for submission in submissions:
        feedback = db.query(LearningFeedback).filter(
            LearningFeedback.submission_id == submission.id
        ).first()
        if feedback:
            feedback_scores.append(feedback.rubric_score)
    
    artifact_quality_score = (
        sum(feedback_scores) / len(feedback_scores) * 10 if feedback_scores else 0
    )
    
    if len(submissions) >= 2:
        first_feedback = db.query(LearningFeedback).filter(
            LearningFeedback.submission_id == submissions[0].id
        ).first()
        last_feedback = db.query(LearningFeedback).filter(
            LearningFeedback.submission_id == submissions[-1].id
        ).first()
        
        if first_feedback and last_feedback:
            improvement = last_feedback.rubric_score - first_feedback.rubric_score
            improvement_velocity = max(0, min(improvement * 10, 100))
        else:
            improvement_velocity = 0
    else:
        improvement_velocity = 0
    
    talent_signal = (
        completion_percentage * 0.30 +
        artifact_quality_score * 0.50 +
        improvement_velocity * 0.20
    )
    
    modules_completed = []
    if activities_completed >= 5:
        modules_completed.append("Business Foundations")
    if activities_completed >= 10:
        modules_completed.append("Accounting I")
    if activities_completed >= 15:
        modules_completed.append("Finance & Valuation")
    
    # Get selected company
    selected_company = None
    if progress.selected_company_id:
        company = db.query(LearningCompany).filter(
            LearningCompany.id == progress.selected_company_id
        ).first()
        if company:
            selected_company = company.ticker
    
    # Get artifacts
    artifacts = []
    for submission in submissions:
        artifacts.append(ArtifactResponse(
            id=submission.id,
            submission_id=submission.id,
            file_path=submission.file_path,
            file_type=submission.file_type,
            file_size_bytes=submission.file_size_bytes,
            version=submission.version,
            submitted_at=submission.submitted_at.isoformat(),
            validator_status=submission.validator_status,
            feedback_score=feedback_scores[submissions.index(submission)] if submissions.index(submission) < len(feedback_scores) else None
        ))
    
    # Get progress by module (simplified)
    progress_by_module = {
        "Business Foundations": ModuleProgressResponse(
            completion=min((activities_completed / 5) * 100, 100) if activities_completed >= 0 else 0,
            time_invested=0,  # TODO: Calculate from activity logs
            last_activity=progress.last_activity_date.isoformat() if progress.last_activity_date else ""
        ),
        "Accounting I": ModuleProgressResponse(
            completion=min(((activities_completed - 5) / 5) * 100, 100) if activities_completed >= 5 else 0,
            time_invested=0,
            last_activity=progress.last_activity_date.isoformat() if progress.last_activity_date else ""
        ),
        "Finance & Valuation": ModuleProgressResponse(
            completion=min(((activities_completed - 10) / 5) * 100, 100) if activities_completed >= 10 else 0,
            time_invested=0,
            last_activity=progress.last_activity_date.isoformat() if progress.last_activity_date else ""
        )
    }
    
    # Get recent feedback
    recent_feedback = []
    for submission in submissions[-5:]:  # Last 5 submissions
        feedback = db.query(LearningFeedback).filter(
            LearningFeedback.submission_id == submission.id
        ).first()
        if feedback:
            recent_feedback.append({
                "id": feedback.id,
                "feedback_text": feedback.feedback_text,
                "rubric_score": feedback.rubric_score,
                "created_at": feedback.created_at.isoformat()
            })
    
    student_data = StudentTalentResponse(
        user_id=user_id,
        name=f"Student {user_id[:8]}",
        email=f"student{user_id[:8]}@example.com",
        completion_percentage=round(completion_percentage, 1),
        artifact_quality=round(artifact_quality_score, 1),
        improvement_velocity=round(improvement_velocity, 1),
        talent_signal=round(talent_signal, 1),
        current_streak=progress.current_streak_days or 0,
        longest_streak=progress.longest_streak_days or 0,
        modules_completed=modules_completed,
        last_activity=progress.last_activity_date.isoformat() if progress.last_activity_date else None,
        submissions_count=submissions_count,
        selected_company=selected_company,
        total_time_invested=0,
    )
    
    return StudentDetailResponse(
        student=student_data,
        artifacts=artifacts,
        progress_by_module=progress_by_module,
        recent_feedback=recent_feedback
    )


@router.get("/artifacts/{artifact_id}/download")
async def download_artifact(
    artifact_id: int,
    # user=Depends(require_partner_access),  # TODO: Implement auth
    db: Session = Depends(get_db),
):
    """
    Download a specific artifact file (admin only)
    """
    
    submission = db.query(LearningSubmission).filter(
        LearningSubmission.id == artifact_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Artifact not found")
    
    file_path = submission.file_path
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    
    filename = os.path.basename(file_path)
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/octet-stream'
    )


@router.post("/feedback/{feedback_id}/flag")
async def flag_feedback(
    feedback_id: int,
    reason: str = Query(..., description="Reason for flagging"),
    # user=Depends(require_partner_access),  # TODO: Implement auth
    db: Session = Depends(get_db),
):
    """
    Flag AI feedback for review (admin only)
    """
    
    feedback = db.query(LearningFeedback).filter(
        LearningFeedback.id == feedback_id
    ).first()
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    # TODO: Add flagged_feedback table to track flags
    # For now, just return success
    
    return {"message": "Feedback flagged for review", "feedback_id": feedback_id, "reason": reason}


@router.post("/feedback/{feedback_id}/regenerate")
async def regenerate_feedback(
    feedback_id: int,
    # user=Depends(require_partner_access),  # TODO: Implement auth
    db: Session = Depends(get_db),
):
    """
    Regenerate AI feedback for a submission (admin only)
    """
    
    feedback = db.query(LearningFeedback).filter(
        LearningFeedback.id == feedback_id
    ).first()
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    # TODO: Implement feedback regeneration logic
    # This would call the AI service to regenerate feedback
    
    return {"message": "Feedback regeneration initiated", "feedback_id": feedback_id}


@router.get("/moderation/flagged")
async def get_flagged_feedback(
    # user=Depends(require_partner_access),  # TODO: Implement auth
    db: Session = Depends(get_db),
):
    """
    Get all flagged feedback for moderation (admin only)
    """
    
    # TODO: Implement flagged feedback retrieval
    # For now, return empty list
    
    return {"flagged_feedback": []}


@router.get("/analytics/overview")
async def get_learning_analytics(
    # user=Depends(require_partner_access),  # TODO: Implement auth
    db: Session = Depends(get_db),
):
    """
    Get learning analytics overview (admin only)
    """
    
    # Get basic stats
    total_students = db.query(LearningProgress).count()
    total_submissions = db.query(LearningSubmission).count()
    total_feedback = db.query(LearningFeedback).count()
    
    # Calculate average scores
    avg_feedback_score = db.query(func.avg(LearningFeedback.rubric_score)).scalar() or 0
    
    # Get completion rates by module
    module_completion = {
        "Business Foundations": 0,
        "Accounting I": 0,
        "Accounting II": 0,
        "Managerial Accounting": 0,
        "Finance & Valuation": 0
    }
    
    # TODO: Calculate actual completion rates based on activities
    
    return {
        "total_students": total_students,
        "total_submissions": total_submissions,
        "total_feedback": total_feedback,
        "average_feedback_score": round(avg_feedback_score, 2),
        "module_completion": module_completion,
        "last_updated": datetime.utcnow().isoformat()
    }

