import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock app context and auth
jest.mock('@/lib/context/AppContext', () => ({
  useApp: () => ({ state: { currentEntity: { id: 1, legal_name: 'NGI Capital LLC' } } })
}))
jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { email: 'lwhitworth@ngicapitaladvisory.com' }, loading: false })
}))

// Mock API calls used by the page
jest.mock('@/lib/api', () => ({
  advisoryListStudents: jest.fn(async () => []),
  advisoryCreateStudent: jest.fn(async () => ({ id: 1 })),
  advisoryUpdateStudent: jest.fn(async () => ({ id: 1 })),
  advisorySoftDeleteStudent: jest.fn(async () => ({ id: 1, deleted: true })),
  advisoryGetStudentTimeline: jest.fn(async () => ({ applications: [], coffeechats: [], onboarding: [] })),
  advisoryOverrideStudentStatus: jest.fn(async () => ({ id: 1 })),
  advisoryCreateStudentAssignment: jest.fn(async () => ({ id: 1 })),
  advisoryListProjects: jest.fn(async () => []),
  advisoryListArchivedStudents: jest.fn(async () => []),
  advisoryRestoreStudent: jest.fn(async () => ({ id: 2, restored_from: 1 })),
  apiClient: { getProfile: async () => ({ email: 'lwhitworth@ngicapitaladvisory.com' }) },
}))

import AdvisoryStudentsPage from '@/app/ngi-advisory/students/page'

describe('AdvisoryStudentsPage', () => {
  it('renders header and archived section without crashing', async () => {
    render(<AdvisoryStudentsPage />)
    expect(await screen.findByText('Students Database')).toBeInTheDocument()
    expect(screen.getByText('Archived Students')).toBeInTheDocument()
  })
})
