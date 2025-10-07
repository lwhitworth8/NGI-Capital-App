import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import PeriodClosePage from '@/app/accounting/period-close/page'

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

describe('Period Close Page', () => {
  beforeEach(() => {
    (global.fetch as any) = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );
  });

  it('renders period close page', async () => {
    render(<PeriodClosePage />);
    // More flexible regex
    expect(await screen.findByText(/Period Close/i)).toBeInTheDocument();
  });

  it('shows entity selector', () => {
    render(<PeriodClosePage />);
    expect(screen.getByTestId('entity-selector')).toBeInTheDocument();
  });
});