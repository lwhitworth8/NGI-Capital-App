"use client"

import { useEffect } from 'react'
import { postEvent } from '@/lib/telemetry'

export default function TelemetryOnMount({ event, payload }: { event: string; payload?: Record<string, any> }) {
  useEffect(() => { postEvent(event, payload) }, [])
  return null
}

