'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PieChart, Building2, Download, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ConsolidatedReportingView() {
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [consolidatedData, setConsolidatedData] = useState<any>(null);

  // Fetch all entities
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const response = await fetch('/api/accounting/entities', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          console.log('Entities:', data);
          setEntities(data);
        }
      } catch (error) {
        console.error('Failed to fetch entities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEntities();
  }, []);

  // Generate consolidated report
  const generateConsolidated = async () => {
    try {
      // Fetch financial data for each entity
      const entityData = await Promise.all(
        entities.map(async (entity) => {
          const response = await fetch(`/api/accounting/financial-reporting/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              entity_id: entity.id,
              period_end_date: '2025-12-31'
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data) {
              return { entity, data };
            }
          }
          return null;
        })
      );

      setConsolidatedData(entityData.filter(Boolean));
    } catch (error) {
      console.error('Failed to generate consolidated:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    if (!amount || amount === 0) return '$0';
    const absAmount = Math.abs(amount);
    const formatted = absAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return amount < 0 ? `($${formatted})` : `$${formatted}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2">
          Consolidated Financial Reporting
          <Badge variant="outline" className="text-xs">
            ASC 810
          </Badge>
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Multi-entity reporting with intercompany eliminations (when entities are registered)
        </p>
      </div>

      {/* Entity Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {entities.map((entity) => (
          <Card key={entity.id} className={entity.is_available ? '' : 'opacity-60'}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">{entity.entity_name}</CardTitle>
                </div>
                <Badge variant={entity.is_available ? 'default' : 'secondary'} className="text-xs">
                  {entity.is_available ? 'Active' : 'Pending'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{entity.entity_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">{entity.entity_status}</span>
                </div>
                {entity.ownership_percentage && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ownership:</span>
                    <span className="font-medium">{entity.ownership_percentage}%</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generate Consolidated Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold mb-1">Generate Consolidated Financial Statements</h4>
              <p className="text-sm text-muted-foreground">
                Combines all active entities with proper ASC 810 consolidation methodology
              </p>
            </div>
            <Button onClick={generateConsolidated} disabled={entities.length === 0}>
              <PieChart className="mr-2 h-4 w-4" />
              Generate Consolidated
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Consolidated Results */}
      {consolidatedData && consolidatedData.length > 0 && (
        <>
          {/* Entity Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Entity Performance Summary</CardTitle>
              <CardDescription>December 2025</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {consolidatedData.map(({ entity, data }: any) => {
                  const bs = data.statements?.balance_sheet;
                  const is_data = data.statements?.income_statement;
                  
                  return (
                    <div key={entity.id} className="space-y-4 p-4 border rounded-lg">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Building2 className="h-4 w-4" />
                        <h4 className="font-semibold text-sm">{entity.entity_name}</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Assets</span>
                          <span className="font-mono font-semibold">{formatCurrency(bs?.total_assets || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Liabilities</span>
                          <span className="font-mono">{formatCurrency(bs?.total_liabilities || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Equity</span>
                          <span className="font-mono">{formatCurrency(bs?.total_equity || 0)}</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Revenue</span>
                          <span className="font-mono">{formatCurrency(is_data?.total_revenue || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expenses</span>
                          <span className="font-mono">{formatCurrency(is_data?.total_expenses || 0)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Net Income</span>
                          <span className={`font-mono ${(is_data?.net_income || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(is_data?.net_income || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Consolidation Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Consolidation Methodology (ASC 810)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h5 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    Consolidation Process
                  </h5>
                  <ol className="list-decimal list-inside space-y-2 text-xs">
                    <li><strong>Combine entities:</strong> Add all asset, liability, revenue, and expense accounts</li>
                    <li><strong>Identify intercompany:</strong> Find receivables/payables and revenue/expenses between entities</li>
                    <li><strong>Eliminate intercompany:</strong> Remove internal transactions to show only external activity</li>
                    <li><strong>Eliminate investment:</strong> Offset parent's investment against subsidiary equity</li>
                    <li><strong>Present consolidated:</strong> Single set of financials for the entire economic entity</li>
                  </ol>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <h5 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    Intercompany Eliminations
                  </h5>
                  <p className="text-xs mb-2">
                    To properly consolidate, mark journal entries as "intercompany" and identify the counterparty entity.
                    The system will then automatically eliminate these transactions in consolidated reporting.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Current eliminations: $0 (no intercompany transactions tagged yet)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Instructions when no data */}
      {!consolidatedData && (
        <Card>
          <CardContent className="py-12 text-center">
            <PieChart className="h-16 w-16 text-muted-foreground mb-4 opacity-50 mx-auto" />
            <h3 className="text-lg font-semibold mb-2">Consolidated Reporting</h3>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-6">
              Click "Generate Consolidated" above to combine financial statements from all your entities. 
              Once Creator Terminal and Advisory LLC are registered (post-conversion), they'll automatically 
              be included in consolidated reporting.
            </p>
            <div className="text-xs text-muted-foreground">
              <p className="mb-1">Active entities: {entities.filter(e => e.is_available).length}</p>
              <p>Pending entities: {entities.filter(e => !e.is_available).length}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
