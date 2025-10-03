# Appendix — Modules, Units, Outcomes, Activities (V1)
**Last Updated:** October 2, 2025  
**Content Format:** Interactive lessons with Manim animations, exercises, Excel work, Word docs  
**Philosophy:** Super in-depth, teach "how to think not what to think" — 3Blue1Brown style  
**Preparation:** Students ready to work as NGI Capital Advisory analysts  
**Animation Engine:** Manim Community Edition (36 animated lessons — see Appendix.Manim.Animations.md)

This appendix maps module outcomes to units, activities, and learning resources. It guides authoring and ensures alignment with validators, coaching, and the capstone. All content developed from scratch using expert knowledge, textbooks, MCP resources, and 3Blue1Brown-inspired visual pedagogy.

## Business Foundations
**Duration:** 4-6 weeks  
**Format:** Interactive lessons with animations, quizzes, Excel exercises, 1-2 page memos  
**Textbook References:** 
- "Business Model Generation" by Osterwalder & Pigneur
- "Competitive Strategy" by Michael Porter
- "Thinking in Bets" by Annie Duke
- "The Goal" by Eliyahu Goldratt

### Unit 1: Systems Thinking & Business Models (8-10 hours)
**Learning Objectives:**
- Articulate all 9 components of Business Model Canvas (BMC) with real examples
- Identify value proposition, channels, revenue streams for any business
- Trace cash flows and value flows through business systems
- Understand how business model choices drive unit economics and defensibility

**Content:**
1. **Introduction to Systems Thinking** (90 min)
   - **Manim Animation:** `BMC_Systems_Thinking` (5 min) — Animated feedback loops and value flows
   - Case study: How Uber's two-sided marketplace creates network effects
   - Exercise: Map value flows for your chosen company

2. **Business Model Canvas Deep Dive** (3 hours)
   - **Manim Animations:** 
     - `BMC_Interactive_TSLA` (8 min) — Tesla's full Business Model Canvas with interconnected components
     - `BMC_Interactive_ABNB` (7 min) — Airbnb's marketplace dynamics and two-sided value creation
   - **Interactive BMC Builder** (web component with drag-drop)
     - Customer Segments: Who are we creating value for?
     - Value Propositions: What problems are we solving?
     - Channels: How do we reach and deliver to customers?
     - Customer Relationships: What relationship does each segment expect?
     - Revenue Streams: What are customers willing to pay for?
     - Key Resources: What assets are required?
     - Key Activities: What activities are most important?
     - Key Partnerships: Who are our key partners/suppliers?
     - Cost Structure: What are the most important costs?
   - **Activity 1.1:** Draft BMC for your chosen company (submit as 1-page PDF)
     - Template provided with guided questions
     - AI Coach provides feedback on completeness and logic
   
3. **Business Model Patterns** (2 hours)
   - Subscription vs. Transactional vs. Freemium vs. Marketplace
   - Platform business models and two-sided markets
   - Asset-heavy vs. Asset-light models
   - **Interactive Quiz:** Identify business model patterns for 10 companies
   
4. **From BMC to Financial Model** (2 hours)
   - How BMC components map to P&L drivers
   - Revenue streams → Revenue Model (Q × P)
   - Cost structure → OpEx categories and COGS
   - **Activity 1.2:** Unit economics outline (Excel template)
     - Calculate contribution margin for chosen company
     - Identify fixed vs. variable costs
     - Estimate customer acquisition cost (CAC) if applicable

**Deliverables:**
- Business Model Canvas (1-page PDF with all 9 components filled)
- Unit Economics Worksheet (Excel with contribution margin analysis)
- Reflection memo: "How does [Company]'s business model create competitive advantage?" (1 page)

### Unit 2: Unit Economics & Pricing (6-8 hours)
**Learning Objectives:**
- Compute contribution margin, payback period, CLV/CAC ratio
- Understand cohort analysis and retention economics
- Apply pricing psychology and elasticity concepts
- Build unit economics model in Excel

**Content:**
1. **Contribution Margin Economics** (2 hours)
   - Formula: (Revenue - Variable Costs) / Revenue
   - Why it matters: Operating leverage and scalability
   - **Manim Animation:** `Contribution_Margin_ABNB` (5 min) — Airbnb unit economics breakdown
   - **Interactive Tool:** Contribution margin calculator
   - Case studies: SaaS (90%+), Retail (30-40%), Marketplace (60-80%)
   
2. **Customer Lifetime Value (CLV) & CAC** (2 hours)
   - **Manim Animation:** `Unit_Economics_CLV_CAC` (6 min) — Animated CLV calculation with cohort flows
   - CLV formula: Avg Revenue per Customer × Gross Margin × (1 / Churn Rate)
   - CAC: Total Sales & Marketing Spend / # New Customers
   - Healthy ratios: CLV:CAC should be 3:1 or higher
   - Payback period: CAC / (Monthly Revenue × Gross Margin)
   - **Activity 2.1:** Build CLV/CAC model for subscription business (Excel)

3. **Cohort Analysis** (2 hours)
   - **Manim Animation:** `Cohort_Retention_SHOP` (5 min) — Shopify merchant cohorts over time
   - Cohort retention curves and revenue retention
   - Net Revenue Retention (NRR) for SaaS: >100% is gold standard
   - **Exercise:** Analyze Shopify's merchant cohorts from IR deck

4. **Pricing Strategy** (2 hours)
   - **Manim Animation:** `Pricing_Elasticity_Sim` (5 min) — Interactive price elasticity visualization
   - Cost-plus vs. Value-based vs. Competitive pricing
   - Price elasticity of demand (theory + Excel simulation)
   - Psychological pricing ($99 vs. $100), anchoring, bundling
   - **Activity 2.2:** Pricing thought experiment memo (1 page)
     - "If you were CEO of [Company], would you raise prices 10%? Why or why not?"
     - Must reference elasticity, competition, and value proposition

**Deliverables:**
- Unit Economics Excel Model (contribution margin, CLV/CAC, payback)
- Pricing Strategy Memo (1 page with quantitative reasoning)

### Unit 3: Strategy & Competitive Moats (8-10 hours)
**Learning Objectives:**
- Apply Porter's 5 Forces framework to real companies
- Identify and evaluate 7 types of competitive moats
- Understand Blue Ocean Strategy and value innovation
- Analyze switching costs, network effects, scale advantages

**Content:**
1. **Porter's 5 Forces** (3 hours)
   - **Manim Animation:** `Porters_5_Forces_UBER` (8 min) — Animated competitive forces visualization for Uber
   - Threat of New Entrants: Barriers to entry analysis
   - Bargaining Power of Suppliers: Supplier concentration, switching costs
   - Bargaining Power of Buyers: Customer concentration, price sensitivity
   - Threat of Substitutes: Alternative products/services
   - Competitive Rivalry: Industry concentration, differentiation
   - **Interactive Tool:** 5 Forces Analyzer (slider-based assessment)
   - **Activity 3.1:** 5 Forces analysis for chosen company (5 bullet points per force)

2. **7 Types of Moats** (3 hours)
   - **Manim Animation:** `7_Moats_DE` (7 min) — Deere's competitive moats visualized
   - Network Effects: Value increases with more users (e.g., Uber, Airbnb)
   - Switching Costs: High cost/friction to change (e.g., enterprise software)
   - Cost Advantages: Scale economies, proprietary tech (e.g., Amazon, Costco)
   - Intangible Assets: Brands, patents, regulatory licenses (e.g., Coca-Cola, pharma)
   - Efficient Scale: Natural monopoly in niche market
   - Brand: Emotional connection, premium pricing power
   - Distribution: Unique access to customers
   - **Case Studies:** Tesla's moat (tech + brand), Deere's moat (dealer network + financing)
   - **Activity 3.2:** Moat scorecard for chosen company + 3 peers (Excel template)

3. **Blue Ocean Strategy** (2 hours)
   - Value Innovation: Increase value AND lower costs
   - Four Actions Framework: Eliminate, Reduce, Raise, Create
   - Case study: Cirque du Soleil (eliminated animals, raised artistic quality)
   - **Exercise:** Identify potential blue oceans in your company's industry

4. **Sustaining Competitive Advantage** (2 hours)
   - Why moats erode: Technology disruption, regulation, competitor innovation
   - Continuous investment in moat strengthening
   - **Activity 3.3:** Write 1-page memo: "How durable is [Company]'s moat over 10 years?"

**Deliverables:**
- 5 Forces Analysis (bullet points with evidence from filings/IR)
- Moat Scorecard (Excel comparing company to 3 peers on 7 moat types)
- Moat Durability Memo (1 page with bull/bear scenarios)

### Unit 4: Decision Under Uncertainty (4-6 hours)
**Learning Objectives:**
- Apply expected value (EV) reasoning to business decisions
- Build scenario trees with probabilities and outcomes
- Understand Bayesian updating and base rates
- Frame risks and opportunities quantitatively

**Content:**
1. **Expected Value Framework** (2 hours)
   - **Manim Animation:** `Expected_Value_TSLA` (6 min) — Cybertruck launch EV decision tree
   - EV = Σ (Probability × Outcome)
   - Example: Investment decision with 60% success ($10M), 40% failure (-$2M)
   - EV = 0.6 × $10M + 0.4 × (-$2M) = $5.2M
   - **Interactive Tool:** EV Calculator for multi-outcome scenarios
   - **Exercise:** Calculate EV for Tesla's Cybertruck launch

2. **Scenario Analysis** (2 hours)
   - Base case, Bull case, Bear case with probabilities
   - Sensitivity to key drivers (e.g., pricing, volume, costs)
   - **Activity 4.1:** Build scenario tree for 2 key drivers (Excel)
     - Example: Tesla deliveries (Bull: +30%, Base: +15%, Bear: -10%)
     - Example: ASP (Bull: $55K, Base: $50K, Bear: $45K)
     - Calculate outcomes for all 9 combinations

3. **Bayesian Thinking** (2 hours)
   - Base rates and priors: Start with what's typical, then update
   - Example: Base rate of startup success is ~10%, update with founder quality
   - **Exercise:** Estimate probability your company beats earnings given track record

**Deliverables:**
- Scenario Tree (Excel with probabilities and outcomes for 2 drivers)
- Risks & Opportunities Memo (bullet points with EV estimates)

## Accounting
- Accounting I (Intro)
  - Units: 3-Statement Linkages; Revenue Recognition & COGS; Working Capital; Cash Flow (indirect).
  - Outcomes: clean linkage across IS/BS/CF; working capital mechanics; basic disclosure reading.
  - Activities: A1 partial (statement standardization); WC mini-build; CF reconciliation drill.
- Accounting II (Intermediate)
  - Units: PP&E & Depreciation; Leases; Stock Compensation; Deferred Taxes; Consolidations.
  - Outcomes: correct capitalization, lease treatment, stock comp add-backs; tax timing differences; simple consolidation view.
  - Activities: PP&E roll; lease schedule; stock comp add-back check; deferred tax toy model.
- Managerial Accounting
  - Units: Costing (job/process/ABC); Budgeting & Forecasting; Variance Analysis.
  - Outcomes: cost classification and margin analysis; budget vs actuals; insights for operators.
  - Activities: cost sheet; budget variance table with commentary.

## Finance & Valuation
- Unit 1: Revenue Drivers & Projections (see Appendix.Modules.Finance.Detailed.md)
  - Outcomes: quantify Q×P (× take-rate) with correct units; tie to reported revenue within ±1–2% or explain residuals.
  - Activities: A3 projections; driver map completion; variance notes.
  - Animations: Revenue_Drivers_TSLA, Revenue_Drivers_COST, Revenue_Drivers_SHOP
- Unit 2: Schedules & Working Capital (see Appendix.Modules.Finance.Detailed.md)
  - Outcomes: WC bridge; debt roll; lease capitalization; stock comp effects; all reconciled to statements.
  - Activities: A2 schedules & CF reconcile.
  - Animations: WC_Cycle_UBER, Debt_Schedule_TSLA, WC_Schedule_UBER
- Unit 3: DCF & Sensitivities (see Appendix.Modules.Finance.DCF.Complete.md)
  - Outcomes: WACC with defensible inputs; terminal method suitability; coherent sensi table.
  - Activities: A4 DCF build with diagnostic checks.
  - Animations: DCF_Waterfall_COST, WACC_Calculation_Tree, DCF_Terminal_Value_Methods, Sensitivity_Analysis_2Way, Football_Field_Chart
- Unit 4: Public Comps & Precedent Transactions (see Appendix.Modules.Finance.CompsAndPrecedents.md)
  - Outcomes: peer set quality; EV construction correctness; sanity vs peer distributions.
  - Activities: A5 comps table + peer selection memo.
  - Animations: Comps_Table_SHOP, EV_Bridge_Calculation, Precedent_Transactions_ABNB
- Unit 5: LBO Analysis (see Appendix.Modules.Finance.LBO.md)
  - Outcomes: understand leverage amplification; build sources & uses; model debt paydown; calculate IRR and MOIC.
  - Activities: LBO model build with returns analysis.
  - Animations: LBO_Returns_Waterfall, Debt_Paydown_Schedule, IRR_Multiple_Bridge
- Unit 6: Credit Analysis & Fixed Income (see Appendix.Modules.Finance.CreditAnalysis.md)
  - Outcomes: assess creditworthiness; calculate leverage and coverage ratios; understand debt seniority.
  - Activities: Credit memo with rating recommendation.
  - Animations: Credit_Analysis_GSBD, Credit_Spread_Waterfall, Debt_Seniority_Waterfall
- Unit 7: Capstone Packaging
  - Outcomes: investment thesis; assumptions & evidence; valuation triangulation; executive communication.
  - Activities: Capstone — model, 1–2 page memo, 3–5 slide deck, football field; leaderboard contribution.

## Activity Alignment Summary
- A1 → Accounting I fundamentals; standardize statements and driver map intro.
- A2 → Schedules (WC, Debt) and CF tie; Accounting II linkages.
- A3 → Finance projections; revenue driver rigor; variance documentation.
- A4 → DCF; validator guardrails; rationale of WACC/terminal.
- A5 → Comps; peer memo; triangulation.
- Capstone → Synthesis and executive communication.
