# Appendix — Ingestion & Packaging Spec (V1)
**Last Updated:** October 2, 2025  
**Python Version:** 3.11+  
**Key Dependencies:** sec-edgar-downloader 5.0.3, pdfplumber 0.11.x, xlsxwriter 3.2.9, openpyxl 3.1.5

## Sources
**SEC EDGAR:**
- 10-K/10-Q XBRL (statements, footnotes) via `sec-edgar-downloader`
- Snapshot parsed JSON stored per company/period in `learning_packages` table
- User-Agent header: "NGI Capital Advisory LLC contact@ngicapitaladvisory.com"
- Rate limit: 10 requests per second per SEC guidelines (2025)

**Investor Relations:**
- Quarterly decks/metric packs/press releases (PDF primary, CSV/HTML secondary)
- Stored as binary artifacts in `uploads/learning-ir/` with metadata in database
- Parsed tables extracted with `pdfplumber` where possible
- Provenance tracking: source URL, download timestamp, file hash (SHA-256)

## Pipeline Architecture (2025)

### 1) Fetch & Normalize
**SEC Filings:**
```python
from sec_edgar_downloader import Downloader

dl = Downloader("NGI Capital Advisory LLC", "contact@ngicapitaladvisory.com")
dl.get("10-K", "TSLA", after="2020-01-01", download_details=True)
dl.get("10-Q", "TSLA", after="2023-01-01", download_details=True)
```
- Pull latest annual + trailing 12 quarters
- Cache with ETag/versioning to avoid re-downloads
- Normalize XBRL to standardized statement schemas using `xbrl` library
- Preserve company-specific tags in metadata for future reference

**IR Documents:**
- Scrape from known IR URLs (e.g., `https://ir.tesla.com/press-releases`)
- Respect robots.txt; implement exponential backoff on 429/503
- Store original PDFs in blob storage with metadata

### 2) Extract & Tabulate (pdfplumber)
```python
import pdfplumber

with pdfplumber.open("tesla_q3_2024_deck.pdf") as pdf:
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            # Parse drivers: Q (deliveries), P (ASP), etc.
            # Capture units, period, source page
```
- Parse IR tables for drivers (Q, P, take-rate)
- Capture units (e.g., "thousands", "millions") and period coverage
- Record provenance: `{file: "deck.pdf", page: 5, table_id: 2, bbox: [x,y,w,h]}`
- Store extracted data in `learning_driver_data` table with JSON structure

### 3) Persist Artifacts
- Save Raw Import dataset (NOT locked/password-protected) + provenance
- Attach artifacts to `learning_packages.artifacts` JSONB column
- Immutable snapshots: never overwrite, always version increment

### 4) Map Drivers
- Generate Drivers Map sheet: explicit cell mapping from raw series → model drivers
- Include unit labels, period coverage, source references
- Auto-populate with best-guess mappings; flag ambiguous cases for manual review
- Store mapping rules in `learning_driver_mappings` table for reuse

### 5) Package Generation (xlsxwriter)
```python
import xlsxwriter

workbook = xlsxwriter.Workbook(f'{ticker}_{year}_Model_v1.xlsx')

# Formats
blue_fmt = workbook.add_format({'font_color': 'blue', 'bold': True})
red_fmt = workbook.add_format({'font_color': 'red', 'bold': True})

# Required tabs
readme = workbook.add_worksheet('README')
assumptions = workbook.add_worksheet('Assumptions & Drivers')
income_stmt = workbook.add_worksheet('Income Statement')
# ... (see Appendix.ExcelStandards.md for full tab list)

# Raw Import sheet (not locked for democratization)
raw_import = workbook.add_worksheet('Raw Import')
raw_import.write(0, 0, 'DO NOT EDIT - Source Data', red_fmt)
# Populate with ingested data

workbook.close()
```
- Emit .xlsx with all required tabs (see Appendix.ExcelStandards.md)
- Include Drivers Map and README with instructions
- Baseline passes validators on clean import (automated test)
- Store in `learning_packages.file_path` and upload to blob storage

## Refresh Strategy

### Manual Trigger (V1)
**Admin Endpoint:**
```
POST /api/learning/admin/ingestion/trigger
Content-Type: application/json
Authorization: Bearer <clerk_token>

{
  "ticker": "TSLA",
  "force": false  // Skip cache if true
}
```
- Requires `require_partner_access()` dependency
- Returns job ID for async processing
- Status polling via `/api/learning/admin/ingestion/status/{job_id}`

### Automated (Cron)
**APScheduler Configuration:**
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

# Run quarterly, 2 days post-earnings (heuristic: 45 days after quarter end)
scheduler.add_job(
    ingest_all_companies,
    trigger='cron',
    month='2,5,8,11',  # Q1-Q4 earnings months
    day=17,  # ~2 days post-typical earnings
    hour=2,  # 2 AM UTC
    id='learning_ingestion_quarterly'
)
```
- Also support systemd timer or cron on production server
- Slack notification on success/failure to #ngi-learning-ops channel

### Schema Change Detection
- Compare current PDF table structures vs. stored mapping rules
- If >30% mismatch, flag for manual review and notify admin
- Update mapping rules in database; regenerate packages for affected companies

## Error Handling (2025)

### Missing Driver Data
- Fallback to prior period with student-visible note in README:
  ```
  ⚠️ Note: [Metric X] for Q3 2024 was not available in latest IR deck.
  Using Q2 2024 value as placeholder. Verify against company filings.
  ```
- Log to `learning_ingestion_logs` table with severity=WARNING

### Ingestion Failure
- Block package generation for affected company
- Display retry guidance in admin UI with error details
- Auto-retry with exponential backoff (3 attempts: 5s, 30s, 5m)
- If all fail, email admin and log severity=ERROR

### Parsing Errors
- Log unparseable tables to `learning_parsing_errors` table with PDF page image
- Admin can review and add manual extraction rules
- Skip problematic tables; proceed with partial data + note

## Storage Architecture

### Artifact Registry
**Structure:**
```
uploads/learning-ir/
  ├── TSLA/
  │   ├── 2024-Q3/
  │   │   ├── raw/
  │   │   │   ├── 10-K_2024.xml
  │   │   │   ├── ir_deck_q3.pdf
  │   │   ├── parsed/
  │   │   │   ├── statements.json
  │   │   │   ├── drivers.json
  │   │   ├── packages/
  │   │       ├── TSLA_2024_Model_v1.xlsx
```

**Database:**
- `learning_packages` table: metadata, version, file_path, created_at
- `learning_driver_data` table: parsed drivers with provenance
- `learning_ingestion_logs` table: audit trail, errors, performance metrics

**Retention:**
- Keep all versions indefinitely for reproducibility
- Link student submissions to specific package version
- Enable rollback if new ingestion introduces issues

## Performance Targets (2025)
- SEC download + XBRL parse: <30s per company
- IR PDF download + parse: <60s per company (depends on PDF size)
- Excel package generation: <10s
- Total ingestion per company: <2 minutes (cold), <30s (cached)

