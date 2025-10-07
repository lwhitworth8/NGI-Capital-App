# Epic 2: Chart of Accounts - Pre-Seeded US GAAP 5-Digit COA

## Epic Summary
Implement a comprehensive, pre-seeded 5-digit Chart of Accounts following US GAAP standards for tech startups. The system includes smart account mapping from Mercury Bank transactions, QuickBooks-style account management, and hierarchical account structure supporting multi-entity reporting.

**Industry Standard**: Based on standardized COA used by QuickBooks, NetSuite, and public company reporting requirements.

---

## Business Value
- **GAAP Compliance**: Industry-standard account structure ready for audits
- **Smart Mapping**: AI-powered transaction categorization reduces manual work by 80%
- **Multi-Entity**: Shared COA across entities with entity-specific accounts
- **Investor Ready**: Professional account structure for due diligence
- **Time Savings**: Pre-seeded accounts eliminate setup time
- **Scalability**: 5-digit structure accommodates growth to public company

---

## 5-Digit Account Structure

### Account Number Format: `XXXXX`
- **1st Digit**: Account Type (1=Assets, 2=Liabilities, 3=Equity, 4=Revenue, 5=Expenses)
- **2nd Digit**: Major Category
- **3rd-5th Digits**: Specific Account

### Example Accounts:
```
10000-19999: ASSETS
  10000-10999: Current Assets
    10100: Cash and Cash Equivalents
    10110: Petty Cash
    10120: Mercury Business Checking - NGI LLC
    10130: Mercury Business Checking - NGI Capital Inc
    10200: Restricted Cash
    10300: Accounts Receivable
    10310: AR - Consulting Services
    10320: AR - Advisory Fees
    10390: Allowance for Doubtful Accounts
    10400: Contract Assets (ASC 606)
    10500: Prepaid Expenses
    10510: Prepaid Insurance
    10520: Prepaid Software Subscriptions
    10530: Prepaid Rent
    10600: Other Current Assets
    
  11000-11999: Fixed Assets
    11100: Property and Equipment, at Cost
    11110: Computer Equipment
    11120: Office Furniture and Fixtures
    11130: Leasehold Improvements
    11190: Accumulated Depreciation - PPE
    11200: Capitalized Software Development Costs (ASC 350-40)
    11290: Accumulated Amortization - Software
    
  12000-12999: Intangible Assets
    12100: Goodwill (ASC 350)
    12200: Customer Relationships
    12300: Developed Technology
    12390: Accumulated Amortization - Intangibles
    
  13000-13999: Other Noncurrent Assets
    13100: Operating Lease Right-of-Use Assets (ASC 842)
    13200: Deposits
    13300: Deferred Tax Assets
    13400: Investments - Equity Method

20000-29999: LIABILITIES
  20000-20999: Current Liabilities
    20100: Accounts Payable
    20200: Accrued Expenses and Other Current Liabilities
    20210: Accrued Salaries and Wages
    20220: Accrued Bonuses
    20230: Accrued Payroll Taxes
    20240: Accrued Professional Fees
    20250: Accrued Interest
    20300: Deferred Revenue, Current (ASC 606)
    20310: Deferred SaaS Revenue
    20320: Deferred Consulting Revenue
    20400: Operating Lease Liabilities, Current (ASC 842)
    20500: Notes Payable, Current Portion
    20600: Credit Card Payable
    20610: Mercury Credit Card
    20700: Sales Tax Payable
    20800: Other Current Liabilities
    
  21000-21999: Noncurrent Liabilities
    21100: Deferred Revenue, Noncurrent
    21200: Operating Lease Liabilities, Noncurrent (ASC 842)
    21300: Notes Payable, Noncurrent
    21310: Convertible Notes Payable
    21320: Note Discount (contra)
    21400: Warrant Liabilities (ASC 815)
    21500: Deferred Tax Liabilities

30000-39999: STOCKHOLDERS' EQUITY
  30000-30999: Capital Stock
    30100: Preferred Stock, $0.0001 par value
    30110: Series A Preferred Stock
    30120: Series B Preferred Stock
    30200: Common Stock, $0.0001 par value
    30300: Additional Paid-In Capital
    30310: APIC - Common Stock
    30320: APIC - Preferred Stock
    30330: APIC - Stock Options
    
  31000-31999: Retained Earnings and Other
    31100: Accumulated Deficit
    31200: Accumulated Other Comprehensive Income (Loss)
    31210: Foreign Currency Translation Adjustment
    31220: Unrealized Gains (Losses) on AFS Securities
    31300: Treasury Stock (contra)

40000-49999: REVENUE
  40000-40999: Operating Revenue
    40100: Subscription Revenue (ASC 606)
    40110: SaaS Subscription Revenue
    40120: Platform Fees
    40200: Professional Services Revenue
    40210: Consulting Revenue
    40220: Advisory Fees
    40230: Implementation Services
    40300: License Revenue
    40400: Other Revenue
    
  41000-41999: Other Income
    41100: Interest Income
    41200: Dividend Income
    41300: Gain on Sale of Assets
    41400: Foreign Exchange Gain
    41500: Other Income

50000-59999: COST OF REVENUE
  50100: Cost of SaaS Services
  50110: Hosting and Infrastructure (AWS, etc.)
  50120: Third-Party API Costs
  50200: Cost of Professional Services
  50210: Contractor Costs
  50220: Direct Labor - Services

60000-69999: OPERATING EXPENSES
  60000-60999: Research and Development
    60100: R&D Salaries and Wages
    60200: R&D Stock-Based Compensation
    60300: R&D Hosting and Infrastructure
    60400: R&D Software and Tools
    60500: R&D Facilities
    60600: R&D Depreciation and Amortization
    60700: R&D Other Expenses
    
  61000-61999: Sales and Marketing
    61100: S&M Salaries and Wages
    61200: S&M Stock-Based Compensation
    61300: Advertising and Marketing
    61400: Trade Shows and Events
    61500: Marketing Software and Tools
    61600: S&M Travel and Entertainment
    61700: S&M Other Expenses
    
  62000-62999: General and Administrative
    62100: G&A Salaries and Wages
    62200: G&A Stock-Based Compensation
    62300: Professional Services
    62310: Accounting and Audit Fees
    62320: Legal Fees
    62330: Consulting Fees
    62400: Insurance
    62410: D&O Insurance
    62420: General Liability Insurance
    62430: Cyber Insurance
    62500: Office and Facilities
    62510: Rent Expense
    62520: Utilities
    62530: Office Supplies
    62600: Information Technology
    62610: Software Subscriptions
    62620: IT Support and Maintenance
    62700: Bank Fees and Charges
    62800: Bad Debt Expense
    62900: G&A Depreciation and Amortization
    62990: G&A Other Expenses

70000-79999: OTHER EXPENSE (INCOME)
  70100: Interest Expense
  70110: Interest on Notes Payable
  70120: Amortization of Debt Discount
  70200: Foreign Exchange Loss
  70300: Loss on Disposal of Assets
  70400: Impairment Loss
  70500: Other Expense

80000-89999: INCOME TAXES
  80100: Current Income Tax Expense
  80200: Deferred Income Tax Expense (Benefit)
```

---

## User Stories

### US-COA-001: Pre-Seeded Chart of Accounts (QuickBooks-Style)
**As a** partner
**I want to** have a professional COA pre-populated when I create an entity
**So that** I don't spend time building account structure

**Acceptance Criteria**:
- [ ] Auto-seed COA when entity is created
- [ ] 150+ standard accounts covering tech startup needs
- [ ] Hierarchical display with parent-child relationships
- [ ] Account types: Asset, Liability, Equity, Revenue, Expense
- [ ] Normal balance indicators (Debit/Credit)
- [ ] Description for each account
- [ ] GAAP reference notes (ASC citations)

### US-COA-002: Smart Mercury Transaction Mapping
**As a** partner
**I want to** Mercury transactions automatically mapped to correct accounts
**So that** I minimize manual categorization

**Acceptance Criteria**:
- [ ] AI learns from past categorizations
- [ ] Merchant/vendor name matching
- [ ] Description keyword matching
- [ ] Amount threshold rules (e.g., <$500 → Office Supplies)
- [ ] Confidence score for each suggestion
- [ ] Manual override and learning
- [ ] Mapping rules library

### US-COA-003: Account Management (Add/Edit/Archive)
**As a** partner
**I want to** customize the COA for our specific needs
**So that** the chart reflects our business operations

**Acceptance Criteria**:
- [ ] Add new accounts with 5-digit numbers
- [ ] Edit account names and descriptions
- [ ] Archive unused accounts (soft delete)
- [ ] Cannot delete accounts with transactions
- [ ] Prevent duplicate account numbers
- [ ] Audit trail of all COA changes
- [ ] Bulk import accounts from CSV

### US-COA-004: Hierarchical Account View
**As a** partner
**I want to** view accounts in a collapsible tree structure
**So that** I can navigate the COA efficiently

**Acceptance Criteria**:
- [ ] Expand/collapse parent accounts
- [ ] Indentation shows hierarchy levels
- [ ] Parent account balances = sum of children
- [ ] Icons for account types
- [ ] Search filters tree while maintaining structure
- [ ] Export tree structure to Excel
- [ ] Drag-and-drop reordering (within constraints)

### US-COA-005: Account Balances and Activity
**As a** partner
**I want to** see current balances and recent activity for each account
**So that** I can monitor account usage

**Acceptance Criteria**:
- [ ] Current balance displayed next to account name
- [ ] Debit/credit indicator
- [ ] YTD activity summary
- [ ] Click account to drill into transactions
- [ ] Inactive account indicators (no activity in 90 days)
- [ ] Balance as of specific date
- [ ] Multi-period balance comparison

### US-COA-006: Multi-Entity COA Management
**As a** partner
**I want to** use consistent account numbers across entities
**So that** consolidated reporting is seamless

**Acceptance Criteria**:
- [ ] Master COA shared across all entities
- [ ] Entity-specific accounts (10120 vs 10130 for different banks)
- [ ] Consolidated view shows all entity accounts
- [ ] Entity selector filters COA
- [ ] Copy COA from one entity to another
- [ ] Mapping rules for consolidation eliminations

### US-COA-007: Account Rules and Validation
**As a** partner
**I want to** enforce rules on account usage
**So that** data integrity is maintained

**Acceptance Criteria**:
- [ ] Require account descriptions
- [ ] Prevent posting to parent accounts (roll-up only)
- [ ] Restrict accounts to specific transaction types
- [ ] Require cost center/project for specific accounts
- [ ] Balance sheet accounts cannot have $0 balance if active
- [ ] Warning for unusual account activity
- [ ] Lock accounts during period close

---

## Smart Mercury Mapping Engine

### Mapping Algorithm
```python
class MercuryAccountMapper:
    """
    AI-powered account mapping for Mercury Bank transactions.
    Uses vendor patterns, keywords, amount thresholds, and learning.
    """
    
    def map_transaction(self, transaction: MercuryTransaction) -> AccountMapping:
        """
        Returns suggested account with confidence score.
        
        Algorithm:
        1. Exact vendor match (from history) - 95% confidence
        2. Partial vendor match - 80% confidence
        3. Description keyword match - 70% confidence
        4. Amount-based rules - 60% confidence
        5. Category heuristics - 50% confidence
        
        Returns:
        {
            'account_number': '62610',
            'account_name': 'Software Subscriptions',
            'confidence': 0.85,
            'reasoning': 'Vendor "GitHub" previously mapped to this account',
            'alternative_accounts': [
                {'account': '60400', 'confidence': 0.65},
                {'account': '62620', 'confidence': 0.45}
            ]
        }
        """
        
    def learn_from_correction(self, transaction_id: int, correct_account: str):
        """
        Machine learning: update model when user corrects a mapping.
        """
        
    # Vendor mapping rules
    VENDOR_PATTERNS = {
        'AWS': '50110',  # Hosting
        'Google Cloud': '50110',
        'Vercel': '50110',
        'GitHub': '62610',  # Software Subscriptions
        'Notion': '62610',
        'Slack': '62610',
        'Rippling': '60100',  # Payroll → R&D Salaries
        'WeWork': '62510',  # Rent
        'Regus': '62510',
        'Stripe': '62700',  # Bank Fees
        'Mercury': '62700',
        'Gusto': '60100',  # Payroll
        'LinkedIn Ads': '61300',  # Advertising
        'Facebook Ads': '61300',
        'Google Ads': '61300',
    }
    
    # Keyword patterns
    DESCRIPTION_KEYWORDS = {
        'payroll': '60100',
        'salary': '60100',
        'rent': '62510',
        'lease': '62510',
        'insurance': '62400',
        'legal': '62320',
        'attorney': '62320',
        'audit': '62310',
        'accounting': '62310',
        'travel': '61600',
        'hotel': '61600',
        'flight': '61600',
        'uber': '61600',
        'office supply': '62530',
        'software': '62610',
    }
    
    # Amount-based rules
    AMOUNT_RULES = [
        {'max': 50, 'account': '62530', 'description': 'Small office supplies'},
        {'max': 100, 'account': '61600', 'description': 'Meals and entertainment'},
    ]
```

---

## Frontend UI (shadcn Components)

### Chart of Accounts Page
```typescript
// ChartOfAccountsPage.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Search, 
  Download,
  Wallet,
  Building2,
  TrendingUp,
  DollarSign
} from 'lucide-react';

interface Account {
  id: number;
  account_number: string;
  account_name: string;
  account_type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  parent_account_id: number | null;
  normal_balance: 'Debit' | 'Credit';
  current_balance: number;
  is_active: boolean;
  description: string;
  gaap_reference: string;
  children?: Account[];
}

export function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground">
            US GAAP-compliant 5-digit account structure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assets</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,245,890</div>
            <p className="text-xs text-muted-foreground">45 accounts</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Liabilities</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$567,432</div>
            <p className="text-xs text-muted-foreground">28 accounts</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue YTD</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2,345,678</div>
            <p className="text-xs text-muted-foreground">12 accounts</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses YTD</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,987,543</div>
            <p className="text-xs text-muted-foreground">67 accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="asset">Assets</SelectItem>
                <SelectItem value="liability">Liabilities</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Account Tree */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {renderAccountTree(accounts, expandedAccounts, setExpandedAccounts)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function renderAccountTree(
  accounts: Account[],
  expanded: Set<number>,
  setExpanded: (expanded: Set<number>) => void
) {
  return accounts.map((account) => (
    <AccountRow
      key={account.id}
      account={account}
      expanded={expanded}
      setExpanded={setExpanded}
      level={0}
    />
  ));
}

function AccountRow({ account, expanded, setExpanded, level }: AccountRowProps) {
  const hasChildren = account.children && account.children.length > 0;
  const isExpanded = expanded.has(account.id);
  
  const toggleExpand = () => {
    const newExpanded = new Set(expanded);
    if (isExpanded) {
      newExpanded.delete(account.id);
    } else {
      newExpanded.add(account.id);
    }
    setExpanded(newExpanded);
  };
  
  return (
    <>
      <div 
        className="flex items-center px-4 py-3 hover:bg-muted/50 cursor-pointer"
        style={{ paddingLeft: `${level * 24 + 16}px` }}
      >
        <div className="flex items-center gap-2 flex-1">
          {hasChildren ? (
            <button onClick={toggleExpand} className="p-1 hover:bg-muted rounded">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}
          
          <div className="flex items-center gap-3 flex-1">
            <span className="font-mono text-sm font-medium">{account.account_number}</span>
            <span className="text-sm">{account.account_name}</span>
            <Badge variant="outline" className="text-xs">
              {account.account_type}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant={account.is_active ? 'success' : 'secondary'}>
            {account.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <span className="font-mono text-sm text-right w-32">
            ${account.current_balance.toLocaleString()}
          </span>
          <Badge variant="outline">
            {account.normal_balance === 'Debit' ? 'DR' : 'CR'}
          </Badge>
        </div>
      </div>
      
      {hasChildren && isExpanded && (
        <>
          {account.children.map((child) => (
            <AccountRow
              key={child.id}
              account={child}
              expanded={expanded}
              setExpanded={setExpanded}
              level={level + 1}
            />
          ))}
        </>
      )}
    </>
  );
}
```

---

## Database Schema

```sql
CREATE TABLE chart_of_accounts (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES entities(id),
    account_number VARCHAR(10) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(20) NOT NULL, -- Asset, Liability, Equity, Revenue, Expense
    parent_account_id INTEGER REFERENCES chart_of_accounts(id),
    normal_balance VARCHAR(10) NOT NULL, -- Debit, Credit
    description TEXT,
    gaap_reference VARCHAR(50), -- e.g., "ASC 606", "ASC 842"
    is_active BOOLEAN DEFAULT TRUE,
    allow_posting BOOLEAN DEFAULT TRUE, -- False for parent/rollup accounts
    require_project BOOLEAN DEFAULT FALSE,
    require_cost_center BOOLEAN DEFAULT FALSE,
    
    -- Balances (cached for performance)
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    ytd_activity DECIMAL(15,2) DEFAULT 0.00,
    last_transaction_date DATE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by_id INTEGER REFERENCES partners(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by_id INTEGER REFERENCES partners(id),
    
    UNIQUE(entity_id, account_number)
);

CREATE INDEX idx_coa_entity ON chart_of_accounts(entity_id);
CREATE INDEX idx_coa_type ON chart_of_accounts(account_type);
CREATE INDEX idx_coa_parent ON chart_of_accounts(parent_account_id);
CREATE INDEX idx_coa_number ON chart_of_accounts(account_number);

-- Account mapping rules
CREATE TABLE account_mapping_rules (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES entities(id),
    rule_type VARCHAR(50) NOT NULL, -- vendor, keyword, amount, category
    pattern VARCHAR(255) NOT NULL, -- Vendor name, keyword, etc.
    account_id INTEGER REFERENCES chart_of_accounts(id),
    confidence_weight DECIMAL(3,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Learning
    times_used INTEGER DEFAULT 0,
    times_corrected INTEGER DEFAULT 0,
    accuracy_score DECIMAL(3,2), -- times_used / (times_used + times_corrected)
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mapping_entity ON account_mapping_rules(entity_id);
CREATE INDEX idx_mapping_pattern ON account_mapping_rules(pattern);
```

---

## API Endpoints

```python
# Chart of Accounts Management
GET    /api/accounting/coa                      # List all accounts
GET    /api/accounting/coa/{id}                 # Get single account
POST   /api/accounting/coa                      # Create new account
PUT    /api/accounting/coa/{id}                 # Update account
DELETE /api/accounting/coa/{id}                 # Archive account
GET    /api/accounting/coa/tree                 # Hierarchical tree view
GET    /api/accounting/coa/{id}/transactions    # Account transactions

# Smart Mapping
POST   /api/accounting/coa/map-transaction      # Get mapping suggestion
POST   /api/accounting/coa/learn-mapping        # Save user correction
GET    /api/accounting/coa/mapping-rules        # List mapping rules
POST   /api/accounting/coa/mapping-rules        # Create custom rule

# Seeding
POST   /api/accounting/coa/seed                 # Seed default COA for entity
POST   /api/accounting/coa/import               # Bulk import from CSV
```

---

## Acceptance Tests

### Test Case 1: COA Auto-Seeding
**Precondition**: New entity created
**Steps**:
1. Create entity "NGI Capital Inc"
2. API automatically seeds COA
3. Verify 150+ accounts created
4. Check hierarchical structure

**Expected**:
- All account types present (Asset, Liability, Equity, Revenue, Expense)
- Parent-child relationships correct
- Account numbers follow 5-digit format
- No duplicate account numbers

### Test Case 2: Smart Mercury Mapping
**Precondition**: Mercury transaction imported
**Steps**:
1. Import transaction: "AWS Invoice - $1,250"
2. System suggests account mapping
3. Review suggestion: 50110 (Hosting) with 95% confidence
4. Accept suggestion

**Expected**:
- Correct account suggested
- High confidence score (>80%)
- Alternative suggestions provided
- Reasoning displayed

### Test Case 3: Manual Override and Learning
**Steps**:
1. Import transaction: "GitHub Copilot - $39"
2. System suggests: 60400 (R&D Software)
3. User corrects to: 62610 (G&A Software Subscriptions)
4. Import another GitHub transaction

**Expected**:
- System learns from correction
- Next GitHub transaction suggests 62610
- Accuracy score updated
- Mapping rule created/updated

---

## Success Metrics

- **Setup Time**: 0 minutes (auto-seeded)
- **Mapping Accuracy**: >85% after 50 transactions
- **Time Savings**: 80% reduction in categorization time
- **GAAP Compliance**: 100% (validated structure)
- **User Satisfaction**: QuickBooks-level ease of use

---

*End of Epic 2: Chart of Accounts*

