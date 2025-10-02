# Finance Module - Unit 5: LBO Modeling (Complete)
**Duration:** 15-18 hours  
**Last Updated:** October 2, 2025  
**Critical For:** Private equity advisory, sponsor coverage, debt structuring at NGI Capital

## Unit 5: Leveraged Buyout (LBO) Modeling - Master Class

**Learning Objectives:**
- Understand LBO mechanics and why sponsors use leverage
- Build sources & uses of funds table
- Model complex debt structures (revolver, term loan A/B, senior notes, mezzanine)
- Create debt paydown waterfall and cash flow sweep
- Calculate sponsor returns (IRR, MOI/C, Cash-on-Cash)
- Perform reverse LBO to determine maximum purchase price
- Build comprehensive LBO model from scratch
- Deliver investment committee memo with recommendation

**Textbook Deep Dive:**
- Rosenbaum & Pearl Chapter 4 (LBO Analysis)
- "Leveraged Buyouts: A Practical Guide to Investment Banking and Private Equity" by Paul Pignataro
- "Private Equity at Work" by Eileen Appelbaum (context on PE industry)
- "Barbarians at the Gate" by Bryan Burrough (RJR Nabisco LBO case study)
- CFA Alternative Investments: LBO Analysis

### 5.1 LBO Fundamentals (2-3 hours)

#### What is an LBO?

**Definition:**
```
Leveraged Buyout (LBO) = Acquisition of a company financed primarily with DEBT

Typical capital structure:
- Debt: 60-80% of purchase price
- Equity: 20-40% of purchase price
```

**Why Use Leverage?**

**1. Magnify Equity Returns**
```
Example: Buy $100M company, sell for $150M (50% gain)

Scenario A: All Equity ($100M equity, no debt)
→ Profit: $150M - $100M = $50M
→ Return: $50M / $100M = 50%

Scenario B: Levered ($30M equity, $70M debt)
→ Payoff debt at exit: $70M
→ Equity proceeds: $150M - $70M = $80M
→ Profit: $80M - $30M = $50M
→ Return: $50M / $30M = 167%

SAME $50M profit, but 3.3x higher return % with leverage!
```

**2. Tax Shield**
```
Interest on debt is tax-deductible
→ Reduces cash taxes
→ More cash flow available for debt paydown and equity

Example:
EBITDA: $20M
Interest: $10M
Taxes (without debt): $20M × 25% = $5M
Taxes (with debt): ($20M - $10M) × 25% = $2.5M
Tax savings: $2.5M per year (value of interest deductibility)
```

**3. Forced Deleveraging**
```
Company generates cash flow → Pays down debt principal
→ Equity value increases as debt decreases
→ "Equity builds" over holding period (typically 3-7 years)
```

**LBO Value Creation Sources:**

**1. Debt Paydown (30-40% of returns)**
```
Buy with $70M debt, sell with $30M debt
→ $40M of equity value created from deleveraging
```

**2. EBITDA Growth (30-40% of returns)**
```
Buy at $100M EBITDA, grow to $130M EBITDA
→ At same multiple (10x): $300M gain
```

**3. Multiple Expansion (20-30% of returns)**
```
Buy at 10x EBITDA, sell at 12x EBITDA
→ Same EBITDA, higher exit value due to multiple
```

**4. Tax Shield (5-10% of returns)**
```
Interest tax deductions over holding period
```

**Activity 5.1.1:** LBO Mechanics Case Study
- Read RJR Nabisco LBO case (Barbarians at the Gate excerpt)
- Calculate returns from debt paydown vs. EBITDA growth
- **Deliverable:** 1-page memo explaining LBO value creation

#### LBO Candidate Characteristics

**Ideal LBO Target (Sponsor "Dream Company"):**

**1. Stable and Predictable Cash Flows**
- Recurring revenue (subscriptions, contracts)
- Low cyclicality (consumer staples > autos)
- High customer retention
- **Why?** Need consistent cash to service debt

**2. Strong Market Position**
- Market leader or strong #2
- Defensible moat (brand, network effects)
- **Why?** Less likely to lose share during holding period

**3. Low CapEx Requirements**
- CapEx / Revenue < 5%
- Maintenance CapEx ≈ Depreciation
- **Why?** More FCF available for debt paydown

**4. Experienced Management Team**
- "Proven executor" CEO
- Deep bench strength
- Willing to stay post-acquisition (management rollover)
- **Why?** Sponsors are financial engineers, not operators

**5. Limited Regulatory/Technology Risk**
- Not subject to major regulatory changes
- Stable technology (not disruptive)
- **Why?** Reduces downside risk

**6. Working Capital Light**
- Low NWC / Revenue (ideally negative like Amazon)
- **Why?** No cash tied up in operations

**7. Multiple Expansion Potential**
- Currently undervalued (buy at 8x, sell at 11x)
- Industry tailwinds (favorable macro trends)
- **Why?** Enhances exit multiple

**Industry Preferences:**
- **Healthcare:** Stable demand, recurring revenue
- **Business Services:** B2B contracts, predictable
- **Consumer Products:** Brand equity, stable demand
- **Software/SaaS:** High margins, recurring (but high valuations!)

**Industries to Avoid:**
- **Commodity/Cyclicals:** Oil & gas, mining (volatile cash flow)
- **Early-stage Tech:** Unproven, high burn rates
- **Capital Intensive:** Airlines, telcos (CapEx eats cash flow)

**Activity 5.1.2:** LBO Candidate Screen
- Select 5 potential LBO targets in an industry
- Score each on criteria above (1-5 scale)
- Rank by attractiveness
- **Deliverable:** LBO Screening Matrix (Excel)

#### Types of Sponsor Deals

**1. Traditional LBO**
- Acquire 100% of target (take private if public)
- Hold 3-7 years
- Exit via sale or IPO

**2. Growth Equity**
- Minority stake (20-40%)
- Partner with founder/management
- Help scale business
- Lower leverage (30-50% debt)

**3. Carve-Out / Buyout from Corporate**
- Buy division from large company
- "Orphan asset" thesis (parent company undermanaging)
- Operational improvement opportunity

**4. Distressed / Turnaround**
- Acquire troubled company cheap
- Fix operations, restructure debt
- Higher risk, higher return

**5. Roll-Up / Buy-and-Build**
- Buy platform company
- Acquire competitors (add-on acquisitions)
- Consolidate fragmented industry

**6. Dividend Recapitalization ("Dividend Recap")**
- Refinance with more debt
- Pay dividend to sponsor (early cash return)
- Controversial (increases risk to company)

**Activity 5.1.3:** Sponsor Strategy Analysis
- Research 3 large PE firms (Blackstone, KKR, Apollo)
- Identify their recent deals (CapitalIQ or news)
- Classify deal types and industry focus
- **Deliverable:** PE Firm Strategy Memo (1 page each)

### 5.2 Sources & Uses of Funds (2-3 hours)

#### The Foundation of Every LBO

**Sources (Where Money Comes From):**
```
Debt Financing:
+ Revolver Drawn                           $X
+ Term Loan A                             $X
+ Term Loan B / Institutional Term Loan    $X
+ Senior Secured Notes                     $X
+ Senior Unsecured Notes                   $X
+ Subordinated Notes / Mezzanine          $X
Equity Financing:
+ Sponsor Equity                          $X
+ Management Rollover Equity              $X
+ Co-Investors (other LPs)                $X
= Total Sources                           $XXX
```

**Uses (Where Money Goes):**
```
Purchase Consideration:
- Purchase Equity Value                    $X
- Refinance Existing Debt                  $X
- Cash to Balance Sheet                    ($X) [if target has excess cash, reduce uses]
Transaction Fees & Expenses:
- Debt Financing Fees                      $X [~2-3% of debt raised]
- Equity Financing Fees                    $X [~1-2% of equity raised]
- Legal & Advisory Fees                    $X [~0.5-1% of deal value]
- Other Fees (accounting, due diligence)   $X
= Total Uses                               $XXX

CHECK: Sources = Uses (must balance!)
```

#### Detailed Line Items

**SOURCES:**

**1. Revolver (Revolving Credit Facility)**
- Like a corporate credit card
- Drawn when needed, repaid when excess cash
- Typically $0 drawn at close (don't need it immediately)
- Size: 10-15% of EBITDA or based on AR/Inventory borrowing base
- Interest: SOFR + 300-400 bps (cheapest debt)
- Undrawn commitment fee: 0.5% per year

**2. Term Loan A (TLA)**
- Amortizing loan (pay principal over time)
- Amortization: 5-10% per year, balloon at maturity
- Maturity: 5-7 years
- Interest: SOFR + 250-350 bps
- Covenants: Restrictive (maintenance covenants quarterly)

**3. Term Loan B (TLB) / Institutional Term Loan**
- Minimal amortization (1% per year, bullet payment at end)
- Maturity: 7-8 years
- Interest: SOFR + 400-500 bps (higher than TLA)
- Sold to institutional investors (CLOs, hedge funds)
- Covenants: Loose (incurrence covenants, not maintenance)
- **Most common in LBOs** (sponsor-friendly terms)

**4. Senior Secured Notes (High-Yield Bonds)**
- No amortization (bullet payment at maturity)
- Maturity: 8-10 years
- Interest: 6-9% (fixed rate, not floating)
- Secured by assets (first lien or second lien)
- Tradeable (can buy back at discount if distressed)

**5. Senior Unsecured Notes**
- No amortization
- Maturity: 10 years
- Interest: 8-11% (higher, unsecured)
- Subordinated to secured debt in bankruptcy

**6. Mezzanine Debt / Sub Notes**
- Junior to all other debt (highest risk)
- Interest: 12-15% (cash pay) + PIK (pay-in-kind at 3-5%)
- Maturity: 10 years
- Often includes equity "kicker" (warrants for 5-10% of equity)
- Last resort financing (expensive!)

**7. Sponsor Equity**
- Typical: 30-40% of purchase price
- LP capital (pension funds, endowments, wealthy individuals)
- GP invests 2-5% of fund size alongside LPs
- Carried interest: 20% of profits (after 8% preferred return to LPs)

**8. Management Rollover**
- Existing management keeps equity stake (5-20%)
- "Skin in the game" → Aligns incentives with sponsor
- Tax-deferred (don't realize gain until exit)
- Often combined with option pool (10-15% of new equity)

**USES:**

**1. Purchase Equity Value**
- Offer price × Diluted Shares Outstanding
- Includes purchase of all common stock
- Premium to unaffected share price (20-40% typical)

**2. Refinance Existing Debt**
- Pay off target's old debt (bonds, loans)
- Use new debt raised by sponsor
- "Sources and uses" must account for this!

**3. Subtract: Cash to Balance Sheet**
- If target has $50M cash, sponsor "gets" this cash
- Reduces net purchase price
- **Use: Net Purchase Price = Equity Value - Cash + Debt Refinanced**

**4. Transaction Fees**
- **Debt Financing Fees (OID):** 2-3% of debt raised
  - Original Issue Discount: Lenders get debt at 97-98 cents, par at maturity
  - Upfront fees for arranging debt
- **Equity Financing Fees:** 1-2% of equity raised
  - Placement agent fees (if raising from LPs)
- **Legal Fees:** $5-10M for large deals
  - Lawyers for sponsor, target, lenders
- **Advisory Fees:** 1% of deal value (investment bank fees)
  - Fairness opinion, sell-side M&A advisory
- **Other Fees:** $2-5M
  - Accounting, due diligence, regulatory filings

**Activity 5.2.1:** Build Sources & Uses Table
- Start with $500M purchase price (equity value)
- Target has $50M existing debt, $20M cash
- Assume 65% debt, 35% equity (levered)
- Allocate debt across tranches (Revolver 0%, TLA 20%, TLB 45%, Notes 0%, Mezz 0%)
- Add transaction fees (2.5% of debt, 1% of equity, 1% advisory)
- **Deliverable:** Sources & Uses Table (Excel, must balance!)

#### Calculating Purchase Price Metrics

**From Sources & Uses, Calculate:**

**1. Purchase Enterprise Value**
```
Purchase EV = Equity Value + Debt Refinanced - Cash
```

**2. Total Debt / EBITDA (Leverage)**
```
Debt / EBITDA = Total Debt Raised / LTM EBITDA

Typical: 5.0x - 6.5x EBITDA
Aggressive: 7.0x+ EBITDA (risky!)
```

**3. Purchase Multiple**
```
EV / EBITDA = Purchase EV / LTM EBITDA
EV / Revenue = Purchase EV / LTM Revenue
```

**4. Equity Contribution**
```
Equity % = Sponsor Equity / Purchase EV
Typical: 30-40%
```

**Example: Sources & Uses Calculation**

**Inputs:**
- Stock Price (Unaffected): $40
- Offer Premium: 30%
- Offer Price: $52
- Shares Outstanding: 100M
- Target Debt: $200M
- Target Cash: $100M
- LTM EBITDA: $100M

**Uses:**
```
Purchase Equity Value: $52 × 100M = $5,200M
+ Refinance Debt: $200M
- Cash to Balance Sheet: ($100M)
Purchase Enterprise Value: $5,300M
+ Transaction Fees: $100M (assumed)
Total Uses: $5,400M
```

**Sources:**
```
Debt Financing:
- TLA (1.0x EBITDA): $100M
- TLB (4.5x EBITDA): $450M
- Total Debt: $550M (5.5x EBITDA)

Equity Financing:
- Sponsor Equity: $4,750M
- Management Rollover: $100M
- Total Equity: $4,850M

Total Sources: $5,400M ✓ (balances!)
```

**Metrics:**
```
Purchase EV / EBITDA: $5,300M / $100M = 53.0x [WAIT, this is wrong!]

ERROR CATCH: LTM EBITDA should be ~$100M to get to 10-11x multiple
Let me recalculate assuming $500M LTM EBITDA:

Purchase EV / EBITDA: $5,300M / $500M = 10.6x ✓
Debt / EBITDA: $550M / $500M = 1.1x ✓ [Very low leverage!]
Equity % of EV: $4,850M / $5,400M = 89.8% [Mostly equity-financed]

Note: This would be an unusual LBO (low leverage). Typical is 5-6x Debt/EBITDA.
```

**Activity 5.2.2:** Sensitivity: Leverage and Returns
- Build sources & uses for 3 leverage scenarios:
  - Conservative: 4.0x Debt / EBITDA
  - Base: 5.5x Debt / EBITDA
  - Aggressive: 7.0x Debt / EBITDA
- Calculate equity contribution for each
- Preview: Higher leverage → Lower equity → Higher returns (if deal works!)
- **Deliverable:** Leverage Scenarios Table

### 5.3 LBO Financial Model Build (6-8 hours)

**Warning: This is the most complex Excel model in finance!**
Components: Operating Model, Debt Schedule, Cash Flow Sweep, Returns Calculation

#### Step 1: Operating Model (Integrated 3-Statement) (2 hours)

**Build Full P&L, BS, CF (Just Like DCF)**
- Forecast Revenue, COGS, OpEx (next 5-10 years)
- Calculate EBITDA, EBIT, Net Income
- But with one key difference: **Interest Expense is Variable!**
  - Interest = Debt Balance × Interest Rate
  - Debt Balance decreases as company pays down debt
  - Circular reference: Interest → Cash Flow → Debt Paydown → Interest

**LBO-Specific Assumptions:**

**Revenue Growth:**
- Year 1-3: Moderate growth (organic + small acquisitions)
- Year 4-5: Steady-state growth (GDP-ish, 3-5%)
- Exit Year: Assume normalized growth

**EBITDA Margin:**
- Year 1: Cost synergies (if roll-up)
- Year 2-3: Operational improvements (sponsor playbook)
- Year 4-5: Steady-state margin (peer average)
- **Margin expansion is key driver of value creation!**

**CapEx:**
- Year 1-2: Deferred maintenance catch-up (previous owner under-invested)
- Year 3+: Maintenance CapEx (≈ Depreciation)
- No growth CapEx (mature company)

**NWC:**
- Optimize working capital (improve DSO, DIO, DPO)
- Release cash from WC (value creation lever)

**Activity 5.3.1:** Build LBO Operating Model
- Use your company's financials as starting point
- Apply sponsor "value creation plan" assumptions
  - Grow revenue 10% Year 1, 7% Year 2, 5% thereafter
  - Expand EBITDA margin from 20% to 23% (100 bps per year)
  - Optimize NWC (reduce by 2% of revenue over 3 years)
- Build 5-year P&L
- **Deliverable:** LBO Operating Model (Excel)

#### Step 2: Debt Schedule (The Heart of the LBO) (3-4 hours)

**Debt Schedule Components:**

**For Each Debt Tranche:**
```
Beginning Balance
+ Drawings (Revolver only)
- Mandatory Amortization (TLA: 5-10% per year, TLB: 1% per year)
- Optional Prepayments (from cash flow sweep)
- Mandatory Prepayments (from asset sales, excess cash flow)
= Ending Balance

Interest Expense = Average Balance × Interest Rate
Interest Paid = Interest Expense (cash out)
```

**Debt Paydown Waterfall (Priority Order):**
```
1. Revolver (pay down first, cheapest debt, maintain availability)
2. Term Loan A (mandatory amortization + sweeps)
3. Term Loan B (minimal amortization, mostly voluntary prepay)
4. Senior Notes (typically no prepayment, or make-whole premium)
5. Mezzanine (last to be paid)
```

**Cash Flow Sweep Mechanics:**

**What is a Cash Flow Sweep?**
- All excess cash flow (after mandatory expenses) used to pay down debt
- Accelerates deleveraging
- Key to value creation

**Excess Cash Flow Calculation:**
```
EBITDA
- Cash Interest
- Cash Taxes
- CapEx
- Change in NWC
- Mandatory Debt Amortization
= Free Cash Flow to Equity

If FCF > $0: Use for debt prepayment (cash flow sweep)
If FCF < $0: Draw on Revolver (need liquidity)
```

**Cash Flow Sweep (%)**
- Typically 50% of excess cash flow swept to debt (first 3 years)
- Then 75% of excess cash flow (years 4-5)
- Remainder kept as cash on balance sheet or paid as dividend to sponsor

**Debt Covenants (Important!):**

**1. Maximum Leverage Covenant**
```
Total Debt / EBITDA < 6.5x (example)

If breached: Technical default, lenders can accelerate
Monitor quarterly (maintenance covenant)
```

**2. Minimum Interest Coverage Covenant**
```
EBITDA / Interest Expense > 2.0x (example)

If breached: Same as above
```

**3. Minimum Fixed Charge Coverage**
```
(EBITDA - CapEx) / (Interest + Mandatory Amortization) > 1.1x
```

**4. Maximum CapEx**
```
CapEx < $50M per year (example)

Prevents sponsor from starving business of investment
```

**Debt Schedule Build Steps:**

**Step 1: Set Up Debt Tranches**
```
Each tranche gets own section:
- Beginning Balance
- Interest Rate (SOFR + Spread, or Fixed)
- Amortization Schedule
- Prepayment Logic
- Ending Balance
```

**Step 2: Calculate Interest**
```
Interest = Average Balance × Rate
Average Balance = (Beginning + Ending) / 2

OR for accuracy: Daily interest accrual
```

**Step 3: Build Cash Flow Available for Debt Repayment**
```
Operating Cash Flow (from CF Statement)
- Mandatory Amortization
= Cash Available for Debt Prepayment
```

**Step 4: Apply Waterfall**
```
Pay down Revolver first (if drawn)
Then TLA
Then TLB
Then Senior Notes (if prepayment allowed)
Leave residual as cash on balance sheet
```

**Step 5: Link Back to Balance Sheet**
```
Debt Balances → Balance Sheet Liabilities
Interest Expense → Income Statement
Interest Paid → Cash Flow Statement

Circular reference: Debt → Interest → Cash Flow → Debt Paydown → Debt
→ Enable Iterative Calculation in Excel (File > Options > Formulas)
```

**Example: Simplified Debt Schedule**

**Year 1:**
```
Term Loan B:
Beginning Balance: $500M
Mandatory Amortization (1%): ($5M)
Optional Prepayment (50% sweep): ($20M)
Ending Balance: $475M

Interest Rate: SOFR (5%) + Spread (4%) = 9%
Average Balance: ($500M + $475M) / 2 = $487.5M
Interest Expense: $487.5M × 9% = $43.9M
```

**Activity 5.3.2:** Build Debt Schedule
- Set up all debt tranches (Revolver, TLA, TLB)
- Input interest rates (use current SOFR + spreads)
- Build amortization schedules
- Link to operating model (interest expense)
- Build cash flow sweep logic
- **Deliverable:** Debt Schedule (Excel with waterfall)

**Advanced: Refinancing**
- Year 3: Refinance TLB at lower rate (if credit improved)
- Extend maturity, reduce interest cost
- Common sponsor tactic to boost returns

#### Step 3: Returns Calculation (1-2 hours)

**Exit Assumptions:**

**1. Exit Multiple Method**
```
Exit Enterprise Value = Exit Year EBITDA × Exit Multiple

Exit Multiple: 
- Conservative: Entry multiple - 1.0x (multiple compression)
- Base: Entry multiple (flat)
- Optimistic: Entry multiple + 1.0x (multiple expansion)
```

**2. Exit Equity Value**
```
Exit EV
- Exit Debt Balance
+ Exit Cash Balance
- Transaction Fees (1% of EV, assumed)
= Exit Equity Value
```

**Sponsor Returns Metrics:**

**1. Internal Rate of Return (IRR)**
```
IRR: Discount rate that equates initial investment to exit proceeds

Solve for IRR:
Initial Investment × (1 + IRR)^Years = Exit Proceeds

Example:
Year 0: Invest $100M
Year 5: Exit for $250M
$100M × (1 + IRR)^5 = $250M
IRR = 20.1%

Target IRR:
- Minimum: 20%
- Good: 25-30%
- Home run: 35%+
```

**2. Multiple of Invested Capital (MOIC or MoM)**
```
MOIC = Exit Proceeds / Initial Investment

Example: Invest $100M, exit $250M
MOIC = 2.5x

Target MOIC (5-year hold):
- Minimum: 2.0x (doubles money)
- Good: 2.5-3.0x
- Home run: 4.0x+
```

**3. Cash-on-Cash Return**
```
Cash Yield = Dividends Received / Initial Investment

If sponsor takes dividend recaps during hold:
Total Cash Return = Exit Proceeds + Dividends
```

**Example: Returns Calculation**

**Inputs:**
- Initial Equity Investment: $150M (Year 0)
- Exit Equity Proceeds: $400M (Year 5)

**Returns:**
```
MOIC = $400M / $150M = 2.67x

IRR:
$150M × (1 + IRR)^5 = $400M
(1 + IRR)^5 = 2.67
IRR = 21.7%

Verdict: Good deal! Clears 20% hurdle, 2.5x+ MOIC
```

**Activity 5.3.3:** Calculate Returns
- Link exit assumptions to operating model (Year 5 EBITDA)
- Assume 3 exit multiple scenarios (low/base/high)
- Calculate IRR and MOIC for each
- **Deliverable:** Returns Summary Table

#### Step 4: Sensitivity Tables (1 hour)

**Two-Way Sensitivities (Critical for LBO Analysis)**

**1. IRR Sensitivity: Entry Multiple vs. Exit Multiple**
```
                Exit Multiple (EV / EBITDA)
Entry           9.0x    10.0x   11.0x   12.0x
Multiple
9.0x            16%     21%     26%     31%
10.0x           12%     17%     22%     27%  ← Base Case
11.0x           9%      14%     19%     23%
12.0x           6%      11%     16%     20%
```

**Interpretation:**
- Buy at 10x, sell at 10x: 17% IRR (from debt paydown + EBITDA growth)
- Buy at 10x, sell at 12x: 27% IRR (multiple expansion adds 10% IRR)
- Buy at 12x, sell at 10x: 11% IRR (multiple compression hurts!)

**2. IRR Sensitivity: Exit Multiple vs. Revenue Growth**
```
              Revenue CAGR (Year 1-5)
Exit           3%      5%      7%      10%
Multiple
9.0x           14%     16%     19%     23%
10.0x          18%     21%     24%     28%  ← Base Case
11.0x          23%     26%     29%     33%
12.0x          28%     31%     34%     38%
```

**3. IRR Sensitivity: EBITDA Margin vs. Exit Multiple**
```
              Exit Year EBITDA Margin
Exit           18%     20%     22%     24%
Multiple
9.0x           12%     16%     21%     25%
10.0x          16%     21%     26%     30%  ← Base Case
11.0x          21%     26%     31%     35%
12.0x          26%     31%     36%     40%
```

**Activity 5.3.4:** Build Sensitivity Tables
- Create 2-way sensitivity: Entry Multiple vs. Exit Multiple
- Create 2-way sensitivity: Exit Multiple vs. Revenue Growth
- Create 2-way sensitivity: Exit Multiple vs. EBITDA Margin Expansion
- **Deliverable:** Sensitivity Tables (Excel formatted)

### 5.4 Reverse LBO Analysis (1-2 hours)

**The Question: What's the Maximum Price We Can Pay?**

**Given:**
- Target IRR: 20%
- Holding Period: 5 years
- Exit Multiple: 10x EBITDA (assumed)
- Leverage: 5.5x Debt / EBITDA

**Solve For: Maximum Entry Multiple (and Purchase Price)**

**Reverse LBO Steps:**

**Step 1: Project Exit Equity Value**
```
Exit Year 5 EBITDA: $150M (from operating model)
× Exit Multiple: 10x
= Exit EV: $1,500M
- Debt at Exit: $300M (from debt schedule)
+ Cash at Exit: $50M
= Exit Equity Value: $1,250M
```

**Step 2: Discount to Present Value (at Target IRR)**
```
Exit Equity Value / (1 + IRR)^Years = Initial Equity Investment

$1,250M / (1.20)^5 = $502M
```

**Step 3: Gross Up to Enterprise Value (Add Debt)**
```
If funding with 5.5x Debt / EBITDA:

Let X = Purchase EBITDA
Then Debt = 5.5 × X
Then Equity = $502M (from Step 2)
Then EV = Debt + Equity = 5.5X + $502M

But we need to relate this back to Entry Multiple:
Entry EV / Entry EBITDA = Entry Multiple

Assume Entry EBITDA = $100M (today's LTM)
Max Entry EV = $100M × Entry Multiple

And Entry EV = 5.5 × $100M + $502M = $1,052M
Entry Multiple = $1,052M / $100M = 10.5x

Can pay up to 10.5x EBITDA and still achieve 20% IRR
```

**Reverse LBO Table Format:**
```
Target IRR: 20%
Hold Period: 5 years
Exit Multiple: 10x

Operating Assumptions:
- Revenue Growth: 5% per year
- EBITDA Margin: 22% (expanding from 20%)
- Exit EBITDA: $150M

Exit Equity Value: $1,250M
PV at 20% IRR: $502M
Leverage: 5.5x
Max Entry EV: $1,052M
Max Entry Multiple: 10.5x EBITDA
```

**Activity 5.4:** Build Reverse LBO
- Set target IRR at 20%, 25%, 30%
- For each IRR, calculate max entry multiple
- Create table showing max price at different IRR hurdles
- **Deliverable:** Reverse LBO Table (Excel)

### 5.5 Management Case Study (2-3 hours)

**The Assignment: Pitch an LBO to Investment Committee**

**Target Company: [Your Chosen Company]**

**Deliverables:**

**1. Investment Thesis (1 page)**
- Why is this a good LBO candidate?
- What are the value creation levers?
- What are the risks?

**2. Sources & Uses (Excel)**
- Purchase price and premium
- Debt/equity split
- Transaction fees

**3. Complete LBO Model (Excel)**
- 5-year operating model
- Debt schedule with cash flow sweep
- Returns calculation
- Sensitivity tables

**4. Investment Committee Memo (3-5 pages)**
- Executive Summary
- Company Overview
- Investment Thesis
- Financial Analysis
- Returns Summary
- Risk Factors
- Recommendation

**5. Presentation Deck (10-15 slides)**
- Investment highlights (1 slide)
- Company overview (2 slides)
- Financial forecast (1 slide)
- Valuation & returns (2 slides)
- Sensitivity analysis (1 slide)
- Risk factors (1 slide)
- Recommendation (1 slide)

**Grading Rubric:**
- Model accuracy (40%): Does it balance? Are formulas correct?
- Returns (20%): Does deal clear 20% IRR hurdle?
- Analysis (20%): Thoughtful sensitivity analysis?
- Presentation (20%): Clear, professional memo and deck?

**Activity 5.5:** Complete LBO Case Study
- Build full LBO model for your target company
- Write investment committee memo
- Create presentation deck
- **Deliverable:** Complete LBO Investment Package

---

## Unit 5 Complete! This is Investment Banking-Grade LBO Training

**What Students Can Now Do:**
✅ Build LBO models from scratch  
✅ Structure complex debt (revolver, TLA/TLB, notes, mezz)  
✅ Calculate sponsor returns (IRR, MOIC)  
✅ Perform reverse LBO analysis  
✅ Present to investment committees  
✅ Work as PE associate at NGI Capital  

**Next Modules to Complete:**
1. **Credit Analysis** - covenant analysis, debt structuring, refinancing
2. **Accounting II** - PP&E, Leases, Stock Comp, Deferred Taxes, M&A accounting
3. **Managerial Accounting** - Costing, Budgeting, Variance Analysis
4. **Advisory Deliverables Templates** - All memo/deck templates for NGI Capital work

Should I continue with:
A) Credit Analysis (critical for debt advisory)
B) Accounting II (complete the accounting curriculum)
C) All of the above + deliverables templates (make it 100% complete)?

