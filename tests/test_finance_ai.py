"""
Test suite for Finance AI endpoints
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import json

from src.api.main import app

client = TestClient(app)

@pytest.fixture
def mock_db_session():
    """Mock database session for testing"""
    with patch('src.api.routes.finance_ai.get_db') as mock_get_db:
        mock_session = MagicMock()
        mock_get_db.return_value = mock_session
        yield mock_session

@pytest.fixture
def mock_auth():
    """Mock authentication for testing"""
    with patch('src.api.routes.finance_ai.require_clerk_user') as mock_auth:
        mock_auth.return_value = {"user_id": "test_user", "email": "test@ngicapital.com"}
        yield mock_auth

@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client for testing"""
    with patch('src.api.routes.finance_ai.get_openai_client') as mock_get_client:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "response": "I can help you with your financial analysis. Based on your data, I recommend reviewing your cash flow projections.",
            "actions": [{"type": "analyze_cash_flow", "label": "Analyze Cash Flow"}],
            "confidence": 0.9
        })
        mock_client.chat.completions.create.return_value = mock_response
        mock_get_client.return_value = mock_client
        yield mock_client

class TestCASEChat:
    """Test CASE AI chat functionality"""
    
    def test_case_chat_success(self, mock_db_session, mock_auth, mock_openai_client):
        """Test successful CASE chat interaction"""
        # Mock database responses
        mock_db_session.execute.return_value.fetchone.return_value = ("NGI Capital LLC",)
        mock_db_session.execute.return_value.fetchall.return_value = [
            ("61200", "Employee Salaries", "Operating Expense"),
            ("62000", "Employee Benefits", "Operating Expense")
        ]
        
        response = client.post(
            "/api/finance/ai/case-chat",
            json={
                "message": "What's our current revenue?",
                "context": "finance",
                "entity_id": 1
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "confidence" in data
        assert "actions" in data
        assert data["confidence"] > 0
    
    def test_case_chat_without_entity(self, mock_db_session, mock_auth):
        """Test CASE chat without entity ID"""
        response = client.post(
            "/api/finance/ai/case-chat",
            json={
                "message": "Help me with forecasting",
                "context": "forecasting"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
    
    def test_case_chat_database_error(self, mock_db_session, mock_auth):
        """Test CASE chat with database error"""
        mock_db_session.execute.side_effect = Exception("Database error")
        
        response = client.post(
            "/api/finance/ai/case-chat",
            json={
                "message": "What's our revenue?",
                "context": "finance",
                "entity_id": 1
            }
        )
        
        # Should still work with fallback context
        assert response.status_code == 200

class TestExpenseParser:
    """Test AI-powered expense parsing"""
    
    def test_parse_engineer_hiring(self, mock_db_session, mock_auth, mock_openai_client):
        """Test parsing engineer hiring expense"""
        # Mock Chart of Accounts
        mock_db_session.execute.return_value.fetchall.return_value = [
            ("61200", "Employee Salaries", "Operating Expense"),
            ("62000", "Employee Benefits", "Operating Expense")
        ]
        
        # Mock GPT-5 response for expense parsing
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "mappings": [
                {
                    "account_code": "61200",
                    "account_name": "Employee Salaries",
                    "amount_per_month": 25000,
                    "amount_per_year": 300000,
                    "start_date": "2026-03-01",
                    "is_fixed_cost": True,
                    "confidence": 0.98,
                    "category": "Operating Expense",
                    "subcategory": "Personnel",
                    "formula": "2 * 150000 / 12"
                }
            ],
            "runway_impact": {
                "before_months": 18.4,
                "after_months": 16.0,
                "delta_months": -2.4
            }
        })
        mock_openai_client.chat.completions.create.return_value = mock_response
        
        response = client.post(
            "/api/finance/ai/expense-parser",
            json={
                "natural_language_input": "Hire 2 software engineers at $150K each starting in March 2026, plus 15% benefits and payroll taxes",
                "entity_id": 1
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "mappings" in data
        assert "confidence_scores" in data
        assert "impacts" in data
        
        # Should detect salary and related expenses
        mappings = data["mappings"]
        assert len(mappings) >= 1
        assert mappings[0]["account_name"] == "Employee Salaries"
        
        salary_mapping = next((m for m in mappings if m.get("account_code") == "61200" or m.get("account_number") == "61200"), None)
        assert salary_mapping is not None
        assert salary_mapping["amount_per_year"] == 300000
        assert salary_mapping["is_fixed_cost"] is True
        assert salary_mapping["confidence"] > 0.9
    
    def test_parse_marketing_expense(self, mock_db_session, mock_auth):
        """Test parsing marketing expense"""
        mock_db_session.execute.return_value.fetchall.return_value = [
            ("65000", "Marketing Expenses", "Operating Expense")
        ]
        
        response = client.post(
            "/api/finance/ai/expense-parser",
            json={
                "natural_language_input": "Add $5K/month for digital marketing campaigns",
                "entity_id": 1
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        mappings = data["mappings"]
        
        marketing_mapping = next((m for m in mappings if "marketing" in m["account_name"].lower()), None)
        assert marketing_mapping is not None
        assert marketing_mapping["amount_per_month"] == 5000
        assert marketing_mapping["is_fixed_cost"] is False
    
    def test_parse_rent_expense(self, mock_db_session, mock_auth):
        """Test parsing rent/office expense"""
        mock_db_session.execute.return_value.fetchall.return_value = [
            ("64000", "Rent and Facilities", "Operating Expense")
        ]
        
        response = client.post(
            "/api/finance/ai/expense-parser",
            json={
                "natural_language_input": "New office rent $4,500/month starting October 2025",
                "entity_id": 1
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        mappings = data["mappings"]
        
        rent_mapping = next((m for m in mappings if "rent" in m["account_name"].lower()), None)
        assert rent_mapping is not None
        assert rent_mapping["amount_per_month"] == 4500
        assert rent_mapping["is_fixed_cost"] is True
    
    def test_parse_unknown_expense(self, mock_db_session, mock_auth):
        """Test parsing unknown expense type"""
        mock_db_session.execute.return_value.fetchall.return_value = []
        
        response = client.post(
            "/api/finance/ai/expense-parser",
            json={
                "natural_language_input": "Random expense $1000",
                "entity_id": 1
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        # Should return empty mappings for unknown expenses
        assert len(data["mappings"]) == 0
    
    def test_parse_expense_database_error(self, mock_db_session, mock_auth):
        """Test expense parsing with database error"""
        mock_db_session.execute.side_effect = Exception("Database error")
        
        response = client.post(
            "/api/finance/ai/expense-parser",
            json={
                "natural_language_input": "Hire engineers",
                "entity_id": 1
            }
        )
        
        assert response.status_code == 500
        assert "Expense parsing error" in response.json()["detail"]

class TestFSLISuggestions:
    """Test FSLI suggestions endpoint"""
    
    def test_fsli_suggestions_success(self, mock_db_session, mock_auth):
        """Test successful FSLI suggestions"""
        mock_db_session.execute.return_value.fetchall.return_value = [
            ("61200", "Employee Salaries", "Operating Expense"),
            ("61210", "Employee Wages", "Operating Expense")
        ]
        
        response = client.get(
            "/api/finance/ai/fsli-suggestions?query=salary&entity_id=1"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert len(data["suggestions"]) == 2
        
        # Check suggestion structure
        suggestion = data["suggestions"][0]
        assert "account_code" in suggestion
        assert "account_name" in suggestion
        assert "account_type" in suggestion
    
    def test_fsli_suggestions_no_results(self, mock_db_session, mock_auth):
        """Test FSLI suggestions with no results"""
        mock_db_session.execute.return_value.fetchall.return_value = []
        
        response = client.get(
            "/api/finance/ai/fsli-suggestions?query=nonexistent&entity_id=1"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["suggestions"]) == 0
    
    def test_fsli_suggestions_database_error(self, mock_db_session, mock_auth):
        """Test FSLI suggestions with database error"""
        mock_db_session.execute.side_effect = Exception("Database error")
        
        response = client.get(
            "/api/finance/ai/fsli-suggestions?query=test&entity_id=1"
        )
        
        assert response.status_code == 500
        assert "FSLI suggestions error" in response.json()["detail"]

class TestFinanceContext:
    """Test finance context gathering"""
    
    def test_get_finance_context_with_entity(self, mock_db_session):
        """Test getting finance context with entity ID"""
        from src.api.routes.finance_ai import get_finance_context
        
        # Mock database responses
        mock_db_session.execute.return_value.fetchone.return_value = ("NGI Capital LLC",)
        mock_db_session.execute.return_value.fetchall.return_value = [
            ("61200", "Employee Salaries", "Operating Expense")
        ]
        
        context = get_finance_context(mock_db_session, 1, "finance")
        
        assert context["entity_name"] == "NGI Capital LLC"
        assert context["module"] == "finance"
        assert len(context["coa_summary"]) == 1
        assert "61200: Employee Salaries (Operating Expense)" in context["coa_summary"]
    
    def test_get_finance_context_without_entity(self, mock_db_session):
        """Test getting finance context without entity ID"""
        from src.api.routes.finance_ai import get_finance_context
        
        mock_db_session.execute.side_effect = Exception("No entity")
        
        context = get_finance_context(mock_db_session, None, "dashboard")
        
        assert context["entity_name"] == "NGI Capital"
        assert context["module"] == "dashboard"
        assert context["metrics"] == {}
        assert context["coa_summary"] == []

class TestIntegration:
    """Integration tests for finance AI features"""
    
    def test_full_expense_parsing_workflow(self, mock_db_session, mock_auth):
        """Test complete expense parsing workflow"""
        # Mock Chart of Accounts
        mock_db_session.execute.return_value.fetchall.return_value = [
            ("61200", "Employee Salaries", "Operating Expense"),
            ("62000", "Employee Benefits", "Operating Expense"),
            ("65000", "Marketing Expenses", "Operating Expense")
        ]
        
        # Test multiple expense types
        test_cases = [
            {
                "input": "Hire 2 engineers at $150K each",
                "expected_accounts": ["61200", "62000"]
            },
            {
                "input": "Marketing budget $5K/month",
                "expected_accounts": ["65000"]
            }
        ]
        
        for test_case in test_cases:
            response = client.post(
                "/api/finance/ai/expense-parser",
                json={
                    "natural_language_input": test_case["input"],
                    "entity_id": 1
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Check that expected accounts are found
            found_accounts = [m["account_code"] for m in data["mappings"]]
            for expected_account in test_case["expected_accounts"]:
                assert expected_account in found_accounts
    
    def test_case_chat_with_expense_parsing(self, mock_db_session, mock_auth):
        """Test CASE chat that triggers expense parsing"""
        # Mock database responses
        mock_db_session.execute.return_value.fetchone.return_value = ("NGI Capital LLC",)
        mock_db_session.execute.return_value.fetchall.return_value = [
            ("61200", "Employee Salaries", "Operating Expense")
        ]
        
        response = client.post(
            "/api/finance/ai/case-chat",
            json={
                "message": "Add $5K/month for new marketing hire",
                "context": "forecasting",
                "entity_id": 1
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should provide helpful response about expense addition
        assert "marketing" in data["response"].lower() or "expense" in data["response"].lower()
        assert data["confidence"] > 0

if __name__ == "__main__":
    pytest.main([__file__])
