'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useTheme } from 'next-themes';
import { Partner, Entity, Transaction, DashboardMetrics, LoadingState } from '@/types';
import { apiClient } from '@/lib/api';

// App State Interface
interface AppState {
  // Authentication
  user: Partner | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  
  // Current selections
  currentEntity: Entity | null;
  
  // Data
  entities: Entity[];
  dashboardMetrics: DashboardMetrics | null;
  pendingApprovals: Transaction[];
  recentTransactions: Transaction[];
  
  // Loading states
  entitiesLoading: boolean;
  metricsLoading: boolean;
  approvalsLoading: boolean;
  transactionsLoading: boolean;
  
  // Error states
  error: string | null;
}

// Action Types
type AppAction = 
  | { type: 'SET_USER'; payload: Partner | null }
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
  | { type: 'SET_CURRENT_ENTITY'; payload: Entity | null }
  | { type: 'SET_ENTITIES'; payload: Entity[] }
  | { type: 'SET_DASHBOARD_METRICS'; payload: DashboardMetrics }
  | { type: 'SET_PENDING_APPROVALS'; payload: Transaction[] }
  | { type: 'SET_RECENT_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'SET_ENTITIES_LOADING'; payload: boolean }
  | { type: 'SET_METRICS_LOADING'; payload: boolean }
  | { type: 'SET_APPROVALS_LOADING'; payload: boolean }
  | { type: 'SET_TRANSACTIONS_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_TRANSACTION_STATUS'; payload: { id: string; status: string; approved_by?: string } }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'CLEAR_DATA' };

// Initial State
const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  authLoading: true,
  currentEntity: null,
  entities: [],
  dashboardMetrics: null,
  pendingApprovals: [],
  recentTransactions: [],
  entitiesLoading: false,
  metricsLoading: false,
  approvalsLoading: false,
  transactionsLoading: false,
  error: null,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        authLoading: false,
      };
    
    case 'SET_AUTH_LOADING':
      return { ...state, authLoading: action.payload };
    
    case 'SET_CURRENT_ENTITY':
      return { ...state, currentEntity: action.payload };
    
    case 'SET_ENTITIES':
      return { 
        ...state, 
        entities: action.payload,
        currentEntity: state.currentEntity || action.payload[0] || null
      };
    
    case 'SET_DASHBOARD_METRICS':
      return { ...state, dashboardMetrics: action.payload };
    
    case 'SET_PENDING_APPROVALS':
      return { ...state, pendingApprovals: action.payload };
    
    case 'SET_RECENT_TRANSACTIONS':
      return { ...state, recentTransactions: action.payload };
    
    case 'SET_ENTITIES_LOADING':
      return { ...state, entitiesLoading: action.payload };
    
    case 'SET_METRICS_LOADING':
      return { ...state, metricsLoading: action.payload };
    
    case 'SET_APPROVALS_LOADING':
      return { ...state, approvalsLoading: action.payload };
    
    case 'SET_TRANSACTIONS_LOADING':
      return { ...state, transactionsLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'UPDATE_TRANSACTION_STATUS':
      return {
        ...state,
        pendingApprovals: state.pendingApprovals.map(transaction =>
          transaction.id === action.payload.id
            ? { ...transaction, approval_status: action.payload.status as any, approved_by: action.payload.approved_by }
            : transaction
        ).filter(t => action.payload.status === 'pending' || t.id !== action.payload.id),
        recentTransactions: state.recentTransactions.map(transaction =>
          transaction.id === action.payload.id
            ? { ...transaction, approval_status: action.payload.status as any, approved_by: action.payload.approved_by }
            : transaction
        ),
      };
    
    case 'ADD_TRANSACTION':
      return {
        ...state,
        pendingApprovals: [action.payload, ...state.pendingApprovals],
        recentTransactions: [action.payload, ...state.recentTransactions.slice(0, 9)],
      };
    
    case 'CLEAR_DATA':
      return {
        ...initialState,
        user: null,
        isAuthenticated: false,
        authLoading: false,
      };
    
    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Action creators
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadDashboardData: () => Promise<void>;
  loadEntities: () => Promise<void>;
  approveTransaction: (id: string) => Promise<void>;
  rejectTransaction: (id: string, reason?: string) => Promise<void>;
  createTransaction: (data: any) => Promise<void>;
  setCurrentEntity: (entity: Entity | null) => void;
  clearError: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider Props
interface AppProviderProps {
  children: ReactNode;
}

// Provider Component
export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { setTheme: applyTheme } = useTheme();

  // Action creators
  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: 'SET_AUTH_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      await apiClient.login({ email, password });
      const user = await apiClient.getProfile();
      dispatch({ type: 'SET_USER', payload: user });
      // Load and apply theme preference from backend
      try {
        const prefs = await apiClient.getPreferences();
        const prefTheme = (prefs?.theme as any) || 'light';
        localStorage.setItem('theme_preference', prefTheme);
        applyTheme(prefTheme);
      } catch {}
      
      // Load initial data
      await loadDashboardData();
      await loadEntities();
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Login failed' });
      dispatch({ type: 'SET_AUTH_LOADING', payload: false });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Redirect first to marketing, then attempt Clerk sign-out in background
      try {
        const marketing = (process.env.NEXT_PUBLIC_STUDENT_BASE_URL || 'http://localhost:3001') as string;
        window.location.replace(marketing);
      } catch {}
      try {
        const anyWin: any = window as any;
        await anyWin?.Clerk?.signOut?.({ redirectUrl: undefined });
      } catch {}
      dispatch({ type: 'CLEAR_DATA' });
    }
  };

  const loadDashboardData = async () => {
    try {
      dispatch({ type: 'SET_METRICS_LOADING', payload: true });
      dispatch({ type: 'SET_APPROVALS_LOADING', payload: true });
      dispatch({ type: 'SET_TRANSACTIONS_LOADING', payload: true });
      
      const [metrics, approvals, transactions] = await Promise.all([
        apiClient.getDashboardMetrics(),
        apiClient.getPendingApprovals(),
        apiClient.getRecentTransactions(10),
      ]);
      
      dispatch({ type: 'SET_DASHBOARD_METRICS', payload: metrics });
      dispatch({ type: 'SET_PENDING_APPROVALS', payload: approvals });
      dispatch({ type: 'SET_RECENT_TRANSACTIONS', payload: transactions });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Failed to load dashboard data' });
    } finally {
      dispatch({ type: 'SET_METRICS_LOADING', payload: false });
      dispatch({ type: 'SET_APPROVALS_LOADING', payload: false });
      dispatch({ type: 'SET_TRANSACTIONS_LOADING', payload: false });
    }
  };

  const loadEntities = async () => {
    try {
      dispatch({ type: 'SET_ENTITIES_LOADING', payload: true });
      const entities = await apiClient.getEntities();
      dispatch({ type: 'SET_ENTITIES', payload: entities });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Failed to load entities' });
    } finally {
      dispatch({ type: 'SET_ENTITIES_LOADING', payload: false });
    }
  };

  const approveTransaction = async (id: string) => {
    try {
      await apiClient.approveTransaction(id);
      dispatch({ 
        type: 'UPDATE_TRANSACTION_STATUS', 
        payload: { id, status: 'approved', approved_by: state.user?.email }
      });
      
      // Reload dashboard metrics to reflect changes
      loadDashboardData();
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Failed to approve transaction' });
      throw error;
    }
  };

  const rejectTransaction = async (id: string, reason?: string) => {
    try {
      await apiClient.rejectTransaction(id, reason);
      dispatch({ 
        type: 'UPDATE_TRANSACTION_STATUS', 
        payload: { id, status: 'rejected' }
      });
      
      // Reload dashboard metrics to reflect changes
      loadDashboardData();
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Failed to reject transaction' });
      throw error;
    }
  };

  const createTransaction = async (data: any) => {
    try {
      const transaction = await apiClient.createTransaction(data);
      dispatch({ type: 'ADD_TRANSACTION', payload: transaction });
      
      // Reload dashboard metrics to reflect changes
      loadDashboardData();
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Failed to create transaction' });
      throw error;
    }
  };

  const setCurrentEntity = (entity: Entity | null) => {
    dispatch({ type: 'SET_CURRENT_ENTITY', payload: entity });
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const user = await apiClient.getProfile();
        dispatch({ type: 'SET_USER', payload: user });
        try {
          const prefs = await apiClient.getPreferences();
          const prefTheme = (prefs?.theme as any) || 'light';
          localStorage.setItem('theme_preference', prefTheme);
          applyTheme(prefTheme);
        } catch {}
        await Promise.all([loadDashboardData(), loadEntities()]);
      } catch (error) {
        dispatch({ type: 'SET_AUTH_LOADING', payload: false });
      }
    };

    initializeApp();
  }, []);

  const value: AppContextType = {
    state,
    dispatch,
    login,
    logout,
    loadDashboardData,
    loadEntities,
    approveTransaction,
    rejectTransaction,
    createTransaction,
    setCurrentEntity,
    clearError,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook to use the App context
export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
