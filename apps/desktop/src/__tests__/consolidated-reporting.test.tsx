import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ConsolidatedReportingPage from '@/app/accounting/consolidated-reporting/page'

// Mock useEntityContext hook
jest.mock('@/hooks/useEntityContext', () => ({
  useEntityContext: () => ({
    selectedEntityId: 1,
    setSelectedEntityId: jest.fn(),
  }),
  EntityProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock EntitySelector
jest.mock('@/components/accounting/EntitySelector', () => ({
  EntitySelector: ({ value, onChange }: any) => (
    <div data-testid="entity-selector">Entity Selector Mock</div>
  ),
}));

describe('Consolidated Reporting Page', () => {
  beforeEach(() => {
    (global.fetch as any) = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );
  });

  it('renders consolidated reporting page', async () => {
    render(<ConsolidatedReportingPage />);
    expect(await screen.findByRole('heading', { name: 'Consolidated Reporting' })).toBeInTheDocument();
  });

  it('shows entity selector', () => {
    render(<ConsolidatedReportingPage />);
    expect(screen.getByTestId('entity-selector')).toBeInTheDocument();
  });
});