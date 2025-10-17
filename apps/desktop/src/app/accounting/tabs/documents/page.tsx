'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnimatedText } from '@ngi/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import {
  Upload,
  FileText,
  Search,
  Download,
  Eye,
  Link as LinkIcon,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  FolderOpen,
} from 'lucide-react';
import { useEntity } from '@/lib/context/UnifiedEntityContext';

// Document categories
const DOCUMENT_CATEGORIES = [
  { value: 'formation', label: 'Formation Docs', icon: FileText, color: 'blue' },
  { value: 'ein', label: 'EIN Documents', icon: FileSpreadsheet, color: 'purple' },
  { value: 'tax', label: 'Tax Documents', icon: FileSpreadsheet, color: 'purple' },
  { value: 'invoices', label: 'Invoices', icon: FileText, color: 'green' },
  { value: 'receipts', label: 'Receipts', icon: FileText, color: 'green' },
  { value: 'operating_agreement', label: 'Operating Agreements', icon: FileText, color: 'indigo' },
  { value: 'accounting_policies', label: 'Accounting Policies', icon: FileSpreadsheet, color: 'blue' },
  { value: 'internal_controls', label: 'Internal Controls', icon: FileText, color: 'red' },
  { value: 'bank_statement', label: 'Bank Statements', icon: FileArchive, color: 'indigo' },
];

interface Document {
  id: string;
  filename: string;
  original_name: string;
  file_type: string;
  size: number;
  category: string;
  entity: string | null;
  upload_date: string;
  processing_status: string;
  status: string;
  file_path: string;
  extracted_data?: any;
  extraction_confidence?: number;
}

export default function DocumentsTab() {
  const { selectedEntity } = useEntity();
  const selectedEntityId = selectedEntity?.id;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);

  const fetchDocuments = async () => {
    if (!selectedEntityId) {
      console.log('No entity selected, skipping document fetch');
      setDocuments([]);
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching documents for entity:', selectedEntityId);
      const response = await fetch(`/api/accounting/documents/?entity_id=${selectedEntityId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        console.error('Documents API error:', response.status);
        setDocuments([]);
        return;
      }

      const data = await response.json();
      const docsList = Array.isArray(data) ? data : (data.documents || data.documentsList || []);

      // Map API response to our Document interface
      const mappedDocs: Document[] = docsList.map((doc: any) => ({
        id: doc.id || doc.file_id,
        filename: doc.filename || doc.original_name || 'Unknown',
        original_name: doc.original_name || doc.filename || 'Unknown',
        file_type: doc.file_type || doc.mime_type || 'application/octet-stream',
        size: doc.file_size_bytes || doc.size || doc.file_size || 0,
        category: doc.category || 'other',
        entity: doc.entity || doc.entity_id || doc.entity_name || null,
        upload_date: doc.upload_date || doc.created_at || new Date().toISOString(),
        processing_status: doc.processing_status || 'uploaded',
        status: doc.status || doc.workflow_status || 'pending',
        file_path: doc.file_path || doc.file_url || '',
        extracted_data: doc.extracted_data,
        extraction_confidence: doc.extraction_confidence,
      }));

      setDocuments(mappedDocs);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEntityId) {
      fetchDocuments();
    }
  }, [selectedEntityId, categoryFilter]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    console.log('=== UPLOAD STARTING ===');
    console.log('Selected files:', selectedFiles);
    console.log('Selected entity:', selectedEntityId);
    console.log('Selected category:', selectedCategory);

    if (selectedFiles.length === 0) {
      alert('Please select at least one file');
      return;
    }

    if (!selectedEntityId) {
      alert('Please select an entity first');
      return;
    }

    if (!selectedCategory) {
      alert('Please select a document category');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();

      // Add each file
      selectedFiles.forEach((file, index) => {
        console.log(`Adding file ${index}:`, file.name, file.size, file.type);
        formData.append('files', file);
      });

      // Add entity_id and category
      formData.append('entity_id', selectedEntityId.toString());
      formData.append('category', selectedCategory);

      console.log('FormData prepared, sending to:', '/api/accounting/documents/batch-upload');

      const response = await fetch('/api/accounting/documents/batch-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      console.log('Response received:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload error response:', response.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || 'Upload failed' };
        }
        throw new Error(errorData.detail || errorData.message || `Upload failed with status ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const result = await response.json();
      console.log('Upload success result:', result);

      const uploadedCount = result.successful || result.uploaded?.length || result.documents?.length || selectedFiles.length;

      alert(`Successfully uploaded ${uploadedCount} document(s)!`);
      setUploadDialogOpen(false);
      setSelectedFiles([]);
      setSelectedCategory('');

      // Refresh document list
      await fetchDocuments();

    } catch (error) {
      console.error('=== UPLOAD FAILED ===');
      console.error('Error details:', error);
      alert(`Failed to upload: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes('image')) return <FileImage className="h-5 w-5 text-blue-500" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel'))
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  const getStatusBadge = (status: string) => {
    // Simplified pipeline: everything is immediately available; no processing spinners
    const ok: { color: string; icon: React.ReactNode; text: string } = { color: 'green', icon: <CheckCircle2 className="h-3 w-3" />, text: 'Ready' };
    const failed: { color: string; icon: React.ReactNode; text: string } = { color: 'red', icon: <AlertCircle className="h-3 w-3" />, text: 'Failed' };

    const normalized = (status || '').toLowerCase();
    const show = normalized === 'failed' || normalized === 'extraction_failed' ? failed : ok;

    return (
      <Badge variant="outline" className="flex items-center gap-1">
        {show.icon}
        <span>{show.text}</span>
      </Badge>
    );
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      const link = document.createElement('a');
      link.href = `/api/accounting/documents/download/${doc.id}`;
      link.download = doc.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download document:', error);
      alert('Failed to download document');
    }
  };

  const handleViewDocument = async (doc: Document) => {
    setViewingDocument(doc);
    setPdfError(false);
    setViewerOpen(true);
    setViewerLoading(true);
    // Revoke previous URL to avoid leaks
    try {
      if (viewerUrl) {
        URL.revokeObjectURL(viewerUrl);
        setViewerUrl(null);
      }
    } catch {}
    try {
      const resp = await fetch(`/api/accounting/documents/view/${doc.id}`, {
        credentials: 'include',
      });
      if (!resp.ok) {
        throw new Error(`Viewer fetch failed: ${resp.status}`);
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      setViewerUrl(url);
    } catch (e) {
      console.error('Failed to load viewer blob:', e);
      setPdfError(true);
    } finally {
      setViewerLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesCategory = false;
    if (categoryFilter === 'all') {
      matchesCategory = true;
    } else if (categoryFilter === 'formation') {
      matchesCategory = ['formation', 'accounting_policies', 'operating_agreement', 'internal_controls'].includes(doc.category);
    } else if (categoryFilter === 'tax') {
      matchesCategory = ['ein', 'tax'].includes(doc.category);
    } else if (categoryFilter === 'financial') {
      matchesCategory = ['invoices', 'receipts', 'bank_statement'].includes(doc.category);
    } else {
      matchesCategory = doc.category === categoryFilter;
    }
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryInfo = (category: string) => {
    return DOCUMENT_CATEGORIES.find(c => c.value === category) || DOCUMENT_CATEGORIES[DOCUMENT_CATEGORIES.length - 1];
  };

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
            text="Document Center" 
            as="h2" 
            className="text-2xl font-bold tracking-tight"
            delay={0.1}
          />
          <AnimatedText 
            text="Upload and manage documents with manual categorization" 
            as="p" 
            className="text-muted-foreground"
            delay={0.3}
            stagger={0.02}
          />
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Documents
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Documents</DialogTitle>
              <DialogDescription>
                Upload documents and manually categorize them for proper organization.
                All data from the document will be extracted and categorized.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select Files</Label>
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.xps,.png,.jpg,.jpeg,.tiff"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Selected {selectedFiles.length} file(s):
                    </p>
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm bg-muted p-2 rounded"
                      >
                        <span className="truncate flex-1">{file.name}</span>
                        <span className="text-muted-foreground ml-2">
                          {formatFileSize(file.size)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFiles(selectedFiles.filter((_, i) => i !== idx));
                          }}
                          disabled={uploading}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                  disabled={uploading}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select document category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUploadDialogOpen(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading || selectedFiles.length === 0}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading & Extracting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card 
          className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer"
          onClick={() => setCategoryFilter('all')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
            <p className="text-xs text-muted-foreground">Across all categories</p>
          </CardContent>
        </Card>

        <Card 
          className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer"
          onClick={() => setCategoryFilter('formation')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formation Docs</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(d => d.category === 'formation' || d.category === 'accounting_policies' || d.category === 'operating_agreement' || d.category === 'internal_controls').length}
            </div>
            <p className="text-xs text-muted-foreground">Certificates, policies, controls, agreements</p>
          </CardContent>
        </Card>

        <Card 
          className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer"
          onClick={() => setCategoryFilter('tax')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax/EIN Documents</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(d => d.category === 'ein' || d.category === 'tax').length}
            </div>
            <p className="text-xs text-muted-foreground">EIN letters, tax forms</p>
          </CardContent>
        </Card>

        <Card 
          className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer"
          onClick={() => setCategoryFilter('financial')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financial Documents</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(d => d.category === 'invoices' || d.category === 'receipts' || d.category === 'bank_statement').length}
            </div>
            <p className="text-xs text-muted-foreground">Bills, receipts, invoices, bank statements</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Document Library</CardTitle>
          <CardDescription>
            All documents are manually categorized for proper organization and data extraction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="formation">Formation Documents</SelectItem>
                <SelectItem value="tax">Tax/EIN Documents</SelectItem>
                <SelectItem value="financial">Financial Documents</SelectItem>
                <SelectItem value="invoices">Invoices</SelectItem>
                <SelectItem value="receipts">Receipts</SelectItem>
                <SelectItem value="bank_statement">Bank Statements</SelectItem>
                
                {/* Other individual categories */}
                {DOCUMENT_CATEGORIES.filter(cat => 
                  !['formation', 'accounting_policies', 'operating_agreement', 'internal_controls', 'ein', 'tax', 'invoices', 'receipts', 'bank_statement'].includes(cat.value)
                ).map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="h-8 w-8 text-primary" />
              </motion.div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Documents Yet</h3>
              <p className="text-muted-foreground mb-4">
                {documents.length === 0
                  ? 'Upload your first document to get started with automatic extraction'
                  : 'No documents match your search criteria'}
              </p>
              {documents.length === 0 && (
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload First Document
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredDocuments.map((doc, index) => {
                      const categoryInfo = getCategoryInfo(doc.category);
                      return (
                        <motion.tr
                          key={doc.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleViewDocument(doc)}
                        >
                          <TableCell>{getFileIcon(doc.file_type)}</TableCell>
                          <TableCell className="font-medium">{doc.original_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <categoryInfo.icon className="h-3 w-3" />
                              {categoryInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {doc.entity || 'N/A'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatFileSize(doc.size)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(doc.upload_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{getStatusBadge(doc.processing_status)}</TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={(open) => {
        setViewerOpen(open);
        if (!open) {
          try {
            if (viewerUrl) {
              URL.revokeObjectURL(viewerUrl);
            }
          } catch {}
          setViewerUrl(null);
          setViewingDocument(null);
          setPdfError(false);
          setViewerLoading(false);
        }
      }}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-3">
              {viewingDocument && getFileIcon(viewingDocument.file_type)}
              {viewingDocument?.original_name || 'Document Viewer'}
            </DialogTitle>
            {viewingDocument && (() => {
              const catInfo = getCategoryInfo(viewingDocument.category);
              return (
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <catInfo.icon className="h-3 w-3" />
                    {catInfo.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatFileSize(viewingDocument.size)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Uploaded {new Date(viewingDocument.upload_date).toLocaleDateString()}
                  </span>
                  {getStatusBadge(viewingDocument.processing_status)}
                </div>
              );
            })()}
          </DialogHeader>

          <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900 relative">
            {viewerLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {viewingDocument && !pdfError && viewerUrl && (
              <iframe
                src={viewerUrl}
                className="w-full h-full border-0"
                title={viewingDocument.original_name}
                onError={() => setPdfError(true)}
              />
            )}
            {pdfError && viewingDocument && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Unable to Display Document</h3>
                <p className="text-muted-foreground mb-4">
                  The document cannot be displayed in the browser viewer.
                </p>
                <Button
                  onClick={() => handleDownloadDocument(viewingDocument)}
                  className="mb-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Document Instead
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => window.open(`/api/accounting/documents/view/${viewingDocument.id}`, '_blank')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t bg-white dark:bg-gray-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => viewingDocument && handleDownloadDocument(viewingDocument)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            <Button variant="outline" onClick={() => setViewerOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}
