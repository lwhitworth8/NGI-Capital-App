'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedText } from '@ngi/ui';
import ChartOfAccountsView from './ChartOfAccountsView';

import JournalEntriesView from './JournalEntriesView';
import TrialBalanceView from './TrialBalanceView';

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
        <AnimatedText 
          text="General Ledger" 
          as="h2" 
          className="text-2xl font-bold tracking-tight"
          delay={0.1}
        />
        <AnimatedText 
          text="Manage your chart of accounts, journal entries, and trial balance" 
          as="p" 
          className="text-muted-foreground"
          delay={0.3}
          stagger={0.02}
        />
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <div className="mb-6 flex justify-center">
          <TabsList className="h-11 bg-muted/50">
            <TabsTrigger value="coa" className="data-[state=active]:bg-background px-6">
              Chart of Accounts
            </TabsTrigger>
            <TabsTrigger value="je" className="data-[state=active]:bg-background px-6">
              Journal Entries
            </TabsTrigger>
            <TabsTrigger value="tb" className="data-[state=active]:bg-background px-6">
              Trial Balance
            </TabsTrigger>
          </TabsList>
        </div>

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