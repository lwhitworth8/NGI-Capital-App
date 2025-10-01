'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar,
  MapPin,
  FileText,
  Users,
  DollarSign,
  ChevronRight,
  Plus,
  Download,
  ExternalLink,
  Shield,
  Briefcase,
  Hash
} from 'lucide-react';

const API_URL = '/api';

interface Entity {
  id: number;
  legal_name: string;
  entity_type: string;
  ein?: string;
  formation_date?: string;
  state?: string;
  parent_entity_id?: number;
  is_active: boolean;
  address?: string;
  registered_agent?: string;
  business_purpose?: string;
  ownership_structure?: any;
  documents?: any[];
}

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree');

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      const response = await fetch(`${API_URL}/entities`);
      
      if (response.ok) {
        const data = await response.json();
        setEntities(data.entities || []);
      }
    } catch (error) {
      console.error('Failed to fetch entities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEntityTypeIcon = (type: string) => {
    switch(type?.toLowerCase()) {
      case 'c-corp':
      case 'corporation':
        return <Building2 className="h-5 w-5" />;
      case 'llc':
        return <Shield className="h-5 w-5" />;
      default:
        return <Briefcase className="h-5 w-5" />;
    }
  };

  const getEntityTypeColor = (type: string) => {
    switch(type?.toLowerCase()) {
      case 'c-corp':
      case 'corporation':
        return 'bg-blue-500';
      case 'llc':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Mock organization structure for visualization
  const organizationStructure = {
    root: {
      id: 1,
      name: 'NGI Capital',
      type: 'C-Corp',
      state: 'Delaware',
      children: [
        {
          id: 2,
          name: 'NGI Capital Advisory LLC',
          type: 'LLC',
          state: 'Delaware',
          ownership: '100%'
        },
        {
          id: 3,
          name: 'The Creator Terminal',
          type: 'C-Corp', 
          state: 'Delaware',
          ownership: '100%'
        }
      ]
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground font-medium">Loading entities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 animate-fadeIn">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Entity Management</h1>
            <p className="text-muted-foreground">
              Manage your business entities and organizational structure
            </p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Entity
          </button>
        </div>

        {/* View Toggle */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setViewMode('tree')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              viewMode === 'tree' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Organization Chart
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              viewMode === 'grid' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Grid View
          </button>
        </div>
      </div>

      {viewMode === 'tree' ? (
        /* Organization Chart View */
        <div className="card-modern p-8">
          <h2 className="text-lg font-semibold mb-6">Organization Structure</h2>
          
          {entities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No entities found. Add your first entity to begin building your organization structure.
              </p>
              <button className="btn-primary mt-4 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add First Entity
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="text-center">
                {/* Parent Entity */}
                <div className="inline-block">
                  <div 
                    className="card-modern p-6 cursor-pointer hover:scale-[1.02] transition-all min-w-[280px]"
                    onClick={() => setSelectedEntity(organizationStructure.root as any)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${getEntityTypeColor('c-corp')} bg-opacity-10`}>
                        {getEntityTypeIcon('c-corp')}
                      </div>
                      <div className="text-left flex-1">
                        <h3 className="font-semibold text-foreground">{organizationStructure.root.name}</h3>
                        <p className="text-xs text-muted-foreground">{organizationStructure.root.type} - {organizationStructure.root.state}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Parent Company</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>

                {/* Connection Lines */}
                {organizationStructure.root.children.length > 0 && (
                  <div className="relative my-8">
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-border"></div>
                    <div className="absolute left-1/2 transform -translate-x-1/2 top-8 w-full h-0.5 bg-border"></div>
                  </div>
                )}

                {/* Child Entities */}
                <div className="flex gap-6 justify-center">
                  {organizationStructure.root.children.map((child, index) => (
                    <div key={child.id} className="relative">
                      {/* Vertical line from horizontal bar to entity */}
                      <div className="absolute left-1/2 transform -translate-x-1/2 -top-8 w-0.5 h-8 bg-border"></div>
                      
                      <div 
                        className="card-modern p-6 cursor-pointer hover:scale-[1.02] transition-all min-w-[240px]"
                        onClick={() => setSelectedEntity(child as any)}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`p-2 rounded-lg ${getEntityTypeColor(child.type)} bg-opacity-10`}>
                            {getEntityTypeIcon(child.type)}
                          </div>
                          <div className="text-left flex-1">
                            <h3 className="font-semibold text-foreground text-sm">{child.name}</h3>
                            <p className="text-xs text-muted-foreground">{child.type} - {child.state}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Ownership</span>
                          <span className="font-medium text-foreground">{child.ownership}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {entities.length === 0 ? (
            <div className="col-span-full">
              <div className="card-modern p-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No entities found.</p>
                <button className="btn-primary mt-4 mx-auto flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add First Entity
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Placeholder entity cards */}
              {['NGI Capital', 'NGI Capital Advisory LLC', 'The Creator Terminal'].map((name, index) => (
                <div key={index} className="card-modern p-6 hover:scale-[1.02] transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${getEntityTypeColor(index === 1 ? 'llc' : 'c-corp')} bg-opacity-10`}>
                      {getEntityTypeIcon(index === 1 ? 'llc' : 'c-corp')}
                    </div>
                    <span className="text-xs font-medium text-success">Active</span>
                  </div>
                  
                  <h3 className="font-semibold text-lg text-foreground mb-1">{name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {index === 1 ? 'LLC' : 'C-Corporation'} - Delaware
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hash className="h-4 w-4" />
                      <span>EIN: **-*******</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Formed: --/--/----</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>Delaware, USA</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <button className="text-sm text-primary hover:text-primary/80 font-medium">
                      View Details
                    </button>
                    <button className="text-sm text-muted-foreground hover:text-foreground">
                      Documents
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Entity Details Modal/Sidebar */}
      {selectedEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card-modern max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{selectedEntity.legal_name}</h2>
                <p className="text-muted-foreground">{selectedEntity.entity_type} - {selectedEntity.state}</p>
              </div>
              <button 
                onClick={() => setSelectedEntity(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                x
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Registration Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entity Type:</span>
                    <span className="font-medium">{selectedEntity.entity_type || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Formation State:</span>
                    <span className="font-medium">{selectedEntity.state || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">EIN:</span>
                    <span className="font-medium">{selectedEntity.ein || 'Pending'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Formation Date:</span>
                    <span className="font-medium">{selectedEntity.formation_date || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Registered Agent</h3>
                <div className="text-sm text-muted-foreground">
                  <p>Information will be populated from uploaded documents</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="font-semibold text-foreground mb-4">Documents</h3>
              <div className="text-sm text-muted-foreground">
                <p>No documents uploaded yet. Upload formation documents to populate entity information.</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button className="btn-primary flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Upload Documents
              </button>
              <button className="btn-secondary flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
