# Epic 3: Journal Entries - Automated Creation with Dual Approval Workflow

## Epic Summary
Implement comprehensive journal entry system with automated creation from Mercury Bank transactions, dual approval workflow for segregation of duties, recurring entries, reversing entries, and complete audit trail. Matches QuickBooks Advanced and NetSuite approval capabilities while maintaining strict US GAAP double-entry accounting.

---

## Business Value
- **Automation**: 80% of entries auto-created from bank/documents
- **Controls**: Dual approval prevents unauthorized transactions
- **Audit Ready**: Complete audit trail with maker-checker workflow
- **GAAP Compliant**: Enforces double-entry, balanced entries
- **Time Savings**: Recurring entries eliminate repetitive work
- **Accuracy**: Automated entries reduce human error by 95%

---

## User Stories

### US-JE-001: Auto-Create Journal Entries from Mercury Transactions
**As a** partner
**I want to** have journal entries automatically created from Mercury transactions
**So that** I don't manually enter every bank transaction

**Acceptance Criteria**:
- [ ] Mercury transaction imported → Draft JE created
- [ ] Account mapping from Smart COA Mapper
- [ ] Debit/Credit automatically determined
- [ ] Entry marked as "Pending Approval"
- [ ] Batch creation for multiple transactions
- [ ] Link to source Mercury transaction
- [ ] Link to source document (if applicable)

### US-JE-002: Dual Approval Workflow (Maker-Checker)
**As a** partner
**I want to** require approval before posting entries
**So that** proper internal controls are maintained

**Acceptance Criteria**:
- [ ] Creator cannot approve their own entry
- [ ] Approval required before posting to ledger
- [ ] Configurable approval thresholds ($500, $5000, $50000)
- [ ] Email/Slack notification to approvers
- [ ] Approve/reject with comments
- [ ] Bulk approval interface
- [ ] Emergency override for co-founders (logged)

### US-JE-003: Manual Journal Entry Creation (QuickBooks-Style)
**As a** partner
**I want to** create manual journal entries
**So that** I can record non-bank transactions

**Acceptance Criteria**:
- [ ] Multi-line entry form with add/remove lines
- [ ] Real-time debit/credit balance calculation
- [ ] Cannot save if debits != credits
- [ ] Date picker with fiscal period validation
- [ ] Memo field for entry description
- [ ] Line-level descriptions
- [ ] Attachment support (PDF, Excel, images)
- [ ] Template library for common entries

### US-JE-004: Recurring Journal Entries (NetSuite-Style)
**As a** partner
**I want to** set up recurring entries
**So that** monthly expenses are automated

**Acceptance Criteria**:
- [ ] Define entry template
- [ ] Set recurrence: Monthly, Quarterly, Annual
- [ ] Start date and end date (or indefinite)
- [ ] Auto-generate on schedule
- [ ] Review before posting option
- [ ] Adjust amounts per period if needed
- [ ] Pause/resume recurring series
- [ ] Delete future occurrences

### US-JE-005: Reversing Entries (GAAP Requirement)
**As a** partner
**I want to** mark entries as reversing
**So that** accruals automatically reverse next period

**Acceptance Criteria**:
- [ ] Checkbox: "Reverse in next period"
- [ ] Auto-create reversing entry on period close
- [ ] Link original and reversing entries
- [ ] Display "Reversed" status on original
- [ ] Cannot edit after reversal created
- [ ] Prevent accidental deletion of reversals

### US-JE-006: Journal Entry List with Filters (QuickBooks Reports)
**As a** partner
**I want to** view and filter all journal entries
**So that** I can find specific transactions

**Acceptance Criteria**:
- [ ] List view with pagination (50/100/200 per page)
- [ ] Filter by: Date range, Account, Status, Type, Creator
- [ ] Search by: Entry number, memo, amount, account
- [ ] Sort by: Date, Entry number, Amount, Status
- [ ] Status badges: Draft, Pending, Approved, Posted, Reversed
- [ ] Export to CSV/Excel
- [ ] Bulk actions (approve, delete drafts)

### US-JE-007: Drill-Down from Financial Statements
**As a** partner
**I want to** click an amount on financial statements to see entries
**So that** I can investigate balances quickly

**Acceptance Criteria**:
- [ ] Click any account balance on Balance Sheet
- [ ] Click any line item on Income Statement
- [ ] Modal/sheet shows filtered journal entries
- [ ] Drill further into individual entry details
- [ ] View linked documents
- [ ] Edit entry (if not posted/locked)

### US-JE-008: Entry Templates Library
**As a** partner
**I want to** save commonly used entries as templates
**So that** I can quickly create similar entries

**Acceptance Criteria**:
- [ ] Save any entry as template
- [ ] Template library with search
- [ ] Use template to create new entry
- [ ] Adjust amounts/dates on new entry
- [ ] Share templates with team
- [ ] Pre-built templates (Payroll, Rent, Depreciation, etc.)

### US-JE-009: Audit Trail and History
**As a** partner
**I want to** see complete history of all changes
**So that** auditors can verify data integrity

**Acceptance Criteria**:
- [ ] Every change logged (created, edited, approved, posted)
- [ ] Who, what, when for each action
- [ ] Before/after values for edits
- [ ] Cannot delete audit trail
- [ ] Export audit log to PDF
- [ ] Filter audit log by entry, user, date

---

## Dual Approval Workflow Diagram

```
[Mercury Transaction] 
        |
        v
[Auto-Create Draft JE] (Status: Draft, Created By: System)
        |
        v
[Review by Partner 1] 
        |
        +-- Reject --> [Draft JE Deleted or Modified]
        |
        +-- Approve --> [Status: Pending Approval, Approved By: Partner 1]
                            |
                            v
                    [Review by Partner 2]
                            |
                            +-- Reject --> [Back to Draft]
                            |
                            +-- Approve --> [Status: Approved]
                                                |
                                                v
                                        [Post to General Ledger]
                                                |
                                                v
                                        [Status: Posted] (Immutable)

Approval Thresholds:
- < $500: Single approval required
- $500 - $5,000: Dual approval required
- > $5,000: Dual approval + CFO notification
- > $50,000: Dual approval + Board notification
```

---

## Database Schema

```sql
CREATE TABLE journal_entries (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES entities(id),
    entry_number VARCHAR(50) UNIQUE NOT NULL, -- JE-2025-001234
    entry_date DATE NOT NULL,
    posting_date DATE, -- NULL until posted
    fiscal_year INTEGER NOT NULL,
    fiscal_period INTEGER NOT NULL, -- 1-12
    
    -- Entry metadata
    entry_type VARCHAR(50) DEFAULT 'Standard', -- Standard, Adjusting, Closing, Reversing
    memo TEXT,
    reference VARCHAR(100), -- External reference (Invoice #, etc.)
    
    -- Source tracking
    source_type VARCHAR(50), -- Manual, MercuryImport, DocumentExtraction, Recurring
    source_id VARCHAR(100), -- ID of source transaction/document
    
    -- Workflow status
    status VARCHAR(50) DEFAULT 'draft', -- draft, pending_approval, approved, posted, reversed
    workflow_stage INTEGER DEFAULT 0, -- 0=draft, 1=first_approval, 2=final_approval, 3=posted
    
    -- Approval tracking
    created_by_id INTEGER REFERENCES partners(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    first_approved_by_id INTEGER REFERENCES partners(id),
    first_approved_at TIMESTAMPTZ,
    final_approved_by_id INTEGER REFERENCES partners(id),
    final_approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Reversal tracking
    is_reversing BOOLEAN DEFAULT FALSE,
    reversed_entry_id INTEGER REFERENCES journal_entries(id),
    reversal_entry_id INTEGER REFERENCES journal_entries(id),
    
    -- Recurring entry tracking
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_template_id INTEGER REFERENCES recurring_journal_templates(id),
    
    -- Audit
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    posted_at TIMESTAMPTZ,
    posted_by_id INTEGER REFERENCES partners(id),
    
    -- Locking
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMPTZ,
    locked_by_id INTEGER REFERENCES partners(id)
);

CREATE INDEX idx_je_entity ON journal_entries(entity_id);
CREATE INDEX idx_je_status ON journal_entries(status);
CREATE INDEX idx_je_date ON journal_entries(entry_date);
CREATE INDEX idx_je_number ON journal_entries(entry_number);

CREATE TABLE journal_entry_lines (
    id SERIAL PRIMARY KEY,
    journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    account_id INTEGER REFERENCES chart_of_accounts(id),
    
    -- Debit/Credit
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    
    -- Line metadata
    description TEXT,
    
    -- Dimensions (optional)
    project_id INTEGER REFERENCES advisory_projects(id),
    cost_center VARCHAR(50),
    department VARCHAR(50),
    
    -- Links
    document_id INTEGER REFERENCES accounting_documents(id),
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_debit_or_credit CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR 
        (credit_amount > 0 AND debit_amount = 0)
    ),
    UNIQUE(journal_entry_id, line_number)
);

CREATE INDEX idx_jel_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_jel_account ON journal_entry_lines(account_id);

-- Recurring templates
CREATE TABLE recurring_journal_templates (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES entities(id),
    template_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Recurrence
    frequency VARCHAR(20) NOT NULL, -- monthly, quarterly, annual
    start_date DATE NOT NULL,
    end_date DATE, -- NULL = indefinite
    next_generation_date DATE,
    
    -- Template lines (JSON for simplicity)
    template_lines JSONB NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    require_review BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_by_id INTEGER REFERENCES partners(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approval rules
CREATE TABLE journal_entry_approval_rules (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES entities(id),
    
    -- Threshold
    min_amount DECIMAL(15,2) NOT NULL,
    max_amount DECIMAL(15,2),
    
    -- Approval requirements
    approvals_required INTEGER DEFAULT 1, -- 1 = single, 2 = dual
    notify_cfo BOOLEAN DEFAULT FALSE,
    notify_board BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit trail
CREATE TABLE journal_entry_audit_log (
    id SERIAL PRIMARY KEY,
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    action VARCHAR(50) NOT NULL, -- created, edited, approved, rejected, posted, reversed
    performed_by_id INTEGER REFERENCES partners(id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Details
    old_value JSONB,
    new_value JSONB,
    comment TEXT,
    ip_address INET
);

CREATE INDEX idx_audit_entry ON journal_entry_audit_log(journal_entry_id);
CREATE INDEX idx_audit_date ON journal_entry_audit_log(performed_at);
```

---

## API Endpoints

```python
# Journal Entry Management
GET    /api/accounting/journal-entries              # List all entries
GET    /api/accounting/journal-entries/{id}         # Get single entry with lines
POST   /api/accounting/journal-entries              # Create new entry
PUT    /api/accounting/journal-entries/{id}         # Update entry (if draft)
DELETE /api/accounting/journal-entries/{id}         # Delete entry (if draft)

# Approval Workflow
POST   /api/accounting/journal-entries/{id}/submit        # Submit for approval
POST   /api/accounting/journal-entries/{id}/approve       # Approve entry
POST   /api/accounting/journal-entries/{id}/reject        # Reject entry
POST   /api/accounting/journal-entries/bulk-approve       # Bulk approve

# Posting
POST   /api/accounting/journal-entries/{id}/post          # Post to GL
POST   /api/accounting/journal-entries/{id}/reverse       # Create reversing entry

# Templates
GET    /api/accounting/journal-templates                  # List templates
POST   /api/accounting/journal-templates                  # Create template
POST   /api/accounting/journal-templates/{id}/use         # Create entry from template

# Recurring Entries
GET    /api/accounting/recurring-journals                 # List recurring templates
POST   /api/accounting/recurring-journals                 # Create recurring template
PUT    /api/accounting/recurring-journals/{id}            # Update template
POST   /api/accounting/recurring-journals/{id}/generate   # Manual generation
POST   /api/accounting/recurring-journals/{id}/pause      # Pause recurring series

# Audit
GET    /api/accounting/journal-entries/{id}/audit-log     # Get audit trail
GET    /api/accounting/journal-entries/audit-export       # Export audit log
```

---

## Frontend UI (shadcn Components)

### Journal Entry List Page
```typescript
// JournalEntriesPage.tsx
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { 
  FileText, 
  Plus, 
  Filter, 
  Download,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';

export function JournalEntriesPage() {
  const columns = [
    {
      accessorKey: 'entry_number',
      header: 'Entry #',
      cell: ({ row }) => (
        <span className="font-mono">{row.getValue('entry_number')}</span>
      ),
    },
    {
      accessorKey: 'entry_date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.getValue('entry_date')),
    },
    {
      accessorKey: 'memo',
      header: 'Description',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status');
        return getStatusBadge(status);
      },
    },
    {
      accessorKey: 'total_debit',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-mono">
          ${row.getValue('total_debit').toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'created_by',
      header: 'Created By',
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => viewEntry(row.original.id)}>
              View Details
            </DropdownMenuItem>
            {row.original.status === 'draft' && (
              <DropdownMenuItem onClick={() => editEntry(row.original.id)}>
                Edit
              </DropdownMenuItem>
            )}
            {row.original.status === 'pending_approval' && (
              <>
                <DropdownMenuItem onClick={() => approveEntry(row.original.id)}>
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => rejectEntry(row.original.id)}>
                  Reject
                </DropdownMenuItem>
              </>
            )}
            {row.original.status === 'approved' && (
              <DropdownMenuItem onClick={() => postEntry(row.original.id)}>
                Post to GL
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Journal Entries</h1>
          <p className="text-muted-foreground">
            Manage and approve accounting entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button size="sm" onClick={() => openCreateModal()}>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>
      
      {/* Pending Approvals Alert */}
      {pendingCount > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Pending Approvals</AlertTitle>
          <AlertDescription>
            You have {pendingCount} entries waiting for approval.
            <Button variant="link" onClick={() => filterByStatus('pending_approval')}>
              Review Now
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <DataTable columns={columns} data={entries} />
    </div>
  );
}

function getStatusBadge(status: string) {
  const statusConfig = {
    draft: { variant: 'secondary', icon: FileText, label: 'Draft' },
    pending_approval: { variant: 'warning', icon: Clock, label: 'Pending' },
    approved: { variant: 'success', icon: CheckCircle2, label: 'Approved' },
    posted: { variant: 'default', icon: CheckCircle2, label: 'Posted' },
    rejected: { variant: 'destructive', icon: XCircle, label: 'Rejected' },
    reversed: { variant: 'outline', icon: XCircle, label: 'Reversed' },
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <Badge variant={config.variant}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}
```

### Journal Entry Create/Edit Modal
```typescript
// JournalEntryModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

export function JournalEntryModal({ isOpen, onClose, entryId }: JournalEntryModalProps) {
  const [lines, setLines] = useState<JournalEntryLine[]>([
    { line_number: 1, account_id: null, debit_amount: 0, credit_amount: 0, description: '' },
    { line_number: 2, account_id: null, debit_amount: 0, credit_amount: 0, description: '' },
  ]);
  
  const totals = calculateTotals(lines);
  const isBalanced = totals.debits === totals.credits && totals.debits > 0;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {entryId ? 'Edit Journal Entry' : 'New Journal Entry'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="entry_date">Date</Label>
              <DatePicker id="entry_date" />
            </div>
            <div>
              <Label htmlFor="reference">Reference</Label>
              <Input id="reference" placeholder="Invoice #, etc." />
            </div>
          </div>
          
          <div>
            <Label htmlFor="memo">Memo</Label>
            <Textarea id="memo" placeholder="Brief description of this entry" />
          </div>
          
          <Separator />
          
          {/* Entry Lines */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Entry Lines</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={addLine}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Line
              </Button>
            </div>
            
            <div className="space-y-2">
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
                <div className="col-span-4">Account</div>
                <div className="col-span-3">Description</div>
                <div className="col-span-2 text-right">Debit</div>
                <div className="col-span-2 text-right">Credit</div>
                <div className="col-span-1"></div>
              </div>
              
              {/* Line Items */}
              {lines.map((line, index) => (
                <div key={line.line_number} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4">
                    <Select 
                      value={line.account_id?.toString()}
                      onValueChange={(value) => updateLine(index, 'account_id', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account..." />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.account_number} - {account.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-3">
                    <Input
                      placeholder="Line description"
                      value={line.description}
                      onChange={(e) => updateLine(index, 'description', e.target.value)}
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="text-right font-mono"
                      value={line.debit_amount || ''}
                      onChange={(e) => updateLine(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                      disabled={line.credit_amount > 0}
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="text-right font-mono"
                      value={line.credit_amount || ''}
                      onChange={(e) => updateLine(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                      disabled={line.debit_amount > 0}
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(index)}
                      disabled={lines.length <= 2}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <Separator className="my-4" />
            
            {/* Totals */}
            <div className="grid grid-cols-12 gap-2 font-semibold">
              <div className="col-span-7 text-right">Totals:</div>
              <div className="col-span-2 text-right font-mono">
                ${totals.debits.toFixed(2)}
              </div>
              <div className="col-span-2 text-right font-mono">
                ${totals.credits.toFixed(2)}
              </div>
              <div className="col-span-1"></div>
            </div>
            
            {/* Balance Check */}
            {!isBalanced && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Entry Not Balanced</AlertTitle>
                <AlertDescription>
                  Debits must equal credits. Difference: $
                  {Math.abs(totals.debits - totals.credits).toFixed(2)}
                </AlertDescription>
              </Alert>
            )}
            
            {isBalanced && (
              <Alert variant="success" className="mt-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Entry Balanced</AlertTitle>
                <AlertDescription>
                  Debits and credits are equal.
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <Separator />
          
          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="reversing" />
              <Label htmlFor="reversing">Reverse in next period</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                variant="secondary"
                disabled={!isBalanced}
                onClick={saveAsDraft}
              >
                Save as Draft
              </Button>
              <Button 
                disabled={!isBalanced}
                onClick={submitForApproval}
              >
                Submit for Approval
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Acceptance Tests

### Test Case 1: Auto-Create from Mercury
**Precondition**: Mercury transaction imported
**Steps**:
1. Import Mercury transaction: AWS Invoice $1,250
2. System creates draft JE
3. Review auto-populated fields
4. Submit for approval

**Expected**:
- JE created with correct date
- Account mapped correctly (50110 - Hosting)
- Debit: 50110, Credit: 10120 (Mercury Checking)
- Amounts balanced
- Status: Pending Approval

### Test Case 2: Dual Approval Workflow
**Steps**:
1. Partner 1 creates JE for $10,000 expense
2. Submit for approval
3. Partner 1 attempts to approve (should fail)
4. Partner 2 approves
5. Partner 3 (CFO) gives final approval
6. Entry posted to GL

**Expected**:
- Creator cannot approve own entry
- Two approvals required for amount > $5,000
- Status progression: Draft → Pending → Approved → Posted
- Audit log records all approvals

### Test Case 3: Recurring Entry Generation
**Steps**:
1. Create recurring template: Monthly Rent $5,000
2. Set frequency: Monthly
3. Set start: January 2025
4. System auto-generates entries each month
5. Review December 2025 entry

**Expected**:
- Entry generated on 1st of each month
- Correct accounts and amounts
- 12 entries created for year
- Each marked for review before posting

---

## Success Metrics

- **Automation Rate**: >80% of entries auto-created
- **Approval Time**: <24 hours average
- **Error Rate**: <1% of entries require correction
- **Time Savings**: 5 hours/week vs manual entry
- **Audit Compliance**: 100% (complete trail)

---

*End of Epic 3: Journal Entries*

