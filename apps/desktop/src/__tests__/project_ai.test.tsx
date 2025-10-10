import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProjectEditorModal } from '@/components/advisory/ProjectEditorModal'

describe('ProjectEditorModal AI Draft', () => {
  const origEnv = process.env
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...origEnv, NEXT_PUBLIC_OPENAI_DRAFTS: '1' }
    // @ts-ignore
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ title: 'AI Title', summary: 'AI Summary', description: 'AI Description' }),
    }))
  })
  afterAll(() => {
    process.env = origEnv
  })

  it('shows review card and applies AI draft on accept', async () => {
    render(
      <ProjectEditorModal
        isOpen={true}
        onClose={() => {}}
        project={null as any}
        entityId={1}
        onSave={async () => {}}
        leads={[]}
        majors={[]}
      />
    )

    const generateBtn = await screen.findByText('Generate AI Draft')
    fireEvent.click(generateBtn)
    // Popover opens with textarea placeholder\n    expect(await screen.findByPlaceholderText('What would you like to change?')).toBeInTheDocument()\n    // Submit generate via button\n    fireEvent.click(screen.getByText('Generate'))\n    // Review card appears
    expect(await screen.findByText('AI Draft Suggestions')).toBeInTheDocument()
    expect(screen.getByText('AI Title')).toBeInTheDocument()

    // Accept
    fireEvent.click(screen.getByText('Accept Draft'))

    // Title, summary, description updated
    const titleInput = screen.getByLabelText('Project Name *') as HTMLInputElement
    expect(titleInput.value).toBe('AI Title')

    const summaryInput = screen.getByPlaceholderText('A brief one-sentence description') as HTMLInputElement
    expect(summaryInput.value).toBe('AI Summary')

    const descriptionTextarea = screen.getByPlaceholderText('Detailed project description...') as HTMLTextAreaElement
    expect(descriptionTextarea.value).toBe('AI Description')
  })
})

