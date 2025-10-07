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

// NGI Advisory Types
export type AdvisoryProject = {
  id: number;
  entity_id: number;
  client_name: string;
  project_name: string;
  summary: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'delivered' | 'closed';
  mode: 'remote' | 'in_person' | 'hybrid';
  location_text?: string;
  start_date?: string | null;
  end_date?: string | null;
  duration_weeks?: number | null;
  commitment_hours_per_week?: number | null;
  project_code?: string;
  project_lead?: string;
  contact_email?: string;
  partner_badges?: string[];
  backer_badges?: string[];
  tags?: string[];
  hero_image_url?: string;
  gallery_urls?: string[];
  apply_cta_text?: string;
  apply_url?: string;
  eligibility_notes?: string;
  notes_internal?: string;
  // V1 extensions (Projects PRD)
  team_size?: number | null;
  team_requirements?: string[] | null;
  allow_applications?: number | boolean;
  is_public?: number | boolean;
  coffeechat_calendly?: string | null;
  showcase_pdf_url?: string | null;
  // Slack
  slack_channel_id?: string | null;
  slack_channel_name?: string | null;
  // Derived
  open_roles?: number | null;
  // Meta
  created_at?: string;
  updated_at?: string;
}

export type AdvisoryStudent = {
  id: number;
  entity_id: number;
  first_name: string;
  last_name: string;
  email: string;
  school?: string;
  program?: string;
  grad_year?: number;
  skills?: Record<string, any> | string[];
  status: 'prospect' | 'active' | 'paused' | 'alumni';
  // Extended/admin-computed fields
  status_effective?: 'active' | 'alumni' | string;
  status_override?: string | null;
  status_override_reason?: string | null;
  status_override_at?: string | null;
  last_activity_at?: string | null;
  resume_url?: string | null;
  // Additional profile fields from settings
  phone?: string;
  linkedin_url?: string;
  gpa?: number;
  location?: string;
  created_at?: string;
  updated_at?: string;
  // Aggregated data for UI
  applications_count?: number;
  coffee_chats_count?: number;
  onboarding_count?: number;
  profile_completeness?: {
    has_resume: boolean;
    has_phone: boolean;
    has_linkedin: boolean;
    has_gpa: boolean;
    has_location: boolean;
    has_school: boolean;
    has_program: boolean;
    has_grad_year: boolean;
    percentage: number;
  };
}

export type AdvisoryApplication = {
  id: number;
  entity_id: number;
  source: 'form' | 'referral' | 'other';
  target_project_id?: number;
  first_name: string;
  last_name: string;
  email: string;
  school?: string;
  program?: string;
  resume_url?: string;
  notes?: string;
  status: 'new' | 'reviewing' | 'interview' | 'offer' | 'joined' | 'rejected' | 'withdrawn';
  created_at: string;
  reviewer_email?: string | null;
}

export type AdvisoryCoffeeChat = {
  id: number;
  provider: 'calendly' | 'manual' | 'other';
  external_id?: string;
  invitee_email?: string;
  invitee_name?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  status: 'scheduled' | 'completed' | 'canceled';
  topic?: string;
}

export type AdvisoryCoffeeAvailability = {
  id: number;
  admin_email: string;
  start_ts: string;
  end_ts: string;
  slot_len_min: number;
  created_at?: string;
  updated_at?: string;
}

export type AdvisoryCoffeeRequest = {
  id: number;
  student_email: string;
  start_ts: string;
  end_ts: string;
  slot_len_min: number;
  status: 'requested'|'pending'|'accepted'|'completed'|'canceled'|'no_show'|'expired';
  claimed_by?: string | null;
  expires_at_ts?: string | null;
  cooldown_until_ts?: string | null;
  blacklist_until_ts?: string | null;
  created_at?: string;
}
