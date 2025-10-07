# NGI CAPITAL ACCOUNTING UI REFACTOR PLAN

**Date:** October 5, 2025  
**Status:** PLANNING - NOT YET STARTED

## CURRENT STATE - PROBLEMS

### Navigation Chaos (13+ Separate Pages)
Current accounting submenu has 11 items + Tax module separate:

**Accounting Submenu:**
1. Chart of Accounts
2. Documents
3. Journal Entries
4. Approvals
5. Bank Reconciliation
6. Trial Balance
7. Period Close
8. Financial Reporting
9. Revenue Recognition [DEPRECATED - TO BE REMOVED]
10. Consolidated Reporting
11. Entity Conversion

**Separate Top-Level:**
12. Taxes (completely separate module)
13. Finance (completely separate module)

### Missing UI for New Backend Modules
Backend is complete but NO UI exists for:
- Fixed Assets & Depreciation
- Accounts Payable (AP)
- Accounts Receivable (AR) - only partial
- Expense Management
- Payroll

### Problems with Current Design
1. TOO MANY SEPARATE PAGES - overwhelming navigation
2. No logical grouping of related features
3. Tax module isolated from accounting (should be integrated)
4. Critical modules (AP, AR, Fixed Assets) have NO UI
5. Outdated sidebar-only navigation (not modern)
6. No tabs or windows - everything is full-page navigation
7. Revenue Recognition and Entity Conversion should be automated workflows, not pages

## TARGET STATE - MODERN DESIGN

### Design Principles (Like QuickBooks/NetSuite/Xero)
1. **Grouped Modules** - related features in tabs within a module
2. **Sub-Windows** - modal/drawer overlays for detail views
3. **Dashboard-First** - overview with quick actions
4. **Contextual Tabs** - tabs within pages, not just sidebar navigation
5. **Reduced Sidebar** - only 4-6 top-level items
6. **Integrated Tax** - tax as part of accounting, not separate

### Proposed Navigation Structure

```
[SIDEBAR - TOP LEVEL]
- Dashboard
- Entities
- Accounting [collapsed by default, expands to show tabs]
- Finance [separate module]
- Employees
- Investor Management
- NGI Capital Advisory
- Learning Center

[ACCOUNTING MODULE - TAB INTERFACE]
When you click "Accounting", open dashboard with tabs:

TAB 1: GENERAL LEDGER
- Chart of Accounts (tree view)
- Journal Entries (with inline approvals)
- Trial Balance

TAB 2: ACCOUNTS RECEIVABLE
- Customers
- Invoices
- Payments
- Aging Report
- Revenue Recognition (automated)

TAB 3: ACCOUNTS PAYABLE
- Vendors
- Bills
- Purchase Orders
- Payments
- AP Aging Report
- 1099 Management

TAB 4: FIXED ASSETS
- Asset Register
- Depreciation Schedules
- Asset Disposals
- Roll-Forward Report

TAB 5: EXPENSES & PAYROLL
- Expense Reports
- Employee Reimbursements
- Payroll Runs
- Payroll Register

TAB 6: BANKING & RECONCILIATION
- Bank Accounts
- Reconciliation
- Bank Feeds
- Cash Flow

TAB 7: REPORTING
- Financial Statements (BS, IS, CF, Equity)
- Consolidated Reporting
- Management Reports
- Custom Reports

TAB 8: TAXES
- Tax Registrations
- Tax Filings
- Tax Calendar
- Tax Calculators (DE, CA)
- 1099 Reporting

TAB 9: PERIOD CLOSE
- Checklist
- Adjusting Entries
- Close Process
- Audit Trail

TAB 10: DOCUMENTS
- Document Center
- Upload & AI Extract
- Search & Filter
- Version Control
```

### UI Components Architecture

```
apps/desktop/src/app/accounting/
  page.tsx                    [NEW] Accounting Dashboard with Tab Navigation
  layout.tsx                  [KEEP] Entity context provider
  
  [TABS - LAZY LOADED]
  tabs/
    general-ledger/
      chart-of-accounts/      [MIGRATE from current]
      journal-entries/        [MIGRATE from current]
      trial-balance/          [MIGRATE from current]
    
    accounts-receivable/
      customers/              [NEW]
      invoices/               [NEW]
      payments/               [NEW]
      aging/                  [NEW]
      revenue-recognition/    [NEW - automated view only]
    
    accounts-payable/
      vendors/                [NEW]
      bills/                  [NEW]
      purchase-orders/        [NEW]
      payments/               [NEW]
      aging/                  [NEW]
      1099s/                  [NEW]
    
    fixed-assets/
      register/               [NEW]
      depreciation/           [NEW]
      disposals/              [NEW]
      reports/                [NEW]
    
    expenses-payroll/
      expense-reports/        [NEW]
      reimbursements/         [NEW]
      payroll-runs/           [NEW]
      payroll-register/       [NEW]
    
    banking/
      accounts/               [MIGRATE from bank-reconciliation]
      reconciliation/         [MIGRATE from bank-reconciliation]
      feeds/                  [NEW]
    
    reporting/
      financial-statements/   [MIGRATE from financial-reporting]
      consolidated/           [MIGRATE from consolidated-reporting]
      management/             [NEW]
      custom/                 [NEW]
    
    taxes/
      registrations/          [MIGRATE from /tax module]
      filings/                [MIGRATE from /tax module]
      calendar/               [MIGRATE from /tax module]
      calculators/            [MIGRATE from /tax module]
      1099s/                  [LINK to AP 1099s]
    
    period-close/
      checklist/              [MIGRATE from period-close]
      adjustments/            [NEW]
      close-process/          [MIGRATE from period-close]
      audit-trail/            [NEW]
    
    documents/
      center/                 [MIGRATE from documents]
      upload/                 [MIGRATE from documents]
      search/                 [NEW]

  [SHARED COMPONENTS]
  components/
    TabNavigation.tsx         [NEW] Main tab switcher
    EntitySelector.tsx        [KEEP]
    ApprovalWorkflow.tsx      [NEW] Reusable approval component
    DataTable.tsx             [NEW] Reusable data grid
    ReportViewer.tsx          [NEW] PDF/Excel export viewer
```

### Workflow Automation (No More Standalone Pages)

**REMOVE THESE PAGES:**
1. Revenue Recognition page - becomes automated background process + AR tab view
2. Entity Conversion page - becomes one-time setup wizard (modal)
3. Approvals page - becomes inline within Journal Entries tab

**KEEP BUT MIGRATE:**
- All other pages become tabs within the main Accounting module

## IMPLEMENTATION PHASES

### Phase 1: Core Tab Infrastructure [2-3 days]
- [TODO] Build TabNavigation component with Radix UI Tabs
- [TODO] Create new accounting/page.tsx with tab interface
- [TODO] Set up lazy loading for tab content
- [TODO] Add keyboard shortcuts (Cmd+1-9 for tabs)
- [TODO] Add tab state persistence (localStorage)

### Phase 2: Migrate Existing Pages [3-4 days]
- [TODO] General Ledger tab (COA, JEs, Trial Balance)
- [TODO] Banking tab (Bank Reconciliation)
- [TODO] Reporting tab (Financial Statements, Consolidated)
- [TODO] Documents tab
- [TODO] Period Close tab

### Phase 3: Build Missing UIs [5-7 days]
- [TODO] Accounts Receivable tab (complete CRUD UI)
- [TODO] Accounts Payable tab (complete CRUD UI)
- [TODO] Fixed Assets tab (register, depreciation, disposals)
- [TODO] Expenses & Payroll tab (reports, runs, register)

### Phase 4: Integrate Tax Module [2-3 days]
- [TODO] Migrate tax routes from /tax to /accounting/taxes
- [TODO] Build Taxes tab UI
- [TODO] Link 1099 reporting between AP and Taxes
- [TODO] Update navigation (remove Tax from top-level)

### Phase 5: Workflow Automation [2-3 days]
- [TODO] Remove Revenue Recognition standalone page
- [TODO] Build automated revenue recognition dashboard view in AR tab
- [TODO] Convert Entity Conversion to modal wizard
- [TODO] Remove Approvals page, integrate into JE tab
- [TODO] Add automated consolidated reporting on entity creation

### Phase 6: Polish & Testing [3-4 days]
- [TODO] Responsive design for all tabs
- [TODO] Loading states and error boundaries
- [TODO] Keyboard navigation
- [TODO] Search within tabs
- [TODO] Export functionality for all reports
- [TODO] E2E tests with Playwright
- [TODO] Performance optimization (lazy loading, code splitting)

## TECHNICAL IMPLEMENTATION DETAILS

### Tab Navigation Component (Radix UI)

```typescript
// apps/desktop/src/app/accounting/components/TabNavigation.tsx
import * as Tabs from '@radix-ui/react-tabs';

const ACCOUNTING_TABS = [
  { id: 'general-ledger', label: 'General Ledger', icon: FileSpreadsheet },
  { id: 'ar', label: 'AR', icon: TrendingUp },
  { id: 'ap', label: 'AP', icon: TrendingDown },
  { id: 'fixed-assets', label: 'Fixed Assets', icon: Building2 },
  { id: 'expenses-payroll', label: 'Expenses & Payroll', icon: Wallet },
  { id: 'banking', label: 'Banking', icon: CreditCard },
  { id: 'reporting', label: 'Reporting', icon: FileBarChart },
  { id: 'taxes', label: 'Taxes', icon: Calculator },
  { id: 'period-close', label: 'Period Close', icon: Archive },
  { id: 'documents', label: 'Documents', icon: FileText },
];

export function AccountingTabNavigation() {
  const [activeTab, setActiveTab] = useState('general-ledger');
  
  return (
    <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
      <Tabs.List className="flex border-b">
        {ACCOUNTING_TABS.map(tab => (
          <Tabs.Trigger key={tab.id} value={tab.id}>
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      
      <Tabs.Content value="general-ledger">
        <GeneralLedgerTab />
      </Tabs.Content>
      
      {/* ... other tabs ... */}
    </Tabs.Root>
  );
}
```

### Lazy Loading Strategy

```typescript
// Dynamic imports for performance
const GeneralLedgerTab = lazy(() => import('./tabs/general-ledger'));
const ARTab = lazy(() => import('./tabs/accounts-receivable'));
const APTab = lazy(() => import('./tabs/accounts-payable'));
// ... etc

// Wrap in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Tabs.Content value="general-ledger">
    <GeneralLedgerTab />
  </Tabs.Content>
</Suspense>
```

### State Management
- Use React Query for data fetching
- Use Zustand for tab state (active tab, filters, etc.)
- Use Context for entity selection (already exists)

### Accessibility
- Keyboard navigation (Tab, Arrow keys, Cmd+1-9)
- ARIA labels on all tabs
- Focus management
- Screen reader support

## SIDEBAR NAVIGATION UPDATE

### Before (Current)
```
- Accounting (11 subitems)
  - Chart of Accounts
  - Documents
  - Journal Entries
  - Approvals
  - Bank Reconciliation
  - Trial Balance
  - Period Close
  - Financial Reporting
  - Revenue Recognition
  - Consolidated Reporting
  - Entity Conversion
- Finance
- Taxes
```

### After (Refactored)
```
- Accounting [single item, opens tabbed interface]
- Finance
```

Tax module MOVES INTO Accounting tabs.

## SUCCESS METRICS

- [GOAL] Reduce sidebar navigation from 13+ items to 6-7 top-level items
- [GOAL] All accounting features accessible within 2 clicks (tab + action)
- [GOAL] Page load time < 1 second per tab (lazy loading)
- [GOAL] Mobile responsive (tabs collapse to dropdown on small screens)
- [GOAL] 100% feature parity with current implementation
- [GOAL] Zero regressions in existing tests

## DEPENDENCIES

### Must Complete First
1. Fix all backend authentication issues (current_user references)
2. Ensure all backend APIs are working (Fixed Assets, AP, Expenses, Payroll)
3. Get all backend tests to GREEN

### Can Parallelize
- UI design and Figma mockups
- Component library updates (if needed)
- Documentation updates

## RISKS & MITIGATION

### Risk 1: Breaking Existing Bookmarks
**Mitigation:** Keep old routes working, add redirects to new tab URLs

### Risk 2: Large Bundle Size
**Mitigation:** Aggressive lazy loading and code splitting

### Risk 3: Testing Complexity
**Mitigation:** Build comprehensive Playwright tests for tab navigation

### Risk 4: User Learning Curve
**Mitigation:** Add onboarding tooltips and help documentation

## TIMELINE ESTIMATE

**Total:** 18-26 days (3.5-5 weeks)

- Phase 1: 2-3 days
- Phase 2: 3-4 days
- Phase 3: 5-7 days
- Phase 4: 2-3 days
- Phase 5: 2-3 days
- Phase 6: 3-4 days
- Buffer: 1-2 days

## NOTES

- This is a MAJOR refactor - requires careful planning
- Backend is 95% complete, UI is 40% complete
- Tax module already exists, just needs migration
- Revenue Recognition and Entity Conversion automation will significantly improve UX
- Modern tab interface will make NGI Capital feel more like NetSuite/QuickBooks
- Reduces cognitive load for users (fewer navigation decisions)

## NEXT STEPS

1. [TODO] Get all backend tests to GREEN (Accounts Payable, Expenses, Payroll)
2. [TODO] Fix current_user authentication issues
3. [TODO] Create Figma mockups for new tab interface
4. [TODO] Get user approval for design
5. [TODO] Start Phase 1 implementation
