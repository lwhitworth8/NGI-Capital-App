"use client"

 import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { LEARNING_MODULES, LEARNING_GROUPS, GroupedLearningModule } from '@/types/learning'
import { learningAPI } from '@/lib/api/learning'
import { LessonContent } from '@/components/learning/LessonContent'
import { 
  Building, 
  Calculator, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  Gavel, 
  Lightbulb, 
  Globe, 
  Cog, 
  Megaphone,
  Clock,
  BookOpen,
  CheckCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Play,
  Star
} from 'lucide-react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { motion } from 'framer-motion'

const iconMap = {
  building: Building,
  calculator: Calculator,
  document: FileText,
  chart: BarChart3,
  trending: TrendingUp,
  gavel: Gavel,
  lightbulb: Lightbulb,
  globe: Globe,
  cog: Cog,
  megaphone: Megaphone,
}

const colorMap = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-500',
  purple: 'bg-purple-500',
  gray: 'bg-gray-500',
}

export default function LearningPage() {
  const { getToken, isSignedIn } = useAuth()
  const router = useRouter()
  const [progress, setProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'homepage' | 'submodules' | 'learning'>('homepage')
  const [selectedGroup, setSelectedGroup] = useState<GroupedLearningModule | null>(null)
  const [selectedModule, setSelectedModule] = useState<any>(null)
  const [showDemo, setShowDemo] = useState(false)

  useEffect(() => {
    // Optional lightweight telemetry: page view only; no PII
    const post = async () => {
      try {
        await fetch('/api/public/telemetry/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'page_view', payload: { route: '/learning' } })
        })
      } catch {}
    }
    post()

    if (isSignedIn) {
      loadProgress()
    } else {
      setLoading(false)
    }
  }, [isSignedIn])

  const loadProgress = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const data = await learningAPI.getProgress(token)
      setProgress(data)
    } catch (err) {
      console.error('Failed to load progress:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGroupClick = (group: GroupedLearningModule) => {
    setSelectedGroup(group)
    setActiveView('submodules')
  }

  const handleModuleClick = (moduleId: string) => {
    const module = LEARNING_MODULES.find(m => m.id === moduleId)
    if (module) {
      setSelectedModule(module)
      setActiveView('learning')
    }
  }

  const handleBackToHomepage = () => {
    setActiveView('homepage')
    setSelectedGroup(null)
    setSelectedModule(null)
  }

  const handleBackToSubmodules = () => {
    setActiveView('submodules')
    setSelectedModule(null)
  }

  const handleStartJourney = () => {
    // Find the first available module group
    const firstAvailableGroup = LEARNING_GROUPS.find(group => 
      group.submodules.some(sub => {
        const module = LEARNING_MODULES.find(m => m.id === sub.id)
        return module && module.status === 'available'
      })
    )
    
    if (firstAvailableGroup) {
      handleGroupClick(firstAvailableGroup)
    }
  }

  const handleViewDemo = () => {
    setShowDemo(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Fixed Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">NGI Learning Center</h1>
              <p className="text-muted-foreground">
                {activeView !== 'homepage' ? (
                  <button
                    onClick={handleBackToHomepage}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <ArrowRight className="h-4 w-4 rotate-180" />
                    Back to Homepage
                  </button>
                ) : "Professional development and skill building"}
              </p>
            </div>
            {progress && activeView === 'homepage' && (
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">{progress.current_streak_days || 0} day streak</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-muted-foreground">{progress.activities_completed?.length || 0} completed</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto">
        {activeView === 'homepage' && (
          <HomepageView 
            progress={progress}
            onGroupClick={handleGroupClick}
            onStartJourney={handleStartJourney}
            onViewDemo={handleViewDemo}
            isSignedIn={!!isSignedIn}
            router={router}
          />
        )}
        
        {activeView === 'submodules' && selectedGroup && (
          <SubmodulesView 
            group={selectedGroup}
            onModuleClick={handleModuleClick}
            onBack={handleBackToHomepage}
          />
        )}
        
        {activeView === 'learning' && selectedModule && (
          <LearningWorkflowView 
            module={selectedModule}
            onBack={handleBackToSubmodules}
          />
        )}
      </div>

      {/* Demo Modal */}
      {showDemo && (
        <DemoModal onClose={() => setShowDemo(false)} />
      )}
    </div>
  )
}

// Homepage View - Product showcase of main modules
function HomepageView({ 
  progress, 
  onGroupClick, 
  onStartJourney,
  onViewDemo,
  isSignedIn, 
  router 
}: { 
  progress: any
  onGroupClick: (group: GroupedLearningModule) => void
  onStartJourney: () => void
  onViewDemo: () => void
  isSignedIn: boolean
  router: any
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section with Animated Gradient */}
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-600/20 rounded-3xl blur-3xl"></div>
        <div className="relative bg-gradient-to-br from-card to-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-12 text-center group hover:shadow-2xl transition-all duration-500">
          <div className="space-y-6">
            {/* Hero Title with Gradient Text */}
            <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 group-hover:from-blue-500 group-hover:via-purple-500 group-hover:to-cyan-500 transition-all duration-500">
              Master The Skills To Conquer The World
            </h1>
            
            {/* Hero Description */}
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto group-hover:text-foreground/90 transition-colors duration-500 leading-relaxed">
              Learn real-world skills through hands-on projects, expert AI feedback, and industry case studies. 
              Build your portfolio and advance your career in investment banking.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
              <button 
                onClick={onStartJourney}
                className="relative overflow-hidden group/btn px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-2xl hover:from-blue-500 hover:to-purple-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span className="relative z-10">Start Your Journey</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
              </button>
              <button 
                onClick={onViewDemo}
                className="px-8 py-4 border-2 border-border text-foreground font-semibold rounded-2xl hover:bg-muted/50 transition-all duration-300 hover:border-primary/50"
              >
                View Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Stats - Full version for homepage */}
        {progress && (
        <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold text-foreground">{progress.current_streak_days || 0} days</p>
                </div>
              </div>
            </div>
            
          <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Activities Completed</p>
                <p className="text-2xl font-bold text-foreground">{progress.activities_completed?.length || 0}</p>
                </div>
              </div>
            </div>
            
          <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Longest Streak</p>
                <p className="text-2xl font-bold text-foreground">{progress.longest_streak_days || 0} days</p>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Main Learning Modules - Modern Design with 3D Effects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {LEARNING_GROUPS
            .slice()
            .sort((a, b) => a.order - b.order)
          .map((group) => {
            const availableCount = group.submodules.filter(s => {
              const module = LEARNING_MODULES.find(m => m.id === s.id)
              return module && module.status === 'available'
            }).length
            
            const isAvailable = availableCount > 0
            const progressPercentage = (availableCount / group.submodules.length) * 100
            
            return (
              <div
                key={group.mainModule}
                onClick={() => isAvailable && onGroupClick(group)}
                className={`group relative bg-gradient-to-br from-card to-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 transition-all duration-500 ${
                  isAvailable 
                    ? 'cursor-pointer hover:shadow-2xl hover:border-primary/30 hover:-translate-y-2 hover:scale-[1.02] hover:rotate-1' 
                    : 'cursor-not-allowed opacity-60'
                }`}
                style={{
                  transformStyle: 'preserve-3d',
                  perspective: '1000px'
                }}
                title={group.mainModule === 'Business Foundations' ? 'Master the fundamentals of business thinking. Learn systems thinking, business model design, strategic planning, and operational excellence to build a solid foundation for any career path.' :
                       group.mainModule === 'Accounting and Finance' ? 'Dive deep into financial analysis and accounting principles. From reading financial statements to building valuation models, develop the analytical skills that top firms demand.' :
                       group.mainModule === 'Economics' ? 'Understand the forces that drive markets and economies. Learn microeconomic principles, macroeconomic analysis, and how economic theory applies to real-world business decisions.' :
                       group.mainModule === 'Technology & Innovation' ? 'Master the technical skills driving modern business. Learn computer science fundamentals, software engineering practices, data science techniques, and artificial intelligence applications that are reshaping industries.' :
                       group.mainModule === 'Leadership & Management' ? 'Develop the leadership skills that set you apart. Learn project management, team leadership, organizational behavior, and change management to advance your career and drive results.' :
                       group.mainModule === 'Communication & Presentation' ? 'Build the communication skills that open doors. Master business communication, presentation skills, public speaking, and professional writing to effectively convey ideas and influence stakeholders.' :
                       'Explore this learning module to develop essential skills for your career.'}
              >
                    {/* Animated Background Gradient */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    {/* Glow Effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                    
                    {/* Progress Circle with Animation */}
                    <div className="flex justify-center mb-6 relative z-10">
                      <div className="relative w-20 h-20">
                        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                          {/* Background circle */}
                          <path
                            className="text-muted/20"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          {/* Progress circle with animation */}
                          <path
                            className={`transition-all duration-1000 ease-out ${
                              isAvailable ? 'text-green-500' : 'text-muted-foreground'
                            }`}
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            fill="none"
                            strokeDasharray={`${progressPercentage}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            style={{
                              strokeDashoffset: 0,
                              animation: isAvailable ? 'progress-fill 2s ease-out' : 'none'
                            }}
                          />
                        </svg>
                        {/* Center content with pulse animation */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className={`text-2xl font-bold transition-all duration-300 ${
                              isAvailable ? 'text-green-500 group-hover:text-green-400' : 'text-muted-foreground'
                            }`}>
                              {availableCount}
                            </div>
                            <div className="text-xs text-muted-foreground group-hover:text-foreground/80 transition-colors">
                              {group.submodules.length}
                            </div>
                          </div>
                        </div>
                        {/* Pulse ring for available modules */}
                        {isAvailable && (
                          <div className="absolute inset-0 rounded-full border-2 border-green-500/30 group-hover:border-green-400/50 group-hover:scale-110 transition-all duration-300"></div>
                        )}
                      </div>
                    </div>
                    
                    {/* Title with gradient text */}
                    <h3 className="text-xl font-bold text-foreground text-center mb-4 group-hover:text-primary transition-colors duration-300 relative z-10">
                      {group.mainModule}
                    </h3>
                    
                    {/* Status Badge with animation */}
                    <div className="flex justify-center mb-6 relative z-10">
                      {isAvailable ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 group-hover:bg-green-200 dark:group-hover:bg-green-900/30 transition-colors duration-300">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          Coming Soon
                        </span>
                      )}
                    </div>

                    {/* Explore Button with enhanced effects */}
                    <div className="flex justify-center relative z-10">
                      {isAvailable ? (
                        <button className="relative overflow-hidden group/btn inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium rounded-xl hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                          <span className="relative z-10 mr-2">Explore</span>
                          <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-6 py-3 bg-muted text-muted-foreground font-medium rounded-xl">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    
                    {/* Floating particles effect for available modules */}
                    {isAvailable && (
                      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                        <div className="absolute top-4 left-4 w-1 h-1 bg-primary/30 rounded-full animate-ping"></div>
                        <div className="absolute top-8 right-6 w-1 h-1 bg-primary/40 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
                        <div className="absolute bottom-6 left-8 w-1 h-1 bg-primary/20 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                        <div className="absolute bottom-4 right-4 w-1 h-1 bg-primary/30 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
                      </div>
                    )}
                  </div>
            )
          })}
      </div>

    </div>
  )
}

// Submodules View - Shows modules within a selected group
function SubmodulesView({ 
  group, 
  onModuleClick, 
  onBack 
}: { 
  group: GroupedLearningModule
  onModuleClick: (moduleId: string) => void
  onBack: () => void
}) {
  // Resolve submodules against LEARNING_MODULES
  const byId = new Map(LEARNING_MODULES.map((m) => [m.id, m]))
  const resolved = group.submodules.map((s) => {
    const base = byId.get(s.id)
    if (base) {
      return {
        id: s.id,
        name: s.submoduleName || base.title,
        status: (s.status as any) || (base.status === 'locked' ? 'coming_soon' : base.status),
        description: base.description,
        duration: base.duration,
        units: base.units,
        icon: base.icon,
        color: base.color,
        errorMessage: undefined as string | undefined,
      }
    }
    return {
      id: s.id,
      name: s.submoduleName || s.id,
      status: (s.status as any) || 'error',
      description: 'Module is not yet available',
      duration: 'TBD',
      units: 0,
      icon: 'building',
      color: 'gray',
      errorMessage: s.errorMessage || 'Module not defined in catalog',
    }
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">
          {group.mainModule}
        </h2>
        <p className="text-muted-foreground">
          Select a module to begin your learning journey
        </p>
                </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resolved.map((m) => {
              const IconComponent = iconMap[m.icon as keyof typeof iconMap] || Building
              const isAvailable = m.status === 'available'
              const isComingSoon = m.status === 'coming_soon'
              const isError = m.status === 'error'
          
              return (
                <motion.div
                  key={m.id}
              onClick={() => isAvailable && onModuleClick(m.id)}
                  whileHover={{ y: isAvailable ? -6 : 0, scale: isAvailable ? 1.01 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`group relative bg-card border rounded-xl p-6 transition-all duration-200 ${
                    isAvailable
                  ? 'border-border cursor-pointer hover:shadow-lg hover:border-primary/50 hover:-translate-y-1'
                      : isError
                      ? 'border-red-300 dark:border-red-900 cursor-not-allowed opacity-80'
                  : 'border-border cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="absolute top-4 right-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isAvailable
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : isError
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isAvailable ? 'Available' : isError ? 'Error' : 'Coming Soon'}
                    </span>
                  </div>
              
                  <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{m.name}</h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                      {isError && m.errorMessage ? m.errorMessage : m.description}
                    </p>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {m.duration}
                      </div>
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-1" />
                        {m.units} units
                      </div>
                    </div>
                
                {isAvailable && (
                  <div className="flex items-center text-primary group-hover:text-primary/80">
                    <Play className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">Start Learning</span>
                  </div>
                )}
              </div>
              
                  {isAvailable && (
                <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                  )}
                </motion.div>
              )
            })}
            </div>
    </div>
  )
}

// Learning Workflow View - Individual module learning interface
function LearningWorkflowView({ 
  module, 
  onBack 
}: { 
  module: any
  onBack: () => void
}) {
  const { getToken } = useAuth()
  const IconComponent = iconMap[module.icon as keyof typeof iconMap] || Building
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadModuleContent()
  }, [module])

  const loadModuleContent = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build candidate IDs to handle naming differences between UI and DB
      const candidates = Array.from(new Set([
        module.id,
        module.id.replace(/-/g, '_'),
        module.id === 'business-foundations' ? 'business_foundations' : null,
        module.id === 'accounting-i' || module.id === 'accounting_1' ? 'accounting_i' : null,
        module.id === 'accounting-ii' || module.id === 'accounting_2' ? 'accounting_ii' : null,
        module.id === 'finance-valuation' ? 'finance_valuation' : null,
        module.id === 'managerial-accounting' ? 'managerial_accounting' : null,
      ].filter(Boolean) as string[]))

      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      let loaded = false
      for (const mid of candidates) {
        try {
          const data = await learningAPI.getModuleContent(mid, token)
          setLessons(data)
          loaded = true
          break
        } catch (e) {
          // try next candidate
        }
      }

      if (!loaded) {
        throw new Error('No content found for this module')
      }
    } catch (err) {
      console.error('Error loading module content:', err)
      setError('Failed to load module content')
    } finally {
      setLoading(false)
    }
  }

  const handleLessonClick = (lesson: any) => {
    setSelectedLesson(lesson)
  }

  const handleBackToLessons = () => {
    setSelectedLesson(null)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
          <h3 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
            Error Loading Content
          </h3>
          <p className="text-red-600 dark:text-red-300 mb-6">{error}</p>
          <button
            onClick={onBack}
            className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Back to Modules
          </button>
        </div>
      </div>
    )
  }

  // If a lesson is selected, show the lesson content
  if (selectedLesson) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={handleBackToLessons}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Back to Lessons
          </button>
          <h2 className="text-2xl font-bold text-foreground">{selectedLesson.title}</h2>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-8">
          <LessonContent 
            content={selectedLesson}
            onComplete={() => {
              console.log('Lesson completed!')
              // TODO: Mark lesson as complete in backend
            }}
          />
        </div>
      </div>
    )
  }

  // Group lessons by unit
  const lessonsByUnit = lessons.reduce((acc: { [key: string]: any[] }, lesson: any) => {
    const unitId = lesson.unit_id || 'general'
    if (!acc[unitId]) {
      acc[unitId] = []
    }
    acc[unitId].push(lesson)
    return acc
  }, {} as { [key: string]: any[] })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              {module.title}
            </h2>
            <p className="text-muted-foreground">
              {module.duration} • {Object.keys(lessonsByUnit).length} units • {lessons.length} lessons
            </p>
          </div>
        </div>
        
        <p className="text-lg text-muted-foreground max-w-3xl">
          {module.description}
        </p>
      </div>

      {/* Lessons List */}
      {Object.keys(lessonsByUnit).length > 0 ? (
        <div className="space-y-8">
          {(Object.entries(lessonsByUnit) as [string, any[]][]).map(([unitId, unitLessons]) => (
            <div key={unitId} className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4 capitalize">
                {unitId.replace(/_/g, ' ')}
              </h3>
              <div className="grid gap-4">
                {unitLessons.map((lesson: any) => (
                  <div
                    key={lesson.id}
                    onClick={() => handleLessonClick(lesson)}
                    className="flex items-center justify-between p-4 bg-muted/50 hover:bg-muted rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {lesson.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {lesson.estimated_duration_minutes ? `${lesson.estimated_duration_minutes} min` : ''} • 
                          {lesson.difficulty_level ? ` ${lesson.difficulty_level}` : ''}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No Lessons Available
            </h3>
            <p className="text-muted-foreground mb-6">
              This module doesn't have any lessons yet. Check back soon for interactive learning content.
            </p>
            <button
              onClick={onBack}
              className="inline-flex items-center px-6 py-3 bg-muted text-muted-foreground font-medium rounded-lg hover:bg-muted/80 transition-colors"
            >
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
              Back to Modules
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Demo Modal Component
function DemoModal({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0)
  
  const demoSteps = [
    {
      title: "Welcome to NGI Learning Center",
      content: "Discover how our comprehensive learning platform helps you master investment banking skills through interactive modules, AI coaching, and real-world projects.",
      icon: <BookOpen className="h-12 w-12 text-primary" />
    },
    {
      title: "Interactive Learning Modules",
      content: "Explore our 5 core modules covering Business Foundations, Accounting, Finance, and more. Each module includes hands-on exercises and real company data.",
      icon: <Building className="h-12 w-12 text-blue-600" />
    },
    {
      title: "AI-Powered Coaching",
      content: "Get personalized feedback on your submissions with our advanced AI coaching system. Improve your work with expert-level guidance and suggestions.",
      icon: <Lightbulb className="h-12 w-12 text-yellow-600" />
    },
    {
      title: "Manim Animations",
      content: "Learn complex concepts through beautiful, interactive animations. Visualize financial models, business processes, and strategic frameworks.",
      icon: <Play className="h-12 w-12 text-purple-600" />
    },
    {
      title: "Excel Validation",
      content: "Submit your work for Goldman Sachs-standard validation. Get detailed feedback on formulas, formatting, and best practices.",
      icon: <FileText className="h-12 w-12 text-green-600" />
    },
    {
      title: "Progress Tracking",
      content: "Track your learning journey with detailed analytics, streak counters, and completion certificates. Stay motivated and see your growth.",
      icon: <TrendingUp className="h-12 w-12 text-emerald-600" />
    }
  ]

  const nextStep = () => {
    if (currentStep < demoSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onClose()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-foreground">Learning Center Demo</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              {demoSteps[currentStep].icon}
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">
              {demoSteps[currentStep].title}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {demoSteps[currentStep].content}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-center mb-6">
            <div className="flex space-x-2">
              {demoSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {currentStep === demoSteps.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
