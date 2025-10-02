# Appendix — Security Checklist for NGI Learning Module
**Last Updated:** October 2, 2025  
**Compliance:** OWASP Top 10 2024, GDPR, SOC 2  
**Stack:** FastAPI + Next.js 15 + React 19 + Clerk + PostgreSQL

## 0) Executive Summary

The NGI Learning Module handles sensitive student data, proprietary financial models, and AI-powered feedback. This checklist ensures security controls are implemented across authentication, data protection, API security, file handling, and infrastructure.

**Risk Areas:**
- Student PII and educational records
- Uploaded Excel models containing proprietary analysis
- API keys (OpenAI, GPTZero)
- SQL injection in database queries
- XSS/CSRF in frontend
- Unauthorized access to admin endpoints

---

## 1) OWASP Top 10 (2024) Compliance

### A01:2024 - Broken Access Control

**Risks:**
- Students accessing other students' submissions
- Unauthorized access to admin endpoints
- Privilege escalation

**Controls:**
✅ **Backend (FastAPI):**
```python
# src/api/auth.py
from fastapi import Depends, HTTPException, status
from src.api.dependencies import get_current_user

def require_auth(user = Depends(get_current_user)):
    """Require authenticated user"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

def require_partner_access(user = Depends(require_auth)):
    """Require partner/admin role"""
    if user.role not in ['partner', 'admin']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return user

# Usage in endpoints
@router.get("/api/learning/submissions/{submission_id}")
async def get_submission(
    submission_id: int,
    user = Depends(require_auth),
    db: Session = Depends(get_db)
):
    submission = db.query(LearningSubmission).filter_by(id=submission_id).first()
    
    # Authorization check: user can only access their own submissions
    if submission.user_id != user.id and user.role not in ['partner', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return submission
```

✅ **Frontend (Next.js 15 + Clerk):**
```typescript
// apps/student/src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/learning(.*)',
  '/api/learning(.*)',
]);

const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req)) {
    const { userId, sessionClaims } = await auth();
    if (!userId || sessionClaims?.role !== 'admin') {
      return Response.redirect(new URL('/403', req.url));
    }
  }
  
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

**Testing:**
- [ ] Verify user cannot access other users' submissions via direct URL
- [ ] Verify non-admin cannot access `/api/learning/admin/*` endpoints
- [ ] Test horizontal privilege escalation (user A accessing user B's data)
- [ ] Test vertical privilege escalation (student accessing admin functions)

---

### A02:2024 - Cryptographic Failures

**Risks:**
- Plaintext storage of API keys
- Insecure transmission of sensitive data
- Weak encryption algorithms

**Controls:**
✅ **Environment Variables (Never Commit to Git):**
```bash
# .env (NEVER commit this file)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx
GPTZERO_API_KEY=xxxxxxxxxxxxxxxxxxxx
DATABASE_URL=postgresql://user:password@localhost/ngi_capital
JWT_SECRET=xxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxx
```

✅ **Environment Variable Access:**
```python
# src/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    openai_api_key: str
    gptzero_api_key: str
    database_url: str
    jwt_secret: str
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings():
    return Settings()

# Usage
settings = get_settings()
openai.api_key = settings.openai_api_key  # NEVER hardcode
```

✅ **HTTPS Enforcement:**
```python
# src/main.py
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

if not settings.debug:
    app.add_middleware(HTTPSRedirectMiddleware)
```

✅ **Password Hashing (Clerk handles this, but for reference):**
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Hash password
hashed = pwd_context.hash("plaintext_password")

# Verify
pwd_context.verify("plaintext_password", hashed)
```

**Testing:**
- [ ] Verify `.env` is in `.gitignore`
- [ ] Verify no API keys in source code (grep for sk-, api_key)
- [ ] Verify HTTPS enforced in production
- [ ] Verify database connections use SSL/TLS
- [ ] Test that encrypted data cannot be read if DB is compromised

---

### A03:2024 - Injection (SQL, NoSQL, Command)

**Risks:**
- SQL injection via unsanitized user input
- Command injection in file processing

**Controls:**
✅ **SQLAlchemy ORM (Parameterized Queries):**
```python
# GOOD: Using ORM (parameterized automatically)
submissions = db.query(LearningSubmission).filter(
    LearningSubmission.user_id == user.id,
    LearningSubmission.activity_id == activity_id
).all()

# BAD: Raw SQL with string formatting (NEVER DO THIS)
# query = f"SELECT * FROM learning_submissions WHERE user_id = {user.id}"  # VULNERABLE!

# GOOD: Raw SQL with parameters (if needed)
from sqlalchemy import text
result = db.execute(
    text("SELECT * FROM learning_submissions WHERE user_id = :user_id"),
    {"user_id": user.id}
)
```

✅ **Input Validation with Pydantic v2:**
```python
from pydantic import BaseModel, Field, validator
from typing import Literal

class SubmissionCreate(BaseModel):
    activity_id: str = Field(..., pattern=r'^[a-z0-9_]+$', max_length=100)
    submission_type: Literal['excel', 'pdf_memo', 'pdf_deck']
    submission_notes: str = Field(default="", max_length=1000)
    
    @validator('activity_id')
    def validate_activity_id(cls, v):
        allowed_activities = ['a1_drivers_map', 'a2_wc_debt', 'a3_projections', 'a4_dcf', 'a5_comps', 'capstone']
        if v not in allowed_activities:
            raise ValueError(f"Invalid activity_id: {v}")
        return v
```

✅ **Command Injection Prevention (File Processing):**
```python
import subprocess
import shlex

# BAD: Shell injection risk
# subprocess.run(f"pdfplumber extract {filename}", shell=True)  # VULNERABLE!

# GOOD: No shell, explicit arguments
subprocess.run(
    ["pdfplumber", "extract", filename],
    shell=False,  # Critical: no shell
    timeout=30,
    capture_output=True
)

# GOOD: Whitelist file paths
import os
UPLOAD_DIR = "/var/uploads/learning/"

def safe_file_path(filename: str) -> str:
    # Remove path traversal attempts
    filename = os.path.basename(filename)
    # Whitelist allowed characters
    if not re.match(r'^[a-zA-Z0-9_\-\.]+$', filename):
        raise ValueError("Invalid filename")
    return os.path.join(UPLOAD_DIR, filename)
```

**Testing:**
- [ ] Run SQLMap against all API endpoints
- [ ] Test SQL injection payloads: `' OR 1=1--`, `'; DROP TABLE--`
- [ ] Test path traversal: `../../etc/passwd`
- [ ] Test command injection in file upload filenames
- [ ] Verify all user inputs validated with Pydantic

---

### A04:2024 - Insecure Design

**Risks:**
- Business logic flaws
- Missing rate limiting
- Insufficient logging

**Controls:**
✅ **Rate Limiting:**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Apply to endpoints
@router.post("/api/learning/ai-coach")
@limiter.limit("50/hour")  # 50 requests per hour per IP
async def ai_coach(
    request: Request,
    user = Depends(require_auth)
):
    # AI coaching logic
    pass

@router.post("/api/learning/submit")
@limiter.limit("10/hour")  # 10 submissions per hour
async def submit_activity(
    request: Request,
    user = Depends(require_auth)
):
    # Submission logic
    pass
```

✅ **Logging (Structured with No PII):**
```python
import structlog

logger = structlog.get_logger()

# GOOD: No PII in logs
logger.info("submission_created", user_id=user.id, activity_id=activity_id, file_size=file_size)

# BAD: PII in logs (NEVER do this)
# logger.info(f"User {user.email} submitted {filename}")  # Leaks PII!

# Mask sensitive data if needed
def mask_email(email: str) -> str:
    parts = email.split('@')
    return f"{parts[0][:2]}***@{parts[1]}"

logger.info("user_action", user_email=mask_email(user.email))
```

✅ **Business Logic Validation:**
```python
@router.post("/api/learning/submit")
async def submit_activity(
    submission: SubmissionCreate,
    user = Depends(require_auth),
    db: Session = Depends(get_db)
):
    # Business rule: Cannot submit capstone before completing A1-A5
    if submission.activity_id == 'capstone':
        progress = db.query(LearningProgress).filter_by(user_id=user.id).first()
        if progress.activities_completed < 5:
            raise HTTPException(
                status_code=400,
                detail="Must complete activities A1-A5 before capstone"
            )
    
    # Business rule: Max 10 submissions per activity
    submission_count = db.query(LearningSubmission).filter(
        LearningSubmission.user_id == user.id,
        LearningSubmission.activity_id == submission.activity_id
    ).count()
    
    if submission_count >= 10:
        raise HTTPException(
            status_code=429,
            detail="Maximum 10 submissions per activity reached"
        )
    
    # Proceed with submission
    ...
```

**Testing:**
- [ ] Test rate limiting with automated tools (ApacheBench)
- [ ] Verify logs contain no PII (email, phone, SSN)
- [ ] Test business logic edge cases (submit capstone without prerequisites)
- [ ] Verify proper error messages (no stack traces to users)

---

### A05:2024 - Security Misconfiguration

**Risks:**
- Default credentials
- Verbose error messages
- Unnecessary services enabled

**Controls:**
✅ **Production Configuration:**
```python
# src/config.py
class Settings(BaseSettings):
    debug: bool = False  # NEVER True in production
    environment: str = "production"
    cors_origins: list[str] = ["https://student.ngicapital.com"]
    
    # Security headers
    security_headers: dict = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
    }
```

✅ **CORS Configuration:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,  # Specific origins only
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

✅ **Error Handling (No Stack Traces to Users):**
```python
from fastapi import Request, status
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Log full error server-side
    logger.error("unhandled_exception", exc_info=exc, path=request.url.path)
    
    # Return generic error to user (no details)
    if settings.debug:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": str(exc)}  # Only in dev
        )
    else:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"}  # Generic in prod
        )
```

**Testing:**
- [ ] Verify debug mode disabled in production
- [ ] Test that error messages don't reveal stack traces
- [ ] Verify CORS only allows whitelisted origins
- [ ] Check security headers present (use securityheaders.com)
- [ ] Verify unnecessary endpoints disabled (e.g., /docs in prod)

---

### A06:2024 - Vulnerable and Outdated Components

**Risks:**
- Known vulnerabilities in dependencies
- Outdated Python/Node packages

**Controls:**
✅ **Dependency Management:**
```bash
# Python: Pin versions in requirements.txt
fastapi==0.118.0
sqlalchemy>=2.0.40,<3
pydantic>=2.10.6,<3
cryptography>=44.0.0,<45

# Node: Use package-lock.json and audit
npm audit
npm audit fix

# Python: Use pip-audit and Snyk
pip install pip-audit
pip-audit
```

✅ **Automated Scanning (CI/CD):**
```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on: [push, pull_request]

jobs:
  python-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run pip-audit
        run: |
          pip install pip-audit
          pip-audit -r requirements.txt
      
      - name: Run Snyk
        uses: snyk/actions/python@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  
  node-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run npm audit
        run: |
          cd apps/student
          npm audit --audit-level=moderate
```

✅ **Update Schedule:**
- Monthly: Review and update dependencies
- Weekly: Check for critical CVEs
- Immediate: Patch zero-day vulnerabilities

**Testing:**
- [ ] Run `pip-audit` and fix high/critical vulnerabilities
- [ ] Run `npm audit` and fix high/critical vulnerabilities
- [ ] Verify no dependencies with known CVEs in production
- [ ] Subscribe to security advisories (GitHub, Snyk)

---

### A07:2024 - Identification and Authentication Failures

**Risks:**
- Weak password policies
- Session fixation
- Credential stuffing

**Controls:**
✅ **Clerk Authentication (Delegated):**
```typescript
// apps/student/src/app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

✅ **Backend JWT Verification:**
```python
from clerk_backend_api import Clerk
from fastapi import Header, HTTPException

clerk = Clerk(bearer_auth=settings.clerk_secret_key)

async def get_current_user(authorization: str = Header(...)):
    try:
        token = authorization.split("Bearer ")[1]
        session = clerk.sessions.verify_token(token)
        user_id = session.user_id
        
        # Fetch user from database
        user = db.query(Student).filter_by(clerk_user_id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")
```

✅ **Session Security:**
- Session timeout: 24 hours
- Require re-authentication for sensitive actions
- Logout on password change

**Testing:**
- [ ] Verify JWT tokens expire after 24 hours
- [ ] Test that invalid tokens are rejected
- [ ] Test session fixation attacks
- [ ] Verify Clerk MFA settings enforced for admins

---

### A08:2024 - Software and Data Integrity Failures

**Risks:**
- Unsigned uploads (malicious Excel files)
- CI/CD pipeline compromise
- Insecure deserialization

**Controls:**
✅ **File Upload Validation:**
```python
import magic
from pathlib import Path

ALLOWED_EXTENSIONS = {'.xlsx', '.pdf'}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB for Excel, 25 MB for PDF

async def validate_upload(file: UploadFile):
    # Check extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type: {file_ext}")
    
    # Check size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset
    
    max_size = 500_000_000 if file_ext == '.xlsx' else 25_000_000
    if file_size > max_size:
        raise HTTPException(status_code=413, detail="File too large")
    
    # Check MIME type (magic bytes)
    file_content = await file.read(2048)
    file.file.seek(0)
    
    mime = magic.from_buffer(file_content, mime=True)
    expected_mimes = {
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.pdf': 'application/pdf'
    }
    
    if mime != expected_mimes.get(file_ext):
        raise HTTPException(status_code=400, detail=f"File content mismatch: expected {expected_mimes[file_ext]}, got {mime}")
    
    return True
```

✅ **Virus Scanning (ClamAV Integration):**
```python
import clamd

clam = clamd.ClamDaemon()

async def scan_file(file_path: str):
    result = clam.scan(file_path)
    if result[file_path][0] == 'FOUND':
        logger.warning("malware_detected", file=file_path, virus=result[file_path][1])
        os.remove(file_path)
        raise HTTPException(status_code=400, detail="Malicious file detected")
    return True
```

✅ **File Hash Storage:**
```python
import hashlib

def compute_file_hash(file_path: str) -> str:
    sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256.update(chunk)
    return sha256.hexdigest()

# Store hash in database
submission.file_hash = compute_file_hash(file_path)
```

**Testing:**
- [ ] Upload test malware (EICAR test file)
- [ ] Upload files with wrong extensions (.exe renamed to .xlsx)
- [ ] Upload oversized files
- [ ] Verify file hashes stored and validated

---

### A09:2024 - Security Logging and Monitoring Failures

**Risks:**
- Insufficient logging of security events
- No alerting on anomalies
- Log injection attacks

**Controls:**
✅ **Security Event Logging:**
```python
import structlog

security_logger = structlog.get_logger("security")

# Log authentication events
security_logger.info("auth_success", user_id=user.id, ip=request.client.host)
security_logger.warning("auth_failure", attempted_user=username, ip=request.client.host)

# Log authorization failures
security_logger.warning("authz_failure", user_id=user.id, resource=submission_id, action="read")

# Log file uploads
security_logger.info("file_upload", user_id=user.id, filename=file.filename, size=file_size, mime=mime_type)

# Log admin actions
security_logger.info("admin_action", admin_id=admin.id, action="delete_submission", target_id=submission_id)
```

✅ **Monitoring & Alerting:**
```python
from prometheus_client import Counter, Histogram

# Metrics
auth_failures = Counter('auth_failures_total', 'Total authentication failures', ['user_id'])
submission_uploads = Histogram('submission_upload_duration_seconds', 'Submission upload duration')

# Increment metrics
auth_failures.labels(user_id=user.id).inc()

# Alerting rules (Prometheus/Grafana)
# - Alert if >10 auth failures in 5 minutes
# - Alert if file upload >2GB
# - Alert if validator pass rate <90%
```

✅ **Log Sanitization:**
```python
import re

def sanitize_log_input(user_input: str) -> str:
    # Remove newlines and control characters to prevent log injection
    return re.sub(r'[\n\r\t]', '', user_input)

logger.info("user_search", query=sanitize_log_input(search_query))
```

**Testing:**
- [ ] Verify all security events logged (auth, authz, uploads, admin actions)
- [ ] Test log injection with newline characters
- [ ] Verify logs stored securely (encrypted at rest)
- [ ] Test alerting rules trigger correctly

---

### A10:2024 - Server-Side Request Forgery (SSRF)

**Risks:**
- Internal network scanning via user-supplied URLs
- Cloud metadata service access

**Controls:**
✅ **URL Validation:**
```python
from urllib.parse import urlparse
import ipaddress

ALLOWED_SCHEMES = ['https']
BLOCKED_CIDRS = [
    ipaddress.ip_network('127.0.0.0/8'),   # Localhost
    ipaddress.ip_network('10.0.0.0/8'),    # Private
    ipaddress.ip_network('172.16.0.0/12'), # Private
    ipaddress.ip_network('192.168.0.0/16'),# Private
    ipaddress.ip_network('169.254.0.0/16'),# Link-local (AWS metadata)
]

async def fetch_external_url(url: str):
    parsed = urlparse(url)
    
    # Check scheme
    if parsed.scheme not in ALLOWED_SCHEMES:
        raise ValueError(f"Invalid scheme: {parsed.scheme}")
    
    # Resolve hostname to IP
    try:
        ip = ipaddress.ip_address(socket.gethostbyname(parsed.hostname))
    except:
        raise ValueError("Cannot resolve hostname")
    
    # Check against blocked CIDRs
    for cidr in BLOCKED_CIDRS:
        if ip in cidr:
            raise ValueError(f"Blocked IP: {ip}")
    
    # Safe to fetch
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url)
        return response
```

**Testing:**
- [ ] Test SSRF with localhost URLs (http://127.0.0.1)
- [ ] Test AWS metadata URL (http://169.254.169.254/latest/meta-data/)
- [ ] Test private IP ranges
- [ ] Verify only HTTPS allowed

---

## 2) Frontend Security (Next.js 15 + React 19)

### XSS (Cross-Site Scripting) Prevention

✅ **React Auto-Escaping:**
```typescript
// SAFE: React escapes by default
function StudentName({ name }: { name: string }) {
  return <h1>{name}</h1>;  // Escaped automatically
}

// DANGEROUS: dangerouslySetInnerHTML
function UnsafeHTML({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;  // AVOID!
}

// SAFE: Use DOMPurify if you must render HTML
import DOMPurify from 'dompurify';

function SafeHTML({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

### CSRF (Cross-Site Request Forgery) Prevention

✅ **SameSite Cookies:**
```typescript
// Clerk handles this, but for reference:
// Set cookies with SameSite=Strict or Lax
document.cookie = "session=abc123; SameSite=Strict; Secure; HttpOnly";
```

✅ **CSRF Tokens (if needed):**
```python
from fastapi_csrf_protect import CsrfProtect

@app.post("/api/learning/submit")
async def submit(csrf_protect: CsrfProtect = Depends()):
    await csrf_protect.validate_csrf(request)
    # Process submission
```

### Content Security Policy (CSP)

✅ **Next.js Configuration:**
```typescript
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.clerk.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Testing:**
- [ ] Test XSS payloads: `<script>alert('XSS')</script>`
- [ ] Verify CSP blocks inline scripts
- [ ] Test CSRF with cross-origin requests
- [ ] Verify all cookies have Secure and HttpOnly flags

---

## 3) API Security Checklist

- [ ] All endpoints require authentication (except public routes)
- [ ] Authorization checks on every resource access
- [ ] Rate limiting applied to sensitive endpoints
- [ ] Input validation with Pydantic on all request bodies
- [ ] SQL queries use parameterized statements (ORM)
- [ ] File uploads validated (extension, MIME, size, virus scan)
- [ ] API keys stored in environment variables, never in code
- [ ] CORS configured with specific origins (no wildcard)
- [ ] HTTPS enforced in production
- [ ] Security headers set (HSTS, X-Content-Type-Options, etc.)
- [ ] Error messages don't reveal sensitive info
- [ ] Logging excludes PII
- [ ] JWT tokens have reasonable expiration (24 hours)
- [ ] No default credentials or test accounts in production

---

## 4) Database Security Checklist

- [ ] Database connections use SSL/TLS
- [ ] Database user has minimal permissions (no DROP, ALTER in app user)
- [ ] Sensitive columns encrypted at rest (API keys, tokens)
- [ ] Foreign keys enforce referential integrity
- [ ] Cascade deletes for GDPR compliance (user deletion)
- [ ] Automated backups with encryption
- [ ] Backup restore tested monthly
- [ ] No SQL queries with string interpolation (use ORM or parameters)
- [ ] Database audit logging enabled
- [ ] Database firewall rules restrict access to app servers only

---

## 5) Infrastructure Security Checklist

- [ ] Servers patched monthly (OS, packages)
- [ ] SSH keys only, no password authentication
- [ ] Firewall rules: only ports 80, 443, 22 (from bastion) open
- [ ] Intrusion detection system (IDS) enabled
- [ ] WAF (Web Application Firewall) in front of app
- [ ] DDoS protection enabled
- [ ] Secrets managed via vault (AWS Secrets Manager, HashiCorp Vault)
- [ ] Container images scanned for vulnerabilities (Snyk, Trivy)
- [ ] Kubernetes network policies restrict pod-to-pod communication
- [ ] Service mesh (Istio) for mTLS between services

---

## 6) GDPR Compliance Checklist

- [ ] Privacy policy published and accessible
- [ ] Consent obtained for data collection
- [ ] User can export their data (data portability)
- [ ] User can delete their account and all data (right to be forgotten)
- [ ] Data retention policy documented and enforced
- [ ] PII encrypted at rest and in transit
- [ ] Access logs maintained for auditing
- [ ] Data processing agreement (DPA) with vendors (OpenAI, GPTZero)
- [ ] Breach notification process documented (72 hours)
- [ ] Data protection officer (DPO) designated

---

## 7) Incident Response Plan

**Phases:**
1. **Detection:** Monitoring alerts, user reports
2. **Containment:** Isolate affected systems
3. **Eradication:** Remove threat, patch vulnerability
4. **Recovery:** Restore services, verify integrity
5. **Lessons Learned:** Post-mortem, update security controls

**Contacts:**
- Security Lead: [security@ngicapital.com]
- Incident Commander: [incidents@ngicapital.com]
- Legal/Compliance: [legal@ngicapital.com]

**Runbooks:**
- Data breach response
- Malware infection response
- DDoS attack response
- Insider threat response

---

## 8) Security Audit Schedule

**Monthly:**
- Dependency vulnerability scans (pip-audit, npm audit, Snyk)
- Review access logs for anomalies
- Test backup restore

**Quarterly:**
- Penetration testing (external vendor)
- Security training for developers
- Review and update security policies

**Annually:**
- Full security audit (SOC 2 Type II)
- Red team exercise
- Disaster recovery drill

---

**This security checklist ensures the NGI Learning Module meets industry standards for data protection, privacy, and resilience against modern threats.**

