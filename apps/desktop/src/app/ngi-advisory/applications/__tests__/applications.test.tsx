import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock Auth and App contexts so the page renders in tests
jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { email: 'anurmamade@ngicapitaladvisory.com' }, loading: false }),
}))
jest.mock('@/lib/context/AppContext', () => ({
  useApp: () => ({ state: { currentEntity: { id: 1, legal_name: 'NGI Capital' } } }),
}))

// Mock Advisory APIs
const mockList = jest.fn()
const mockUpdate = jest.fn()
jest.mock('@/lib/api', () => ({
  advisoryListApplications: (...args: any[]) => (mockList as any)(...args),
  advisoryUpdateApplication: (...args: any[]) => (mockUpdate as any)(...args),
}))

// Import after mocks
import ApplicationsPage from '../page'

describe('Advisory Applications Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockList.mockResolvedValue([
      { id: 10, first_name: 'Sam', last_name: 'Lee', email: 'slee@ucla.edu', status: 'new', created_at: new Date().toISOString() },
      { id: 11, first_name: 'Ava', last_name: 'Chen', email: 'achen@berkeley.edu', status: 'interview', created_at: new Date().toISOString() },
    ])
  })

  it('renders Kanban with columns, toggles to Table, and updates status', async () => {
    render(<ApplicationsPage />)

    // Wait for initial load
    await waitFor(() => expect(mockList).toHaveBeenCalled())
    // Basic render: at least one column title exists
    expect(screen.getAllByText(/NEW|INTERVIEW|REVIEWING/).length).toBeGreaterThan(0)

    // Switch to table view
    fireEvent.click(screen.getByText('Table'))
    // Rows show names/emails
    expect(await screen.findByText('Sam Lee')).toBeInTheDocument()
    expect(screen.getByText('slee@ucla.edu')).toBeInTheDocument()

    // Change status via select
    const selects = screen.getAllByDisplayValue(/new|interview/i) as HTMLSelectElement[]
    const target = selects.find(s => s.value === 'new') as HTMLSelectElement
    fireEvent.change(target, { target: { value: 'reviewing' } })
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(10, { status: 'reviewing' }))
  })
})
