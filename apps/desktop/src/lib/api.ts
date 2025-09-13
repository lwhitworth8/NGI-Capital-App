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

    // Response interceptor: attempt session bridge + one retry on 401 (can be disabled)
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const status = error?.response?.status
        const original: any = error?.config || {}
        const bridgeDisabled = (process.env.NEXT_PUBLIC_DISABLE_SESSION_BRIDGE || '0').toLowerCase() === '1'
        if (typeof window !== 'undefined' && status === 401 && !original.__retried401 && !bridgeDisabled) {
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
      const message = error.response.data?.detail || error.response.data?.message || 'An error occurred'
      const normalize = (val: any): string => {
        if (typeof val === 'string') return val
        if (Array.isArray(val)) {
          try {
            return val.map((v) => (typeof v === 'string' ? v : (v?.msg || v?.message || ''))).join(' ').trim() || 'Unprocessable entity'
          } catch { return 'Unprocessable entity' }
        }
        if (val && typeof val === 'object') {
          const s = (val.detail || val.message || val.msg)
          if (typeof s === 'string') return s
          try { return JSON.stringify(val) } catch { return 'An error occurred' }
        }
        try { return String(val) } catch { return 'An error occurred' }
      }
      const messageStr = normalize(message)

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
          const detail = (messageStr || '').toLowerCase()
          if (detail.includes('balanced')) {
            toast.error('Journal entry must be balanced (debits equal credits).')
          } else if (detail.includes('account code') || detail.includes('invalid account code')) {
            toast.error('Invalid Chart of Accounts mapping. Use 5-digit code and correct type (1xxxx asset, 2xxxx liability, 3xxxx equity, 4xxxx revenue, 5xxxx expense).')
          } else {
            toast.error(messageStr || 'Invalid data provided.')
          }
          break
        }
        case 500:
          toast.error('Server error. Please try again later.')
          break
        default:
          toast.error(messageStr)
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
    throw new Error('Password login disabled; please sign in with Clerk')
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
  async requestPasswordReset(_email: string): Promise<void> { throw new Error('Password reset is managed by Clerk') }
  async resetPassword(_token: string, _newPassword: string): Promise<void> { throw new Error('Password reset is managed by Clerk') }
  async changePassword(_currentPassword: string, _newPassword: string): Promise<{ message: string }> { throw new Error('Password change is managed by Clerk') as any }

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

// Lead Manager (PLM)
export async function plmListTasks(projectId: number): Promise<any[]> {
  return apiClient.request('GET', `/advisory/projects/${projectId}/tasks`)
}

export async function plmCreateTask(projectId: number, data: any): Promise<{ id: number }> {
  return apiClient.request('POST', `/advisory/projects/${projectId}/tasks`, data)
}

export async function plmAddComment(taskId: number, data: { body: string; submission_version?: number }): Promise<{ id: number }>{
  return apiClient.request('POST', `/advisory/tasks/${taskId}/comments`, data)
}

export async function plmListComments(taskId: number): Promise<Array<{ id:number; author_email?: string; body: string; created_at: string }>>{
  return apiClient.request('GET', `/advisory/tasks/${taskId}/comments`)
}

export async function plmCreateMeeting(projectId: number, data: { title?: string; start_ts: string; end_ts: string; attendees_emails?: string[] }): Promise<{ id: number; google_event_id?: string }>{
  return apiClient.request('POST', `/advisory/projects/${projectId}/meetings`, data)
}

export async function plmListMeetings(projectId: number): Promise<any[]> {
  return apiClient.request('GET', `/advisory/projects/${projectId}/meetings`)
}

export async function plmAddResourceLink(projectId: number, data: { title?: string; url: string }): Promise<{ id:number; kind: 'link'|'package' }>{
  const params = new URLSearchParams({ kind: 'link', title: data.title || '', url: data.url })
  return apiClient.request('POST', `/advisory/projects/${projectId}/resources?${params.toString()}`)
}

export async function plmListResources(projectId: number): Promise<any[]> {
  return apiClient.request('GET', `/advisory/projects/${projectId}/resources`)
}

export async function plmListTimesheets(projectId: number): Promise<any[]> {
  return apiClient.request('GET', `/advisory/projects/${projectId}/timesheets`)
}

export async function plmListDeliverables(projectId: number): Promise<any[]> {
  return apiClient.request('GET', `/advisory/projects/${projectId}/deliverables`)
}

// Milestones
export async function plmListMilestones(projectId: number): Promise<Array<{ id:number; title:string; start_date?:string; end_date?:string; ord?:number }>>{
  return apiClient.request('GET', `/advisory/projects/${projectId}/milestones`)
}
export async function plmCreateMilestone(projectId: number, data: { title: string; start_date?: string; end_date?: string; ord?: number }): Promise<{ id:number }>{
  return apiClient.request('POST', `/advisory/projects/${projectId}/milestones`, data)
}
export async function plmUpdateMilestone(id: number, patch: Partial<{ title:string; start_date:string; end_date:string; ord:number }>): Promise<{ id:number }>{
  return apiClient.request('PATCH', `/advisory/milestones/${id}`, patch)
}
export async function plmDeleteMilestone(id: number): Promise<{ deleted: boolean }>{
  return apiClient.request('DELETE', `/advisory/milestones/${id}`)
}

export async function advisoryListStudents(params?: { entity_id?: number; q?: string; status?: string; page?: number; page_size?: number }): Promise<AdvisoryStudent[]> {
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

export async function advisorySoftDeleteStudent(id: number): Promise<{ id: number; deleted: boolean; soft?: boolean }> {
  return apiClient.request('POST', `/advisory/students/${id}/soft-delete`)
}

export async function advisoryRestoreStudent(id: number): Promise<{ id: number; restored_from: number }> {
  return apiClient.request('POST', `/advisory/students/${id}/restore`)
}

export async function advisoryOverrideStudentStatus(id: number, data: { status?: 'active'|'alumni'; reason?: string; clear?: boolean }): Promise<{ id: number }>{
  return apiClient.request('PUT', `/advisory/students/${id}/status-override`, data)
}

export async function advisoryCreateStudentAssignment(studentId: number, data: { project_id: number; role?: string; hours_planned?: number }): Promise<{ id: number }>{
  return apiClient.request('POST', `/advisory/students/${studentId}/assignments`, data)
}

export async function advisoryGetStudentTimeline(studentId: number): Promise<{ applications: any[]; coffeechats: any[]; onboarding: any[] }>{
  return apiClient.request('GET', `/advisory/students/${studentId}/timeline`)
}

export async function advisoryListArchivedStudents(params?: { q?: string; page?: number; page_size?: number }): Promise<Array<{ id:number; original_id:number; email:string; deleted_at:string; deleted_by?:string; snapshot?: any }>> {
  return apiClient.request('GET', `/advisory/students/archived`, undefined, { params })
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

export async function advisoryGetApplication(id: number): Promise<AdvisoryApplication & { attachments: { id:number; file_name:string; file_url:string; uploaded_by?:string; uploaded_at:string }[]; rejection_reason?: string | null; answers_json?: any }>{
  return apiClient.request('GET', `/advisory/applications/${id}`)
}

export async function advisoryRejectApplication(id: number, reason?: string): Promise<{ id: number; status: string }>{
  return apiClient.request('POST', `/advisory/applications/${id}/reject`, { reason })
}

export async function advisoryWithdrawApplication(id: number): Promise<{ id: number; status: string }>{
  return apiClient.request('POST', `/advisory/applications/${id}/withdraw`)
}

export async function advisoryUploadApplicationAttachment(id: number, file: File): Promise<{ file_url: string; file_name: string }>{
  const form = new FormData()
  form.append('file', file)
  return apiClient.request('POST', `/advisory/applications/${id}/attachments`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export async function advisoryListArchivedApplications(params?: { q?: string; page?: number; page_size?: number }): Promise<Array<{ id:number; original_id:number; email:string; snapshot:any; archived_at:string; reason?:string }>>{
  return apiClient.request('GET', '/advisory/applications/archived', undefined, { params })
}

export async function advisoryListCoffeechats(params?: { entity_id?: number }): Promise<AdvisoryCoffeeChat[]> {
  return apiClient.request('GET', '/advisory/coffeechats', undefined, { params })
}

export async function advisorySyncCoffeechats(): Promise<{ synced: number }> {
  return apiClient.request('POST', '/advisory/coffeechats/sync')
}

// ----- Coffee Chats (Internal Scheduling) -----
export async function advisoryListCoffeeAvailability(): Promise<import('@/types').AdvisoryCoffeeAvailability[]> {
  return apiClient.request('GET', '/advisory/coffeechats/availability')
}

export async function advisoryAddCoffeeAvailability(data: { start_ts: string; end_ts: string; slot_len_min?: number }): Promise<{ id: number }> {
  return apiClient.request('POST', '/advisory/coffeechats/availability', data)
}

export async function advisoryDeleteCoffeeAvailability(id: number): Promise<{ id: number }> {
  return apiClient.request('DELETE', `/advisory/coffeechats/availability/${id}`)
}

export async function advisoryListCoffeeRequests(params?: { status?: string; admin_email?: string }): Promise<import('@/types').AdvisoryCoffeeRequest[]> {
  return apiClient.request('GET', '/advisory/coffeechats/requests', undefined, { params })
}

export async function advisoryAcceptCoffeeRequest(id: number): Promise<{ status: string; google_event_id?: string; owner?: string }>{
  return apiClient.request('POST', `/advisory/coffeechats/requests/${id}/accept`)
}

export async function advisoryProposeCoffeeRequest(id: number, data: { start_ts: string; end_ts: string }): Promise<{ id: number; status: string; proposed_ts: string }>{
  return apiClient.request('POST', `/advisory/coffeechats/requests/${id}/propose`, data)
}

export async function advisoryCancelCoffeeRequest(id: number, reason: 'student'|'admin' = 'admin'): Promise<{ id: number; status: string; reason: string }>{
  return apiClient.request('POST', `/advisory/coffeechats/requests/${id}/cancel`, { reason })
}

export async function advisoryCompleteCoffeeRequest(id: number): Promise<{ id: number; status: string }>{
  return apiClient.request('POST', `/advisory/coffeechats/requests/${id}/complete`)
}

export async function advisoryNoShowCoffeeRequest(id: number, actor: 'student'|'admin' = 'admin'): Promise<{ id: number; status: string; cooldown_until_ts: string }>{
  return apiClient.request('POST', `/advisory/coffeechats/requests/${id}/no-show`, { actor })
}

export async function advisoryExpireCoffeeRequests(): Promise<{ ok: boolean }>{
  return apiClient.request('POST', '/advisory/coffeechats/expire')
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

// ----- NGI Advisory Projects: Leads, Questions, Media Uploads -----
export async function advisoryGetProjectLeads(projectId: number): Promise<{ leads: string[] }> {
  return apiClient.request('GET', `/advisory/projects/${projectId}/leads`)
}

export async function advisorySetProjectLeads(projectId: number, emails: string[]): Promise<{ id: number; leads: string[] }> {
  return apiClient.request('PUT', `/advisory/projects/${projectId}/leads`, { emails })
}

export async function advisoryGetProjectQuestions(projectId: number): Promise<{ prompts: string[] }> {
  return apiClient.request('GET', `/advisory/projects/${projectId}/questions`)
}

export async function advisorySetProjectQuestions(projectId: number, prompts: string[]): Promise<{ id: number; count: number }> {
  return apiClient.request('PUT', `/advisory/projects/${projectId}/questions`, { prompts })
}

export async function advisoryUploadProjectHero(projectId: number, file: File): Promise<{ hero_image_url: string }>{
  const form = new FormData()
  form.append('file', file)
  return apiClient.request('POST', `/advisory/projects/${projectId}/hero`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export async function advisoryUploadProjectGallery(projectId: number, file: File): Promise<{ gallery_urls: string[] }>{
  const form = new FormData()
  form.append('file', file)
  return apiClient.request('POST', `/advisory/projects/${projectId}/gallery`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export async function advisoryUploadProjectShowcase(projectId: number, file: File): Promise<{ showcase_pdf_url: string }>{
  const form = new FormData()
  form.append('file', file)
  return apiClient.request('POST', `/advisory/projects/${projectId}/showcase`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
}

// Logos (partner/backer)
export async function advisoryGetProjectLogos(projectId: number): Promise<{ partner_logos: { name: string; url: string }[]; backer_logos: { name: string; url: string }[] }>{
  return apiClient.request('GET', `/advisory/projects/${projectId}/logos`)
}

// Known clients
export async function advisoryGetKnownClients(): Promise<{ clients: { name: string; slug: string; logo_url: string }[] }>{
  return apiClient.request('GET', '/advisory/known-clients')
}

export async function advisoryUploadProjectLogo(projectId: number, kind: 'partner'|'backer', file: File, name?: string): Promise<{ partner_logos?: any[]; backer_logos?: any[] }>{
  const form = new FormData()
  form.append('file', file)
  if (name) form.append('name', name)
  return apiClient.request('POST', `/advisory/projects/${projectId}/logos/${encodeURIComponent(kind)}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
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


