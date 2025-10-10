"""
AI Coach Integration - Enhanced Learning Support
===============================================

This module provides AI-powered coaching and feedback for students,
integrating with the learning agent and providing personalized guidance.

Author: NGI Capital Learning Team
"""

import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
from .learning_agent import LearningAgent, AgentResponse

logger = logging.getLogger(__name__)

@dataclass
class CoachingSession:
    """A coaching session for a student"""
    session_id: str
    student_id: str
    lesson_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    topics_covered: List[str] = None
    feedback_provided: List[str] = None
    next_steps: List[str] = None

class AICoach:
    """AI-powered coaching system for students"""
    
    def __init__(self):
        self.learning_agent = LearningAgent()
        self.active_sessions: Dict[str, CoachingSession] = {}
        
        # Check if learning agent is available
        if not self.learning_agent.api_key:
            logger.warning("Learning agent not available. AI coaching will use fallback responses.")
        
    def start_coaching_session(self, 
                             student_id: str, 
                             lesson_id: str,
                             initial_context: Dict[str, Any]) -> CoachingSession:
        """
        Start a new coaching session for a student
        
        Args:
            student_id: Unique identifier for the student
            lesson_id: Current lesson identifier
            initial_context: Initial context about the student's needs
            
        Returns:
            CoachingSession object
        """
        session_id = f"session_{student_id}_{lesson_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        session = CoachingSession(
            session_id=session_id,
            student_id=student_id,
            lesson_id=lesson_id,
            start_time=datetime.utcnow(),
            topics_covered=[],
            feedback_provided=[],
            next_steps=[]
        )
        
        self.active_sessions[session_id] = session
        
        logger.info(f"Started coaching session {session_id} for student {student_id}")
        return session
    
    def provide_feedback(self, 
                        session_id: str, 
                        submission_content: str,
                        submission_type: str) -> AgentResponse:
        """
        Provide feedback on a student submission
        
        Args:
            session_id: Active coaching session ID
            submission_content: The content to analyze
            submission_type: Type of submission (essay, code, excel, etc.)
            
        Returns:
            AgentResponse with feedback and suggestions
        """
        if session_id not in self.active_sessions:
            return AgentResponse(
                success=False,
                message="Invalid session ID. Please start a new coaching session."
            )
        
        session = self.active_sessions[session_id]
        
        # Get student context
        student_context = self._get_student_context(session.student_id)
        
        # Check if learning agent is available
        if not self.learning_agent.api_key:
            # Provide fallback feedback for testing
            response = AgentResponse(
                success=True,
                message="Feedback provided (test mode)",
                feedback="This is a test feedback response. Your submission shows good understanding of the concepts.",
                suggestions=[
                    "Continue practicing with similar exercises",
                    "Review the key concepts covered in this lesson",
                    "Try the next lesson when ready"
                ],
                score=85.0,
                metadata={"test_mode": True, "session_id": session_id}
            )
        else:
            # Analyze the submission
            response = self.learning_agent.analyze_submission(
                submission_id=f"{session_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                content=submission_content,
                submission_type=submission_type,
                student_context=student_context
            )
        
        if response.success:
            # Update session with feedback
            session.feedback_provided.append(response.feedback)
            if response.suggestions:
                session.next_steps.extend(response.suggestions)
        
        return response
    
    def provide_coaching_advice(self, 
                               session_id: str, 
                               question: str) -> AgentResponse:
        """
        Provide coaching advice in response to a student question
        
        Args:
            session_id: Active coaching session ID
            question: Student's question or concern
            
        Returns:
            AgentResponse with coaching advice
        """
        if session_id not in self.active_sessions:
            return AgentResponse(
                success=False,
                message="Invalid session ID. Please start a new coaching session."
            )
        
        session = self.active_sessions[session_id]
        
        # Get student progress data
        progress_data = self._get_student_progress(session.student_id)
        
        # Provide coaching advice
        response = self.learning_agent.provide_coaching(
            student_id=session.student_id,
            lesson_id=session.lesson_id,
            progress_data=progress_data
        )
        
        if response.success:
            # Update session with advice
            session.topics_covered.append(question)
            if response.suggestions:
                session.next_steps.extend(response.suggestions)
        
        return response
    
    def generate_practice_material(self, 
                                  session_id: str, 
                                  topic: str,
                                  difficulty_level: str = "intermediate") -> AgentResponse:
        """
        Generate practice material for a specific topic
        
        Args:
            session_id: Active coaching session ID
            topic: Topic to generate practice material for
            difficulty_level: Difficulty level for the material
            
        Returns:
            AgentResponse with practice questions and materials
        """
        if session_id not in self.active_sessions:
            return AgentResponse(
                success=False,
                message="Invalid session ID. Please start a new coaching session."
            )
        
        session = self.active_sessions[session_id]
        
        # Generate practice questions
        response = self.learning_agent.generate_practice_questions(
            lesson_id=session.lesson_id,
            difficulty_level=difficulty_level,
            topic=topic
        )
        
        if response.success:
            # Update session with practice material
            session.topics_covered.append(f"Practice material for {topic}")
        
        return response
    
    def end_coaching_session(self, session_id: str) -> Dict[str, Any]:
        """
        End a coaching session and provide summary
        
        Args:
            session_id: Active coaching session ID
            
        Returns:
            Dictionary with session summary
        """
        if session_id not in self.active_sessions:
            return {
                "success": False,
                "message": "Invalid session ID"
            }
        
        session = self.active_sessions[session_id]
        session.end_time = datetime.utcnow()
        
        # Calculate session duration
        duration = (session.end_time - session.start_time).total_seconds() / 60  # minutes
        
        # Create session summary
        summary = {
            "success": True,
            "session_id": session_id,
            "student_id": session.student_id,
            "lesson_id": session.lesson_id,
            "duration_minutes": round(duration, 2),
            "topics_covered": session.topics_covered,
            "feedback_provided": len(session.feedback_provided),
            "next_steps": session.next_steps,
            "recommendations": self._generate_session_recommendations(session)
        }
        
        # Remove from active sessions
        del self.active_sessions[session_id]
        
        logger.info(f"Ended coaching session {session_id} for student {session.student_id}")
        return summary
    
    def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """
        Get the current status of a coaching session
        
        Args:
            session_id: Active coaching session ID
            
        Returns:
            Dictionary with session status
        """
        if session_id not in self.active_sessions:
            return {
                "success": False,
                "message": "Session not found"
            }
        
        session = self.active_sessions[session_id]
        
        return {
            "success": True,
            "session_id": session_id,
            "student_id": session.student_id,
            "lesson_id": session.lesson_id,
            "start_time": session.start_time.isoformat(),
            "duration_minutes": round((datetime.utcnow() - session.start_time).total_seconds() / 60, 2),
            "topics_covered": len(session.topics_covered),
            "feedback_provided": len(session.feedback_provided),
            "next_steps": len(session.next_steps)
        }
    
    def _get_student_context(self, student_id: str) -> Dict[str, Any]:
        """Get context about a student for personalized coaching"""
        # This would typically query the database for student information
        # For now, return mock data
        return {
            "level": "intermediate",
            "performance": "good",
            "learning_style": "visual",
            "weak_areas": ["financial modeling", "excel"],
            "strong_areas": ["concepts", "analysis"],
            "goals": ["investment banking", "financial analysis"]
        }
    
    def _get_student_progress(self, student_id: str) -> Dict[str, Any]:
        """Get student progress data for coaching"""
        # This would typically query the database for progress information
        # For now, return mock data
        return {
            "completed_lessons": 15,
            "total_lessons": 25,
            "average_score": 85.0,
            "time_spent_minutes": 1200,
            "current_streak": 5,
            "longest_streak": 12,
            "recent_performance": [85, 90, 78, 92, 88]
        }
    
    def _generate_session_recommendations(self, session: CoachingSession) -> List[str]:
        """Generate recommendations based on the coaching session"""
        recommendations = []
        
        # Based on topics covered
        if "financial modeling" in str(session.topics_covered).lower():
            recommendations.append("Practice building three-statement models")
        
        if "valuation" in str(session.topics_covered).lower():
            recommendations.append("Review DCF and comparable company analysis")
        
        if "excel" in str(session.topics_covered).lower():
            recommendations.append("Complete Excel modeling exercises")
        
        # Based on feedback provided
        if len(session.feedback_provided) > 3:
            recommendations.append("Continue practicing with regular feedback")
        
        # General recommendations
        recommendations.extend([
            "Review lesson materials before next session",
            "Complete assigned practice exercises",
            "Join study groups for peer learning"
        ])
        
        return recommendations
    
    def get_active_sessions(self) -> List[Dict[str, Any]]:
        """Get all active coaching sessions"""
        return [
            {
                "session_id": session_id,
                "student_id": session.student_id,
                "lesson_id": session.lesson_id,
                "start_time": session.start_time.isoformat(),
                "duration_minutes": round((datetime.utcnow() - session.start_time).total_seconds() / 60, 2)
            }
            for session_id, session in self.active_sessions.items()
        ]
    
    def cleanup_expired_sessions(self, max_duration_hours: int = 24):
        """Clean up sessions that have been active for too long"""
        current_time = datetime.utcnow()
        expired_sessions = []
        
        for session_id, session in self.active_sessions.items():
            duration_hours = (current_time - session.start_time).total_seconds() / 3600
            if duration_hours > max_duration_hours:
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            logger.info(f"Cleaning up expired session {session_id}")
            del self.active_sessions[session_id]
        
        return len(expired_sessions)
