# OLD CODE CLEANUP COMPLETE + NEXT STEPS
**Date:** October 5, 2025  
**Status:** Phase 1 (Deletion) Complete, Phase 2 (Build) Ready to Start

---

## [X] PHASE 1: DELETE OLD CODE - COMPLETE

### Deleted Directories (12 total):
1. `apps/desktop/src/app/accounting/chart-of-accounts/` - Migrated to `tabs/general-ledger/ChartOfAccountsView.tsx`
2. `apps/desktop/src/app/accounting/journal-entries/` - Migrated to `tabs/general-ledger/JournalEntriesView.tsx`
3. `apps/desktop/src/app/accounting/trial-balance/` - Migrated to `tabs/general-ledger/TrialBalanceView.tsx`
4. `apps/desktop/src/app/accounting/bank-reconciliation/` - Migrated to `tabs/banking/BankReconciliationView.tsx`
5. `apps/desktop/src/app/accounting/financial-reporting/` - Migrated to `tabs/reporting/FinancialStatementsView.tsx`
6. `apps/desktop/src/app/accounting/consolidated-reporting/` - Migrated to `tabs/reporting/ConsolidatedReportingView.tsx`
7. `apps/desktop/src/app/accounting/approvals/` - Functionality moved inline
8. `apps/desktop/src/app/accounting/revrec/` - Will be automated
9. `apps/desktop/src/app/accounting/entity-conversion/` - Will be modal
10. `apps/desktop/src/app/accounting/period-close/` - Old version deleted, new in tabs/
11. `apps/desktop/src/app/accounting/documents/` - Old placeholder deleted, will build new
12. `apps/desktop/src/app/accounting/close/` - Duplicate deleted

### Sidebar Updated:
- Removed old "Taxes" link (now in Accounting → Taxes tab)
- Updated comment: "Accounting - Modern Tabbed Interface (includes Taxes tab)"

### Result:
- Codebase cleaned up
- No more duplicate routes
- All functionality preserved in new tabbed UI
- User confirmed they like the new UI

---

## [ ] PHASE 2: BUILD "COMING SOON" TABS

### Priority Order:

#### 1. Documents Tab [PENDING]
**Status:** Currently shows "Coming Soon" placeholder  
**Requirements:**
- Upload documents (PDFs, images, Excel, Word, etc.)
- Link documents to:
  - Entities
  - Transactions (JEs, Bills, Invoices)
  - Tax payments
  - Fixed assets
  - Expense reports
- OCR text extraction for searchability
- Document categories (Tax Forms, Receipts, Contracts, Bank Statements, etc.)
- Search and filter
- Document preview
- Audit trail (who uploaded, when, what it's linked to)

**Backend:** Document storage system with linking tables

---

#### 2. Expense Reports System [PENDING]
**Status:** Currently shows "Coming Soon" placeholder  
**Requirements:**
- **Custom system** (NOT external integrations)
- Employee expense submission:
  - Receipt upload with OCR
  - Expense categories (Travel, Meals, Supplies, etc.)
  - Amount, date, description, project/entity
  - Multi-receipt support per report
- Multi-level approval workflow:
  - Team Lead approval
  - Finance Manager approval
  - Status tracking (Draft, Submitted, Approved, Rejected, Paid)
- Reimbursement tracking
- **Automatic Journal Entry creation:**
  - Dr: Expense Account (by category)
  - Cr: Accounts Payable (or Cash if reimbursed)
- Reporting:
  - By employee
  - By category
  - By date range
  - By entity/project
- Integration with AP module for payment

**Backend:** ExpenseReports table (already exists in models.py), extend with approval workflow

---

#### 3. Payroll System [PENDING]
**Status:** Currently shows "Coming Soon" placeholder  
**Requirements:**
- **Custom system** (NOT external payroll services)
- **Integration with timesheet system** (see Employee module refactor below)
- Pay period processing:
  - Aggregate approved timesheets
  - Calculate gross pay (hourly × hours)
  - Apply deductions (Federal tax, State tax, FICA, benefits)
  - Calculate net pay
- **Automatic Journal Entry creation:**
  - Dr: Payroll Expense (by department/project)
  - Dr: Payroll Tax Expense
  - Cr: Cash
  - Cr: Payroll Tax Liabilities (Federal, State, FICA)
  - Cr: Benefits Payable
- Pay stub generation (PDF)
- Payroll register (list of all employees paid)
- Tax reporting preparation:
  - W-2 data
  - Form 941 (quarterly federal)
  - State payroll tax forms
- Payment method tracking (Direct Deposit, Check)
- Multi-entity support (different employees for different entities)

**Backend:** New Payroll tables in models.py, integration with timesheets

---

#### 4. Accounts Receivable Tab [PENDING]
**Status:** Currently shows "Coming Soon" placeholder  
**Requirements:**
- Customer master management:
  - Create/edit/view customers
  - Contact info, billing address
  - Payment terms (Net 30, Net 60, etc.)
  - Credit limit
- Invoice creation:
  - Line items (description, quantity, rate)
  - Tax calculation
  - Due date based on terms
  - Invoice numbering
  - PDF generation
- AR aging report:
  - Grouped by: Current, 1-30, 31-60, 61-90, 90+ days overdue
  - By customer
  - Total AR balance
- Payment recording:
  - Apply payments to invoices
  - Partial payments
  - Unapplied cash (credits)
- Collections workflow:
  - Overdue invoice alerts
  - Send reminder emails
  - Collection notes
- **Automatic Journal Entry creation:**
  - Invoice: Dr: AR, Cr: Revenue
  - Payment: Dr: Cash, Cr: AR
- Integration with banking (match deposits to AR payments)

**Backend:** New AR tables (Customers, Invoices, AR_Payments)

---

## [ ] PHASE 3: MAJOR EMPLOYEE MODULE REFACTOR

### Current Problem:
- Basic employee management exists but doesn't support:
  - Multi-entity employee setup
  - NGI Capital Advisory LLC special requirements
  - Timesheet submission and approval
  - Integration with payroll

### New Requirements:

#### 3A. Multi-Entity Employee Management [PENDING]
- Setup employees for any entity
- Each entity can have its own team structure
- Employee assignment to entities
- Cross-entity employee sharing (optional)

#### 3B. NGI Capital Advisory LLC Special Handling [PENDING]
**Different from other entities:**
- **PROJECTS instead of TEAMS**
- Structure:
  - Project → Project Leads → Student Employees
  - Projects tied to NGI Capital Advisory LLC entity
- **Auto-create employees from students:**
  - When a student is onboarded to a project
  - Student becomes an "employee" in the Employee module
  - Linked to their student record
  - Can submit timesheets
  - Gets paid via payroll
- **Project-based time tracking:**
  - Hours logged per project
  - Project leads approve timesheets
  - Payroll pulls from approved project hours

#### 3C. Timesheet Control Center [PENDING]
**Timesheet Submission (Employee View):**
- Employees open app and go to "My Timesheets"
- Select pay period (weekly or bi-weekly)
- Enter hours per day
- For NGI Advisory employees: select project
- For other entity employees: general time entry
- Attach notes if needed
- Submit for approval

**Timesheet Approval (Manager/Lead View):**
- Managers see pending timesheets
- Filter by employee, project, entity, date range
- Review hours (flag anomalies)
- Approve or reject with comments
- Approved timesheets → locked and sent to Payroll

**Integration with Payroll:**
- Payroll module pulls approved timesheets
- Calculates pay based on hourly rates
- Generates JEs (as described in Payroll section above)
- Marks timesheets as "Paid"

**Backend:**
- New tables: Timesheets, TimesheetEntries, TimesheetApprovals, Projects (for NGI Advisory)
- Link to Employees, Entities, Payroll

---

## [ ] PHASE 4: TESTING & QA

### 4A. Manual Testing [PENDING]
- Test all 10 accounting tabs with real workflows:
  1. General Ledger (Chart of Accounts, Journal Entries, Trial Balance)
  2. Accounts Receivable (when built)
  3. Accounts Payable (vendors, bills, payments, aging)
  4. Fixed Assets (register, depreciation, disposal)
  5. Expenses & Payroll (when built)
  6. Banking (Mercury sync, reconciliation)
  7. Reporting (financials, consolidated)
  8. Taxes (obligations, payments, documents)
  9. Period Close (checklist, automation)
  10. Documents (when built)

### 4B. Backend Tests [PENDING]
- Run all pytest tests
- Target: 100% passing, zero warnings
- Modules to test:
  - Fixed Assets
  - Accounts Payable
  - Expenses (when built)
  - Payroll (when built)
  - Timesheets (when built)
  - AR (when built)
  - Documents (when built)

### 4C. E2E Tests [PENDING]
- Playwright tests for critical workflows
- Test user journeys:
  - Create entity → setup COA → create JE → close period
  - Create vendor → enter bill → pay bill → AP aging
  - Upload expense → approve → reimburse → JE created
  - Submit timesheet → approve → process payroll → JE created
  - Create invoice → record payment → AR aging

### 4D. QA Review [PENDING]
- Full quality assurance of entire accounting + employee system
- Verify all automations work
- Check all JEs are created correctly
- Ensure audit trail is complete
- Validate multi-entity isolation

---

## TIMELINE ESTIMATE

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1** | Delete old code | **COMPLETE** |
| **Phase 2.1** | Build Documents tab | 2-3 days |
| **Phase 2.2** | Build Expense Reports system | 4-5 days |
| **Phase 2.3** | Build Payroll system | 5-6 days |
| **Phase 2.4** | Build AR tab | 4-5 days |
| **Phase 3** | Major Employee module refactor | 6-8 days |
| **Phase 4** | Testing & QA | 3-4 days |
| **TOTAL** | | **24-31 days** |

---

## SUCCESS CRITERIA

By the end of all phases:

1. **All "Coming Soon" placeholders removed**
2. **All workflows automated with proper JE creation**
3. **Employee module fully refactored:**
   - Multi-entity support
   - NGI Advisory project-based structure
   - Timesheet submission and approval
   - Full integration with payroll
4. **100% backend test coverage, all passing**
5. **E2E tests for critical workflows**
6. **Full QA review complete**
7. **System ready for production use**

---

## MEMORIES CREATED

1. **Employee Module Refactor Requirements** - Multi-entity, NGI Advisory projects, timesheets
2. **Expense and Payroll Custom Systems** - Build own systems, no external integrations
3. **Phase 2 UI Migration Complete** - User confirmed, old code deleted

---

## NEXT IMMEDIATE ACTION

Start with **Documents Tab** - it's the simplest and will unblock tax document upload workflow.

**Command to user:** Ready to proceed with building the Documents tab?

**Date:** October 5, 2025  
**Status:** Phase 1 (Deletion) Complete, Phase 2 (Build) Ready to Start

---

## [X] PHASE 1: DELETE OLD CODE - COMPLETE

### Deleted Directories (12 total):
1. `apps/desktop/src/app/accounting/chart-of-accounts/` - Migrated to `tabs/general-ledger/ChartOfAccountsView.tsx`
2. `apps/desktop/src/app/accounting/journal-entries/` - Migrated to `tabs/general-ledger/JournalEntriesView.tsx`
3. `apps/desktop/src/app/accounting/trial-balance/` - Migrated to `tabs/general-ledger/TrialBalanceView.tsx`
4. `apps/desktop/src/app/accounting/bank-reconciliation/` - Migrated to `tabs/banking/BankReconciliationView.tsx`
5. `apps/desktop/src/app/accounting/financial-reporting/` - Migrated to `tabs/reporting/FinancialStatementsView.tsx`
6. `apps/desktop/src/app/accounting/consolidated-reporting/` - Migrated to `tabs/reporting/ConsolidatedReportingView.tsx`
7. `apps/desktop/src/app/accounting/approvals/` - Functionality moved inline
8. `apps/desktop/src/app/accounting/revrec/` - Will be automated
9. `apps/desktop/src/app/accounting/entity-conversion/` - Will be modal
10. `apps/desktop/src/app/accounting/period-close/` - Old version deleted, new in tabs/
11. `apps/desktop/src/app/accounting/documents/` - Old placeholder deleted, will build new
12. `apps/desktop/src/app/accounting/close/` - Duplicate deleted

### Sidebar Updated:
- Removed old "Taxes" link (now in Accounting → Taxes tab)
- Updated comment: "Accounting - Modern Tabbed Interface (includes Taxes tab)"

### Result:
- Codebase cleaned up
- No more duplicate routes
- All functionality preserved in new tabbed UI
- User confirmed they like the new UI

---

## [ ] PHASE 2: BUILD "COMING SOON" TABS

### Priority Order:

#### 1. Documents Tab [PENDING]
**Status:** Currently shows "Coming Soon" placeholder  
**Requirements:**
- Upload documents (PDFs, images, Excel, Word, etc.)
- Link documents to:
  - Entities
  - Transactions (JEs, Bills, Invoices)
  - Tax payments
  - Fixed assets
  - Expense reports
- OCR text extraction for searchability
- Document categories (Tax Forms, Receipts, Contracts, Bank Statements, etc.)
- Search and filter
- Document preview
- Audit trail (who uploaded, when, what it's linked to)

**Backend:** Document storage system with linking tables

---

#### 2. Expense Reports System [PENDING]
**Status:** Currently shows "Coming Soon" placeholder  
**Requirements:**
- **Custom system** (NOT external integrations)
- Employee expense submission:
  - Receipt upload with OCR
  - Expense categories (Travel, Meals, Supplies, etc.)
  - Amount, date, description, project/entity
  - Multi-receipt support per report
- Multi-level approval workflow:
  - Team Lead approval
  - Finance Manager approval
  - Status tracking (Draft, Submitted, Approved, Rejected, Paid)
- Reimbursement tracking
- **Automatic Journal Entry creation:**
  - Dr: Expense Account (by category)
  - Cr: Accounts Payable (or Cash if reimbursed)
- Reporting:
  - By employee
  - By category
  - By date range
  - By entity/project
- Integration with AP module for payment

**Backend:** ExpenseReports table (already exists in models.py), extend with approval workflow

---

#### 3. Payroll System [PENDING]
**Status:** Currently shows "Coming Soon" placeholder  
**Requirements:**
- **Custom system** (NOT external payroll services)
- **Integration with timesheet system** (see Employee module refactor below)
- Pay period processing:
  - Aggregate approved timesheets
  - Calculate gross pay (hourly × hours)
  - Apply deductions (Federal tax, State tax, FICA, benefits)
  - Calculate net pay
- **Automatic Journal Entry creation:**
  - Dr: Payroll Expense (by department/project)
  - Dr: Payroll Tax Expense
  - Cr: Cash
  - Cr: Payroll Tax Liabilities (Federal, State, FICA)
  - Cr: Benefits Payable
- Pay stub generation (PDF)
- Payroll register (list of all employees paid)
- Tax reporting preparation:
  - W-2 data
  - Form 941 (quarterly federal)
  - State payroll tax forms
- Payment method tracking (Direct Deposit, Check)
- Multi-entity support (different employees for different entities)

**Backend:** New Payroll tables in models.py, integration with timesheets

---

#### 4. Accounts Receivable Tab [PENDING]
**Status:** Currently shows "Coming Soon" placeholder  
**Requirements:**
- Customer master management:
  - Create/edit/view customers
  - Contact info, billing address
  - Payment terms (Net 30, Net 60, etc.)
  - Credit limit
- Invoice creation:
  - Line items (description, quantity, rate)
  - Tax calculation
  - Due date based on terms
  - Invoice numbering
  - PDF generation
- AR aging report:
  - Grouped by: Current, 1-30, 31-60, 61-90, 90+ days overdue
  - By customer
  - Total AR balance
- Payment recording:
  - Apply payments to invoices
  - Partial payments
  - Unapplied cash (credits)
- Collections workflow:
  - Overdue invoice alerts
  - Send reminder emails
  - Collection notes
- **Automatic Journal Entry creation:**
  - Invoice: Dr: AR, Cr: Revenue
  - Payment: Dr: Cash, Cr: AR
- Integration with banking (match deposits to AR payments)

**Backend:** New AR tables (Customers, Invoices, AR_Payments)

---

## [ ] PHASE 3: MAJOR EMPLOYEE MODULE REFACTOR

### Current Problem:
- Basic employee management exists but doesn't support:
  - Multi-entity employee setup
  - NGI Capital Advisory LLC special requirements
  - Timesheet submission and approval
  - Integration with payroll

### New Requirements:

#### 3A. Multi-Entity Employee Management [PENDING]
- Setup employees for any entity
- Each entity can have its own team structure
- Employee assignment to entities
- Cross-entity employee sharing (optional)

#### 3B. NGI Capital Advisory LLC Special Handling [PENDING]
**Different from other entities:**
- **PROJECTS instead of TEAMS**
- Structure:
  - Project → Project Leads → Student Employees
  - Projects tied to NGI Capital Advisory LLC entity
- **Auto-create employees from students:**
  - When a student is onboarded to a project
  - Student becomes an "employee" in the Employee module
  - Linked to their student record
  - Can submit timesheets
  - Gets paid via payroll
- **Project-based time tracking:**
  - Hours logged per project
  - Project leads approve timesheets
  - Payroll pulls from approved project hours

#### 3C. Timesheet Control Center [PENDING]
**Timesheet Submission (Employee View):**
- Employees open app and go to "My Timesheets"
- Select pay period (weekly or bi-weekly)
- Enter hours per day
- For NGI Advisory employees: select project
- For other entity employees: general time entry
- Attach notes if needed
- Submit for approval

**Timesheet Approval (Manager/Lead View):**
- Managers see pending timesheets
- Filter by employee, project, entity, date range
- Review hours (flag anomalies)
- Approve or reject with comments
- Approved timesheets → locked and sent to Payroll

**Integration with Payroll:**
- Payroll module pulls approved timesheets
- Calculates pay based on hourly rates
- Generates JEs (as described in Payroll section above)
- Marks timesheets as "Paid"

**Backend:**
- New tables: Timesheets, TimesheetEntries, TimesheetApprovals, Projects (for NGI Advisory)
- Link to Employees, Entities, Payroll

---

## [ ] PHASE 4: TESTING & QA

### 4A. Manual Testing [PENDING]
- Test all 10 accounting tabs with real workflows:
  1. General Ledger (Chart of Accounts, Journal Entries, Trial Balance)
  2. Accounts Receivable (when built)
  3. Accounts Payable (vendors, bills, payments, aging)
  4. Fixed Assets (register, depreciation, disposal)
  5. Expenses & Payroll (when built)
  6. Banking (Mercury sync, reconciliation)
  7. Reporting (financials, consolidated)
  8. Taxes (obligations, payments, documents)
  9. Period Close (checklist, automation)
  10. Documents (when built)

### 4B. Backend Tests [PENDING]
- Run all pytest tests
- Target: 100% passing, zero warnings
- Modules to test:
  - Fixed Assets
  - Accounts Payable
  - Expenses (when built)
  - Payroll (when built)
  - Timesheets (when built)
  - AR (when built)
  - Documents (when built)

### 4C. E2E Tests [PENDING]
- Playwright tests for critical workflows
- Test user journeys:
  - Create entity → setup COA → create JE → close period
  - Create vendor → enter bill → pay bill → AP aging
  - Upload expense → approve → reimburse → JE created
  - Submit timesheet → approve → process payroll → JE created
  - Create invoice → record payment → AR aging

### 4D. QA Review [PENDING]
- Full quality assurance of entire accounting + employee system
- Verify all automations work
- Check all JEs are created correctly
- Ensure audit trail is complete
- Validate multi-entity isolation

---

## TIMELINE ESTIMATE

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1** | Delete old code | **COMPLETE** |
| **Phase 2.1** | Build Documents tab | 2-3 days |
| **Phase 2.2** | Build Expense Reports system | 4-5 days |
| **Phase 2.3** | Build Payroll system | 5-6 days |
| **Phase 2.4** | Build AR tab | 4-5 days |
| **Phase 3** | Major Employee module refactor | 6-8 days |
| **Phase 4** | Testing & QA | 3-4 days |
| **TOTAL** | | **24-31 days** |

---

## SUCCESS CRITERIA

By the end of all phases:

1. **All "Coming Soon" placeholders removed**
2. **All workflows automated with proper JE creation**
3. **Employee module fully refactored:**
   - Multi-entity support
   - NGI Advisory project-based structure
   - Timesheet submission and approval
   - Full integration with payroll
4. **100% backend test coverage, all passing**
5. **E2E tests for critical workflows**
6. **Full QA review complete**
7. **System ready for production use**

---

## MEMORIES CREATED

1. **Employee Module Refactor Requirements** - Multi-entity, NGI Advisory projects, timesheets
2. **Expense and Payroll Custom Systems** - Build own systems, no external integrations
3. **Phase 2 UI Migration Complete** - User confirmed, old code deleted

---

## NEXT IMMEDIATE ACTION

Start with **Documents Tab** - it's the simplest and will unblock tax document upload workflow.

**Command to user:** Ready to proceed with building the Documents tab?





