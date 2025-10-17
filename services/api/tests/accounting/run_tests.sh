#!/bin/bash
# Quick test runner script for accounting module tests

set -e

echo "==================================="
echo "Accounting Module Test Suite"
echo "==================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "conftest.py" ]; then
    echo -e "${RED}Error: Please run this script from services/api/tests/accounting/${NC}"
    exit 1
fi

# Check for pytest
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}Error: pytest not found. Please install: pip install pytest pytest-asyncio${NC}"
    exit 1
fi

# Function to run tests with options
run_tests() {
    local test_file=$1
    local description=$2

    echo -e "${YELLOW}Running: $description${NC}"
    if pytest "$test_file" -v; then
        echo -e "${GREEN}✓ PASSED${NC}"
    else
        echo -e "${RED}✗ FAILED${NC}"
        exit 1
    fi
    echo ""
}

# Parse arguments
case "${1:-all}" in
    upload)
        echo "Running upload tests only..."
        run_tests "test_document_upload.py" "Document Upload Tests"
        ;;
    extraction)
        echo "Running extraction tests only..."
        run_tests "test_document_extraction.py" "Document Extraction Tests"
        ;;
    categorization)
        echo "Running categorization tests only..."
        run_tests "test_document_categorization.py" "Document Categorization Tests"
        ;;
    workflow)
        echo "Running workflow tests only..."
        run_tests "test_document_workflow.py" "Integration Workflow Tests"
        ;;
    quick)
        echo "Running quick smoke tests..."
        pytest . -v -k "test_upload_document_success or test_categorize_formation or test_extract_invoice"
        ;;
    coverage)
        echo "Running all tests with coverage..."
        pytest . -v \
            --cov=services.api.routes.accounting_documents \
            --cov=services.api.services.google_vision_extractor \
            --cov-report=term-missing \
            --cov-report=html
        echo ""
        echo -e "${GREEN}Coverage report generated in htmlcov/index.html${NC}"
        ;;
    all|*)
        echo "Running all tests..."
        run_tests "test_document_categorization.py" "1/4: Document Categorization Tests"
        run_tests "test_document_extraction.py" "2/4: Document Extraction Tests"
        run_tests "test_document_upload.py" "3/4: Document Upload Tests"
        run_tests "test_document_workflow.py" "4/4: Integration Workflow Tests"

        echo -e "${GREEN}==================================="
        echo "All tests passed! ✓"
        echo "===================================${NC}"
        ;;
esac
