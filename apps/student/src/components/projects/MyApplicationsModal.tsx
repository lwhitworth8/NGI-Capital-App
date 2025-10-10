"use client"

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, X, ExternalLink, History, ListChecks } from 'lucide-react'
import Link from 'next/link'
import { listMyApplications, listMyArchivedApplications, spFetch, type PublicProjectDetail } from '@/lib/api'

type MyApplication = { id:number; target_project_id?:number; status:string; created_at:string; updated_at?:string; has_updates?:boolean }

export function MyApplicationsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'current'|'past'>('current')
  const [current, setCurrent] = useState<MyApplication[]>([])
  const [past, setPast] = useState<MyApplication[]>([])
  const [projectMap, setProjectMap] = useState<Record<number, string>>({})

  // Fetch on open
  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!isOpen) return
      setLoading(true)
      try {
        const [cur, arch] = await Promise.all([
          listMyApplications().catch(() => [] as MyApplication[]),
          listMyArchivedApplications().catch(() => [] as any[]),
        ])

        // Build past list (archived + withdrawn/rejected)
        const currentPast = cur.filter(i => ['withdrawn','rejected'].includes((i.status||'').toLowerCase()))
        const map = new Map<number, MyApplication>()
        currentPast.forEach(i => map.set(i.id, i))
        arch.forEach((a: any) => {
          if (!map.has(a.id)) map.set(a.id, { id: a.id, target_project_id: a.project_id, status: a.status || 'archived', created_at: a.archived_at })
        })

        const pastList = Array.from(map.values()).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        if (!ignore) {
          setCurrent(cur)
          setPast(pastList)
        }

        // Resolve project names best-effort
        const ids = Array.from(new Set([...(cur||[]), ...(pastList||[])].map(i => i.target_project_id).filter(Boolean))) as number[]
        if (ids.length) {
          const results = await Promise.all(ids.map(async id => {
            try {
              const d = await spFetch<PublicProjectDetail>(`/api/public/projects/${id}`)
              return { id, name: d.project_name }
            } catch {
              return { id, name: `Project #${id}` }
            }
          }))
          const pm: Record<number,string> = {}
          results.forEach(r => { pm[r.id] = r.name })
          if (!ignore) setProjectMap(pm)
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    void load()
    return () => { ignore = true }
  }, [isOpen])

  const list = view === 'current' ? current : past

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="relative w-full max-w-3xl max-h-[90vh] bg-background text-foreground rounded-2xl border border-border shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-background/80 hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="p-6 border-b border-border bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white"><FileText className="w-5 h-5" /></div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">My Applications</h2>
                  <p className="text-sm text-muted-foreground">View the status of your project applications</p>
                </div>
              </div>
              <div className="mt-4 inline-flex rounded-xl border border-border bg-background shadow-sm overflow-hidden">
                <button
                  onClick={() => setView('current')}
                  aria-pressed={view==='current'}
                  className={`px-4 py-2 text-sm font-semibold transition-colors ${view==='current' ? 'bg-blue-600 text-white' : 'bg-transparent text-foreground/75 hover:text-foreground hover:bg-muted'}`}
                >
                  Current
                </button>
                <button
                  onClick={() => setView('past')}
                  aria-pressed={view==='past'}
                  className={`px-4 py-2 text-sm font-semibold border-l border-border transition-colors ${view==='past' ? 'bg-blue-600 text-white' : 'bg-transparent text-foreground/75 hover:text-foreground hover:bg-muted'}`}
                >
                  Past
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-8 w-8 rounded-full border-2 border-blue-600/30 border-t-blue-600 animate-spin" />
                </div>
              ) : list.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    {view==='current' ? <ListChecks className="w-7 h-7 text-muted-foreground" /> : <History className="w-7 h-7 text-muted-foreground" />}
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{view==='current' ? 'No applications yet' : 'No past applications'}</h3>
                  <p className="text-sm text-muted-foreground">{view==='current' ? 'Browse projects and apply to get started.' : 'Past applications will appear after they are withdrawn, rejected, or archived.'}</p>
                  <div className="mt-6 flex items-center justify-center">
                    <Link href="/projects" className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">Browse Projects</Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {list.map((a) => (
                    <div key={a.id} className="p-4 rounded-xl border border-border bg-card">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">Application #{a.id}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{new Date(a.created_at).toLocaleString()}</div>
                          {a.target_project_id && (
                            <div className="text-sm mt-1 truncate">
                              <Link href={`/projects/${a.target_project_id}`} className="text-blue-600 hover:underline">
                                {projectMap[a.target_project_id] || `Project #${a.target_project_id}`}
                              </Link>
                            </div>
                          )}
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border border-border bg-background">
                              {a.status}
                            </span>
                            {a.has_updates && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-600 text-white">Updated</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Link href={`/applications/${a.id}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-accent text-sm font-medium">
                            View
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer removed per design: X is primary close affordance and page link not needed */}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default MyApplicationsModal
