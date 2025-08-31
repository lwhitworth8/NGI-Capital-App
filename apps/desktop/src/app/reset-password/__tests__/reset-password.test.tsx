/**
 * Reset Password page tests: shows success toast on completion
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ResetPasswordPage from '../page'

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
}))

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  }
}))

// Mock api client methods
jest.mock('@/lib/api', () => ({
  apiClient: {
    requestPasswordReset: jest.fn().mockResolvedValue(undefined),
    resetPassword: jest.fn().mockResolvedValue(undefined),
  }
}))

describe('Reset Password Page', () => {
  it('shows a success toast after requesting reset', async () => {
    const { apiClient } = require('@/lib/api')
    const { toast } = require('sonner')
    render(<ResetPasswordPage />)
    const emailInput = screen.getByPlaceholderText('your.email@ngicapitaladvisory.com')
    fireEvent.change(emailInput, { target: { value: 'user@ngicapitaladvisory.com' } })
    fireEvent.submit(emailInput.closest('form')!)
    await waitFor(() => expect(apiClient.requestPasswordReset).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalled()
  })

  it('shows a success toast after password reset', async () => {
    const { apiClient } = require('@/lib/api')
    const { toast } = require('sonner')
    render(<ResetPasswordPage />)
    const tokenInput = screen.getByPlaceholderText('Paste reset token')
    const newPwInput = screen.getByPlaceholderText('New password')
    const confirmInput = screen.getByPlaceholderText('Confirm new password')
    fireEvent.change(tokenInput, { target: { value: 'test-token' } })
    fireEvent.change(newPwInput, { target: { value: 'NewPassw0rd!' } })
    fireEvent.change(confirmInput, { target: { value: 'NewPassw0rd!' } })
    const form = confirmInput.closest('form')!
    fireEvent.submit(form)
    await waitFor(() => expect(apiClient.resetPassword).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalled()
  })
})
