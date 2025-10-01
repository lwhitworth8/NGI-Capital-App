'use client';

import React, { useState, createContext, useContext } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Building2, FileBarChart, Calendar, Download, Filter } from 'lucide-react';

// Entity selection context for financial reporting
interface Entity {
  id: string;
  name: string;
  type: string;
  ein?: string;
}

interface FinancialReportingContextType {
  selectedEntity: string;
  setSelectedEntity: (entity: string) => void;
  reportingPeriod: string;
  setReportingPeriod: (period: string) => void;
  fiscalYear: number;
  setFiscalYear: (year: number) => void;
  entities: Entity[];
}

const FinancialReportingContext = createContext<FinancialReportingContextType | undefined>(undefined);

export function useFinancialReporting() {
  const context = useContext(FinancialReportingContext);
  if (!context) {
    throw new Error('useFinancialReporting must be used within FinancialReportingProvider');
  }
  return context;
}

export default function FinancialReportingLayout({ children }: { children: React.ReactNode }) {
  const [selectedEntity, setSelectedEntity] = useState<string>('consolidated');
  const [reportingPeriod, setReportingPeriod] = useState<string>('Q4-2024');
  const [fiscalYear, setFiscalYear] = useState<number>(2024);

  // These will be fetched from the backend
  const entities: Entity[] = [
    { id: 'consolidated', name: 'NGI Capital (Consolidated)', type: 'Consolidated' },
    { id: 'ngi-capital', name: 'NGI Capital, Inc.', type: 'C-Corp', ein: '88-XXXXXXX' },
    { id: 'ngi-advisory', name: 'NGI Capital Advisory LLC', type: 'LLC', ein: '87-XXXXXXX' },
    { id: 'creator-terminal', name: 'The Creator Terminal, Inc.', type: 'C-Corp', ein: '86-XXXXXXX' },
  ];

  return (
    <AppLayout>
      <FinancialReportingContext.Provider value={{
        selectedEntity,
        setSelectedEntity,
        reportingPeriod,
        setReportingPeriod,
        fiscalYear,
        setFiscalYear,
        entities
      }}>
        <div className="h-full flex flex-col">
          {/* Financial Reporting Header */}
          <div className="border-b border-border bg-card/50 backdrop-blur-sm">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileBarChart className="h-6 w-6 text-primary" />
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Financial Reporting</h1>
                    <p className="text-sm text-muted-foreground">
                      GAAP-compliant financial statements - ASC standards - Big 4 audit ready
                    </p>
                  </div>
                </div>

                {/* Export Actions */}
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2 text-sm">
                    <Download className="h-4 w-4" />
                    Export All
                  </button>
                </div>
              </div>

              {/* Controls Bar */}
              <div className="mt-4 flex items-center gap-4 flex-wrap">
                {/* Entity Selector */}
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={selectedEntity}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                    className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {entities.map(entity => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Period Selector */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={reportingPeriod}
                    onChange={(e) => setReportingPeriod(e.target.value)}
                    className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Q4-2024">Q4 2024</option>
                    <option value="Q3-2024">Q3 2024</option>
                    <option value="Q2-2024">Q2 2024</option>
                    <option value="Q1-2024">Q1 2024</option>
                    <option value="FY-2024">FY 2024</option>
                    <option value="FY-2023">FY 2023</option>
                  </select>
                </div>

                {/* Fiscal Year */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={fiscalYear}
                    onChange={(e) => setFiscalYear(Number(e.target.value))}
                    className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={2024}>2024</option>
                    <option value={2023}>2023</option>
                    <option value={2022}>2022</option>
                  </select>
                </div>

                {/* Compliance Badge */}
                <div className="ml-auto flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-full text-xs font-medium">
                    ASC 842 Compliant
                  </span>
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-full text-xs font-medium">
                    Big 4 Audit Ready
                  </span>
                  <span className="px-3 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-full text-xs font-medium">
                    CA Compliant
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </FinancialReportingContext.Provider>
    </AppLayout>
  );
}