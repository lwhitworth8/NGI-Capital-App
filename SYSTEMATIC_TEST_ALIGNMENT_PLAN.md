# SYSTEMATIC TEST ALIGNMENT - ALL 135 TEST FILES
Date: October 5, 2025
Scope: Align every test to current app state and real NGI Capital LLC data
Goal: Professional business entity management system ready for production

---

## COMPLETE TEST INVENTORY

BACKEND (pytest): 65 files, ~300 tests
FRONTEND (Jest): 43 files, ~150 tests  
E2E (Playwright): 27 files, ~100 tests
TOTAL: 135 test files, ~550 existing tests

---

## ALIGNMENT STRATEGY

### Phase 1: Backend Test Alignment (2-3 days)

Review each of 65 pytest files:

ACCOUNTING (14 files) - PRIORITY 1:
- Update to real document types (formation, internal_controls, invoices)
- Use actual file sizes (9KB to 1.3MB observed)
- Test with 5 real invoice scenarios
- Align to current API endpoints
- Fix all auth headers
- Update response format assertions

INTEGRATION (3 files) - PRIORITY 2:
- Expand with real document workflows
- Test entity alignment with real data
- Onboarding with actual business scenarios

ADVISORY (6 files) - PRIORITY 3:
- Align to current project structure
- Update student workflows
- Coffee chats integration

EMPLOYEES (2 files) - PRIORITY 4:
- Timesheet workflows
- Auto-employee creation from onboarding

AUTH (6 files) - PRIORITY 5:
- Clerk-only (no legacy)
- Admin gating
- Domain restrictions

REMAINING (34 files) - PRIORITY 6:
- Learning, Finance, Investors, etc.
- Align to current implementations

### Phase 2: Frontend Test Alignment (2 days)

Review 43 Jest files:

DESKTOP ACCOUNTING (11 files):
- Update component tests for current UI
- Mock APIs with real response formats
- Test with 13 document scenarios
- Verify all user interactions

DESKTOP MODULES (13 files):
- Advisory components
- Employee components
- Finance components
- Settings and auth

STUDENT APP (10 files):
- Navigation tests
- Project browsing
- Application flows
- Learning components

UTILITIES (9 files):
- Auth helpers
- Date utils
- Metrics
- Middleware

### Phase 3: E2E Test Alignment (2 days)

Review 27 Playwright files:

ACCOUNTING WORKFLOWS (12 files):
- Complete accounting cycle
- Document-backed transactions
- Multi-entity operations
- Month-end close

ADVISORY WORKFLOWS (6 files):
- Project management
- Student onboarding
- Applications
- Coffee chats

GENERAL WORKFLOWS (9 files):
- Entity management
- Authentication
- Navigation
- Learning

---

## ALIGNMENT CHECKLIST PER TEST FILE

For EACH of 135 files:

[ ] 1. Read complete test file
[ ] 2. Identify API endpoints used
[ ] 3. Verify endpoints exist in current codebase
[ ] 4. Check auth pattern (Clerk vs legacy)
[ ] 5. Review database schema assumptions
[ ] 6. Update fixtures if needed
[ ] 7. Align assertions to current response formats
[ ] 8. Add real data scenarios where applicable
[ ] 9. Run test and fix failures
[ ] 10. Document changes made

---

## EXECUTION APPROACH

SYSTEMATIC REVIEW:
- Start with accounting tests (most critical)
- Fix one file completely before moving to next
- Run tests after each fix
- Track progress (X of 135 complete)
- Achieve 95%+ passing before adding new tests

REAL DATA INTEGRATION:
- Use 13 actual documents as test fixtures
- Extract invoice data for AP tests
- Use formation docs for entity tests
- Build workflows from actual business operations

UP-TO-DATE PRACTICES:
- FastAPI async testing (2025 best practices from web search)
- Jest + React Testing Library (Next.js 15 patterns)
- Playwright Page Object Model (modern E2E)

---

## EXPECTED TIMELINE

Days 1-2: Backend Accounting (14 files) - Most critical
Day 3: Backend Integration + Auth (9 files)
Day 4: Backend Advisory + Employees (8 files)
Day 5: Backend Remaining (34 files)
Days 6-7: Frontend Desktop (33 files)
Day 8: Frontend Student (10 files)
Days 9-10: E2E Accounting (12 files)
Day 11: E2E Advisory (6 files)
Day 12: E2E Remaining (9 files)

TOTAL: 12 days for complete alignment of 135 test files

Then: Add new tests to reach 1000+ total

---

## STARTING NOW

Beginning systematic review with:
1. tests/accounting/test_documents_complete.py (14 tests)
2. tests/accounting/test_coa_complete.py (18 tests)
3. tests/accounting/test_journal_entries_complete.py (11 tests)

These are core tests that MUST be 100% passing for system confidence.

Will work through methodically until all 135 files reviewed and aligned.
Date: October 5, 2025
Scope: Align every test to current app state and real NGI Capital LLC data
Goal: Professional business entity management system ready for production

---

## COMPLETE TEST INVENTORY

BACKEND (pytest): 65 files, ~300 tests
FRONTEND (Jest): 43 files, ~150 tests  
E2E (Playwright): 27 files, ~100 tests
TOTAL: 135 test files, ~550 existing tests

---

## ALIGNMENT STRATEGY

### Phase 1: Backend Test Alignment (2-3 days)

Review each of 65 pytest files:

ACCOUNTING (14 files) - PRIORITY 1:
- Update to real document types (formation, internal_controls, invoices)
- Use actual file sizes (9KB to 1.3MB observed)
- Test with 5 real invoice scenarios
- Align to current API endpoints
- Fix all auth headers
- Update response format assertions

INTEGRATION (3 files) - PRIORITY 2:
- Expand with real document workflows
- Test entity alignment with real data
- Onboarding with actual business scenarios

ADVISORY (6 files) - PRIORITY 3:
- Align to current project structure
- Update student workflows
- Coffee chats integration

EMPLOYEES (2 files) - PRIORITY 4:
- Timesheet workflows
- Auto-employee creation from onboarding

AUTH (6 files) - PRIORITY 5:
- Clerk-only (no legacy)
- Admin gating
- Domain restrictions

REMAINING (34 files) - PRIORITY 6:
- Learning, Finance, Investors, etc.
- Align to current implementations

### Phase 2: Frontend Test Alignment (2 days)

Review 43 Jest files:

DESKTOP ACCOUNTING (11 files):
- Update component tests for current UI
- Mock APIs with real response formats
- Test with 13 document scenarios
- Verify all user interactions

DESKTOP MODULES (13 files):
- Advisory components
- Employee components
- Finance components
- Settings and auth

STUDENT APP (10 files):
- Navigation tests
- Project browsing
- Application flows
- Learning components

UTILITIES (9 files):
- Auth helpers
- Date utils
- Metrics
- Middleware

### Phase 3: E2E Test Alignment (2 days)

Review 27 Playwright files:

ACCOUNTING WORKFLOWS (12 files):
- Complete accounting cycle
- Document-backed transactions
- Multi-entity operations
- Month-end close

ADVISORY WORKFLOWS (6 files):
- Project management
- Student onboarding
- Applications
- Coffee chats

GENERAL WORKFLOWS (9 files):
- Entity management
- Authentication
- Navigation
- Learning

---

## ALIGNMENT CHECKLIST PER TEST FILE

For EACH of 135 files:

[ ] 1. Read complete test file
[ ] 2. Identify API endpoints used
[ ] 3. Verify endpoints exist in current codebase
[ ] 4. Check auth pattern (Clerk vs legacy)
[ ] 5. Review database schema assumptions
[ ] 6. Update fixtures if needed
[ ] 7. Align assertions to current response formats
[ ] 8. Add real data scenarios where applicable
[ ] 9. Run test and fix failures
[ ] 10. Document changes made

---

## EXECUTION APPROACH

SYSTEMATIC REVIEW:
- Start with accounting tests (most critical)
- Fix one file completely before moving to next
- Run tests after each fix
- Track progress (X of 135 complete)
- Achieve 95%+ passing before adding new tests

REAL DATA INTEGRATION:
- Use 13 actual documents as test fixtures
- Extract invoice data for AP tests
- Use formation docs for entity tests
- Build workflows from actual business operations

UP-TO-DATE PRACTICES:
- FastAPI async testing (2025 best practices from web search)
- Jest + React Testing Library (Next.js 15 patterns)
- Playwright Page Object Model (modern E2E)

---

## EXPECTED TIMELINE

Days 1-2: Backend Accounting (14 files) - Most critical
Day 3: Backend Integration + Auth (9 files)
Day 4: Backend Advisory + Employees (8 files)
Day 5: Backend Remaining (34 files)
Days 6-7: Frontend Desktop (33 files)
Day 8: Frontend Student (10 files)
Days 9-10: E2E Accounting (12 files)
Day 11: E2E Advisory (6 files)
Day 12: E2E Remaining (9 files)

TOTAL: 12 days for complete alignment of 135 test files

Then: Add new tests to reach 1000+ total

---

## STARTING NOW

Beginning systematic review with:
1. tests/accounting/test_documents_complete.py (14 tests)
2. tests/accounting/test_coa_complete.py (18 tests)
3. tests/accounting/test_journal_entries_complete.py (11 tests)

These are core tests that MUST be 100% passing for system confidence.

Will work through methodically until all 135 files reviewed and aligned.








