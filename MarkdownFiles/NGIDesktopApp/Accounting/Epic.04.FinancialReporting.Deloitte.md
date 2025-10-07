# Epic 4: Financial Reporting - Full GAAP Statements (Deloitte EGC Format)

## Epic Summary
Implement comprehensive US GAAP-compliant financial statement generation following Deloitte's illustrative financial statements template for Emerging Growth Company (EGC) tech startups. The system produces all 5 core statements plus complete notes, with modern shadcn/ui interface for viewing, exporting, and analyzing financial data.

**Reference**: Deloitte "Financial Statements for Tech Startups (EGC)" template

---

## Business Value
- **Investor Ready**: Professional-grade statements matching Big 4 audit standards
- **GAAP Compliant**: Full adherence to 2025 US GAAP (ASC 606, 820, 842, 230)
- **Audit Support**: Format accepted by auditors, reduces Q&A cycles
- **Multi-Period**: Comparative statements (current year vs prior year)
- **Export Options**: PDF, Excel, web view for different stakeholder needs
- **Real-Time Insights**: QuickBooks-style dashboards with drill-down capabilities
- **Scheduled Reports**: Automated report generation and distribution
- **Customizable Views**: Filter by entity, department, project, or custom dimensions

---

## Deloitte EGC Financial Statements Template Structure

### Statement 1: Balance Sheet (Classified)

**Format**: Deloitte EGC Balance Sheet - Classified Presentation

```
[Company Name]
BALANCE SHEETS
As of December 31, 2025 and 2024
(In thousands, except share and per share data)

ASSETS
Current assets:
  Cash and cash equivalents                              $ X,XXX    $ X,XXX
  Restricted cash                                          X,XXX      X,XXX
  Accounts receivable, net of allowance                    X,XXX      X,XXX
  Contract assets (Note X)                                 X,XXX      X,XXX
  Prepaid expenses and other current assets                X,XXX      X,XXX
    Total current assets                                   X,XXX      X,XXX

Noncurrent assets:
  Property and equipment, net (Note X)                     X,XXX      X,XXX
  Operating lease right-of-use assets (Note X)            X,XXX      X,XXX
  Capitalized software development costs, net (Note X)     X,XXX      X,XXX
  Intangible assets, net (Note X)                          X,XXX      X,XXX
  Goodwill (Note X)                                        X,XXX      X,XXX
  Other noncurrent assets                                  X,XXX      X,XXX
    Total noncurrent assets                                X,XXX      X,XXX

Total assets                                             $ X,XXX    $ X,XXX

LIABILITIES AND STOCKHOLDERS' EQUITY (DEFICIT)
Current liabilities:
  Accounts payable                                       $ X,XXX    $ X,XXX
  Accrued expenses and other current liabilities (Note X)  X,XXX      X,XXX
  Deferred revenue, current (Note X)                       X,XXX      X,XXX
  Operating lease liabilities, current (Note X)            X,XXX      X,XXX
  Notes payable, current (Note X)                          X,XXX      X,XXX
    Total current liabilities                              X,XXX      X,XXX

Noncurrent liabilities:
  Deferred revenue, noncurrent (Note X)                    X,XXX      X,XXX
  Operating lease liabilities, noncurrent (Note X)         X,XXX      X,XXX
  Notes payable, noncurrent (Note X)                       X,XXX      X,XXX
  Other noncurrent liabilities                             X,XXX      X,XXX
    Total noncurrent liabilities                           X,XXX      X,XXX

Total liabilities                                          X,XXX      X,XXX

Stockholders' equity (deficit):
  Preferred stock, $0.0001 par value; X shares
    authorized, X shares issued and outstanding
    at Dec 31, 2025 and 2024                                 XXX        XXX
  Common stock, $0.0001 par value; X shares
    authorized, X shares issued and outstanding
    at Dec 31, 2025 and 2024                                   X          X
  Additional paid-in capital                               X,XXX      X,XXX
  Accumulated other comprehensive income (loss)               XX         XX
  Accumulated deficit                                     (X,XXX)    (X,XXX)
    Total stockholders' equity (deficit)                   X,XXX      X,XXX

Total liabilities and stockholders' equity (deficit)     $ X,XXX    $ X,XXX

See accompanying notes to financial statements.
```

### Statement 2: Income Statement (Multi-Step)

**Format**: Deloitte EGC Income Statement - Multi-Step with Function and Nature

```
[Company Name]
STATEMENTS OF OPERATIONS
For the Years Ended December 31, 2025 and 2024
(In thousands, except share and per share data)

                                                    2025        2024
Revenue (Note X)                                  $ X,XXX     $ X,XXX
Cost of revenue                                     X,XXX       X,XXX
  Gross profit                                      X,XXX       X,XXX

Operating expenses:
  Research and development                          X,XXX       X,XXX
  Sales and marketing                               X,XXX       X,XXX
  General and administrative                        X,XXX       X,XXX
    Total operating expenses                        X,XXX       X,XXX

Loss from operations                               (X,XXX)     (X,XXX)

Other income (expense):
  Interest income                                      XXX         XXX
  Interest expense (Note X)                           (XXX)       (XXX)
  Other income (expense), net                          XXX         XXX
    Total other income (expense), net                  XXX         XXX

Loss before income taxes                           (X,XXX)     (X,XXX)

Provision for (benefit from) income taxes (Note X)     XXX         XXX

Net loss                                          $(X,XXX)    $(X,XXX)

Net loss per share attributable to common
  stockholders, basic and diluted (Note X)        $ (X.XX)    $ (X.XX)

Weighted-average shares used in computing net loss
  per share attributable to common stockholders,
  basic and diluted (Note X)                       XX,XXX      XX,XXX

---
SUPPLEMENTAL DISCLOSURE - Expense by Nature (2025 Requirement)

Total Operating Expenses by Nature:
  Personnel costs (salaries, benefits, stock-based comp) $ X,XXX
  Hosting and infrastructure                               X,XXX
  Professional services                                    X,XXX
  Rent and facilities                                      X,XXX
  Software and subscriptions                               X,XXX
  Marketing and advertising                                X,XXX
  Depreciation and amortization                            X,XXX
  Other operating expenses                                 X,XXX
    Total operating expenses                             $ X,XXX

See accompanying notes to financial statements.
```

### Statement 3: Comprehensive Income

**Format**: Deloitte EGC Statement of Comprehensive Income (Loss)

```
[Company Name]
STATEMENTS OF COMPREHENSIVE INCOME (LOSS)
For the Years Ended December 31, 2025 and 2024
(In thousands)

                                                    2025        2024
Net loss                                          $(X,XXX)    $(X,XXX)

Other comprehensive income (loss), net of tax:
  Foreign currency translation adjustments             XXX         XXX
  Unrealized gains (losses) on available-for-sale
    debt securities                                    XXX         XXX
    Total other comprehensive income (loss)            XXX         XXX

Comprehensive income (loss)                       $(X,XXX)    $(X,XXX)

See accompanying notes to financial statements.
```

### Statement 4: Stockholders' Equity

**Format**: Deloitte EGC Statement of Stockholders' Equity (Deficit)

```
[Company Name]
STATEMENTS OF STOCKHOLDERS' EQUITY (DEFICIT)
For the Years Ended December 31, 2025 and 2024
(In thousands, except share data)

                        Preferred Stock    Common Stock         Additional      Accumulated
                        Shares   Amount    Shares   Amount      Paid-in         Other          Accumulated    Total
                                                                 Capital      Comprehensive      Deficit       Equity
                                                                                 Income                       (Deficit)

Balance at Dec 31, 2023  X,XXX    $ XXX   XX,XXX    $ XX      $ X,XXX          $ XX          $(X,XXX)      $ X,XXX

Issuance of common stock
  upon exercise of options  —        —     X,XXX       X          XXX            —               —             XXX
Stock-based compensation   —        —       —         —          XXX            —               —             XXX
Other comprehensive loss   —        —       —         —           —            (XX)             —            (XX)
Net loss                   —        —       —         —           —             —            (X,XXX)       (X,XXX)

Balance at Dec 31, 2024  X,XXX      XXX   XX,XXX      XX        X,XXX          XX           (X,XXX)        X,XXX

Issuance of common stock
  upon exercise of options  —        —     X,XXX       X          XXX            —               —             XXX
Issuance of common stock
  in connection with IPO    —        —     X,XXX       X        X,XXX            —               —           X,XXX
Stock-based compensation   —        —       —         —          XXX            —               —             XXX
Conversion of preferred
  stock to common stock  (X,XXX)   (XXX)  X,XXX       X           —             —               —              —
Other comprehensive income —        —       —         —           —             XX              —              XX
Net loss                   —        —       —         —           —             —            (X,XXX)       (X,XXX)

Balance at Dec 31, 2025    —      $  —   XX,XXX    $ XX       $ X,XXX         $ XX          $(X,XXX)      $ X,XXX

See accompanying notes to financial statements.
```

### Statement 5: Cash Flows (Indirect Method)

**Format**: Deloitte EGC Statement of Cash Flows - Indirect Method (ASC 230)

```
[Company Name]
STATEMENTS OF CASH FLOWS
For the Years Ended December 31, 2025 and 2024
(In thousands)

                                                           2025        2024
Cash flows from operating activities:
  Net loss                                               $(X,XXX)    $(X,XXX)
  Adjustments to reconcile net loss to net cash
    provided by (used in) operating activities:
      Depreciation and amortization                        X,XXX       X,XXX
      Stock-based compensation expense                     X,XXX       X,XXX
      Amortization of debt discount and issuance costs       XXX         XXX
      Provision for doubtful accounts                        XXX         XXX
      Noncash lease expense                                  XXX         XXX
      Loss on disposal of property and equipment             XXX         XXX
      Deferred income taxes                                  XXX         XXX
      Changes in operating assets and liabilities:
        Accounts receivable                                 (XXX)       (XXX)
        Contract assets                                     (XXX)       (XXX)
        Prepaid expenses and other current assets           (XXX)       (XXX)
        Other noncurrent assets                             (XXX)       (XXX)
        Accounts payable                                     XXX         XXX
        Accrued expenses and other current liabilities       XXX         XXX
        Deferred revenue                                     XXX         XXX
        Operating lease liabilities                         (XXX)       (XXX)
        Other noncurrent liabilities                         XXX         XXX
          Net cash provided by (used in) operating
            activities                                     (X,XXX)     (X,XXX)

Cash flows from investing activities:
  Purchases of property and equipment                       (XXX)       (XXX)
  Capitalized software development costs                    (XXX)       (XXX)
  Purchases of available-for-sale debt securities         (X,XXX)        —
  Maturities of available-for-sale debt securities         X,XXX         —
  Business acquisition, net of cash acquired                 —         (X,XXX)
          Net cash used in investing activities            (X,XXX)     (X,XXX)

Cash flows from financing activities:
  Proceeds from issuance of common stock, net of
    issuance costs                                         X,XXX         —
  Proceeds from issuance of convertible notes              X,XXX       X,XXX
  Proceeds from exercise of stock options                    XXX         XXX
  Payment of debt issuance costs                            (XXX)       (XXX)
  Repayment of notes payable                                (XXX)       (XXX)
  Proceeds from line of credit                                —          XXX
  Repayment of line of credit                                 —         (XXX)
          Net cash provided by financing activities        X,XXX       X,XXX

Net increase (decrease) in cash, cash equivalents,
  and restricted cash                                        XXX        (XXX)

Cash, cash equivalents, and restricted cash at
  beginning of period                                      X,XXX       X,XXX

Cash, cash equivalents, and restricted cash at
  end of period                                          $ X,XXX     $ X,XXX

Reconciliation of cash, cash equivalents, and
  restricted cash:
    Cash and cash equivalents                            $ X,XXX     $ X,XXX
    Restricted cash                                          XXX         XXX
      Total cash, cash equivalents, and restricted cash  $ X,XXX     $ X,XXX

Supplemental cash flow information:
  Cash paid for interest                                 $   XXX     $   XXX
  Cash paid for income taxes                             $   XXX     $   XXX

Noncash investing and financing activities:
  Conversion of convertible notes to common stock        $ X,XXX     $   —
  Conversion of preferred stock to common stock          $ X,XXX     $   —
  Operating lease right-of-use assets obtained in
    exchange for operating lease liabilities             $   XXX     $   XXX
  Property and equipment acquired under accounts payable $   XXX     $   XXX

See accompanying notes to financial statements.
```

---

## Notes to Financial Statements (Deloitte EGC Format)

### Note 1: Nature of Business and Basis of Presentation

**Deloitte Template Content**:
```
[Company Name] (the "Company") is a [describe business, e.g., software company
that provides cloud-based solutions]. The Company was incorporated in [state] on
[date] and is headquartered in [location].

The Company has incurred net losses and negative cash flows from operations since
inception and had an accumulated deficit of $X,XXX as of December 31, 2025. The
Company expects to continue to incur operating losses for the foreseeable future.

Basis of Presentation
The accompanying financial statements have been prepared in accordance with US GAAP
and include all adjustments of a normal recurring nature that management considers
necessary for the fair presentation of results.

Emerging Growth Company Status
The Company is an emerging growth company (EGC) as defined in the Jumpstart Our
Business Startups Act of 2012 (JOBS Act). As an EGC, the Company has elected to
comply with certain reduced disclosure and financial statement presentation requirements.
```

### Note 2: Summary of Significant Accounting Policies

**Required Disclosures (Per Deloitte)**:
- **Use of Estimates**: Judgment areas (revenue recognition, useful lives, impairment)
- **Revenue Recognition (ASC 606)**: 5-step model, principal vs agent, timing
- **Leases (ASC 842)**: Lessee accounting, ROU assets, discount rate
- **Fair Value (ASC 820)**: Level hierarchy, valuation techniques
- **Stock-Based Compensation**: Fair value method, vesting
- **Income Taxes**: Deferred tax assets/liabilities, valuation allowance
- **Property and Equipment**: Depreciation methods, useful lives
- **Capitalized Software (ASC 350-40)**: Capitalization policy, amortization
- **Concentrations**: Customer, supplier, geographic
- **Cash and Cash Equivalents**: Definition (< 3 months maturity)
- **Restricted Cash**: Nature and purpose
- **Accounts Receivable**: Allowance for doubtful accounts
- **Recently Adopted Standards**: New GAAP effective in period
- **Recently Issued Standards Not Yet Adopted**: Future impacts

### Note 3: Revenue (ASC 606)

**Deloitte Template Structure**:
```
Revenue Recognition Policy
The Company generates revenue primarily from [subscription fees / professional services / 
product sales]. Revenue is recognized when control of promised goods or services is
transferred to customers in an amount that reflects the consideration expected to be
received in exchange for those goods or services.

The following table presents the Company's revenue disaggregated by type:

                                      2025        2024
Subscription revenue               $ X,XXX     $ X,XXX
Professional services revenue        X,XXX       X,XXX
  Total revenue                    $ X,XXX     $ X,XXX

Contract Balances
The following table provides information about contract assets and deferred revenue:

                                      2025        2024
Contract assets                    $ X,XXX     $ X,XXX
Deferred revenue, current          $ X,XXX     $ X,XXX
Deferred revenue, noncurrent       $ X,XXX     $ X,XXX

Significant changes in contract assets and deferred revenue during the period are as follows:
- Revenue recognized during the period from amounts included in deferred revenue
  at beginning of period: $X,XXX
- Increases due to cash received, excluding amounts recognized as revenue: $X,XXX

Performance Obligations
Subscription revenue is recognized ratably over the subscription term. Professional
services are recognized as services are performed.

As of December 31, 2025, approximately $X,XXX of revenue is expected to be recognized
from remaining performance obligations over the next 12 months, with the balance
recognized thereafter.
```

### Note 4: Leases (ASC 842)

**Deloitte Template Structure**:
```
The Company leases office space under operating leases with remaining terms ranging
from X to X years.

Components of lease cost:
                                      2025        2024
Operating lease cost               $   XXX     $   XXX
Short-term lease cost                   XX          XX
Variable lease cost                     XX          XX
  Total lease cost                 $   XXX     $   XXX

Supplemental cash flow information:
Cash paid for amounts included in measurement of lease liabilities:
  Operating cash flows from operating leases  $   XXX     $   XXX

Weighted-average remaining lease term (years):
  Operating leases                                 X.X         X.X

Weighted-average discount rate:
  Operating leases                                 X.X%        X.X%

Maturities of lease liabilities as of December 31, 2025:

Year ending December 31,                        Operating Leases
2026                                            $   XXX
2027                                                XXX
2028                                                XXX
2029                                                XXX
2030                                                XXX
Thereafter                                          XXX
  Total lease payments                              XXX
Less: Imputed interest                             (XXX)
  Total lease liabilities                       $   XXX
```

### Note 5: Fair Value Measurements (ASC 820)

**Deloitte Template Structure**:
```
Assets and liabilities measured at fair value on a recurring basis as of December 31, 2025:

                                Level 1    Level 2    Level 3    Total
Assets:
  Money market funds           $ X,XXX    $   —      $   —      $ X,XXX
  U.S. Treasury securities       X,XXX        —          —        X,XXX
  Corporate debt securities        —        X,XXX        —        X,XXX
    Total assets at fair value $ X,XXX    $ X,XXX    $   —      $ X,XXX

Liabilities:
  Warrant liabilities          $   —      $   —      $   XXX    $   XXX
    Total liabilities at fair
      value                    $   —      $   —      $   XXX    $   XXX

The Company uses the Black-Scholes option pricing model to value warrant liabilities,
with the following assumptions:
  Risk-free interest rate: X.X%
  Expected term: X.X years
  Expected volatility: XX%
  Expected dividend yield: 0%
```

### Note 6: Property and Equipment

### Note 7: Capitalized Software Development Costs (ASC 350-40)

### Note 8: Goodwill and Intangible Assets

### Note 9: Accrued Expenses and Other Current Liabilities

### Note 10: Debt

### Note 11: Stockholders' Equity

### Note 12: Stock-Based Compensation

### Note 13: Income Taxes

### Note 14: Commitments and Contingencies

### Note 15: Significant Customers and Concentrations

### Note 16: Related-Party Transactions

### Note 17: Subsequent Events

---

## User Stories (QuickBooks/Xero Features)

### US-FR-001: Real-Time Financial Dashboard
**As a** partner
**I want to** view real-time financial metrics on a dashboard
**So that** I can monitor business health at a glance

**Acceptance Criteria**:
- [ ] KPI cards: Revenue (MTD/YTD), Expenses, Profit/Loss, Cash Position
- [ ] Trend charts: Revenue over time, Expense breakdown, Cash flow
- [ ] Comparison widgets: This month vs last month, Budget vs actual
- [ ] Click-through to detailed reports
- [ ] Auto-refresh every 5 minutes
- [ ] Mobile responsive layout

### US-FR-002: Scheduled Report Generation (Xero-Style)
**As a** partner
**I want to** schedule automatic report generation and distribution
**So that** stakeholders receive reports without manual work

**Acceptance Criteria**:
- [ ] Schedule reports: Daily, Weekly, Monthly, Quarterly, Annual
- [ ] Email distribution lists (investors, board, auditors)
- [ ] Multiple format exports simultaneously (PDF + Excel)
- [ ] Custom report templates per recipient
- [ ] Delivery log with status tracking
- [ ] Pause/resume scheduled reports

### US-FR-003: Budget vs Actual Analysis
**As a** partner
**I want to** compare actual results against budget
**So that** I can identify variances and take corrective action

**Acceptance Criteria**:
- [ ] Side-by-side budget vs actual comparison
- [ ] Variance column (amount and percentage)
- [ ] Favorable/unfavorable indicators (green/red)
- [ ] Drill down to account level
- [ ] YTD and monthly views
- [ ] Export variance report

### US-FR-004: Multi-Period Trend Analysis (QuickBooks Reports)
**As a** partner
**I want to** view financial data across multiple periods
**So that** I can identify trends and patterns

**Acceptance Criteria**:
- [ ] Compare up to 12 periods side-by-side
- [ ] Trend line charts with period-over-period growth
- [ ] Seasonality indicators
- [ ] Export to Excel for further analysis
- [ ] Save custom period comparisons
- [ ] Rolling 12-month view

### US-FR-005: Custom Report Builder
**As a** partner
**I want to** create custom reports with selected accounts
**So that** I can analyze specific aspects of the business

**Acceptance Criteria**:
- [ ] Drag-and-drop account selection
- [ ] Custom groupings and subtotals
- [ ] Filter by entity, date, department, project
- [ ] Save custom report templates
- [ ] Share templates with team
- [ ] Export in multiple formats

### US-FR-006: Drill-Down from Summary to Detail
**As a** partner
**I want to** click any amount to see underlying transactions
**So that** I can investigate anomalies quickly

**Acceptance Criteria**:
- [ ] Click any line item on financial statements
- [ ] Modal/sheet shows transaction detail
- [ ] View journal entries, source documents
- [ ] Edit capabilities (if period not closed)
- [ ] Breadcrumb navigation back to statement
- [ ] Print transaction detail

---

## Modern shadcn/ui Interface Design

### Component: Financial Statement Viewer

```typescript
// FinancialStatementViewer.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, FileText, TrendingUp, Calendar, Building2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';

interface FinancialStatementViewerProps {
  entityId: string;
  period: string;
  periodType: 'monthly' | 'quarterly' | 'annual';
}

export function FinancialStatementViewer({ entityId, period, periodType }: FinancialStatementViewerProps) {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Statements</h1>
          <p className="text-muted-foreground">
            US GAAP-compliant financial reporting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {/* Entity & Period Selector Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Select value={entityId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consolidated">NGI Capital Inc. (Consolidated)</SelectItem>
                  <SelectItem value="advisory">NGI Capital Advisory LLC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Separator orientation="vertical" className="h-8" />
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={periodType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Select value={period}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025-12">December 2025</SelectItem>
                <SelectItem value="2025-09">September 2025</SelectItem>
                <SelectItem value="2025-06">June 2025</SelectItem>
              </SelectContent>
            </Select>
            
            <Badge variant="outline" className="ml-auto">
              <TrendingUp className="mr-1 h-3 w-3" />
              GAAP Compliant
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Statement Tabs */}
      <Tabs defaultValue="balance-sheet" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="income">Income Statement</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flows</TabsTrigger>
          <TabsTrigger value="equity">Stockholders' Equity</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Balance Sheet Tab */}
        <TabsContent value="balance-sheet" className="space-y-4">
          <BalanceSheetComponent entityId={entityId} period={period} />
        </TabsContent>

        {/* Income Statement Tab */}
        <TabsContent value="income" className="space-y-4">
          <IncomeStatementComponent entityId={entityId} period={period} />
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-4">
          <CashFlowStatementComponent entityId={entityId} period={period} />
        </TabsContent>

        {/* Equity Tab */}
        <TabsContent value="equity" className="space-y-4">
          <EquityStatementComponent entityId={entityId} period={period} />
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <NotesComponent entityId={entityId} period={period} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// BalanceSheetComponent.tsx
function BalanceSheetComponent({ entityId, period }: { entityId: string; period: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Consolidated Balance Sheet</CardTitle>
        <CardDescription>
          As of December 31, 2025 and 2024 (In thousands)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* ASSETS Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">ASSETS</h3>
            
            {/* Current Assets */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Current assets:</h4>
              <div className="grid grid-cols-3 gap-4 pl-4">
                <div className="col-span-1 text-sm">Cash and cash equivalents</div>
                <div className="text-sm text-right font-mono">$ 1,234</div>
                <div className="text-sm text-right font-mono text-muted-foreground">$ 987</div>
              </div>
              {/* More line items... */}
              <Separator className="my-2" />
              <div className="grid grid-cols-3 gap-4 pl-4 font-semibold">
                <div className="col-span-1 text-sm">Total current assets</div>
                <div className="text-sm text-right font-mono">$ 5,678</div>
                <div className="text-sm text-right font-mono text-muted-foreground">$ 4,321</div>
              </div>
            </div>

            {/* Noncurrent Assets */}
            <div className="space-y-2 mt-4">
              <h4 className="text-sm font-medium text-muted-foreground">Noncurrent assets:</h4>
              {/* Line items... */}
            </div>

            <Separator className="my-4" />
            <div className="grid grid-cols-3 gap-4 font-bold text-base">
              <div className="col-span-1">Total assets</div>
              <div className="text-right font-mono">$ 12,345</div>
              <div className="text-right font-mono text-muted-foreground">$ 10,987</div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* LIABILITIES Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">LIABILITIES AND STOCKHOLDERS' EQUITY</h3>
            {/* Similar structure for liabilities and equity */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Component: Income Statement with Expense Disaggregation

```typescript
// IncomeStatementComponent.tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

function IncomeStatementComponent({ entityId, period }: { entityId: string; period: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Consolidated Statement of Operations</CardTitle>
        <CardDescription>
          For the Years Ended December 31, 2025 and 2024 (In thousands, except per share data)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Revenue */}
          <div className="space-y-2">
            <StatementLine label="Revenue" value2025={10000} value2024={8500} bold />
            <StatementLine label="Cost of revenue" value2025={3000} value2024={2550} />
            <Separator />
            <StatementLine label="Gross profit" value2025={7000} value2024={5950} bold />
          </div>

          {/* Operating Expenses with Drill-Down */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Operating expenses:</h4>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="rd">
                <AccordionTrigger>
                  <div className="grid grid-cols-3 gap-4 w-full text-sm">
                    <div>Research and development</div>
                    <div className="text-right font-mono">$ 2,500</div>
                    <div className="text-right font-mono text-muted-foreground">$ 2,100</div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-6 space-y-2 pt-2">
                    <div className="text-xs text-muted-foreground font-semibold">By Nature (2025 GAAP Requirement):</div>
                    <StatementLine label="Salaries and wages" value2025={1500} size="sm" indent />
                    <StatementLine label="Hosting and infrastructure" value2025={600} size="sm" indent />
                    <StatementLine label="Software and tools" value2025={200} size="sm" indent />
                    <StatementLine label="Facilities" value2025={100} size="sm" indent />
                    <StatementLine label="Other" value2025={100} size="sm" indent />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sales">
                <AccordionTrigger>
                  <div className="grid grid-cols-3 gap-4 w-full text-sm">
                    <div>Sales and marketing</div>
                    <div className="text-right font-mono">$ 3,200</div>
                    <div className="text-right font-mono text-muted-foreground">$ 2,800</div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {/* Expense by nature breakdown */}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ga">
                <AccordionTrigger>
                  <div className="grid grid-cols-3 gap-4 w-full text-sm">
                    <div>General and administrative</div>
                    <div className="text-right font-mono">$ 1,800</div>
                    <div className="text-right font-mono text-muted-foreground">$ 1,500</div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {/* Expense by nature breakdown */}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Separator />
            <StatementLine label="Total operating expenses" value2025={7500} value2024={6400} bold />
          </div>

          <Separator />
          <StatementLine label="Loss from operations" value2025={-500} value2024={-450} bold negative />

          {/* Other Income/Expense */}
          {/* ... */}

          {/* Net Loss */}
          <Separator className="border-double border-2" />
          <StatementLine label="Net loss" value2025={-750} value2024={-600} bold negative large />
        </div>
      </CardContent>
    </Card>
  );
}

// Helper component for statement lines
function StatementLine({ 
  label, 
  value2025, 
  value2024, 
  bold = false, 
  negative = false,
  large = false,
  size = 'base',
  indent = false
}: StatementLineProps) {
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm';
  const fontWeight = bold ? 'font-semibold' : '';
  const textColor = negative ? 'text-red-600 dark:text-red-400' : '';
  
  return (
    <div className={`grid grid-cols-3 gap-4 ${indent ? 'pl-6' : ''} ${textSize} ${fontWeight}`}>
      <div className={textColor}>{label}</div>
      <div className={`text-right font-mono ${textColor}`}>
        {value2025 < 0 ? `(${Math.abs(value2025).toLocaleString()})` : `$ ${value2025.toLocaleString()}`}
      </div>
      {value2024 !== undefined && (
        <div className={`text-right font-mono text-muted-foreground`}>
          {value2024 < 0 ? `(${Math.abs(value2024).toLocaleString()})` : `$ ${value2024.toLocaleString()}`}
        </div>
      )}
    </div>
  );
}
```

---

## Backend API Implementation

### Database Schema for Financial Statements

```sql
-- Financial reporting periods
CREATE TABLE accounting_periods (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES entities(id),
    period_type VARCHAR(20) NOT NULL, -- monthly, quarterly, annual
    fiscal_year INTEGER NOT NULL,
    fiscal_period INTEGER, -- 1-12 for monthly, 1-4 for quarterly
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- open, closed, locked
    closed_at TIMESTAMPTZ,
    closed_by_id INTEGER REFERENCES partners(id),
    
    UNIQUE(entity_id, fiscal_year, period_type, fiscal_period)
);

-- Financial statement cache (for performance)
CREATE TABLE financial_statement_cache (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES entities(id),
    period_id INTEGER REFERENCES accounting_periods(id),
    statement_type VARCHAR(50) NOT NULL, -- balance_sheet, income_statement, cash_flow, equity, notes
    statement_data JSONB NOT NULL, -- Full statement in JSON
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    is_consolidated BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_by_id INTEGER REFERENCES partners(id),
    
    UNIQUE(entity_id, period_id, statement_type, is_consolidated)
);

CREATE INDEX idx_fs_cache_entity_period ON financial_statement_cache(entity_id, period_id);
CREATE INDEX idx_fs_cache_type ON financial_statement_cache(statement_type);
```

### Financial Statement Generator Service

```python
# src/api/services/financial_statements.py
from decimal import Decimal
from typing import Dict, List, Optional
from datetime import date

class FinancialStatementGenerator:
    """
    Generates GAAP-compliant financial statements following
    Deloitte EGC format for tech startups.
    """
    
    def generate_balance_sheet(
        self,
        entity_id: int,
        as_of_date: date,
        comparative_date: Optional[date] = None,
        consolidated: bool = False
    ) -> Dict:
        """
        Generates classified balance sheet per Deloitte template.
        
        Returns:
        {
            'entity_name': str,
            'as_of_date': date,
            'comparative_date': date or None,
            'current_assets': [
                {'account': 'Cash and cash equivalents', 'amount': Decimal, 'prior_amount': Decimal},
                ...
            ],
            'noncurrent_assets': [...],
            'current_liabilities': [...],
            'noncurrent_liabilities': [...],
            'equity': [...],
            'totals': {
                'total_assets': Decimal,
                'total_assets_prior': Decimal,
                'total_liabilities': Decimal,
                'total_liabilities_prior': Decimal,
                'total_equity': Decimal,
                'total_equity_prior': Decimal
            },
            'balanced': bool  # Assets == Liabilities + Equity
        }
        """
        # Implementation using trial balance data
        
    def generate_income_statement(
        self,
        entity_id: int,
        start_date: date,
        end_date: date,
        comparative_start: Optional[date] = None,
        comparative_end: Optional[date] = None,
        include_nature_breakdown: bool = True  # 2025 requirement
    ) -> Dict:
        """
        Generates multi-step income statement with expense disaggregation.
        
        Returns statement data including functional and nature breakdowns.
        """
        
    def generate_cash_flow_statement(
        self,
        entity_id: int,
        start_date: date,
        end_date: date,
        comparative_start: Optional[date] = None,
        comparative_end: Optional[date] = None
    ) -> Dict:
        """
        Generates cash flow statement using indirect method (ASC 230).
        
        Reconciles net income to cash from operations.
        """
        
    def generate_equity_statement(
        self,
        entity_id: int,
        start_date: date,
        end_date: date
    ) -> Dict:
        """
        Generates statement of stockholders' equity showing all equity movements.
        """
        
    def generate_notes(
        self,
        entity_id: int,
        period_end: date
    ) -> Dict:
        """
        Generates all required GAAP notes based on Deloitte template.
        
        Returns structured data for each required note.
        """
```

---

## Acceptance Criteria

### AC-FR-001: Balance Sheet GAAP Compliance
- [ ] Classified presentation (current vs noncurrent)
- [ ] Assets = Liabilities + Equity (validation)
- [ ] Comparative periods (current + prior year)
- [ ] All line items per Deloitte template
- [ ] Dollar amounts in thousands with proper formatting
- [ ] Note references included
- [ ] "See accompanying notes" footer

### AC-FR-002: Income Statement with Expense Disaggregation
- [ ] Multi-step format
- [ ] Revenue, gross profit, operating income, net income
- [ ] Operating expenses by function (R&D, S&M, G&A)
- [ ] **NEW 2025**: Supplemental expense by nature disclosure
- [ ] EPS basic and diluted
- [ ] Comparative periods
- [ ] Expandable accordion for nature breakdown (UI)

### AC-FR-003: Cash Flow Indirect Method
- [ ] Indirect method reconciliation from net income
- [ ] Three sections: Operating, Investing, Financing
- [ ] Reconciliation of cash and restricted cash
- [ ] Supplemental disclosures (interest, taxes paid)
- [ ] Noncash activities schedule
- [ ] Net change equals beginning to ending cash

### AC-FR-004: Stockholders' Equity Statement
- [ ] Columns for each equity component
- [ ] Beginning balances
- [ ] All equity transactions (issuances, SBC, conversions)
- [ ] Net income flow-through
- [ ] OCI included
- [ ] Ending balances

### AC-FR-005: Complete Notes
- [ ] All 17 required notes per Deloitte template
- [ ] ASC 606 revenue disclosures
- [ ] ASC 842 lease disclosures
- [ ] ASC 820 fair value disclosures
- [ ] Properly formatted tables and amounts

### AC-FR-006: Modern shadcn UI
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Tab navigation between statements
- [ ] Accordion for drilldowns
- [ ] Entity and period selectors
- [ ] Export buttons (PDF, Excel)
- [ ] GAAP compliant badge
- [ ] Fast load times (<2 seconds)

---

## Testing Requirements

### Unit Tests (pytest)
```python
# tests/test_financial_statements_gaap.py

def test_balance_sheet_classification():
    """Test current vs noncurrent classification"""
    
def test_balance_sheet_equation():
    """Test Assets = Liabilities + Equity"""
    
def test_income_statement_expense_disaggregation():
    """Test 2025 requirement for expense by nature"""
    
def test_cash_flow_indirect_reconciliation():
    """Test net income to operating cash flow reconciliation"""
    
def test_equity_statement_completeness():
    """Test all equity movements captured"""
    
def test_notes_asc606_revenue():
    """Test ASC 606 revenue note completeness"""
    
def test_notes_asc842_leases():
    """Test ASC 842 lease note completeness"""
```

### E2E Tests (Playwright)
```typescript
// tests/e2e/financial-reporting.spec.ts

test('View balance sheet with comparative periods', async ({ page }) => {
  // Navigate to financial reporting
  // Select annual period
  // Verify balance sheet loads
  // Verify comparative columns
  // Verify balance equation
});

test('Drill down into expense by nature', async ({ page }) => {
  // Open income statement
  // Click R&D accordion
  // Verify nature breakdown appears
  // Verify amounts sum to total R&D
});

test('Export financial statements to PDF', async ({ page }) => {
  // Generate PDF
  // Verify download
  // Verify PDF contains all 5 statements
});
```

---

## Implementation Tasks

### Backend
- [ ] Create financial statement generator service
- [ ] Implement balance sheet calculation
- [ ] Implement income statement with disaggregation
- [ ] Implement cash flow indirect method
- [ ] Implement equity statement
- [ ] Implement all 17 notes generators
- [ ] Create caching layer for performance
- [ ] Build export endpoints (PDF, Excel)
- [ ] Write pytest tests

### Frontend
- [ ] Build FinancialStatementViewer page
- [ ] Create Tab navigation with shadcn Tabs
- [ ] Build BalanceSheet component
- [ ] Build IncomeStatement with Accordion drilldowns
- [ ] Build CashFlow component
- [ ] Build Equity component
- [ ] Build Notes component with collapsible sections
- [ ] Implement entity/period selectors
- [ ] Add export buttons with API calls
- [ ] Write Jest component tests

### Integration
- [ ] Connect frontend to backend APIs
- [ ] Test data flow from trial balance to statements
- [ ] Verify GAAP compliance with sample data
- [ ] Test comparative period logic
- [ ] Verify all calculations
- [ ] Test consolidated reporting

---

## Additional Features (Industry Standard)

### Real-Time Dashboard Widgets (shadcn Cards)
```typescript
// FinancialDashboard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';

export function FinancialDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Monthly Revenue"
        value="$125,450"
        change="+12.5%"
        trend="up"
        icon={DollarSign}
      />
      <KPICard
        title="Expenses (MTD)"
        value="$87,320"
        change="+3.2%"
        trend="up"
        icon={TrendingUp}
      />
      <KPICard
        title="Net Profit"
        value="$38,130"
        change="+45.8%"
        trend="up"
        icon={TrendingUp}
      />
      <KPICard
        title="Cash Balance"
        value="$542,890"
        change="-2.1%"
        trend="down"
        icon={DollarSign}
      />
    </div>
  );
}
```

### Budget vs Actual Component
```typescript
// BudgetVsActualReport.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export function BudgetVsActualReport({ data }: BudgetVsActualProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Account</TableHead>
          <TableHead className="text-right">Budget</TableHead>
          <TableHead className="text-right">Actual</TableHead>
          <TableHead className="text-right">Variance</TableHead>
          <TableHead className="text-right">%</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.account}>
            <TableCell>{row.accountName}</TableCell>
            <TableCell className="text-right font-mono">${row.budget.toLocaleString()}</TableCell>
            <TableCell className="text-right font-mono">${row.actual.toLocaleString()}</TableCell>
            <TableCell className="text-right font-mono">
              ${Math.abs(row.variance).toLocaleString()}
            </TableCell>
            <TableCell className="text-right">{row.variancePct}%</TableCell>
            <TableCell>
              <Badge variant={row.favorable ? 'success' : 'destructive'}>
                {row.favorable ? 'Favorable' : 'Unfavorable'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Scheduled Reports Configuration
```typescript
// ScheduledReportsConfig.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function ScheduledReportConfig() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Monthly Financials</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Frequency</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Format</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div>
          <Label>Recipients (comma-separated emails)</Label>
          <Input placeholder="investor1@example.com, investor2@example.com" />
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch id="active" />
          <Label htmlFor="active">Active</Label>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Success Metrics

- **GAAP Compliance**: 100% (validated by tests)
- **Statement Generation Time**: <3 seconds
- **Export Time (PDF)**: <5 seconds
- **UI Responsiveness**: <200ms interactions
- **Accuracy**: All calculations verified against manual calculations
- **Investor Acceptance**: Statements accepted by auditors without modifications
- **Dashboard Load Time**: <1 second for all KPIs
- **Scheduled Report Success Rate**: >99%
- **User Satisfaction**: QuickBooks-level ease of use

---

*End of Epic 4: Financial Reporting (Deloitte EGC Format with QuickBooks/Xero Features)*

