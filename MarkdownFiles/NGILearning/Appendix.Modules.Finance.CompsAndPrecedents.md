# Finance Module - Unit 4: Comps & Precedent Transactions (Complete)
**Duration:** 12-15 hours  
**Last Updated:** October 2, 2025  
**Critical for:** M&A advisory, valuation opinions, fairness opinions at NGI Capital  
**Animations:** Manim-powered 3Blue1Brown-style visualizations (see Appendix.Manim.Animations.md)

## Unit 4: Comparable Companies Analysis & Precedent Transactions - Master Class

**Manim Animations:**
- `Comps_Table_SHOP` (8 min) — Building comparable companies table step-by-step
- `EV_Bridge_Calculation` (6 min) — Market cap to enterprise value bridge
- `Precedent_Transactions_ABNB` (8 min) — M&A deal multiples analysis

**Learning Objectives:**
- Select appropriate peer companies using rigorous screening criteria
- Calculate trading multiples (EV/EBITDA, EV/Revenue, P/E, P/B, etc.)
- Adjust multiples for differences in growth, margins, and risk
- Build comprehensive comparable companies analysis
- Source and analyze precedent M&A transactions
- Calculate transaction multiples and control premiums
- Understand when to use trading vs. transaction multiples
- Deliver valuation memo with comps analysis

**Textbook Deep Dive:**
- Rosenbaum & Pearl Chapter 1 (Comparable Companies Analysis)
- Rosenbaum & Pearl Chapter 3 (Precedent Transactions Analysis)
- Damodaran "Investment Valuation" Chapter 18 (Relative Valuation)
- McKinsey "Valuation" Chapter 11 (Multiples)
- CFA Level 2 Equity: Reading 28 (Market-Based Valuation)

### 4.1 Comparable Companies Analysis (Trading Multiples) (6-8 hours)

#### Why Use Comparable Companies?

**Advantages:**
- Market-based: Reflects current investor sentiment
- Simple: No complex DCF assumptions needed
- Quick: Can value company in hours, not days
- Relative: Shows if company is cheap/expensive vs. peers

**Disadvantages:**
- Assumes market is efficiently pricing peers
- Hard to find perfect comparables
- Doesn't capture company-specific factors
- Multiples can be distorted by M&A speculation

**When to Use:**
- M&A fairness opinions (required for boards)
- Quick valuation for pitch books
- Cross-check for DCF analysis
- Public company benchmarking

#### Step 1: Selecting Comparable Companies (The Most Important Step!)

**Universe Screening Criteria**

**1. Industry/Sector (Must-Have)**
- Same GICS sector code (6-digit ideal, 4-digit minimum)
- Similar business model (not just revenue stream)
- Example: Don't comp Tesla (auto manufacturer) with Uber (mobility platform)

**2. Business Characteristics**
- Similar products/services
- Similar customer base (B2B vs. B2C, enterprise vs. consumer)
- Similar geographies (US, Europe, Asia, Emerging)
- Similar distribution channels

**3. Financial Profile**
- Similar revenue size (±50% is reasonable)
  - Don't comp $100M company with $10B company
- Similar growth rates (high-growth vs. mature)
- Similar margins (EBITDA, operating, net)
- Similar leverage (highly levered vs. unlever

ed)

**4. Other Considerations**
- Public companies only (for trading multiples)
- Sufficient trading volume (avoid illiquid stocks)
- Not in distress (negative EBITDA OK if peers are similar)
- Not acquisition targets (premium built into price)

**Screening Process**

**Step 1: Industry Screen**
```
Start with GICS sector (e.g., 2510 for Autos)
→ Get all public companies in sector (~50-100 companies)
```

**Step 2: Business Model Screen**
```
Filter for similar business model
→ Remove unrelated subsectors (e.g., auto parts if valuing OEM)
→ Remaining: 20-30 companies
```

**Step 3: Size Screen**
```
Filter for revenue within 50-200% of target
→ Remove micro-cap (<$500M market cap) and mega-cap (>$500B)
→ Remaining: 10-15 companies
```

**Step 4: Geography Screen (If Applicable)**
```
Filter for similar geographic exposure
→ Remove if >50% revenue from regions with different dynamics
→ Remaining: 8-12 companies
```

**Step 5: Final Selection**
```
Manual review: Remove outliers, distressed companies, acquisition targets
→ Final comp set: 5-10 companies (ideal)
```

**Example: Tesla Comparable Companies**

**Initial Universe:** 25 global auto manufacturers

**After Screening:**
1. **GM (General Motors)** - US, mass market, similar scale
2. **Ford** - US, mass market, similar scale
3. **BYD** - China, EV focus, high growth
4. **NIO** - China, luxury EV, similar positioning
5. **Rivian** - US, EV startup, similar growth stage
6. **Lucid** - US, luxury EV, similar positioning
7. **Volkswagen** - Germany, mass market + EV push
8. **BMW** - Germany, luxury, EV expansion

**Exclude:**
- Toyota: Too large ($300B+ revenue vs. Tesla $100B)
- Ferrari: Pure luxury, different business model
- Polestar: Too small, not comparable growth
- Fisker: Distressed/bankrupt

**Activity 4.1.1:** Build Comp Set
- Start with your company's GICS sector
- Apply screening criteria
- Justify inclusion/exclusion of each peer
- Target: 5-8 final comps
- **Deliverable:** Comp Selection Memo (1 page)

#### Step 2: Gathering Financial Data

**Required Data Points (Per Company)**

**1. Market Data (As of Valuation Date)**
- Stock Price (current)
- Shares Outstanding (diluted)
- Market Capitalization = Price × Shares
- 52-week high/low (for context)

**2. Balance Sheet Data (Latest Quarter)**
- Total Debt (short-term + long-term)
- Cash & Cash Equivalents
- Preferred Stock (if any)
- Minority Interest (if any)
- Investments (equity method, if any)

**3. Income Statement Data (LTM = Last Twelve Months)**
- Revenue
- EBITDA
- EBIT
- Net Income
- Diluted EPS

**4. Forward Estimates (Consensus from Wall Street)**
- Revenue (NTM = Next Twelve Months, +1Y, +2Y)
- EBITDA (NTM, +1Y, +2Y)
- EPS (NTM, +1Y, +2Y)

**Where to Find Data:**

**Free Sources:**
- Company 10-K/10-Q: SEC EDGAR
- Yahoo Finance: Summary statistics, key metrics
- Google Finance: Basic financials
- Company IR website: Earnings presentations

**Paid Sources (Professional):**
- Bloomberg Terminal: Most comprehensive
- CapitalIQ: Wall Street standard
- FactSet: Excellent for comps screening
- Refinitiv/LSEG: Real-time data

**LTM (Last Twelve Months) Calculation:**
```
If valuation date is October 15, 2025:
- Q3 2025: Just reported (July-Sept)
- Q4 2024, Q1 2025, Q2 2025: Prior quarters

LTM Revenue = Q4'24 + Q1'25 + Q2'25 + Q3'25
```

**Why LTM?**
- Most current data (better than FY 2024)
- Smooths out quarterly seasonality
- Standard practice in investment banking

**Activity 4.1.2:** Build Comps Data Table
- Gather all required data for 5-8 comps
- Calculate LTM metrics
- Get consensus forward estimates (from Yahoo Finance or Bloomberg)
- **Deliverable:** Excel Comps Spread with all data

#### Step 3: Enterprise Value (EV) Calculation

**The Formula (Critical to Get Right!):**
```
Enterprise Value (EV) = Market Cap + Net Debt + Minority Interest + Preferred Stock - Investments

Where:
Market Cap = Stock Price × Diluted Shares Outstanding
Net Debt = Total Debt - Cash & Equivalents
```

**Component-by-Component:**

**1. Market Capitalization**
```
Market Cap = Current Stock Price × Diluted Shares

Use DILUTED shares (includes options, RSUs, convertibles)
Why? These will be exercised if in-the-money
```

**2. Plus: Total Debt**
```
Total Debt = Short-term Debt + Long-term Debt + Finance Lease Liabilities

Include:
- Bonds (at carrying value)
- Term loans
- Revolving credit drawn
- Finance leases (ASC 842)
- Capital leases (pre-2019)

Debate: Operating Leases?
- Conservative: Include (PV of future lease payments)
- Standard: Exclude (rental expense, not debt)
```

**3. Less: Cash & Cash Equivalents**
```
Cash = Cash + Short-term Investments (marketable securities)

Logic: Acquirer would use target's cash to pay down debt
→ Net cost = EV, not Market Cap
```

**4. Plus: Minority Interest (Non-Controlling Interest)**
```
Minority Interest = Portion of subsidiaries owned by others

Example: Parent owns 80% of subsidiary
→ 20% owned by minorities
→ Consolidate 100% of sub's EBITDA
→ Must add minorities to EV (they own 20% of cash flows)
```

**5. Plus: Preferred Stock**
```
Preferred Stock = Liquidation value (from balance sheet)

Logic: Ranks ahead of common equity
→ Must pay off preferreds before common
→ Adds to acquisition cost
```

**6. Less: Equity Investments (If Significant)**
```
Investments = Equity method investments (20-50% ownership)

Example: Tesla owns 20% of a battery company worth $5B
→ Tesla's stake = $1B
→ Acquirer would get this asset
→ Reduces net acquisition cost
```

**Example: Tesla Enterprise Value**

**Market Data (October 2025):**
- Stock Price: $250
- Diluted Shares: 3,200M
- **Market Cap: $800B**

**Balance Sheet (Q3 2025):**
- Total Debt: $6B
- Cash: $25B
- **Net Debt: ($19B)** [Negative = Net Cash]
- Minority Interest: $0.5B
- Preferred Stock: $0
- Investments: $0

**Enterprise Value:**
```
EV = $800B + ($6B - $25B) + $0.5B + $0 - $0
   = $800B - $19B + $0.5B
   = $781.5B
```

**Interpretation:**
- Tesla has net cash position (cash > debt)
- EV < Market Cap (unusual, typically EV > Market Cap)
- Acquirer would "get paid" $19B in excess cash

**Activity 4.1.3:** Calculate EV for All Comps
- Use bridge formula (Market Cap → EV)
- Build summary table showing each component
- Identify outliers (high debt, net cash positions)
- **Deliverable:** EV Calculation Bridge (Excel)

#### Step 4: Calculating Trading Multiples

**Core Multiples (Must Calculate)**

**1. EV / Revenue (or EV / Sales)**
```
EV / Revenue = Enterprise Value / LTM Revenue
```
- **Use when:** Companies are unprofitable (no EBITDA)
- **Industry:** SaaS, high-growth tech, marketplaces
- **Typical ranges:**
  - SaaS (high growth): 5-15x
  - SaaS (mature): 3-7x
  - Retail: 0.3-1.0x
  - Industrials: 0.5-2.0x

**2. EV / EBITDA**
```
EV / EBITDA = Enterprise Value / LTM EBITDA
```
- **Most common multiple** (industry standard)
- **Use when:** Companies are profitable at EBITDA level
- **Typical ranges:**
  - Tech: 15-25x
  - Consumer: 10-15x
  - Industrials: 8-12x
  - Utilities: 6-10x
- **Why popular?** Removes impact of D&A, interest, taxes

**3. EV / EBIT (or EV / Operating Income)**
```
EV / EBIT = Enterprise Value / LTM EBIT
```
- Less common than EV/EBITDA
- Use when capital intensity matters (D&A is real economic cost)

**4. P / E (Price-to-Earnings)**
```
P / E = Stock Price / Diluted EPS

Or: P / E = Market Cap / Net Income
```
- **Use when:** Companies are profitable at net income level
- **Typical ranges:**
  - Growth stocks: 25-50x
  - Market average (S&P 500): 15-20x
  - Value stocks: 10-15x
  - Cyclicals: 5-12x

**5. P / B (Price-to-Book)**
```
P / B = Market Cap / Book Value of Equity
```
- Use for: Banks, insurance, real estate (asset-heavy)
- Less relevant for: Tech, services (asset-light)

**Advanced Multiples (Optional but Impressive)**

**6. EV / Gross Profit**
```
Use for: SaaS companies (shows leverage potential)
```

**7. EV / Unlevered FCF**
```
More accurate than EBITDA (accounts for CapEx and WC)
```

**8. P / Sales**
```
P / Sales = Market Cap / LTM Revenue
Use for: Unprofitable companies with no debt
```

**9. PEG Ratio (Price/Earnings-to-Growth)**
```
PEG = (P/E) / Growth Rate %

Example: P/E = 30x, Growth = 30% → PEG = 1.0x (fair value)
```

**Forward Multiples**
```
EV / NTM EBITDA = EV / Next Twelve Months EBITDA (consensus estimate)

Lower than LTM multiple if company is growing (growing denominator)
```

**Activity 4.1.4:** Calculate All Trading Multiples
- Build comprehensive multiples table (LTM and NTM)
- Calculate for all comps + your target company
- Sort by each multiple to identify outliers
- **Deliverable:** Trading Multiples Table (Excel)

#### Step 5: Analyzing and Interpreting Multiples

**Descriptive Statistics**

**For Each Multiple:**
```
- Mean (average)
- Median (middle value, less affected by outliers)
- 25th Percentile (bottom quartile)
- 75th Percentile (top quartile)
- Min and Max

Recommendation: Use MEDIAN for valuation (more robust)
```

**Identifying Outliers**
- Companies trading >2 standard deviations from mean
- Investigate why (M&A speculation? Distressed? One-time items?)
- Consider excluding from valuation range

**Adjustments to Multiples**

**1. Growth Adjustment**
```
Higher growth companies deserve higher multiples
→ If target grows 30% vs. peer average 15%, apply premium
```

**2. Margin Adjustment**
```
Higher margin companies deserve higher multiples
→ If target has 40% EBITDA margin vs. peer 25%, apply premium
```

**3. Size Adjustment**
```
Smaller companies typically trade at discount (illiquidity, risk)
→ If target is 1/10th size of peers, apply 10-20% discount
```

**4. Geography Adjustment**
```
Emerging market companies trade at discount to developed
→ If target in China vs. US peers, apply country risk discount
```

**Example: Tesla Multiples Analysis**

**Comp Set Multiples (October 2025):**
```
Company         EV/Rev  EV/EBITDA   P/E
GM              0.4x    6.5x        5.2x
Ford            0.3x    5.8x        6.1x
Volkswagen      0.4x    4.2x        4.8x
BMW             0.6x    5.5x        6.8x
BYD             1.2x    15.0x       22.0x
NIO             2.5x    NM          NM
Rivian          3.0x    NM          NM
Lucid           2.8x    NM          NM

Median (All):   1.2x    5.9x        6.1x
Median (EV):    2.6x    15.0x       22.0x
Median (Trad):  0.4x    5.6x        5.7x

Tesla (Actual): 2.5x    26.0x       60.0x
```

**Interpretation:**
- Tesla trades at premium to traditional OEMs (5-10x higher multiples)
- Tesla trades in line with pure EV players
- Tesla's growth (30% vs. 5% for legacy) justifies premium
- **Peer group selection matters!** (EV vs. traditional autos)

**Activity 4.1.5:** Multiples Analysis & Adjustments
- Calculate descriptive statistics (mean, median, quartiles)
- Identify outliers and investigate reasons
- Make adjustments for growth, margins, size
- Justify premium/discount to peers
- **Deliverable:** Multiples Analysis Memo (2 pages)

#### Step 6: Applying Multiples to Target Company

**Valuation Methodology**

**Step 1: Select Multiple Range**
```
Use 25th-75th percentile range (conservative)
Or use mean ± 1 standard deviation
Or use median ± 15%
```

**Step 2: Apply to Target Metrics**
```
Target Revenue: $100B
Peer EV/Revenue range: 1.0x - 1.5x

Implied EV range: $100B - $150B
```

**Step 3: Bridge to Equity Value**
```
Implied EV:             $100B - $150B
- Net Debt:             ($5B)
- Minority Interest:    ($1B)
+ Investments:          $2B
= Implied Equity Value: $96B - $146B

÷ Diluted Shares:       3,200M
= Implied Price/Share:  $30 - $45.63

Current Price: $40
```

**Multiple Valuation Approaches (Show All!)**

**Approach 1: EV / Revenue**
```
Low: $100B × 1.0x = $100B EV → $33 per share
Mid: $100B × 1.25x = $125B EV → $40 per share
High: $100B × 1.5x = $150B EV → $48 per share
```

**Approach 2: EV / EBITDA**
```
Target EBITDA: $15B
Peer range: 10x - 14x

Low: $15B × 10x = $150B EV → $48 per share
Mid: $15B × 12x = $180B EV → $58 per share
High: $15B × 14x = $210B EV → $68 per share
```

**Approach 3: P / E**
```
Target EPS: $3.00
Peer range: 15x - 25x

Low: $3.00 × 15x = $45 per share
Mid: $3.00 × 20x = $60 per share
High: $3.00 × 25x = $75 per share
```

**Triangulation (Combine Approaches)**
```
Method              Low     Mid     High
EV / Revenue       $33     $40     $48
EV / EBITDA        $48     $58     $68
P / E              $45     $60     $75
Average:           $42     $53     $64
```

**Activity 4.1.6:** Apply Multiples to Target
- Select appropriate multiple range (justify choice)
- Calculate implied valuation for each multiple
- Bridge to equity value per share
- Compare to current price and DCF valuation
- **Deliverable:** Trading Comps Valuation Summary (Excel + 1-page memo)

**Final Deliverable - Trading Comps:** Complete Excel Model with:
1. Comp selection screen and rationale
2. Financial data table (all comps)
3. EV calculation bridge
4. Trading multiples table (LTM and NTM)
5. Descriptive statistics and adjustments
6. Valuation summary (implied price range)
7. Football field chart (add to Unit 3 chart)

---

### 4.2 Precedent Transactions Analysis (M&A Multiples) (6-7 hours)

#### Why Precedent Transactions?

**Different from Trading Comps:**
- Reflects **control premium** (acquirer pays extra for 100% ownership)
- Based on **strategic value** (not just public market valuation)
- **Higher multiples** than trading comps (typically 20-40% premium)
- Required for M&A fairness opinions

**When to Use:**
- Sell-side M&A advisory (valuing company for sale)
- Buy-side M&A (determining appropriate bid price)
- Fairness opinions (boards need independent valuation)
- Strategic alternatives analysis

**Limitations:**
- Limited number of comparable transactions
- Deal-specific factors (synergies, desperate seller, competitive auction)
- Data availability (private deals not fully disclosed)
- Time decay (5-year-old deal may not be relevant today)

#### Step 1: Sourcing Precedent Transactions

**Universe Definition**

**Screening Criteria:**
1. **Industry:** Same or adjacent industry as target
2. **Time Period:** Last 3-5 years (more recent = more relevant)
3. **Deal Size:** Within 50-200% of target enterprise value
4. **Deal Type:** Strategic acquisitions (not LBOs, recaps, minority stakes)
5. **Geography:** Similar markets (developed vs. emerging)
6. **Transaction Status:** Closed deals only (pending deals excluded)

**Data Sources**

**Free Sources:**
- Company press releases (acquisition announcements)
- SEC filings: 8-K (material events), S-4 (merger proxy)
- News articles: Wall Street Journal, Bloomberg, Reuters

**Paid Databases (Professional):**
- **CapitalIQ:** Most comprehensive M&A database
- **Merger Market** (by Refinitiv): Detailed deal terms
- **PitchBook:** Strong for private company deals
- **Thomson Reuters / LSEG:** Historical M&A data
- **Bloomberg M&A (MA <GO>):** Real-time deal flow

**Example M&A Search: Tesla Precedent Transactions**

**Search Parameters:**
- Industry: Automotive, EV, Battery technology
- Time: 2020 - 2025
- Size: $500M - $50B enterprise value
- Type: Strategic acquisition (not financial sponsor)

**Results (Hypothetical):**
1. **Ford acquires Argo AI** (2021) - Autonomous driving tech
2. **GM acquires Cruise** (minority stake increase, 2022)
3. **Volkswagen acquires Electrify America stake** (2021)
4. **BYD acquires battery supplier** (2023, China)
5. **BMW acquires charging network** (2024, Europe)
6. **Rivian acquires EV startup** (2023, US)
7. **Lucid acquires battery tech co** (2024, US)

**Filter to Most Relevant:**
- Remove if <$1B (too small)
- Remove if non-core business (e.g., real estate)
- Remove if distressed sale (not market pricing)
- **Final: 4-6 transactions**

**Activity 4.2.1:** Source Precedent Transactions
- Define search criteria for your target
- Use free sources (Google, SEC filings) or paid databases
- Document 5-10 relevant transactions
- **Deliverable:** Precedent Transactions List with rationale

#### Step 2: Gathering Transaction Data

**Required Data Points**

**1. Deal Terms**
- Announcement Date
- Close Date (if closed)
- Acquirer Name
- Target Name
- Deal Value (Equity + Debt assumed)
- Enterprise Value
- Form of Consideration (Cash, Stock, Mixed)
- Transaction Structure (Merger, Stock Purchase, Asset Purchase)

**2. Target Financials (LTM at announcement)**
- Revenue (LTM or prior fiscal year)
- EBITDA (LTM)
- EBIT (if available)
- Net Income (if available)

**3. Forward Projections (If Disclosed)**
- NTM Revenue
- NTM EBITDA
- Management projections (from fairness opinion)

**4. Transaction Multiples (Calculate)**
- EV / Revenue (LTM and NTM)
- EV / EBITDA (LTM and NTM)
- Premium Paid (if target was public)

**Where to Find Data:**

**SEC Filings for US Deals:**
- **8-K (Material Events):** Acquisition announcement, key terms
- **S-4 (Merger Proxy):** Detailed target financials, fairness opinion
- **DEF 14A (Proxy Statement):** For target shareholders, full financials

**Example: S-4 Data Extraction**
```
File: S-4 for Company X acquisition
Page 50: "Historical Financial Information"
→ Target Revenue (LTM): $500M
→ Target EBITDA (LTM): $75M

Page 85: "Fairness Opinion"
→ Valuation methodologies used
→ Comparable transactions cited

Page 120: "Management Projections"
→ NTM Revenue: $600M (20% growth)
→ NTM EBITDA: $90M (20% growth)
```

**Press Release Data**
```
PR: "Acquirer to buy Target for $1.2B"
→ Deal Value: $1.2B
→ Target Debt: $200M (from balance sheet)
→ Enterprise Value: $1.2B + $200M = $1.4B
```

**Activity 4.2.2:** Build Precedent Transactions Spreadsheet
- Gather all required data for 4-6 transactions
- Calculate enterprise values (if not disclosed)
- Organize chronologically (most recent first)
- **Deliverable:** Precedent Trans Data Table (Excel)

#### Step 3: Calculating Transaction Multiples

**Core Transaction Multiples**

**1. EV / LTM Revenue**
```
EV / LTM Revenue = Deal Enterprise Value / Target's LTM Revenue
```

**2. EV / LTM EBITDA**
```
EV / LTM EBITDA = Deal Enterprise Value / Target's LTM EBITDA
```

**3. EV / NTM EBITDA (If Available)**
```
EV / NTM EBITDA = Deal Enterprise Value / Target's Next Twelve Months EBITDA
```

**4. Premium Paid (If Target Was Public)**
```
Premium to Unaffected Price = (Offer Price / Stock Price 1-day before announcement) - 1

Example:
Target stock price (day before): $40
Offer price: $50
Premium: ($50 / $40) - 1 = 25%
```

**Typical Premiums:**
- **Friendly deals:** 20-30%
- **Hostile deals:** 30-50%
- **Competitive auctions:** 40-60%
- **Strategic buyers:** Higher premiums (synergies)
- **Financial sponsors:** Lower premiums (no synergies)

**Example: Precedent Transaction Multiples**

**Deal 1: GM acquires Cruise (minority stake increase)**
```
Date: Q2 2022
Deal Value: $5B (for 20% stake) → Implied EV = $25B
Target Revenue (LTM): $500M
Target EBITDA (LTM): ($100M) [Loss-making]

Multiples:
EV / Revenue: $25B / $500M = 50x
EV / EBITDA: N/M (negative EBITDA)

Note: Sky-high multiple reflects AV/tech platform value, not near-term profitability
```

**Deal 2: Ford acquires Argo AI**
```
Date: Q3 2021
Deal Value: $4B
Target Revenue (LTM): $300M
Target EBITDA (LTM): ($50M) [Loss-making]

Multiples:
EV / Revenue: $4B / $300M = 13.3x
EV / EBITDA: N/M
```

**Precedent Trans Summary Table:**
```
Deal              Date    EV($B)  Rev($M)  EBITDA($M)  EV/Rev  EV/EBITDA
GM/Cruise         Q2'22   $25.0   $500     ($100)      50.0x   N/M
Ford/Argo AI      Q3'21   $4.0    $300     ($50)       13.3x   N/M
VW/Electrify      Q1'21   $2.5    $150     $20         16.7x   125.0x
BMW/Charging      Q2'24   $1.8    $200     $30         9.0x    60.0x

Median:                                                 15.0x   92.5x
```

**Activity 4.2.3:** Calculate Transaction Multiples
- Calculate all relevant multiples for each transaction
- Calculate premiums paid (if applicable)
- Build summary table with statistics
- **Deliverable:** Transaction Multiples Table (Excel)

#### Step 4: Analyzing Transaction Multiples

**Time Decay Adjustment**
```
Older deals may not reflect current market conditions
→ Weight recent deals more heavily
→ Or exclude deals >3 years old
```

**Deal-Specific Factors (Adjust for these):**

**1. Strategic Rationale**
- Synergies: Cost synergies (eliminate redundancies) or Revenue synergies (cross-sell)
- Acquirer paid premium for synergies → May not apply to your target

**2. Competitive Dynamics**
- Auction process: Multiple bidders → Higher multiple
- Sole buyer: Negotiated deal → Lower multiple

**3. Seller Motivation**
- Distressed: Forced sale → Lower multiple
- Strategic review: Maximize value → Higher multiple

**4. Market Conditions**
- Bull market: High multiples, easy financing
- Bear market: Low multiples, tight credit

**5. Buyer Type**
- Strategic: Pays for synergies → Higher multiple
- Financial sponsor (PE): No synergies → Lower multiple

**Outlier Analysis**
```
If a transaction has multiple >2 standard deviations from median:
→ Investigate why (was it a strategic outlier? Desperate seller?)
→ Consider excluding or footnoting
```

**Activity 4.2.4:** Transaction Multiples Analysis
- Identify outlier transactions and explain why
- Adjust for time decay (weight recent deals)
- Adjust for deal-specific factors
- Calculate "normalized" multiple range
- **Deliverable:** Transaction Analysis Memo (1-2 pages)

#### Step 5: Applying Transaction Multiples to Target

**Valuation Methodology**

**Step 1: Select Multiple Range**
```
Use 25th-75th percentile (conservative)
Or use median ± 20% (wider range than trading comps)
```

**Step 2: Apply to Target Metrics**
```
Target Revenue: $100B
Transaction EV/Revenue range: 2.0x - 3.5x (higher than trading comps!)

Implied EV range: $200B - $350B
```

**Step 3: Bridge to Equity Value**
```
Same process as trading comps (EV → Equity Value)
```

**Comparison: Trading vs. Transaction Multiples**
```
Metric              Trading Comps    Transaction Comps
EV / Revenue        1.0x - 1.5x      2.0x - 3.5x
EV / EBITDA         10x - 14x        15x - 22x
Implied Equity      $100B - $150B    $200B - $350B

Control Premium:    (Transaction / Trading) - 1 = 50-100%
```

**Interpretation:**
- Transaction multiples 30-50% higher than trading (control premium)
- Reflects strategic value + synergies + competitive dynamics
- Use transaction multiples if valuing company for M&A
- Use trading multiples if valuing for public market

**Activity 4.2.5:** Apply Transaction Multiples
- Select appropriate multiple range
- Calculate implied valuation
- Compare to trading comps and DCF
- Calculate implied control premium
- **Deliverable:** Transaction Multiples Valuation Summary

**Final Deliverable - Precedent Transactions:** Complete Excel Model with:
1. Transaction sourcing and screening
2. Deal data table (all transactions)
3. Transaction multiples table
4. Analysis of outliers and adjustments
5. Valuation summary (implied price range)
6. Control premium analysis
7. Football field chart update (add precedent trans bars)

---

### 4.3 Integrated Valuation Summary (1-2 hours)

**Putting It All Together: Triangulation**

**Valuation Methodologies:**
```
Method                      Implied Equity Value    Weight
1. DCF (Perpetuity Growth)  $120B - $140B          30%
2. DCF (Exit Multiple)      $140B - $180B          20%
3. Trading Comps (EV/EBITDA) $100B - $150B         25%
4. Trading Comps (P/E)      $110B - $160B          15%
5. Precedent Trans          $180B - $250B          10%

Weighted Average:           $130B - $170B
Midpoint:                   $150B
```

**Final Football Field Chart:**
```
Valuation Summary                    Implied Equity Value ($B)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DCF (Perp Growth)       [■■■■■■■■]           $120 - $140
DCF (Exit Multiple)     [■■■■■■■■■■]         $140 - $180
EV/EBITDA Comps         [■■■■■■■■■]          $100 - $150
P/E Comps               [■■■■■■■■■]          $110 - $160
Precedent Trans         [■■■■■■■■■■■■■]      $180 - $250
52-Week Range           [■■■■■■■■■■■■■■■■■]  $90 - $200
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Market Cap: $125B     ▲
Analyst Target: $150B (20% upside)
```

**Investment Recommendation:**
- BUY if Current < Low end of range
- HOLD if Current within range
- SELL if Current > High end of range

**Activity 4.3:** Integrated Valuation Memo
- Combine all methodologies (DCF, trading comps, precedent trans)
- Assign weights to each method (justify)
- Calculate weighted average valuation
- Make BUY/HOLD/SELL recommendation
- **Deliverable:** 3-5 page Valuation Memo + Excel model

**Memo Structure:**
1. Executive Summary (1 paragraph)
2. Company Overview (1 page)
3. Valuation Methodologies (2-3 pages)
   - DCF assumptions and results
   - Trading comps selection and multiples
   - Precedent transactions analysis
4. Triangulation and Recommendation (1 page)
5. Appendices: Detailed Excel models

---

## Unit 4 Complete! Next: Unit 5 - LBO Modeling

This completes Comparable Companies and Precedent Transactions analysis at the level required for NGI Capital Advisory work. Should I continue with:
1. **Unit 5: LBO (Leveraged Buyout) Modeling** - critical for PE advisory
2. **Accounting II expansion** - PP&E, Leases, Stock Comp, M&A accounting
3. **Credit Analysis Module** - debt structuring, covenant analysis
4. **All of the above** - keep going!

