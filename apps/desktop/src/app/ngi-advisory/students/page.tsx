"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { advisoryListStudents, advisoryUpdateStudent, advisorySoftDeleteStudent, advisoryGetStudentTimeline, advisoryOverrideStudentStatus, advisoryCreateStudentAssignment, advisoryListProjects, advisoryListArchivedStudents, advisoryRestoreStudent, advisoryExportStudents, apiClient, learningAdminListStudents } from '@/lib/api'
import { StudentsDataTable } from '@/components/students/StudentsDataTable'
import { StudentDetailSheet } from '@/components/students/StudentDetailSheet'
import { AssignToProjectDialog } from '@/components/students/AssignToProjectDialog'
import { StatusOverrideDialog } from '@/components/students/StatusOverrideDialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Archive, TrendingUp, AlertCircle, Download, Filter } from 'lucide-react'
import type { AdvisoryStudent } from '@/types'
import { UC_SCHOOLS } from '@/lib/uc-schools'
import { UC_MAJORS } from '@/lib/uc-majors'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { ProjectPicker } from '@/components/ui/ProjectPicker'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const BASE_ALLOWED = new Set([
  'lwhitworth@ngicapitaladvisory.com',
  'anurmamade@ngicapitaladvisory.com',
])

export default function AdvisoryStudentsPage() {
  const { user, loading } = useAuth()
  const [listLoading, setListLoading] = useState(false)
  const [students, setStudents] = useState<AdvisoryStudent[]>([])
  const [archived, setArchived] = useState<Array<{ id:number; original_id:number; email:string; deleted_at:string; deleted_by?:string; snapshot?: any }>>([])
  const [selectedStudent, setSelectedStudent] = useState<AdvisoryStudent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [learningByEmail, setLearningByEmail] = useState<Record<string, { completion: number; talent?: number }>>({})
  const [activeTab, setActiveTab] = useState<'active'|'archived'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [schoolMulti, setSchoolMulti] = useState<string[]>([])
  const [programMulti, setProgramMulti] = useState<string[]>([])
  const [gradMin, setGradMin] = useState<number | ''>('')
  const [gradMax, setGradMax] = useState<number | ''>('')
  const [sortBy, setSortBy] = useState<string>('last_activity_desc')
  const [hasResume, setHasResume] = useState<'all'|'yes'|'no'>('all')
  const [appliedProjectId, setAppliedProjectId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [archPage, setArchPage] = useState(1)

  const [authCheckLoading, setAuthCheckLoading] = useState(true)
  const [serverEmail, setServerEmail] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize filters from URL once
  useEffect(() => {
    const sp = searchParams
    if (!sp) return
    const q0 = sp.get('q') || ''
    const st0 = sp.get('status') || 'all'
    const sort0 = sp.get('sort') || 'last_activity_desc'
    const hr0 = (sp.get('has_resume') as any) || 'all'
    const sch0 = (sp.get('school') || '').split(',').filter(Boolean)
    const prg0 = (sp.get('program') || '').split(',').filter(Boolean)
    const gymin0 = sp.get('grad_year_min'); const gymax0 = sp.get('grad_year_max')
    const ap0 = sp.get('applied_project_id')
    setSearchQuery(q0)
    setStatusFilter(st0)
    setSortBy(sort0)
    if (hr0 === '1') setHasResume('yes'); else if (hr0 === '0') setHasResume('no'); else setHasResume('all')
    setSchoolMulti(sch0)
    setProgramMulti(prg0)
    setGradMin(gymin0 ? Number(gymin0) : '')
    setGradMax(gymax0 ? Number(gymax0) : '')
    setAppliedProjectId(ap0 ? Number(ap0) : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync URL when filters change
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams()
      if (searchQuery) params.set('q', searchQuery)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (sortBy && sortBy !== 'default') params.set('sort', sortBy)
      if (hasResume !== 'all') params.set('has_resume', hasResume === 'yes' ? '1' : '0')
      if (schoolMulti.length) params.set('school', schoolMulti.join(','))
      if (programMulti.length) params.set('program', programMulti.join(','))
      if (gradMin !== '') params.set('grad_year_min', String(gradMin))
      if (gradMax !== '') params.set('grad_year_max', String(gradMax))
      if (appliedProjectId !== null) params.set('applied_project_id', String(appliedProjectId))
      router.replace(`${pathname}?${params.toString()}`)
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery, statusFilter, sortBy, hasResume, schoolMulti, programMulti, gradMin, gradMax, router, pathname])
  const allowed = (() => {
    if ((process.env.NEXT_PUBLIC_ADVISORY_ALLOW_ALL || '').toLowerCase() === '1') return true
    const devAllow = process.env.NODE_ENV !== 'production' && (process.env.NEXT_PUBLIC_ADVISORY_DEV_OPEN || '1') === '1'
    const extra = (process.env.NEXT_PUBLIC_ADVISORY_ADMINS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
    const allowedSet = new Set<string>([...Array.from(BASE_ALLOWED), ...extra])
    let email = String(user?.email || '')
    if (!email && typeof window !== 'undefined') {
      const anyWin: any = window as any
      email = anyWin?.Clerk?.user?.primaryEmailAddress?.emailAddress
        || anyWin?.Clerk?.user?.emailAddresses?.[0]?.emailAddress
        || ''
      if (!email) {
        try { const u = JSON.parse(localStorage.getItem('user') || 'null'); if (u?.email) email = u.email } catch {}
      }
    }
    const emailLower = (email || '').toLowerCase()
    const serverLower = (serverEmail || '').toLowerCase()
    return devAllow || (!!emailLower && allowedSet.has(emailLower)) || (!!serverLower && allowedSet.has(serverLower))
  })()

  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        const anyWin: any = typeof window !== 'undefined' ? (window as any) : {}
        const localEmail = String(
          user?.email
          || anyWin?.Clerk?.user?.primaryEmailAddress?.emailAddress
          || anyWin?.Clerk?.user?.emailAddresses?.[0]?.emailAddress
          || (JSON.parse((typeof window !== 'undefined' ? localStorage.getItem('user') || 'null' : 'null')) || {}).email
          || ''
        ).toLowerCase()
        if (!localEmail && !serverEmail) {
          try { const me = await apiClient.getProfile(); if (mounted) setServerEmail(me?.email || '') } catch {}
        }
      } finally { if (mounted) setAuthCheckLoading(false) }
    }
    check(); return () => { mounted = false }
  }, [user?.email, serverEmail])

  const loadStudents = async () => {
    if (!allowed) return
    setListLoading(true)
    try {
      if (activeTab === 'active') {
        const params: any = {
          q: searchQuery || undefined,
          page,
          page_size: 100
        }
        if (statusFilter !== 'all') params.status = statusFilter
        if (sortBy && sortBy !== 'default') params.sort = sortBy
        if (hasResume !== 'all') params.has_resume = hasResume === 'yes' ? '1' : '0'
        if (schoolMulti.length) params.school = schoolMulti.join(',')
        if (programMulti.length) params.program = programMulti.join(',')
        if (gradMin !== '') params.grad_year_min = Number(gradMin)
        if (gradMax !== '') params.grad_year_max = Number(gradMax)
        if (appliedProjectId !== null) params.applied_project_id = appliedProjectId
        const list = await advisoryListStudents(params)
        setStudents(list)
        // Fetch learning progress and map by email (best-effort)
        try {
          const la = await learningAdminListStudents()
          const map: Record<string, { completion: number; talent?: number }> = {}
          for (const s of (la?.students || [])) {
            const em = String(s.email || '').toLowerCase()
            if (em) map[em] = { completion: Number(s.completion_percentage || 0), talent: Number(s.talent_signal || 0) }
          }
          setLearningByEmail(map)
        } catch { setLearningByEmail({}) }
      } else {
        setArchived(await advisoryListArchivedStudents({
          q: searchQuery || undefined,
          page: archPage,
          page_size: 100
        }))
      }
    } finally { setListLoading(false) }
  }

  useEffect(() => {
    loadStudents()
  }, [allowed, activeTab, statusFilter, sortBy, hasResume, page, archPage, searchQuery])

  // Load projects for assignments
  useEffect(() => {
    if (allowed) {
      (async () => {
        try {
          const projs = await advisoryListProjects({ status: 'active' } as any)
          setProjects(projs as any)
        } catch { setProjects([]) }
      })()
    }
  }, [allowed])

  const handleStudentSelect = (student: AdvisoryStudent) => {
    setSelectedStudent(student)
    setDetailOpen(true)
  }

  const [assignOpen, setAssignOpen] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [targetStudent, setTargetStudent] = useState<AdvisoryStudent | null>(null)

  const handleAssignToProject = async (student: AdvisoryStudent) => {
    setTargetStudent(student)
    setAssignOpen(true)
  }

  const handleStatusOverride = async (student: AdvisoryStudent) => {
    setTargetStudent(student)
    setOverrideOpen(true)
  }

  const handleArchive = async (student: AdvisoryStudent) => {
    try {
      await advisorySoftDeleteStudent(student.id)
      await loadStudents()
      setDetailOpen(false)
    } catch (error) {
      console.error('Failed to archive student:', error)
    }
  }

  const handleBulkAction = async (action: string, students: AdvisoryStudent[]) => {
    if (action === 'export') {
      try {
        await advisoryExportStudents(students.map(s => s.id))
      } catch (error) {
        console.error('Failed to export students:', error)
      }
    } else if (action === 'email') {
      const emails = students.map(s => s.email).join(',')
      window.open(`mailto:${emails}?subject=NGI Capital Advisory`)
    }
  }

  if (loading || authCheckLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto w-full max-w-screen-2xl px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Students Database</h1>
            <p className="text-muted-foreground mt-2">
              Manage student profiles, assignments, and activity tracking
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 min-w-[320px] max-w-md">
            <Card className="rounded-xl">
              <CardContent className="py-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-xl font-semibold leading-tight">{students.length}</p>
                    <p className="text-[11px] text-muted-foreground">Active Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="py-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-xl font-semibold leading-tight">
                      {students.filter(s => (s.profile_completeness?.percentage || 0) >= 80).length}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Complete Profiles</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="py-3">
                <div className="flex items-center space-x-2">
                  <Archive className="h-3 w-3 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-xl font-semibold leading-tight">{archived.length}</p>
                    <p className="text-[11px] text-muted-foreground">Archived</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Filters */}
          <Card className="rounded-xl border bg-card">
          <div className="flex flex-wrap items-center gap-3 p-3" aria-label="Students filters toolbar">
            <div className="relative">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                className="w-80"
                aria-label="Search students"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="alumni">Alumni</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_activity_desc">Last Activity</SelectItem>
                <SelectItem value="name_asc">Name A-Z</SelectItem>
                <SelectItem value="grad_year_asc">Grad Year Asc</SelectItem>
                <SelectItem value="grad_year_desc">Grad Year Desc</SelectItem>
              </SelectContent>
            </Select>
            <Select value={hasResume} onValueChange={(v) => setHasResume(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Has Resume" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Has Resume</SelectItem>
                <SelectItem value="no">No Resume</SelectItem>
              </SelectContent>
            </Select>
            <MultiSelect
              options={UC_SCHOOLS}
              selected={schoolMulti}
              onChange={setSchoolMulti}
              placeholder="UC Schools"
              searchPlaceholder="Filter schools"
              ariaLabel="Filter by UC schools"
            />
            <MultiSelect
              options={UC_MAJORS}
              selected={programMulti}
              onChange={setProgramMulti}
              placeholder="Majors"
              searchPlaceholder="Filter majors"
              ariaLabel="Filter by majors"
            />
            <ProjectPicker
              projects={projects as any}
              value={appliedProjectId}
              onChange={(id)=> setAppliedProjectId(id)}
              placeholder="Applied Project"
              ariaLabel="Filter by applied project"
            />
            <div className="flex items-center space-x-2" aria-label="Grad year range">
              <Input
                type="number"
                placeholder="Min Year"
                value={gradMin as any}
                onChange={(e) => setGradMin(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-28"
                aria-label="Minimum graduation year"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="number"
                placeholder="Max Year"
                value={gradMax as any}
                onChange={(e) => setGradMax(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-28"
                aria-label="Maximum graduation year"
              />
            </div>
            <div className="ml-auto" />
            <Button variant="outline" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setHasResume('all'); setSortBy('last_activity_desc'); setSchoolMulti([]); setProgramMulti([]); setAppliedProjectId(null); setGradMin(''); setGradMax(''); setPage(1) }}>
              Clear Filters
            </Button>
          </div>
          </Card>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'active'|'archived')}>
            <TabsList>
              <TabsTrigger value="active" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Active Students</span>
              </TabsTrigger>
              <TabsTrigger value="archived" className="flex items-center space-x-2">
                <Archive className="h-4 w-4" />
                <span>Archived</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-6">
              <StudentsDataTable
                data={students}
                loading={listLoading}
                onStudentSelect={handleStudentSelect}
                onBulkAction={handleBulkAction}
                learningByEmail={learningByEmail}
                hideToolbar
              />
            </TabsContent>

            <TabsContent value="archived" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Archived Students</CardTitle>
                  <CardDescription>
                    Students who have been removed from the active list but preserved for reference
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {archived.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No archived students found
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {archived.map((student) => (
                          <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">
                                {student.snapshot?.first_name} {student.snapshot?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{student.email}</p>
                              <p className="text-xs text-muted-foreground">
                                Archived {new Date(student.deleted_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => advisoryRestoreStudent(student.original_id)}
                            >
                              Restore
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Student Detail Sheet */}
      <StudentDetailSheet
        student={selectedStudent}
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setSelectedStudent(null)
        }}
        onAssignToProject={handleAssignToProject}
        onStatusOverride={handleStatusOverride}
        onArchive={handleArchive}
      />

      {/* Assign Dialog */}
      <AssignToProjectDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        student={targetStudent}
        projects={projects as any}
        onConfirm={async ({ project_id, hours_planned }) => {
          if (!targetStudent) return
          await advisoryCreateStudentAssignment(targetStudent.id, { project_id, hours_planned })
          setAssignOpen(false)
          await loadStudents()
        }}
      />

      {/* Status Override Dialog */}
      <StatusOverrideDialog
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        student={targetStudent}
        onConfirm={async ({ status, reason }) => {
          if (!targetStudent) return
          await advisoryOverrideStudentStatus(targetStudent.id, { status, reason })
          setOverrideOpen(false)
          await loadStudents()
        }}
      />
    </>
  )
}
