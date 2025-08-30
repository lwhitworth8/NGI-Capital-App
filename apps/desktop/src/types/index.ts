// User and Authentication Types
export interface Partner {
  id: string;
  email: string;
  name: string;
  ownership_percentage: number;
  capital_account_balance: number;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: Partner | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

// Entity Management Types
export interface Entity {
  id: string;
  legal_name: string;
  entity_type: string;
  ein: string;
  formation_date: string;
  state: string;
  parent_entity_id?: string;
  is_active: boolean;
  created_at: string;
}

// Transaction Types
export interface Transaction {
  id: string;
  entity_id: string;
  transaction_date: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_by: string;
  approved_by?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  entity?: Entity;
}

// Dashboard Metrics
export interface DashboardMetrics {
  total_aum: number;
  monthly_revenue: number;
  monthly_expenses: number;
  net_income: number;
  pending_approvals_count: number;
  cash_position: CashPosition[];
  entity_performance: EntityPerformance[];
}

export interface CashPosition {
  entity_id: string;
  entity_name: string;
  balance: number;
  last_updated: string;
}

export interface EntityPerformance {
  entity_id: string;
  entity_name: string;
  revenue: number;
  expenses: number;
  net_income: number;
  month: string;
}

// Chart Data Types
export interface ChartData {
  name: string;
  value: number;
  revenue?: number;
  expenses?: number;
  net_income?: number;
}

// API Response Types
export interface APIResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface TransactionForm {
  entity_id: string;
  transaction_date: string;
  amount: number;
  transaction_type: string;
  description: string;
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Theme Types
export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// Navigation Types
export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  badge?: number;
  children?: NavItem[];
}

// Error Types
export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

// Loading States
export interface LoadingState {
  isLoading: boolean;
  error?: AppError | null;
}