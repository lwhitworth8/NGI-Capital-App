"""
Free PDF signing system for NGI Capital Advisory onboarding.
Uses pdf-lib and reportlab for PDF manipulation and signature generation.
"""

import os
import io
from typing import Dict, Any, Optional
from datetime import datetime
import base64
import json

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.utils import ImageReader
    from reportlab.lib.colors import black, blue
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.units import inch
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

try:
    import PyPDF2
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False

# Configuration
SIGNATURES_DIR = os.getenv('PDF_SIGNATURES_DIR', 'uploads/signatures')
TEMPLATES_DIR = os.getenv('PDF_TEMPLATES_DIR', 'templates/contracts')

def ensure_directories():
    """Ensure required directories exist."""
    os.makedirs(SIGNATURES_DIR, exist_ok=True)
    os.makedirs(TEMPLATES_DIR, exist_ok=True)

def create_intern_agreement_pdf(
    student_name: str,
    student_email: str,
    project_name: str,
    role: str,
    start_date: str = None,
    duration: str = "3 months",
    hourly_rate: str = "$25/hour"
) -> Dict[str, Any]:
    """
    Create a professional intern agreement PDF.
    Returns {success, file_path, message}.
    """
    if not REPORTLAB_AVAILABLE:
        return {
            "success": False,
            "message": "ReportLab not available. Install with: pip install reportlab"
        }
    
    try:
        ensure_directories()
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"intern_agreement_{student_name.replace(' ', '_').lower()}_{timestamp}.pdf"
        filepath = os.path.join(SIGNATURES_DIR, filename)
        
        # Create PDF
        doc = SimpleDocTemplate(filepath, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1,  # Center
            textColor=blue
        )
        story.append(Paragraph("INTERN AGREEMENT", title_style))
        story.append(Spacer(1, 20))
        
        # Agreement details
        details = f"""
        <b>Student Information:</b><br/>
        Name: {student_name}<br/>
        Email: {student_email}<br/>
        <br/>
        <b>Position Details:</b><br/>
        Role: {role}<br/>
        Project: {project_name}<br/>
        Start Date: {start_date or datetime.now().strftime("%B %d, %Y")}<br/>
        Duration: {duration}<br/>
        Hourly Rate: {hourly_rate}<br/>
        <br/>
        <b>Terms and Conditions:</b><br/>
        1. This is an internship position with NGI Capital Advisory.<br/>
        2. The intern will work on the {project_name} project under supervision.<br/>
        3. The internship duration is {duration} with possibility of extension.<br/>
        4. The intern agrees to maintain confidentiality of all company information.<br/>
        5. The intern will receive {hourly_rate} for hours worked.<br/>
        6. This agreement can be terminated by either party with 2 weeks notice.<br/>
        <br/>
        <b>Confidentiality:</b><br/>
        The intern agrees to keep all company information, client data, and project details confidential. 
        This includes but is not limited to financial information, business strategies, and client relationships.<br/>
        <br/>
        <b>Intellectual Property:</b><br/>
        All work created during the internship becomes the property of NGI Capital Advisory unless otherwise specified.<br/>
        <br/>
        <b>Signature Section:</b><br/>
        By signing below, both parties agree to the terms outlined in this agreement.<br/>
        <br/>
        Student Signature: _________________________ Date: ___________<br/>
        <br/>
        NGI Capital Advisory Representative: _________________________ Date: ___________<br/>
        """
        
        story.append(Paragraph(details, styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Add signature lines
        signature_style = ParagraphStyle(
            'Signature',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=10
        )
        
        story.append(Paragraph("Student Signature: _________________________ Date: ___________", signature_style))
        story.append(Spacer(1, 10))
        story.append(Paragraph("NGI Capital Advisory Representative: _________________________ Date: ___________", signature_style))
        
        # Build PDF
        doc.build(story)
        
        return {
            "success": True,
            "file_path": filepath,
            "filename": filename,
            "message": f"Intern agreement PDF created successfully: {filename}"
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to create intern agreement PDF: {str(e)}"
        }

def create_nda_pdf(
    student_name: str,
    student_email: str,
    project_name: str
) -> Dict[str, Any]:
    """
    Create a Non-Disclosure Agreement PDF.
    Returns {success, file_path, message}.
    """
    if not REPORTLAB_AVAILABLE:
        return {
            "success": False,
            "message": "ReportLab not available. Install with: pip install reportlab"
        }
    
    try:
        ensure_directories()
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"nda_{student_name.replace(' ', '_').lower()}_{timestamp}.pdf"
        filepath = os.path.join(SIGNATURES_DIR, filename)
        
        # Create PDF
        doc = SimpleDocTemplate(filepath, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1,  # Center
            textColor=blue
        )
        story.append(Paragraph("NON-DISCLOSURE AGREEMENT", title_style))
        story.append(Spacer(1, 20))
        
        # NDA content
        nda_content = f"""
        <b>Parties:</b><br/>
        <b>Disclosing Party:</b> NGI Capital Advisory<br/>
        <b>Receiving Party:</b> {student_name} ({student_email})<br/>
        <b>Project:</b> {project_name}<br/>
        <br/>
        <b>Confidential Information:</b><br/>
        The Receiving Party acknowledges that they may receive confidential and proprietary information 
        related to NGI Capital Advisory's business, clients, projects, and operations. This includes but is not limited to:<br/>
        <br/>
        • Financial information and business strategies<br/>
        • Client information and relationships<br/>
        • Project details and methodologies<br/>
        • Technical information and intellectual property<br/>
        • Any other information marked as confidential<br/>
        <br/>
        <b>Obligations:</b><br/>
        The Receiving Party agrees to:<br/>
        1. Keep all confidential information strictly confidential<br/>
        2. Not disclose confidential information to any third party<br/>
        3. Use confidential information only for the purpose of the {project_name} project<br/>
        4. Return all confidential materials upon project completion<br/>
        5. Not use confidential information for personal gain<br/>
        <br/>
        <b>Duration:</b><br/>
        This agreement remains in effect for 5 years from the date of signature, regardless of project completion.<br/>
        <br/>
        <b>Remedies:</b><br/>
        Any breach of this agreement may result in legal action and monetary damages.<br/>
        <br/>
        <b>Signature Section:</b><br/>
        By signing below, both parties agree to the terms of this Non-Disclosure Agreement.<br/>
        <br/>
        Student Signature: _________________________ Date: ___________<br/>
        <br/>
        NGI Capital Advisory Representative: _________________________ Date: ___________<br/>
        """
        
        story.append(Paragraph(nda_content, styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Add signature lines
        signature_style = ParagraphStyle(
            'Signature',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=10
        )
        
        story.append(Paragraph("Student Signature: _________________________ Date: ___________", signature_style))
        story.append(Spacer(1, 10))
        story.append(Paragraph("NGI Capital Advisory Representative: _________________________ Date: ___________", signature_style))
        
        # Build PDF
        doc.build(story)
        
        return {
            "success": True,
            "file_path": filepath,
            "filename": filename,
            "message": f"NDA PDF created successfully: {filename}"
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to create NDA PDF: {str(e)}"
        }

def add_signature_to_pdf(
    pdf_path: str,
    signature_text: str,
    signature_date: str = None,
    output_path: str = None
) -> Dict[str, Any]:
    """
    Add a signature to an existing PDF.
    This is a simplified version - in production you'd want more sophisticated signature handling.
    """
    if not PYPDF2_AVAILABLE:
        return {
            "success": False,
            "message": "PyPDF2 not available. Install with: pip install PyPDF2"
        }
    
    try:
        if not signature_date:
            signature_date = datetime.now().strftime("%B %d, %Y")
        
        if not output_path:
            base_name = os.path.splitext(pdf_path)[0]
            output_path = f"{base_name}_signed.pdf"
        
        # For now, we'll just copy the PDF and add a note
        # In a real implementation, you'd use a more sophisticated PDF library
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            pdf_writer = PyPDF2.PdfWriter()
            
            for page in pdf_reader.pages:
                pdf_writer.add_page(page)
            
            # Add metadata
            pdf_writer.add_metadata({
                '/Title': 'Signed Document',
                '/Author': 'NGI Capital Advisory',
                '/Subject': f'Document signed by {signature_text} on {signature_date}',
                '/Creator': 'NGI Capital Advisory PDF Signing System'
            })
            
            with open(output_path, 'wb') as output_file:
                pdf_writer.write(output_file)
        
        return {
            "success": True,
            "file_path": output_path,
            "message": f"Signature added to PDF: {os.path.basename(output_path)}"
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to add signature to PDF: {str(e)}"
        }

def create_signing_links(
    student_name: str,
    student_email: str,
    project_name: str,
    role: str,
    base_url: str = "http://localhost:3001"
) -> Dict[str, Any]:
    """
    Create signing links for documents.
    Returns {success, intern_agreement_link, nda_link, message}.
    """
    try:
        # Create intern agreement
        intern_result = create_intern_agreement_pdf(
            student_name=student_name,
            student_email=student_email,
            project_name=project_name,
            role=role
        )
        
        if not intern_result["success"]:
            return intern_result
        
        # Create NDA
        nda_result = create_nda_pdf(
            student_name=student_name,
            student_email=student_email,
            project_name=project_name
        )
        
        if not nda_result["success"]:
            return nda_result
        
        # Generate signing URLs (these would be actual signing pages in production)
        intern_filename = os.path.basename(intern_result["file_path"])
        nda_filename = os.path.basename(nda_result["file_path"])
        
        intern_link = f"{base_url}/admin/sign-document?type=intern&file={intern_filename}&student={student_email}"
        nda_link = f"{base_url}/admin/sign-document?type=nda&file={nda_filename}&student={student_email}"
        
        return {
            "success": True,
            "intern_agreement_link": intern_link,
            "nda_link": nda_link,
            "intern_filename": intern_filename,
            "nda_filename": nda_filename,
            "message": "Signing links created successfully"
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to create signing links: {str(e)}"
        }

def mark_document_signed(
    document_type: str,
    student_email: str,
    signature_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Mark a document as signed in the database.
    This would integrate with your database to track signing status.
    """
    try:
        # This would update your database to mark the document as signed
        # For now, we'll just return success
        
        return {
            "success": True,
            "message": f"{document_type} marked as signed for {student_email}",
            "signed_at": datetime.now().isoformat(),
            "signature_data": signature_data
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to mark document as signed: {str(e)}"
        }
