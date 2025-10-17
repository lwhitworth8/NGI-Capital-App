"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { advisoryListStudents, advisoryUpdateStudent, advisorySoftDeleteStudent, advisoryGetStudentTimeline, advisoryOverrideStudentStatus, advisoryCreateStudentAssignment, advisoryListProjects, advisoryListArchivedStudents, advisoryRestoreStudent, advisoryExportStudents, apiClient, learningAdminListStudents } from '@/lib/api'
import { StudentsDataTable } from '@/components/students/StudentsDataTable'
import { StudentDetailSheet } from '@/components/students/StudentDetailSheet'
import { AssignToProjectDialog } from '@/components/students/AssignToProjectDialog'
import { StatusOverrideDialog } from '@/components/students/StatusOverrideDialog'
import { AdvisoryLayout } from '@/components/advisory/AdvisoryLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Archive, TrendingUp, AlertCircle, Download, Filter, Search, UserPlus, Edit, Trash2, MoreHorizontal, Briefcase, DollarSign, Clock, Target, Building2, MapPin, FileText, CheckCircle, XCircle, Eye, BookOpen } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { motion, AnimatePresence } from 'framer-motion'
import type { AdvisoryStudent } from '@/types'
import { AnimatedText } from '@ngi/ui/components/animated'
import { UC_SCHOOLS } from '@/lib/uc-schools'
import { UC_MAJORS } from '@/lib/uc-majors'
import { MultiSelect } from '@/components/ui/multi-select'
import { ProjectPicker } from '@/components/ui/project-picker'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const BASE_ALLOWED = new Set([
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
        
        console.log('🔍 Student filters debug:', {
          schoolMulti,
          programMulti,
          gradMin,
          gradMax,
          appliedProjectId,
          params
        })
        
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
  }, [allowed, activeTab, statusFilter, sortBy, hasResume, page, archPage, searchQuery, schoolMulti, programMulti, gradMin, gradMax, appliedProjectId])

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

  return (
    <>
      {loading || authCheckLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : !allowed ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">You don't have permission to view this page.</p>
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-screen-2xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <AnimatedText 
              text="Students Database" 
              as="h1" 
              className="text-3xl font-bold tracking-tight"
              delay={0.1}
            />
            <AnimatedText 
              text="Manage and view students profiles and activity" 
              as="p" 
              className="text-muted-foreground mt-2"
              delay={0.3}
              stagger={0.02}
            />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.filter(s => s.status_effective === 'active' || s.status === 'active').length}</div>
              <p className="text-xs text-muted-foreground">
                Currently enrolled
              </p>
            </CardContent>
          </Card>

          <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Complete Profiles</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.filter(s => s.profile_completeness?.percentage >= 80).length}</div>
              <p className="text-xs text-muted-foreground">
                80%+ completion
              </p>
            </CardContent>
          </Card>

          <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Learning</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(learningByEmail).filter(email => {
                  const learning = learningByEmail[email];
                  return learning && learning.completion > 0;
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">
                In learning modules
              </p>
            </CardContent>
          </Card>

          <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Archived</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{archived.length}</div>
              <p className="text-xs text-muted-foreground">
                Previously enrolled
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'active'|'archived')}>
            <div className="flex justify-center">
              <TabsList>
                <TabsTrigger value="active" className="text-center">
                  Active Students
                </TabsTrigger>
                <TabsTrigger value="archived" className="text-center">
                  Archived
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="active" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle>Student Directory</CardTitle>
                    <CardDescription>Manage student profiles and track learning progress</CardDescription>
                  </CardHeader>
                  
                  {/* Filters Section */}
                  <div className="px-6 pb-4">
                    <div className="flex flex-wrap items-center gap-3" aria-label="Students filters toolbar">
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
                      <div className="flex items-center gap-2">
                        <ProjectPicker
                          projects={projects as any}
                          value={appliedProjectId}
                          onChange={(id)=> setAppliedProjectId(id)}
                          placeholder="Applied Project"
                          ariaLabel="Filter by applied project"
                        />
                        <div className="flex items-center space-x-1" aria-label="Grad year range">
                          <Input
                            type="number"
                            placeholder="Min"
                            value={gradMin as any}
                            onChange={(e) => setGradMin(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-20"
                            aria-label="Minimum graduation year"
                          />
                          <span className="text-xs text-muted-foreground">-</span>
                          <Input
                            type="number"
                            placeholder="Max"
                            value={gradMax as any}
                            onChange={(e) => setGradMax(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-20"
                            aria-label="Maximum graduation year"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <CardContent>
                    {listLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : students.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No students found</h3>
                        <p className="text-muted-foreground mb-4">
                          Get started by adding your first student to the database
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>School</TableHead>
                            <TableHead>Major</TableHead>
                            <TableHead>Grad Year</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Profile</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {students.map((student, index) => (
                              <motion.tr
                                key={student.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ delay: index * 0.03 }}
                                className="hover:bg-muted/50 cursor-pointer"
                                onClick={() => handleStudentSelect(student)}
                              >
                                <TableCell className="font-medium">
                                  {student.first_name} {student.last_name}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{student.email}</TableCell>
                                <TableCell>{student.school || '-'}</TableCell>
                                <TableCell>{student.major || '-'}</TableCell>
                                <TableCell>{student.grad_year || '-'}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={student.status === 'active' ? 'default' : 'secondary'}
                                    className="capitalize"
                                  >
                                    {student.status || 'active'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 bg-muted rounded-full h-2">
                                      <div 
                                        className="bg-primary h-2 rounded-full transition-all duration-300"
                                        style={{ 
                                          width: `${student.profile_completeness?.percentage || 0}%` 
                                        }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {Math.round(student.profile_completeness?.percentage || 0)}%
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleStudentSelect(student)
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        // Handle edit
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        // Handle delete
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="archived" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Archived Students</CardTitle>
                        <CardDescription>
                          Students who have been removed from the active list but preserved for reference
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {archived.length === 0 ? (
                      <div className="text-center py-8">
                        <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No archived students</h3>
                        <p className="text-muted-foreground">
                          Archived students will appear here when they are removed from the active list
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>School</TableHead>
                            <TableHead>Archived Date</TableHead>
                            <TableHead>Archived By</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {archived.map((student, index) => (
                              <motion.tr
                                key={student.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ delay: index * 0.03 }}
                                className="hover:bg-muted/50"
                              >
                                <TableCell className="font-medium">
                                  {student.snapshot?.first_name} {student.snapshot?.last_name}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{student.email}</TableCell>
                                <TableCell>{student.snapshot?.school || '-'}</TableCell>
                                <TableCell>
                                  {new Date(student.deleted_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {student.deleted_by || 'System'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => advisoryRestoreStudent(student.original_id)}
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Restore
                                  </Button>
                                </TableCell>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
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
        </div>
      )}
    </>
  )
}

