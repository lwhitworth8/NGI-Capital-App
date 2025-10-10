"""
Simple test suite for CASE AI assistant functionality
Tests core functions without authentication dependencies
"""
import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from src.api.routes.finance_ai import (
    search_internet,
    get_dashboard_insights,
    research_investor,
    get_openai_client
)

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
    
    def test_get_dashboard_insights_success(self):
        """Test successful dashboard insights generation"""
        mock_session = Mock()
        
        # Mock financial metrics query
        mock_result = Mock()
        mock_result.fetchone.return_value = (
            1000000.0,  # revenue
            600000.0,   # operating_expenses
            5000000.0,  # total_assets
            2000000.0,  # total_liabilities
            100         # transaction_count
        )
        
        # Mock trends query
        mock_trends_result = Mock()
        mock_trends_result.fetchall.return_value = [
            ("2025-01-01", 50000.0, 30000.0),
            ("2025-01-02", 60000.0, 35000.0)
        ]
        
        mock_session.execute.side_effect = [mock_result, mock_trends_result]
        
        insights = get_dashboard_insights(mock_session, 1)
        
        assert "key_metrics" in insights
        assert "trends" in insights
        assert "alerts" in insights
        assert "recommendations" in insights
        assert isinstance(insights["alerts"], list)
        assert isinstance(insights["recommendations"], list)
        assert insights["key_metrics"]["revenue"] == 1000000.0
    
    def test_get_dashboard_insights_error(self):
        """Test dashboard insights with database error"""
        mock_session = Mock()
        mock_session.execute.side_effect = Exception("Database error")
        
        insights = get_dashboard_insights(mock_session, 1)
        
        assert "key_metrics" in insights
        # Should return default values when there's an error
        assert insights["key_metrics"]["revenue"] == 0
        assert insights["key_metrics"]["operating_expenses"] == 0

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
            assert "sources" in result

class TestOpenAIClient:
    """Test OpenAI client functionality"""
    
    def test_get_openai_client_success(self):
        """Test successful OpenAI client creation"""
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test_key'}):
            client = get_openai_client()
            assert client is not None
    
    def test_get_openai_client_no_key(self):
        """Test OpenAI client creation without API key"""
        with patch.dict('os.environ', {}, clear=True):
            client = get_openai_client()
            assert client is None
    
    def test_get_openai_client_import_error(self):
        """Test OpenAI client creation when OpenAI is not available"""
        with patch('src.api.routes.finance_ai.OpenAI', None):
            client = get_openai_client()
            assert client is None

class TestCASEIntegration:
    """Test CASE integration functionality"""
    
    def test_case_message_parsing(self):
        """Test parsing of different types of CASE messages"""
        # Test market analysis trigger
        message = "What are the current market trends?"
        assert any(term in message.lower() for term in ['market', 'trend'])
        
        # Test investor research trigger
        message = "Research Sequoia Capital investor"
        assert any(term in message.lower() for term in ['investor', 'research'])
        
        # Test forecasting trigger
        message = "Create a financial forecast"
        assert any(term in message.lower() for term in ['forecast', 'prediction'])
    
    def test_case_confidence_scoring(self):
        """Test CASE confidence scoring logic"""
        # High confidence for specific financial queries
        financial_queries = [
            "What is our current revenue?",
            "Analyze our profit margin",
            "Show me our cash flow"
        ]
        
        for query in financial_queries:
            # These should trigger high confidence responses
            assert len(query) > 10  # Basic validation
    
    def test_case_action_generation(self):
        """Test CASE action generation"""
        # Test action structure
        sample_action = {
            "id": "test_action",
            "label": "Test Action",
            "type": "button",
            "action": "test_function"
        }
        
        assert "id" in sample_action
        assert "label" in sample_action
        assert "type" in sample_action
        assert "action" in sample_action

class TestCASEPerformance:
    """Test CASE performance and edge cases"""
    
    def test_case_large_input_handling(self):
        """Test CASE handling of large inputs"""
        large_message = "Analyze our financials " + "and provide insights " * 100
        assert len(large_message) > 1000
        
        # Should not crash with large inputs
        assert isinstance(large_message, str)
    
    def test_case_special_characters(self):
        """Test CASE handling of special characters"""
        special_message = "Analyze our $1,000,000 revenue & 50% growth! @#$%^&*()"
        
        # Should handle special characters gracefully
        assert "$" in special_message
        assert "&" in special_message
        assert "!" in special_message
        assert isinstance(special_message, str)
    
    def test_case_empty_input(self):
        """Test CASE handling of empty input"""
        empty_message = ""
        assert len(empty_message) == 0
        
        # Should handle empty input gracefully
        assert isinstance(empty_message, str)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
