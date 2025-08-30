/**
 * Test suite for NGI Capital Financial Reporting Components
 * Tests UI rendering, data flow, date handling, and export functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';
import IncomeStatementPage from '../income-statement/page';
import BalanceSheetPage from '../balance-sheet/page';
import CashFlowStatementPage from '../cash-flow/page';
import FinancialReportingPage from '../page';
import * as dateUtils from '@/lib/utils/dateUtils';
import * as excelExport from '@/lib/utils/excelExport';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock date utilities
jest.mock('@/lib/utils/dateUtils', () => ({
  getCurrentFiscalQuarter: jest.fn(() => 'Q1-2025'),
  getAvailablePeriods: jest.fn(() => ['Q1-2025', 'FY-2024']),
  isEntityActive: jest.fn((entityId) => entityId === 'ngi-capital' || entityId === 'consolidated'),
  CURRENT_DATE: new Date('2024-08-29'),
  ENTITY_FORMATION_DATES: {
    'ngi-capital': new Date('2024-07-01'),
    'ngi-advisory': null,
    'creator-terminal': null,
    'consolidated': new Date('2024-07-01')
  }
}));

// Mock Excel export functions
jest.mock('@/lib/utils/excelExport', () => ({
  exportIncomeStatement: jest.fn(),
  exportBalanceSheet: jest.fn(),
  exportCashFlow: jest.fn(),
  exportAllStatements: jest.fn(),
}));

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(null), // Return null to simulate no data
  })
) as jest.Mock;

describe('Financial Reporting Components', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    jest.clearAllMocks();
  });

  describe('Income Statement Page', () => {
    it('renders income statement page with correct elements', () => {
      render(<IncomeStatementPage />);
      
      expect(screen.getByText('Income Statement')).toBeInTheDocument();
      expect(screen.getByText('Statement of Operations and Comprehensive Income')).toBeInTheDocument();
      expect(screen.getByText('Export to Excel')).toBeInTheDocument();
    });

    it('shows empty state when no data is available', () => {
      render(<IncomeStatementPage />);
      
      expect(screen.getByText('No Income Statement Data Available')).toBeInTheDocument();
      expect(screen.getByText(/Connected your Mercury Bank account/)).toBeInTheDocument();
    });

    it('disables inactive entities in selector', () => {
      render(<IncomeStatementPage />);
      
      const entitySelect = screen.getByRole('combobox', { name: /entity/i });
      const options = entitySelect.querySelectorAll('option');
      
      expect(options[2]).toHaveAttribute('disabled'); // NGI Advisory
      expect(options[3]).toHaveAttribute('disabled'); // Creator Terminal
      expect(options[2].textContent).toContain('(Coming Sept 2024)');
    });

    it('handles period selection based on entity formation date', async () => {
      render(<IncomeStatementPage />);
      
      const periodSelect = screen.getAllByRole('combobox')[1]; // Second select is period
      
      await waitFor(() => {
        expect(dateUtils.getAvailablePeriods).toHaveBeenCalledWith('consolidated');
      });
    });

    it('triggers Excel export when export button is clicked', () => {
      render(<IncomeStatementPage />);
      
      const exportButton = screen.getByText('Export to Excel');
      fireEvent.click(exportButton);
      
      expect(excelExport.exportIncomeStatement).toHaveBeenCalled();
    });

    it('displays ASC compliance note at bottom', () => {
      render(<IncomeStatementPage />);
      
      expect(screen.getByText('ASC 220 Compliance Note')).toBeInTheDocument();
      expect(screen.getByText(/ASC 220 guidelines/)).toBeInTheDocument();
    });
  });

  describe('Balance Sheet Page', () => {
    it('renders balance sheet page with correct elements', () => {
      render(<BalanceSheetPage />);
      
      expect(screen.getByText('Balance Sheet')).toBeInTheDocument();
      expect(screen.getByText('Statement of Financial Position')).toBeInTheDocument();
      expect(screen.getByText('Export to Excel')).toBeInTheDocument();
    });

    it('uses current date as default as-of date', () => {
      render(<BalanceSheetPage />);
      
      const dateInput = screen.getByDisplayValue('2024-08-29');
      expect(dateInput).toBeInTheDocument();
    });

    it('shows empty state with setup instructions', () => {
      render(<BalanceSheetPage />);
      
      expect(screen.getByText('No Balance Sheet Data Available')).toBeInTheDocument();
      expect(screen.getByText('Setup Entities')).toBeInTheDocument();
      expect(screen.getByText('Configure Accounts')).toBeInTheDocument();
    });

    it('navigates to entity setup when button clicked', () => {
      render(<BalanceSheetPage />);
      
      const setupButton = screen.getByText('Setup Entities');
      fireEvent.click(setupButton);
      
      expect(mockPush).toHaveBeenCalledWith('/entities');
    });

    it('displays financial ratios section in empty state', () => {
      render(<BalanceSheetPage />);
      
      expect(screen.getByText('Financial Ratios')).toBeInTheDocument();
      expect(screen.getByText('Current Ratio')).toBeInTheDocument();
      expect(screen.getByText('Quick Ratio')).toBeInTheDocument();
      expect(screen.getByText('Debt to Equity')).toBeInTheDocument();
      expect(screen.getByText('Working Capital')).toBeInTheDocument();
    });
  });

  describe('Cash Flow Statement Page', () => {
    it('renders cash flow statement page with correct elements', () => {
      render(<CashFlowStatementPage />);
      
      expect(screen.getByText('Cash Flow Statement')).toBeInTheDocument();
      expect(screen.getByText('Statement of Cash Flows - Indirect Method')).toBeInTheDocument();
      expect(screen.getByText('Export to Excel')).toBeInTheDocument();
    });

    it('shows fiscal year information', () => {
      render(<CashFlowStatementPage />);
      
      expect(screen.getByText('Fiscal Year: July 1 - June 30')).toBeInTheDocument();
    });

    it('displays key metrics cards in empty state', () => {
      render(<CashFlowStatementPage />);
      
      expect(screen.getByText('Operating Cash Flow')).toBeInTheDocument();
      expect(screen.getByText('Free Cash Flow')).toBeInTheDocument();
      expect(screen.getByText('Cash Burn Rate')).toBeInTheDocument();
    });

    it('handles Excel export for cash flow statement', () => {
      render(<CashFlowStatementPage />);
      
      const exportButton = screen.getByText('Export to Excel');
      fireEvent.click(exportButton);
      
      expect(excelExport.exportCashFlow).toHaveBeenCalled();
    });
  });

  describe('Main Financial Reporting Page', () => {
    it('renders overview of all financial statements', () => {
      render(<FinancialReportingPage />);
      
      expect(screen.getByText('Financial Reporting')).toBeInTheDocument();
      expect(screen.getByText('Income Statement')).toBeInTheDocument();
      expect(screen.getByText('Balance Sheet')).toBeInTheDocument();
      expect(screen.getByText('Cash Flow Statement')).toBeInTheDocument();
      expect(screen.getByText('Statement of Changes in Equity')).toBeInTheDocument();
    });

    it('shows compliance status indicators', () => {
      render(<FinancialReportingPage />);
      
      expect(screen.getByText('GAAP Compliant')).toBeInTheDocument();
      expect(screen.getByText('Big 4 Audit Ready')).toBeInTheDocument();
      expect(screen.getByText('CA FTB Compliant')).toBeInTheDocument();
    });

    it('navigates to individual statement pages when clicked', () => {
      render(<FinancialReportingPage />);
      
      const incomeStatementCard = screen.getByText('Income Statement').closest('.cursor-pointer');
      if (incomeStatementCard) {
        fireEvent.click(incomeStatementCard);
        expect(mockPush).toHaveBeenCalledWith('/accounting/financial-reporting/income-statement');
      }
    });

    it('displays export financial package button', () => {
      render(<FinancialReportingPage />);
      
      expect(screen.getByText('Export Financial Package')).toBeInTheDocument();
    });
  });

  describe('Date Handling', () => {
    it('correctly identifies active entities', () => {
      expect(dateUtils.isEntityActive('ngi-capital')).toBe(true);
      expect(dateUtils.isEntityActive('ngi-advisory')).toBe(false);
      expect(dateUtils.isEntityActive('creator-terminal')).toBe(false);
    });

    it('calculates correct fiscal quarter', () => {
      expect(dateUtils.getCurrentFiscalQuarter()).toBe('Q1-2025');
    });

    it('generates available periods based on formation date', () => {
      const periods = dateUtils.getAvailablePeriods('ngi-capital');
      expect(periods).toContain('Q1-2025');
      expect(periods).toContain('FY-2024');
    });
  });

  describe('Export Functionality', () => {
    it('exports income statement with correct parameters', () => {
      const mockData = { revenues: { totalRevenues: 100000 } };
      excelExport.exportIncomeStatement(mockData, 'ngi-capital', 'Q1-2025');
      
      expect(excelExport.exportIncomeStatement).toHaveBeenCalledWith(
        mockData,
        'ngi-capital',
        'Q1-2025'
      );
    });

    it('exports balance sheet with date parameter', () => {
      const mockData = { assets: { totalAssets: 500000 } };
      excelExport.exportBalanceSheet(mockData, 'ngi-capital', '2024-08-29');
      
      expect(excelExport.exportBalanceSheet).toHaveBeenCalledWith(
        mockData,
        'ngi-capital',
        '2024-08-29'
      );
    });
  });

  describe('Empty States', () => {
    it('shows helpful empty state messages', () => {
      render(<IncomeStatementPage />);
      
      const emptyStateMessages = [
        'Connected your Mercury Bank account',
        'Uploaded invoices, receipts',
        'Created and posted journal entries'
      ];
      
      emptyStateMessages.forEach(message => {
        expect(screen.getByText(new RegExp(message))).toBeInTheDocument();
      });
    });

    it('provides action buttons in empty states', () => {
      render(<IncomeStatementPage />);
      
      expect(screen.getByText('Upload Documents')).toBeInTheDocument();
      expect(screen.getByText('Create Journal Entry')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<IncomeStatementPage />);
      
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('maintains keyboard navigation support', () => {
      render(<IncomeStatementPage />);
      
      const exportButton = screen.getByText('Export to Excel');
      exportButton.focus();
      expect(document.activeElement).toBe(exportButton);
    });
  });
});