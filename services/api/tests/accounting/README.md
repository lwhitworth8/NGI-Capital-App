# Accounting Module Tests

Comprehensive test suite for the accounting module's document upload, extraction, and categorization functionality.

## Overview

This test suite validates the complete document workflow:

1. **Document Upload** - File upload, validation, and storage
2. **Document Extraction** - Google Cloud Vision text extraction and data parsing
3. **Document Categorization** - Automatic categorization based on filename and content
4. **Integration Workflow** - End-to-end testing of the complete pipeline

## Test Structure

```
services/api/tests/accounting/
├── __init__.py
├── conftest.py                          # Test fixtures and setup
├── test_document_upload.py              # Upload endpoint tests
├── test_document_extraction.py          # Extraction service tests
├── test_document_categorization.py      # Categorization logic tests
├── test_document_workflow.py            # Integration tests
└── README.md                            # This file
```

## Prerequisites

### Required Dependencies

```bash
pip install pytest pytest-asyncio httpx sqlalchemy aiosqlite reportlab pillow
```

### Optional Dependencies (for full functionality)

```bash
pip install google-cloud-vision pdf2image
```

### Environment Variables

For full extraction testing (optional):
```bash
export GOOGLE_API_KEY="your-google-cloud-api-key"
export TEST_DATABASE_URL="sqlite+aiosqlite:///./test_accounting.db"
```

## Running Tests

### Run All Tests

```bash
# From project root
pytest services/api/tests/accounting/ -v

# Or with coverage
pytest services/api/tests/accounting/ -v --cov=services.api.routes.accounting_documents --cov=services.api.services.google_vision_extractor
```

### Run Specific Test Files

```bash
# Upload tests only
pytest services/api/tests/accounting/test_document_upload.py -v

# Extraction tests only
pytest services/api/tests/accounting/test_document_extraction.py -v

# Categorization tests only
pytest services/api/tests/accounting/test_document_categorization.py -v

# Integration tests only
pytest services/api/tests/accounting/test_document_workflow.py -v
```

### Run Specific Tests

```bash
# Run a specific test
pytest services/api/tests/accounting/test_document_upload.py::test_upload_document_success -v

# Run tests matching a pattern
pytest services/api/tests/accounting/ -v -k "categorization"
```

### Run with Different Verbosity Levels

```bash
# Minimal output
pytest services/api/tests/accounting/

# Verbose
pytest services/api/tests/accounting/ -v

# Very verbose (show print statements)
pytest services/api/tests/accounting/ -vv -s
```

## Test Categories

### 1. Document Upload Tests (`test_document_upload.py`)

Tests the `/api/accounting/documents/upload` endpoint:

- ✅ Successful document upload
- ✅ Auto-categorization based on filename
- ✅ Document with effective date
- ✅ Invalid entity handling
- ✅ Invalid file type rejection
- ✅ File size limit enforcement
- ✅ Amendment document handling
- ✅ Batch upload (multiple files)
- ✅ Batch upload limit enforcement

**Key Validations:**
- File type restrictions (.pdf, .jpg, .png, .xlsx, etc.)
- File size limit (50MB)
- Entity existence validation
- Proper categorization

### 2. Document Extraction Tests (`test_document_extraction.py`)

Tests the Google Cloud Vision extraction service:

- ✅ Invoice data extraction (amount, vendor, date, invoice number)
- ✅ Formation document extraction (entity name, state, EIN)
- ✅ Receipt data extraction (merchant, amount, date)
- ✅ EIN document extraction (CP575 format)
- ✅ Confidence scoring
- ✅ Multi-page PDF handling
- ✅ Complex invoice parsing (multiple amounts, credits)
- ✅ Date extraction (multiple formats)
- ✅ Error handling

**Extracted Fields by Document Type:**

**Invoices/Receipts:**
- `invoice_number`
- `total_amount`, `amount`
- `vendor`, `merchant`, `vendor_name`
- `invoice_date`, `date`, `transaction_date`
- `date_due`
- `bill_to`
- `paid_by_member` (if member name detected)

**Formation Documents:**
- `entity_name`
- `state`
- `ein`

**EIN Documents:**
- `ein`
- `entity_name`
- `issue_date`

### 3. Document Categorization Tests (`test_document_categorization.py`)

Tests the auto-categorization logic:

- ✅ Formation documents
- ✅ Bank resolutions (categorized as formation)
- ✅ EIN documents (CP575, tax ID)
- ✅ Operating agreements
- ✅ Accounting policies
- ✅ Invoices
- ✅ Receipts
- ✅ Bylaws
- ✅ Contracts
- ✅ Domain/hosting documents
- ✅ Case-insensitive matching
- ✅ Priority handling
- ✅ Real-world filename examples

**Categorization Rules:**

| Category | Keywords |
|----------|----------|
| `formation` | formation, certificate, articles, incorporation, resolution, bank resolution |
| `ein` | ein, cp575, tax_id, irs, federal |
| `operating_agreement` | operating_agreement |
| `accounting_policies` | accounting_policies, internal_controls, procedures_manual |
| `invoices` | invoice, bill |
| `receipts` | receipt, payment |
| `bylaws` | bylaws |
| `contract` | agreement, contract |
| `domain` | domain, hosting, squarespace, godaddy |
| `other` | fallback for unrecognized documents |

### 4. Integration Workflow Tests (`test_document_workflow.py`)

End-to-end integration tests:

- ✅ Complete invoice workflow (upload → extract → match)
- ✅ Document listing and pagination
- ✅ Document search functionality
- ✅ Document reprocessing
- ✅ Document soft delete (archiving)
- ✅ Document download
- ✅ Formation document workflow
- ✅ EIN document workflow
- ✅ Receipt image workflow
- ✅ Multi-entity isolation
- ✅ Status transitions

## Test Fixtures

The test suite includes comprehensive fixtures defined in `conftest.py`:

### Database Fixtures
- `test_db` - Clean test database for each test
- `test_entity` - Sample accounting entity
- `test_partner` - Test user/partner
- `test_chart_of_accounts` - Sample chart of accounts
- `test_bank_account` - Sample bank account
- `sample_bank_transactions` - Sample transactions for matching

### Document Fixtures
- `document_categories` - All document categories
- `sample_pdf_invoice` - Generated PDF invoice
- `sample_pdf_formation` - Generated PDF formation document
- `sample_image_receipt` - Generated PNG receipt image
- `client` - AsyncClient for API testing

## Debugging Failed Tests

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Ensure test database is accessible
   export TEST_DATABASE_URL="sqlite+aiosqlite:///./test_accounting.db"
   ```

2. **Google Cloud Vision API Errors**
   ```bash
   # Tests will gracefully handle missing API key
   # For full functionality, set:
   export GOOGLE_API_KEY="your-key"
   ```

3. **File Path Errors**
   - Tests use in-memory files and temporary directories
   - Ensure `./uploads/accounting_documents` directory is writable

4. **Missing Dependencies**
   ```bash
   pip install -r requirements.txt
   pip install pytest pytest-asyncio httpx reportlab pillow
   ```

### Verbose Debug Output

```bash
# Show all print statements and logging
pytest services/api/tests/accounting/ -vv -s --log-cli-level=DEBUG

# Show failed test details
pytest services/api/tests/accounting/ -vv --tb=long
```

### Run Single Test with Debugging

```bash
# Run one test with full debug output
pytest services/api/tests/accounting/test_document_upload.py::test_upload_document_success -vv -s --log-cli-level=DEBUG
```

## Test Coverage

To generate coverage report:

```bash
# Run with coverage
pytest services/api/tests/accounting/ --cov=services.api.routes.accounting_documents --cov=services.api.services.google_vision_extractor --cov-report=html

# Open coverage report
open htmlcov/index.html
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Accounting Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio httpx reportlab pillow
      - name: Run tests
        run: pytest services/api/tests/accounting/ -v
```

## Adding New Tests

### Test Template

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_new_feature(
    client: AsyncClient,
    test_entity,
    test_partner,
    document_categories
):
    """Test description"""

    # Arrange
    # ... setup test data

    # Act
    response = await client.post(
        "/api/accounting/documents/upload",
        files={"file": ...},
        data={"entity_id": test_entity.id}
    )

    # Assert
    assert response.status_code == 200
    result = response.json()
    assert result["category"] == "expected_category"
```

### Best Practices

1. **Use descriptive test names** - `test_upload_invoice_with_special_characters`
2. **Test one thing at a time** - Each test should verify a single behavior
3. **Use fixtures** - Reuse common setup via fixtures in `conftest.py`
4. **Clean up** - Tests should be independent and not affect each other
5. **Mock external services** - Use mocks for Google Cloud Vision in unit tests
6. **Test edge cases** - Empty files, huge files, malformed data, etc.

## Known Limitations

1. **Google Cloud Vision API** - Some tests require API key for full functionality
2. **File System** - Tests create temporary files that are cleaned up automatically
3. **Async Testing** - All tests use `pytest-asyncio` for async/await support
4. **Database** - Tests use SQLite for simplicity; production uses PostgreSQL

## Troubleshooting

### Tests Hang or Timeout

```bash
# Increase timeout
pytest services/api/tests/accounting/ --timeout=60
```

### Database Lock Errors

```bash
# Use separate test database
rm test_accounting.db
pytest services/api/tests/accounting/ -v
```

### Import Errors

```bash
# Ensure project root is in PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
pytest services/api/tests/accounting/ -v
```

## Contact

For questions or issues with the test suite:
- Review test output: `pytest -vv -s`
- Check logs: Look for logger output in test results
- Verify fixtures: Ensure all fixtures in `conftest.py` are working

## Next Steps

To extend the test suite:

1. **Add Transaction Matching Tests** - Test document-to-transaction matching
2. **Add Journal Entry Creation Tests** - Test automatic JE creation from documents
3. **Add Approval Workflow Tests** - Test document approval flows
4. **Add Performance Tests** - Test with large batches of documents
5. **Add Security Tests** - Test authorization and access controls
