import { format, formatDistanceToNow, parseISO } from 'date-fns'

export type FlowStatus = 'in_progress' | 'onboarded' | 'canceled' | string

export type FlowFile = {
  id: number
  file_name: string
  file_url: string
  uploaded_by?: string | null
  uploaded_at?: string | null
}

export type Flow = {
  id: number
  student_id: number
  project_id: number
  student_email?: string | null
  student_name?: string | null
  project_name?: string | null
  ngi_email?: string | null
  email_created: boolean
  intern_agreement_sent: boolean
  intern_agreement_received: boolean
  nda_required: boolean
  nda_sent: boolean
  nda_received: boolean
  status: FlowStatus
  created_by?: string | null
  created_at?: string | null
  updated_at?: string | null
  files?: FlowFile[]
}

export type FlowFormState = {
  student_id?: number
  project_id?: number
  nda_required: boolean
}

export type FlowStatusFilter = 'all' | 'in_progress' | 'awaiting_docs' | 'onboarded' | 'canceled'

export type FlowStatus = 'in_progress' | 'onboarded' | 'canceled' | string

export type FlowToggleField =
  | 'email_created'
  | 'intern_agreement_sent'
  | 'intern_agreement_received'
  | 'nda_required'
  | 'nda_sent'
  | 'nda_received'

export type ChecklistItem = {
  key: FlowToggleField
  label: string
  description?: string
  disabled?: boolean
  complete: boolean
}

export const parseDate = (value?: string | null): Date | null => {
  if (!value) return null
  try {
    return parseISO(value)
  } catch (err) {
    return null
  }
}

export const formatShortDate = (value?: string | null): string => {
  const parsed = parseDate(value)
  return parsed ? format(parsed, 'MMM d, yyyy') : '—'
}

export const formatRelativeTime = (value?: string | null): string => {
  const parsed = parseDate(value)
  return parsed ? formatDistanceToNow(parsed, { addSuffix: true }) : '—'
}

export const buildFlowChecklist = (flow: Flow): ChecklistItem[] => {
  const items: ChecklistItem[] = [
    {
      key: 'email_created',
      label: 'NGI email created',
      description: 'Provision the analyst email account in Google Admin and confirm sign-in works.',
      complete: !!flow.email_created,
    },
    {
      key: 'intern_agreement_sent',
      label: 'Intern agreement sent',
      description: 'Send the DocuSign (or manual email) for the internship agreement.',
      complete: !!flow.intern_agreement_sent,
    },
    {
      key: 'intern_agreement_received',
      label: 'Intern agreement signed',
      description: 'Confirm the signed agreement is received and filed in Documents.',
      complete: !!flow.intern_agreement_received,
    },
  ]

  if (flow.nda_required) {
    items.push(
      {
        key: 'nda_sent',
        label: 'NDA sent',
        description: 'Send the NDA package if required for the client engagement.',
        complete: !!flow.nda_sent,
      },
      {
        key: 'nda_received',
        label: 'NDA signed',
        description: 'Confirm the signed NDA is received and archived with the engagement documents.',
        complete: !!flow.nda_received,
      },
    )
  }

  return items
}
