#!/usr/bin/env python3
"""
Seed full learning content across all available modules.
Creates multiple units and lessons per module, including at least one animated lesson
per module so the student UI always has visible content and animations.
"""

import os
import sys
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from src.api.database import get_db
from src.api.models_learning import LearningContent


def add(db: Session, **kwargs):
    item = LearningContent(**kwargs)
    db.add(item)
    return item


def seed_full_content():
    db = next(get_db())

    # Clear existing content
    db.query(LearningContent).delete()
    db.commit()

    now = datetime.utcnow()

    # Helper to build lessons
    def text_lesson(module_id, unit_id, lesson_id, title, md, order):
        return dict(
            module_id=module_id,
            unit_id=unit_id,
            lesson_id=lesson_id,
            title=title,
            content_type="text",
            content_markdown=md,
            estimated_duration_minutes=10,
            difficulty_level="beginner",
            sort_order=order,
            prerequisites=[],
            tags=["lesson"],
            is_published=True,
            published_at=now,
        )

    def anim_lesson(module_id, unit_id, lesson_id, title, scene_name, order):
        return dict(
            module_id=module_id,
            unit_id=unit_id,
            lesson_id=lesson_id,
            title=title,
            content_type="animation",
            content_markdown=f"Animated scene: {scene_name}",
            estimated_duration_minutes=5,
            difficulty_level="beginner",
            sort_order=order,
            prerequisites=[],
            animation_id=scene_name,
            tags=["animation"],
            is_published=True,
            published_at=now,
        )

    # MODULE: Business Foundations
    bf = [
        text_lesson(
            "business_foundations",
            "intro_to_business",
            "bf_l1_overview",
            "Business Overview",
            "Introduction to business value creation and delivery.",
            1,
        ),
        text_lesson(
            "business_foundations",
            "intro_to_business",
            "bf_l2_functions",
            "Core Functions",
            "Operations, marketing, finance, HR, and strategy.",
            2,
        ),
        anim_lesson(
            "business_foundations",
            "visual_frameworks",
            "bf_l3_bmc_anim",
            "Business Model Canvas Visualization",
            "bmc_visualization",
            3,
        ),
    ]

    # MODULE: Accounting I
    a1 = [
        text_lesson(
            "accounting_1",
            "financial_statements",
            "a1_l1_is_bs_cf",
            "The Three Financial Statements",
            "Income Statement, Balance Sheet, and Cash Flow basics.",
            1,
        ),
        anim_lesson(
            "accounting_1",
            "financial_statements",
            "a1_l2_three_stmt_flow",
            "Three Statement Flow Animation",
            "three_statement_flow",
            2,
        ),
    ]

    # MODULE: Accounting II
    a2 = [
        text_lesson(
            "accounting_2",
            "advanced_topics",
            "a2_l1_ppe_leases",
            "PP&E and Leases",
            "Accounting treatment for PP&E and leases.",
            1,
        ),
        text_lesson(
            "accounting_2",
            "advanced_topics",
            "a2_l2_sbc_deferred_tax",
            "SBC and Deferred Tax",
            "Stock-based compensation and deferred taxes.",
            2,
        ),
    ]

    # MODULE: Managerial Accounting
    ma = [
        text_lesson(
            "managerial_accounting",
            "costing",
            "ma_l1_costing_methods",
            "Costing Methods",
            "Job order, process, and activity-based costing.",
            1,
        ),
        anim_lesson(
            "managerial_accounting",
            "working_capital",
            "ma_l2_wc_anim",
            "Working Capital Visualization",
            "working_capital_analysis",
            2,
        ),
    ]

    # MODULE: Finance & Valuation
    fv = [
        text_lesson(
            "finance_valuation",
            "valuation_basics",
            "fv_l1_time_value",
            "Time Value of Money",
            "Discounting, compounding, and NPV.",
            1,
        ),
        anim_lesson(
            "finance_valuation",
            "valuation_basics",
            "fv_l2_dcf_tree",
            "DCF Tree Animation",
            "dcf_tree",
            2,
        ),
        anim_lesson(
            "finance_valuation",
            "excel_skills",
            "fv_l3_excel_demo",
            "Excel Formula Demo",
            "excel_formula_demo",
            3,
        ),
    ]

    items = bf + a1 + a2 + ma + fv
    for i, data in enumerate(items, start=1):
        add(db, **data)

    db.commit()
    print(f"Seeded {len(items)} learning content items across all modules.")


if __name__ == "__main__":
    seed_full_content()

