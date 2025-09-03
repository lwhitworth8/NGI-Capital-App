import { labelsForEntityName, EmployeeSchema, validateStatusTransition } from '@/lib/schemas'

describe('Advisory label switcher', () => {
  it('switches to Students/Projects for Advisory LLC', () => {
    const labels = labelsForEntityName('NGI Capital Advisory LLC')
    expect(labels.people).toBe('Students')
    expect(labels.groups).toBe('Projects')
    expect(labels.todos).toBe('Student To-Dos')
  })

  it('uses Employees/Teams for non-Advisory entities', () => {
    const labels = labelsForEntityName('NGI Capital Inc')
    expect(labels.people).toBe('Employees')
    expect(labels.groups).toBe('Teams')
  })
})

describe('Employee schema', () => {
  it('validates name and email', () => {
    const v = EmployeeSchema.parse({ name: 'Jane Doe', email: 'jane@example.com' })
    expect(v.name).toBe('Jane Doe')
  })

  it('requires end_date when inactivating', () => {
    expect(() => validateStatusTransition({ status: 'Active' }, { status: 'Inactive' })).toThrow()
    expect(() => validateStatusTransition({ status: 'Active' }, { status: 'Inactive', end_date: '2025-09-01' })).not.toThrow()
  })
})

