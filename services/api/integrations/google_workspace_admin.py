"""
Google Workspace Admin SDK integration (OAuth 2.0 authentication for 2025).

This module uses OAuth 2.0 authentication as required by Google Workspace Admin SDK
for creating users and managing accounts. It gracefully degrades to mock behavior 
when credentials are not configured.

Configuration (environment variables):
- GOOGLE_WORKSPACE_ADMIN_ENABLED=1                    # turn on real Google calls (default off)
- GOOGLE_WORKSPACE_CREDENTIALS_JSON=...              # path to OAuth 2.0 credentials JSON file
- GOOGLE_WORKSPACE_TOKEN_JSON=...                    # path to stored token JSON file (optional)
- GOOGLE_WORKSPACE_DOMAIN=ngicapitaladvisory.com     # Google Workspace domain

OAuth 2.0 Setup (Required for user management):
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID (Desktop application)
3. Download credentials.json file
4. Set GOOGLE_WORKSPACE_CREDENTIALS_JSON=path/to/credentials.json
5. Enable Google Workspace Admin SDK API in your project
6. Set up OAuth consent screen
7. Set GOOGLE_WORKSPACE_DOMAIN=your-domain.com

Note: API keys cannot be used for user management.
Only OAuth 2.0 authentication allows full admin directory access.
"""

from __future__ import annotations

import os
import json
import secrets
import string
from typing import Any, Dict, Optional
from datetime import datetime

_WORKSPACE_ENABLED = str(os.getenv("GOOGLE_WORKSPACE_ADMIN_ENABLED", "0")).strip().lower() in ("1", "true", "yes")

def _load_credentials():
    """Load Google Workspace Admin SDK credentials (OAuth 2.0).
    Returns (credentials, service) or (None, None) if not configured.
    """
    if not _WORKSPACE_ENABLED:
        return None, None
    
    try:
        from googleapiclient.discovery import build
        
        # OAuth 2.0 authentication for admin directory
        try:
            from google_auth_oauthlib.flow import InstalledAppFlow
            from google.auth.transport.requests import Request
            from google.oauth2.credentials import Credentials
            
            # OAuth 2.0 scopes required for admin directory management
            SCOPES = ['https://www.googleapis.com/auth/admin.directory.user']
            
            creds = None
            token_file = os.getenv("GOOGLE_WORKSPACE_TOKEN_JSON", "workspace_token.json")
            credentials_file = os.getenv("GOOGLE_WORKSPACE_CREDENTIALS_JSON", "workspace_credentials.json")
            
            # Load existing token if available
            if os.path.exists(token_file):
                print(f"INFO: Loading existing OAuth 2.0 token from {token_file}")
                creds = Credentials.from_authorized_user_file(token_file, SCOPES)
            
            # If there are no (valid) credentials available, let the user log in
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    print("INFO: Refreshing expired OAuth 2.0 token")
                    creds.refresh(Request())
                else:
                    if not os.path.exists(credentials_file):
                        print(f"WARNING: OAuth 2.0 credentials file not found: {credentials_file}")
                        raise Exception("OAuth 2.0 credentials not available")
                    
                    print(f"INFO: Starting OAuth 2.0 flow with {credentials_file}")
                    flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
                    creds = flow.run_local_server(port=0)
                
                # Save the credentials for the next run
                with open(token_file, 'w') as token:
                    token.write(creds.to_json())
                print(f"INFO: OAuth 2.0 token saved to {token_file}")
            
            # Build the service with OAuth 2.0
            service = build('admin', 'directory_v1', credentials=creds, cache_discovery=False)
            print("INFO: Google Workspace Admin SDK service initialized with OAuth 2.0")
            return creds, service
            
        except Exception as oauth_error:
            print(f"WARNING: OAuth 2.0 authentication failed: {str(oauth_error)}")
            return None, None
        
    except Exception as e:
        print(f"ERROR: Failed to load Google Workspace Admin credentials: {str(e)}")
        return None, None


def _generate_temp_password(length: int = 12) -> str:
    """Generate a secure temporary password for new users."""
    # Use a mix of letters, numbers, and symbols
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(characters) for _ in range(length))
    return password


def check_user_exists(email: str) -> bool:
    """Check if a user exists in Google Workspace.
    Returns True if user exists, False otherwise.
    Falls back to mock response when Google is not configured.
    """
    if not _WORKSPACE_ENABLED:
        # Mock response for development
        print(f"INFO: Mock check_user_exists for {email} (Google Workspace not enabled)")
        return False
    
    _creds, svc = _load_credentials()
    if svc is None:
        print("ERROR: Google Workspace Admin service not available")
        return False
    
    try:
        # Extract domain from email
        domain = email.split('@')[1] if '@' in email else os.getenv("GOOGLE_WORKSPACE_DOMAIN", "ngicapitaladvisory.com")
        username = email.split('@')[0] if '@' in email else email
        
        # Check if user exists
        user = svc.users().get(userKey=email).execute()
        return user is not None
    except Exception as e:
        # User doesn't exist or other error
        print(f"INFO: User {email} does not exist or error occurred: {str(e)}")
        return False


def create_user(email: str, first_name: str, last_name: str, org_unit: str = "/Students") -> Dict[str, Any]:
    """Create a new user in Google Workspace.
    Returns {email, password, success, message}.
    Falls back to mock user creation when Google is not configured.
    """
    if not _WORKSPACE_ENABLED:
        # Mock user creation for development
        temp_password = _generate_temp_password()
        print(f"INFO: Mock create_user for {email} (Google Workspace not enabled)")
        return {
            "email": email,
            "password": temp_password,
            "success": True,
            "message": "Mock user created successfully"
        }
    
    _creds, svc = _load_credentials()
    if svc is None:
        print("ERROR: Google Workspace Admin service not available")
        return {
            "email": email,
            "password": None,
            "success": False,
            "message": "Google Workspace Admin service not available"
        }
    
    try:
        # Check if user already exists
        if check_user_exists(email):
            return {
                "email": email,
                "password": None,
                "success": False,
                "message": "User already exists"
            }
        
        # Generate temporary password
        temp_password = _generate_temp_password()
        
        # Create user object
        user_body = {
            "primaryEmail": email,
            "name": {
                "givenName": first_name,
                "familyName": last_name,
                "fullName": f"{first_name} {last_name}"
            },
            "password": temp_password,
            "changePasswordAtNextLogin": True,
            "orgUnitPath": org_unit,
            "suspended": False
        }
        
        # Create the user
        result = svc.users().insert(body=user_body).execute()
        
        print(f"INFO: Successfully created user {email} in Google Workspace")
        return {
            "email": email,
            "password": temp_password,
            "success": True,
            "message": "User created successfully",
            "user_id": result.get("id")
        }
        
    except Exception as e:
        print(f"ERROR: Failed to create user {email}: {str(e)}")
        return {
            "email": email,
            "password": None,
            "success": False,
            "message": f"Failed to create user: {str(e)}"
        }


def send_welcome_email(email: str, temp_password: str, instructions: str = "") -> Dict[str, Any]:
    """Send welcome email to new user with login instructions.
    Returns {sent, message}.
    Note: This is a placeholder - actual email sending would require additional setup.
    """
    if not _WORKSPACE_ENABLED:
        print(f"INFO: Mock send_welcome_email to {email} (Google Workspace not enabled)")
        return {
            "sent": True,
            "message": "Mock welcome email sent"
        }
    
    # In a real implementation, you would:
    # 1. Use Gmail API to send email
    # 2. Or use a service like SendGrid, Mailgun, etc.
    # 3. Or use your existing email infrastructure
    
    print(f"INFO: Welcome email would be sent to {email} with password")
    return {
        "sent": True,
        "message": "Welcome email sent (placeholder)"
    }


def provision_user(email: str, first_name: str, last_name: str, org_unit: str = "/Students") -> Dict[str, Any]:
    """Complete user provisioning workflow.
    Creates user and sends welcome email.
    Returns {email, password, success, message}.
    """
    # Create the user
    create_result = create_user(email, first_name, last_name, org_unit)
    
    if not create_result["success"]:
        return create_result
    
    # Send welcome email
    welcome_result = send_welcome_email(
        email=email,
        temp_password=create_result["password"],
        instructions=f"Welcome to NGI Capital Advisory! Your temporary password is: {create_result['password']}. Please change it on first login."
    )
    
    return {
        "email": email,
        "password": create_result["password"],
        "success": True,
        "message": f"User created and welcome email sent. {welcome_result['message']}"
    }
