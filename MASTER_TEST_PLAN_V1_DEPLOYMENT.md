# NGI CAPITAL APP - MASTER TEST PLAN FOR V1 DEPLOYMENT
**Date:** October 5, 2025  
**Goal:** Achieve 95%+ test coverage across 500-1000 tests  
**Timeline:** Systematic execution until all green  
**Context:** Up-to-date with pytest, Playwright, Jest best practices (Oct 2025)

---

## 🎯 MASTER ROADMAP (7 PHASES)

### **PHASE 1: FIX EXISTING TEST SUITE** 🔄 IN PROGRESS
**Goal:** Fix 80 failing/error tests, achieve 95%+ passing  
**Current:** 200+ passing, ~80 need fixes, ~85 skipped  
**Target:** 280+ passing, <10 failures, minimal skips  
**Timeline:** 3-5 days

#### Sub-tasks:
- **1.1** Fix Journal Entries API tests (0% → 95%)
- **1.2** Fix Financial Reporting tests (13% → 95%)
- **1.3** Fix Internal Controls tests (0% → 95%)
- **1.4** Fix Bank Reconciliation API tests (47% → 95%)
- **1.5** Review Advisory module tests
- **1.6** Review Employee/HR tests
- **1.7** Review Authentication tests
- **1.8** Review remaining module tests

### **PHASE 2: CREATE COMPREHENSIVE BACKEND TESTS** 📝 PENDING
**Goal:** 500+ pytest tests covering every API endpoint with edge cases  
**Current:** 365 tests  
**Target:** 600+ tests  
**Timeline:** 5-7 days

#### Coverage Areas:
- All 130+ API endpoints (currently ~40% covered)
- Edge cases & error handling
- Multi-entity isolation
- Authorization scenarios
- Data validation
- Cross-module integrations
- Performance tests
- Load tests

### **PHASE 3: CREATE COMPREHENSIVE FRONTEND TESTS** 🎨 PENDING
**Goal:** 200+ Jest tests for all React components  
**Current:** 28 tests  
**Target:** 250+ tests  
**Timeline:** 4-6 days

#### Coverage Areas:
- All page components
- All UI components
- User interactions
- Form validations
- Error states
- Loading states
- Routing & navigation
- API mocking
- Context/state management

### **PHASE 4: CREATE COMPREHENSIVE E2E TESTS** 🎭 PENDING
**Goal:** 100+ Playwright tests for complete user workflows  
**Current:** 28 tests  
**Target:** 150+ tests  
**Timeline:** 5-7 days

#### Coverage Areas:
- Complete student journey (5+ tests)
- Complete admin workflows (10+ tests)
- Accounting full cycle (15+ tests)
- Advisory module workflows (10+ tests)
- Employee/timesheet workflows (8+ tests)
- Cross-app navigation (5+ tests)
- Error handling & edge cases (10+ tests)
- Multi-user scenarios (5+ tests)

### **PHASE 5: MODULE COMPLETION & QA** ✨ PENDING
**Goal:** Complete remaining modules and QA review  
**Timeline:** 10-14 days

#### Modules:
- **5.1** NGI Capital Advisory QA & Edits
- **5.2** Admin Learning Center QA & Management Features
- **5.3** Student App (NGI Advisory) - Complete & QA
- **5.4** Marketing Homepage - Update to reflect app
- **5.5** Dashboard (Admin) - Defer to post-V1
- **5.6** Finance Module - Major refactor (defer)
- **5.7** Investor Management - Enhancements (defer)

### **PHASE 6: COMPREHENSIVE TESTS FOR NEW MODULES** 🧪 PENDING
**Goal:** Full test coverage for newly completed modules  
**Timeline:** 3-5 days

- Tests for Advisory module updates
- Tests for Learning Center features
- Tests for Student App features
- Tests for Marketing page

### **PHASE 7: HUMAN QA & CODE CLEANUP** 🧹 PENDING
**Goal:** Manual validation, code cleanup, git commit  
**Timeline:** 3-5 days

#### Sub-tasks:
- **7.1** Set up comprehensive test data (real entities, conversion, etc.)
- **7.2** Manual QA review of all workflows
- **7.3** UI refinement based on QA feedback
- **7.4** Code audit - remove commented/dead code
- **7.5** Documentation updates
- **7.6** Git commit to main/dev branch
- **7.7** Final deployment preparation

---

## 📊 DETAILED BREAKDOWN: PHASE 1 (CURRENT FOCUS)

### **Priority 1: Journal Entries API Tests** 🔴 CRITICAL
**Current:** 0/17 passing (0%)  
**Issue:** Endpoint paths or auth changes  
**Files:** `tests/accounting/test_journal_entries_api.py`

**Action Plan:**
1. Read test file and identify endpoints being called
2. Compare with actual endpoints in `src/api/routes/accounting_journal_entries.py`
3. Update test endpoint paths
4. Fix auth headers (use X-User-ID pattern)
5. Update response assertions to match current format
6. Re-run until all passing

### **Priority 2: Financial Reporting Tests** 🟠 HIGH
**Current:** 2/15 passing (13%)  
**Issue:** Assertion updates needed  
**Files:** `tests/accounting/test_financial_reporting_api.py`, `test_financial_reporting_complete.py`

**Action Plan:**
1. Review failing tests
2. Check actual API responses
3. Update test assertions
4. Fix any endpoint path issues
5. Verify data structure matches

### **Priority 3: Internal Controls Tests** 🟠 HIGH
**Current:** 0/10 passing (0%)  
**Issue:** Needs implementation review  
**Files:** `tests/accounting/test_internal_controls_api.py`

**Action Plan:**
1. Verify if internal controls feature is complete
2. If incomplete, mark tests as @pytest.mark.skip with reason
3. If complete, update tests to match implementation
4. Check endpoint availability
5. Fix auth and data formats

### **Priority 4: Bank Reconciliation API Tests** 🟡 MEDIUM
**Current:** 7/15 passing (47%)  
**Issue:** current_user parameter issues  
**Files:** `tests/accounting/test_bank_reconciliation_api.py`

**Action Plan:**
1. Review API signatures for current_user vs mock auth
2. Update test mocks to provide proper user context
3. Fix any parameter name mismatches
4. Re-run tests

### **Priority 5-8:** Advisory, Auth, Employees, Other Modules
**Timeline:** After priorities 1-4 complete

---

## 📋 TEST CREATION: COMPREHENSIVE COVERAGE PLAN

### **Backend Test Matrix** (Target: 600+ tests)

#### API Endpoint Testing:
```python
For EACH of 130+ endpoints, create tests for:
1. Success case (200/201)
2. Validation error (422)
3. Auth error (401/403)
4. Not found (404)
5. Method not allowed (405)
6. Edge cases (empty data, max limits, etc.)

Formula: 130 endpoints × 6 tests = 780 base tests
Current: ~365 tests
Needed: ~415 new tests
```

#### Test Organization:
```
tests/
├── api_comprehensive/          # NEW: Systematic API coverage
│   ├── test_accounting_endpoints.py (100+ tests)
│   ├── test_advisory_endpoints.py (80+ tests)
│   ├── test_employee_endpoints.py (60+ tests)
│   ├── test_entity_endpoints.py (40+ tests)
│   ├── test_learning_endpoints.py (50+ tests)
│   └── test_auth_endpoints.py (30+ tests)
│
├── workflows/                  # NEW: End-to-end backend workflows
│   ├── test_accounting_full_cycle.py
│   ├── test_student_onboarding_complete.py
│   ├── test_timesheet_to_payroll.py
│   └── test_multi_entity_consolidation.py
│
├── edge_cases/                 # NEW: Edge case testing
│   ├── test_boundary_values.py
│   ├── test_concurrent_operations.py
│   ├── test_data_limits.py
│   └── test_error_recovery.py
```

### **Frontend Test Matrix** (Target: 250+ tests)

#### Component Testing Strategy:
```typescript
For EACH component, test:
1. Renders without crashing
2. Displays correct data
3. Handles user interactions (click, input, etc.)
4. Shows loading states
5. Shows error states
6. Validates form inputs
7. Calls correct API endpoints
8. Handles API errors

Formula: ~40 major components × 6 tests = 240 tests
Current: 28 tests  
Needed: ~212 new tests
```

#### Test Organization:
```
apps/desktop/src/__tests__/
├── components/                  # Component unit tests
│   ├── accounting/ (50+ tests)
│   ├── advisory/ (40+ tests)
│   ├── employees/ (30+ tests)
│   ├── entities/ (20+ tests)
│   └── common/ (25+ tests)
│
├── pages/                       # Page integration tests
│   ├── accounting-page.test.tsx
│   ├── advisory-pages.test.tsx
│   ├── employee-page.test.tsx
│   └── entity-page.test.tsx
│
├── hooks/                       # Custom hooks tests
│   ├── useEntityContext.test.ts
│   └── useDebounce.test.ts
│
└── integration/                 # Frontend integration
    └── full-app-flow.test.tsx
```

### **E2E Test Matrix** (Target: 150+ tests)

#### User Workflow Coverage:
```typescript
Critical User Journeys (15 workflows × 5-10 tests each = 75-150 tests):

1. Complete Student Journey (10 tests)
   - Browse projects
   - Apply to project
   - Complete onboarding
   - Submit work
   - Track progress

2. Advisory Admin Workflow (10 tests)
   - Create project
   - Review applications
   - Onboard student
   - Monitor progress
   - Close project

3. Accounting Full Cycle (15 tests)
   - Upload documents
   - Create journal entries
   - Bank reconciliation
   - Approve entries
   - Generate financial statements
   - Close period

4. Employee/Timesheet Workflow (8 tests)
   - Create employee
   - Submit timesheet
   - Approve timesheet
   - Export to payroll
   - Create payroll JE

5. Entity Management Workflow (8 tests)
   - View org charts
   - Navigate entities
   - Entity conversion
   - Multi-entity operations

6. Multi-User Scenarios (10 tests)
   - Dual approval workflows
   - Role-based access
   - Concurrent operations
```

---

## 🛠️ TESTING TOOLS & BEST PRACTICES

### **Pytest Best Practices** (from Context7):
```python
# 1. Use fixtures for setup/teardown
@pytest.fixture
async def test_data(async_db):
    # Setup
    data = await create_test_data(async_db)
    yield data
    # Teardown
    await cleanup_test_data(async_db)

# 2. Parametrize for multiple scenarios
@pytest.mark.parametrize("input,expected", [
    ("valid", 200),
    ("invalid", 422),
    ("", 400)
])
async def test_endpoint(input, expected, client):
    response = await client.post("/api/endpoint", json={"data": input})
    assert response.status_code == expected

# 3. Use async/await properly
@pytest.mark.asyncio
async def test_async_operation(client, async_db):
    result = await async_db.execute(sa_text("SELECT * FROM table"))
    data = result.fetchall()
    assert len(data) > 0
```

### **Playwright Best Practices** (from Context7):
```typescript
// 1. Use Page Object Model
export class AccountingPage {
  constructor(public readonly page: Page) {}
  
  async navigateToJournalEntries() {
    await this.page.click('text=Journal Entries');
  }
  
  async createJournalEntry(data) {
    // ...
  }
}

// 2. Use fixtures for common setups
export const test = base.extend<{accountingPage: AccountingPage}>({
  accountingPage: async ({ page }, use) => {
    const accountingPage = new AccountingPage(page);
    await accountingPage.goto();
    await use(accountingPage);
  },
});

// 3. Organize by workflow
test.describe('Accounting Workflow', () => {
  test('creates and approves journal entry', async ({ accountingPage }) => {
    await accountingPage.createJournalEntry(testData);
    await accountingPage.approve();
    await expect(accountingPage.status).toHaveText('Posted');
  });
});
```

### **Jest Best Practices** (from Context7):
```typescript
// 1. Mock API calls
jest.mock('@/lib/api', () => ({
  getEntities: jest.fn(),
  createEntity: jest.fn(),
}));

// 2. Test React components with Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

test('entity page loads and displays entities', async () => {
  (apiClient.getEntities as jest.Mock).mockResolvedValue({
    entities: [{ id: 1, name: 'NGI Capital LLC' }]
  });
  
  render(<EntitiesPage />);
  
  await waitFor(() => {
    expect(screen.getByText('NGI Capital LLC')).toBeInTheDocument();
  });
});

// 3. Test user interactions
test('clicking entity opens org chart', async () => {
  render(<EntitiesPage />);
  
  fireEvent.click(screen.getByText('NGI Capital LLC'));
  
  await waitFor(() => {
    expect(screen.getByText('Board of Directors')).toBeInTheDocument();
  });
});
```

---

## 🚀 EXECUTION PLAN (STARTING NOW)

### **Step 1: Quick Assessment** ✅ COMPLETE
- Ran full test suite
- Identified ~365 tests total
- Found ~200+ passing
- Identified patterns in failures

### **Step 2: Fix Journal Entries Tests** ⏳ NEXT
**Files to fix:**
- `tests/accounting/test_journal_entries_api.py`
- `tests/accounting/test_journal_entries_complete.py`

**Strategy:**
1. Read both test files
2. Identify endpoint mismatches
3. Update to current API paths
4. Fix auth headers
5. Run until green

### **Step 3-8:** Continue systematically through all test categories

---

## 📈 SUCCESS METRICS

### **Final Target (Pre-Deployment):**
```
Backend Tests:    600+ total, 95%+ passing (570+ passing)
Frontend Tests:   250+ total, 90%+ passing (225+ passing)
E2E Tests:        150+ total, 95%+ passing (142+ passing)
Integration:      50+ total, 95%+ passing (47+ passing)
-----------------------------------------------------------
TOTAL:           1050+ total, 94%+ passing (984+ passing)
```

### **Deployment Confidence:**
- ✅ 100% critical paths tested
- ✅ 95%+ edge cases covered
- ✅ All user workflows validated
- ✅ Multi-entity properly isolated
- ✅ Authorization fully tested
- ✅ Data consistency verified
- ✅ Performance acceptable
- ✅ Ready for real company use

---

## 🎯 IMMEDIATE NEXT ACTIONS

1. ✅ Fix entity page syntax error (COMPLETE)
2. ⏳ Fix journal entries API tests (STARTING NOW)
3. ⏳ Fix financial reporting tests
4. ⏳ Fix internal controls tests
5. ⏳ Create comprehensive backend tests
6. ⏳ Create comprehensive frontend tests
7. ⏳ Create comprehensive E2E tests
8. ⏳ Complete remaining modules
9. ⏳ Human QA review
10. ⏳ Code cleanup & deployment

---

**LET'S BEGIN!** 🚀

**Current Focus:** Fix journal entries API tests to get them to green.
**Date:** October 5, 2025  
**Goal:** Achieve 95%+ test coverage across 500-1000 tests  
**Timeline:** Systematic execution until all green  
**Context:** Up-to-date with pytest, Playwright, Jest best practices (Oct 2025)

---

## 🎯 MASTER ROADMAP (7 PHASES)

### **PHASE 1: FIX EXISTING TEST SUITE** 🔄 IN PROGRESS
**Goal:** Fix 80 failing/error tests, achieve 95%+ passing  
**Current:** 200+ passing, ~80 need fixes, ~85 skipped  
**Target:** 280+ passing, <10 failures, minimal skips  
**Timeline:** 3-5 days

#### Sub-tasks:
- **1.1** Fix Journal Entries API tests (0% → 95%)
- **1.2** Fix Financial Reporting tests (13% → 95%)
- **1.3** Fix Internal Controls tests (0% → 95%)
- **1.4** Fix Bank Reconciliation API tests (47% → 95%)
- **1.5** Review Advisory module tests
- **1.6** Review Employee/HR tests
- **1.7** Review Authentication tests
- **1.8** Review remaining module tests

### **PHASE 2: CREATE COMPREHENSIVE BACKEND TESTS** 📝 PENDING
**Goal:** 500+ pytest tests covering every API endpoint with edge cases  
**Current:** 365 tests  
**Target:** 600+ tests  
**Timeline:** 5-7 days

#### Coverage Areas:
- All 130+ API endpoints (currently ~40% covered)
- Edge cases & error handling
- Multi-entity isolation
- Authorization scenarios
- Data validation
- Cross-module integrations
- Performance tests
- Load tests

### **PHASE 3: CREATE COMPREHENSIVE FRONTEND TESTS** 🎨 PENDING
**Goal:** 200+ Jest tests for all React components  
**Current:** 28 tests  
**Target:** 250+ tests  
**Timeline:** 4-6 days

#### Coverage Areas:
- All page components
- All UI components
- User interactions
- Form validations
- Error states
- Loading states
- Routing & navigation
- API mocking
- Context/state management

### **PHASE 4: CREATE COMPREHENSIVE E2E TESTS** 🎭 PENDING
**Goal:** 100+ Playwright tests for complete user workflows  
**Current:** 28 tests  
**Target:** 150+ tests  
**Timeline:** 5-7 days

#### Coverage Areas:
- Complete student journey (5+ tests)
- Complete admin workflows (10+ tests)
- Accounting full cycle (15+ tests)
- Advisory module workflows (10+ tests)
- Employee/timesheet workflows (8+ tests)
- Cross-app navigation (5+ tests)
- Error handling & edge cases (10+ tests)
- Multi-user scenarios (5+ tests)

### **PHASE 5: MODULE COMPLETION & QA** ✨ PENDING
**Goal:** Complete remaining modules and QA review  
**Timeline:** 10-14 days

#### Modules:
- **5.1** NGI Capital Advisory QA & Edits
- **5.2** Admin Learning Center QA & Management Features
- **5.3** Student App (NGI Advisory) - Complete & QA
- **5.4** Marketing Homepage - Update to reflect app
- **5.5** Dashboard (Admin) - Defer to post-V1
- **5.6** Finance Module - Major refactor (defer)
- **5.7** Investor Management - Enhancements (defer)

### **PHASE 6: COMPREHENSIVE TESTS FOR NEW MODULES** 🧪 PENDING
**Goal:** Full test coverage for newly completed modules  
**Timeline:** 3-5 days

- Tests for Advisory module updates
- Tests for Learning Center features
- Tests for Student App features
- Tests for Marketing page

### **PHASE 7: HUMAN QA & CODE CLEANUP** 🧹 PENDING
**Goal:** Manual validation, code cleanup, git commit  
**Timeline:** 3-5 days

#### Sub-tasks:
- **7.1** Set up comprehensive test data (real entities, conversion, etc.)
- **7.2** Manual QA review of all workflows
- **7.3** UI refinement based on QA feedback
- **7.4** Code audit - remove commented/dead code
- **7.5** Documentation updates
- **7.6** Git commit to main/dev branch
- **7.7** Final deployment preparation

---

## 📊 DETAILED BREAKDOWN: PHASE 1 (CURRENT FOCUS)

### **Priority 1: Journal Entries API Tests** 🔴 CRITICAL
**Current:** 0/17 passing (0%)  
**Issue:** Endpoint paths or auth changes  
**Files:** `tests/accounting/test_journal_entries_api.py`

**Action Plan:**
1. Read test file and identify endpoints being called
2. Compare with actual endpoints in `src/api/routes/accounting_journal_entries.py`
3. Update test endpoint paths
4. Fix auth headers (use X-User-ID pattern)
5. Update response assertions to match current format
6. Re-run until all passing

### **Priority 2: Financial Reporting Tests** 🟠 HIGH
**Current:** 2/15 passing (13%)  
**Issue:** Assertion updates needed  
**Files:** `tests/accounting/test_financial_reporting_api.py`, `test_financial_reporting_complete.py`

**Action Plan:**
1. Review failing tests
2. Check actual API responses
3. Update test assertions
4. Fix any endpoint path issues
5. Verify data structure matches

### **Priority 3: Internal Controls Tests** 🟠 HIGH
**Current:** 0/10 passing (0%)  
**Issue:** Needs implementation review  
**Files:** `tests/accounting/test_internal_controls_api.py`

**Action Plan:**
1. Verify if internal controls feature is complete
2. If incomplete, mark tests as @pytest.mark.skip with reason
3. If complete, update tests to match implementation
4. Check endpoint availability
5. Fix auth and data formats

### **Priority 4: Bank Reconciliation API Tests** 🟡 MEDIUM
**Current:** 7/15 passing (47%)  
**Issue:** current_user parameter issues  
**Files:** `tests/accounting/test_bank_reconciliation_api.py`

**Action Plan:**
1. Review API signatures for current_user vs mock auth
2. Update test mocks to provide proper user context
3. Fix any parameter name mismatches
4. Re-run tests

### **Priority 5-8:** Advisory, Auth, Employees, Other Modules
**Timeline:** After priorities 1-4 complete

---

## 📋 TEST CREATION: COMPREHENSIVE COVERAGE PLAN

### **Backend Test Matrix** (Target: 600+ tests)

#### API Endpoint Testing:
```python
For EACH of 130+ endpoints, create tests for:
1. Success case (200/201)
2. Validation error (422)
3. Auth error (401/403)
4. Not found (404)
5. Method not allowed (405)
6. Edge cases (empty data, max limits, etc.)

Formula: 130 endpoints × 6 tests = 780 base tests
Current: ~365 tests
Needed: ~415 new tests
```

#### Test Organization:
```
tests/
├── api_comprehensive/          # NEW: Systematic API coverage
│   ├── test_accounting_endpoints.py (100+ tests)
│   ├── test_advisory_endpoints.py (80+ tests)
│   ├── test_employee_endpoints.py (60+ tests)
│   ├── test_entity_endpoints.py (40+ tests)
│   ├── test_learning_endpoints.py (50+ tests)
│   └── test_auth_endpoints.py (30+ tests)
│
├── workflows/                  # NEW: End-to-end backend workflows
│   ├── test_accounting_full_cycle.py
│   ├── test_student_onboarding_complete.py
│   ├── test_timesheet_to_payroll.py
│   └── test_multi_entity_consolidation.py
│
├── edge_cases/                 # NEW: Edge case testing
│   ├── test_boundary_values.py
│   ├── test_concurrent_operations.py
│   ├── test_data_limits.py
│   └── test_error_recovery.py
```

### **Frontend Test Matrix** (Target: 250+ tests)

#### Component Testing Strategy:
```typescript
For EACH component, test:
1. Renders without crashing
2. Displays correct data
3. Handles user interactions (click, input, etc.)
4. Shows loading states
5. Shows error states
6. Validates form inputs
7. Calls correct API endpoints
8. Handles API errors

Formula: ~40 major components × 6 tests = 240 tests
Current: 28 tests  
Needed: ~212 new tests
```

#### Test Organization:
```
apps/desktop/src/__tests__/
├── components/                  # Component unit tests
│   ├── accounting/ (50+ tests)
│   ├── advisory/ (40+ tests)
│   ├── employees/ (30+ tests)
│   ├── entities/ (20+ tests)
│   └── common/ (25+ tests)
│
├── pages/                       # Page integration tests
│   ├── accounting-page.test.tsx
│   ├── advisory-pages.test.tsx
│   ├── employee-page.test.tsx
│   └── entity-page.test.tsx
│
├── hooks/                       # Custom hooks tests
│   ├── useEntityContext.test.ts
│   └── useDebounce.test.ts
│
└── integration/                 # Frontend integration
    └── full-app-flow.test.tsx
```

### **E2E Test Matrix** (Target: 150+ tests)

#### User Workflow Coverage:
```typescript
Critical User Journeys (15 workflows × 5-10 tests each = 75-150 tests):

1. Complete Student Journey (10 tests)
   - Browse projects
   - Apply to project
   - Complete onboarding
   - Submit work
   - Track progress

2. Advisory Admin Workflow (10 tests)
   - Create project
   - Review applications
   - Onboard student
   - Monitor progress
   - Close project

3. Accounting Full Cycle (15 tests)
   - Upload documents
   - Create journal entries
   - Bank reconciliation
   - Approve entries
   - Generate financial statements
   - Close period

4. Employee/Timesheet Workflow (8 tests)
   - Create employee
   - Submit timesheet
   - Approve timesheet
   - Export to payroll
   - Create payroll JE

5. Entity Management Workflow (8 tests)
   - View org charts
   - Navigate entities
   - Entity conversion
   - Multi-entity operations

6. Multi-User Scenarios (10 tests)
   - Dual approval workflows
   - Role-based access
   - Concurrent operations
```

---

## 🛠️ TESTING TOOLS & BEST PRACTICES

### **Pytest Best Practices** (from Context7):
```python
# 1. Use fixtures for setup/teardown
@pytest.fixture
async def test_data(async_db):
    # Setup
    data = await create_test_data(async_db)
    yield data
    # Teardown
    await cleanup_test_data(async_db)

# 2. Parametrize for multiple scenarios
@pytest.mark.parametrize("input,expected", [
    ("valid", 200),
    ("invalid", 422),
    ("", 400)
])
async def test_endpoint(input, expected, client):
    response = await client.post("/api/endpoint", json={"data": input})
    assert response.status_code == expected

# 3. Use async/await properly
@pytest.mark.asyncio
async def test_async_operation(client, async_db):
    result = await async_db.execute(sa_text("SELECT * FROM table"))
    data = result.fetchall()
    assert len(data) > 0
```

### **Playwright Best Practices** (from Context7):
```typescript
// 1. Use Page Object Model
export class AccountingPage {
  constructor(public readonly page: Page) {}
  
  async navigateToJournalEntries() {
    await this.page.click('text=Journal Entries');
  }
  
  async createJournalEntry(data) {
    // ...
  }
}

// 2. Use fixtures for common setups
export const test = base.extend<{accountingPage: AccountingPage}>({
  accountingPage: async ({ page }, use) => {
    const accountingPage = new AccountingPage(page);
    await accountingPage.goto();
    await use(accountingPage);
  },
});

// 3. Organize by workflow
test.describe('Accounting Workflow', () => {
  test('creates and approves journal entry', async ({ accountingPage }) => {
    await accountingPage.createJournalEntry(testData);
    await accountingPage.approve();
    await expect(accountingPage.status).toHaveText('Posted');
  });
});
```

### **Jest Best Practices** (from Context7):
```typescript
// 1. Mock API calls
jest.mock('@/lib/api', () => ({
  getEntities: jest.fn(),
  createEntity: jest.fn(),
}));

// 2. Test React components with Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

test('entity page loads and displays entities', async () => {
  (apiClient.getEntities as jest.Mock).mockResolvedValue({
    entities: [{ id: 1, name: 'NGI Capital LLC' }]
  });
  
  render(<EntitiesPage />);
  
  await waitFor(() => {
    expect(screen.getByText('NGI Capital LLC')).toBeInTheDocument();
  });
});

// 3. Test user interactions
test('clicking entity opens org chart', async () => {
  render(<EntitiesPage />);
  
  fireEvent.click(screen.getByText('NGI Capital LLC'));
  
  await waitFor(() => {
    expect(screen.getByText('Board of Directors')).toBeInTheDocument();
  });
});
```

---

## 🚀 EXECUTION PLAN (STARTING NOW)

### **Step 1: Quick Assessment** ✅ COMPLETE
- Ran full test suite
- Identified ~365 tests total
- Found ~200+ passing
- Identified patterns in failures

### **Step 2: Fix Journal Entries Tests** ⏳ NEXT
**Files to fix:**
- `tests/accounting/test_journal_entries_api.py`
- `tests/accounting/test_journal_entries_complete.py`

**Strategy:**
1. Read both test files
2. Identify endpoint mismatches
3. Update to current API paths
4. Fix auth headers
5. Run until green

### **Step 3-8:** Continue systematically through all test categories

---

## 📈 SUCCESS METRICS

### **Final Target (Pre-Deployment):**
```
Backend Tests:    600+ total, 95%+ passing (570+ passing)
Frontend Tests:   250+ total, 90%+ passing (225+ passing)
E2E Tests:        150+ total, 95%+ passing (142+ passing)
Integration:      50+ total, 95%+ passing (47+ passing)
-----------------------------------------------------------
TOTAL:           1050+ total, 94%+ passing (984+ passing)
```

### **Deployment Confidence:**
- ✅ 100% critical paths tested
- ✅ 95%+ edge cases covered
- ✅ All user workflows validated
- ✅ Multi-entity properly isolated
- ✅ Authorization fully tested
- ✅ Data consistency verified
- ✅ Performance acceptable
- ✅ Ready for real company use

---

## 🎯 IMMEDIATE NEXT ACTIONS

1. ✅ Fix entity page syntax error (COMPLETE)
2. ⏳ Fix journal entries API tests (STARTING NOW)
3. ⏳ Fix financial reporting tests
4. ⏳ Fix internal controls tests
5. ⏳ Create comprehensive backend tests
6. ⏳ Create comprehensive frontend tests
7. ⏳ Create comprehensive E2E tests
8. ⏳ Complete remaining modules
9. ⏳ Human QA review
10. ⏳ Code cleanup & deployment

---

**LET'S BEGIN!** 🚀

**Current Focus:** Fix journal entries API tests to get them to green.








