'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context/AppContext'
import {
  hrGetTeams, hrCreateTeam, hrGetProjects, hrCreateProject,
  hrGetEmployees, hrCreateEmployee, hrDeleteEmployee,
  Team, Project, Employee
} from '@/lib/api'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed', '#0ea5e9']

export default function EmployeesPage() {
  const { state, setCurrentEntity } = useApp()
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
  const entityName = state.currentEntity?.legal_name || ''
  const isAdvisory = /advisory/i.test(entityName)
  const isCreator = /creator terminal/i.test(entityName)
  const isCapital = /ngi capital(?!.*advisory)/i.test(entityName)

  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const [form, setForm] = useState<{ [k: string]: any }>(
    { name: '', email: '', title: '', role: '', classification: '', employment_type: '', start_date: '', team_id: '', project_ids: [] as number[] }
  )
  const [teamForm, setTeamForm] = useState({ name: '', description: '' })
  const [projectForm, setProjectForm] = useState({ name: '', description: '' })

  useEffect(() => {
    const loadAll = async () => {
      if (!entityId) { setLoading(false); return }
      setLoading(true); setError('')
      try {
        const [t, p, e] = await Promise.all([
          hrGetTeams(entityId),
          hrGetProjects(entityId),
          hrGetEmployees(entityId)
        ])
        setTeams(t); setProjects(p); setEmployees(e)
      } catch (e: any) {
        setError(e?.message || 'Failed to load HR data')
      } finally { setLoading(false) }
    }
    loadAll()
  }, [entityId])

  const refreshEmployees = async () => {
    if (!entityId) return
    setEmployees(await hrGetEmployees(entityId))
  }

  const onCreateTeam = async () => {
    if (!entityId || !teamForm.name.trim()) return
    await hrCreateTeam({ entity_id: entityId, name: teamForm.name.trim(), description: teamForm.description || undefined })
    setTeamForm({ name: '', description: '' }); setTeams(await hrGetTeams(entityId))
  }

  const onCreateProject = async () => {
    if (!entityId || !projectForm.name.trim()) return
    await hrCreateProject({ entity_id: entityId, name: projectForm.name.trim(), description: projectForm.description || undefined })
    setProjectForm({ name: '', description: '' }); setProjects(await hrGetProjects(entityId))
  }

  const onAddEmployee = async () => {
    if (!entityId || !form.name || !form.email) return
    const payload: any = {
      entity_id: entityId, name: form.name, email: form.email,
      title: form.title || undefined, role: form.title || undefined,
      classification: form.classification || undefined,
      employment_type: form.employment_type || undefined,
      start_date: form.start_date || undefined,
      team_id: form.team_id ? Number(form.team_id) : undefined,
      project_ids: isAdvisory ? (form.project_ids || []) : undefined,
    }
    await hrCreateEmployee(payload)
    setForm({ name: '', email: '', title: '', role: '', classification: '', employment_type: '', start_date: '', team_id: '', project_ids: [] })
    await refreshEmployees()
  }

  const onDelete = async (id: number) => { await hrDeleteEmployee(id); await refreshEmployees() }

  // Metrics derived from DB data only
  const headcount = employees.length
  const active = employees.filter(e => (e.status || 'active') === 'active').length
  const teamCount = new Set(employees.map(e => e.team_name || 'Unassigned')).size
  const studentCount = employees.filter(e => (e.classification || '').toLowerCase() === 'student').length

  const byTeam = Object.values(
    employees.reduce((acc: any, e) => { const k = e.team_name || 'Unassigned'; acc[k] = acc[k] || { name: k, value: 0 }; acc[k].value += 1; return acc }, {})
  )
  const byClass = Object.values(
    employees.reduce((acc: any, e) => { const k = (e.classification || 'unspecified'); acc[k] = acc[k] || { name: k, value: 0 }; acc[k].value += 1; return acc }, {})
  )

  return (
    <div className="p-6 space-y-8">
      {/* Header + Entity selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Employees</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage teams, projects and people per entity.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Entity</label>
          <select
            className="px-3 py-2 rounded-md border border-input bg-background text-foreground"
            value={state.currentEntity?.id || ''}
            onChange={(e) => {
              const next = state.entities.find(x => String(x.id) === e.target.value) || null
              setCurrentEntity(next as any)
            }}
          >
            <option value="" disabled>Select entity…</option>
            {state.entities.map((en) => (
              <option key={en.id} value={en.id}>{en.legal_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="ngi-card-elevated p-5">
          <div className="text-xs text-muted-foreground">Headcount</div>
          <div className="text-3xl font-bold mt-1">{headcount}</div>
        </div>
        <div className="ngi-card-elevated p-5">
          <div className="text-xs text-muted-foreground">Active</div>
          <div className="text-3xl font-bold mt-1">{active}</div>
        </div>
        <div className="ngi-card-elevated p-5">
          <div className="text-xs text-muted-foreground">Teams</div>
          <div className="text-3xl font-bold mt-1">{teamCount}</div>
        </div>
        <div className="ngi-card-elevated p-5">
          <div className="text-xs text-muted-foreground">Students (Advisory)</div>
          <div className="text-3xl font-bold mt-1">{studentCount}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-modern p-4 lg:col-span-2">
          <h2 className="font-semibold mb-4">Employees by Team</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byTeam as any}>
                <XAxis dataKey="name" stroke="currentColor" className="text-xs" />
                <YAxis stroke="currentColor" className="text-xs" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-modern p-4">
          <h2 className="font-semibold mb-4">By Classification</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byClass as any} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {(byClass as any).map((_: any, idx: number) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Creation panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold mb-3">Add Employee</h2>
          <div className="space-y-2">
            <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Title / Role" value={form.title} onChange={e => setForm({ ...form, title: e.target.value, role: e.target.value })} />
            <select className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" value={form.classification} onChange={e => setForm({ ...form, classification: e.target.value })}>
              <option value="">Classification</option>
              {isAdvisory && <option value="student">Student</option>}
              {isCapital && (<>
                <option value="board">Board</option>
                <option value="executive">Executive</option>
              </>)}
              <option value="employee">Employee</option>
              <option value="contractor">Contractor</option>
              <option value="intern">Intern</option>
            </select>
            <select className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })}>
              <option value="">Employment Type</option>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contractor">Contractor</option>
              <option value="intern">Intern</option>
            </select>
            <select className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" value={form.team_id} onChange={e => setForm({ ...form, team_id: e.target.value })}>
              <option value="">Team</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {isAdvisory && (
              <select multiple className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" value={form.project_ids} onChange={e => {
                const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value))
                setForm({ ...form, project_ids: opts })
              }}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md" onClick={onAddEmployee}>Save</button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold mb-3">Create Team</h2>
          <div className="space-y-2">
            <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Team name" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} />
            <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Description" value={teamForm.description} onChange={e => setTeamForm({ ...teamForm, description: e.target.value })} />
            <button className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-foreground px-4 py-2 rounded-md" onClick={onCreateTeam}>Add Team</button>
          </div>
        </div>

        {isAdvisory && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold mb-3">Create Project (Advisory)</h2>
            <div className="space-y-2">
              <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Project name" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} />
              <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Description" value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} />
              <button className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-foreground px-4 py-2 rounded-md" onClick={onCreateProject}>Add Project</button>
            </div>
          </div>
        )}
      </div>

      {/* Employees table */}
      <div className="card-modern p-4">
        <h2 className="font-semibold mb-4">Employees</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : employees.length === 0 ? (
          <p className="text-sm text-muted-foreground">No employees yet.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Classification</th>
                  <th className="py-2 pr-4">Team</th>
                  {isAdvisory && <th className="py-2 pr-4">Projects</th>}
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="border-t border-border">
                    <td className="py-2 pr-4">{emp.name}</td>
                    <td className="py-2 pr-4">{emp.email}</td>
                    <td className="py-2 pr-4">{emp.title || emp.role || '-'}</td>
                    <td className="py-2 pr-4">{emp.classification || '-'}</td>
                    <td className="py-2 pr-4">{emp.team_name || '-'}</td>
                    {isAdvisory && (
                      <td className="py-2 pr-4">{emp.projects && emp.projects.length ? emp.projects.map(p => p.name).join(', ') : '-'}</td>
                    )}
                    <td className="py-2 pr-4">
                      <button className="text-red-600 hover:underline" onClick={() => onDelete(emp.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
