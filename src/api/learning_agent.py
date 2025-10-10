"""
Learning Agent Integration - OpenAI Agent Builder
================================================

This module integrates with OpenAI's Agent Builder to provide AI-powered
feedback and coaching for students in the learning center.

Author: NGI Capital Learning Team
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import requests

logger = logging.getLogger(__name__)

@dataclass
class AgentResponse:
    """Response from the learning agent"""
    success: bool
    message: str
    feedback: Optional[str] = None
    suggestions: Optional[List[str]] = None
    score: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

class LearningAgent:
    """Learning agent for providing AI feedback and coaching"""
    
    def __init__(self):
        self.agent_id = "wf_68e89b6a1bcc8190ae89edc3ee8e67c30a5c27879f630428"
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.base_url = "https://api.openai.com/v1"
        
        if not self.api_key:
            logger.warning("OpenAI API key not found. Learning agent will be disabled.")
    
    def analyze_submission(self, 
                          submission_id: str, 
                          content: str, 
                          submission_type: str,
                          student_context: Dict[str, Any]) -> AgentResponse:
        """
        Analyze a student submission and provide feedback
        
        Args:
            submission_id: Unique identifier for the submission
            content: The submitted content (text, code, etc.)
            submission_type: Type of submission (essay, code, excel, etc.)
            student_context: Additional context about the student
            
        Returns:
            AgentResponse with feedback and suggestions
        """
        # In test mode or when no API key, use mock responses
        if not self.api_key:
            logger.info("No API key found, using mock response for testing")
            mock_response = self._mock_agent_response(f"analysis: {content}", submission_id)
            return AgentResponse(
                success=mock_response.get("success", True),
                message="Mock analysis completed",
                feedback=mock_response.get("feedback"),
                suggestions=mock_response.get("suggestions", []),
                score=mock_response.get("score"),
                metadata=mock_response.get("metadata", {})
            )
        
        try:
            # Prepare the prompt for the agent
            prompt = self._build_analysis_prompt(content, submission_type, student_context)
            
            # Call the OpenAI Agent Builder
            response = self._call_agent_workflow(prompt, submission_id)
            
            if response.get("success"):
                return AgentResponse(
                    success=True,
                    message="Analysis completed successfully",
                    feedback=response.get("feedback"),
                    suggestions=response.get("suggestions", []),
                    score=response.get("score"),
                    metadata=response.get("metadata", {})
                )
            else:
                return AgentResponse(
                    success=False,
                    message=response.get("error", "Unknown error occurred")
                )
                
        except Exception as e:
            logger.error(f"Error analyzing submission {submission_id}: {str(e)}")
            return AgentResponse(
                success=False,
                message=f"Error analyzing submission: {str(e)}"
            )
    
    def provide_coaching(self, 
                        student_id: str, 
                        lesson_id: str, 
                        progress_data: Dict[str, Any]) -> AgentResponse:
        """
        Provide personalized coaching based on student progress
        
        Args:
            student_id: Unique identifier for the student
            lesson_id: Current lesson identifier
            progress_data: Student's progress and performance data
            
        Returns:
            AgentResponse with coaching advice
        """
        if not self.api_key:
            return AgentResponse(
                success=False,
                message="Learning agent is not configured. Please check API key."
            )
        
        try:
            # Prepare the coaching prompt
            prompt = self._build_coaching_prompt(student_id, lesson_id, progress_data)
            
            # Call the OpenAI Agent Builder
            response = self._call_agent_workflow(prompt, f"coaching_{student_id}")
            
            if response.get("success"):
                return AgentResponse(
                    success=True,
                    message="Coaching advice generated successfully",
                    feedback=response.get("coaching_advice"),
                    suggestions=response.get("next_steps", []),
                    metadata=response.get("metadata", {})
                )
            else:
                return AgentResponse(
                    success=False,
                    message=response.get("error", "Unknown error occurred")
                )
                
        except Exception as e:
            logger.error(f"Error providing coaching for student {student_id}: {str(e)}")
            return AgentResponse(
                success=False,
                message=f"Error providing coaching: {str(e)}"
            )
    
    def generate_practice_questions(self, 
                                  lesson_id: str, 
                                  difficulty_level: str,
                                  topic: str) -> AgentResponse:
        """
        Generate practice questions for a specific lesson
        
        Args:
            lesson_id: Identifier for the lesson
            difficulty_level: Difficulty level (beginner, intermediate, advanced)
            topic: Specific topic to focus on
            
        Returns:
            AgentResponse with generated questions
        """
        if not self.api_key:
            return AgentResponse(
                success=False,
                message="Learning agent is not configured. Please check API key."
            )
        
        try:
            # Prepare the question generation prompt
            prompt = self._build_question_generation_prompt(lesson_id, difficulty_level, topic)
            
            # Call the OpenAI Agent Builder
            response = self._call_agent_workflow(prompt, f"questions_{lesson_id}")
            
            if response.get("success"):
                return AgentResponse(
                    success=True,
                    message="Practice questions generated successfully",
                    feedback=response.get("questions"),
                    suggestions=response.get("study_tips", []),
                    metadata=response.get("metadata", {})
                )
            else:
                return AgentResponse(
                    success=False,
                    message=response.get("error", "Unknown error occurred")
                )
                
        except Exception as e:
            logger.error(f"Error generating questions for lesson {lesson_id}: {str(e)}")
            return AgentResponse(
                success=False,
                message=f"Error generating questions: {str(e)}"
            )
    
    def _build_analysis_prompt(self, content: str, submission_type: str, student_context: Dict[str, Any]) -> str:
        """Build a prompt for analyzing student submissions"""
        prompt = f"""
        You are an expert investment banking instructor analyzing a student submission.
        
        Submission Type: {submission_type}
        Student Level: {student_context.get('level', 'intermediate')}
        Previous Performance: {student_context.get('performance', 'unknown')}
        
        Please analyze the following submission and provide:
        1. Detailed feedback on the content
        2. Specific suggestions for improvement
        3. A score from 0-100
        4. Areas of strength and weakness
        
        Submission Content:
        {content}
        
        Focus on:
        - Technical accuracy
        - Clarity of explanation
        - Practical application
        - Professional presentation
        - Investment banking best practices
        """
        return prompt
    
    def _build_coaching_prompt(self, student_id: str, lesson_id: str, progress_data: Dict[str, Any]) -> str:
        """Build a prompt for providing coaching advice"""
        prompt = f"""
        You are a personalized investment banking coach providing guidance to a student.
        
        Student ID: {student_id}
        Current Lesson: {lesson_id}
        Progress Data: {json.dumps(progress_data, indent=2)}
        
        Please provide:
        1. Personalized coaching advice based on their progress
        2. Specific next steps to improve their learning
        3. Encouragement and motivation
        4. Study strategies tailored to their learning style
        
        Focus on:
        - Identifying knowledge gaps
        - Suggesting targeted practice
        - Building confidence
        - Preparing for real-world applications
        """
        return prompt
    
    def _build_question_generation_prompt(self, lesson_id: str, difficulty_level: str, topic: str) -> str:
        """Build a prompt for generating practice questions"""
        prompt = f"""
        You are an expert investment banking instructor creating practice questions.
        
        Lesson ID: {lesson_id}
        Difficulty Level: {difficulty_level}
        Topic: {topic}
        
        Please generate 5-10 practice questions that:
        1. Test understanding of key concepts
        2. Apply knowledge to real-world scenarios
        3. Progress from basic to advanced
        4. Include both multiple choice and open-ended questions
        5. Provide detailed explanations for answers
        
        Focus on:
        - Financial modeling
        - Valuation techniques
        - Market analysis
        - Investment banking processes
        - Professional communication
        """
        return prompt
    
    def _call_agent_workflow(self, prompt: str, context_id: str) -> Dict[str, Any]:
        """Call the OpenAI Agent Builder workflow"""
        try:
            # This is a placeholder for the actual OpenAI Agent Builder API call
            # In practice, you would use the specific API endpoint for your agent
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "agent_id": self.agent_id,
                "prompt": prompt,
                "context_id": context_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # For now, return a mock response
            # In production, make the actual API call
            return self._mock_agent_response(prompt, context_id)
            
        except Exception as e:
            logger.error(f"Error calling agent workflow: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _mock_agent_response(self, prompt: str, context_id: str) -> Dict[str, Any]:
        """Mock response for development/testing"""
        # This is a placeholder that returns mock data
        # In production, this would be replaced with actual API calls
        
        if "analysis" in prompt.lower() or "submission" in prompt.lower():
            return {
                "success": True,
                "feedback": "Your submission shows strong understanding of the concepts. Consider adding more specific examples and quantitative analysis to strengthen your argument.",
                "suggestions": [
                    "Include more detailed financial calculations",
                    "Add real-world case studies",
                    "Improve formatting and presentation",
                    "Consider alternative approaches"
                ],
                "score": 85.0,
                "metadata": {
                    "analysis_type": "submission_review",
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
        elif "coaching" in prompt.lower():
            return {
                "success": True,
                "coaching_advice": "Based on your progress, I recommend focusing on financial modeling fundamentals. You're doing well with concepts but need more practice with Excel modeling.",
                "next_steps": [
                    "Complete the Excel modeling practice exercises",
                    "Review the DCF valuation methodology",
                    "Practice building three-statement models",
                    "Join the study group for peer learning"
                ],
                "metadata": {
                    "coaching_type": "progress_guidance",
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
        elif "questions" in prompt.lower():
            return {
                "success": True,
                "questions": [
                    {
                        "question": "What is the difference between enterprise value and equity value?",
                        "type": "multiple_choice",
                        "options": ["A) EV = Equity Value + Net Debt", "B) Equity Value = EV - Net Debt", "C) Both A and B", "D) Neither A nor B"],
                        "correct_answer": "C",
                        "explanation": "Both statements are correct. Enterprise value includes the value of all stakeholders, while equity value represents only shareholders' value."
                    },
                    {
                        "question": "Explain the concept of terminal value in DCF analysis.",
                        "type": "open_ended",
                        "explanation": "Terminal value represents the present value of all future cash flows beyond the explicit forecast period, typically calculated using the perpetuity growth method or exit multiple method."
                    }
                ],
                "study_tips": [
                    "Practice building DCF models from scratch",
                    "Understand the relationship between growth rates and terminal value",
                    "Learn to calculate and interpret key valuation multiples"
                ],
                "metadata": {
                    "question_type": "practice_generation",
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
        else:
            return {
                "success": False,
                "error": "Unknown prompt type"
            }
    
    def validate_agent_configuration(self) -> bool:
        """Validate that the agent is properly configured"""
        if not self.api_key:
            logger.error("OpenAI API key is not configured")
            return False
        
        if not self.agent_id:
            logger.error("Agent ID is not configured")
            return False
        
        # In production, you might want to test the actual API connection
        logger.info("Learning agent configuration validated successfully")
        return True
