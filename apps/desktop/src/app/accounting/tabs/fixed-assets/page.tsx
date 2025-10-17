'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnimatedText } from '@ngi/ui';
import { Input } from '@/components/ui/input';
import {
  Building2,
  Search,
  Download,
  Calendar,
  DollarSign,
  TrendingDown,
  FileBarChart,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { useEntityContext } from '@/hooks/useEntityContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface FixedAsset {
  id: number;
  asset_number: string;
  asset_name: string;
  asset_category: string;
  acquisition_date: string;
  acquisition_cost: number;
  salvage_value: number;
  useful_life_years: number;
  depreciation_method: string;
  accumulated_depreciation: number;
  net_book_value: number;
  status: string;
  is_fully_depreciated: boolean;
  auto_detected: boolean;
  detection_confidence: number;
  location?: string;
  months_depreciated: number;
}

interface DepreciationScheduleItem {
  asset_number: string;
  asset_name: string;
  asset_category: string;
  acquisition_cost: number;
  accumulated_depreciation: number;
  net_book_value: number;
  monthly_depreciation: number;
  months_depreciated: number;
  months_remaining: number;
  percent_depreciated: number;
  status: string;
}

// Audit package UI has been moved to the top-level Audit Package tab

export default function FixedAssetsTab() {
  const { selectedEntityId } = useEntityContext();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [depSchedule, setDepSchedule] = useState<DepreciationScheduleItem[]>([]);
  // auditPackages moved to top-level Audit Package tab
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('register');
  const [searchAsset, setSearchAsset] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Summary stats
  const [summary, setSummary] = useState({
    total_cost: 0,
    total_accumulated_depreciation: 0,
    total_net_book_value: 0
  });

  useEffect(() => {
    if (selectedEntityId) {
      fetchAssets();
      fetchDepreciationSchedule();
      // fetchAuditPackages moved to top-level Audit Package tab
    }
  }, [selectedEntityId]);

  const fetchAssets = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/accounting/fixed-assets/assets?entity_id=${selectedEntityId}`);
      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
        setSummary(data.summary || {});
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepreciationSchedule = async () => {
    if (!selectedEntityId) return;
    try {
      const response = await fetch(`/api/accounting/fixed-assets/depreciation-schedule?entity_id=${selectedEntityId}`);
      if (response.ok) {
        const data = await response.json();
        setDepSchedule(data.schedule || []);
      }
    } catch (error) {
      console.error('Failed to fetch depreciation schedule:', error);
    }
  };

  // fetchAuditPackages moved to top-level Audit Package tab

  const handleGenerateDepreciation = async () => {
    if (!selectedEntityId) return;
    
    // Get last day of current month
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const periodDate = lastDay.toISOString().split('T')[0];
    
    try {
      const response = await fetch('/api/accounting/fixed-assets/generate-depreciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: selectedEntityId,
          period_date: periodDate
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'Depreciation generated successfully');
        fetchAssets();
        fetchDepreciationSchedule();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Failed to generate depreciation:', error);
      alert('Failed to generate depreciation. Please try again.');
    }
  };

  // handleGenerateAuditPackage moved to top-level Audit Package tab

  // Filter functions
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.asset_name.toLowerCase().includes(searchAsset.toLowerCase()) ||
                         asset.asset_number.toLowerCase().includes(searchAsset.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || asset.asset_category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Get unique categories
  const categories = Array.from(new Set(assets.map(a => a.asset_category)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <AnimatedText 
            text="Fixed Assets" 
            as="h2" 
            className="text-2xl font-bold tracking-tight"
            delay={0.1}
          />
          <AnimatedText 
            text="Auto-detected assets, depreciation automation, and Big 4 audit packages" 
            as="p" 
            className="text-muted-foreground"
            delay={0.3}
            stagger={0.02}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Original Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.total_cost?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              {assets.length} total assets
            </p>
          </CardContent>
        </Card>

        <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accumulated Depreciation</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.total_accumulated_depreciation?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime depreciation
            </p>
          </CardContent>
        </Card>

        <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Book Value</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.total_net_book_value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Current value
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-6 flex justify-center">
          <TabsList className="h-11 bg-muted/50">
            <TabsTrigger value="register" className="data-[state=active]:bg-background px-6">
              Asset Register
            </TabsTrigger>
            <TabsTrigger value="depreciation" className="data-[state=active]:bg-background px-6">
              Depreciation Schedule
            </TabsTrigger>
            {/* Audit Package moved to top-level tab */}
          </TabsList>
        </div>

        {/* ASSET REGISTER TAB */}
        <TabsContent value="register" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Asset Register</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">All assets are auto-detected from expense documents</p>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search assets..."
                      className="pl-10 w-64"
                      value={searchAsset}
                      onChange={(e) => setSearchAsset(e.target.value)}
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="In Service">In Service</SelectItem>
                      <SelectItem value="Fully Depreciated">Fully Depreciated</SelectItem>
                      <SelectItem value="Disposed">Disposed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No fixed assets found</p>
                  <p className="text-sm">Assets are auto-detected when you upload expense documents</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Acquisition Date</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Accum. Dep.</TableHead>
                      <TableHead className="text-right">NBV</TableHead>
                      <TableHead>Useful Life</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssets.map((asset, index) => (
                      <motion.tr
                        key={asset.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell className="font-mono text-sm">{asset.asset_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{asset.asset_name}</p>
                            {asset.auto_detected && (
                              <p className="text-xs text-muted-foreground">
                                Auto-detected ({asset.detection_confidence}% confidence)
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{asset.asset_category}</TableCell>
                        <TableCell className="text-sm">{new Date(asset.acquisition_date).toLocaleDateString('en-US')}</TableCell>
                        <TableCell className="text-right">${asset.acquisition_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">${asset.accumulated_depreciation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-semibold">${asset.net_book_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-sm">{asset.useful_life_years} years</TableCell>
                        <TableCell>
                          <Badge variant={
                            asset.status === 'In Service' ? 'default' :
                            asset.status === 'Fully Depreciated' ? 'secondary' : 'outline'
                          }>
                            {asset.status}
                          </Badge>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DEPRECIATION SCHEDULE TAB */}
        <TabsContent value="depreciation" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Monthly Depreciation Schedule</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">View depreciation progress for all assets</p>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <Button onClick={handleGenerateDepreciation}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Generate Monthly Depreciation
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {depSchedule.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No depreciation schedule available</p>
                  <p className="text-sm">Generate monthly depreciation to see the schedule</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Accum. Dep.</TableHead>
                      <TableHead className="text-right">NBV</TableHead>
                      <TableHead className="text-right">Monthly Dep.</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depSchedule.map((item, index) => (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <TableCell className="font-mono text-sm">{item.asset_number}</TableCell>
                        <TableCell className="font-medium">{item.asset_name}</TableCell>
                        <TableCell className="text-sm">{item.asset_category}</TableCell>
                        <TableCell className="text-right">${item.acquisition_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">${item.accumulated_depreciation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-semibold">${item.net_book_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">${item.monthly_depreciation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={item.percent_depreciated} className="h-2" />
                            <p className="text-xs text-muted-foreground">{item.percent_depreciated.toFixed(1)}%</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{item.months_remaining} months</TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDIT PACKAGE TAB */}
        <TabsContent value="audit" className="space-y-4">{/* moved to top-level Audit Package tab */}{false && (
          <Card>
            <CardHeader>
              <CardTitle>Big 4 Audit Package Generator</CardTitle>
              <CardDescription>
                Generate comprehensive audit packages for external auditors (PwC, Deloitte, EY, KPMG standards)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-l-4 border-primary pl-4 space-y-2">
                <h4 className="font-semibold">Audit Package Contents</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    PBC-1: Fixed Asset Register
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    PBC-2: Depreciation Schedule (by month)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    PBC-3: Roll Forward Report (Beginning → Additions → Depreciation → Disposals → Ending)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    PBC-4: Additions Schedule (all new assets for the year)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    PBC-5: Disposals Schedule (all disposed assets with gain/loss)
                  </li>
                </ul>
              </div>

              <Button onClick={handleGenerateAuditPackage} className="w-full" size="lg">
                <FileBarChart className="h-4 w-4 mr-2" />
                Generate Audit Package for {new Date().getFullYear()}
              </Button>

              {auditPackages.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Previously Generated Packages</h4>
                  <div className="space-y-2">
                    {auditPackages.map((pkg) => (
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(pkg.download_url, '_blank')}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
