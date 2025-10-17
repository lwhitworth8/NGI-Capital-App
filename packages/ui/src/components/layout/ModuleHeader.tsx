'use client'

import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface ModuleHeaderProps {
  title: string
  subtitle?: string
  rightContent?: React.ReactNode
  className?: string
}

/**
 * Consistent module header component that provides static title headers
 * aligned with the NGI Capital brand across all modules
 */
export default function ModuleHeader({ 
  title, 
  subtitle, 
  rightContent, 
  className = "" 
}: ModuleHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (headerRef.current) {
      const chars = headerRef.current.querySelectorAll('.char')
      
      // Set initial state
      gsap.set(chars, { y: 50, opacity: 0 })
      
      // Animate characters with stagger
      gsap.to(chars, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.05,
        delay: 0.2
      })
    }
  }, [])

  return (
    <div className={`bg-background sticky top-0 z-10 ${className}`}>
      <div className="flex items-center justify-between h-24 px-8 pt-6">
        <div ref={headerRef} className="flex flex-col">
          {/* Animated Title - Lowered and Larger */}
          <div className="overflow-hidden" style={{ paddingBottom: '8px' }}>
            <h1 className="text-5xl font-bold text-foreground tracking-tight leading-tight">
              {title.split('').map((char, i) => (
                <span key={i} className="char inline-block" style={{ paddingBottom: '4px' }}>
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
            </h1>
          </div>
        </div>
        
        {rightContent && (
          <div className="flex items-center">
            {rightContent}
          </div>
        )}
      </div>
    </div>
  )
}
