import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock useEntityContext hook - MUST be before component imports
jest.mock('@/hooks/useEntityContext', () => ({
  useEntityContext: jest.fn(() => ({
    selectedEntityId: 1,
    setSelectedEntityId: jest.fn(),
  })),
  EntityProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock EntitySelector
jest.mock('@/components/accounting/EntitySelector', () => ({
  EntitySelector: ({ value, onChange }: any) => (
    <div data-testid="entity-selector">
      <select value={value} onChange={(e) => onChange(parseInt(e.target.value))}>
        <option value={1}>NGI Capital LLC</option>
        <option value={2}>NGI Advisory LLC</option>
      </select>
    </div>
  ),
}));

// Import component AFTER mocks
import FinancialReportingPage from '@/app/accounting/financial-reporting/page'

describe('FinancialReportingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as any) = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );
  });

  it('renders tabs and preview rows', async () => {
    render(<FinancialReportingPage />);
    expect(await screen.findByText('Financial Reporting')).toBeInTheDocument();
    expect(await screen.findByText('Generate GAAP-compliant financial statements')).toBeInTheDocument();
  });

  it('shows entity selector', () => {
    render(<FinancialReportingPage />);
    expect(screen.getByTestId('entity-selector')).toBeInTheDocument();
  });

  it('shows period date picker', () => {
    render(<FinancialReportingPage />);
    expect(screen.getByLabelText('Period End Date')).toBeInTheDocument();
  });

  it('shows generate statements button', () => {
    render(<FinancialReportingPage />);
    const buttons = screen.getAllByText('Generate Statements');
    expect(buttons.length).toBeGreaterThan(0);
  });
});