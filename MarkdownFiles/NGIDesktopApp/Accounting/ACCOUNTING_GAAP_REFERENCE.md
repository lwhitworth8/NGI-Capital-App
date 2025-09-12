# ACCOUNTING_GAAP_REFERENCE

Authoritative structure for NGI Capital’s accounting and reports. Use this as the **canonical reporting shape** and classifications.

**Primary reference**: “Financial statements for tech startups – illustrative US GAAP package (private company / EGC).” See `docs/us-gaap-egc-template.pdf`. :contentReference[oaicite:0]{index=0}

## Scope
- Follow US GAAP and ASC (incl. 606 revenue, 820 fair value, 842 leases).
- Private company context (no SEC filing requirements).
- Target fiscal year: **Jan 1 – Dec 31**.
- Two partners; multi-entity holdco with subsidiaries.

## Reporting package (exact outputs to implement)
1) **Balance Sheet (Classified)**  
   Sections: Current assets → Noncurrent assets → Current liabilities → Noncurrent liabilities → Stockholders’ equity (or deficit).  
   Totals must reconcile: **Total assets = Total liabilities + equity**.

2) **Statement of Operations (Income Statement)**  
   Revenue, Cost of revenue, Gross profit, OpEx (R&D / Sales & Marketing / G&A), Operating income, Other income/expense, Pretax income, Tax, Net income (loss).

3) **Statement of Comprehensive Income (Loss)**  
   Net income + OCI items (e.g., FX translation, if any) → **Total comprehensive income (loss)**.

4) **Statement of Stockholders’ Equity**  
   Opening balances → changes (issuances, SBC, option exercises, OCI, net income) → Ending balances.

5) **Statement of Cash Flows (Indirect, ASC 230)**  
   **CFO / CFI / CFF**, with reconciling adjustments and non-cash schedules.

6) **Notes (stubs with headings)**  
   Create note stubs + data contracts for: nature of business, significant policies, revenue (ASC 606), capitalized software, leases (ASC 842), debt, stock-based comp, fair value (ASC 820). Populate from DB later; do **not** hardcode values.

## Data model (minimum)
- **accounts**: id, code (string), name, type (asset/liability/equity/revenue/expense), sub_type, is_active.
- **journal_entries**: id, date, entity_id, memo, status (draft|posted), created_by, posted_at.
- **journal_lines**: id, journal_entry_id, account_id, entity_id, amount (signed), side (debit|credit), description.
- **equity_transactions** (entities module): issuance/transfer/cancellation, shares, price, date, docs.
- **investors** (entities module): name, type, contact fields, ownership links.
- **posting rules**: totals per JE must satisfy **Σdebits == Σcredits**; posted JEs **immutable** (allow adjusting entries only).

## Chart of accounts (starter set)
- **Assets**: Cash, A/R, Prepaids, Deferred contract costs, ROU assets (operating/finance), Capitalized software, Fixed assets, Other assets.
- **Liabilities**: A/P & accrued, Deferred revenue, Debt (current/noncurrent), Lease liabilities (operating/finance current & noncurrent), Other liabilities.
- **Equity**: Common stock, APIC, Accumulated deficit, AOCI.
- **Revenue/COGS**: Subscription revenue, Services revenue, Cost of revenue.
- **OpEx**: R&D, Sales & marketing, G&A.
(Extend as needed; keep types aligned to report sections above.)

## Reports API (must exist and match shapes)
- `GET /api/accounting/reports/balance-sheet?as_of=YYYY-MM-DD`
- `GET /api/accounting/reports/income-statement?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/accounting/reports/comprehensive-income?from&to`
- `GET /api/accounting/reports/statement-of-equity?from&to`
- `GET /api/accounting/reports/cash-flow?from&to`
Return JSON with section arrays and line items; include totals and parity checks.

## Classification & GAAP cues the code must respect
- **Classified BS**: strictly split current vs noncurrent.
- **ASC 606**: subscription revenue recognized ratably; deferred revenue and contract cost roll-forwards supported.
- **ASC 842**: record ROU assets and lease liabilities; operating vs finance presentation.
- **ASC 820**: fair value disclosures framework (Level 1/2/3 flags on relevant items).
- **Equity statement**: show movements by component (common/APIC/deficit/AOCI).
- **Cash flow**: indirect method; reconcile net income to CFO; separate CFI/CFF; include non-cash schedules.

## Acceptance tests the agent must implement
1) **Double entry**: posting blocked if debits != credits.  
2) **Immutability**: posted JE cannot change; only adjusting JE allowed.  
3) **BS parity**: assets == liabilities + equity at each date.  
4) **IS → Equity tie-in**: net income flows into accumulated deficit.  
5) **Cash flow reconciliation**: CFO+CFI+CFF == Δcash.  
6) **Classification tests**: current vs noncurrent buckets, lease items under ASC 842, deferred revenue/contract costs under ASC 606.  
7) **ASCII-only**: no unicode in models, migrations, code, or fixtures.  
8) **Entity scoping**: reports filter by entity_id when provided; otherwise consolidated.

## Deliverables
- SQLAlchemy models + migrations for any missing tables/columns.
- Report endpoints listed above.
- Unit tests: `tests/test_accounting_compliance.py` plus classification tests.
- Docs: update `PROJECT_CONTEXT.md` to mark accounting as **enabled and wired**.
