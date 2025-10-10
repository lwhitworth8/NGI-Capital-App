"""
Comprehensive test suite for CASE AI assistant functionality
Tests all enhanced features including internet search, dashboard insights, 
financial forecasting, and investor research.
"""
import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.api.main import app
from src.api.routes.finance_ai import (
    CASEChatRequest, 
    CASEChatResponse,
    search_internet,
    get_dashboard_insights,
    research_investor
)

client = TestClient(app)

@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client for testing"""
    mock_client = Mock()
    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message.content = json.dumps({
        "response": "Test response from CASE",
        "actions": [{"id": "test_action", "label": "Test Action", "type": "button", "action": "test"}],
        "confidence": 0.9,
        "type": "text"
    })
    mock_client.chat.completions.create.return_value = mock_response
    return mock_client

@pytest.fixture
def mock_database_session():
    """Mock database session with sample data"""
    mock_session = Mock(spec=Session)
    
    # Mock entity data
    mock_session.execute.return_value.fetchone.return_value = (
        "NGI Capital Advisory LLC", "LLC", "Financial Services"
    )
    
    # Mock financial metrics
    mock_session.execute.return_value.fetchone.return_value = (
        1000000.0,  # revenue
        600000.0,   # cogs
        200000.0,   # operating_expenses
        5000000.0,  # total_assets
        2000000.0,  # total_liabilities
        3000000.0   # total_equity
    )
    
    # Mock COA data
    mock_session.execute.return_value.fetchall.return_value = [
        ("1000", "Cash", "asset", 500000.0),
        ("2000", "Accounts Payable", "liability", 100000.0),
        ("3000", "Revenue", "revenue", 1000000.0)
    ]
    
    return mock_session

@pytest.fixture
def sample_case_request():
    """Sample CASE chat request for testing"""
    return {
        "message": "Analyze our current financial performance and provide insights",
        "context": "comprehensive",
        "entity_id": 1,
        "conversation_history": [],
        "include_internet_search": True,
        "include_dashboard_insights": True,
        "include_forecasting": True,
        "include_investor_research": True
    }

class TestCASEChatEndpoint:
    """Test the main CASE chat endpoint"""
    
    @patch('src.api.routes.finance_ai.require_clerk_user')
    @patch('src.api.routes.finance_ai.get_openai_client')
    @patch('src.api.routes.finance_ai.get_db')
    def test_case_chat_basic_functionality(self, mock_get_db, mock_get_client, mock_require_clerk_user, mock_openai_client, mock_database_session, sample_case_request):
        """Test basic CASE chat functionality"""
        mock_require_clerk_user.return_value = {"id": "test_user", "email": "test@ngicapitaladvisory.com"}
        mock_get_client.return_value = mock_openai_client
        mock_get_db.return_value = mock_database_session
        
        response = client.post("/api/finance/ai/case-chat", json=sample_case_request)
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "actions" in data
        assert "confidence" in data
        assert "type" in data
        assert "sources" in data
        
    @patch('src.api.routes.finance_ai.require_clerk_user')
    @patch('src.api.routes.finance_ai.get_openai_client')
    @patch('src.api.routes.finance_ai.get_db')
    def test_case_chat_with_internet_search(self, mock_get_db, mock_get_client, mock_require_clerk_user, mock_openai_client, mock_database_session):
        """Test CASE chat with internet search enabled"""
        mock_require_clerk_user.return_value = {"id": "test_user", "email": "test@ngicapitaladvisory.com"}
        mock_get_client.return_value = mock_openai_client
        mock_get_db.return_value = mock_database_session
        
        request_data = {
            "message": "What are the current market trends in financial services?",
            "context": "comprehensive",
            "entity_id": 1,
            "include_internet_search": True
        }
        
        with patch('src.api.routes.finance_ai.search_internet') as mock_search:
            mock_search.return_value = [
                {
                    "title": "Financial Services Market Trends 2025",
                    "url": "https://example.com/trends",
                    "description": "Latest trends in financial services",
                    "type": "external"
                }
            ]
            
            response = client.post("/api/finance/ai/case-chat", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert len(data["sources"]) > 0
            assert any(source["type"] == "external" for source in data["sources"])
    
    @patch('src.api.routes.finance_ai.get_openai_client')
    @patch('src.api.routes.finance_ai.get_db')
    def test_case_chat_with_dashboard_insights(self, mock_get_db, mock_get_client, mock_openai_client, mock_database_session):
        """Test CASE chat with dashboard insights enabled"""
        mock_get_client.return_value = mock_openai_client
        mock_get_db.return_value = mock_database_session
        
        request_data = {
            "message": "Give me insights about our dashboard metrics",
            "context": "comprehensive",
            "entity_id": 1,
            "include_dashboard_insights": True
        }
        
        response = client.post("/api/finance/ai/case-chat", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert any(source["type"] == "internal" for source in data["sources"])
    
    @patch('src.api.routes.finance_ai.get_openai_client')
    @patch('src.api.routes.finance_ai.get_db')
    def test_case_chat_with_investor_research(self, mock_get_db, mock_get_client, mock_openai_client, mock_database_session):
        """Test CASE chat with investor research enabled"""
        mock_get_client.return_value = mock_openai_client
        mock_get_db.return_value = mock_database_session
        
        request_data = {
            "message": "Research Sequoia Capital investor",
            "context": "comprehensive",
            "entity_id": 1,
            "include_investor_research": True
        }
        
        with patch('src.api.routes.finance_ai.research_investor') as mock_research:
            mock_research.return_value = {
                "name": "Sequoia Capital",
                "summary": "Leading venture capital firm",
                "investment_focus": ["Technology", "Healthcare"],
                "portfolio_companies": ["Apple", "Google"],
                "sources": []
            }
            
            response = client.post("/api/finance/ai/case-chat", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert any("Sequoia Capital" in source["title"] for source in data["sources"])

class TestInternetSearch:
    """Test internet search functionality"""
    
    @patch('src.api.routes.finance_ai.requests.get')
    def test_search_internet_success(self, mock_get):
        """Test successful internet search"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "web": {
                "results": [
                    {
                        "title": "Test Result",
                        "url": "https://example.com",
                        "description": "Test description"
                    }
                ]
            }
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        with patch.dict('os.environ', {'BRAVE_SEARCH_API_KEY': 'test_key'}):
            results = search_internet("test query", max_results=1)
            
            assert len(results) == 1
            assert results[0]["title"] == "Test Result"
            assert results[0]["url"] == "https://example.com"
            assert results[0]["type"] == "external"
    
    def test_search_internet_no_api_key(self):
        """Test internet search without API key"""
        with patch.dict('os.environ', {}, clear=True):
            results = search_internet("test query")
            assert results == []
    
    @patch('src.api.routes.finance_ai.requests.get')
    def test_search_internet_error(self, mock_get):
        """Test internet search with error"""
        mock_get.side_effect = Exception("API Error")
        
        with patch.dict('os.environ', {'BRAVE_SEARCH_API_KEY': 'test_key'}):
            results = search_internet("test query")
            assert results == []

class TestDashboardInsights:
    """Test dashboard insights functionality"""
    
    def test_get_dashboard_insights_success(self, mock_database_session):
        """Test successful dashboard insights generation"""
        insights = get_dashboard_insights(mock_database_session, 1)
        
        assert "key_metrics" in insights
        assert "trends" in insights
        assert "alerts" in insights
        assert "recommendations" in insights
        assert isinstance(insights["alerts"], list)
        assert isinstance(insights["recommendations"], list)
    
    def test_get_dashboard_insights_error(self):
        """Test dashboard insights with database error"""
        mock_session = Mock(spec=Session)
        mock_session.execute.side_effect = Exception("Database error")
        
        insights = get_dashboard_insights(mock_session, 1)
        
        assert "key_metrics" in insights
        assert insights["key_metrics"] == {}

class TestInvestorResearch:
    """Test investor research functionality"""
    
    @patch('src.api.routes.finance_ai.search_internet')
    @patch('src.api.routes.finance_ai.get_openai_client')
    def test_research_investor_success(self, mock_get_client, mock_search):
        """Test successful investor research"""
        mock_search.return_value = [
            {
                "title": "Sequoia Capital - Wikipedia",
                "url": "https://en.wikipedia.org/wiki/Sequoia_Capital",
                "description": "Sequoia Capital is a venture capital firm",
                "type": "external"
            }
        ]
        
        mock_client = Mock()
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = json.dumps({
            "summary": "Leading VC firm",
            "investment_focus": ["Technology"],
            "portfolio_companies": ["Apple", "Google"],
            "contact_info": {}
        })
        mock_client.chat.completions.create.return_value = mock_response
        mock_get_client.return_value = mock_client
        
        with patch.dict('os.environ', {'BRAVE_SEARCH_API_KEY': 'test_key'}):
            result = research_investor("Sequoia Capital")
            
            assert result["name"] == "Sequoia Capital"
            assert "summary" in result
            assert "investment_focus" in result
            assert "sources" in result
    
    def test_research_investor_error(self):
        """Test investor research with error"""
        with patch.dict('os.environ', {}, clear=True):
            result = research_investor("Test Investor")
            assert result["name"] == "Test Investor"
            assert "error" in result

class TestCASEAPIEndpoints:
    """Test individual CASE API endpoints"""
    
    @patch('src.api.routes.finance_ai.get_openai_client')
    @patch('src.api.routes.finance_ai.get_db')
    def test_dashboard_insights_endpoint(self, mock_get_db, mock_get_client, mock_openai_client, mock_database_session):
        """Test dashboard insights endpoint"""
        mock_get_client.return_value = mock_openai_client
        mock_get_db.return_value = mock_database_session
        
        request_data = {
            "message": "Analyze our dashboard",
            "context": "dashboard",
            "entity_id": 1
        }
        
        response = client.post("/api/finance/ai/dashboard-insights", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "key_metrics" in data
        assert "recommendations" in data
    
    @patch('src.api.routes.finance_ai.get_openai_client')
    @patch('src.api.routes.finance_ai.get_db')
    def test_investor_research_endpoint(self, mock_get_db, mock_get_client, mock_openai_client, mock_database_session):
        """Test investor research endpoint"""
        mock_get_client.return_value = mock_openai_client
        mock_get_db.return_value = mock_database_session
        
        request_data = {
            "message": "Research Andreessen Horowitz investor",
            "context": "investors",
            "entity_id": 1
        }
        
        with patch('src.api.routes.finance_ai.research_investor') as mock_research:
            mock_research.return_value = {
                "name": "Andreessen Horowitz",
                "summary": "Leading VC firm",
                "sources": []
            }
            
            response = client.post("/api/finance/ai/investor-research", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert "investor" in data
            assert "timestamp" in data
            assert "sources" in data
    
    @patch('src.api.routes.finance_ai.get_openai_client')
    @patch('src.api.routes.finance_ai.get_db')
    def test_financial_forecast_endpoint(self, mock_get_client, mock_get_db, mock_database_session):
        """Test financial forecast endpoint"""
        mock_get_client.return_value = mock_openai_client
        mock_get_db.return_value = mock_database_session
        
        request_data = {
            "message": "Create a 12-month financial forecast",
            "context": "forecasting",
            "entity_id": 1
        }
        
        response = client.post("/api/finance/ai/financial-forecast", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "forecast" in data
        assert "timestamp" in data
        assert "entity_id" in data

class TestCASEIntegration:
    """Test CASE integration with the main application"""
    
    def test_case_component_renders(self):
        """Test that CASE component renders without errors"""
        # This would test the frontend component rendering
        # In a real test, you'd use React Testing Library
        pass
    
    def test_case_api_health_check(self):
        """Test CASE API health check"""
        response = client.get("/api/health")
        assert response.status_code == 200
    
    @patch('src.api.routes.finance_ai.get_openai_client')
    def test_case_without_openai(self, mock_get_client):
        """Test CASE behavior when OpenAI is not available"""
        mock_get_client.return_value = None
        
        request_data = {
            "message": "Test message",
            "context": "test",
            "entity_id": 1
        }
        
        response = client.post("/api/finance/ai/case-chat", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "I'm having trouble connecting" in data["response"]
        assert data["type"] == "error"

class TestCASEPerformance:
    """Test CASE performance and edge cases"""
    
    @patch('src.api.routes.finance_ai.get_openai_client')
    @patch('src.api.routes.finance_ai.get_db')
    def test_case_large_conversation_history(self, mock_get_db, mock_get_client, mock_openai_client, mock_database_session):
        """Test CASE with large conversation history"""
        mock_get_client.return_value = mock_openai_client
        mock_get_db.return_value = mock_database_session
        
        # Create large conversation history
        large_history = [
            {"role": "user", "content": f"Message {i}"}
            for i in range(50)
        ]
        
        request_data = {
            "message": "What's our current status?",
            "context": "comprehensive",
            "entity_id": 1,
            "conversation_history": large_history
        }
        
        response = client.post("/api/finance/ai/case-chat", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
    
    @patch('src.api.routes.finance_ai.get_openai_client')
    @patch('src.api.routes.finance_ai.get_db')
    def test_case_special_characters(self, mock_get_db, mock_get_client, mock_openai_client, mock_database_session):
        """Test CASE with special characters in input"""
        mock_get_client.return_value = mock_openai_client
        mock_get_db.return_value = mock_database_session
        
        request_data = {
            "message": "Analyze our $1,000,000 revenue & 50% growth! @#$%^&*()",
            "context": "comprehensive",
            "entity_id": 1
        }
        
        response = client.post("/api/finance/ai/case-chat", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
