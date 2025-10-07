# Epic 7: Entity Conversion - LLC to C-Corp In-App Workflow

## Epic Summary
Implement in-app entity conversion workflow to track NGI Capital's conversion from LLC to C-Corporation, maintaining historical data for both entities, managing the conversion date and accounting treatment, and ensuring proper entity closure while preserving audit trails.

---

## Business Value
- **Historical Integrity**: Complete audit trail from LLC formation through C-Corp conversion
- **Investor Ready**: Clean entity structure for fundraising
- **GAAP Compliance**: Proper accounting treatment of entity conversion
- **Regulatory**: Track dates for tax elections (S-Corp, QSBS, etc.)
- **Audit Support**: Separate financials pre/post conversion

---

## NGI Capital Entity Structure

### Current State
```
NGI Capital LLC (Delaware LLC)
  - Formed: [Formation Date]
  - EIN: [EIN Number]
  - Members: Landon Whitworth (CEO), Andre Nurmamade (CFO/COO)
  - Status: Operating
  
NGI Capital Advisory LLC (Sub-entity)
  - Operating as LLC under NGI Capital
  - Will continue as LLC post-conversion
```

### Future State (Post-Conversion)
```
NGI Capital Inc. (Delaware C-Corporation)
  - Converted: [Conversion Date]
  - EIN: [New EIN]
  - Stockholders: Landon Whitworth, Andre Nurmamade
  - Status: Operating
  
NGI Capital LLC
  - Status: Closed/Merged into C-Corp
  - Historical data preserved
  - No new transactions post-conversion
  
NGI Capital Advisory LLC
  - Remains as subsidiary LLC
  - Consolidated into NGI Capital Inc. financials
```

---

## User Stories

### US-EC-001: Initiate Entity Conversion
**As a** co-founder (Landon or Andre)
**I want to** initiate the LLC to C-Corp conversion in the system
**So that** the conversion is tracked with proper dates and documentation

**Acceptance Criteria**:
- [ ] Conversion wizard with step-by-step flow
- [ ] Enter conversion date (legal filing date)
- [ ] Upload conversion documents (Certificate of Conversion, Articles)
- [ ] Select conversion type: Statutory Conversion vs Asset Transfer
- [ ] Enter new C-Corp EIN
- [ ] Enter stock authorization (shares, par value)
- [ ] Map LLC membership interests to C-Corp stock
- [ ] Both co-founders must approve

### US-EC-002: Historical Data Preservation
**As a** co-founder
**I want to** preserve all LLC historical data
**So that** auditors can trace full company history

**Acceptance Criteria**:
- [ ] All LLC transactions remain in database
- [ ] LLC entity marked as "Converted" not "Deleted"
- [ ] Conversion date timestamp
- [ ] Pre-conversion financials remain accessible
- [ ] Post-conversion: No new transactions allowed in LLC
- [ ] Visual indicator showing "Historical Entity"

### US-EC-003: Opening Balance Transfer
**As a** CFO (Andre)
**I want to** transfer LLC net assets to C-Corp opening balances
**So that** C-Corp starts with correct equity

**Acceptance Criteria**:
- [ ] Calculate LLC net assets as of conversion date
- [ ] Generate closing journal entry for LLC
- [ ] Generate opening journal entry for C-Corp
- [ ] Transfer:
  - Assets → C-Corp Assets
  - Liabilities → C-Corp Liabilities
  - Members' Equity → Common Stock + APIC
- [ ] Verify balance sheet equation
- [ ] Lock LLC accounting period
- [ ] Open C-Corp accounting period

### US-EC-004: Equity Conversion Tracking
**As a** co-founder
**I want to** track conversion of membership interests to stock
**So that** cap table is accurate

**Acceptance Criteria**:
- [ ] Record pre-conversion ownership %
- [ ] Calculate shares issued based on ownership
- [ ] Split between Common Stock (par) and APIC
- [ ] Issue stock certificates (document module)
- [ ] Update cap table
- [ ] Maintain conversion audit trail

### US-EC-005: Dual Entity Financial Reporting
**As a** CFO (Andre)
**I want to** generate financials for both pre and post conversion periods
**So that** investors see full year financials

**Acceptance Criteria**:
- [ ] Generate LLC financials: Jan 1 - Conversion Date
- [ ] Generate C-Corp financials: Conversion Date - Dec 31
- [ ] Combined annual financials with note disclosure
- [ ] Note: "Entity converted from LLC to C-Corp on [date]"
- [ ] Comparative periods handled correctly
- [ ] Tax year considerations

### US-EC-006: Entity Status Management
**As a** co-founder
**I want to** manage entity statuses
**So that** system enforces proper usage

**Acceptance Criteria**:
- [ ] Entity status: Active, Converted, Closed, Dissolved
- [ ] Active: Can transact
- [ ] Converted: Historical only, no new transactions
- [ ] Visual badges for entity status
- [ ] Filter entities by status
- [ ] Prevent accidental posting to closed entities

---

## Conversion Workflow

```
[Pre-Conversion: NGI Capital LLC Operating]
        |
        v
[Legal Conversion Process]
    - File Certificate of Conversion
    - File Articles of Incorporation
    - Obtain new EIN
    - Issue stock certificates
        |
        v
[System Conversion Initiation] (Both co-founders approve)
    - Set conversion date
    - Upload conversion documents
    - Enter C-Corp details
        |
        v
[Accounting Cut-off]
    - Close LLC accounting period as of conversion date
    - Generate LLC closing trial balance
    - Calculate net assets
        |
        v
[Transfer Journal Entries]
    
    LLC Closing Entry:
    DR  All Liabilities          $XXX,XXX
    DR  Members' Equity - Landon $XXX,XXX
    DR  Members' Equity - Andre  $XXX,XXX
        CR  All Assets            $XXX,XXX
    (To close LLC books)
    
    C-Corp Opening Entry:
    DR  All Assets                $XXX,XXX
        CR  All Liabilities        $XXX,XXX
        CR  Common Stock           $     XXX  (par value)
        CR  APIC                   $XXX,XXX
    (To record conversion and capitalize C-Corp)
        |
        v
[Entity Status Updates]
    - NGI Capital LLC → Status: Converted
    - NGI Capital Inc. → Status: Active
        |
        v
[Post-Conversion Operations]
    - All new transactions → NGI Capital Inc.
    - NGI Capital Advisory LLC → Subsidiary of Inc.
    - Consolidated financials include Advisory LLC
```

---

## Database Schema

```sql
-- Add to entities table
ALTER TABLE entities ADD COLUMN entity_status VARCHAR(50) DEFAULT 'active';
-- active, converted, closed, dissolved

ALTER TABLE entities ADD COLUMN converted_from_entity_id INTEGER REFERENCES entities(id);
ALTER TABLE entities ADD COLUMN conversion_date DATE;
ALTER TABLE entities ADD COLUMN conversion_type VARCHAR(50);
-- statutory_conversion, asset_transfer

-- Conversion tracking
CREATE TABLE entity_conversions (
    id SERIAL PRIMARY KEY,
    
    -- Entities
    from_entity_id INTEGER REFERENCES entities(id),
    to_entity_id INTEGER REFERENCES entities(id),
    
    -- Conversion details
    conversion_date DATE NOT NULL,
    conversion_type VARCHAR(50) NOT NULL,
    legal_filing_date DATE,
    effective_date DATE,
    
    -- Financial data
    net_assets_transferred DECIMAL(15,2),
    assets_transferred DECIMAL(15,2),
    liabilities_transferred DECIMAL(15,2),
    equity_transferred DECIMAL(15,2),
    
    -- New entity capitalization
    common_stock_issued INTEGER, -- Number of shares
    common_stock_par_value DECIMAL(10,4),
    common_stock_amount DECIMAL(15,2),
    apic_amount DECIMAL(15,2),
    
    -- Journal entries
    closing_journal_entry_id INTEGER REFERENCES journal_entries(id),
    opening_journal_entry_id INTEGER REFERENCES journal_entries(id),
    
    -- Approval
    initiated_by_id INTEGER REFERENCES partners(id),
    initiated_at TIMESTAMPTZ,
    approved_by_ceo_id INTEGER REFERENCES partners(id),
    approved_by_ceo_at TIMESTAMPTZ,
    approved_by_cfo_id INTEGER REFERENCES partners(id),
    approved_by_cfo_at TIMESTAMPTZ,
    
    -- Documentation
    certificate_of_conversion_doc_id INTEGER REFERENCES accounting_documents(id),
    articles_of_incorporation_doc_id INTEGER REFERENCES accounting_documents(id),
    ein_letter_doc_id INTEGER REFERENCES accounting_documents(id),
    
    -- Status
    conversion_status VARCHAR(50) DEFAULT 'initiated',
    -- initiated, approved, completed, cancelled
    
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversions_from ON entity_conversions(from_entity_id);
CREATE INDEX idx_conversions_to ON entity_conversions(to_entity_id);

-- Equity conversion tracking
CREATE TABLE equity_conversions (
    id SERIAL PRIMARY KEY,
    entity_conversion_id INTEGER REFERENCES entity_conversions(id),
    
    -- Member/Owner
    owner_id INTEGER REFERENCES partners(id),
    owner_name VARCHAR(255),
    
    -- Pre-conversion
    membership_interest_percent DECIMAL(5,4), -- 50.0000%
    membership_capital_account DECIMAL(15,2),
    
    -- Post-conversion
    common_shares_issued INTEGER,
    ownership_percent DECIMAL(5,4),
    fair_value_per_share DECIMAL(10,4),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_equity_conversions_entity ON equity_conversions(entity_conversion_id);
```

---

## API Endpoints

```python
# Entity Conversion Management
GET    /api/accounting/entity-conversions                    # List conversions
GET    /api/accounting/entity-conversions/{id}               # Get conversion details
POST   /api/accounting/entity-conversions                    # Initiate conversion
PUT    /api/accounting/entity-conversions/{id}               # Update conversion
POST   /api/accounting/entity-conversions/{id}/approve-ceo   # CEO approval (Landon)
POST   /api/accounting/entity-conversions/{id}/approve-cfo   # CFO approval (Andre)
POST   /api/accounting/entity-conversions/{id}/complete      # Complete conversion
POST   /api/accounting/entity-conversions/{id}/cancel        # Cancel conversion

# Conversion Calculations
GET    /api/accounting/entity-conversions/calculate-transfer # Calculate net assets
POST   /api/accounting/entity-conversions/generate-entries   # Generate JEs

# Entity Status
PUT    /api/accounting/entities/{id}/status                  # Update entity status
GET    /api/accounting/entities/historical                   # List historical entities

# Reporting
GET    /api/accounting/entities/{id}/pre-conversion-financials   # LLC financials
GET    /api/accounting/entities/{id}/post-conversion-financials  # C-Corp financials
GET    /api/accounting/entities/{id}/combined-financials         # Full year combined
```

---

## Frontend UI (shadcn Components)

### Entity Conversion Wizard
```typescript
// EntityConversionWizard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Stepper, Step } from '@/components/ui/stepper';
import { Building2, FileText, DollarSign, Users, CheckCircle2 } from 'lucide-react';

export function EntityConversionWizard() {
  const [step, setStep] = useState(1);
  
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Entity Conversion: LLC to C-Corporation</CardTitle>
          <p className="text-muted-foreground">
            Convert NGI Capital LLC to NGI Capital Inc.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Stepper */}
          <Stepper currentStep={step}>
            <Step number={1} label="Conversion Details" icon={Building2} />
            <Step number={2} label="Documents" icon={FileText} />
            <Step number={3} label="Financial Transfer" icon={DollarSign} />
            <Step number={4} label="Equity Conversion" icon={Users} />
            <Step number={5} label="Review & Approve" icon={CheckCircle2} />
          </Stepper>
          
          {/* Step 1: Conversion Details */}
          {step === 1 && (
            <div className="space-y-4">
              <Alert>
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  This will mark NGI Capital LLC as "Converted" and prevent new transactions.
                  All historical data will be preserved. This action requires approval from
                  both co-founders (Landon & Andre).
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>From Entity</Label>
                  <Input value="NGI Capital LLC" disabled />
                </div>
                <div>
                  <Label>To Entity</Label>
                  <Input placeholder="NGI Capital Inc." />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Conversion Date *</Label>
                  <DatePicker />
                  <p className="text-xs text-muted-foreground mt-1">
                    Legal filing date of conversion
                  </p>
                </div>
                <div>
                  <Label>Effective Date</Label>
                  <DatePicker />
                  <p className="text-xs text-muted-foreground mt-1">
                    Accounting effective date (usually same)
                  </p>
                </div>
              </div>
              
              <div>
                <Label>Conversion Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="statutory">Statutory Conversion</SelectItem>
                    <SelectItem value="asset_transfer">Asset Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>New C-Corp EIN</Label>
                <Input placeholder="XX-XXXXXXX" />
              </div>
              
              <div>
                <Label>State of Incorporation</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DE">Delaware</SelectItem>
                    <SelectItem value="CA">California</SelectItem>
                    {/* More states */}
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={() => setStep(2)} className="w-full">
                Next: Upload Documents
              </Button>
            </div>
          )}
          
          {/* Step 2: Documents */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Certificate of Conversion *</Label>
                <FileUpload accept=".pdf" />
              </div>
              
              <div>
                <Label>Articles of Incorporation *</Label>
                <FileUpload accept=".pdf" />
              </div>
              
              <div>
                <Label>EIN Assignment Letter</Label>
                <FileUpload accept=".pdf" />
              </div>
              
              <div>
                <Label>Board Resolutions</Label>
                <FileUpload accept=".pdf" />
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Next: Financial Transfer
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 3: Financial Transfer */}
          {step === 3 && (
            <div className="space-y-4">
              <Alert>
                <AlertTitle>Net Assets Calculation</AlertTitle>
                <AlertDescription>
                  As of {conversionDate}, NGI Capital LLC net assets:
                </AlertDescription>
              </Alert>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Assets</span>
                      <span className="font-mono font-semibold">$1,245,890</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Liabilities</span>
                      <span className="font-mono">($567,432)</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Net Assets to Transfer</span>
                      <span className="font-mono">$678,458</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div>
                <Label>Authorized Common Stock</Label>
                <Input type="number" placeholder="10,000,000" />
                <p className="text-xs text-muted-foreground mt-1">
                  Number of shares authorized
                </p>
              </div>
              
              <div>
                <Label>Par Value per Share</Label>
                <Input type="number" step="0.0001" placeholder="0.0001" />
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={() => setStep(4)} className="flex-1">
                  Next: Equity Conversion
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 4: Equity Conversion */}
          {step === 4 && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>LLC Ownership %</TableHead>
                    <TableHead>Capital Account</TableHead>
                    <TableHead>Shares Issued</TableHead>
                    <TableHead>C-Corp Ownership %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Landon Whitworth (CEO)</TableCell>
                    <TableCell>50.00%</TableCell>
                    <TableCell className="font-mono">$339,229</TableCell>
                    <TableCell className="font-mono">
                      <Input type="number" defaultValue="5,000,000" />
                    </TableCell>
                    <TableCell>50.00%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Andre Nurmamade (CFO/COO)</TableCell>
                    <TableCell>50.00%</TableCell>
                    <TableCell className="font-mono">$339,229</TableCell>
                    <TableCell className="font-mono">
                      <Input type="number" defaultValue="5,000,000" />
                    </TableCell>
                    <TableCell>50.00%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              
              <Alert>
                <AlertTitle>Stock Issuance</AlertTitle>
                <AlertDescription>
                  Total shares issued: 10,000,000<br/>
                  Par value: $0.0001 per share<br/>
                  Common Stock (par): $1,000<br/>
                  Additional Paid-In Capital: $677,458
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)}>
                  Back
                </Button>
                <Button onClick={() => setStep(5)} className="flex-1">
                  Next: Review & Approve
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 5: Review & Approve */}
          {step === 5 && (
            <div className="space-y-4">
              <Alert>
                <AlertTitle>Review Conversion Summary</AlertTitle>
                <AlertDescription>
                  Please review all details before approval. Both co-founders must approve.
                </AlertDescription>
              </Alert>
              
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Conversion Details</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p><strong>Date:</strong> {conversionDate}</p>
                    <p><strong>From:</strong> NGI Capital LLC</p>
                    <p><strong>To:</strong> NGI Capital Inc.</p>
                    <p><strong>Type:</strong> Statutory Conversion</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Financial Transfer</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p><strong>Net Assets:</strong> $678,458</p>
                    <p><strong>Common Stock:</strong> $1,000</p>
                    <p><strong>APIC:</strong> $677,458</p>
                    <p><strong>Shares Issued:</strong> 10,000,000</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Approval section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Co-Founder Approvals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarFallback>LW</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">Landon Whitworth</p>
                        <p className="text-xs text-muted-foreground">CEO & Co-Founder</p>
                      </div>
                    </div>
                    {ceoApproved ? (
                      <Badge variant="success">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Approved
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={approveCEO}>
                        Approve
                      </Button>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarFallback>AN</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">Andre Nurmamade</p>
                        <p className="text-xs text-muted-foreground">CFO/COO & Co-Founder</p>
                      </div>
                    </div>
                    {cfoApproved ? (
                      <Badge variant="success">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Approved
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={approveCFO}>
                        Approve
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(4)}>
                  Back
                </Button>
                <Button 
                  onClick={completeConversion}
                  className="flex-1"
                  disabled={!ceoApproved || !cfoApproved}
                >
                  Complete Conversion
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Acceptance Tests

### Test Case 1: Initiate Conversion
**Steps**:
1. Navigate to Entities
2. Select "NGI Capital LLC"
3. Click "Convert to C-Corp"
4. Enter conversion date: March 15, 2025
5. Upload documents
6. Complete wizard

**Expected**:
- Conversion record created
- Status: "Initiated"
- Both approvals required
- Documents linked

### Test Case 2: Dual Approval Required
**Steps**:
1. Landon approves conversion
2. Attempt to complete (should fail)
3. Andre approves conversion
4. Complete conversion

**Expected**:
- Cannot complete with only 1 approval
- Both co-founders must approve
- Audit trail shows both approvals
- Conversion completes successfully

### Test Case 3: Financial Transfer
**Steps**:
1. System calculates LLC net assets: $678,458
2. Generate closing JE for LLC
3. Generate opening JE for C-Corp
4. Verify balances

**Expected**:
- LLC closing JE balanced
- C-Corp opening JE balanced
- Net assets match
- Common Stock + APIC = Net Assets
- LLC period locked

### Test Case 4: Entity Status Management
**Steps**:
1. After conversion, attempt to create JE in LLC
2. System should prevent
3. Create JE in C-Corp (should work)

**Expected**:
- LLC status: "Converted"
- Cannot post to converted entity
- C-Corp status: "Active"
- Can transact in C-Corp

---

## Success Metrics

- **Data Integrity**: 100% historical data preserved
- **Approval Time**: <1 day for dual approval
- **Financial Accuracy**: Assets = Liabilities + Equity (100%)
- **Audit Acceptance**: Clean conversion audit trail

---

*End of Epic 7: Entity Conversion*

