'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield,
  Lock,
  CheckCircle,
  AlertCircle,
  FileText,
  Users,
  DollarSign,
  Building2,
  Calendar,
  ChevronRight,
  Info,
  FileCheck,
  UserCheck,
  CreditCard,
  TrendingUp,
  ClipboardCheck,
  AlertTriangle,
  ShieldCheck,
  Fingerprint,
  Key,
  Eye,
  GitBranch,
  Database,
  Upload,
  Download,
  RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { getCurrentFiscalQuarter } from '@/lib/utils/dateUtils';

interface Entity {
  id: string;
  name: string;
  type: string;
  ein?: string;
  formationDate?: string | null;
}

interface Control {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'implemented' | 'in_progress' | 'planned' | 'not_applicable';
  riskLevel: 'high' | 'medium' | 'low';
  lastReviewed?: string;
  reviewer?: string;
  documentation?: string;
  procedures?: string[];
  responsible?: string[];
  frequency?: string;
  evidence?: string[];
}

interface ControlCategory {
  id: string;
  name: string;
  icon: any;
  description: string;
  controls: Control[];
  color: string;
}

export default function InternalControlsPage() {
  const router = useRouter();
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [period, setPeriod] = useState<string>(getCurrentFiscalQuarter());
  const [controlCategories, setControlCategories] = useState<ControlCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [documentSource, setDocumentSource] = useState<string>('');

  // Get current user for approval workflows
  const currentUserEmail: string = 'lwhitworth@ngicapitaladvisory.com';

  useEffect(() => {
    // Load entities from API/documents
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      const response = await fetch('/api/entities');
      if (response.ok) {
        const data = await response.json();
        setEntities(data.entities || []);
        if (data.entities && data.entities.length > 0) {
          setSelectedEntity(data.entities[0].id);
        }
      }
    } catch (error) {
      console.log('No entities found yet - upload formation documents to begin');
      setEntities([]);
    }
  };

  useEffect(() => {
    // Load controls when entity changes
    if (selectedEntity) {
      loadInternalControls();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity]);

  const loadInternalControls = async () => {
    if (!selectedEntity) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/internal-controls?entity_id=${selectedEntity}`);
      if (response.ok) {
        const data = await response.json();
        // Controls would be extracted from uploaded Word documents
        if (data.controls && data.controls.length > 0) {
          organizeControlsByCategory(data.controls);
          setDocumentSource(data.sourceDocument || '');
        } else {
          // Set default empty categories
          setControlCategories(getEmptyCategories());
        }
      } else {
        setControlCategories(getEmptyCategories());
      }
    } catch (error) {
      console.log('No internal controls found yet - upload control documents');
      setControlCategories(getEmptyCategories());
    }
    setLoading(false);
  };

  const getEmptyCategories = (): ControlCategory[] => [
    {
      id: 'financial',
      name: 'Financial Controls',
      icon: DollarSign,
      description: 'Controls over financial reporting, cash management, and expenditures',
      controls: [],
      color: 'text-green-600'
    },
    {
      id: 'operational',
      name: 'Operational Controls',
      icon: TrendingUp,
      description: 'Controls over business operations and process efficiency',
      controls: [],
      color: 'text-blue-600'
    },
    {
      id: 'compliance',
      name: 'Compliance Controls',
      icon: ClipboardCheck,
      description: 'Controls ensuring adherence to laws, regulations, and policies',
      controls: [],
      color: 'text-purple-600'
    },
    {
      id: 'it',
      name: 'IT & Security Controls',
      icon: Shield,
      description: 'Controls over information technology and data security',
      controls: [],
      color: 'text-orange-600'
    },
    {
      id: 'authorization',
      name: 'Authorization & Approval',
      icon: UserCheck,
      description: 'Controls over authorization limits and approval workflows',
      controls: [],
      color: 'text-indigo-600'
    },
    {
      id: 'segregation',
      name: 'Segregation of Duties',
      icon: GitBranch,
      description: 'Controls ensuring proper separation of responsibilities',
      controls: [],
      color: 'text-red-600'
    }
  ];

  const organizeControlsByCategory = (controls: Control[]) => {
    const categories = getEmptyCategories();
    
    controls.forEach(control => {
      const category = categories.find(cat => cat.id === control.category);
      if (category) {
        category.controls.push(control);
      }
    });
    
    setControlCategories(categories);
  };

  const getStatusBadge = (status: Control['status']) => {
    switch (status) {
      case 'implemented':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs rounded-full">
            <CheckCircle className="h-3 w-3" />
            Implemented
          </span>
        );
      case 'in_progress':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs rounded-full">
            <RefreshCw className="h-3 w-3" />
            In Progress
          </span>
        );
      case 'planned':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs rounded-full">
            <Calendar className="h-3 w-3" />
            Planned
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-gray-500/10 text-gray-600 dark:text-gray-400 text-xs rounded-full">
            <AlertCircle className="h-3 w-3" />
            Not Applicable
          </span>
        );
    }
  };

  const getRiskBadge = (risk: Control['riskLevel']) => {
    switch (risk) {
      case 'high':
        return (
          <span className="px-2 py-1 bg-red-500/10 text-red-600 dark:text-red-400 text-xs rounded-full">
            High Risk
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs rounded-full">
            Medium Risk
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs rounded-full">
            Low Risk
          </span>
        );
    }
  };

  // Show empty state if no entities
  if (entities.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Internal Controls</h1>
        </div>

        <Card className="p-12">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-muted/30 rounded-full">
                <Shield className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold">No Internal Controls Available</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Internal controls will be extracted and displayed when you upload:
            </p>
            <div className="max-w-md mx-auto text-left space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Internal Controls Policy document (Word/PDF)
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Operating Agreement or Corporate Bylaws
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Financial Policies and Procedures manual
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Compliance and Risk Management documents
                </span>
              </div>
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <button 
                onClick={() => router.push('/accounting/documents')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Upload Control Documents
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const filteredCategories = selectedCategory === 'all' 
    ? controlCategories 
    : controlCategories.filter(cat => cat.id === selectedCategory);

  const totalControls = controlCategories.reduce((sum, cat) => sum + cat.controls.length, 0);
  const implementedControls = controlCategories.reduce((sum, cat) => 
    sum + cat.controls.filter(c => c.status === 'implemented').length, 0
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Internal Controls</h1>
          <p className="text-muted-foreground mt-1">
            Risk management and compliance framework
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Policy
          </button>
          <button className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Entity Selector & Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              >
                {entities.map(entity => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Period: {period.replace('-', ' ')}
              </span>
            </div>

            {documentSource && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Source: {documentSource}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span className="text-sm">
                {implementedControls}/{totalControls} Controls Active
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                Co-founder approval required
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Control Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Implemented</p>
              <p className="text-2xl font-bold">{implementedControls}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <RefreshCw className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold">
                {controlCategories.reduce((sum, cat) => 
                  sum + cat.controls.filter(c => c.status === 'in_progress').length, 0
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">High Risk Items</p>
              <p className="text-2xl font-bold">
                {controlCategories.reduce((sum, cat) => 
                  sum + cat.controls.filter(c => c.riskLevel === 'high').length, 0
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Compliance Score</p>
              <p className="text-2xl font-bold">
                {totalControls > 0 
                  ? Math.round((implementedControls / totalControls) * 100) 
                  : 0}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Category Filter */}
      <Card className="p-4">
        <div className="flex items-center gap-4 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              selectedCategory === 'all' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-card border border-border hover:bg-muted'
            }`}
          >
            All Categories
          </button>
          {getEmptyCategories().map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                  selectedCategory === cat.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card border border-border hover:bg-muted'
                }`}
              >
                <Icon className={`h-4 w-4 ${cat.color}`} />
                {cat.name}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Controls by Category */}
      <div className="space-y-6">
        {filteredCategories.map(category => {
          const Icon = category.icon;
          return (
            <Card key={category.id} className="overflow-hidden">
              <div className="p-4 bg-muted/30 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 bg-background rounded-lg`}>
                      <Icon className={`h-5 w-5 ${category.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {category.controls.length} controls
                  </span>
                </div>
              </div>

              {category.controls.length > 0 ? (
                <div className="divide-y divide-border">
                  {category.controls.map(control => (
                    <div key={control.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium">{control.title}</h4>
                            <p className="text-sm text-muted-foreground">{control.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(control.status)}
                            {getRiskBadge(control.riskLevel)}
                          </div>
                        </div>

                        {control.procedures && control.procedures.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Procedures:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {control.procedures.map((proc, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <ChevronRight className="h-3 w-3 mt-0.5" />
                                  <span>{proc}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {control.frequency && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {control.frequency}
                            </span>
                          )}
                          {control.responsible && control.responsible.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {control.responsible.join(', ')}
                            </span>
                          )}
                          {control.lastReviewed && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Last reviewed: {control.lastReviewed}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No controls defined for this category yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Controls will be extracted from your uploaded policy documents.
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Co-Founder Approval Section */}
      <Card className="p-4 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Dual Control Requirement
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              All changes to internal controls require approval from both co-founders. 
              Control modifications are logged and tracked for SOC 2 compliance.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 ${currentUserEmail === 'anurmamade@ngicapitaladvisory.com' ? 'bg-green-500' : 'bg-gray-400'} rounded-full`}></div>
                <span className="text-xs">Andre Nurmamade</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 ${currentUserEmail === 'lwhitworth@ngicapitaladvisory.com' ? 'bg-green-500' : 'bg-gray-400'} rounded-full`}></div>
                <span className="text-xs">Landon Whitworth</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Info Message */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Document-Driven Controls</p>
            <p className="text-sm text-muted-foreground">
              Internal controls are automatically extracted from your uploaded policy documents using AI. 
              The system identifies control objectives, procedures, responsible parties, and risk levels from 
              Word documents, PDFs, and operating agreements. Controls are categorized and monitored for compliance.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
