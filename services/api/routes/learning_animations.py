"""
API routes for NGI Learning Animations
Handles Manim animation rendering and video streaming
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
import os
import asyncio
from pathlib import Path

from ..database import get_db
try:
    from ..auth_deps import require_clerk_user as require_auth
except ImportError:
    # Fallback for development
    def require_auth():
        class MockUser:
            id = "dev_user_123"
            email = "dev@ngicapital.com"
        return MockUser()

# Try to use real Manim render service, fall back to a lightweight mock
try:
    # Prefer the real async render service if available
    from scripts.manim_renderer import render_service as _real_render_service  # type: ignore
    render_service = _real_render_service
except Exception:
    # Minimal in-memory mock that matches the real interface used by routes
    class MockRenderService:
        def __init__(self):
            self._jobs: Dict[str, Dict] = {}

        async def render_scene(self, scene_name: str, params: Dict = None) -> str:
            import uuid
            from datetime import datetime
            job_id = str(uuid.uuid4())
            self._jobs[job_id] = {
                "job_id": job_id,
                "scene_name": scene_name,
                "status": "queued",
                "progress": 0,
                "created_at": datetime.utcnow().isoformat(),
                "completed_at": None,
                "output_file": None,
                "error_message": None,
            }
            # Immediately mark as completed in mock
            self._jobs[job_id]["status"] = "completed"
            self._jobs[job_id]["progress"] = 100
            self._jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()
            return job_id

        async def get_job_status(self, job_id: str) -> Optional[Dict]:
            return self._jobs.get(job_id)

        async def get_queue_status(self) -> Dict:
            return {
                "queue_size": 0,
                "total_jobs": len(self._jobs),
                "active_jobs": 0,
                "completed_jobs": len([j for j in self._jobs.values() if j["status"] == "completed"]),
                "failed_jobs": len([j for j in self._jobs.values() if j["status"] == "failed"]),
            }

    render_service = MockRenderService()

router = APIRouter(prefix="/api/learning/animations", tags=["learning_animations"])


# =============================================================================
# PYDANTIC SCHEMAS
# =============================================================================

class RenderRequest(BaseModel):
    """Request schema for rendering animations"""
    scene_name: str = Field(..., description="Name of the Manim scene to render")
    params: Dict = Field(default_factory=dict, description="Parameters for the scene")
    quality: str = Field("medium", description="Render quality: low, medium, high")
    preview: bool = Field(True, description="Whether to show preview")


class RenderResponse(BaseModel):
    """Response schema for render requests"""
    job_id: str
    scene_name: str
    status: str
    message: str
    estimated_duration_seconds: Optional[int] = None


class RenderStatusResponse(BaseModel):
    """Response schema for render status"""
    job_id: str
    scene_name: str
    status: str  # 'queued', 'rendering', 'completed', 'failed'
    progress: int  # 0-100
    created_at: str
    completed_at: Optional[str] = None
    output_file: Optional[str] = None
    error_message: Optional[str] = None


class QueueStatusResponse(BaseModel):
    """Response schema for queue status"""
    queue_size: int
    total_jobs: int
    active_jobs: int
    completed_jobs: int
    failed_jobs: int


# =============================================================================
# ANIMATION ENDPOINTS
# =============================================================================

@router.post("/render", response_model=RenderResponse)
async def render_animation(
    request: RenderRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Queue a Manim animation for rendering.
    Returns immediately with job ID for status tracking.
    """
    try:
        # Queue the render job
        job_id = await render_service.render_scene(
            scene_name=request.scene_name,
            params=request.params
        )
        
        # Estimate duration based on scene complexity
        duration_estimates = {
            "bmc_visualization": 30,
            "three_statement_flow": 45,
            "dcf_tree": 60,
            "revenue_qxp": 30,
            "excel_formula_demo": 40
        }
        
        estimated_duration = duration_estimates.get(request.scene_name, 60)
        
        return RenderResponse(
            job_id=job_id,
            scene_name=request.scene_name,
            status="queued",
            message=f"Animation queued for rendering. Estimated duration: {estimated_duration} seconds.",
            estimated_duration_seconds=estimated_duration
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue animation: {str(e)}"
        )


@router.get("/status/{job_id}", response_model=RenderStatusResponse)
async def get_render_status(
    job_id: str,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Get the status of a render job.
    """
    status_data = await render_service.get_job_status(job_id)
    
    if not status_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Render job {job_id} not found"
        )
    
    return RenderStatusResponse(**status_data)


@router.get("/queue/status", response_model=QueueStatusResponse)
async def get_queue_status(
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Get current render queue status.
    """
    queue_status = await render_service.get_queue_status()
    return QueueStatusResponse(**queue_status)


@router.get("/{animation_id}/video")
async def stream_animation_video(
    animation_id: str,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Stream a rendered animation video file.
    Supports range requests for video seeking.
    """
    # Construct file path
    video_path = Path("uploads/learning_animations/rendered") / f"{animation_id}.mp4"
    
    if not video_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Animation video {animation_id} not found"
        )
    
    # Return file response with proper headers for video streaming
    return FileResponse(
        path=str(video_path),
        media_type="video/mp4",
        filename=f"{animation_id}.mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600"
        }
    )


@router.get("/{animation_id}/thumbnail")
async def get_animation_thumbnail(
    animation_id: str,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Get a thumbnail image for the animation.
    """
    # For now, return a placeholder or generate thumbnail from video
    # In production, you'd generate thumbnails during rendering
    thumbnail_path = Path("uploads/learning_animations/thumbnails") / f"{animation_id}.jpg"
    
    if not thumbnail_path.exists():
        # Return a default thumbnail or generate one
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Thumbnail for animation {animation_id} not found"
        )
    
    return FileResponse(
        path=str(thumbnail_path),
        media_type="image/jpeg",
        filename=f"{animation_id}_thumb.jpg"
    )


@router.get("/scenes/available")
async def get_available_scenes(
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Get list of available Manim scenes for rendering.
    """
    scenes_dir = Path("scripts/manim_scenes")
    
    if not scenes_dir.exists():
        return {"scenes": [], "message": "No scenes directory found"}
    
    scenes = []
    for scene_file in scenes_dir.glob("*.py"):
        scene_name = scene_file.stem
        scenes.append({
            "scene_name": scene_name,
            "file_path": str(scene_file),
            "description": f"Manim scene: {scene_name}",
            "estimated_duration": 60  # Default estimate
        })
    
    return {
        "scenes": scenes,
        "total_scenes": len(scenes)
    }


@router.post("/scenes/initialize")
async def initialize_scenes(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Initialize all core Manim scenes.
    Admin only - requires partner access.
    """
    # TODO: Add partner access check
    # if not user.get("is_partner"):
    #     raise HTTPException(status_code=403, detail="Partner access required")
    
    try:
        # Import and run scene initialization
        import sys
        sys.path.append(str(Path(__file__).parent.parent.parent / "scripts"))
        from manim_renderer import initialize_manim_scenes
        
        # Run initialization in background
        def init_scenes():
            scenes = initialize_manim_scenes()
            return scenes
        
        # For now, run synchronously (in production, use background task)
        scenes = init_scenes()
        
        return {
            "status": "success",
            "message": f"Initialized {len(scenes)} Manim scenes",
            "scenes": [str(s) for s in scenes]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize scenes: {str(e)}"
        )


@router.delete("/{animation_id}")
async def delete_animation(
    animation_id: str,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Delete a rendered animation and its files.
    Admin only - requires partner access.
    """
    # TODO: Add partner access check
    # if not user.get("is_partner"):
    #     raise HTTPException(status_code=403, detail="Partner access required")
    
    try:
        # Delete video file
        video_path = Path("uploads/learning_animations/rendered") / f"{animation_id}.mp4"
        if video_path.exists():
            video_path.unlink()
        
        # Delete thumbnail file
        thumbnail_path = Path("uploads/learning_animations/thumbnails") / f"{animation_id}.jpg"
        if thumbnail_path.exists():
            thumbnail_path.unlink()
        
        return {
            "status": "success",
            "message": f"Animation {animation_id} deleted"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete animation: {str(e)}"
        )


# =============================================================================
# HEALTH CHECK
# =============================================================================

@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint for learning animations module.
    """
    try:
        # Check if Manim is available
        import subprocess
        result = subprocess.run(["manim", "--version"], capture_output=True, text=True)
        manim_available = result.returncode == 0
        
        # Check directories
        rendered_dir = Path("uploads/learning_animations/rendered")
        scenes_dir = Path("scripts/manim_scenes")
        
        return {
            "status": "healthy" if manim_available else "degraded",
            "module": "learning_animations",
            "manim_available": manim_available,
            "manim_version": result.stdout.strip() if manim_available else None,
            "rendered_dir_exists": rendered_dir.exists(),
            "scenes_dir_exists": scenes_dir.exists(),
            "queue_status": await render_service.get_queue_status()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}"
        )
