"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Clock, Users, MapPin, Briefcase, FileText, Send, Eye, Download } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@clerk/nextjs'
import type { PublicProject } from '@/lib/api'
import { ShowcaseViewer } from './ShowcaseViewer'
import { ApplicationModal } from './ApplicationModal'
import { CoffeeChatModal } from './CoffeeChatModal'

interface StudentProjectModalProps {
  isOpen: boolean
  project: PublicProject | null
  onClose: () => void
}

// Known client logos - using Clearbit Logo API
const KNOWN_CLIENTS: Record<string, string> = {
  'UC Investments': '/clients/uc-investments.svg',
  'Liverpool FC': 'https://logo.clearbit.com/liverpoolfc.com',
  'Fenway Sports Group': 'https://logo.clearbit.com/fenway-sports.com',
  'BlackRock': 'https://logo.clearbit.com/blackrock.com',
  'Blackstone': 'https://logo.clearbit.com/blackstone.com',
  'Goldman Sachs': 'https://logo.clearbit.com/goldmansachs.com',
  'JPMorgan': 'https://logo.clearbit.com/jpmorganchase.com',
  'Morgan Stanley': 'https://logo.clearbit.com/morganstanley.com',
  'Citi': 'https://logo.clearbit.com/citi.com',
  'Wells Fargo': 'https://logo.clearbit.com/wellsfargo.com',
  'Vanguard': 'https://logo.clearbit.com/vanguard.com',
  'Fidelity': 'https://logo.clearbit.com/fidelity.com',
  'UBS': 'https://logo.clearbit.com/ubs.com',
  'HSBC': 'https://logo.clearbit.com/hsbc.com',
  'Bank of America': 'https://logo.clearbit.com/bankofamerica.com',
  'Haas Finance Group': '/clients/haas-finance.svg',
  'KKR': 'https://logo.clearbit.com/kkr.com',
  'Apollo Global': 'https://logo.clearbit.com/apollo.com',
  'Carlyle Group': 'https://logo.clearbit.com/carlyle.com',
  'TPG Capital': 'https://logo.clearbit.com/tpg.com',
  'Bain Capital': 'https://logo.clearbit.com/bain.com',
}

export function StudentProjectModal({ isOpen, project, onClose }: StudentProjectModalProps) {
  const [showApplication, setShowApplication] = useState(false)
  const [showCoffee, setShowCoffee] = useState(false)
  const [showShowcase, setShowShowcase] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Fetch user profile to check resume status
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Get user email from Clerk
        const clerkUser = (window as any).Clerk?.user
        const email = clerkUser?.primaryEmailAddress?.emailAddress
        
        if (!email) {
          setLoadingProfile(false)
          return
        }

        const res = await fetch('/api/public/profile', {
          headers: { 'X-Student-Email': email }
        })
        
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
        }
      } catch (err) {
        console.error('Failed to load profile:', err)
      } finally {
        setLoadingProfile(false)
      }
    }

    if (isOpen) {
      loadProfile()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && project) {
      setShowApplication(false)
    }
  }, [isOpen, project])

  const hasResumeUploaded = Boolean(profile?.resume_url)
  const resumeUrl = profile?.resume_url || ''
  const hasCoffeeChat = false // TODO: Implement coffee chat tracking

  if (!project) return null

  const statusIsActive = (project.status || 'active').toLowerCase() === 'active'
  const statusIsClosed = (project.status || 'active').toLowerCase() === 'closed'
  const heroSrc = project.hero_image_url || ''
  
  // Get partner logos for multi-client display
  const partnerLogos = (project as any).partner_logos || []
  
  // Parse client logos - split comma-separated names if needed
  const clientLogos = (() => {
    if (partnerLogos.length > 0) {
      return partnerLogos.map((p: any) => ({
        name: p.name || p.client_name || "",
        logo: p.logo_url || p.url || p.logo || KNOWN_CLIENTS[p.name || p.client_name || ""] || ""
      })).filter((c: any) => c.name);
    }
    // Fallback: parse comma-separated client names
    const clientNameStr = (project.client_name || "").trim();
    if (!clientNameStr) return [];
    
    const clientNames = clientNameStr.split(',').map(name => name.trim()).filter(Boolean);
    return clientNames.map(name => ({
      name,
      logo: KNOWN_CLIENTS[name] || ""
    }));
  })();


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Full Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
            className="fixed inset-0 md:inset-8 lg:inset-12 max-w-5xl mx-auto bg-background rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-border"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors backdrop-blur-sm"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1">
              {/* Hero Image - Full aspect ratio without cropping */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="relative w-full aspect-[21/9] bg-gradient-to-br from-blue-600 to-blue-800"
              >
                {heroSrc ? (
                  <img
                    src={heroSrc}
                    alt={project.project_name}
                    className="absolute inset-0 w-full h-full object-contain bg-black"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Status Badge */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="absolute top-6 left-6"
                >
                  <span
                    className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm ${
                      statusIsActive
                        ? "bg-green-500 text-white"
                        : statusIsClosed
                        ? "bg-gray-500 text-white"
                        : "bg-yellow-500 text-white"
                    }`}
                  >
                    {statusIsActive ? "Open" : statusIsClosed ? "Closed" : "Draft"}
                  </span>
                </motion.div>
              </motion.div>

              {/* Content */}
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left: Main Content */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Title & Client */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="space-y-4"
                    >
                      <h1 className="text-3xl font-bold text-foreground tracking-tight">
                        {project.project_name}
                      </h1>
                      
                      {/* Client Badges - Larger size */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {clientLogos.map((client: any, idx: number) => (
                          <div key={idx} className="inline-flex items-center gap-3 px-4 py-2.5 rounded-lg bg-background border border-border shadow-sm">
                            {client.logo && (
                              <div className="w-7 h-7 bg-white dark:bg-gray-800 rounded p-1 flex items-center justify-center">
                                <img
                                  src={client.logo}
                                  alt=""
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              </div>
                            )}
                            <span className="text-base font-semibold text-foreground">{client.name}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Summary */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-lg text-muted-foreground leading-relaxed"
                    >
                      {project.summary}
                    </motion.div>
                    
                    {/* Location */}
                    {project.location_text && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="flex items-center gap-2 text-muted-foreground"
                      >
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{project.location_text}</span>
                      </motion.div>
                    )}

                    {/* Stats Grid */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="grid grid-cols-2 gap-4"
                    >
                  {project.duration_weeks && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">{project.duration_weeks}</div>
                        <div className="text-xs text-muted-foreground">Weeks</div>
                      </div>
                    </div>
                  )}

                  {project.commitment_hours_per_week && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">{project.commitment_hours_per_week}</div>
                        <div className="text-xs text-muted-foreground">Hrs/Week</div>
                      </div>
                    </div>
                  )}

                  {project.mode && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground capitalize truncate">{project.mode.replace('_', ' ')}</div>
                        <div className="text-xs text-muted-foreground">Mode</div>
                      </div>
                    </div>
                  )}
                </motion.div>

                    {/* Description */}
                    {project.description && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="space-y-3"
                      >
                        <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                          <FileText className="w-6 h-6" />
                          Project Details
                        </h2>
                        <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {project.description}
                        </div>
                      </motion.div>
                    )}

                {/* Showcase Materials */}
                {(project as any).showcase_pdf_url && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 }}
                    className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/30 border border-border"
                  >
                    <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Project Showcase Materials
                    </h3>
                    <p className="text-sm text-foreground/80 mb-4">
                      Browse through deliverables, case studies, and results from this project.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowShowcase(true)}
                        className="flex-1 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-5 h-5" />
                        View Materials
                      </button>
                      <a
                        href={(project as any).showcase_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 rounded-xl border border-border bg-background text-foreground font-semibold hover:bg-accent transition-colors flex items-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                  </motion.div>
                )}
                  </div>

                  {/* Right: Action Sidebar */}
                  <div className="space-y-4">
                    {/* Coffee Chat Section */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/30 border border-border"
                    >
                      <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Coffee Chat
                      </h3>
                      <p className="text-xs text-foreground/80 mb-3">
                        Schedule a 15-minute chat with project leads
                      </p>
                      <button 
                        onClick={() => setShowCoffee(true)}
                        className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm font-medium hover:bg-accent transition-colors"
                      >
                        View Times
                      </button>
                    </motion.div>

                    {/* Apply Button */}
                    {statusIsActive && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="p-5 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-950/30 border border-border"
                      >
                        <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                          <Send className="w-4 h-4 text-green-600" />
                          Apply Now
                        </h3>
                        <p className="text-xs text-foreground/80 mb-3">
                          Submit your application for this project
                        </p>
                        <button
                          onClick={() => setShowApplication(true)}
                          className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Start Application
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Showcase Viewer Modal */}
          {(project as any).showcase_pdf_url && (
            <ShowcaseViewer
              isOpen={showShowcase}
              onClose={() => setShowShowcase(false)}
              fileUrl={(project as any).showcase_pdf_url}
              fileName={`${project.project_name} - Showcase`}
            />
          )}
          
          {/* Application Modal */}
          <ApplicationModal
            isOpen={showApplication}
            project={project}
            onClose={() => setShowApplication(false)}
            hasResumeUploaded={hasResumeUploaded}
            resumeUrl={resumeUrl}
            hasCoffeeChat={hasCoffeeChat}
          />

          {/* Coffee Chat Modal */}
          <CoffeeChatModal isOpen={showCoffee} onClose={() => setShowCoffee(false)} />
        </>
      )}
    </AnimatePresence>
  )
}

