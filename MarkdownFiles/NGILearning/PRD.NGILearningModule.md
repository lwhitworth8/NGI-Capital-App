# NGI Learning Module — PRD (V1)
**Last Updated:** October 2, 2025  
**Status:** Active Development  
**Tech Stack:** FastAPI + SQLAlchemy + Next.js 15 + React 19 + OpenAI GPT-5 + GPTZero + Manim Community Edition

## 0) Context & Vision
Democratize elite, real-world business education for self-directed students by combining: (1) breadth across core business domains and (2) a deep stack in Accounting and Finance & Valuation. The module centers on doing: students build banker-grade Excel models and executive artifacts with AI coaching that teaches how to think, not what to memorize. V1 uses a curated set of US-listed companies with clean quantity × price (and take-rate) drivers and auto-ingested SEC/IR data to scaffold learning while demanding independent reasoning.

**Educational Philosophy:** "Learn how to think, not what to think." This module prepares students to work as analysts for NGI Capital Advisory and client companies through hands-on, practical experience with real-world financial data and modeling.

## 1) Objectives (V1)
- Deliver a self-paced Learning Center within the Student app focused on: Business Foundations, Accounting (I/II/Managerial), and Finance & Valuation.
- Provide an “Excel banker package” per selected company (from a curated set of 10) with pre-seeded raw imports, mapping guides, standards, and deterministic validators.
- Offer conversational, contextual coaching (Project Lead persona) and rubric-based feedback after model integrity checks pass.
- Persist progress, streaks, and artifacts; enable NGI Advisory admins to review work and surface top talent.

## 2) Non-Goals (V1)
- No cohorts, Slack rooms, or oral defense. No Google Sheets (Excel only). No open-ended ticker selection (curated 10 only). No public rubric exposure. No CSV exports from admin.

## 3) Personas & Permissions
- Student (self-paced): Select company, download Excel package, complete activities, submit model/memo/deck, view feedback, track progress/streaks, see anonymized leaderboard after capstone.
- Admin (NGI Advisory): Per-student viewer, artifact history, talent signals (composite), moderation of AI feedback/weights; browse anonymized leaderboard.

## 4) Information Architecture
- Student App → Learning
  - Company Picker (curated 10)
  - Modules: Foundations, Accounting I/II/Managerial, Finance & Valuation
  - Activities: A1…A5 mini-builds → Capstone (model + memo + deck)
  - Artifacts: Upload .xlsx, .pdf (memo/deck); versioned
  - Progress: bars, milestones, streaks, time invested
  - Leaderboard: anonymized price targets distribution (post-capstone)
- Admin App → Learning Control Center
  - Student search → detail (progress, artifacts, talent signal)
  - Artifact viewer with version timeline
  - Moderation: flag AI feedback; tweak rubric weights; reissue feedback

## 5) Company Set (V1)
Curated for clean driver modeling (quantity × price × take-rate where relevant) and strong IR/SEC supplemental disclosure. All US-listed.

1. BUD — Anheuser-Busch InBev (Beverages): Q = hl volume; P = net revenue/hl; price/mix by region/brand.
2. COST — Costco (Retail): Q = transactions/traffic; P = average ticket; membership counts/renewals as separate driver.
3. SHOP — Shopify (Platform): Q = GMV, subs; P = take-rate on GMV + subscription ARPU.
4. TSLA — Tesla (Auto/Energy): Q = deliveries by model; P = ASP; energy optional.
5. UBER — Uber (Mobility/Delivery): Q = trips/GB; P = avg fare; revenue via take-rate.
6. ABNB — Airbnb (Hospitality): Q = nights booked; P = ADR; revenue via take-rate.
7. DE — Deere & Company (Industrial): Q = units/shipments/backlog; P = ASP; finance arm noted.
8. GE — General Electric (Multi-Industrial; focus Aerospace): Q = shop visits/flight hours; P = rate/service mix.
9. KO — Coca-Cola (Beverages): Q = unit case volume; P = price/mix; FX disclosed.
10. GSBD — Goldman Sachs BDC (Credit): Q = interest-earning investments; P = weighted avg yield; fee income.

Note: If preferred, GSBD may be swapped for a BlackRock BDC (e.g., BKCC) without structural changes.

## 6) Detailed Requirements

### 6.1 Company Selection & Package Generation
- Student picks one company from the curated list → system downloads SEC (10-K/10-Q XBRL), IR decks/metric packs, and press releases; snapshots stored.
- Generate Excel package (.xlsx) with:
  - Raw Import (locked): machine-ingested data and tables
  - Drivers Map: mapping from IR/SEC metrics to model drivers (quantity, price, take-rate)
  - Standards-based modeling tabs (see 6.2)
  - README: instructions, naming rules, validation checklist
- Student can re-download current package when company updates are published.

### 6.2 Excel Standards (V1)
- Tabs (minimum): README; Assumptions/Drivers; IS; BS; CF; WC; Debt; Equity; PP&E/Dep; Stock Comp; Leases; DCF (WACC/FCFF/terminal/sensitivities); Comps; Outputs (valuation bridge + football field); Drivers Map; Raw Import (locked).
- Color & conventions: Inputs (blue), formulas (black), external links (green), checks (red), warnings (yellow). Iterative calc ON. No hardcodes in calc ranges.
- Naming: `TICKER_YYYY_Model_vN.xlsx`, `TICKER_YYYY_Memo_vN.pdf`, `TICKER_YYYY_Deck_vN.pdf`.
- Graphs: Football field & key outputs with banker formatting; charting tutorial in README.

### 6.3 Deterministic Validators (Pre-LLM)
Integrity checks must pass before AI feedback:
- Core ties: BS balances each period; CF ties to BS deltas; IS→CF add-backs reconcile; no #REF/#VALUE in output areas.
- No hardcodes: enforced outside Inputs; external links isolated.
- Circular refs documented; Excel iteration enabled.
- Revenue drivers: Q, P, and (take-rate if used) defined with units; Q×P(×take-rate) matches reported revenue within ±1–2% or variance explained (FX, reclass, contra).
- WC: days and turns plausible vs history/peers; WC bridge ties to CF.
- Debt: rollforward (beg+adds−repay±FX=end); interest expense = avg balance × rate ± fees; agrees with IS/CF.
- Leases: capitalization and ROU tie-outs; lease interest+amortization agree with IS/CF.
- Stock comp: add-back and share effects consistent across IS/CF/Equity.
- DCF: WACC inputs bounded (rf from FRED, ERP guardrails, beta method stated); terminal g < long-run nominal GDP; terminal value share sane; sensitivity tables present.
- Comps: EV construction consistent (cash, debt, MI, leases); multiples within plausible ranges; peer set documented.
- Documentation: README filled; key assumptions annotated; warnings resolved/justified.

### 6.4 Activities & Capstone
- A1: Import & standardize statements; complete Drivers Map (teach the mappings and residuals).
- A2: Build WC and debt schedules; reconcile cash flow.
- A3: Build revenue drivers and 5-year projections; annotate assumptions and references.
- A4: DCF with sensitivities; add sanity checks and notes.
- A5: Public comps + peer-selection memo (short rationale).
- Capstone: Full package + 1–2 page investment memo (thesis, assumptions, triangulation, risks) + 3–5 slide executive deck + football field. Submit final artifacts for feedback.
- Leaderboard: After capstone, show anonymized price target distribution (min/median/max) across students for that company.

### 6.5 Coaching, Feedback, and Integrity
- **AI Coach:** "Project Lead" persona (NGI Advisory), powered by OpenAI GPT-5 for highest-quality analyst-grade reasoning and feedback.
- **Implementation:** 
  - API key stored securely in `.env` file (OPENAI_API_KEY)
  - Contextual hints in activities + side panel chat
  - System prompts configured for banker/advisor persona with focus on teaching reasoning
- **Flow:** Run validators → if pass, AI rubric feedback (internal); if fail, return actionable fixes with cell references.
- **Resubmits:** Unlimited; track deltas; encourage iteration with improvement metrics.
- **AI-use policy & Detection:** 
  - Coach allowed for hints; final memo/deck/model must be student-authored
  - GPTZero API integration for AI-generated content detection on final submissions
  - High-confidence AI-generated artifacts (>85% probability) trigger polite guidance message to revise in their own voice
  - Detection results stored in submissions table for admin review

### 6.6 Telemetry (V1)
- Student events: lesson_view, activity_start, validator_pass/fail, submission_create, feedback_issued, resubmit, streak_tick, time_spent.
- Admin metrics: completion %, artifact quality (internal rubric), improvement velocity, streak length.
- Privacy: No PII in event payloads beyond internal user_id.

### 6.7 Coming Soon (display cards)
- Corporate Law & Governance; Strategy; Economics (Micro & Macro); Operations & Supply Chain; Marketing.

### 6.8 Module Outcomes & Content Map (Summary)
- Business Foundations: systems thinking; business models (BMC); unit economics and pricing; decision under uncertainty; strategy and moats; ops basics; embedded leadership/networking habits. See Appendix.Modules.ContentMap.md.
- Accounting I: 3 statements, revenue recognition/COGS, working capital, indirect CF. Accounting II: PP&E/leases, stock comp, deferred taxes, consolidations. Managerial: costing, budgeting/forecasting, variance analysis. See Appendix.Modules.ContentMap.md.
- Finance & Valuation: revenue drivers; projections; WC & schedules; DCF (WACC, FCFF, terminal, sensi); public comps; basic credit; football field. See Appendix.Modules.ContentMap.md.

## 7) Data Ingestion & Sources
**Tech Stack (2025):**
- **SEC Filings:** `sec-edgar-downloader` (v5.0.3+) for 10-K/10-Q XBRL (statements/footnotes) with snapshotting
- **PDF Parsing:** `pdfplumber` for IR quarterly decks, metric packs, press releases
- **Excel Generation:** `xlsxwriter` (v3.2.9+) for programmatic workbook creation with formatting, formulas, charts
- **Excel Reading:** `openpyxl` (v3.1.5+) for validation and parsing of submitted models
- **XBRL Processing:** Custom parsers for SEC XBRL data normalization

**Pipeline Architecture:**
- **Manual Trigger:** Admin endpoint `/api/learning/ingestion/trigger` (POST) with company ticker parameter
- **Automated:** Cron job (quarterly, post-earnings) via `APScheduler` or system cron
- **Data Flow:** 
  1. Fetch SEC filings via sec-edgar-downloader
  2. Parse XBRL to normalized JSON (statements + footnotes)
  3. Download IR PDFs from company investor relations pages
  4. Extract tables/metrics from PDFs using pdfplumber
  5. Generate Excel package with xlsxwriter (Raw Import sheet + Drivers Map)
  6. Store artifacts in database with versioning
- **Storage:** Pre-seeded Raw Import (NOT password-locked, democratized approach); student edits via Mapping/Drivers tabs to learn how/why numbers flow.
- **Error Handling:** Ingestion failures logged; fallback to prior period data with student notification

## 8) Progress & Motivation
- Streak: increments when ≥15 minutes focused or ≥1 activity completed; resets after 8 inactive days (no forgiveness). Milestone toasts with short “MD notes.”
- Progress bars at module/unit levels; show time invested and artifact count.

## 9) Admin Control Center (Desktop)
- Per-student viewer with search; progress overview; artifact version timeline; in-UI talent signal (no CSV export).
- Talent signal default weights: completion 30% / artifact quality 50% / improvement velocity 20%.
- Moderation: flag suspect AI feedback, adjust rubric weights, reissue feedback.

## 10) Acceptance Criteria (Summary)
- Learning Center renders with modules, curated 10-company picker, and download of Excel package.
- Excel package conforms to standards, includes Drivers Map and Raw Import (locked), and passes validators on clean baseline.
- Activities A1–A5 and Capstone can be completed; submissions accept .xlsx/.pdf; version history visible.
- Coach provides contextual hints; validators gate feedback; resubmits allowed.
- Leaderboard shows anonymized price targets after capstone submission.
- Admin can view student progress, artifacts, and talent signal; can moderate AI feedback.

## 11) Rollout
- Feature-flagged within Student app; ship when first 3 modules and company packages are ready.
- Company data refresh job (quarterly) updates IR/SEC snapshots and baseline packages.

## 12) Risks & Mitigations
- Data variance across IR sources → Drivers Map standardization and notes fields.
- Over-reliance on AI → strict validators; coach prompts emphasize reasoning and manual checks.
- Model brittleness → clear standards, iteration on templates, guardrails for edge cases (FX, reclass).

## 13) Success Metrics
- Completion % by module; capstone submission rate; validator pass-through; resubmit velocity; time invested; talent signal distribution.
- Qualitative: student satisfaction, partner/investor demo feedback.

## 14) Security & Compliance (2025)
**Authentication & Authorization:**
- Clerk-based authentication (inherited from Student app)
- All learning endpoints require authenticated student role
- Admin endpoints require `require_partner_access()` dependency
- File uploads validated for type, size, and content

**Data Security:**
- API keys (OpenAI, GPTZero) stored in `.env`, never exposed to client
- All file uploads scanned for malicious content before processing
- Student submissions isolated per user_id with strict access controls
- No PII in telemetry events beyond internal user_id

**Rate Limiting (2025):**
- AI Coach requests: 50 per hour per student (prevent abuse)
- File uploads: 10 per hour per student
- Ingestion triggers: Admin-only, 1 per company per day

**Input Validation:**
- All FormData validated with Pydantic v2 models
- File size limits: Excel 500MB, PDF 25MB (configurable)
- Excel validation against malicious formulas (DDE, external links restricted to known domains)
- PDF parsing sandboxed to prevent code execution

**Dependency Security:**
- All Python deps pinned with version ranges in `requirements.txt`
- Monthly security audits with `pip-audit` and Snyk
- Node deps managed with `npm audit` in CI/CD
- GPTZero API over HTTPS with API key rotation every 90 days

## 15) Database Schema (learning_* tables)
**New Tables:**
- `learning_companies` — curated company list with metadata
- `learning_packages` — generated Excel packages per company/version
- `learning_submissions` — student activity submissions with versioning
- `learning_feedback` — AI-generated feedback per submission
- `learning_progress` — student progress tracking, streaks, milestones
- `learning_leaderboard` — anonymized price targets post-capstone
- `learning_telemetry` — event logs for analytics
- `learning_content` — module/unit/lesson content in JSON/Markdown

**Relationships:**
- Foreign keys to `students` table (inherited from main app)
- Cascade deletes for student data deletion compliance (GDPR)
- Indexes on `user_id`, `company_id`, `activity_id`, `created_at` for performance

## 16) Appendices
- Appendix.CompanySet.V1.md — curated companies and driver notes.
- Appendix.ExcelStandards.md — workbook conventions, tabs, charts, naming.
- Appendix.Validators.V1.md — deterministic integrity checks.
- Appendix.Modules.ContentMap.md — module/unit/outcome map and activity alignment.
- Appendix.Manim.Animations.md — 3Blue1Brown-style animated lessons, rendering pipeline, 36-video catalog.
- Appendix.Modules.Accounting.Detailed.md — super in-depth accounting content with animations.
- Appendix.Modules.Finance.Detailed.md — super in-depth finance content with animations.
- Appendix.Modules.Finance.DCF.Complete.md — comprehensive DCF master class.
- Appendix.Modules.Finance.CompsAndPrecedents.md — public comps and precedent transactions.
- Appendix.Modules.Finance.LBO.md — leveraged buyout modeling and PE analysis.
- Appendix.Modules.Finance.CreditAnalysis.md — credit analysis, fixed income, and BDC investing.
- Appendix.Rubric.V1.md — internal rubric dimensions and scoring.
- Appendix.Ingestion.Spec.md — SEC/IR ingestion, storage, refresh.
- Appendix.Telemetry.Events.md — event schema and derived metrics.
- Appendix.TalentSignal.md — composite scoring and definitions.
- Appendix.DatabaseSchema.md — learning_* table definitions and ERD.
- Appendix.SecurityChecklist.md — security controls and audit procedures.
