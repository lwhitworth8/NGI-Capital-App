# NGI Capital - Environment Variables Documentation

**Last Updated:** October 4, 2025  
**Version:** 1.0.0-rc1

---

## Backend Environment Variables

### Core Application

```bash
# Environment
ENV=production  # development, staging, production

# Server
HOST=0.0.0.0
PORT=8000

# Logging
LOG_LEVEL=info  # debug, info, warning, error, critical
LOG_FORMAT=json  # json, text
```

### Database

```bash
# PostgreSQL Connection
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/ngi_capital_prod

# Connection Pool Settings
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10
DATABASE_POOL_TIMEOUT=30  # seconds
DATABASE_POOL_RECYCLE=3600  # seconds (1 hour)

# SQLite (Development Only)
# DATABASE_URL=sqlite+aiosqlite:///./data/ngi_capital.db
```

### Authentication (Clerk)

```bash
# Clerk Secret Key (Backend)
CLERK_SECRET_KEY=sk_live_...  # Production: sk_live_... | Dev: sk_test_...

# Clerk Publishable Key (Frontend consumption)
CLERK_PUBLISHABLE_KEY=pk_live_...  # Production: pk_live_... | Dev: pk_test_...

# Clerk JWT Verification
CLERK_JWT_ISSUER=https://clerk.ngicapitaladvisory.com
CLERK_API_URL=https://api.clerk.dev/v1

# Development Authentication Bypass
OPEN_NON_ACCOUNTING=False  # MUST be False in production
```

### CORS & Security

```bash
# CORS Allowed Origins (Comma-separated)
CORS_ORIGINS=https://ngicapitaladvisory.com,https://www.ngicapitaladvisory.com,https://student.ngicapitaladvisory.com

# CORS Settings
CORS_ALLOW_CREDENTIALS=true
CORS_ALLOW_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_ALLOW_HEADERS=*

# Security Headers
SECURE_HEADERS=true
```

### File Storage

```bash
# Storage Backend
STORAGE_BACKEND=s3  # s3, local

# AWS S3 (if STORAGE_BACKEND=s3)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=ngi-capital-documents-prod
AWS_S3_REGION=us-east-1
AWS_S3_ENDPOINT_URL=https://s3.amazonaws.com  # Optional: For S3-compatible services

# Local Storage (if STORAGE_BACKEND=local)
LOCAL_STORAGE_PATH=./uploads
```

### Mercury Bank Integration

```bash
# Mercury API
MERCURY_API_KEY=...
MERCURY_API_URL=https://api.mercury.com/api/v1

# Mercury OAuth
MERCURY_CLIENT_ID=...
MERCURY_CLIENT_SECRET=...
MERCURY_REDIRECT_URI=https://ngicapitaladvisory.com/api/accounting/mercury/callback

# Mercury Sync Settings
MERCURY_AUTO_SYNC=true
MERCURY_SYNC_FREQUENCY=daily  # hourly, daily, manual
```

### Email (Optional for v1)

```bash
# Email Provider
EMAIL_PROVIDER=sendgrid  # sendgrid, ses, smtp

# SendGrid
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@ngicapitaladvisory.com
SENDGRID_FROM_NAME=NGI Capital

# AWS SES
AWS_SES_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@ngicapitaladvisory.com

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_TLS=true
```

### Monitoring & Error Tracking

```bash
# Sentry
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production  # development, staging, production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% transaction sampling
SENTRY_PROFILES_SAMPLE_RATE=0.1  # 10% profile sampling

# Application Performance Monitoring (Optional)
NEW_RELIC_LICENSE_KEY=...
NEW_RELIC_APP_NAME=ngi-capital-backend-prod

# DataDog (Alternative APM)
DD_API_KEY=...
DD_APP_KEY=...
DD_SERVICE=ngi-capital-backend
DD_ENV=production
```

### Feature Flags (Optional)

```bash
# Accounting Features
FEATURE_ENTITY_CONVERSION=false  # Enable LLC to C-Corp conversion
FEATURE_CONSOLIDATED_REPORTING=true  # Enable consolidated financials
FEATURE_MERCURY_SYNC=true  # Enable Mercury bank sync

# Development Features
FEATURE_DEBUG_TOOLBAR=false  # MUST be false in production
FEATURE_API_DOCS=true  # Swagger/OpenAPI docs at /docs
```

### Rate Limiting (Optional)

```bash
# API Rate Limits
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
```

---

## Frontend Environment Variables (Next.js)

### Core Application

```bash
# Node Environment
NODE_ENV=production  # development, production

# App URL
NEXT_PUBLIC_APP_URL=https://ngicapitaladvisory.com

# API Base URL
NEXT_PUBLIC_API_URL=https://api.ngicapitaladvisory.com
NEXT_PUBLIC_API_BASE_URL=https://api.ngicapitaladvisory.com/api/v1  # Legacy
```

### Authentication (Clerk)

```bash
# Clerk Publishable Key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...  # Production: pk_live_... | Dev: pk_test_...

# Clerk Sign-In/Sign-Up URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

### Student Portal

```bash
# Student Portal URL
NEXT_PUBLIC_STUDENT_BASE_URL=https://student.ngicapitaladvisory.com
```

### Analytics (Optional)

```bash
# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...

# Mixpanel
NEXT_PUBLIC_MIXPANEL_TOKEN=...

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Feature Flags

```bash
# Accounting Features
NEXT_PUBLIC_FEATURE_ACCOUNTING=true
NEXT_PUBLIC_FEATURE_ENTITY_MANAGEMENT=true
NEXT_PUBLIC_FEATURE_BANK_RECONCILIATION=true
```

### Error Tracking

```bash
# Sentry (Frontend)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=ngi-capital
SENTRY_PROJECT=ngi-capital-frontend
SENTRY_AUTH_TOKEN=...  # Build-time only, not public
```

---

## Environment-Specific Values

### Development

```bash
# Backend
ENV=development
DATABASE_URL=sqlite+aiosqlite:///./data/ngi_capital.db
CLERK_SECRET_KEY=sk_test_...
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:8000
LOG_LEVEL=debug
OPEN_NON_ACCOUNTING=True  # Auth bypass for dev
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./uploads
SENTRY_DSN=  # Disabled in dev (or use separate project)

# Frontend
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STUDENT_BASE_URL=http://localhost:3001
```

### Staging

```bash
# Backend
ENV=staging
DATABASE_URL=postgresql+asyncpg://user:pass@staging.db.railway.app/ngi_capital_staging
CLERK_SECRET_KEY=sk_test_...  # Can use test keys for staging
CORS_ORIGINS=https://staging.ngicapitaladvisory.com
LOG_LEVEL=info
OPEN_NON_ACCOUNTING=False
STORAGE_BACKEND=s3
AWS_S3_BUCKET=ngi-capital-documents-staging
SENTRY_ENVIRONMENT=staging

# Frontend
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api-staging.ngicapitaladvisory.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STUDENT_BASE_URL=https://student-staging.ngicapitaladvisory.com
```

### Production

```bash
# Backend
ENV=production
DATABASE_URL=postgresql+asyncpg://user:pass@production.db.railway.app/ngi_capital_prod
CLERK_SECRET_KEY=sk_live_...
CORS_ORIGINS=https://ngicapitaladvisory.com,https://www.ngicapitaladvisory.com
LOG_LEVEL=warning
OPEN_NON_ACCOUNTING=False  # CRITICAL: Must be False
STORAGE_BACKEND=s3
AWS_S3_BUCKET=ngi-capital-documents-prod
MERCURY_AUTO_SYNC=true
SENTRY_ENVIRONMENT=production

# Frontend
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.ngicapitaladvisory.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STUDENT_BASE_URL=https://student.ngicapitaladvisory.com
```

---

## Secrets Management

### Development
- `.env` file (NOT committed to git)
- `.env.local` (Next.js local overrides)

### Staging/Production
- **Vercel:** Environment variables in dashboard
- **Railway:** Environment variables in project settings
- **AWS Secrets Manager:** For sensitive keys (Mercury, AWS)
- **1Password/Vault:** Team secret sharing

---

## Security Best Practices

### Critical Rules

1. **Never commit secrets to git**
   - Add `.env` to `.gitignore`
   - Use `.env.example` for templates

2. **Rotate secrets regularly**
   - API keys: Every 90 days
   - Database passwords: Every 180 days
   - Clerk keys: Annual rotation

3. **Use different keys per environment**
   - Dev: `sk_test_...` / `pk_test_...`
   - Staging: `sk_test_...` / `pk_test_...`
   - Production: `sk_live_...` / `pk_live_...`

4. **Restrict CORS origins**
   - Only list production domains
   - Never use `*` wildcards

5. **Enable HTTPS only**
   - No HTTP in production
   - Force HTTPS redirects

### Validation

```bash
# Check for exposed secrets (use git-secrets or truffleHog)
git secrets --scan

# Validate environment variables
python scripts/validate_env.py

# Test frontend env vars
npm run validate-env
```

---

## Environment Variable Templates

### `.env.example` (Backend)

```bash
# Core
ENV=development
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/ngi_capital_dev

# Authentication
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
OPEN_NON_ACCOUNTING=True

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Storage
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./uploads

# Mercury Bank
MERCURY_API_KEY=
MERCURY_CLIENT_ID=
MERCURY_CLIENT_SECRET=

# Monitoring
SENTRY_DSN=
LOG_LEVEL=debug
```

### `.env.local.example` (Frontend)

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Student Portal
NEXT_PUBLIC_STUDENT_BASE_URL=http://localhost:3001
```

---

## Troubleshooting

### Common Issues

**1. Authentication 401 Errors**
```bash
# Check Clerk keys match
echo $CLERK_SECRET_KEY  # Backend
echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  # Frontend

# Verify keys are from same Clerk application
```

**2. CORS Errors**
```bash
# Verify frontend URL is in CORS_ORIGINS
echo $CORS_ORIGINS

# Ensure no trailing slashes
# ✅ Correct: https://ngicapitaladvisory.com
# ❌ Wrong: https://ngicapitaladvisory.com/
```

**3. Database Connection Failures**
```bash
# Test connection
psql $DATABASE_URL

# Check connection pool settings
echo $DATABASE_POOL_SIZE
echo $DATABASE_MAX_OVERFLOW
```

**4. File Upload Failures**
```bash
# Verify storage backend
echo $STORAGE_BACKEND

# If S3: Check AWS credentials
aws s3 ls s3://$AWS_S3_BUCKET

# If local: Check directory permissions
ls -la $LOCAL_STORAGE_PATH
```

---

## Reference Commands

### Set Environment Variables (Railway)
```bash
railway variables set DATABASE_URL="postgresql://..."
railway variables set CLERK_SECRET_KEY="sk_live_..."
```

### Set Environment Variables (Vercel)
```bash
vercel env add NEXT_PUBLIC_API_URL production
# Then paste value when prompted

# Or use Vercel dashboard
```

### List All Environment Variables
```bash
# Railway
railway variables

# Vercel
vercel env ls
```

---

*Keep this document updated as new environment variables are added.*


