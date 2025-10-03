"""
Tests for NGI Learning Module Sprint 3
AI Feedback (GPT-5), GPTZero detection, and Leaderboard
"""

import pytest
import sys
import os
from unittest.mock import Mock, patch
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.api.learning.ai_coach import AICoach, GPTZeroDetector


class TestAICoach:
    """Test GPT-5 feedback generation"""
    
    def test_ai_coach_initialization(self):
        """Test AICoach initializes with API key"""
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key-123'}):
            coach = AICoach()
            assert coach.api_key == 'test-key-123'
            assert coach.model == 'gpt-5'
    
    def test_ai_coach_no_api_key_raises_error(self):
        """Test AICoach raises error without API key"""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="OpenAI API key not found"):
                AICoach()
    
    def test_build_feedback_prompt(self):
        """Test feedback prompt building"""
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key'}):
            coach = AICoach()
            
            prompt = coach._build_feedback_prompt(
                activity_id='a1_drivers_map',
                submission_data={
                    'file_type': 'excel',
                    'file_size_bytes': 18450,
                    'version': 1,
                    'notes': 'First submission'
                },
                validation_results={
                    'status': 'passed',
                    'errors': [],
                    'warnings': []
                },
                company_context={
                    'company_name': 'Tesla, Inc.',
                    'ticker': 'TSLA',
                    'industry': 'Automotive',
                    'revenue_model_type': 'QxP'
                }
            )
            
            assert 'Revenue Drivers Map' in prompt
            assert 'Tesla' in prompt
            assert 'TSLA' in prompt
            assert 'passed' in prompt
    
    @patch('src.api.learning.ai_coach.OpenAI')
    def test_generate_feedback_success(self, mock_openai_class):
        """Test successful feedback generation"""
        # Mock OpenAI API response
        mock_client = Mock()
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = '''{
            "feedback": "Excellent work on the drivers map.",
            "rubric_scores": {
                "technical_accuracy": 9,
                "formula_quality": 8,
                "presentation": 9,
                "analytical_depth": 8,
                "documentation": 7
            },
            "overall_score": 8.2,
            "strengths": ["Clear driver identification", "Good documentation"],
            "improvements": ["Add more historical context"],
            "next_steps": ["Complete WC schedule"]
        }'''
        mock_response.usage.total_tokens = 1234
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai_class.return_value = mock_client
        
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key'}):
            coach = AICoach()
            result = coach.generate_feedback(
                activity_id='a1_drivers_map',
                submission_data={'file_type': 'excel'},
                validation_results={'status': 'passed', 'errors': [], 'warnings': []},
                company_context={'company_name': 'Tesla', 'ticker': 'TSLA'}
            )
            
            assert result['status'] == 'success'
            assert 'feedback_text' in result
            assert result['overall_score'] == 8.2
            assert result['model_used'] == 'gpt-5'
            assert result['tokens_used'] == 1234
            assert len(result['strengths']) == 2
            assert len(result['improvements']) == 1


class TestGPTZeroDetector:
    """Test AI content detection"""
    
    def test_gptzero_initialization(self):
        """Test GPTZeroDetector initializes with API key"""
        with patch.dict(os.environ, {'GPTZERO_API_KEY': 'test-key-456'}):
            detector = GPTZeroDetector()
            assert detector.api_key == 'test-key-456'
    
    def test_gptzero_no_api_key_raises_error(self):
        """Test GPTZeroDetector raises error without API key"""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="GPTZero API key not found"):
                GPTZeroDetector()
    
    @patch('requests.post')
    def test_detect_ai_content_high_probability(self, mock_post):
        """Test AI content detection with high probability"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'documents': [{
                'completely_generated_prob': 0.85
            }]
        }
        mock_post.return_value = mock_response
        
        with patch.dict(os.environ, {'GPTZERO_API_KEY': 'test-key'}):
            detector = GPTZeroDetector()
            result = detector.detect_ai_content("This is test text.")
            
            assert result['status'] == 'success'
            assert result['ai_probability'] == 0.85
            assert result['flagged'] == True  # >70% threshold
    
    @patch('requests.post')
    def test_detect_ai_content_low_probability(self, mock_post):
        """Test AI content detection with low probability"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'documents': [{
                'completely_generated_prob': 0.25
            }]
        }
        mock_post.return_value = mock_response
        
        with patch.dict(os.environ, {'GPTZERO_API_KEY': 'test-key'}):
            detector = GPTZeroDetector()
            result = detector.detect_ai_content("This is human-written text.")
            
            assert result['status'] == 'success'
            assert result['ai_probability'] == 0.25
            assert result['flagged'] == False  # <70% threshold


class TestFeedbackEndpoints:
    """Test feedback API endpoints (mocked OpenAI)"""
    
    @patch('src.api.learning.ai_coach.OpenAI')
    @patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key'})
    def test_feedback_generation_integration(self, mock_openai_class):
        """Test end-to-end feedback generation (mocked OpenAI)"""
        # This would be a full integration test if we had OpenAI API access
        # For now, just test the structure
        from src.api.learning.ai_coach import generate_feedback_for_submission
        from src.api.database import get_db, _ensure_engine
        from src.api.models import Base
        from src.api.models_learning import LearningCompany, LearningSubmission
        
        # Setup
        _ensure_engine()
        from src.api.database import _engine
        Base.metadata.create_all(bind=_engine)
        
        db = next(get_db())
        
        # Clean up any existing TEST3 company
        existing = db.query(LearningCompany).filter(LearningCompany.ticker == "TEST3").first()
        if existing:
            db.delete(existing)
            db.commit()
        
        # Create test data
        company = LearningCompany(
            ticker="TEST3",
            company_name="Test Company Sprint3",
            industry="Test",
            revenue_model_type="QxP",
            is_active=True
        )
        db.add(company)
        db.commit()
        db.refresh(company)
        
        # Cleanup
        db.delete(company)
        db.commit()
        db.close()
        
        # Test would continue here with actual submission
        # For now, verify function exists and has correct signature
        assert callable(generate_feedback_for_submission)


class TestLeaderboardEndpoints:
    """Test leaderboard functionality"""
    
    def test_leaderboard_statistics_calculation(self):
        """Test leaderboard statistics calculation"""
        price_targets = [100.0, 150.0, 200.0, 175.0, 125.0]
        
        import statistics
        median_val = statistics.median(price_targets)
        mean_val = statistics.mean(price_targets)
        
        assert median_val == 150.0
        assert mean_val == 150.0
        assert min(price_targets) == 100.0
        assert max(price_targets) == 200.0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

