'use client'

import { useState, useEffect, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2 } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ModuleHeader } from '@ngi/ui/components/layout'
import { AnimatedText } from '@ngi/ui/components/animated'

const TABS = [
  { id: 'projects', label: 'Projects' },
  { id: 'students', label: 'Students' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'project-center', label: 'Project Center' },
]

// Import existing page components as content
const ProjectsContent = lazy(() => import('./projects/page'))
const StudentsContent = lazy(() => import('./students/page'))
const OnboardingContent = lazy(() => import('./onboarding/page'))
const ProjectCenterContent = lazy(() => import('./lead-manager/page'))

export default function AdvisoryPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('projects')
  
  // Initialize from URL params or localStorage
  useEffect(() => {
    const tabParam = searchParams?.get('tab')
    if (tabParam && TABS.find(t => t.id === tabParam)) {
      setActiveTab(tabParam)
    } else {
      const saved = localStorage.getItem('advisory-active-tab')
      if (saved && TABS.find(t => t.id === saved)) {
        setActiveTab(saved)
      }
    }
  }, [searchParams])
  
  // Persist active tab and update URL
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    localStorage.setItem('advisory-active-tab', value)
    
    // Update URL params
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', value)
    router.push(`?${params.toString()}`, { scroll: false })
  }
  
  // Keyboard shortcuts (Cmd/Ctrl + 1-5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '5') {
        const index = parseInt(e.key) - 1
        if (TABS[index]) {
          e.preventDefault()
          handleTabChange(TABS[index].id)
        }
      }
      
      // Arrow key navigation
      if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault()
        const currentIndex = TABS.findIndex(t => t.id === activeTab)
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          handleTabChange(TABS[currentIndex - 1].id)
        } else if (e.key === 'ArrowRight' && currentIndex < TABS.length - 1) {
          handleTabChange(TABS[currentIndex + 1].id)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, handleTabChange])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Fixed header with GSAP animation */}
      <ModuleHeader 
        title="NGI Capital Advisory" 
      />
      
      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="mb-6 flex justify-center">
              <TabsList className="h-11 bg-muted/50">
                {TABS.map(tab => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id} 
                    className="data-[state=active]:bg-background px-6"
                    title={`${tab.label} (Cmd/Ctrl+${TABS.indexOf(tab) + 1})`}
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            
            <div className="mt-6">
              <Suspense fallback={
                <div className="flex items-center justify-center p-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="h-8 w-8 text-primary" />
                  </motion.div>
                </div>
              }>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <TabsContent value="projects" className="mt-0">
                      <ProjectsContent />
                    </TabsContent>
                    <TabsContent value="students" className="mt-0">
                      <StudentsContent />
                    </TabsContent>
                    <TabsContent value="onboarding" className="mt-0">
                      <OnboardingContent />
                    </TabsContent>
                    <TabsContent value="project-center" className="mt-0">
                      <ProjectCenterContent />
                    </TabsContent>
                  </motion.div>
                </AnimatePresence>
              </Suspense>
            </div>
          </Tabs>
        </div>
      </div>
      
      {/* Keyboard shortcut hint */}
      <div className="fixed bottom-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm border rounded-md px-3 py-2 hidden lg:block">
        <kbd className="text-xs">Cmd/Ctrl + 1-5</kbd> to switch tabs
      </div>
    </div>
  )
}