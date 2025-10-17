'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileBarChart, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { useEntityContext } from '@/hooks/useEntityContext';

interface AuditPackage {
  id: number;
  package_type: string;
  period_year: number;
  file_name: string;
  file_size_bytes: number;
  total_assets_count: number;
  total_net_book_value: number;
  generated_at: string;
  generated_by_email: string;
  download_url: string;
}

export default function AuditPackageTab() {
  const { selectedEntityId } = useEntityContext();
  const [auditPackages, setAuditPackages] = useState<AuditPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedEntityId) {
      fetchAuditPackages();
    }
  }, [selectedEntityId]);

  const fetchAuditPackages = async () => {
    if (!selectedEntityId) return;
    setError(null);
    try {
      const res = await fetch(`/api/accounting/fixed-assets/audit-package/list?entity_id=${selectedEntityId}`);
      if (res.ok) {
        const data = await res.json();
        setAuditPackages(data.packages || []);
      } else {
        setError('Failed to load audit packages');
      }
    } catch (e) {
      console.error('Failed to fetch audit packages:', e);
      setError('Network error');
    }
  };

  const handleGenerate = async () => {
    if (!selectedEntityId) return;
    const year = new Date().getFullYear();
    const confirmed = confirm(
      `Generate Big 4 audit package for ${year}? This creates a comprehensive Excel workbook with all required schedules.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/accounting/fixed-assets/audit-package/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ entity_id: selectedEntityId, year }),
      });
      if (res.ok) {
        const data = await res.json();
        alert('Audit package generated successfully');
        setTimeout(fetchAuditPackages, 300);
        if (data.download_url) {
          window.open(data.download_url, '_blank');
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'Failed to generate audit package');
      }
    } catch (e) {
      console.error('Failed to generate audit package:', e);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            Audit Package
            <Badge variant="outline" className="text-xs">Big 4 Ready</Badge>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Centralized audit package generation and downloads. Final TODO: align all schedules for Big 4 readiness.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={!selectedEntityId || loading}>
          <FileBarChart className="mr-2 h-4 w-4" />
          {loading ? 'Generating…' : `Generate ${new Date().getFullYear()}`}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Package Contents</CardTitle>
          <CardDescription>What’s included in each generated workbook</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-600" /> PBC-1: Fixed Asset Register</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-600" /> PBC-2: Depreciation Schedule (monthly)</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-600" /> PBC-3: Roll Forward (Beg → Adds → Dep → Disposals → End)</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-600" /> PBC-4: Additions Schedule</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-600" /> PBC-5: Disposals Schedule</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Previously Generated Packages</CardTitle>
          <CardDescription>Latest first</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {auditPackages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No packages yet. Generate one to get started.</p>
          ) : (
            auditPackages.map((pkg) => (
              <div key={pkg.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div className="flex-1">
                  <p className="font-medium text-sm">{pkg.file_name}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    <span>{pkg.period_year}</span>
                    <span>•</span>
                    <span>{pkg.total_assets_count} assets</span>
                    <span>•</span>
                    <span>${pkg.total_net_book_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NBV</span>
                    <span>•</span>
                    <span>{new Date(pkg.generated_at).toLocaleDateString('en-US')}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.open(pkg.download_url, '_blank')}>
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

