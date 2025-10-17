"""
API routes for NGI Learning Content Management
Handles curriculum content, lessons, and learning materials
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

from ..database import get_db
from ..models_learning import LearningContent
import os
try:
    from ..auth_deps import require_clerk_user as require_auth
except ImportError:
    require_auth = None  # type: ignore

# In dev, allow bypassing auth for learning content when OPEN_NON_ACCOUNTING enabled
_DEV_OPEN = str(os.getenv('OPEN_NON_ACCOUNTING', '0')).strip().lower() in ('1', 'true', 'yes')
if _DEV_OPEN or require_auth is None:
    def require_auth():  # type: ignore
        class MockUser:
            id = "dev_user_123"
            email = "dev@ngicapital.com"
        return MockUser()

router = APIRouter(prefix="/api/learning/content", tags=["learning_content"])


# =============================================================================
# PYDANTIC SCHEMAS
# =============================================================================

class ContentResponse(BaseModel):
    """Response schema for learning content"""
    id: int
    module_id: str
    unit_id: Optional[str] = None
    lesson_id: Optional[str] = None
    title: str
    content_type: str
    content_markdown: Optional[str] = None
    content_url: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    difficulty_level: Optional[str] = None
    sort_order: int
    prerequisites: List[str] = []
    animation_id: Optional[str] = None
    interactive_tool_id: Optional[str] = None
    author: Optional[str] = None
    tags: List[str] = []
    is_published: bool
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class ContentCreateRequest(BaseModel):
    """Request schema for creating content"""
    module_id: str = Field(..., description="Module identifier")
    unit_id: Optional[str] = Field(None, description="Unit identifier")
    lesson_id: Optional[str] = Field(None, description="Lesson identifier")
    title: str = Field(..., description="Content title")
    content_type: str = Field(..., description="Type of content")
    content_markdown: Optional[str] = Field(None, description="Markdown content")
    content_url: Optional[str] = Field(None, description="External content URL")
    estimated_duration_minutes: Optional[int] = Field(None, description="Estimated duration")
    difficulty_level: Optional[str] = Field(None, description="Difficulty level")
    sort_order: int = Field(0, description="Sort order within module/unit")
    prerequisites: List[str] = Field(default_factory=list, description="Prerequisite lesson IDs")
    animation_id: Optional[str] = Field(None, description="Associated animation ID")
    interactive_tool_id: Optional[str] = Field(None, description="Interactive tool ID")
    author: Optional[str] = Field(None, description="Content author")
    tags: List[str] = Field(default_factory=list, description="Content tags")
    is_published: bool = Field(True, description="Published status")


class ContentUpdateRequest(BaseModel):
    """Request schema for updating content"""
    title: Optional[str] = None
    content_type: Optional[str] = None
    content_markdown: Optional[str] = None
    content_url: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    difficulty_level: Optional[str] = None
    sort_order: Optional[int] = None
    prerequisites: Optional[List[str]] = None
    animation_id: Optional[str] = None
    interactive_tool_id: Optional[str] = None
    author: Optional[str] = None
    tags: Optional[List[str]] = None
    is_published: Optional[bool] = None


# =============================================================================
# CONTENT ENDPOINTS
# =============================================================================

@router.get("/modules", response_model=List[ContentResponse])
async def get_modules(
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Get all learning modules with their basic information.
    Returns only module-level content (no units or lessons).
    """
    modules = db.query(LearningContent).filter(
        LearningContent.module_id.isnot(None),
        LearningContent.unit_id.is_(None),
        LearningContent.lesson_id.is_(None),
        LearningContent.is_published == True
    ).order_by(LearningContent.sort_order).all()
    
    return modules


@router.get("/modules/{module_id}", response_model=List[ContentResponse])
async def get_module_content(
    module_id: str,
    include_units: bool = Query(True, description="Include unit-level content"),
    include_lessons: bool = Query(True, description="Include lesson-level content"),
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Get all content for a specific module.
    Can include units and lessons based on query parameters.
    """
    query = db.query(LearningContent).filter(
        LearningContent.module_id == module_id,
        LearningContent.is_published == True
    )
    
    if not include_units:
        query = query.filter(LearningContent.unit_id.is_(None))
    
    if not include_lessons:
        query = query.filter(LearningContent.lesson_id.is_(None))
    
    content = query.order_by(
        LearningContent.sort_order,
        LearningContent.unit_id,
        LearningContent.lesson_id
    ).all()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No content found for module '{module_id}'"
        )
    
    return content


@router.get("/units/{unit_id}", response_model=List[ContentResponse])
async def get_unit_content(
    unit_id: str,
    include_lessons: bool = Query(True, description="Include lesson-level content"),
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Get all content for a specific unit.
    Can include lessons based on query parameters.
    """
    query = db.query(LearningContent).filter(
        LearningContent.unit_id == unit_id,
        LearningContent.is_published == True
    )
    
    if not include_lessons:
        query = query.filter(LearningContent.lesson_id.is_(None))
    
    content = query.order_by(
        LearningContent.sort_order,
        LearningContent.lesson_id
    ).all()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No content found for unit '{unit_id}'"
        )
    
    return content


@router.get("/lessons/{lesson_id}", response_model=ContentResponse)
async def get_lesson(
    lesson_id: str,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Get a specific lesson by ID.
    """
    lesson = db.query(LearningContent).filter(
        LearningContent.lesson_id == lesson_id,
        LearningContent.is_published == True
    ).first()
    
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson '{lesson_id}' not found"
        )
    
    return lesson


@router.get("/search")
async def search_content(
    q: str = Query(..., description="Search query"),
    module_id: Optional[str] = Query(None, description="Filter by module"),
    content_type: Optional[str] = Query(None, description="Filter by content type"),
    difficulty_level: Optional[str] = Query(None, description="Filter by difficulty"),
    tags: Optional[str] = Query(None, description="Filter by tags (comma-separated)"),
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Search learning content by title, content, or tags.
    """
    query = db.query(LearningContent).filter(
        LearningContent.is_published == True
    )
    
    # Text search
    if q:
        query = query.filter(
            LearningContent.title.ilike(f"%{q}%") |
            LearningContent.content_markdown.ilike(f"%{q}%")
        )
    
    # Filters
    if module_id:
        query = query.filter(LearningContent.module_id == module_id)
    
    if content_type:
        query = query.filter(LearningContent.content_type == content_type)
    
    if difficulty_level:
        query = query.filter(LearningContent.difficulty_level == difficulty_level)
    
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",")]
        for tag in tag_list:
            query = query.filter(LearningContent.tags.contains([tag]))
    
    content = query.order_by(LearningContent.sort_order).all()
    
    return {
        "query": q,
        "filters": {
            "module_id": module_id,
            "content_type": content_type,
            "difficulty_level": difficulty_level,
            "tags": tags
        },
        "count": len(content),
        "results": content
    }


@router.get("/curriculum/overview")
async def get_curriculum_overview(
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Get a high-level overview of the entire curriculum.
    Shows modules, units, and lesson counts.
    """
    # Get all published content
    content = db.query(LearningContent).filter(
        LearningContent.is_published == True
    ).all()
    
    # Organize by module
    modules = {}
    for item in content:
        module_id = item.module_id
        if module_id not in modules:
            modules[module_id] = {
                "module_id": module_id,
                "units": {},
                "total_lessons": 0,
                "total_duration_minutes": 0
            }
        
        # Count units
        if item.unit_id:
            unit_id = item.unit_id
            if unit_id not in modules[module_id]["units"]:
                modules[module_id]["units"][unit_id] = {
                    "unit_id": unit_id,
                    "lessons": 0,
                    "duration_minutes": 0
                }
            
            # Count lessons
            if item.lesson_id:
                modules[module_id]["units"][unit_id]["lessons"] += 1
                modules[module_id]["total_lessons"] += 1
                
                if item.estimated_duration_minutes:
                    modules[module_id]["units"][unit_id]["duration_minutes"] += item.estimated_duration_minutes
                    modules[module_id]["total_duration_minutes"] += item.estimated_duration_minutes
    
    # Convert to list format
    curriculum = []
    for module_id, module_data in modules.items():
        curriculum.append({
            "module_id": module_id,
            "units_count": len(module_data["units"]),
            "lessons_count": module_data["total_lessons"],
            "total_duration_minutes": module_data["total_duration_minutes"],
            "units": list(module_data["units"].values())
        })
    
    return {
        "curriculum": curriculum,
        "total_modules": len(modules),
        "total_units": sum(len(m["units"]) for m in modules.values()),
        "total_lessons": sum(m["total_lessons"] for m in modules.values()),
        "total_duration_minutes": sum(m["total_duration_minutes"] for m in modules.values())
    }


# =============================================================================
# ADMIN ENDPOINTS (Content Management)
# =============================================================================

@router.post("/", response_model=ContentResponse)
async def create_content(
    content: ContentCreateRequest,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Create new learning content.
    Admin only - requires partner access.
    """
    # TODO: Add partner access check
    # if not user.get("is_partner"):
    #     raise HTTPException(status_code=403, detail="Partner access required")
    
    new_content = LearningContent(
        module_id=content.module_id,
        unit_id=content.unit_id,
        lesson_id=content.lesson_id,
        title=content.title,
        content_type=content.content_type,
        content_markdown=content.content_markdown,
        content_url=content.content_url,
        estimated_duration_minutes=content.estimated_duration_minutes,
        difficulty_level=content.difficulty_level,
        sort_order=content.sort_order,
        prerequisites=content.prerequisites,
        animation_id=content.animation_id,
        interactive_tool_id=content.interactive_tool_id,
        author=content.author,
        tags=content.tags,
        is_published=content.is_published,
        published_at=datetime.utcnow() if content.is_published else None
    )
    
    db.add(new_content)
    db.commit()
    db.refresh(new_content)
    
    return new_content


@router.put("/{content_id}", response_model=ContentResponse)
async def update_content(
    content_id: int,
    updates: ContentUpdateRequest,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Update existing learning content.
    Admin only - requires partner access.
    """
    # TODO: Add partner access check
    # if not user.get("is_partner"):
    #     raise HTTPException(status_code=403, detail="Partner access required")
    
    content = db.query(LearningContent).filter(
        LearningContent.id == content_id
    ).first()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Content with ID {content_id} not found"
        )
    
    # Update fields
    update_data = updates.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(content, key, value)
    
    # Update published_at if publishing
    if updates.is_published and not content.published_at:
        content.published_at = datetime.utcnow()
    
    content.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(content)
    
    return content


@router.delete("/{content_id}")
async def delete_content(
    content_id: int,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Delete learning content.
    Admin only - requires partner access.
    """
    # TODO: Add partner access check
    # if not user.get("is_partner"):
    #     raise HTTPException(status_code=403, detail="Partner access required")
    
    content = db.query(LearningContent).filter(
        LearningContent.id == content_id
    ).first()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Content with ID {content_id} not found"
        )
    
    db.delete(content)
    db.commit()
    
    return {"status": "success", "message": f"Content {content_id} deleted"}


# =============================================================================
# HEALTH CHECK
# =============================================================================

@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint for learning content module.
    """
    try:
        total_content = db.query(LearningContent).count()
        published_content = db.query(LearningContent).filter(
            LearningContent.is_published == True
        ).count()
        
        return {
            "status": "healthy",
            "module": "learning_content",
            "total_content_items": total_content,
            "published_content_items": published_content,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}"
        )
