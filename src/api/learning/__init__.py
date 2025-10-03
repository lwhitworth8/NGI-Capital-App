"""
NGI Learning Module
Excel package generation, ingestion, validation, and AI coaching
"""

from .excel_generator import ExcelPackageGenerator
from .sec_ingestion import SECDataIngester
from .validators import ExcelValidator, validate_submission
from .ai_coach import AICoach, GPTZeroDetector, generate_feedback_for_submission

__all__ = [
    'ExcelPackageGenerator',
    'SECDataIngester', 
    'ExcelValidator',
    'validate_submission',
    'AICoach',
    'GPTZeroDetector',
    'generate_feedback_for_submission'
]

