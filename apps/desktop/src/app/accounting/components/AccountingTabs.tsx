'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

const TABS = [
  { id: 'gl', label: 'General Ledger' },
  { id: 'ar', label: 'Accounts Receivable' },
  { id: 'ap', label: 'Accounts Payable' },
  { id: 'fixed-assets', label: 'Fixed Assets' },
  { id: 'expenses', label: 'Expenses & Payroll' },
  { id: 'banking', label: 'Banking' },
  { id: 'reporting', label: 'Reporting' },
  { id: 'taxes', label: 'Taxes' },
  { id: 'period-close', label: 'Period Close' },
  { id: 'documents', label: 'Documents' },
  { id: 'audit', label: 'Audit Package' },
  { id: 'conversion', label: 'Conversion' },
];

// Lazy load tabs for performance
const GeneralLedgerTab = lazy(() => import('../tabs/general-ledger/page'));
const ARTab = lazy(() => import('../tabs/ar/page'));
const APTab = lazy(() => import('../tabs/ap/page'));
const FixedAssetsTab = lazy(() => import('../tabs/fixed-assets/page'));
const ExpensesTab = lazy(() => import('../tabs/expenses-payroll/page'));
const BankingTab = lazy(() => import('../tabs/banking/page'));
const ReportingTab = lazy(() => import('../tabs/reporting/page'));
const TaxesTab = lazy(() => import('../tabs/taxes/page'));
const PeriodCloseTab = lazy(() => import('../tabs/period-close/page'));
const DocumentsTab = lazy(() => import('../tabs/documents/page'));
const AuditPackageTab = lazy(() => import('../tabs/audit-package/page'));
const ConversionTab = lazy(() => import('../tabs/conversion/page'));

interface AccountingTabsProps {
  onTabChange?: (tabId: string) => void;
}

export function AccountingTabs({ onTabChange }: AccountingTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('gl');
  
  // Initialize from URL params or localStorage
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam && TABS.find(t => t.id === tabParam)) {
      setActiveTab(tabParam);
      onTabChange?.(tabParam);
    } else {
      const saved = localStorage.getItem('accounting-active-tab');
      if (saved && TABS.find(t => t.id === saved)) {
        setActiveTab(saved);
        onTabChange?.(saved);
      } else {
        onTabChange?.('gl');
      }
    }
  }, [searchParams, onTabChange]);
  
  // Persist active tab and update URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    onTabChange?.(value);
    localStorage.setItem('accounting-active-tab', value);
    
    // Update URL params
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', value);
    router.push(`?${params.toString()}`, { scroll: false });
  };
  
  // Keyboard shortcuts (Cmd/Ctrl + 1-9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (TABS[index]) {
          e.preventDefault();
          handleTabChange(TABS[index].id);
        }
      }
      
      // Arrow key navigation
      if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const currentIndex = TABS.findIndex(t => t.id === activeTab);
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          handleTabChange(TABS[currentIndex - 1].id);
        } else if (e.key === 'ArrowRight' && currentIndex < TABS.length - 1) {
          handleTabChange(TABS[currentIndex + 1].id);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleTabChange]);
  
  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      {/* First row of tabs - compact design matching Finance module */}
      <div className="mb-6 flex justify-center">
        <TabsList className="h-11 bg-muted/50">
          {TABS.slice(0, 5).map(tab => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id} 
              className="data-[state=active]:bg-background px-6"
              title={`${tab.label} (Cmd/Ctrl+${TABS.indexOf(tab) + 1})`}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      
      {/* Second row of tabs - compact design matching Finance module */}
      <div className="mb-6 flex justify-center">
        <TabsList className="h-11 bg-muted/50">
          {TABS.slice(5).map(tab => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id} 
              className="data-[state=active]:bg-background px-6"
              title={`${tab.label} (Cmd/Ctrl+${TABS.indexOf(tab) + 1})`}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      
      <div className="mt-6">
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-8 w-8 text-primary" />
            </motion.div>
          </div>
        }>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <TabsContent value="gl" className="mt-0">
                <GeneralLedgerTab />
              </TabsContent>
              <TabsContent value="ar" className="mt-0">
                <ARTab />
              </TabsContent>
              <TabsContent value="ap" className="mt-0">
                <APTab />
              </TabsContent>
              <TabsContent value="fixed-assets" className="mt-0">
                <FixedAssetsTab />
              </TabsContent>
              <TabsContent value="expenses" className="mt-0">
                <ExpensesTab />
              </TabsContent>
              <TabsContent value="banking" className="mt-0">
                <BankingTab />
              </TabsContent>
              <TabsContent value="reporting" className="mt-0">
                <ReportingTab />
              </TabsContent>
              <TabsContent value="taxes" className="mt-0">
                <TaxesTab />
              </TabsContent>
              <TabsContent value="period-close" className="mt-0">
                <PeriodCloseTab />
              </TabsContent>
              <TabsContent value="documents" className="mt-0">
                <DocumentsTab />
              </TabsContent>
              <TabsContent value="audit" className="mt-0">
                <AuditPackageTab />
              </TabsContent>
              <TabsContent value="conversion" className="mt-0">
                <ConversionTab />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </div>
      
      {/* Keyboard shortcut hint */}
      <div className="fixed bottom-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm border rounded-md px-3 py-2 hidden lg:block">
        <kbd className="text-xs">Cmd/Ctrl + 1-9</kbd> to switch tabs
      </div>
    </Tabs>
  );
}
