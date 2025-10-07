'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  DollarSign,
  TrendingDown,
  FileBarChart,
  Trash2
} from 'lucide-react';
import { useEntityContext } from '@/hooks/useEntityContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

interface FixedAsset {
  id: string;
  asset_number: string;
  asset_name: string;
  category: string;
  acquisition_date: string;
  acquisition_cost: number;
  salvage_value: number;
  depreciation_method: string;
  useful_life_years: number;
  status: string;
  location: string;
  serial_number: string;
  total_depreciation: number;
  book_value: number;
}

const ASSET_CATEGORIES = [
  'Land',
  'Buildings',
  'Leasehold Improvements',
  'Machinery & Equipment',
  'Furniture & Fixtures',
  'Vehicles',
  'Computer Equipment',
  'Software'
];

const DEPRECIATION_METHODS = [
  { value: 'straight_line', label: 'Straight-Line' },
  { value: 'double_declining', label: 'Double Declining Balance' },
  { value: 'units_of_production', label: 'Units of Production' },
  { value: 'none', label: 'No Depreciation (Land)' }
];

export default function FixedAssetsTab() {
  const { selectedEntityId } = useEntityContext();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProcessDepModalOpen, setIsProcessDepModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);

  // Form state for creating new asset
  const [newAsset, setNewAsset] = useState({
    asset_name: '',
    category: '',
    acquisition_date: new Date().toISOString().split('T')[0],
    acquisition_cost: '',
    salvage_value: '0',
    depreciation_method: 'straight_line',
    useful_life_years: '5',
    in_service_date: new Date().toISOString().split('T')[0],
    location: '',
    serial_number: '',
    vendor_name: '',
    purchase_invoice_number: ''
  });

  // Fetch assets
  useEffect(() => {
    if (selectedEntityId) {
      fetchAssets();
    }
  }, [selectedEntityId, statusFilter]);

  const fetchAssets = async () => {
    if (!selectedEntityId) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/fixed-assets/assets?entity_id=${selectedEntityId}&status=${statusFilter}`
      );
      const data = await response.json();
      setAssets(data.assets || []);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/fixed-assets/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: selectedEntityId,
          ...newAsset,
          acquisition_cost: parseFloat(newAsset.acquisition_cost),
          salvage_value: parseFloat(newAsset.salvage_value),
          useful_life_years: parseInt(newAsset.useful_life_years)
        })
      });

      if (response.ok) {
        setIsCreateModalOpen(false);
        fetchAssets();
        // Reset form
        setNewAsset({
          asset_name: '',
          category: '',
          acquisition_date: new Date().toISOString().split('T')[0],
          acquisition_cost: '',
          salvage_value: '0',
          depreciation_method: 'straight_line',
          useful_life_years: '5',
          in_service_date: new Date().toISOString().split('T')[0],
          location: '',
          serial_number: '',
          vendor_name: '',
          purchase_invoice_number: ''
        });
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Failed to create asset:', error);
      alert('Failed to create asset. Please try again.');
    }
  };

  const handleProcessDepreciation = async (year: number, month: number) => {
    try {
      const response = await fetch(
        `/api/fixed-assets/depreciation/process-period?year=${year}&month=${month}&entity_id=${selectedEntityId}`,
        { method: 'POST' }
      );
      const data = await response.json();
      alert(data.message);
      setIsProcessDepModalOpen(false);
      fetchAssets();
    } catch (error) {
      console.error('Failed to process depreciation:', error);
      alert('Failed to process depreciation. Please try again.');
    }
  };

  const filteredAssets = assets.filter(asset =>
    asset.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.asset_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAcquisitionCost = assets.reduce((sum, a) => sum + a.acquisition_cost, 0);
  const totalDepreciation = assets.reduce((sum, a) => sum + a.total_depreciation, 0);
  const totalBookValue = assets.reduce((sum, a) => sum + a.book_value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fixed Assets & Depreciation</h2>
          <p className="text-muted-foreground">Manage capital assets and depreciation schedules (ASC 360)</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isProcessDepModalOpen} onOpenChange={setIsProcessDepModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Process Depreciation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Process Period Depreciation</DialogTitle>
                <DialogDescription>
                  Calculate and create journal entry for monthly depreciation
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Year</Label>
                    <Input
                      type="number"
                      defaultValue={new Date().getFullYear()}
                      id="dep-year"
                    />
                  </div>
                  <div>
                    <Label>Month</Label>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      defaultValue={new Date().getMonth() + 1}
                      id="dep-month"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => {
                    const year = parseInt((document.getElementById('dep-year') as HTMLInputElement).value);
                    const month = parseInt((document.getElementById('dep-month') as HTMLInputElement).value);
                    handleProcessDepreciation(year, month);
                  }}
                  className="w-full"
                >
                  Process
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Fixed Asset</DialogTitle>
                <DialogDescription>
                  Add a new capital asset to the fixed asset register
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAsset} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Asset Name *</Label>
                    <Input
                      required
                      value={newAsset.asset_name}
                      onChange={(e) => setNewAsset({ ...newAsset, asset_name: e.target.value })}
                      placeholder="e.g., Server Rack 01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={newAsset.category}
                      onValueChange={(value) => setNewAsset({ ...newAsset, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Acquisition Date *</Label>
                    <Input
                      type="date"
                      required
                      value={newAsset.acquisition_date}
                      onChange={(e) => setNewAsset({ ...newAsset, acquisition_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>In-Service Date *</Label>
                    <Input
                      type="date"
                      required
                      value={newAsset.in_service_date}
                      onChange={(e) => setNewAsset({ ...newAsset, in_service_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Acquisition Cost *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={newAsset.acquisition_cost}
                      onChange={(e) => setNewAsset({ ...newAsset, acquisition_cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Salvage Value</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newAsset.salvage_value}
                      onChange={(e) => setNewAsset({ ...newAsset, salvage_value: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Depreciation Method *</Label>
                    <Select
                      value={newAsset.depreciation_method}
                      onValueChange={(value) => setNewAsset({ ...newAsset, depreciation_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPRECIATION_METHODS.map(method => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Useful Life (Years) *</Label>
                    <Input
                      type="number"
                      required
                      value={newAsset.useful_life_years}
                      onChange={(e) => setNewAsset({ ...newAsset, useful_life_years: e.target.value })}
                      placeholder="5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={newAsset.location}
                      onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                      placeholder="e.g., Office, Warehouse"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Serial Number</Label>
                    <Input
                      value={newAsset.serial_number}
                      onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                      placeholder="SN123456"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vendor Name</Label>
                    <Input
                      value={newAsset.vendor_name}
                      onChange={(e) => setNewAsset({ ...newAsset, vendor_name: e.target.value })}
                      placeholder="Supplier name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Purchase Invoice #</Label>
                    <Input
                      value={newAsset.purchase_invoice_number}
                      onChange={(e) => setNewAsset({ ...newAsset, purchase_invoice_number: e.target.value })}
                      placeholder="INV-12345"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Create Asset
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assets.length}</div>
            <p className="text-xs text-muted-foreground">
              Original Cost: ${totalAcquisitionCost.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Depreciation</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalDepreciation.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Accumulated to date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Book Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBookValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Current carrying value
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="register" className="w-full">
        <TabsList>
          <TabsTrigger value="register">Asset Register</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, number, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Assets</SelectItem>
                    <SelectItem value="fully_depreciated">Fully Depreciated</SelectItem>
                    <SelectItem value="disposed">Disposed</SelectItem>
                    <SelectItem value="all">All Assets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Assets Table */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No fixed assets found</p>
                  <p className="text-sm">Create your first asset to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Acquired</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Depreciation</TableHead>
                      <TableHead className="text-right">Book Value</TableHead>
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
                        onClick={() => setSelectedAsset(asset)}
                      >
                        <TableCell className="font-mono text-sm">{asset.asset_number}</TableCell>
                        <TableCell className="font-medium">{asset.asset_name}</TableCell>
                        <TableCell>{asset.category}</TableCell>
                        <TableCell>{new Date(asset.acquisition_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">${asset.acquisition_cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-red-600">
                          -${asset.total_depreciation.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${asset.book_value.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={asset.status === 'active' ? 'default' : 'secondary'}>
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

        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Fixed Asset Register</CardTitle>
                <CardDescription>Complete list with depreciation details</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Register
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Depreciation Schedule</CardTitle>
                <CardDescription>Monthly depreciation by asset</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Schedule
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Roll-Forward Report</CardTitle>
                <CardDescription>Beginning balance, additions, disposals, ending balance</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Roll-Forward
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audit Package</CardTitle>
                <CardDescription>All reports for auditor review</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <FileBarChart className="h-4 w-4 mr-2" />
                  Generate Package
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}