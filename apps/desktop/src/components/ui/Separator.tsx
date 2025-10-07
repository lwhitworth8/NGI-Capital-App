"use client"

import React from 'react'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
}

export function Separator({ className }: Props) {
  return <div role="separator" className={cn('w-full h-px bg-muted', className)} />
}

