# Epic 6: Bank Reconciliation - Automated Mercury Sync with Smart Matching

## Epic Summary
Implement comprehensive bank reconciliation system with automated Mercury Bank synchronization, AI-powered transaction matching, exception handling, and approval workflows. Matches QuickBooks Online and Xero reconciliation features while maintaining strict audit controls and GAAP compliance.

---

## Business Value
- **Time Savings**: 90% reduction in reconciliation time (15 min vs 2.5 hours)
- **Accuracy**: AI matching reduces errors to <0.5%
- **Real-Time**: Daily sync ensures up-to-date cash position
- **Audit Ready**: Complete reconciliation history and approval trail
- **Cash Management**: Immediate visibility into cleared vs outstanding items
- **Multi-Account**: Reconcile unlimited Mercury accounts across entities

---

## User Stories

### US-BR-001: Automated Mercury Bank Sync (QuickBooks-Style)
**As a** partner
**I want to** automatically sync Mercury transactions daily
**So that** bank data is always current without manual imports

**Acceptance Criteria**:
- [ ] OAuth connection to Mercury Bank API
- [ ] Daily automatic sync (configurable: hourly, daily, manual)
- [ ] Sync all connected Mercury accounts
- [ ] Import new transactions since last sync
- [ ] Transaction deduplication (prevent double import)
- [ ] Sync status dashboard with last sync time
- [ ] Error notifications if sync fails

### US-BR-002: Smart Transaction Matching (AI-Powered)
**As a** partner
**I want to** have bank transactions automatically matched to journal entries
**So that** I don't manually match hundreds of transactions

**Acceptance Criteria**:
- [ ] Exact amount + date matching (95% confidence)
- [ ] Fuzzy date matching (±3 days, 85% confidence)
- [ ] Multiple JEs to one bank transaction (splits)
- [ ] One JE to multiple bank transactions (batch)
- [ ] Confidence score for each match
- [ ] Manual override capability
- [ ] Learning from manual corrections

### US-BR-003: Reconciliation Workflow (NetSuite-Style)
**As a** partner
**I want to** perform monthly reconciliation with approval
**So that** cash accounts are verified and auditable

**Acceptance Criteria**:
- [ ] Select account and period
- [ ] Display: Beginning balance, Cleared items, Outstanding items, Ending balance
- [ ] Match/unmatch transactions
- [ ] Add adjusting entries (bank fees, interest)
- [ ] Reconciliation difference calculation
- [ ] Mark as "Reconciled" when balanced
- [ ] Require CFO approval
- [ ] Lock period after reconciliation

### US-BR-004: Outstanding Items Management
**As a** partner
**I want to** view all outstanding checks and deposits
**So that** I can follow up on uncleared items

**Acceptance Criteria**:
- [ ] List of outstanding checks (>30 days)
- [ ] List of outstanding deposits (>7 days)
- [ ] Aging buckets (0-7, 8-30, 31-60, 60+ days)
- [ ] Mark as void (checks)
- [ ] Create inquiry journal entry
- [ ] Export outstanding items report
- [ ] Alert for stale checks (>90 days)

### US-BR-005: Bank Feeds Rules Engine (Xero-Style)
**As a** partner
**I want to** create rules for automatic categorization
**So that** recurring transactions are handled automatically

**Acceptance Criteria**:
- [ ] Rule builder: If [description] contains [text] → categorize as [account]
- [ ] Multiple conditions (AND/OR logic)
- [ ] Amount range rules
- [ ] Vendor-specific rules
- [ ] Rule priority/ordering
- [ ] Apply rules to existing transactions
- [ ] Rule effectiveness report

### US-BR-006: Reconciliation Reports
**As a** partner
**I want to** generate reconciliation reports
**So that** I can provide audit evidence

**Acceptance Criteria**:
- [ ] Bank Reconciliation Summary (beginning/ending balance, cleared/outstanding)
- [ ] Outstanding Checks Report
- [ ] Outstanding Deposits Report
- [ ] Reconciliation History (all periods)
- [ ] Discrepancy Report (unmatched items)
- [ ] Export to PDF/Excel
- [ ] Email to auditors

### US-BR-007: Multi-Account Dashboard
**As a** partner
**I want to** see reconciliation status for all accounts
**So that** I know which accounts need attention

**Acceptance Criteria**:
- [ ] List all bank accounts (Mercury + manual)
- [ ] Last reconciliation date
- [ ] Status: Reconciled, Pending, Overdue, Never
- [ ] Unmatched transaction count
- [ ] Balance discrepancy (if any)
- [ ] One-click to reconcile
- [ ] Filter by entity, status, bank

---

## Bank Reconciliation Workflow

```
[Daily Mercury Sync]
        |
        v
[New Transactions Imported]
        |
        v
[AI Matching Engine]
        |
        +-- Exact Match (95%+) --> Auto-Match
        +-- Likely Match (80-94%) --> Suggest to User
        +-- No Match (<80%) --> Manual Review
        |
        v
[User Reviews Suggested Matches]
        |
        +-- Accept --> Mark as Matched
        +-- Reject --> Remains Unmatched
        |
        v
[Month-End Reconciliation]
        |
        v
[Review Outstanding Items]
        |
        v
[Add Adjusting Entries] (bank fees, interest)
        |
        v
[Calculate Reconciliation]
        |
        +-- Balanced --> Submit for Approval
        +-- Unbalanced --> Investigate Discrepancy
        |
        v
[CFO Approval]
        |
        v
[Period Locked] (Cannot modify matched transactions)
```

---

## AI Matching Algorithm

```python
class BankReconciliationMatcher:
    """
    Intelligent transaction matching engine for bank reconciliation.
    Uses multiple strategies with confidence scoring.
    """
    
    def match_transaction(self, bank_tx: BankTransaction) -> MatchResult:
        """
        Returns best match with confidence score.
        
        Matching Strategies (in order):
        1. Exact Match: Amount + Date + Reference (100% confidence)
        2. Amount + Date Match: Same amount, same date (95% confidence)
        3. Amount + Near Date: Same amount, ±3 days (85% confidence)
        4. Amount + Vendor: Same amount, vendor name match (80% confidence)
        5. Split Match: Bank amount = sum of multiple JEs (75% confidence)
        6. Partial Match: JE amount > bank amount (possible split) (60% confidence)
        
        Returns:
        {
            'match_type': 'exact' | 'likely' | 'possible' | 'none',
            'confidence': 0.95,
            'journal_entry_ids': [123, 456],
            'reasoning': 'Exact amount and date match',
            'alternative_matches': [...]
        }
        """
        
    # Matching rules
    EXACT_MATCH_CRITERIA = {
        'amount_tolerance': 0.00,  # Must be exact
        'date_tolerance_days': 0,
        'min_confidence': 0.95
    }
    
    LIKELY_MATCH_CRITERIA = {
        'amount_tolerance': 0.01,  # Allow 1 cent variance (rounding)
        'date_tolerance_days': 3,
        'min_confidence': 0.80
    }
    
    VENDOR_PATTERNS = {
        'AWS': ['Amazon Web Services', 'AWS', 'AMZN'],
        'Stripe': ['Stripe Inc', 'STRIPE', 'STRIPE.COM'],
        'Mercury': ['Mercury', 'MERCURY'],
    }
    
    def learn_from_manual_match(self, bank_tx_id: int, je_id: int):
        """
        Machine learning: improve matching from user corrections.
        """
        # Update vendor patterns
        # Adjust confidence thresholds
        # Store custom rules
```

---

## Database Schema

```sql
-- Bank accounts
CREATE TABLE bank_accounts (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES entities(id),
    bank_name VARCHAR(100) NOT NULL, -- Mercury, Chase, etc.
    account_name VARCHAR(255) NOT NULL, -- Operating Account, Payroll, etc.
    account_number_masked VARCHAR(20), -- Last 4 digits
    account_type VARCHAR(50) DEFAULT 'checking', -- checking, savings, credit_card
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Mercury API integration
    mercury_account_id VARCHAR(100) UNIQUE,
    mercury_access_token_encrypted TEXT,
    auto_sync_enabled BOOLEAN DEFAULT TRUE,
    sync_frequency VARCHAR(20) DEFAULT 'daily', -- hourly, daily, manual
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(50), -- success, failed, in_progress
    last_sync_error TEXT,
    
    -- GL account link
    gl_account_id INTEGER REFERENCES chart_of_accounts(id),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_accounts_entity ON bank_accounts(entity_id);
CREATE INDEX idx_bank_accounts_mercury ON bank_accounts(mercury_account_id);

-- Bank transactions (imported from Mercury)
CREATE TABLE bank_transactions (
    id SERIAL PRIMARY KEY,
    bank_account_id INTEGER REFERENCES bank_accounts(id),
    
    -- Transaction details
    transaction_date DATE NOT NULL,
    post_date DATE,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL, -- Positive = deposit, Negative = withdrawal
    running_balance DECIMAL(15,2),
    
    -- Mercury metadata
    mercury_transaction_id VARCHAR(100) UNIQUE,
    merchant_name VARCHAR(255),
    merchant_category VARCHAR(100),
    
    -- Reconciliation
    is_matched BOOLEAN DEFAULT FALSE,
    matched_at TIMESTAMPTZ,
    matched_by_id INTEGER REFERENCES partners(id),
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Status
    status VARCHAR(50) DEFAULT 'unmatched', -- unmatched, matched, excluded
    
    -- Audit
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(bank_account_id, transaction_date, amount, description)
);

CREATE INDEX idx_bank_tx_account ON bank_transactions(bank_account_id);
CREATE INDEX idx_bank_tx_date ON bank_transactions(transaction_date);
CREATE INDEX idx_bank_tx_status ON bank_transactions(status);
CREATE INDEX idx_bank_tx_mercury ON bank_transactions(mercury_transaction_id);

-- Transaction matching (many-to-many)
CREATE TABLE bank_transaction_matches (
    id SERIAL PRIMARY KEY,
    bank_transaction_id INTEGER REFERENCES bank_transactions(id),
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    match_type VARCHAR(50) NOT NULL, -- exact, likely, manual
    confidence DECIMAL(3,2),
    
    matched_by_id INTEGER REFERENCES partners(id),
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(bank_transaction_id, journal_entry_id)
);

CREATE INDEX idx_matches_bank_tx ON bank_transaction_matches(bank_transaction_id);
CREATE INDEX idx_matches_je ON bank_transaction_matches(journal_entry_id);

-- Reconciliation periods
CREATE TABLE bank_reconciliations (
    id SERIAL PRIMARY KEY,
    bank_account_id INTEGER REFERENCES bank_accounts(id),
    
    -- Period
    reconciliation_date DATE NOT NULL, -- Month-end date
    fiscal_year INTEGER NOT NULL,
    fiscal_period INTEGER NOT NULL,
    
    -- Balances
    beginning_balance DECIMAL(15,2) NOT NULL,
    ending_balance_per_bank DECIMAL(15,2) NOT NULL,
    ending_balance_per_books DECIMAL(15,2) NOT NULL,
    
    -- Items
    cleared_deposits DECIMAL(15,2) DEFAULT 0.00,
    cleared_withdrawals DECIMAL(15,2) DEFAULT 0.00,
    outstanding_deposits DECIMAL(15,2) DEFAULT 0.00,
    outstanding_checks DECIMAL(15,2) DEFAULT 0.00,
    adjustments DECIMAL(15,2) DEFAULT 0.00,
    
    -- Reconciliation
    difference DECIMAL(15,2) DEFAULT 0.00,
    is_balanced BOOLEAN DEFAULT FALSE,
    
    -- Workflow
    status VARCHAR(50) DEFAULT 'draft', -- draft, pending_approval, approved, locked
    prepared_by_id INTEGER REFERENCES partners(id),
    prepared_at TIMESTAMPTZ,
    approved_by_id INTEGER REFERENCES partners(id),
    approved_at TIMESTAMPTZ,
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(bank_account_id, reconciliation_date)
);

CREATE INDEX idx_reconciliations_account ON bank_reconciliations(bank_account_id);
CREATE INDEX idx_reconciliations_date ON bank_reconciliations(reconciliation_date);

-- Matching rules
CREATE TABLE bank_matching_rules (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES entities(id),
    bank_account_id INTEGER REFERENCES bank_accounts(id), -- NULL = all accounts
    
    -- Rule definition
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Conditions
    description_contains VARCHAR(255), -- Text to match in description
    amount_min DECIMAL(15,2),
    amount_max DECIMAL(15,2),
    merchant_name VARCHAR(255),
    
    -- Action
    auto_categorize_account_id INTEGER REFERENCES chart_of_accounts(id),
    auto_match BOOLEAN DEFAULT FALSE, -- Auto-match if conditions met
    
    -- Priority
    priority INTEGER DEFAULT 0, -- Higher = runs first
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    times_applied INTEGER DEFAULT 0,
    
    created_by_id INTEGER REFERENCES partners(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matching_rules_entity ON bank_matching_rules(entity_id);
CREATE INDEX idx_matching_rules_account ON bank_matching_rules(bank_account_id);
```

---

## API Endpoints

```python
# Bank Account Management
GET    /api/accounting/bank-accounts                     # List all accounts
POST   /api/accounting/bank-accounts                     # Add manual account
PUT    /api/accounting/bank-accounts/{id}                # Update account
POST   /api/accounting/bank-accounts/{id}/sync           # Manual sync trigger
GET    /api/accounting/bank-accounts/{id}/sync-status    # Check sync status

# Mercury Integration
POST   /api/accounting/mercury/connect                   # OAuth connection
POST   /api/accounting/mercury/sync-all                  # Sync all accounts
GET    /api/accounting/mercury/accounts                  # List Mercury accounts
POST   /api/accounting/mercury/import                    # Manual import

# Bank Transactions
GET    /api/accounting/bank-transactions                 # List transactions
GET    /api/accounting/bank-transactions/unmatched       # Get unmatched only
POST   /api/accounting/bank-transactions/{id}/match      # Manual match
POST   /api/accounting/bank-transactions/{id}/unmatch    # Remove match
POST   /api/accounting/bank-transactions/bulk-match      # Bulk matching

# Reconciliation
GET    /api/accounting/reconciliations                   # List reconciliations
GET    /api/accounting/reconciliations/{id}              # Get single recon
POST   /api/accounting/reconciliations                   # Start new recon
PUT    /api/accounting/reconciliations/{id}              # Update recon
POST   /api/accounting/reconciliations/{id}/submit       # Submit for approval
POST   /api/accounting/reconciliations/{id}/approve      # Approve recon
POST   /api/accounting/reconciliations/{id}/lock         # Lock period

# Reports
GET    /api/accounting/reconciliations/{id}/report       # Recon report
GET    /api/accounting/bank-accounts/{id}/outstanding    # Outstanding items
GET    /api/accounting/bank-accounts/dashboard           # Multi-account dashboard

# Matching Rules
GET    /api/accounting/bank-matching-rules               # List rules
POST   /api/accounting/bank-matching-rules               # Create rule
PUT    /api/accounting/bank-matching-rules/{id}          # Update rule
DELETE /api/accounting/bank-matching-rules/{id}          # Delete rule
POST   /api/accounting/bank-matching-rules/{id}/test     # Test rule
```

---

## Frontend UI (shadcn Components)

### Bank Reconciliation Page
```typescript
// BankReconciliationPage.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export function BankReconciliationPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Reconciliation</h1>
          <p className="text-muted-foreground">
            Reconcile Mercury accounts and manage outstanding items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={syncAllAccounts}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Now
          </Button>
          <Button size="sm" onClick={startReconciliation}>
            Start Reconciliation
          </Button>
        </div>
      </div>
      
      {/* Multi-Account Dashboard */}
      <div className="grid gap-4 md:grid-cols-3">
        {bankAccounts.map((account) => (
          <Card key={account.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{account.account_name}</CardTitle>
                <Badge variant={getReconciliationStatusVariant(account.status)}>
                  {account.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {account.bank_name} ****{account.account_number_masked}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current Balance:</span>
                  <span className="font-mono font-semibold">
                    ${account.current_balance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Last Reconciled:</span>
                  <span>{formatDate(account.last_reconciliation_date)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Unmatched Transactions:</span>
                  <span className="font-semibold">{account.unmatched_count}</span>
                </div>
                {account.last_sync_at && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Last Sync:</span>
                    <span>{formatRelativeTime(account.last_sync_at)}</span>
                  </div>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => reconcileAccount(account.id)}
              >
                Reconcile
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Tabs: Unmatched Transactions | Reconciliation History */}
      <Tabs defaultValue="unmatched" className="w-full">
        <TabsList>
          <TabsTrigger value="unmatched">
            Unmatched Transactions
            {unmatchedCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unmatchedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Reconciliation History</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding Items</TabsTrigger>
        </TabsList>
        
        <TabsContent value="unmatched">
          <UnmatchedTransactionsTable />
        </TabsContent>
        
        <TabsContent value="history">
          <ReconciliationHistoryTable />
        </TabsContent>
        
        <TabsContent value="outstanding">
          <OutstandingItemsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// UnmatchedTransactionsTable Component
function UnmatchedTransactionsTable() {
  return (
    <Card>
      <CardContent className="p-0">
        <DataTable
          columns={[
            { accessorKey: 'transaction_date', header: 'Date' },
            { accessorKey: 'description', header: 'Description' },
            { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => (
              <span className={cn(
                'font-mono',
                row.getValue('amount') < 0 ? 'text-red-600' : 'text-green-600'
              )}>
                ${Math.abs(row.getValue('amount')).toLocaleString()}
              </span>
            )},
            { 
              id: 'suggested_match', 
              header: 'Suggested Match',
              cell: ({ row }) => {
                const match = row.original.suggested_match;
                if (!match) return <span className="text-muted-foreground">No match found</span>;
                
                return (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      JE-{match.entry_number}
                    </span>
                    <Badge variant="outline">
                      {(match.confidence * 100).toFixed(0)}% match
                    </Badge>
                  </div>
                );
              }
            },
            {
              id: 'actions',
              cell: ({ row }) => (
                <div className="flex items-center gap-2">
                  {row.original.suggested_match && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => acceptMatch(row.original.id, row.original.suggested_match.id)}
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Accept
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => manualMatch(row.original.id)}
                  >
                    Manual Match
                  </Button>
                </div>
              ),
            },
          ]}
          data={unmatchedTransactions}
        />
      </CardContent>
    </Card>
  );
}
```

---

## Acceptance Tests

### Test Case 1: Automated Mercury Sync
**Steps**:
1. Connect Mercury account via OAuth
2. Enable daily auto-sync
3. Wait for scheduled sync (or trigger manual)
4. Verify transactions imported

**Expected**:
- All new transactions since last sync imported
- No duplicate transactions
- Correct amounts and dates
- Sync status updated

### Test Case 2: AI Matching Exact Match
**Steps**:
1. Create JE: Debit Expense $1,250, Credit Cash $1,250
2. Import Mercury transaction: AWS -$1,250 (same date)
3. System suggests match

**Expected**:
- Match suggested with 95%+ confidence
- User accepts match
- Both marked as "Matched"
- Cannot unmatch after reconciliation approval

### Test Case 3: Month-End Reconciliation
**Steps**:
1. Select account and month (December 2025)
2. Review unmatched transactions
3. Accept suggested matches
4. Add adjusting entry for bank fee
5. Calculate reconciliation
6. Submit for approval
7. CFO approves

**Expected**:
- Beginning balance = November ending balance
- Ending balance per bank = Mercury statement
- Ending balance per books matches after adjustments
- Difference = $0.00
- Status: Approved & Locked

---

## Success Metrics

- **Matching Accuracy**: >95% auto-match rate
- **Reconciliation Time**: <15 minutes per account
- **Sync Reliability**: >99.5% uptime
- **Outstanding Items**: <5% of monthly transactions
- **Audit Compliance**: 100% reconciled monthly

---

*End of Epic 6: Bank Reconciliation*

