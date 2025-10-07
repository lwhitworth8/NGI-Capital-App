'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, RefreshCw, Building2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy load Bank Reconciliation for performance
const BankReconciliationView = dynamic(() => import('./BankReconciliationView'), {
  loading: () => (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  ),
});

export default function BankingTab() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Banking & Reconciliation</h2>
        <p className="text-muted-foreground">Manage bank accounts and reconcile transactions with Mercury integration</p>
      </div>
      
      {/* Bank Reconciliation - Full Functionality */}
      <BankReconciliationView />
    </motion.div>
  );
}