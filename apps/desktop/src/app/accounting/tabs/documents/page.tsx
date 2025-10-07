'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Filter,
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
import { useEntityContext } from '@/hooks/useEntityContext';
import { api } from '@/lib/api';

// Document categories
const DOCUMENT_CATEGORIES = [
  { value: 'formation', label: 'Formation Docs', icon: FileText, color: 'blue' },
  { value: 'tax', label: 'Tax Documents', icon: FileSpreadsheet, color: 'purple' },
  { value: 'receipts', label: 'Receipts/Invoices', icon: FileText, color: 'green' },
  { value: 'contracts', label: 'Contracts', icon: FileText, color: 'orange' },
  { value: 'bank_statements', label: 'Bank Statements', icon: FileArchive, color: 'indigo' },
  { value: 'other', label: 'Other', icon: FolderOpen, color: 'gray' },
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
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  file_path: string;
  extracted_text?: string;
  linked_to?: {
    type: string;
    id: number;
    description: string;
  };
}

export default function DocumentsTab() {
  const { selectedEntityId } = useEntityContext();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    if (selectedEntityId) {
      fetchDocuments();
    }
  }, [selectedEntityId, categoryFilter]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      // Use direct fetch for now since api.documentsList might not exist
      const response = await fetch(`/api/accounting/documents/?entity_id=${selectedEntityId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('Documents API error:', response.status);
        setDocuments([]);
        return;
      }
      
      const data = await response.json();
      
      // Handle different response formats
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
        status: doc.processing_status || doc.status || 'uploaded',
        file_path: doc.file_path || doc.file_url || '',
        extracted_text: doc.extracted_text,
        linked_to: doc.linked_to,
      }));
      
      setDocuments(mappedDocs);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      // Set empty array on error
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

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
      formData.append('category', selectedCategory || 'other');
      
      console.log('FormData prepared, sending to:', '/api/accounting/documents/batch-upload');
      
      // Direct fetch to accounting documents endpoint
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
    const variants: Record<string, { color: string; icon: React.ReactNode }> = {
      uploaded: { color: 'blue', icon: <CheckCircle2 className="h-3 w-3" /> },
      processing: { color: 'yellow', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      processed: { color: 'green', icon: <CheckCircle2 className="h-3 w-3" /> },
      error: { color: 'red', icon: <AlertCircle className="h-3 w-3" /> },
    };
    
    const variant = variants[status] || variants.uploaded;
    
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        {variant.icon}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const handleViewDocument = async (doc: Document) => {
    try {
      // Use download endpoint which is properly configured
      window.open(`/api/accounting/documents/download/${doc.id}`, '_blank');
    } catch (error) {
      console.error('Failed to view document:', error);
      alert('Failed to open document');
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      // Use download endpoint
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

  const handleCopyLink = (doc: Document) => {
    const link = `${window.location.origin}/api${doc.file_path}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy link');
    });
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/accounting/documents/${docId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Delete failed');
      
      alert('Document deleted successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document');
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
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryInfo = (category: string) => {
    return DOCUMENT_CATEGORIES.find(c => c.value === category) || DOCUMENT_CATEGORIES[5];
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
          <h2 className="text-2xl font-bold tracking-tight">Document Center</h2>
          <p className="text-muted-foreground">
            Upload, organize, and manage all entity documents
          </p>
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
                Upload one or more documents. Supported formats: PDF, DOCX, XLSX, images.
                Documents will be automatically categorized and OCR-processed.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select Files</Label>
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.tiff"
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
                <Label htmlFor="category">Category (Optional - Auto-detected)</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                  disabled={uploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auto-detect category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto-detect">Auto-detect</SelectItem>
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-4">
                <p className="text-sm font-medium mb-2">Automatic Processing:</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
                    <span>OCR text extraction from PDFs and images</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
                    <span>Auto-categorization (Formation, Tax, Receipts, Contracts, etc.)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
                    <span>Invoice/receipt data extraction (amount, date, vendor)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
                    <span>Entity detection from document content</span>
                  </li>
                </ul>
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
                    Uploading...
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
            <p className="text-xs text-muted-foreground">Across all categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formation Docs</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(d => d.category === 'formation').length}
            </div>
            <p className="text-xs text-muted-foreground">Articles, agreements, bylaws</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax Documents</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(d => d.category === 'tax').length}
            </div>
            <p className="text-xs text-muted-foreground">Returns, receipts, forms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receipts/Invoices</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(d => d.category === 'receipts').length}
            </div>
            <p className="text-xs text-muted-foreground">Bills, invoices, receipts</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Document Library</CardTitle>
          <CardDescription>
            View, search, and manage all documents. Auto-categorized with OCR text extraction.
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
                {DOCUMENT_CATEGORIES.map((cat) => (
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
                  ? 'Upload your first document to get started'
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
                    <TableHead>Linked To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                          className="hover:bg-muted/50"
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
                            {doc.entity || 'Auto-detecting...'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatFileSize(doc.size)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(doc.upload_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{getStatusBadge(doc.status)}</TableCell>
                          <TableCell>
                            {doc.linked_to ? (
                              <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                <LinkIcon className="h-3 w-3" />
                                {doc.linked_to.type}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not linked</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleDownloadDocument(doc)} title="Download document">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleCopyLink(doc)} title="Copy link">
                                <LinkIcon className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc.id)} title="Delete document">
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
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

      {/* Processing Info */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            Intelligent Document Processing
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            All uploaded documents are automatically processed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Text Extraction (OCR)</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• PDFs: Full text extraction with pdfplumber/PyMuPDF</li>
                <li>• Images: PaddleOCR or Tesseract for text recognition</li>
                <li>• Word Docs: Native DOCX text extraction</li>
                <li>• Searchable: All extracted text is indexed</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Smart Categorization</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Auto-detect: Formation, Tax, Receipts, Contracts</li>
                <li>• Entity Detection: Links to correct NGI Capital entity</li>
                <li>• Invoice Parsing: Extracts amounts, dates, vendors</li>
                <li>• Linking: Auto-link to transactions and JEs</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
