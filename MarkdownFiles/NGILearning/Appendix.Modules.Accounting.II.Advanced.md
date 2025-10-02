# Appendix — Accounting II: Advanced Topics (SUPER IN-DEPTH EXPANSION)
**Last Updated:** October 2, 2025  
**Duration:** 40-50 hours total  
**Target:** Banker-grade financial statement expertise

## 0) Overview

This document provides SUPER IN-DEPTH coverage of advanced accounting topics essential for NGI Capital Advisory analyst work. These topics complement the core Accounting.Detailed.md content.

**Topics Covered:**
1. PP&E Deep Dive (8-10 hours)
2. Lease Accounting ASC 842 (6-8 hours)
3. Stock-Based Compensation (6-8 hours)
4. Deferred Taxes (6-8 hours)
5. M&A Accounting (8-10 hours)

---

## Unit 2.1: Property, Plant & Equipment (PP&E) Deep Dive

**Duration:** 8-10 hours  
**Animation:** `PPE_Depreciation_Methods` (7 min)  
**Textbook:** Kieso Intermediate Accounting Ch. 10-11

**Learning Objectives:**
- Master PP&E acquisition, depreciation, and disposal accounting
- Compare straight-line vs. accelerated depreciation methods
- Analyze CapEx intensity and asset efficiency metrics
- Build complete PP&E schedule in Excel

### A. PP&E Capitalization vs. Expense Decision

**Capitalize when:**
- Future economic benefit > 1 year
- Asset improves property beyond original condition
- Meets materiality threshold ($5K-$10K typically)
- Extends useful life or increases capacity

**Examples - CAPITALIZE:**
- New factory building ($50M)
- Major equipment overhaul ($500K)
- Software development ($2M)
- Land improvements ($300K)

**Examples - EXPENSE:**
- Routine maintenance ($20K)
- Small tools ($500)
- Office supplies
- Repairs that maintain (not improve) condition

**Gray Areas:**
- Website development: Capitalize if e-commerce platform, expense if informational
- Software: Capitalize if >1 year useful life, expense if annual subscription

### B. Depreciation Methods (Comprehensive)

**1. Straight-Line Method:**
```
Annual Depreciation = (Cost - Salvage Value) / Useful Life
```

**Tesla Gigafactory Equipment Example:**
- Cost: $100M
- Salvage Value: $10M
- Useful Life: 10 years
- Annual Depreciation: ($100M - $10M) / 10 = $9M/year

**Advantages:** Simple, predictable, matches revenue for steady usage  
**Disadvantages:** Doesn't match declining productivity of aging assets

**2. Double-Declining Balance (DDB):**
```
DDB Rate = 2 × (1 / Useful Life)
Annual Depreciation = Book Value × DDB Rate
```

**Tesla Equipment (DDB):**
- Year 1: $100M × (2/10) = $20M
- Year 2: ($100M - $20M) × 20% = $16M
- Year 3: ($80M - $16M) × 20% = $12.8M
- Year 4: ($64M - $12.8M) × 20% = $10.24M
- ...
- Switch to straight-line when SL > DDB

**Advantages:** Tax deferral, matches higher productivity early in life  
**Disadvantages:** Complex, lower income early years

**3. Units of Production:**
```
Depreciation per Unit = (Cost - Salvage) / Total Units Expected
Annual Depreciation = Units Produced × Depreciation per Unit
```

**Costco Distribution Center Conveyor:**
- Cost: $5M, Salvage: $500K, Expected packages: 10M
- Depreciation per package: ($5M - $500K) / 10M = $0.45/package
- Year 1 (800K packages): $0.45 × 800K = $360K
- Year 2 (1.2M packages): $0.45 × 1.2M = $540K

**Advantages:** Matches usage, fair for variable production  
**Disadvantages:** Requires accurate production estimates

**4. MACRS (Tax Depreciation):**
- Modified Accelerated Cost Recovery System
- Used for tax returns only (not GAAP)
- Creates temporary differences → Deferred taxes

5-year MACRS rates: 20%, 32%, 19.2%, 11.52%, 11.52%, 5.76%

### C. PP&E Schedule Build (Excel)

**Complete Schedule Template:**

```
PP&E ROLLFORWARD SCHEDULE (FY2024-FY2029)

GROSS PP&E:
                    Land    Building  Machinery  Vehicles  Total
FY2024 Beginning    $50M    $200M     $500M      $30M      $780M
+ Capital Expend    $10M    $20M      $80M       $5M       $115M
- Disposals         $0      ($10M)    ($50M)     ($3M)     ($63M)
+ Acquisitions (M&A)$5M     $30M      $0         $0        $35M
FY2024 Ending       $65M    $240M     $530M      $32M      $867M

FY2025 Beginning    $65M    $240M     $530M      $32M      $867M
...

ACCUMULATED DEPRECIATION:
FY2024 Beginning    $0      $80M      $250M      $18M      $348M
+ Depreciation      $0      $10M      $50M       $5M       $65M
- Disposal (AD)     $0      ($8M)     ($40M)     ($2M)     ($50M)
FY2024 Ending       $0      $82M      $260M      $21M      $363M

NET PP&E:
FY2024 Ending       $65M    $158M     $270M      $11M      $504M

DEPRECIATION EXPENSE BY METHOD:
Straight-Line                                               $65M
DDB (if used)                                              $85M
Units of Production                                        $58M
```

**Key Metrics:**
- CapEx / Revenue: 5.2% (vs. industry avg 4.5%)
- CapEx / Depreciation: 1.77x (Growth capex)
- PP&E Turnover: Revenue / Avg Net PP&E = 4.4x
- Avg Asset Age: Acc. Depr / Gross PP&E = 41.9% (mid-life)

### D. Asset Impairment (GAAP Two-Step Test)

**Step 1: Recoverability Test**
- Sum undiscounted future cash flows from asset
- Compare to carrying value
- If CF < Carrying value → Asset is impaired

**Step 2: Measurement**
- Impairment Loss = Carrying Value - Fair Value
- Fair Value: Market price, appraisal, or DCF

**Example: GE Power Segment (2018)**
- Carrying Value: $50B
- Undiscounted CF (10-year): $42B
- Test: $42B < $50B → IMPAIRED
- Fair Value (DCF): $35B
- Impairment Loss: $50B - $35B = $15B write-down

**Journal Entry:**
```
Dr. Impairment Loss (P&L)          $15B
  Cr. Accumulated Impairment             $15B
```

**Cannot reverse impairment under US GAAP!** (IFRS allows reversal)

### E. CapEx Analysis & Forecasting

**Maintenance CapEx:**
- Sustains existing operations
- Roughly equals depreciation expense
- Formula: Maintenance CapEx ≈ D&A

**Growth CapEx:**
- Expands capacity, new facilities
- Above maintenance level
- Formula: Growth CapEx = Total CapEx - Maintenance CapEx

**CapEx Intensity by Industry:**
- Software/Tech: 2-3% of revenue
- E-commerce: 3-5%
- Manufacturing: 5-8%
- Airlines: 8-12%
- Utilities: 10-15%

**Excel Deliverable:**
- Build 5-year PP&E schedule for assigned company
- Calculate depreciation using 3 methods
- Perform impairment test (hypothetical scenario)
- Analyze CapEx intensity vs. peer benchmark

---

## Unit 2.2: Lease Accounting (ASC 842) Deep Dive

**Duration:** 6-8 hours  
**Animation:** `Lease_Accounting_ASC842` (8 min)  
**Textbook:** Kieso Ch. 21

**Learning Objectives:**
- Distinguish operating vs. finance leases post-ASC 842
- Calculate present value of lease payments
- Build lease amortization schedules
- Analyze off-balance-sheet financing impact

### A. ASC 842 Revolution (2019)

**Old Standard (ASC 840):**
- Operating leases: Off-balance-sheet (footnote only)
- Finance leases (capital): On-balance-sheet

**New Standard (ASC 842):**
- ALL leases >12 months: On-balance-sheet
- Lessee recognizes ROU Asset and Lease Liability

**Why the Change?**
- $3 TRILLION off-balance-sheet leases pre-2019
- Airlines, retail heavily affected
- Debt ratios understated

### B. Lease Classification Criteria

**Finance Lease (meets 1 of 5):**
1. **Ownership transfer** at end of lease
2. **Bargain purchase option** (likely to exercise)
3. **Lease term ≥75%** of economic life
4. **PV of payments ≥90%** of fair market value
5. **Specialized asset** (no alternative use to lessor)

**Operating Lease:** All other leases

### C. Lessee Accounting (Detailed)

**Day 1 Recognition (Both Types):**

```
Dr. Right-of-Use (ROU) Asset        $PV
  Cr. Lease Liability                    $PV
```

PV = Present Value of lease payments @ incremental borrowing rate

**Subsequent Measurement:**

**Finance Lease:**
- ROU Asset: Depreciate straight-line over lesser of (lease term, useful life)
- Lease Liability: Amortize using effective interest method
- **P&L Impact:** Depreciation + Interest (front-loaded expense)

**Operating Lease:**
- Single lease expense (straight-line over lease term)
- Reduce ROU Asset and Lease Liability to achieve straight-line expense
- **P&L Impact:** Level expense over lease term

### D. Example: Uber HQ Lease (Operating)

**Lease Terms:**
- 10-year lease for San Francisco office
- Annual payment: $10M (paid end of year)
- Incremental borrowing rate: 6%
- PV of $10M annuity @ 6% for 10 years: $73.6M

**Day 1 Entry:**
```
Dr. ROU Asset                       $73.6M
  Cr. Lease Liability                      $73.6M
```

**Year 1 Amortization Table:**
| Year | Begin Balance | Payment | Interest @ 6% | Principal | End Balance |
|------|--------------|---------|---------------|-----------|-------------|
| 1    | $73.6M       | $10M    | $4.4M         | $5.6M     | $68.0M      |
| 2    | $68.0M       | $10M    | $4.1M         | $5.9M     | $62.1M      |
| 3    | $62.1M       | $10M    | $3.7M         | $6.3M     | $55.8M      |

**Year 1 Journal Entries (Operating):**
```
Dr. Lease Expense (P&L)             $7.36M
  Cr. ROU Asset                            $2.96M
  Cr. Lease Liability                      $4.4M
```

**Year 1 Payment:**
```
Dr. Lease Liability                 $10M
  Cr. Cash                                 $10M
```

**Net Effect:**
- P&L: $7.36M lease expense (straight-line: $73.6M / 10 years)
- Balance Sheet: ROU Asset = $70.6M, Liability = $68.0M

### E. Finance Lease Example: Equipment Lease

**Terms:**
- 5-year lease, $100K/year
- Bargain purchase option: $10K at end (FMV = $150K)
- Incremental rate: 8%
- PV: $100K annuity + $10K balloon @ 8% = $405K

**Classification:** Finance (bargain purchase option)

**Year 1:**
- Depreciation: $405K / 5 years = $81K
- Interest: $405K × 8% = $32.4K
- Total Expense: $81K + $32.4K = $113.4K (front-loaded!)

### F. Impact on Financial Ratios

**Pre-ASC 842:**
- Rent expense: $10M (operating)
- No assets or liabilities

**Post-ASC 842:**
- Lease expense: $7.36M (operating)
- Assets: +$73.6M
- Liabilities: +$73.6M

**Ratio Impacts:**
- **Debt/Equity:** Increases (higher liabilities)
- **EBITDA:** Increases (rent no longer opex)
- **EBIT:** Same (lease expense replaces rent)
- **ROA:** Decreases (higher asset base, same income)
- **Interest Coverage:** Decreases (interest component in lease expense)

**Excel Deliverable:**
- Build 10-year lease amortization schedule
- Compare operating vs. finance lease accounting
- Analyze ASC 842 impact on leverage ratios for assigned company

---

## Unit 2.3: Stock-Based Compensation (SBC) Deep Dive

**Duration:** 6-8 hours  
**Animation:** `Stock_Based_Comp_Expense` (7 min)  
**Textbook:** Kieso Ch. 16

**Learning Objectives:**
- Value stock options using Black-Scholes
- Calculate diluted share count (treasury stock method)
- Analyze SBC impact on earnings quality
- Build SBC expense schedule in Excel

### A. Types of Equity Compensation

**1. Stock Options (ISOs & NQOs):**
- Right to purchase stock at exercise (strike) price
- Vesting: Typically 4 years, 25% per year (cliff or monthly)
- Expiration: 10 years from grant
- Only valuable if stock price > strike price

**Example:** Tesla grants option with $200 strike
- If stock = $300: In-the-money by $100/share
- If stock = $150: Out-of-the-money (worthless)

**2. Restricted Stock Units (RSUs):**
- Promise to deliver stock after vesting
- No strike price (always have value if stock > $0)
- Taxed as ordinary income when vested
- Company withholds shares for taxes (e.g., vest 100 RSUs, receive 70 after taxes)

**3. Performance Stock Units (PSUs):**
- RSUs with performance conditions
- Vesting depends on metrics: Revenue growth, EPS targets, TSR vs. peers
- If performance not met, PSUs forfeit

**4. Employee Stock Purchase Plans (ESPPs):**
- Right to buy stock at discount (typically 15%)
- Contributes via payroll deduction
- Purchase at lower of: (1) Start price or (2) End price

### B. Black-Scholes Option Valuation Model

**Formula:**
```
C = S × N(d1) - K × e^(-rT) × N(d2)

Where:
d1 = [ln(S/K) + (r + σ²/2)T] / (σ√T)
d2 = d1 - σ√T

S = Current stock price
K = Strike price
r = Risk-free rate
T = Time to expiration (years)
σ = Volatility (annualized std dev)
N(d) = Cumulative standard normal distribution
```

**Inputs Explained:**
- **Volatility (σ):** Historical volatility or implied volatility from traded options
- **Risk-free rate (r):** 10-year Treasury yield
- **Time to expiration (T):** Years until options expire (max 10)

**Tesla Example:**
- Stock price (S): $250
- Strike price (K): $200
- Volatility (σ): 60% (high for growth stock)
- Risk-free rate (r): 4.5%
- Time to expiration (T): 10 years

**Calculation:**
```
d1 = [ln(250/200) + (0.045 + 0.60²/2)×10] / (0.60×√10) = 2.15
d2 = 2.15 - 0.60×√10 = 0.25

N(d1) = 0.984
N(d2) = 0.599

C = 250 × 0.984 - 200 × e^(-0.045×10) × 0.599
C = 246 - 200 × 0.638 × 0.599
C = 246 - 76.4 = $169.60/option
```

**Fair Value at Grant: ~$170/option**

### C. Accounting for Stock-Based Compensation

**Grant Date (Day 1):**
- Measure fair value (Black-Scholes for options, stock price for RSUs)
- Total Compensation = # Grants × Fair Value
- Expense over vesting period (straight-line)

**Tesla Grants 1M Options:**
- Fair value: $170/option
- Total comp: 1M × $170 = $170M
- Vesting: 4 years
- Annual expense: $170M / 4 = $42.5M/year

**Journal Entry (Year 1):**
```
Dr. Stock Compensation Expense      $42.5M
  Cr. Additional Paid-in Capital           $42.5M
```

**NON-CASH EXPENSE!** (No cash outflow until exercise)

**Exercise Date:**
- Employee pays strike price
- Company issues shares
- Cash received = Strike price × # Shares

**Journal Entry:**
```
Dr. Cash (strike price)             $200M
Dr. APIC (from grant entries)       $170M
  Cr. Common Stock (par value)             $1M
  Cr. APIC (excess)                        $369M
```

### D. Diluted Share Count (Treasury Stock Method)

**Basic Shares:** 1,000M shares outstanding

**In-the-Money Options:**
- 100M options outstanding
- Strike price: $50
- Current stock price: $100

**Treasury Stock Method:**
1. Assume all options exercised: +100M shares
2. Cash proceeds: 100M × $50 = $5B
3. Shares repurchased @ current price: $5B / $100 = 50M shares
4. Net dilution: 100M - 50M = 50M shares

**Diluted Shares: 1,000M + 50M = 1,050M shares**

**Why TSM?**
- Assumes company uses option proceeds to buy back stock
- Measures dilution net of cash proceeds
- Only in-the-money options dilute

### E. SBC Impact on Earnings Quality

**Case Study: Tesla FY2024**
- Revenue: $96.8B
- GAAP Net Income: $15.0B
- GAAP EPS: $5.00
- SBC Expense: $2.0B (2.1% of revenue)

**"Adjusted" Metrics (Non-GAAP):**
- Adjusted Net Income: $15.0B + $2.0B = $17.0B
- Adjusted EPS: $17.0B / 1,050M = $16.19

**Is this fair?**
- **Bears say:** SBC is REAL economic cost (dilutes shareholders)
- **Bulls say:** Non-cash expense, doesn't affect cash flow
- **Consensus:** Add back to EBITDA, but NOT to Net Income

**Peer Benchmarking:**
- Tesla SBC: 2.1% of revenue
- Rivian: 3.5% (higher due to competitive labor market)
- GM: 0.5% (legacy automaker, less equity comp)

### F. SBC Schedule Build (Excel)

**Multi-Year SBC Forecast:**

```
SBC EXPENSE SCHEDULE (FY2024-FY2029)

Grant Assumptions:
                       FY2024   FY2025   FY2026   FY2027   FY2028
# Options Granted      10M      12M      15M      18M      20M
Stock Price (grant)    $250     $270     $290     $310     $330
Strike Price           $250     $270     $290     $310     $330
Fair Value/Option      $170     $185     $200     $215     $230
Total Grant Value      $1.7B    $2.2B    $3.0B    $3.9B    $4.6B

Vesting Schedule (4-year vest, 25% per year):

FY2024 Grant:
  Year 1 (FY2024)      $425M
  Year 2 (FY2025)      $425M
  Year 3 (FY2026)      $425M
  Year 4 (FY2027)      $425M

FY2025 Grant:
  Year 1 (FY2025)               $550M
  Year 2 (FY2026)               $550M
  Year 3 (FY2027)               $550M
  Year 4 (FY2028)               $550M

... (continue for all grants)

Total SBC Expense:
FY2024:                $425M
FY2025:                $975M    ($425M + $550M)
FY2026:                $1.65B   ($425M + $550M + $750M)
FY2027:                $2.60B   ($425M + $550M + $750M + $975M)
...

SBC as % of Revenue:
FY2024:                0.4%
FY2025:                0.9%
FY2026:                1.4%
FY2027:                2.1%
```

**Excel Deliverable:**
- Build 5-year SBC expense schedule
- Calculate diluted share count using TSM
- Compare SBC % of revenue to peer benchmarks
- Analyze SBC trend (increasing/decreasing)

---

## Unit 2.4: Deferred Taxes Deep Dive

**Duration:** 6-8 hours  
**Animation:** `Deferred_Tax_Reconciliation` (8 min)  
**Textbook:** Kieso Ch. 19

**Learning Objectives:**
- Distinguish permanent vs. temporary differences
- Calculate deferred tax assets and liabilities
- Analyze NOL carryforwards and valuation allowances
- Build deferred tax schedule in Excel

### A. Book vs. Tax Income Differences

**Permanent Differences (NEVER reverse):**

Examples:
1. **Municipal bond interest:** Tax-free, but recorded on books
   - Book income: +$1M
   - Tax income: $0
   - Effect: Lower effective tax rate

2. **Fines & penalties:** Not tax deductible
   - Book expense: $500K
   - Tax deduction: $0
   - Effect: Higher effective tax rate

3. **Meals & entertainment:** 50% deductible
   - Book expense: $100K
   - Tax deduction: $50K
   - Permanent difference: $50K

**Impact:** Effective Tax Rate ≠ Statutory Tax Rate

**Temporary Differences (WILL reverse):**

Examples:
1. **Depreciation:**
   - Book (Straight-line): $1M/year
   - Tax (MACRS): $2M/year (Year 1)
   - Temporary difference: $1M (reverses in future)
   - Creates: Deferred Tax Liability

2. **Warranty reserves:**
   - Book (accrued when sold): $500K
   - Tax (deductible when paid): $0 (Year 1), $500K (Year 2)
   - Temporary difference: $500K
   - Creates: Deferred Tax Asset

**Impact:** Deferred Tax Assets/Liabilities on Balance Sheet

### B. Deferred Tax Assets (DTA)

**Arise when:** Tax income > Book income (pay taxes now, benefit later)

**Common Sources:**
1. **Warranty Reserves**
2. **Bad Debt Reserves** (allowance method)
3. **Deferred Revenue** (cash basis for tax, accrual for book)
4. **Net Operating Losses (NOL)**
5. **Tax Credit Carryforwards** (R&D credits)

**Example: Warranty Reserve**

Year 1:
- Accrue warranty expense (book): $1M
- Tax deduction: $0 (not deductible until paid)
- Temporary difference: $1M
- DTA: $1M × 25% = $250K

Year 2:
- Pay warranty claims: $1M
- Tax deduction: $1M
- DTA reverses: $250K

**Journal Entries:**

Year 1:
```
Dr. Tax Expense                     $1.75M
Dr. Deferred Tax Asset              $250K
  Cr. Taxes Payable                        $2M
```

Year 2:
```
Dr. Tax Expense                     $1.75M
  Cr. Deferred Tax Asset                   $250K
  Cr. Taxes Payable                        $1.5M
```

### C. Net Operating Losses (NOL)

**Tax Loss Carryforwards:**

Pre-TCJA (Tax Cuts & Jobs Act):
- 20-year carryforward
- Could carry back 2 years

Post-TCJA (2018+):
- **Indefinite** carryforward
- **No** carryback (except 2020-2021 CARES Act)
- Limited to 80% of taxable income per year

**Example: Uber Losses**

Year 1: Net loss of $1B (tax loss)
- DTA: $1B × 25% = $250M
- Carry forward indefinitely

Year 2: Taxable income of $500M
- NOL utilization: $500M × 80% = $400M (max offset)
- Taxes paid: ($500M - $400M) × 25% = $25M
- Remaining NOL: $1B - $400M = $600M
- DTA: $600M × 25% = $150M

**Journal Entry (Year 1):**
```
Dr. Deferred Tax Asset              $250M
  Cr. Income Tax Benefit                   $250M
```

### D. Valuation Allowance

**ASC 740 Requirement:**
- If "more-likely-than-not" (>50% probability) DTA won't be realized
- Record Valuation Allowance (contra-asset)

**Factors Considered:**
- History of profitability
- Future profitability projections
- Tax planning strategies
- Expiration dates of NOLs

**Example: Early-Stage Biotech**

- Cumulative losses: $500M
- DTA (NOL): $500M × 25% = $125M
- No FDA-approved drugs, unprofitable for 10 years
- Assessment: Unlikely to generate taxable income before NOL expires

**Journal Entry:**
```
Dr. Tax Expense                     $125M
  Cr. Valuation Allowance                  $125M
```

**Net DTA: $125M - $125M = $0**

**Release of Valuation Allowance:**
- When company becomes profitable
- Large one-time tax benefit (non-cash)

**Example: Tesla 2020**
- Released $500M valuation allowance (profitable for 4 quarters)
- Boosted Net Income by $500M (non-cash)

### E. Deferred Tax Liabilities (DTL)

**Arise when:** Book income > Tax income (defer taxes, pay later)

**Common Sources:**
1. **Depreciation** (accelerated tax depreciation)
2. **Installment sales** (revenue recognized upfront for book, over time for tax)
3. **Prepaid expenses** (deducted when paid for tax, expensed over time for book)

**Example: Depreciation**

Asset: $10M cost, 10-year life

Year 1:
- Book depreciation (SL): $1M
- Tax depreciation (MACRS 5-year): $2M
- Temporary difference: $1M
- DTL: $1M × 25% = $250K

**Cumulative DTL builds up in early years, reverses in later years**

Years 1-5: DTL grows (MACRS > SL)
Years 6-10: DTL reverses (MACRS < SL after Year 5)

### F. Effective Tax Rate Reconciliation

**Statutory to Effective Reconciliation:**

```
Pre-Tax Income:                            $1,000M

Tax @ Statutory Rate (21%):                $210M      21.0%

Permanent Differences:
  + Non-deductible expenses                $5M        0.5%
  - Municipal bond interest                ($3M)      (0.3%)
  + Excess meals & entertainment           $2M        0.2%

Temporary Differences (affect timing):
  (Recorded as deferred taxes, no impact on ETR)

Tax Credits:
  - R&D tax credits                        ($20M)     (2.0%)

State Taxes (net of federal benefit):
  + State taxes                            $30M       3.0%

Foreign Income:
  - Foreign income taxed at lower rate     ($25M)     (2.5%)

= Income Tax Expense                       $199M      19.9%

Effective Tax Rate:                                   19.9%
```

**Key Insight:** ETR < Statutory due to tax credits and foreign income

### G. Cash Tax Rate

**Cash Tax Rate = Cash Taxes Paid / Pre-Tax Income**

Why different from Effective Rate?
- Deferred taxes are **non-cash**
- Cash taxes = Current tax expense (exclude deferred)

**Example: Tesla FY2024**
- Pre-Tax Income: $20B
- Income Tax Expense (GAAP): $4B (20% ETR)
  - Current Tax Expense: $3B
  - Deferred Tax Expense: $1B (non-cash)
- Cash Taxes Paid: $2.5B (includes refunds)
- Cash Tax Rate: $2.5B / $20B = 12.5%

**Lower Cash Tax Rate due to:**
- NOL utilization
- Tax credits
- Accelerated depreciation (MACRS)

### H. Deferred Tax Schedule (Excel)

**Complete Schedule:**

```
DEFERRED TAX SCHEDULE (FY2024-FY2029)

Statutory Tax Rate: 25%

DEFERRED TAX ASSETS:
                              FY2024    FY2025    FY2026    FY2027
Warranty Reserves             $250K     $280K     $300K     $320K
Bad Debt Reserves             $150K     $170K     $190K     $210K
Deferred Revenue              $500K     $600K     $700K     $800K
Stock Compensation            $400K     $500K     $600K     $700K
NOL Carryforward              $25M      $20M      $15M      $10M
Tax Credit Carryforward       $5M       $4M       $3M       $2M
Total Gross DTA               $31.3M    $25.6M    $19.8M    $14.0M

Less: Valuation Allowance     ($5M)     ($4M)     ($3M)     ($2M)
Net DTA                       $26.3M    $21.6M    $16.8M    $12.0M

DEFERRED TAX LIABILITIES:
Depreciation                  $10M      $12M      $14M      $15M
Prepaid Expenses              $200K     $250K     $300K     $350K
Installment Sales             $1M       $1.5M     $2M       $2.5M
Total DTL                     $11.2M    $13.8M    $16.3M    $17.9M

NET DTA / (DTL)               $15.1M    $7.8M     $0.5M     ($5.9M)

EFFECTIVE TAX RATE RECONCILIATION:
Pre-Tax Income                $100M     $120M     $140M     $160M
Tax @ 25% Statutory           $25M      $30M      $35M      $40M
Adjustments:
  + Non-deductible            $500K     $500K     $500K     $500K
  - R&D credits               ($2M)     ($2M)     ($2M)     ($2M)
  + State taxes               $3M       $3.6M     $4.2M     $4.8M
Income Tax Expense            $26.5M    $32.1M    $37.7M    $43.3M
Effective Tax Rate            26.5%     26.8%     26.9%     27.1%
```

**Excel Deliverable:**
- Build 5-year deferred tax schedule
- Reconcile effective tax rate to statutory rate
- Analyze NOL utilization and remaining carryforward
- Assess valuation allowance reasonableness

---

## Unit 2.5: M&A Accounting (Purchase Method)

**Duration:** 8-10 hours  
**Animation:** `M&A_Purchase_Allocation` (9 min)  
**Textbook:** Kieso Ch. 12-13

**Learning Objectives:**
- Apply purchase accounting (ASC 805)
- Allocate purchase price to assets and liabilities
- Calculate goodwill and intangible assets
- Analyze accretion/dilution and synergies

### A. Purchase Method Overview (ASC 805)

**Acquirer Must:**
1. Determine purchase price (consideration transferred)
2. Identify assets acquired and liabilities assumed
3. Measure all at **fair value** (not book value!)
4. Calculate goodwill = Purchase price - Net assets

**No pooling of interests!** (Eliminated in 2001)

### B. Purchase Price Determination

**Components of Purchase Price:**
- Cash paid
+ Fair value of stock issued
+ Contingent consideration (earnouts)
+ Debt assumed
- Pre-existing relationships settled
= Total Purchase Price

**Example: Facebook acquires Instagram (2012)**

Purchase Price Components:
- Cash: $300M
- Facebook stock: $700M (76.9M shares @ $9.10/share)
- Total: $1.0B

### C. Purchase Price Allocation (PPA)

**Step 1: Tangible Assets**

Revalue at fair value:
- PP&E: Appraisal (often higher than book)
- Inventory: Net realizable value
- AR: Discounted for collectibility
- Cash: Book value (already fair value)

**Step 2: Intangible Assets**

Identify separately from goodwill:
1. **Customer Relationships:** DCF of customer lifetime value
2. **Technology/Patents:** Relief-from-royalty method
3. **Trade Names/Trademarks:** Relief-from-royalty or DCF
4. **Non-compete Agreements:** Excess earnings method
5. **Order Backlog:** Discounted future orders

Assign **useful lives** for amortization

**Step 3: Liabilities**

Revalue at fair value:
- Debt: Market value (may be above/below book)
- Contingencies: Expected value of probable losses
- Warranty liabilities: Estimated future costs

**Step 4: Goodwill (Residual)**

Goodwill = Purchase Price - Fair Value of Net Assets

**Represents:**
- Synergies
- Assembled workforce (can't separately recognize)
- Going concern value
- Future cash flows not attributable to identifiable assets

### D. Example: Microsoft acquires LinkedIn (2016)

**Purchase Price: $26.2B**

Target's Book Value:
- Total Assets: $7.0B
- Total Liabilities: $2.5B
- Book Equity: $4.5B

**Fair Value Adjustments:**

Tangible Assets:
- Cash: $3.0B (book value)
- PP&E: $1.2B → $1.5B (appraisal +$300M)
- Other: $2.8B → $3.0B (+$200M)
- Total Tangible: $7.5B

Intangible Assets (NEW):
- Member base: $7.5B (10-year amortization)
- LinkedIn brand: $3.0B (indefinite life, no amortization)
- Technology: $2.0B (5-year amortization)
- Total Intangibles: $12.5B

Liabilities:
- Debt: $1.5B → $1.6B (market value)
- Other: $1.0B → $1.2B (contingencies)
- Total Liabilities: $2.8B

**Purchase Price Allocation:**
```
Purchase Price:                        $26.2B

Fair Value of Net Assets:
  Tangible Assets                      $7.5B
  Intangible Assets                    $12.5B
  Total Assets                         $20.0B
  Less: Liabilities                    ($2.8B)
  Net Assets                           $17.2B

Goodwill (residual):                   $9.0B
```

### E. Post-Acquisition Accounting

**Amortization of Intangibles:**
- Member base: $7.5B / 10 years = $750M/year
- Technology: $2.0B / 5 years = $400M/year
- LinkedIn brand: No amortization (indefinite life)

**Total Annual Amortization: $1.15B**

**Goodwill:**
- **Not amortized** (indefinite life)
- Tested **annually** for impairment
- Impairment if fair value < carrying value

**Impairment Test (Qualitative):**
- Assess if more-likely-than-not fair value < carrying value
- If yes, perform quantitative test

**Quantitative Test:**
- Fair value of reporting unit < Carrying value?
- Impairment loss = Carrying value - Fair value
- Write down goodwill (no reversal allowed!)

**Example: AOL/Time Warner (2002)**
- Goodwill: $128B (from merger)
- Fair value declined (dot-com bust)
- Impairment: $99B write-down (largest in history!)

### F. Accretion/Dilution Analysis

**Accretive:** EPS increases post-acquisition  
**Dilutive:** EPS decreases post-acquisition

**Formula:**
```
Pro Forma EPS = (Acquirer NI + Target NI + Synergies - Amortization) / Total Shares
```

**Example: Company A acquires Company B**

Standalone Financials:
- Company A: Net Income $500M, Shares 100M, EPS = $5.00
- Company B: Net Income $100M, Shares 50M, EPS = $2.00

Deal Terms:
- Purchase price: $3.0B cash
- Synergies: $50M/year (cost savings)
- Intangible amortization: $200M/year
- Interest on debt: $150M @ 5% ($3B borrowed)
- Tax rate: 25%

**Pro Forma Income Statement:**
```
                      Company A   Company B   Synergies   Adjustments   Combined
Revenue               $10,000M    $2,000M     $0          $0            $12,000M
COGS                  ($6,000M)   ($1,200M)   $50M        $0            ($7,150M)
SG&A                  ($2,000M)   ($400M)     $0          $0            ($2,400M)
D&A                   ($500M)     ($100M)     $0          ($200M)       ($800M)
EBIT                  $1,500M     $300M       $50M        ($200M)       $1,650M

Interest              ($100M)     ($50M)      $0          ($150M)       ($300M)
Pre-Tax Income        $1,400M     $250M       $50M        ($350M)       $1,350M

Taxes @ 25%           ($350M)     ($63M)      ($13M)      $88M          ($338M)
Net Income            $1,050M     $188M       $38M        ($263M)       $1,013M

Shares Outstanding    100M                                              100M
EPS                   $5.00                                             $10.13
```

**Analysis:**
- Standalone EPS: $5.00
- Pro Forma EPS: $10.13
- Accretion: +102% (HIGHLY accretive!)

**Why so accretive?**
- Synergies ($50M after-tax)
- No share dilution (cash deal)
- Target profitable
- But: High amortization and interest partially offset

### G. Pro Forma Adjustments Checklist

**Income Statement:**
- [ ] Add target's revenue and expenses
- [ ] Remove one-time transaction costs
- [ ] Add D&A from step-up in asset values
- [ ] Add intangible amortization
- [ ] Add/subtract interest expense (if debt/cash changes)
- [ ] Adjust taxes for above changes
- [ ] Add cost synergies (if probability-weighted)
- [ ] Subtract integration costs (if recurring)

**Balance Sheet:**
- [ ] Revalue PP&E to fair value
- [ ] Record intangible assets
- [ ] Record goodwill
- [ ] Adjust debt to fair value
- [ ] Eliminate target's equity accounts
- [ ] Adjust cash for transaction costs

**Cash Flow:**
- [ ] Combine operating cash flows
- [ ] Add back non-cash amortization
- [ ] Adjust CapEx for combined company
- [ ] Include integration CapEx

### H. Excel Deliverable: M&A Pro Forma Model

**Build Complete Model:**

1. **Purchase Price Allocation Tab:**
   - List all assets and liabilities at book value
   - Apply fair value adjustments
   - Calculate goodwill (residual)

2. **Pro Forma Income Statement:**
   - Combined revenue and expenses
   - Add amortization of intangibles
   - Adjust interest expense
   - Calculate pro forma EPS

3. **Accretion/Dilution Analysis:**
   - Standalone EPS (acquirer)
   - Pro forma EPS
   - % Accretion/(Dilution)

4. **Sensitivity Analysis:**
   - Vary synergies ($0M, $50M, $100M)
   - Vary purchase price ($2.5B, $3B, $3.5B)
   - Show impact on accretion

5. **Integration Timeline:**
   - Year 1: Integration costs ($100M)
   - Year 2: 50% of synergies realized
   - Year 3: 100% of synergies realized

**Deliverable Questions:**
- Is the deal accretive or dilutive in Year 1?
- How much synergies needed to achieve 5% accretion?
- What is breakeven purchase price for EPS neutrality?
- What is goodwill as % of purchase price? (Benchmark: <50%)

---

**This completes the SUPER IN-DEPTH Accounting II curriculum. Students are now ready for banker-grade financial analysis and NGI Capital Advisory work!**

