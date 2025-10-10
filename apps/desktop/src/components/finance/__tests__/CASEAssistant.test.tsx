/**
 * Test suite for CASE AI Assistant component
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { CASEAssistant } from '../CASEAssistant'

// Mock the entity context
jest.mock('@/hooks/useEntityContext', () => ({
  useEntityContext: () => ({
    selectedEntityId: 1,
  }),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}))

// Mock fetch
global.fetch = jest.fn()

describe('CASEAssistant', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('renders the floating button', () => {
    render(<CASEAssistant />)
    
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('h-14', 'w-14', 'rounded-full')
  })

  it('shows pulsing indicator', () => {
    render(<CASEAssistant />)
    
    const indicator = screen.getByRole('button').parentElement?.querySelector('.animate-ping')
    expect(indicator).toBeInTheDocument()
  })

  it('opens chat window when button is clicked', async () => {
    const user = userEvent.setup()
    render(<CASEAssistant />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(screen.getByText('CASE')).toBeInTheDocument()
    expect(screen.getByText('AI Financial Assistant')).toBeInTheDocument()
  })

  it('displays initial welcome message', async () => {
    const user = userEvent.setup()
    render(<CASEAssistant />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(screen.getByText(/Hi! I'm CASE, your AI financial assistant/)).toBeInTheDocument()
  })

  it('allows typing in the input field', async () => {
    const user = userEvent.setup()
    render(<CASEAssistant />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    const textarea = screen.getByPlaceholderText('Ask CASE about your financials...')
    await user.type(textarea, 'What is our revenue?')
    
    expect(textarea).toHaveValue('What is our revenue?')
  })

  it('sends message when send button is clicked', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ response: 'Your revenue is $1M' }),
    })
    
    render(<CASEAssistant />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    const textarea = screen.getByPlaceholderText('Ask CASE about your financials...')
    await user.type(textarea, 'What is our revenue?')
    
    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)
    
    expect(global.fetch).toHaveBeenCalledWith('/api/finance/ai/case-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is our revenue?',
        context: 'finance',
        entity_id: 1,
      }),
    })
  })

  it('sends message when Enter key is pressed', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ response: 'Your revenue is $1M' }),
    })
    
    render(<CASEAssistant />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    const textarea = screen.getByPlaceholderText('Ask CASE about your financials...')
    await user.type(textarea, 'What is our revenue?')
    await user.keyboard('{Enter}')
    
    expect(global.fetch).toHaveBeenCalledWith('/api/finance/ai/case-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is our revenue?',
        context: 'finance',
        entity_id: 1,
      }),
    })
  })

  it('does not send message when Shift+Enter is pressed', async () => {
    const user = userEvent.setup()
    render(<CASEAssistant />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    const textarea = screen.getByPlaceholderText('Ask CASE about your financials...')
    await user.type(textarea, 'What is our revenue?')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('displays user message after sending', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ response: 'Your revenue is $1M' }),
    })
    
    render(<CASEAssistant />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    const textarea = screen.getByPlaceholderText('Ask CASE about your financials...')
    await user.type(textarea, 'What is our revenue?')
    
    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)
    
    await waitFor(() => {
      expect(screen.getByText('What is our revenue?')).toBeInTheDocument()
    })
  })

  it('displays assistant response after API call', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ response: 'Your revenue is $1M' }),
    })
    
    render(<CASEAssistant />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    const textarea = screen.getByPlaceholderText('Ask CASE about your financials...')
    await user.type(textarea, 'What is our revenue?')
    
    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)
    
    await waitFor(() => {
      expect(screen.getByText('Your revenue is $1M')).toBeInTheDocument()
    })
  })

  it('shows loading state while waiting for response', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        json: async () => ({ response: 'Your revenue is $1M' }),
      }), 100))
    )
    
    render(<CASEAssistant />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    const textarea = screen.getByPlaceholderText('Ask CASE about your financials...')
    await user.type(textarea, 'What is our revenue?')
    
    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)
    
    // Should show loading state
    expect(screen.getByText('Analyzing...')).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
    
    render(<CASEAssistant />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    const textarea = screen.getByPlaceholderText('Ask CASE about your financials...')
    await user.type(textarea, 'What is our revenue?')
    
    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)
    
    await waitFor(() => {
      expect(screen.getByText(/I'm having trouble connecting/)).toBeInTheDocument()
    })
  })

  it('disables send button when input is empty', async () => {
    const user = userEvent.setup()
    render(<CASEAssistant />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    const sendButton = screen.getByRole('button', { name: /send/i })
    expect(sendButton).toBeDisabled()
  })

  it('enables send button when input has content', async () => {
    const user = userEvent.setup()
    render(<CASEAssistant />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    const textarea = screen.getByPlaceholderText('Ask CASE about your financials...')
    await user.type(textarea, 'Hello')
    
    const sendButton = screen.getByRole('button', { name: /send/i })
    expect(sendButton).not.toBeDisabled()
  })

  it('closes chat window when X button is clicked', async () => {
    const user = userEvent.setup()
    render(<CASEAssistant />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(screen.getByText('CASE')).toBeInTheDocument()
    
    const closeButton = screen.getByRole('button', { name: '' }) // X button
    await user.click(closeButton)
    
    expect(screen.queryByText('CASE')).not.toBeInTheDocument()
  })

  it('displays timestamps for messages', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ response: 'Your revenue is $1M' }),
    })
    
    render(<CASEAssistant />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    const textarea = screen.getByPlaceholderText('Ask CASE about your financials...')
    await user.type(textarea, 'What is our revenue?')
    
    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)
    
    await waitFor(() => {
      // Should show timestamp (format: HH:MM)
      const timestamp = screen.getByText(/\d{1,2}:\d{2}/)
      expect(timestamp).toBeInTheDocument()
    })
  })

  it('shows help text at bottom of chat', async () => {
    const user = userEvent.setup()
    render(<CASEAssistant />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(screen.getByText(/CASE can help with expense mapping, forecasts, and financial analysis/)).toBeInTheDocument()
  })
})
