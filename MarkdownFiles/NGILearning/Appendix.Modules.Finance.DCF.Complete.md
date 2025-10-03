# Finance Module - Unit 3: DCF Valuation (Complete)
**Duration:** 12-15 hours  
**Last Updated:** October 2, 2025  
**Preparation Level:** Ready for NGI Capital Advisory analyst work  
**Animations:** Manim-powered 3Blue1Brown-style visualizations (see Appendix.Manim.Animations.md)

## Unit 3: Discounted Cash Flow (DCF) Valuation - Master Class

**Manim Animations:**
- `DCF_Waterfall_COST` (12 min) — Full DCF flow from EBITDA to equity value
- `WACC_Calculation_Tree` (8 min) — Cost of equity + debt calculation tree
- `DCF_Terminal_Value_Methods` (7 min) — Gordon Growth vs. Exit Multiple comparison
- `Sensitivity_Analysis_2Way` (6 min) — Interactive price target sensitivity table
- `Football_Field_Chart` (7 min) — Valuation triangulation visualization

**Learning Objectives:**
- Build unlevered free cash flow (FCFF) from scratch
- Calculate WACC with defensible assumptions (cost of equity, cost of debt, capital structure)
- Determine terminal value using perpetuity growth AND exit multiple methods
- Construct sensitivity tables (2-way, 3-way)
- Build football field valuation chart
- Understand DCF limitations and when NOT to use it
- Deliver investment memo with DCF recommendation

**Textbook Deep Dive:**
- Damodaran "Investment Valuation" Chapters 12-15 (DCF methodology)
- McKinsey "Valuation" Chapters 6-9 (WACC, continuing value)
- Rosenbaum & Pearl Chapter 2 (DCF mechanics)
- CFA Level 2 Equity: Reading 25-27

### 3.1 Free Cash Flow (FCF) Foundation (3-4 hours)

#### The FCF Formula (Unlevered)
```
EBIT (Earnings Before Interest & Taxes)
× (1 - Tax Rate)
= NOPAT (Net Operating Profit After Tax)
+ Depreciation & Amortization (non-cash, add back)
- Capital Expenditures (CapEx)
- Increase in Net Working Capital
= Unlevered Free Cash Flow (FCFF)
```

**Why Unlevered?**
- Represents cash available to ALL investors (debt + equity)
- Removes impact of capital structure (financing decision)
- Discount at WACC (weighted average of debt and equity costs)
- **Levered FCF** (FCFE) = only for equity holders, discount at cost of equity

#### NOPAT Calculation Deep Dive

**Start with EBIT**
```
Revenue
- COGS
= Gross Profit
- Operating Expenses (R&D, S&M, G&A)
- Depreciation & Amortization
= EBIT
```

**Apply Tax Rate**
```
EBIT × (1 - Tax Rate) = NOPAT

Example: EBIT = $100M, Tax Rate = 25%
NOPAT = $100M × (1 - 0.25) = $75M
```

**Tax Rate Selection:**
- **Marginal Tax Rate:** Statutory rate (US Federal 21% + State 4-8%)
- **Effective Tax Rate:** Actual taxes paid / Pre-tax income
- **Cash Tax Rate:** Cash taxes / Pre-tax income (preferred for DCF)
- **Best Practice:** Use marginal rate (25-26% for US companies) for consistency

#### Add Back Non-Cash Charges

**Depreciation & Amortization**
- Already deducted in EBIT
- Not a cash expense (historical CapEx already paid)
- Add back to get to cash flow
- **Exception:** If D&A = Maintenance CapEx, they offset (mature companies)

**Other Non-Cash Items to Consider:**
- Stock-Based Compensation (SBC): Already in OpEx, but...
  - **Controversy:** Should we add back? (It's non-cash but dilutes)
  - **Best Practice:** Do NOT add back (it's real economic cost)
- Amortization of Intangibles (from M&A): Add back
- Impairment Charges: Add back (one-time, non-cash)

#### Subtract Capital Expenditures (CapEx)

**What is CapEx?**
- Cash spent on PP&E (Property, Plant & Equipment)
- Buildings, machinery, vehicles, computers
- Appears on Cash Flow Statement (Investing Activities)

**Maintenance vs. Growth CapEx**
- **Maintenance:** Keep business running (replace worn equipment)
  - Rule of thumb: Maintenance CapEx ≈ Depreciation Expense
- **Growth:** Expand capacity (new factories, stores)
  - Growth CapEx = Total CapEx - Depreciation

**CapEx Forecasting Methods**

**Method 1: % of Revenue**
```
CapEx = Revenue × CapEx %

Historical average: 5-year avg CapEx / Revenue
Adjust for growth phase: Higher % for growth, lower for mature
```

**Method 2: Maintenance + Growth**
```
Maintenance CapEx = Depreciation (from P&L)
Growth CapEx = (Revenue Growth % × CapEx Intensity)
Total CapEx = Maintenance + Growth
```

**Method 3: PP&E Turnover**
```
PP&E Turnover = Revenue / Net PP&E
Implied Net PP&E = Revenue / Turnover
CapEx = Change in Net PP&E + Depreciation
```

**Industry Benchmarks (CapEx % of Revenue):**
- SaaS: <5% (asset-light)
- Retail: 2-4% (stores, fixtures)
- Manufacturing: 5-8% (factories, equipment)
- Automotive: 6-10% (Tesla, GM, Ford)
- Telecom: 15-20% (infrastructure-heavy)
- Real Estate: >20% (property development)

#### Subtract Change in Net Working Capital

**Net Working Capital (NWC) Definition**
```
NWC = Current Operating Assets - Current Operating Liabilities
    = (AR + Inventory + Prepaid) - (AP + Accrued Expenses + Deferred Revenue)

Exclude: Cash, Short-term Investments, Short-term Debt
```

**Change in NWC**
```
Change in NWC = NWC(Year t) - NWC(Year t-1)

If NWC increases: Use of cash (subtract from FCF)
If NWC decreases: Source of cash (add to FCF)
```

**Why NWC Matters:**
- Growing companies need more working capital (build AR, Inventory)
  - Example: Tesla grows 50%, needs to build inventory → Cash outflow
- Mature companies can release working capital (efficiency gains)
  - Example: Amazon/Costco with negative CCC → Cash inflow

**NWC Forecasting Methods**

**Method 1: % of Revenue (Simple)**
```
NWC = Revenue × NWC %

Historical NWC %: Last 5 years average
Forecast NWC each year: Revenue × NWC %
Change in NWC = NWC(t) - NWC(t-1)
```

**Method 2: Days-Based (Preferred)**
```
AR = (DSO / 365) × Revenue
Inventory = (DIO / 365) × COGS
AP = (DPO / 365) × COGS
Accrued = (Days / 365) × OpEx
Deferred Revenue = (Days / 365) × Revenue (SaaS)

NWC = AR + Inventory - AP - Accrued + Deferred
```

**Perpetuity NWC Assumption:**
- In terminal value, assume NWC growth = Revenue growth
- Change in NWC = NWC × Perpetuity Growth Rate

#### FCF Example: Tesla Simplified

**Inputs ($ millions):**
- Revenue: $100,000
- EBIT Margin: 10% → EBIT = $10,000
- Tax Rate: 25%
- D&A: $3,000
- CapEx: $8,000 (8% of revenue)
- NWC as % of Revenue: 5% (Year 0: $4,500, Year 1: $5,000)

**Calculation:**
```
EBIT                           $10,000
× (1 - 25% Tax Rate)              0.75
= NOPAT                         $7,500
+ D&A                           $3,000
- CapEx                        ($8,000)
- Change in NWC ($5,000-$4,500)  ($500)
= Unlevered Free Cash Flow      $2,000
```

**Interpretation:**
- Positive FCF: $2B available to investors
- Low FCF relative to EBIT: High growth (heavy CapEx + WC investment)
- Mature phase: CapEx ≈ D&A, minimal NWC growth → Higher FCF

**Activity 3.1.1:** Build FCF Model (Detailed)
- Use your integrated P&L from Unit 2
- Forecast CapEx using 2 methods (% of revenue, maintenance + growth)
- Forecast NWC using days-based method
- Calculate FCF for Years 1-5 and Terminal Year
- Compare to historical FCF: Is FCF improving?
- **Deliverable:** FCF Forecast Excel with sensitivity table

#### FCF Quality Metrics

**1. FCF Margin**
```
FCF Margin = FCF / Revenue
```
- >10% is excellent (strong cash generation)
- 5-10% is good
- <5% is weak (high reinvestment needs)
- Negative: Burning cash (growth or distress?)

**2. FCF Conversion**
```
FCF Conversion = FCF / EBITDA
```
- >70% is excellent
- 50-70% is good
- <50% is concerning (high CapEx or WC needs)

**3. FCF Yield**
```
FCF Yield = FCF / Enterprise Value
```
- >8%: Undervalued or risky?
- 5-8%: Fair value range
- <5%: Overvalued or high growth expectations?
- Compare to 10-year Treasury yield (risk-free rate)

**Activity 3.1.2:** FCF Quality Analysis
- Calculate FCF Margin, Conversion, Yield for your company
- Compare to 3 peers in same industry
- Memo: Is your company's FCF quality strong or weak? Why?

### 3.2 WACC (Weighted Average Cost of Capital) - Master Class (4-5 hours)

#### The WACC Formula
```
WACC = (E/V) × Cost of Equity + (D/V) × Cost of Debt × (1 - Tax Rate)

Where:
E = Market Value of Equity
D = Market Value of Debt
V = E + D (Enterprise Value)
E/V = Equity weight
D/V = Debt weight
```

**Why WACC?**
- Represents the blended cost of capital (debt + equity)
- Discount rate for unlevered free cash flows
- Hurdle rate for investments (projects must return > WACC)

#### Component 1: Market Value of Equity (E)

**Calculation:**
```
Market Value of Equity = Share Price × Diluted Shares Outstanding
```

**Where to Find:**
- Share Price: Current stock price (Yahoo Finance, Bloomberg)
- Shares Outstanding: Latest 10-Q/10-K or IR deck
- **Use Diluted Shares:** Include options, RSUs, convertibles

**Example: Tesla (October 2025)**
```
Share Price: $250
Diluted Shares: 3,200 million
Market Value of Equity = $250 × 3,200M = $800B
```

**Preferred Stock (If Applicable):**
- Add market value of preferred stock to equity
- Rare for most companies (utilities, REITs, banks)

#### Component 2: Market Value of Debt (D)

**Debt Components:**
1. Short-term Debt (current portion of LT debt)
2. Long-term Debt (bonds, term loans, revolving credit)
3. Capital Leases / Finance Leases (ASC 842)
4. Operating Leases (debatable - conservative to include)

**Market Value vs. Book Value:**
- **Book Value:** Carrying value on balance sheet
- **Market Value:** Present value of future debt payments at current market rates
  - If company is healthy: Market Value ≈ Book Value
  - If distressed: Market Value < Book Value
- **Best Practice:** Use Book Value for simplicity (unless bonds trade publicly)

**Example: Tesla Debt (from 10-K)**
```
Short-term Debt:              $2B
Long-term Debt:              $3B
Finance Lease Liabilities:   $1B
Total Debt:                  $6B
```

**Adjustments:**
- **Cash:** Some analysts use Net Debt (Debt - Cash)
  - **Argument:** Excess cash reduces effective leverage
  - **Counter:** Cash may be needed for operations (not truly excess)
  - **Best Practice:** Use Gross Debt in WACC calculation

**Activity 3.2.1:** Capital Structure Calculation
- Find market value of equity (current price × shares)
- Find book value of debt (from latest 10-K)
- Calculate: E/V and D/V
- Does company have more equity or debt financing?

#### Component 3: Cost of Equity (Re)

**The Capital Asset Pricing Model (CAPM)**
```
Cost of Equity (Re) = Rf + Beta × (Rm - Rf)

Where:
Rf = Risk-Free Rate (10-year Treasury yield)
Beta = Stock's sensitivity to market movements
Rm - Rf = Equity Risk Premium (ERP)
```

**Step 1: Risk-Free Rate (Rf)**

**What to Use:**
- 10-year US Treasury yield (for US companies)
- **As of October 2025:** ~4.5% (check current FRED data)
- **Logic:** Long-term, default-free rate
- **Not:** 3-month T-bill (too short), 30-year (too long)

**Where to Find:**
- FRED (Federal Reserve Economic Data): fred.stlouisfed.org
- Bloomberg: GT10 Govt
- Treasury.gov

**Step 2: Beta (β)**

**Definition:**
```
Beta = Covariance(Stock Returns, Market Returns) / Variance(Market Returns)

Beta = 1.0: Stock moves with market (S&P 500)
Beta > 1.0: Stock more volatile than market (Tesla β ≈ 2.0)
Beta < 1.0: Stock less volatile than market (Utilities β ≈ 0.5)
```

**Where to Find Beta:**
- Bloomberg: BETA function
- Yahoo Finance: Statistics tab
- Damodaran Online: Industry average betas
- CapitalIQ: Levered/Unlevered beta

**Types of Beta:**

**1. Levered Beta (Raw Beta)**
- Reflects company's current capital structure (debt)
- What you see on Bloomberg/Yahoo Finance
- Use if: Assuming capital structure stays constant

**2. Unlevered Beta (Asset Beta)**
```
Unlevered Beta = Levered Beta / [1 + (1 - Tax Rate) × (D/E)]

Where D/E = Debt / Equity ratio
```
- Removes effect of leverage
- Use if: Assuming capital structure will change
- Relever to target capital structure:
```
Relevered Beta = Unlevered Beta × [1 + (1 - Tax Rate) × (Target D/E)]
```

**Regression Beta vs. Peer Beta:**
- **Regression:** Historical stock returns vs. S&P 500
  - Pros: Company-specific
  - Cons: Backward-looking, noisy for young/volatile companies
- **Peer Average:** Average beta of comparable companies
  - Pros: Smoother, reduces idiosyncratic noise
  - Cons: May not reflect company's unique risk
- **Best Practice:** Use regression beta, sanity-check vs. peers

**Activity 3.2.2:** Beta Calculation
- Find levered beta for your company (Yahoo Finance)
- Calculate unlevered beta
- Find betas for 5 peer companies
- Compare: Is your company more/less risky than peers?

**Step 3: Equity Risk Premium (ERP)**

**Definition:**
```
ERP = Expected Return on Market - Risk-Free Rate
    = Rm - Rf
```
- Extra return investors demand for investing in stocks vs. bonds
- **Historical ERP:** S&P 500 returns - T-bill returns (1926-2024: ~8%)
- **Implied ERP:** From current stock prices and earnings forecasts

**What to Use:**
- **Damodaran's ERP (2025):** 5.5% for US equities
- **Historical Average:** 6-8%
- **CFA Recommended:** 5-7%
- **Best Practice:** Use 6% (middle ground)

**Country Risk Premium (For Foreign Companies):**
```
ERP_Country = ERP_US + Country Risk Premium
```
- Emerging markets: Add 2-5% (higher political/economic risk)
- Developed markets: Use US ERP or add 0-1%

**Activity 3.2.3:** Cost of Equity Calculation
- Rf = 4.5% (current 10-year Treasury)
- Beta = Your company's beta
- ERP = 6%
- Calculate: Re = Rf + Beta × ERP
- Example: If Beta = 1.5, Re = 4.5% + 1.5 × 6% = 13.5%

**Alternative: Fama-French 3-Factor Model**
```
Re = Rf + Beta_Market × ERP + Beta_Size × SMB + Beta_Value × HML

Where:
SMB = Small Minus Big (size premium)
HML = High Minus Low (value premium)
```
- More accurate but more complex
- Use if: Small-cap or value stock

#### Component 4: Cost of Debt (Rd)

**Calculation Methods**

**Method 1: Interest Expense / Total Debt (Simplest)**
```
Cost of Debt = Interest Expense / Average Debt Balance

Example:
Interest Expense (from P&L): $300M
Average Debt: ($5B + $6B) / 2 = $5.5B
Cost of Debt = $300M / $5.5B = 5.45%
```

**Method 2: Yield to Maturity (YTM) on Bonds**
- If company has publicly traded bonds:
  - Find bond prices and coupons on Bloomberg/TRACE
  - Calculate YTM (discount rate that equates bond price to PV of cash flows)
- Use weighted average YTM across all bonds

**Method 3: Synthetic Rating Approach**
```
1. Calculate Interest Coverage Ratio = EBIT / Interest Expense
2. Map to credit rating (S&P/Moody's scale)
3. Find yield for that rating (from credit spread data)
```

**Credit Rating Scale:**
```
Interest Coverage    Rating    Typical Spread
>8.5x               AAA        +0.50%
6.5-8.5x            AA         +0.75%
5.5-6.5x            A+         +1.00%
4.5-5.5x            A          +1.25%
3.5-4.5x            A-         +1.50%
3.0-3.5x            BBB+       +2.00%
2.5-3.0x            BBB        +2.50%
2.0-2.5x            BBB-       +3.00%
1.5-2.0x            BB+        +4.00%
<1.5x               BB or lower +5-10%
```

**Pre-Tax vs. After-Tax:**
- WACC formula uses: Rd × (1 - Tax Rate)
- Interest is tax-deductible → Debt is cheaper after-tax
- **Tax Shield:** Rd × T × D (value of interest deductibility)

**Activity 3.2.4:** Cost of Debt Calculation
- Find interest expense and debt from 10-K
- Calculate implied cost of debt
- Calculate interest coverage ratio
- Map to credit rating and check reasonableness
- Calculate after-tax cost of debt: Rd × (1 - T)

#### Putting It All Together: WACC Calculation

**Example: Tesla WACC (October 2025)**

**Inputs:**
- Market Value of Equity (E): $800B
- Market Value of Debt (D): $6B
- Enterprise Value (V): $806B
- Cost of Equity (Re): 13.5% (Rf 4.5% + Beta 1.5 × ERP 6%)
- Cost of Debt (Rd): 5.5%
- Tax Rate (T): 25%

**Capital Structure:**
```
E/V = $800B / $806B = 99.3%
D/V = $6B / $806B = 0.7%
```

**WACC:**
```
WACC = (E/V) × Re + (D/V) × Rd × (1 - T)
     = 0.993 × 13.5% + 0.007 × 5.5% × (1 - 0.25)
     = 13.4% + 0.03%
     = 13.4%
```

**Interpretation:**
- Tesla is 99.3% equity-financed (very low leverage)
- WACC ≈ Cost of Equity (debt is negligible)
- High WACC reflects high beta (volatile stock)
- Projects must return >13.4% to create value

**Activity 3.2.5:** Calculate Full WACC
- Combine all components: E, D, Re, Rd, T
- Calculate WACC
- Compare to peers: Higher or lower?
- Sensitivity analysis: How does WACC change if:
  - Beta increases/decreases by 0.2?
  - Debt increases to 30% of capital?
  - Risk-free rate changes ±1%?
- **Deliverable:** WACC Calculation Excel with sensitivities

**WACC Best Practices:**

**1. Use Current Market Data**
- Stock price TODAY (not historical average)
- Current Treasury yield (not historical)
- Current beta (2-5 year regression)

**2. Forward-Looking Assumptions**
- If company is deleveraging: Use target capital structure
- If beta is trending: Use projected beta

**3. Sanity Checks**
- WACC should be: Rf < WACC < Re (between risk-free and cost of equity)
- Compare to industry peers: Within 1-2% is reasonable
- High-growth companies: WACC 10-15%
- Mature companies: WACC 7-10%
- Utilities: WACC 5-7%

### 3.3 Terminal Value - The Most Important Number (3-4 hours)

**Why Terminal Value Matters:**
- Typically represents 60-80% of total enterprise value
- Small changes in assumptions = Large valuation swings
- **The single biggest driver of DCF value**

#### Method 1: Perpetuity Growth (Gordon Growth Model)

**Formula:**
```
Terminal Value = FCF(Terminal Year) × (1 + g) / (WACC - g)

Where g = Perpetuity Growth Rate (forever!)
```

**Perpetuity Growth Rate (g) Selection:**

**Theoretical Bounds:**
- **Maximum g:** Long-run nominal GDP growth (2-3% for US)
- **Why?** No company can grow faster than economy forever
- **Typical range:** 2.0% to 3.0%

**Conservative Approach:**
- Use g = 2.0% (slightly below GDP)
- Logic: Market share gains/losses offset over long run

**Aggressive Approach:**
- Use g = 3.0% (GDP growth)
- Logic: Company maintains competitive position

**Industry Considerations:**
- **Tech (SaaS):** 2.5-3.0% (secular tailwinds)
- **Consumer Staples:** 2.0-2.5% (stable but slow)
- **Cyclicals (Auto):** 1.5-2.5% (tied to GDP)
- **Declining Industries:** 0-1.5% (structural headwinds)

**Terminal Year FCF:**
- Year 5 or Year 10 (depends on forecast horizon)
- **Key assumption:** Company reaches steady-state by terminal year
  - Stable margins
  - Stable reinvestment rate (CapEx ≈ D&A)
  - Stable growth

**Example: Tesla Terminal Value**

**Inputs:**
- Terminal Year FCF (Year 5): $20B
- Perpetuity Growth (g): 2.5%
- WACC: 13.4%

**Calculation:**
```
Terminal Value = $20B × (1 + 2.5%) / (13.4% - 2.5%)
               = $20.5B / 10.9%
               = $188B
```

**Present Value of Terminal Value:**
```
PV(Terminal Value) = $188B / (1 + 13.4%)^5
                   = $188B / 1.914
                   = $98B
```

**Activity 3.3.1:** Perpetuity Growth Sensitivity
- Calculate terminal value using g = 1.5%, 2.0%, 2.5%, 3.0%
- Calculate PV of each terminal value
- Table: How much does equity value change per 0.5% change in g?
- Memo: What's your recommended g and why?

#### Method 2: Exit Multiple

**Formula:**
```
Terminal Value = Terminal Year EBITDA × Exit Multiple

Where Exit Multiple = EV/EBITDA multiple
```

**Exit Multiple Selection:**

**Approach 1: Historical Company Multiple**
- Use company's current or historical average EV/EBITDA
- Logic: Market will value company similarly in future
- **Risk:** Multiples compress if growth slows

**Approach 2: Peer Average Multiple**
- Use median EV/EBITDA of comparable companies TODAY
- Logic: Company will trade in line with peers
- **Best Practice:** Most common approach

**Approach 3: Implied Multiple from Perpetuity Growth**
```
Implied EV/EBITDA = (1 - g / ROIC) / (WACC - g)

Where ROIC = Return on Invested Capital
```
- Use this to cross-check: Does exit multiple make sense?

**Typical Multiples by Industry (2025):**
- **SaaS:** 10-15x EBITDA (high growth, recurring revenue)
- **Consumer Staples:** 12-14x EBITDA (stable, predictable)
- **Retail:** 7-10x EBITDA (lower margins, capital intensive)
- **Automotive:** 5-8x EBITDA (cyclical, competitive)
- **Industrials:** 8-12x EBITDA (varies by sub-sector)

**Example: Tesla Terminal Value (Exit Multiple)**

**Inputs:**
- Terminal Year EBITDA (Year 5): $30B
- Exit Multiple: 10x EV/EBITDA (peers: Ford 5x, GM 6x, luxury automakers 10-12x)

**Calculation:**
```
Terminal Value = $30B × 10x = $300B

PV(Terminal Value) = $300B / (1 + 13.4%)^5
                   = $300B / 1.914
                   = $157B
```

**Comparison:**
- Perpetuity Growth Method: PV(TV) = $98B
- Exit Multiple Method: PV(TV) = $157B
- **Difference:** $59B (huge!)

**Which to Use?**
- **Best Practice:** Calculate both, present range
- If difference is large: Indicates valuation uncertainty
- Most analysts use **average of both methods** or **perpetuity growth** (more conservative)

**Activity 3.3.2:** Exit Multiple Analysis
- Find current EV/EBITDA for your company
- Find EV/EBITDA for 5 peers
- Calculate terminal value using:
  - Company's current multiple
  - Peer median multiple
  - 25th and 75th percentile peer multiples
- Compare to perpetuity growth method
- **Deliverable:** Terminal Value Comparison Table

#### Terminal Value Best Practices

**1. Sanity Check: Terminal Value % of Enterprise Value**
- Typical range: 60-80%
- If >90%: Forecast period may be too short
- If <50%: Terminal assumptions may be too conservative

**2. Terminal FCF Margin Check**
```
Terminal FCF Margin = Terminal FCF / Terminal Revenue

Should be reasonable vs. mature peers
```

**3. Implied Perpetuity Growth from Exit Multiple**
```
Implied g = WACC - [(Terminal EBITDA × Multiple - Terminal FCF) / Terminal FCF]
```
- Use to cross-check: Does exit multiple imply reasonable growth?

**4. Documentation**
- **Always** show both methods in your model
- Explain choice of perpetuity growth rate
- Justify exit multiple vs. peers
- Present range (bull/base/bear)

### 3.4 Putting It All Together: Complete DCF Model (2-3 hours)

#### DCF Model Structure

**Step-by-Step Build:**

**1. Forecast Period (Years 1-5)**
```
Year                    1      2      3      4      5
Revenue              100.0  115.0  130.0  145.0  160.0
EBIT                  10.0   13.0   16.0   19.0   22.0
× (1 - Tax Rate)      75%    75%    75%    75%    75%
= NOPAT               7.5    9.8    12.0   14.3   16.5
+ D&A                 3.0    3.5    4.0    4.5    5.0
- CapEx              (8.0)  (7.0)  (6.5)  (6.0)  (5.5)
- Δ NWC              (0.5)  (0.8)  (0.8)  (0.8)  (0.8)
= Unlevered FCF       2.0    5.5    8.7   12.0   15.2
```

**2. Terminal Value (Year 5)**
```
Method 1: Perpetuity Growth
Terminal FCF = $15.2B × (1 + 2.5%) / (13.4% - 2.5%) = $143B

Method 2: Exit Multiple
Terminal EBITDA = $27B × 10x = $270B
- Terminal Net Debt = ($20B)
= Terminal Equity Value = $250B

Average = ($143B + $250B) / 2 = $197B (use this)
```

**3. Discount to Present Value**
```
PV(Year 1 FCF) = $2.0B / (1.134)^1 = $1.8B
PV(Year 2 FCF) = $5.5B / (1.134)^2 = $4.3B
PV(Year 3 FCF) = $8.7B / (1.134)^3 = $6.0B
PV(Year 4 FCF) = $12.0B / (1.134)^4 = $7.3B
PV(Year 5 FCF) = $15.2B / (1.134)^5 = $7.9B
PV(Terminal Value) = $197B / (1.134)^5 = $103B

Sum of PVs = $130.3B (Enterprise Value)
```

**4. Bridge to Equity Value**
```
Enterprise Value         $130.3B
- Net Debt                ($6.0B)  [Debt - Cash]
- Minority Interest        ($0.5B)
- Preferred Stock          $0.0B
+ Investments (if any)     $2.0B
= Equity Value           $125.8B

÷ Diluted Shares          3,200M
= Implied Share Price     $39.31

Current Share Price: $45.00
Upside/(Downside): (12.6%)
```

**5. Sensitivity Tables**

**Two-Way Sensitivity: WACC vs. Perpetuity Growth**
```
                     Perpetuity Growth Rate
WACC        1.5%    2.0%    2.5%    3.0%
11%       $150B   $160B   $172B   $187B
12%       $135B   $143B   $153B   $165B
13%       $122B   $129B   $137B   $147B  ← Base Case
14%       $111B   $117B   $124B   $132B
15%       $101B   $106B   $112B   $119B
```

**Two-Way Sensitivity: Terminal EBITDA Multiple vs. Terminal EBITDA**
```
              Terminal Year EBITDA
Multiple      $25B    $27B    $30B    $32B
8x           $110B   $118B   $130B   $138B
9x           $120B   $129B   $142B   $151B
10x          $130B   $140B   $155B   $165B  ← Base Case
11x          $140B   $151B   $167B   $178B
12x          $150B   $162B   $180B   $192B
```

**Activity 3.4:** Build Complete DCF Model
- Integrate all components (FCF, WACC, Terminal Value)
- Build formula-driven model (no hardcodes!)
- Create 2-way sensitivity tables
- Build football field chart (see next section)
- **Deliverable:** Complete DCF Model Excel

### 3.5 Football Field Valuation Chart (1 hour)

**What is a Football Field?**
- Visual summary of valuation methodologies
- Shows range of values from different approaches
- Called "football field" because horizontal bars resemble field
- **Key use:** Investment committee presentations, pitch books

**Components:**

**1. DCF Valuation**
```
[■■■■■■■■] $35 - $45
```
- Low: Bear case (WACC high, g low)
- High: Bull case (WACC low, g high)
- Midpoint: Base case

**2. Comparable Companies (Trading Multiples)**
```
[■■■■■■] $30 - $42
```
- Based on peer EV/EBITDA, EV/Revenue, P/E multiples
- Apply to company's metrics

**3. Precedent Transactions (M&A Multiples)**
```
[■■■■■■■■] $38 - $50
```
- Based on acquisition multiples in industry
- Typically higher than trading multiples (control premium)

**4. LBO Analysis (If Applicable)**
```
[■■■■■] $32 - $40
```
- What price could a PE firm pay and achieve target return?

**5. Current Share Price**
```
          ▼
         $45 (Current)
```

**Example Football Field:**
```
Valuation Methodology              Implied Share Price Range
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DCF (Perpetuity Growth)    [■■■■■■■■■■] $35 - $45
DCF (Exit Multiple)         [■■■■■■■■■■■■] $40 - $52
EV/EBITDA Multiples         [■■■■■■■■] $32 - $44
EV/Revenue Multiples        [■■■■■■■] $30 - $40
P/E Multiples               [■■■■■■■■] $33 - $43
Precedent Transactions      [■■■■■■■■■■■■■] $42 - $55
52-Week Trading Range       [■■■■■■■■■■■■■■■■■■] $30 - $55
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Price: $45          ▲
Average of Methodologies: $42 (6.7% upside)
```

**Activity 3.5:** Build Football Field
- Create horizontal bar chart in Excel
- Include all valuation methodologies
- Show current price with marker
- **Deliverable:** Football Field Chart (Copy to PowerPoint for presentation)

**Deliverables - Unit 3 (DCF Complete):**
- FCF Model with 5-year forecast
- WACC Calculation with sensitivities
- Terminal Value (both methods)
- Complete DCF Model with formula logic
- Sensitivity tables (2-way)
- Football Field Valuation Chart
- **Investment Memo:** 2 pages with DCF recommendation

---

## Next: Unit 4 - Comparable Companies & Precedent Transactions (12-15 hours)

This DCF unit is complete and ready for implementation. Should I continue with:
1. **Unit 4: Public Comps & Precedent Transactions** (includes M&A analysis)
2. **Unit 5: LBO Modeling** (Leveraged Buyouts)
3. **Credit Analysis Module** (for debt structuring advisory)
4. **All of the above** (make it completely comprehensive)

