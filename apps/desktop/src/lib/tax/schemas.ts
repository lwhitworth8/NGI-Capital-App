import { z } from 'zod'

export const TaxEntity = z.object({
  id: z.union([z.number(), z.string()]),
  legalName: z.string(),
  entityType: z.string(),
  domicile: z.string().nullable().optional(),
  operatingStates: z.union([z.array(z.string()), z.string()]).nullable().optional(),
  taxElection: z.string().nullable().optional(),
})
export type TaxEntityT = z.infer<typeof TaxEntity>

export const TaxObligation = z.object({
  id: z.string(),
  jurisdiction: z.string(),
  form: z.string(),
  frequency: z.string(),
  dueRule: z.any(),
  calcMethod: z.string().nullable().optional(),
  active: z.boolean(),
})
export type TaxObligationT = z.infer<typeof TaxObligation>

export const TaxCalendarItem = z.object({
  id: z.string(),
  jurisdiction: z.string(),
  form: z.string(),
  dueDate: z.string(),
  filingId: z.string().nullable().optional(),
  status: z.string(),
})
export type TaxCalendarItemT = z.infer<typeof TaxCalendarItem>

export const TaxFiling = z.object({
  id: z.string(),
  jurisdiction: z.string(),
  form: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  dueDate: z.string().nullable().optional(),
  status: z.string(),
  amount: z.number().optional(),
  filedDate: z.string().nullable().optional(),
  confirmationNumber: z.string().nullable().optional(),
})
export type TaxFilingT = z.infer<typeof TaxFiling>

export const TaxDocument = z.object({
  id: z.string(),
  year: z.number(),
  jurisdiction: z.string(),
  form: z.string(),
  title: z.string(),
  fileUrl: z.string(),
  uploadedAt: z.string().optional(),
})
export type TaxDocumentT = z.infer<typeof TaxDocument>

