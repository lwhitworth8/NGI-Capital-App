import { apiClient } from '@/lib/api'
import { z } from 'zod'
import { KPI, InvestorsList, PipelineStage, Reports, Round, Contributions } from './schemas'

export async function invGetKpis(entityId: number) {
  const data = await apiClient.request('GET', '/investors/kpis', undefined, { params: { entity_id: entityId } })
  return KPI.parse(data)
}

export async function invListInvestors(entityId: number, opts?: { q?: string; type?: string; page?: number; pageSize?: number }) {
  const params: any = { entity_id: entityId }
  if (opts?.q) params.q = opts.q
  if (opts?.type) params.type = opts.type
  if (opts?.page) params.page = opts.page
  if (opts?.pageSize) params.pageSize = opts.pageSize
  const data = await apiClient.request('GET', '/investors', undefined, { params })
  return InvestorsList.parse(data)
}

export async function invSearchInvestors(opts: { q: string; entityId?: number; limit?: number }) {
  const params: any = { q: opts.q }
  if (opts.entityId) params.entity_id = opts.entityId
  if (opts.limit) params.limit = opts.limit
  return apiClient.request('GET', '/investors/search', undefined, { params }) as Promise<{ id: string; legal_name: string; firm?: string; email?: string }[]>
}

export async function invGetRaiseCosts(entityId?: number, consolidated?: boolean) {
  const params: any = {}
  if (entityId && !consolidated) params.entity_id = entityId
  if (consolidated) params.consolidated = true
  return apiClient.request('GET', '/investors/raise-costs', undefined, { params }) as Promise<{ segments: { label: string; value: number }[] }>
}

export async function invCreateInvestor(payload: { legal_name: string; firm?: string; email?: string; phone?: string; type?: string; notes?: string }) {
  const data = await apiClient.request('POST', '/investors', payload)
  return z.object({ id: z.string() }).parse(data)
}

export async function invUpdateInvestor(id: string, patch: any) {
  return apiClient.request('PATCH', `/investors/${id}`, patch)
}

export async function invGetPipeline(entityId: number, opts?: { q?: string; stage?: string; sort?: string }) {
  const params: any = { entity_id: entityId }
  if (opts?.q) params.q = opts.q
  if (opts?.stage) params.stage = opts.stage
  if (opts?.sort) params.sort = opts.sort
  const data = await apiClient.request('GET', '/investors/pipeline', undefined, { params })
  return z.array(PipelineStage).parse(data)
}

export async function invUpsertPipeline(payload: { entityId: number; investorId: string; stage?: string; ownerUserId?: string }) {
  return apiClient.request('POST', '/investors/pipeline', payload)
}

export async function invPatchPipeline(id: string, patch: any) {
  return apiClient.request('PATCH', `/investors/pipeline/${id}`, patch)
}

export async function invLinkInvestor(payload: { entityId: number; investorId: string; stage?: string; ownerUserId?: string }) {
  return apiClient.request('POST', '/investors/link', payload)
}

export async function invListInteractions(pipelineId: string) {
  return apiClient.request('GET', `/investors/${pipelineId}/interactions`)
}

export async function invCreateInteraction(pipelineId: string, payload: any) {
  return apiClient.request('POST', `/investors/${pipelineId}/interactions`, payload)
}

export async function invGetReports(entityId: number) {
  const data = await apiClient.request('GET', '/investors/reports', undefined, { params: { entity_id: entityId } })
  return Reports.parse(data)
}

export async function invCreateReport(payload: { entityId: number; period: string; type?: string; dueDate?: string }) {
  return apiClient.request('POST', '/investors/reports', payload)
}

export async function invPatchReport(id: string, patch: any) {
  return apiClient.request('PATCH', `/investors/reports/${id}`, patch)
}

export async function invAttachReportFile(id: string, payload: any) {
  return apiClient.request('POST', `/investors/reports/${id}/files`, payload)
}

export async function invListRounds(entityId?: number, consolidated?: boolean) {
  const params: any = {}
  if (consolidated) params.consolidated = true
  if (entityId && !consolidated) params.entity_id = entityId
  const data = await apiClient.request('GET', '/investors/rounds', undefined, { params })
  return z.array(Round).parse(data)
}

export async function invCreateRound(payload: { entityId?: number; roundType?: string; targetAmount: number; closeDate?: string; description?: string; consolidated?: boolean }) {
  return apiClient.request('POST', '/investors/rounds', payload)
}

export async function invPatchRound(id: string, patch: any) {
  return apiClient.request('PATCH', `/investors/rounds/${id}`, patch)
}

export async function invListContribs(roundId: string) {
  const data = await apiClient.request('GET', `/investors/rounds/${roundId}/contribs`)
  return Contributions.parse(data)
}

export async function invAddContrib(roundId: string, payload: { investorId?: string; amount: number; status?: string }) {
  return apiClient.request('POST', `/investors/rounds/${roundId}/contribs`, payload)
}
