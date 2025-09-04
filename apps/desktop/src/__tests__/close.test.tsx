import React from 'react'
import { render, screen } from '@testing-library/react'
import ClosePage from '@/app/accounting/close/page'

describe('ClosePage', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/accounting/close/preview')) {
        return Promise.resolve({ json: () => Promise.resolve({ bank_rec_finalized: true, docs_unposted: false, aging_ok: true, revrec_current_posted: true, tb_balanced: true, accruals_prepaids_dep_posted: true }) }) as any
      }
      return Promise.resolve({ json: () => Promise.resolve({}) }) as any
    })
  })
  it('enables Run Close & Lock when all gates pass', async () => {
    render(<ClosePage />)
    const btn = await screen.findByText('Run Close & Lock')
    expect(btn).not.toHaveClass('disabled')
  })
})

