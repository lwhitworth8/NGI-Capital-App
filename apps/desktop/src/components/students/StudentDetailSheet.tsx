"use client"

import * as React from "react"
import { format } from "date-fns"
import {
  Calendar,
  ExternalLink,
  FileText,
  GraduationCap,
  Link as LinkIcon,
  Mail,
  MapPin,
  Phone,
  User,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  BookOpen,
  MessageSquare,
  Award,
  Target,
  Eye,
  EyeOff
} from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { AdvisoryStudent } from "@/types"
import { advisoryGetStudentTimeline, learningAdminListStudents } from "@/lib/api"

interface StudentDetailSheetProps {
  student: AdvisoryStudent | null
  isOpen: boolean
  onClose: () => void
  onAssignToProject?: (student: AdvisoryStudent) => void
  onStatusOverride?: (student: AdvisoryStudent) => void
  onArchive?: (student: AdvisoryStudent) => void
}

export function StudentDetailSheet({
  student,
  isOpen,
  onClose,
  onAssignToProject,
  onStatusOverride,
  onArchive
}: StudentDetailSheetProps) {
  const [showResume, setShowResume] = React.useState(false)
  const [timeline, setTimeline] = React.useState<{ applications: any[]; coffeechats: any[]; onboarding: any[] } | null>(null)
  const [loadingTimeline, setLoadingTimeline] = React.useState(false)
  const [learning, setLearning] = React.useState<any | null>(null)

  React.useEffect(() => {
    let mounted = true
    async function load() {
      if (!student?.id || !isOpen) return
      setLoadingTimeline(true)
      try {
        const tl = await advisoryGetStudentTimeline(student.id)
        if (mounted) setTimeline(tl)
      } catch {
        if (mounted) setTimeline({ applications: [], coffeechats: [], onboarding: [] })
      } finally {
        if (mounted) setLoadingTimeline(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [student?.id, isOpen])

  React.useEffect(() => {
    let mounted = true
    async function loadLearning() {
      if (!student?.email || !isOpen) return
      try {
        const data = await learningAdminListStudents()
        const list = (data?.students || []) as any[]
        const match = list.find(s => (s.email || '').toLowerCase() === (student.email || '').toLowerCase())
        if (mounted) setLearning(match || null)
      } catch { if (mounted) setLearning(null) }
    }
    loadLearning(); return () => { mounted = false }
  }, [student?.email, isOpen])

  if (!student) return null

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>
      case 'alumni':
        return <Badge variant="secondary">Alumni</Badge>
      case 'paused':
        return <Badge variant="outline">Paused</Badge>
      case 'prospect':
        return <Badge variant="outline">Prospect</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getProfileCompletenessColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600"
    if (percentage >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const formatActivityDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Never"
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
        return format(date || new Date(), "MMM d, yyyy")
  }

  return (
    <Sheet open={isOpen} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent 
        side="center" 
        className="overflow-y-auto h-[85vh] w-[80vw] max-w-5xl min-w-[800px]"
      >
        <SheetHeader className="pb-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg bg-blue-600 text-white">
                {student.first_name?.charAt(0) || ''}{student.last_name?.charAt(0) || ''}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-2xl">
                {student.first_name || ''} {student.last_name || ''}
              </SheetTitle>
              <SheetDescription className="text-base mt-1">
                {student.email}
              </SheetDescription>
              <div className="flex items-center space-x-2 mt-2">
                {getStatusBadge(student.status_effective || student.status)}
                {student.status_override && (
                  <Badge variant="outline" className="text-xs">
                    Override
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="learning">Learning</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Profile Completeness */}
            {student.profile_completeness && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Profile Completeness
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <Progress value={student.profile_completeness.percentage} className="h-2" />
                    </div>
                    <span className={`text-sm font-medium ${getProfileCompletenessColor(student.profile_completeness.percentage)}`}>
                      {student.profile_completeness.percentage}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {Object.entries(student.profile_completeness)
                      .filter(([key]) => key.startsWith('has_') && key !== 'has_resume')
                      .map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2 text-xs">
                          {value ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-red-600" />
                          )}
                          <span className={value ? "text-green-600" : "text-red-600"}>
                            {key.replace('has_', '').replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}


            {/* Student Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Student Information</CardTitle>
                <CardDescription>
                  Complete student profile and academic information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                    </div>
                  </div>

                  {student.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Phone</p>
                        <p className="text-sm text-muted-foreground">{student.phone}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">School</p>
                      <p className="text-sm text-muted-foreground">{student.school || "Not specified"}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Program</p>
                      <p className="text-sm text-muted-foreground">{student.program || "Not specified"}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Graduation</p>
                      <p className="text-sm text-muted-foreground">{student.grad_year || "Not specified"}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Last Activity</p>
                      <p className="text-sm text-muted-foreground">{formatActivityDate(student.last_activity_at)}</p>
                    </div>
                  </div>

                  {student.linkedin_url && (
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">LinkedIn</p>
                        <a
                          href={student.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center"
                        >
                          View Profile <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  )}

                  {student.location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">{student.location}</p>
                      </div>
                    </div>
                  )}

                  {student.gpa && (
                    <div className="flex items-center space-x-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">GPA</p>
                        <p className="text-sm text-muted-foreground">{student.gpa}</p>
                      </div>
                    </div>
                  )}

                  {student.resume_url && (
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Resume</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowResume(!showResume)}
                          className="text-sm"
                        >
                          {showResume ? (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Hide Resume
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              View Resume
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {showResume && student.resume_url && (
                  <div className="mt-4">
                    <iframe
                      src={student.resume_url}
                      className="w-full h-96 border rounded-lg"
                      title={`${student.first_name || ''}'s Resume`}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <CardDescription>
                  Latest applications, coffee chats, and onboarding activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {loadingTimeline && (
                    <div className="text-center text-sm text-muted-foreground py-8">Loading activity...</div>
                  )}
                  {!loadingTimeline && (!timeline || (!timeline.applications?.length && !timeline.coffeechats?.length && !timeline.onboarding?.length)) && (
                    <div className="text-center text-sm text-muted-foreground py-8">No recent activity</div>
                  )}
                  {learning && (
                    <div>
                      <div className="text-sm font-medium mb-3 flex items-center">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Learning Progress
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 rounded-md border bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                          <div className="text-muted-foreground flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Talent Signal
                          </div>
                          <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                            {learning.talent_signal ?? 0}
                          </div>
                          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5 mt-1">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(learning.talent_signal ?? 0, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="p-3 rounded-md border bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                          <div className="text-muted-foreground flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completion
                          </div>
                          <div className="text-lg font-semibold text-green-900 dark:text-green-100">
                            {learning.completion_percentage ?? 0}%
                          </div>
                          <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-1.5 mt-1">
                            <div 
                              className="bg-green-600 h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(learning.completion_percentage ?? 0, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="p-3 rounded-md border bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
                          <div className="text-muted-foreground flex items-center">
                            <FileText className="h-3 w-3 mr-1" />
                            Submissions
                          </div>
                          <div className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                            {learning.submissions_count ?? 0}
                          </div>
                        </div>
                        <div className="p-3 rounded-md border bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
                          <div className="text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Last Activity
                          </div>
                          <div className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                            {learning.last_activity ? new Date(learning.last_activity).toLocaleDateString() : 'Never'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Additional Learning Metrics */}
                      <div className="mt-4 grid grid-cols-1 gap-3">
                        <div className="p-3 rounded-md border bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 border-gray-200 dark:border-gray-800">
                          <div className="text-muted-foreground text-sm mb-2">Learning Analytics</div>
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div>
                              <div className="text-muted-foreground">Quality Score</div>
                              <div className="font-semibold">{learning.artifact_quality ?? 0}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Current Streak</div>
                              <div className="font-semibold">{learning.current_streak ?? 0} days</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Time Invested</div>
                              <div className="font-semibold">{learning.total_time_invested ?? 0}h</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {!!timeline?.applications?.length && (
                    <div>
                      <div className="text-sm font-medium mb-2">Applications</div>
                      <div className="space-y-2">
                        {timeline.applications.map((a: any) => (
                          <div key={`app_${a.id}`} className="flex items-center justify-between border rounded-md p-2 text-sm">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div>Project {a.project_id ?? '-'} - <span className="uppercase text-xs">{a.status}</span></div>
                                <div className="text-xs text-muted-foreground">{a.created_at}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!!timeline?.coffeechats?.length && (
                    <div>
                      <div className="text-sm font-medium mb-2">Coffee Chats</div>
                      <div className="space-y-2">
                        {timeline.coffeechats.map((c: any) => (
                          <div key={`cc_${c.id}`} className="flex items-center justify-between border rounded-md p-2 text-sm">
                            <div className="flex items-center space-x-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div>{c.status} - {c.topic || c.provider}</div>
                                <div className="text-xs text-muted-foreground">{c.scheduled_start}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!!timeline?.onboarding?.length && (
                    <div>
                      <div className="text-sm font-medium mb-2">Onboarding</div>
                      <div className="space-y-2">
                        {timeline.onboarding.map((o: any) => (
                          <div key={`ob_${o.id}`} className="flex items-center justify-between border rounded-md p-2 text-sm">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div>Template {o.template_id ?? ''} - {o.status}</div>
                                <div className="text-xs text-muted-foreground">{o.created_at}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="learning" className="space-y-6">
            {/* Learning Progress Overview */}
            {learning ? (
              <div className="space-y-6">
                {/* Main Learning Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-500 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Talent Signal</p>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {learning.talent_signal ?? 0}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(learning.talent_signal ?? 0, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-500 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-700 dark:text-green-300">Completion</p>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {learning.completion_percentage ?? 0}%
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(learning.completion_percentage ?? 0, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-500 rounded-lg">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Submissions</p>
                          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                            {learning.submissions_count ?? 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Learning Analytics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Learning Analytics
                    </CardTitle>
                    <CardDescription>
                      Detailed progress and performance metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-foreground">{learning.artifact_quality ?? 0}</div>
                        <div className="text-sm text-muted-foreground">Quality Score</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-foreground">{learning.current_streak ?? 0}</div>
                        <div className="text-sm text-muted-foreground">Current Streak (days)</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-foreground">{learning.longest_streak ?? 0}</div>
                        <div className="text-sm text-muted-foreground">Longest Streak (days)</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-foreground">{learning.total_time_invested ?? 0}h</div>
                        <div className="text-sm text-muted-foreground">Time Invested</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Modules Progress */}
                {learning.modules_completed && learning.modules_completed.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Completed Modules</CardTitle>
                      <CardDescription>
                        Learning modules successfully completed
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {learning.modules_completed.map((module: string, index: number) => (
                          <div key={index} className="flex items-center space-x-2 p-2 rounded-md bg-green-50 dark:bg-green-900/20">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">{module}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Last Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Last learning activity: {learning.last_activity ? new Date(learning.last_activity).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground py-8">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No learning data available for this student</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>


        </Tabs>
      </SheetContent>
    </Sheet>
  )
}