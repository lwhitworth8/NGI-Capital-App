import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import TrialBalancePage from '@/app/accounting/trial-balance/page'

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

describe('Trial Balance Page', () => {
  beforeEach(() => {
    (global.fetch as any) = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ accounts: [] }),
      })
    );
  });

  it('renders trial balance page', async () => {
    render(<TrialBalancePage />);
    // Use getAllByText for multiple occurrences or just verify page loads
    expect(await screen.findByRole('heading', { name: 'Trial Balance' })).toBeInTheDocument();
  });

  it('shows entity selector', () => {
    render(<TrialBalancePage />);
    expect(screen.getByTestId('entity-selector')).toBeInTheDocument();
  });
});