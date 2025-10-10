import { buildFlowChecklist, formatShortDate, type Flow } from '../helpers'

describe('onboarding helpers', () => {
  const baseFlow: Flow = {
    id: 1,
    student_id: 10,
    project_id: 20,
    student_email: 'analyst@example.com',
    student_name: 'Analyst Example',
    project_name: 'Sample Project',
    ngi_email: 'analyst@ngi.capital',
    email_created: false,
    intern_agreement_sent: false,
    intern_agreement_received: false,
    nda_required: true,
    nda_sent: false,
    nda_received: false,
    status: 'in_progress',
    created_by: 'Owner',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    files: [],
  }

  it('includes NDA tasks when required', () => {
    const checklist = buildFlowChecklist(baseFlow)
    const keys = checklist.map((item) => item.key)
    expect(keys).toEqual([
      'email_created',
      'intern_agreement_sent',
      'intern_agreement_received',
      'nda_sent',
      'nda_received',
    ])
  })

  it('omits NDA tasks when not required', () => {
    const checklist = buildFlowChecklist({ ...baseFlow, nda_required: false })
    const keys = checklist.map((item) => item.key)
    expect(keys).toEqual(['email_created', 'intern_agreement_sent', 'intern_agreement_received'])
  })

  it('formats short dates with fallback', () => {
    expect(formatShortDate('2024-01-15T12:00:00Z')).toBe('Jan 15, 2024')
    expect(formatShortDate(undefined)).toBe('—')
  })
})
