'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileBarChart, PieChart } from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy load heavy reporting components
const FinancialStatementsView = dynamic(() => import('./FinancialStatementsView'), {
  loading: () => (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  ),
});

const ConsolidatedReportingView = dynamic(() => import('./ConsolidatedReportingView'), {
  loading: () => (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  ),
});

export default function ReportingTab() {
  const [activeSubTab, setActiveSubTab] = useState('financial');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Financial Reporting</h2>
        <p className="text-muted-foreground">Generate GAAP-compliant financial statements and consolidated reports</p>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <FileBarChart className="h-4 w-4" />
            <span>Financial Statements</span>
          </TabsTrigger>
          <TabsTrigger value="consolidated" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span>Consolidated Reporting</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="financial" className="mt-0">
            <FinancialStatementsView />
          </TabsContent>
          
          <TabsContent value="consolidated" className="mt-0">
            <ConsolidatedReportingView />
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  );
}