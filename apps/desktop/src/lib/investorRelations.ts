import { apiClient } from './api'

export interface Holder { id: number; name: string; email?: string; ownership_percentage?: number; capital_account_balance?: number }

export interface CapTableLLC { total_equity: number; members: { name: string; equity: number }[] }
export interface CapTableCorp { total_equity: number; common_equity: number; instruments?: { type: string; amount: number }[] }

export async function irGetCapTable(entityId?: number): Promise<any> {
  return apiClient.request('GET', '/api/investor-relations/cap-table', undefined, { params: entityId ? { entity_id: entityId } : {} })
}

export async function irListOutreach(stage?: string): Promise<any[]> {
  return apiClient.request('GET', '/api/investor-relations/outreach', undefined, { params: stage ? { stage } : {} })
}

export async function irCreateOutreach(data: { name: string; email?: string; firm?: string; stage?: string; notes?: string }): Promise<{ id: number }> {
  return apiClient.request('POST', '/api/investor-relations/outreach', data)
}

export async function irUpdateOutreach(id: number, data: any): Promise<{ message: string }> {
  return apiClient.request('PUT', `/api/investor-relations/outreach/${id}`, data)
}

export async function irDeleteOutreach(id: number): Promise<{ message: string }> {
  return apiClient.request('DELETE', `/api/investor-relations/outreach/${id}`)
}

export async function irListComms(investorId?: number): Promise<any[]> {
  return apiClient.request('GET', '/api/investor-relations/communications', undefined, { params: investorId ? { investor_id: investorId } : {} })
}

export async function irCreateComm(data: { investor_id: number; subject?: string; message?: string }): Promise<{ id: number }> {
  return apiClient.request('POST', '/api/investor-relations/communications', data)
}

export async function irSummary(): Promise<{ investors: number; pipeline: Record<string, number> }> {
  return apiClient.request('GET', '/api/investor-relations/reports/summary')
}

export async function irKpis(): Promise<{ investors: number; pipeline: Record<string, number>; communications_30: number; upcoming_actions_14: number }> {
  return apiClient.request('GET', '/api/investor-relations/reports/kpis')
}

export async function irSchedule(entityId?: number): Promise<{ schedule: { entity_id: number; entity_name: string; quarter_end: string; report_due: string }[] }> {
  return apiClient.request('GET', '/api/investor-relations/reports/schedule', undefined, { params: entityId ? { entity_id: entityId } : {} })
}

export async function irMarkReportSent(data: { entity_id: number; period_start: string; period_end: string; due_date: string }): Promise<{ message: string }> {
  return apiClient.request('POST', '/api/investor-relations/reports/mark-sent', data)
}
