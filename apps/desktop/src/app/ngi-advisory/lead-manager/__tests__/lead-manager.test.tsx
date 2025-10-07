import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import LeadManagerPage from '../page'

// Mock useApp context
jest.mock('@/lib/context/AppContext', () => ({
  useApp: () => ({ state: { currentEntity: { id: 1 } } }),
}))

// Mock API client used for listing projects
jest.mock('@/lib/api', () => ({
  advisoryListProjects: jest.fn(async () => ([{ id: 1, project_name: 'Proj A' }])),
}))

describe('LeadManagerPage', () => {
  beforeEach(() => {
    // Mock fetch for tasks endpoint to return a non-array object (e.g., 403 detail)
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 403,
      json: async () => ({ detail: 'Access denied' }),
    })) as any
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders without crashing and handles non-array tasks safely', async () => {
    render(<LeadManagerPage />)
    expect(await screen.findByText('Project Center')).toBeInTheDocument()
    // Columns render even if tasks fetch returned non-array
    await waitFor(() => {
      expect(screen.getAllByText(/No tasks/i).length).toBeGreaterThan(0)
    })
  })
})
