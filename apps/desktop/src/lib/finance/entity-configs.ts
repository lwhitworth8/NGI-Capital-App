/**
 * Entity-specific finance dashboard configurations
 * Each entity type has its own set of KPIs and metrics
 */

export type EntityType = 'ngi_capital_llc' | 'ngi_capital_advisory' | 'creator_terminal' | 'consolidated';

export interface MetricConfig {
  id: string;
  label: string;
  apiField?: string;
  format: 'currency' | 'percent' | 'number' | 'months' | 'ratio';
  description: string;
  hasHistory: boolean;
  chartType?: 'line' | 'area' | 'bar';
}

export interface EntityDashboardConfig {
  entityType: EntityType;
  displayName: string;
  kpiRows: MetricConfig[][];
  unitEconomics: 'saas' | 'project' | 'none';
  showCapTable: boolean;
  capTableType: 'members_capital' | 'shares' | 'none';
  managerialMetrics: string[];
}

// NGI Capital LLC (Parent - Pre-C-Corp Conversion)
export const NGI_CAPITAL_LLC_CONFIG: EntityDashboardConfig = {
  entityType: 'ngi_capital_llc',
  displayName: 'NGI Capital LLC',
  kpiRows: [
    [
      {
        id: 'revenue_ttm',
        label: 'Revenue (TTM)',
        apiField: 'revenue',
        format: 'currency',
        description: 'Total revenue over the trailing twelve months',
        hasHistory: true,
        chartType: 'area'
      },
      {
        id: 'gross_profit',
        label: 'Gross Profit',
        apiField: 'gross_profit',
        format: 'currency',
        description: 'Revenue minus cost of goods sold',
        hasHistory: true,
        chartType: 'area'
      },
      {
        id: 'gross_margin',
        label: 'Gross Margin',
        apiField: 'gross_margin_pct',
        format: 'percent',
        description: 'Gross profit as a percentage of revenue',
        hasHistory: true,
        chartType: 'line'
      },
      {
        id: 'operating_income',
        label: 'Operating Income',
        apiField: 'operating_income',
        format: 'currency',
        description: 'Profit from operations before interest and taxes',
        hasHistory: true,
        chartType: 'area'
      }
    ],
    [
      {
        id: 'variable_costs',
        label: 'Variable Costs',
        apiField: 'variable_costs',
        format: 'currency',
        description: 'Costs that vary with production volume',
        hasHistory: true,
        chartType: 'bar'
      },
      {
        id: 'fixed_costs',
        label: 'Fixed Costs',
        apiField: 'fixed_costs',
        format: 'currency',
        description: 'Costs that remain constant regardless of activity',
        hasHistory: true,
        chartType: 'bar'
      },
      {
        id: 'contribution_margin',
        label: 'Contribution Margin',
        apiField: 'contribution_margin',
        format: 'percent',
        description: 'Revenue minus variable costs as percentage',
        hasHistory: true,
        chartType: 'line'
      },
      {
        id: 'net_burn',
        label: 'Net Burn',
        apiField: 'burn',
        format: 'currency',
        description: 'Monthly cash consumption rate',
        hasHistory: true,
        chartType: 'bar'
      }
    ]
  ],
  unitEconomics: 'none',
  showCapTable: true,
  capTableType: 'members_capital',
  managerialMetrics: ['break_even_revenue', 'operating_leverage', 'cash_conversion_cycle']
};

// NGI Capital Advisory (Student & Project-Based)
export const NGI_CAPITAL_ADVISORY_CONFIG: EntityDashboardConfig = {
  entityType: 'ngi_capital_advisory',
  displayName: 'NGI Capital Advisory',
  kpiRows: [
    [
      {
        id: 'project_revenue',
        label: 'Project Revenue',
        apiField: 'revenue',
        format: 'currency',
        description: 'Revenue from advisory projects',
        hasHistory: true,
        chartType: 'bar'
      },
      {
        id: 'active_projects',
        label: 'Active Projects',
        apiField: 'active_projects',
        format: 'number',
        description: 'Number of ongoing advisory projects',
        hasHistory: true,
        chartType: 'line'
      },
      {
        id: 'avg_project_value',
        label: 'Avg Project Value',
        apiField: 'avg_project_value',
        format: 'currency',
        description: 'Average revenue per project',
        hasHistory: true,
        chartType: 'line'
      },
      {
        id: 'student_utilization',
        label: 'Student Utilization',
        apiField: 'student_utilization',
        format: 'percent',
        description: 'Percentage of student hours utilized',
        hasHistory: true,
        chartType: 'line'
      }
    ],
    [
      {
        id: 'direct_costs',
        label: 'Direct Costs',
        apiField: 'direct_costs',
        format: 'currency',
        description: 'Costs directly attributable to projects',
        hasHistory: true,
        chartType: 'bar'
      },
      {
        id: 'overhead',
        label: 'Overhead',
        apiField: 'overhead',
        format: 'currency',
        description: 'Indirect operating expenses',
        hasHistory: true,
        chartType: 'bar'
      },
      {
        id: 'project_margin',
        label: 'Project Margin',
        apiField: 'project_margin',
        format: 'percent',
        description: 'Profit margin on advisory projects',
        hasHistory: true,
        chartType: 'line'
      },
      {
        id: 'billable_ratio',
        label: 'Billable Ratio',
        apiField: 'billable_ratio',
        format: 'percent',
        description: 'Billable hours vs total hours',
        hasHistory: true,
        chartType: 'line'
      }
    ]
  ],
  unitEconomics: 'project',
  showCapTable: true,
  capTableType: 'members_capital',
  managerialMetrics: ['revenue_per_student', 'project_profitability', 'capacity_utilization']
};

// Creator Terminal (SaaS Platform - Future)
export const CREATOR_TERMINAL_CONFIG: EntityDashboardConfig = {
  entityType: 'creator_terminal',
  displayName: 'Creator Terminal',
  kpiRows: [
    [
      {
        id: 'mrr',
        label: 'MRR',
        apiField: 'mrr',
        format: 'currency',
        description: 'Monthly Recurring Revenue',
        hasHistory: true,
        chartType: 'area'
      },
      {
        id: 'arr',
        label: 'ARR',
        apiField: 'arr',
        format: 'currency',
        description: 'Annual Recurring Revenue',
        hasHistory: true,
        chartType: 'area'
      },
      {
        id: 'total_accounts',
        label: 'Total Accounts',
        apiField: 'total_accounts',
        format: 'number',
        description: 'Free + Creator + Enterprise accounts',
        hasHistory: true,
        chartType: 'line'
      },
      {
        id: 'paid_conversion',
        label: 'Paid Conversion',
        apiField: 'paid_conversion',
        format: 'percent',
        description: 'Free to paid conversion rate',
        hasHistory: true,
        chartType: 'line'
      }
    ],
    [
      {
        id: 'cac',
        label: 'CAC',
        apiField: 'cac',
        format: 'currency',
        description: 'Customer Acquisition Cost',
        hasHistory: true,
        chartType: 'line'
      },
      {
        id: 'ltv',
        label: 'LTV',
        apiField: 'ltv',
        format: 'currency',
        description: 'Lifetime Value per customer',
        hasHistory: true,
        chartType: 'line'
      },
      {
        id: 'churn_rate',
        label: 'Churn Rate',
        apiField: 'churn_rate',
        format: 'percent',
        description: 'Monthly customer churn rate',
        hasHistory: true,
        chartType: 'line'
      },
      {
        id: 'ndr',
        label: 'NDR',
        apiField: 'ndr',
        format: 'percent',
        description: 'Net Dollar Retention',
        hasHistory: true,
        chartType: 'line'
      }
    ]
  ],
  unitEconomics: 'saas',
  showCapTable: false,
  capTableType: 'none',
  managerialMetrics: ['magic_number', 'rule_of_40', 'burn_multiple', 'months_to_payback']
};

// Consolidated View (All Entities Combined)
export const CONSOLIDATED_CONFIG: EntityDashboardConfig = {
  entityType: 'consolidated',
  displayName: 'Consolidated View',
  kpiRows: [
    [
      {
        id: 'total_revenue',
        label: 'Total Revenue',
        apiField: 'total_revenue',
        format: 'currency',
        description: 'Combined revenue across all entities',
        hasHistory: true,
        chartType: 'area'
      },
      {
        id: 'combined_ebitda',
        label: 'Combined EBITDA',
        apiField: 'combined_ebitda',
        format: 'currency',
        description: 'Consolidated EBITDA',
        hasHistory: true,
        chartType: 'area'
      },
      {
        id: 'group_margin',
        label: 'Group Margin',
        apiField: 'group_margin',
        format: 'percent',
        description: 'Consolidated profit margin',
        hasHistory: true,
        chartType: 'line'
      },
      {
        id: 'total_cash',
        label: 'Total Cash',
        apiField: 'total_cash',
        format: 'currency',
        description: 'Combined cash position',
        hasHistory: true,
        chartType: 'area'
      }
    ],
    [
      {
        id: 'group_burn',
        label: 'Group Burn',
        apiField: 'group_burn',
        format: 'currency',
        description: 'Consolidated monthly burn rate',
        hasHistory: true,
        chartType: 'bar'
      },
      {
        id: 'runway',
        label: 'Runway',
        apiField: 'runway_months',
        format: 'months',
        description: 'Months of runway at current burn',
        hasHistory: true,
        chartType: 'line'
      },
      {
        id: 'operating_efficiency',
        label: 'Operating Efficiency',
        apiField: 'operating_efficiency',
        format: 'ratio',
        description: 'Revenue per dollar of operating expense',
        hasHistory: true,
        chartType: 'line'
      },
      {
        id: 'growth_rate',
        label: 'Growth Rate',
        apiField: 'growth_rate',
        format: 'percent',
        description: 'YoY revenue growth rate',
        hasHistory: true,
        chartType: 'line'
      }
    ]
  ],
  unitEconomics: 'none',
  showCapTable: true,
  capTableType: 'members_capital',
  managerialMetrics: ['intercompany_efficiency', 'portfolio_diversification', 'cross_entity_synergies']
};

export function getEntityConfig(entityName: string): EntityDashboardConfig {
  const normalized = entityName.toLowerCase();
  
  if (normalized.includes('advisory')) {
    return NGI_CAPITAL_ADVISORY_CONFIG;
  }
  
  if (normalized.includes('creator') || normalized.includes('terminal')) {
    return CREATOR_TERMINAL_CONFIG;
  }
  
  if (normalized === 'consolidated' || normalized.includes('all entities')) {
    return CONSOLIDATED_CONFIG;
  }
  
  // Default to NGI Capital LLC
  return NGI_CAPITAL_LLC_CONFIG;
}

export function formatMetricValue(value: number, format: MetricConfig['format']): string {
  if (!Number.isFinite(value)) return '-';
  
  switch (format) {
    case 'currency':
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
      return `$${value.toLocaleString()}`;
    
    case 'percent':
      return `${value.toFixed(1)}%`;
    
    case 'months':
      return `${value.toFixed(1)} mo`;
    
    case 'ratio':
      return `${value.toFixed(1)}x`;
    
    case 'number':
      return value.toLocaleString();
    
    default:
      return value.toString();
  }
}

