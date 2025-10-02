# Finance Module - Unit 6: Credit Analysis & Fixed Income (Complete)
**Duration:** 12-15 hours  
**Last Updated:** October 2, 2025  
**Critical for:** Debt capital markets, leveraged finance, BDC investing at NGI Capital  
**Animations:** Manim-powered 3Blue1Brown-style visualizations (see Appendix.Manim.Animations.md)

## Unit 6: Credit Analysis & Fixed Income - Master Class

**Manim Animations:**
- `Credit_Analysis_GSBD` (8 min) - Interest coverage, leverage ratios, and default risk
- `Credit_Spread_Waterfall` (7 min) - Yield decomposition and risk premium analysis
- `Debt_Seniority_Waterfall` (6 min) - Priority in bankruptcy and recovery rates

**Learning Objectives:**
- Assess creditworthiness of corporate borrowers
- Calculate and interpret key credit ratios (leverage, coverage, liquidity)
- Understand bond pricing, yields, and credit spreads
- Analyze debt seniority and recovery in distress scenarios
- Build credit models for leveraged loans and high-yield bonds
- Deliver credit memo with rating recommendation

**Textbook Deep Dive:**
- "Credit Risk Management" by Joetta Colquitt (6th Edition)
- "The Handbook of Fixed Income Securities" by Fabozzi (9th Edition)
- "Leveraged Finance: Concepts, Methods, and Trading of High-Yield Bonds" by Stephen Antczak
- Moody's Rating Methodology: Corporate Finance
- S&P Global Ratings: Corporate Criteria
- CFA Fixed Income and Credit Analysis curriculum

---

## 6.1 Credit Analysis Framework (3-4 hours)

### The 5 C's of Credit

**1. Character (Qualitative)**
- Management quality and track record
- Corporate governance and transparency
- History of honoring obligations
- Alignment with stakeholders
- **Red Flags:** Aggressive accounting, frequent CFO turnover, lawsuits

**2. Capacity (Cash Flow Analysis)**
- Ability to generate cash flow to service debt
- Stability and predictability of earnings
- Operating leverage and margin resilience
- **Key Metrics:** EBITDA, Free Cash Flow, Interest Coverage

**3. Capital (Balance Sheet Strength)**
- Leverage ratios and debt maturity profile
- Equity cushion to absorb losses
- Asset quality and liquidation value
- **Key Metrics:** Debt/EBITDA, Debt/Equity, Net Debt

**4. Collateral (Security)**
- Assets pledged as security for debt
- Liquidation value vs. book value
- Seniority and lien priority
- **Key Consideration:** Secured vs. unsecured debt

**5. Covenants (Legal Protections)**
- Financial maintenance covenants
- Incurrence covenants
- Negative covenants (restrictions)
- **Purpose:** Protect lenders, trigger early intervention

---

## 6.2 Key Credit Ratios & Metrics (4-5 hours)

### Leverage Ratios (How Much Debt?)

**1. Total Debt / EBITDA**
```
Total Debt = Short-term Debt + Long-term Debt + Current Portion
EBITDA = Earnings Before Interest, Taxes, D&A

Example: Acme Corp
Total Debt: $500M
LTM EBITDA: $100M
Debt/EBITDA = $500M / $100M = 5.0x
```

**Interpretation:**
- **<3.0x:** Investment grade (low risk)
- **3.0-5.0x:** Leveraged (moderate risk)
- **5.0-7.0x:** Highly leveraged (high yield territory)
- **>7.0x:** Distressed levels (default risk)

**Variants:**
- **Net Debt / EBITDA:** Subtracts cash (more conservative)
  - Net Debt = Total Debt - Cash and Equivalents
  - Example: $500M debt - $50M cash = $450M / $100M = 4.5x
- **Senior Debt / EBITDA:** Only senior secured (for multi-tranche structures)
- **Secured Debt / EBITDA:** Excludes unsecured debt

**2. Debt / Equity (D/E Ratio)**
```
Debt / Equity = Total Debt / Total Equity

Example:
Total Debt: $500M
Total Equity: $300M
D/E = $500M / $300M = 1.67x (or 167%)
```

**Interpretation:**
- **<1.0x:** Conservative capitalization
- **1.0-2.0x:** Moderate leverage
- **>2.0x:** Highly levered

**3. Total Debt / Total Assets**
```
Debt / Assets = Total Debt / Total Assets

Example:
Total Debt: $500M
Total Assets: $1,000M
Debt/Assets = 50%
```

**Interpretation:**
- **<30%:** Strong balance sheet
- **30-50%:** Moderate leverage
- **>50%:** High leverage

### Coverage Ratios (Can They Pay Interest?)

**1. Interest Coverage Ratio (EBITDA / Interest)**
```
Interest Coverage = EBITDA / Interest Expense

Example:
EBITDA: $100M
Interest Expense: $40M
Coverage = $100M / $40M = 2.5x
```

**Interpretation:**
- **>4.0x:** Strong coverage (investment grade)
- **2.0-4.0x:** Adequate coverage (high yield)
- **1.5-2.0x:** Weak coverage (distressed)
- **<1.5x:** Cannot cover interest (default risk)

**Why EBITDA?**
- Represents cash earnings before interest
- Closest proxy to cash available for debt service
- Industry standard for leveraged finance

**Variants:**
- **EBIT / Interest:** More conservative (includes D&A)
- **EBITDA - CapEx / Interest:** Adjusted for maintenance CapEx
- **(EBITDA - CapEx - Taxes) / (Interest + Mandatory Principal):** Full debt service coverage

**2. Fixed Charge Coverage Ratio (FCCR)**
```
FCCR = (EBITDA - CapEx) / (Interest + Principal Payments + Leases)

Example:
EBITDA: $100M
CapEx: $15M
Interest: $40M
Principal: $10M
Lease Payments: $5M

FCCR = ($100M - $15M) / ($40M + $10M + $5M)
     = $85M / $55M = 1.55x
```

**Purpose:**
- More comprehensive than interest coverage
- Includes all fixed obligations (principal, leases)
- Used in loan covenants

**3. Debt Service Coverage Ratio (DSCR)**
```
DSCR = (EBITDA - CapEx - Taxes) / (Interest + Principal)

Example:
EBITDA - CapEx - Taxes: $60M
Interest + Principal: $50M
DSCR = $60M / $50M = 1.2x
```

**Interpretation:**
- **>1.5x:** Strong
- **1.2-1.5x:** Adequate
- **<1.2x:** Weak

### Liquidity Ratios (Can They Pay Short-Term?)

**1. Current Ratio**
```
Current Ratio = Current Assets / Current Liabilities

Example:
Current Assets: $200M
Current Liabilities: $150M
Current Ratio = $200M / $150M = 1.33x
```

**Interpretation:**
- **>2.0x:** Strong liquidity
- **1.0-2.0x:** Adequate
- **<1.0x:** Liquidity risk (cannot cover short-term obligations)

**2. Quick Ratio (Acid Test)**
```
Quick Ratio = (Current Assets - Inventory) / Current Liabilities

Example:
Current Assets: $200M
Inventory: $60M
Current Liabilities: $150M
Quick Ratio = ($200M - $60M) / $150M = 0.93x
```

**Why exclude inventory?**
- Inventory may not be quickly liquidated
- More conservative liquidity measure

**3. Cash / Total Debt**
```
Cash / Debt = Cash & Equivalents / Total Debt

Example:
Cash: $50M
Total Debt: $500M
Cash/Debt = 10%
```

**Interpretation:**
- **>20%:** Strong cash buffer
- **10-20%:** Moderate
- **<10%:** Low liquidity cushion

---

## 6.3 Credit Ratings & Rating Agencies (2-3 hours)

### Rating Agency Overview

**Big Three:**
1. **Moody's:** Aaa to C (with modifiers 1, 2, 3)
2. **S&P:** AAA to D (with + and -)
3. **Fitch:** AAA to D (with + and -)

### Rating Scale & Interpretation

**Investment Grade (Low Default Risk):**

| Moody's | S&P / Fitch | Meaning | Default Rate (10-yr) |
|---------|-------------|---------|----------------------|
| Aaa     | AAA         | Highest quality | 0.1% |
| Aa1-Aa3 | AA+, AA, AA-| High quality | 0.3% |
| A1-A3   | A+, A, A-   | Upper medium grade | 0.8% |
| Baa1-Baa3 | BBB+, BBB, BBB- | Lower medium grade | 2.0% |

**Below Investment Grade / High Yield / "Junk" (Higher Risk):**

| Moody's | S&P / Fitch | Meaning | Default Rate (10-yr) |
|---------|-------------|---------|----------------------|
| Ba1-Ba3 | BB+, BB, BB-| Non-investment grade | 6% |
| B1-B3   | B+, B, B-   | Speculative | 15% |
| Caa1-Caa3 | CCC+, CCC, CCC- | Substantial risk | 35% |
| Ca, C   | CC, C       | Very high risk | 50%+ |
| C       | D           | In default | 100% |

### Investment Grade vs. High Yield

**Investment Grade (IG):**
- **Characteristics:** Strong balance sheets, stable cash flows, low leverage
- **Typical Leverage:** 1.0-3.0x Debt/EBITDA
- **Interest Coverage:** >4.0x
- **Investors:** Pension funds, insurance companies, conservative bond funds
- **Yields:** Treasury + 50-200 bps spread

**High Yield (HY) / Leveraged Loans:**
- **Characteristics:** Leveraged balance sheets, cyclical industries, private equity-backed
- **Typical Leverage:** 4.0-6.0x Debt/EBITDA
- **Interest Coverage:** 2.0-3.0x
- **Investors:** Hedge funds, CLOs, distressed funds
- **Yields:** Treasury + 300-800 bps spread

### Rating Methodology (S&P Example)

**S&P Corporate Rating Factors:**

**1. Business Risk Profile (50%)**
- Industry risk: Cyclicality, competitive dynamics
- Competitive position: Market share, differentiation
- Operational efficiency: Margins, cost structure
- **Scale:** Excellent / Strong / Satisfactory / Fair / Weak / Vulnerable

**2. Financial Risk Profile (50%)**
- Cash flow/Leverage: Debt/EBITDA, EBITDA/Interest
- Capital structure: Debt maturities, refinancing risk
- Financial policy: Dividend policy, M&A appetite
- **Scale:** Minimal / Modest / Intermediate / Significant / Aggressive / Highly Leveraged

**Rating Matrix:**

| Business Risk → | Excellent | Strong | Satisfactory | Fair | Weak |
|-----------------|-----------|--------|--------------|------|------|
| **Minimal Leverage** | AAA | AA+ | A+ | BBB+ | BB+ |
| **Modest Leverage** | AA | A+ | A | BBB | BB |
| **Intermediate Leverage** | A | A- | BBB+ | BB+ | B+ |
| **Significant Leverage** | BBB+ | BBB | BB+ | BB | B |
| **Aggressive Leverage** | BBB- | BB+ | BB | B+ | B- |
| **Highly Leveraged** | BB+ | BB | B+ | B | CCC |

**Example: Acme Corp**
- Business Risk: Satisfactory (mature industrial services)
- Leverage: 5.0x Debt/EBITDA (Significant)
- **Indicative Rating:** BB+ (high yield)

---

## 6.4 Bond Pricing & Yield Analysis (3-4 hours)

### Bond Basics

**Bond Structure:**
- **Face Value (Par):** $1,000 (standard)
- **Coupon Rate:** 6.0% (annual interest payment)
- **Coupon Payment:** $60 per year ($30 semi-annually)
- **Maturity:** 5 years
- **Price:** Quoted as % of par (e.g., 98.5 = $985)

### Bond Pricing Formula

```
Bond Price = PV of Coupon Payments + PV of Principal

PV = Σ [C / (1 + r)^t] + [FV / (1 + r)^n]

Where:
C = Coupon payment
r = Discount rate (yield to maturity)
t = Period number
FV = Face value
n = Number of periods
```

**Example: 5-Year, 6% Coupon Bond**
- Coupon: $30 semi-annually
- YTM: 7.0% (3.5% per period)
- Periods: 10 (5 years × 2)

```
PV of Coupons:
= $30/(1.035)^1 + $30/(1.035)^2 + ... + $30/(1.035)^10
= $30 × 8.3166 (annuity factor)
= $249.50

PV of Principal:
= $1,000 / (1.035)^10
= $1,000 / 1.4106
= $708.92

Bond Price = $249.50 + $708.92 = $958.42 (or 95.84% of par)
```

**Key Insight:** When YTM > Coupon, bond trades at discount.

### Yield Measures

**1. Current Yield**
```
Current Yield = Annual Coupon / Bond Price

Example:
Annual Coupon: $60
Bond Price: $958.42
Current Yield = $60 / $958.42 = 6.26%
```

**2. Yield to Maturity (YTM)**
- Discount rate that sets PV of cash flows = market price
- Most important yield measure
- Assumes reinvestment at YTM (limitation)

**3. Yield to Call (YTC)**
- YTM if bond is called at first call date
- Relevant for callable bonds
- Call price typically 102-105% of par

**4. Yield to Worst (YTW)**
- Minimum of YTM and YTC
- Conservative measure for callable bonds

### Credit Spreads

**Spread Definition:**
```
Credit Spread = Corporate Bond Yield - Treasury Yield

Example:
Corporate Bond YTM: 7.0%
5-Year Treasury: 4.5%
Credit Spread = 7.0% - 4.5% = 250 bps (2.50%)
```

**Spread Components:**
- **Default Risk:** Probability of default × Loss Given Default
- **Liquidity Premium:** Less liquid than Treasuries
- **Tax Treatment:** Corporate interest is taxable
- **Call Risk:** Issuer can refinance if rates drop

**Typical Spreads by Rating (2025):**

| Rating | Spread over Treasury | Example Yield (5-yr) |
|--------|---------------------|----------------------|
| AAA    | +50 bps             | 5.0% |
| AA     | +80 bps             | 5.3% |
| A      | +120 bps            | 5.7% |
| BBB    | +180 bps            | 6.3% |
| BB     | +350 bps            | 8.0% |
| B      | +600 bps            | 10.5% |
| CCC    | +1,000 bps          | 14.5% |

**Spread Widening / Tightening:**
- **Widening:** Credit deterioration, risk aversion (spreads increase)
- **Tightening:** Credit improvement, risk appetite (spreads decrease)

---

## 6.5 Debt Structures & Seniority (3-4 hours)

### Capital Structure Priority (Bankruptcy)

**Recovery Waterfall (Priority in Liquidation):**

```
1. Secured Debt (Senior Secured, First Lien)
   - Recovery Rate: 60-80%
   - Collateral: All assets (accounts receivable, inventory, PP&E, IP)

2. Secured Debt (Second Lien)
   - Recovery Rate: 30-50%
   - Collateral: Same assets, junior claim

3. Senior Unsecured Debt
   - Recovery Rate: 20-40%
   - No collateral, senior claim on unsecured assets

4. Subordinated Debt (Junior Unsecured)
   - Recovery Rate: 10-30%
   - No collateral, junior to senior unsecured

5. Preferred Stock
   - Recovery Rate: 0-10%
   - Equity claim, senior to common

6. Common Stock
   - Recovery Rate: 0-5%
   - Last claim, usually wiped out
```

**Example Liquidation:**
```
Asset Liquidation Proceeds: $600M
Debt Outstanding:
- Senior Secured (1st Lien): $400M
- Senior Unsecured: $200M
- Subordinated Debt: $100M
- Equity: $0

Recovery Allocation:
1. Senior Secured: $400M (100% recovery)
2. Senior Unsecured: $200M (100% recovery)
3. Subordinated: $0 (0% recovery - out of money)
4. Equity: $0 (wiped out)
```

### Leveraged Loan Structures

**Typical Structure (Private Equity-Backed LBO):**

**1. Revolving Credit Facility (Revolver)**
- Size: $50M (10% of debt)
- Purpose: Working capital, letters of credit
- Draw: As needed (typically undrawn)
- Interest: SOFR + 250-300 bps
- Commitment Fee: 0.5% on unused portion
- Maturity: 5 years
- Seniority: Senior secured, first lien (pari passu with TLA)

**2. Term Loan A (TLA)**
- Size: $200M (35% of debt)
- Interest: SOFR + 275-325 bps
- Amortization: 5-10% per year
- Maturity: 5-6 years
- Seniority: Senior secured, first lien
- Covenants: Maintenance (tested quarterly)

**3. Term Loan B (TLB)**
- Size: $300M (50% of debt)
- Interest: SOFR + 350-450 bps
- Amortization: 1% per year (token)
- Maturity: 7-8 years
- Seniority: Senior secured, first lien (or 1.5 lien)
- Covenants: Incurrence only (covenant-lite)

**4. High Yield Bonds (Senior Notes)**
- Size: $150M (25% of debt)
- Interest: 7.5-9.5% (fixed coupon)
- Amortization: None (bullet)
- Maturity: 8-10 years
- Seniority: Senior unsecured
- Call Protection: 3-5 years (make-whole, then 102-105)

**5. Mezzanine / Subordinated Notes**
- Size: $100M (15% of debt)
- Interest: 11-14% (cash + PIK)
- Amortization: None
- Maturity: 9-10 years
- Seniority: Subordinated
- Equity Kicker: Warrants for 5-10% equity

**Total Debt:** $750M (Revolver undrawn)
**Equity:** $350M
**Total Capitalization:** $1,100M (68% debt / 32% equity)

### Covenant Packages

**Maintenance Covenants (TLA, typical):**
- **Tested Quarterly**
- **Breach = Technical Default** (can trigger acceleration)

**1. Maximum Leverage Ratio**
```
Total Debt / EBITDA ≤ 5.5x (Year 1)
Step-down: 5.0x (Year 2), 4.5x (Year 3), 4.0x (Year 4+)
```

**2. Minimum Interest Coverage Ratio**
```
EBITDA / Interest Expense ≥ 2.5x (Year 1)
Step-up: 3.0x (Year 2+)
```

**3. Minimum FCCR**
```
(EBITDA - CapEx) / Fixed Charges ≥ 1.25x
```

**Incurrence Covenants (TLB, High Yield):**
- **Tested Only When Incurring New Debt**
- **More Flexible** (borrower-friendly)

**1. Restricted Payments Basket**
- Can pay dividends only if leverage <4.0x and coverage >3.0x

**2. Debt Incurrence Test**
- Can incur additional debt only if pro forma leverage <5.0x

**3. Asset Sales Proceeds**
- Must use proceeds to pay down debt (or reinvest within 12 months)

**Negative Covenants (Restrictions):**
- No additional liens on assets
- No mergers or asset sales without lender consent
- No dividends or distributions if in default
- No investments in unrelated businesses
- No changes in business or management without consent

---

## 6.6 BDC Credit Analysis (Special Topic) (2-3 hours)

### Business Development Company (BDC) Overview

**What is a BDC?**
- Publicly-traded private credit fund
- Invests in middle-market companies (typically PE-backed)
- Regulated Investment Company (RIC) status
- Must distribute 90% of taxable income as dividends
- High yields (8-12%+) attract income investors

**Example: Goldman Sachs BDC (GSBD)**

### BDC Credit Metrics

**1. Net Investment Income (NII) / Share**
```
NII = Interest Income + Fees - Operating Expenses - Interest on BDC's Debt

Example (GSBD):
Interest Income: $150M
Fees: $10M
Operating Expenses: $30M
BDC Debt Interest: $20M
NII = $150M + $10M - $30M - $20M = $110M

Shares Outstanding: 100M
NII/Share = $110M / 100M = $1.10

Dividend: $1.00 (91% payout ratio)
```

**2. Net Asset Value (NAV) / Share**
```
NAV = Fair Value of Investments - BDC Debt - Other Liabilities

Example:
Investment Portfolio (FV): $2,000M
BDC Debt: $800M
Other Liabilities: $50M
NAV = $2,000M - $800M - $50M = $1,150M

NAV/Share = $1,150M / 100M shares = $11.50
```

**Price / NAV:**
- Trading above NAV (>1.0): Market expects NAV growth
- Trading at NAV (1.0): Fair value
- Trading below NAV (<1.0): Market concerned about asset quality

**3. Debt-to-Equity (BDC Level)**
```
BDC Leverage = BDC Debt / NAV

Example:
BDC Debt: $800M
NAV: $1,150M
Leverage = $800M / $1,150M = 0.70x (or 70%)

Regulatory Limit: 2.0x (200% leverage allowed post-2018)
```

**4. Portfolio Metrics**
```
Weighted Average Yield on Debt Investments: 10.5%
Cost of BDC Debt: 5.5%
Net Interest Spread: 5.0%

Weighted Average Leverage (Portfolio Companies): 5.2x Debt/EBITDA
% First Lien: 75%
% Second Lien: 15%
% Unsecured / Equity: 10%

Non-Accrual Loans: 2.0% of portfolio (at cost)
(Industry avg: 2-3%)
```

### Analyzing BDC Portfolio Quality

**Key Questions:**
1. **What is the average leverage of portfolio companies?**
   - <4.5x: Conservative
   - 4.5-5.5x: Market
   - >5.5x: Aggressive

2. **What % is first lien vs. subordinated?**
   - Higher first lien % = lower loss given default

3. **What industries are overweight?**
   - Avoid cyclical concentration (retail, energy)

4. **Non-accrual rate trend?**
   - Increasing = credit deterioration

5. **NAV per share trend?**
   - Declining = mark-to-market losses

**Red Flags:**
- NAV declining for 3+ consecutive quarters
- Non-accruals >5% of portfolio
- Dividend cut (cannot sustain NII)
- Trading at deep discount to NAV (>20%)
- High turnover in portfolio (chasing yield)

---

## 6.7 Credit Analysis Case Study (Hands-On)

**Activity: Analyze Goldman Sachs BDC (GSBD) Credit Profile**

**Step 1: Gather Financial Data**
- Pull latest 10-K and 10-Q from SEC EDGAR
- Review investor presentation from IR website

**Step 2: Calculate Key Ratios**
- Portfolio leverage (Debt/EBITDA of holdings)
- BDC leverage (BDC Debt / NAV)
- Weighted average yield
- Net interest spread
- NII / Share and dividend coverage

**Step 3: Assess Portfolio Quality**
- Industry diversification
- Geographic diversification
- % first lien vs. second lien vs. equity
- Non-accrual rate and trend

**Step 4: Valuation**
- Current Price / NAV
- Dividend yield vs. peers
- Historical trading range (premium/discount)

**Step 5: Credit Memo**
- Investment thesis: Buy / Hold / Sell
- Key risks: Portfolio credit quality, interest rate risk, NAV volatility
- Recommendation with target price

---

## 6.8 Distressed Credit & Restructuring (Advanced)

### Distressed Debt Investing

**What is Distressed Debt?**
- Bonds/loans trading at deep discount (30-50 cents on the dollar)
- Company in financial distress (may file bankruptcy)
- High risk, high return (20-30%+ IRR targets)

**Investment Thesis:**
- Company has viable business but unsustainable capital structure
- Debt-for-equity swap in restructuring
- Recovery value > purchase price

**Example:**
```
Company: Retailco (in bankruptcy)
Debt Trading Price: $40 per $100 face value
Post-Restructuring:
- Old debt converted to 80% of equity
- Implied Enterprise Value: $500M
- New Equity Value: $500M - $100M (new debt) = $400M
- Old Debt Recovery: 80% × $400M = $320M

Per $100 Debt:
Investment: $40
Recovery: $64 (64% of face value)
Return: $64 / $40 = 1.6x (60% gain)
```

### Chapter 11 Bankruptcy Process

**1. Filing (Day 1)**
- Company files Chapter 11 petition
- Automatic stay: All creditor actions halted
- Debtor-in-possession (DIP) financing obtained

**2. Plan Development (3-12 months)**
- Company proposes reorganization plan
- Creditors form committees
- Negotiations on recoveries

**3. Confirmation (Court Approval)**
- Creditors vote on plan (by class)
- Bankruptcy judge confirms plan
- Plan becomes effective

**4. Emergence**
- Company exits bankruptcy
- New securities issued to creditors
- Old equity typically cancelled

### Recovery Analysis

**Waterfall Analysis:**
```
Asset Valuation (Liquidation):
Cash: $50M
Accounts Receivable (80% recovery): $60M
Inventory (40% recovery): $40M
PP&E (30% recovery): $150M
Total Liquidation Value: $300M

Debt Claims:
Senior Secured (1st Lien): $250M
Senior Unsecured: $150M
Subordinated: $100M
Total Debt: $500M

Recovery Calculation:
Senior Secured: $250M / $250M = 100% (full)
Senior Unsecured: $50M / $150M = 33%
Subordinated: $0 / $100M = 0%
```

**Going-Concern Valuation (Typically Higher):**
```
Reorganization Value: $600M (DCF-based)
Less: DIP Financing: $50M
Available for Creditors: $550M

Recovery Calculation:
Senior Secured: $250M (100%)
Senior Unsecured: $150M (100%)
Subordinated: $100M (93%)
Equity: $50M (new equity issued)
```

---

## 6.9 Deliverables & Memo Writing

**Credit Analysis Memo (2-3 pages):**

**I. Executive Summary (0.5 pages)**
- Credit recommendation: Investment Grade / High Yield / Avoid
- Key risks and mitigants

**II. Business Overview (0.5 pages)**
- Industry dynamics and competitive position
- Revenue model and key drivers

**III. Financial Analysis (1 page)**
- Leverage ratios (Debt/EBITDA, Net Debt/EBITDA)
- Coverage ratios (EBITDA/Interest, FCCR)
- Liquidity (Cash, Revolver availability)
- Trend analysis (improving or deteriorating)

**IV. Debt Structure & Covenants (0.5 pages)**
- Maturity profile and refinancing risk
- Covenant cushion and default probability
- Recovery analysis by tranche

**V. Recommendation (0.5 pages)**
- Yield to maturity and spread vs. comps
- Upside/downside scenarios
- Rating opinion (if assigning shadow rating)

**Appendix: Financial Model (Excel)**
- Historical financials (3 years)
- Projected financials (3-5 years)
- Credit ratios and covenant compliance
- Sensitivity analysis (EBITDA growth, interest rates)

---

## 6.10 Interview Prep: Credit Case Study

**Typical Prompt:**
"Walk me through a credit analysis. What ratios do you look at?"

**Answer Framework:**
1. **Business Quality:** Industry, competitive position, management
2. **Leverage:** Debt/EBITDA (target <4.5x IG, <6.0x HY)
3. **Coverage:** EBITDA/Interest (target >3.0x)
4. **Liquidity:** Cash + revolver vs. near-term maturities
5. **Covenants:** Cushion to financial covenants
6. **Recovery:** Seniority, collateral, recovery rate estimate
7. **Recommendation:** Investment grade or high yield? Buy/pass?

**Mental Math Example:**
```
Company: Acme Manufacturing
EBITDA: $100M
Total Debt: $400M
Interest Expense: $30M
Cash: $20M

Leverage: $400M / $100M = 4.0x (borderline IG/HY)
Net Leverage: ($400M - $20M) / $100M = 3.8x (better)
Coverage: $100M / $30M = 3.3x (adequate)

Assessment: BB+ / BBB- (borderline investment grade)
Yield Target: 6.0-6.5% (Treasury + 150-200 bps)
```

---

## Additional Resources

**Data Sources:**
- Bloomberg: DDIS (Debt Issuance), CRPR (Credit Research)
- S&P Capital IQ: Credit metrics, comp analysis
- Moody's / S&P: Rating reports and methodologies
- LCD / LevFin Insights: Leveraged loan market data

**Further Reading:**
- "Distressed Debt Analysis" by Stephen Moyer
- "The Handbook of Loan Syndications and Trading" by Allison Taylor
- Credit Suisse Leveraged Finance Primer
- Oaktree Memos (Howard Marks)

**Practice Cases:**
- Analyze credit profiles for all 10 NGI companies
- Compare IG vs. HY issuers in same industry
- Build credit model for BDC holdings

---

**This completes the Credit Analysis Master Class. Students are now ready to assess creditworthiness, build credit models, and deliver credit memos for NGI Capital Advisory fixed income and leveraged finance coverage.**

