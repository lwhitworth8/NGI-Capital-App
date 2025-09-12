import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
jest.mock('@/lib/api', () => ({
  __esModule: true,
  getCoffeeAvailability: jest.fn(async () => ({ slots: [
    { start_ts: '2025-01-15T18:00:00.000Z', end_ts: '2025-01-15T18:30:00.000Z', slot_len_min: 30 },
    { start_ts: '2025-01-16T19:00:00.000Z', end_ts: '2025-01-16T19:30:00.000Z', slot_len_min: 30 },
  ] })),
  listMyCoffeeRequests: jest.fn(async () => ([])),
  createCoffeeRequest: jest.fn(async () => ({ id: 1, status: 'pending', expires_at_ts: '' })),
}))

import CoffeeChatPicker from '../CoffeeChatPicker'

describe('CoffeeChatPicker', () => {
  it('groups slots by date and submits a request', async () => {
    render(<CoffeeChatPicker />)
    expect(await screen.findByText('Pick a time (All times PT)')).toBeInTheDocument()
    // Click any enabled date button (should exist)
    const dateBtn = await screen.findAllByRole('button', { name: /Select date/ })
    expect(dateBtn.length).toBeGreaterThan(0)
    fireEvent.click(dateBtn[0])
    // After selecting date, time buttons appear
    const timeBtn = await screen.findAllByRole('button', { name: /Request chat at/ })
    expect(timeBtn.length).toBeGreaterThan(0)
    fireEvent.click(timeBtn[0])
    await waitFor(() => {
      expect(screen.getByText(/Request submitted/i)).toBeInTheDocument()
    })
  })
})

