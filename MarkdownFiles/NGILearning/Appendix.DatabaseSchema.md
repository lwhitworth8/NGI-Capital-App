# Appendix — Database Schema for NGI Learning Module
**Last Updated:** October 2, 2025  
**Database:** SQLite (dev), PostgreSQL (prod)  
**ORM:** SQLAlchemy 2.0+  
**Migrations:** Alembic

## 0) Overview

The NGI Learning Module introduces a set of `learning_*` tables to support:
- Company management and Excel package generation
- Student progress tracking, streaks, and milestones
- Activity submissions with versioning
- AI-powered feedback and coaching
- Leaderboard and anonymized performance metrics
- Telemetry for analytics

All tables follow strict foreign key relationships to the existing `students` table and support cascade deletes for GDPR compliance.

---

## 1) Entity Relationship Diagram (ERD)

```
┌─────────────────────┐
│   students          │
│ (existing table)    │
└──────┬──────────────┘
       │
       │ 1:N
       │
       ├──────────────────────────────┬─────────────────┬────────────────┐
       │                              │                 │                │
       ▼                              ▼                 ▼                ▼
┌──────────────────┐        ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
│ learning_progress│        │learning_submissions│  │learning_feedback│ │learning_telemetry│
│ (1:1)            │        │ (1:N)              │  │ (1:N)        │  │ (1:N)            │
└──────────────────┘        └──────┬─────────────┘  └──────────────┘  └──────────────────┘
                                   │
                                   │ N:1
                                   │
                            ┌──────▼──────────────┐
                            │ learning_companies  │
                            │ (curated 10)        │
                            └──────┬──────────────┘
                                   │
                                   │ 1:N
                                   │
                            ┌──────▼──────────────┐
                            │ learning_packages   │
                            │ (Excel packages)    │
                            └─────────────────────┘

┌──────────────────────────┐
│ learning_content         │
│ (modules/units/lessons)  │
└──────────────────────────┘

┌──────────────────────────┐
│ learning_leaderboard     │
│ (anonymized targets)     │
└──────────────────────────┘
```

---

## 2) Table Definitions

### 2.1 learning_companies

**Purpose:** Curated list of 10 companies for the learning module.

**Schema:**
```sql
CREATE TABLE learning_companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- PostgreSQL: SERIAL
    ticker VARCHAR(10) NOT NULL UNIQUE,    -- e.g., 'TSLA', 'COST'
    company_name VARCHAR(255) NOT NULL,    -- e.g., 'Tesla, Inc.'
    industry VARCHAR(100),                 -- e.g., 'Automotive'
    sub_industry VARCHAR(100),             -- e.g., 'Electric Vehicles'
    description TEXT,                      -- Brief company overview
    headquarters VARCHAR(100),             -- City, State/Country
    fiscal_year_end VARCHAR(10),           -- e.g., 'December 31'
    sec_cik VARCHAR(20),                   -- SEC Central Index Key
    ir_website_url TEXT,                   -- Investor relations URL
    revenue_model_type VARCHAR(50),        -- 'QxP', 'QxPxT', 'Subscription'
    revenue_driver_notes TEXT,             -- Description of Q, P, T drivers
    data_quality_score INTEGER,            -- 1-10 (clean financials)
    is_active BOOLEAN DEFAULT TRUE,        -- Active in module
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_learning_companies_ticker ON learning_companies(ticker);
CREATE INDEX idx_learning_companies_active ON learning_companies(is_active);
```

**Sample Data:**
```sql
INSERT INTO learning_companies (ticker, company_name, industry, revenue_model_type, revenue_driver_notes) VALUES
('TSLA', 'Tesla, Inc.', 'Automotive', 'QxP', 'Q=Deliveries by model, P=ASP by model'),
('COST', 'Costco Wholesale', 'Retail', 'QxP+Membership', 'Q=Transactions, P=Avg ticket, + membership renewals'),
('SHOP', 'Shopify Inc.', 'Platform', 'QxPxT+Subscription', 'GMV × Take-rate + Subscription ARPU'),
('UBER', 'Uber Technologies', 'Marketplace', 'QxPxT', 'Trips × Avg Fare × Take-rate'),
('ABNB', 'Airbnb, Inc.', 'Hospitality', 'QxPxT', 'Nights × ADR × Take-rate'),
('DE', 'Deere & Company', 'Industrial', 'QxP', 'Units/Shipments × ASP'),
('GE', 'General Electric', 'Aerospace', 'QxP', 'Shop visits/Flight hours × Rate'),
('KO', 'Coca-Cola Company', 'Beverages', 'QxP', 'Unit case volume × Price/mix'),
('BUD', 'Anheuser-Busch InBev', 'Beverages', 'QxP', 'Hectoliters × Revenue/hl'),
('GSBD', 'Goldman Sachs BDC', 'Credit', 'QxP', 'Interest-earning investments × Weighted avg yield');
```

---

### 2.2 learning_packages

**Purpose:** Generated Excel packages per company, versioned by data refresh date.

**Schema:**
```sql
CREATE TABLE learning_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    version INTEGER NOT NULL,              -- Increments with each data refresh
    package_date DATE NOT NULL,            -- Date of data snapshot
    file_path VARCHAR(500) NOT NULL,       -- Relative path: /uploads/learning-packages/TSLA_2025Q1_v1.xlsx
    file_size_bytes BIGINT,                -- File size for validation
    file_hash VARCHAR(64),                 -- SHA-256 for integrity
    data_sources TEXT,                     -- JSON: ["10-K", "10-Q Q4 2024", "IR Deck 2024"]
    ingestion_method VARCHAR(50),          -- 'manual' or 'automated'
    validation_status VARCHAR(20),         -- 'pending', 'passed', 'failed'
    validation_errors TEXT,                -- JSON array of errors if failed
    is_current BOOLEAN DEFAULT TRUE,       -- Latest version for company
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,                    -- Admin user ID who triggered ingestion
    
    FOREIGN KEY (company_id) REFERENCES learning_companies(id) ON DELETE CASCADE,
    UNIQUE(company_id, version)
);

-- Indexes
CREATE INDEX idx_learning_packages_company ON learning_packages(company_id);
CREATE INDEX idx_learning_packages_current ON learning_packages(company_id, is_current);
CREATE INDEX idx_learning_packages_date ON learning_packages(package_date DESC);
```

---

### 2.3 learning_progress

**Purpose:** Track student progress, streaks, and milestones (1:1 with students).

**Schema:**
```sql
CREATE TABLE learning_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,       -- FK to students table
    selected_company_id INTEGER,            -- Company student chose
    
    -- Progress tracking
    current_module VARCHAR(50),             -- 'business_foundations', 'accounting_i', 'finance_valuation'
    current_unit VARCHAR(100),              -- 'unit_1_systems_thinking'
    current_activity VARCHAR(100),          -- 'a1_drivers_map'
    modules_completed INTEGER DEFAULT 0,    -- Count of completed modules
    units_completed INTEGER DEFAULT 0,      -- Count of completed units
    activities_completed INTEGER DEFAULT 0, -- Count of completed activities
    completion_percentage DECIMAL(5,2) DEFAULT 0.0, -- Overall progress %
    
    -- Streaks
    current_streak_days INTEGER DEFAULT 0,
    longest_streak_days INTEGER DEFAULT 0,
    last_activity_date DATE,
    streak_milestones TEXT,                 -- JSON: [{"days": 7, "achieved_at": "2025-01-15"}, ...]
    
    -- Time invested
    total_minutes_invested INTEGER DEFAULT 0,
    last_session_start TIMESTAMP,
    
    -- Capstone status
    capstone_submitted BOOLEAN DEFAULT FALSE,
    capstone_submitted_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (selected_company_id) REFERENCES learning_companies(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_learning_progress_user ON learning_progress(user_id);
CREATE INDEX idx_learning_progress_company ON learning_progress(selected_company_id);
CREATE INDEX idx_learning_progress_module ON learning_progress(current_module);
```

---

### 2.4 learning_submissions

**Purpose:** Student activity submissions (Excel models, memos, decks) with versioning.

**Schema:**
```sql
CREATE TABLE learning_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    activity_id VARCHAR(100) NOT NULL,      -- 'a1_drivers_map', 'a2_wc_debt', 'capstone'
    module VARCHAR(50) NOT NULL,            -- 'accounting_i', 'finance_valuation'
    submission_type VARCHAR(50) NOT NULL,   -- 'excel', 'pdf_memo', 'pdf_deck'
    version INTEGER NOT NULL,               -- Auto-increment per user+activity
    
    -- File details
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    file_hash VARCHAR(64),
    
    -- Validation
    validator_status VARCHAR(20),           -- 'pending', 'passed', 'failed'
    validator_errors TEXT,                  -- JSON array of validation errors
    validator_run_at TIMESTAMP,
    
    -- AI Detection (GPTZero)
    ai_detection_score DECIMAL(5,2),        -- 0-100 (% AI-generated probability)
    ai_detection_status VARCHAR(20),        -- 'clean', 'flagged', 'not_run'
    ai_detection_run_at TIMESTAMP,
    
    -- Submission metadata
    submission_notes TEXT,                  -- Student's comments
    is_latest BOOLEAN DEFAULT TRUE,         -- Latest version for this activity
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES learning_companies(id) ON DELETE CASCADE,
    UNIQUE(user_id, activity_id, version)
);

-- Indexes
CREATE INDEX idx_learning_submissions_user ON learning_submissions(user_id);
CREATE INDEX idx_learning_submissions_activity ON learning_submissions(activity_id);
CREATE INDEX idx_learning_submissions_latest ON learning_submissions(user_id, activity_id, is_latest);
CREATE INDEX idx_learning_submissions_validator ON learning_submissions(validator_status);
CREATE INDEX idx_learning_submissions_ai ON learning_submissions(ai_detection_status);
```

---

### 2.5 learning_feedback

**Purpose:** AI-generated feedback on student submissions (after validators pass).

**Schema:**
```sql
CREATE TABLE learning_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,               -- Denormalized for quick queries
    
    -- Feedback metadata
    feedback_type VARCHAR(50) NOT NULL,     -- 'rubric', 'coaching_hint', 'improvement'
    persona VARCHAR(50) DEFAULT 'project_lead', -- AI persona used
    
    -- AI-generated content
    feedback_text TEXT NOT NULL,            -- Main feedback content
    strengths TEXT,                         -- What student did well (JSON array)
    areas_for_improvement TEXT,             -- What to improve (JSON array)
    specific_suggestions TEXT,              -- Actionable next steps (JSON array)
    
    -- Rubric scores (internal, not shown to student in V1)
    rubric_accuracy DECIMAL(5,2),           -- 0-100 (ties/reconciliations correct)
    rubric_documentation DECIMAL(5,2),      -- 0-100 (assumptions documented)
    rubric_presentation DECIMAL(5,2),       -- 0-100 (formatting, charts)
    rubric_reasoning DECIMAL(5,2),          -- 0-100 (logic and critical thinking)
    rubric_composite DECIMAL(5,2),          -- Weighted average
    
    -- AI metadata
    openai_model VARCHAR(50),               -- 'gpt-3.5-turbo-0125'
    openai_tokens_input INTEGER,
    openai_tokens_output INTEGER,
    openai_cost_usd DECIMAL(10,6),          -- Track costs
    
    -- Moderation
    is_flagged BOOLEAN DEFAULT FALSE,       -- Admin flagged for review
    flag_reason VARCHAR(255),
    flagged_by INTEGER,                     -- Admin user ID
    flagged_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (submission_id) REFERENCES learning_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_learning_feedback_submission ON learning_feedback(submission_id);
CREATE INDEX idx_learning_feedback_user ON learning_feedback(user_id);
CREATE INDEX idx_learning_feedback_flagged ON learning_feedback(is_flagged);
```

---

### 2.6 learning_leaderboard

**Purpose:** Anonymized price targets post-capstone submission for peer comparison.

**Schema:**
```sql
CREATE TABLE learning_leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,               -- FK for admin access, anonymized in API
    company_id INTEGER NOT NULL,
    
    -- Valuation outputs
    dcf_price_target DECIMAL(10,2),
    comps_price_target DECIMAL(10,2),
    final_price_target DECIMAL(10,2),       -- Student's final recommendation
    valuation_date DATE NOT NULL,           -- Date of submission
    
    -- Anonymization
    anonymous_id VARCHAR(50) NOT NULL,      -- Random ID for display (e.g., 'Analyst_A3F7')
    
    -- Context
    submission_id INTEGER NOT NULL,         -- Link to capstone submission
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES learning_companies(id) ON DELETE CASCADE,
    FOREIGN KEY (submission_id) REFERENCES learning_submissions(id) ON DELETE CASCADE,
    UNIQUE(user_id, company_id)             -- One entry per student per company
);

-- Indexes
CREATE INDEX idx_learning_leaderboard_company ON learning_leaderboard(company_id);
CREATE INDEX idx_learning_leaderboard_date ON learning_leaderboard(valuation_date DESC);
```

---

### 2.7 learning_content

**Purpose:** Store module/unit/lesson content, activities, and metadata.

**Schema:**
```sql
CREATE TABLE learning_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_type VARCHAR(50) NOT NULL,      -- 'module', 'unit', 'lesson', 'activity'
    parent_id INTEGER,                      -- FK to parent content (e.g., unit's parent is module)
    
    -- Identification
    content_key VARCHAR(100) NOT NULL UNIQUE, -- 'business_foundations', 'unit_1_systems_thinking'
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    
    -- Content
    description TEXT,
    learning_objectives TEXT,               -- JSON array
    content_body TEXT,                      -- Markdown or JSON
    estimated_duration_minutes INTEGER,
    
    -- Media
    animation_scene_class VARCHAR(100),     -- Manim scene class name (if applicable)
    animation_video_url TEXT,               -- Pre-rendered video URL
    animation_duration_seconds INTEGER,
    interactive_component_id VARCHAR(100),  -- Reference to web component
    
    -- Sequencing
    sequence_order INTEGER NOT NULL,        -- Display order within parent
    prerequisites TEXT,                     -- JSON array of content_key prerequisites
    
    -- Activity-specific
    activity_type VARCHAR(50),              -- 'excel_build', 'memo', 'quiz'
    deliverable_template_url TEXT,          -- Link to template file
    rubric_criteria TEXT,                   -- JSON: scoring criteria
    
    -- Status
    is_published BOOLEAN DEFAULT FALSE,
    version VARCHAR(20) DEFAULT '1.0',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES learning_content(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_learning_content_type ON learning_content(content_type);
CREATE INDEX idx_learning_content_parent ON learning_content(parent_id);
CREATE INDEX idx_learning_content_key ON learning_content(content_key);
CREATE INDEX idx_learning_content_published ON learning_content(is_published);
CREATE INDEX idx_learning_content_sequence ON learning_content(parent_id, sequence_order);
```

---

### 2.8 learning_telemetry

**Purpose:** Event-level telemetry for analytics (student actions, time tracking).

**Schema:**
```sql
CREATE TABLE learning_telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,       -- 'lesson_view', 'activity_start', 'validator_pass', 'feedback_issued'
    event_category VARCHAR(50),             -- 'learning', 'submission', 'feedback'
    
    -- Context
    module VARCHAR(50),
    unit VARCHAR(100),
    lesson VARCHAR(100),
    activity VARCHAR(100),
    company_id INTEGER,
    submission_id INTEGER,
    
    -- Event payload
    event_data TEXT,                        -- JSON: flexible event-specific data
    
    -- Session tracking
    session_id VARCHAR(100),                -- UUID for session grouping
    time_spent_seconds INTEGER,             -- Duration if applicable
    
    -- Device/client
    user_agent TEXT,
    ip_address VARCHAR(45),                 -- Anonymized (last octet masked)
    
    -- Timestamp
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES learning_companies(id) ON DELETE SET NULL,
    FOREIGN KEY (submission_id) REFERENCES learning_submissions(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_learning_telemetry_user ON learning_telemetry(user_id);
CREATE INDEX idx_learning_telemetry_type ON learning_telemetry(event_type);
CREATE INDEX idx_learning_telemetry_timestamp ON learning_telemetry(event_timestamp DESC);
CREATE INDEX idx_learning_telemetry_session ON learning_telemetry(session_id);
```

---

## 3) SQLAlchemy Models (Python)

### 3.1 Example Model: LearningCompany

```python
# src/db/models/learning.py
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text, Numeric, func
from sqlalchemy.orm import relationship
from src.db.base import Base

class LearningCompany(Base):
    __tablename__ = 'learning_companies'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(10), nullable=False, unique=True, index=True)
    company_name = Column(String(255), nullable=False)
    industry = Column(String(100))
    sub_industry = Column(String(100))
    description = Column(Text)
    headquarters = Column(String(100))
    fiscal_year_end = Column(String(10))
    sec_cik = Column(String(20))
    ir_website_url = Column(Text)
    revenue_model_type = Column(String(50))
    revenue_driver_notes = Column(Text)
    data_quality_score = Column(Integer)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    packages = relationship("LearningPackage", back_populates="company", cascade="all, delete-orphan")
    submissions = relationship("LearningSubmission", back_populates="company", cascade="all, delete-orphan")
    leaderboard_entries = relationship("LearningLeaderboard", back_populates="company", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<LearningCompany(ticker='{self.ticker}', name='{self.company_name}')>"
```

### 3.2 Example Model: LearningProgress

```python
class LearningProgress(Base):
    __tablename__ = 'learning_progress'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('students.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    selected_company_id = Column(Integer, ForeignKey('learning_companies.id', ondelete='SET NULL'), index=True)
    
    # Progress
    current_module = Column(String(50), index=True)
    current_unit = Column(String(100))
    current_activity = Column(String(100))
    modules_completed = Column(Integer, default=0)
    units_completed = Column(Integer, default=0)
    activities_completed = Column(Integer, default=0)
    completion_percentage = Column(Numeric(5, 2), default=0.0)
    
    # Streaks
    current_streak_days = Column(Integer, default=0)
    longest_streak_days = Column(Integer, default=0)
    last_activity_date = Column(Date)
    streak_milestones = Column(Text)  # JSON
    
    # Time
    total_minutes_invested = Column(Integer, default=0)
    last_session_start = Column(DateTime(timezone=True))
    
    # Capstone
    capstone_submitted = Column(Boolean, default=False)
    capstone_submitted_at = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("Student", back_populates="learning_progress")
    selected_company = relationship("LearningCompany")
    
    def __repr__(self):
        return f"<LearningProgress(user_id={self.user_id}, completion={self.completion_percentage}%)>"
```

---

## 4) Alembic Migration Template

```python
"""Add learning module tables

Revision ID: 20251002_learning_module
Revises: <previous_revision>
Create Date: 2025-10-02 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251002_learning_module'
down_revision = '<previous_revision>'
branch_labels = None
depends_on = None

def upgrade():
    # Create learning_companies
    op.create_table(
        'learning_companies',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('ticker', sa.String(10), nullable=False),
        sa.Column('company_name', sa.String(255), nullable=False),
        sa.Column('industry', sa.String(100)),
        sa.Column('sub_industry', sa.String(100)),
        sa.Column('description', sa.Text()),
        sa.Column('headquarters', sa.String(100)),
        sa.Column('fiscal_year_end', sa.String(10)),
        sa.Column('sec_cik', sa.String(20)),
        sa.Column('ir_website_url', sa.Text()),
        sa.Column('revenue_model_type', sa.String(50)),
        sa.Column('revenue_driver_notes', sa.Text()),
        sa.Column('data_quality_score', sa.Integer()),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ticker')
    )
    op.create_index('idx_learning_companies_ticker', 'learning_companies', ['ticker'])
    op.create_index('idx_learning_companies_active', 'learning_companies', ['is_active'])
    
    # Create learning_packages
    # ... (similar pattern for all tables)
    
    # Create learning_progress
    # ... 
    
    # Create learning_submissions
    # ...
    
    # Create learning_feedback
    # ...
    
    # Create learning_leaderboard
    # ...
    
    # Create learning_content
    # ...
    
    # Create learning_telemetry
    # ...

def downgrade():
    # Drop tables in reverse order (respecting FKs)
    op.drop_table('learning_telemetry')
    op.drop_table('learning_content')
    op.drop_table('learning_leaderboard')
    op.drop_table('learning_feedback')
    op.drop_table('learning_submissions')
    op.drop_table('learning_progress')
    op.drop_table('learning_packages')
    op.drop_table('learning_companies')
```

---

## 5) Data Integrity & Constraints

### Foreign Key Cascades:
- `learning_progress.user_id → students.id` (ON DELETE CASCADE)
- `learning_submissions.user_id → students.id` (ON DELETE CASCADE)
- `learning_feedback.user_id → students.id` (ON DELETE CASCADE)
- `learning_leaderboard.user_id → students.id` (ON DELETE CASCADE)
- `learning_telemetry.user_id → students.id` (ON DELETE CASCADE)

### Unique Constraints:
- `learning_companies.ticker` (UNIQUE)
- `learning_progress.user_id` (UNIQUE - 1:1 relationship)
- `learning_packages.(company_id, version)` (UNIQUE)
- `learning_submissions.(user_id, activity_id, version)` (UNIQUE)
- `learning_leaderboard.(user_id, company_id)` (UNIQUE)
- `learning_content.content_key` (UNIQUE)

### Indexes for Performance:
- All foreign keys indexed
- `learning_submissions.validator_status` (for admin filtering)
- `learning_feedback.is_flagged` (for moderation)
- `learning_telemetry.event_timestamp` (for time-series queries)
- `learning_progress.current_module` (for cohort analytics)

---

## 6) Estimated Storage Requirements

**Assumptions:**
- 1,000 students
- Each student: 1 company, 10 activities, 3 submissions per activity (iterations)
- Each submission: ~5MB Excel + 1MB PDF

**Storage Breakdown:**
```
learning_companies:       10 rows × 1 KB = 10 KB
learning_packages:        10 companies × 4 versions × 50 MB = 2 GB
learning_progress:        1,000 rows × 2 KB = 2 MB
learning_submissions:     1,000 students × 10 activities × 3 versions × 6 MB = 180 GB
learning_feedback:        30,000 rows × 5 KB = 150 MB
learning_leaderboard:     1,000 rows × 500 bytes = 500 KB
learning_content:         500 lessons × 10 KB = 5 MB
learning_telemetry:       1,000 students × 100 events × 1 KB = 100 MB

Total: ~182 GB (mostly file storage)
```

**Recommendation:** Use S3 or Azure Blob Storage for files, store only metadata in database.

---

## 7) Backup & Recovery

- **Automated Backups:** Daily full backup + incremental every 6 hours
- **Retention:** 30 days rolling (GDPR compliance)
- **Test Restores:** Monthly validation
- **GDPR Compliance:** User deletion triggers cascade delete across all `learning_*` tables

---

**This schema supports the complete NGI Learning Module with scalability, data integrity, and GDPR compliance built in from day one.**

