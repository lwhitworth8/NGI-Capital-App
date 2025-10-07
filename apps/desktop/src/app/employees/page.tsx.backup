"use client"

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context/AppContext'
import {
  hrGetTeams, hrCreateTeam, hrGetProjects, hrCreateProject,
  hrGetEmployees, hrCreateEmployee, hrDeleteEmployee,
  hrGetEmployeeKpis, hrGetEmployeeTodos, hrCreateEmployeeTodo, hrPatchEmployeeTodo,
  Team, Project, Employee
} from '@/lib/api'
import EntitySelectorInline from '@/components/finance/EntitySelectorInline'
import { EmployeeSchema } from '@/lib/schemas'

export default function EmployeesPage() {
  const { state } = useApp()
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
  const entityName = state.currentEntity?.legal_name || ''
  const isAdvisory = /advisory/i.test(entityName)

  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [kpis, setKpis] = useState<any | null>(null)
  const [todos, setTodos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // Filters/search/sort
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState<number | ''>('')

  // Forms
  const [form, setForm] = useState<{ [k: string]: any }>(
    { name: '', email: '', title: '', role: '', classification: '', employment_type: '', start_date: '', team_id: '', project_ids: [] as number[] }
  )
  const [teamForm, setTeamForm] = useState({ name: '', description: '' })
  const [projectForm, setProjectForm] = useState({ name: '', description: '' })
  const [quickTodo, setQuickTodo] = useState('')
  const [todoFilter, setTodoFilter] = useState<'open' | 'all'>('open')

  useEffect(() => {
    const loadAll = async () => {
      if (!entityId) { setLoading(false); return }
      setLoading(true); setError('')
      try {
        const [t, p, e, k, td] = await Promise.all([
          hrGetTeams(entityId),
          hrGetProjects(entityId),
          hrGetEmployees(entityId),
          hrGetEmployeeKpis(entityId),
          hrGetEmployeeTodos(entityId)
        ])
        setTeams(t); setProjects(p); setEmployees(e as any[]);
        setKpis(k); setTodos(td)
      } catch (e: any) {
        setError(e?.message || 'Failed to load HR data')
      } finally { setLoading(false) }
    }
    loadAll()
  }, [entityId])

  const refreshEmployees = async () => {
    if (!entityId) return
    setEmployees(await hrGetEmployees(entityId))
    setKpis(await hrGetEmployeeKpis(entityId))
  }

  const refreshTodos = async () => {
    if (!entityId) return
    setTodos(await hrGetEmployeeTodos(entityId))
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
    if (!entityId) return
    const payload: any = {
      entity_id: entityId, name: form.name, email: form.email,
      title: form.title || undefined, role: form.role || undefined,
      classification: form.classification || undefined,
      employment_type: form.employment_type || undefined,
      start_date: form.start_date || undefined,
      team_id: form.team_id ? Number(form.team_id) : undefined,
      project_ids: isAdvisory ? (form.project_ids || []) : undefined,
    }
    try { EmployeeSchema.parse({ name: payload.name, email: payload.email }) } catch { return }
    await hrCreateEmployee(payload)
    setForm({ name: '', email: '', title: '', role: '', classification: '', employment_type: '', start_date: '', team_id: '', project_ids: [] })
    await refreshEmployees()
  }

  const onDelete = async (id: number) => { await hrDeleteEmployee(id); await refreshEmployees() }

  const filtered = employees.filter(e => {
    if (search && !(`${e.name} ${e.email} ${e.title}`.toLowerCase().includes(search.toLowerCase()))) return false
    if (statusFilter && (e.status || 'active').toLowerCase() !== statusFilter.toLowerCase()) return false
    if (typeFilter && (e.employment_type || '').toLowerCase() !== typeFilter.toLowerCase()) return false
    if (teamFilter && Number(e.team_id) !== Number(teamFilter)) return false
    return true
  })

  const onQuickAddTodo = async () => {
    if (!entityId || !quickTodo.trim()) return
    await hrCreateEmployeeTodo({ entity_id: entityId, title: quickTodo.trim() })
    setQuickTodo('')
    await refreshTodos()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Employee Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{state.currentEntity?.legal_name || ''}</p>
        </div>
        <EntitySelectorInline />
      </div>

      {/* Row A: KPIs + To-Dos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Headcount" value={kpis?.active ?? filtered.length} />
            <KpiCard label="New Hires (30d)" value={kpis?.newHires30d ?? 0} />
            <KpiCard label="Attrition (12m)" value={kpis?.attrition12m ?? 0} />
            <KpiCard label={isAdvisory ? 'Students' : 'Contractors'} value={isAdvisory ? (kpis?.interns_or_students ?? 0) : (kpis?.contractors ?? 0)} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">{isAdvisory ? 'Student To-Dos' : 'Employee To-Dos'}</h2>
            <select value={todoFilter} onChange={e=>setTodoFilter(e.target.value as any)} className="text-sm border rounded px-2 py-1 bg-background">
              <option value="open">Open</option>
              <option value="all">All</option>
            </select>
          </div>
          <div className="space-y-2 max-h-64 overflow-auto pr-1">
            {todos.filter(t=> todoFilter==='all' ? true : (t.status||'Open')!=='Done').map(t => (
              <div key={t.id} className="flex items-center justify-between text-sm border-b border-border py-1">
                <span>{t.title}</span>
                <select className="border rounded px-1 py-0.5 bg-background" value={t.status} onChange={async e=>{ await hrPatchEmployeeTodo(t.id, { status: e.target.value }); await refreshTodos() }}>
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Done</option>
                </select>
              </div>
            ))}
            {todos.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
          </div>
          <div className="mt-3 flex gap-2">
            <input className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Quick add a task..." value={quickTodo} onChange={e=>setQuickTodo(e.target.value)} />
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md" onClick={onQuickAddTodo}>Add</button>
          </div>
        </div>
      </div>

      {/* Row B: Employees and Teams/Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Employees viewer & adder */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">{isAdvisory ? 'Students' : 'Employees'}</h2>
            <div className="flex gap-2">
              <input placeholder="Search name, email, title" className="px-3 py-2 border rounded bg-background" value={search} onChange={e=>setSearch(e.target.value)} />
              <select className="px-2 py-2 border rounded bg-background" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                <option value="">Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select className="px-2 py-2 border rounded bg-background" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
                <option value="">Type</option>
                <option value="ft">FT</option>
                <option value="pt">PT</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
                <option value="student">Student</option>
              </select>
              <select className="px-2 py-2 border rounded bg-background" value={teamFilter} onChange={e=>setTeamFilter(e.target.value? Number(e.target.value) : '')}>
                <option value="">Team</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Start</th>
                    <th className="py-2 pr-4">Team</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(emp => (
                    <tr key={emp.id} className="border-t border-border">
                      <td className="py-2 pr-4">{emp.name}</td>
                      <td className="py-2 pr-4">{emp.email}</td>
                      <td className="py-2 pr-4 tabular-nums">{emp.employment_type || '-'}</td>
                      <td className="py-2 pr-4">{emp.status || 'active'}</td>
                      <td className="py-2 pr-4 tabular-nums">{emp.start_date || '-'}</td>
                      <td className="py-2 pr-4">{emp.team_name || '-'}</td>
                      <td className="py-2 pr-4">
                        <button className="text-red-600 hover:underline" onClick={() => onDelete(emp.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder={(isAdvisory ? 'Student' : 'Employee') + ' name'} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <select className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })}>
              <option value="">Type</option>
              <option value="FT">FT</option>
              <option value="PT">PT</option>
              <option value="Contract">Contract</option>
              <option value="Intern">Intern</option>
              <option value="Student">Student</option>
            </select>
            <input type="date" className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
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
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md" onClick={onAddEmployee}>Add</button>
          </div>
        </div>

        {/* Teams/Projects builder */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div>
            <h2 className="font-semibold mb-3">{isAdvisory ? 'Projects' : 'Teams'}</h2>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {(isAdvisory ? projects : teams).map(t => (
                <div key={t.id} className="flex items-center justify-between text-sm border-b border-border py-1">
                  <span>{t.name}</span>
                  <span className="text-xs text-muted-foreground">{(t as any).is_active ? 'Active' : ''}</span>
                </div>
              ))}
              {(isAdvisory ? projects : teams).length === 0 && <p className="text-sm text-muted-foreground">No items.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold mb-3">Create {isAdvisory ? 'Project' : 'Team'}</h3>
            <div className="space-y-2">
              <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder={(isAdvisory ? 'Project' : 'Team') + ' name'} value={isAdvisory ? projectForm.name : teamForm.name} onChange={e => isAdvisory ? setProjectForm({ ...projectForm, name: e.target.value }) : setTeamForm({ ...teamForm, name: e.target.value })} />
              <input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground" placeholder="Description" value={isAdvisory ? projectForm.description : teamForm.description} onChange={e => isAdvisory ? setProjectForm({ ...projectForm, description: e.target.value }) : setTeamForm({ ...teamForm, description: e.target.value })} />
              <button className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-foreground px-4 py-2 rounded-md" onClick={isAdvisory ? onCreateProject : onCreateTeam}>Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{Number(value || 0).toLocaleString()}</div>
    </div>
  )
}

