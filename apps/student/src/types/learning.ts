/**
 * Type definitions for NGI Learning Module
 */

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  status: 'available' | 'coming_soon' | 'locked';
  duration: string;
  units: number;
  icon: string;
  color: string;
  order: number;
}

export interface ModuleProgress {
  module_id: string;
  completed_units: number;
  total_units: number;
  started_at: string | null;
  completed_at: string | null;
  last_activity: string | null;
}

export interface Company {
  id: number;
  ticker: string;
  company_name: string;
  industry: string;
  description: string;
  revenue_model_type: string;
  data_quality_score: number;
  is_active: boolean;
}

export interface Progress {
  id: number;
  user_id: string;
  selected_company_id: number | null;
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_date: string | null;
  activities_completed: string[];
}

export interface Submission {
  id: number;
  user_id: string;
  company_id: number;
  activity_id: string;
  version: number;
  file_path: string;
  file_type: string;
  file_size_bytes: number;
  validator_status: string;
  submitted_at: string;
}

export interface Feedback {
  id: number;
  submission_id: number;
  feedback_text: string;
  rubric_score: number;
  strengths: string[];
  improvements: string[];
  next_steps: string[];
  model_used: string;
  tokens_used: number;
  created_at: string;
}

// Available modules for V1
export const LEARNING_MODULES: LearningModule[] = [
  {
    id: 'business_foundations',
    title: 'Business Foundations',
    description: 'Systems thinking, business models (BMC), unit economics, strategy, and operational fundamentals',
    status: 'available',
    duration: '4-6 weeks',
    units: 5,
    icon: 'building',
    color: 'blue',
    order: 1,
  },
  {
    id: 'accounting_1',
    title: 'Accounting I',
    description: 'Financial statements, revenue recognition, COGS, working capital, and cash flow',
    status: 'available',
    duration: '3-4 weeks',
    units: 4,
    icon: 'calculator',
    color: 'green',
    order: 2,
  },
  {
    id: 'accounting_2',
    title: 'Accounting II',
    description: 'PP&E, leases, stock-based compensation, deferred taxes, and M&A accounting',
    status: 'available',
    duration: '3-4 weeks',
    units: 5,
    icon: 'document',
    color: 'emerald',
    order: 3,
  },
  {
    id: 'managerial_accounting',
    title: 'Managerial Accounting',
    description: 'Cost accounting, budgeting, forecasting, variance analysis, and performance metrics',
    status: 'available',
    duration: '2-3 weeks',
    units: 3,
    icon: 'chart',
    color: 'teal',
    order: 4,
  },
  {
    id: 'finance_valuation',
    title: 'Finance & Valuation',
    description: 'Revenue drivers, projections, DCF modeling, WACC, comparable companies, and credit analysis',
    status: 'available',
    duration: '5-7 weeks',
    units: 7,
    icon: 'trending',
    color: 'purple',
    order: 5,
  },
  {
    id: 'corporate_law',
    title: 'Corporate Law & Governance',
    description: 'Corporate structures, governance, compliance, contracts, and legal fundamentals',
    status: 'coming_soon',
    duration: 'TBD',
    units: 0,
    icon: 'gavel',
    color: 'gray',
    order: 6,
  },
  {
    id: 'strategy',
    title: 'Strategy',
    description: 'Competitive strategy, Porter\'s 5 Forces, SWOT, strategic planning, and execution',
    status: 'coming_soon',
    duration: 'TBD',
    units: 0,
    icon: 'lightbulb',
    color: 'gray',
    order: 7,
  },
  {
    id: 'economics',
    title: 'Economics (Micro & Macro)',
    description: 'Microeconomics, macroeconomics, market dynamics, and economic analysis',
    status: 'coming_soon',
    duration: 'TBD',
    units: 0,
    icon: 'globe',
    color: 'gray',
    order: 8,
  },
  {
    id: 'operations',
    title: 'Operations & Supply Chain',
    description: 'Operations management, supply chain optimization, lean principles, and quality',
    status: 'coming_soon',
    duration: 'TBD',
    units: 0,
    icon: 'cog',
    color: 'gray',
    order: 9,
  },
  {
    id: 'marketing',
    title: 'Marketing',
    description: 'Marketing fundamentals, customer acquisition, branding, and growth strategies',
    status: 'coming_soon',
    duration: 'TBD',
    units: 0,
    icon: 'megaphone',
    color: 'gray',
    order: 10,
  },
];

