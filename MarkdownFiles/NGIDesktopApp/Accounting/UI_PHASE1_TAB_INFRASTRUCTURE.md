# PHASE 1: TAB INFRASTRUCTURE - IMPLEMENTATION PLAN
## Date: October 5, 2025

## GOAL
Build modern tab navigation infrastructure for Accounting module using Radix UI / Shadcn Tabs

## CURRENT STATUS
- [X] Backend: 100% GREEN (50/50 tests passing)
- [X] Entity conversion auth fixed
- [X] Context regained
- [ ] Tab navigation component
- [ ] Accounting module refactored to use tabs

## ARCHITECTURE OVERVIEW

### Component Structure
```
apps/desktop/src/app/accounting/
  page.tsx                         [REFACTOR] Tab-based dashboard
  layout.tsx                       [KEEP] Entity context provider
  components/
    AccountingTabs.tsx             [NEW] Main tab navigation
    TabNavigation.tsx              [NEW] Reusable tab switcher
  tabs/                            [NEW FOLDER]
    general-ledger/
      page.tsx                     [NEW] GL tab with subtabs
    ar/
      page.tsx                     [NEW] AR tab
    ap/
      page.tsx                     [NEW] AP tab
    fixed-assets/
      page.tsx                     [NEW] Fixed Assets tab
    expenses-payroll/
      page.tsx                     [NEW] Expenses & Payroll tab
    banking/
      page.tsx                     [NEW] Banking tab
    reporting/
      page.tsx                     [NEW] Reporting tab
    taxes/
      page.tsx                     [NEW] Taxes tab
    period-close/
      page.tsx                     [NEW] Period Close tab
    documents/
      page.tsx                     [NEW] Documents tab
```

### 10 Accounting Tabs
1. **General Ledger** - COA, JEs, Trial Balance
2. **Accounts Receivable** - Customers, Invoices, Payments, Aging
3. **Accounts Payable** - Vendors, Bills, POs, Payments, Aging
4. **Fixed Assets** - Register, Depreciation, Disposals
5. **Expenses & Payroll** - Expense Reports, Payroll Runs
6. **Banking** - Bank Accounts, Reconciliation
7. **Reporting** - Financial Statements, Consolidated
8. **Taxes** - Registrations, Filings, Calculators
9. **Period Close** - Checklist, Close Process
10. **Documents** - Document Center, Upload

## IMPLEMENTATION STEPS

### Step 1: Create Tab Navigation Component
```typescript
// apps/desktop/src/app/accounting/components/AccountingTabs.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Suspense, lazy } from 'react';
import { 
  FileSpreadsheet, TrendingUp, TrendingDown, Building2,
  Wallet, CreditCard, FileBarChart, Calculator,
  Archive, FileText 
} from 'lucide-react';

const TABS = [
  { id: 'gl', label: 'General Ledger', icon: FileSpreadsheet },
  { id: 'ar', label: 'AR', icon: TrendingUp },
  { id: 'ap', label: 'AP', icon: TrendingDown },
  { id: 'fixed-assets', label: 'Fixed Assets', icon: Building2 },
  { id: 'expenses', label: 'Expenses & Payroll', icon: Wallet },
  { id: 'banking', label: 'Banking', icon: CreditCard },
  { id: 'reporting', label: 'Reporting', icon: FileBarChart },
  { id: 'taxes', label: 'Taxes', icon: Calculator },
  { id: 'period-close', label: 'Period Close', icon: Archive },
  { id: 'documents', label: 'Documents', icon: FileText },
];

// Lazy load tabs for performance
const GeneralLedgerTab = lazy(() => import('../tabs/general-ledger/page'));
const ARTab = lazy(() => import('../tabs/ar/page'));
const APTab = lazy(() => import('../tabs/ap/page'));
// ... etc

export function AccountingTabs() {
  const [activeTab, setActiveTab] = useState('gl');
  
  // Persist active tab in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('accounting-active-tab');
    if (saved && TABS.find(t => t.id === saved)) {
      setActiveTab(saved);
    }
  }, []);
  
  useEffect(() => {
    localStorage.setItem('accounting-active-tab', activeTab);
  }, [activeTab]);
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full" style={{gridTemplateColumns: `repeat(${TABS.length}, 1fr)`}}>
        {TABS.map(tab => (
          <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
            <tab.icon className="h-4 w-4" />
            <span className="hidden lg:inline">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      
      <div className="mt-6">
        <Suspense fallback={<LoadingSpinner />}>
          <TabsContent value="gl">
            <GeneralLedgerTab />
          </TabsContent>
          <TabsContent value="ar">
            <ARTab />
          </TabsContent>
          {/* ... other tabs ... */}
        </Suspense>
      </div>
    </Tabs>
  );
}
```

### Step 2: Refactor Accounting Page
```typescript
// apps/desktop/src/app/accounting/page.tsx
'use client';

import { useEntityContext } from '@/hooks/useEntityContext';
import { EntitySelector } from '@/components/accounting/EntitySelector';
import { AccountingTabs } from './components/AccountingTabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AccountingPage() {
  const { selectedEntityId, setSelectedEntityId } = useEntityContext();
  
  if (!selectedEntityId) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Select an Entity</CardTitle>
            <CardDescription>Choose an entity to view accounting</CardDescription>
          </CardHeader>
          <CardContent>
            <EntitySelector value={selectedEntityId} onChange={setSelectedEntityId} />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
          <p className="text-muted-foreground mt-1">Manage financials and reporting</p>
        </div>
        <EntitySelector value={selectedEntityId} onChange={setSelectedEntityId} />
      </div>
      
      {/* Tab Navigation */}
      <AccountingTabs />
    </div>
  );
}
```

### Step 3: Create Tab Placeholder Components
Create skeleton components for each tab that will be fleshed out in later phases:

```typescript
// apps/desktop/src/app/accounting/tabs/general-ledger/page.tsx
export default function GeneralLedgerTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">General Ledger</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Chart of Accounts</CardTitle>
            <CardDescription>Manage account structure</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/accounting/chart-of-accounts">
              <Button className="w-full">View Chart</Button>
            </Link>
          </CardContent>
        </Card>
        {/* ... more subtab cards ... */}
      </div>
    </div>
  );
}
```

## KEYBOARD SHORTCUTS
- Cmd/Ctrl + 1-9: Switch to tab 1-9
- Cmd/Ctrl + ←/→: Previous/Next tab
- Implemented using `useHotkeys` hook

## STATE MANAGEMENT
- Active tab persisted in localStorage
- Entity context continues to work (already exists)
- URL params for deep linking: `/accounting?tab=ap`

## RESPONSIVE DESIGN
- Desktop: Full tab labels
- Tablet: Icon + label
- Mobile: Icon only, scrollable tabs

## ACCESSIBILITY
- ARIA labels on all tabs
- Keyboard navigation
- Screen reader support
- Focus management

## PERFORMANCE
- Lazy loading for all tab content
- Code splitting per tab
- Suspend boundaries for loading states

## TESTING
- Unit tests for tab switching
- Integration tests for state persistence
- E2E tests for navigation

## TIMELINE
**Total: 2-3 days**

- Day 1 (4-6 hours):
  - [TODO] Create AccountingTabs.tsx component
  - [TODO] Refactor main accounting page.tsx
  - [TODO] Set up lazy loading infrastructure
  
- Day 2 (4-6 hours):
  - [TODO] Create placeholder tabs for all 10 sections
  - [TODO] Add keyboard shortcuts
  - [TODO] Add state persistence
  - [TODO] Add URL params
  
- Day 3 (2-4 hours):
  - [TODO] Responsive design polish
  - [TODO] Accessibility improvements
  - [TODO] Unit tests
  - [TODO] Documentation

## SUCCESS CRITERIA
- [X] Tab component renders without errors
- [ ] All 10 tabs accessible
- [ ] Active tab persists across page refreshes
- [ ] Keyboard shortcuts work
- [ ] Mobile responsive
- [ ] No performance regressions
- [ ] Zero console warnings

## NEXT PHASE
Phase 2: Migrate existing 11 pages into appropriate tabs

## Date: October 5, 2025

## GOAL
Build modern tab navigation infrastructure for Accounting module using Radix UI / Shadcn Tabs

## CURRENT STATUS
- [X] Backend: 100% GREEN (50/50 tests passing)
- [X] Entity conversion auth fixed
- [X] Context regained
- [ ] Tab navigation component
- [ ] Accounting module refactored to use tabs

## ARCHITECTURE OVERVIEW

### Component Structure
```
apps/desktop/src/app/accounting/
  page.tsx                         [REFACTOR] Tab-based dashboard
  layout.tsx                       [KEEP] Entity context provider
  components/
    AccountingTabs.tsx             [NEW] Main tab navigation
    TabNavigation.tsx              [NEW] Reusable tab switcher
  tabs/                            [NEW FOLDER]
    general-ledger/
      page.tsx                     [NEW] GL tab with subtabs
    ar/
      page.tsx                     [NEW] AR tab
    ap/
      page.tsx                     [NEW] AP tab
    fixed-assets/
      page.tsx                     [NEW] Fixed Assets tab
    expenses-payroll/
      page.tsx                     [NEW] Expenses & Payroll tab
    banking/
      page.tsx                     [NEW] Banking tab
    reporting/
      page.tsx                     [NEW] Reporting tab
    taxes/
      page.tsx                     [NEW] Taxes tab
    period-close/
      page.tsx                     [NEW] Period Close tab
    documents/
      page.tsx                     [NEW] Documents tab
```

### 10 Accounting Tabs
1. **General Ledger** - COA, JEs, Trial Balance
2. **Accounts Receivable** - Customers, Invoices, Payments, Aging
3. **Accounts Payable** - Vendors, Bills, POs, Payments, Aging
4. **Fixed Assets** - Register, Depreciation, Disposals
5. **Expenses & Payroll** - Expense Reports, Payroll Runs
6. **Banking** - Bank Accounts, Reconciliation
7. **Reporting** - Financial Statements, Consolidated
8. **Taxes** - Registrations, Filings, Calculators
9. **Period Close** - Checklist, Close Process
10. **Documents** - Document Center, Upload

## IMPLEMENTATION STEPS

### Step 1: Create Tab Navigation Component
```typescript
// apps/desktop/src/app/accounting/components/AccountingTabs.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Suspense, lazy } from 'react';
import { 
  FileSpreadsheet, TrendingUp, TrendingDown, Building2,
  Wallet, CreditCard, FileBarChart, Calculator,
  Archive, FileText 
} from 'lucide-react';

const TABS = [
  { id: 'gl', label: 'General Ledger', icon: FileSpreadsheet },
  { id: 'ar', label: 'AR', icon: TrendingUp },
  { id: 'ap', label: 'AP', icon: TrendingDown },
  { id: 'fixed-assets', label: 'Fixed Assets', icon: Building2 },
  { id: 'expenses', label: 'Expenses & Payroll', icon: Wallet },
  { id: 'banking', label: 'Banking', icon: CreditCard },
  { id: 'reporting', label: 'Reporting', icon: FileBarChart },
  { id: 'taxes', label: 'Taxes', icon: Calculator },
  { id: 'period-close', label: 'Period Close', icon: Archive },
  { id: 'documents', label: 'Documents', icon: FileText },
];

// Lazy load tabs for performance
const GeneralLedgerTab = lazy(() => import('../tabs/general-ledger/page'));
const ARTab = lazy(() => import('../tabs/ar/page'));
const APTab = lazy(() => import('../tabs/ap/page'));
// ... etc

export function AccountingTabs() {
  const [activeTab, setActiveTab] = useState('gl');
  
  // Persist active tab in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('accounting-active-tab');
    if (saved && TABS.find(t => t.id === saved)) {
      setActiveTab(saved);
    }
  }, []);
  
  useEffect(() => {
    localStorage.setItem('accounting-active-tab', activeTab);
  }, [activeTab]);
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full" style={{gridTemplateColumns: `repeat(${TABS.length}, 1fr)`}}>
        {TABS.map(tab => (
          <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
            <tab.icon className="h-4 w-4" />
            <span className="hidden lg:inline">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      
      <div className="mt-6">
        <Suspense fallback={<LoadingSpinner />}>
          <TabsContent value="gl">
            <GeneralLedgerTab />
          </TabsContent>
          <TabsContent value="ar">
            <ARTab />
          </TabsContent>
          {/* ... other tabs ... */}
        </Suspense>
      </div>
    </Tabs>
  );
}
```

### Step 2: Refactor Accounting Page
```typescript
// apps/desktop/src/app/accounting/page.tsx
'use client';

import { useEntityContext } from '@/hooks/useEntityContext';
import { EntitySelector } from '@/components/accounting/EntitySelector';
import { AccountingTabs } from './components/AccountingTabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AccountingPage() {
  const { selectedEntityId, setSelectedEntityId } = useEntityContext();
  
  if (!selectedEntityId) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Select an Entity</CardTitle>
            <CardDescription>Choose an entity to view accounting</CardDescription>
          </CardHeader>
          <CardContent>
            <EntitySelector value={selectedEntityId} onChange={setSelectedEntityId} />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
          <p className="text-muted-foreground mt-1">Manage financials and reporting</p>
        </div>
        <EntitySelector value={selectedEntityId} onChange={setSelectedEntityId} />
      </div>
      
      {/* Tab Navigation */}
      <AccountingTabs />
    </div>
  );
}
```

### Step 3: Create Tab Placeholder Components
Create skeleton components for each tab that will be fleshed out in later phases:

```typescript
// apps/desktop/src/app/accounting/tabs/general-ledger/page.tsx
export default function GeneralLedgerTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">General Ledger</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Chart of Accounts</CardTitle>
            <CardDescription>Manage account structure</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/accounting/chart-of-accounts">
              <Button className="w-full">View Chart</Button>
            </Link>
          </CardContent>
        </Card>
        {/* ... more subtab cards ... */}
      </div>
    </div>
  );
}
```

## KEYBOARD SHORTCUTS
- Cmd/Ctrl + 1-9: Switch to tab 1-9
- Cmd/Ctrl + ←/→: Previous/Next tab
- Implemented using `useHotkeys` hook

## STATE MANAGEMENT
- Active tab persisted in localStorage
- Entity context continues to work (already exists)
- URL params for deep linking: `/accounting?tab=ap`

## RESPONSIVE DESIGN
- Desktop: Full tab labels
- Tablet: Icon + label
- Mobile: Icon only, scrollable tabs

## ACCESSIBILITY
- ARIA labels on all tabs
- Keyboard navigation
- Screen reader support
- Focus management

## PERFORMANCE
- Lazy loading for all tab content
- Code splitting per tab
- Suspend boundaries for loading states

## TESTING
- Unit tests for tab switching
- Integration tests for state persistence
- E2E tests for navigation

## TIMELINE
**Total: 2-3 days**

- Day 1 (4-6 hours):
  - [TODO] Create AccountingTabs.tsx component
  - [TODO] Refactor main accounting page.tsx
  - [TODO] Set up lazy loading infrastructure
  
- Day 2 (4-6 hours):
  - [TODO] Create placeholder tabs for all 10 sections
  - [TODO] Add keyboard shortcuts
  - [TODO] Add state persistence
  - [TODO] Add URL params
  
- Day 3 (2-4 hours):
  - [TODO] Responsive design polish
  - [TODO] Accessibility improvements
  - [TODO] Unit tests
  - [TODO] Documentation

## SUCCESS CRITERIA
- [X] Tab component renders without errors
- [ ] All 10 tabs accessible
- [ ] Active tab persists across page refreshes
- [ ] Keyboard shortcuts work
- [ ] Mobile responsive
- [ ] No performance regressions
- [ ] Zero console warnings

## NEXT PHASE
Phase 2: Migrate existing 11 pages into appropriate tabs





