# LLC to C-Corp Conversion Accounting Workflow
## Updated: October 4, 2025

## Overview

The entity conversion process properly handles the GAAP-compliant transformation of:
- **LLC Members' Capital Accounts** → **C-Corp Stockholders' Equity**

## Pre-Conversion State (NGI Capital LLC)

### LLC Balance Sheet Structure
```
ASSETS
  [All existing assets]

LIABILITIES
  [All existing liabilities]

MEMBERS' EQUITY
  Landon Whitworth, Capital Account: $XXX,XXX (50%)
  Andre Nurmamade, Capital Account: $XXX,XXX (50%)
  Total Members' Equity: $XXX,XXX
```

### Capital Account Calculation
- Capital accounts are **dynamically calculated** from accounting documents:
  - Initial capital contributions (journal entries)
  - Allocated net income/losses
  - Distributions/withdrawals
  - Additional contributions
- **NOT hardcoded** - updated in real-time by accounting system

## Conversion Workflow Steps

### Step 1: Pre-Conversion Snapshot
1. System captures final LLC balances:
   - All assets (with fair market values if needed)
   - All liabilities
   - Each member's capital account balance
   - Total members' equity

### Step 2: Share Structure Input
User provides conversion details:
- **Authorized shares**: e.g., 10,000,000 shares
- **Par value per share**: e.g., $0.0001 per share
- **Shares issued**: Based on equity conversion
- **Stock class**: Common Stock (Class A, B, etc.)
- **Conversion ratio**: How capital accounts convert to shares

### Step 3: Equity Conversion Calculation

**Example:**
```
Total Members' Equity: $500,000
Authorized Shares: 10,000,000
Par Value: $0.0001/share
Shares Issued: 10,000,000 (100% of authorized)

Member A (Landon) Capital: $250,000 (50%)
  → Receives: 5,000,000 shares (50%)

Member B (Andre) Capital: $250,000 (50%)
  → Receives: 5,000,000 shares (50%)
```

### Step 4: Journal Entry Generation (ASC 505)

The system automatically creates conversion journal entries:

```
DR: Landon Whitworth, Member Capital    $250,000
DR: Andre Nurmamade, Member Capital     $250,000
    CR: Common Stock ($0.0001 par)                  $1,000
    CR: Additional Paid-In Capital                  $499,000

To record conversion of LLC member capital accounts to 
C-Corp stockholders' equity per statutory conversion 
effective [DATE]
```

### Step 5: Post-Conversion C-Corp Balance Sheet

```
ASSETS
  [Unchanged - same assets carried over]

LIABILITIES
  [Unchanged - same liabilities carried over]

STOCKHOLDERS' EQUITY
  Common Stock ($0.0001 par, 10M authorized, 10M issued)    $1,000
  Additional Paid-In Capital                                $499,000
  Retained Earnings                                         $0
  Total Stockholders' Equity                                $500,000
```

### Step 6: Entity Records Update
1. Create new entity: "NGI Capital Inc." (C-Corp)
2. Update old entity: "NGI Capital LLC" (status = "converted")
3. Transfer all accounting data to new entity
4. Activate subsidiary entities (Advisory LLC, Creator Terminal)
5. Generate stockholder certificates
6. Update cap table

## Required Documentation Upload

During conversion, user must upload/generate:
1. **Articles of Conversion** (State filing)
2. **Certificate of Incorporation** (C-Corp)
3. **Bylaws**
4. **Stock Certificates**
5. **Board Resolutions** approving conversion
6. **IRS Form 8832** (Entity Classification Election)
7. **State Tax Forms** (if applicable)

## Accounting Standards Compliance

### ASC 505 - Equity
- Proper classification of par value vs. APIC
- Accurate share counts
- Proper disclosures

### ASC 850 - Related Party Transactions
- Document conversion as related party transaction
- Disclose terms and conditions

### Tax Considerations (Informational Only)
- Rev. Proc. 84-111 (Check-the-box election)
- Section 351 (Tax-free incorporation if applicable)
- Basis carryover rules

## Conversion Management UI Flow

### Screen 1: Review Current State
- Display current LLC balance sheet
- Show each member's capital account balance
- Confirm all accounts are balanced

### Screen 2: Define Share Structure
- Input authorized shares
- Set par value
- Choose stock classes
- Define conversion ratio

### Screen 3: Preview Conversion
- Show side-by-side comparison:
  - LLC Members' Equity → C-Corp Stockholders' Equity
- Display journal entries
- Calculate share allocations

### Screen 4: Upload Documentation
- Drag-and-drop document upload
- Auto-extract key data from PDFs
- Link documents to conversion record

### Screen 5: Execute Conversion
- Confirm execution
- Post journal entries
- Update entity records
- Generate stockholder certificates
- Lock conversion date (immutable)

### Screen 6: Post-Conversion Summary
- Display new entity structure
- Show stockholders' equity breakdown
- Download conversion package for auditors
- Activate subsidiary entities

## API Endpoints Needed

```
POST /api/accounting/entity-conversion/start-conversion
- Captures pre-conversion snapshot
- Returns: conversion_id, current_balances

POST /api/accounting/entity-conversion/{id}/share-structure
- Saves share structure details
- Calculates conversion allocations

POST /api/accounting/entity-conversion/{id}/preview
- Returns: journal_entries, new_equity_structure

POST /api/accounting/entity-conversion/{id}/upload-documents
- Handles document uploads
- Links to conversion record

POST /api/accounting/entity-conversion/{id}/execute
- Posts journal entries
- Creates new C-Corp entity
- Transfers accounting data
- Updates all relationships
- Activates subsidiaries

GET /api/accounting/entity-conversion/{id}/summary
- Returns conversion details for audit trail
```

## Database Schema Changes Needed

### New Table: `entity_conversions`
```sql
CREATE TABLE entity_conversions (
  id INTEGER PRIMARY KEY,
  source_entity_id INTEGER,  -- NGI Capital LLC
  target_entity_id INTEGER,  -- NGI Capital Inc.
  conversion_type TEXT,      -- "LLC_TO_C_CORP"
  conversion_date DATE,
  effective_date DATE,
  
  -- Pre-conversion balances
  total_equity_before NUMERIC(15,2),
  member_balances JSON,      -- {member_id: balance}
  
  -- Share structure
  authorized_shares INTEGER,
  par_value NUMERIC(10,4),
  shares_issued INTEGER,
  share_allocations JSON,    -- {member_id: shares}
  
  -- Accounting
  journal_entry_id INTEGER,  -- Link to conversion JE
  
  -- Status
  status TEXT,               -- "draft", "executed", "completed"
  executed_by INTEGER,
  executed_at TIMESTAMP,
  
  -- Audit
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Next Steps

1. Update Entity Conversion page UI with this workflow
2. Create API endpoints for each conversion step
3. Implement journal entry generation logic
4. Add document upload handling
5. Build stockholder certificate generator
6. Update cap table integration

## Testing Checklist

- [ ] Capital accounts calculated correctly from accounting docs
- [ ] Share structure validation (authorized >= issued)
- [ ] Journal entries balance (debits = credits)
- [ ] Stockholders' equity equals total members' equity
- [ ] All documents properly linked
- [ ] Subsidiary entities activated post-conversion
- [ ] Audit trail complete and immutable
- [ ] Cap table accurately reflects ownership


