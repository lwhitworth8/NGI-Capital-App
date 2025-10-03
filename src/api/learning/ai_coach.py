"""
AI Coaching System for NGI Learning Module
Uses OpenAI GPT-5 for high-quality feedback on Excel models and memos
Following specifications from MarkdownFiles/NGILearning/PRD.NGILearningModule.md
"""

import os
import json
from typing import Dict, List, Optional
from datetime import datetime
from openai import OpenAI


class AICoach:
    """
    Generate analyst-grade feedback using OpenAI GPT-5.
    Provides rubric-based scoring and actionable guidance.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize AI Coach with OpenAI API key.
        
        Args:
            api_key: OpenAI API key (defaults to env variable OPENAI_API_KEY)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key not found. Set OPENAI_API_KEY in .env")
        
        self.client = OpenAI(api_key=self.api_key)
        self.model = "gpt-5"  # GPT-5 for highest quality feedback
    
    def generate_feedback(
        self,
        activity_id: str,
        submission_data: Dict,
        validation_results: Dict,
        company_context: Dict
    ) -> Dict:
        """
        Generate comprehensive feedback for a submission.
        
        Args:
            activity_id: Activity identifier (e.g., 'a1_drivers_map')
            submission_data: Submission metadata and content summary
            validation_results: Results from deterministic validators
            company_context: Company-specific information
        
        Returns:
            Dictionary with feedback text, rubric scores, and suggestions
        """
        # Build context-rich prompt
        prompt = self._build_feedback_prompt(
            activity_id=activity_id,
            submission_data=submission_data,
            validation_results=validation_results,
            company_context=company_context
        )
        
        # Call GPT-5 API
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": self._get_system_prompt()
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,  # Balance between creativity and consistency
                max_tokens=2000,  # Comprehensive feedback
                response_format={"type": "json_object"}  # Structured output
            )
            
            # Parse response
            feedback_json = json.loads(response.choices[0].message.content)
            
            return {
                "status": "success",
                "feedback_text": feedback_json.get("feedback", ""),
                "rubric_scores": feedback_json.get("rubric_scores", {}),
                "strengths": feedback_json.get("strengths", []),
                "improvements": feedback_json.get("improvements", []),
                "next_steps": feedback_json.get("next_steps", []),
                "overall_score": feedback_json.get("overall_score", 0),
                "model_used": self.model,
                "tokens_used": response.usage.total_tokens,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e),
                "feedback_text": "Failed to generate feedback. Please try again.",
                "model_used": self.model
            }
    
    def _get_system_prompt(self) -> str:
        """Get system prompt for GPT-5"""
        return """You are an expert investment banking analyst at NGI Capital Advisory, providing feedback on financial models and analyses created by junior analysts.

Your role is to:
1. Evaluate submissions against banker-grade standards
2. Provide specific, actionable feedback
3. Score against a detailed rubric
4. Identify strengths and areas for improvement
5. Guide analysts toward best practices

Your feedback should be:
- Professional and constructive
- Specific with cell references and examples
- Aligned with NGI Excel Standards
- Focused on both technical accuracy and analytical reasoning

Return feedback in JSON format with:
{
  "feedback": "Overall feedback paragraph",
  "rubric_scores": {
    "technical_accuracy": 0-10,
    "formula_quality": 0-10,
    "presentation": 0-10,
    "analytical_depth": 0-10,
    "documentation": 0-10
  },
  "overall_score": 0-10,
  "strengths": ["strength 1", "strength 2", ...],
  "improvements": ["improvement 1", "improvement 2", ...],
  "next_steps": ["next step 1", "next step 2", ...]
}"""
    
    def _build_feedback_prompt(
        self,
        activity_id: str,
        submission_data: Dict,
        validation_results: Dict,
        company_context: Dict
    ) -> str:
        """Build comprehensive feedback prompt"""
        
        activity_descriptions = {
            "a1_drivers_map": "Revenue Drivers Map - Identify Q, P, and T drivers",
            "a2_working_capital": "Working Capital & Debt Schedule",
            "a3_revenue_projections": "Revenue Projections & Modeling",
            "a4_dcf_valuation": "DCF Valuation with WACC and Terminal Value",
            "a5_comps_analysis": "Comparable Companies Analysis",
            "capstone_investment_memo": "Full Investment Memo (3-5 pages)"
        }
        
        activity_desc = activity_descriptions.get(activity_id, activity_id)
        
        prompt = f"""
# Submission Review Request

## Activity: {activity_desc}

## Company: {company_context.get('company_name', 'Unknown')} ({company_context.get('ticker', 'N/A')})
- Industry: {company_context.get('industry', 'N/A')}
- Revenue Model: {company_context.get('revenue_model_type', 'N/A')}

## Validation Results
- Status: {validation_results.get('status', 'unknown')}
- Errors: {len(validation_results.get('errors', []))}
- Warnings: {len(validation_results.get('warnings', []))}

### Validation Issues:
"""
        
        # Add validation errors
        for error in validation_results.get('errors', [])[:5]:  # Top 5 errors
            prompt += f"\n- ERROR: {error.get('message', 'Unknown error')}"
        
        for warning in validation_results.get('warnings', [])[:5]:  # Top 5 warnings
            prompt += f"\n- WARNING: {warning.get('message', 'Unknown warning')}"
        
        prompt += f"""

## Submission Details
- File Type: {submission_data.get('file_type', 'unknown')}
- File Size: {submission_data.get('file_size_bytes', 0) / 1024:.1f} KB
- Version: {submission_data.get('version', 1)}
- Notes from Analyst: {submission_data.get('notes', 'None provided')}

## Your Task
Please review this submission and provide:
1. Overall feedback on quality and completeness
2. Rubric scores (0-10) for each category
3. Specific strengths (3-5 items)
4. Specific improvements needed (3-5 items with cell references if applicable)
5. Next steps for the analyst

Focus on:
- Technical accuracy and formula quality
- Adherence to NGI Excel Standards (color conventions, tab structure)
- Analytical depth and reasoning
- Presentation and documentation quality

Be constructive and specific. Help the analyst grow.
"""
        
        return prompt


class GPTZeroDetector:
    """
    Detect AI-generated content using GPTZero API.
    Flags submissions with high AI-generation probability.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize GPTZero detector.
        
        Args:
            api_key: GPTZero API key (defaults to env variable GPTZERO_API_KEY)
        """
        self.api_key = api_key or os.getenv("GPTZERO_API_KEY")
        if not self.api_key:
            raise ValueError("GPTZero API key not found. Set GPTZERO_API_KEY in .env")
        
        self.api_url = "https://api.gptzero.me/v2/predict/text"
    
    def detect_ai_content(self, text: str) -> Dict:
        """
        Analyze text for AI-generated content.
        
        Args:
            text: Text to analyze (from memo, analysis, etc.)
        
        Returns:
            Dictionary with detection results
        """
        import requests
        
        try:
            headers = {
                "X-Api-Key": self.api_key,
                "Content-Type": "application/json"
            }
            
            payload = {
                "document": text,
                "version": "2024-04-04"
            }
            
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Extract key metrics
                ai_probability = data.get("documents", [{}])[0].get("completely_generated_prob", 0)
                flagged = ai_probability > 0.7  # Flag if >70% AI-generated
                
                return {
                    "status": "success",
                    "ai_probability": ai_probability,
                    "flagged": flagged,
                    "detection_score": ai_probability,
                    "details": data,
                    "detected_at": datetime.utcnow().isoformat()
                }
            else:
                return {
                    "status": "failed",
                    "error": f"GPTZero API error: {response.status_code}",
                    "ai_probability": 0,
                    "flagged": False
                }
        
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e),
                "ai_probability": 0,
                "flagged": False
            }


def generate_feedback_for_submission(
    submission_id: int,
    db_session,
    force_regenerate: bool = False
) -> Dict:
    """
    Convenience function to generate feedback for a submission.
    Integrates validation, AI feedback, and AI detection.
    
    Args:
        submission_id: ID of submission to generate feedback for
        db_session: SQLAlchemy database session
        force_regenerate: Force regeneration even if feedback exists
    
    Returns:
        Dictionary with feedback generation results
    """
    from ..models_learning import LearningSubmission, LearningFeedback, LearningCompany
    from .validators import validate_submission
    
    # Get submission
    submission = db_session.query(LearningSubmission).filter(
        LearningSubmission.id == submission_id
    ).first()
    
    if not submission:
        return {"status": "failed", "error": "Submission not found"}
    
    # Check if feedback already exists
    if not force_regenerate:
        existing_feedback = db_session.query(LearningFeedback).filter(
            LearningFeedback.submission_id == submission_id
        ).first()
        
        if existing_feedback:
            return {
                "status": "exists",
                "message": "Feedback already exists. Use force_regenerate=True to regenerate.",
                "feedback_id": existing_feedback.id
            }
    
    # Run validation first (must pass before AI feedback)
    validation_results = validate_submission(submission.file_path)
    
    if validation_results['status'] == 'failed':
        return {
            "status": "validation_failed",
            "message": "Submission must pass validation before AI feedback can be generated.",
            "validation_results": validation_results
        }
    
    # Get company context
    company = db_session.query(LearningCompany).filter(
        LearningCompany.id == submission.company_id
    ).first()
    
    company_context = {
        "company_name": company.company_name,
        "ticker": company.ticker,
        "industry": company.industry,
        "revenue_model_type": company.revenue_model_type
    } if company else {}
    
    # Generate AI feedback with GPT-5
    ai_coach = AICoach()
    feedback_result = ai_coach.generate_feedback(
        activity_id=submission.activity_id,
        submission_data={
            "file_type": submission.file_type,
            "file_size_bytes": submission.file_size_bytes,
            "version": submission.version,
            "notes": submission.submission_notes
        },
        validation_results=validation_results,
        company_context=company_context
    )
    
    if feedback_result['status'] != 'success':
        return {
            "status": "feedback_failed",
            "error": feedback_result.get('error', 'Unknown error'),
            "message": "Failed to generate AI feedback"
        }
    
    # AI content detection (for memo/written content)
    # Note: For V1, we'll implement this for text-based submissions
    ai_detection_result = {
        "ai_probability": 0,
        "flagged": False,
        "status": "skipped_for_excel"
    }
    
    # Store feedback in database
    feedback = LearningFeedback(
        submission_id=submission_id,
        feedback_text=feedback_result['feedback_text'],
        rubric_score=feedback_result.get('overall_score', 0),
        strengths=json.dumps(feedback_result.get('strengths', [])),
        improvements=json.dumps(feedback_result.get('improvements', [])),
        next_steps=json.dumps(feedback_result.get('next_steps', [])),
        model_used=feedback_result.get('model_used', 'gpt-5'),
        tokens_used=feedback_result.get('tokens_used', 0)
    )
    
    db_session.add(feedback)
    
    # Update submission with AI detection results
    submission.ai_detection_score = ai_detection_result.get('ai_probability', 0)
    submission.ai_detection_flagged = ai_detection_result.get('flagged', False)
    
    db_session.commit()
    db_session.refresh(feedback)
    
    return {
        "status": "success",
        "message": "Feedback generated successfully",
        "feedback_id": feedback.id,
        "overall_score": feedback_result.get('overall_score', 0),
        "ai_detection": ai_detection_result
    }

