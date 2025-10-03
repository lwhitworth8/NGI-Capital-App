import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import StudentSidebar from '@/components/StudentSidebar'

jest.mock('next/navigation', () => ({
  __esModule: true,
  usePathname: () => '/projects',
  useRouter: () => ({ push: jest.fn() }),
}))

// Minimal Clerk user mock
let mockUser: any = null
jest.mock('@clerk/nextjs', () => ({
  __esModule: true,
  useUser: () => ({ user: mockUser }),
  useClerk: () => ({ signOut: jest.fn() }),
}))

beforeEach(() => {
  mockUser = null
  global.fetch = jest.fn(async (input: RequestInfo, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('/api/public/memberships/mine')) {
      return {
        ok: true,
        json: async () => [],
      } as any
    }
    if (url.includes('/api/public/telemetry/event')) {
      return { ok: true, json: async () => ({ ok: true }) } as any
    }
    return { ok: true, json: async () => ({}) } as any
  }) as any
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('StudentSidebar navigation per spec', () => {
  it('shows public Projects and Learning for signed-out users and hides Applications/My Projects', async () => {
    render(<StudentSidebar />)
    expect(await screen.findByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Learning Center')).toBeInTheDocument()
    expect(screen.queryByText('Applications')).toBeNull()
    expect(screen.queryByText('My Projects')).toBeNull()
  })

  it('shows Applications when signed-in and no active project', async () => {
    mockUser = { id: 'u1', primaryEmailAddress: { emailAddress: 'student@berkeley.edu' } }
    render(<StudentSidebar />)
    expect(await screen.findByText('Applications')).toBeInTheDocument()
    expect(screen.queryByText('My Projects')).toBeNull()
  })

  it('shows My Projects when active membership exists', async () => {
    mockUser = { id: 'u1', primaryEmailAddress: { emailAddress: 'student@berkeley.edu' } }
    ;(global.fetch as jest.Mock).mockImplementationOnce(async () => ({
      ok: true,
      json: async () => [{ id: 1, project_id: 123, active: true }],
    }) as any)
    render(<StudentSidebar />)
    expect(await screen.findByText('My Projects')).toBeInTheDocument()
  })

  it('posts telemetry on nav click', async () => {
    render(<StudentSidebar />)
    const btn = await screen.findByText('Projects')
    fireEvent.click(btn)
    await waitFor(() => {
      expect(global.fetch as any).toHaveBeenCalledWith(
        expect.stringContaining('/api/public/telemetry/event'),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})
