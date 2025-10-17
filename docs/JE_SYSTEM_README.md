# Journal Entry System - Manual Workflow (Enterprise Ready)

## Overview

The Journal Entry (JE) system is manual-only and enterprise-ready. Users create balanced entries against the entity Chart of Accounts, submit for approval, obtain two approvals (maker-checker), and then the entry is posted and locked.

Automation and auto-JE creation have been removed. All endpoints and code paths that referenced intelligent or automatic JE creation have been retired.

## Key Features

- Manual JE creation only
- US GAAP compliance via entity COA
- Draft-first workflow
- Two-step approval (maker-checker)
- Full audit trail
- Balanced entries enforced

## Architecture

### Components

1. Documents (`accounting_documents.py`)
   - Upload and manage supporting documents
   - No auto-JE creation

2. JE Routes (`accounting_journal_entries.py`)
   - Create, list, get JE
   - Submit, approve, reject, post

## Workflow

### Manual JE Lifecycle

1. Draft (stage 0)
   - Creator enters header and lines; links a supporting document.
2. Submit (stage 1)
   - Status becomes `pending_first_approval`.
3. First approval (stage 2)
   - Status becomes `pending_final_approval`.
4. Final approval (auto-post)
   - Status becomes `posted`, entry is locked.

Self-approval is not allowed. Final approver must differ from both the creator and the first approver.

## Notes

- No automatic JE creation from documents. All journal entries are created manually.

## Database Schema

### JournalEntry Fields

```sql
- entry_number: JE-YYYY-NNNNNN (sequential)
- entity_id: Links to AccountingEntity
- entry_date: Date
- fiscal_year: Year for reporting
- fiscal_period: Month (1-12)
- entry_type: Standard, Adjusting, Closing, Reversing
- memo: Description of transaction
- reference: Optional reference text
- source_type: ManualEntry (optional)
- source_id: Optional
- status: draft, pending_first_approval, pending_final_approval, posted, reversed
- workflow_stage: 0 (draft), 1 (pending first), 2 (pending final), 4 (posted)
- created_by_id/email
- first_approved_by_id/email, first_approved_at
- final_approved_by_id/email, final_approved_at
- posted_at, posted_by_id/email
- is_locked: Immutable after posting
```

### JournalEntryLine Fields

```sql
- journal_entry_id: Parent JE
- line_number: 1, 2, 3...
- account_id: From Chart of Accounts
- debit_amount: Decimal(15,2)
- credit_amount: Decimal(15,2)
- description: Line description
```

### JournalEntryAuditLog Fields

```sql
- journal_entry_id: Parent JE
- action: created, edited, submitted, approved, rejected, posted, reversed
- performed_by_id
- performed_at (PST)
- old_value, new_value (JSON)
- comment
```

## API Endpoints (Manual)

- Create JE: `POST /api/accounting/journal-entries`
- List JEs: `GET /api/accounting/journal-entries?entity_id=...`
- Get JE: `GET /api/accounting/journal-entries/{id}`
- Submit: `POST /api/accounting/journal-entries/{id}/submit`
- Approve: `POST /api/accounting/journal-entries/{id}/approve`
- Reject: `POST /api/accounting/journal-entries/{id}/reject`
- Post (fallback): `POST /api/accounting/journal-entries/{id}/post`

Posting is performed automatically upon final approval in the standard flow.

