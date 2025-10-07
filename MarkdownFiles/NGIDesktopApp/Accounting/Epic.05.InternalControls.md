# Epic 5: Internal Controls - Visual Display for Investors

## Epic Summary
Implement visual internal controls dashboard that displays financial controls, authorization matrices, segregation of duties, and compliance indicators extracted from uploaded internal control documents. Provides investor-ready transparency into control environment with modern, animated UI.

---

## Business Value
- **Investor Confidence**: Professional controls display for due diligence
- **Compliance**: Visual proof of SOX-style controls (pre-IPO ready)
- **Risk Management**: Clear visibility into control gaps
- **Audit Support**: Pre-formatted for auditor review
- **Automation**: Extract controls from documents, no manual entry

---

## User Stories

### US-IC-001: Upload and Parse Internal Controls Document
**As a** partner
**I want to** upload our internal controls document
**So that** controls are automatically extracted and displayed

**Acceptance Criteria**:
- [ ] Upload Word/PDF internal controls document
- [ ] AI extracts: Control ID, Title, Type, Risk Level, Owner, Frequency
- [ ] Map to standard control categories
- [ ] Verification interface for extracted data
- [ ] Store in database with document link
- [ ] Version control for updated documents

### US-IC-002: Control Dashboard with KPIs
**As a** partner/investor
**I want to** see control effectiveness metrics
**So that** I can assess control environment health

**Acceptance Criteria**:
- [ ] KPI cards: Total Controls, Effective %, High-Risk, Operating Effectiveness
- [ ] Trend charts: Controls over time, Deficiencies resolved
- [ ] Entity selector (consolidated vs subsidiary)
- [ ] Period selector (current vs historical)
- [ ] Export dashboard to PDF
- [ ] Real-time status updates

### US-IC-003: Authorization Matrix Display
**As a** partner/investor
**I want to** view who can approve what amounts
**So that** segregation of duties is clear

**Acceptance Criteria**:
- [ ] Matrix: Role x Transaction Type x Amount Threshold
- [ ] Visual indicators (checkmarks, amounts)
- [ ] Dual approval requirements highlighted
- [ ] Board-level approvals marked
- [ ] Export to Excel/PDF
- [ ] Link to actual approval workflows

### US-IC-004: Financial Controls by Category
**As a** partner/investor
**I want to** view controls organized by category
**So that** I can review specific control areas

**Acceptance Criteria**:
- [ ] Categories: Cash Disbursements, Revenue Recognition, Financial Reporting, Bank Reconciliation, etc.
- [ ] Expandable/collapsible sections
- [ ] Control count per category
- [ ] Risk level indicators (High/Medium/Low)
- [ ] Frequency indicators (Daily/Monthly/Quarterly)
- [ ] Control owner/responsible party
- [ ] Status: Designed, Implemented, Operating Effectively

### US-IC-005: Segregation of Duties Matrix
**As a** partner/investor
**I want to** see segregation of duties enforcement
**So that** fraud risk is minimized

**Acceptance Criteria**:
- [ ] Matrix showing incompatible duties
- [ ] Cannot have: Preparer + Approver same person
- [ ] Cannot have: Custody + Recording same person
- [ ] Visual warnings for violations
- [ ] Compensating controls noted
- [ ] Entity-level SOD rules

### US-IC-006: Control Testing and Evidence
**As a** partner
**I want to** track control testing and evidence
**So that** auditors can verify effectiveness

**Acceptance Criteria**:
- [ ] Testing schedule per control
- [ ] Upload test evidence (screenshots, documents)
- [ ] Pass/fail results
- [ ] Deficiency tracking
- [ ] Remediation plan for failures
- [ ] Historical test results

---

## Control Categories (Standard)

### 1. Cash Disbursements Controls
```
IC-CD-001: Dual Approval for Payments >$5,000
  - Control Type: Preventive
  - Risk: High
  - Frequency: Per transaction
  - Owner: CFO
  - Description: All payments exceeding $5,000 require approval from two partners
  
IC-CD-002: Bank Account Reconciliation
  - Control Type: Detective
  - Risk: High
  - Frequency: Monthly
  - Owner: Controller
  - Description: All bank accounts reconciled within 5 business days of month-end

IC-CD-003: Vendor Master File Changes
  - Control Type: Preventive
  - Risk: Medium
  - Frequency: Per change
  - Owner: AP Manager
  - Description: New vendors and bank account changes require dual approval
```

### 2. Revenue Recognition Controls
```
IC-RR-001: Contract Review (ASC 606)
  - Control Type: Preventive
  - Risk: High
  - Frequency: Per contract
  - Owner: Revenue Controller
  - Description: All customer contracts reviewed for proper revenue recognition criteria

IC-RR-002: Deferred Revenue Calculation
  - Control Type: Preventive
  - Risk: High
  - Frequency: Monthly
  - Owner: Revenue Accountant
  - Description: Deferred revenue calculated and reviewed by controller

IC-RR-003: Revenue Cut-off
  - Control Type: Detective
  - Risk: Medium
  - Frequency: Month-end
  - Owner: Controller
  - Description: Review transactions 3 days before/after period end
```

### 3. Financial Reporting Controls
```
IC-FR-001: Trial Balance Review
  - Control Type: Detective
  - Risk: High
  - Frequency: Monthly
  - Owner: CFO
  - Description: Review trial balance for unusual balances and variances

IC-FR-002: Journal Entry Approval
  - Control Type: Preventive
  - Risk: High
  - Frequency: Per entry
  - Owner: Controller
  - Description: All manual journal entries reviewed and approved before posting

IC-FR-003: Financial Statement Review
  - Control Type: Detective
  - Risk: High
  - Frequency: Monthly
  - Owner: CFO + Co-Founders
  - Description: Complete financial statements reviewed before distribution
```

### 4. IT General Controls
```
IC-IT-001: User Access Review
  - Control Type: Detective
  - Risk: Medium
  - Frequency: Quarterly
  - Owner: IT Manager
  - Description: Review all accounting system users, remove terminated employees

IC-IT-002: Change Management
  - Control Type: Preventive
  - Risk: Medium
  - Frequency: Per change
  - Owner: IT Manager
  - Description: All system changes tested and approved before production

IC-IT-003: Data Backup
  - Control Type: Preventive
  - Risk: High
  - Frequency: Daily
  - Owner: IT Manager
  - Description: Daily automated backups with monthly restoration testing
```

---

## Database Schema

```sql
CREATE TABLE internal_controls (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES entities(id),
    
    -- Control identification
    control_id VARCHAR(50) UNIQUE NOT NULL, -- IC-CD-001
    control_title VARCHAR(255) NOT NULL,
    control_description TEXT NOT NULL,
    
    -- Classification
    control_category VARCHAR(100) NOT NULL, -- Cash Disbursements, Revenue, etc.
    control_type VARCHAR(50) NOT NULL, -- Preventive, Detective, Corrective
    risk_level VARCHAR(20) NOT NULL, -- High, Medium, Low
    
    -- SOX designation (for future IPO)
    is_key_control BOOLEAN DEFAULT FALSE,
    is_sox_control BOOLEAN DEFAULT FALSE,
    
    -- Execution
    frequency VARCHAR(50) NOT NULL, -- Per transaction, Daily, Weekly, Monthly, Quarterly, Annual
    responsible_party_id INTEGER REFERENCES partners(id),
    responsible_party_title VARCHAR(100), -- CFO, Controller, etc.
    
    -- Status
    design_status VARCHAR(50) DEFAULT 'designed', -- designed, implemented, operating
    operating_effectiveness VARCHAR(50), -- effective, needs_improvement, ineffective
    
    -- Testing
    last_tested_date DATE,
    last_test_result VARCHAR(50), -- passed, failed, not_applicable
    test_frequency VARCHAR(50), -- Quarterly, Annual
    next_test_date DATE,
    
    -- Documentation
    source_document_id INTEGER REFERENCES accounting_documents(id),
    evidence_required TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_controls_entity ON internal_controls(entity_id);
CREATE INDEX idx_controls_category ON internal_controls(control_category);
CREATE INDEX idx_controls_risk ON internal_controls(risk_level);

-- Authorization matrix
CREATE TABLE authorization_matrix (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES entities(id),
    
    -- Authorization rule
    role VARCHAR(100) NOT NULL, -- Partner, Controller, Manager
    transaction_type VARCHAR(100) NOT NULL, -- Expense, Invoice Payment, Payroll, etc.
    amount_min DECIMAL(15,2) DEFAULT 0.00,
    amount_max DECIMAL(15,2),
    
    -- Approval requirements
    approvals_required INTEGER DEFAULT 1,
    requires_board BOOLEAN DEFAULT FALSE,
    
    -- Segregation of duties
    cannot_be_preparer BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_authz_matrix_entity ON authorization_matrix(entity_id);

-- Control testing
CREATE TABLE control_test_results (
    id SERIAL PRIMARY KEY,
    control_id INTEGER REFERENCES internal_controls(id),
    
    -- Test details
    test_date DATE NOT NULL,
    test_period_start DATE,
    test_period_end DATE,
    sample_size INTEGER,
    
    -- Results
    test_result VARCHAR(50) NOT NULL, -- passed, failed, not_applicable
    exceptions_found INTEGER DEFAULT 0,
    exception_details TEXT,
    
    -- Evidence
    evidence_document_ids INTEGER[], -- Array of document IDs
    
    -- Follow-up
    remediation_required BOOLEAN DEFAULT FALSE,
    remediation_plan TEXT,
    remediation_completed BOOLEAN DEFAULT FALSE,
    
    -- Tester
    tested_by_id INTEGER REFERENCES partners(id),
    reviewed_by_id INTEGER REFERENCES partners(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_test_results_control ON control_test_results(control_id);
CREATE INDEX idx_test_results_date ON control_test_results(test_date);
```

---

## API Endpoints

```python
# Internal Controls Management
GET    /api/accounting/internal-controls                # List all controls
GET    /api/accounting/internal-controls/{id}           # Get single control
POST   /api/accounting/internal-controls                # Create control
PUT    /api/accounting/internal-controls/{id}           # Update control
DELETE /api/accounting/internal-controls/{id}           # Archive control

# Document Extraction
POST   /api/accounting/internal-controls/extract        # Extract from document
POST   /api/accounting/internal-controls/verify         # Verify extracted data

# Dashboard
GET    /api/accounting/internal-controls/dashboard      # Get dashboard data
GET    /api/accounting/internal-controls/kpis           # Get KPIs
GET    /api/accounting/internal-controls/by-category    # Group by category

# Authorization Matrix
GET    /api/accounting/authorization-matrix             # Get matrix
POST   /api/accounting/authorization-matrix             # Create rule
PUT    /api/accounting/authorization-matrix/{id}        # Update rule
GET    /api/accounting/authorization-matrix/export      # Export to Excel

# Control Testing
GET    /api/accounting/control-tests                    # List tests
POST   /api/accounting/control-tests                    # Record test result
PUT    /api/accounting/control-tests/{id}               # Update test
POST   /api/accounting/control-tests/{id}/evidence      # Upload evidence

# Reports
GET    /api/accounting/internal-controls/report         # Full controls report
GET    /api/accounting/internal-controls/sod-matrix     # Segregation of duties
```

---

## Frontend UI (shadcn Components)

### Internal Controls Dashboard
```typescript
// InternalControlsDashboard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';

export function InternalControlsDashboard() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Internal Controls</h1>
          <p className="text-muted-foreground">
            Financial control environment and compliance
          </p>
        </div>
        <Button onClick={uploadControlsDocument}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Controls Document
        </Button>
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Controls</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">
              12 Key Controls
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operating Effectiveness</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">96%</div>
            <Progress value={96} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              45 of 47 effective
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High-Risk Controls</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">
              All tested quarterly
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Control Deficiencies</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-green-600">
              Down from 5 last quarter
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs: By Category | Authorization Matrix | SOD Matrix */}
      <Tabs defaultValue="category" className="w-full">
        <TabsList>
          <TabsTrigger value="category">Controls by Category</TabsTrigger>
          <TabsTrigger value="authorization">Authorization Matrix</TabsTrigger>
          <TabsTrigger value="sod">Segregation of Duties</TabsTrigger>
          <TabsTrigger value="testing">Control Testing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="category">
          <ControlsByCategory />
        </TabsContent>
        
        <TabsContent value="authorization">
          <AuthorizationMatrix />
        </TabsContent>
        
        <TabsContent value="sod">
          <SegregationOfDutiesMatrix />
        </TabsContent>
        
        <TabsContent value="testing">
          <ControlTestingSchedule />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ControlsByCategory Component
function ControlsByCategory() {
  const categories = [
    {
      name: 'Cash Disbursements',
      icon: DollarSign,
      color: 'text-green-600',
      controls: 8,
      highRisk: 4,
      effective: 8
    },
    {
      name: 'Revenue Recognition',
      icon: TrendingUp,
      color: 'text-blue-600',
      controls: 6,
      highRisk: 3,
      effective: 6
    },
    // ... more categories
  ];
  
  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <Card key={category.name}>
          <CardHeader className="cursor-pointer" onClick={() => toggleCategory(category.name)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <category.icon className={cn("h-5 w-5", category.color)} />
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <Badge variant="outline">{category.controls} controls</Badge>
                {category.highRisk > 0 && (
                  <Badge variant="destructive">{category.highRisk} high-risk</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {category.effective}/{category.controls} effective
                </span>
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          
          {expandedCategories.has(category.name) && (
            <CardContent>
              <div className="space-y-3">
                {categoryControls[category.name].map((control) => (
                  <div key={control.id} className="border-l-4 border-blue-600 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">
                            {control.control_id}
                          </span>
                          <Badge variant={getRiskBadgeVariant(control.risk_level)}>
                            {control.risk_level}
                          </Badge>
                          <Badge variant="outline">{control.frequency}</Badge>
                        </div>
                        <h4 className="font-semibold mt-1">{control.control_title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {control.control_description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Owner: {control.responsible_party_title}</span>
                          <span>Type: {control.control_type}</span>
                          {control.last_tested_date && (
                            <span>Last Tested: {formatDate(control.last_tested_date)}</span>
                          )}
                        </div>
                      </div>
                      <Badge variant={getEffectivenessBadge(control.operating_effectiveness)}>
                        {control.operating_effectiveness}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

// AuthorizationMatrix Component
function AuthorizationMatrix() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Authorization Matrix</CardTitle>
        <CardDescription>
          Approval requirements by role and transaction type
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction Type</TableHead>
              <TableHead>Amount Range</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Controller</TableHead>
              <TableHead>CFO</TableHead>
              <TableHead>Co-Founder</TableHead>
              <TableHead>Board</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Expense Reimbursement</TableCell>
              <TableCell>$0 - $500</TableCell>
              <TableCell><CheckCircle2 className="h-4 w-4 text-green-600" /></TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Expense Reimbursement</TableCell>
              <TableCell>$500 - $5,000</TableCell>
              <TableCell>-</TableCell>
              <TableCell><CheckCircle2 className="h-4 w-4 text-green-600" /></TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Vendor Payment</TableCell>
              <TableCell>$5,000 - $50,000</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell><CheckCircle2 className="h-4 w-4 text-green-600" /></TableCell>
              <TableCell><CheckCircle2 className="h-4 w-4 text-green-600" /></TableCell>
              <TableCell>-</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Vendor Payment</TableCell>
              <TableCell>&gt; $50,000</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell><CheckCircle2 className="h-4 w-4 text-green-600" /></TableCell>
              <TableCell><CheckCircle2 className="h-4 w-4 text-green-600" /></TableCell>
              <TableCell><CheckCircle2 className="h-4 w-4 text-orange-600" />*</TableCell>
            </TableRow>
            {/* More rows... */}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground mt-4">
          * Board notification required, not approval
        </p>
      </CardContent>
    </Card>
  );
}
```

---

## Success Metrics

- **Control Coverage**: 100% of financial processes
- **Operating Effectiveness**: >95%
- **Investor Confidence**: Controls accepted in due diligence
- **Audit Efficiency**: 30% reduction in control testing time
- **Deficiency Resolution**: <30 days average

---

*End of Epic 5: Internal Controls*

