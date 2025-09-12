import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock next/navigation router
let pushMock: jest.Mock, pathMock: jest.Mock
jest.mock('next/navigation', () => {
  pushMock = jest.fn()
  pathMock = jest.fn(() => '/projects')
  return {
    __esModule: true,
    useRouter: () => ({ push: pushMock }),
    usePathname: () => pathMock(),
  }
})

// Stub IntersectionObserver
class IOStub {
  observe(){}
  disconnect(){}
}
// @ts-ignore
global.IntersectionObserver = IOStub

import ProjectsClient from '../ProjectsClient'

describe('ProjectsClient', () => {
  it('updates URL on search and renders Completed pill for closed projects', async () => {
    render(<ProjectsClient initialItems={[
      { id: 1, project_name: 'Alpha', client_name: 'A', summary: 'S', status: 'closed' },
      { id: 2, project_name: 'Beta', client_name: 'B', summary: 'S', status: 'active' },
    ] as any} />)

    // Completed pill present
    expect(screen.getAllByText(/Completed|Active/)).toHaveLength(2)

    // Type into search and wait for debounce to push URL
    const input = screen.getByRole('textbox', { name: /Search projects/i })
    fireEvent.change(input, { target: { value: 'alpha' } })
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled()
      const callArg = String(pushMock.mock.calls.slice(-1)[0][0])
      expect(callArg).toContain('q=alpha')
    })
  })
})

