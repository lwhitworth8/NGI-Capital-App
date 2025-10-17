/**
 * Test suite for Finance Dashboard components
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import FinanceDashboardTab from '../../app/finance/tabs/dashboard/page'

// Mock the API client
jest.mock('@/lib/api', () => ({
  apiClient: {
    request: jest.fn(),
  },
}))

// Mock the investor API
jest.mock('@/lib/investors/api', () => ({
  invGetKpis: jest.fn(),
}))

// Mock the app context
jest.mock('@/lib/context/AppContext', () => ({
  useApp: () => ({
    state: {
      currentEntity: {
        id: 1,
        legal_name: 'NGI Capital LLC',
      },
    },
  }),
}))

// Mock dynamic imports
jest.mock('next/dynamic', () => () => {
  const MockComponent = ({ children, ...props }: any) => <div data-testid="mock-chart" {...props}>{children}</div>
  return MockComponent
})

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('FinanceDashboardTab', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the dashboard title and entity name', () => {
    renderWithQueryClient(<FinanceDashboardTab />)
    
    expect(screen.getByText('Financial Dashboard')).toBeInTheDocument()
    expect(screen.getByText('NGI Capital LLC')).toBeInTheDocument()
  })

  it('displays loading state initially', () => {
    renderWithQueryClient(<FinanceDashboardTab />)
    
    // Should show loading indicators
    expect(screen.getAllByText('-')).toHaveLength(4) // Revenue, EBITDA, EBITDA Margin, Rule of 40
  })

  it('renders all metric cards', () => {
    renderWithQueryClient(<FinanceDashboardTab />)
    
    // Check for metric card titles
    expect(screen.getByText('Revenue (TTM)')).toBeInTheDocument()
    expect(screen.getByText('EBITDA')).toBeInTheDocument()
    expect(screen.getByText('EBITDA Margin')).toBeInTheDocument()
    expect(screen.getByText('Rule of 40')).toBeInTheDocument()
    expect(screen.getByText('FCF (TTM)')).toBeInTheDocument()
    expect(screen.getByText('Burn Multiple')).toBeInTheDocument()
    expect(screen.getByText('Cash Runway')).toBeInTheDocument()
    expect(screen.getByText('Quick Ratio')).toBeInTheDocument()
  })

  it('renders unit economics section', () => {
    renderWithQueryClient(<FinanceDashboardTab />)
    
    expect(screen.getByText('Unit Economics (SaaS)')).toBeInTheDocument()
    expect(screen.getByText('CAC:')).toBeInTheDocument()
    expect(screen.getByText('LTV:')).toBeInTheDocument()
    expect(screen.getByText('LTV/CAC:')).toBeInTheDocument()
    expect(screen.getByText('Payback:')).toBeInTheDocument()
    expect(screen.getByText('Net Dollar Ret:')).toBeInTheDocument()
  })

  it('renders income statement waterfall section', () => {
    renderWithQueryClient(<FinanceDashboardTab />)
    
    expect(screen.getByText('Income Statement Waterfall (TTM)')).toBeInTheDocument()
    expect(screen.getByText('Export')).toBeInTheDocument()
    expect(screen.getByText('Full View →')).toBeInTheDocument()
  })

  it('renders cash flow bridge and balance sheet sections', () => {
    renderWithQueryClient(<FinanceDashboardTab />)
    
    expect(screen.getByText('Cash Flow Bridge (MoM)')).toBeInTheDocument()
    expect(screen.getByText('Balance Sheet Snapshot')).toBeInTheDocument()
  })

  it('renders cap table section', () => {
    renderWithQueryClient(<FinanceDashboardTab />)
    
    expect(screen.getByText('Cap Table & Ownership')).toBeInTheDocument()
    expect(screen.getByText('Full Detail →')).toBeInTheDocument()
  })

  it('displays mock data when loaded', async () => {
    // Mock API responses
    const mockApiClient = require('@/lib/api').apiClient
    const mockInvGetKpis = require('@/lib/investors/api').invGetKpis
    
    mockApiClient.request.mockResolvedValue({
      revenue: 1000000,
      cogs: 400000,
      gross_margin: 600000,
      gross_margin_pct: 60,
      expenses_fixed: 200000,
      expenses_variable: 100000,
      burn: 50000,
      cash: 500000,
      runway_months: 18.4,
      ar_balance: 180000,
      ap_balance: 120000,
    })
    
    mockInvGetKpis.mockResolvedValue({
      total: 25,
      inPipeline: 8,
      won: 5,
      activeThis30d: 12,
    })
    
    renderWithQueryClient(<FinanceDashboardTab />)
    
    await waitFor(() => {
      expect(screen.getByText('$1.0M')).toBeInTheDocument() // Revenue
    })
  })

  it('handles API errors gracefully', async () => {
    const mockApiClient = require('@/lib/api').apiClient
    const mockInvGetKpis = require('@/lib/investors/api').invGetKpis
    
    mockApiClient.request.mockRejectedValue(new Error('API Error'))
    mockInvGetKpis.mockRejectedValue(new Error('API Error'))
    
    renderWithQueryClient(<FinanceDashboardTab />)
    
    // Should still render the component without crashing
    expect(screen.getByText('Financial Dashboard')).toBeInTheDocument()
  })
})

describe('MetricCard Component', () => {
  it('renders metric card with all props', () => {
    const { container } = renderWithQueryClient(<FinanceDashboardTab />)
    
    // Check that metric cards are rendered with proper structure
    const metricCards = container.querySelectorAll('.ngi-card-elevated')
    expect(metricCards.length).toBeGreaterThan(0)
  })

  it('displays trend indicators', () => {
    renderWithQueryClient(<FinanceDashboardTab />)
    
    // Should show trend labels
    expect(screen.getAllByText('↑ 145%')).toHaveLength(1)
    expect(screen.getAllByText('↑ 280%')).toHaveLength(1)
  })

  it('shows status badges', () => {
    renderWithQueryClient(<FinanceDashboardTab />)
    
    // Should show status indicators
    expect(screen.getByText('✓ HEALTHY')).toBeInTheDocument()
  })
})

describe('Responsive Design', () => {
  it('renders grid layouts correctly', () => {
    const { container } = renderWithQueryClient(<FinanceDashboardTab />)
    
    // Check for grid classes
    const grids = container.querySelectorAll('.grid')
    expect(grids.length).toBeGreaterThan(0)
  })

  it('has proper responsive breakpoints', () => {
    const { container } = renderWithQueryClient(<FinanceDashboardTab />)
    
    // Check for responsive grid classes
    const responsiveGrids = container.querySelectorAll('.lg\\:grid-cols-4')
    expect(responsiveGrids.length).toBeGreaterThan(0)
  })
})
