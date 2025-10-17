'use client'

import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface AnimatedTextProps {
  text: string
  className?: string
  delay?: number
  stagger?: number
  duration?: number
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div'
}

export default function AnimatedText({ 
  text, 
  className = '', 
  delay = 0,
  stagger = 0.05,
  duration = 0.8,
  as: Component = 'div'
}: AnimatedTextProps) {
  const textRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (textRef.current) {
      const chars = textRef.current.querySelectorAll('.char')
      
      // Set initial state
      gsap.set(chars, { y: 50, opacity: 0 })
      
      // Animate characters with stagger
      gsap.to(chars, {
        y: 0,
        opacity: 1,
        duration,
        ease: 'power3.out',
        stagger,
        delay
      })
    }
  }, [text, delay, stagger, duration])

  return (
    <Component ref={textRef} className={`overflow-hidden ${className}`}>
      {text.split('').map((char, i) => (
        <span key={i} className="char inline-block">
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </Component>
  )
}
