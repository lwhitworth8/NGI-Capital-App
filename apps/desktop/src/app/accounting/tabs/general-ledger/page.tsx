'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, ClipboardList, FileSpreadsheet } from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy load heavy components for performance
const ChartOfAccountsView = dynamic(() => import('./ChartOfAccountsView'), {
  loading: () => (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  ),
});

const JournalEntriesView = dynamic(() => import('./JournalEntriesView'), {
  loading: () => (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  ),
});

const TrialBalanceView = dynamic(() => import('./TrialBalanceView'), {
  loading: () => (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  ),
});

export default function GeneralLedgerTab() {
  const [activeSubTab, setActiveSubTab] = useState('coa');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight">General Ledger</h2>
        <p className="text-muted-foreground">Manage your chart of accounts, journal entries, and trial balance</p>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="coa" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span>Chart of Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="je" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span>Journal Entries</span>
          </TabsTrigger>
          <TabsTrigger value="tb" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Trial Balance</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="coa" className="mt-0">
            <ChartOfAccountsView />
          </TabsContent>
          
          <TabsContent value="je" className="mt-0">
            <JournalEntriesView />
          </TabsContent>
          
          <TabsContent value="tb" className="mt-0">
            <TrialBalanceView />
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  );
}