# NGI CAPITAL - COMPLETE WORKFLOW-BASED REFACTOR PLAN
**Date:** October 5, 2025
**Status:** Professional-Grade Accounting System Design

---

## PROFESSIONAL ACCOUNTING WORKFLOW (The Right Way)

Based on QuickBooks, NetSuite, Xero workflows and US GAAP requirements.

### THE COMPLETE ACCOUNTING CYCLE (Start to Finish)

```
STEP 1: SOURCE DOCUMENTS
[Enter once] --> [Flows to everything else]

STEP 2: RECORD TRANSACTIONS
[Auto-create journal entries]

STEP 3: POST TO LEDGER
[After approval]

STEP 4: TRIAL BALANCE
[Real-time, always balanced]

STEP 5: ADJUSTING ENTRIES
[Period-end automation]

STEP 6: FINANCIAL STATEMENTS
[Auto-generated from ledger]

STEP 7: CLOSE PERIOD
[Lock books, prevent backdating]

STEP 8: TAX & COMPLIANCE
[Export for CPAs, file returns]
```

---

## UI NAVIGATION STRUCTURE (Professional Software Pattern)

### CURRENT PROBLEM:
- Too many left nav items
- Standalone modules disconnect workflows
- No clear progression through accounting cycle

### NEW STRUCTURE (Like QuickBooks/NetSuite):

```
TOP NAVIGATION (Main Modules):
[Dashboard] [Banking] [Sales] [Purchases] [Accounting] [Reports] [Tax] [Settings]

ACCOUNTING DROPDOWN:
- Chart of Accounts
- Journal Entries
- Trial Balance
- Period Close
- Approvals (pending items)

SUB-WINDOWS / MODALS (Not separate pages):
- Entity selector (top right, always visible)
- Document upload (modal anywhere)
- Quick create JE (slide-over)
- Approval flow (modal)

WORKFLOW PAGES (Linear flow):
Banking --> Reconciliation --> Journal Entries --> Approvals --> Post --> Reports
Sales --> Invoices --> AR --> Revenue Recognition --> Cash Receipt --> Reports
Purchases --> Bills --> AP --> Payments --> Reports
```

---

## COMPLETE WORKFLOW INTEGRATION MAP

### 1. BANKING WORKFLOW
```
Mercury Bank Transaction
  |
  v
[Auto-match to existing JE]
  |
  +--> Matched: Mark reconciled
  |
  +--> Unmatched: Suggest account
        |
        v
     Create JE
        |
        v
     [Approval Queue]
        |
        v
     Post to Ledger
        |
        v
     Financial Statements
```

**Implementation:**
- Keep bank-reconciliation as is
- Enhance auto-matching
- Direct link to create JE from unmatched transaction

---

### 2. SALES WORKFLOW (AR)
```
Customer Order
  |
  v
Create Invoice
  |
  +--> Immediate Revenue: Cr Revenue
  |
  +--> Deferred Revenue: Cr Deferred Revenue
        |
        +-->  Recognition Schedule Created
                |
                v
             Period-End Processing
                |
                v
             Auto-create JEs (need approval)
  |
  v
Auto-create JE: Dr AR, Cr Revenue/Deferred
  |
  v
[Approval Queue]
  |
  v
Post to Ledger
  |
  v
Customer receives invoice
  |
  v
Payment Received
  |
  v
Create JE: Dr Cash, Cr AR
  |
  v
[Approval Queue]
  |
  v
Post & Mark Invoice Paid
```

**Status:** DONE (just completed)
**Location:** /api/ar/* routes
**UI:** Needs better integration into main flow

---

### 3. PURCHASES WORKFLOW (AP)
```
Vendor Bill/Invoice Received
  |
  v
[Optional: Check against PO + Receipt = 3-way match]
  |
  v
Enter Bill
  |
  v
Auto-create JE: Dr Expense, Cr AP
  |
  v
[Approval Queue]
  |
  v
Post to Ledger
  |
  v
Payment Due Date Tracking
  |
  v
Schedule Payment
  |
  v
Create Payment JE: Dr AP, Cr Cash
  |
  v
[Approval Queue]
  |
  v
Post & Mark Bill Paid
```

**Status:** MISSING - Need to build
**Priority:** CRITICAL
**Location:** Need /api/ap/* routes

---

### 4. FIXED ASSETS WORKFLOW
```
Purchase Asset (Computer, Furniture, etc)
  |
  v
Create Fixed Asset Record
  - Cost, Date, Useful Life, Method
  |
  v
Create Purchase JE:
  Dr Fixed Asset (balance sheet)
  Cr Cash/AP
  |
  v
[Approval & Post]
  |
  v
AUTOMATED MONTHLY PROCESS:
  Calculate Depreciation
  |
  v
  Auto-create Depreciation JE:
    Dr Depreciation Expense (P&L)
    Cr Accumulated Depreciation (Balance Sheet)
  |
  v
  [Approval Queue - batch all depreciation]
  |
  v
  Post to Ledger
  |
  v
  Financial Statements (correct asset values)
```

**Status:** MISSING - Critical gap
**Priority:** CRITICAL for GAAP
**Location:** Need /api/fixed-assets/* routes

---

### 5. EXPENSE REIMBURSEMENT WORKFLOW
```
Employee Submits Expense Report
  - Upload receipts
  - Categorize expenses
  - Enter amounts
  |
  v
Manager Approval
  |
  v
Accounting Review
  |
  v
Create JE:
  Dr Expense Accounts (by category)
  Cr Employee Reimbursement Payable
  |
  v
[Approval Queue]
  |
  v
Post to Ledger
  |
  v
Payment Processing
  |
  v
Create Payment JE:
  Dr Employee Reimbursement Payable
  Cr Cash
  |
  v
[Approval & Post]
  |
  v
Employee Reimbursed
```

**Status:** MISSING
**Priority:** HIGH
**Location:** Need /api/expenses/* routes

---

### 6. PAYROLL WORKFLOW
```
Bi-weekly Payroll Run
  |
  v
Calculate:
  - Gross Pay
  - Federal Tax Withholding
  - State Tax Withholding
  - Social Security (6.2%)
  - Medicare (1.45%)
  - Benefits Deductions
  - Net Pay
  |
  v
Auto-create Payroll JE:
  Dr Salaries Expense          $10,000
  Dr Payroll Tax Expense (ER)   $1,200
  Cr Cash (net pay)                     $7,500
  Cr Federal Tax Payable                $1,500
  Cr State Tax Payable                    $300
  Cr Social Security Payable              $620
  Cr Medicare Payable                     $145
  Cr 401k Payable                         $500
  Cr Benefits Payable                     $635
  |
  v
[Approval Queue]
  |
  v
Post to Ledger
  |
  v
Process Payments:
  - Direct Deposit to Employees
  - Tax Remittances to IRS/State
  - Benefits payments
```

**Status:** MISSING
**Priority:** HIGH
**Integration:** Gusto/ADP OR manual JE automation

---

### 7. TAX WORKFLOW (Integrate Existing Tax Module)
```
EXISTING TAX MODULE IN: src/api/routes/tax.py

CURRENT FEATURES:
- Tax registrations
- Tax obligations calendar
- Tax filings tracking
- Tax document storage
- Tax calculators

INTEGRATION NEEDED:
  |
  v
Connect to Chart of Accounts:
  - Tax Expense Accounts
  - Tax Payable Accounts
  - Deferred Tax Assets/Liabilities
  |
  v
Period-End Tax Accrual:
  Auto-calculate estimated tax
  |
  v
  Create JE:
    Dr Income Tax Expense
    Cr Income Tax Payable
  |
  v
  [Approval & Post]
  |
  v
Tax Payment:
  Create JE:
    Dr Income Tax Payable
    Cr Cash
  |
  v
  Record in tax_payments table
  |
  v
Tax Filing:
  Export data from accounting
  Use tax calculators
  Record filing in tax_filings table
```

**Status:** TAX MODULE EXISTS - needs accounting integration
**Priority:** HIGH
**Action:** Link tax module to accounting JEs

---

### 8. PERIOD-END CLOSE WORKFLOW
```
Month-End Close Checklist:

[1] Bank Reconciliation
    - All accounts reconciled
    - Outstanding items identified
    
[2] Revenue Recognition
    - Run automated process
    - Review and approve JEs
    
[3] Fixed Asset Depreciation
    - Run automated process
    - Review and approve JEs
    
[4] Accruals & Prepaids
    - Review schedules
    - Create adjusting JEs
    
[5] AP Accruals
    - Unbilled vendor services
    - Create accrual JEs
    
[6] Tax Provision
    - Calculate estimated tax
    - Create tax accrual JE
    
[7] Payroll Accruals
    - Unpaid salaries/wages
    - Create accrual JE
    
[8] Trial Balance Review
    - Check for unusual balances
    - Investigate variances
    
[9] Financial Statement Review
    - Review all statements
    - Check for errors
    
[10] Approval & Sign-off
     - CFO approval
     - CEO approval
     
[11] LOCK PERIOD
     - Prevent further posting to closed period
     - Generate final statements
```

**Status:** PARTIAL - has framework
**Enhancement:** Add automated workflows

---

## DATABASE INTEGRATION MAP

### CURRENT TABLES:
```
accounting_entities
chart_of_accounts
journal_entries
journal_entry_lines
accounting_documents
bank_accounts
bank_transactions
```

### MISSING CRITICAL TABLES:
```
[ ] vendors
[ ] ap_invoices (bills)
[ ] bill_payments
[ ] purchase_orders
[ ] goods_receipts

[ ] fixed_assets
[ ] depreciation_schedules
[ ] depreciation_entries

[ ] expense_reports
[ ] expense_lines
[ ] corporate_cards

[ ] payroll_runs
[ ] payroll_lines
[ ] tax_withholdings

[ ] budgets
[ ] budget_lines
```

### EXISTING TAX TABLES (Keep & Integrate):
```
[X] tax_registrations
[X] tax_obligations
[X] tax_filings
[X] tax_payments
[X] tax_documents
[X] tax_calendar
```

---

## API ROUTE ORGANIZATION

### CURRENT STRUCTURE:
```
/api/accounting/...  (general accounting)
/api/ar/...          (accounts receivable - NEW)
/api/tax/...         (tax module - EXISTS)
```

### NEEDED STRUCTURE:
```
/api/accounting/
  - /chart-of-accounts
  - /journal-entries
  - /trial-balance
  - /period-close
  - /financial-reporting

/api/banking/
  - /accounts
  - /transactions
  - /reconciliation

/api/ar/
  - /customers
  - /invoices
  - /payments
  - /revenue-recognition/process-period

/api/ap/  [NEW - CRITICAL]
  - /vendors
  - /bills
  - /bill-payments
  - /aging-report
  - /three-way-match

/api/fixed-assets/  [NEW - CRITICAL]
  - /assets
  - /depreciation-schedules
  - /depreciation/process-period
  - /disposals

/api/expenses/  [NEW - HIGH]
  - /reports
  - /reimbursements
  - /corporate-cards
  - /approvals

/api/payroll/  [NEW - HIGH]
  - /runs
  - /employees
  - /tax-tables
  - /payments

/api/tax/  [EXISTS - enhance]
  - /entities
  - /obligations
  - /filings
  - /payments
  - /calc/...
  - /accounting-integration  [NEW]

/api/budgets/  [NEW - MEDIUM]
  - /budgets
  - /variance-analysis
  - /forecasts
```

---

## UI PAGE REORGANIZATION

### DELETE (Standalone modules that should be automated):
```
[ ] /accounting/revrec  [DELETED - now in AR workflow]
[ ] /accounting/entity-conversion  [Delete - make approval workflow]
[ ] /accounting/consolidated-reporting  [Delete - auto in financial reports]
```

### KEEP & ENHANCE:
```
[X] /accounting/chart-of-accounts
[X] /accounting/journal-entries
[X] /accounting/trial-balance
[X] /accounting/financial-reporting
[X] /accounting/bank-reconciliation
[X] /accounting/period-close
[X] /accounting/approvals
[X] /accounting/documents
```

### CREATE NEW:
```
[ ] /ar/dashboard  (AR overview, aging, customer list)
[ ] /ar/invoices  (invoice list, create invoice)
[ ] /ar/customers  (customer management)

[ ] /ap/dashboard  (AP overview, aging, vendor list)
[ ] /ap/bills  (bill list, enter bill)
[ ] /ap/vendors  (vendor management)
[ ] /ap/payments  (payment batching)

[ ] /fixed-assets/register  (asset list)
[ ] /fixed-assets/depreciation  (schedules, run period)

[ ] /expenses/reports  (employee expenses)
[ ] /expenses/approvals  (pending reimbursements)

[ ] /payroll/runs  (payroll history)
[ ] /payroll/processing  (run payroll - if built)
```

### INTEGRATE TAX MODULE:
```
[X] /tax/...  (keep existing pages)
[ ] Add link from accounting to tax
[ ] Add JE creation from tax accruals
```

---

## REVISED NAVIGATION STRUCTURE

### TOP NAV (Main Categories):
```
[Dashboard] [Banking] [Sales] [Purchases] [Accounting] [Reports] [Tax] [Admin]
```

### BANKING MENU:
```
- Bank Accounts
- Transactions
- Reconciliation
- Rules
```

### SALES MENU:
```
- Customers
- Invoices
- Payments
- Revenue Recognition
- Aging Report
```

### PURCHASES MENU:
```
- Vendors
- Bills
- Payments
- Expenses
- Aging Report
```

### ACCOUNTING MENU:
```
- Chart of Accounts
- Journal Entries
- Trial Balance
- Fixed Assets
- Approvals
- Period Close
```

### REPORTS MENU:
```
- Financial Statements
  - Balance Sheet
  - Income Statement
  - Cash Flow
  - Equity Statement
- Budget vs Actual
- Project Profitability
- Custom Reports
```

### TAX MENU:
```
- Tax Profile
- Obligations
- Calendar
- Filings
- Documents
- Calculators
```

---

## AUTOMATION SCHEDULE (Period-End Processing)

### DAILY:
```
- Bank transaction sync (Mercury)
- AP aging update
- AR aging update
```

### WEEKLY:
```
- Corporate card reconciliation reminder
- Expense report reminder
```

### MONTHLY (Period-End Automation):
```
1. Revenue Recognition Processing
   - Find all deferred revenue schedules
   - Auto-create JEs for the month
   - Add to approval queue

2. Fixed Asset Depreciation
   - Calculate depreciation for all assets
   - Auto-create batch depreciation JEs
   - Add to approval queue

3. Tax Accrual
   - Calculate estimated tax for period
   - Auto-create tax accrual JE
   - Add to approval queue

4. Payroll Accruals (if unpaid period)
   - Calculate unpaid wages
   - Create accrual JE

5. Prepaid Expense Amortization
   - Amortize monthly portion
   - Create adjusting JEs

6. Send Period-Close Checklist
   - Email CFO/CEO
   - Track completion
```

### QUARTERLY:
```
- Payroll tax filings (941)
- Estimated tax payments
- Board financial package
```

### ANNUAL:
```
- W-2 preparation
- 1099 preparation
- Annual tax returns (1120/1065)
- Audit preparation
```

---

## IMPLEMENTATION PRIORITY (Revised)

### PHASE 1: CRITICAL GAPS (2 weeks)
```
1. Accounts Payable Full System
   - Vendor management
   - Bill entry
   - Payment processing
   - 3-way matching
   - AP aging reports
   
2. Fixed Assets & Depreciation
   - Asset register
   - Depreciation calculation
   - Auto period-end processing
   - Asset disposal tracking
   
3. UI Refactor
   - Remove standalone modules
   - Fix navigation structure
   - Add sub-windows/modals
```

### PHASE 2: HIGH PRIORITY (2 weeks)
```
4. Expense Management
   - Employee expense reports
   - Receipt upload
   - Approval workflow
   - Reimbursement processing
   
5. Tax Integration
   - Link existing tax module to accounting
   - Tax accrual JE automation
   - Tax payment JE creation
   - Export for tax filings
   
6. Payroll JE Automation
   - Payroll run entry screen
   - Auto-create payroll JEs
   - Tax withholding tracking
   - Benefits tracking
```

### PHASE 3: PROFESSIONAL GRADE (4 weeks)
```
7. Budgeting & Forecasting
   - Budget entry
   - Budget vs actual reports
   - Variance analysis
   - Rolling forecasts
   
8. Enhanced Intercompany
   - Intercompany invoicing
   - Auto-matching entries
   - Loan management
   - Advanced consolidation
   
9. Project Costing
   - Cost allocation
   - Project P&L
   - Profitability analysis
   - Billable hours tracking
```

---

## COMPLETE FEATURE CHECKLIST

### CORE ACCOUNTING
- [X] General Ledger
- [X] Chart of Accounts (150+ GAAP accounts)
- [X] Journal Entries (dual approval)
- [X] Trial Balance
- [X] Financial Statements (5 statements)
- [X] Period Close & Locking
- [X] Audit Trail
- [X] Multi-entity Support

### ACCOUNTS RECEIVABLE
- [X] Customers
- [X] Invoices
- [X] Payments
- [X] AR Aging
- [X] Revenue Recognition (automated)

### ACCOUNTS PAYABLE
- [ ] Vendors
- [ ] Bills (AP Invoices)
- [ ] Bill Payments
- [ ] AP Aging
- [ ] 3-Way Matching
- [ ] Payment Batching

### BANKING
- [X] Bank Accounts
- [X] Transaction Import (Mercury)
- [X] Bank Reconciliation
- [X] Auto-matching
- [X] Outstanding Items

### FIXED ASSETS
- [ ] Asset Register
- [ ] Asset Categories
- [ ] Depreciation Schedules
- [ ] Multiple Depreciation Methods
- [ ] Automated Monthly Depreciation
- [ ] Asset Disposal
- [ ] Gains/Losses on Sale

### EXPENSES
- [ ] Expense Reports
- [ ] Receipt Upload
- [ ] Expense Categorization
- [ ] Manager Approval
- [ ] Reimbursement Processing
- [ ] Corporate Card Integration
- [ ] Policy Enforcement

### PAYROLL
- [ ] Payroll Runs
- [ ] Tax Withholding
- [ ] Benefits Tracking
- [ ] Payroll JE Automation
- [ ] Direct Deposit Files
- [ ] W-2 Preparation
- [ ] Quarterly Returns (941)

### TAX
- [X] Tax Registrations
- [X] Tax Obligations
- [X] Tax Filings
- [X] Tax Calendar
- [X] Tax Documents
- [X] Tax Calculators
- [ ] Tax Accrual JEs (integrate to accounting)
- [ ] Tax Payment JEs (integrate to accounting)

### REPORTING
- [X] Balance Sheet
- [X] Income Statement
- [X] Cash Flow Statement
- [X] Equity Statement
- [X] Trial Balance
- [ ] Budget vs Actual
- [ ] Project P&L
- [ ] Custom Reports
- [X] Consolidated Reports

### AUTOMATION
- [X] Revenue Recognition (monthly)
- [ ] Fixed Asset Depreciation (monthly)
- [ ] Tax Accruals (monthly)
- [ ] AP Aging (daily)
- [ ] AR Aging (daily)
- [ ] Bank Sync (daily)

---

## SUCCESS CRITERIA (Professional Grade)

### COMPLETE ACCOUNTING CYCLE
- [X] Enter transactions once
- [X] Auto-create journal entries
- [X] Dual approval workflow
- [X] Post to ledger
- [X] Real-time trial balance
- [ ] Automated period-end processing (all modules)
- [X] Financial statements
- [X] Period locking

### EQUIVALENT TO QUICKBOOKS ADVANCED
- [X] Multi-entity
- [X] AR/AP Subledgers
- [ ] Fixed Assets (QuickBooks add-on)
- [X] Bank Reconciliation
- [X] Revenue Recognition
- [ ] Expense Management
- [ ] Project Profitability
- [ ] Budgeting

### EQUIVALENT TO NETSUITE (Partial)
- [X] Multi-entity Consolidation
- [X] Advanced Revenue Recognition (ASC 606)
- [ ] Complete Fixed Asset Management
- [X] Workflow Automation
- [X] Approval Hierarchies
- [ ] Project Accounting
- [X] Audit Trail
- [X] Period Close Management

---

## NEXT ACTIONS

1. **Delete Standalone UIs**
   - Remove /accounting/revrec (DONE)
   - Remove /accounting/entity-conversion
   - Remove /accounting/consolidated-reporting

2. **Build AP System (CRITICAL)**
   - Create vendor management
   - Create bill entry
   - Create payment processing
   - Create 3-way matching

3. **Build Fixed Assets (CRITICAL)**
   - Create asset register
   - Create depreciation engine
   - Add period-end automation

4. **Integrate Tax Module**
   - Link to accounting JEs
   - Add tax accrual automation
   - Connect tax payments to cash

5. **Refactor Navigation**
   - Implement top nav structure
   - Add dropdown menus
   - Remove left nav clutter

---

**End of Complete Workflow Plan**
**Ready for Implementation**
**October 5, 2025**
