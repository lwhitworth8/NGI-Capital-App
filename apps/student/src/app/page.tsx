'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { spFetch } from '@/lib/api'

const WORDS = ['Experiences', 'Opportunities', 'Impacts']

export default function MarketingHomepage() {
  const [wordIdx, setWordIdx] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [active, setActive] = useState<'projects'|'learning'|'incubator'>('projects')

  // Telemetry: marketing_view on mount
  useEffect(() => {
    spFetch('/api/public/telemetry/event', {
      method: 'POST',
      body: JSON.stringify({ event: 'marketing_view', payload: { route: '/' } }),
    }).catch(() => {})
  }, [])

  // Reduced motion detection
  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      setReduceMotion(mq.matches)
      const onChange = () => setReduceMotion(mq.matches)
      mq.addEventListener?.('change', onChange)
      return () => mq.removeEventListener?.('change', onChange)
    } catch {}
  }, [])

  // Word rotation every 3s
  useEffect(() => {
    if (reduceMotion) return
    const id = setInterval(() => setWordIdx((i) => (i + 1) % WORDS.length), 3000)
    return () => clearInterval(id)
  }, [reduceMotion])

  // IntersectionObserver for sticky subnav active state
  useEffect(() => {
    const els = ['projects', 'learning', 'incubator']
      .map((id) => ({ id, el: document.getElementById(id) as HTMLElement | null }))
    const opts = { root: null, rootMargin: '0px', threshold: 0.5 }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const id = e.target.getAttribute('id') as 'projects'|'learning'|'incubator'
          if (id) setActive(id)
        }
      })
    }, opts)
    els.forEach(({ el }) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  const onNavClick = (sectionId: 'projects'|'learning'|'incubator') => (e: React.MouseEvent) => {
    spFetch('/api/public/telemetry/event', {
      method: 'POST',
      body: JSON.stringify({ event: 'nav_click', payload: { route: '/', sectionId } }),
    }).catch(() => {})
  }

  const onCta = (sectionId?: 'hero'|'projects'|'learning'|'incubator') => {
    spFetch('/api/public/telemetry/event', {
      method: 'POST',
      body: JSON.stringify({ event: 'cta_click', payload: { route: '/', label: 'sign_in', sectionId } }),
    }).catch(() => {})
  }

  return (
    <>
      {/* Top navbar & Hero combined for seamless gradient */}
      <div className="relative bg-gradient-to-b from-black via-black via-70% to-blue-900">
        {/* Top navbar - straight black, no border for smooth transition */}
        <header className="w-full text-white relative z-10">
          <div className="mx-auto max-w-7xl px-8 h-16 flex items-center justify-between">
            <div className="text-2xl font-bold tracking-tight">NGI Capital</div>
            <div className="flex items-center gap-8">
              <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
                <a href="#projects" onClick={onNavClick('projects')} className="hover:text-blue-400 transition-colors relative group">
                  Advisory Projects
                  <span className="absolute bottom-[-4px] left-0 w-full h-0.5 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
                </a>
                <a href="#learning" onClick={onNavClick('learning')} className="hover:text-blue-400 transition-colors relative group">
                  NGI Learning (Coming Soon)
                  <span className="absolute bottom-[-4px] left-0 w-full h-0.5 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
                </a>
                <a href="#incubator" onClick={onNavClick('incubator')} className="hover:text-blue-400 transition-colors relative group">
                  NGI Fund (Coming Soon)
                  <span className="absolute bottom-[-4px] left-0 w-full h-0.5 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
                </a>
          </nav>
              <Link href="/sign-in" onClick={() => onCta('hero')} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm font-medium">
              Sign In
            </Link>
          </div>
        </div>
      </header>

        {/* Hero: black to blue gradient */}
        <section id="hero" className="relative overflow-hidden text-white">
        
        <div className="relative mx-auto max-w-7xl px-8 py-6 md:py-10">
          <div className="max-w-5xl">
            <h1 className="text-4xl md:text-5xl font-extrabold leading-[1.15] tracking-tight">
              Launch your <AnimatedWord word={WORDS[wordIdx]} reduceMotion={reduceMotion} />
              <span className="block mt-2">
                with NGI Capital
              </span>
            </h1>
            <p className="mt-4 text-base md:text-lg text-zinc-300 max-w-3xl leading-relaxed">
              Hands-on programs designed for students to build real skills and join a network of partners, students, and projects.
            </p>
          </div>
        </div>
      </section>
      </div>

      {/* Secondary navbar - clean white with border */}
      <div id="subnav" className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-8">
          <nav aria-label="Section Navigation" className="flex justify-center gap-8 text-sm">
            {[
              { id: 'projects', label: 'NGI Capital Advisory' },
              { id: 'learning', label: 'NGI Learning (Coming Soon)' },
              { id: 'incubator', label: 'NGI Fund (Coming Soon)' },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={onNavClick(item.id as any)}
                className={`py-3 border-b-2 transition-all duration-200 font-medium ${
                  active === (item.id as any)
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-blue-300'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Projects section - Bloomberg-style alternating layout */}
      <section id="projects" className="scroll-mt-24 bg-white text-gray-900">
        <div className="mx-auto max-w-7xl px-8 py-8 md:py-12">
          {/* Header */}
          <div className="text-center max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-3">
              NGI Capital Advisory
            </h2>
            <p className="text-base text-gray-600 leading-relaxed">
            Dive into institutional advisory experiences that deliver real client impact while building the skills and confidence to lead.
          </p>
          </div>

          {/* Feature 1 - Discover Projects (Image Left) */}
          <AdvisoryFeature
            title="Discover projects at your fingertips."
            description="Browse live advisory projects across industries. See real client challenges, project scopes, and apply with one click. Our project marketplace connects you with meaningful work from day one."
            imageSide="left"
            imageContent={
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-4 flex items-center justify-center">
                <div className="bg-gray-900 rounded-lg p-4 w-full">
                  <div className="flex gap-1.5 mb-3">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <div className="space-y-2 font-mono text-[10px]">
                    <div className="flex justify-between text-blue-400">
                      <span>Available Projects</span>
                      <span className="text-white">12 Active</span>
                    </div>
                    <div className="h-1.5 bg-blue-500 rounded w-3/4" />
                    <div className="h-1.5 bg-cyan-500 rounded w-1/2" />
                    <div className="h-1.5 bg-green-500 rounded w-5/6" />
                    <div className="text-gray-400 text-[9px] mt-3">Financial Analysis • M&A • Due Diligence</div>
                  </div>
                </div>
              </div>
            }
          />

          {/* Feature 2 - Workflow & Collaboration (Image Right) */}
          <AdvisoryFeature
            title="Collaborate with your team instantly."
            description="Work seamlessly with project leads, partners, and fellow analysts. Our integrated workspace keeps everyone aligned with real-time updates, shared deliverables, and structured workflows that mirror professional advisory practices."
            imageSide="right"
            imageContent={
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-4 flex items-center justify-center">
                <div className="bg-gray-900 rounded-lg p-4 w-full">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600" />
                      <div className="flex-1">
                        <div className="h-1.5 bg-blue-500 rounded w-2/3" />
                        <div className="h-1 bg-gray-700 rounded w-1/3 mt-0.5" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-600" />
                      <div className="flex-1">
                        <div className="h-1.5 bg-green-500 rounded w-3/4" />
                        <div className="h-1 bg-gray-700 rounded w-1/2 mt-0.5" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-cyan-600" />
                      <div className="flex-1">
                        <div className="h-1.5 bg-cyan-500 rounded w-1/2" />
                        <div className="h-1 bg-gray-700 rounded w-2/3 mt-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          />

          {/* Feature 3 - Analysis Tools (Image Left) */}
          <AdvisoryFeature
            title="Build with professional-grade tools."
            description="Access the same frameworks and methodologies used by top advisory firms. From financial modeling to market analysis, our platform provides templates, guidance, and review cycles that ensure institutional-quality deliverables."
            imageSide="left"
            imageContent={
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-4 flex items-center justify-center">
                <div className="bg-gray-900 rounded-lg p-4 w-full">
                  <div className="grid grid-cols-2 gap-2">
                    {['Financial Model', 'Market Analysis', 'Due Diligence', 'Valuation'].map((label, i) => (
                      <div key={i} className="bg-gray-800 rounded p-2 border-l-2 border-blue-500">
                        <div className="text-[9px] text-gray-400 font-mono">{label}</div>
                        <div className="flex gap-0.5 mt-1.5">
                          {Array(5).fill(0).map((_, j) => (
                            <div key={j} className={`h-4 w-1.5 rounded ${j <= i ? 'bg-green-500' : 'bg-gray-700'}`} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            }
          />

          {/* Feature 4 - Client Presentations (Image Right) */}
          <AdvisoryFeature
            title="Present with confidence to real clients."
            description="Deliver polished presentations and comprehensive analyses directly to clients. Experience the full advisory lifecycle from research to final delivery, building the confidence and skills that set you apart in institutional roles."
            imageSide="right"
            imageContent={
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-4 flex items-center justify-center">
                <div className="bg-gray-900 rounded-lg p-4 w-full aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">Client Presentation Ready</div>
                    <div className="flex gap-1.5 justify-center mt-3">
                      <div className="h-1 w-6 bg-green-500 rounded" />
                      <div className="h-1 w-6 bg-green-500 rounded" />
                      <div className="h-1 w-6 bg-green-500 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            }
          />

          {/* CTA */}
          <div className="mt-16 text-center">
            <Link href="/sign-in" onClick={() => onCta('projects')} className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold shadow-lg text-base">
              Sign In to Start Your Advisory Journey
            </Link>
          </div>
        </div>
      </section>

      {/* Learning section - Dark with gradient */}
      <section id="learning" className="scroll-mt-24 relative overflow-hidden bg-gradient-to-b from-blue-900 via-black to-black text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/60 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative mx-auto max-w-7xl px-8 py-8 md:py-12">
          <div className="text-center max-w-3xl mx-auto mb-6">
            <div className="inline-block px-4 py-2 bg-blue-500/20 rounded-full text-sm font-semibold text-blue-300 mb-2">
              Coming Soon
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              NGI Learning
            </h2>
            <p className="mt-2 text-base text-zinc-300 leading-relaxed">
            Develop the real-world skills institutional investors require. Expand your knowledge to get ahead of the gap.
          </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { title: 'Fundamentals to Practice', desc: 'A student-first path from core concepts to applied real-world scenarios' },
              { title: 'Clear Milestones', desc: 'Track your progress with practical outcomes and achievable goals' },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition-all duration-200">
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link href="/sign-in" onClick={() => onCta('learning')} className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold shadow-lg">
              Stay Updated
            </Link>
          </div>
        </div>

        <div className="absolute top-1/3 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </section>

      {/* Incubator section - Light */}
      <section id="incubator" className="scroll-mt-24 bg-white text-gray-900">
        <div className="mx-auto max-w-7xl px-8 py-8 md:py-12">
          {/* Hero Header */}
          <div className="text-center max-w-4xl mx-auto mb-8">
            <div className="inline-block px-4 py-2 bg-blue-100 rounded-full text-sm font-semibold text-blue-600 mb-2">
              Coming Soon
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-2">
              Next Generation Investors Capital Fund
            </h2>
            <p className="text-base text-gray-600 leading-relaxed">
              We support student founders building startups that create positive impact. From your first idea to institutional funding, we provide everything you need to turn your vision into reality.
            </p>
          </div>

          {/* Our Approach - Clean without border */}
          <div className="mb-12">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-8">Our Approach</h3>
            <div className="grid md:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {[
                { title: 'For Students', desc: 'Built by students, for students. We understand your unique challenges.' },
                { title: 'Structured Capital', desc: 'Transparent funding with clear milestones for early-stage founders.' },
                { title: 'Full Support', desc: 'Complete operational support from entity setup to Series A.' },
                { title: 'Impact-Driven', desc: 'Join founders building companies that create meaningful change.' },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-lg bg-white border border-gray-200 hover:border-blue-600 hover:shadow-md hover:scale-105 transition-all duration-200 text-center">
                  <div className="text-lg font-bold text-blue-600 mb-2">{item.title}</div>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Combined: What We Provide & Who We're Looking For */}
          <div className="mb-8">
            <div className="text-center mb-10">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">Complete Support for Student Founders</h3>
              <p className="text-base text-gray-600 max-w-3xl mx-auto">
                From operational infrastructure to strategic capital, we provide everything you need—whether you&apos;re just starting or ready to scale.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {/* Left Column - What We Provide */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-blue-600 rounded" />
                  <h4 className="text-lg font-bold text-gray-900">What We Provide</h4>
                </div>
                <div className="space-y-3">
                  {[
                    { title: 'Entity & Governance', desc: 'Formation, registration, and corporate governance setup' },
                    { title: 'Accounting & Compliance', desc: 'GAAP-compliant bookkeeping and tax preparation' },
                    { title: 'Capital Access', desc: 'Funding and investor network introductions' },
                    { title: 'Strategic Planning', desc: 'Business modeling and milestone planning' },
                    { title: 'Mentorship Network', desc: 'Access to partners, alumni founders, and experts' },
                    { title: 'Operational Support', desc: 'Back-office infrastructure and systems' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1.5" />
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{item.title}</div>
                        <div className="text-gray-600 text-sm">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column - Who We're Looking For */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-blue-600 rounded" />
                  <h4 className="text-lg font-bold text-gray-900">Who We&apos;re Looking For</h4>
                </div>
                <div className="space-y-3">
                  {[
                    { title: 'Student Founders with Ideas', desc: 'You have a problem-solving idea and you&apos;re ready to build' },
                    { title: 'Early-Stage Startups', desc: 'You&apos;ve started building and need support to scale' },
                    { title: 'Mission-Driven Builders', desc: 'Creating impact in climate, education, healthcare, or social good' },
                    { title: 'Diverse Backgrounds', desc: 'Technical and non-technical founders from all backgrounds' },
                    { title: 'Committed Founders', desc: 'Dedicated to building sustainable, long-term companies' },
                    { title: 'Growth-Oriented', desc: 'Ready to learn, adapt, and scale your venture' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1.5" />
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{item.title}</div>
                        <div className="text-gray-600 text-sm">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white max-w-4xl mx-auto">
            <h3 className="text-xl md:text-2xl font-bold mb-2">Ready to Build Our Future?</h3>
            <p className="text-base mb-5 text-blue-100">
              Join the next generation of investors in creating and operating the companies that matter.
            </p>
            <Link 
              href="/sign-in" 
              onClick={() => onCta('incubator')} 
              className="inline-block px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-all duration-200 font-bold shadow-lg hover:shadow-xl"
            >
              Apply to NGI Capital Fund (Coming Soon)
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white text-gray-700">
        <div className="mx-auto max-w-7xl px-8 py-8 text-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} NGI Capital, Inc.</div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-blue-600 transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-blue-600 transition-colors">X</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Instagram</a>
          </div>
        </div>
      </footer>
    </>
  )
}

function AdvisoryFeature({ 
  title, 
  description, 
  imageSide, 
  imageContent 
}: { 
  title: string
  description: string
  imageSide: 'left' | 'right'
  imageContent: React.ReactNode
}) {
  const [isVisible, setIsVisible] = useState(false)
  const featureRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.15, rootMargin: '-50px' }
    )

    if (featureRef.current) {
      observer.observe(featureRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const textContent = (
    <div className={`flex-1 transition-all duration-[2000ms] ease-out ${isVisible ? 'opacity-100 translate-x-0' : imageSide === 'left' ? 'opacity-0 translate-x-24' : 'opacity-0 -translate-x-24'}`}>
      <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-base text-gray-600 leading-relaxed">{description}</p>
    </div>
  )

  const imageBox = (
    <div className={`w-full md:w-[35%] transition-all duration-[2000ms] ease-out delay-500 ${isVisible ? 'opacity-100 translate-x-0' : imageSide === 'left' ? 'opacity-0 -translate-x-24' : 'opacity-0 translate-x-24'}`}>
      <div className="aspect-[4/3] rounded-xl overflow-hidden shadow-xl">
        {imageContent}
      </div>
    </div>
  )

  return (
    <div ref={featureRef} className="mb-20">
      <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
        {imageSide === 'left' ? (
          <>
            {imageBox}
            {textContent}
          </>
        ) : (
          <>
            {textContent}
            {imageBox}
          </>
        )}
      </div>
    </div>
  )
}

function AnimatedWord({ word, reduceMotion }: { word: string; reduceMotion?: boolean }) {
  const [display, setDisplay] = useState(word)
  const [phase, setPhase] = useState<'in'|'out'|'idle'>('in')
  const prev = useRef(word)
  
  useEffect(() => {
    if (reduceMotion) {
      setDisplay(word)
      setPhase('idle')
      prev.current = word
      return
    }
    if (word === prev.current) return
    
    setPhase('out')
    const t = setTimeout(() => {
      setDisplay(word)
      setPhase('in')
      prev.current = word
      const t2 = setTimeout(() => setPhase('idle'), 300)
      return () => clearTimeout(t2)
    }, 300)
    return () => clearTimeout(t)
  }, [word, reduceMotion])
  
  const cls = phase === 'in'
    ? 'opacity-100 translate-y-0'
    : phase === 'out'
      ? 'opacity-0 -translate-y-2'
      : 'opacity-100 translate-y-0'
  
  return (
    <span 
      className={`inline-block transition-all duration-300 ease-out ${cls} font-extrabold`}
      style={{
        color: '#2563eb',
        textShadow: '0 0 20px rgba(37, 99, 235, 0.5), 0 0 40px rgba(37, 99, 235, 0.3), 0 2px 4px rgba(0, 0, 0, 0.3)',
        filter: 'brightness(1.1)'
      }}
    >
      {display}
    </span>
  )
}
