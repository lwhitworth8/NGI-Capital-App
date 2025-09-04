/**
 * NGI Capital Internal Application - API Client
 * 
 * Centralized API client for communicating with the FastAPI backend.
 * Handles authentication, request/response formatting, and error handling.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import {
  Partner as AppPartner,
  Entity as AppEntity,
  Transaction as AppTransaction,
  DashboardMetrics as AppDashboardMetrics,
} from '@/types'
import { toast } from 'sonner'

// Prefer relative /api in the browser so nginx can path-route at a single apex domain.
// Fall back to NEXT_PUBLIC_API_URL (or localhost) when running on the server.
const API_BASE_URL = typeof window !== 'undefined'
  ? '/api'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001')

// Types
interface ApiError {
  detail: string
  status: number
}

interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  partner_name?: string
  ownership_percentage?: number
  message?: string
  partner?: {
    name: string
    email: string
    ownership_percentage: number
  }
}

interface ApiPartner {
  id: number
  name: string
  email: string
  ownership_percentage: number
  capital_account_balance: number
  is_active: boolean
  last_login: string | null
}

interface ApiEntity {
  id: number
  legal_name: string
  entity_type: string
  ein: string | null
  formation_date: string | null
  state: string | null
  is_active: boolean
}

interface ApiTransaction {
  id: number
  entity_id: number
  transaction_date: string
  amount: number
  transaction_type: string
  description: string | null
  reference_number: string | null
  approval_status: string
  created_by: string
  approved_by: string | null
  created_at: string
}

interface ChartAccount {
  id: number
  entity_id: number
  account_code: string
  account_name: string
  account_type: string
  parent_account_id: number | null
  is_active: boolean
}

interface ApiDashboardMetrics {
  total_assets: number
  monthly_revenue: number
  monthly_expenses: number
  cash_position: number
  pending_approvals: number
  recent_transactions: ApiTransaction[]
}

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Attach Clerk session token if available (browser only)
    this.client.interceptors.request.use(
      async (config) => {
        if (typeof window !== 'undefined') {
          try {
            const anyWin: any = window as any
            const clerk = anyWin.Clerk
            if (clerk?.session?.getToken) {
              let token: string | null = null
              try { token = await clerk.session.getToken({ template: 'backend' }) } catch {}
              if (!token) {
                try { token = await clerk.session.getToken() } catch {}
              }
              if (token) {
                config.headers = config.headers || {}
                ;(config.headers as any).Authorization = `Bearer ${token}`
              }
            }
          } catch {}
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor: attempt session bridge + one retry on 401
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const status = error?.response?.status
        const original: any = error?.config || {}
        if (typeof window !== 'undefined' && status === 401 && !original.__retried401) {
          try {
            // Ask backend to set HttpOnly session cookie using current Authorization
            const auth = (original.headers?.Authorization || original.headers?.authorization) as string | undefined
            if (auth && auth.toLowerCase().startsWith('bearer ')) {
              await fetch('/api/auth/session', { method: 'POST', headers: { Authorization: auth } })
              // retry original request once
              original.__retried401 = true
              return this.client.request(original)
            }
            // If original lacked Authorization, try to obtain a Clerk token now and bridge a session
            const anyWin: any = window as any
            const clerk = anyWin?.Clerk
            if (clerk?.session?.getToken) {
              let token: string | null = null
              try { token = await clerk.session.getToken({ template: 'backend' }) } catch {}
              if (!token) {
                try { token = await clerk.session.getToken() } catch {}
              }
              if (token) {
                await fetch('/api/auth/session', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
                original.__retried401 = true
                return this.client.request(original)
              }
            }
          } catch {}
        }
        this.handleApiError(error)
        return Promise.reject(error)
      }
    )

    // No token persisted in client; cookies handle auth
  }

  private handleApiError(error: any): void {
    console.error('API Error Details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      request: error.request?.responseURL
    })
    
    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.detail || 'An error occurred'

      switch (status) {
        case 401:
          // Do not force redirect; a session-bridge retry may have already happened.
          toast.error('Authentication error. Please retry. If it persists, sign in again.')
          break
        case 403:
          toast.error('Access denied. Insufficient permissions.')
          break
        case 404:
          toast.error('Resource not found.')
          break
        case 422: {
          const detail: string = message || ''
          if (detail.toLowerCase().includes('balanced')) {
            toast.error('Journal entry must be balanced (debits equal credits).')
          } else if (detail.toLowerCase().includes('account code') || detail.toLowerCase().includes('invalid account code')) {
            toast.error('Invalid Chart of Accounts mapping. Use 5-digit code and correct type (1xxxx asset, 2xxxx liability, 3xxxx equity, 4xxxx revenue, 5xxxx expense).')
          } else {
            toast.error('Invalid data provided.')
          }
          break
        }
        case 500:
          toast.error('Server error. Please try again later.')
          break
        default:
          toast.error(message)
      }
    } else if (error.request) {
      console.error('No response received:', error.request)
      toast.error('Network error. Please check your connection.')
    } else {
      console.error('Request setup error:', error.message)
      toast.error('Request failed. Please try again.')
    }
  }

  setAuthToken(token: string): void {
    // No-op in cookie-based auth; kept for backward compatibility
  }

  clearAuth(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
    }
  }

  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    console.log('Attempting login with URL:', `${API_BASE_URL}/auth/sign-in`)
    console.log('Credentials:', { email: credentials.email, password: '***' })
    
    try {
      const response = await this.client.post('/auth/sign-in', credentials)
      console.log('Login response received:', response.data)
      
      const data = response.data
      // Establish HttpOnly cookie session
      try {
        if (data?.access_token) {
          await this.client.post('/auth/session', { access_token: data.access_token })
        }
      } catch (e) {
        console.warn('Failed to establish cookie session', e)
      }
      // Normalize the response to always have partner object
      if (!data.partner && data.partner_name) {
        data.partner = {
          name: data.partner_name,
          email: credentials.email,
          ownership_percentage: data.ownership_percentage || 50
        }
      }
      return data
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  // Profile endpoint (maps /auth/me to Partner)
  async getProfile(): Promise<AppPartner> {
    const response = await this.client.get('/auth/me')
    const me = response.data
    const partner: AppPartner = {
      id: me.id?.toString?.() || '0',
      name: me.name || 'Partner',
      email: me.email,
      ownership_percentage: me.ownership_percentage ?? 0,
      capital_account_balance: me.capital_account_balance ?? 0,
      is_active: me.is_active ?? true,
      created_at: me.created_at || new Date().toISOString(),
    }
    return partner
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout')
    } catch (error) {
      // Ignore logout errors
    } finally {
      this.clearAuth()
    }
  }

  // Password reset & profile preferences
  async requestPasswordReset(email: string): Promise<void> {
    await this.client.post('/auth/request-password-reset', { email })
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.client.post('/auth/reset-password', { token, new_password: newPassword })
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const res = await this.client.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword })
    return res.data
  }

  async getPreferences(): Promise<{ theme: 'light'|'dark'|'system' }> {
    const res = await this.client.get('/preferences')
    return res.data
  }

  async setPreferences(prefs: { theme: 'light'|'dark'|'system' }): Promise<{ message: string }> {
    const res = await this.client.post('/preferences', prefs)
    return res.data
  }

  // Dashboard endpoints
  async getDashboardMetrics(): Promise<AppDashboardMetrics> {
    const response = await this.client.get('/dashboard/metrics')
    const r = response.data || {}
    const result: AppDashboardMetrics = {
      total_aum: r.total_assets ?? 0,
      monthly_revenue: r.monthly_revenue ?? 0,
      monthly_expenses: r.monthly_expenses ?? 0,
      net_income: (r.monthly_revenue ?? 0) - (r.monthly_expenses ?? 0),
      pending_approvals_count: r.pending_approvals ?? 0,
      cash_position: [],
      entity_performance: [],
    }
    return result
  }

  // Entity management endpoints
  async getEntities(): Promise<AppEntity[]> {
    const response = await this.client.get('/entities')
    const items = Array.isArray(response.data) ? response.data : (response.data?.entities ?? [])
    const mapped: AppEntity[] = items.map((e: any) => ({
      id: e.id?.toString?.() ?? '0',
      legal_name: e.legal_name ?? '',
      entity_type: e.entity_type ?? '',
      ein: e.ein ?? '',
      formation_date: e.formation_date ?? new Date().toISOString(),
      state: e.state ?? '',
      parent_entity_id: e.parent_entity_id?.toString?.(),
      is_active: e.is_active ?? true,
      created_at: e.created_at ?? new Date().toISOString(),
    }))
    return mapped
  }

  async createEntity(entityData: Partial<AppEntity>): Promise<AppEntity> {
    const response = await this.client.post('/entities', entityData)
    const e = response.data
    const mapped: AppEntity = {
      id: e.id?.toString?.() ?? '0',
      legal_name: e.legal_name ?? '',
      entity_type: e.entity_type ?? '',
      ein: e.ein ?? '',
      formation_date: e.formation_date ?? new Date().toISOString(),
      state: e.state ?? '',
      parent_entity_id: e.parent_entity_id?.toString?.(),
      is_active: e.is_active ?? true,
      created_at: e.created_at ?? new Date().toISOString(),
    }
    return mapped
  }

  async updateEntity(id: number | string, entityData: Partial<AppEntity>): Promise<AppEntity> {
    const response = await this.client.put(`/entities/${id}`, entityData)
    const e = response.data
    const mapped: AppEntity = {
      id: e.id?.toString?.() ?? '0',
      legal_name: e.legal_name ?? '',
      entity_type: e.entity_type ?? '',
      ein: e.ein ?? '',
      formation_date: e.formation_date ?? new Date().toISOString(),
      state: e.state ?? '',
      parent_entity_id: e.parent_entity_id?.toString?.(),
      is_active: e.is_active ?? true,
      created_at: e.created_at ?? new Date().toISOString(),
    }
    return mapped
  }

  // Accounting endpoints
  async getChartOfAccounts(entityId?: number): Promise<ChartAccount[]> {
    if (!entityId) return []
    const response = await this.client.get(`/accounting/chart-of-accounts/${entityId}`)
    return response.data
  }

  async createChartAccount(accountData: Partial<ChartAccount>): Promise<ChartAccount> {
    const response = await this.client.post('/accounting/chart-of-accounts', accountData)
    return response.data
  }

  async updateChartAccount(id: number, accountData: Partial<ChartAccount>): Promise<ChartAccount> {
    const response = await this.client.put(`/accounting/chart-of-accounts/${id}`, accountData)
    return response.data
  }

  async getJournalEntries(params?: { entity_id?: number; start_date?: string; end_date?: string; status?: string }): Promise<ApiTransaction[]> {
    if (!params?.entity_id) return []
    const { entity_id, ...rest } = params
    const response = await this.client.get('/accounting/journal-entries', { params: { entity_id, ...rest } })
    return response.data
  }

  async createJournalEntry(entryData: any): Promise<ApiTransaction> {
    const response = await this.client.post('/accounting/journal-entries', entryData)
    return response.data
  }

  async getJournalEntryDetails(entryId: number): Promise<any> {
    const response = await this.client.get(`/accounting/journal-entries/entry/${entryId}`)
    return response.data
  }

  async approveJournalEntry(entryId: number): Promise<void> {
    await this.client.post(`/accounting/journal-entries/${entryId}/approve`)
  }

  async getTrialBalance(entityId: number, asOfDate: string): Promise<any> {
    const response = await this.client.get('/accounting/financials/trial-balance', { params: { entity_id: entityId, as_of_date: asOfDate } })
    return response.data
  }

  // Banking endpoints
  async getBankAccounts(): Promise<any[]> {
    const response = await this.client.get('/banking/accounts')
    return response.data.accounts
  }

  async syncBankTransactions(): Promise<any> {
    const response = await this.client.post('/banking/sync')
    return response.data
  }

  // Reports endpoints
  async generateIncomeStatement(startDate: string, endDate: string): Promise<any> {
    const response = await this.client.get('/reports/income-statement', {
      params: { start_date: startDate, end_date: endDate }
    })
    return response.data
  }

  async generateBalanceSheet(asOfDate: string): Promise<any> {
    const response = await this.client.get('/reports/balance-sheet', {
      params: { as_of_date: asOfDate }
    })
    return response.data
  }

  // --- Tax API ---
  async taxGetEntities(): Promise<{ defaultId?: number|string; items: any[] }> {
    const res = await this.client.get('/tax/entities')
    return res.data
  }
  async taxGetProfile(entityId: number|string): Promise<any> {
    const res = await this.client.get('/tax/profile', { params: { entity: entityId } })
    return res.data
  }
  async taxGetObligations(entityId: number|string): Promise<any[]> {
    const res = await this.client.get('/tax/obligations', { params: { entity: entityId } })
    return res.data
  }
  async taxSeedObligations(entityId: number|string): Promise<{ seeded: number }> {
    const res = await this.client.post('/tax/seed-obligations', undefined, { params: { entity: entityId } })
    return res.data
  }
  async taxRefreshCalendar(entityId: number|string): Promise<{ updated: number }> {
    const res = await this.client.post('/tax/refresh-calendar', undefined, { params: { entity: entityId } })
    return res.data
  }
  async taxGetCalendar(entityId: number|string, from?: string, to?: string): Promise<any[]> {
    const res = await this.client.get('/tax/calendar', { params: { entity: entityId, from, to } })
    return res.data
  }
  async taxGetFilings(entityId: number|string, year?: number): Promise<any[]> {
    const res = await this.client.get('/tax/filings', { params: { entity: entityId, year } })
    return res.data
  }
  async taxUpsertFiling(data: { entityId: number|string; jurisdiction: string; form: string; periodStart: string; periodEnd: string; dueDate?: string; amount?: number }): Promise<{ id: string }> {
    const res = await this.client.post('/tax/filings', data)
    return res.data
  }
  async taxPatchFiling(id: string, patch: { status?: string; amount?: number; filedDate?: string; confirmationNumber?: string }): Promise<{ message: string }> {
    const res = await this.client.patch(`/tax/filings/${id}`, patch)
    return res.data
  }
  async taxGetDocuments(entityId: number|string, year?: number): Promise<any[]> {
    const res = await this.client.get('/tax/documents', { params: { entity: entityId, year } })
    return res.data
  }
  async taxAddDocument(data: { entityId: number|string; year: number; jurisdiction: string; form: string; title: string; fileUrl: string }): Promise<{ id: string }> {
    const res = await this.client.post('/tax/documents', data)
    return res.data
  }
  async taxCalcDEFranchise(data: { entityId: number|string; method: 'authorized'|'assumed'; inputs: Record<string, any> }): Promise<any> {
    const res = await this.client.post('/tax/calc/de-franchise', data)
    return res.data
  }
  async taxCalcCaLlcFee(data: { entityId: number|string; year: number; revenue: { total: number; caPortion?: number } }): Promise<any> {
    const res = await this.client.post('/tax/calc/ca-llc-fee', data)
    return res.data
  }
  // Config
  async taxListConfigVersions(): Promise<any[]> {
    const res = await this.client.get('/tax/config/versions')
    return res.data
  }
  async taxCreateConfigVersion(notes?: string): Promise<{ id: string }> {
    const res = await this.client.post('/tax/config/versions', { notes })
    return res.data
  }
  async taxListConfigItems(versionId?: string): Promise<any[]> {
    const res = await this.client.get('/tax/config/items', { params: { versionId } })
    return res.data
  }
  async taxUpsertConfigItem(item: { id?: string; versionId: string; key: string; value: any }): Promise<{ id: string }> {
    const res = await this.client.post('/tax/config/items', item)
    return res.data
  }

  // Transaction approval endpoints
  async approveTransaction(transactionId: number | string): Promise<void> {
    await this.client.post(`/transactions/${transactionId}/approve`)
  }

  // Placeholder: pending approvals (backend route TBD)
  async getPendingApprovals(): Promise<AppTransaction[]> {
    try {
      const response = await this.client.get('/transactions/pending')
      const items = response.data?.transactions ?? []
      return items.map((t: any) => ({
        id: t.id?.toString?.() ?? '0',
        entity_id: t.entity_id?.toString?.() ?? '0',
        transaction_date: t.transaction_date ?? new Date().toISOString(),
        amount: Number(t.amount ?? 0),
        transaction_type: t.transaction_type ?? '',
        description: t.description ?? '',
        created_by: t.created_by ?? '',
        approved_by: t.approved_by?.toString?.(),
        approval_status: t.approval_status ?? 'pending',
        created_at: t.created_at ?? new Date().toISOString(),
      }))
    } catch {
      return []
    }
  }

  // Placeholder: recent transactions (backend route TBD)
  async getRecentTransactions(limit = 10): Promise<AppTransaction[]> {
    try {
      const response = await this.client.get('/transactions/recent', { params: { limit } })
      const items = response.data?.transactions ?? []
      return items.map((t: any) => ({
        id: t.id?.toString?.() ?? '0',
        entity_id: t.entity_id?.toString?.() ?? '0',
        transaction_date: t.transaction_date ?? new Date().toISOString(),
        amount: Number(t.amount ?? 0),
        transaction_type: t.transaction_type ?? '',
        description: t.description ?? '',
        created_by: t.created_by ?? '',
        approved_by: t.approved_by?.toString?.(),
        approval_status: t.approval_status ?? 'pending',
        created_at: t.created_at ?? new Date().toISOString(),
      }))
    } catch {
      return []
    }
  }

  // Placeholder: create transaction
  async createTransaction(data: any): Promise<AppTransaction> {
    const response = await this.client.post('/transactions', data)
    const t = response.data
    const mapped: AppTransaction = {
      id: t.id?.toString?.() ?? '0',
      entity_id: t.entity_id?.toString?.() ?? '0',
      transaction_date: t.transaction_date ?? new Date().toISOString(),
      amount: Number(t.amount ?? 0),
      transaction_type: t.transaction_type ?? '',
      description: t.description ?? '',
      created_by: t.created_by ?? '',
      approved_by: t.approved_by?.toString?.(),
      approval_status: t.approval_status ?? 'pending',
      created_at: t.created_at ?? new Date().toISOString(),
    }
    return mapped
  }

  // Placeholder: reject transaction
  async rejectTransaction(id: string | number, reason?: string): Promise<void> {
    await this.client.post(`/transactions/${id}/reject`, { reason })
  }

  // Documents API
  async documentsUpload(files: File[]): Promise<{ documents: { id: string; filename: string }[] }> {
    const form = new FormData()
    for (const f of files) form.append('files', f)
    const res = await this.client.post('/documents/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    return { documents: (res.data?.documents || []).map((d: any) => ({ id: d.id, filename: d.filename || d.original_name })) }
  }
  async documentsProcess(id: string, entityId?: number): Promise<any> {
    const res = await this.client.post(`/documents/${id}/process`, undefined, { params: { entity_id: entityId } })
    return res.data
  }
  async documentsList(opts?: { doc_type?: string; limit?: number }): Promise<{ documents: any[]; total: number }> {
    const res = await this.client.get('/documents', { params: opts })
    return res.data
  }
  async documentsGet(id: string): Promise<any> {
    const res = await this.client.get(`/documents/${id}`)
    return res.data
  }
  async documentsPatch(id: string, patch: Partial<{ vendor: string; invoice_number: string; issue_date: string; due_date: string; currency: string; subtotal: number; tax: number; total: number }>): Promise<{ message: string }>{
    const res = await this.client.patch(`/documents/${id}/metadata`, patch)
    return res.data
  }
  async documentsPostToLedger(id: string): Promise<{ message: string; journal_entry_id: number }>{
    const res = await this.client.post(`/documents/${id}/post-to-ledger`)
    return res.data
  }

  // Banking/Mercury
  async bankingMercurySync(entitySlug?: string): Promise<{ accounts: number; transactions: number; matched: number }>{
    const res = await this.client.post('/banking/mercury/sync', undefined, { params: { entity: entitySlug } })
    return res.data
  }
  async bankingListUnmatched(): Promise<any[]> {
    const res = await this.client.get('/banking/reconciliation/unmatched')
    return res.data
  }
  async bankingManualMatch(txnId: number, journalEntryId: number): Promise<{ message: string }>{
    const res = await this.client.post('/banking/reconciliation/match', { txn_id: txnId, journal_entry_id: journalEntryId })
    return res.data
  }
  async bankingCreateJEFromTxn(data: { txn_id: number; entity_id: number; debit_account_id: number; credit_account_id: number; description?: string }): Promise<{ id: number }>{
    const res = await this.client.post('/banking/reconciliation/create-je', data)
    return res.data
  }
  async bankingSplitTxn(data: { txn_id: number; splits: { amount: number; description?: string }[] }): Promise<{ message: string; parts: number }>{
    const res = await this.client.post('/banking/reconciliation/split', data)
    return res.data
  }
  async bankingReconciliationStats(): Promise<{ bank_account_id: number; account_name: string; cleared: number; total: number; percent: number }[]> {
    const res = await this.client.get('/banking/reconciliation/stats')
    return res.data
  }

  // Accounting conversion + close
  async accountingConversionPreview(data: { effective_date: string; source_entity_id: number; target_entity_id: number; par_value: number; total_shares: number }): Promise<any> {
    const res = await this.client.post('/accounting/conversion/preview', data)
    return res.data
  }
  async accountingConversionExecute(data: { effective_date: string; source_entity_id: number; target_entity_id: number; par_value: number; total_shares: number }): Promise<any> {
    const res = await this.client.post('/accounting/conversion/execute', data)
    return res.data
  }
  async accountingClosePreview(entityId: number, year: number, month: number): Promise<any> {
    const res = await this.client.get('/accounting/close/preview', { params: { entity_id: entityId, year, month } })
    return res.data
  }
  async accountingCloseRun(entityId: number, year: number, month: number): Promise<any> {
    const res = await this.client.post('/accounting/close/run', { entity_id: entityId, year, month })
    return res.data
  }
  async accountingApprovalsPending(): Promise<any[]> {
    const res = await this.client.get('/accounting/approvals/pending')
    return res.data
  }
  async accountingApproveJE(entryId: number): Promise<any> {
    const res = await this.client.post(`/accounting/journal-entries/${entryId}/approve`, { approve: true })
    return res.data
  }
  async accountingExportClosePacket(entityId: number, year: number, month: number): Promise<Blob> {
    const res = await this.client.get('/accounting/exports/close-packet', { params: { entity_id: entityId, year, month }, responseType: 'blob' })
    return res.data
  }
  // Templates
  async accountingTemplateAccrual(data: { entity_id: number; expense_account_id: number; accrual_account_id: number; amount: number; date?: string }): Promise<{ id: number }>{
    const res = await this.client.post('/accounting/templates/accrual', data)
    return res.data
  }
  async accountingTemplatePrepaid(data: { entity_id: number; prepaid_account_id: number; cash_account_id: number; amount: number; date?: string }): Promise<{ id: number }>{
    const res = await this.client.post('/accounting/templates/prepaid', data)
    return res.data
  }
  async accountingTemplateDeferralRevenue(data: { entity_id: number; deferred_revenue_account_id: number; revenue_account_id: number; amount: number; start_date: string; months: number }): Promise<{ created: number }>{
    const res = await this.client.post('/accounting/templates/deferral-revenue', data)
    return res.data
  }
  async accountingTemplateDepreciation(data: { entity_id: number; asset_account_id: number; accum_depr_account_id: number; expense_account_id: number; amount: number; start_date: string; useful_life_months: number }): Promise<{ created: number }>{
    const res = await this.client.post('/accounting/templates/depreciation/straight-line', data)
    return res.data
  }

  // Generic request method for custom endpoints
  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.request({
      method,
      url: endpoint,
      data,
      ...config,
    })
    return response.data
  }
}

// Create singleton instance
export const apiClient = new ApiClient()

// Export types
export type { ApiError, LoginRequest, LoginResponse, ChartAccount }

// Export class for custom instances if needed
export { ApiClient }

// ===================== HR / Employees API =====================
export interface Team {
  id: number
  name: string
  description?: string
  is_active?: boolean
}

export interface Project {
  id: number
  name: string
  description?: string
  status?: string
}

export interface Employee {
  id: number
  name: string
  email: string
  title?: string
  role?: string
  classification?: string
  status?: string
  employment_type?: string
  start_date?: string
  end_date?: string
  team_id?: number | null
  team_name?: string
  projects?: { id: number; name: string }[]
}

export async function hrGetTeams(entityId: number): Promise<Team[]> {
  return apiClient.request('GET', '/teams', undefined, { params: { entity_id: entityId } })
}

export async function hrCreateTeam(data: { entity_id: number; name: string; description?: string }): Promise<Team> {
  return apiClient.request('POST', '/teams', data)
}

export async function hrGetProjects(entityId: number): Promise<Project[]> {
  return apiClient.request('GET', '/projects', undefined, { params: { entity_id: entityId } })
}

export async function hrCreateProject(data: { entity_id: number; name: string; description?: string; status?: string }): Promise<Project> {
  return apiClient.request('POST', '/projects', data)
}

export async function hrGetEmployees(entityId: number): Promise<Employee[]> {
  return apiClient.request('GET', '/employees', undefined, { params: { entity_id: entityId } })
}

export async function hrCreateEmployee(data: {
  entity_id: number
  name: string
  email: string
  title?: string
  role?: string
  classification?: string
  status?: string
  employment_type?: string
  start_date?: string
  end_date?: string
  team_id?: number | null
  manager_id?: number | null
  project_ids?: number[]
}): Promise<{ id: number }> {
  return apiClient.request('POST', '/employees', data)
}

export async function hrUpdateEmployee(id: number, data: any): Promise<{ message: string }> {
  return apiClient.request('PUT', `/employees/${id}`, data)
}

export async function hrDeleteEmployee(id: number): Promise<{ message: string }> {
  return apiClient.request('DELETE', `/employees/${id}`)
}

// Employees KPIs & To-Dos
export async function hrGetEmployeeKpis(entityId: number): Promise<any> {
  return apiClient.request('GET', '/employees/kpis', undefined, { params: { entity_id: entityId } })
}

export async function hrGetEmployeeTodos(entityId: number, opts?: { assignee?: number; status?: string }): Promise<any[]> {
  const params: any = { entity_id: entityId }
  if (opts?.assignee) params.assignee = opts.assignee
  if (opts?.status) params.status = opts.status
  return apiClient.request('GET', '/employee-todos', undefined, { params })
}

export async function hrCreateEmployeeTodo(data: { entity_id: number; employee_id?: number; title: string; notes?: string; due_at?: string; status?: string }): Promise<{ id: number }> {
  return apiClient.request('POST', '/employee-todos', data)
}

export async function hrPatchEmployeeTodo(id: number, patch: { title?: string; notes?: string; due_at?: string; status?: string; employee_id?: number }): Promise<{ message: string }> {
  return apiClient.request('PATCH', `/employee-todos/${id}`, patch)
}
// ===================== NGI Advisory API =====================
import type { AdvisoryProject, AdvisoryStudent, AdvisoryApplication, AdvisoryCoffeeChat } from '@/types'

export async function advisoryListProjects(params?: { entity_id?: number; status?: string; mode?: 'remote'|'in_person'|'hybrid'; q?: string }): Promise<AdvisoryProject[]> {
  const res = await apiClient.request<AdvisoryProject[]>('GET', '/advisory/projects', undefined, { params })
  return res
}

export async function advisoryCreateProject(data: Partial<AdvisoryProject>): Promise<{ id: number }> {
  // Backend requires: project_name, client_name, summary
  return apiClient.request('POST', '/advisory/projects', data)
}

export async function advisoryUpdateProject(id: number, patch: Partial<AdvisoryProject>): Promise<{ id: number }> {
  return apiClient.request('PUT', `/advisory/projects/${id}`, patch)
}

export async function advisoryListStudents(params?: { entity_id?: number; q?: string }): Promise<AdvisoryStudent[]> {
  return apiClient.request('GET', '/advisory/students', undefined, { params })
}

export async function advisoryCreateStudent(data: Partial<AdvisoryStudent>): Promise<{ id: number }> {
  // Backend requires: email (unique)
  return apiClient.request('POST', '/advisory/students', data)
}

export async function advisoryUpdateStudent(id: number, patch: Partial<AdvisoryStudent>): Promise<{ id: number }> {
  return apiClient.request('PUT', `/advisory/students/${id}`, patch)
}

export async function advisoryDeleteStudent(id: number): Promise<{ id: number; deleted: boolean }> {
  return apiClient.request('DELETE', `/advisory/students/${id}`)
}

export async function advisoryListApplications(params?: { entity_id?: number; status?: string; project_id?: number; q?: string }): Promise<AdvisoryApplication[]> {
  return apiClient.request('GET', '/advisory/applications', undefined, { params })
}

export async function advisoryCreateApplication(data: Partial<AdvisoryApplication>): Promise<{ id: number }> {
  return apiClient.request('POST', '/advisory/applications', data)
}

export async function advisoryUpdateApplication(id: number, patch: Partial<AdvisoryApplication>): Promise<{ id: number }> {
  return apiClient.request('PUT', `/advisory/applications/${id}`, patch)
}

export async function advisoryListCoffeechats(params?: { entity_id?: number }): Promise<AdvisoryCoffeeChat[]> {
  return apiClient.request('GET', '/advisory/coffeechats', undefined, { params })
}

export async function advisorySyncCoffeechats(): Promise<{ synced: number }> {
  return apiClient.request('POST', '/advisory/coffeechats/sync')
}

export async function advisoryGetProject(id: number): Promise<import('@/types').AdvisoryProject & { assignments?: any[] }> {
  return apiClient.request('GET', `/advisory/projects/${id}`)
}

export async function advisoryAddAssignment(projectId: number, data: { student_id: number; role?: string; hours_planned?: number }): Promise<{ id: number }> {
  return apiClient.request('POST', `/advisory/projects/${projectId}/assignments`, data)
}

export async function advisoryUpdateAssignment(id: number, patch: { role?: string; hours_planned?: number; active?: boolean | number }): Promise<{ id: number }> {
  return apiClient.request('PUT', `/advisory/assignments/${id}`, patch)
}

export async function advisoryDeleteAssignment(id: number): Promise<{ id: number; active: number }> {
  return apiClient.request('DELETE', `/advisory/assignments/${id}`)
}

export async function advisoryListOnboardingTemplates(): Promise<{ id: number; name: string; description?: string }[]> {
  return apiClient.request('GET', '/advisory/onboarding/templates')
}

export async function advisoryCreateOnboardingTemplate(data: { name: string; description?: string; steps?: { step_key: string; title: string; provider?: string; config?: any }[] }): Promise<{ id: number }> {
  return apiClient.request('POST', '/advisory/onboarding/templates', data)
}

export async function advisoryUpdateOnboardingTemplate(id: number, patch: any): Promise<{ id: number }> {
  return apiClient.request('PUT', `/advisory/onboarding/templates/${id}`, patch)
}

export async function advisoryCreateOnboardingInstance(data: { student_id: number; template_id: number; project_id?: number }): Promise<{ id: number }> {
  return apiClient.request('POST', '/advisory/onboarding/instances', data)
}

export async function advisoryListOnboardingInstances(params?: { student_id?: number; project_id?: number }): Promise<any[]> {
  return apiClient.request('GET', '/advisory/onboarding/instances', undefined, { params })
}

export async function advisoryMarkOnboardingStep(iid: number, stepKey: string, data: { status: 'pending' | 'sent' | 'completed' | 'failed'; evidence_url?: string; external_id?: string }): Promise<{ id: number; step_key: string; status: string }> {
  return apiClient.request('POST', `/advisory/onboarding/instances/${iid}/steps/${encodeURIComponent(stepKey)}/mark`, data)
}
// Accounting: Unposted entries and batch post
export async function accountingGetUnpostedEntries(entityId: number): Promise<{ id: number; entry_number: string; entry_date: string; description: string }[]> {
  const data = await apiClient.request<{ entries?: any[] }>('GET', '/accounting/journal-entries/unposted', undefined, { params: { entity_id: entityId } })
  return data?.entries ?? []
}

export async function accountingPostBatchEntries(options: { entity_id?: number; entry_ids?: number[]; start_date?: string; end_date?: string }): Promise<{ posted: number }> {
  return apiClient.request('POST', '/accounting/journal-entries/post-batch', options)
}

