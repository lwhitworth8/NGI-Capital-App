# NGI Capital Desktop Application

A comprehensive internal management system for NGI Capital Advisory LLC partners built with Next.js 14 and TypeScript.

## Features

### 🏢 **Dashboard**
- Total Assets Under Management widget
- Monthly Revenue/Expenses chart with Recharts
- Cash Position by Entity display
- Pending Approvals management
- Recent Transactions table
- Entity Performance Overview

### 🗂️ **Entity Management**
- Multiple business entity management
- Entity information and structure
- Capital tracking for LLCs
- Inter-entity transaction support

### 💰 **Financial Management**
- GAAP compliant accounting system
- Chart of Accounts with 5-digit coding
- Journal Entries with approval workflow
- General Ledger with audit trail
- Real-time financial reporting

### 🏦 **Banking Integration**
- Mercury Bank API integration (planned)
- Real-time balance synchronization
- Transaction categorization
- Bank reconciliation tools

### 🔐 **Security & Compliance**
- Partner-only access with JWT authentication
- Segregation of duties (no self-approval)
- Dual authorization for transactions > $500
- Complete audit trail
- Encrypted data transmission

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with dark mode support
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **State Management**: React Context
- **HTTP Client**: Axios
- **Forms**: React Hook Form with Zod validation

## Project Structure

```
apps/desktop/src/
├── app/
│   ├── (modules)/
│   │   ├── dashboard/          # Main dashboard
│   │   ├── accounting/         # Accounting modules
│   │   ├── entities/           # Entity management
│   │   ├── banking/           # Banking features
│   │   └── reports/           # Financial reports
│   ├── login/                 # Authentication
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home page (redirects)
│   └── globals.css            # Global styles
├── components/
│   ├── layout/                # Layout components
│   │   ├── AppLayout.tsx      # Main app layout
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   ├── Header.tsx         # Top header with user info
│   │   └── ProtectedRoute.tsx # Authentication wrapper
│   ├── dashboard/             # Dashboard-specific components
│   │   ├── MetricCard.tsx     # KPI display cards
│   │   ├── RevenueExpenseChart.tsx
│   │   ├── CashPositionWidget.tsx
│   │   ├── PendingApprovalsWidget.tsx
│   │   ├── RecentTransactionsWidget.tsx
│   │   └── EntityPerformanceWidget.tsx
│   └── ui/                    # Reusable UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       ├── DataTable.tsx
│       └── LoadingSpinner.tsx
├── lib/
│   ├── context/               # React Context providers
│   │   ├── AppContext.tsx     # Global app state
│   │   └── ThemeContext.tsx   # Theme management
│   ├── api.ts                 # API client
│   └── utils.ts               # Utility functions
├── hooks/                     # Custom React hooks
├── types/                     # TypeScript definitions
└── ...
```

## Key Components

### Layout System
- **AppLayout**: Main application shell with sidebar and header
- **Sidebar**: Collapsible navigation with module organization
- **Header**: Top bar with user info, entity selector, notifications
- **ProtectedRoute**: Authentication wrapper for secure pages

### Dashboard Widgets
- **MetricCard**: Reusable KPI display with trend indicators
- **RevenueExpenseChart**: Interactive bar chart for financial data
- **CashPositionWidget**: Entity cash position overview
- **PendingApprovalsWidget**: Transaction approval management
- **RecentTransactionsWidget**: Latest transaction history
- **EntityPerformanceWidget**: Multi-entity performance comparison

### UI Components
- **DataTable**: Advanced table with search, sort, pagination
- **Button**: Consistent button component with variants
- **Input**: Form input with validation and icons
- **Card**: Content container with header/body/footer
- **Modal**: Overlay dialogs with size variants
- **LoadingSpinner**: Loading states and skeleton screens

## Authentication & Security

The application implements a robust security model:

1. **Partner-Only Access**: Only @ngicapital.com email addresses allowed
2. **JWT Authentication**: Secure token-based authentication
3. **Protected Routes**: All application routes require authentication
4. **Dual Authorization**: Transactions over $500 require partner approval
5. **No Self-Approval**: Partners cannot approve their own transactions
6. **Audit Trail**: Complete logging of all financial actions

## State Management

The application uses React Context for global state management:

- **AppContext**: User authentication, entities, transactions, dashboard metrics
- **ThemeContext**: Dark/light mode toggle with system preference detection

## Styling & Design

- **Professional Financial UI**: Clean, modern design suitable for financial applications
- **Dark Mode Support**: System preference detection with manual toggle
- **Responsive Design**: Mobile-friendly layout with adaptive sidebar
- **Accessibility**: Focus management, keyboard navigation, screen reader support
- **Loading States**: Skeleton screens and spinners for better UX

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Development Server**:
   ```bash
   npm run dev
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

4. **Type Checking**:
   ```bash
   npm run type-check
   ```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Demo Credentials

For development and testing:
- Email: `demo@ngicapital.com`
- Password: `demo123`

## API Integration

The frontend is designed to work with the NGI Capital FastAPI backend. Key endpoints:

- `/api/auth/*` - Authentication
- `/api/dashboard/*` - Dashboard metrics
- `/api/entities/*` - Entity management
- `/api/transactions/*` - Transaction operations
- `/api/banking/*` - Banking integration
- `/api/reports/*` - Financial reports

## Deployment

The application is configured for deployment on:
- **Vercel** (recommended for Next.js)
- **Docker** containers
- **Static export** for self-hosting

## Contributing

This is an internal system for NGI Capital partners. All changes require:
1. Code review by both partners
2. Security audit for sensitive changes
3. Testing on staging environment
4. Backup before production deployment

## License

Proprietary - NGI Capital Advisory LLC. All rights reserved.