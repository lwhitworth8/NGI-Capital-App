'use client'

import { useEffect, useState } from 'react'

interface AnimatedNGILogoProps {
  className?: string
  onAnimationComplete?: () => void
}

export default function AnimatedNGILogo({ className = '', onAnimationComplete }: AnimatedNGILogoProps) {
  const [animationPhase, setAnimationPhase] = useState<'loading' | 'running' | 'text' | 'final'>('loading')
  const [showText, setShowText] = useState(false)
  const [loadedBars, setLoadedBars] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)

  useEffect(() => {
    // Start loading after 0.5 seconds
    const startTimer = setTimeout(() => {
      setStartTime(Date.now())
      setAnimationPhase('loading')
    }, 500)

    return () => clearTimeout(startTimer)
  }, [])

  // Load first bar and sphere, then quickly load remaining bars
  useEffect(() => {
    if (animationPhase === 'loading' && loadedBars === 0) {
      const loadTimer = setTimeout(() => {
        setLoadedBars(1)
      }, 200)
      return () => clearTimeout(loadTimer)
    }
  }, [animationPhase, loadedBars])

  // Quick load remaining bars and start running
  useEffect(() => {
    if (loadedBars === 1 && animationPhase === 'loading') {
      const quickLoadTimer = setTimeout(() => {
        setLoadedBars(5) // Load all bars at once
        setAnimationPhase('running')
      }, 300) // Quick load - no charge up
      return () => clearTimeout(quickLoadTimer)
    }
  }, [loadedBars, animationPhase])

  // Show text after running for 3.5 seconds
  useEffect(() => {
    if (animationPhase === 'running') {
      const textTimer = setTimeout(() => {
        setAnimationPhase('text')
        setShowText(true)
      }, 3500) // 1.5s to 5s = 3.5s running
      return () => clearTimeout(textTimer)
    }
  }, [animationPhase])

  // Final formation after text appears
  useEffect(() => {
    if (animationPhase === 'text') {
      const finalTimer = setTimeout(() => {
        setAnimationPhase('final')
        onAnimationComplete?.()
      }, 1000)
      return () => clearTimeout(finalTimer)
    }
  }, [animationPhase, onAnimationComplete])

  const getBarPosition = (index: number) => {
    if (animationPhase === 'loading' && index >= loadedBars) {
      return { opacity: 0, transform: 'translateX(-50px)' }
    }
    
    if (animationPhase === 'loading' && index === 0) {
      // First bar - stationary at start position
      return { 
        opacity: 1, 
        transform: 'translate(0, 0) rotate(0deg)',
        transformOrigin: 'center center'
      }
    }
    
    if (animationPhase === 'running') {
      // Slower spiral running motion - all bars connected at center
      const time = startTime ? (Date.now() - startTime) / 1000 : 0
      const baseRadius = 20
      const spiralRadius = baseRadius + (time * 3) // Slower growing spiral
      const angle = (time * 1.5 + index * 0.6) % (Math.PI * 2) // Slower rotation
      const x = Math.cos(angle) * spiralRadius
      const y = Math.sin(angle) * spiralRadius
      return {
        opacity: 1,
        transform: `translate(${x}px, ${y}px) rotate(${angle * 180 / Math.PI + 90}deg)`,
        transformOrigin: 'center center'
      }
    }
    
    if (animationPhase === 'text' || animationPhase === 'final') {
      // Connected formation - bars pointing outward from center
      const angle = (index * 72) * Math.PI / 180 // 5 bars, 72 degrees apart
      const radius = 18
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      return {
        opacity: 1,
        transform: `translate(${x}px, ${y}px) rotate(${angle * 180 / Math.PI + 90}deg)`,
        transformOrigin: 'center center'
      }
    }
    
    return { opacity: 1, transform: 'translate(0, 0)' }
  }

  return (
    <div className={`relative w-full h-40 flex items-center justify-center ${className}`}>
      {/* Text and Logo Layout - Logo positioned at the "N" */}
      <div className="flex items-center justify-center">
        {/* Text - Left aligned */}
        <div 
          className={`transition-all duration-1000 ${
            showText ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
          }`}
        >
          <div className="text-white">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              NGI Capital
            </h1>
            <p className="text-lg text-zinc-300 mt-1">
              Next Generation Investors
            </p>
          </div>
        </div>

        {/* 5 TARS Bars - Positioned at the "N" of NGI Capital */}
        <div className="relative -ml-16">
          <div className="relative w-16 h-16">
            {/* Full White Sphere in center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg" />
            
            {/* 5 TARS Bars */}
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-12 bg-white transition-all duration-500"
                style={{
                  ...getBarPosition(i),
                  left: '50%', // Center horizontally
                  top: '50%', // Center vertically
                  marginLeft: '-1px', // Center the bar
                  marginTop: '-24px', // Center the bar vertically
                }}
              />
            ))}
          </div>

          {/* Subtle motion trail during running */}
          {animationPhase === 'running' && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse opacity-30" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
