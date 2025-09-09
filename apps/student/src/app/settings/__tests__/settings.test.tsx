import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
jest.mock('@clerk/nextjs', () => ({ __esModule: true, useUser: () => ({ user: null }) }))
import SettingsPage from '../page'

describe('Student Settings', () => {
  const origFetch = global.fetch as any
  beforeEach(() => {
    // First GET profile, then PATCH on theme change
    let calls = 0
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls++
      const url = String(input)
      if (url.includes('/api/public/profile') && (!init || !init.method || init.method === 'GET')) {
        return {
          ok: true,
          json: async () => ({ resume_url: 'uploads/advisory-docs/users/test_at_berkeley_edu/resume-20250101.pdf', learning_notify: false }),
        } as any
      }
      if (url.includes('/api/public/profile') && init?.method === 'PATCH') {
        return { ok: true, json: async () => ({ message: 'updated' }) } as any
      }
      if (url.includes('/api/public/profile/resume') && init?.method === 'POST') {
        return { ok: true, json: async () => ({ resume_url: 'uploads/.../resume-new.pdf' }) } as any
      }
      return { ok: true, json: async () => ({}) } as any
    }) as any
  })
  afterEach(() => {
    global.fetch = origFetch
  })

  it('patches theme when clicking Save Dark', async () => {
    render(<SettingsPage />)

    const btn = await screen.findByText('Save Dark')
    fireEvent.click(btn)

    await waitFor(() => {
      expect((global.fetch as jest.Mock)).toHaveBeenCalledWith(
        '/api/public/profile',
        expect.objectContaining({ method: 'PATCH' })
      )
    })
  })
})
