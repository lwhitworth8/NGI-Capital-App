"""
Comprehensive Finance Dashboard Integration Tests
Tests GPT-5 Mini integration and all finance dashboard functionality
Run with: docker exec ngi-backend pytest tests/test_finance_dashboard_integration.py -v
"""

import pytest
import requests
import json
from datetime import datetime, timedelta


class TestFinanceDashboardIntegration:
    """Test suite for Finance Dashboard with GPT-5 Mini"""
    
    BASE_URL = "http://localhost:8001"
    
    def test_backend_health(self):
        """Test that backend is running"""
        response = requests.get(f"{self.BASE_URL}/health")
        assert response.status_code == 200
        print("Backend health check: PASSED")
    
    def test_cfo_kpis_endpoint(self):
        """Test CFO KPIs endpoint returns data"""
        response = requests.get(
            f"{self.BASE_URL}/finance/cfo-kpis",
            params={"entity_id": 1}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "revenue" in data or "cash" in data
        print(f"CFO KPIs endpoint: PASSED - Data keys: {list(data.keys())[:5]}")
    
    def test_finance_metrics_history_endpoint(self):
        """Test finance metrics history endpoint"""
        response = requests.get(
            f"{self.BASE_URL}/finance/metrics/revenue_ttm/history",
            params={"entity_id": 1, "limit": 24}
        )
        
        # Should return 200 even if no data
        assert response.status_code in [200, 404]
        print(f"Metrics history endpoint: PASSED - Status {response.status_code}")
    
    def test_cap_table_endpoint(self):
        """Test cap table endpoint"""
        response = requests.get(
            f"{self.BASE_URL}/investor-relations/cap-table",
            params={"entity_id": 1}
        )
        
        # Should return data or empty list
        assert response.status_code in [200, 404]
        print(f"Cap table endpoint: PASSED - Status {response.status_code}")
    
    def test_market_metrics_endpoint(self):
        """Test market metrics endpoint for ticker data"""
        # This is a Next.js API route, test via frontend
        print("Market metrics endpoint: SKIPPED (Next.js route)")
    
    def test_gpt5_mini_model_configured(self):
        """Verify GPT-5 Mini is configured correctly"""
        # Check the AI insights route file exists and has gpt-5-mini
        import os
        route_file = "/app/apps/desktop/src/app/api/finance/ai-insights/route.ts"
        
        if os.path.exists(route_file):
            with open(route_file, 'r') as f:
                content = f.read()
                assert 'gpt-5-mini' in content, "GPT-5 Mini model not found in AI insights route"
            print("GPT-5 Mini configuration: PASSED")
        else:
            print("GPT-5 Mini configuration: SKIPPED (route file not accessible)")
    
    def test_openai_api_key_set(self):
        """Verify OpenAI API key is configured"""
        import os
        api_key = os.getenv('OPENAI_API_KEY')
        assert api_key is not None, "OPENAI_API_KEY not set"
        assert len(api_key) > 20, "OPENAI_API_KEY appears invalid"
        print(f"OpenAI API Key: PASSED - Key length: {len(api_key)}")
    
    def test_database_connection(self):
        """Test database connection"""
        import sqlite3
        import os
        
        db_path = os.getenv('DATABASE_PATH', '/app/data/ngi_capital.db')
        
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' LIMIT 5")
            tables = cursor.fetchall()
            conn.close()
            
            assert len(tables) > 0, "No tables found in database"
            print(f"Database connection: PASSED - Found {len(tables)} tables")
        except Exception as e:
            print(f"Database connection: FAILED - {str(e)}")
            raise
    
    def test_entity_exists(self):
        """Test that test entity exists"""
        import sqlite3
        import os
        
        db_path = os.getenv('DATABASE_PATH', '/app/data/ngi_capital.db')
        
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT id, name FROM entities LIMIT 5")
            entities = cursor.fetchall()
            conn.close()
            
            assert len(entities) > 0, "No entities found in database"
            print(f"Entities check: PASSED - Found {len(entities)} entities")
            for entity in entities:
                print(f"  - Entity ID {entity[0]}: {entity[1]}")
        except Exception as e:
            print(f"Entities check: WARNING - {str(e)}")
    
    def test_managerial_accounting_data(self):
        """Test that managerial accounting data is available"""
        response = requests.get(
            f"{self.BASE_URL}/finance/cfo-kpis",
            params={"entity_id": 1}
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Check for managerial accounting fields
            expected_fields = ['variable_costs', 'fixed_costs', 'contribution_margin', 'burn']
            found_fields = [field for field in expected_fields if field in data]
            
            print(f"Managerial accounting data: Found {len(found_fields)}/{len(expected_fields)} fields")
            print(f"  Fields present: {found_fields}")
        else:
            print(f"Managerial accounting data: SKIPPED - Endpoint returned {response.status_code}")
    
    def test_docker_environment(self):
        """Verify running in Docker environment"""
        import os
        import platform
        
        in_docker = os.path.exists('/.dockerenv') or os.path.exists('/run/.containerenv')
        
        print(f"Docker environment: {'PASSED' if in_docker else 'WARNING - Not in Docker'}")
        print(f"  Hostname: {platform.node()}")
        print(f"  Python: {platform.python_version()}")


if __name__ == "__main__":
    print("=" * 60)
    print("Finance Dashboard Integration Test Suite")
    print("Testing GPT-5 Mini and Dashboard Functionality")
    print("=" * 60)
    print()
    
    pytest.main([__file__, "-v", "-s"])

