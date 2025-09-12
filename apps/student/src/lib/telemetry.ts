export async function postEvent(event: string, payload?: Record<string, any>) {
  try {
    await fetch('/api/public/telemetry/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, payload: payload || {} }),
    })
  } catch {}
}

