# COMPLETE TEST INVENTORY - ALL TESTS
Date: October 5, 2025
Tech Stack: Pytest (Backend), Jest (Frontend), Playwright (E2E)

---

## LAYER 1: BACKEND TESTS (pytest) - 65 files

tests/accounting/ (14 files):
1. conftest.py
2. test_bank_reconciliation_api.py
3. test_bank_reconciliation_complete.py
4. test_coa_api.py
5. test_coa_complete.py
6. test_coa_simplified.py
7. test_documents_api.py
8. test_documents_complete.py
9. test_financial_reporting_api.py
10. test_financial_reporting_complete.py
11. test_internal_controls_api.py
12. test_journal_entries_api.py
13. test_journal_entries_complete.py
14. (accounting/__pycache__/)

tests/integration/ (3 files):
15. __init__.py
16. test_entity_alignment.py
17. test_onboarding_workflow.py

tests/ (48 files):
18. __init__.py
19. conftest.py
20. create_test_projects.py
21. helpers_auth.py
22. test_accounting_close_and_conversion.py
23. test_accounting_compliance.py
24. test_accounting_posting_and_reports.py
25. test_accounts_payable.py
26. test_advisory_admin_gating.py
27. test_advisory_projects_module.py
28. test_advisory_projects_typed_questions.py
29. test_advisory_projects_workflow.py
30. test_advisory_public.py
31. test_advisory_students_admin.py
32. test_asc_edge_cases.py
33. test_auth_clerk_only.py
34. test_auth_full_access.py
35. test_authentication_flow.py
36. test_backend_clerk.py
37. test_clerk_auth.py
38. test_coffeechats_intersection.py
39. test_document_handling.py
40. test_document_system.py
41. test_documents_banking_integration.py
42. test_documents.py
43. test_employees_extended.py
44. test_employees.py
45. test_finance_module.py
46. test_fixed_assets.py
47. test_frontend_clerk_flow.py
48. test_investor_relations.py
49. test_investors_contacts.py
50. test_investors_module.py
51. test_investors_pipeline_filters.py
52. test_learning_module.py
53. test_learning_sprint2.py
54. test_learning_sprint3.py
55. test_metrics_api.py
56. test_metrics_symbols.py
57. test_my_projects_public.py
58. test_phase3_accounting.py
59. test_plm.py
60. test_public_applications.py
61. test_public_projects.py
62. test_resume_upload.py
63. test_slack_integration.py
64. test_students_auto_create_profile.py
65. test_time_quarter_end.py
66. test_trial_balance_and_batch.py

TOTAL: 65 pytest files

---

## LAYER 2: FRONTEND TESTS (Jest) - 43 files

### Desktop App (apps/desktop/src/__tests__/) - 33 files

Accounting Tests (11 files):
1. approvals.test.tsx
2. bank-reconciliation.test.tsx
3. close.test.tsx
4. consolidated-reporting.test.tsx
5. documents.test.tsx
6. financial-reporting.test.tsx
7. journal-entries.test.tsx
8. period-close.test.tsx
9. revrec.test.tsx
10. trial-balance.test.tsx
11. auth.test.tsx

Module Tests (13 files):
12. admin-gating.test.ts
13. middleware-gating.test.ts
14. logout-flow.test.tsx
15. marketing-signin-link.test.tsx
16. ngi-advisory/students/__tests__/students.test.tsx
17. ngi-advisory/projects/__tests__/projects.test.tsx
18. ngi-advisory/applications/__tests__/applications.test.tsx
19. ngi-advisory/lead-manager/__tests__/lead-manager.test.tsx
20. employees/__tests__/employees.test.ts
21. finance/__tests__/finance.test.tsx
22. investor-relations/__tests__/investor-management.test.tsx
23. settings/__tests__/appearance.test.tsx
24. settings/__tests__/theme-dom.test.tsx
25. reset-password/__tests__/reset-password.test.tsx

Component Tests (6 files):
26. components/layout/__tests__/sidebar.test.tsx
27. components/finance/__tests__/tickerIntegration.test.tsx
28. components/finance/__tests__/marketUtils.test.ts
29. components/finance/__tests__/overlayHistory.test.tsx

Lib/Utils Tests (3 files):
30. lib/auth/partners.test.ts
31. lib/metrics/__tests__/labels.test.ts
32. lib/utils/__tests__/dateUtils.test.ts

Test Utils:
33. test-utils.tsx

### Student App (apps/student/src/__tests__/) - 10 files

Component Tests (4 files):
34. components/__tests__/student-nav.test.tsx
35. components/learning/__tests__/CompanySelector.test.tsx
36. components/learning/__tests__/FileUpload.test.tsx
37. components/learning/__tests__/ProgressTracker.test.tsx

Page Tests (2 files):
38. app/projects/__tests__/projects-client.test.tsx
39. app/projects/[id]/__tests__/coffeechat-picker.test.tsx
40. app/settings/__tests__/settings.test.tsx

Auth/Middleware Tests (3 files):
41. compute-redirect.test.ts
42. domain-gating.test.ts
43. middleware-routing.test.ts
44. sign-in-ui.test.tsx

TOTAL: 43 Jest test files (33 desktop + 10 student)

---

## LAYER 3: E2E TESTS (Playwright) - 27 files

### Main E2E Directory (e2e/tests/) - 16 files

Accounting Workflows (12 files):
1. accounting-approvals-workflow.spec.ts
2. accounting-bank-reconciliation-workflow.spec.ts
3. accounting-coa-workflow.spec.ts
4. accounting-complete-workflow.spec.ts
5. accounting-consolidated-reporting-workflow.spec.ts
6. accounting-documents-workflow.spec.ts
7. accounting-entity-conversion-workflow.spec.ts
8. accounting-financial-reporting-workflow.spec.ts
9. accounting-journal-entries-workflow.spec.ts
10. accounting-period-close-workflow.spec.ts
11. accounting-revenue-recognition-workflow.spec.ts
12. accounting-trial-balance-workflow.spec.ts

Other E2E (4 files):
13. entity-management.spec.ts
14. learning-module.spec.ts
15. marketing.spec.ts
16. student-nav.spec.ts

### Desktop App E2E (apps/desktop/e2e/) - 6 files

Advisory Admin (6 files):
17. applications-admin.spec.ts
18. applications-past.spec.ts
19. coffeechats-admin.spec.ts
20. onboarding-admin.spec.ts
21. projects-admin.spec.ts
22. students-admin.spec.ts

### General E2E (5 files):
23. coffeechats.api.spec.ts
24. coffeechats.spec.ts
25. projects.spec.ts
26. student-google.spec.ts
27. admin-password.spec.ts

TOTAL: 27 Playwright E2E test files

---

## GRAND TOTAL: 135 TEST FILES

- Backend (pytest): 65 files
- Frontend (Jest): 43 files (33 desktop + 10 student)
- E2E (Playwright): 27 files

Estimated total test count: 400-500 individual tests across all layers

---

## ALIGNMENT NEEDED

Every single one of these 135 test files needs to be:
1. Reviewed for current API endpoints
2. Updated for Clerk auth (not legacy)
3. Aligned with actual database schema
4. Updated with real document workflows
5. Verified against NGI Capital LLC business operations

This is the comprehensive systematic review you requested.
Date: October 5, 2025
Tech Stack: Pytest (Backend), Jest (Frontend), Playwright (E2E)

---

## LAYER 1: BACKEND TESTS (pytest) - 65 files

tests/accounting/ (14 files):
1. conftest.py
2. test_bank_reconciliation_api.py
3. test_bank_reconciliation_complete.py
4. test_coa_api.py
5. test_coa_complete.py
6. test_coa_simplified.py
7. test_documents_api.py
8. test_documents_complete.py
9. test_financial_reporting_api.py
10. test_financial_reporting_complete.py
11. test_internal_controls_api.py
12. test_journal_entries_api.py
13. test_journal_entries_complete.py
14. (accounting/__pycache__/)

tests/integration/ (3 files):
15. __init__.py
16. test_entity_alignment.py
17. test_onboarding_workflow.py

tests/ (48 files):
18. __init__.py
19. conftest.py
20. create_test_projects.py
21. helpers_auth.py
22. test_accounting_close_and_conversion.py
23. test_accounting_compliance.py
24. test_accounting_posting_and_reports.py
25. test_accounts_payable.py
26. test_advisory_admin_gating.py
27. test_advisory_projects_module.py
28. test_advisory_projects_typed_questions.py
29. test_advisory_projects_workflow.py
30. test_advisory_public.py
31. test_advisory_students_admin.py
32. test_asc_edge_cases.py
33. test_auth_clerk_only.py
34. test_auth_full_access.py
35. test_authentication_flow.py
36. test_backend_clerk.py
37. test_clerk_auth.py
38. test_coffeechats_intersection.py
39. test_document_handling.py
40. test_document_system.py
41. test_documents_banking_integration.py
42. test_documents.py
43. test_employees_extended.py
44. test_employees.py
45. test_finance_module.py
46. test_fixed_assets.py
47. test_frontend_clerk_flow.py
48. test_investor_relations.py
49. test_investors_contacts.py
50. test_investors_module.py
51. test_investors_pipeline_filters.py
52. test_learning_module.py
53. test_learning_sprint2.py
54. test_learning_sprint3.py
55. test_metrics_api.py
56. test_metrics_symbols.py
57. test_my_projects_public.py
58. test_phase3_accounting.py
59. test_plm.py
60. test_public_applications.py
61. test_public_projects.py
62. test_resume_upload.py
63. test_slack_integration.py
64. test_students_auto_create_profile.py
65. test_time_quarter_end.py
66. test_trial_balance_and_batch.py

TOTAL: 65 pytest files

---

## LAYER 2: FRONTEND TESTS (Jest) - 43 files

### Desktop App (apps/desktop/src/__tests__/) - 33 files

Accounting Tests (11 files):
1. approvals.test.tsx
2. bank-reconciliation.test.tsx
3. close.test.tsx
4. consolidated-reporting.test.tsx
5. documents.test.tsx
6. financial-reporting.test.tsx
7. journal-entries.test.tsx
8. period-close.test.tsx
9. revrec.test.tsx
10. trial-balance.test.tsx
11. auth.test.tsx

Module Tests (13 files):
12. admin-gating.test.ts
13. middleware-gating.test.ts
14. logout-flow.test.tsx
15. marketing-signin-link.test.tsx
16. ngi-advisory/students/__tests__/students.test.tsx
17. ngi-advisory/projects/__tests__/projects.test.tsx
18. ngi-advisory/applications/__tests__/applications.test.tsx
19. ngi-advisory/lead-manager/__tests__/lead-manager.test.tsx
20. employees/__tests__/employees.test.ts
21. finance/__tests__/finance.test.tsx
22. investor-relations/__tests__/investor-management.test.tsx
23. settings/__tests__/appearance.test.tsx
24. settings/__tests__/theme-dom.test.tsx
25. reset-password/__tests__/reset-password.test.tsx

Component Tests (6 files):
26. components/layout/__tests__/sidebar.test.tsx
27. components/finance/__tests__/tickerIntegration.test.tsx
28. components/finance/__tests__/marketUtils.test.ts
29. components/finance/__tests__/overlayHistory.test.tsx

Lib/Utils Tests (3 files):
30. lib/auth/partners.test.ts
31. lib/metrics/__tests__/labels.test.ts
32. lib/utils/__tests__/dateUtils.test.ts

Test Utils:
33. test-utils.tsx

### Student App (apps/student/src/__tests__/) - 10 files

Component Tests (4 files):
34. components/__tests__/student-nav.test.tsx
35. components/learning/__tests__/CompanySelector.test.tsx
36. components/learning/__tests__/FileUpload.test.tsx
37. components/learning/__tests__/ProgressTracker.test.tsx

Page Tests (2 files):
38. app/projects/__tests__/projects-client.test.tsx
39. app/projects/[id]/__tests__/coffeechat-picker.test.tsx
40. app/settings/__tests__/settings.test.tsx

Auth/Middleware Tests (3 files):
41. compute-redirect.test.ts
42. domain-gating.test.ts
43. middleware-routing.test.ts
44. sign-in-ui.test.tsx

TOTAL: 43 Jest test files (33 desktop + 10 student)

---

## LAYER 3: E2E TESTS (Playwright) - 27 files

### Main E2E Directory (e2e/tests/) - 16 files

Accounting Workflows (12 files):
1. accounting-approvals-workflow.spec.ts
2. accounting-bank-reconciliation-workflow.spec.ts
3. accounting-coa-workflow.spec.ts
4. accounting-complete-workflow.spec.ts
5. accounting-consolidated-reporting-workflow.spec.ts
6. accounting-documents-workflow.spec.ts
7. accounting-entity-conversion-workflow.spec.ts
8. accounting-financial-reporting-workflow.spec.ts
9. accounting-journal-entries-workflow.spec.ts
10. accounting-period-close-workflow.spec.ts
11. accounting-revenue-recognition-workflow.spec.ts
12. accounting-trial-balance-workflow.spec.ts

Other E2E (4 files):
13. entity-management.spec.ts
14. learning-module.spec.ts
15. marketing.spec.ts
16. student-nav.spec.ts

### Desktop App E2E (apps/desktop/e2e/) - 6 files

Advisory Admin (6 files):
17. applications-admin.spec.ts
18. applications-past.spec.ts
19. coffeechats-admin.spec.ts
20. onboarding-admin.spec.ts
21. projects-admin.spec.ts
22. students-admin.spec.ts

### General E2E (5 files):
23. coffeechats.api.spec.ts
24. coffeechats.spec.ts
25. projects.spec.ts
26. student-google.spec.ts
27. admin-password.spec.ts

TOTAL: 27 Playwright E2E test files

---

## GRAND TOTAL: 135 TEST FILES

- Backend (pytest): 65 files
- Frontend (Jest): 43 files (33 desktop + 10 student)
- E2E (Playwright): 27 files

Estimated total test count: 400-500 individual tests across all layers

---

## ALIGNMENT NEEDED

Every single one of these 135 test files needs to be:
1. Reviewed for current API endpoints
2. Updated for Clerk auth (not legacy)
3. Aligned with actual database schema
4. Updated with real document workflows
5. Verified against NGI Capital LLC business operations

This is the comprehensive systematic review you requested.








