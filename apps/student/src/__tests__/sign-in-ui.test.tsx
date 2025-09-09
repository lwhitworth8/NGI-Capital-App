import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock Clerk SignIn to render a placeholder so we can assert UI presence
jest.mock('@clerk/nextjs', () => ({
  __esModule: true,
  SignIn: (_props: any) => (
    <div data-testid="clerk-sign-in">
      <button aria-label="Continue with Google">Continue with Google</button>
      <label htmlFor="email">Email address</label>
      <input id="email" placeholder="Email address" />
      <button type="submit">Continue</button>
    </div>
  ),
}))

// Import the page component
import SignInPage from '@/app/sign-in/[[...sign-in]]/page'

describe('Student sign-in page UI', () => {
  it('renders Google and email sign-in elements', () => {
    render(<SignInPage />)
    expect(screen.getByTestId('clerk-sign-in')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument()
    // There may be multiple 'Continue' buttons (e.g., provider + email submit)
    const continueButtons = screen.getAllByRole('button', { name: /continue/i })
    expect(continueButtons.length).toBeGreaterThanOrEqual(1)
  })
})
