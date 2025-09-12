"use client"
import { useState } from 'react'

export default function WithdrawButton({ id }: { id: number }) {
  const [loading, setLoading] = useState(false)
  const onClick = async () => {
    if (!confirm('Withdraw this application? You can re-apply from the project page.')) return
    setLoading(true)
    try {
      await fetch(`/api/public/applications/${id}/withdraw`, { method: 'POST' })
      window.location.href = '/applications'
    } catch (e) {
      alert('Failed to withdraw. Please try again later.')
    } finally {
      setLoading(false)
    }
  }
  return <button onClick={onClick} disabled={loading} style={{ padding:'6px 10px', background:'#dc2626', color:'#fff', borderRadius:6 }}>{loading ? 'Withdrawing...' : 'Withdraw'}</button>
}

