# NGI Capital LLC - Real-World Accounting Testing Guide

**Testing Date:** October 4, 2025  
**Entity:** NGI Capital LLC (Active)  
**Tester:** Landon Whitworth  
**Status:** Single-user testing (Andre approval pending deployment)

---

## Pre-Testing Setup

### 1. Verify Database State

```bash
# Check entities are seeded
python -c "from src.api.database import get_db; from src.api.models_accounting import AccountingEntity; db = next(get_db()); entities = db.query(AccountingEntity).all(); print(f'Entities: {len(entities)}'); [print(f'  - {e.entity_name} (ID: {e.id}, Available: {e.is_available})') for e in entities]"
```

**Expected Output:**
- NGI Capital LLC (ID: 1, Available: True) ✅
- NGI Capital Advisory LLC (ID: 2, Available: False)
- The Creator Terminal Inc. (ID: 3, Available: False)

### 2. Start Development Environment

```bash
# Backend (Terminal 1)
cd "C:\Users\Ochow\Desktop\NGI Capital App"
python -m uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (Terminal 2)
docker-compose -f docker-compose.dev.yml up frontend

# Or if using npm directly:
cd apps/desktop
npm run dev
```

### 3. Verify Services Running

- Backend: http://localhost:8000/docs
- Frontend: http://localhost:3000/accounting
- Entity Selector shows "NGI Capital LLC" as active ✅

---

## Accounting Workflow Testing (Step-by-Step)

### Phase 1: Documents Center (Foundation)

**Goal:** Upload all formation and operational documents

#### 1.1 Upload Formation Documents

Navigate to: `/accounting/documents`

**Documents to Upload:**

1. **Articles of Organization (LLC Formation)**
   - Category: Formation
   - Document Type: Formation
   - Date: [Formation date from actual document]
   - Expected: PDF uploads, shows in "Formation" category

2. **Operating Agreement**
   - Category: Formation
   - Document Type: Operating Agreement
   - Date: [Agreement date]
   - Expected: PDF uploads, member capital accounts visible

3. **EIN Letter (IRS)**
   - Category: Formation
   - Document Type: Tax Documents
   - Date: [EIN issuance date]
   - Expected: EIN extracted (if AI enabled)

#### 1.2 Upload Invoices & Receipts

**Real NGI Capital Expenses to Upload:**

1. **AWS Invoices**
   - Category: Receipts
   - Document Type: Invoice
   - Dates: [Actual invoice dates]
   - Expected: Vendor name, amount, date extracted

2. **Domain/Hosting Invoices** (Vercel, Railway, etc.)
   - Category: Receipts
   - Document Type: Invoice
   - Expected: Monthly recurring expenses captured

3. **Professional Services** (Legal, Accounting)
   - Category: Receipts
   - Document Type: Invoice
   - Expected: Professional fees categorized

4. **Other Operating Expenses**
   - Office supplies, software subscriptions, etc.
   - Expected: All receipts organized by category

**Test Checklist:**
- [ ] Drag-and-drop upload works
- [ ] Multiple file upload works
- [ ] Search functionality works (search "AWS")
- [ ] Filter by category works
- [ ] Document preview opens
- [ ] No AI references in UI (should say "Extracted" not "AI Extracted")

---

### Phase 2: Chart of Accounts Setup

Navigate to: `/accounting/chart-of-accounts`

#### 2.1 Verify Pre-Seeded Accounts

**Check These Critical Accounts Exist:**

- `10100` - Cash - Mercury Bank
- `10120` - Cash - Operating Account
- `11000` - Accounts Receivable
- `50110` - Hosting & Cloud Services
- `62610` - Software Subscriptions
- `66100` - Professional Services - Legal
- `66200` - Professional Services - Accounting
- `30100` - Members' Capital - Landon Whitworth
- `30200` - Members' Capital - Andre Nurmamade

**Test Checklist:**
- [ ] Tree view expands/collapses correctly
- [ ] Search works (search "Cash")
- [ ] Filter by type works (select "Asset")
- [ ] Account balances show $0.00 (fresh start)

#### 2.2 Add Custom Accounts (If Needed)

**Example: Add specific expense accounts**

1. Click "Add Account"
2. Account Number: `62650`
3. Account Name: `AI Services - OpenAI/Anthropic`
4. Account Type: `Expense`
5. Parent: `62600 - Software & Technology`
6. Description: `AI API costs for development`

**Test Checklist:**
- [ ] Custom account created successfully
- [ ] Account appears in tree under parent
- [ ] Normal balance auto-set to "Debit" (Expense)

---

### Phase 3: Journal Entries (Core Accounting)

Navigate to: `/accounting/journal-entries`

#### 3.1 Record Initial Capital Contributions

**Entry 1: Landon's Capital Contribution**

```
Date: [Actual contribution date]
Description: Initial capital contribution - Landon Whitworth

Line 1:
  Account: 10100 - Cash - Mercury Bank
  Debit: $250,000.00
  Credit: $0.00

Line 2:
  Account: 30100 - Members' Capital - Landon Whitworth
  Debit: $0.00
  Credit: $250,000.00
```

**Entry 2: Andre's Capital Contribution**

```
Date: [Actual contribution date]
Description: Initial capital contribution - Andre Nurmamade

Line 1:
  Account: 10100 - Cash - Mercury Bank
  Debit: $250,000.00
  Credit: $0.00

Line 2:
  Account: 30200 - Members' Capital - Andre Nurmamade
  Debit: $0.00
  Credit: $250,000.00
```

**Test Checklist:**
- [ ] Entry saves as "Draft"
- [ ] Balanced entry validation works (Debits = Credits)
- [ ] Unbalanced entry is rejected
- [ ] Entry appears in "Unposted" list
- [ ] Can edit draft entry
- [ ] Can delete draft entry

#### 3.2 Record Operating Expenses (From Real Invoices)

**Entry 3: AWS Invoice (From uploaded document)**

```
Date: [Invoice date from PDF]
Description: AWS cloud services - [Month/Year]
Reference: Invoice #[from PDF]

Line 1:
  Account: 50110 - Hosting & Cloud Services
  Debit: $1,247.83  [Actual amount from invoice]
  Credit: $0.00

Line 2:
  Account: 10100 - Cash - Mercury Bank
  Debit: $0.00
  Credit: $1,247.83
```

**Entry 4: Legal Fees**

```
Date: [Invoice date]
Description: Legal services - Entity formation
Reference: Invoice #[from attorney]

Line 1:
  Account: 66100 - Professional Services - Legal
  Debit: $5,000.00  [Actual amount]
  Credit: $0.00

Line 2:
  Account: 10100 - Cash - Mercury Bank
  Debit: $0.00
  Credit: $5,000.00
```

**Entry 5: Software Subscriptions**

```
Date: [Aggregate for month]
Description: Software subscriptions - [Month]

Line 1:
  Account: 62610 - Software Subscriptions
  Debit: $847.00  [GitHub Copilot, Cursor, etc.]
  Credit: $0.00

Line 2:
  Account: 10100 - Cash - Mercury Bank
  Debit: $0.00
  Credit: $847.00
```

**Test Checklist:**
- [ ] Multiple entries created
- [ ] Entries link to uploaded documents (if feature exists)
- [ ] Entry numbers auto-increment (JE-001-000001, etc.)
- [ ] Date picker works correctly
- [ ] Account dropdown searchable
- [ ] Description field saves properly

---

### Phase 4: Approvals (Single-User Workflow)

Navigate to: `/accounting/approvals`

**Note:** Dual approval won't work until deployed (Andre unavailable)

#### 4.1 Self-Approval Workaround

**Test Solo Approval Flow:**

1. View "Pending Approvals" (should show draft JEs)
2. Click on Entry #1 (Landon's capital contribution)
3. Review entry details
4. Click "Approve"
5. **Expected Behavior:**
   - ✅ Entry moves to "Approved" status
   - ⚠️ In production, this would require Andre's approval
   - ✅ Entry is now immutable (cannot edit)

**Test Checklist:**
- [ ] Pending approvals list populated
- [ ] Can filter by status
- [ ] Entry detail modal shows all line items
- [ ] Approve button works
- [ ] Approved entries move to "Approved" tab
- [ ] Cannot edit approved entries

#### 4.2 Reject/Request Changes Flow

**Test Rejection:**

1. Create a test entry with error (e.g., wrong account)
2. Submit for approval
3. View in Approvals
4. Click "Request Changes"
5. Add note: "Please use account 50110 instead of 62610"
6. Submit

**Expected:**
- Entry returns to "Draft" status
- Note visible to creator
- Can edit and resubmit

**Test Checklist:**
- [ ] Rejection notes save correctly
- [ ] Entry reverts to Draft
- [ ] Revision history tracked

---

### Phase 5: Bank Reconciliation

Navigate to: `/accounting/bank-reconciliation`

**Note:** Mercury integration may not be fully connected in dev

#### 5.1 Manual Transaction Entry (If Mercury API Not Connected)

**Add Transactions Manually:**

1. Click "Add Transaction"
2. Enter transaction details from actual Mercury statement:
   - Date: [From statement]
   - Description: "Initial capital deposit - Landon"
   - Amount: $250,000.00
   - Type: Deposit

3. Match to Journal Entry #1
4. Mark as "Reconciled"

**Test Checklist:**
- [ ] Manual transaction entry works
- [ ] Transaction matching works
- [ ] Reconciled transactions show green checkmark
- [ ] Unreconciled transactions show in "Unmatched" list
- [ ] Bank balance updates correctly
- [ ] No "AI Match" references in UI ✅ (Already removed)

#### 5.2 Month-End Reconciliation

1. Select reconciliation period: January 2025 (or current month)
2. Enter ending balance from Mercury statement
3. Mark all transactions as cleared
4. Click "Complete Reconciliation"
5. Expected: Difference = $0.00

**Test Checklist:**
- [ ] Reconciliation summary accurate
- [ ] Can download reconciliation report
- [ ] Period locks after completion (if feature enabled)

---

### Phase 6: Financial Reporting

Navigate to: `/accounting/financial-reporting`

#### 6.1 Generate Balance Sheet

**Inputs:**
- As of Date: [Current date or month-end]
- Entity: NGI Capital LLC

**Expected Output:**

```
NGI CAPITAL LLC
Balance Sheet
As of [Date]

ASSETS
  Current Assets
    Cash and Cash Equivalents
      Cash - Mercury Bank             $493,905.17
    Total Current Assets              $493,905.17
  Total Assets                        $493,905.17

LIABILITIES
  Current Liabilities                         $0.00
  Total Liabilities                           $0.00

EQUITY
  Members' Capital
    Landon Whitworth                  $250,000.00
    Andre Nurmamade                   $250,000.00
  Members' Equity (Deficit)            ($6,094.83)
  Total Equity                        $493,905.17

TOTAL LIABILITIES & EQUITY            $493,905.17
```

**Validation:**
- ✅ Assets = Liabilities + Equity
- ✅ Cash balance matches bank reconciliation
- ✅ Member capital accounts accurate
- ✅ Retained earnings (deficit) = Expenses

**Test Checklist:**
- [ ] Balance sheet balances (Assets = L + E)
- [ ] All accounts categorized correctly
- [ ] Formatting professional
- [ ] Can export to PDF
- [ ] Can export to Excel

#### 6.2 Generate Income Statement

**Inputs:**
- Period: January 1, 2025 - January 31, 2025
- Entity: NGI Capital LLC

**Expected Output:**

```
NGI CAPITAL LLC
Income Statement
For the Period Ended [Date]

REVENUE
  Total Revenue                               $0.00

OPERATING EXPENSES
  Hosting & Cloud Services        $1,247.83
  Software Subscriptions            $847.00
  Professional Services - Legal   $5,000.00
  Total Operating Expenses                 $7,094.83

NET INCOME (LOSS)                         ($7,094.83)
```

**Test Checklist:**
- [ ] Revenue shows $0.00 (pre-revenue)
- [ ] All expenses listed correctly
- [ ] Net loss matches balance sheet retained earnings
- [ ] Expense disaggregation by nature (2025 GAAP requirement)

#### 6.3 Generate Cash Flow Statement

**Expected Output:**

```
NGI CAPITAL LLC
Statement of Cash Flows (Indirect Method)
For the Period Ended [Date]

CASH FLOWS FROM OPERATING ACTIVITIES
  Net Income (Loss)                         ($7,094.83)
  Adjustments:
    (None for now)
  Net Cash from Operating Activities        ($7,094.83)

CASH FLOWS FROM INVESTING ACTIVITIES                $0.00

CASH FLOWS FROM FINANCING ACTIVITIES
  Capital Contributions                    $500,000.00
  Net Cash from Financing                  $500,000.00

NET CHANGE IN CASH                         $492,905.17
Beginning Cash Balance                              $0.00
Ending Cash Balance                        $492,905.17
```

**Test Checklist:**
- [ ] Cash flow reconciles to cash balance
- [ ] Operating, investing, financing sections present
- [ ] Indirect method correctly applied (ASC 230)

#### 6.4 Generate Statement of Changes in Equity

**Expected Output:**

```
NGI CAPITAL LLC
Statement of Changes in Members' Equity
For the Period Ended [Date]

                        Landon      Andre       Total
Beginning Balance         $0.00       $0.00       $0.00
Capital Contributions $250,000  $250,000   $500,000.00
Net Income (Loss)     ($3,547)  ($3,547)    ($7,094.83)
Ending Balance       $246,453  $246,453   $492,905.17
```

**Test Checklist:**
- [ ] Both members shown separately
- [ ] Capital contributions accurate
- [ ] Net loss allocated 50/50 (per operating agreement)
- [ ] Ending balances match balance sheet

---

### Phase 7: Trial Balance

Navigate to: `/accounting/trial-balance`

#### 7.1 Generate Trial Balance

**Inputs:**
- As of Date: [Month-end]
- Entity: NGI Capital LLC

**Expected Output:**

```
NGI CAPITAL LLC
Trial Balance
As of [Date]

Account                         Debit         Credit
10100 - Cash - Mercury     $493,905.17              -
30100 - Landon Capital              -    $250,000.00
30200 - Andre Capital               -    $250,000.00
50110 - Hosting              $1,247.83              -
62610 - Software               $847.00              -
66100 - Legal Fees           $5,000.00              -

TOTALS                     $501,000.00    $500,000.00
```

**Validation:**
- ✅ Total Debits = Total Credits
- ✅ All posted journal entries included
- ✅ Account balances match financial statements

**Test Checklist:**
- [ ] Trial balance balances (DR = CR)
- [ ] All accounts with balances shown
- [ ] Zero-balance accounts hidden (if setting enabled)
- [ ] Can drill down to account detail
- [ ] Export works

---

### Phase 8: Period Close

Navigate to: `/accounting/close` or `/accounting/period-close`

#### 8.1 Pre-Close Validation

**Automated Checks:**

1. All journal entries approved ✅
2. Bank reconciliation complete ✅
3. No unmatched transactions ✅
4. Trial balance balances ✅
5. Financial statements generated ✅

**Test Checklist:**
- [ ] Pre-close checklist runs automatically
- [ ] Any issues flagged clearly
- [ ] Can proceed if all checks pass

#### 8.2 Close Period

**Steps:**

1. Select period: January 2025
2. Review close summary
3. Click "Close Period"
4. Confirm: "This will lock all transactions for January 2025"
5. Period status changes to "Closed"

**Expected Behavior:**
- ✅ Cannot create/edit journal entries for January
- ✅ Cannot modify bank reconciliation for January
- ✅ Period locked badge shown
- ✅ Financial reports remain accessible

**Test Checklist:**
- [ ] Period closes successfully
- [ ] Lock prevents new entries
- [ ] Lock prevents editing approved entries
- [ ] Can still view closed period data
- [ ] Can reopen period (CFO/Co-Founder only)

---

## Testing Summary & Sign-Off

### Critical Workflows Tested

- [ ] **Documents Upload** - Real invoices uploaded successfully
- [ ] **Chart of Accounts** - All accounts seeded and searchable
- [ ] **Journal Entries** - Capital contributions + expenses recorded
- [ ] **Approvals** - Single-user approval working (dual pending)
- [ ] **Bank Reconciliation** - Transactions matched
- [ ] **Financial Reporting** - BS, IS, CF, Equity statements generated
- [ ] **Trial Balance** - Balanced and accurate
- [ ] **Period Close** - January 2025 closed successfully

### Known Limitations (Dev Environment)

1. **Dual Approval:** Andre cannot approve yet (pending deployment)
2. **Mercury Sync:** May need manual transaction entry if API not connected
3. **Document AI Extraction:** May be limited in dev (API keys needed)
4. **Email Notifications:** Disabled in dev

### Data Quality Checks

- [ ] Cash balance matches bank statement
- [ ] All expenses match uploaded invoices
- [ ] Capital accounts accurate (50% Landon, 50% Andre)
- [ ] Net loss reasonable for pre-revenue startup
- [ ] No data corruption or inconsistencies

### Next Steps After Testing

1. **Fix Any Bugs Found** - Document issues, create fixes
2. **Prepare for Deployment** - Enable dual approval, Mercury sync
3. **Add Andre as Second User** - Test full dual approval workflow
4. **Load Historical Data** - Import all 2024 transactions (if any)
5. **First Real Month-End Close** - Complete January 2025 close
6. **External CPA Review** - Send financials to accountant

---

## Bug Tracking Template

**If you find bugs during testing, document here:**

### Bug #1: [Title]
- **Severity:** Critical / High / Medium / Low
- **Page:** [e.g., /accounting/journal-entries]
- **Steps to Reproduce:**
  1. ...
  2. ...
- **Expected Behavior:** ...
- **Actual Behavior:** ...
- **Screenshots:** [Attach]
- **Browser:** Chrome/Firefox/Safari
- **Status:** Open / In Progress / Fixed

---

## Testing Completion

**Tested By:** Landon Whitworth  
**Date:** October 4, 2025  
**Result:** ✅ Pass / ⚠️ Pass with Issues / ❌ Fail  
**Notes:**

---

*This document will be updated as testing progresses.*


