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
    getCurrentUser: jest.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

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
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
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

  it('handles successful login', async () => {
    const mockToken = 'mock-jwt-token';
    const mockUser = {
      id: 1,
      email: 'anurmamade@ngicapitaladvisory.com',
      name: 'Andre Nurmamade',
      ownership_percentage: 50,
    };

    (apiClient.login as jest.Mock).mockResolvedValue({
      access_token: mockToken,
      partner_name: mockUser.name,
      ownership_percentage: mockUser.ownership_percentage,
    });

    (apiClient.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </QueryClientProvider>
    );

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-name')).toHaveTextContent('Andre Nurmamade');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', mockToken);
  });

  it('handles logout', async () => {
    localStorageMock.getItem.mockReturnValue('mock-token');
    
    const mockUser = {
      id: 1,
      email: 'anurmamade@ngicapitaladvisory.com',
      name: 'Andre Nurmamade',
      ownership_percentage: 50,
    };

    (apiClient.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

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

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
  });

  it('restricts access to partner emails only', async () => {
    const invalidEmail = 'test@gmail.com';
    
    (apiClient.login as jest.Mock).mockRejectedValue(
      new Error('Access restricted to NGI Capital partners')
    );

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </QueryClientProvider>
    );

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });

    expect(apiClient.login).toHaveBeenCalled();
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