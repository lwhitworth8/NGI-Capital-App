# NGI Capital Internal Application - Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Python 3.9+ installed
- Node.js 18+ installed
- Git (optional)

### Immediate Launch
```batch
# Double-click or run in terminal:
QUICK_START.bat
```

## 📋 Manual Setup Steps

### 1. Install Python Dependencies
```bash
pip install fastapi uvicorn sqlalchemy passlib python-jose bcrypt pandas openpyxl python-multipart duckdb psycopg2-binary alembic
```

### 2. Install Frontend Dependencies
```bash
cd apps/desktop
npm install
```

### 3. Initialize Database
```bash
python scripts/init_database.py
```

### 4. Start Backend Server
```bash
python -m uvicorn src.api.main:app --reload --port 8000
```

### 5. Start Frontend Server (New Terminal)
```bash
cd apps/desktop
npm run dev
```

## 🔐 Login Credentials

### Partner Accounts
- **Andre Nurmamade**
  - Email: `anurmamade@ngicapitaladvisory.com`
  - Password: `TempPassword123!`
  - Ownership: 50%

- **Landon Whitworth**
  - Email: `lwhitworth@ngicapitaladvisory.com`
  - Password: `TempPassword123!`
  - Ownership: 50%

## 🌐 Access Points

- **Frontend Application**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **API Base URL**: http://localhost:8000/api

## 📁 Project Structure

```
NGI Capital App/
├── src/                     # Backend source code
│   ├── api/                # FastAPI application
│   │   ├── main.py         # Main application
│   │   ├── auth.py         # Authentication
│   │   ├── models.py       # Database models
│   │   └── routes/         # API endpoints
│   ├── db/                 # Database files
│   └── utils/              # Utilities
├── apps/desktop/           # Frontend application
│   ├── src/               # Next.js source
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities
│   └── package.json       # Frontend dependencies
├── scripts/               # Setup scripts
└── QUICK_START.bat       # One-click launcher
```

## 🔧 Configuration

### Environment Variables
Create `.env` file in root:
```env
# Backend
DATABASE_URL=sqlite:///ngi_capital.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=720

# Frontend (apps/desktop/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🛠️ Development Commands

### Backend
```bash
# Run with auto-reload
uvicorn src.api.main:app --reload

# Run tests
pytest tests/

# Database migrations
alembic upgrade head
```

### Frontend
```bash
# Development server
npm run dev

# Production build
npm run build
npm start

# Type checking
npm run type-check
```

## 📊 Key Features

1. **Partner Dashboard** - Real-time metrics and KPIs
2. **Entity Management** - Multi-entity support
3. **GAAP Accounting** - Double-entry bookkeeping
4. **Approval Workflows** - Dual authorization
5. **Financial Reports** - Income statements, balance sheets
6. **Audit Trail** - Complete transaction history
7. **Banking Integration** - Mercury Bank ready
8. **Document Management** - Receipt tracking

## 🔒 Security Features

- JWT authentication (12-hour expiry)
- Partner-only access (@ngicapitaladvisory.com)
- Dual approval for transactions >$500
- No self-approval constraint
- Complete audit logging
- Encrypted passwords (bcrypt)
- Session management

## 📱 Browser Support

- Chrome 90+ (Recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Find and kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Issues
```bash
# Reset database
del ngi_capital.db
python scripts/init_database.py
```

### Dependency Issues
```bash
# Clean install Python deps
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall

# Clean install Node deps
cd apps/desktop
rmdir /s /q node_modules
npm cache clean --force
npm install
```

## 📈 Production Deployment

### Using Docker
```dockerfile
# Backend Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Using PM2
```bash
# Install PM2
npm install -g pm2

# Start services
pm2 start "uvicorn src.api.main:app" --name ngi-backend
pm2 start "npm run start" --name ngi-frontend --cwd apps/desktop
```

## 🎯 Next Steps

1. **Change default passwords immediately**
2. **Set up SSL certificates for HTTPS**
3. **Configure backup strategy**
4. **Set up monitoring and alerts**
5. **Review and test all security controls**
6. **Integrate Mercury Bank API**
7. **Set up regular database backups**

## 📞 Support

For technical issues or questions about the NGI Capital Internal Application, contact your system administrator or refer to the project documentation.