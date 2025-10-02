# Accounting Modules - Super In-Depth Expansion
**Last Updated:** October 2, 2025  
**Purpose:** Comprehensive accounting curriculum for NGI Capital Learning Module  
**Target:** Prepare students to work as analysts at NGI Capital Advisory  
**Animations:** Manim-powered 3Blue1Brown-style visualizations throughout (see Appendix.Manim.Animations.md)

## Accounting I: Financial Statement Foundations (20-25 hours)

**Duration:** 3-4 weeks  
**Format:** Interactive lessons, Excel exercises, real 10-K analysis, Word memo deliverables  
**Textbook References:** 
- "Intermediate Accounting" by Kieso, Weygandt & Warfield (17th Edition, 2025)
- "Financial Statement Analysis & Security Valuation" by Stephen Penman (6th Edition)
- CFA Level 1 Financial Reporting & Analysis curriculum (2025)
- "Financial Shenanigans" by Howard Schilit (4th Edition - fraud detection)
- "The Interpretation of Financial Statements" by Benjamin Graham

### Unit 1: The Three Statements (6-8 hours)

**Manim Animation:** `3_Statement_Linkage` (10 min) — How IS/BS/CF connect with animated flows

**Learning Objectives:**
- Master 3-statement linkages (IS → CF → BS) with zero errors
- Understand accrual accounting vs. cash accounting
- Read and interpret 10-K financial statements fluently
- Build working capital schedules and cash flow reconciliation
- Identify red flags in revenue recognition and working capital manipulation

#### 1.1 Income Statement Deep Dive (2 hours)

**Manim Animation:** `Revenue_Recognition_BUD` (6 min) — AB InBev revenue types and timing

**Revenue Recognition (ASC 606 - 2025 Standard)**
- **The 5-Step Model:**
  1. Identify the contract with customer
  2. Identify performance obligations
  3. Determine transaction price
  4. Allocate price to performance obligations
  5. Recognize revenue when (or as) obligation is satisfied

- **Point in Time vs. Over Time:**
  - Point in time: Retail sale, customer takes possession
  - Over time: Construction, SaaS subscriptions, consulting
  - Tesla example: Vehicle sale (point in time) vs. FSD software (over time)

- **Revenue Recognition Red Flags:**
  - Channel stuffing: Forcing excess inventory on distributors
  - Bill-and-hold: Recording sale before shipment
  - Round-tripping: Circular transactions with no economic substance
  - Side letters: Undisclosed return rights
  - Percentage of completion gaming: Overstating project progress

**Cost of Goods Sold (COGS) by Business Type**
- **Manufacturing (Tesla):**
  - Direct Materials: Battery cells, steel, glass
  - Direct Labor: Factory workers assembling vehicles
  - Factory Overhead: Factory depreciation, utilities, supervision
  - Formula: Beginning WIP + Manufacturing Costs - Ending WIP = COGS

- **Retail (Costco):**
  - Formula: Beginning Inventory + Purchases - Ending Inventory = COGS
  - Gross Margin typically 10-15% (low markup, high volume)

- **SaaS (Shopify):**
  - Hosting infrastructure (AWS, GCP)
  - Customer support costs
  - Payment processing fees
  - NOT included: R&D (product development), Sales & Marketing

**Operating Expenses - The Details**
- **R&D (Research & Development):**
  - Software development: Generally expensed (unless meets criteria for capitalization)
  - Capitalization criteria: Technological feasibility established
  - Amortization: Over estimated useful life (typically 3-5 years)
  - Red flag: Sudden capitalization increase (inflating earnings?)

- **SG&A Breakdown:**
  - Sales: Sales team salaries, commissions
  - Marketing: Advertising, demand generation, brand building
  - General: Corporate overhead, legal, HR, facilities
  - Administrative: Executive compensation, audit fees, insurance

- **Depreciation & Amortization:**
  - Depreciation: Tangible assets (PP&E)
  - Amortization: Intangible assets (software, patents, customer lists)
  - Methods: Straight-line, accelerated (DDB, sum-of-years)
  - **Key insight:** Non-cash expense, add back in Cash Flow Statement

- **Stock-Based Compensation (SBC):**
  - Expense recognized over vesting period
  - Non-cash, but real economic cost (dilution)
  - Options: Black-Scholes model for valuation
  - RSUs: Fair value at grant date
  - Performance shares: Probability-weighted
  - **Controversy:** Should SBC be added back to EBITDA? (No! It's real compensation)

**Non-Operating Items**
- Interest Income: Cash in bank, short-term investments
- Interest Expense: Cost of debt (bonds, loans)
- Investment Gains/Losses: Sale of marketable securities
- Other Income/Expense: FX gains/losses, asset impairments
- Discontinued Operations: Below the line, net of tax
- Extraordinary Items: Rare events (no longer reported separately under GAAP)

**Manim Animation:** `Cash_Flow_Indirect_Method` (8 min) — CF from operations buildup waterfall

**Interactive Exercise 1.1:** Reconstruct Adjusted EBITDA
- Given: Uber's GAAP Financial Statements
- Task: Calculate Adjusted EBITDA (Uber's key metric)
- Starting point: GAAP Net Loss
- Add back: D&A, Interest, Taxes, Stock Comp, Restructuring, Legal Settlements
- Compare to Uber's reported Adjusted EBITDA
- Memo: Do you agree with Uber's adjustments? Are they aggressive?

#### 1.2 Balance Sheet Architecture (2 hours)

**The Accounting Equation (Always True!)**
```
Assets = Liabilities + Shareholders' Equity
```
- If this doesn't balance, you have an error
- Every transaction affects at least 2 accounts (double-entry bookkeeping)
- Example: Borrow $100 → +$100 Cash (Asset), +$100 Debt (Liability)

**Current Assets (Liquidity within 12 months)**

**1. Cash & Cash Equivalents**
- Cash: Literal cash in bank accounts
- Cash Equivalents: T-bills, commercial paper, money market funds
- Maturity < 90 days
- Restricted Cash: Cash held for specific purpose (escrow, collateral)
  - Should be excluded from "available cash" analysis

**2. Marketable Securities**
- Short-term investments (stocks, bonds, mutual funds)
- Classified as:
  - Trading Securities: Marked-to-market through P&L
  - Available-for-Sale: Marked-to-market through OCI (equity)
  - Held-to-Maturity: Carried at amortized cost
- Apple example: $100B+ in marketable securities (cash hoard)

**3. Accounts Receivable**
- Money owed by customers for credit sales
- Net of Allowance for Doubtful Accounts (bad debt reserve)
- DSO (Days Sales Outstanding) = AR / (Revenue / 365)
  - Measures collection efficiency
  - Industry varies: B2B (45-60 days), Retail (near zero)
- Factoring: Selling AR to factor for immediate cash (at discount)

**4. Inventory**
- Raw Materials: Tesla's battery cells awaiting assembly
- Work-in-Process (WIP): Partially assembled vehicles
- Finished Goods: Completed vehicles awaiting delivery
- Valuation methods: FIFO, LIFO, Weighted Average
- Lower of Cost or Market (LCM) rule
- Obsolescence reserve: For slow-moving/outdated inventory

**5. Prepaid Expenses**
- Insurance paid in advance
- Rent paid upfront
- Software licenses (annual subscription paid Q1)
- Amortized over benefit period

**Non-Current Assets**

**6. Property, Plant & Equipment (PP&E)**
- Land (not depreciated - infinite life)
- Buildings (depreciated over 20-40 years)
- Machinery & Equipment (5-15 years)
- Vehicles (5 years)
- Computers (3 years)
- Gross PP&E - Accumulated Depreciation = Net PP&E
- CapEx = Change in Gross PP&E + Depreciation Expense
- Asset lives: Conservative (shorter) vs. Aggressive (longer)

**7. Goodwill & Intangible Assets**
- Goodwill: Purchase price - Fair value of net assets acquired
  - Not amortized (since 2001)
  - Tested annually for impairment
  - Write-down if fair value < carrying value
- Intangibles:
  - Patents: Legal protection for inventions (20 years)
  - Trademarks: Brand names (indefinite if renewed)
  - Customer Lists: Relationships acquired in M&A
  - Software: Developed or acquired technology
  - Amortized over useful life

**8. Long-term Investments**
- Equity Method: 20-50% ownership
  - Share of investee's earnings on P&L
  - Dividend received reduces investment balance
- Consolidation: >50% ownership (control)
  - Combine 100% of subsidiary's financials
  - Eliminate intercompany transactions

**9. Deferred Tax Assets**
- Future tax benefits from:
  - Net Operating Losses (NOL carryforwards)
  - Tax credits (R&D credits)
  - Temporary differences (accruals deductible later)
- Valuation allowance: If more-likely-than-not won't realize benefit

**Current Liabilities (Due within 12 months)**

**10. Accounts Payable**
- Money owed to suppliers for credit purchases
- DPO (Days Payable Outstanding) = AP / (COGS / 365)
- Longer DPO = better cash management (but strain on suppliers)
- Amazon/Costco: Negative cash conversion cycle (suppliers finance inventory)

**11. Accrued Expenses**
- Wages payable: Earned but not yet paid
- Taxes payable: Income tax owed to IRS
- Interest payable: Accrued interest on debt
- Utilities payable: Electricity, water bills

**12. Deferred Revenue (Unearned Revenue)**
- Cash received before service is provided
- LIABILIY! (owe customer service)
- SaaS: Annual subscriptions paid upfront
- Airlines: Ticket sales for future flights
- Gift cards: Liability until redeemed
- Recognized as revenue when performance obligation satisfied

**13. Current Portion of Long-term Debt**
- Debt maturities due within next 12 months
- Reclassified from long-term to current
- Must have cash/refinancing plan to repay

**Non-Current Liabilities**

**14. Long-term Debt**
- Bonds: Publicly traded debt securities
- Term Loans: Bank debt with amortization schedule
- Revolving Credit Facility: Line of credit (like corporate credit card)
- Convertible Debt: Can convert to equity
- Carried at amortized cost (not market value)
- Footnotes disclose: Interest rates, maturities, covenants

**15. Lease Liabilities (ASC 842 - 2019 standard)**
- Operating Leases: Rent (now on Balance Sheet!)
- Finance Leases: Essentially purchasing asset
- Present value of future lease payments
- Lease Expense: Interest + Amortization (finance) or Straight-line (operating)

**16. Pension Liabilities**
- Defined Benefit Plans: Company promises specific retirement benefit
- Funded Status = Plan Assets - Projected Benefit Obligation (PBO)
- Underfunded = Liability on Balance Sheet
- Pension Expense: Service Cost + Interest Cost - Expected Return on Assets
- Many companies frozen pensions (too expensive)

**17. Deferred Tax Liabilities**
- Future tax obligations from:
  - Accelerated depreciation for tax (slower for books)
  - Installment sales (taxed when cash received)
- Will reverse when temporary differences unwind

**Shareholders' Equity**

**18. Common Stock**
- Par Value × Shares Outstanding
- Par value is arbitrary (often $0.01 or $0.001)
- Legal capital (can't pay dividends from this)

**19. Additional Paid-In Capital (APIC)**
- Proceeds from stock issuance above par value
- IPO: Company sells shares at $20, par $0.01 → $19.99 goes to APIC
- Treasury Stock method: Buybacks reduce APIC

**20. Retained Earnings**
- Cumulative Net Income - Cumulative Dividends
- Builds over time as company is profitable
- Can be negative (accumulated losses)

**21. Treasury Stock (Contra-Equity)**
- Shares repurchased by company
- Reduces total equity
- Cost method: Recorded at purchase price
- Retired or held for employee stock plans

**22. Accumulated Other Comprehensive Income (AOCI)**
- FX translation adjustments: Foreign subsidiary results
- Unrealized gains/losses on AFS securities
- Pension adjustments: Actuarial gains/losses
- Cash flow hedge adjustments

**Interactive Tool:** Balance Sheet Builder
- Drag-and-drop transactions to correct accounts
- See live updates to accounting equation
- Goal: Keep Assets = Liabilities + Equity at all times

**Activity 1.2:** Tesla Balance Sheet Deep Dive
- Download Tesla's latest 10-K
- Map every line item to categories above
- Calculate key ratios:
  - Current Ratio = Current Assets / Current Liabilities
  - Quick Ratio = (Cash + AR) / Current Liabilities
  - Debt-to-Equity = Total Debt / Total Equity
- Excel deliverable with annotations

#### 1.3 Cash Flow Statement Mechanics (2-3 hours)

**The Indirect Method** (Start with Net Income)

**Operating Activities (CFO)**
```
Net Income
+ Depreciation & Amortization (non-cash)
+ Stock-Based Compensation (non-cash)
+ Deferred Taxes (timing differences)
+/- Changes in Working Capital:
    - Increase in AR (use of cash - gave credit)
    + Decrease in AR (source of cash - collected)
    - Increase in Inventory (use of cash - bought inventory)
    + Decrease in Inventory (source of cash - sold inventory)
    + Increase in AP (source of cash - delayed payment)
    - Decrease in AP (use of cash - paid suppliers)
    + Increase in Deferred Revenue (source - collected cash upfront)
    - Decrease in Deferred Revenue (use - delivered service)
= Cash Flow from Operations (CFO)
```

**The Golden Rules:**
1. Add back non-cash expenses (D&A, Stock Comp)
2. Reverse non-cash gains/losses on investing activities
3. Working Capital changes: Increase in asset = use of cash
4. Working Capital changes: Increase in liability = source of cash

**Investing Activities (CFI)**
```
- Capital Expenditures (CapEx for PP&E)
- Acquisitions (buy businesses)
+ Asset Sales (sell PP&E or businesses)
- Purchases of Investments (marketable securities)
+ Sales of Investments (liquidate securities)
= Cash Flow from Investing (CFI)
```

**Financing Activities (CFF)**
```
+ Debt Issuance (borrow money)
- Debt Repayment (pay back principal)
+ Equity Issuance (IPO, secondary offering)
- Share Buybacks (return cash to shareholders)
- Dividends Paid (return cash to shareholders)
= Cash Flow from Financing (CFF)
```

**The Cash Flow Identity:**
```
CFO + CFI + CFF = Change in Cash
Change in Cash = Ending Cash - Beginning Cash (from Balance Sheet)
```

**Interactive Animation: Transaction Flow Through 3 Statements**

**Day 1: Make $100 Sale on Credit**
- Income Statement: +$100 Revenue, +$100 Net Income
- Balance Sheet: +$100 Accounts Receivable
- Cash Flow Statement: -$100 Working Capital (AR increase)
- Net effect on Cash: $0 (no cash collected yet!)

**Day 30: Collect $100 Cash from Customer**
- Income Statement: No impact (revenue already recognized)
- Balance Sheet: -$100 Accounts Receivable, +$100 Cash
- Cash Flow Statement: +$100 Working Capital (AR decrease)
- Net effect on Cash: +$100

**This is WHY Cash Flow ≠ Net Income!**
- Accrual accounting recognizes revenue when earned, not when cash received
- Growing companies often have negative cash flow despite profits (building WC)

**Activity 1.3:** Build 3-Statement Model from Transactions
- Given 20 business transactions
- Update Income Statement, Balance Sheet, Cash Flow Statement
- Check: Does BS balance? Does CF tie to BS cash?
- Excel template with formulas
- AI Coach available for hints

#### 1.4 Statement Linkages & Integrity (1-2 hours)

**The 3-Statement Integration**

**Step 1: Income Statement → Retained Earnings**
```
Beginning Retained Earnings
+ Net Income (from Income Statement)
- Dividends Paid
= Ending Retained Earnings (to Balance Sheet)
```

**Step 2: Income Statement → Cash Flow Statement**
```
Cash Flow from Operations starts with Net Income
Then adjusts for non-cash items and Working Capital
```

**Step 3: Cash Flow Statement → Balance Sheet**
```
Beginning Cash (from prior period Balance Sheet)
+ Cash Flow from Operations
+ Cash Flow from Investing
+ Cash Flow from Financing
= Ending Cash (to Balance Sheet)
```

**Step 4: Balance Sheet Checks**
```
Assets = Liabilities + Equity (must always balance!)
PP&E movement ties to CapEx and Depreciation
Debt movement ties to Debt Issuance and Repayment
```

**Common Errors and Debugging**

**Error 1: Balance Sheet Doesn't Balance**
- Check: Are there hardcoded values instead of formulas?
- Check: Did you forget to link Net Income to Retained Earnings?
- Check: Did you double-count a transaction?

**Error 2: Cash Flow Doesn't Tie to Balance Sheet Cash**
- Check: Did you calculate Working Capital changes correctly?
- Check: Sign conventions (increases in assets are uses of cash)
- Check: Did you include all CF categories (CFO, CFI, CFF)?

**Error 3: PP&E Rollforward Doesn't Work**
```
Beginning PP&E (Gross)
+ CapEx
- Asset Sales/Disposals
= Ending PP&E (Gross)

Accumulated Depreciation:
Beginning Accumulated Depreciation
+ Depreciation Expense
- Depreciation on Disposed Assets
= Ending Accumulated Depreciation

Net PP&E = Gross PP&E - Accumulated Depreciation
```

**Activity 1.4:** Debug the Broken Model
- Provided Excel has 5 intentional errors:
  1. Hardcoded value breaking BS balance
  2. Working Capital sign error
  3. Missing link from NI to RE
  4. CapEx not flowing through to BS
  5. Circular reference with no iteration
- Find and fix all 5 errors
- Document fixes in memo
- Time limit: 60 minutes

**Deliverables - Unit 1:**
- Uber Adjusted EBITDA Reconciliation (Excel + 1-page critique)
- Tesla Balance Sheet Analysis (Excel with ratio calculations)
- 3-Statement Model from Transactions (Excel, must balance perfectly)
- Debugging Exercise (Excel + documentation of all fixes)

---

### Unit 2: Working Capital & Cash Conversion (6-8 hours)

_(Continuing with same depth for remaining units...)_

**Note:** This document contains 20+ hours of super in-depth accounting content. The full expansion is too large for a single response. Should I:
1. Continue expanding Units 2-3 of Accounting I?
2. Move to Accounting II (Intermediate)?
3. Jump to Finance & Valuation?
4. Create summary integration document?

