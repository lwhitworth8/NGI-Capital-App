"""
Email service for NGI Capital Advisory onboarding workflow.
Handles interview invitations, offer emails, and welcome emails.
"""

import os
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json

# Email configuration - use Gmail API like the calendar integration
GMAIL_ENABLED = str(os.getenv("ENABLE_GCAL", "0")).strip().lower() in ("1", "true", "yes")
GOOGLE_CREDENTIALS_JSON = os.getenv('GOOGLE_CREDENTIALS_JSON', 'credentials.json')
GOOGLE_TOKEN_JSON = os.getenv('GOOGLE_TOKEN_JSON', 'token.json')
FROM_EMAIL = os.getenv('FROM_EMAIL', 'lwhitworth@ngicapitaladvisory.com')
FROM_NAME = os.getenv('FROM_NAME', 'NGI Capital Advisory')

# Admin emails
ADMIN_EMAILS = [
    'lwhitworth@ngicapitaladvisory.com',
    'anurmamade@ngicapitaladvisory.com'
]

def _get_gmail_service():
    """Get Gmail service using OAuth 2.0 authentication."""
    if not GMAIL_ENABLED:
        return None
    
    try:
        from googleapiclient.discovery import build
        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        
        SCOPES = ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.compose']
        
        creds = None
        if os.path.exists(GOOGLE_TOKEN_JSON):
            try:
                creds = Credentials.from_authorized_user_file(GOOGLE_TOKEN_JSON, SCOPES)
            except Exception as e:
                print(f"WARNING: Failed to load existing Gmail token: {e}")
                creds = None

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                print("INFO: Refreshing expired Gmail token.")
                creds.refresh(Request())
            else:
                if not os.path.exists(GOOGLE_CREDENTIALS_JSON):
                    print(f"ERROR: Gmail credentials file not found: {GOOGLE_CREDENTIALS_JSON}")
                    return None
                print(f"INFO: Starting Gmail OAuth 2.0 flow with {GOOGLE_CREDENTIALS_JSON}.")
                flow = InstalledAppFlow.from_client_secrets_file(GOOGLE_CREDENTIALS_JSON, SCOPES)
                creds = flow.run_local_server(port=0)
            with open(GOOGLE_TOKEN_JSON, 'w') as token:
                token.write(creds.to_json())
            print(f"INFO: Gmail token saved to {GOOGLE_TOKEN_JSON}.")

        service = build('gmail', 'v1', credentials=creds, cache_discovery=False)
        print("INFO: Gmail service initialized.")
        return service
    except Exception as e:
        print(f"ERROR: Failed to build Gmail service: {e}")
        return None

def send_email(
    to_emails: List[str],
    subject: str,
    html_content: str,
    text_content: str = None,
    cc_emails: List[str] = None,
    bcc_emails: List[str] = None
) -> Dict[str, Any]:
    """
    Send email using Gmail API.
    Returns {success, message, email_id}.
    """
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg['To'] = ', '.join(to_emails)
        msg['Subject'] = subject
        
        if cc_emails:
            msg['Cc'] = ', '.join(cc_emails)
        
        # Add text and HTML parts
        if text_content:
            text_part = MIMEText(text_content, 'plain')
            msg.attach(text_part)
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Send email using Gmail API
        if GMAIL_ENABLED:
            service = _get_gmail_service()
            if service:
                # Encode message for Gmail API
                raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode('utf-8')
                
                message = {
                    'raw': raw_message
                }
                
                sent_message = service.users().messages().send(
                    userId='me', 
                    body=message
                ).execute()
                
                return {
                    "success": True,
                    "message": f"Email sent successfully to {', '.join(to_emails)}",
                    "email_id": sent_message.get('id', f"gmail_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}")
                }
            else:
                # Fallback to mock mode
                print(f"INFO: Gmail service not available, using mock mode")
                print(f"Mock email sent to {', '.join(to_emails)}")
                print(f"Subject: {subject}")
                print(f"Content: {html_content[:200]}...")
                
                return {
                    "success": True,
                    "message": f"Mock email sent to {', '.join(to_emails)}",
                    "email_id": f"mock_email_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
                }
        else:
            # Mock mode for development
            print(f"INFO: Gmail disabled, using mock mode")
            print(f"Mock email sent to {', '.join(to_emails)}")
            print(f"Subject: {subject}")
            print(f"Content: {html_content[:200]}...")
            
            return {
                "success": True,
                "message": f"Mock email sent to {', '.join(to_emails)}",
                "email_id": f"mock_email_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            }
            
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to send email: {str(e)}",
            "email_id": None
        }

def send_interview_invitation(
    student_email: str,
    student_name: str,
    project_name: str,
    role: str,
    availability_slots: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Send interview invitation email to student with admin availability slots.
    """
    subject = f"Interview Invitation - {role} at NGI Capital Advisory"
    
    # Default availability if none provided
    if not availability_slots:
        availability_slots = [
            {"date": "Monday", "times": ["9:00 AM - 10:00 AM", "2:00 PM - 3:00 PM"]},
            {"date": "Tuesday", "times": ["10:00 AM - 11:00 AM", "3:00 PM - 4:00 PM"]},
            {"date": "Wednesday", "times": ["9:00 AM - 10:00 AM", "1:00 PM - 2:00 PM"]},
            {"date": "Thursday", "times": ["11:00 AM - 12:00 PM", "2:00 PM - 3:00 PM"]},
            {"date": "Friday", "times": ["9:00 AM - 10:00 AM", "3:00 PM - 4:00 PM"]}
        ]
    
    # Generate availability HTML
    availability_html = ""
    for slot in availability_slots:
        times_html = "".join([f"<li>{time}</li>" for time in slot["times"]])
        availability_html += f"""
        <li><strong>{slot['date']}:</strong>
            <ul style="margin: 5px 0; padding-left: 20px;">
                {times_html}
            </ul>
        </li>
        """
    
    # Generate calendar booking URL
    import urllib.parse
    import uuid
    
    booking_token = str(uuid.uuid4())
    base_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3001")
    
    calendar_params = {
        'email': student_email,
        'name': student_name,
        'project': project_name,
        'role': role,
        'slots': json.dumps(availability_slots),
        'token': booking_token
    }
    
    calendar_booking_url = f"{base_url}/calendar-booking?" + urllib.parse.urlencode(calendar_params)
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Interview Invitation</title>
    </head>
    <body>
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0056b3 0%, #003d82 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Interview Invitation</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">NGI Capital Advisory</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; margin-bottom: 20px;">Dear <strong>{student_name}</strong>,</p>
                
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Thank you for your interest in the <strong style="color: #0056b3;">{role}</strong> position on the 
                    <strong style="color: #0056b3;">{project_name}</strong> project at NGI Capital Advisory.
                </p>
                
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                    We were impressed by your application and would like to invite you for an interview to discuss 
                    your qualifications and the role in more detail.
                </p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #0056b3; margin-top: 0; font-size: 18px;">Next Steps:</h3>
                    <ol style="margin: 0; padding-left: 20px;">
                        <li style="margin-bottom: 8px;"><strong>Schedule Your Interview:</strong> Please reply to this email with your preferred interview time from the available slots below</li>
                        <li style="margin-bottom: 8px;"><strong>Interview Format:</strong> Video call via Google Meet</li>
                        <li style="margin-bottom: 8px;"><strong>Duration:</strong> Approximately 30-45 minutes</li>
                        <li style="margin-bottom: 0;"><strong>Preparation:</strong> Please review the project details and come prepared to discuss your relevant experience</li>
                    </ol>
                </div>
                
                <div style="background: #e3f2fd; border: 2px solid #2196f3; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                    <h3 style="color: #1976d2; margin-top: 0; font-size: 18px;">Book Your Interview Instantly</h3>
                    <p style="margin: 0 0 15px 0; color: #1976d2;">Click the button below to open our interactive calendar and book your preferred time slot directly:</p>
                    <a href="{calendar_booking_url}" style="display: inline-block; background: #2196f3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        Open Calendar & Book Interview
                    </a>
                    <p style="margin: 10px 0 0 0; color: #1976d2; font-size: 14px;">
                        This will open a secure booking page where you can select your preferred time slot.
                    </p>
                </div>
                
                <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 8px; margin: 25px 0;">
                    <p style="margin: 0; color: #0c5460; font-size: 14px;">
                        <strong>Please let us know your preferred time slot</strong>, and we'll send you the Google Meet link. 
                        If none of these times work for you, please let us know your availability, and we'll do our best to accommodate.
                    </p>
                </div>
                
                <p style="font-size: 16px; margin: 25px 0;">We look forward to speaking with you!</p>
                
                <div style="border-top: 2px solid #0056b3; padding-top: 20px; margin-top: 30px;">
                    <p style="margin: 0; font-size: 16px;">
                        Best regards,<br>
                        <strong style="color: #0056b3;">Landon Whitworth & Andre Nurmamade</strong><br>
                        NGI Capital Advisory Leadership Team
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    # No need for availability text since we have interactive calendar
    
    text_content = f"""
    Dear {student_name},
    
    Thank you for your interest in the {role} position on the {project_name} project at NGI Capital Advisory.
    
    We were impressed by your application and would like to invite you for an interview to discuss your qualifications and the role in more detail.
    
    Next Steps:
    1. Schedule Your Interview: Click the link below to open our interactive calendar and book your preferred time slot
    2. Interview Format: Video call via Google Meet
    3. Duration: Approximately 30-45 minutes
    4. Preparation: Please review the project details and come prepared to discuss your relevant experience
    
    Book Your Interview: {calendar_booking_url}
    
    This will open a secure booking page where you can select your preferred time slot directly.
    
    We look forward to speaking with you!
    
    Best regards,
    Landon Whitworth & Andre Nurmamade
    NGI Capital Advisory Leadership Team
    """
    
    return send_email(
        to_emails=[student_email],
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        cc_emails=ADMIN_EMAILS
    )

def send_offer_email(
    student_email: str,
    student_name: str,
    project_name: str,
    role: str,
    contract_duration: str = "3 months",
    start_date: str = None
) -> Dict[str, Any]:
    """
    Send offer email with free PDF signing links for contract and NDA.
    """
    subject = f"Congratulations! Job Offer - {role} at NGI Capital Advisory"
    
    # Generate PDF signing links
    try:
        from .pdf_signing import create_signing_links
        
        signing_result = create_signing_links(
            student_name=student_name,
            student_email=student_email,
            project_name=project_name,
            role=role
        )
        
        if signing_result["success"]:
            intern_link = signing_result["intern_agreement_link"]
            nda_link = signing_result["nda_link"]
        else:
            # Fallback to simple links
            intern_link = f"https://ngicapitaladvisory.com/sign/intern?student={student_email}"
            nda_link = f"https://ngicapitaladvisory.com/sign/nda?student={student_email}"
            
    except Exception as e:
        print(f"WARNING: Failed to create PDF signing links: {str(e)}")
        # Fallback to simple links
        intern_link = f"https://ngicapitaladvisory.com/sign/intern?student={student_email}"
        nda_link = f"https://ngicapitaladvisory.com/sign/nda?student={student_email}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Job Offer</title>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #0056b3; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; background: #f8fafc; }}
            .button {{ display: inline-block; background: #0056b3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }}
            .highlight {{ background: #dbeafe; padding: 15px; border-left: 4px solid #1e40af; margin: 15px 0; }}
            .footer {{ padding: 20px; text-align: center; color: #666; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Congratulations!</h1>
                <p>Job Offer - NGI Capital Advisory</p>
            </div>
            <div class="content">
                <h2>Dear {student_name},</h2>
                
                <div class="highlight">
                    <h3>We are excited to offer you the position of <strong>{role}</strong> on the <strong>{project_name}</strong> project!</h3>
                </div>
                
                <p>After careful consideration of your application and interview, we believe you would be an excellent addition to our team. Your skills and enthusiasm align perfectly with what we're looking for.</p>
                
                <h3>Next Steps:</h3>
                <ol>
                    <li><strong>Review and Sign Documents:</strong> Please review and sign the following documents using the links below:
                        <ul>
                            <li><a href="{intern_link}" class="button">Sign Intern Agreement</a> (Contract Duration: {contract_duration})</li>
                            <li><a href="{nda_link}" class="button">Sign NDA Agreement</a></li>
                        </ul>
                    </li>
                    <li><strong>Email Setup:</strong> Once documents are signed, we'll provision your NGI Capital Advisory email account</li>
                    <li><strong>Welcome & Onboarding:</strong> You'll receive welcome materials and project access</li>
                </ol>
                
                {f'<p><strong>Expected Start Date:</strong> {start_date}</p>' if start_date else ''}
                
                <p>Please complete the document signing process within 48 hours to secure your position. If you have any questions, don't hesitate to reach out to us.</p>
                
                <p>We're thrilled to have you join the NGI Capital Advisory team!</p>
                
                <p>Best regards,<br>
                Landon Whitworth & Andre Nurmamade<br>
                NGI Capital Advisory Leadership Team</p>
            </div>
            <div class="footer">
                <p>NGI Capital Advisory<br>
                Email: lwhitworth@ngicapitaladvisory.com | anurmamade@ngicapitaladvisory.com</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Congratulations! Job Offer - {role} at NGI Capital Advisory
    
    Dear {student_name},
    
    We are excited to offer you the position of {role} on the {project_name} project!
    
    After careful consideration of your application and interview, we believe you would be an excellent addition to our team. Your skills and enthusiasm align perfectly with what we're looking for.
    
    Next Steps:
    1. Review and Sign Documents: Please review and sign the following documents using the links below:
       - Intern Agreement: {intern_link} (Contract Duration: {contract_duration})
       - NDA Agreement: {nda_link}
    
    2. Email Setup: Once documents are signed, we'll provision your NGI Capital Advisory email account
    3. Welcome & Onboarding: You'll receive welcome materials and project access
    
    {f'Expected Start Date: {start_date}' if start_date else ''}
    
    Please complete the document signing process within 48 hours to secure your position. If you have any questions, don't hesitate to reach out to us.
    
    We're thrilled to have you join the NGI Capital Advisory team!
    
    Best regards,
    Landon Whitworth & Andre Nurmamade
    NGI Capital Advisory Leadership Team
    
    NGI Capital Advisory
    Email: lwhitworth@ngicapitaladvisory.com | anurmamade@ngicapitaladvisory.com
    """
    
    return send_email(
        to_emails=[student_email],
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        cc_emails=ADMIN_EMAILS
    )

def send_welcome_email(
    student_email: str,
    student_name: str,
    ngi_email: str,
    project_name: str,
    role: str,
    login_instructions: str = None,
    slack_channel_link: str = None
) -> Dict[str, Any]:
    """
    Send welcome email after successful onboarding.
    """
    subject = f"Welcome to NGI Capital Advisory! - {role} on {project_name}"
    
    if not login_instructions:
        login_instructions = f"Please log in to the NGI Capital Advisory platform using your new email: {ngi_email}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Welcome to NGI Capital Advisory</title>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #1e40af; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; background: #f8fafc; }}
            .button {{ display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }}
            .highlight {{ background: #dbeafe; padding: 15px; border-left: 4px solid #1e40af; margin: 15px 0; }}
            .footer {{ padding: 20px; text-align: center; color: #666; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to the Team!</h1>
                <p>NGI Capital Advisory</p>
            </div>
            <div class="content">
                <h2>Dear {student_name},</h2>
                
                <div class="highlight">
                    <h3>Welcome to NGI Capital Advisory! We're excited to have you join our team as a <strong>{role}</strong> on the <strong>{project_name}</strong> project.</h3>
                </div>
                
                <p>Your onboarding process is now complete, and you're ready to start contributing to our exciting projects. Here's what you need to know:</p>
                
                <h3>Your Account Details:</h3>
                <ul>
                    <li><strong>NGI Email:</strong> {ngi_email}</li>
                    <li><strong>Role:</strong> {role}</li>
                    <li><strong>Project:</strong> {project_name}</li>
                </ul>
                
                <h3>Getting Started:</h3>
                <ol>
                    <li><strong>Login:</strong> {login_instructions}</li>
                    <li><strong>Project Access:</strong> You can now access your project in the "My Projects" section</li>
                    <li><strong>Team Communication:</strong> Use your NGI email for all team communications</li>
                    <li><strong>Resources:</strong> Check the Learning Center for project-specific resources and guidelines</li>
                </ol>
                
                {f'''
                <div style="background: #e3f2fd; border: 2px solid #2196f3; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                    <h3 style="color: #1976d2; margin-top: 0; font-size: 18px;">Join Your Project Team</h3>
                    <p style="margin: 0 0 15px 0; color: #1976d2;">Connect with your team members and stay updated on project progress:</p>
                    <a href="{slack_channel_link}" style="display: inline-block; background: #2196f3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        Join Project Slack Channel
                    </a>
                    <p style="margin: 10px 0 0 0; color: #1976d2; font-size: 14px;">
                        This is your dedicated communication channel for the {project_name} project.
                    </p>
                </div>
                ''' if slack_channel_link else ''}
                
                <p>We're confident you'll make valuable contributions to our team. If you have any questions or need assistance, don't hesitate to reach out to us.</p>
                
                <p>Once again, welcome to NGI Capital Advisory. We're thrilled to have you on board!</p>
                
                <p>Best regards,<br>
                Landon Whitworth & Andre Nurmamade<br>
                NGI Capital Advisory Leadership Team</p>
            </div>
            <div class="footer">
                <p>NGI Capital Advisory<br>
                Email: lwhitworth@ngicapitaladvisory.com | anurmamade@ngicapitaladvisory.com</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Welcome to NGI Capital Advisory! - {role} on {project_name}
    
    Dear {student_name},
    
    Welcome to NGI Capital Advisory! We're excited to have you join our team as a {role} on the {project_name} project.
    
    Your onboarding process is now complete, and you're ready to start contributing to our exciting projects. Here's what you need to know:
    
    Your Account Details:
    - NGI Email: {ngi_email}
    - Role: {role}
    - Project: {project_name}
    
    Getting Started:
    1. Login: {login_instructions}
    2. Project Access: You can now access your project in the "My Projects" section
    3. Team Communication: Use your NGI email for all team communications
    4. Resources: Check the Learning Center for project-specific resources and guidelines
    {f'5. Join Project Team: {slack_channel_link}' if slack_channel_link else ''}
    
    We're confident you'll make valuable contributions to our team. If you have any questions or need assistance, don't hesitate to reach out to us.
    
    Once again, welcome to NGI Capital Advisory. We're thrilled to have you on board!
    
    Best regards,
    Landon Whitworth & Andre Nurmamade
    NGI Capital Advisory Leadership Team
    
    NGI Capital Advisory
    Email: lwhitworth@ngicapitaladvisory.com | anurmamade@ngicapitaladvisory.com
    """
    
    return send_email(
        to_emails=[student_email],
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        cc_emails=ADMIN_EMAILS
    )

def send_admin_notification(
    action: str,
    student_name: str,
    student_email: str,
    project_name: str,
    role: str,
    additional_info: str = None
) -> Dict[str, Any]:
    """
    Send notification email to admins about onboarding actions.
    """
    subject = f"Onboarding Update: {action} - {student_name}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Onboarding Update</title>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #dc2626; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; background: #f8fafc; }}
            .info {{ background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }}
            .footer {{ padding: 20px; text-align: center; color: #666; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Onboarding Update</h1>
                <p>NGI Capital Advisory Admin Notification</p>
            </div>
            <div class="content">
                <h2>Action: {action}</h2>
                
                <div class="info">
                    <h3>Student Information:</h3>
                    <ul>
                        <li><strong>Name:</strong> {student_name}</li>
                        <li><strong>Email:</strong> {student_email}</li>
                        <li><strong>Project:</strong> {project_name}</li>
                        <li><strong>Role:</strong> {role}</li>
                    </ul>
                </div>
                
                {f'<p><strong>Additional Information:</strong> {additional_info}</p>' if additional_info else ''}
                
                <p>Please review this update in the NGI Capital Advisory admin panel.</p>
                
                <p>Best regards,<br>
                NGI Capital Advisory System</p>
            </div>
            <div class="footer">
                <p>NGI Capital Advisory Admin Panel</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(
        to_emails=ADMIN_EMAILS,
        subject=subject,
        html_content=html_content,
        text_content=f"Onboarding Update: {action}\n\nStudent: {student_name} ({student_email})\nProject: {project_name}\nRole: {role}\n\n{additional_info or ''}"
    )

def send_rejection_email(
    student_email: str,
    student_name: str,
    project_name: str
) -> Dict[str, Any]:
    """
    Send a kind rejection email to unsuccessful interview candidates.
    """
    subject = f"Thank You for Your Interest - {project_name} at NGI Capital Advisory"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Thank You for Your Interest</title>
    </head>
    <body>
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0056b3 0%, #003d82 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Thank You for Your Interest</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">NGI Capital Advisory</p>
            </div>

            <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; margin-bottom: 20px;">Dear <strong>{student_name}</strong>,</p>

                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Thank you for taking the time to interview with us for the <strong style="color: #0056b3;">{project_name}</strong> project at NGI Capital Advisory.
                </p>

                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    After careful consideration, we have decided to move forward with other candidates for this particular role. 
                    This decision was not easy, as we were impressed by your qualifications and enthusiasm.
                </p>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #0056b3; margin-top: 0; font-size: 18px;">What's Next?</h3>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">We encourage you to apply to future projects that may be of interest</li>
                        <li style="margin-bottom: 8px;">We will keep your application on file for upcoming opportunities</li>
                        <li style="margin-bottom: 8px;">If you have any questions or would like feedback, please don't hesitate to reach out</li>
                        <li style="margin-bottom: 0;">We appreciate your interest in NGI Capital Advisory</li>
                    </ul>
                </div>

                <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #0c5460; margin-top: 0; font-size: 18px;">Stay Connected</h3>
                    <p style="margin: 0 0 10px 0; color: #0c5460;">
                        We encourage you to follow our projects and apply to future opportunities that align with your interests and skills.
                    </p>
                    <p style="margin: 0; color: #0c5460;">
                        If you have any questions about this decision or would like to discuss future opportunities, 
                        please feel free to reach out to us at <strong>lwhitworth@ngicapitaladvisory.com</strong> or <strong>anurmamade@ngicapitaladvisory.com</strong>.
                    </p>
                </div>

                <p style="font-size: 16px; margin: 25px 0;">Thank you again for your time and interest in NGI Capital Advisory.</p>

                <div style="border-top: 2px solid #0056b3; padding-top: 20px; margin-top: 30px;">
                    <p style="margin: 0; font-size: 16px;">
                        Best regards,<br>
                        <strong style="color: #0056b3;">Landon Whitworth & Andre Nurmamade</strong><br>
                        NGI Capital Advisory Leadership Team
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
    Dear {student_name},

    Thank you for taking the time to interview with us for the {project_name} project at NGI Capital Advisory.

    After careful consideration, we have decided to move forward with other candidates for this particular role. 
    This decision was not easy, as we were impressed by your qualifications and enthusiasm.

    What's Next:
    - We encourage you to apply to future projects that may be of interest
    - We will keep your application on file for upcoming opportunities
    - If you have any questions or would like feedback, please don't hesitate to reach out
    - We appreciate your interest in NGI Capital Advisory

    Stay Connected:
    We encourage you to follow our projects and apply to future opportunities that align with your interests and skills.

    If you have any questions about this decision or would like to discuss future opportunities, 
    please feel free to reach out to us at lwhitworth@ngicapitaladvisory.com or anurmamade@ngicapitaladvisory.com.

    Thank you again for your time and interest in NGI Capital Advisory.

    Best regards,
    Landon Whitworth & Andre Nurmamade
    NGI Capital Advisory Leadership Team
    """

    return send_email(
        to_emails=[student_email],
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        cc_emails=ADMIN_EMAILS
    )


def send_interview_confirmation(
    student_email: str,
    student_name: str,
    project_name: str,
    role: str,
    interview_date: str,
    interview_time: str,
    calendar_link: str = "",
    meeting_link: str = ""
) -> Dict[str, Any]:
    """
    Send interview confirmation email with Google Calendar invite.
    """
    subject = f"Interview Confirmed - {role} at NGI Capital Advisory"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Interview Confirmed</title>
    </head>
    <body>
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0056b3 0%, #003d82 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Interview Confirmed!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">NGI Capital Advisory</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; margin-bottom: 20px;">Dear <strong>{student_name}</strong>,</p>
                
                <p style="font-size: 18px; line-height: 1.6; margin-bottom: 20px;">
                    Your interview for the <strong style="color: #0056b3;">{role}</strong> position on the 
                    <strong style="color: #0056b3;">{project_name}</strong> project has been confirmed!
                </p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #0056b3; margin-top: 0; font-size: 18px;">Interview Details:</h3>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li style="margin-bottom: 8px;"><strong>Date:</strong> {interview_date}</li>
                        <li style="margin-bottom: 8px;"><strong>Time:</strong> {interview_time}</li>
                        <li style="margin-bottom: 8px;"><strong>Position:</strong> {role}</li>
                        <li style="margin-bottom: 0;"><strong>Project:</strong> {project_name}</li>
                    </ul>
                </div>
                
                {f'''
                <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #0c5460; margin-top: 0; font-size: 18px;">Add to Calendar:</h3>
                    <p style="margin: 0 0 15px 0; color: #0c5460;">Click the link below to add this interview to your calendar:</p>
                    <a href="{calendar_link}" style="display: inline-block; background: #0056b3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Add to Google Calendar
                    </a>
                </div>
                ''' if calendar_link else ''}
                
                {f'''
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #856404; margin-top: 0; font-size: 18px;">Meeting Link:</h3>
                    <p style="margin: 0 0 15px 0; color: #856404;">Join the interview using this link:</p>
                    <a href="{meeting_link}" style="display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Join Interview
                    </a>
                </div>
                ''' if meeting_link else ''}
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #0056b3; margin-top: 0; font-size: 18px;">Preparation Tips:</h3>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">Review the project details and your application</li>
                        <li style="margin-bottom: 8px;">Prepare questions about the role and company</li>
                        <li style="margin-bottom: 8px;">Test your video/audio equipment beforehand</li>
                        <li style="margin-bottom: 0;">Join the meeting 5 minutes early</li>
                    </ul>
                </div>
                
                <p style="font-size: 16px; margin: 25px 0;">We look forward to speaking with you!</p>
                
                <div style="border-top: 2px solid #0056b3; padding-top: 20px; margin-top: 30px;">
                    <p style="margin: 0; font-size: 16px;">
                        Best regards,<br>
                        <strong style="color: #0056b3;">Landon Whitworth & Andre Nurmamade</strong><br>
                        NGI Capital Advisory Leadership Team
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Interview Confirmed - {role} at NGI Capital Advisory
    
    Dear {student_name},
    
    Your interview for the {role} position on the {project_name} project has been confirmed!
    
    Interview Details:
    - Date: {interview_date}
    - Time: {interview_time}
    - Position: {role}
    - Project: {project_name}
    
    {f'Add to Calendar: {calendar_link}' if calendar_link else ''}
    {f'Meeting Link: {meeting_link}' if meeting_link else ''}
    
    Preparation Tips:
    - Review the project details and your application
    - Prepare questions about the role and company
    - Test your video/audio equipment beforehand
    - Join the meeting 5 minutes early
    
    We look forward to speaking with you!
    
    Best regards,
    Landon Whitworth & Andre Nurmamade
    NGI Capital Advisory Leadership Team
    """
    
    return send_email(
        to_emails=[student_email],
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        cc_emails=ADMIN_EMAILS
    )
