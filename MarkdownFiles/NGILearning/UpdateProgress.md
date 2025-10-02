# NGI Learning Module - Documentation Update Progress
**Date:** October 2, 2025  
**Status:** Phase 1 Complete, Moving to Phase 2

## Completed Updates

### 1. PRD.NGILearningModule.md
**Updated Sections:**
- Added tech stack header (FastAPI + SQLAlchemy + Next.js 15 + React 19 + OpenAI GPT-3.5-Turbo + GPTZero)
- Expanded Context & Vision with educational philosophy
- Added comprehensive AI Coaching section with OpenAI implementation details
- Added GPTZero AI detection for student submissions (>85% threshold)
- Completely rewrote Data Ingestion & Sources with 2025 tech stack:
  - sec-edgar-downloader v5.0.3+ for SEC filings
  - pdfplumber for IR document parsing
  - xlsxwriter v3.2.9+ for programmatic Excel generation
  - openpyxl v3.1.5+ for validation
  - Pipeline architecture with manual trigger + APScheduler cron
- Added new Security & Compliance section (2025 standards):
  - Clerk authentication integration
  - Rate limiting specifications
  - Input validation with Pydantic v2
  - Dependency security audit procedures
- Added Database Schema section with learning_* table list
- Added new appendices: DatabaseSchema.md, SecurityChecklist.md

### 2. Appendix.Ingestion.Spec.md
**Complete Rewrite with 2025 Best Practices:**
- Detailed SEC EDGAR integration with code examples
- pdfplumber PDF parsing with table extraction
- xlsxwriter Excel generation with formatting examples
- Manual trigger API endpoint specification
- APScheduler cron job configuration
- Schema change detection and alerting
- Comprehensive error handling (missing data, failures, parsing errors)
- Storage architecture with directory structure
- Performance targets (<2 min per company)
- Provenance tracking with SHA-256 hashes

### 3. Appendix.Modules.ContentMap.md
**Business Foundations Section - Completely Expanded:**
- Added duration estimates, format descriptions, textbook references
- **Unit 1: Systems Thinking & Business Models (8-10 hours)**
  - Interactive BMC Builder with all 9 components
  - Animated examples and case studies
  - 1-page BMC deliverable + unit economics worksheet
  - Reflection memo template
- **Unit 2: Unit Economics & Pricing (6-8 hours)**
  - Contribution margin calculator
  - CLV/CAC modeling in Excel
  - Cohort analysis with animated visualizations
  - Pricing strategy memo with quantitative reasoning
- **Unit 3: Strategy & Competitive Moats (8-10 hours)**
  - Interactive 5 Forces Analyzer
  - 7 types of moats with case studies (Tesla, Deere, etc.)
  - Blue Ocean Strategy framework
  - Moat durability memo with 10-year outlook
- **Unit 4: Decision Under Uncertainty (4-6 hours)**
  - Expected value calculator
  - Scenario tree builder (Excel)
  - Bayesian thinking exercises

## Remaining Work

### Priority 1: Core Documentation Updates
1. **Appendix.Modules.ContentMap.md** - Complete remaining sections:
   - Unit 5: Ops Basics & Leadership Habits (need to expand)
   - Accounting I/II/Managerial (need super in-depth expansion)
   - Finance & Valuation (need super in-depth expansion with DCF, comps, etc.)
   - Activity alignment summary

2. **Appendix.ExcelStandards.md** - Modernize with:
   - xlsxwriter programmatic approach (not templates)
   - Code examples for formatting, formulas, charts
   - Security considerations (no DDE, external link restrictions)
   - Validation rules integration

3. **Appendix.Validators.V1.md** - Update with:
   - Modern validation libraries (openpyxl, pandas, numpy)
   - Security checks (malicious formulas, external links)
   - Code examples for each validator
   - Performance considerations

4. **Epics.NGILearningModule.md** - Expand with:
   - Detailed technical specifications per epic
   - Tech stack for each component
   - API endpoint specifications
   - Frontend component architecture

5. **TestPlan.NGILearningModule.md** - Modernize with:
   - pytest framework integration
   - Jest + React Testing Library for frontend
   - Playwright E2E tests
   - Security test cases (OWASP Top 10)
   - Performance benchmarks

### Priority 2: New Documentation
1. **Create Appendix.DatabaseSchema.md**:
   - SQL schema for all learning_* tables
   - Entity Relationship Diagram (ERD)
   - Indexes and constraints
   - Migration strategy
   - Sample queries

2. **Create Appendix.SecurityChecklist.md**:
   - OWASP Top 10 compliance
   - Clerk authentication integration points
   - API key management procedures
   - File upload security
   - Rate limiting configuration
   - Audit log requirements

3. **Create Appendix.TextbookResources.md**:
   - Comprehensive list of textbooks by module
   - Online resources (free + paid)
   - Video tutorials and courses
   - Industry best practices documentation

4. **Create TechnicalArchitecture.md**:
   - System architecture diagram
   - Data flow diagrams
   - Component interaction diagrams
   - API contract specifications
   - Frontend component tree

### Priority 3: Content Development Resources
1. **Research and compile:**
   - Financial modeling textbooks (Rosenbaum & Pearl, Pignataro, etc.)
   - Accounting textbooks (Intermediate Accounting by Kieso, CFA curriculum)
   - Valuation textbooks (Damodaran, McKinsey Valuation)
   - Excel best practices guides
   - Investment banking training materials

2. **Create content templates:**
   - Lesson template (Markdown structure)
   - Exercise template (Excel with instructions)
   - Memo template (1-2 pages with rubric)
   - Quiz template (multiple choice + short answer)

## Technical Decisions Made

1. **AI Stack:**
   - OpenAI GPT-3.5-Turbo for coaching ($0.50/$1.50 per 1M tokens)
   - GPTZero API for AI detection (>85% threshold)
   - System prompts for "Project Lead" persona

2. **Data Ingestion:**
   - sec-edgar-downloader for SEC filings
   - pdfplumber for IR documents
   - Manual trigger + APScheduler cron
   - Quarterly refresh (2 days post-earnings)

3. **Excel Generation:**
   - xlsxwriter for programmatic creation
   - openpyxl for validation/reading
   - No password protection (democratization)
   - All formatting via Python code

4. **Database:**
   - New learning_* tables in existing ngi_capital.db
   - Foreign keys to students table
   - JSONB columns for flexible metadata
   - Cascade deletes for GDPR compliance

5. **Security:**
   - Clerk authentication (inherited)
   - Rate limiting: 50 AI requests, 10 file uploads per hour
   - File size limits: 500MB Excel, 25MB PDF
   - Input validation with Pydantic v2

## Next Steps for Development

1. **Complete documentation updates** (estimated 2-4 hours)
2. **Create database migration scripts** for learning_* tables
3. **Build SEC ingestion pipeline** (Epic 1 - Sprint 1)
4. **Generate baseline Excel packages** for 2-3 companies
5. **Implement validators** (Epic 2 - Sprint 2)
6. **Build Student UI** (company picker + download flow)
7. **Integrate OpenAI coaching** (Epic 4 - Sprint 3)
8. **Develop content** (Epic 8 - Sprint 5)

## Questions for User

1. Should we continue updating all documentation before starting development, or start development in parallel?
2. Which 2-3 companies should we prioritize for baseline package generation?
3. Do you have any existing financial models we should reference for standards?
4. Should we create a separate repository for learning content (markdown + videos)?
5. Timeline for investor pitch - how much should be functional for demo?

