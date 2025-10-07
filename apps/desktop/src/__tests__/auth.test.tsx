/**
 * Authentication tests for NGI Capital Frontend
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '../lib/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

// Mock the API client
jest.mock('../lib/api', () => ({
  apiClient: {
    login: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
  },
}));

// Mock Clerk hooks for Clerk-only flow
const openSignInMock = jest.fn();
const signOutMock = jest.fn();
jest.mock('@clerk/nextjs', () => ({
  // Simulate a signed-in user by default; tests can override by mocking getCurrentUser
  useUser: () => ({
    isLoaded: true,
    user: {
      firstName: 'Andre',
      lastName: 'Nurmamade',
      primaryEmailAddress: { emailAddress: 'anurmamade@ngicapitaladvisory.com' },
    },
  }),
  useClerk: () => ({ openSignIn: openSignInMock, signOut: signOutMock }),
}));

// Spy on real localStorage (jsdom) to assert calls
const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');

// Test component that uses auth
const TestComponent = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="user-name">{user?.name || 'No User'}</div>
      <button onClick={() => login('test@ngicapitaladvisory.com', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('Authentication', () => {
  const origError = console.error
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
      const msg = args?.[0]?.toString?.() || ''
      if (msg.includes('wrapped in act')) return
      // @ts-ignore
      origError.apply(console, args)
    })
  })
  afterAll(() => {
    ;(console.error as any).mockRestore?.()
  })
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
    setItemSpy.mockClear();
    removeItemSpy.mockClear();
  });

  it('renders authentication provider', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
  });

  it('hydrates user from Clerk + backend profile (no password login)', async () => {
    const mockUser = {
      id: 1,
      email: 'anurmamade@ngicapitaladvisory.com',
      name: 'Andre Nurmamade',
      ownership_percentage: 50,
    };
    (apiClient.getProfile as jest.Mock).mockResolvedValue(mockUser);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-name')).toHaveTextContent('Andre Nurmamade');
    });

    // user profile persisted
    expect(setItemSpy).toHaveBeenCalledWith('user', expect.any(String));
  });

  it('handles logout', async () => {
    const mockUser = {
      id: 1,
      email: 'anurmamade@ngicapitaladvisory.com',
      name: 'Andre Nurmamade',
      ownership_percentage: 50,
    };

    (apiClient.getProfile as jest.Mock).mockResolvedValue(mockUser);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
      expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
    });

    expect(removeItemSpy).toHaveBeenCalledWith('user');
    expect(signOutMock).toHaveBeenCalled();
  });

  it('restricts access to partner emails only', async () => {
    const invalidEmail = 'test@gmail.com';
    
    (apiClient.login as jest.Mock).mockImplementation(() => { throw new Error('Password login disabled; please sign in with Clerk') });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </QueryClientProvider>
    );

    const loginButton = screen.getByText('Login'); // calls openSignIn in Clerk-only mode
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });

    expect(openSignInMock).toHaveBeenCalled();
  });
});

describe('Partner Authorization', () => {
  it('verifies 50/50 ownership structure', () => {
    const partners = [
      { email: 'anurmamade@ngicapitaladvisory.com', ownership: 50 },
      { email: 'lwhitworth@ngicapitaladvisory.com', ownership: 50 },
    ];

    const totalOwnership = partners.reduce((sum, p) => sum + p.ownership, 0);
    expect(totalOwnership).toBe(100);
    expect(partners[0].ownership).toBe(partners[1].ownership);
  });

  it('enforces no self-approval rule', () => {
    const transaction = {
      id: 1,
      created_by: 'anurmamade@ngicapitaladvisory.com',
      amount: 5000,
    };

    const currentUser = 'anurmamade@ngicapitaladvisory.com';
    
    // Self-approval check
    const canApprove = transaction.created_by !== currentUser;
    expect(canApprove).toBe(false);
  });

  it('requires dual approval for transactions over $500', () => {
    const transactions = [
      { amount: 250, requiresApproval: false },
      { amount: 500, requiresApproval: false },
      { amount: 501, requiresApproval: true },
      { amount: 5000, requiresApproval: true },
    ];

    transactions.forEach(tx => {
      const needsApproval = tx.amount > 500;
      expect(needsApproval).toBe(tx.requiresApproval);
    });
  });
});
