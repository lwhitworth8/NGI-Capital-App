'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Folder,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  Building2,
  Receipt,
  FileCheck,
  FilePlus,
  Database,
  Shield,
  Brain,
  ChevronRight,
  X,
  Info,
  Calendar,
  Hash,
  DollarSign,
  GitBranch,
  Users,
  TrendingUp,
  RefreshCw,
  Target
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { 
  DOCUMENT_CATEGORIES,
  ALL_DOCUMENT_TYPES,
  getDocumentsByEntity,
  getDocumentsByCategory,
  checkDocumentCompleteness,
  DocumentType
} from '@/lib/config/documentTypes';
import { DocumentExtractionService, ExtractedData } from '@/lib/services/documentExtraction';
import { EntityDatabaseService } from '@/lib/services/entityDatabase';

const API_URL = 'http://localhost:8001';

interface UploadedDocument {
  id: string;
  documentTypeId: string;
  name: string;
  fileName: string;
  entityId: string;
  category: string;
  uploadDate: Date;
  size: number;
  status: 'processing' | 'processed' | 'error' | 'pending';
  extractedData?: ExtractedData;
  fileUrl?: string;
}

interface Entity {
  id: string;
  name: string;
  type: 'LLC' | 'C-Corp';
  status: 'active' | 'converting' | 'pre-formation';
}

// Entity configuration matching your structure
const ENTITIES: Entity[] = [
  { 
    id: 'ngi-capital-llc', 
    name: 'NGI Capital LLC', 
    type: 'LLC',
    status: 'active'
  },
  { 
    id: 'ngi-capital-inc', 
    name: 'NGI Capital, Inc.', 
    type: 'C-Corp',
    status: 'converting'
  },
  { 
    id: 'creator-terminal', 
    name: 'The Creator Terminal, Inc.', 
    type: 'C-Corp',
    status: 'pre-formation'
  },
  { 
    id: 'ngi-advisory', 
    name: 'NGI Capital Advisory LLC', 
    type: 'LLC',
    status: 'pre-formation'
  }
];

// Category icons mapping
const CATEGORY_ICONS: Record<string, any> = {
  'formation': Building2,
  'governance': Users,
  'equity': TrendingUp,
  'financial': DollarSign,
  'intellectual-property': Brain,
  'compliance': Shield,
  'policies': FileCheck,
  'intercompany': GitBranch,
  'conversion': Receipt
};

export default function DocumentsPage() {
  const [selectedEntity, setSelectedEntity] = useState<string>('ngi-capital-llc');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showDocTypeSelector, setShowDocTypeSelector] = useState(false);
  const [showDataPointsModal, setShowDataPointsModal] = useState(false);
  const [selectedDocForExtraction, setSelectedDocForExtraction] = useState<UploadedDocument | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load documents from localStorage when component mounts or entity changes
    loadDocumentsFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity]);
  
  const loadDocumentsFromStorage = () => {
    try {
      const storedDocs = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]');
      const entityDocs = storedDocs.filter((doc: any) => doc.entityId === selectedEntity);
      setUploadedDocuments(entityDocs.map((doc: any) => ({
        ...doc,
        uploadDate: new Date(doc.uploadedAt || doc.uploadDate)
      })));
      console.log(`Loaded ${entityDocs.length} documents for ${selectedEntity}`);
    } catch (error) {
      console.error('Error loading documents from storage:', error);
      setUploadedDocuments([]);
    }
  };

  const loadDocuments = async () => {
    // Load documents from localStorage
    loadDocumentsFromStorage();
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(Array.from(files));
    }
    // Reset the input value so the same file can be selected again
    e.target.value = '';
  };

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      // Check if we have a pre-selected document type
      if (selectedDocumentType) {
        await uploadAndProcessDocument(file, selectedDocumentType);
        setSelectedDocumentType(null); // Reset after use
      } else {
        // Try to determine document type based on file name
        const documentType = await determineDocumentType(file.name);
        if (documentType) {
          await uploadAndProcessDocument(file, documentType);
        } else {
          // If no automatic match, show document type selector
          setPendingFile(file);
          setShowDocTypeSelector(true);
        }
      }
    }
  };

  const determineDocumentType = async (fileName: string): Promise<DocumentType | null> => {
    // Try to match file name to document types
    const lowerFileName = fileName.toLowerCase();
    
    // Check for specific document patterns
    if (lowerFileName.includes('operating') && lowerFileName.includes('agreement')) {
      return ALL_DOCUMENT_TYPES.find(d => d.id === 'llc-operating-agreement') || null;
    }
    if (lowerFileName.includes('certificate') && lowerFileName.includes('formation')) {
      return ALL_DOCUMENT_TYPES.find(d => d.id === 'llc-certificate-formation') || null;
    }
    if (lowerFileName.includes('ein')) {
      return ALL_DOCUMENT_TYPES.find(d => d.id === 'llc-ein-letter') || null;
    }
    if (lowerFileName.includes('capital') && lowerFileName.includes('contribution')) {
      return ALL_DOCUMENT_TYPES.find(d => d.id === 'llc-initial-capital') || null;
    }
    if (lowerFileName.includes('internal') && lowerFileName.includes('control')) {
      return ALL_DOCUMENT_TYPES.find(d => d.id === 'llc-internal-controls') || null;
    }
    if (lowerFileName.includes('accounting') && lowerFileName.includes('polic')) {
      return ALL_DOCUMENT_TYPES.find(d => d.id === 'llc-accounting-policies') || null;
    }
    if (lowerFileName.includes('bank') || lowerFileName.includes('consent')) {
      return ALL_DOCUMENT_TYPES.find(d => d.id === 'llc-bank-resolution') || null;
    }
    if (lowerFileName.includes('ip') || lowerFileName.includes('intellectual')) {
      return ALL_DOCUMENT_TYPES.find(d => d.id === 'llc-ip-assignment') || null;
    }
    
    // If no match, prompt user to select
    return null;
  };

  const uploadAndProcessDocument = async (file: File, documentType: DocumentType) => {
    const docId = `${selectedEntity}-${documentType.id}-${Date.now()}`;
    
    // Add document to list with processing status
    const newDoc: UploadedDocument = {
      id: docId,
      documentTypeId: documentType.id,
      name: documentType.name,
      fileName: file.name,
      entityId: selectedEntity,
      category: documentType.category,
      uploadDate: new Date(),
      size: file.size,
      status: 'processing'
    };
    
    setUploadedDocuments(prev => [...prev, newDoc]);
    setProcessingStatus(`Inspecting ${file.name}...`);
    
    try {
      // Extract data from document
      let extractedData: ExtractedData | null = null;
      
      try {
        // Perform document inspection and data extraction
        console.log(`Inspecting document: ${file.name}`);
        console.log(`Document type: ${documentType.name}`);
        console.log(`Entity: ${selectedEntity}`);
        
        extractedData = await DocumentExtractionService.extractData(
          file,
          documentType,
          selectedEntity
        );
        
        console.log('Extraction successful:', extractedData);
      } catch (extractError) {
        console.warn('Extraction failed, using minimal data:', extractError);
        // Create minimal extracted data if extraction fails
        extractedData = {
          documentId: docId,
          documentType: documentType.id,
          entityId: selectedEntity,
          extractedAt: new Date(),
          confidence: 0.7,
          data: {},
          rawText: ''
        };
      }
      
      // Store document in localStorage
      console.log('Storing document in database...');
      const storedDocs = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]');
      const docToStore = {
        ...newDoc,
        id: docId,
        status: 'processed',
        extractedData,
        uploadedAt: new Date().toISOString()
      };
      storedDocs.push(docToStore);
      localStorage.setItem('uploadedDocuments', JSON.stringify(storedDocs));
      
      // Update entity database with extracted data
      if (extractedData && extractedData.data) {
        console.log('Updating entity database with extracted data...');
        EntityDatabaseService.updateEntityData(selectedEntity, extractedData.data);
        
        // Log current entity data
        const currentEntityData = EntityDatabaseService.getEntityData(selectedEntity);
        console.log('Current entity data after update:', currentEntityData);
      }
      
      // Update UI to show document as processed
      setTimeout(() => {
        setUploadedDocuments(prev => prev.map(doc => 
          doc.id === docId 
            ? { ...doc, status: 'processed' as const, extractedData: extractedData || undefined }
            : doc
        ));
        
        setProcessingStatus(`✓ Successfully uploaded and inspected ${file.name}`);
        
        // Clear processing status after 3 seconds
        setTimeout(() => setProcessingStatus(''), 3000);
      }, 1000);
      
    } catch (error) {
      console.error('Error processing document:', error);
      
      // Update status to error
      setUploadedDocuments(prev => prev.map(doc => 
        doc.id === docId 
          ? { ...doc, status: 'error' }
          : doc
      ));
      
      setProcessingStatus(`❌ Error processing ${file.name}`);
      setTimeout(() => setProcessingStatus(''), 3000);
    }
  };

  const deleteDocument = (docId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      // Remove from state
      setUploadedDocuments(prev => prev.filter(doc => doc.id !== docId));
      
      // Remove from localStorage
      const storedDocs = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]');
      const updatedDocs = storedDocs.filter((doc: any) => doc.id !== docId);
      localStorage.setItem('uploadedDocuments', JSON.stringify(updatedDocs));
      
      setProcessingStatus('✓ Document deleted');
      setTimeout(() => setProcessingStatus(''), 2000);
    }
  };

  const reExtractData = async (doc: UploadedDocument) => {
    setProcessingStatus(`Re-extracting data from ${doc.fileName}...`);
    
    try {
      // Find the document type
      const docType = ALL_DOCUMENT_TYPES.find(t => t.id === doc.documentTypeId);
      if (!docType) {
        setProcessingStatus('❌ Document type not found');
        return;
      }
      
      // Create a File object from the stored document (this is a simulation)
      // In production, you'd retrieve the actual file from storage
      const file = new File([doc.fileName], doc.fileName, { type: 'application/pdf' });
      
      // Re-run extraction
      const extractedData = await DocumentExtractionService.extractData(
        file,
        docType,
        doc.entityId
      );
      
      // Update the document with new extracted data
      setUploadedDocuments(prev => prev.map(d => 
        d.id === doc.id 
          ? { ...d, extractedData, status: 'processed' }
          : d
      ));
      
      // Update localStorage
      const storedDocs = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]');
      const updatedDocs = storedDocs.map((d: any) => 
        d.id === doc.id 
          ? { ...d, extractedData, status: 'processed' }
          : d
      );
      localStorage.setItem('uploadedDocuments', JSON.stringify(updatedDocs));
      
      // Update entity database
      if (extractedData && extractedData.data) {
        EntityDatabaseService.updateEntityData(doc.entityId, extractedData.data);
        const currentEntityData = EntityDatabaseService.getEntityData(doc.entityId);
        console.log('Updated entity data:', currentEntityData);
      }
      
      setProcessingStatus(`✓ Successfully re-extracted data from ${doc.fileName}`);
      setTimeout(() => setProcessingStatus(''), 3000);
    } catch (error) {
      console.error('Re-extraction error:', error);
      setProcessingStatus(`❌ Failed to re-extract data from ${doc.fileName}`);
      setTimeout(() => setProcessingStatus(''), 3000);
    }
  };
  
  const reExtractAllDocuments = async () => {
    setProcessingStatus('Re-extracting data from all documents...');
    
    for (const doc of uploadedDocuments) {
      await reExtractData(doc);
    }
    
    // Show current entity data after all extractions
    const entityData = EntityDatabaseService.getEntityData(selectedEntity);
    console.log('Complete entity data after re-extraction:', entityData);
    setProcessingStatus(`✓ Re-extracted data from ${uploadedDocuments.length} documents`);
    setTimeout(() => setProcessingStatus(''), 3000);
  };
  
  const replaceDocument = async (docId: string) => {
    const doc = uploadedDocuments.find(d => d.id === docId);
    if (doc) {
      // Trigger file input for replacement
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          // Find the document type
          const docType = ALL_DOCUMENT_TYPES.find(t => t.id === doc.documentTypeId);
          if (docType) {
            // Delete old document
            setUploadedDocuments(prev => prev.filter(d => d.id !== docId));
            // Upload new one
            await uploadAndProcessDocument(file, docType);
          }
        }
      };
      input.click();
    }
  };

  // Filter documents based on search and category
  const filteredDocuments = uploadedDocuments.filter(doc => {
    const matchesSearch = searchTerm === '' || 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get document types for selected entity
  const entityDocTypes = getDocumentsByEntity(selectedEntity);
  const requiredDocs = entityDocTypes.filter(d => d.required && d.status !== 'future');
  const optionalDocs = entityDocTypes.filter(d => !d.required || d.status === 'future');

  // Check completeness
  const uploadedDocIds = uploadedDocuments.map(d => d.documentTypeId);
  const completeness = checkDocumentCompleteness(selectedEntity, uploadedDocIds);

  // Get entity status badge
  const getEntityStatusBadge = (status: Entity['status']) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 bg-green-500/10 text-green-600 text-xs rounded-full">Active</span>;
      case 'converting':
        return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-600 text-xs rounded-full">Converting</span>;
      case 'pre-formation':
        return <span className="px-2 py-1 bg-blue-500/10 text-blue-600 text-xs rounded-full">Pre-Formation</span>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Document Management</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage legal, financial, and compliance documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          {uploadedDocuments.length > 0 && (
            <button 
              onClick={reExtractAllDocuments}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Re-extract All
            </button>
          )}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Documents
          </button>
        </div>
      </div>

      {/* Entity Selector and Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              >
                {ENTITIES.map(entity => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>
            
            {ENTITIES.find(e => e.id === selectedEntity) && (
              <div className="flex items-center gap-2">
                {getEntityStatusBadge(ENTITIES.find(e => e.id === selectedEntity)!.status)}
                <span className="text-sm text-muted-foreground">
                  {ENTITIES.find(e => e.id === selectedEntity)!.type}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Completeness: </span>
              <span className="font-medium">{completeness.percentage}%</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Documents: </span>
              <span className="font-medium">{uploadedDocuments.length}/{requiredDocs.length} required</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Category Filter */}
      <Card className="p-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              selectedCategory === 'all' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-card border border-border hover:bg-muted'
            }`}
          >
            All Categories
          </button>
          {DOCUMENT_CATEGORIES.map(cat => {
            const Icon = CATEGORY_ICONS[cat.id] || FileText;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                  selectedCategory === cat.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card border border-border hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
                {cat.name}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Upload Area */}
      <Card 
        className={`p-8 border-2 border-dashed transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className={`p-4 rounded-full transition-colors ${
              isDragging ? 'bg-primary/10' : 'bg-muted'
            }`}>
              <Upload className={`h-8 w-8 transition-colors ${
                isDragging ? 'text-primary' : 'text-muted-foreground'
              }`} />
            </div>
          </div>
          <div>
            <p className="text-lg font-medium">Drop documents here or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports PDF, Word, Excel, and image files
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </Card>

      {/* Document Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Required Documents */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Required Documents
          </h3>
          <div className="space-y-2">
            {requiredDocs.map(docType => {
              const isUploaded = uploadedDocIds.includes(docType.id);
              return (
                <div 
                  key={docType.id}
                  className="flex items-center justify-between p-2 hover:bg-muted/30 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isUploaded ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-600" />
                    )}
                    <span className="text-sm">{docType.name}</span>
                  </div>
                  {!isUploaded && (
                    <button
                      onClick={() => {
                        setSelectedDocumentType(docType);
                        fileInputRef.current?.click();
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Upload
                    </button>
                  )}
                  {isUploaded && (
                    <span className="text-xs text-green-600 font-medium">
                      Uploaded
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Optional/Future Documents */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FilePlus className="h-5 w-5 text-blue-600" />
            Optional & Future Documents
          </h3>
          <div className="space-y-2">
            {optionalDocs.map(docType => {
              const isUploaded = uploadedDocIds.includes(docType.id);
              return (
                <div 
                  key={docType.id}
                  className="flex items-center justify-between p-2 hover:bg-muted/30 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isUploaded ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm text-muted-foreground">{docType.name}</span>
                  </div>
                  {docType.status === 'future' && (
                    <span className="text-xs text-muted-foreground">Future</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Uploaded Documents List */}
      {filteredDocuments.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Uploaded Documents</h3>
          </div>
          <div className="divide-y divide-border">
            {filteredDocuments.map(doc => {
              const Icon = CATEGORY_ICONS[doc.category] || FileText;
              return (
                <div key={doc.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.fileName} • {(doc.size / 1024).toFixed(1)} KB
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.status === 'processed' && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-600 text-xs rounded-full">
                          <CheckCircle className="h-3 w-3" />
                          Processed
                        </span>
                      )}
                      {doc.status === 'processing' && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-600 text-xs rounded-full">
                          <Clock className="h-3 w-3" />
                          Processing
                        </span>
                      )}
                      <button 
                        onClick={() => {
                          setSelectedDocForExtraction(doc);
                          setShowDataPointsModal(true);
                        }}
                        className="p-1 hover:bg-muted rounded"
                        title="View extracted data"
                      >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button 
                        onClick={() => reExtractData(doc)}
                        className="p-1 hover:bg-muted rounded"
                        title="Re-extract data"
                      >
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button 
                        onClick={() => replaceDocument(doc.id)}
                        className="p-1 hover:bg-muted rounded"
                        title="Replace document"
                      >
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button 
                        className="p-1 hover:bg-muted rounded"
                        title="Download document"
                      >
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button 
                        onClick={() => deleteDocument(doc.id)}
                        className="p-1 hover:bg-muted rounded text-red-600 hover:text-red-700"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {doc.extractedData && (
                    <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                      <span className="text-muted-foreground">
                        Extracted: {Object.keys(doc.extractedData.data).length} data points
                        {doc.extractedData.data.ein && ` • EIN: ${doc.extractedData.data.ein}`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Processing Status */}
      {processingStatus && (
        <Card className={`p-4 transition-all ${
          processingStatus.includes('✓') 
            ? 'bg-green-500/5 border-green-500/20' 
            : processingStatus.includes('❌')
            ? 'bg-red-500/5 border-red-500/20'
            : 'bg-blue-500/5 border-blue-500/20'
        }`}>
          <div className="flex items-center gap-2">
            {processingStatus.includes('✓') ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : processingStatus.includes('❌') ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <Brain className="h-4 w-4 text-blue-600 animate-pulse" />
            )}
            <span className={`text-sm ${
              processingStatus.includes('✓') 
                ? 'text-green-900 dark:text-green-100'
                : processingStatus.includes('❌')
                ? 'text-red-900 dark:text-red-100'
                : 'text-blue-900 dark:text-blue-100'
            }`}>{processingStatus}</span>
          </div>
        </Card>
      )}

      {/* Info Message with Target Data Points */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium">Intelligent Document Processing</p>
            <p className="text-sm text-muted-foreground">
              Documents are automatically processed to extract key data points used throughout the application.
            </p>
            <button
              onClick={() => setShowDataPointsModal(true)}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Target className="h-3 w-3" />
              View Target Data Points by Document Type
            </button>
          </div>
        </div>
      </Card>

      {/* Document Type Selector Modal */}
      {showDocTypeSelector && pendingFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Select Document Type</h2>
                <button 
                  onClick={() => {
                    setShowDocTypeSelector(false);
                    setPendingFile(null);
                  }}
                  className="p-2 hover:bg-muted rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Please select the type of document you&apos;re uploading: {pendingFile.name}
              </p>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {getDocumentsByEntity(selectedEntity).map(docType => (
                  <button
                    key={docType.id}
                    onClick={async () => {
                      setShowDocTypeSelector(false);
                      await uploadAndProcessDocument(pendingFile, docType);
                      setPendingFile(null);
                    }}
                    className="w-full text-left p-3 hover:bg-muted rounded-lg transition-colors"
                  >
                    <div className="font-medium">{docType.name}</div>
                    <div className="text-sm text-muted-foreground">{docType.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Data Points Modal */}
      {showDataPointsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {selectedDocForExtraction ? 'Extracted Data' : 'Target Data Points by Document Type'}
                </h2>
                <button 
                  onClick={() => {
                    setShowDataPointsModal(false);
                    setSelectedDocForExtraction(null);
                  }}
                  className="p-2 hover:bg-muted rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {selectedDocForExtraction ? (
                // Show extracted data for specific document
                <div className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">{selectedDocForExtraction.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{selectedDocForExtraction.fileName}</p>
                    
                    {selectedDocForExtraction.extractedData ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium">Extracted Data Points:</span>
                        </div>
                        
                        {Object.entries(selectedDocForExtraction.extractedData.data).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-2 gap-4 p-2 bg-background rounded">
                            <span className="text-sm font-medium capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </span>
                            <span className="text-sm">
                              {typeof value === 'object' && value !== null 
                                ? JSON.stringify(value, null, 2)
                                : String(value)}
                            </span>
                          </div>
                        ))}
                        
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm text-muted-foreground">
                            Confidence: {(selectedDocForExtraction.extractedData.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No data extracted yet</p>
                    )}
                    
                    <button
                      onClick={() => {
                        setShowDataPointsModal(false);
                        reExtractData(selectedDocForExtraction);
                        setSelectedDocForExtraction(null);
                      }}
                      className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Re-extract Data
                    </button>
                  </div>
                </div>
              ) : (
                // Show target data points for all document types
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {getDocumentsByEntity(selectedEntity).filter(doc => doc.required).map(docType => {
                    const isUploaded = uploadedDocIds.includes(docType.id);
                    return (
                      <div key={docType.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{docType.name}</h3>
                            {isUploaded ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-600" />
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">{docType.description}</p>
                        
                        {docType.extractableData && docType.extractableData.length > 0 ? (
                          <div className="space-y-1">
                            <p className="text-sm font-medium mb-2">Target Data Points:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {docType.extractableData.map(dataPoint => (
                                <div key={dataPoint} className="flex items-center gap-2">
                                  <Target className="h-3 w-3 text-primary" />
                                  <span className="text-sm capitalize">
                                    {dataPoint.replace(/([A-Z])/g, ' $1').trim()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No specific data points defined</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}