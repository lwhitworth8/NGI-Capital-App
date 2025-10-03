# Appendix — SEC Ingestion Pipeline Technical Architecture
**Last Updated:** October 2, 2025  
**Tech Stack:** FastAPI + sec-edgar-downloader 5.0.3+ + pdfplumber 0.11.4+ + xlsxwriter 3.2.9+ + APScheduler 3.10+  
**Purpose:** Automated data ingestion for Excel package generation

## 0) Architecture Overview

The SEC Ingestion Pipeline automatically fetches, processes, and packages financial data for the 10 curated companies in the NGI Learning Module.

**Pipeline Stages:**
1. **Fetch:** Download SEC filings (10-K, 10-Q) via EDGAR API
2. **Parse:** Extract financial tables from PDFs and HTML using pdfplumber/BeautifulSoup
3. **Transform:** Normalize data into standardized schema
4. **Generate:** Create Excel packages with xlsxwriter
5. **Store:** Save packages and metadata to database
6. **Notify:** Trigger webhooks for package availability

---

## 1) System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     NGI Learning Ingestion System                │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ SEC EDGAR    │────▶│  Downloader  │────▶│   Parser     │
│ API          │     │  (5/sec)     │     │  (pdfplumber)│
└──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Database   │◀────│  Transformer │◀────│   Validator  │
│  (learning_*)│     │  (normalize) │     │  (schema)    │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Excel Gen   │────▶│   Storage    │────▶│   Webhook    │
│ (xlsxwriter) │     │ (/uploads)   │     │  (notify)    │
└──────────────┘     └──────────────┘     └──────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Scheduler (APScheduler)                                      │
│  - Daily: 2 AM UTC (EDGAR updates)                           │
│  - Quarterly: Post-earnings +2 days                          │
│  - Manual: Admin trigger via API                             │
└──────────────────────────────────────────────────────────────┘
```

---

## 2) Component Details

### 2.1 SEC EDGAR Downloader

**Library:** `sec-edgar-downloader 5.0.3+`

**Configuration:**
```python
# src/api/learning/ingestion/edgar_client.py
from sec_edgar_downloader import Downloader
from pathlib import Path
import time

class EDGARClient:
    """Download SEC filings with rate limiting"""
    
    def __init__(self, company_name: str, email: str):
        self.dl = Downloader(
            company_name=company_name,
            email_address=email,
            download_folder=Path('/tmp/sec-filings')
        )
        self.rate_limit_delay = 0.2  # 5 requests/second
    
    def download_10k(self, ticker: str, cik: str, years: int = 3) -> List[Path]:
        """Download 10-K filings for specified years"""
        filing_paths = []
        
        # Convert ticker to CIK if needed
        if not cik:
            cik = self._lookup_cik(ticker)
        
        # Download filings (auto rate-limited by library)
        self.dl.get('10-K', cik, after_date='2020-01-01', before_date='2025-12-31')
        
        # Get downloaded file paths
        filings_dir = Path('/tmp/sec-filings') / 'sec-edgar-filings' / cik / '10-K'
        
        for filing in sorted(filings_dir.iterdir(), reverse=True)[:years]:
            filing_paths.append(filing / 'full-submission.txt')
        
        time.sleep(self.rate_limit_delay)
        
        return filing_paths
    
    def download_10q(self, ticker: str, cik: str, quarters: int = 4) -> List[Path]:
        """Download 10-Q filings for specified quarters"""
        self.dl.get('10-Q', cik, limit=quarters)
        
        filings_dir = Path('/tmp/sec-filings') / 'sec-edgar-filings' / cik / '10-Q'
        return list(sorted(filings_dir.iterdir(), reverse=True)[:quarters])
    
    def _lookup_cik(self, ticker: str) -> str:
        """Lookup CIK from ticker"""
        import requests
        
        headers = {'User-Agent': 'NGI Capital App (learning@ngicapital.com)'}
        url = f'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={ticker}&type=10-K&count=1&output=atom'
        
        response = requests.get(url, headers=headers)
        # Parse CIK from response
        # Implementation details...
        return cik
```

**Rate Limiting:**
- SEC EDGAR: 10 requests/second max (we use 5/sec for safety)
- User-Agent required: `Company Name (email@domain.com)`
- Exponential backoff on 429 errors

---

### 2.2 PDF/HTML Parser

**Library:** `pdfplumber 0.11.4+` for PDFs, `BeautifulSoup4 4.12+` for HTML

**Configuration:**
```python
# src/api/learning/ingestion/parser.py
import pdfplumber
from bs4 import BeautifulSoup
import pandas as pd
import re

class FinancialStatementParser:
    """Extract financial tables from SEC filings"""
    
    def parse_10k_pdf(self, pdf_path: Path) -> Dict[str, pd.DataFrame]:
        """Extract income statement, balance sheet, cash flow from PDF"""
        statements = {}
        
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                
                # Detect statement type
                if self._is_income_statement(text):
                    tables = page.extract_tables()
                    statements['income_statement'] = self._clean_table(tables[0])
                
                elif self._is_balance_sheet(text):
                    tables = page.extract_tables()
                    statements['balance_sheet'] = self._clean_table(tables[0])
                
                elif self._is_cash_flow(text):
                    tables = page.extract_tables()
                    statements['cash_flow'] = self._clean_table(tables[0])
        
        return statements
    
    def parse_10k_html(self, html_path: Path) -> Dict[str, pd.DataFrame]:
        """Extract financial tables from HTML filing"""
        with open(html_path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')
        
        # Find financial statement tables
        tables = soup.find_all('table')
        statements = {}
        
        for table in tables:
            table_text = table.get_text()
            
            if 'Consolidated Statements of Income' in table_text:
                statements['income_statement'] = self._parse_html_table(table)
            
            elif 'Consolidated Balance Sheets' in table_text:
                statements['balance_sheet'] = self._parse_html_table(table)
            
            elif 'Consolidated Statements of Cash Flows' in table_text:
                statements['cash_flow'] = self._parse_html_table(table)
        
        return statements
    
    def _clean_table(self, table_data: List[List]) -> pd.DataFrame:
        """Clean extracted table data"""
        df = pd.DataFrame(table_data[1:], columns=table_data[0])
        
        # Remove $ and parentheses
        df = df.apply(lambda x: x.str.replace('$', '').str.replace(',', '').str.replace('(', '-').str.replace(')', '') if x.dtype == 'object' else x)
        
        # Convert to numeric
        for col in df.columns[1:]:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        return df
    
    def _is_income_statement(self, text: str) -> bool:
        """Detect if page contains income statement"""
        keywords = ['income statement', 'statement of operations', 'revenue', 'net income']
        return any(kw in text.lower() for kw in keywords)
```

**Challenge Handling:**
- **Multiple Formats:** PDFs vary by company; use regex + heuristics
- **Table Detection:** pdfplumber's `extract_tables()` with manual review
- **Missing Data:** Log warnings, populate with NULL, flag for manual review

---

### 2.3 Data Transformer

**Purpose:** Normalize heterogeneous SEC data into standardized schema

**Configuration:**
```python
# src/api/learning/ingestion/transformer.py
from pydantic import BaseModel, Field, validator
from typing import Dict, List, Optional
from datetime import date

class FinancialStatementSchema(BaseModel):
    """Standardized financial statement schema"""
    company_id: int
    statement_type: str  # 'IS', 'BS', 'CF'
    fiscal_period: date
    period_type: str  # 'FY', 'Q1', 'Q2', 'Q3', 'Q4'
    line_items: Dict[str, float]  # e.g., {'revenue': 81462, 'cogs': -55000}
    
    @validator('line_items')
    def validate_line_items(cls, v, values):
        """Ensure required line items are present"""
        required_items = {
            'IS': ['revenue', 'cogs', 'gross_profit', 'operating_income', 'net_income'],
            'BS': ['total_assets', 'total_liabilities', 'total_equity'],
            'CF': ['operating_cash_flow', 'investing_cash_flow', 'financing_cash_flow']
        }
        
        stmt_type = values.get('statement_type')
        if stmt_type in required_items:
            missing = set(required_items[stmt_type]) - set(v.keys())
            if missing:
                raise ValueError(f'Missing required line items: {missing}')
        
        return v

class DataTransformer:
    """Transform parsed SEC data to standardized schema"""
    
    # Mapping of common SEC line item labels to standardized names
    LINE_ITEM_MAPPINGS = {
        'Total revenues': 'revenue',
        'Net revenues': 'revenue',
        'Revenues': 'revenue',
        'Cost of revenues': 'cogs',
        'Cost of goods sold': 'cogs',
        'Operating income': 'operating_income',
        'Income from operations': 'operating_income',
        'Net income': 'net_income',
        'Net income (loss)': 'net_income',
        # ... many more mappings
    }
    
    def transform_income_statement(self, df: pd.DataFrame, company_id: int, fiscal_period: date) -> FinancialStatementSchema:
        """Transform income statement to schema"""
        line_items = {}
        
        for idx, row in df.iterrows():
            label = row[0]  # First column is label
            value = row[1]  # Second column is value (current year)
            
            # Map to standardized name
            std_name = self._map_line_item(label)
            if std_name:
                line_items[std_name] = float(value) if pd.notna(value) else 0.0
        
        return FinancialStatementSchema(
            company_id=company_id,
            statement_type='IS',
            fiscal_period=fiscal_period,
            period_type='FY',
            line_items=line_items
        )
    
    def _map_line_item(self, label: str) -> Optional[str]:
        """Map SEC label to standardized name"""
        label_clean = label.strip().lower()
        
        for sec_label, std_name in self.LINE_ITEM_MAPPINGS.items():
            if sec_label.lower() in label_clean:
                return std_name
        
        return None
```

---

### 2.4 Excel Package Generator

**Library:** `xlsxwriter 3.2.9+`

**Configuration:**
```python
# src/api/learning/ingestion/excel_generator.py
from src.api.learning.excel_generation import LearningExcelPackage

class IngestionExcelGenerator:
    """Generate Excel packages from ingested data"""
    
    def generate_package(self, company_id: int, db: Session) -> str:
        """Generate Excel package for company"""
        
        # Fetch company and latest financial data
        company = db.query(LearningCompany).filter_by(id=company_id).first()
        latest_data = db.query(FinancialStatement).filter_by(
            company_id=company_id
        ).order_by(FinancialStatement.fiscal_period.desc()).all()
        
        # Prepare data for Excel
        company_data = {
            'id': company.id,
            'ticker': company.ticker,
            'name': company.company_name,
            'industry': company.industry,
            'fiscal_year_end': company.fiscal_year_end,
            'financial_data': self._format_for_excel(latest_data)
        }
        
        # Generate package
        generator = LearningExcelPackage(company_data)
        filename = generator.generate()
        
        # Save package record
        package = LearningPackage(
            company_id=company_id,
            version=self._get_next_version(company_id, db),
            package_date=datetime.now().date(),
            file_path=f'/uploads/learning-packages/{filename}',
            validation_status='passed'
        )
        db.add(package)
        db.commit()
        
        return filename
    
    def _format_for_excel(self, financial_data: List[FinancialStatement]) -> Dict:
        """Format financial data for Raw Import tab"""
        formatted = {
            'income_statement': [],
            'balance_sheet': [],
            'cash_flow': []
        }
        
        for stmt in financial_data:
            if stmt.statement_type == 'IS':
                formatted['income_statement'].append({
                    'period': stmt.fiscal_period,
                    'line_items': stmt.line_items
                })
            # ... similarly for BS and CF
        
        return formatted
```

---

### 2.5 Scheduler (APScheduler)

**Configuration:**
```python
# src/api/learning/ingestion/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime

class IngestionScheduler:
    """Schedule automated ingestion jobs"""
    
    def __init__(self):
        self.scheduler = BackgroundScheduler()
    
    def start(self):
        """Start scheduled jobs"""
        
        # Daily ingestion at 2 AM UTC (after EDGAR updates)
        self.scheduler.add_job(
            func=self.run_daily_ingestion,
            trigger=CronTrigger(hour=2, minute=0),
            id='daily_ingestion',
            name='Daily SEC Ingestion',
            replace_existing=True
        )
        
        # Quarterly post-earnings (manual trigger via webhook)
        # Students notified via email when new packages available
        
        self.scheduler.start()
    
    def run_daily_ingestion(self):
        """Run ingestion for all active companies"""
        from src.db.session import get_db
        
        db = next(get_db())
        companies = db.query(LearningCompany).filter_by(is_active=True).all()
        
        for company in companies:
            try:
                self.ingest_company(company.id, db)
            except Exception as e:
                logger.error(f'Ingestion failed for {company.ticker}: {str(e)}')
    
    def ingest_company(self, company_id: int, db: Session):
        """Run full ingestion pipeline for one company"""
        
        # 1. Fetch SEC filings
        edgar = EDGARClient('NGI Capital', 'learning@ngicapital.com')
        company = db.query(LearningCompany).filter_by(id=company_id).first()
        filings = edgar.download_10k(company.ticker, company.cik, years=3)
        
        # 2. Parse filings
        parser = FinancialStatementParser()
        statements = []
        for filing in filings:
            data = parser.parse_10k_html(filing)
            statements.extend(data.values())
        
        # 3. Transform and validate
        transformer = DataTransformer()
        for stmt_df in statements:
            schema = transformer.transform_income_statement(stmt_df, company_id, datetime.now())
            # Save to database
            # ...
        
        # 4. Generate Excel package
        generator = IngestionExcelGenerator()
        filename = generator.generate_package(company_id, db)
        
        # 5. Notify users
        self.notify_package_ready(company_id, filename)
```

---

## 3) API Endpoints

```python
# src/api/learning/ingestion/routes.py
from fastapi import APIRouter, Depends, HTTPException
from src.api.auth import require_admin

router = APIRouter(prefix="/api/learning/admin", tags=["admin-ingestion"])

@router.post("/ingest/{company_id}")
async def trigger_ingestion(
    company_id: int,
    admin_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Manually trigger ingestion for a company"""
    
    company = db.query(LearningCompany).filter_by(id=company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Queue ingestion job
    scheduler = IngestionScheduler()
    scheduler.ingest_company(company_id, db)
    
    return {"status": "ingestion_started", "company": company.ticker}

@router.get("/ingestion-status/{company_id}")
async def get_ingestion_status(
    company_id: int,
    admin_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get ingestion status for a company"""
    
    latest_package = db.query(LearningPackage).filter_by(
        company_id=company_id
    ).order_by(LearningPackage.created_at.desc()).first()
    
    if not latest_package:
        return {"status": "no_packages", "last_ingested": None}
    
    return {
        "status": "completed",
        "last_ingested": latest_package.created_at,
        "version": latest_package.version,
        "file_path": latest_package.file_path
    }
```

---

## 4) Error Handling & Logging

```python
# src/api/learning/ingestion/error_handler.py
import structlog
from typing import Dict, Any

logger = structlog.get_logger(__name__)

class IngestionError(Exception):
    """Base exception for ingestion errors"""
    pass

class EDGARFetchError(IngestionError):
    """Error fetching from SEC EDGAR"""
    pass

class ParsingError(IngestionError):
    """Error parsing financial statements"""
    pass

class ValidationError(IngestionError):
    """Error validating transformed data"""
    pass

def log_ingestion_event(event_type: str, company_id: int, details: Dict[str, Any]):
    """Structured logging for ingestion events"""
    logger.info(
        event_type,
        company_id=company_id,
        timestamp=datetime.utcnow().isoformat(),
        **details
    )

# Usage
log_ingestion_event('ingestion_started', company_id=1, details={'ticker': 'TSLA'})
log_ingestion_event('parsing_complete', company_id=1, details={'statements_found': 3})
log_ingestion_event('package_generated', company_id=1, details={'filename': 'TSLA_2025_Model_v1.xlsx'})
```

---

## 5) Monitoring & Alerting

**Metrics to Track:**
- Ingestion success rate (target: >95%)
- Average ingestion time per company (target: <5 minutes)
- Parser accuracy (line items extracted / total line items)
- Package generation failures
- Storage utilization

**Alerts:**
- Ingestion failure for >2 companies in a day
- SEC EDGAR rate limit exceeded
- Parsing accuracy <80%
- Disk space <20% available

---

**This architecture ensures reliable, scalable, and maintainable data ingestion for the NGI Learning Module!**

