# Finance Module - Unit 5: Leveraged Buyout (LBO) Analysis (Complete)
**Duration:** 15-18 hours  
**Last Updated:** October 2, 2025  
**Critical for:** Private equity, M&A advisory, sponsor coverage at NGI Capital  
**Animations:** Manim-powered 3Blue1Brown-style visualizations (see Appendix.Manim.Animations.md)

## Unit 5: Leveraged Buyout (LBO) Modeling - Master Class

**Manim Animations:**
- `LBO_Returns_Waterfall` (10 min) - Complete LBO mechanics from entry to exit
- `Debt_Paydown_Schedule` (7 min) - Debt tranches and cash sweep mechanics
- `IRR_Multiple_Bridge` (8 min) - Value creation sources breakdown

**Learning Objectives:**
- Understand LBO economics and why leverage amplifies returns
- Build complete LBO model from sources & uses to exit scenarios
- Model debt tranches (revolver, term loans, subordinated debt)
- Calculate cash available for debt paydown with cash sweep
- Compute IRR and MOIC (multiple of invested capital) for PE returns
- Understand sponsor strategies for value creation
- Deliver LBO analysis memo with investment recommendation

**Textbook Deep Dive:**
- Rosenbaum & Pearl Chapter 4 (Leveraged Buyout Analysis)
- Damodaran "Investment Valuation" Chapter 28 (LBOs and Value Enhancement)
- "Barbarians at the Gate" by Burrough & Helyar (classic LBO case study)
- CFA Private Equity curriculum
- "Private Equity at Work" by Eileen Appelbaum

---

## 5.1 LBO Foundation & Economics (3-4 hours)

### What is an LBO?

**Definition:**
A leveraged buyout is the acquisition of a company using a significant amount of borrowed money (debt) to meet the cost of acquisition. The assets of the company being acquired are typically used as collateral for the loans.

**Key Parties:**
1. **Financial Sponsor (PE Firm):** Acquires the company, provides equity capital
2. **Management:** Often retains ownership stake, runs operations
3. **Lenders:** Provide debt financing (banks, institutional investors)
4. **Target Company:** Business being acquired

**The LBO Thesis:**
```
Entry Valuation: $1,000M enterprise value
Equity Investment: $400M (40%)
Debt Financing: $600M (60%)

5 Years Later...
Exit Valuation: $1,500M (50% growth)
Remaining Debt: $200M (paid down $400M)
Equity Value: $1,500M - $200M = $1,300M

Returns:
MOIC = $1,300M / $400M = 3.25x
IRR = 26.6% annualized
```

### Why Use Leverage?

**Equity Returns Amplification:**

**No Leverage Scenario:**
- Investment: $1,000M equity
- Exit Value: $1,500M
- Return: $500M profit = 50% return over 5 years = 8.4% IRR

**With Leverage (60% debt):**
- Investment: $400M equity + $600M debt
- Exit Value: $1,500M
- Less Remaining Debt: $200M
- Equity Value: $1,300M
- Return: $900M profit = 225% return over 5 years = 26.6% IRR

**Leverage Multiplier:**
- 3x equity return with same enterprise value growth!

### Value Creation in LBOs (The "Three Engines")

**1. Multiple Expansion (Market Timing)**
```
Entry: Buy at 8.0x EBITDA
Exit: Sell at 10.0x EBITDA
Same EBITDA, higher exit value
```
- Depends on market conditions (bull market helps)
- Risky if multiples compress

**2. EBITDA Growth (Operational Improvement)**
```
Entry EBITDA: $100M
Exit EBITDA: $150M (50% growth)
Same multiple, higher earnings
```
- Revenue growth: Organic, M&A add-ons
- Margin expansion: Cost cuts, operational efficiency
- Best value creation source (controllable)

**3. Debt Paydown (Deleveraging)**
```
Entry Debt: $600M
Exit Debt: $200M
Cash flow used to repay debt, increasing equity value
```
- Company's cash flow pays down debt
- Increases equity ownership of enterprise value
- "Free" value creation from operations

### Ideal LBO Target Characteristics

**Financial Profile:**
- **Strong, stable cash flows:** Predictable, recession-resistant
- **Low CapEx requirements:** More cash available for debt paydown
- **Working capital neutral:** No cash tied up in growth
- **EBITDA margins >20%:** Room for operational improvement
- **Revenue growth >5%:** Not declining, but not hyper-growth

**Industry Characteristics:**
- **Mature, non-cyclical industries:** Healthcare, consumer staples, business services
- **Fragmented industries:** Opportunity for roll-up strategy
- **High barriers to entry:** Protect from competition
- **Low technology disruption risk:** Avoid obsolescence

**Operational Characteristics:**
- **Experienced management team:** Can execute with sponsor support
- **Inefficient operations:** Room for PE value creation
- **Non-core assets to divest:** Unlock hidden value
- **Strong market position:** Pricing power, customer retention

**Red Flags (Avoid):**
- High customer concentration (>25% from one customer)
- Declining industry (newspapers, legacy retail)
- Heavy R&D requirements (biotech, pharma)
- High working capital needs (inventory-heavy)
- Regulatory uncertainty

---

## 5.2 LBO Model Structure (4-5 hours)

### Transaction Assumptions

**Entry Assumptions:**
```
Target Company: Acme Industrial Services
LTM EBITDA: $100M
LTM Revenue: $500M
Entry Multiple: 9.0x EBITDA
Enterprise Value: $900M

Closing Date: January 1, 2025
Projection Period: 5 years
Exit Date: December 31, 2029
```

**Financing Structure (Sources & Uses):**

**Sources of Funds:**
```
Senior Debt (Term Loan A):     $200M    22.2%
Senior Debt (Term Loan B):     $250M    27.8%
Subordinated Debt (Mezzanine): $100M    11.1%
--------------------------------------------
Total Debt:                    $550M    61.1%

Sponsor Equity:                $300M    33.3%
Management Rollover:           $50M     5.6%
--------------------------------------------
Total Equity:                  $350M    38.9%

Total Sources:                 $900M    100%
```

**Uses of Funds:**
```
Purchase Enterprise Value:     $900M    100%
Less: Existing Cash (assumed):  $0M     0%
Plus: Transaction Fees:         $25M    2.8%
Plus: Financing Fees:           $15M    1.7%
--------------------------------------------
Total Uses:                    $940M

Additional Cash Needed:         $40M
(Included in Sources as equity)
```

**Debt Tranches Detailed:**

**1. Revolving Credit Facility (Revolver):**
- Amount: $50M (undrawn at close)
- Purpose: Working capital, short-term needs
- Interest Rate: SOFR + 250 bps = 7.5%
- Maturity: 5 years
- Repayment: As needed, can redraw
- Covenants: Leverage ratio, interest coverage

**2. Term Loan A (TLA):**
- Amount: $200M
- Interest Rate: SOFR + 275 bps = 7.75%
- Maturity: 5 years
- Amortization: 5% per year (mandatory)
- Repayment: Amortizing (principal + interest)
- Rank: Senior secured

**3. Term Loan B (TLB):**
- Amount: $250M
- Interest Rate: SOFR + 400 bps = 9.0%
- Maturity: 7 years
- Amortization: 1% per year (nominal)
- Repayment: Bullet (mostly at maturity)
- Rank: Senior secured (pari passu with TLA)

**4. Subordinated Debt (Mezzanine):**
- Amount: $100M
- Interest Rate: 12.0% (cash) + 3.0% PIK (payment-in-kind)
- Maturity: 8 years
- Amortization: None (bullet)
- Repayment: Bullet at maturity
- Rank: Subordinated to senior debt
- Sweetener: Warrants for 5% of equity

### Operating Model Assumptions

**Revenue Growth:**
```
Year 1 (2025): $500M → $525M  (+5.0% organic)
Year 2 (2026): $525M → $557M  (+6.0% growth)
Year 3 (2027): $557M → $590M  (+6.0% growth)
Year 4 (2028): $590M → $625M  (+6.0% growth)
Year 5 (2029): $625M → $663M  (+6.0% growth)
```
- Sponsor plan: Organic growth + bolt-on acquisitions
- Market growth: 3-4% industry CAGR
- Market share gains: Sales force expansion, pricing power

**EBITDA Margin Expansion:**
```
LTM (2024):  $100M / $500M = 20.0%
Year 1:      $110M / $525M = 21.0%  (+100 bps)
Year 2:      $123M / $557M = 22.0%  (+100 bps)
Year 3:      $136M / $590M = 23.0%  (+100 bps)
Year 4:      $150M / $625M = 24.0%  (+100 bps)
Year 5:      $166M / $663M = 25.0%  (+100 bps)
```
- Cost initiatives: Procurement savings, labor efficiency
- SG&A leverage: Fixed costs spread over higher revenue
- Mix improvement: Higher-margin services vs. products

**CapEx & Depreciation:**
```
CapEx: 3.0% of revenue (maintenance CapEx only)
Depreciation: 3.5% of revenue
D&A in EBITDA: 4.0% of revenue
```

**Working Capital:**
```
Days Sales Outstanding (DSO): 45 days
Days Inventory Outstanding (DIO): 30 days
Days Payable Outstanding (DPO): 40 days
Cash Conversion Cycle: 35 days

Change in NWC: Grows with revenue (% of revenue method)
NWC as % of Revenue: 10%
```

**Taxes:**
```
Tax Rate: 25% (federal + state blended)
NOLs (Net Operating Losses): $0 (assume none)
```

---

## 5.3 Cash Flow Waterfall & Debt Paydown (4-5 hours)

### Free Cash Flow Calculation (Unlevered)

```
Revenue:                                    $525M
× EBITDA Margin:                            21.0%
= EBITDA:                                   $110M
- Depreciation & Amortization:              $21M
= EBIT:                                     $89M
× (1 - Tax Rate):                           75%
= NOPAT (after-tax):                        $67M
+ D&A (add back non-cash):                  $21M
- CapEx:                                    $16M
- Increase in Net Working Capital:          $3M
= Unlevered Free Cash Flow:                 $69M
```

### Cash Flow Available for Debt Service

```
Unlevered Free Cash Flow:                   $69M
- Interest Expense (cash):
  TLA: $200M × 7.75% =                      $16M
  TLB: $250M × 9.0% =                       $23M
  Mezzanine (cash): $100M × 12% =           $12M
  Total Interest:                           $51M
- Mandatory Amortization:
  TLA: $200M × 5% =                         $10M
  TLB: $250M × 1% =                         $3M
  Total Mandatory:                          $13M
--------------------------------------------
= Cash Available for Debt Paydown:          $5M
```

### Cash Sweep & Debt Paydown Waterfall

**Cash Sweep Priority (Typical Structure):**

1. **Pay Mandatory Amortization** (already deducted above)
2. **Excess Cash Sweep:**
   - 100% of excess cash flow pays down debt
   - Priority: TLA first (lowest rate), then TLB, then Mezzanine
   - Reason: Reduce interest expense, improve credit profile

**Year 1 Example:**
```
Cash Available: $5M
Sweep to TLA: $5M
Remaining TLA Balance: $200M - $10M (mandatory) - $5M (sweep) = $185M
```

**Debt Schedule (5-Year Projection):**

| Year | TLA Beg | TLA Paydown | TLA End | TLB Beg | TLB Paydown | TLB End | Mezz Beg | Mezz PIK | Mezz End |
|------|---------|-------------|---------|---------|-------------|---------|----------|----------|----------|
| 2025 | $200M   | $15M        | $185M   | $250M   | $3M         | $247M   | $100M    | $3M      | $103M    |
| 2026 | $185M   | $20M        | $165M   | $247M   | $8M         | $239M   | $103M    | $3M      | $106M    |
| 2027 | $165M   | $25M        | $140M   | $239M   | $15M        | $224M   | $106M    | $3M      | $109M    |
| 2028 | $140M   | $35M        | $105M   | $224M   | $25M        | $199M   | $109M    | $3M      | $112M    |
| 2029 | $105M   | $50M        | $55M    | $199M   | $40M        | $159M   | $112M    | $3M      | $115M    |

**Total Debt Paydown:** $550M → $329M = $221M reduction (40% deleveraging)

**Leverage Ratios:**
```
Entry (2024): $550M / $100M EBITDA = 5.5x
Exit (2029): $329M / $166M EBITDA = 2.0x
```
- Strong deleveraging from 5.5x to 2.0x
- Attractive to lenders, improves refinancing options

---

## 5.4 Exit Scenarios & Returns Analysis (4-5 hours)

### Exit Valuation Methods

**1. Exit Multiple Method (Most Common)**
```
Exit Year EBITDA (2029): $166M
Exit Multiple: 9.0x (same as entry)
Enterprise Value at Exit: $166M × 9.0x = $1,494M
```

**Why use same multiple?**
- Conservative assumption (no multiple expansion)
- Reflects pure operational improvement
- Sensitive to market conditions

**2. DCF to Exit (Cross-Check)**
- Project cash flows beyond Year 5
- Discount back to exit date
- Less common for LBO analysis

### Returns Calculation

**Base Case Exit:**
```
Enterprise Value at Exit:               $1,494M
- Remaining Debt:                       $329M
- Transaction Costs (2% of EV):         $30M
= Equity Value at Exit:                 $1,135M

Initial Equity Investment:              $350M
Equity Return:                          $1,135M - $350M = $785M

MOIC (Multiple of Invested Capital):
= $1,135M / $350M = 3.24x

IRR (Internal Rate of Return):
Year 0: -$350M (outflow)
Year 5: +$1,135M (inflow)
IRR = 26.3% annualized
```

**PE Firm Hurdle Rates:**
- **Target IRR:** 20-25% (net to LPs after fees)
- **Minimum IRR:** 15%
- **Home Run:** >30% IRR

### Sensitivity Analysis

**Two-Way Sensitivity: Exit Multiple vs. EBITDA Growth**

| Exit Multiple → | 7.0x   | 8.0x   | 9.0x   | 10.0x  | 11.0x  |
|-----------------|--------|--------|--------|--------|--------|
| **EBITDA $140M**| 15.2%  | 19.8%  | 24.1%  | 28.1%  | 31.8%  |
| **EBITDA $150M**| 17.5%  | 22.3%  | 26.7%  | 30.8%  | 34.6%  |
| **EBITDA $166M**| 21.1%  | 26.3%  | 31.0%  | 35.3%  | 39.3%  |
| **EBITDA $175M**| 23.2%  | 28.6%  | 33.5%  | 37.9%  | 41.9%  |
| **EBITDA $185M**| 25.4%  | 31.0%  | 36.1%  | 40.6%  | 44.7%  |

**Key Insights:**
- Even at 7.0x exit (compression), still achieves 21% IRR with $166M EBITDA
- Downside protected by debt paydown and EBITDA growth
- Upside scenario: 11.0x exit + $185M EBITDA = 45% IRR

### Value Creation Bridge

**Entry to Exit Value Bridge:**
```
Entry Equity Value:                     $350M

Value Creation Sources:
1. EBITDA Growth: $100M → $166M        +$594M
   (66% growth × 9.0x multiple)
2. Multiple Expansion: 9.0x → 9.0x     $0M
   (Conservative: no expansion)
3. Debt Paydown: $550M → $329M         +$221M
4. Less: Transaction Costs             -$30M
--------------------------------------------
Exit Equity Value:                      $1,135M

Total Value Created:                    $785M
% from EBITDA Growth:                   76%
% from Debt Paydown:                    28%
% from Multiple Expansion:              0%
```

**Breakdown:**
- **Operational improvement is the hero:** 76% of value creation
- **Deleveraging adds 28%:** "Free" value from company cash flows
- **Multiple expansion not assumed:** Conservative approach

---

## 5.5 Advanced LBO Topics (3-4 hours)

### Management Incentive Plan (MIP)

**Structure:**
- Management invests 5-10% of their net worth
- Receive equity stake (5-15% of total equity)
- Options at strike price = entry valuation
- Vests over 4-5 years
- Alignment with sponsor on value creation

**Example:**
```
CEO invests: $2M (5% of sponsor equity)
CEO equity stake: 5% of company
At exit: $1,135M equity value × 5% = $57M
CEO return: $57M - $2M = $55M (27.5x!)
```

### Dividend Recapitalization

**What is it?**
- Company takes on additional debt
- Uses proceeds to pay dividend to PE sponsor
- Sponsor gets partial return before exit
- Increases leverage, risk

**Example (Year 3):**
```
Company EBITDA: $136M
Leverage: 3.5x (down from 5.5x entry)
New Debt: $100M (brings leverage to 4.3x)
Dividend to Sponsor: $100M

Sponsor returns:
Initial Investment: $350M
Dividend Received: $100M
Net Investment: $250M (28% reduction)
```

**Controversy:**
- Reduces equity cushion
- Benefits sponsor at expense of lenders
- Common in 2006-2007 boom (criticized post-crisis)

### Add-On Acquisitions (Roll-Up Strategy)

**Thesis:**
- Platform company (initial LBO target)
- Acquire smaller competitors (add-ons)
- Integrate, realize synergies
- Exit at higher multiple (larger scale)

**Example:**
```
Platform (Acme Industrial): $500M revenue
Add-On 1 (Year 2): $50M revenue at 6.0x
Add-On 2 (Year 3): $75M revenue at 6.5x
Add-On 3 (Year 4): $60M revenue at 6.0x

Total Revenue at Exit: $685M
Exit Multiple: 9.5x (scale premium)
vs. 9.0x standalone
```

**Value Creation:**
- Buy small companies at lower multiples
- Sell combined entity at higher multiple
- Multiple arbitrage + synergies

### Operational Value Creation Playbook

**1. Revenue Growth:**
- Sales force expansion and training
- Pricing optimization (often underpriced)
- New product launches
- Geographic expansion
- E-commerce/digital transformation

**2. Cost Reduction:**
- Procurement savings (centralized purchasing)
- Headcount optimization (eliminate redundancies)
- IT systems consolidation
- Real estate rationalization
- Outsourcing non-core functions

**3. Working Capital Optimization:**
- Reduce DSO (better collections)
- Reduce inventory (just-in-time, better forecasting)
- Extend DPO (negotiate payment terms)
- Unlock cash trapped in working capital

**4. CapEx Efficiency:**
- Defer non-essential CapEx
- Sale-leaseback of real estate
- Equipment leasing vs. buying
- Focus on maintenance CapEx only

---

## 5.6 LBO Case Studies (2-3 hours)

### Case Study 1: RJR Nabisco (1989)
**The Largest LBO in History (at the time)**

**Deal Terms:**
- Buyer: KKR (Kohlberg Kravis Roberts)
- Price: $25B ($31.1B including assumed debt)
- Multiple: 12.6x EBITDA
- Leverage: 90% debt / 10% equity

**Outcome:**
- Sold off non-core assets (Del Monte, Heublein)
- Struggled with debt burden
- Exit: IPO in 1991, KKR sold stake by 1995
- Returns: Modest (~15% IRR), saved by asset sales

**Lessons:**
- Too much leverage is dangerous
- Overpaying kills returns
- Asset sales can save deals

### Case Study 2: Hertz (2005)
**The $15B LBO**

**Deal Terms:**
- Buyers: Clayton Dubilier & Rice, Carlyle, Merrill Lynch
- Price: $15B
- Multiple: 11.0x EBITDA
- Leverage: 75% debt / 25% equity

**Outcome:**
- IPO in 2006 (quick flip)
- Sponsors took dividend recapitalization
- Financial crisis hit (2008-2009)
- Filed bankruptcy in 2020 (COVID)
- Returns: Negative for later investors

**Lessons:**
- Cyclical businesses are risky in LBOs
- Dividend recaps can overlever
- Exit timing matters (2006 IPO was lucky)

### Case Study 3: Hilton Hotels (2007)
**The $26B LBO That Worked**

**Deal Terms:**
- Buyer: Blackstone
- Price: $26B
- Multiple: 15.5x EBITDA (peak bubble pricing)
- Leverage: 78% debt / 22% equity

**Outcome:**
- Held through financial crisis (2008-2009)
- Operational improvements (RevPAR growth)
- IPO in 2013
- Full exit by 2018
- Returns: 3.0x MOIC, 24% IRR

**Lessons:**
- Quality assets can recover from overpaying
- Patient capital wins
- Operational value creation > financial engineering

---

## 5.7 LBO Model Build Exercise (Hands-On)

**Activity: Build Full LBO Model in Excel**

**Step 1: Set Up Model Structure**
- Tabs: Summary, Sources & Uses, Operating Model, Debt Schedule, Returns, Sensitivity

**Step 2: Input Transaction Assumptions**
- Entry multiple, debt structure, interest rates

**Step 3: Build Operating Projections**
- Revenue growth, EBITDA margins, CapEx, NWC

**Step 4: Calculate Free Cash Flow**
- Unlevered FCF, interest expense, tax shield

**Step 5: Build Debt Schedule**
- Mandatory amortization, cash sweep, ending balances

**Step 6: Calculate Exit Value & Returns**
- Exit multiple, enterprise value, equity value
- MOIC, IRR calculations (use Excel XIRR function)

**Step 7: Sensitivity Analysis**
- Data tables for exit multiple and EBITDA growth

**Step 8: Football Field Chart**
- Visualize valuation range across scenarios

---

## 5.8 Deliverables & Memo Writing

**LBO Analysis Memo (3-4 pages):**

**I. Investment Thesis (1 page)**
- Why is this an attractive LBO candidate?
- Industry dynamics, competitive position
- Sponsor value creation plan

**II. Transaction Overview (0.5 pages)**
- Entry valuation and financing structure
- Key deal terms and leverage ratios

**III. Base Case Projections (1 page)**
- Revenue and EBITDA growth assumptions
- Cash flow generation and debt paydown
- Exit valuation and returns (MOIC, IRR)

**IV. Downside / Upside Cases (0.5 pages)**
- Sensitivity to key drivers
- Risk factors and mitigants

**V. Recommendation (0.5 pages)**
- Investment decision: Pass / Pursue
- Key risks and next steps

**Appendix: Full LBO Model (Excel)**
- Detailed financial projections
- Debt schedule and cash flow waterfall
- Sensitivity tables and returns analysis

---

## 5.9 Common Mistakes & Best Practices

**Common Mistakes:**
1. **Unrealistic EBITDA growth:** 15%+ CAGR is aggressive
2. **Forgetting PIK interest:** Compounds debt balance
3. **Ignoring working capital needs:** Growth requires cash
4. **Assuming multiple expansion:** Conservative = flat multiple
5. **Circular references:** Debt interest depends on debt balance
6. **Wrong IRR formula:** Use XIRR, not IRR (exact dates)

**Best Practices:**
1. **Sanity check leverage ratios:** 5-6x at entry, <3x at exit
2. **Model debt paydown priority:** TLA first, then TLB
3. **Document all assumptions:** Justify growth rates, margins
4. **Build sensitivity tables:** Test downside scenarios
5. **Include transaction costs:** 2-3% of EV at entry and exit
6. **Align with sponsor incentives:** Management equity, carry

---

## 5.10 Interview Prep: LBO Case Study

**Typical Prompt:**
"Walk me through an LBO analysis. What returns would you need to make this deal work?"

**Answer Framework:**
1. **Transaction:** Entry multiple, leverage, equity check
2. **Operations:** Revenue growth, margin expansion, cash flow
3. **Debt Paydown:** Cash sweep, deleveraging over hold period
4. **Exit:** Exit multiple, enterprise value, equity value
5. **Returns:** MOIC, IRR calculation
6. **Sensitivity:** Key drivers, downside protection

**Mental Math Example:**
```
Entry: $1B EV at 10x EBITDA = $100M EBITDA
Debt: $600M (6.0x leverage)
Equity: $400M

5 Years Later:
EBITDA Growth: $100M → $150M (50% growth, 8.5% CAGR)
Exit Multiple: 10x (flat)
Exit EV: $150M × 10x = $1,500M
Debt Paydown: $600M → $300M (50% reduction)
Equity Value: $1,500M - $300M = $1,200M

Returns:
MOIC: $1,200M / $400M = 3.0x
IRR: ~25% (rule of thumb: 3x in 5 years = 25% IRR)
```

**Key Insight:**
- Value from EBITDA growth: $500M (from $100M to $150M at 10x)
- Value from debt paydown: $300M
- Total: $800M value created on $400M equity = 2x MOIC from operations + 1x from deleveraging = 3.0x total

---

## Additional Resources

**Software & Tools:**
- Excel: LBO model templates (Wall Street Prep, Breaking Into Wall Street)
- CapIQ: Debt structures, precedent LBOs
- PitchBook: PE transaction data

**Further Reading:**
- "Leveraged Buyouts: A Practical Guide to Investment Banking and Private Equity" by Paul Pignataro
- "King of Capital: The Remarkable Rise, Fall, and Rise Again of Steve Schwarzman and Blackstone" by David Carey
- Private Equity International (PE news and analysis)

**Practice Cases:**
- Build LBO models for all 10 curated NGI companies
- Compare sponsor strategies (Blackstone vs. KKR vs. Apollo)
- Analyze recent LBOs in target industries

---

**This completes the LBO Master Class. Students are now ready to build banker-grade LBO models and analyze leveraged buyout opportunities for NGI Capital Advisory clients and PE sponsor coverage.**

