"use client"

import React from 'react'
import Script from 'next/script'
import { ChatKit, useChatKit } from '@openai/chatkit-react'

export default function AiChatPage() {
  const { control } = useChatKit({
    api: {
      async getClientSecret(existing?: string | null) {
        if (existing) {
          // For now, always create a new session
        }
        const res = await fetch('/api/chatkit/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: 'admin-desktop' }),
        })
        const data = await res.json()
        if (!res.ok || !data?.client_secret) {
          throw new Error('Failed to get ChatKit client_secret')
        }
        return data.client_secret
      },
    },
  })

  return (
    <div className="p-6">
      <Script src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js" strategy="afterInteractive" />
      <h1 className="text-2xl font-bold mb-4">AI Assistant</h1>
      <div className="rounded-xl border bg-card p-2 w-[360px] h-[620px]">
        <ChatKit control={control} className="h-[600px] w-[320px]" />
      </div>
    </div>
  )
}

