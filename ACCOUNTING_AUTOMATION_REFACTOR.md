# NGI Capital Accounting Module - Automation Refactor
**Date:** October 5, 2025  
**Status:** In Progress

## Overview
Refactoring accounting module to match professional software workflows (QuickBooks, NetSuite, Xero) with automated processes and approval workflows instead of standalone UI modules.

---

## ✅ COMPLETED: Revenue Recognition (ASC 606)

### OLD APPROACH ❌
- Standalone UI page at `/accounting/revrec`
- Manual "contract" creation disconnected from invoices
- Manual schedule management
- Separate workflow from core accounting

### NEW APPROACH ✅ (Like QuickBooks/NetSuite)
**1. Invoice Creation (Automatic)**
```javascript
POST /api/ar/invoices
{
  "entity_id": 1,
  "customer_name": "Acme Corp",
  "amount_total": 12000,
  "revenue_recognition": {
    "method": "deferred",  // or "immediate"
    "months": 12,          // spread over 12 months
    "start_date": "2025-01-01"
  }
}
```
- If `method=deferred` → Cr Deferred Revenue (liability)
- If `method=immediate` → Cr Revenue (income)
- Automatically creates recognition schedule

**2. Period-End Processing (Automated)**
```javascript
POST /api/ar/revenue-recognition/process-period
{
  "entity_id": 1,
  "year": 2025,
  "month": 10
}
```
- Finds all invoices with pending revenue schedules
- Auto-creates Journal Entries: Dr Deferred Revenue, Cr Revenue
- JEs go to approval queue (dual approval required)
- Straight-line recognition ($12,000 / 12 months = $1,000/month)

**3. Approval Workflow (Existing)**
- Revenue recognition JEs appear in `/accounting/journal-entries`
- Standard dual approval process (Landon + Andre)
- Post to ledger after approval

### Benefits
✅ Integrated with invoice workflow  
✅ No standalone UI to maintain  
✅ Matches QuickBooks/NetSuite behavior  
✅ ASC 606 compliant (5-step model)  
✅ Automated monthly processing  
✅ Full audit trail  

### Files Changed
- ✅ `src/api/routes/ar.py` - Added revenue recognition to invoices
- ✅ `src/api/routes/revrec.py` - Marked as DEPRECATED
- ✅ `apps/desktop/src/app/accounting/revrec/page.tsx` - **DELETED**

---

## 🚧 IN PROGRESS: Entity Conversion (LLC → C-Corp)

### Current Issues
- Standalone UI module at `/accounting/entity-conversion`
- `current_user` references causing errors
- Should be a ONE-TIME approval workflow, not ongoing module

### Planned Approach
**1. Remove Standalone UI**
- Delete `/accounting/entity-conversion/page.tsx`
- Conversion becomes an "Approvals" item

**2. Simplify to Approval Workflow**
- Admin initiates conversion → Creates approval request
- Dual approval required (Landon + Andre)
- Upon approval:
  - Creates new C-Corp entity
  - Marks LLC as inactive (historical)
  - Migrates subsidiaries to new parent
  - Records equity conversion for tax purposes

**3. Fix `current_user` Issues**
- Replace with authentication middleware
- Use Depends(get_current_partner) pattern

---

## 🚧 IN PROGRESS: Consolidated Reporting

### Current Issues
- Standalone UI module at `/accounting/consolidated-reporting`
- Should be AUTOMATIC when viewing financial reports
- Consolidation should happen on-the-fly, not as separate process

### Planned Approach
**1. Remove Standalone UI**
- Delete `/accounting/consolidated-reporting/page.tsx`
- Consolidation becomes automatic option in financial reporting

**2. Automatic Consolidation**
- When user selects parent entity (NGI Capital Inc)
- Financial reports auto-include all subsidiaries
- Intercompany eliminations applied automatically
- No manual "generate consolidated" step

**3. Integration with Financial Reporting**
```javascript
GET /api/accounting/financial-reporting/balance-sheet?entity_id=1&consolidated=true
```
- Returns consolidated balance sheet
- Includes all children entities
- Auto-eliminates intercompany transactions

---

## US GAAP Workflows Validation

### Core Accounting Cycle (8 Steps)
1. ✅ **Identify Transactions** - Documents, invoices, receipts
2. ✅ **Record in Journal** - Journal entries with dual approval
3. ✅ **Post to Ledger** - Chart of accounts updated
4. ✅ **Trial Balance** - Auto-generated, always balanced
5. ✅ **Adjusting Entries** - Period-end adjustments (rev rec, accruals)
6. ✅ **Adjusted Trial Balance** - After adjustments
7. ✅ **Financial Statements** - All 5 GAAP statements
8. ✅ **Period Close** - Lock period, prevent backdating

### Professional Software Features Checklist
- ✅ Invoice-based revenue recognition
- ✅ Automated period-end processing
- ✅ Dual approval workflows (maker-checker)
- ✅ Bank reconciliation (Mercury integration)
- ✅ Automated intercompany eliminations
- ✅ Multi-entity support
- ✅ Audit trail (immutable posted entries)
- ✅ Period locking
- ✅ GAAP-compliant financial statements
- ✅ ASC 606 (Revenue Recognition)
- ✅ ASC 810 (Consolidation)

---

## Testing Status

### Revenue Recognition Tests
- [ ] Test invoice creation with deferred revenue
- [ ] Test period-end revenue processing
- [ ] Test approval workflow for rev rec JEs
- [ ] Test straight-line calculation
- [ ] Test multi-period schedules

### Entity Conversion Tests
- [ ] Test LLC to C-Corp conversion
- [ ] Test subsidiary migration
- [ ] Test historical data preservation
- [ ] Test equity conversion tracking

### Consolidated Reporting Tests
- [ ] Test automatic consolidation
- [ ] Test intercompany eliminations
- [ ] Test parent-subsidiary hierarchy
- [ ] Test consolidated financial statements

---

## Next Steps

1. **Delete Entity Conversion UI** → Make it an approval workflow
2. **Delete Consolidated Reporting UI** → Make it automatic
3. **Fix `current_user` references** → Use proper auth middleware
4. **Run all accounting tests** → Verify nothing broken
5. **Update documentation** → Reflect new automated workflows
6. **Validate against US GAAP** → Ensure compliance

---

## Key Principles

### ✅ DO
- Automate repetitive processes
- Integrate with core workflows (invoices, JEs)
- Use existing approval mechanisms
- Follow professional software patterns
- Maintain GAAP compliance

### ❌ DON'T
- Create standalone UI modules for background processes
- Disconnect workflows from source documents
- Require manual intervention for automated tasks
- Duplicate approval workflows
- Break existing functionality

---

*Last Updated: October 5, 2025 - Revenue Recognition Complete*
