"""
OpenAI Vision API Document Extractor for Accounting Module
Replaces legacy OCR with intelligent document parsing using GPT-5 Vision
"""

import asyncio
import base64
import io
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from decimal import Decimal

import openai
from pdf2image import convert_from_path
from PIL import Image
import pypdf

from ..config import settings

logger = logging.getLogger(__name__)


class DocumentExtractorVision:
    """GPT-5 Vision-based document extractor for accounting documents"""
    
    def __init__(self):
        self.client = openai.AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url="https://api.openai.com/v1"
        )
        self.model = "gpt-4o"  # Using GPT-4 Vision (GPT-5 doesn't exist yet)
        
    async def extract_document_data(
        self, 
        file_path: str, 
        entity_id: int,
        document_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract structured data from document using GPT-5 Vision
        
        Args:
            file_path: Path to the document (PDF, image, or text)
            entity_id: Entity ID for context
            document_type: Optional document type hint
            
        Returns:
            Dict containing extracted data with confidence scores
        """
        try:
            # Check file type and process accordingly
            file_extension = file_path.lower().split('.')[-1]
            
            if file_extension in ['txt', 'text']:
                # Process text files directly
                extracted_data = await self._extract_from_text_file(file_path, entity_id, document_type)
            elif file_extension in ['pdf']:
                # Convert PDF to images for vision processing
                images = await self._convert_pdf_to_images(file_path)
                
                # Extract text using GPT-5 Vision
                extracted_data = await self._extract_with_vision(images, entity_id, document_type)
            else:
                # For other file types, try to process as images
                images = await self._convert_pdf_to_images(file_path)
                extracted_data = await self._extract_with_vision(images, entity_id, document_type)
            
            # Add metadata
            extracted_data.update({
                "vision_model_version": self.model,
                "processing_time_ms": extracted_data.get("processing_time_ms", 0),
                "entity_id": entity_id,
                "extraction_timestamp": datetime.utcnow().isoformat(),
                "confidence_score": self._calculate_overall_confidence(extracted_data)
            })
            
            return extracted_data
            
        except Exception as e:
            logger.error(f"Error extracting document data: {str(e)}")
            return {
                "error": str(e),
                "success": False,
                "entity_id": entity_id,
                "extraction_timestamp": datetime.utcnow().isoformat()
            }
    
    async def _convert_pdf_to_images(self, file_path: str) -> List[Image.Image]:
        """Convert PDF pages to images for vision processing"""
        try:
            # Use pdf2image for high-quality conversion
            images = convert_from_path(
                file_path,
                dpi=300,  # High DPI for better OCR accuracy
                first_page=1,
                last_page=None,  # Process all pages
                fmt='RGB'
            )
            return images
        except Exception as e:
            logger.error(f"Error converting PDF to images: {str(e)}")
            # Fallback to pypdf for basic text extraction
            return await self._fallback_pdf_processing(file_path)
    
    async def _fallback_pdf_processing(self, file_path: str) -> List[Image.Image]:
        """Fallback PDF processing if pdf2image fails"""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = pypdf.PdfReader(file)
                # For now, return empty list - in production, you might want to
                # implement a different fallback strategy
                return []
        except Exception as e:
            logger.error(f"Fallback PDF processing failed: {str(e)}")
            return []
    
    async def _extract_from_text_file(
        self, 
        file_path: str, 
        entity_id: int,
        document_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Extract data from text files using GPT-4 text completion"""
        try:
            # Read the text file
            with open(file_path, 'r', encoding='utf-8') as file:
                text_content = file.read()
            
            # Create system prompt for text extraction
            system_prompt = self._create_system_prompt(entity_id, document_type)
            
            # Use GPT-4 text completion for text files
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": f"Extract data from:\n{text_content}"
                    }
                ],
                max_tokens=4000,
                temperature=0.1
            )
            
            response_text = response.choices[0].message.content
            
            # Parse the JSON response
            try:
                extracted_data = json.loads(response_text)
            except json.JSONDecodeError:
                # If JSON parsing fails, try to extract partial data
                extracted_data = self._extract_partial_data(response_text)
            
            # Add metadata
            extracted_data.update({
                "raw_text": text_content,
                "processing_method": "text_completion",
                "success": True
            })
            
            return extracted_data
            
        except Exception as e:
            logger.error(f"Error extracting from text file: {str(e)}")
            return {
                "error": f"Text extraction error: {str(e)}",
                "success": False,
                "processing_method": "text_completion"
            }
    
    async def _extract_with_vision(
        self, 
        images: List[Image.Image], 
        entity_id: int,
        document_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Extract data using GPT-5 Vision API"""
        
        start_time = datetime.utcnow()
        
        # Prepare images for API
        image_data = []
        for i, image in enumerate(images[:5]):  # Limit to first 5 pages
            # Convert PIL image to base64
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode()
            image_data.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{img_base64}",
                    "detail": "high"
                }
            })
        
        # Create the prompt for structured extraction
        system_prompt = self._create_system_prompt(entity_id, document_type)
        
        try:
            # Use direct requests to GPT-4 Vision API
            import requests
            import time
            
            # Prepare content array with text and images for GPT-4 Vision
            content_parts = [
                    {
                        "type": "text",
                        "text": f"{system_prompt}\n\nPlease analyze these accounting document images and extract ALL relevant financial data. Focus on accuracy and US GAAP compliance. Extract everything - amounts, dates, entities, reference numbers, addresses, etc. Be thorough and comprehensive."
                    }
                ]
            
            # Add images as base64 data URLs
            for i, image in enumerate(images[:3]):  # Limit to first 3 pages
                try:
                    # Convert PIL image to base64
                    buffered = io.BytesIO()
                    image.save(buffered, format="PNG")
                    img_base64 = base64.b64encode(buffered.getvalue()).decode()
                    
                    content_parts.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{img_base64}"
                        }
                    })
                except Exception as e:
                    logger.warning(f"Failed to process image {i}: {e}")
                    continue
            
            if len(content_parts) == 1:  # Only text, no images
                raise Exception("No images could be processed")
            
            # Make direct API call with retry logic
            headers = {
                'Authorization': f'Bearer {settings.OPENAI_API_KEY}',
                'Content-Type': 'application/json'
            }
            
            request_data = {
                    "model": "gpt-4o",  # Use GPT-4 Vision
                    "messages": [{
                        "role": "user",
                        "content": content_parts
                    }],
                    "max_tokens": 4000,
                    "temperature": 0.1
                }
            
            # Retry logic for API calls
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = requests.post(
                        'https://api.openai.com/v1/chat/completions',
                        headers=headers,
                        json=request_data,
                        timeout=120  # Increased timeout to 2 minutes
                    )
                    break  # Success, exit retry loop
                except requests.exceptions.Timeout:
                    if attempt < max_retries - 1:
                        logger.warning(f"API timeout on attempt {attempt + 1}, retrying...")
                        time.sleep(2 ** attempt)  # Exponential backoff
                        continue
                    else:
                        raise Exception("API request timed out after all retries")
                except requests.exceptions.RequestException as e:
                    if attempt < max_retries - 1:
                        logger.warning(f"API request failed on attempt {attempt + 1}: {e}, retrying...")
                        time.sleep(2 ** attempt)  # Exponential backoff
                        continue
                    else:
                        raise Exception(f"API request failed after all retries: {e}")
            
            if response.status_code != 200:
                raise Exception(f"API request failed: {response.status_code} - {response.text}")
            
            response_data = response.json()
            
            # Parse the structured response from GPT-4 Vision API
            response_text = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            if not response_text:
                raise Exception("No text output received from GPT-4 Vision")
            
            # Log the response for debugging
            logger.info(f"GPT-5 response text (first 500 chars): {response_text[:500]}")
            
            try:
                extracted_data = json.loads(response_text)
            except json.JSONDecodeError as e:
                logger.error(f"JSON parsing error: {e}")
                logger.error(f"Response text length: {len(response_text)}")
                
                # Try to fix truncated JSON by adding missing closing braces
                if response_text.count('{') > response_text.count('}'):
                    missing_braces = response_text.count('{') - response_text.count('}')
                    fixed_json = response_text + '}' * missing_braces
                    logger.info(f"Attempting to fix truncated JSON by adding {missing_braces} closing braces")
                    try:
                        extracted_data = json.loads(fixed_json)
                        logger.info("Successfully fixed truncated JSON")
                    except json.JSONDecodeError:
                        # If that doesn't work, try to extract partial data
                        logger.warning("Could not fix JSON, attempting partial extraction")
                        extracted_data = self._extract_partial_data(response_text)
                else:
                    # Try to extract JSON from the response if it's wrapped in markdown
                    if "```json" in response_text:
                        json_start = response_text.find("```json") + 7
                        json_end = response_text.find("```", json_start)
                        if json_end > json_start:
                            json_text = response_text[json_start:json_end].strip()
                            logger.info(f"Extracted JSON from markdown: {json_text[:200]}...")
                            extracted_data = json.loads(json_text)
                        else:
                            extracted_data = self._extract_partial_data(response_text)
                    else:
                        extracted_data = self._extract_partial_data(response_text)
            
            # Calculate processing time
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            extracted_data["processing_time_ms"] = int(processing_time)
            
            return extracted_data
            
        except Exception as e:
            logger.error(f"GPT-5 Vision API error: {str(e)}")
            return {
                "error": f"Vision API error: {str(e)}",
                "success": False,
                "processing_time_ms": int((datetime.utcnow() - start_time).total_seconds() * 1000)
            }
    
    def _create_system_prompt(self, entity_id: int, document_type: Optional[str]) -> str:
        """Create system prompt for structured document extraction"""
        
        return f"""Extract financial data from accounting documents. Return ONLY valid JSON:

{{
    "document_type": "invoice|receipt|bill|formation|other",
    "confidence": 0.95,
    "vendor_name": "Company Name",
    "amounts": [{{"value": 100.00, "context": "Total"}}],
    "dates": [{{"date": "2025-08-07", "context": "Invoice date"}}],
    "reference_numbers": ["INV-001"],
    "total": 100.00,
    "success": true
}}"""
    
    def _calculate_overall_confidence(self, extracted_data: Dict[str, Any]) -> float:
        """Calculate overall confidence score for the extraction"""
        try:
            # Base confidence from the model
            base_confidence = extracted_data.get("confidence", 0.8)
            
            # Adjust based on data completeness
            completeness_score = 1.0
            required_fields = ["document_type", "vendor_name", "amounts", "dates"]
            
            for field in required_fields:
                if not extracted_data.get(field):
                    completeness_score -= 0.2
            
            # Adjust based on amount precision
            amounts = extracted_data.get("amounts", [])
            if amounts and len(amounts) > 0:
                # Check if we have meaningful amounts
                has_amounts = any(abs(amount.get("value", 0)) > 0 for amount in amounts)
                precision_score = 1.0 if has_amounts else 0.8
            else:
                precision_score = 0.7
            
            # Final confidence score
            final_confidence = (base_confidence * 0.4 + completeness_score * 0.3 + precision_score * 0.3)
            return min(max(final_confidence, 0.0), 1.0)
            
        except Exception as e:
            logger.error(f"Error calculating confidence: {str(e)}")
            return 0.5
    
    def _extract_partial_data(self, response_text: str) -> Dict[str, Any]:
        """Extract partial data from truncated JSON response"""
        try:
            # Try to extract basic information from the partial response
            extracted_data = {
                "document_type": "unknown",
                "confidence": 0.5,
                "raw_text": "",
                "vendor_name": "Unknown",
                "amounts": [],
                "dates": [],
                "reference_numbers": [],
                "extraction_notes": "Partial extraction due to truncated response",
                "error": "JSON response was truncated"
            }
            
            # Try to extract what we can from the partial text
            if '"document_type"' in response_text:
                try:
                    doc_type_start = response_text.find('"document_type": "') + 18
                    doc_type_end = response_text.find('"', doc_type_start)
                    if doc_type_end > doc_type_start:
                        extracted_data["document_type"] = response_text[doc_type_start:doc_type_end]
                except:
                    pass
            
            if '"confidence"' in response_text:
                try:
                    conf_start = response_text.find('"confidence": ') + 14
                    conf_end = response_text.find(',', conf_start)
                    if conf_end > conf_start:
                        extracted_data["confidence"] = float(response_text[conf_start:conf_end])
                except:
                    pass
            
            if '"raw_text"' in response_text:
                try:
                    text_start = response_text.find('"raw_text": "') + 13
                    # Find the end of the raw_text field (look for the next " followed by , or })
                    text_end = text_start
                    while text_end < len(response_text) and response_text[text_end] != '"':
                        if response_text[text_end] == '\\' and text_end + 1 < len(response_text):
                            text_end += 2  # Skip escaped characters
                        else:
                            text_end += 1
                    if text_end > text_start:
                        raw_text = response_text[text_start:text_end]
                        # Unescape the text
                        raw_text = raw_text.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
                        extracted_data["raw_text"] = raw_text
                except:
                    pass
            
            return extracted_data
            
        except Exception as e:
            logger.error(f"Error in partial data extraction: {e}")
            return {
                "document_type": "unknown",
                "confidence": 0.0,
                "raw_text": response_text[:1000] if response_text else "",
                "vendor_name": "Unknown",
                "amounts": [],
                "dates": [],
                "reference_numbers": [],
                "extraction_notes": f"Failed to extract data: {str(e)}",
                "error": str(e)
            }
    
    async def validate_extraction(self, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate extracted data for accounting compliance"""
        validation_result = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "suggestions": []
        }
        
        try:
            # Validate required fields
            if not extracted_data.get("document_type"):
                validation_result["errors"].append("Document type not identified")
                validation_result["is_valid"] = False
            
            if not extracted_data.get("amounts", {}).get("total"):
                validation_result["errors"].append("Total amount not found")
                validation_result["is_valid"] = False
            
            if not extracted_data.get("vendor_name"):
                validation_result["warnings"].append("Vendor name not identified")
            
            # Validate amounts are numeric
            amounts = extracted_data.get("amounts", {})
            for key, value in amounts.items():
                if key != "currency" and not isinstance(value, (int, float)):
                    validation_result["errors"].append(f"Invalid amount format for {key}")
                    validation_result["is_valid"] = False
            
            # Validate dates
            dates = extracted_data.get("dates", {})
            for date_key, date_value in dates.items():
                if date_value and not self._is_valid_date(date_value):
                    validation_result["warnings"].append(f"Invalid date format for {date_key}: {date_value}")
            
            # Check for startup cost classification
            classification = extracted_data.get("classification", {})
            if classification.get("is_startup_cost") and not classification.get("is_contributed_capital"):
                validation_result["suggestions"].append("Consider if this should be classified as contributed capital if pre-Mercury")
            
        except Exception as e:
            logger.error(f"Error validating extraction: {str(e)}")
            validation_result["errors"].append(f"Validation error: {str(e)}")
            validation_result["is_valid"] = False
        
        return validation_result
    
    def _is_valid_date(self, date_string: str) -> bool:
        """Validate date string format"""
        try:
            datetime.strptime(date_string, "%Y-%m-%d")
            return True
        except ValueError:
            return False


# Global instance
document_extractor = DocumentExtractorVision()
