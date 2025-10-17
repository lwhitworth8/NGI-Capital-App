/**
 * Financial formatting utilities for the Finance module
 * Provides consistent number formatting across all financial displays
 */

export const formatCurrency = (value: number, compact = false): string => {
  if (isNaN(value)) return '$0'
  
  if (compact && Math.abs(value) >= 1000) {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    return `$${(value / 1000).toFixed(0)}K`
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export const formatPercent = (value: number, decimals = 1): string => {
  if (isNaN(value)) return '0%'
  
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}

export const formatMultiple = (value: number): string => {
  if (isNaN(value)) return '0x'
  
  return `${value.toFixed(1)}x`
}

export const formatDelta = (value: number, type: 'currency' | 'percent' = 'percent'): string => {
  if (isNaN(value)) return '+0%'
  
  const sign = value >= 0 ? '+' : ''
  if (type === 'currency') {
    return sign + formatCurrency(value, true)
  }
  return sign + formatPercent(value)
}

export const formatNumber = (value: number, decimals = 0): string => {
  if (isNaN(value)) return '0'
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export const formatLargeNumber = (value: number): string => {
  if (isNaN(value)) return '0'
  
  if (Math.abs(value) >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`
  }
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(0)}K`
  }
  
  return value.toString()
}

export const formatDate = (date: string | Date): string => {
  if (!date) return '-'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return '-'
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj)
}

export const formatDateShort = (date: string | Date): string => {
  if (!date) return '-'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return '-'
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(dateObj)
}

export const formatRelativeDate = (date: string | Date): string => {
  if (!date) return '-'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return '-'
  
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) return 'Today'
  if (diffInDays === 1) return 'Yesterday'
  if (diffInDays < 7) return `${diffInDays} days ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
  
  return `${Math.floor(diffInDays / 365)} years ago`
}

export const formatDuration = (months: number): string => {
  if (isNaN(months)) return '0 months'
  
  if (months < 1) {
    const days = Math.round(months * 30)
    return `${days} day${days !== 1 ? 's' : ''}`
  }
  
  if (months < 12) {
    return `${Math.round(months)} month${Math.round(months) !== 1 ? 's' : ''}`
  }
  
  const years = Math.floor(months / 12)
  const remainingMonths = Math.round(months % 12)
  
  if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`
  }
  
  return `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
}

export const formatPercentage = (value: number, total: number): string => {
  if (isNaN(value) || isNaN(total) || total === 0) return '0%'
  
  return formatPercent((value / total) * 100)
}

export const formatRatio = (numerator: number, denominator: number): string => {
  if (isNaN(numerator) || isNaN(denominator) || denominator === 0) return '0:1'
  
  const ratio = numerator / denominator
  return `${ratio.toFixed(1)}:1`
}

export const formatTrend = (value: number): { label: string; color: string; icon: string } => {
  if (isNaN(value)) return { label: '0%', color: 'text-muted-foreground', icon: '→' }
  
  const absValue = Math.abs(value)
  const sign = value >= 0 ? '+' : '-'
  const label = `${sign}${formatPercent(absValue)}`
  
  if (value > 0) {
    return { label, color: 'text-green-600 dark:text-green-400', icon: '↑' }
  } else if (value < 0) {
    return { label, color: 'text-red-600 dark:text-red-400', icon: '↓' }
  }
  
  return { label: '0%', color: 'text-muted-foreground', icon: '→' }
}

export const formatStatus = (status: string): { label: string; color: string } => {
  const statusLower = status.toLowerCase()
  
  switch (statusLower) {
    case 'healthy':
    case 'good':
    case 'active':
    case 'won':
      return { label: status, color: 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900' }
    case 'warning':
    case 'pending':
    case 'in_progress':
      return { label: status, color: 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900' }
    case 'critical':
    case 'error':
    case 'lost':
      return { label: status, color: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900' }
    default:
      return { label: status, color: 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900' }
  }
}
