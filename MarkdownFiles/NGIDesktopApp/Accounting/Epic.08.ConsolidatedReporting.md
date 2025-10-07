# Epic 8: Consolidated Reporting - Multi-Entity Financial Consolidation

## Epic Summary
Implement comprehensive consolidated financial reporting that combines NGI Capital Inc. (parent C-Corp) and NGI Capital Advisory LLC (subsidiary) with proper elimination entries, intercompany transaction tracking, and GAAP-compliant consolidation methodology.

---

## Business Value
- **Investor Reporting**: Single consolidated view of entire business
- **GAAP Compliance**: Proper consolidation per ASC 810
- **Decision Making**: Holistic financial picture across entities
- **Audit Ready**: Clean consolidation eliminations
- **Segment Reporting**: View by entity or consolidated
- **Performance Analysis**: Compare entity performance

---

## Entity Structure

```
NGI Capital Inc. (Parent - C-Corporation)
  |
  +-- 100% Ownership
  |
  +-- NGI Capital Advisory LLC (Subsidiary)
        - Provides advisory services to students/companies
        - Separate bank accounts and operations
        - Consolidated into parent financials
```

---

## User Stories

### US-CR-001: Entity Relationship Management
**As a** CFO (Andre)
**I want to** define parent-subsidiary relationships
**So that** consolidation happens automatically

**Acceptance Criteria**:
- [ ] Define parent entity (NGI Capital Inc.)
- [ ] Define subsidiary entity (NGI Capital Advisory LLC)
- [ ] Set ownership % (100%)
- [ ] Set relationship effective date
- [ ] Support multiple subsidiaries (future)
- [ ] Visual org chart display

### US-CR-002: Intercompany Transaction Tagging
**As a** accountant
**I want to** tag transactions as intercompany
**So that** they are eliminated in consolidation

**Acceptance Criteria**:
- [ ] Flag on journal entries: "Intercompany Transaction"
- [ ] Select counterparty entity
- [ ] Matching intercompany accounts (IC Receivable/Payable)
- [ ] Auto-suggest matching transaction in other entity
- [ ] Require balanced intercompany entries
- [ ] Report showing unmatched intercompany items

### US-CR-003: Automated Consolidation
**As a** CFO (Andre)
**I want to** generate consolidated financials automatically
**So that** I don't manually combine statements

**Acceptance Criteria**:
- [ ] Select entities to consolidate
- [ ] Select period
- [ ] System combines:
  - Assets (parent + subsidiary)
  - Liabilities (parent + subsidiary)
  - Revenue (parent + subsidiary)
  - Expenses (parent + subsidiary)
- [ ] Auto-generate elimination entries
- [ ] Consolidated trial balance
- [ ] Consolidated financial statements

### US-CR-004: Elimination Entries
**As a** CFO (Andre)
**I want to** system to eliminate intercompany items
**So that** consolidated statements show only external transactions

**Acceptance Criteria**:
- [ ] Eliminate intercompany receivables/payables
- [ ] Eliminate intercompany revenue/expenses
- [ ] Eliminate investment in subsidiary vs equity
- [ ] Eliminate intercompany profits (if any)
- [ ] Show elimination entries separately
- [ ] Audit trail for all eliminations

### US-CR-005: Entity-Level and Consolidated Views
**As a** co-founder
**I want to** toggle between entity and consolidated views
**So that** I can analyze performance at different levels

**Acceptance Criteria**:
- [ ] Entity selector: "NGI Capital Inc. Only", "Advisory LLC Only", "Consolidated"
- [ ] All reports support entity filter
- [ ] Dashboard KPIs for each entity
- [ ] Comparative analysis (parent vs sub vs consolidated)
- [ ] Export separate or consolidated reports

### US-CR-006: Consolidation Worksheet
**As a** CFO (Andre)
**I want to** view consolidation worksheet
**So that** I can verify all eliminations

**Acceptance Criteria**:
- [ ] Columns: Parent, Subsidiary, Eliminations, Consolidated
- [ ] Line-by-line account balances
- [ ] Elimination entries clearly marked
- [ ] Drill down to source transactions
- [ ] Export to Excel
- [ ] Footnote disclosure text

---

## Consolidation Methodology (ASC 810)

### Step 1: Combine Financial Statements
```
Consolidated = Parent + Subsidiary (Line by Line)

Example:
Cash (Parent):        $500,000
Cash (Subsidiary):    $150,000
Cash (Consolidated):  $650,000
```

### Step 2: Elimination Entries

#### A. Eliminate Investment in Subsidiary
```
DR  Equity - Advisory LLC (Sub's equity accounts)  $XXX,XXX
    CR  Investment in Advisory LLC (Parent)        $XXX,XXX
(Eliminate parent's investment account)
```

#### B. Eliminate Intercompany Payables/Receivables
```
DR  Intercompany Payable (Parent)   $50,000
    CR  Intercompany Receivable (Sub) $50,000
(Eliminate intercompany balances)
```

#### C. Eliminate Intercompany Revenue/Expenses
```
DR  Management Fee Revenue (Sub)    $25,000
    CR  Management Fee Expense (Parent) $25,000
(Eliminate intercompany management fees)
```

### Step 3: Generate Consolidated Statements
- Balance Sheet: Combined less eliminations
- Income Statement: Combined less eliminations
- Cash Flow: Combined less eliminations
- Equity: Parent equity only
- Notes: Disclose consolidation basis

---

## Database Schema

```sql
-- Entity relationships
CREATE TABLE entity_relationships (
    id SERIAL PRIMARY KEY,
    parent_entity_id INTEGER REFERENCES entities(id),
    subsidiary_entity_id INTEGER REFERENCES entities(id),
    
    -- Ownership
    ownership_percent DECIMAL(5,2) NOT NULL, -- 100.00
    ownership_effective_date DATE NOT NULL,
    ownership_end_date DATE, -- NULL if still owned
    
    -- Control
    has_control BOOLEAN DEFAULT TRUE,
    voting_rights_percent DECIMAL(5,2),
    
    -- Consolidation method
    consolidation_method VARCHAR(50) DEFAULT 'full', -- full, equity_method, cost
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(parent_entity_id, subsidiary_entity_id, ownership_effective_date)
);

CREATE INDEX idx_entity_rel_parent ON entity_relationships(parent_entity_id);
CREATE INDEX idx_entity_rel_sub ON entity_relationships(subsidiary_entity_id);

-- Intercompany transactions
CREATE TABLE intercompany_transactions (
    id SERIAL PRIMARY KEY,
    
    -- Transaction identification
    from_entity_id INTEGER REFERENCES entities(id),
    to_entity_id INTEGER REFERENCES entities(id),
    
    -- Journal entries
    from_journal_entry_id INTEGER REFERENCES journal_entries(id),
    to_journal_entry_id INTEGER REFERENCES journal_entries(id),
    
    -- Transaction details
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(100), -- Management Fee, Service Fee, Reimbursement, Loan
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    
    -- Reconciliation
    is_matched BOOLEAN DEFAULT FALSE,
    matched_at TIMESTAMPTZ,
    matched_by_id INTEGER REFERENCES partners(id),
    
    -- Elimination
    is_eliminated BOOLEAN DEFAULT FALSE,
    elimination_entry_id INTEGER REFERENCES journal_entries(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ic_from ON intercompany_transactions(from_entity_id);
CREATE INDEX idx_ic_to ON intercompany_transactions(to_entity_id);
CREATE INDEX idx_ic_matched ON intercompany_transactions(is_matched);

-- Consolidation periods
CREATE TABLE consolidated_financial_statements (
    id SERIAL PRIMARY KEY,
    
    -- Period
    fiscal_year INTEGER NOT NULL,
    fiscal_period INTEGER NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- monthly, quarterly, annual
    as_of_date DATE NOT NULL,
    
    -- Entities included
    parent_entity_id INTEGER REFERENCES entities(id),
    subsidiary_entity_ids INTEGER[], -- Array of entity IDs
    
    -- Statement data (cached for performance)
    balance_sheet_data JSONB,
    income_statement_data JSONB,
    cash_flow_data JSONB,
    equity_statement_data JSONB,
    
    -- Elimination entries
    elimination_entries_json JSONB,
    total_eliminations DECIMAL(15,2),
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, approved, final
    
    -- Approval
    generated_by_id INTEGER REFERENCES partners(id),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by_id INTEGER REFERENCES partners(id),
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(fiscal_year, fiscal_period, period_type)
);

CREATE INDEX idx_consol_period ON consolidated_financial_statements(fiscal_year, fiscal_period);
CREATE INDEX idx_consol_status ON consolidated_financial_statements(status);
```

---

## API Endpoints

```python
# Entity Relationships
GET    /api/accounting/entity-relationships              # List relationships
POST   /api/accounting/entity-relationships              # Create relationship
PUT    /api/accounting/entity-relationships/{id}         # Update relationship
DELETE /api/accounting/entity-relationships/{id}         # Remove relationship
GET    /api/accounting/entities/{id}/subsidiaries        # Get subsidiaries
GET    /api/accounting/entities/{id}/parent              # Get parent

# Intercompany Transactions
GET    /api/accounting/intercompany-transactions         # List all IC transactions
POST   /api/accounting/intercompany-transactions         # Create IC transaction
POST   /api/accounting/intercompany-transactions/{id}/match  # Match IC transaction
GET    /api/accounting/intercompany-transactions/unmatched   # Get unmatched
POST   /api/accounting/intercompany-transactions/reconcile   # Reconcile all

# Consolidation
POST   /api/accounting/consolidate                       # Generate consolidated statements
GET    /api/accounting/consolidated-statements           # List consolidated statements
GET    /api/accounting/consolidated-statements/{id}      # Get specific statement
GET    /api/accounting/consolidation-worksheet           # Get worksheet
POST   /api/accounting/consolidation/eliminations        # Generate elimination entries

# Reports
GET    /api/accounting/reports/entity-comparison         # Compare entities
GET    /api/accounting/reports/consolidation-rollup      # Rollup detail
GET    /api/accounting/reports/elimination-entries       # List eliminations
```

---

## Frontend UI (shadcn Components)

### Consolidated Financial Statements Viewer
```typescript
// ConsolidatedFinancialsPage.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, FileText, Download } from 'lucide-react';

export function ConsolidatedFinancialsPage() {
  const [selectedView, setSelectedView] = useState<'consolidated' | 'parent' | 'subsidiary'>('consolidated');
  const [period, setPeriod] = useState('2025-12');
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with Entity Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Statements</h1>
          <p className="text-muted-foreground">
            Multi-entity consolidated reporting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-12">December 2025</SelectItem>
              <SelectItem value="2025-09">September 2025 (Q3)</SelectItem>
              <SelectItem value="2025-06">June 2025 (Q2)</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedView} onValueChange={setSelectedView}>
            <SelectTrigger className="w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="consolidated">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  NGI Capital (Consolidated)
                </div>
              </SelectItem>
              <SelectItem value="parent">
                NGI Capital Inc. (Parent Only)
              </SelectItem>
              <SelectItem value="subsidiary">
                NGI Capital Advisory LLC (Sub Only)
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Entity Performance Comparison */}
      {selectedView === 'consolidated' && (
        <Card>
          <CardHeader>
            <CardTitle>Entity Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Parent (Inc.)</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className="font-mono">$1,250,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expenses:</span>
                    <span className="font-mono">$980,000</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Net Income:</span>
                    <span className="font-mono text-green-600">$270,000</span>
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Subsidiary (Advisory LLC)</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className="font-mono">$450,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expenses:</span>
                    <span className="font-mono">$320,000</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Net Income:</span>
                    <span className="font-mono text-green-600">$130,000</span>
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Consolidated</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className="font-mono">$1,675,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expenses:</span>
                    <span className="font-mono">$1,275,000</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Net Income:</span>
                    <span className="font-mono text-green-600">$400,000</span>
                  </div>
                </div>
                <Badge variant="outline" className="mt-2">
                  Eliminations: $25,000
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Financial Statements Tabs */}
      <Tabs defaultValue="balance-sheet">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="income">Income Statement</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flows</TabsTrigger>
          <TabsTrigger value="worksheet">Consolidation Worksheet</TabsTrigger>
          <TabsTrigger value="eliminations">Eliminations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="balance-sheet">
          <ConsolidatedBalanceSheet view={selectedView} period={period} />
        </TabsContent>
        
        <TabsContent value="income">
          <ConsolidatedIncomeStatement view={selectedView} period={period} />
        </TabsContent>
        
        <TabsContent value="cashflow">
          <ConsolidatedCashFlow view={selectedView} period={period} />
        </TabsContent>
        
        <TabsContent value="worksheet">
          <ConsolidationWorksheet period={period} />
        </TabsContent>
        
        <TabsContent value="eliminations">
          <EliminationEntriesTable period={period} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Consolidation Worksheet Component
function ConsolidationWorksheet({ period }: { period: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Consolidation Worksheet</CardTitle>
        <p className="text-sm text-muted-foreground">
          Detailed consolidation with eliminations
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Account</th>
                <th className="text-right py-2">Parent</th>
                <th className="text-right py-2">Subsidiary</th>
                <th className="text-right py-2">Eliminations</th>
                <th className="text-right py-2 font-bold">Consolidated</th>
              </tr>
            </thead>
            <tbody>
              {/* Assets */}
              <tr className="font-semibold bg-muted/50">
                <td className="py-2">ASSETS</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td className="py-2 pl-4">Cash and Cash Equivalents</td>
                <td className="text-right font-mono">$500,000</td>
                <td className="text-right font-mono">$150,000</td>
                <td className="text-right font-mono">-</td>
                <td className="text-right font-mono font-semibold">$650,000</td>
              </tr>
              <tr>
                <td className="py-2 pl-4">Accounts Receivable</td>
                <td className="text-right font-mono">$200,000</td>
                <td className="text-right font-mono">$75,000</td>
                <td className="text-right font-mono">-</td>
                <td className="text-right font-mono font-semibold">$275,000</td>
              </tr>
              <tr>
                <td className="py-2 pl-4">Intercompany Receivable</td>
                <td className="text-right font-mono">$50,000</td>
                <td className="text-right font-mono">-</td>
                <td className="text-right font-mono text-red-600">($50,000)</td>
                <td className="text-right font-mono font-semibold">$0</td>
              </tr>
              <tr>
                <td className="py-2 pl-4">Investment in Subsidiary</td>
                <td className="text-right font-mono">$300,000</td>
                <td className="text-right font-mono">-</td>
                <td className="text-right font-mono text-red-600">($300,000)</td>
                <td className="text-right font-mono font-semibold">$0</td>
              </tr>
              
              {/* Liabilities */}
              <tr className="font-semibold bg-muted/50 border-t">
                <td className="py-2">LIABILITIES</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td className="py-2 pl-4">Accounts Payable</td>
                <td className="text-right font-mono">$120,000</td>
                <td className="text-right font-mono">$45,000</td>
                <td className="text-right font-mono">-</td>
                <td className="text-right font-mono font-semibold">$165,000</td>
              </tr>
              <tr>
                <td className="py-2 pl-4">Intercompany Payable</td>
                <td className="text-right font-mono">-</td>
                <td className="text-right font-mono">$50,000</td>
                <td className="text-right font-mono text-red-600">($50,000)</td>
                <td className="text-right font-mono font-semibold">$0</td>
              </tr>
              
              {/* Equity */}
              <tr className="font-semibold bg-muted/50 border-t">
                <td className="py-2">EQUITY</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td className="py-2 pl-4">Common Stock</td>
                <td className="text-right font-mono">$1,000</td>
                <td className="text-right font-mono">$100</td>
                <td className="text-right font-mono text-red-600">($100)</td>
                <td className="text-right font-mono font-semibold">$1,000</td>
              </tr>
              <tr>
                <td className="py-2 pl-4">APIC</td>
                <td className="text-right font-mono">$677,458</td>
                <td className="text-right font-mono">$50,000</td>
                <td className="text-right font-mono text-red-600">($50,000)</td>
                <td className="text-right font-mono font-semibold">$677,458</td>
              </tr>
              <tr>
                <td className="py-2 pl-4">Retained Earnings</td>
                <td className="text-right font-mono">$270,000</td>
                <td className="text-right font-mono">$130,000</td>
                <td className="text-right font-mono text-red-600">($130,000)</td>
                <td className="text-right font-mono font-semibold">$270,000</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <Alert className="mt-4">
          <AlertTitle>Elimination Entries Summary</AlertTitle>
          <AlertDescription>
            1. Eliminate investment in subsidiary: $300,000<br/>
            2. Eliminate intercompany payable/receivable: $50,000<br/>
            3. Eliminate subsidiary equity accounts: $180,100<br/>
            Total Eliminations: $530,100
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
```

---

## Acceptance Tests

### Test Case 1: Define Entity Relationship
**Steps**:
1. Navigate to Entity Relationships
2. Create: Parent = NGI Capital Inc., Subsidiary = Advisory LLC
3. Set ownership: 100%
4. Set effective date: March 15, 2025 (conversion date)

**Expected**:
- Relationship created
- Org chart shows parent-sub structure
- Both entities visible in consolidation selector

### Test Case 2: Tag Intercompany Transaction
**Steps**:
1. Create JE in Parent: DR IC Receivable $50,000, CR Cash $50,000
2. Mark as "Intercompany", counterparty = Advisory LLC
3. Create matching JE in Sub: DR Cash $50,000, CR IC Payable $50,000

**Expected**:
- Both JEs flagged as intercompany
- System suggests match
- Report shows matched IC transaction

### Test Case 3: Generate Consolidated Statements
**Steps**:
1. Select "Consolidated" view
2. Select period: December 2025
3. Click "Generate Consolidated Statements"

**Expected**:
- System combines parent + sub balances
- Elimination entries auto-generated
- IC receivable/payable eliminated (net to $0)
- Consolidated Balance Sheet balanced
- Consolidated Income Statement shows combined revenue/expenses less IC eliminations

### Test Case 4: Consolidation Worksheet Verification
**Steps**:
1. Open Consolidation Worksheet
2. Verify each line: Parent + Sub + Eliminations = Consolidated
3. Check elimination entries

**Expected**:
- All accounts reconcile
- Eliminations properly applied
- Worksheet exports to Excel
- Audit trail of all eliminations

---

## Success Metrics

- **Consolidation Accuracy**: 100% (Assets = Liabilities + Equity)
- **Elimination Accuracy**: All IC items eliminated
- **Generation Time**: <10 seconds for consolidated statements
- **Investor Satisfaction**: Consolidated view preferred for analysis
- **Audit Acceptance**: Clean consolidation methodology

---

*End of Epic 8: Consolidated Reporting*

