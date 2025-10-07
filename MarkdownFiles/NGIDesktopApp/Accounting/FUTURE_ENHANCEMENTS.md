# Future Enhancements - NGI Capital Accounting Module

## V1 Scope Decisions

The following features were intentionally excluded from V1 for simplicity and will be considered for future releases:

---

## 1. Internal Controls Module (UI/UX)

**Current State (V1):**
- Internal Controls UI/UX removed from frontend
- Backend routes and models remain intact
- Legal formation documents serve as sufficient internal controls for v1
- No SOX compliance or control testing workflows in UI

**Future Consideration (V2+):**
- Full Internal Controls dashboard
- Control testing workflows
- SOC 2 compliance tracking
- Automated control monitoring
- Control effectiveness scoring
- Risk assessment matrices
- Remediation tracking

**Why Deferred:**
- NGI Capital is pre-revenue startup, not subject to SOX
- Legal formation documents provide sufficient governance structure
- Manual controls via dual approval workflows are adequate for v1 scale
- Focus on core accounting workflows (docs, JEs, recon, reporting)

**Backend Endpoints (Available but No UI):**
- `GET /api/accounting/internal-controls/dashboard`
- `GET /api/accounting/internal-controls/controls`
- `POST /api/accounting/internal-controls/upload`
- `POST /api/accounting/internal-controls/controls/{control_id}/test`

---

## 2. Accounting Settings Module

**Current State (V1):**
- Settings UI removed - all settings hardcoded in `src/api/accounting_constants.py`
- Standardized configuration for all entities
- No user-configurable settings

**Hardcoded V1 Settings:**
```python
- Fiscal Year: Always 01-01 (Calendar Year)
- Accounting Basis: Always Accrual (GAAP)
- Dual Approval: Always Enabled for all entries
- Bank Sync: Always Enabled (Daily)
- Period Lock: Manual (CFO/Co-Founder only)
- Currency: USD only
- Revenue Recognition: ASC 606
- Depreciation: Straight-line
- Audit Trail: Always Enabled
- Document Retention: 7 years
```

**Future Consideration (V2+):**
- Per-entity fiscal year configuration
- Customizable approval thresholds
- Multi-currency support
- Inventory costing methods
- Customizable chart of accounts templates
- Automated period close rules
- Integration settings (QuickBooks, Xero export)

**Why Deferred:**
- All NGI entities use calendar year
- Standardization reduces complexity and errors
- No multi-currency needs in v1
- Services company (no inventory)
- Hardcoded settings ensure GAAP compliance

---

## 3. Multi-Currency Support

**Current State (V1):**
- USD only
- No foreign exchange (FX) gains/losses
- No currency conversion

**Future Consideration (V2+):**
- Multi-currency COA accounts
- Automatic FX rate updates
- Translation adjustments (ASC 830)
- Functional vs presentation currency
- FX gains/losses tracking

**Why Deferred:**
- All transactions in USD for v1
- No international operations yet
- Adds significant complexity to financial reporting

---

## 4. Inventory & COGS

**Current State (V1):**
- No inventory tracking
- Services company model
- Direct expense recognition

**Future Consideration (V2+):**
- Inventory costing (FIFO, LIFO, Weighted Average)
- Cost of Goods Sold (COGS) module
- Inventory valuation adjustments
- Lower of cost or market (LCM)
- Physical inventory counts

**Why Deferred:**
- NGI Capital is services/advisory business
- No physical products to track
- No manufacturing or retail operations

---

## 5. Advanced Consolidated Reporting

**Current State (V1):**
- Basic consolidation (parent + subsidiaries)
- Intercompany elimination placeholders
- Manual intercompany transaction tracking

**Future Consideration (V2+):**
- Automated intercompany elimination
- Non-controlling interests (NCI)
- Variable Interest Entities (VIEs)
- Segment reporting (ASC 280)
- Geographic revenue breakdown
- Multi-level consolidation

**Why Deferred:**
- Simple 3-entity structure (parent + 2 subs)
- Minimal intercompany transactions
- No external minority shareholders

---

## 6. Advanced Tax Integration

**Current State (V1):**
- Separate Tax module exists
- Manual tax provision calculations
- No automated tax return prep

**Future Consideration (V2+):**
- Automated tax provision (ASC 740)
- Deferred tax asset/liability tracking
- Effective tax rate reconciliation
- Multi-state tax apportionment
- Transfer pricing automation
- Tax return data export (1120, 1065, 1099s)

**Why Deferred:**
- Tax handled by CPAs for v1
- Pre-revenue = minimal tax complexity
- Focus on financial accounting first

---

## 7. Fixed Asset Management

**Current State (V1):**
- Basic depreciation via standard adjusting entries
- Manual fixed asset tracking
- Straight-line only

**Future Consideration (V2+):**
- Fixed asset register
- Multiple depreciation methods (DDB, SYD, MACRS)
- Asset disposal tracking
- Gains/losses on sale
- Impairment testing (ASC 360)
- Component depreciation

**Why Deferred:**
- Minimal fixed assets (computers, furniture)
- Straight-line adequate for v1 asset base
- No complex PP&E

---

## 8. Lease Accounting (ASC 842)

**Current State (V1):**
- Manual lease entries
- Placeholder for operating leases

**Future Consideration (V2+):**
- ROU asset and lease liability calculation
- Lease amortization schedules
- Lease modification tracking
- Sale-leaseback accounting
- Embedded leases identification

**Why Deferred:**
- Simple office lease only
- Lease accounting highly complex
- CPA can handle lease entries for v1

---

## 9. Revenue Recognition (ASC 606) - Full Module

**Current State (V1):**
- Basic revenue recognition page
- Manual contract tracking
- Simple milestone-based recognition

**Future Consideration (V2+):**
- 5-step model automation
- Performance obligation tracking
- Variable consideration estimation
- Contract asset/liability management
- Revenue waterfall reports
- Customer-specific revenue analytics

**Why Deferred:**
- Advisory services = simple revenue model
- Milestone billing is straightforward
- No complex multi-element arrangements

---

## 10. Budgeting & Forecasting

**Current State (V1):**
- None - actuals only

**Future Consideration (V2+):**
- Annual budget creation
- Monthly forecasting
- Budget vs actuals variance analysis
- Rolling forecasts (13-week cash flow)
- Scenario modeling
- Departmental budgets

**Why Deferred:**
- Pre-revenue startup
- Focus on accurate actuals first
- Manual budgeting in Excel sufficient

---

## 11. Advanced Bank Reconciliation

**Current State (V1):**
- Mercury integration (automated sync)
- Basic transaction matching
- Manual reconciliation

**Future Consideration (V2+):**
- Multi-bank aggregation (Plaid)
- Credit card reconciliation
- Automated three-way match (PO-receipt-invoice)
- Duplicate detection
- Recurring transaction rules
- Mobile check deposits

**Why Deferred:**
- Single bank (Mercury) sufficient
- No credit cards in v1
- Limited transaction volume

---

## 12. Expense Management

**Current State (V1):**
- Manual expense entry via Journal Entries
- Document upload for receipts

**Future Consideration (V2+):**
- Employee expense reports
- Per diem tracking
- Mileage logs
- Receipt scanning & OCR
- Approval workflows for reimbursements
- Corporate card integration
- Travel & entertainment (T&E) analytics

**Why Deferred:**
- 2-person company (Landon & Andre)
- Minimal employee expenses
- Direct payment model (no reimbursements)

---

## 13. Accounts Payable (AP) Automation

**Current State (V1):**
- Manual vendor bill entry
- No AP aging

**Future Consideration (V2+):**
- Vendor management portal
- AP aging reports
- 3-way match (PO-receipt-invoice)
- Payment scheduling
- Early payment discounts (2/10 net 30)
- Vendor 1099 tracking
- ACH/wire payment integration

**Why Deferred:**
- Minimal vendors in v1
- Pay-as-you-go model
- No complex AP workflows

---

## 14. Accounts Receivable (AR) Automation

**Current State (V1):**
- Pre-revenue = no AR

**Future Consideration (V2+):**
- Customer invoicing
- AR aging reports
- Payment reminders
- Collections workflows
- Bad debt estimation (ASC 326 - CECL)
- Credit limits
- Payment portal

**Why Deferred:**
- No revenue yet
- Advisory = milestone billing (not invoicing)

---

## 15. Payroll Integration

**Current State (V1):**
- No payroll yet (pre-revenue)
- Manual journal entries for equity comp

**Future Consideration (V2+):**
- Payroll provider integration (Gusto, ADP)
- Automated payroll JE import
- 401(k) contribution tracking
- Stock-based compensation (ASC 718)
- Payroll tax liability tracking
- PTO accrual

**Why Deferred:**
- No W-2 employees yet
- Equity-only compensation (founders)
- Payroll handled by Gusto when needed

---

## 16. Audit Package Export

**Current State (V1):**
- Manual export capabilities
- Trial balance, financials available

**Future Consideration (V2+):**
- One-click audit package generation
- PBC (Provided by Client) list automation
- Supporting schedule exports
- Tie-out reports
- Audit trail CSV exports
- Big 4 auditor portal integration

**Why Deferred:**
- No audit required for v1
- Pre-revenue = no audit thresholds
- Manual export sufficient for accountant review

---

## Decision Log

| Feature | V1 Status | Reason for Deferral | Priority for V2 |
|---------|-----------|---------------------|-----------------|
| Internal Controls UI | Removed | Legal docs sufficient | Low |
| Settings Module | Hardcoded | Standardization | Medium |
| Multi-Currency | Not Built | USD only | Medium |
| Inventory/COGS | Not Built | Services company | N/A |
| Advanced Consolidation | Placeholder | Simple structure | Medium |
| Tax Integration | Separate Module | CPA-handled | High |
| Fixed Asset Mgmt | Basic | Minimal assets | Low |
| Lease (ASC 842) | Manual | Simple leases | Medium |
| Full ASC 606 | Basic | Simple revenue model | Medium |
| Budgeting | Not Built | Actuals-first | High |
| Multi-Bank Recon | Single Bank | Mercury only | Medium |
| Expense Mgmt | Manual | 2 employees | Low |
| AP Automation | Manual | Low volume | Medium |
| AR Automation | N/A | Pre-revenue | High (post-rev) |
| Payroll | External | Gusto | Low |
| Audit Package | Manual | No audit yet | High (fundraise) |

---

## V2 Priorities (Post-Revenue, Post-Seed Funding)

1. **Budgeting & Forecasting** - Critical for investor reporting
2. **Tax Integration** - Automated tax provision for 1120-S/1120
3. **AR Automation** - Once revenue starts
4. **Audit Package Export** - For Series A audit
5. **Multi-Bank Reconciliation** - As company scales

---

*Last Updated: October 4, 2025*
*Review Cycle: Quarterly*


