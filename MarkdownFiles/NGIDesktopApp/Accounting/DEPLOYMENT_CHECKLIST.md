# NGI Capital Accounting Module - Deployment Checklist

**Version:** 1.0.0-rc1  
**Target Environment:** Production  
**Deployment Date:** TBD

---

## Pre-Deployment Checklist

### ✅ Code Quality & Testing

- [ ] **Backend Tests Pass** - All pytest tests passing (target: 90% coverage)
  ```bash
  pytest tests/accounting/ -v --cov=src/api --cov-report=html
  ```

- [ ] **Frontend Tests Pass** - All Jest tests passing (target: 85% coverage)
  ```bash
  cd apps/desktop && npm run test -- --coverage --watchAll=false
  ```

- [ ] **E2E Tests Pass** - All Playwright tests passing
  ```bash
  cd e2e && npx playwright test
  ```

- [ ] **Linting Clean** - No linter errors
  ```bash
  # Frontend
  cd apps/desktop && npm run lint
  
  # Backend
  cd src && flake8 api/ --max-line-length=120
  ```

- [ ] **Type Checking** - TypeScript compilation successful
  ```bash
  cd apps/desktop && npm run type-check
  ```

### ✅ Database

- [ ] **Database Migrations** - All Alembic migrations applied
  ```bash
  alembic upgrade head
  ```

- [ ] **Seed Data** - Essential entities and accounts seeded
  ```bash
  python scripts/seed_accounting_entities.py
  python scripts/update_entity_relationships.py
  python scripts/seed_employees.py
  ```

- [ ] **Database Backup** - Pre-deployment backup taken
  ```bash
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Connection Pool** - Verify `DATABASE_POOL_SIZE` and `DATABASE_MAX_OVERFLOW` set

### ✅ Environment Variables

See `ENVIRONMENT_VARIABLES.md` for complete list.

- [ ] **Backend:**
  - `DATABASE_URL` (PostgreSQL connection string)
  - `CLERK_SECRET_KEY` (Clerk authentication)
  - `CLERK_PUBLISHABLE_KEY` (Clerk frontend)
  - `MERCURY_API_KEY` (Mercury Bank integration)
  - `MERCURY_CLIENT_ID` (Mercury OAuth)
  - `MERCURY_CLIENT_SECRET` (Mercury OAuth)
  - `STORAGE_BACKEND` (AWS S3 or local)
  - `AWS_ACCESS_KEY_ID` (if S3)
  - `AWS_SECRET_ACCESS_KEY` (if S3)
  - `AWS_S3_BUCKET` (if S3)
  - `CORS_ORIGINS` (Frontend URLs)
  - `ENV` (production)
  - `LOG_LEVEL` (info or warning)

- [ ] **Frontend:**
  - `NEXT_PUBLIC_API_URL` (Backend API base URL)
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (Clerk)
  - `NEXT_PUBLIC_STUDENT_BASE_URL` (Student portal URL)
  - `NODE_ENV` (production)

### ✅ Security

- [ ] **Authentication Enabled** - Clerk auth middleware active
  ```python
  # Verify in src/api/main.py
  _OPEN_NON_ACCOUNTING = False  # Must be False for production
  ```

- [ ] **HTTPS Only** - SSL certificates configured
- [ ] **CORS Origins** - Only production domains whitelisted
- [ ] **Secret Rotation** - All API keys and secrets rotated
- [ ] **SQL Injection** - Parameterized queries verified
- [ ] **XSS Protection** - Input sanitization confirmed
- [ ] **CSRF Tokens** - Cross-site request forgery protection enabled

### ✅ Performance

- [ ] **Database Indexes** - All necessary indexes created
  - `ChartOfAccounts.entity_id`
  - `ChartOfAccounts.account_number`
  - `JournalEntry.entity_id`
  - `JournalEntry.entry_date`
  - `JournalEntryLine.account_id`
  - `AccountingDocument.entity_id`
  - `BankTransaction.bank_account_id`

- [ ] **Query Optimization** - Slow query log reviewed
- [ ] **Connection Pooling** - PgBouncer or async pool configured
- [ ] **Frontend Bundle Size** - <500KB initial load
  ```bash
  npm run build && npm run analyze
  ```

- [ ] **CDN** - Static assets served via Vercel Edge Network
- [ ] **Caching** - API response caching configured (if applicable)

### ✅ Monitoring & Logging

- [ ] **Error Tracking** - Sentry configured
  ```bash
  # Verify SENTRY_DSN set
  ```

- [ ] **APM** - Application Performance Monitoring (New Relic/DataDog)
- [ ] **Log Aggregation** - Centralized logging (CloudWatch/Logtail)
- [ ] **Uptime Monitoring** - Pingdom/Better Uptime configured
- [ ] **Alert Channels** - Slack/Email alerts configured

### ✅ Documentation

- [ ] **API Documentation** - Swagger/OpenAPI docs generated
  ```bash
  # Available at /api/docs
  ```

- [ ] **Environment Variables** - `ENVIRONMENT_VARIABLES.md` complete
- [ ] **Deployment Guide** - Step-by-step instructions
- [ ] **Rollback Plan** - Documented revert procedure
- [ ] **Runbook** - Common issues and solutions

### ✅ Compliance & Audit

- [ ] **Audit Trail** - Immutable journal entries verified
- [ ] **Period Lock** - Manual lock working for CFO/Co-Founder
- [ ] **Dual Approval** - Maker-checker workflow tested
- [ ] **Data Retention** - 7-year document retention policy configured
- [ ] **GAAP Compliance** - Financial statements follow US GAAP
  - Balance sheet equation (Assets = Liabilities + Equity)
  - Double-entry bookkeeping (Debits = Credits)
  - Accrual basis accounting

### ✅ User Acceptance Testing (UAT)

- [ ] **Landon (CEO) UAT** - All workflows tested and approved
- [ ] **Andre (CFO) UAT** - Financial reports validated
- [ ] **Accountant Review** - External CPA reviewed outputs
- [ ] **Investor Demo** - Dry run successful

---

## Deployment Steps

### 1. Backend Deployment (Railway/Render/Fly.io)

```bash
# 1. Set environment variables in hosting platform

# 2. Deploy backend
git push railway main  # Or render/fly

# 3. Run migrations
railway run alembic upgrade head

# 4. Seed data (if fresh DB)
railway run python scripts/seed_accounting_entities.py
railway run python scripts/update_entity_relationships.py
railway run python scripts/seed_employees.py

# 5. Verify health
curl https://api.ngicapitaladvisory.com/health
```

### 2. Frontend Deployment (Vercel)

```bash
# 1. Set environment variables in Vercel dashboard

# 2. Deploy frontend
vercel --prod

# 3. Verify deployment
curl https://ngicapitaladvisory.com/accounting
```

### 3. Post-Deployment Verification

```bash
# Test API connectivity
curl https://api.ngicapitaladvisory.com/api/accounting/entities

# Test authentication
# (Manual: Log in via Clerk, verify session)

# Test entity selector
# (Manual: Open /accounting, verify dropdown populated)

# Test journal entry creation
# (Manual: Create and approve a test JE)

# Test financial reporting
# (Manual: Generate Balance Sheet, verify formatting)
```

---

## Post-Deployment Checklist

### Smoke Tests (Critical Path)

- [ ] **Authentication** - Clerk login working
- [ ] **Entity Selector** - All 3 entities (NGI LLC, Advisory, Creator Terminal) visible
- [ ] **Dashboard** - Stats loading correctly
- [ ] **Chart of Accounts** - Tree view rendering
- [ ] **Journal Entry** - Create balanced entry
- [ ] **Approval Workflow** - Submit for approval (Landon → Andre)
- [ ] **Bank Reconciliation** - Mercury sync working
- [ ] **Financial Reporting** - Generate Balance Sheet
- [ ] **Period Close** - Month-end close workflow
- [ ] **Entity Management** - Org chart displaying Landon & Andre

### Performance Validation

- [ ] **Page Load Times** - <2 seconds for all pages
- [ ] **API Response Times** - <500ms for GET requests
- [ ] **Database Query Times** - <100ms for indexed queries
- [ ] **Concurrent Users** - Support 10+ simultaneous users

### Monitoring Setup

- [ ] **Error Rate** - <0.1% error rate
- [ ] **Uptime** - 99.9% uptime (first 30 days)
- [ ] **Apdex Score** - >0.90 (user satisfaction)
- [ ] **Database Connections** - Pool not exhausted

### User Communication

- [ ] **Release Notes** - Sent to Landon & Andre
- [ ] **Training Session** - Scheduled with CFO (Andre)
- [ ] **Support Channel** - Slack channel created (#ngi-accounting-support)
- [ ] **Feedback Loop** - Weekly check-ins scheduled

---

## Rollback Plan

### If Critical Issue Detected:

1. **Immediate Rollback (Vercel)**
   ```bash
   vercel rollback [deployment-url]
   ```

2. **Backend Rollback (Railway)**
   ```bash
   railway rollback
   ```

3. **Database Rollback**
   ```bash
   # Restore from backup
   psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
   
   # Downgrade migrations
   alembic downgrade -1
   ```

4. **Communication**
   - Notify Landon & Andre immediately
   - Post in #engineering channel
   - Document issue in incident log

### Rollback Triggers:

- Authentication failures
- Data corruption detected
- Financial reports showing incorrect balances
- Database connection failures
- >5% error rate for >5 minutes

---

## Environment-Specific Configuration

### Development
```env
ENV=development
DATABASE_URL=postgresql://localhost/ngi_capital_dev
CLERK_SECRET_KEY=sk_test_...
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
LOG_LEVEL=debug
```

### Staging
```env
ENV=staging
DATABASE_URL=postgresql://staging.db.railway.app/ngi_capital_staging
CLERK_SECRET_KEY=sk_test_...
CORS_ORIGINS=https://staging.ngicapitaladvisory.com
LOG_LEVEL=info
```

### Production
```env
ENV=production
DATABASE_URL=postgresql://production.db.railway.app/ngi_capital_prod
CLERK_SECRET_KEY=sk_live_...
CORS_ORIGINS=https://ngicapitaladvisory.com
LOG_LEVEL=warning
```

---

## Success Criteria

### Day 1 (Launch Day)
- [ ] Zero critical bugs
- [ ] All smoke tests passing
- [ ] Landon & Andre successfully complete first journal entry
- [ ] Financial reports match Excel reconciliation

### Week 1
- [ ] <5 minor bugs reported
- [ ] 99.9% uptime achieved
- [ ] All approval workflows functioning
- [ ] First month-end close completed

### Month 1
- [ ] Full accounting cycle completed (Jan 2025)
- [ ] Financial statements reviewed by CPA
- [ ] Investor deck updated with new financials
- [ ] Audit trail validated by external auditor

---

## Support Contacts

**Engineering:**
- Landon Whitworth (CEO & Co-Founder): lwhitworth@ngicapitaladvisory.com
- Primary: [Your contact info]

**Accounting:**
- Andre Nurmamade (CFO & COO): anurmamade@ngicapitaladvisory.com

**External CPA:**
- [CPA Firm Name & Contact]

**Hosting:**
- Vercel Support: support@vercel.com
- Railway Support: team@railway.app

**Third-Party Services:**
- Clerk (Auth): support@clerk.dev
- Mercury Bank: support@mercury.com

---

## Deployment Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CEO & Co-Founder | Landon Whitworth | ____________ | ____ |
| CFO & COO | Andre Nurmamade | ____________ | ____ |
| Lead Engineer | [Your Name] | ____________ | ____ |

---

*Last Updated: October 4, 2025*


