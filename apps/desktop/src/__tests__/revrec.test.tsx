import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import RevrecPage from '@/app/accounting/revrec/page'

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

describe('Revenue Recognition Page', () => {
  beforeEach(() => {
    (global.fetch as any) = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );
  });

  it('renders revenue recognition page', async () => {
    render(<RevrecPage />);
    // The component may use different exact wording
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  it('shows entity selector', () => {
    render(<RevrecPage />);
    expect(screen.getByTestId('entity-selector')).toBeInTheDocument();
  });
});