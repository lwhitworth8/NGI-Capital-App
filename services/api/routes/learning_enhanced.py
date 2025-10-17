"""
Enhanced Learning Routes - Integrated Learning Center
====================================================

This module provides enhanced learning routes that integrate all the new
features including content management, animations, AI coaching, and validation.

Author: NGI Capital Learning Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime
import logging

from ..database import get_db
from ..models_learning import LearningContent, LearningProgress, LearningSubmission
from ..auth_deps import require_clerk_user as require_auth
# v1: AI coaching and Excel validation moved to v2; remove imports

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/learning/enhanced", tags=["learning_enhanced"])

# Initialize services
# v1: services deferred; keep placeholders to avoid runtime errors
learning_agent = None
ai_coach = None
excel_validator = None

# Pydantic models
class LessonContentRequest(BaseModel):
    lesson_id: str
    content_type: str
    content: str

class CoachingSessionRequest(BaseModel):
    student_id: str
    lesson_id: str
    initial_context: Dict[str, Any] = {}

class FeedbackRequest(BaseModel):
    session_id: str
    submission_content: str
    submission_type: str

class PracticeMaterialRequest(BaseModel):
    session_id: str
    topic: str
    difficulty_level: str = "intermediate"

class ExcelValidationRequest(BaseModel):
    file_path: str

# Content Management Routes
@router.get("/content/{lesson_id}")
async def get_lesson_content(
    lesson_id: str,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """Get detailed lesson content including animations and interactive elements"""
    try:
        # Get lesson content from database
        lesson = db.query(LearningContent).filter(
            LearningContent.lesson_id == lesson_id,
            LearningContent.is_published == True
        ).first()
        
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lesson {lesson_id} not found"
            )
        
        # Get related content (prerequisites, next lessons, etc.)
        prerequisites = db.query(LearningContent).filter(
            LearningContent.lesson_id.in_(lesson.prerequisites),
            LearningContent.is_published == True
        ).all()
        
        next_lessons = db.query(LearningContent).filter(
            LearningContent.prerequisites.contains([lesson_id]),
            LearningContent.is_published == True
        ).all()
        
        # Prepare response
        response = {
            "lesson": {
                "id": lesson.id,
                "lesson_id": lesson.lesson_id,
                "title": lesson.title,
                "content_type": lesson.content_type,
                "content_markdown": lesson.content_markdown,
                "animation_id": lesson.animation_id,
                "interactive_tool_id": lesson.interactive_tool_id,
                "estimated_duration_minutes": lesson.estimated_duration_minutes,
                "difficulty_level": lesson.difficulty_level,
                "tags": lesson.tags
            },
            "prerequisites": [
                {
                    "id": p.id,
                    "lesson_id": p.lesson_id,
                    "title": p.title,
                    "content_type": p.content_type
                }
                for p in prerequisites
            ],
            "next_lessons": [
                {
                    "id": n.id,
                    "lesson_id": n.lesson_id,
                    "title": n.title,
                    "content_type": n.content_type
                }
                for n in next_lessons
            ]
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting lesson content {lesson_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving lesson content: {str(e)}"
        )

@router.post("/content/{lesson_id}/complete")
async def mark_lesson_complete(
    lesson_id: str,
    completion_data: Dict[str, Any],
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """Mark a lesson as complete and update progress"""
    try:
        # Debug logging
        logger.info(f"Lesson completion request for lesson {lesson_id}, user: {user}")
        
        # Get or create progress record
        user_id = user.get("id") or user.get("user_id") or "test_user"
        logger.info(f"Using user_id: {user_id}")
        
        progress = db.query(LearningProgress).filter(
            LearningProgress.user_id == user_id
        ).first()
        
        if not progress:
            progress = LearningProgress(
                user_id=user_id,
                current_lesson_id=lesson_id,
                current_module_id=completion_data.get("module_id"),
                current_unit_id=completion_data.get("unit_id"),
                lessons_completed=[lesson_id],
                total_time_minutes=completion_data.get("time_spent_minutes", 0),
                completion_percentage=completion_data.get("score", 0.0)
            )
            db.add(progress)
        else:
            # Update current lesson and add to completed lessons
            progress.current_lesson_id = lesson_id
            if lesson_id not in (progress.lessons_completed or []):
                progress.lessons_completed = (progress.lessons_completed or []) + [lesson_id]
            progress.total_time_minutes = completion_data.get("time_spent_minutes", progress.total_time_minutes)
            # Update completion percentage if score is provided
            if completion_data.get("score") is not None:
                progress.completion_percentage = completion_data.get("score")
        
        db.commit()
        
        # Trigger confetti animation (this would be handled by the frontend)
        return {
            "success": True,
            "message": "Lesson completed successfully",
            "confetti": True,
            "progress": {
                "lesson_id": lesson_id,
                "completed": True,
                "score": progress.completion_percentage,
                "time_spent": progress.total_time_minutes
            }
        }
        
    except Exception as e:
        logger.error(f"Error marking lesson complete {lesson_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error marking lesson complete: {str(e)}"
        )

# Animation Routes
@router.post("/animations/render")
async def render_animation(
    scene_name: str,
    params: Dict[str, Any] = {},
    user = Depends(require_auth)
):
    """Trigger a Manim animation render"""
    try:
        from scripts.manim_renderer import manim_renderer_service
        
        job_id = await manim_renderer_service.render_scene(scene_name, params)
        
        return {
            "success": True,
            "job_id": job_id,
            "message": "Animation render job queued successfully"
        }
        
    except Exception as e:
        logger.error(f"Error rendering animation {scene_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error rendering animation: {str(e)}"
        )

@router.get("/animations/{job_id}/status")
async def get_animation_status(
    job_id: str,
    user = Depends(require_auth)
):
    """Get the status of an animation render job"""
    try:
        from scripts.manim_renderer import manim_renderer_service
        
        status_info = manim_renderer_service.get_job_status(job_id)
        
        if status_info['status'] == 'not_found':
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Render job {job_id} not found"
            )
        
        return status_info
        
    except Exception as e:
        logger.error(f"Error getting animation status {job_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting animation status: {str(e)}"
        )

# AI Coaching Routes
@router.post("/coaching/session")
async def start_coaching_session(user = Depends(require_auth)):
    raise HTTPException(status_code=status.HTTP_410_GONE, detail="AI coaching is not available in v1")

@router.post("/coaching/feedback")
async def provide_feedback(user = Depends(require_auth)):
    raise HTTPException(status_code=status.HTTP_410_GONE, detail="AI coaching is not available in v1")

@router.post("/coaching/practice")
async def generate_practice_material(user = Depends(require_auth)):
    raise HTTPException(status_code=status.HTTP_410_GONE, detail="AI coaching is not available in v1")

@router.get("/coaching/session/{session_id}/status")
async def get_coaching_session_status(session_id: str, user = Depends(require_auth)):
    raise HTTPException(status_code=status.HTTP_410_GONE, detail="AI coaching is not available in v1")

@router.post("/coaching/session/{session_id}/end")
async def end_coaching_session(session_id: str, user = Depends(require_auth)):
    raise HTTPException(status_code=status.HTTP_410_GONE, detail="AI coaching is not available in v1")

# Excel Validation Routes
@router.post("/validation/excel")
async def validate_excel_file(file: UploadFile = File(...), user = Depends(require_auth)):
    raise HTTPException(status_code=status.HTTP_410_GONE, detail="Excel validation is not available in v1")

# Progress Tracking Routes
@router.get("/progress/{user_id}")
async def get_user_progress(
    user_id: str,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """Get comprehensive progress data for a user"""
    try:
        # Use the same user ID logic as lesson completion
        actual_user_id = user.get("id") or user.get("user_id") or "test_user"
        logger.info(f"Progress query for user_id: {actual_user_id} (from URL: {user_id})")
        
        # Get all progress records for the user
        progress_records = db.query(LearningProgress).filter(
            LearningProgress.user_id == actual_user_id
        ).all()
        
        # Debug logging
        logger.info(f"Progress records for user {user_id}: {len(progress_records)}")
        for p in progress_records:
            logger.info(f"Progress record: user_id={p.user_id}, lessons_completed={p.lessons_completed}, completion_percentage={p.completion_percentage}")
        
        # Calculate statistics
        total_lessons = len(progress_records)
        completed_lessons = len([p for p in progress_records if p.lessons_completed and len(p.lessons_completed) > 0])
        total_time = sum(p.total_time_minutes or 0 for p in progress_records)
        # Note: No score field in LearningProgress model, using completion percentage instead
        average_score = sum(p.completion_percentage or 0 for p in progress_records) / max(completed_lessons, 1)
        
        # Get recent activity
        recent_activity = sorted(
            progress_records,
            key=lambda x: x.updated_at or x.created_at,
            reverse=True
        )[:10]
        
        return {
            "success": True,
            "progress": {
                "total_lessons": total_lessons,
                "completed_lessons": completed_lessons,
                "completion_rate": completed_lessons / max(total_lessons, 1) * 100,
                "total_time_minutes": total_time,
                "average_score": round(average_score, 2),
                "recent_activity": [
                    {
                        "lesson_id": p.current_lesson_id,
                        "module_id": p.current_module_id,
                        "unit_id": p.current_unit_id,
                        "completed": bool(p.lessons_completed),
                        "score": p.completion_percentage,
                        "time_spent": p.total_time_minutes,
                        "updated_at": p.updated_at.isoformat() if p.updated_at else None
                    }
                    for p in recent_activity
                ]
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting user progress {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting user progress: {str(e)}"
        )

# Analytics Routes
@router.get("/analytics/overview")
async def get_learning_analytics(
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """Get learning analytics overview"""
    try:
        # Get total users
        total_users = db.query(LearningProgress.user_id).distinct().count()
        
        # Get total lessons
        total_lessons = db.query(LearningContent).filter(
            LearningContent.is_published == True
        ).count()
        
        # Get completion rates by module
        module_stats = {}
        modules = db.query(LearningContent.module_id).distinct().all()
        
        for module in modules:
            module_id = module[0]
            if module_id:
                total_module_lessons = db.query(LearningContent).filter(
                    LearningContent.module_id == module_id,
                    LearningContent.is_published == True
                ).count()
                
                completed_module_lessons = db.query(LearningProgress).filter(
                    LearningProgress.current_module_id == module_id,
                    LearningProgress.lessons_completed.isnot(None)
                ).count()
                
                module_stats[module_id] = {
                    "total_lessons": total_module_lessons,
                    "completed_lessons": completed_module_lessons,
                    "completion_rate": completed_module_lessons / max(total_module_lessons, 1) * 100
                }
        
        return {
            "success": True,
            "analytics": {
                "total_users": total_users,
                "total_lessons": total_lessons,
                "module_stats": module_stats,
                "active_sessions": 0
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting learning analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting learning analytics: {str(e)}"
        )
