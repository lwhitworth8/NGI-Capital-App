# NGI Capital Accounting Module - Master PRD

## Document Version
- **Version**: 1.0
- **Last Updated**: October 3, 2025
- **Status**: In Development
- **Compliance**: US GAAP 2025 (ASC 606, 820, 842, 230, 944, 350)

---

## Executive Summary

The NGI Capital Accounting Module is a comprehensive, US GAAP-compliant financial management system designed to support parent company (NGI Capital Inc., future C-Corp) and all subsidiary entities. The system handles document ingestion, automated journal entry creation, multi-entity consolidated reporting, and provides investor-ready financial statements.

### Key Objectives
1. **Modern UX**: Tech-focused, intuitive interface for all accounting workflows
2. **Entity Management**: Support LLC -> C-Corp conversion and multi-entity structure
3. **GAAP Compliance**: Full adherence to 2025 US GAAP standards
4. **Automation**: AI-powered document extraction and Mercury Bank integration
5. **Consolidated Reporting**: Parent + subsidiary financial statement consolidation
6. **Audit Ready**: Complete audit trail, dual approval workflows, investor demos

---

## System Architecture

### Entity Structure
```
NGI Capital Inc. (C-Corp, Parent - Post Conversion)
├── NGI Capital Advisory LLC (Subsidiary - Remains active)
├── Future Entity 1 LLC (Subsidiary)
└── Future Entity 2 LLC (Subsidiary)

NGI Capital LLC (Original - Closed after conversion, historical data preserved)
```

### Technical Stack
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Frontend**: Next.js 15 + React 18 + TypeScript
- **Document Processing**: pypdf, python-docx, pytesseract (OCR)
- **Banking**: Mercury Bank API integration
- **Testing**: pytest (backend), Jest (frontend), Playwright (E2E)

---

## US GAAP 2025 Compliance Requirements

### Core Standards Implementation

#### ASC 606 - Revenue Recognition
- **5-Step Model**: Identify contract → performance obligations → transaction price → allocate → recognize
- **Deferred Revenue**: Track and roll forward unearned revenue
- **Contract Costs**: Capitalize incremental costs, amortize over contract life
- **Disclosures**: Disaggregated revenue, contract balances, performance obligations

#### ASC 842 - Leases
- **Recognition**: Record ROU assets and lease liabilities on balance sheet
- **Classification**: Operating vs finance lease determination
- **Measurement**: Present value of lease payments using incremental borrowing rate
- **Presentation**: Separate current vs noncurrent lease liabilities

#### ASC 820 - Fair Value
- **Hierarchy**: Level 1 (quoted prices), Level 2 (observable inputs), Level 3 (unobservable)
- **Measurements**: Fair value for investments, stock-based compensation
- **Disclosures**: Valuation techniques, significant assumptions

#### ASC 230 - Cash Flows
- **Method**: Indirect method for operating activities
- **Sections**: Operating, Investing, Financing cash flows
- **Reconciliation**: Net income to operating cash flow
- **Non-cash**: Schedule of non-cash investing/financing activities

#### 2025 New Requirements
- **Expense Disaggregation**: Show expenses by function (R&D, S&M, G&A) AND nature (salaries, rent, software)
- **Comprehensive Income**: Present net income + OCI components
- **Segment Reporting**: Chief Operating Decision Maker (CODM) identified segments
- **Crypto Assets**: Fair value measurement if applicable

---

## Functional Modules

### Module 1: Documents Center
**Epic**: Comprehensive document management for all entities

**Requirements**:
- Upload/scan documents with AI extraction
- Document types: Formation, Legal, Banking, Invoices, Receipts, Contracts, Tax
- Version control with amendment tracking
- Entity-specific and consolidated views
- Search, filter, categorization
- Document workflow status (pending, approved, archived)

**Document Types by Category**:
1. **Formation Documents**
   - Articles of Organization/Incorporation
   - Operating Agreement / Bylaws
   - EIN Assignment Letter
   - State Registration Certificates
   - Assumed Name Certificates (DBA)

2. **Legal Documents**
   - Contracts and Agreements
   - NDAs and Confidentiality Agreements
   - Lease Agreements
   - Employment Agreements
   - Independent Contractor Agreements
   - IP Assignment Agreements

3. **Banking Documents**
   - Bank Statements (monthly)
   - Loan Agreements
   - Credit Card Statements
   - Wire Transfer Confirmations
   - Check Images

4. **Accounting Source Documents**
   - Invoices (AR)
   - Bills (AP)
   - Receipts
   - Expense Reports
   - Purchase Orders
   - Credit Memos

5. **Tax Documents**
   - Form 1065 (LLC Partnership Return)
   - Form 1120 (C-Corp Return)
   - K-1s (Partner distributions)
   - State Tax Returns
   - Sales Tax Returns
   - Payroll Tax Forms (941, 940, W-2, W-3)

6. **Internal Controls**
   - Internal Control Policies
   - Segregation of Duties Matrix
   - Authorization Limits
   - Risk Assessment Documents

### Module 2: Chart of Accounts
**Epic**: Pre-seeded 5-digit US GAAP-compliant COA

**Structure** (standard ranges):
```
10000-19999: Assets
  11000-11999: Current Assets
    11100-11199: Cash & Cash Equivalents
    11200-11299: Accounts Receivable
    11300-11399: Inventory
    11400-11499: Prepaid Expenses
    11500-11599: Contract Assets (ASC 606)
    11600-11699: Other Current Assets
  12000-12999: Noncurrent Assets
    12100-12199: Property, Plant & Equipment
    12200-12299: Accumulated Depreciation (contra)
    12300-12399: Right-of-Use Assets (ASC 842)
    12400-12499: Intangible Assets
    12500-12599: Capitalized Software (ASC 350)
    12600-12699: Investments
    12900-12999: Other Noncurrent Assets

20000-29999: Liabilities
  21000-21999: Current Liabilities
    21100-21199: Accounts Payable
    21200-21299: Accrued Expenses
    21300-21399: Deferred Revenue - Current (ASC 606)
    21400-21499: Current Lease Liabilities (ASC 842)
    21500-21599: Notes Payable - Current
    21900-21999: Other Current Liabilities
  22000-22999: Noncurrent Liabilities
    22100-22199: Notes Payable - Noncurrent
    22200-22299: Noncurrent Lease Liabilities (ASC 842)
    22300-22399: Deferred Revenue - Noncurrent
    22900-22999: Other Noncurrent Liabilities

30000-39999: Equity
  31000-31999: Common Stock (C-Corp)
  32000-32999: Additional Paid-in Capital (APIC)
  33000-33999: Retained Earnings / Accumulated Deficit
  34000-34999: Accumulated Other Comprehensive Income (AOCI)
  35000-35999: Members' Equity (LLC)
  36000-36999: Treasury Stock (contra)

40000-49999: Revenue
  41000-41999: Service Revenue
  42000-42999: Product Revenue
  43000-43999: Subscription Revenue
  44000-44999: Other Revenue
  45000-45999: Interest Income
  46000-46999: Gain on Sale of Assets

50000-59999: Cost of Revenue
  51000-51999: Cost of Services
  52000-52999: Cost of Goods Sold
  53000-53999: Depreciation - COGS

60000-69999: Operating Expenses
  61000-61999: Research & Development
    61100: R&D Salaries
    61200: R&D Contractors
    61300: R&D Software & Tools
    61400: R&D Facilities
  62000-62999: Sales & Marketing
    62100: S&M Salaries
    62200: Advertising
    62300: Marketing Programs
    62400: S&M Travel
  63000-63999: General & Administrative
    63100: G&A Salaries
    63200: Office Rent
    63300: Professional Fees (legal, accounting)
    63400: Insurance
    63500: Software & Subscriptions
    63600: Bank Fees
    63700: Meals & Entertainment
    63800: Travel
    63900: Other G&A

70000-79999: Other Income/Expense
  71000: Interest Expense
  72000: Loss on Sale of Assets
  73000: Foreign Exchange Gain/Loss
  74000: Other Non-Operating Income/Expense

80000-89999: Income Tax
  81000: Current Tax Expense
  82000: Deferred Tax Expense
```

**Mercury Mapping Intelligence**:
- Auto-categorize transactions based on merchant, amount, description
- Machine learning from historical categorizations
- Suggest account mapping with confidence score
- Manual override with learning

### Module 3: Journal Entries
**Epic**: Auto-created entries with dual approval

**Sources**:
1. **Mercury Bank Transactions** (auto-create, pending approval)
2. **Document Uploads** (invoices -> JE suggestions)
3. **Manual Entries** (adjusting, closing, correcting)
4. **System-Generated** (depreciation, amortization, revenue recognition)

**Workflow**:
1. Transaction occurs → JE created in "Draft" status
2. System categorizes and suggests accounts
3. User reviews → "Submit for Approval"
4. Co-founder approval required → "Approved"
5. Post to GL → "Posted" (immutable)

**Controls**:
- Debits must equal credits
- Posted entries immutable (only reversing entries allowed)
- Dual approval for entries >$500
- Audit trail of all changes

### Module 4: Financial Reporting
**Epic**: Full 5 GAAP statements + notes

**Statements**:

1. **Balance Sheet (Classified)**
   - Current Assets / Noncurrent Assets
   - Current Liabilities / Noncurrent Liabilities
   - Stockholders' Equity (Common, APIC, Retained Earnings, AOCI)
   - Assets = Liabilities + Equity (validation)

2. **Income Statement (Multi-Step)**
   - Revenue (disaggregated by type)
   - Cost of Revenue
   - Gross Profit
   - Operating Expenses (R&D, S&M, G&A)
   - Operating Income
   - Other Income/Expense
   - Income Before Tax
   - Income Tax Expense
   - Net Income

3. **Statement of Comprehensive Income**
   - Net Income
   - Other Comprehensive Income (OCI)
     - Foreign currency translation
     - Unrealized gains/losses on investments
   - Total Comprehensive Income

4. **Statement of Stockholders' Equity**
   - Beginning balances
   - Stock issuances
   - Stock-based compensation
   - Net income
   - Other comprehensive income
   - Ending balances

5. **Statement of Cash Flows (Indirect)**
   - Operating Activities (reconcile net income)
   - Investing Activities
   - Financing Activities
   - Net increase/decrease in cash
   - Beginning + ending cash balances

**Notes to Financial Statements**:
1. Nature of Business
2. Summary of Significant Accounting Policies
3. Revenue Recognition (ASC 606)
4. Leases (ASC 842)
5. Fair Value Measurements (ASC 820)
6. Debt
7. Stockholders' Equity
8. Stock-Based Compensation
9. Income Taxes
10. Commitments and Contingencies
11. Subsequent Events

### Module 5: Internal Controls
**Epic**: Document-driven controls display

**Categories**:
1. Financial Controls
2. Operational Controls
3. Compliance Controls
4. Authorization & Approval
5. Segregation of Duties
6. IT & Security (placeholder for v1)

**Features**:
- Extract from uploaded Word/PDF documents
- Visual card-based UI with animations
- Status: Implemented, In Progress, Planned
- Risk level: High, Medium, Low
- Responsible parties
- Review frequency
- Evidence attachments

### Module 6: Bank Reconciliation
**Epic**: Automated Mercury sync with approval

**Process**:
1. Daily Mercury transaction import
2. Auto-match to posted journal entries
3. Flag unmatched items
4. User reviews and reconciles
5. Co-founder approval
6. Month-end certification

### Module 7: Entity Conversion
**Epic**: LLC to C-Corp conversion workflow

**Features**:
- Conversion date tracking
- Equity structure conversion (Members -> Common Stock + APIC)
- Historical data preservation for LLC
- Tax election tracking (Form 8832)
- State filing integration (Certificate of Conversion)
- Automatic account remapping
- Audit trail of conversion

**Accounting Treatment**:
- Members' Capital → Common Stock (par value) + APIC (excess)
- Retained earnings carried forward
- No gain/loss recognition (tax-free reorganization)
- Dual books during transition period

### Module 8: Consolidated Reporting
**Epic**: Parent + subsidiary consolidation

**Consolidation Entries**:
- Eliminate intercompany transactions
- Eliminate intercompany balances
- Investment in subsidiary elimination
- Noncontrolling interest (if applicable)

**Reports**:
- Consolidated Balance Sheet
- Consolidated Income Statement
- Consolidating schedules (show parent, subs, eliminations)

### Module 9: Period Close
**Epic**: Month/quarter/year-end close

**Checklist**:
1. Bank reconciliation complete
2. All invoices/bills entered
3. Accruals recorded
4. Prepaid amortization
5. Depreciation calculated
6. Revenue recognition adjustments
7. Intercompany eliminations
8. Trial balance balanced
9. Financial statements reviewed
10. Co-founder approval

**Lock Period**: Prevent changes after close

---

## Testing Requirements

### Backend (pytest)
- `test_accounting_compliance.py` - GAAP validation
- `test_journal_entries_workflow.py` - Full JE lifecycle
- `test_financial_statements_gaap.py` - All 5 statements
- `test_consolidation.py` - Parent + subs
- `test_entity_conversion.py` - LLC -> C-Corp
- `test_mercury_integration.py` - Banking sync
- `test_document_extraction.py` - AI processing
- `test_period_close.py` - Close workflow
- `test_performance_500_transactions.py` - Load testing

### Frontend (Jest)
- `chart-of-accounts.test.tsx` - COA display
- `journal-entries.test.tsx` - JE form validation
- `financial-reports.test.tsx` - Statement rendering
- `documents.test.tsx` - Upload workflow
- `internal-controls.test.tsx` - Controls display
- `entity-conversion.test.tsx` - Conversion UI

### E2E (Playwright)
- `accounting-full-cycle.spec.ts` - Upload doc → JE → Close → Reports
- `multi-entity-consolidation.spec.ts` - Entity workflows
- `approval-workflows.spec.ts` - Dual approval
- `bank-reconciliation.spec.ts` - Mercury sync end-to-end

---

## Success Criteria

1. **Functional**:
   - All 5 GAAP statements generate correctly
   - Consolidated reports accurate
   - Entity conversion completes without data loss
   - Mercury transactions auto-categorize >90% accuracy

2. **Performance**:
   - 500+ transactions process in <5 seconds
   - Financial statement generation <3 seconds
   - Document upload and extraction <10 seconds

3. **Compliance**:
   - 100% GAAP compliant (validated by tests)
   - Audit trail complete for all transactions
   - Dual approval enforced

4. **UX**:
   - Intuitive navigation (user testing >4/5 rating)
   - Mobile responsive
   - Investor demo-ready

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Mercury API changes | High | Versioned API, fallback manual import |
| Document extraction accuracy | Medium | Human review workflow, learning feedback loop |
| Consolidation complexity | High | Comprehensive testing, CPA review |
| Entity conversion edge cases | Medium | Legal/tax advisor validation, extensive tests |
| Performance with large datasets | Medium | Query optimization, caching, pagination |

---

## Dependencies

- Mercury Bank API access and credentials
- Internal Controls policy document
- Legal counsel for entity conversion guidance
- CPA review of GAAP compliance
- Formation documents for all entities

---

## Timeline

**Phase 1: Foundation** (Weeks 1-2)
- Documents Module UX
- Chart of Accounts pre-seeding
- Entity selector standardization

**Phase 2: Core Accounting** (Weeks 3-5)
- Journal Entries workflow
- Financial Reporting (all 5 statements)
- Bank Reconciliation automation

**Phase 3: Advanced Features** (Weeks 6-7)
- Internal Controls
- Entity Conversion
- Consolidated Reporting
- Period Close

**Phase 4: Testing & QA** (Weeks 8-9)
- Backend tests (complete suite)
- Frontend tests
- E2E workflows
- Performance testing
- Final QA report

**Total**: 9 weeks to production-ready

---

## Appendix A: Document Types Checklist

### Formation (One-time, with amendments)
- [ ] Articles of Organization/Incorporation
- [ ] Operating Agreement / Corporate Bylaws
- [ ] EIN Assignment Letter (IRS SS-4)
- [ ] State Business Registration
- [ ] Assumed Name Certificate (if applicable)
- [ ] Foreign Qualification (if operating in other states)

### Ongoing Legal
- [ ] Contracts (customer, vendor, partnership)
- [ ] NDAs
- [ ] Lease agreements
- [ ] Employment agreements
- [ ] Contractor agreements
- [ ] IP assignments

### Banking (Monthly)
- [ ] Bank statements
- [ ] Credit card statements
- [ ] Loan statements
- [ ] Investment account statements

### Accounting (As incurred)
- [ ] Invoices sent (AR)
- [ ] Bills received (AP)
- [ ] Receipts
- [ ] Expense reports
- [ ] Purchase orders

### Tax (Annual/Quarterly)
- [ ] Federal tax returns (1065 / 1120)
- [ ] State tax returns
- [ ] K-1s
- [ ] Payroll tax forms
- [ ] Sales tax returns

### Internal (Annual review)
- [ ] Internal control policies
- [ ] Segregation of duties documentation
- [ ] Authorization limits
- [ ] Risk assessments

---

## Appendix B: Mercury Transaction Categorization Rules

### Auto-Categorization Logic
1. **Merchant Match**: Known merchant database
2. **Amount Patterns**: Recurring amounts (rent, subscriptions)
3. **Description Keywords**: Payroll, insurance, software, etc.
4. **Historical Learning**: User corrections improve model

### Confidence Scoring
- **High (>90%)**: Auto-post with notification
- **Medium (70-90%)**: Suggest, require user confirmation
- **Low (<70%)**: Flag for manual review

### Example Rules
```
Merchant: "AWS" → 63500 (Software)
Merchant: "Mercury" → 63600 (Bank Fees)
Merchant: "WeWork" → 63200 (Office Rent)
Description: "Payroll" → 6X100 (Salaries by department)
Description: "Insurance" → 63400 (Insurance)
Amount: $2000/month → 63200 (Office Rent - recurring)
```

---

*End of Master PRD*

