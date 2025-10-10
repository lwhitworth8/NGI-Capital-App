#!/usr/bin/env python3
"""
Seed a demo lesson with an animation_id so the student app can render animations.
Adds a Business Foundations lesson: "Business Model Canvas Visualization" using scene 'bmc_visualization'.
"""

import os
import sys
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from src.api.database import get_db
from src.api.models_learning import LearningContent


def seed_demo_animation():
    db = next(get_db())

    lesson_id = "lesson_bmc_visualization"

    # Remove existing demo lesson if present
    db.query(LearningContent).filter(LearningContent.lesson_id == lesson_id).delete()
    db.commit()

    demo = LearningContent(
        module_id="business_foundations",
        unit_id="visual_frameworks",
        lesson_id=lesson_id,
        title="Business Model Canvas Visualization",
        content_type="animation",
        content_markdown=(
            "This lesson uses a Manim animation to walk through the nine blocks "
            "of the Business Model Canvas."
        ),
        estimated_duration_minutes=5,
        difficulty_level="beginner",
        sort_order=100,
        prerequisites=[],
        animation_id="bmc_visualization",
        interactive_tool_id=None,
        author="NGI Learning",
        tags=["bmc", "visualization", "framework"],
        is_published=True,
        published_at=datetime.utcnow(),
    )

    db.add(demo)
    db.commit()
    print("Seeded demo animation lesson:", demo.lesson_id)


if __name__ == "__main__":
    seed_demo_animation()

