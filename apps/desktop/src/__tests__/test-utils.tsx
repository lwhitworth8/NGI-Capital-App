import React, { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Mock EntityProvider for tests
export function MockEntityProvider({ children }: { children: ReactNode }) {
  const mockContext = {
    selectedEntityId: 1,
    setSelectedEntityId: jest.fn(),
  };

  // Use React.createElement to avoid JSX issues
  return React.createElement(
    'div',
    { 'data-testid': 'entity-provider-mock' },
    children
  );
}

// Mock useEntityContext hook
export const mockUseEntityContext = () => ({
  selectedEntityId: 1,
  setSelectedEntityId: jest.fn(),
});

// Custom render function that wraps with providers
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MockEntityProvider>{children}</MockEntityProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { renderWithProviders as render };




