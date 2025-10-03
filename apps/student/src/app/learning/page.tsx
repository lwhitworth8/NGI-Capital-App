"use client"

 import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { LEARNING_MODULES } from '@/types/learning'
import { learningAPI } from '@/lib/api/learning'
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
  CheckCircle
} from 'lucide-react'

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

  const handleModuleClick = (moduleId: string) => {
    router.push(`/learning/${moduleId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            NGI Learning Center
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Master the skills institutional investors require. Build your expertise with hands-on learning.
          </p>
        </div>

        {/* Progress Stats */}
        {progress && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Streak</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{progress.current_streak_days || 0} days</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Activities Completed</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{progress.activities_completed?.length || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Longest Streak</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{progress.longest_streak_days || 0} days</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LEARNING_MODULES.map((module) => {
            const IconComponent = iconMap[module.icon as keyof typeof iconMap] || Building
            const isAvailable = module.status === 'available'
            const isComingSoon = module.status === 'coming_soon'
            
            return (
              <div
                key={module.id}
                onClick={() => isAvailable && handleModuleClick(module.id)}
                className={`group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 transition-all duration-200 ${
                  isAvailable 
                    ? 'cursor-pointer hover:shadow-lg hover:border-blue-500/50 hover:-translate-y-1' 
                    : 'cursor-not-allowed opacity-60'
                }`}
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isAvailable 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}>
                    {isAvailable ? 'Available' : 'Coming Soon'}
                  </span>
                </div>

                {/* Icon */}
                <div className={`w-12 h-12 ${colorMap[module.color as keyof typeof colorMap] || 'bg-gray-500'} rounded-lg flex items-center justify-center mb-4`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {module.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                    {module.description}
                  </p>
                  
                  {/* Module Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {module.duration}
                    </div>
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      {module.units} units
                    </div>
                  </div>
                </div>

                {/* Hover Effect */}
                {isAvailable && (
                  <div className="absolute inset-0 rounded-xl bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                )}
              </div>
            )
          })}
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Start Learning Center?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
              Choose any available module to begin your journey. Each module includes hands-on exercises, 
              real-world case studies, and expert feedback to accelerate your growth.
            </p>
            {!isSignedIn && (
              <button
                onClick={() => router.push('/sign-in')}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In to Start Learning Center
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
