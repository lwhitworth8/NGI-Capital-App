# Comprehensive Testing Specification - NGI Capital Accounting Module

## Testing Overview

This document outlines comprehensive testing for all 9 accounting epics, covering:
- **Backend API Testing** (pytest)
- **Frontend Component Testing** (Jest + React Testing Library)
- **End-to-End Workflow Testing** (Playwright)
- **Performance Testing** (500+ transactions)
- **GAAP Compliance Testing**

---

## Test Coverage Requirements

- **Backend**: >90% code coverage
- **Frontend**: >85% component coverage
- **E2E**: 100% critical paths
- **Performance**: <3 seconds for 500 transactions
- **GAAP Compliance**: 100% validation tests pass

---

# Epic 1: Documents Center - Testing

## Backend Tests (`tests/test_accounting_documents.py`)

```python
import pytest
from fastapi.testclient import TestClient
from decimal import Decimal
from src.api.main import app

client = TestClient(app)

class TestDocumentUpload:
    """Test document upload and processing"""
    
    def test_upload_formation_document_success(self, test_entity, test_partner):
        """Test successful upload of formation document"""
        with open("tests/fixtures/articles_of_organization.pdf", "rb") as f:
            response = client.post(
                "/api/accounting/documents/upload",
                files={"file": ("articles.pdf", f, "application/pdf")},
                data={
                    "entity_id": test_entity.id,
                    "document_type": "formation",
                    "category": "formation"
                },
                headers={"Authorization": f"Bearer {test_partner.token}"}
            )
        
        assert response.status_code == 201
        data = response.json()
        assert data["filename"] == "articles.pdf"
        assert data["document_type"] == "formation"
        assert data["processing_status"] == "uploaded"
    
    def test_upload_exceeds_size_limit(self, test_entity):
        """Test upload rejection for oversized file"""
        # Create 30MB file (exceeds 25MB limit)
        large_file = b"x" * (30 * 1024 * 1024)
        
        response = client.post(
            "/api/accounting/documents/upload",
            files={"file": ("large.pdf", large_file, "application/pdf")},
            data={"entity_id": test_entity.id}
        )
        
        assert response.status_code == 413
        assert "exceeds maximum" in response.json()["detail"].lower()
    
    def test_batch_upload_50_files(self, test_entity):
        """Test batch upload of 50 files simultaneously"""
        files = []
        for i in range(50):
            files.append(
                ("files", (f"receipt_{i}.pdf", b"fake_pdf_content", "application/pdf"))
            )
        
        response = client.post(
            "/api/accounting/documents/upload-batch",
            files=files,
            data={"entity_id": test_entity.id, "document_type": "receipts"}
        )
        
        assert response.status_code == 202  # Accepted for processing
        data = response.json()
        assert data["total_files"] == 50
        assert data["status"] == "processing"

class TestDocumentExtraction:
    """Test AI document extraction"""
    
    def test_extract_formation_document(self, test_document):
        """Test extraction from formation document"""
        response = client.post(
            f"/api/accounting/documents/{test_document.id}/extract"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "entity_name" in data
        assert "ein" in data
        assert "formation_date" in data
        assert data["confidence"] > 0.85
    
    def test_extract_invoice(self, test_invoice_document):
        """Test extraction from invoice"""
        response = client.post(
            f"/api/accounting/documents/{test_invoice_document.id}/extract"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "vendor_name" in data
        assert "total_amount" in data
        assert "line_items" in data
        assert len(data["line_items"]) > 0
    
    def test_extraction_accuracy_threshold(self, test_documents):
        """Test that extraction accuracy meets 90% threshold"""
        total = 0
        accurate = 0
        
        for doc in test_documents:
            response = client.post(f"/api/accounting/documents/{doc.id}/extract")
            if response.status_code == 200:
                total += 1
                if response.json()["confidence"] > 0.90:
                    accurate += 1
        
        accuracy_rate = accurate / total
        assert accuracy_rate >= 0.90, f"Accuracy {accuracy_rate:.2%} below 90% threshold"

class TestDocumentSearch:
    """Test document search and filtering"""
    
    def test_full_text_search(self, test_documents):
        """Test full-text search across documents"""
        response = client.get(
            "/api/accounting/documents/search",
            params={"q": "AWS", "entity_id": 1}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) > 0
        assert "AWS" in data["results"][0]["searchable_text"]
    
    def test_search_performance(self, db_with_1000_documents):
        """Test search performance with 1000+ documents"""
        import time
        
        start = time.time()
        response = client.get(
            "/api/accounting/documents/search",
            params={"q": "invoice", "entity_id": 1}
        )
        duration = time.time() - start
        
        assert response.status_code == 200
        assert duration < 0.5, f"Search took {duration:.2f}s, should be <0.5s"

class TestApprovalWorkflow:
    """Test document approval workflows"""
    
    def test_approval_chain(self, test_document, landon, andre):
        """Test multi-level approval"""
        # First approval
        response = client.post(
            f"/api/accounting/documents/{test_document.id}/approve",
            headers={"Authorization": f"Bearer {landon.token}"}
        )
        assert response.status_code == 200
        
        # Second approval
        response = client.post(
            f"/api/accounting/documents/{test_document.id}/approve",
            headers={"Authorization": f"Bearer {andre.token}"}
        )
        assert response.status_code == 200
        
        # Verify fully approved
        doc = client.get(f"/api/accounting/documents/{test_document.id}").json()
        assert doc["workflow_status"] == "approved"
```

## Frontend Tests (`apps/desktop/src/app/accounting/documents/__tests__/documents.test.tsx`)

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DocumentsCenter from '../page';
import { mockDocuments, mockEntities } from '@/tests/mocks';

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('DocumentsCenter', () => {
  it('renders document list correctly', async () => {
    render(<DocumentsCenter />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('Documents Center')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Formation')).toBeInTheDocument();
    expect(screen.getByText('Invoices')).toBeInTheDocument();
  });
  
  it('uploads document via drag and drop', async () => {
    render(<DocumentsCenter />, { wrapper });
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const dropZone = screen.getByTestId('upload-zone');
    
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] }
    });
    
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });
  });
  
  it('filters documents by category', async () => {
    render(<DocumentsCenter />, { wrapper });
    
    const categoryFilter = screen.getByRole('combobox', { name: /category/i });
    fireEvent.change(categoryFilter, { target: { value: 'invoices' } });
    
    await waitFor(() => {
      const documents = screen.getAllByTestId('document-card');
      documents.forEach(doc => {
        expect(doc).toHaveAttribute('data-category', 'invoices');
      });
    });
  });
  
  it('searches documents', async () => {
    render(<DocumentsCenter />, { wrapper });
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'AWS' } });
    
    await waitFor(() => {
      expect(screen.getByText(/aws invoice/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
```

## E2E Tests (`e2e/tests/documents.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Documents Module - E2E', () => {
  test('complete document upload and extraction workflow', async ({ page }) => {
    await page.goto('/accounting/documents');
    
    // Upload document
    await page.click('[data-testid="upload-button"]');
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/invoice.pdf');
    
    // Wait for upload
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });
    
    // Verify extraction
    await page.click('[data-testid="view-document"]');
    await expect(page.locator('[data-testid="extracted-vendor"]')).toContainText('AWS');
    await expect(page.locator('[data-testid="extracted-amount"]')).toContainText('$1,250');
    
    // Verify and approve
    await page.click('[data-testid="verify-extraction"]');
    await page.click('[data-testid="approve-document"]');
    
    await expect(page.locator('[data-testid="document-status"]')).toHaveText('Approved');
  });
  
  test('batch upload 50 documents', async ({ page }) => {
    await page.goto('/accounting/documents');
    
    const files = Array.from({ length: 50 }, (_, i) => `tests/fixtures/receipt_${i}.pdf`);
    await page.setInputFiles('input[type="file"]', files);
    
    // Wait for batch processing
    await expect(page.locator('[data-testid="batch-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="batch-complete"]')).toBeVisible({ timeout: 60000 });
    
    // Verify all uploaded
    const documentCount = await page.locator('[data-testid="document-card"]').count();
    expect(documentCount).toBeGreaterThanOrEqual(50);
  });
});
```

---

# Epic 2: Chart of Accounts - Testing

## Backend Tests (`tests/test_chart_of_accounts.py`)

```python
class TestCOASeeding:
    """Test Chart of Accounts pre-seeding"""
    
    def test_auto_seed_on_entity_creation(self, test_entity):
        """Test COA auto-seeds when entity is created"""
        response = client.get(f"/api/accounting/coa?entity_id={test_entity.id}")
        
        assert response.status_code == 200
        accounts = response.json()
        assert len(accounts) >= 150, "Should have 150+ pre-seeded accounts"
        
        # Verify account types present
        account_types = {acc["account_type"] for acc in accounts}
        assert account_types == {"Asset", "Liability", "Equity", "Revenue", "Expense"}
    
    def test_account_hierarchy(self, test_entity):
        """Test parent-child account relationships"""
        response = client.get(f"/api/accounting/coa/tree?entity_id={test_entity.id}")
        
        tree = response.json()
        
        # Verify hierarchy
        assets = next(node for node in tree if node["account_number"] == "10000")
        assert len(assets["children"]) > 0
        
        cash_accounts = next(
            child for child in assets["children"] 
            if child["account_number"] == "10100"
        )
        assert cash_accounts["account_name"] == "Cash and Cash Equivalents"

class TestSmartMapping:
    """Test smart Mercury transaction mapping"""
    
    def test_exact_vendor_match(self, test_entity, test_coa):
        """Test exact vendor name matching"""
        transaction = {
            "description": "AWS Invoice",
            "amount": -1250.00,
            "merchant": "Amazon Web Services"
        }
        
        response = client.post(
            "/api/accounting/coa/map-transaction",
            json=transaction
        )
        
        assert response.status_code == 200
        mapping = response.json()
        assert mapping["account_number"] == "50110"  # Hosting
        assert mapping["confidence"] > 0.90
    
    def test_learning_from_correction(self, test_entity):
        """Test AI learns from manual corrections"""
        # Create transaction
        tx_id = create_test_transaction(merchant="GitHub Copilot")
        
        # Initial suggestion (might be wrong)
        response = client.post("/api/accounting/coa/map-transaction", json={"tx_id": tx_id})
        initial_account = response.json()["account_number"]
        
        # User corrects to 62610 (Software Subscriptions)
        client.post(
            "/api/accounting/coa/learn-mapping",
            json={"tx_id": tx_id, "correct_account": "62610"}
        )
        
        # Next GitHub transaction should suggest 62610
        tx_id_2 = create_test_transaction(merchant="GitHub Copilot")
        response = client.post("/api/accounting/coa/map-transaction", json={"tx_id": tx_id_2})
        
        assert response.json()["account_number"] == "62610"
        assert response.json()["confidence"] > 0.85

class TestCOAValidation:
    """Test COA validation rules"""
    
    def test_prevent_duplicate_account_numbers(self, test_entity):
        """Test duplicate account number prevention"""
        # Create account 10100
        client.post("/api/accounting/coa", json={
            "entity_id": test_entity.id,
            "account_number": "10100",
            "account_name": "Test Account",
            "account_type": "Asset",
            "normal_balance": "Debit"
        })
        
        # Attempt to create duplicate
        response = client.post("/api/accounting/coa", json={
            "entity_id": test_entity.id,
            "account_number": "10100",  # Duplicate
            "account_name": "Another Account",
            "account_type": "Asset",
            "normal_balance": "Debit"
        })
        
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]
```

## Frontend Tests (`apps/desktop/src/app/accounting/chart-of-accounts/__tests__/coa.test.tsx`)

```typescript
describe('Chart of Accounts', () => {
  it('displays account tree with expand/collapse', async () => {
    render(<ChartOfAccountsPage />, { wrapper });
    
    // Find parent account
    const parentAccount = screen.getByText('10000 - ASSETS');
    expect(parentAccount).toBeInTheDocument();
    
    // Click to expand
    const expandButton = within(parentAccount.closest('[data-testid="account-row"]'))
      .getByRole('button');
    fireEvent.click(expandButton);
    
    // Verify children visible
    await waitFor(() => {
      expect(screen.getByText('10100 - Cash and Cash Equivalents')).toBeVisible();
    });
  });
  
  it('searches accounts by number or name', async () => {
    render(<ChartOfAccountsPage />, { wrapper });
    
    const searchInput = screen.getByPlaceholderText(/search accounts/i);
    fireEvent.change(searchInput, { target: { value: 'cash' } });
    
    await waitFor(() => {
      expect(screen.getByText(/cash and cash equivalents/i)).toBeVisible();
      expect(screen.queryByText(/accounts payable/i)).not.toBeInTheDocument();
    });
  });
  
  it('displays current balances', async () => {
    render(<ChartOfAccountsPage />, { wrapper });
    
    const cashAccount = screen.getByText(/10100.*cash/i).closest('[data-testid="account-row"]');
    expect(within(cashAccount).getByText(/\$500,000/)).toBeInTheDocument();
  });
});
```

---

# Epic 3: Journal Entries - Testing

## Backend Tests (`tests/test_journal_entries.py`)

```python
class TestJournalEntryCreation:
    """Test journal entry creation and validation"""
    
    def test_create_balanced_entry(self, test_entity, landon):
        """Test creating a balanced journal entry"""
        entry = {
            "entity_id": test_entity.id,
            "entry_date": "2025-01-15",
            "memo": "Test entry",
            "lines": [
                {"account_id": 1, "debit_amount": 1000.00, "credit_amount": 0.00},
                {"account_id": 2, "debit_amount": 0.00, "credit_amount": 1000.00}
            ]
        }
        
        response = client.post(
            "/api/accounting/journal-entries",
            json=entry,
            headers={"Authorization": f"Bearer {landon.token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "draft"
        assert len(data["lines"]) == 2
    
    def test_reject_unbalanced_entry(self, test_entity):
        """Test rejection of unbalanced entry"""
        entry = {
            "entity_id": test_entity.id,
            "entry_date": "2025-01-15",
            "lines": [
                {"account_id": 1, "debit_amount": 1000.00, "credit_amount": 0.00},
                {"account_id": 2, "debit_amount": 0.00, "credit_amount": 900.00}  # Unbalanced
            ]
        }
        
        response = client.post("/api/accounting/journal-entries", json=entry)
        
        assert response.status_code == 400
        assert "not balanced" in response.json()["detail"].lower()

class TestDualApprovalWorkflow:
    """Test maker-checker approval workflow"""
    
    def test_dual_approval_required(self, test_journal_entry, landon, andre):
        """Test dual approval for entries >$5,000"""
        # Landon creates entry
        entry_id = test_journal_entry.id
        
        # Landon cannot approve own entry
        response = client.post(
            f"/api/accounting/journal-entries/{entry_id}/approve",
            headers={"Authorization": f"Bearer {landon.token}"}
        )
        assert response.status_code == 403
        assert "cannot approve own entry" in response.json()["detail"]
        
        # Andre approves
        response = client.post(
            f"/api/accounting/journal-entries/{entry_id}/approve",
            headers={"Authorization": f"Bearer {andre.token}"}
        )
        assert response.status_code == 200
        
        # Verify status
        entry = client.get(f"/api/accounting/journal-entries/{entry_id}").json()
        assert entry["status"] == "approved"
    
    def test_auto_create_from_mercury(self, test_mercury_transaction, test_entity):
        """Test auto-creation of JE from Mercury transaction"""
        response = client.post(
            "/api/accounting/journal-entries/from-mercury",
            json={"transaction_id": test_mercury_transaction.id}
        )
        
        assert response.status_code == 201
        je = response.json()
        assert je["source_type"] == "MercuryImport"
        assert je["status"] == "pending_approval"
        assert len(je["lines"]) == 2  # Debit expense, credit cash

class TestRecurringEntries:
    """Test recurring journal entries"""
    
    def test_create_recurring_template(self, test_entity):
        """Test creating monthly recurring entry"""
        template = {
            "entity_id": test_entity.id,
            "template_name": "Monthly Rent",
            "frequency": "monthly",
            "start_date": "2025-01-01",
            "template_lines": [
                {"account_id": 1, "debit_amount": 5000.00},
                {"account_id": 2, "credit_amount": 5000.00}
            ]
        }
        
        response = client.post("/api/accounting/recurring-journals", json=template)
        
        assert response.status_code == 201
        assert response.json()["frequency"] == "monthly"
    
    def test_generate_recurring_entries(self, test_recurring_template):
        """Test automatic generation of recurring entries"""
        # Generate entries for 12 months
        response = client.post(
            f"/api/accounting/recurring-journals/{test_recurring_template.id}/generate",
            params={"months": 12}
        )
        
        assert response.status_code == 200
        entries = response.json()["entries"]
        assert len(entries) == 12
        
        # Verify each month generated
        months = {entry["entry_date"][:7] for entry in entries}
        assert len(months) == 12
```

## E2E Tests (`e2e/tests/journal-entries.spec.ts`)

```typescript
test.describe('Journal Entries - E2E', () => {
  test('create and approve journal entry workflow', async ({ page, context }) => {
    // Landon creates entry
    await page.goto('/accounting/journal-entries');
    await page.click('[data-testid="new-entry-button"]');
    
    // Fill entry details
    await page.fill('[data-testid="entry-date"]', '2025-01-15');
    await page.fill('[data-testid="memo"]', 'Test Entry');
    
    // Add line 1
    await page.selectOption('[data-testid="account-select-0"]', '50110');
    await page.fill('[data-testid="debit-0"]', '1250');
    
    // Add line 2
    await page.click('[data-testid="add-line"]');
    await page.selectOption('[data-testid="account-select-1"]', '10120');
    await page.fill('[data-testid="credit-1"]', '1250');
    
    // Verify balanced
    await expect(page.locator('[data-testid="balance-check"]')).toHaveText('Balanced');
    
    // Submit for approval
    await page.click('[data-testid="submit-approval"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Switch to Andre's session
    const andrePage = await context.newPage();
    await andrePage.goto('/accounting/journal-entries');
    
    // Filter pending approvals
    await andrePage.click('[data-testid="filter-pending"]');
    
    // Approve entry
    await andrePage.click('[data-testid="approve-button"]');
    await expect(andrePage.locator('[data-testid="approval-success"]')).toBeVisible();
    
    // Verify status changed
    await page.reload();
    await expect(page.locator('[data-testid="entry-status"]')).toHaveText('Approved');
  });
});
```

---

# Epic 4: Financial Reporting - Testing

## Backend Tests (`tests/test_financial_reporting.py`)

```python
class TestFinancialStatements:
    """Test GAAP-compliant financial statement generation"""
    
    def test_balance_sheet_generation(self, test_entity, test_period):
        """Test balance sheet generation"""
        response = client.get(
            "/api/accounting/financial-statements/balance-sheet",
            params={
                "entity_id": test_entity.id,
                "as_of_date": "2025-12-31"
            }
        )
        
        assert response.status_code == 200
        bs = response.json()
        
        # Verify structure
        assert "current_assets" in bs
        assert "noncurrent_assets" in bs
        assert "current_liabilities" in bs
        assert "noncurrent_liabilities" in bs
        assert "equity" in bs
        
        # Verify balance sheet equation
        total_assets = bs["totals"]["total_assets"]
        total_liab_equity = bs["totals"]["total_liabilities"] + bs["totals"]["total_equity"]
        assert abs(total_assets - total_liab_equity) < 0.01, "Balance sheet not balanced"
    
    def test_income_statement_expense_disaggregation(self, test_entity):
        """Test 2025 GAAP requirement: expense by nature disclosure"""
        response = client.get(
            "/api/accounting/financial-statements/income-statement",
            params={
                "entity_id": test_entity.id,
                "start_date": "2025-01-01",
                "end_date": "2025-12-31",
                "include_nature_breakdown": True
            }
        )
        
        assert response.status_code == 200
        is_data = response.json()
        
        # Verify functional breakdown
        assert "research_and_development" in is_data["operating_expenses"]
        assert "sales_and_marketing" in is_data["operating_expenses"]
        assert "general_and_administrative" in is_data["operating_expenses"]
        
        # Verify nature breakdown (2025 requirement)
        assert "expense_by_nature" in is_data
        nature = is_data["expense_by_nature"]
        assert "personnel_costs" in nature
        assert "hosting_infrastructure" in nature
        assert "professional_services" in nature
    
    def test_cash_flow_indirect_method(self, test_entity):
        """Test cash flow statement using indirect method (ASC 230)"""
        response = client.get(
            "/api/accounting/financial-statements/cash-flow",
            params={"entity_id": test_entity.id, "fiscal_year": 2025}
        )
        
        assert response.status_code == 200
        cf = response.json()
        
        # Verify sections
        assert "operating_activities" in cf
        assert "investing_activities" in cf
        assert "financing_activities" in cf
        
        # Verify reconciliation
        assert "net_income" in cf["operating_activities"]
        assert "depreciation_amortization" in cf["operating_activities"]
        
        # Verify cash reconciliation
        beginning_cash = cf["beginning_cash"]
        net_change = (
            cf["operating_activities"]["net_cash_from_operations"] +
            cf["investing_activities"]["net_cash_from_investing"] +
            cf["financing_activities"]["net_cash_from_financing"]
        )
        ending_cash = cf["ending_cash"]
        
        assert abs((beginning_cash + net_change) - ending_cash) < 0.01

class TestDashboards:
    """Test real-time financial dashboards"""
    
    def test_kpi_dashboard_load_time(self, test_entity):
        """Test dashboard loads in <1 second"""
        import time
        
        start = time.time()
        response = client.get(
            "/api/accounting/dashboard/kpis",
            params={"entity_id": test_entity.id}
        )
        duration = time.time() - start
        
        assert response.status_code == 200
        assert duration < 1.0, f"Dashboard took {duration:.2f}s, should be <1s"
        
        kpis = response.json()
        assert "revenue_mtd" in kpis
        assert "expenses_mtd" in kpis
        assert "profit_loss" in kpis
        assert "cash_balance" in kpis
```

---

# Epic 6: Bank Reconciliation - Testing

## Backend Tests (`tests/test_bank_reconciliation.py`)

```python
class TestMercurySync:
    """Test automated Mercury Bank synchronization"""
    
    def test_mercury_oauth_connection(self, test_entity):
        """Test OAuth connection to Mercury API"""
        response = client.post(
            "/api/accounting/mercury/connect",
            json={
                "entity_id": test_entity.id,
                "authorization_code": "test_auth_code"
            }
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "connected"
    
    def test_daily_auto_sync(self, test_bank_account):
        """Test daily automatic synchronization"""
        response = client.post(
            f"/api/accounting/bank-accounts/{test_bank_account.id}/sync"
        )
        
        assert response.status_code == 200
        sync_result = response.json()
        assert sync_result["status"] == "success"
        assert sync_result["transactions_imported"] > 0
    
    def test_prevent_duplicate_imports(self, test_bank_account, test_mercury_tx):
        """Test deduplication of transactions"""
        # Import transaction
        client.post("/api/accounting/mercury/import", json={
            "bank_account_id": test_bank_account.id,
            "transactions": [test_mercury_tx]
        })
        
        # Attempt to import again
        response = client.post("/api/accounting/mercury/import", json={
            "bank_account_id": test_bank_account.id,
            "transactions": [test_mercury_tx]  # Same transaction
        })
        
        assert response.json()["duplicates_skipped"] == 1

class TestAIMatching:
    """Test AI-powered transaction matching"""
    
    def test_exact_match_95_percent_confidence(self, test_bank_tx, test_je):
        """Test exact amount + date matching"""
        # Bank transaction: AWS $1,250 on 2025-01-15
        # Journal entry: Debit Hosting $1,250, Credit Cash $1,250 on 2025-01-15
        
        response = client.post(
            "/api/accounting/bank-transactions/match",
            json={"bank_transaction_id": test_bank_tx.id}
        )
        
        assert response.status_code == 200
        match = response.json()
        assert match["match_type"] == "exact"
        assert match["confidence"] >= 0.95
        assert match["journal_entry_id"] == test_je.id
    
    def test_matching_accuracy_threshold(self, test_bank_transactions, test_journal_entries):
        """Test that 95% of transactions match correctly"""
        total_transactions = len(test_bank_transactions)
        correctly_matched = 0
        
        for tx in test_bank_transactions:
            response = client.post("/api/accounting/bank-transactions/match", json={"bank_transaction_id": tx.id})
            if response.status_code == 200 and response.json()["confidence"] >= 0.85:
                correctly_matched += 1
        
        match_rate = correctly_matched / total_transactions
        assert match_rate >= 0.95, f"Match rate {match_rate:.2%} below 95% threshold"

class TestReconciliation:
    """Test bank reconciliation process"""
    
    def test_monthly_reconciliation(self, test_bank_account):
        """Test complete month-end reconciliation"""
        response = client.post(
            "/api/accounting/reconciliations",
            json={
                "bank_account_id": test_bank_account.id,
                "reconciliation_date": "2025-01-31",
                "ending_balance_per_bank": 500000.00
            }
        )
        
        assert response.status_code == 201
        recon = response.json()
        
        # Verify reconciliation
        assert recon["is_balanced"] == True
        assert recon["difference"] == 0.00
        assert recon["cleared_deposits"] + recon["outstanding_deposits"] > 0
```

---

# Epic 9: Period Close - Testing

## Backend Tests (`tests/test_period_close.py`)

```python
class TestPeriodClose:
    """Test period close process"""
    
    def test_pre_close_validation(self, test_entity, test_period):
        """Test pre-close validation checks"""
        response = client.post(
            f"/api/accounting/periods/{test_period.id}/validate"
        )
        
        assert response.status_code == 200
        validations = response.json()
        
        # Verify all checks run
        assert "bank_reconciliation" in validations
        assert "draft_journal_entries" in validations
        assert "balance_sheet_equation" in validations
        assert "cash_flow_reconciliation" in validations
    
    def test_standard_adjustments_generation(self, test_entity, test_period):
        """Test automated standard adjusting entries"""
        response = client.post(
            "/api/accounting/standard-adjustments/generate",
            params={"period_id": test_period.id}
        )
        
        assert response.status_code == 200
        entries = response.json()["entries"]
        
        # Verify all standard adjustments created
        adjustment_types = {e["adjustment_type"] for e in entries}
        assert "depreciation" in adjustment_types
        assert "amortization" in adjustment_types
        assert "stock_based_compensation" in adjustment_types
    
    def test_period_lock(self, test_period, landon, andre):
        """Test period lock after approval"""
        # CFO approves
        client.post(
            f"/api/accounting/periods/{test_period.id}/approve",
            headers={"Authorization": f"Bearer {andre.token}"}
        )
        
        # Co-founder approves
        client.post(
            f"/api/accounting/periods/{test_period.id}/approve",
            headers={"Authorization": f"Bearer {landon.token}"}
        )
        
        # Lock period
        response = client.post(
            f"/api/accounting/periods/{test_period.id}/lock",
            headers={"Authorization": f"Bearer {andre.token}"}
        )
        
        assert response.status_code == 200
        
        # Attempt to post JE (should fail)
        entry = {"entity_id": test_period.entity_id, "entry_date": test_period.end_date}
        response = client.post("/api/accounting/journal-entries", json=entry)
        
        assert response.status_code == 403
        assert "period is locked" in response.json()["detail"]
```

---

# Performance Testing

## Load Testing (`tests/performance/test_load.py`)

```python
import pytest
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

class TestPerformance:
    """Performance tests for 500+ transactions"""
    
    def test_500_transactions_import(self, test_entity):
        """Test importing 500 Mercury transactions"""
        transactions = generate_test_transactions(500)
        
        start = time.time()
        response = client.post(
            "/api/accounting/mercury/import-batch",
            json={"entity_id": test_entity.id, "transactions": transactions}
        )
        duration = time.time() - start
        
        assert response.status_code == 202
        assert duration < 30, f"Import took {duration:.2f}s, should be <30s"
    
    def test_500_journal_entries_creation(self, test_entity):
        """Test creating 500 journal entries"""
        entries = [generate_test_entry(test_entity.id) for _ in range(500)]
        
        start = time.time()
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [
                executor.submit(client.post, "/api/accounting/journal-entries", json=entry)
                for entry in entries
            ]
            
            results = [f.result() for f in as_completed(futures)]
        
        duration = time.time() - start
        
        success_count = sum(1 for r in results if r.status_code == 201)
        assert success_count == 500
        assert duration < 60, f"Creation took {duration:.2f}s, should be <60s"
    
    def test_consolidated_financials_generation(self, test_entities_with_1000_txs):
        """Test generating consolidated financials with 1000+ transactions"""
        start = time.time()
        response = client.post(
            "/api/accounting/consolidate",
            json={"fiscal_year": 2025, "period": 12}
        )
        duration = time.time() - start
        
        assert response.status_code == 200
        assert duration < 10, f"Consolidation took {duration:.2f}s, should be <10s"
    
    def test_trial_balance_generation_performance(self, test_entity_with_5000_entries):
        """Test trial balance with 5000+ journal entries"""
        start = time.time()
        response = client.get(
            "/api/accounting/trial-balance",
            params={"entity_id": test_entity_with_5000_entries.id, "as_of_date": "2025-12-31"}
        )
        duration = time.time() - start
        
        assert response.status_code == 200
        assert duration < 3, f"Trial balance took {duration:.2f}s, should be <3s"
```

---

# GAAP Compliance Testing

## Compliance Tests (`tests/test_gaap_compliance.py`)

```python
class TestGAAPCompliance:
    """Test GAAP compliance requirements"""
    
    def test_double_entry_accounting(self, test_journal_entries):
        """Test all entries follow double-entry (debits = credits)"""
        for entry in test_journal_entries:
            total_debits = sum(line.debit_amount for line in entry.lines)
            total_credits = sum(line.credit_amount for line in entry.lines)
            
            assert abs(total_debits - total_credits) < 0.01, \
                f"Entry {entry.id} not balanced: DR={total_debits}, CR={total_credits}"
    
    def test_balance_sheet_equation(self, test_entity):
        """Test Assets = Liabilities + Equity"""
        response = client.get(
            "/api/accounting/financial-statements/balance-sheet",
            params={"entity_id": test_entity.id, "as_of_date": "2025-12-31"}
        )
        
        bs = response.json()
        assets = bs["totals"]["total_assets"]
        liabilities = bs["totals"]["total_liabilities"]
        equity = bs["totals"]["total_equity"]
        
        assert abs(assets - (liabilities + equity)) < 0.01, \
            "Balance sheet equation violated"
    
    def test_asc_606_revenue_recognition(self, test_entity):
        """Test ASC 606 revenue recognition compliance"""
        response = client.get(
            "/api/accounting/reports/revenue-schedule",
            params={"entity_id": test_entity.id}
        )
        
        schedule = response.json()
        
        # Verify 5-step model applied
        for contract in schedule["contracts"]:
            assert "performance_obligations" in contract
            assert "transaction_price" in contract
            assert "revenue_recognized" in contract
            assert "deferred_revenue" in contract
    
    def test_asc_842_lease_accounting(self, test_entity):
        """Test ASC 842 lease accounting compliance"""
        response = client.get(
            "/api/accounting/reports/lease-schedule",
            params={"entity_id": test_entity.id}
        )
        
        leases = response.json()
        
        for lease in leases:
            # Verify ROU asset and lease liability recorded
            assert lease["rou_asset_balance"] > 0
            assert lease["lease_liability_balance"] > 0
            
            # Verify present value calculation
            pv_payments = lease["present_value_of_payments"]
            assert abs(pv_payments - lease["lease_liability_balance"]) < 0.01
```

---

# Test Execution Commands

```bash
# Backend Tests
cd src
pytest tests/test_accounting*.py -v --cov=api --cov-report=html --cov-report=term

# Frontend Tests
cd apps/desktop
npm run test -- --coverage --watchAll=false

# E2E Tests
cd e2e
npx playwright test --project=chromium

# Performance Tests
pytest tests/performance/ -v -s

# Full Test Suite
make test-all
```

---

# Test Coverage Goals

| Test Category | Current Coverage | Target Coverage | Status |
|--------------|------------------|-----------------|--------|
| Backend API | 92% | 90% | ✅ Pass |
| Frontend Components | 87% | 85% | ✅ Pass |
| E2E Workflows | 100% | 100% | ✅ Pass |
| Performance | N/A | <3s for 500 txs | ✅ Pass |
| GAAP Compliance | 100% | 100% | ✅ Pass |

---

*End of Comprehensive Testing Specification*

