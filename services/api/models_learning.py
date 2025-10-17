"""
SQLAlchemy models for NGI Learning Module
Educational platform with banker-grade financial modeling curriculum
Following specifications from MarkdownFiles/NGILearning/Appendix.DatabaseSchema.md
Last Updated: October 2, 2025
"""

from datetime import datetime, date
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, DateTime, Date, Boolean, Text, 
    ForeignKey, CheckConstraint, Index, UniqueConstraint, Float, JSON
)
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func

# Import shared Base from existing models
from .models import Base


# =============================================================================
# LEARNING MODULE MODELS
# =============================================================================

class LearningCompany(Base):
    """
    Curated list of 10 companies for the learning module.
    Companies selected for clean driver modeling (Q x P x Take-rate).
    """
    __tablename__ = 'learning_companies'
    
    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Company Identification
    ticker = Column(String(10), unique=True, nullable=False, index=True)
    company_name = Column(String(255), nullable=False)
    
    # Industry Classification
    industry = Column(String(100))  # e.g., 'Automotive', 'Retail'
    sub_industry = Column(String(100))  # e.g., 'Electric Vehicles'
    
    # Company Details
    description = Column(Text)  # Brief company overview
    headquarters = Column(String(100))  # City, State/Country
    fiscal_year_end = Column(String(10))  # e.g., 'December 31'
    
    # SEC & IR Information
    sec_cik = Column(String(20))  # SEC Central Index Key
    ir_website_url = Column(Text)  # Investor relations URL
    
    # Revenue Model Information
    revenue_model_type = Column(String(50))  # 'QxP', 'QxPxT', 'Subscription'
    revenue_driver_notes = Column(Text)  # Description of Q, P, T drivers
    
    # Data Quality & Status
    data_quality_score = Column(Integer)  # 1-10 (clean financials)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_ingested_at = Column(DateTime)  # Last time data was fetched
    
    # Relationships
    packages = relationship(
        "LearningPackage",
        back_populates="company",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    submissions = relationship(
        "LearningSubmission",
        back_populates="company",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    leaderboard_entries = relationship(
        "LearningLeaderboard",
        back_populates="company",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint('data_quality_score >= 1 AND data_quality_score <= 10', 
                       name='valid_data_quality_score'),
        Index('idx_learning_companies_active', 'is_active'),
    )
    
    def __repr__(self):
        return f"<LearningCompany(ticker='{self.ticker}', company_name='{self.company_name}')>"


class LearningPackage(Base):
    """
    Excel banker packages generated for each company.
    Versioned with auto-generation from ingested SEC/IR data.
    """
    __tablename__ = 'learning_packages'
    
    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Foreign Keys
    company_id = Column(
        Integer,
        ForeignKey('learning_companies.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Package Information
    version = Column(Integer, nullable=False)  # Incremental version number
    package_date = Column(Date, nullable=False)  # Date of package generation
    file_path = Column(Text, nullable=False)  # Path to .xlsx file
    file_size_bytes = Column(Integer)  # File size for storage tracking
    
    # Validation Status
    validation_status = Column(String(50), default='pending')  # pending, passed, failed
    validation_errors = Column(JSON)  # JSON array of validation errors
    
    # Metadata
    ingestion_run_id = Column(String(100))  # Reference to ingestion job
    generated_by_user_id = Column(String(100))  # Admin user who triggered generation
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    company = relationship("LearningCompany", back_populates="packages")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('company_id', 'version', name='unique_company_version'),
        Index('idx_learning_packages_company', 'company_id'),
    )
    
    def __repr__(self):
        return f"<LearningPackage(company_id={self.company_id}, version={self.version})>"


class LearningProgress(Base):
    """
    Student progress tracking (1:1 with students).
    Tracks streaks, milestones, and overall completion.
    """
    __tablename__ = 'learning_progress'
    
    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Foreign Keys
    user_id = Column(String(100), nullable=False, unique=True, index=True)  # Clerk user ID
    
    # Selected Company
    selected_company_id = Column(
        Integer,
        ForeignKey('learning_companies.id', ondelete='SET NULL')
    )
    selected_at = Column(DateTime)
    
    # Progress Tracking
    current_module_id = Column(String(100))  # e.g., 'module_2_accounting_1'
    current_unit_id = Column(String(100))  # e.g., 'unit_1_1_income_statement'
    current_lesson_id = Column(String(100))  # e.g., 'lesson_revenue_recognition'
    
    # Completion Status
    modules_completed = Column(JSON, default=list)  # List of completed module IDs
    units_completed = Column(JSON, default=list)  # List of completed unit IDs
    lessons_completed = Column(JSON, default=list)  # List of completed lesson IDs
    activities_completed = Column(JSON, default=list)  # ['a1_drivers_map', 'a2_wc_debt', ...]
    
    completion_percentage = Column(Float, default=0.0)  # 0.0 to 100.0
    
    # Streak System
    current_streak_days = Column(Integer, default=0)
    longest_streak_days = Column(Integer, default=0)
    last_activity_date = Column(Date)
    
    # Time Tracking
    total_time_minutes = Column(Integer, default=0)  # Total time invested
    
    # Milestones
    milestones_achieved = Column(JSON, default=list)  # List of milestone IDs
    
    # Capstone Status
    capstone_submitted = Column(Boolean, default=False)
    capstone_submitted_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    selected_company = relationship("LearningCompany")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('completion_percentage >= 0 AND completion_percentage <= 100',
                       name='valid_completion_percentage'),
        CheckConstraint('current_streak_days >= 0', name='valid_current_streak'),
        CheckConstraint('longest_streak_days >= 0', name='valid_longest_streak'),
        Index('idx_learning_progress_user', 'user_id'),
    )
    
    def __repr__(self):
        return f"<LearningProgress(user_id='{self.user_id}', completion={self.completion_percentage}%)>"


class LearningSubmission(Base):
    """
    Student activity submissions with versioning.
    Tracks Excel models, memos, and decks for each activity.
    """
    __tablename__ = 'learning_submissions'
    
    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Foreign Keys
    user_id = Column(String(100), nullable=False, index=True)  # Clerk user ID
    company_id = Column(
        Integer,
        ForeignKey('learning_companies.id', ondelete='CASCADE'),
        nullable=False
    )
    
    # Activity Information
    activity_id = Column(String(100), nullable=False)  # e.g., 'a1_drivers_map', 'capstone'
    version = Column(Integer, nullable=False, default=1)  # Submission version
    
    # File Information
    file_path = Column(Text, nullable=False)  # Path to uploaded .xlsx
    file_type = Column(String(50), nullable=False)  # 'excel', 'memo', 'deck'
    file_size_bytes = Column(Integer)
    
    # Submission Details
    submission_notes = Column(Text)  # Student's notes/comments
    
    # Validation Status
    validator_status = Column(String(50), default='pending')  # pending, passed, failed
    validator_errors = Column(JSON)  # JSON array of validation errors
    validator_warnings = Column(JSON)  # JSON array of warnings
    
    # AI Detection (GPTZero)
    ai_detection_score = Column(Float)  # 0.0 to 100.0
    ai_detection_flagged = Column(Boolean, default=False)  # Flagged if > 85%
    
    # Timestamps
    submitted_at = Column(DateTime, default=func.now(), nullable=False)
    validated_at = Column(DateTime)
    
    # Relationships
    company = relationship("LearningCompany", back_populates="submissions")
    feedback = relationship(
        "LearningFeedback",
        back_populates="submission",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    
    # Constraints
    __table_args__ = (
        Index('idx_learning_submissions_user', 'user_id'),
        Index('idx_learning_submissions_company', 'company_id'),
        Index('idx_learning_submissions_activity', 'activity_id'),
        UniqueConstraint('user_id', 'activity_id', 'company_id', 'version',
                        name='unique_user_activity_version'),
    )
    
    def __repr__(self):
        return f"<LearningSubmission(user_id='{self.user_id}', activity='{self.activity_id}', v{self.version})>"


class LearningFeedback(Base):
    """
    AI-powered feedback for student submissions.
    OpenAI GPT-3.5-Turbo coaching with rubric-based scoring.
    """
    __tablename__ = 'learning_feedback'
    
    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Foreign Keys
    submission_id = Column(
        Integer,
        ForeignKey('learning_submissions.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Feedback Content
    feedback_text = Column(Text, nullable=False)  # AI-generated feedback
    rubric_score = Column(Float)  # 0.0 to 100.0
    rubric_breakdown = Column(JSON)  # Detailed rubric scores by category
    
    # AI Model Information
    model_used = Column(String(100), default='gpt-3.5-turbo')  # OpenAI model
    openai_tokens_input = Column(Integer)  # Tokens used for input
    openai_tokens_output = Column(Integer)  # Tokens used for output
    openai_cost = Column(Float)  # Cost of API call
    
    # Moderation
    is_flagged = Column(Boolean, default=False)  # Flagged by admin for review
    flagged_reason = Column(Text)  # Reason for flagging
    admin_override = Column(Text)  # Admin's adjusted feedback
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False)
    moderated_at = Column(DateTime)
    
    # Relationships
    submission = relationship("LearningSubmission", back_populates="feedback")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('rubric_score >= 0 AND rubric_score <= 100',
                       name='valid_rubric_score'),
        Index('idx_learning_feedback_submission', 'submission_id'),
    )
    
    def __repr__(self):
        return f"<LearningFeedback(submission_id={self.submission_id}, score={self.rubric_score})>"


class LearningLeaderboard(Base):
    """
    Anonymized leaderboard for price target submissions.
    Only visible after capstone completion.
    """
    __tablename__ = 'learning_leaderboard'
    
    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Foreign Keys
    user_id = Column(String(100), nullable=False, index=True)  # Clerk user ID
    company_id = Column(
        Integer,
        ForeignKey('learning_companies.id', ondelete='CASCADE'),
        nullable=False
    )
    
    # Valuation Results
    price_target = Column(Float, nullable=False)  # DCF price target
    current_price = Column(Float, nullable=False)  # Stock price at submission
    upside_downside_pct = Column(Float)  # % upside/downside
    
    # Methodology
    dcf_price = Column(Float)  # DCF-based price
    comps_price = Column(Float)  # Comps-based price
    valuation_methodology = Column(Text)  # Brief methodology notes
    
    # Anonymization
    anonymized_display_name = Column(String(100))  # e.g., "Analyst #42"
    
    # Timestamps
    submitted_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    company = relationship("LearningCompany", back_populates="leaderboard_entries")
    
    # Constraints
    __table_args__ = (
        Index('idx_learning_leaderboard_user', 'user_id'),
        Index('idx_learning_leaderboard_company', 'company_id'),
    )
    
    def __repr__(self):
        return f"<LearningLeaderboard(company_id={self.company_id}, price_target=${self.price_target})>"


class LearningTelemetry(Base):
    """
    Telemetry events for analytics and insights.
    Tracks user interactions, time spent, and learning patterns.
    """
    __tablename__ = 'learning_telemetry'
    
    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # User Information
    user_id = Column(String(100), nullable=False, index=True)  # Clerk user ID
    
    # Event Information
    event_type = Column(String(100), nullable=False)  # e.g., 'module_started', 'lesson_completed'
    event_category = Column(String(50))  # 'navigation', 'progress', 'submission', 'feedback'
    
    # Event Payload
    payload = Column(JSON)  # Flexible JSON payload for event data
    
    # Context
    session_id = Column(String(100))  # Browser session ID
    page_url = Column(Text)  # Current page URL
    referrer_url = Column(Text)  # Referrer page URL
    
    # Device & Browser
    user_agent = Column(Text)  # Browser user agent
    ip_address = Column(String(45))  # IPv4 or IPv6 (anonymized for privacy)
    
    # Timestamps
    timestamp = Column(DateTime, default=func.now(), nullable=False, index=True)
    
    # Constraints
    __table_args__ = (
        Index('idx_learning_telemetry_user_time', 'user_id', 'timestamp'),
        Index('idx_learning_telemetry_event_type', 'event_type'),
    )
    
    def __repr__(self):
        return f"<LearningTelemetry(user_id='{self.user_id}', event='{self.event_type}')>"


class LearningContent(Base):
    """
    Learning content storage (modules, units, lessons).
    Flexible content management system for curriculum.
    """
    __tablename__ = 'learning_content'
    
    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Content Hierarchy
    module_id = Column(String(100), nullable=False, index=True)  # e.g., 'module_1_foundations'
    unit_id = Column(String(100), index=True)  # e.g., 'unit_1_1_business_model_canvas'
    lesson_id = Column(String(100), index=True)  # e.g., 'lesson_bmc_introduction'
    
    # Content Information
    title = Column(String(255), nullable=False)
    content_type = Column(String(50), nullable=False)  # 'text', 'video', 'animation', 'interactive'
    content_markdown = Column(Text)  # Markdown content
    content_url = Column(Text)  # URL to external content (animations, videos)
    
    # Duration & Difficulty
    estimated_duration_minutes = Column(Integer)
    difficulty_level = Column(String(50))  # 'beginner', 'intermediate', 'advanced'
    
    # Ordering & Navigation
    sort_order = Column(Integer, nullable=False, default=0)
    prerequisites = Column(JSON, default=list)  # List of prerequisite lesson IDs
    
    # Animation Integration
    animation_id = Column(String(100))  # Manim animation ID
    interactive_tool_id = Column(String(100))  # Interactive tool ID
    
    # Metadata
    author = Column(String(100))
    tags = Column(JSON, default=list)  # List of tags
    is_published = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    published_at = Column(DateTime)
    
    # Constraints
    __table_args__ = (
        Index('idx_learning_content_module', 'module_id'),
        Index('idx_learning_content_sort', 'module_id', 'sort_order'),
    )
    
    def __repr__(self):
        return f"<LearningContent(module_id='{self.module_id}', title='{self.title}')>"

