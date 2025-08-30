# NGI Capital Internal Application

A comprehensive financial management system built specifically for NGI Capital Advisory LLC partners (Andre Nurmamade and Landon Whitworth). This application provides secure, GAAP-compliant financial operations with dual authorization controls and complete audit trails.

## Architecture Overview

### Tech Stack
- **Backend**: Python FastAPI with SQLAlchemy ORM
- **Frontend**: Next.js 14+ with React and TypeScript  
- **Database**: SQLite (development) / PostgreSQL (production)
- **Authentication**: JWT with bcrypt password hashing
- **UI Components**: Radix UI + Tailwind CSS
- **State Management**: TanStack Query (React Query)

### Project Structure
```
ngi-capital-internal/
├── src/api/                    # FastAPI backend
│   ├── main.py                 # Main application
│   ├── models.py               # Database models
│   ├── auth.py                 # Authentication logic
│   └── routes/                 # API endpoints
│       └── accounting.py       # Accounting operations
├── src/db/                     # Database layer
│   ├── schema.sql              # Database schema
│   └── migrations/             # Schema migrations
├── src/utils/                  # Shared utilities
│   ├── security.py             # Security utilities
│   └── validators.py           # Business rule validators
├── apps/desktop/               # Next.js frontend
│   ├── src/app/                # App router pages
│   ├── src/components/         # React components
│   └── src/lib/                # Client libraries
│       ├── api.ts              # API client
│       └── auth.tsx            # Authentication context
├── scripts/                    # Automation scripts
│   ├── init_database.py        # Database initialization
│   └── start_app.bat           # Windows startup script
└── requirements.txt            # Python dependencies
```

##  Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or yarn

### Installation & Setup

1. **Clone or extract the project**
   ```bash
   cd "C:\Users\Ochow\Desktop\NGI Capital App"
   ```

2. **Run with Docker (recommended)**
   ```bash
   docker compose build --no-cache
   docker compose up -d
   ```
   - Backend: http://localhost:8001/api/health
   - Frontend: http://localhost:3001

3. **Manual setup (if needed, without Docker)**
   ```bash
   # Backend setup
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   python scripts\init_database.py
   uvicorn src.api.main:app --reload --port 8001
   
   # Frontend setup (in new terminal)
   cd apps\desktop
   npm install
   npm run dev
   ```

### Default Access
- **Application URL**: http://localhost:3001
- **API Documentation**: http://localhost:8011/api/docs
- **Default Credentials**:
  - Andre: `anurmamade@ngicapitaladvisory.com` / `TempPassword123!`
  - Landon: `lwhitworth@ngicapitaladvisory.com` / `TempPassword123!`

## Security Features

### Partner Authentication
- JWT-based authentication with 12-hour expiry
- Partner-only access (verified email domains)
- Secure password hashing with bcrypt
- Session timeout protection

### Business Controls
- **Dual Authorization**: Transactions over $500 require second partner approval
- **Segregation of Duties**: Partners cannot approve their own transactions
- **Audit Trail**: Complete immutable log of all system actions
- **Data Validation**: Comprehensive business rule enforcement

## 📊 Core Features

### Dashboard Module
- Real-time financial metrics
- Cash position by entity
- Pending approvals queue
- Recent transaction summary
- Entity performance overview

### Accounting Module (GAAP Compliant)
- **Chart of Accounts**: 5-digit coding system
- **Journal Entries**: With approval workflow
- **General Ledger**: Immutable audit trail
- **Trial Balance**: Automated report generation
- **Capital Accounts**: LLC capital tracking

### Entity Management
- Multiple business entity support
- Legal entity information storage
- Operating agreement tracking
- Capital structure management
- Inter-entity transaction support

### Banking Integration (Future)
- Mercury Bank API integration ready
- Real-time balance synchronization
- Transaction categorization
- Bank reconciliation tools

### Financial Reporting
- Income Statement (P&L)
- Balance Sheet
- Cash Flow Statement
- Partner Capital Statements
- Custom management reports
- Export capabilities (PDF, Excel)

## 🗄️ Database Schema

### Key Tables
- **partners**: Partner authentication and ownership
- **entities**: Business entity management
- **transactions**: All financial transactions with approval workflow
- **chart_accounts**: GAAP-compliant chart of accounts
- **journal_entries**: Double-entry bookkeeping
- **audit_logs**: Complete system audit trail

### Built-in Validations
- No self-approval constraint
- Balanced journal entries (debits = credits)
- Partner email domain restrictions
- Account code format validation

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
# Security
JWT_SECRET_KEY=your-secret-key
BCRYPT_ROUNDS=12

# Database  
DATABASE_URL=sqlite:///ngi_capital.db

# API
API_HOST=127.0.0.1
API_PORT=8001
```

### Development vs Production
- **Development**: SQLite database, debug logging
- **Production**: PostgreSQL, enhanced security, SSL/TLS

## 🧪 Development

### Running Tests
```bash
# Backend tests
pytest src/tests/

# Frontend tests  
cd apps/desktop
npm test
```

### API Documentation
- Interactive docs available at `/api/docs` when backend is running
- All endpoints require JWT authentication except `/auth/login`

### Database Migrations
```bash
# Create new migration
python scripts/create_migration.py "Description"

# Run migrations
python scripts/run_migrations.py
```

## 📱 Frontend Architecture

### Components Organization
- **Pages**: Next.js 14 app router structure
- **Components**: Reusable UI components with Radix UI
- **Hooks**: Custom React hooks for data fetching
- **Types**: TypeScript interfaces and types

### State Management
- **TanStack Query**: Server state and caching
- **React Context**: Authentication and global state
- **Local State**: Component-level state with useState

### API Integration
- Centralized API client with error handling
- Automatic token management
- Request/response interceptors
- Type-safe API calls

## 🔒 Compliance & Controls

### GAAP Compliance
- Double-entry bookkeeping enforcement
- Revenue recognition controls (ASC 606)
- Fixed asset tracking (ASC 360)
- Cash flow statement generation (ASC 230)

### Internal Controls
- Dual authorization for material transactions
- Document upload requirements
- Segregation of duties enforcement
- Regular backup procedures

### Audit Requirements
- Complete transaction audit trail
- User action logging
- Document version control
- Export capabilities for auditors

## 📈 Business Rules

### Transaction Approval Workflow
1. Partner creates transaction
2. System validates business rules
3. If amount > $500, requires second partner approval
4. Approved transactions post to general ledger
5. All actions logged in audit trail

### Capital Account Management
- Automatic capital balance calculations
- Distribution validation (prevents negative balances)
- Ownership percentage tracking
- Tax reporting preparation (K-1 ready)

## 🚨 Important Security Notes

1. **Change Default Passwords**: First priority after installation
2. **Environment Variables**: Never commit `.env` files to version control
3. **Database Backups**: Implement regular backup procedures
4. **SSL/TLS**: Required for production deployment
5. **IP Restrictions**: Consider implementing IP whitelisting for production

## 📞 Support & Maintenance

### Backup Strategy
- Automated daily database backups
- Transaction log archival
- Document versioning
- Offsite storage recommended

### Monitoring
- Application logs in `/logs` directory
- Error tracking and alerting
- Performance metrics
- Security event monitoring

## 🎯 Success Criteria

- ✅ Secure partner-only access
- ✅ Dual authorization controls
- ✅ GAAP-compliant accounting
- ✅ Complete audit trail
- ✅ Multi-entity support
- ✅ Financial report generation
- ✅ Professional UI/UX

## 📝 License

This application is proprietary software developed exclusively for NGI Capital Advisory LLC. All rights reserved.

## 🤝 Contact

For technical support or business questions:
- Technical: Review implementation documentation
- Business Logic: Consult NGI Capital requirements
- Security: Follow financial industry best practices

---

**Built for NGI Capital Advisory LLC** - Internal Use Only# NGI-Capital-App
# NGI-Capital-App
# NGI-Capital-App
