import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import JournalEntriesPage from '@/app/accounting/journal-entries/page'

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

describe('Journal Entries Page', () => {
  beforeEach(() => {
    (global.fetch as any) = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );
  });

  it('renders journal entries page', async () => {
    render(<JournalEntriesPage />);
    // Use role heading to be more specific
    expect(await screen.findByRole('heading', { name: 'Journal Entries' })).toBeInTheDocument();
  });

  it('shows entity selector', () => {
    render(<JournalEntriesPage />);
    expect(screen.getByTestId('entity-selector')).toBeInTheDocument();
  });
});