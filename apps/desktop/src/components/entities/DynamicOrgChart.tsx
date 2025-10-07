"use client"

import React from "react"
import { Shield, Users, UserCircle, Briefcase, FolderKanban, Loader2, ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"

interface Employee {
  id: number
  name: string
  email: string
  ownership_percentage?: number
  role?: string
  title?: string
}

interface TeamMember {
  id: number
  name: string
  email: string
  title: string
  role?: string
  classification?: string
  allocation_percent?: number
}

interface Project {
  id: number
  name: string
  code: string
  status: string
  lead_name?: string
  leads: TeamMember[]
  team_members: TeamMember[]
}

interface Team {
  id: number
  name: string
  description: string
  type: string
  lead_name?: string
  lead_email?: string
  members: TeamMember[]
}

interface Entity {
  id: number
  entity_name?: string
  legal_name?: string
  entity_type: string
}

interface OrgChartData {
  entity: Entity
  structure_type: 'corporate' | 'advisory' | 'teams'
  board: Employee[]
  executives: Employee[]
  projects: Project[]
  teams: Team[]
}

interface DynamicOrgChartProps {
  data: OrgChartData | null
  loading: boolean
  expandedTeam: string | null
  setExpandedTeam: (team: string | null) => void
  expandedProject: number | null
  setExpandedProject: (id: number | null) => void
}

export function DynamicOrgChart({ 
  data, 
  loading, 
  expandedTeam, 
  setExpandedTeam,
  expandedProject,
  setExpandedProject 
}: DynamicOrgChartProps) {
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading organizational structure...</p>
        </div>
      </div>
    )
  }
  
  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">No organizational data available</p>
      </div>
    )
  }
  
  // Corporate Structure (NGI Capital LLC parent)
  if (data.structure_type === 'corporate' && data.board.length > 0) {
    return (
      <div className="flex flex-col items-center py-8">
        {/* Collapsed View */}
        {expandedTeam === null && (
          <>
            {/* Board of Directors */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setExpandedTeam('board')}
              className="bg-gradient-to-br from-primary/10 to-primary/5 
              border-2 border-primary rounded-xl p-6 
              transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-105
              min-w-[320px]"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Board of Directors</h3>
                  <p className="text-sm text-muted-foreground">{data.board.length} Members - Click to expand</p>
                </div>
              </div>
            </motion.div>

            <div className="w-0.5 h-12 bg-border"></div>

            {/* Executive Team */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              onClick={() => setExpandedTeam('exec')}
              className="bg-gradient-to-br from-primary/10 to-primary/5 
              border-2 border-primary rounded-xl p-6 
              transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-105
              min-w-[320px]"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Executive Team</h3>
                  <p className="text-sm text-muted-foreground">{data.executives.length} Executives - Click to expand</p>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Expanded Board View */}
        {expandedTeam === 'board' && (
          <>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setExpandedTeam(null)}
              className="bg-gradient-to-br from-primary/10 to-primary/5 
              border-2 border-primary rounded-xl p-6 
              transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-105
              min-w-[320px]"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Board of Directors</h3>
                  <p className="text-sm text-muted-foreground">Click to collapse</p>
                </div>
              </div>
            </motion.div>

            <div className="w-0.5 h-16 bg-border"></div>
            
            {/* Horizontal connector */}
            <div className="relative flex justify-center">
              <div className="absolute h-0.5 bg-border" style={{ width: '400px', top: '0' }}></div>
              <div className="absolute w-0.5 h-16 bg-border" style={{ left: 'calc(50% - 200px)', top: '0' }}></div>
              <div className="absolute w-0.5 h-16 bg-border" style={{ left: 'calc(50% + 200px)', top: '0' }}></div>
            </div>
            
            {/* Board Members */}
            <div className="flex justify-center gap-12" style={{ width: '680px', margin: '64px auto 0' }}>
              <AnimatePresence>
                {data.board.map((member, idx) => (
                  <motion.div 
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.1 }}
                    className="group relative bg-card border-2 border-primary/30 rounded-xl p-5
                      transition-all duration-300 hover:shadow-md hover:scale-105
                      min-w-[320px]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-lg">
                        <UserCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-base mb-1">{member.name}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{member.role || member.title || "Board Member"}</p>
                        {member.ownership_percentage && (
                          <div className="flex items-center gap-3 text-xs mb-2">
                            <Badge variant="default" className="text-xs">{member.ownership_percentage}% Owner</Badge>
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground block">{member.email}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Expanded Executive View */}
        {expandedTeam === 'exec' && (
          <>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setExpandedTeam(null)}
              className="bg-gradient-to-br from-primary/10 to-primary/5 
              border-2 border-primary rounded-xl p-6 
              transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-105
              min-w-[320px]"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Executive Team</h3>
                  <p className="text-sm text-muted-foreground">Click to collapse</p>
                </div>
              </div>
            </motion.div>

            <div className="w-0.5 h-16 bg-border"></div>
            
            <div className="relative flex justify-center">
              <div className="absolute h-0.5 bg-border" style={{ width: '400px', top: '0' }}></div>
              <div className="absolute w-0.5 h-16 bg-border" style={{ left: 'calc(50% - 200px)', top: '0' }}></div>
              <div className="absolute w-0.5 h-16 bg-border" style={{ left: 'calc(50% + 200px)', top: '0' }}></div>
            </div>
            
            <div className="flex justify-center gap-12" style={{ width: '680px', margin: '64px auto 0' }}>
              <AnimatePresence>
                {data.executives.map((exec, idx) => (
                  <motion.div 
                    key={`exec-${exec.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.1 }}
                    className="group relative bg-card border-2 border-primary/30 rounded-xl p-5
                      transition-all duration-300 hover:shadow-md hover:scale-105
                      min-w-[320px]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-lg">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-base mb-1">{exec.name}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{exec.role || exec.title || "Executive"}</p>
                        <span className="text-xs text-muted-foreground block">{exec.email}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    )
  }

  // Advisory Structure (NGI Capital Advisory LLC) - Clean Tree Like Corporate Structure
  if (data.structure_type === 'advisory') {
    if (data.projects.length === 0) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12"
        >
          <FolderKanban className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Projects Found</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Advisory projects will appear here as teams once created in the NGI Advisory module.
          </p>
        </motion.div>
      )
    }

    return (
      <div className="flex flex-col items-center py-8 w-full">
        {/* Projects with clean tree structure - always expanded */}
        <AnimatePresence mode="wait">
          {data.projects.map((project, projIdx) => {
            const hasLeads = project.leads.length > 0
            const hasMembers = project.team_members.length > 0
            
            return (
              <motion.div 
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: projIdx * 0.1 }}
                className="w-full mb-12"
              >
                {/* Project Card - Top Level (matching corporate style) */}
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="bg-gradient-to-br from-primary/10 to-primary/5 
                      border-2 border-primary rounded-xl p-6
                      transition-all duration-300 hover:shadow-lg
                      min-w-[320px]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <FolderKanban className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">{project.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">{project.code}</span>
                          <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {project.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Tree Structure - Always Show (like corporate structure) */}
                  {(hasLeads || hasMembers) && (
                    <>
                      {/* Vertical connector */}
                      <div className="w-0.5 h-16 bg-border"></div>

                      {/* Project Leads - Matching Corporate Board Style */}
                      {hasLeads && (
                        <>
                          {project.leads.length > 1 && (
                            /* Multiple leads - horizontal tree branching */
                            <div className="relative flex justify-center" style={{ width: '100%', height: '64px' }}>
                              <div 
                                className="absolute h-0.5 bg-border" 
                                style={{ 
                                  width: `${(project.leads.length - 1) * 340}px`,
                                  top: 0,
                                  left: '50%',
                                  transform: 'translateX(-50%)'
                                }}
                              ></div>
                              {project.leads.map((_, idx) => {
                                const spacing = 340
                                const totalWidth = (project.leads.length - 1) * spacing
                                const offset = -totalWidth / 2 + (idx * spacing)
                                return (
                                  <div 
                                    key={idx}
                                    className="absolute w-0.5 h-16 bg-border" 
                                    style={{ left: `calc(50% + ${offset}px)`, top: 0 }}
                                  ></div>
                                )
                              })}
                            </div>
                          )}

                          {/* Lead Cards */}
                          <div className="flex justify-center gap-12 flex-wrap" style={{ marginTop: project.leads.length > 1 ? '48px' : '0' }}>
                            {project.leads.map((lead, leadIdx) => (
                              <motion.div
                                key={lead.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: leadIdx * 0.1 }}
                                className="bg-card border-2 border-primary/30 rounded-xl p-5
                                  transition-all duration-300 hover:shadow-md hover:scale-105
                                  min-w-[320px]"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="p-2.5 bg-primary/10 rounded-lg">
                                    <Briefcase className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-base mb-1">{lead.name}</h4>
                                    <p className="text-xs text-muted-foreground mb-2">{lead.title}</p>
                                    <span className="text-xs text-muted-foreground block">{lead.email}</span>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Team Members (Students) - Below Leads */}
                      {hasMembers && (
                        <>
                          {/* Vertical connector from leads to students */}
                          <div className="w-0.5 h-16 bg-border"></div>

                          {/* Students Section */}
                          <div className="w-full max-w-4xl px-4">
                            <div className="flex items-center justify-center gap-2 mb-6">
                              <Users className="h-5 w-5 text-primary" />
                              <h4 className="text-base font-semibold">Student Analysts</h4>
                              <Badge variant="secondary" className="text-xs">
                                {project.team_members.length}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {project.team_members.map((member, memIdx) => (
                                <motion.div
                                  key={member.id}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.2, delay: memIdx * 0.05 }}
                                  className="bg-card border border-border rounded-lg p-4
                                    transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:scale-105"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="p-2 bg-primary/5 rounded-lg">
                                      <UserCircle className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-medium text-sm mb-1 truncate">{member.name}</h5>
                                      <p className="text-xs text-muted-foreground truncate mb-2">{member.email}</p>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {member.role && (
                                          <Badge variant="outline" className="text-xs">{member.role}</Badge>
                                        )}
                                        {member.classification && (
                                          <Badge variant="secondary" className="text-xs">{member.classification}</Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    )
  }

  // Teams Structure (The Creator Terminal)
  if (data.structure_type === 'teams') {
    if (data.teams.length === 0) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12"
        >
          <Users className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Teams Found</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Create teams in the Employee module to build your organizational structure.
          </p>
        </motion.div>
      )
    }

    return (
      <div className="flex flex-col items-center py-8">
        <div className="w-full max-w-5xl space-y-4">
          <AnimatePresence>
            {data.teams.map((team, idx) => (
              <motion.div 
                key={team.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
                className="border border-primary/20 rounded-lg p-5 bg-card hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-base mb-1">{team.name}</h4>
                    {team.description && (
                      <p className="text-xs text-muted-foreground">{team.description}</p>
                    )}
                    {team.lead_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Lead: {team.lead_name} ({team.lead_email})
                      </p>
                    )}
                  </div>
                </div>

                {/* Team Members */}
                {team.members.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                    {team.members.map((member) => (
                      <div key={member.id} className="bg-muted/30 border border-border rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <UserCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <h6 className="font-medium text-xs mb-0.5">{member.name}</h6>
                            <p className="text-xs text-muted-foreground truncate">{member.title}</p>
                            {member.allocation_percent && member.allocation_percent < 100 && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {member.allocation_percent}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm text-muted-foreground">No organizational structure available</p>
    </div>
  )
}