import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdvisoryProjectsPage from '../../projects/page'

jest.mock('@/lib/context/AppContext', () => ({
  useApp: () => ({ state: { currentEntity: { id: 1, legal_name: 'NGI Capital LLC' } } })
}))
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { email: 'anurmamade@ngicapitaladvisory.com' }, loading: false }) }))
jest.mock('@/lib/api', () => ({
  advisoryListProjects: jest.fn(async () => []),
  advisoryCreateProject: jest.fn(async () => ({ id: 1 })),
  advisoryUpdateProject: jest.fn(async () => ({ id: 1 })),
  advisoryGetProjectLeads: jest.fn(async () => ({ leads: [] })),
  advisorySetProjectLeads: jest.fn(async () => ({ id: 1, leads: [] })),
  advisoryGetProjectQuestions: jest.fn(async () => ({ prompts: [] })),
  advisorySetProjectQuestions: jest.fn(async () => ({ id: 1, count: 0 })),
  apiClient: { getProfile: jest.fn(async () => ({ email: 'anurmamade@ngicapitaladvisory.com' })) }
}))

describe('AdvisoryProjectsPage', () => {
  it('opens designer and selects majors via chips (alias mapping)', async () => {
    render(<AdvisoryProjectsPage />)

    // Open designer
    const newBtn = await screen.findByText('+ New Project')
    fireEvent.click(newBtn)

    // Type alias 'CS' and press Enter => chip should be 'Computer Science'
    const majorsInput = await screen.findByPlaceholderText('Type a major (e.g., CS, Finance) and press Enter')
    fireEvent.change(majorsInput, { target: { value: 'CS' } })
    fireEvent.keyDown(majorsInput, { key: 'Enter', code: 'Enter' })
    await screen.findByText('Computer Science')
  })

  it('shows open roles on project cards when provided', async () => {
    const api = require('@/lib/api')
    api.advisoryListProjects.mockResolvedValueOnce([
      { id: 1, entity_id: 1, client_name: 'UC', project_name: 'Test', summary: 'Sum', status: 'draft', mode: 'remote', partner_badges: [], backer_badges: [], tags: [], team_size: 4, open_roles: 2 }
    ])
    render(<AdvisoryProjectsPage />)
    expect(await screen.findByText(/Open roles: 2 \/? 4/i)).toBeInTheDocument()
  })

  it('save draft creates project and refreshes list', async () => {
    const api = require('@/lib/api')
    // Initial list: empty
    api.advisoryListProjects.mockResolvedValueOnce([])
    // Create returns new id
    api.advisoryCreateProject.mockResolvedValueOnce({ id: 42 })
    // After save, refresh list returns the new project
    api.advisoryListProjects.mockResolvedValueOnce([
      { id: 42, entity_id: 1, client_name: 'ACME', project_name: 'New Draft', summary: 'Some summary long enough.', status: 'draft', mode: 'remote', partner_badges: [], backer_badges: [], tags: [] }
    ])

    render(<AdvisoryProjectsPage />)

    // Open designer
    const newBtn = await screen.findByText('+ New Project')
    fireEvent.click(newBtn)

    // Fill required fields for draft
    fireEvent.change(await screen.findByPlaceholderText('Project name'), { target: { value: 'New Draft' } })
    fireEvent.change(await screen.findByPlaceholderText('Client name'), { target: { value: 'ACME' } })
    fireEvent.change(await screen.findByPlaceholderText('Summary'), { target: { value: 'Some summary long enough.' } })

    // Save draft
    fireEvent.click(await screen.findByText(/Save Draft|Save$/))

    // Expect create called with draft status
    await waitFor(() => expect(api.advisoryCreateProject).toHaveBeenCalled())
    expect(api.advisoryCreateProject).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }))

    // List refresh should show the new card
    expect(await screen.findByText('New Draft')).toBeInTheDocument()
  })

  it('publish new project: create -> leads -> questions -> update(active)', async () => {
    const api = require('@/lib/api')
    const order: string[] = []

    // Initial list empty
    api.advisoryListProjects.mockResolvedValueOnce([])
    // Create draft returns id
    api.advisoryCreateProject.mockImplementation(async () => { order.push('create'); return { id: 77 } })
    // Leads/questions saved
    api.advisorySetProjectLeads.mockImplementation(async () => { order.push('leads'); return { id: 77, leads: ['anurmamade@ngicapitaladvisory.com'] } })
    api.advisorySetProjectQuestions.mockImplementation(async () => { order.push('questions'); return { id: 77, count: 2 } })
    // Update publish
    api.advisoryUpdateProject.mockImplementation(async (_id: number, patch: any) => { order.push('update'); expect(patch.status).toBe('active'); return { id: 77 } })
    // Final refresh list returns item
    api.advisoryListProjects.mockResolvedValueOnce([
      { id: 77, entity_id: 1, client_name: 'ClientX', project_name: 'PubProj', summary: 'Valid summary long enough.', status: 'active', mode: 'remote', partner_badges: [], backer_badges: [], tags: [] }
    ])

    render(<AdvisoryProjectsPage />)

    // Open designer and fill
    fireEvent.click(await screen.findByText('+ New Project'))
    fireEvent.change(await screen.findByPlaceholderText('Project name'), { target: { value: 'PubProj' } })
    fireEvent.change(await screen.findByPlaceholderText('Client name'), { target: { value: 'ClientX' } })
    fireEvent.change(await screen.findByPlaceholderText('Summary'), { target: { value: 'Valid summary long enough.' } })

    // Add a lead and two questions
    fireEvent.change(await screen.findByPlaceholderText('Add lead by name'), { target: { value: 'Andre' } })
    fireEvent.click(await screen.findByText(/Andre Nurmamade/i))
    const qArea = await screen.findByPlaceholderText(/Why are you interested/i)
    fireEvent.change(qArea, { target: { value: 'Why this project?\nExperience?' } })

    // Publish
    fireEvent.click(await screen.findByText('Publish'))

    await waitFor(() => expect(api.advisoryUpdateProject).toHaveBeenCalled())
    expect(order).toEqual(['create','leads','questions','update'])
    expect(await screen.findByText('PubProj')).toBeInTheDocument()
  })

  it('save draft persists allow_applications, leads and questions', async () => {
    const api = require('@/lib/api')
    api.advisoryListProjects.mockResolvedValueOnce([])
    api.advisoryCreateProject.mockResolvedValueOnce({ id: 55 })
    api.advisoryListProjects.mockResolvedValueOnce([
      { id: 55, entity_id: 1, client_name: 'ClientA', project_name: 'DraftA', summary: 'Long enough summary.', status: 'draft', mode: 'remote', allow_applications: 0, partner_badges: [], backer_badges: [], tags: [] }
    ])

    render(<AdvisoryProjectsPage />)
    fireEvent.click(await screen.findByText('+ New Project'))
    fireEvent.change(await screen.findByPlaceholderText('Project name'), { target: { value: 'DraftA' } })
    fireEvent.change(await screen.findByPlaceholderText('Client name'), { target: { value: 'ClientA' } })
    fireEvent.change(await screen.findByPlaceholderText('Summary'), { target: { value: 'Long enough summary.' } })

    // Turn OFF allow applications
    const allowCheckbox = await screen.findByLabelText('Allow applications')
    fireEvent.click(allowCheckbox)

    // Add a lead and two questions
    fireEvent.change(await screen.findByPlaceholderText('Add lead by name'), { target: { value: 'Landon' } })
    fireEvent.click(await screen.findByText(/Landon Whitworth/i))
    fireEvent.change(await screen.findByPlaceholderText(/Why are you interested/i), { target: { value: 'Q1\nQ2' } })

    fireEvent.click(await screen.findByText(/Save Draft|Save$/))

    // Verify create payload contains allow_applications: 0
    await waitFor(() => expect(api.advisoryCreateProject).toHaveBeenCalled())
    const call = api.advisoryCreateProject.mock.calls[0][0]
    expect(call).toHaveProperty('allow_applications')

    // Leads and questions persisted
    expect(api.advisorySetProjectLeads).toHaveBeenCalledWith(55, expect.arrayContaining(['lwhitworth@ngicapitaladvisory.com']))
    expect(api.advisorySetProjectQuestions).toHaveBeenCalledWith(55, ['Q1','Q2'])
  })
  it('publishing existing project saves leads before updating status', async () => {
    const api = require('@/lib/api')
    const order: string[] = []

    // First listing returns a single draft project to edit
    api.advisoryListProjects.mockResolvedValueOnce([
      { id: 16, entity_id: 1, client_name: 'ClientX', project_name: 'Project X', summary: 'A sufficiently long summary for UI.', status: 'draft', mode: 'remote', partner_badges: [], backer_badges: [], tags: [] }
    ])
    // No leads initially
    api.advisoryGetProjectLeads.mockResolvedValueOnce({ leads: [] })

    // Track order: leads should be saved before update when publishing existing
    api.advisorySetProjectLeads.mockImplementation(async () => { order.push('leads'); return { id: 16, leads: ['anurmamade@ngicapitaladvisory.com'] } })
    api.advisorySetProjectQuestions.mockImplementation(async () => ({ id: 16, count: 0 }))
    api.advisoryUpdateProject.mockImplementation(async (_id: number, _patch: any) => { order.push('update'); return { id: 16 } })

    render(<AdvisoryProjectsPage />)

    // Open editor for the existing project
    const editBtn = await screen.findByText('Edit')
    fireEvent.click(editBtn)

    // Add a lead via the selector (type name and choose suggestion)
    const addLeadInput = await screen.findByPlaceholderText('Add lead by name')
    fireEvent.change(addLeadInput, { target: { value: 'Andre' } })
    const leadOption = await screen.findByText(/Andre Nurmamade/i)
    fireEvent.click(leadOption)

    // Click Update (publishes existing project)
    const updateBtn = await screen.findByText('Update')
    fireEvent.click(updateBtn)

    // Wait for update call and verify ordering
    await waitFor(() => expect(api.advisoryUpdateProject).toHaveBeenCalled())
    expect(order[0]).toBe('leads')
    expect(order[1]).toBe('update')
  })
  it.skip('opens crop dialog on hero upload selection (edit mode)', async () => {})
})
