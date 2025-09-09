"use client"

import { useEffect, useRef, useState } from 'react'

type Check = { name: string; status: 'ok' | 'fail' | 'warn'; detail?: string }

export default function ClientCheck() {
  const [checks, setChecks] = useState<Check[]>([])
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    const results: Check[] = []
    // 1) Same-origin iframe to student sign-in
    const timer = setTimeout(async () => {
      try {
        const win = iframeRef.current?.contentWindow as any
        if (!win) {
          results.push({ name: 'iframe load', status: 'fail', detail: 'no contentWindow' })
        } else {
          // Try to detect Clerk on the child window
          const hasClerk = !!(win as any)?.Clerk
          results.push({ name: 'Clerk in iframe', status: hasClerk ? 'ok' : 'fail' })
          // Detect any Clerk-mounted root elements
          let mounted = false
          try {
            const doc = win.document as Document
            mounted = !!doc.querySelector('[data-clerk]') || !!doc.querySelector('[data-clerk-component]') || !!doc.querySelector('[data-clerk-iframe]')
          } catch {}
          results.push({ name: 'SignIn mount markers', status: mounted ? 'ok' : 'warn' })
        }
      } catch (e: any) {
        results.push({ name: 'iframe check', status: 'fail', detail: String(e?.message || e) })
      }
      setChecks(results)
    }, 2500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{ display:'grid', gap: 12 }}>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Client Checks</div>
        <ul style={{ fontSize: 14, lineHeight: '20px' }}>
          {checks.map((c, idx) => (
            <li key={idx}>
              <span style={{ display:'inline-block', width: 14 }}>{c.status === 'ok' ? '✅' : c.status === 'warn' ? '⚠️' : '❌'}</span>
              <span style={{ marginLeft: 6 }}>{c.name}</span>
              {c.detail ? <span style={{ opacity: 0.7 }}> — {c.detail}</span> : null}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Student Marketing (iframe)</div>
        <iframe ref={iframeRef} src="/" style={{ width: '100%', height: 520, border: '1px solid var(--border)', borderRadius: 8, background: 'white' }} />
      </div>
    </div>
  )
}
