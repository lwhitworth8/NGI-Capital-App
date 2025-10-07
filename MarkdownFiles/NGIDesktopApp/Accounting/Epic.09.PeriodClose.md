# Epic 9: Period Close Process - Month/Quarter/Year-End Workflows

## Epic Summary
Implement comprehensive period close process with guided workflows, automated checklist, pre-close validation, adjusting entries, reversing accruals, financial statement generation, and multi-level approval. Matches NetSuite and Sage Intacct period close capabilities with GAAP compliance controls.

---

## Business Value
- **Faster Close**: Reduce close time from 10 days to 3 days
- **Consistency**: Standardized checklist ensures nothing missed
- **Audit Ready**: Complete audit trail of close activities
- **Controls**: Lock periods prevent unauthorized changes
- **Visibility**: Real-time close progress dashboard
- **GAAP Compliance**: Automated validation of all GAAP requirements

---

## Period Close Workflow (NetSuite-Style)

```
[Pre-Close Activities] (Days 1-2)
    |
    +-- Bank Reconciliation (All accounts)
    +-- Review Unmatched Transactions
    +-- Review Expense Reports
    +-- Review AR/AP Aging
    +-- Inventory Counts (if applicable)
    |
    v
[Validation & Adjustments] (Day 3)
    |
    +-- Run Pre-Close Validation Report
    +-- Identify Missing Entries
    +-- Create Adjusting Entries:
        - Accrued Expenses
        - Deferred Revenue
        - Prepaid Expenses
        - Depreciation
        - Amortization
        - Stock-Based Compensation
        - Bad Debt Expense
    +-- Create Reversing Entries
    |
    v
[Trial Balance Review] (Day 3-4)
    |
    +-- Generate Unadjusted Trial Balance
    +-- Post Adjusting Entries
    +-- Generate Adjusted Trial Balance
    +-- Verify Balance Sheet Equation (Assets = Liab + Equity)
    +-- Verify Revenue/Expense Tie to Equity
    |
    v
[Financial Statements] (Day 4-5)
    |
    +-- Generate Income Statement
    +-- Generate Balance Sheet
    +-- Generate Cash Flow Statement
    +-- Generate Stockholders' Equity Statement
    +-- Generate Notes to Financial Statements
    +-- Review for GAAP Compliance
    |
    v
[Approval Workflow] (Day 5-7)
    |
    +-- CFO Review
    +-- Co-Founder Approval
    +-- Board Review (quarterly/annual only)
    +-- Auditor Review (annual only)
    |
    v
[Period Lock] (Day 7)
    |
    +-- Lock Accounting Period
    +-- Archive Financial Statements
    +-- Export to Investor Portal
    +-- Generate Next Period Opening Balances
    |
    v
[Post-Close Activities]
    |
    +-- Reverse Accruals
    +-- Open Next Period
    +-- Run Post-Close Reports
    +-- Update Budgets/Forecasts
```

---

## User Stories

### US-PC-001: Guided Close Checklist
**As a** partner
**I want to** follow a step-by-step checklist for period close
**So that** I don't miss critical tasks

**Acceptance Criteria**:
- [ ] Checklist items: Bank Rec, Adjustments, Trial Balance, Statements, Approval
- [ ] Each item shows: Status, Assigned To, Due Date, Completion %
- [ ] Dependencies (can't complete step 3 until step 2 done)
- [ ] Auto-check items when completed (e.g., bank rec approved)
- [ ] Progress bar (0-100%)
- [ ] Email reminders for overdue items
- [ ] Save checklist template for next period

### US-PC-002: Pre-Close Validation Report
**As a** partner
**I want to** run validation before closing
**So that** I catch errors early

**Acceptance Criteria**:
- [ ] Check: All bank accounts reconciled
- [ ] Check: No unmatched bank transactions
- [ ] Check: No draft journal entries
- [ ] Check: Balance sheet balanced
- [ ] Check: Cash flow reconciliation
- [ ] Check: All documents approved
- [ ] Check: Revenue recognition complete (ASC 606)
- [ ] Check: Lease accounting current (ASC 842)
- [ ] Red/yellow/green status indicators
- [ ] Detailed error messages with links to fix

### US-PC-003: Automated Standard Adjustments
**As a** partner
**I want to** auto-generate recurring adjusting entries
**So that** I don't manually create same entries every month

**Acceptance Criteria**:
- [ ] Template: Monthly Depreciation (calculate from fixed asset schedule)
- [ ] Template: Amortization (calculate from intangible asset schedule)
- [ ] Template: Stock-Based Compensation (from equity module)
- [ ] Template: Bad Debt Expense (% of AR)
- [ ] Template: Prepaid Expense Amortization
- [ ] Template: Deferred Revenue Recognition
- [ ] One-click "Generate All Standard Adjustments"
- [ ] Review before posting

### US-PC-004: Reversing Accruals Management
**As a** partner
**I want to** automatically reverse accruals next period
**So that** I don't manually create reversing entries

**Acceptance Criteria**:
- [ ] Mark JE as "Reversing" during creation
- [ ] On period close, auto-generate reversing entry for next period
- [ ] Reversing entry posted on day 1 of next period
- [ ] Link original and reversing entries
- [ ] Cannot delete reversing entry without approval
- [ ] Report showing all reversing entries

### US-PC-005: Trial Balance with Adjustments
**As a** partner
**I want to** see unadjusted, adjustments, and adjusted trial balance
**So that** I can verify all adjusting entries

**Acceptance Criteria**:
- [ ] Three columns: Unadjusted, Adjustments, Adjusted
- [ ] Account-by-account detail
- [ ] Subtotals by account type
- [ ] Grand totals (debits = credits)
- [ ] Drill down to journal entries
- [ ] Export to Excel
- [ ] Compare to prior period

### US-PC-006: Period Lock with Approval
**As a** partner
**I want to** lock periods after approval
**So that** financial statements cannot be altered

**Acceptance Criteria**:
- [ ] CFO initiates period close
- [ ] Co-Founder(s) approve
- [ ] System locks period (no new transactions)
- [ ] Locked icon on periods
- [ ] Emergency unlock requires board approval (logged)
- [ ] Cannot delete transactions in locked periods
- [ ] Can view but not edit

### US-PC-007: Close Progress Dashboard
**As a** partner
**I want to** see real-time close status
**So that** I know if we're on track

**Acceptance Criteria**:
- [ ] Overall progress: 45% complete
- [ ] Task breakdown with owners
- [ ] Days until target close date
- [ ] Bottleneck identification
- [ ] Historical close times (trend)
- [ ] Team performance metrics
- [ ] Mobile-friendly view

### US-PC-008: Financial Statement Package Generation
**As a** partner
**I want to** generate complete statement package
**So that** I can distribute to stakeholders

**Acceptance Criteria**:
- [ ] Include: All 5 statements + Notes
- [ ] Cover page with entity, period, date
- [ ] Table of contents
- [ ] Page numbers and cross-references
- [ ] GAAP disclaimer
- [ ] Export as single PDF
- [ ] Email to distribution list
- [ ] Archive in Documents module

---

## Database Schema

```sql
CREATE TABLE accounting_periods (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES entities(id),
    
    -- Period definition
    period_type VARCHAR(20) NOT NULL, -- monthly, quarterly, annual
    fiscal_year INTEGER NOT NULL,
    fiscal_period INTEGER, -- 1-12 for monthly, 1-4 for quarterly, NULL for annual
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'open', -- open, closing, closed, locked
    
    -- Close workflow
    close_started_by_id INTEGER REFERENCES partners(id),
    close_started_at TIMESTAMPTZ,
    close_target_date DATE,
    close_actual_date DATE,
    
    -- Approval
    cfo_approved_by_id INTEGER REFERENCES partners(id),
    cfo_approved_at TIMESTAMPTZ,
    final_approved_by_id INTEGER REFERENCES partners(id),
    final_approved_at TIMESTAMPTZ,
    
    -- Lock
    is_locked BOOLEAN DEFAULT FALSE,
    locked_by_id INTEGER REFERENCES partners(id),
    locked_at TIMESTAMPTZ,
    unlock_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(entity_id, fiscal_year, period_type, fiscal_period)
);

CREATE INDEX idx_periods_entity ON accounting_periods(entity_id);
CREATE INDEX idx_periods_status ON accounting_periods(status);
CREATE INDEX idx_periods_dates ON accounting_periods(start_date, end_date);

-- Period close checklist
CREATE TABLE period_close_checklist_items (
    id SERIAL PRIMARY KEY,
    period_id INTEGER REFERENCES accounting_periods(id),
    
    -- Task definition
    task_name VARCHAR(255) NOT NULL,
    task_category VARCHAR(100), -- Pre-Close, Adjustments, Statements, Approval
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    
    -- Dependencies
    depends_on_task_id INTEGER REFERENCES period_close_checklist_items(id),
    
    -- Assignment
    assigned_to_id INTEGER REFERENCES partners(id),
    due_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, blocked
    completed_by_id INTEGER REFERENCES partners(id),
    completed_at TIMESTAMPTZ,
    
    -- Validation
    requires_validation BOOLEAN DEFAULT FALSE,
    validation_status VARCHAR(50), -- passed, failed, skipped
    validation_error TEXT,
    
    -- Automation
    auto_completable BOOLEAN DEFAULT FALSE,
    auto_completed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checklist_period ON period_close_checklist_items(period_id);
CREATE INDEX idx_checklist_status ON period_close_checklist_items(status);

-- Pre-defined checklist templates
CREATE TABLE period_close_checklist_templates (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES entities(id),
    template_name VARCHAR(255) NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- monthly, quarterly, annual
    
    -- Template items (JSON for simplicity)
    items JSONB NOT NULL,
    
    is_default BOOLEAN DEFAULT FALSE,
    
    created_by_id INTEGER REFERENCES partners(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Close validation results
CREATE TABLE period_close_validations (
    id SERIAL PRIMARY KEY,
    period_id INTEGER REFERENCES accounting_periods(id),
    
    -- Validation
    validation_type VARCHAR(100) NOT NULL, -- bank_rec, balance_sheet, cash_flow, etc.
    validation_status VARCHAR(50) NOT NULL, -- passed, warning, failed
    validation_message TEXT,
    validation_details JSONB,
    
    -- Resolution
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by_id INTEGER REFERENCES partners(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    validated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_validations_period ON period_close_validations(period_id);
CREATE INDEX idx_validations_status ON period_close_validations(validation_status);

-- Standard adjustments
CREATE TABLE standard_adjustments (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES entities(id),
    
    -- Adjustment definition
    adjustment_name VARCHAR(255) NOT NULL,
    adjustment_type VARCHAR(100) NOT NULL, -- depreciation, amortization, sbc, bad_debt, etc.
    description TEXT,
    
    -- Calculation
    calculation_method VARCHAR(100), -- manual, formula, schedule
    calculation_formula TEXT,
    
    -- Template JE lines (JSON)
    journal_entry_template JSONB NOT NULL,
    
    -- Frequency
    frequency VARCHAR(20) DEFAULT 'monthly', -- monthly, quarterly, annual
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    auto_generate BOOLEAN DEFAULT FALSE,
    
    created_by_id INTEGER REFERENCES partners(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Endpoints

```python
# Period Management
GET    /api/accounting/periods                          # List periods
GET    /api/accounting/periods/{id}                     # Get period details
POST   /api/accounting/periods                          # Create new period
PUT    /api/accounting/periods/{id}                     # Update period
POST   /api/accounting/periods/{id}/start-close         # Initiate close
POST   /api/accounting/periods/{id}/approve             # Approve close
POST   /api/accounting/periods/{id}/lock                # Lock period
POST   /api/accounting/periods/{id}/unlock              # Emergency unlock

# Close Checklist
GET    /api/accounting/periods/{id}/checklist           # Get checklist
POST   /api/accounting/periods/{id}/checklist/items     # Add checklist item
PUT    /api/accounting/checklist-items/{id}             # Update item status
POST   /api/accounting/checklist-items/{id}/complete    # Mark complete
GET    /api/accounting/checklist/templates              # List templates
POST   /api/accounting/checklist/templates              # Create template

# Validation
POST   /api/accounting/periods/{id}/validate            # Run pre-close validation
GET    /api/accounting/periods/{id}/validations         # Get validation results
POST   /api/accounting/validations/{id}/resolve         # Mark validation resolved

# Standard Adjustments
GET    /api/accounting/standard-adjustments             # List adjustments
POST   /api/accounting/standard-adjustments             # Create adjustment
POST   /api/accounting/standard-adjustments/generate    # Generate for period
GET    /api/accounting/periods/{id}/trial-balance       # Get trial balance

# Close Dashboard
GET    /api/accounting/periods/{id}/dashboard           # Get close dashboard
GET    /api/accounting/periods/history                  # Close time history
GET    /api/accounting/periods/current-status           # Current period status

# Financial Statements Package
POST   /api/accounting/periods/{id}/generate-package    # Generate complete package
GET    /api/accounting/periods/{id}/package             # Download package
POST   /api/accounting/periods/{id}/distribute          # Email to stakeholders
```

---

## Frontend UI (shadcn Components)

### Period Close Dashboard
```typescript
// PeriodCloseDashboard.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Lock,
  Play,
  FileCheck 
} from 'lucide-react';

export function PeriodCloseDashboard({ period }: { period: AccountingPeriod }) {
  const progress = calculateCloseProgress(period);
  const daysRemaining = calculateDaysRemaining(period.close_target_date);
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Period Close: {period.fiscal_year} Q{period.fiscal_period}
          </h1>
          <p className="text-muted-foreground">
            {formatDate(period.start_date)} - {formatDate(period.end_date)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(period.status)}>
            {period.status.toUpperCase()}
          </Badge>
          {period.status === 'open' && (
            <Button onClick={() => startClose(period.id)}>
              <Play className="mr-2 h-4 w-4" />
              Start Close
            </Button>
          )}
          {period.status === 'closing' && (
            <Button variant="destructive" onClick={() => lockPeriod(period.id)}>
              <Lock className="mr-2 h-4 w-4" />
              Lock Period
            </Button>
          )}
        </div>
      </div>
      
      {/* Progress Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{progress.percentage}%</div>
            <Progress value={progress.percentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {progress.completed} of {progress.total} tasks
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Remaining</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-3xl font-bold",
              daysRemaining < 2 && "text-red-600"
            )}>
              {daysRemaining}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Target: {formatDate(period.close_target_date)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validation Status</CardTitle>
            {validationsPassed ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {validationResults.passed} / {validationResults.total}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {validationResults.failed} failed checks
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {period.cfo_approved_at ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-600" />
                )}
                <span className="text-sm">CFO Approval</span>
              </div>
              <div className="flex items-center gap-2">
                {period.final_approved_at ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-600" />
                )}
                <span className="text-sm">Final Approval</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Validation Alerts */}
      {validationResults.failed > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Pre-Close Validation Failed</AlertTitle>
          <AlertDescription>
            {validationResults.failed} validation checks failed. Please resolve before closing.
            <Button variant="link" onClick={() => showValidationDetails()}>
              View Details
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Close Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Close Checklist</CardTitle>
          <CardDescription>
            Complete all tasks to lock the period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CloseChecklist periodId={period.id} />
        </CardContent>
      </Card>
      
      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Standard Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => generateStandardAdjustments(period.id)}>
              Generate All Adjustments
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Depreciation, Amortization, SBC, Bad Debt
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trial Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={() => viewTrialBalance(period.id)}>
              View Trial Balance
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Unadjusted, Adjustments, Adjusted
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financial Statements</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={() => generateStatements(period.id)}>
              Generate Package
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              All 5 statements + notes
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// CloseChecklist Component
function CloseChecklist({ periodId }: { periodId: number }) {
  const { data: items } = useQuery(['checklist', periodId], () => fetchChecklistItems(periodId));
  
  const groupedItems = groupBy(items, 'task_category');
  
  return (
    <div className="space-y-6">
      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            {category}
            <Badge variant="outline">
              {categoryItems.filter(i => i.status === 'completed').length} / {categoryItems.length}
            </Badge>
          </h3>
          
          <div className="space-y-2">
            {categoryItems.map((item) => (
              <div 
                key={item.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
              >
                <Checkbox
                  checked={item.status === 'completed'}
                  onCheckedChange={() => toggleChecklistItem(item.id)}
                  disabled={item.depends_on_task_id && !isDependencyComplete(item.depends_on_task_id)}
                />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-medium",
                      item.status === 'completed' && "line-through text-muted-foreground"
                    )}>
                      {item.task_name}
                    </span>
                    <Badge variant={getTaskStatusVariant(item.status)}>
                      {item.status}
                    </Badge>
                    {item.validation_status === 'failed' && (
                      <Badge variant="destructive">
                        Validation Failed
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  )}
                </div>
                
                <div className="text-right">
                  {item.assigned_to && (
                    <p className="text-xs text-muted-foreground">
                      {item.assigned_to.name}
                    </p>
                  )}
                  {item.due_date && (
                    <p className={cn(
                      "text-xs",
                      isOverdue(item.due_date) && "text-red-600 font-semibold"
                    )}>
                      {formatDate(item.due_date)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Acceptance Tests

### Test Case 1: Start Period Close
**Steps**:
1. Navigate to December 2025 period
2. Click "Start Close"
3. System generates checklist from template
4. Assigns tasks to team members

**Expected**:
- Status changes to "Closing"
- Checklist created with 15+ items
- Email sent to assigned team members
- Close target date set to 7 days out

### Test Case 2: Pre-Close Validation
**Steps**:
1. Run pre-close validation
2. Review validation results

**Expected**:
- Checks: Bank rec (pass), Draft JEs (fail - 2 drafts found), Balance sheet (pass)
- Failed items highlighted in red
- Link to resolve each issue
- Cannot lock period until all pass

### Test Case 3: Generate Standard Adjustments
**Steps**:
1. Click "Generate All Standard Adjustments"
2. System creates JEs for depreciation, amortization, SBC
3. Review generated entries
4. Post to GL

**Expected**:
- 4 journal entries created (one for each adjustment type)
- Correct accounts and amounts
- Marked as "Adjusting Entry"
- Can edit before posting

### Test Case 4: Lock Period
**Steps**:
1. Complete all checklist items
2. CFO approves
3. Co-Founder gives final approval
4. Click "Lock Period"

**Expected**:
- Period status: "Locked"
- Lock icon displayed
- Cannot create/edit transactions
- Financial statements archived
- Next period opens automatically

---

## Success Metrics

- **Close Time**: <3 days (vs 10 days manual)
- **Checklist Completion**: 100% before lock
- **Validation Pass Rate**: >95% first attempt
- **On-Time Close**: >90% of periods
- **Post-Close Adjustments**: <2% of entries

---

*End of Epic 9: Period Close Process*

