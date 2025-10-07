# NGI Capital Accounting Module - Comprehensive Test Guide

**Date:** October 4, 2025  
**Author:** NGI Capital Development Team  
**Purpose:** Complete testing guide for all accounting workflows before investor demos and Big 4 audit readiness

---

## Test Suite Overview

We have created a comprehensive, 3-tier test suite:

### 1. Backend API Tests (Pytest)
- **Chart of Accounts** - `tests/accounting/test_coa_complete.py`
- **Journal Entries** - `tests/accounting/test_journal_entries_complete.py`
- **Documents** - `tests/accounting/test_documents_complete.py`
- **Bank Reconciliation** - `tests/accounting/test_bank_reconciliation_complete.py`
- **Financial Reporting** - `tests/accounting/test_financial_reporting_complete.py`
- **Approvals** - `tests/accounting/test_approvals_complete.py`

### 2. Frontend Tests (Jest + React Testing Library)
- **Chart of Accounts Page** - `apps/desktop/src/app/accounting/chart-of-accounts/__tests__/page.test.tsx`
- **EntitySelector Component** - `apps/desktop/src/components/accounting/__tests__/EntitySelector.test.tsx`

### 3. E2E Tests (Playwright)
- **Complete Accounting Workflow** - `e2e/tests/accounting-workflow.spec.ts`
- **Entity Management** - `e2e/tests/entity-management.spec.ts`

---

## Prerequisites

### 1. Environment Setup

**Required Environment Variables** (`.env`):
```bash
# Database
DATABASE_URL=sqlite+aiosqlite:///./data/ngi_capital.db

# Mercury API (REAL credentials for testing)
MERCURY_API_KEY=your_real_mercury_api_key
MERCURY_API_SECRET=your_real_mercury_api_secret
MERCURY_ACCOUNT_ID=your_mercury_account_id
MERCURY_ENVIRONMENT=sandbox  # or production

# Authentication (for E2E tests)
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# JWT
SECRET_KEY=your_jwt_secret_key
ALGORITHM=HS256
```

### 2. Install Dependencies

**Python (Backend tests):**
```bash
pip install -r requirements.txt
pip install pytest pytest-asyncio httpx
```

**Node.js (Frontend + E2E tests):**
```bash
npm install
# or
pnpm install
```

### 3. Database Setup

```bash
# Initialize database with test data
python scripts/init_accounting_tables.py
python scripts/seed_accounting_entities.py
python scripts/seed_employees.py
```

---

## Running Tests

### Backend API Tests (Pytest)

**Run all backend tests:**
```bash
pytest tests/accounting/ -v
```

**Run specific module:**
```bash
pytest tests/accounting/test_coa_complete.py -v
pytest tests/accounting/test_journal_entries_complete.py -v
pytest tests/accounting/test_bank_reconciliation_complete.py -v
```

**Run with coverage:**
```bash
pytest tests/accounting/ --cov=src/api/routes --cov-report=html
```

**Run tests with Mercury API:**
```bash
# Ensure MERCURY_API_KEY is set
pytest tests/accounting/test_bank_reconciliation_complete.py -v -m mercury
```

**Skip slow tests:**
```bash
pytest tests/accounting/ -v -m "not slow"
```

### Frontend Tests (Jest)

**Run all frontend tests:**
```bash
cd apps/desktop
npm test
# or
pnpm test
```

**Run specific test file:**
```bash
npm test -- chart-of-accounts/__tests__/page.test.tsx
npm test -- EntitySelector.test.tsx
```

**Run with coverage:**
```bash
npm test -- --coverage
```

**Watch mode (for development):**
```bash
npm test -- --watch
```

### E2E Tests (Playwright)

**Install Playwright browsers (first time only):**
```bash
npx playwright install
```

**Run all E2E tests:**
```bash
npx playwright test
```

**Run specific test:**
```bash
npx playwright test accounting-workflow
npx playwright test entity-management
```

**Run with UI (headed mode):**
```bash
npx playwright test --headed
```

**Debug mode:**
```bash
npx playwright test --debug
```

**Generate test report:**
```bash
npx playwright show-report
```

---

## Test Coverage Goals

### Backend API Tests
- ✅ All CRUD operations for each module
- ✅ Error handling and validation
- ✅ Authentication and authorization
- ✅ Data integrity (e.g., balanced journal entries)
- ✅ Real Mercury API integration
- ✅ Audit trail verification
- ✅ Multi-entity support

### Frontend Tests
- ✅ Component rendering
- ✅ User interactions
- ✅ Form validation
- ✅ API integration (mocked)
- ✅ EntitySelector functionality
- ✅ Error states

### E2E Tests
- ✅ Complete accounting workflow (document → entry → reconciliation → reports)
- ✅ Dual approval workflow (Landon + Andre)
- ✅ Entity management and org charts
- ✅ Period close
- ✅ Financial statement generation and export

---

## Test Fixtures and Data

### Shared Fixtures (`tests/conftest.py`)

**Database Fixtures:**
- `async_db` - In-memory test database
- `async_client` - HTTP client for API testing
- `seed_test_entities` - Seeds NGI Capital LLC and subsidiaries
- `seed_test_partners` - Seeds Landon and Andre
- `seed_test_coa` - Seeds basic chart of accounts

**Authentication:**
- `mock_auth_headers` - Mock auth headers for testing

### Test Data
- **Entity 1:** NGI Capital LLC (active)
- **Entity 2:** NGI Capital Advisory LLC (pending conversion, 100% owned)
- **Entity 3:** The Creator Terminal Inc. (pending conversion, 100% owned)
- **Partners:** Landon Whitworth, Andre Nurmamade (50% each)

---

## Fixing Test Failures

### Common Issues and Solutions

**1. Database Connection Errors**
```bash
# Recreate test database
python scripts/init_accounting_tables.py
```

**2. Import Errors**
```bash
# Ensure PYTHONPATH is set
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

**3. Async Fixture Warnings**
```bash
# Use pytest-asyncio
pip install pytest-asyncio
```

**4. Mercury API Failures**
```bash
# Check API key is valid
echo $MERCURY_API_KEY

# Test with sandbox environment first
export MERCURY_ENVIRONMENT=sandbox
```

**5. Frontend Test Failures**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
```

**6. E2E Test Timeouts**
```bash
# Increase timeout in playwright.config.ts
timeout: 60000
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Accounting Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pip install pytest pytest-asyncio httpx
      - run: pytest tests/accounting/ -v
  
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npx playwright test
```

---

## Test Execution Checklist

Before investor demos and auditor review:

- [ ] All backend API tests pass (100%)
- [ ] All frontend tests pass (100%)
- [ ] All E2E tests pass (100%)
- [ ] Mercury sync working with real API
- [ ] Dual approval workflow tested
- [ ] Entity hierarchy verified
- [ ] Financial statements generate correctly
- [ ] Accounting equation balanced in all tests
- [ ] Audit trail complete
- [ ] Period close working
- [ ] Document upload/download working
- [ ] Bank reconciliation complete
- [ ] No console errors in E2E tests
- [ ] Test coverage > 80% for critical paths

---

## Manual Testing After Automated Tests

Once all automated tests pass, perform these manual checks:

1. **Login as Landon** → Create journal entry → Verify in database
2. **Login as Andre** → Approve entry → Verify dual approval
3. **Upload real Mercury CSV** → Verify transactions imported
4. **Generate balance sheet** → Verify accounting equation
5. **Export PDF** → Verify formatting and completeness
6. **Entity conversion workflow** → Test all 6 steps
7. **Employee org chart** → Verify emails fit, tree centered
8. **Period close** → Verify can't post to closed period

---

## Support and Troubleshooting

### Test Logs
- Backend: `pytest -v -s` (show print statements)
- Frontend: Check console in test output
- E2E: `playwright show-report` (visual report)

### Debug Mode
```bash
# Backend
pytest tests/accounting/test_coa_complete.py -v -s --pdb

# Frontend
npm test -- --no-coverage --verbose

# E2E
npx playwright test --debug
```

### Contact
- Landon Whitworth: lwhitworth@ngicapitaladvisory.com
- Andre Nurmamade: anurmamade@ngicapital.com

---

## Next Steps After All Tests Pass

1. ✅ Run full test suite one final time
2. ✅ Generate coverage report
3. ✅ Fix any remaining edge cases
4. ✅ Perform manual testing per checklist
5. ✅ Update deployment documentation
6. ✅ Schedule investor demo
7. ✅ Prepare for Big 4 audit review

---

**Status:** Test suite creation complete - Ready for execution and iterative fixing

**Last Updated:** October 4, 2025

