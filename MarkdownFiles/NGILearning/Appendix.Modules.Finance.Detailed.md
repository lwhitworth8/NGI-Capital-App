# Finance & Valuation Modules - Super In-Depth Expansion
**Last Updated:** October 2, 2025  
**Purpose:** Comprehensive finance & valuation curriculum for NGI Capital Learning Module  
**Target:** Prepare students to build banker-grade DCF models and comps analysis  
**Animations:** Manim-powered 3Blue1Brown-style visualizations throughout (see Appendix.Manim.Animations.md)

## Finance & Valuation (40-50 hours)

**Duration:** 8-12 weeks  
**Format:** Excel-heavy with Word memos, real company models, interactive DCF builder  
**Textbook References:**
- "Investment Valuation" by Aswath Damodaran (4th Edition, 2024)
- "Valuation: Measuring and Managing the Value of Companies" by McKinsey (8th Edition)
- "Investment Banking: Valuation, Leveraged Buyouts, and M&A" by Rosenbaum & Pearl (3rd Edition)
- "Financial Modeling" by Simon Benninga (5th Edition)
- CFA Level 2 Equity Valuation curriculum (2025)

### Unit 1: Revenue Drivers & Projections (10-12 hours)

**Manim Animations:** 
- `Revenue_Drivers_TSLA` (7 min) — Tesla Q × P buildup with quarterly data
- `Revenue_Drivers_COST` (6 min) — Costco membership + merchandise model
- `Revenue_Drivers_SHOP` (7 min) — Shopify GMV × Take-rate + Subscriptions

**Learning Objectives:**
- Decompose revenue into Quantity × Price (× Take-rate where applicable)
- Build revenue models that tie to reported financials within ±1-2%
- Forecast revenue drivers with defensible assumptions
- Understand seasonality, cyclicality, and growth drivers
- Document variance explanations (FX, reclass, contra-revenue)

#### 1.1 Revenue Driver Framework (3 hours)

**The Q × P Foundation**
```
Revenue = Quantity × Price
```
- **Quantity:** Units sold, transactions, customers, bookings
- **Price:** ASP (average selling price), ARPU, take-rate, price per unit
- **Why it matters:** Revenue is an outcome, drivers are inputs we can forecast

**Industry-Specific Revenue Models**

**1. Automotive (Tesla)**
```
Revenue = Deliveries by Model × Average Selling Price by Model
Model S/X: 50K deliveries × $95K ASP = $4.75B
Model 3/Y: 400K deliveries × $48K ASP = $19.2B
Total Automotive Revenue = $23.95B
```
- **Drivers to forecast:**
  - Production capacity (factory utilization)
  - Demand by region (China, US, Europe)
  - Pricing actions (discounts, incentives)
  - Mix shift (luxury vs. mass market)
- **Data sources:** Tesla IR deck (quarterly deliveries), SEC filings

**2. Marketplace (Uber, Airbnb)**
```
Revenue = Gross Bookings × Take Rate
Uber Mobility: $35B Gross Bookings × 20% take rate = $7B Revenue
Uber Eats: $25B Gross Bookings × 10% take rate = $2.5B Revenue
```
- **Gross Bookings = Trips × Average Fare**
  - Trips growth: Active users × frequency × retention
  - Average Fare: Distance, surge pricing, region mix
- **Take Rate:**
  - Driver incentives reduce take rate
  - Insurance, fees increase take rate
  - Competitive dynamics (DoorDash, Lyft)

**3. SaaS (Shopify)**
```
Subscription Revenue = Subscribers × ARPU (Average Revenue Per User)
Merchant Solutions = GMV × Take Rate

Total Revenue = Subscription + Merchant Solutions
```
- **Subscription drivers:**
  - Monthly Recurring Revenue (MRR) = Subscribers × Monthly Price
  - Churn rate: % of subscribers who cancel
  - Expansion revenue: Upsells to higher tiers
- **GMV drivers:**
  - Gross Merchandise Volume = Merchants × GMV per Merchant
  - Attach rates: Payments, Shipping, Capital

**4. Retail (Costco)**
```
Merchandise Revenue = Traffic × Average Ticket
Membership Revenue = Members × Membership Fee
```
- **Traffic drivers:**
  - Warehouse count × Average traffic per warehouse
  - Seasonal patterns (holidays)
- **Average Ticket:**
  - Basket size (items per transaction)
  - Mix shift (fresh food vs. electronics)
- **Membership:**
  - New member acquisition
  - Renewal rates (90%+ is healthy)
  - Fee increases (rare but impactful)

**5. Beverages (Coca-Cola)**
```
Revenue = Unit Case Volume × Price per Unit Case
Price/Mix effects from:
- Geographic mix (developed vs. emerging)
- Brand mix (Coke vs. Sprite vs. Minute Maid)
- Package mix (fountain vs. bottles vs. cans)
- Pricing actions (list price increases)
```

**Interactive Exercise 1.1:** Build Revenue Model for Your Company
- Identify Q and P drivers from IR deck
- Extract historical data (last 5 years)
- Calculate implied growth rates, ASPs, take rates
- Reconcile to reported revenue (must be within ±1-2%)
- Excel template with driver map

#### 1.2 Historical Analysis & Data Extraction (2-3 hours)

**Where to Find Driver Data**

**SEC Filings (10-K, 10-Q)**
- Revenue by segment
- Geographic revenue breakdown
- Unit sales (if disclosed)
- Same-store sales (retail)
- Key metrics (subscribers, GMV, etc.)
- **Location:** Item 7 (MD&A), Item 8 (Financial Statements), Footnotes

**Investor Relations (IR) Decks**
- Quarterly metrics supplements
- Key operating metrics
- Cohort data (for SaaS/marketplace)
- Forward guidance
- **Location:** Company investor relations website

**Earnings Transcripts**
- Management commentary on drivers
- Q&A with analysts
- Guidance and outlook
- **Source:** Seeking Alpha, company IR site

**Data Extraction Workflow (pdfplumber)**
```python
import pdfplumber

with pdfplumber.open("tesla_q3_2024_update.pdf") as pdf:
    for page in pdf.pages:
        tables = page.extract_tables()
        # Find deliveries table
        # Find ASP table
        # Extract to structured data
```

**Activity 1.2:** Extract Historical Drivers
- Download last 8 quarters of IR decks for chosen company
- Extract key drivers (Q, P, take-rate, etc.)
- Build time series in Excel
- Calculate QoQ and YoY growth rates
- Plot trends: Accelerating or decelerating?
- Deliverable: Drivers Database (Excel)

#### 1.3 Revenue Forecasting Methodology (3-4 hours)

**Forecasting Approaches**

**1. Bottom-Up (Preferred for Granular Businesses)**
- Forecast each segment/product independently
- Aggregate to total revenue
- Example: Tesla by model (S/X, 3/Y, Cybertruck)

**2. Top-Down (Market Sizing)**
- Total Addressable Market (TAM)
- Market Share assumptions
- Revenue = TAM × Market Share
- **Use case:** New products, emerging markets

**3. Driver-Based (Hybrid)**
- Combine market trends with company-specific drivers
- Example: Uber trips = (US rideshare market growth 10%) × (Uber share 70%)

**Growth Rate Analysis**

**Historical Growth Decomposition**
```
Revenue Growth = Volume Growth + Price Growth + Mix Shift + FX Impact
```
- **Volume:** Units sold growth
- **Price:** Price increases, discounts
- **Mix:** Product/geographic mix changes
- **FX:** Currency translation effects

**Forecasting Frameworks**

**Year 1-2 (Near-term):**
- Use management guidance as anchor
- Adjust for your own view (more/less conservative)
- Consider recent trends (momentum)

**Year 3-5 (Medium-term):**
- Regression to industry growth rates
- Capacity constraints (can't grow faster than production)
- Competitive dynamics (market share gains/losses)
- Maturity S-curve (high growth → moderate growth)

**Terminal Year (Year 6+):**
- Long-run GDP growth (2-3% for developed economies)
- Or perpetuity growth rate in DCF (typically 2-3%)

**Scenario Analysis**
- **Base Case:** Most likely outcome (50% probability)
- **Bull Case:** Optimistic scenario (25% probability)
- **Bear Case:** Pessimistic scenario (25% probability)
- Probability-weight scenarios for expected value

**Interactive Tool:** Revenue Forecasting Simulator
- Input: Historical drivers, growth assumptions
- Output: Forecasted revenue with sensitivity table
- Validation: Does forecast make sense vs. peers?

**Activity 1.3:** Build 5-Year Revenue Forecast
- Use historical drivers from Activity 1.2
- Develop assumptions for each driver
- Build base/bull/bear cases
- Document assumptions in memo:
  - Why these growth rates?
  - What could go wrong?
  - What upside opportunities?
- Excel deliverable with scenario tables

#### 1.4 Revenue Model Validation & Variance Analysis (2 hours)

**Reconciliation to Reported Revenue**
```
Modeled Revenue (Q × P)
± FX Translation Impact
± Reclassifications
± Contra-Revenue (returns, discounts)
= Reported Revenue
```
- **Target:** Within ±1-2% of reported
- **If variance >2%:** Document explanation

**Variance Attribution**
```
Actual Revenue - Forecasted Revenue = Total Variance

Volume Variance = (Actual Q - Forecast Q) × Forecast P
Price Variance = (Actual P - Forecast P) × Actual Q
Mix Variance = Residual
```

**Common Variance Drivers**
- **FX:** Strong dollar reduces foreign revenue (USD terms)
- **Reclass:** Segment reclassifications (rare)
- **Contra-Revenue:** Higher returns, larger discounts
- **Timing:** Revenue recognized in different period (deal slippage)

**Red Flags in Revenue Forecasts**
- Growth rates faster than market (without justification)
- Ignoring competitive threats
- Overstating pricing power
- Unrealistic market share gains
- No sensitivity analysis

**Activity 1.4:** Revenue Variance Memo
- Compare your forecast to actual results (if available)
- OR compare company guidance to actual results
- Attribute variance to drivers (volume, price, FX)
- Memo: What did you learn? How would you adjust forecast?

**Deliverables - Unit 1:**
- Revenue Driver Model (Excel with Q × P decomposition)
- Historical Drivers Database (8+ quarters of data)
- 5-Year Revenue Forecast (Base/Bull/Bear scenarios)
- Variance Analysis Memo (1-2 pages)

---

### Unit 2: Operating Model & Margin Forecasting (8-10 hours)

**Learning Objectives:**
- Forecast COGS, OpEx, and margins with driver-based logic
- Understand operating leverage and fixed/variable costs
- Build integrated P&L from revenue down to net income
- Model D&A, stock comp, interest, taxes
- Calculate EBITDA, Adjusted EBITDA, and Free Cash Flow

#### 2.1 Cost of Goods Sold (COGS) Forecasting (2 hours)

**COGS as % of Revenue (Gross Margin Method)**
```
Gross Margin = (Revenue - COGS) / Revenue
COGS = Revenue × (1 - Gross Margin %)
```
- **Historical analysis:** What's normal gross margin?
- **Trend:** Improving or declining? Why?
- **Forecast:** Assume stable, improving, or declining

**Driver-Based COGS (Preferred)**

**Manufacturing (Tesla):**
```
COGS per Vehicle = Materials + Labor + Overhead + Logistics
Total COGS = Units Delivered × COGS per Unit
```
- **Learning curve:** COGS per unit decreases with volume (economies of scale)
- **Material costs:** Battery cell prices, commodity inputs
- **Labor efficiency:** Automation, process improvements

**Retail (Costco):**
```
COGS = Beginning Inventory + Purchases - Ending Inventory
Purchases = COGS + (Ending Inventory - Beginning Inventory)
```
- **Inventory turns:** COGS / Average Inventory (higher is better)
- **Shrinkage:** Theft, damage (reduce gross margin)

**SaaS (Shopify):**
```
COGS = Hosting Costs + Customer Support + Payment Processing
```
- **Hosting:** AWS, GCP variable costs (scale with GMV/traffic)
- **Support:** Headcount-driven (scale with customers)
- **Payment Processing:** % of GMV (if Shopify Payments used)

**Gross Margin Drivers**
- **Volume:** Higher volume → Lower fixed cost per unit
- **Pricing:** Price increases → Margin expansion
- **Mix:** Premium products → Higher margins
- **Efficiency:** Automation, waste reduction

**Activity 2.1:** Build COGS Model
- Choose driver-based approach for your company
- Forecast COGS for next 5 years
- Calculate implied gross margin
- Sensitivity table: Gross margin vs. volume and price

#### 2.2 Operating Expenses (OpEx) Forecasting (2-3 hours)

**OpEx Categories**
1. R&D (Research & Development)
2. Sales & Marketing (S&M)
3. General & Administrative (G&A)
4. Depreciation & Amortization (D&A)
5. Stock-Based Compensation (SBC)

**Forecasting Methods**

**1. % of Revenue (Simple)**
```
R&D = Revenue × R&D %
S&M = Revenue × S&M %
G&A = Revenue × G&A %
```
- **Pros:** Easy, stable ratios
- **Cons:** Ignores operating leverage

**2. Fixed + Variable (Better)**
```
OpEx = Fixed OpEx + (Variable OpEx % × Revenue)
```
- **Fixed:** Base salaries, rent, corporate overhead
- **Variable:** Sales commissions, marketing spend (scales with revenue)

**3. Headcount-Driven (Most Granular)**
```
R&D = # R&D Employees × Avg R&D Salary × (1 + Benefits %)
+ Non-Headcount R&D (software, equipment)
```

**Operating Leverage**
- **Definition:** Revenue grows faster than OpEx → Margin expansion
- **SaaS Example:** Shopify adds merchants without proportional S&M increase
- **Mature Companies:** OpEx grows slower than revenue (scale benefits)
- **High-Growth:** OpEx may grow faster (invest for future)

**R&D Forecasting**
- **Tech Companies:** 15-25% of revenue (Amazon, Google, Tesla)
- **SaaS:** 20-30% of revenue (early stage), 10-15% (mature)
- **Retail:** <1% of revenue (not R&D intensive)
- **Trend:** R&D % declines as revenue scales (operating leverage)

**S&M Forecasting**
- **SaaS:** 30-50% of revenue (high CAC, land-and-expand)
- **Consumer:** 10-20% of revenue (advertising, promotions)
- **B2B:** 15-25% of revenue (sales force, channel partners)
- **Efficiency:** CAC Payback = CAC / (New MRR × Gross Margin)
  - Target: <12 months

**G&A Forecasting**
- **Typical:** 10-15% of revenue
- **Fixed component:** Executive compensation, audit, legal
- **Scales slowly:** G&A % declines as revenue grows

**Depreciation & Amortization**
- **Depreciation:** PP&E / Useful Life
  - Buildings: 20-40 years
  - Equipment: 5-15 years
  - Computers: 3-5 years
- **Amortization:** Intangibles / Useful Life
  - Software: 3-5 years
  - Customer lists: 5-10 years
  - Patents: 20 years

**Stock-Based Compensation (SBC)**
- **As % of Revenue:** 5-15% for tech companies
- **Dilution:** SBC / Market Cap (2-3% annual dilution is typical)
- **Forecast:** Assume stable % of revenue OR link to headcount growth

**Activity 2.2:** Build OpEx Model
- Forecast R&D, S&M, G&A for next 5 years
- Use fixed + variable approach
- Model D&A from PP&E schedule (build separately)
- Model SBC as % of revenue
- Calculate operating margin trend

#### 2.3 EBITDA & Adjusted EBITDA (1-2 hours)

**EBITDA Calculation**
```
Revenue
- COGS
= Gross Profit
- R&D
- S&M
- G&A
= EBIT (Earnings Before Interest & Taxes)
+ Depreciation & Amortization
= EBITDA
```

**Why EBITDA Matters:**
- Proxy for operating cash flow
- Removes impact of financing (interest) and tax structures
- Used in valuation multiples (EV/EBITDA)
- **Criticism:** Ignores CapEx (not a true cash flow measure)

**Adjusted EBITDA (Non-GAAP)**
```
EBITDA
+ Stock-Based Compensation
+ Restructuring Charges
+ Legal Settlements
+ Acquisition-Related Costs
+ Other One-Time Items
= Adjusted EBITDA
```

**Controversy: Should SBC be added back?**
- **Pro:** Non-cash expense, doesn't affect liquidity
- **Con:** Real cost (dilutes shareholders), recurring (not one-time)
- **Best Practice:** Use GAAP EBITDA for modeling, but understand management's adjustments

**Activity 2.3:** Reconcile to Adjusted EBITDA
- Build GAAP EBITDA from your P&L model
- Find company's reported Adjusted EBITDA (IR deck)
- Reconcile: What adjustments did they make?
- Memo: Do you agree with their adjustments? Too aggressive?

#### 2.4 Below EBIT: Interest, Taxes, Net Income (2-3 hours)

**Interest Expense**
```
Interest Expense = Average Debt Balance × Weighted Average Interest Rate

Average Debt = (Beginning Debt + Ending Debt) / 2
Weighted Avg Rate = Total Interest Expense / Average Debt
```
- **Debt Schedule (build separately):**
  - Beginning Balance
  - + Issuances
  - - Repayments
  - = Ending Balance
- **Interest Coverage:** EBIT / Interest Expense
  - >5x is healthy
  - <2x is risky (potential default)

**Taxes**
- **Effective Tax Rate (ETR):** Tax Expense / Pre-Tax Income
  - US Federal: 21% (2018 tax reform)
  - State: 0-13% (varies by state)
  - Foreign: Varies by country (Ireland 12.5%, China 25%)
- **Cash Tax Rate:** Cash Taxes Paid / Pre-Tax Income
  - Often lower due to deferred taxes (timing differences)
- **NOLs (Net Operating Losses):**
  - Carryforward: Can offset future taxable income
  - Limits: 80% of taxable income per year (post-2018)
  - Creates deferred tax asset on balance sheet

**Tax Forecasting Approaches**
1. **Use historical ETR:** Simple, assumes stable tax structure
2. **Use statutory rate (21%):** Conservative for US companies
3. **Model taxes by jurisdiction:** Granular for multinationals

**Net Income**
```
EBIT
- Interest Expense
= EBT (Earnings Before Taxes)
- Tax Expense
= Net Income

Earnings Per Share (EPS) = Net Income / Diluted Shares Outstanding
```

**Diluted Shares Calculation**
```
Basic Shares Outstanding
+ Dilutive Effect of Options (Treasury Stock Method)
+ Dilutive Effect of Convertible Debt (If-Converted Method)
= Diluted Shares Outstanding
```

**Activity 2.4:** Complete Integrated P&L
- Build debt schedule (borrow assumptions from existing debt)
- Calculate interest expense
- Forecast taxes (use historical ETR)
- Calculate net income and EPS
- **Validation:** Does margin structure make sense vs. peers?

**Deliverables - Unit 2:**
- COGS Model (Excel with gross margin sensitivity)
- OpEx Model (Excel with operating leverage dynamics)
- Adjusted EBITDA Reconciliation (memo critiquing management adjustments)
- Integrated P&L (Excel, revenue → net income)

---

### Unit 3: DCF (Discounted Cash Flow) Valuation (12-15 hours)

**Learning Objectives:**
- Build unlevered free cash flow (FCFF) projections
- Calculate WACC (Weighted Average Cost of Capital)
- Determine terminal value (Perpetuity Growth vs. Exit Multiple)
- Construct sensitivity tables and football field chart
- Understand DCF limitations and when to use it

_(Continuing with super in-depth DCF content...)_

**Note:** This Finance & Valuation expansion is 40-50 hours of content. Should I continue with:
1. DCF methodology (WACC, terminal value, sensitivities)?
2. Comparable Companies Analysis?
3. LBO (Leveraged Buyout) modeling?
4. Create integration document?

