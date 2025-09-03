import { z } from 'zod'

export const Investor = z.object({
  id: z.string(),
  legal_name: z.string(),
  firm: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  type: z.enum(['Angel','VC','Family Office','Strategic','Other']).default('Other'),
  notes: z.string().nullable().optional(),
})
export type Investor = z.infer<typeof Investor>

export const InvestorsList = z.object({
  items: z.array(Investor.pick({ id: true, legal_name: true, firm: true, email: true, phone: true, type: true })),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
})
export type InvestorsList = z.infer<typeof InvestorsList>

export const PipelineItem = z.object({
  pipelineId: z.string(),
  investor: z.object({ id: z.string(), name: z.string(), firm: z.string().nullable().optional(), email: z.string().nullable().optional() }),
  ownerUserId: z.string().nullable().optional(),
  lastActivityAt: z.string().nullable().optional(),
})
export type PipelineItem = z.infer<typeof PipelineItem>

export const PipelineStage = z.object({
  stage: z.enum(['Not Started','Diligence','Pitched','Won','Lost']),
  items: z.array(PipelineItem),
})
export type PipelineStage = z.infer<typeof PipelineStage>

export const KPI = z.object({
  total: z.number(),
  inPipeline: z.number(),
  won: z.number(),
  activeThis30d: z.number(),
  lastContactAvgDays: z.number(),
  daysToQuarterEnd: z.number(),
  daysToNextReport: z.number(),
})
export type KPI = z.infer<typeof KPI>

export const Report = z.object({
  id: z.string(),
  entityId: z.number(),
  period: z.string(),
  type: z.enum(['Quarterly','Monthly','Ad Hoc']),
  status: z.enum(['Draft','In Review','Ready','Submitted']),
  dueDate: z.string().nullable().optional(),
  submittedAt: z.string().nullable().optional(),
  ownerUserId: z.string().nullable().optional(),
  currentDocUrl: z.string().nullable().optional(),
})
export type Report = z.infer<typeof Report>

export const Reports = z.object({
  current: Report.nullable().optional(),
  past: z.array(Report),
})
export type Reports = z.infer<typeof Reports>

export const Round = z.object({
  id: z.string(),
  entityId: z.number().nullable().optional(),
  roundType: z.enum(['Pre-Seed','Seed','Series A','Series B','SAFE','Other']),
  targetAmount: z.number(),
  softCommits: z.number(),
  hardCommits: z.number(),
  closeDate: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  consolidated: z.boolean().default(false),
})
export type Round = z.infer<typeof Round>

export const Contribution = z.object({
  id: z.string(),
  investorId: z.string().nullable().optional(),
  amount: z.number(),
  status: z.enum(['Soft','Hard','Closed','Withdrawn']).default('Soft'),
  recordedAt: z.string(),
})
export type Contribution = z.infer<typeof Contribution>

export const Contributions = z.array(Contribution)

