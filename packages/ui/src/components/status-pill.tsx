import React from 'react'

export type StatusPillProps = { status: string; className?: string }

export const StatusPill: React.FC<StatusPillProps> = ({ status, className }) => {
  const s = String(status || '').toLowerCase()
  let bg = '#e5e7eb', fg = '#374151'
  if (s === 'new' || s === 'reviewing') { bg = '#dbeafe'; fg = '#1e40af' }
  else if (s === 'interview' || s === 'offer') { bg = '#dcfce7'; fg = '#166534' }
  else if (s === 'joined') { bg = '#f0fdf4'; fg = '#166534' }
  else if (s === 'rejected' || s === 'withdrawn' || s === 'archived') { bg = '#fee2e2'; fg = '#991b1b' }
  const style: React.CSSProperties = { background: bg, color: fg, fontSize: 12, padding: '2px 8px', borderRadius: 999 }
  return <span aria-label={`status ${status}`} className={className} style={style}>{status}</span>
}

