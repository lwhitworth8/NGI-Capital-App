"use client"

import * as React from "react"

export type AnimatedTextProps = {
  text: string
  className?: string
}

export function AnimatedText({ text, className }: AnimatedTextProps) {
  // Minimal placeholder: just render text without GSAP animations
  return <span className={className}>{text}</span>
}

export default AnimatedText

