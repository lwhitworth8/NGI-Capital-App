"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, FileText, Trash2, Plus, Image as ImageIcon, Calendar, Clock, Users, MapPin, Briefcase, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { AdvisoryProject } from '@/types'
import ImageCropModal from './ImageCropModal'
import { advisoryUploadProjectHero, advisoryUploadProjectShowcase, advisoryUploadProjectLogo, advisoryAddAssignment } from '@/lib/api'
import { UC_MAJORS, MAJOR_ALIASES } from '@/lib/uc-majors'
import { addWeeks, weeksBetween, formatDateTimePST } from '@/lib/timezone'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

interface ProjectEditorModalProps {
  isOpen: boolean
  onClose: () => void
  project: AdvisoryProject | null
  entityId: number
  onSave: (data: Partial<AdvisoryProject>, publish: boolean) => Promise<void>
  onDelete?: (projectId: number) => Promise<void>
  leads: Array<{ email: string; name: string }>
  majors: string[]
  aliases?: Record<string, string>
}

// Known client logos - using Clearbit Logo API for real company logos
const KNOWN_CLIENTS: Record<string, string> = {
  'UC Endowment': '/clients/uc-endowment.svg',
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

export function ProjectEditorModal({
  isOpen,
  onClose,
  project,
  entityId,
  onSave,
  onDelete,
  leads,
  majors,
  aliases
}: ProjectEditorModalProps) {
  const [form, setForm] = useState<Partial<AdvisoryProject>>({})
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [selectedMajors, setSelectedMajors] = useState<string[]>([])
  const [selectedClients, setSelectedClients] = useState<Array<{name: string; logo: string}>>([])
  const [selectedBackers, setSelectedBackers] = useState<any[]>([])
  const [applicationQuestions, setApplicationQuestions] = useState<any[]>([])
  const [teamComposition, setTeamComposition] = useState<Array<{teamType: string; count: number; majors: string[]}>>([])
  const [saving, setSaving] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)
  const [uploadingShowcase, setUploadingShowcase] = useState(false)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState('')
  const [newPartnerName, setNewPartnerName] = useState('')
  const [newBackerName, setNewBackerName] = useState('')
  const [activeTab, setActiveTab] = useState<'basic'|'details'|'team'|'media'|'settings'>('basic')
  // AI draft helpers
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  // Always enable AI UI in modal to simplify manual testing; backend/env will gate execution
  const aiEnabled = true
  const [aiSuggestion, setAiSuggestion] = useState<null | { title: string; summary: string; description: string }>(null)
  const [promptOpen, setPromptOpen] = useState(false)
  const [aiPendingReview, setAiPendingReview] = useState(false)
  const [aiPrevValues, setAiPrevValues] = useState<{title:string;summary:string;description:string}|null>(null)
  const [aiHighlight, setAiHighlight] = useState<{title:boolean;summary:boolean;description:boolean}>({title:false,summary:false,description:false})
  
  // Autocomplete states
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  const [majorSearchTerm, setMajorSearchTerm] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [showMajorDropdown, setShowMajorDropdown] = useState(false)
  const [teamMajorSearchTerms, setTeamMajorSearchTerms] = useState<Record<string, string>>({})
  const [showTeamMajorDropdowns, setShowTeamMajorDropdowns] = useState<Record<string, boolean>>({})
  const clientInputRef = useRef<HTMLInputElement>(null)
  const majorInputRef = useRef<HTMLInputElement>(null)

  // Filtered client suggestions
  const filteredClients = useMemo(() => {
    if (!clientSearchTerm.trim()) return Object.keys(KNOWN_CLIENTS).slice(0, 10)
    const search = clientSearchTerm.toLowerCase()
    return Object.keys(KNOWN_CLIENTS).filter(name => 
      name.toLowerCase().includes(search)
    ).slice(0, 10)
  }, [clientSearchTerm])

  // Filtered major suggestions
  const filteredMajors = useMemo(() => {
    if (!majorSearchTerm.trim()) return UC_MAJORS.slice(0, 15)
    const search = majorSearchTerm.toLowerCase()
    return UC_MAJORS.filter(major => {
      const matchesDirect = major.toLowerCase().includes(search)
      const alias = Object.entries(MAJOR_ALIASES).find(([key]) => 
        key.toLowerCase().includes(search)
      )?.[1]
      return matchesDirect || major === alias
    }).slice(0, 15)
  }, [majorSearchTerm])

  // Duration calculation handlers
  const handleStartDateChange = (startDate: string) => {
    setForm((prev: any) => {
      const newForm = { ...prev, start_date: startDate }
      if (startDate && prev.duration_weeks) {
        newForm.end_date = addWeeks(startDate, prev.duration_weeks)
      }
      return newForm
    })
  }

  const handleEndDateChange = (endDate: string) => {
    setForm((prev: any) => {
      const newForm = { ...prev, end_date: endDate }
      if (prev.start_date && endDate) {
        newForm.duration_weeks = weeksBetween(prev.start_date, endDate)
      }
      return newForm
    })
  }

  const handleDurationChange = (weeks: number) => {
    setForm((prev: any) => {
      const newForm = { ...prev, duration_weeks: weeks }
      if (prev.start_date && weeks) {
        newForm.end_date = addWeeks(prev.start_date, weeks)
      }
      return newForm
    })
  }

  // Client selection
  const addClient = (clientName: string) => {
    const logo = KNOWN_CLIENTS[clientName] || ''
    if (!selectedClients.some(c => c.name === clientName)) {
      setSelectedClients([...selectedClients, { name: clientName, logo }])
      setClientSearchTerm('')
      setShowClientDropdown(false)
    }
  }

  const removeClient = (clientName: string) => {
    setSelectedClients(selectedClients.filter(c => c.name !== clientName))
  }

  // Major selection
  const addMajor = (major: string) => {
    if (!selectedMajors.includes(major)) {
      setSelectedMajors([...selectedMajors, major])
      setMajorSearchTerm('')
      setShowMajorDropdown(false)
    }
  }

  const removeMajor = (major: string) => {
    setSelectedMajors(selectedMajors.filter(m => m !== major))
    // Also remove from all team compositions
    setTeamComposition(teamComposition.map(tc => ({
      ...tc,
      majors: tc.majors.filter(m => m !== major)
    })))
  }

  // Simplified team types
  const TEAM_TYPES = [
    'Financial Analysts',
    'Software Engineers',
    'Marketing Analysts',
    'AI Engineers',
    'Data Engineers',
    'Business Strategy Analysts',
    'Supply Chain Analysts',
    'Creative Analysts'
  ]

  // Team composition helpers
  const addTeamType = (teamType: string) => {
    const currentComposition = Array.isArray(teamComposition) ? teamComposition : []
    if (!currentComposition.some(tc => tc.teamType === teamType)) {
      setTeamComposition([...currentComposition, { teamType, count: 1, majors: [] }])
    }
  }

  const updateTeamComposition = (teamType: string, field: 'count', value: number) => {
    const currentComposition = Array.isArray(teamComposition) ? teamComposition : []
    setTeamComposition(currentComposition.map(tc => 
      tc.teamType === teamType ? { ...tc, [field]: value } : tc
    ))
  }

  const addMajorToTeam = (teamType: string, major: string) => {
    const currentComposition = Array.isArray(teamComposition) ? teamComposition : []
    setTeamComposition(currentComposition.map(tc => 
      tc.teamType === teamType 
        ? { ...tc, majors: [...tc.majors, major] }
        : tc
    ))
  }

  const removeMajorFromTeam = (teamType: string, major: string) => {
    const currentComposition = Array.isArray(teamComposition) ? teamComposition : []
    setTeamComposition(currentComposition.map(tc => 
      tc.teamType === teamType 
        ? { ...tc, majors: tc.majors.filter(m => m !== major) }
        : tc
    ))
  }

  const removeTeamType = (teamType: string) => {
    const currentComposition = Array.isArray(teamComposition) ? teamComposition : []
    setTeamComposition(currentComposition.filter(tc => tc.teamType !== teamType))
    // Clean up team-specific state
    setTeamMajorSearchTerms(prev => {
      const newState = { ...prev }
      delete newState[teamType]
      return newState
    })
    setShowTeamMajorDropdowns(prev => {
      const newState = { ...prev }
      delete newState[teamType]
      return newState
    })
  }

  const getTotalTeamSize = () => {
    return Array.isArray(teamComposition) ? teamComposition.reduce((total, tc) => total + tc.count, 0) : 0
  }

  const getRemainingSlots = () => {
    const teamSize = (form as any).team_size || 0
    return Math.max(0, teamSize - getTotalTeamSize())
  }

  // Team-specific dropdown helpers
  const updateTeamMajorSearchTerm = (teamType: string, value: string) => {
    setTeamMajorSearchTerms(prev => ({ ...prev, [teamType]: value }))
  }

  const setTeamMajorDropdownVisible = (teamType: string, visible: boolean) => {
    setShowTeamMajorDropdowns(prev => ({ ...prev, [teamType]: visible }))
  }

  const getTeamMajorSearchTerm = (teamType: string) => {
    return teamMajorSearchTerms[teamType] || ''
  }

  const isTeamMajorDropdownVisible = (teamType: string) => {
    return showTeamMajorDropdowns[teamType] || false
  }

  const getFilteredMajorsForTeam = (teamType: string) => {
    const searchTerm = getTeamMajorSearchTerm(teamType)
    if (!searchTerm.trim()) return UC_MAJORS.slice(0, 15)
    const search = searchTerm.toLowerCase()
    return UC_MAJORS.filter(major => {
      const matchesDirect = major.toLowerCase().includes(search)
      const alias = Object.entries(MAJOR_ALIASES).find(([key]) => 
        key.toLowerCase().includes(search)
      )?.[1]
      return matchesDirect || major === alias
    }).slice(0, 15)
  }

  useEffect(() => {
    if (isOpen && project) {
      setForm(project)
      setSelectedLeads((project as any).project_leads || [])
      setSelectedMajors((project as any).required_majors || [])
      
      // Initialize selectedClients from partner_logos or parse from client_name
      const existingClients = (project as any).partner_logos || []
      if (existingClients.length > 0) {
        setSelectedClients(existingClients)
      } else if (project.client_name) {
        // Parse client_name and create client objects
        const clientNames = project.client_name.split(',').map(n => n.trim()).filter(Boolean)
        const clients = clientNames.map(name => ({
          name,
          logo: KNOWN_CLIENTS[name] || ''
        }))
        setSelectedClients(clients)
      } else {
        setSelectedClients([])
      }
      
      setSelectedBackers((project as any).backer_logos || [])
      setApplicationQuestions((project as any).application_questions || [])
      setTeamComposition(Array.isArray((project as any).team_composition) ? (project as any).team_composition : [])
    } else if (isOpen && !project) {
      // New project defaults
      setForm({
        entity_id: entityId,
        project_name: '',
        client_name: '',
        summary: '',
        description: '',
        status: 'draft',
        mode: 'remote',
        team_size: 4,
        duration_weeks: 12,
        commitment_hours_per_week: 10,
        allow_applications: 1,
        pay_currency: 'USD'
      })
      setSelectedLeads([])
      setSelectedMajors([])
      setSelectedClients([])
      setSelectedBackers([])
      setApplicationQuestions([])
      setTeamComposition([])
      setTeamMajorSearchTerms({})
      setShowTeamMajorDropdowns({})
      setActiveTab('basic')
    }
  }, [isOpen, project?.id, entityId])

  const handleSave = async (publish: boolean) => {
    if (!form.project_name || selectedClients.length === 0 || !form.summary) {
      toast.error('Please fill in project name, at least one client, and summary')
      return
    }

    setSaving(true)
    try {
      // Combine all client names into client_name field for backward compatibility
      const clientNames = selectedClients.map(c => c.name).join(', ')
      
      const savePayload = {
        ...form,
        client_name: clientNames,
        status: publish ? 'active' : (form.status || 'draft'),
        project_leads: selectedLeads,
        required_majors: selectedMajors,
        partner_logos: selectedClients,
        backer_logos: selectedBackers,
        application_questions: applicationQuestions,
        team_composition: teamComposition
      }
      
      // If user manually changed status in dropdown, respect that choice
      if (form.status && form.status !== 'draft' && form.status !== 'active') {
        savePayload.status = form.status
      }
      
      console.log('=== MODAL SAVE DEBUG ===')
      console.log('Form:', form)
      console.log('Selected Clients:', selectedClients)
      console.log('Save Payload:', savePayload)
      console.log('=======================')
      
      await onSave(savePayload as any, publish)
      // Don't call onClose here - let the parent handle it after successful save
    } catch (err: any) {
      console.error('Modal save error:', err)
      toast.error(String(err?.message || 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!project || !onDelete) return
    if (!confirm(`Delete project "${project.project_name}"? This cannot be undone.`)) return

    try {
      await onDelete(project.id)
      // Don't call onClose or toast here - let the parent handle it
    } catch (err: any) {
      toast.error(String(err?.message || 'Delete failed'))
    }
  }

  const addQuestion = (type: 'text'|'mcq') => {
    if (applicationQuestions.length >= 10) return
    setApplicationQuestions([...applicationQuestions, type === 'mcq' ? { type, prompt: '', choices: [] } : { type, prompt: '' }])
  }

  const removeQuestion = (index: number) => {
    setApplicationQuestions(applicationQuestions.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, updates: any) => {
    setApplicationQuestions(applicationQuestions.map((q, i) => i === index ? { ...q, ...updates } : q))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-4 md:inset-8 lg:inset-12 bg-background rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-card">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {project ? 'Edit Project' : 'Create New Project'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {project ? `Editing: ${project.project_name}` : 'Fill in the details for your new advisory project'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-6 pt-4 border-b border-border bg-card">
              {[
                { id: 'basic', label: 'Basic Info' },
                { id: 'details', label: 'Details' },
                { id: 'team', label: 'Team & Requirements' },
                { id: 'media', label: 'Media' },
                { id: 'settings', label: 'Settings' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-background text-foreground border-t border-x border-border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info Tab */}
              {activeTab === 'basic' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 max-w-4xl"
                >
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${aiLoading ? 'opacity-60 blur-[1px] pointer-events-none' : ''} ${aiHighlight.title ? 'ring-2 ring-primary/60 bg-primary/5' : ''}`}
                      placeholder="e.g., ESG Investment Strategy Analysis"
                      value={form.project_name || ''}
                      onChange={e => setForm({ ...form, project_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Client(s) *
                    </label>
                    
                    {/* Selected Clients */}
                    {selectedClients.length > 0 && (
                      <div className="flex flex-wrap gap-3 mb-3">
                        {selectedClients.map(client => (
                          <div 
                            key={client.name}
                            className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 border-border bg-card hover:border-blue-500/50 transition-all shadow-sm"
                          >
                            {client.logo && (
                              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-md p-1">
                                <img 
                                  src={client.logo} 
                                  alt={client.name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    // Show fallback icon if image fails
                                    const target = e.currentTarget
                                    target.style.display = 'none'
                                    const parent = target.parentElement
                                    if (parent) {
                                      parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-blue-100 rounded text-blue-600 font-bold text-xs">${client.name.charAt(0)}</div>`
                                    }
                                  }}
                                />
                              </div>
                            )}
                            <span className="text-sm font-medium text-foreground">{client.name}</span>
                            <button
                              type="button"
                              onClick={() => removeClient(client.name)}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full w-5 h-5 flex items-center justify-center transition-colors"
                              aria-label={`Remove ${client.name}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Client Search Input */}
                    <div className="relative">
                      <input
                        ref={clientInputRef}
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Type to search clients..."
                        value={clientSearchTerm}
                        onChange={e => {
                          setClientSearchTerm(e.target.value)
                          setShowClientDropdown(true)
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                      />

                      {/* Client Dropdown */}
                      {showClientDropdown && filteredClients.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-xl border border-border bg-popover shadow-lg">
                          {filteredClients.map(clientName => (
                            <button
                              key={clientName}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                addClient(clientName)
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-accent transition-colors flex items-center gap-3"
                            >
                              {KNOWN_CLIENTS[clientName] && (
                                <img 
                                  src={KNOWN_CLIENTS[clientName]} 
                                  alt="" 
                                  className="h-6 w-auto object-contain"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              )}
                              <span className="text-sm">{clientName}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Summary (One-liner) *
                    </label>
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${aiLoading ? 'opacity-60 blur-[1px] pointer-events-none' : ''} ${aiHighlight.summary ? 'ring-2 ring-primary/60 bg-primary/5' : ''}`}
                      placeholder="A brief one-sentence description"
                      value={form.summary || ''}
                      onChange={e => setForm({ ...form, summary: e.target.value })}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-foreground">Description</label>
                      {aiEnabled && (
                        <Popover open={promptOpen} onOpenChange={setPromptOpen}>
                          <PopoverTrigger asChild>
                            <Button type="button" size="sm" variant="secondary" onClick={() => setPromptOpen(true)}>
                              <Sparkles className="w-4 h-4 mr-1" />
                              Generate AI Draft
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-[380px] p-0 overflow-hidden rounded-xl border border-border/70 bg-background/90 backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95">
                            <div className="p-3">
                              <Textarea
                                autoFocus
                                rows={4}
                                className="min-h-[120px] bg-background/70"
                                placeholder="Describe the tone or focus (Shift+Enter for newline)"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    try {
                                      setAiLoading(true)
                                      setPromptOpen(false)
                                      const prevVals = { title: form.project_name || '', summary: form.summary || '', description: form.description || '' }
                                      setAiPrevValues(prevVals)
                                      const payload = {
                                        projectName: form.project_name || '',
                                        summary: form.summary || '',
                                        clients: (Array.isArray(selectedClients) ? selectedClients.map(c => c.name) : []),
                                        existingDescription: form.description || '',
                                        prompt: aiPrompt || '',
                                      }
                                      const resp = await fetch('/api/projects/ai/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                                      const data = await resp.json()
                                      if (!resp.ok || data?.error || (!data?.title && !data?.summary && !data?.description)) {
                                        console.error('AI generation error:', data?.details || data)
                                        toast.error('Failed to generate draft — try again')
                                      } else {
                                        const newVals = { title: String(data.title || prevVals.title), summary: String(data.summary || prevVals.summary), description: String(data.description || prevVals.description) }
                                        setForm(prev => ({ ...prev, project_name: newVals.title, summary: newVals.summary, description: newVals.description }))
                                        setAiHighlight({ title: newVals.title !== prevVals.title, summary: newVals.summary !== prevVals.summary, description: newVals.description !== prevVals.description })
                                        setAiPendingReview(true)
                                        setTimeout(() => setAiHighlight({ title:false, summary:false, description:false }), 1600)
                                      }
                                    } catch (err) {
                                      console.error(err)
                                      toast.error('Failed to generate draft — try again')
                                    } finally {
                                      setAiLoading(false)
                                    }
                                  }
                                }}
                              />
                              <div className="mt-2 flex justify-end">
                                <Button size="sm" disabled={aiLoading} onClick={async () => {
                                  try {
                                    setAiLoading(true)
                                    setPromptOpen(false)
                                    const prevVals = { title: form.project_name || '', summary: form.summary || '', description: form.description || '' }
                                    setAiPrevValues(prevVals)
                                    const payload = { projectName: form.project_name || '', summary: form.summary || '', clients: (Array.isArray(selectedClients) ? selectedClients.map(c => c.name) : []), existingDescription: form.description || '', prompt: aiPrompt || '' }
                                    const resp = await fetch('/api/projects/ai/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                                    const data = await resp.json()
                                    if (!resp.ok || data?.error || (!data?.title && !data?.summary && !data?.description)) {
                                      console.error('AI generation error:', data?.details || data)
                                      toast.error('Failed to generate draft — try again')
                                    } else {
                                      const newVals = { title: String(data.title || prevVals.title), summary: String(data.summary || prevVals.summary), description: String(data.description || prevVals.description) }
                                      setForm(prev => ({ ...prev, project_name: newVals.title, summary: newVals.summary, description: newVals.description }))
                                      setAiHighlight({ title: newVals.title !== prevVals.title, summary: newVals.summary !== prevVals.summary, description: newVals.description !== prevVals.description })
                                      setAiPendingReview(true)
                                      setTimeout(() => setAiHighlight({ title:false, summary:false, description:false }), 1600)
                                    }
                                  } catch (err) {
                                    console.error(err)
                                    toast.error('Failed to generate draft — try again')
                                  } finally {
                                    setAiLoading(false)
                                  }
                                }}>
                                  {aiLoading ? 'Generating...' : 'Generate'}
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <textarea
                      rows={8}
                      className={`w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${aiLoading ? 'opacity-60 blur-[1px] pointer-events-none' : ''} ${aiHighlight.description ? 'ring-2 ring-primary/60 bg-primary/5' : ''}`}
                      placeholder="Detailed project description..."
                      value={form.description || ''}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                    />
                    {aiPendingReview && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mt-3 flex items-center justify-between rounded-xl border bg-gradient-to-r from-background to-muted/40 px-3 py-2 shadow-sm">
                        <div className="text-sm text-muted-foreground">AI draft applied</div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => { if (aiPrevValues) { setForm(prev => ({ ...prev, project_name: aiPrevValues.title, summary: aiPrevValues.summary, description: aiPrevValues.description })) } setAiPendingReview(false); setAiPrevValues(null) }}>Undo</Button>
                          <Button size="sm" onClick={() => { setAiPendingReview(false); setAiPrevValues(null); toast.success('AI draft kept') }}>Keep</Button>
                        </div>
                      </motion.div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Mode
                      </label>
                      <select
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={form.mode || 'remote'}
                        onChange={e => setForm({ ...form, mode: e.target.value as any })}
                      >
                        <option value="remote">Remote</option>
                        <option value="in_person">In Person</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Status
                      </label>
                      <select
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={form.status || 'draft'}
                        onChange={e => setForm({ ...form, status: e.target.value as any })}
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Open</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Details Tab */}
              {activeTab === 'details' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 max-w-4xl"
                >
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Duration (weeks)
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="12"
                        value={form.duration_weeks || ''}
                        onChange={e => handleDurationChange(Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Auto-calculates end date</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Hours/Week
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="10"
                        value={form.commitment_hours_per_week || ''}
                        onChange={e => setForm({ ...form, commitment_hours_per_week: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Team Size
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="4"
                        value={(form as any).team_size || ''}
                        onChange={e => setForm({ ...form, team_size: Number(e.target.value) } as any)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Start Date (PST)
                      </label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={form.start_date || ''}
                        onChange={e => handleStartDateChange(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">All times in Pacific Time</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        End Date (PST)
                      </label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={form.end_date || ''}
                        onChange={e => handleEndDateChange(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Auto-calculates duration</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Applications Close (PST)
                      </label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={(form as any).applications_close_date || ''}
                        onChange={e => setForm({ ...form, applications_close_date: e.target.value } as any)}
                      />
                    </div>
                  </div>

                  {/* Compensation */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Default Hourly Rate
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="e.g., 25"
                        value={(form as any).default_hourly_rate ?? ''}
                        onChange={e => setForm({ ...form, default_hourly_rate: (e.target.value ? Number(e.target.value) : undefined) } as any)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Pay Currency
                      </label>
                      <div className="w-full px-4 py-3 rounded-xl border border-border bg-muted text-muted-foreground cursor-not-allowed">
                        USD (Fixed)
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Currency is fixed to USD</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Compensation Notes (admin)
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Optional internal notes"
                        value={String((form as any).compensation_notes || '')}
                        onChange={e => setForm({ ...form, compensation_notes: e.target.value } as any)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Location (if in-person/hybrid)
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="e.g., San Francisco, CA"
                      value={form.location_text || ''}
                      onChange={e => setForm({ ...form, location_text: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Eligibility Notes
                    </label>
                    <textarea
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Any specific requirements or notes..."
                      value={form.eligibility_notes || ''}
                      onChange={e => setForm({ ...form, eligibility_notes: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Internal Notes (hidden from students)
                    </label>
                    <textarea
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Private notes for internal use..."
                      value={form.notes_internal || ''}
                      onChange={e => setForm({ ...form, notes_internal: e.target.value })}
                    />
                  </div>
                </motion.div>
              )}

              {/* Team & Requirements Tab */}
              {activeTab === 'team' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 max-w-4xl"
                >
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Project Leads
                    </label>
                    <div className="space-y-2">
                      {leads.map(lead => (
                        <label key={lead.email} className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.email)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedLeads([...selectedLeads, lead.email])
                              } else {
                                setSelectedLeads(selectedLeads.filter(l => l !== lead.email))
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{lead.name} ({lead.email})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Team Composition & Required Majors
                    </label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Team Size: {(form as any).team_size || 0} | Assigned: {getTotalTeamSize()} | Remaining: {getRemainingSlots()}
                    </p>

                    {/* Team Types */}
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Add Team Types
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {TEAM_TYPES.map(teamType => (
                            <button
                              key={teamType}
                              type="button"
                              onClick={() => addTeamType(teamType)}
                              disabled={teamComposition.some(tc => tc.teamType === teamType)}
                              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                teamComposition.some(tc => tc.teamType === teamType)
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 cursor-not-allowed'
                                  : 'border-border hover:bg-accent hover:border-blue-500'
                              }`}
                            >
                              {teamComposition.some(tc => tc.teamType === teamType) ? '✓ ' : '+ '}{teamType}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Selected Team Types */}
                      {Array.isArray(teamComposition) && teamComposition.length > 0 && (
                        <div className="space-y-3">
                          {teamComposition.map(team => (
                            <div key={team.teamType} className="p-4 rounded-xl border border-border bg-card">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">{team.teamType}</span>
                                  <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                                    {team.count} members
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeTeamType(team.teamType)}
                                  className="text-red-600 hover:text-red-700 text-sm"
                                >
                                  Remove Team
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                  <label className="block text-xs text-muted-foreground mb-1">Team Size</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max={getRemainingSlots() + team.count}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                    value={team.count}
                                    onChange={e => updateTeamComposition(team.teamType, 'count', Math.max(1, Number(e.target.value)))}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-muted-foreground mb-1">Preferred Majors</label>
                                  <div className="text-xs text-muted-foreground">
                                    {team.majors.length} majors selected
                                  </div>
                                </div>
                              </div>

                              {/* Major selection for this team */}
                              <div>
                                <label className="block text-xs text-muted-foreground mb-2">Add Preferred Majors for {team.teamType}</label>
                                
                                {/* Selected majors for this team */}
                                {team.majors.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {team.majors.map(major => (
                                      <span
                            key={major}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full"
                          >
                                        {major}
                            <button
                              type="button"
                                          onClick={() => removeMajorFromTeam(team.teamType, major)}
                                          className="hover:text-green-500"
                            >
                              ×
                            </button>
                                      </span>
                        ))}
                      </div>
                    )}

                                {/* Major search for this team */}
                    <div className="relative">
                      <input
                        type="text"
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                    placeholder="Search majors for this team..."
                                    value={getTeamMajorSearchTerm(team.teamType)}
                        onChange={e => {
                                      updateTeamMajorSearchTerm(team.teamType, e.target.value)
                                      setTeamMajorDropdownVisible(team.teamType, true)
                                    }}
                                    onFocus={() => setTeamMajorDropdownVisible(team.teamType, true)}
                                    onBlur={() => setTimeout(() => setTeamMajorDropdownVisible(team.teamType, false), 200)}
                                  />

                                  {/* Major Dropdown for this team */}
                                  {isTeamMajorDropdownVisible(team.teamType) && getFilteredMajorsForTeam(team.teamType).length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 max-h-40 overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                                      {getFilteredMajorsForTeam(team.teamType)
                                        .filter(major => !team.majors.includes(major))
                                        .map(major => (
                            <button
                              key={major}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                            addMajorToTeam(team.teamType, major)
                                            updateTeamMajorSearchTerm(team.teamType, '')
                              }}
                                          className="w-full px-3 py-2 text-left hover:bg-accent transition-colors text-sm"
                            >
                              {major}
                            </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-foreground">
                        Application Questions
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => addQuestion('text')}
                          className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
                        >
                          + Text
                        </button>
                        <button
                          onClick={() => addQuestion('mcq')}
                          className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
                        >
                          + Multiple Choice
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {applicationQuestions.map((q, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-border bg-card">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-muted-foreground uppercase">
                              {q.type === 'mcq' ? 'Multiple Choice' : 'Text Question'}
                            </span>
                            <button
                              onClick={() => removeQuestion(idx)}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            type="text"
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground mb-2"
                            placeholder="Enter your question..."
                            value={q.prompt}
                            onChange={e => updateQuestion(idx, { prompt: e.target.value })}
                          />
                          {q.type === 'mcq' && (
                            <div className="space-y-2">
                              <div className="text-xs text-muted-foreground">Choices:</div>
                              {(q.choices || []).map((choice: string, ci: number) => (
                                <div key={ci} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-sm"
                                    value={choice}
                                    onChange={e => {
                                      const newChoices = [...(q.choices || [])]
                                      newChoices[ci] = e.target.value
                                      updateQuestion(idx, { choices: newChoices })
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      const newChoices = (q.choices || []).filter((_: any, i: number) => i !== ci)
                                      updateQuestion(idx, { choices: newChoices })
                                    }}
                                    className="text-sm text-red-600"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const newChoices = [...(q.choices || []), '']
                                  updateQuestion(idx, { choices: newChoices })
                                }}
                                className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
                              >
                                + Add Choice
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      {applicationQuestions.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-8">
                          No application questions yet. Click the buttons above to add some.
                        </div>
                      )}
                    </div>
                  </div>

                </motion.div>
              )}

              {/* Media Tab */}
              {activeTab === 'media' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 max-w-4xl"
                >
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      Hero Image
                    </label>
                    <p className="text-xs text-muted-foreground mb-3">
                      This is how your hero image will appear on the project page (21:9 aspect ratio)
                    </p>
                    {form.hero_image_url && (
                      <div className="mb-3 rounded-xl overflow-hidden border border-border bg-muted relative group">
                        <div className="relative w-full" style={{ paddingBottom: '42.857%' }}>
                          <img 
                            src={form.hero_image_url} 
                            alt="Hero" 
                            className="absolute inset-0 w-full h-full object-cover" 
                          />
                          {/* Delete button overlay */}
                          <button
                            onClick={() => {
                              setForm({ ...form, hero_image_url: '' });
                              toast.success('Hero image removed');
                            }}
                            className="absolute top-2 right-2 p-2 rounded-full bg-red-500/80 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete hero image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    {!form.hero_image_url && (
                      <div className="mb-3 rounded-xl overflow-hidden border border-border bg-muted">
                        <div className="relative w-full flex items-center justify-center" style={{ paddingBottom: '42.857%' }}>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Briefcase className="w-16 h-16 text-muted-foreground/30" />
                          </div>
                        </div>
                      </div>
                    )}
                    <label className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                      !project ? 'border-border bg-muted cursor-not-allowed opacity-60' : 'border-border bg-card hover:bg-accent cursor-pointer'
                    }`}>
                      <ImageIcon className="w-5 h-5" />
                      {uploadingHero ? 'Uploading...' : !project ? 'Save Project First to Upload' : 'Upload Hero Image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingHero || !project}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const localUrl = URL.createObjectURL(file)
                          setCropImageSrc(localUrl)
                          setCropModalOpen(true)
                          try { e.currentTarget.value = '' } catch {}
                        }}
                      />
                    </label>
                    {!project && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Save the project first to enable image uploads
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      Project Showcase Materials
                    </label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Upload PDF or PowerPoint files to showcase project deliverables, case studies, or results. 
                      Viewers will be able to browse through slides interactively.
                    </p>
                    {!project && (
                      <div className="p-4 rounded-xl border border-border bg-muted/30 text-center">
                        <p className="text-sm text-muted-foreground">
                          Save the project first to upload showcase materials
                        </p>
                      </div>
                    )}
                    {project && (
                      <>
                        {form.showcase_pdf_url && (
                        <div className="mb-3 p-4 rounded-xl border border-border bg-card">
                          <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8 text-blue-600" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-foreground">Showcase materials uploaded</div>
                              <a
                                href={form.showcase_pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                View file
                              </a>
                            </div>
                            <button
                              onClick={() => {
                                if (confirm('Remove showcase materials?')) {
                                  setForm({ ...form, showcase_pdf_url: undefined })
                                }
                              }}
                              className="p-2 rounded-lg hover:bg-accent transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      )}
                      <label className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                        !project ? 'border-border bg-muted cursor-not-allowed opacity-60' : 'border-border bg-card hover:bg-accent cursor-pointer'
                      }`}>
                        <FileText className="w-5 h-5" />
                        {uploadingShowcase ? 'Uploading...' : !project ? 'Save Project First to Upload' : form.showcase_pdf_url ? 'Replace Showcase Materials' : 'Upload Showcase Materials'}
                        <input
                          type="file"
                          accept="application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                          className="hidden"
                          disabled={uploadingShowcase || !project}
                          onChange={async e => {
                            const file = e.target.files?.[0]
                            if (!file || !project) return
                            setUploadingShowcase(true)
                            try {
                              const res = await advisoryUploadProjectShowcase(project.id, file)
                              setForm({ ...form, showcase_pdf_url: (res as any).showcase_pdf_url })
                              toast.success('Showcase materials uploaded')
                            } catch (err: any) {
                              toast.error(String(err?.message || 'Upload failed'))
                            } finally {
                              setUploadingShowcase(false)
                            }
                          }}
                        />
                      </label>
                      {!project && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Save the project first to enable showcase uploads
                        </p>
                      )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 max-w-4xl"
                >
                  <div>
                    <label className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card cursor-pointer hover:bg-accent/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={Boolean(((form as any).allow_applications as number | undefined) ?? 1)}
                        onChange={e => setForm({ ...form, allow_applications: (e.target.checked ? 1 : 0) } as any)}
                        className="w-5 h-5"
                      />
                      <div>
                        <div className="font-medium text-foreground">Allow Applications</div>
                        <div className="text-sm text-muted-foreground">Students can apply to this project</div>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Project Code (auto-generated)
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-muted text-muted-foreground cursor-not-allowed"
                      value={form.project_code || 'Auto-assigned on save'}
                      disabled
                      readOnly
                    />
                  </div>

                  {project && onDelete && (
                    <div className="pt-6 border-t border-border">
                      <h3 className="text-lg font-semibold text-foreground mb-2">Danger Zone</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Deleting this project is permanent and cannot be undone.
                      </p>
                      <button
                        onClick={handleDelete}
                        className="px-6 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-5 h-5" />
                        Delete Project
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between p-6 border-t border-border bg-card">
              <div className="text-sm text-muted-foreground">
                {project ? `Last updated: ${formatDateTimePST((project as any).updated_at || project.created_at)} PST` : 'New project'}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl border border-border text-foreground hover:bg-accent transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSave(false)}
                  className="px-6 py-3 rounded-xl bg-muted text-foreground hover:bg-muted/80 border border-border transition-colors"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : project ? 'Save Changes' : 'Save Draft'}
                </button>
                <button
                  onClick={() => handleSave(true)}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors font-semibold"
                  disabled={saving}
                >
                  {project ? 'Update & Publish' : 'Publish'}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Crop Modal */}
          <ImageCropModal
            isOpen={cropModalOpen}
            imageUrl={cropImageSrc}
            onClose={() => {
              setCropModalOpen(false)
              if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
              setCropImageSrc('')
            }}
            onConfirm={async croppedBlob => {
              setCropModalOpen(false)
              if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
              setCropImageSrc('')

              if (project) {
                setUploadingHero(true)
                try {
                  const file = new File([croppedBlob], 'hero.jpg', { type: 'image/jpeg' })
                  const res = await advisoryUploadProjectHero(project.id, file)
                  setForm({ ...form, hero_image_url: (res as any).hero_image_url })
                  toast.success('Hero image uploaded')
                } catch (err: any) {
                  toast.error(String(err?.message || 'Upload failed'))
                } finally {
                  setUploadingHero(false)
                }
              }
            }}
          />
        </>
      )}
    </AnimatePresence>
  )
}





