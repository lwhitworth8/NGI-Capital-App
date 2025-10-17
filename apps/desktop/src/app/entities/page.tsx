"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { 
  Building2, 
  Users,
  ArrowRightLeft,
  ArrowRight,
  Loader2,
  Shield,
  Lock,
  UserCircle,
  Briefcase
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { DynamicOrgChart } from "@/components/entities/DynamicOrgChart"
import { ModuleHeader } from "@ngi/ui/components/layout"

interface Entity {
  id: number
  entity_name: string
  entity_type: string
  ein?: string
  entity_status: string
  is_available: boolean
  parent_entity_id?: number | null
  ownership_percentage?: number | null
}

interface Employee {
  id: number
  name: string
  email: string
  ownership_percentage: number
  role?: string
  title?: string
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

interface TeamMember {
  id: number
  name: string
  email: string
  title: string
  role?: string
  classification?: string
  allocation_percent?: number
}

interface OrgChartData {
  entity: Entity
  structure_type: 'corporate' | 'advisory' | 'teams'
  board: Employee[]
  executives: Employee[]
  projects: Project[]
  teams: Team[]
}

export default function EntitiesPage() {
  const router = useRouter()
  const [entities, setEntities] = useState<Entity[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [orgChartData, setOrgChartData] = useState<OrgChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingOrgChart, setLoadingOrgChart] = useState(false)
  const [showOrgChart, setShowOrgChart] = useState(false)
  const [showConversionModal, setShowConversionModal] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [expandedProject, setExpandedProject] = useState<number | null>(null)

  // Fetch entities
  const fetchEntities = async () => {
    try {
      const response = await fetch("/api/accounting/entities", { credentials: "include" })
      if (response.ok) {
        const data = await response.json()
        setEntities(data)
      }
    } catch (error) {
      console.error("Failed to fetch entities:", error)
    }
  }

  // Fetch employees from the employees API
  const fetchEmployees = async (entityId?: number) => {
    try {
      console.log("Fetching employees from /api/employees...")
      const url = entityId ? `/api/employees?entity_id=${entityId}` : "/api/employees?entity_id=1"
      const response = await fetch(url, { credentials: "include" })
      console.log("Employees response status:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("Employees data received:", data)
        
        // API returns array directly
        const employeesList = Array.isArray(data) ? data : (data.employees || [])
        console.log("Setting employees:", employeesList)
        setEmployees(employeesList)
      } else {
        console.error("Employees API returned error:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error)
    }
  }

  // Get entity display name (remove duplicate LLC/Corp)
  const getEntityDisplayName = (entity: Entity) => {
    let name = entity.entity_name
    const type = entity.entity_type.toUpperCase()
    
    if (type.includes("LLC") && name.toUpperCase().includes("LLC")) {
      name = name.replace(/\s*LLC\s*$/i, "").replace(/\s*L\.L\.C\.\s*$/i, "").trim()
    }
    if (type.includes("CORP") && (name.toUpperCase().includes("INC") || name.toUpperCase().includes("CORP"))) {
      name = name.replace(/\s*Inc\.?\s*$/i, "").replace(/\s*Corp\.?\s*$/i, "").trim()
    }
    
    return name
  }

  // Get entity icon
  const getEntityIcon = (type: string, isAvailable: boolean) => {
    if (!isAvailable) return <Lock className="h-5 w-5 text-orange-500" />
    return type.toLowerCase().includes("corp") ? 
      <Building2 className="h-5 w-5 text-blue-500" /> : 
      <Shield className="h-5 w-5 text-green-500" />
  }

  // Extract role from employee name
  const getEmployeeRole = (name: string) => {
    const match = name.match(/\((.*?)\)/)
    return match ? match[1] : "Team Member"
  }

  const getEmployeeName = (name: string) => {
    return name.split("(")[0].trim()
  }

  const handleEntityClick = async (entity: Entity) => {
    // Allow viewing org chart even for pending conversion entities
    setSelectedEntity(entity)
    setLoadingOrgChart(true)
    setShowOrgChart(true)
    
    // Clear any existing org chart data to ensure fresh loading
    setOrgChartData(null)
    
    try {
      const response = await fetch(`/api/accounting/entities/${entity.id}/org-chart`, { 
        credentials: "include" 
      })
      
      if (response.ok) {
        const data = await response.json()
        // Ensure the data structure matches what DynamicOrgChart expects
        setOrgChartData({
          entity: data.entity,
          structure_type: data.structure_type,
          board: data.board || [],
          executives: data.executives || [],
          projects: data.projects || [],
          teams: data.teams || []
        })
      } else {
        console.error("Failed to fetch org chart:", response.status, response.statusText)
        
        // Set empty org chart data if API fails
        setOrgChartData({
          entity,
          structure_type: 'corporate',
          board: [],
          executives: [],
          projects: [],
          teams: []
        })
      }
    } catch (error) {
      console.error("Error fetching org chart:", error)
      
      // Set empty org chart data if there's an error
      setOrgChartData({
        entity,
        structure_type: 'corporate',
        board: [],
        executives: [],
        projects: [],
        teams: []
      })
    } finally {
      setLoadingOrgChart(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await fetchEntities()
        // Always fetch employees for entity ID 1 (NGI Capital LLC)
        await fetchEmployees(1)
      } catch (error) {
        console.error("Failed to load data:", error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  // Show entities overview by default - no auto-loading

  const parentEntity = entities.find(e => e.is_available && e.parent_entity_id === null)
  const subsidiaries = entities.filter(e => e.parent_entity_id !== null)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading organization structure...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Fixed header - consistent with Finance module */}
      <ModuleHeader 
        title="Organization Structure"
      />
      
      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 space-y-6">

        {/* Organization Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {showOrgChart && selectedEntity ? 
                  getEntityDisplayName(selectedEntity) : 
                  'Organization Structure'
                }
              </CardTitle>
              {showOrgChart && (
                <button
                  onClick={() => {
                    setShowOrgChart(false)
                    setSelectedEntity(null)
                    setOrgChartData(null)
                    setExpandedTeam(null)
                    setExpandedProject(null)
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Organization Structure
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {showOrgChart ? (
              // Show org chart in same position
              loadingOrgChart ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Loading organization chart...</p>
                  </div>
                </div>
              ) : (
                <DynamicOrgChart 
                  data={orgChartData}
                  loading={loadingOrgChart}
                  expandedTeam={expandedTeam}
                  setExpandedTeam={setExpandedTeam}
                  expandedProject={expandedProject}
                  setExpandedProject={setExpandedProject}
                />
              )
            ) : entities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No entities found</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Add your first entity to begin building your organization structure.
                </p>
              </div>
            ) : (
              <div className="py-8">
                {/* COMPLETELY REDESIGNED TREE STRUCTURE */}
                <div className="flex flex-col items-center">
                  {/* Parent Entity */}
                  {parentEntity && (
                    <div
                      onClick={() => handleEntityClick(parentEntity)}
                      className="group relative bg-gradient-to-br from-primary/10 to-primary/5 
                        border-2 border-primary rounded-xl p-6 
                        transition-all duration-300 cursor-pointer
                        hover:shadow-lg hover:scale-105 hover:border-primary/80
                        min-w-[320px]"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          {getEntityIcon(parentEntity.entity_type, parentEntity.is_available)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg">{getEntityDisplayName(parentEntity)}</h3>
                            <Badge variant="default" className="bg-blue-500">Active</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{parentEntity.entity_type}</p>
                        </div>
                      </div>
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded whitespace-nowrap">
                          Click to view org chart
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tree Connectors */}
                  {subsidiaries.length > 0 && (
                    <>
                      {/* Vertical line from parent */}
                      <div className="w-0.5 h-16 bg-border"></div>
                      
                      {/* Horizontal and vertical lines + Subsidiaries at bottom */}
                      <div className="relative flex justify-center">
                        {/* Horizontal line exactly 360px */}
                        <div className="absolute h-0.5 bg-border" style={{ width: '360px', top: '0' }}></div>
                        {/* Two vertical lines positioned at exact ends */}
                        <div className="absolute w-0.5 h-16 bg-border" style={{ left: 'calc(50% - 180px)', top: '0' }}></div>
                        <div className="absolute w-0.5 h-16 bg-border" style={{ left: 'calc(50% + 180px)', top: '0' }}></div>
                      </div>
                      
                      {/* Subsidiaries - right at bottom of lines */}
                      <div className="flex justify-center gap-12" style={{ width: '600px', margin: '64px auto 0' }}>
                          {subsidiaries.map((entity) => (
                            <div
                              key={entity.id}
                              className={`group relative bg-card border-2 rounded-xl p-5
                                transition-all duration-300 cursor-pointer hover:shadow-md hover:scale-105
                                ${entity.is_available ? "border-primary/30" : "border-dashed border-orange-500/50"}
                                min-w-[280px] flex-1`}
                              onClick={() => handleEntityClick(entity)}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2.5 rounded-lg ${entity.is_available ? "bg-primary/10" : "bg-muted"}`}>
                                  {getEntityIcon(entity.entity_type, entity.is_available)}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-base mb-1">{getEntityDisplayName(entity)}</h4>
                                  <p className="text-xs text-muted-foreground mb-2">{entity.entity_type}</p>
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className="text-muted-foreground">{entity.ownership_percentage}% owned</span>
                                    {entity.is_available ? (
                                      <Badge variant="default" className="text-xs">Active</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                                        Pending Conversion
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {!entity.is_available && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded whitespace-nowrap">
                                    Requires Conversion
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        </div>
      </div>


      {/* Conversion Workflow Modal */}
      <Dialog open={showConversionModal} onOpenChange={setShowConversionModal}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Entity Conversion Management
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-card rounded-lg">
                    <div className="p-1.5 bg-primary/10 rounded">
                      <span className="text-primary font-bold text-sm">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Read & Extract Document Data</h4>
                      <p className="text-xs text-muted-foreground">
                        Extract key details from Certificate of Incorporation: authorized shares, par value, stock classes, formation date
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-card rounded-lg">
                    <div className="p-1.5 bg-primary/10 rounded">
                      <span className="text-primary font-bold text-sm">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Calculate Capital Accounts from Accounting System</h4>
                      <p className="text-xs text-muted-foreground">
                        Automatically pull member capital account balances and ownership % from your accounting documents and journal entries (NOT hardcoded)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-card rounded-lg">
                    <div className="p-1.5 bg-primary/10 rounded">
                      <span className="text-primary font-bold text-sm">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Generate GAAP Conversion Entries</h4>
                      <p className="text-xs text-muted-foreground">
                        Create ASC 505-compliant journal entries: DR Members' Capital → CR Common Stock (par) + APIC
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-card rounded-lg">
                    <div className="p-1.5 bg-primary/10 rounded">
                      <span className="text-primary font-bold text-sm">4</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Archive NGI Capital LLC</h4>
                      <p className="text-xs text-muted-foreground">
                        Mark entity as "converted", archive all LLC accounting data, maintain complete audit trail
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-card rounded-lg">
                    <div className="p-1.5 bg-primary/10 rounded">
                      <span className="text-primary font-bold text-sm">5</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Activate NGI Capital Inc. + Subsidiaries</h4>
                      <p className="text-xs text-muted-foreground">
                        Create new C-Corp entity, transfer all data, activate Advisory LLC and Creator Terminal Inc., update entire app to NGI Capital Inc.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-card rounded-lg">
                    <div className="p-1.5 bg-primary/10 rounded">
                      <span className="text-primary font-bold text-sm">6</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Generate Stockholder Documents</h4>
                      <p className="text-xs text-muted-foreground">
                        Create stock certificates, update cap table, generate audit package
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setShowConversionModal(false)}>
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
