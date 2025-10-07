# Epic 1: Documents Center - Comprehensive Document Management

## Epic Summary
Build a comprehensive, intelligent document management system that serves as the single source of truth for all NGI Capital and subsidiary entity documents. The system automatically extracts data from uploaded documents, categorizes them, tracks versions/amendments, and makes information available throughout the accounting system.

---

## Business Value
- **Audit Trail**: Complete document history for audits and compliance
- **Automation**: AI extraction reduces manual data entry by 80%
- **Investor Ready**: Professional document organization for due diligence
- **Entity Management**: Clear separation and consolidation of multi-entity docs
- **Time Savings**: Search and retrieve documents in seconds vs hours

---

## User Stories

### US-DOC-000: Batch Upload and Processing (QuickBooks-Style)
**As a** partner
**I want to** upload multiple documents at once and have them batch processed
**So that** I can efficiently manage large document volumes

**Acceptance Criteria**:
- [ ] Drag-and-drop up to 50 files simultaneously
- [ ] Bulk upload queue with progress indicators
- [ ] Auto-categorize by file name patterns (invoice, receipt, bank)
- [ ] Background processing with notifications
- [ ] Batch approval workflow for extracted data
- [ ] Email forwarding address for receipts (receipts@ngi.capital)

### US-DOC-001: Upload Formation Documents
**As a** partner
**I want to** upload formation documents (Articles, Operating Agreement, EIN)
**So that** the system creates the entity structure and initializes accounting

**Acceptance Criteria**:
- [ ] Upload PDF/Word/JPEG files up to 25MB
- [ ] System extracts: entity name, EIN, formation date, state, entity type
- [ ] Auto-creates entity record in database
- [ ] Displays extracted data for verification/correction
- [ ] Stores document with metadata (upload date, version, status)
- [ ] Shows success confirmation with entity details

### US-DOC-002: Version Control and Amendments
**As a** partner
**I want to** track document versions when amendments occur
**So that** I have a complete historical record

**Acceptance Criteria**:
- [ ] Mark document as "Original" or "Amendment #N"
- [ ] Link amendments to original document
- [ ] Display version history timeline
- [ ] Compare versions side-by-side
- [ ] Show effective dates for each version
- [ ] Download any version

### US-DOC-003: Entity Selector with Consolidated View
**As a** partner
**I want to** view documents for specific entities or consolidated
**So that** I can navigate multi-entity document structures

**Acceptance Criteria**:
- [ ] Dropdown shows "NGI Capital Inc. (Consolidated)" as default
- [ ] Lists all subsidiary entities
- [ ] Consolidated view shows all entity documents
- [ ] Entity-specific view filters to only that entity
- [ ] Document count badges per entity
- [ ] Persistent selection across page refreshes

### US-DOC-004: Search and Filter
**As a** partner
**I want to** search and filter documents by type, date, entity
**So that** I can quickly find specific documents

**Acceptance Criteria**:
- [ ] Full-text search across document content (OCR)
- [ ] Filter by: Document Type, Entity, Date Range, Status
- [ ] Search by: Filename, Vendor, Amount, Description
- [ ] Highlight search terms in results
- [ ] Save frequent searches
- [ ] Export search results to CSV

### US-DOC-005: Invoice Processing
**As a** partner
**I want to** upload invoices and have data auto-extracted
**So that** accounts payable entries are created automatically

**Acceptance Criteria**:
- [ ] Extract: Vendor, Invoice #, Date, Amount, Line items
- [ ] Create draft AP journal entry
- [ ] Link document to journal entry
- [ ] Flag extraction errors for review
- [ ] Auto-categorize line items to COA accounts
- [ ] Submit for approval workflow

### US-DOC-006: Receipt Processing
**As a** partner
**I want to** upload receipts with auto-extraction
**So that** expense entries are created automatically

**Acceptance Criteria**:
- [ ] Extract: Merchant, Date, Amount, Category
- [ ] Create draft expense journal entry
- [ ] OCR works on photos (mobile receipts)
- [ ] Suggest expense account from merchant
- [ ] Attach receipt image to journal entry
- [ ] Mobile-friendly upload interface

### US-DOC-007: Document Workflow Status
**As a** partner
**I want to** track document processing status
**So that** I know what needs attention

**Acceptance Criteria**:
- [ ] Status badges: Uploaded, Processing, Extracted, Approved, Archived
- [ ] Progress indicators for AI extraction
- [ ] Notification when processing complete
- [ ] Error alerts for failed extractions
- [ ] Bulk status updates
- [ ] Filter by status

### US-DOC-008: Document Categories with Icons
**As a** partner
**I want to** visually distinguish document types
**So that** I can quickly identify documents

**Acceptance Criteria**:
- [ ] Formation: Building icon, blue
- [ ] Legal: Scale icon, purple
- [ ] Banking: Dollar icon, green
- [ ] Invoices: File icon, orange
- [ ] Receipts: Receipt icon, yellow
- [ ] Tax: Document icon, red
- [ ] Controls: Shield icon, indigo
- [ ] Consistent iconography throughout UI

### US-DOC-009: Approval Workflows (NetSuite-Style)
**As a** partner
**I want to** route documents through approval workflows
**So that** proper authorization is maintained

**Acceptance Criteria**:
- [ ] Define approval rules by document type and amount
- [ ] Multi-level approval chains (Partner 1 → Partner 2 → Final)
- [ ] Email/Slack notifications for pending approvals
- [ ] Approve/reject with comments
- [ ] Audit trail of all approval actions
- [ ] Dashboard showing pending approvals count

### US-DOC-010: Email-to-Document (Receipt Bank Style)
**As a** partner
**I want to** forward receipts and invoices to a special email
**So that** they are automatically captured and processed

**Acceptance Criteria**:
- [ ] Unique email address per entity (ngillc@receipts.ngi.capital)
- [ ] Parse email attachments and inline images
- [ ] Extract sender info as potential vendor
- [ ] Automatically trigger AI extraction
- [ ] Add to pending review queue
- [ ] Mobile-friendly email forwarding

### US-DOC-011: Recurring Document Templates
**As a** partner
**I want to** save templates for recurring documents
**So that** I don't re-enter the same information monthly

**Acceptance Criteria**:
- [ ] Save document as template with default values
- [ ] Schedule recurring uploads (monthly rent, utilities)
- [ ] Auto-populate vendor, account, amount from template
- [ ] Override template values for current period
- [ ] Template library with search
- [ ] Clone template for similar documents

---

## Technical Requirements

### Backend API Endpoints

```python
# Document Management
POST   /api/accounting/documents/upload          # Upload single/multiple docs
GET    /api/accounting/documents                 # List with filters
GET    /api/accounting/documents/{id}            # Get single document
PUT    /api/accounting/documents/{id}            # Update metadata
DELETE /api/accounting/documents/{id}            # Soft delete (archive)
GET    /api/accounting/documents/{id}/download   # Download file
GET    /api/accounting/documents/{id}/preview    # PDF preview

# Document Extraction
POST   /api/accounting/documents/{id}/extract    # Trigger AI extraction
GET    /api/accounting/documents/{id}/extracted  # Get extracted data
PUT    /api/accounting/documents/{id}/verify     # User verifies extraction

# Version Control
POST   /api/accounting/documents/{id}/amendments # Create amendment
GET    /api/accounting/documents/{id}/versions   # Get version history
GET    /api/accounting/documents/{id}/compare/{version_id} # Compare versions

# Search
GET    /api/accounting/documents/search?q={query}&filters={json} # Search
GET    /api/accounting/documents/categories      # Get category counts
```

### Database Schema

```sql
CREATE TABLE accounting_documents (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES entities(id),
    document_type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by_id INTEGER REFERENCES partners(id),
    
    -- Version control
    is_amendment BOOLEAN DEFAULT FALSE,
    amendment_number INTEGER DEFAULT 0,
    original_document_id INTEGER REFERENCES accounting_documents(id),
    effective_date DATE,
    
    -- Status
    processing_status VARCHAR(50) DEFAULT 'uploaded',
    workflow_status VARCHAR(50) DEFAULT 'pending',
    
    -- Extracted metadata
    extracted_data JSONB,
    extraction_confidence DECIMAL(3,2),
    verified BOOLEAN DEFAULT FALSE,
    verified_by_id INTEGER REFERENCES partners(id),
    verified_at TIMESTAMPTZ,
    
    -- Search
    searchable_text TEXT,
    
    -- Soft delete
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archived_by_id INTEGER REFERENCES partners(id),
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_acc_docs_entity ON accounting_documents(entity_id);
CREATE INDEX idx_acc_docs_type ON accounting_documents(document_type);
CREATE INDEX idx_acc_docs_status ON accounting_documents(workflow_status);
CREATE INDEX idx_acc_docs_search ON accounting_documents USING gin(to_tsvector('english', searchable_text));
CREATE INDEX idx_acc_docs_date ON accounting_documents(upload_date DESC);

-- Document categories lookup
CREATE TABLE accounting_document_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    icon_name VARCHAR(50),
    color_class VARCHAR(50),
    description TEXT,
    required_for_entity BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0
);

-- Insert standard categories
INSERT INTO accounting_document_categories (category_name, display_name, icon_name, color_class, required_for_entity, sort_order) VALUES
('formation', 'Formation Documents', 'building', 'text-blue-600', TRUE, 1),
('legal', 'Legal Documents', 'scale', 'text-purple-600', FALSE, 2),
('banking', 'Banking Documents', 'dollar-sign', 'text-green-600', FALSE, 3),
('invoices', 'Invoices (AR)', 'file-text', 'text-orange-600', FALSE, 4),
('bills', 'Bills (AP)', 'receipt', 'text-red-600', FALSE, 5),
('receipts', 'Receipts', 'receipt', 'text-yellow-600', FALSE, 6),
('tax', 'Tax Documents', 'file', 'text-red-700', FALSE, 7),
('internal_controls', 'Internal Controls', 'shield', 'text-indigo-600', FALSE, 8);
```

### AI Document Extraction

```python
# Document extraction service
class DocumentExtractor:
    """
    Uses pypdf, python-docx, pytesseract for extraction
    """
    
    def extract_formation_document(self, file_path: str) -> dict:
        """
        Extracts from Articles of Organization/Incorporation
        Returns: {
            'entity_name': str,
            'entity_type': 'LLC' | 'C-Corp',
            'ein': str,
            'formation_date': date,
            'state': str,
            'registered_agent': str,
            'principal_address': dict
        }
        """
        
    def extract_invoice(self, file_path: str) -> dict:
        """
        Extracts invoice details
        Returns: {
            'vendor_name': str,
            'invoice_number': str,
            'invoice_date': date,
            'due_date': date,
            'total_amount': Decimal,
            'line_items': [
                {
                    'description': str,
                    'quantity': Decimal,
                    'unit_price': Decimal,
                    'amount': Decimal,
                    'suggested_account': str
                }
            ]
        }
        """
        
    def extract_receipt(self, file_path: str) -> dict:
        """
        Extracts receipt details (supports photos with OCR)
        Returns: {
            'merchant': str,
            'date': date,
            'total_amount': Decimal,
            'payment_method': str,
            'category': str,
            'suggested_account': str
        }
        """
        
    def extract_bank_statement(self, file_path: str) -> dict:
        """
        Extracts bank statement transactions
        Returns: {
            'bank_name': str,
            'account_number': str (masked),
            'statement_date': date,
            'beginning_balance': Decimal,
            'ending_balance': Decimal,
            'transactions': [
                {
                    'date': date,
                    'description': str,
                    'amount': Decimal,
                    'type': 'debit' | 'credit'
                }
            ]
        }
        """
```

### Frontend Components

```typescript
// DocumentsCenter.tsx - Main page
interface DocumentsCenterProps {
  entityId?: string;
}

// DocumentUploadZone.tsx - Drag-and-drop upload
interface UploadZoneProps {
  entityId: string;
  onUploadComplete: (documents: Document[]) => void;
  maxFileSize?: number; // default 25MB
  acceptedTypes?: string[]; // default: pdf, doc, docx, jpg, png
}

// DocumentCard.tsx - Document display card
interface DocumentCardProps {
  document: Document;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onAmend: () => void;
  showActions?: boolean;
}

// DocumentViewer.tsx - PDF/image preview modal
interface DocumentViewerProps {
  documentId: string;
  showExtractedData?: boolean;
}

// DocumentSearch.tsx - Search and filter component
interface DocumentSearchProps {
  onSearch: (query: string, filters: Filters) => void;
  entityId?: string;
}

// VersionTimeline.tsx - Document version history
interface VersionTimelineProps {
  documentId: string;
  versions: DocumentVersion[];
}
```

---

## UX/UI Design Specifications

### Layout
```
+----------------------------------------------------------+
|  Documents Center                    [Entity: Consolidated v] |
+----------------------------------------------------------+
|                                                            |
|  [Search...                        ] [Filter v] [Upload] |
|                                                            |
|  Categories (7):  Formation (3)  Legal (12)  Banking (24) |
|                   Invoices (45)  Receipts (128) Tax (8)   |
|                   Internal Controls (1)                    |
|                                                            |
+----------------------------------------------------------+
|  Recent Documents                                          |
|  +--------+  +--------+  +--------+  +--------+           |
|  |   []   |  |   []   |  |   []   |  |   []   |           |
|  | FILE1  |  | FILE2  |  | FILE3  |  | FILE4  |           |
|  | Formation|  | Invoice |  | Receipt |  | Tax  |           |
|  | 2 days  |  | 1 hour  |  | 3 hours |  | 1 week|           |
|  +--------+  +--------+  +--------+  +--------+           |
|                                                            |
|  All Documents (Table View)                                |
|  Filename | Category | Entity | Date | Status | Actions   |
|  --------------------------------------------------------  |
|  Articles | Formation| NGI LLC| 1/15 | Verified| [v][dl]  |
|  Invoice  | Bills    | NGI LLC| 10/1 | Extracted|[v][dl]  |
|  ...                                                       |
+----------------------------------------------------------+
```

### Document Card Design
```
+--------------------+
| [ICON] Category    |
|                    |
| Document Name...   |
| Entity: NGI LLC    |
|                    |
| Uploaded: 2d ago   |
| Status: [badge]    |
|                    |
| [View] [Download]  |
+--------------------+
```

### Upload Flow
1. Click "Upload" or drag files to zone
2. Show upload progress bar per file
3. After upload, show "Processing..." with spinner
4. When extraction complete, show modal with extracted data
5. User verifies/corrects extracted data
6. User clicks "Confirm" → Document saved with verified data

### Search Interface
```
+--------------------------------------------------+
| Search: [________________________] [Search Btn]  |
|                                                  |
| Filters:                                         |
| Category: [All v]  Entity: [All v]               |
| Date Range: [____] to [____]                     |
| Status: [All v]                                  |
|                                                  |
| [Clear Filters]  [Save Search]                   |
+--------------------------------------------------+
```

---

## Acceptance Tests

### Test Case 1: Upload Formation Document
**Precondition**: User logged in as partner
**Steps**:
1. Navigate to Documents Center
2. Click "Upload"
3. Select "Articles of Organization.pdf"
4. Wait for processing
5. Review extracted data: Entity name, EIN, formation date
6. Correct any errors
7. Click "Confirm"

**Expected**:
- Document appears in "Formation" category
- Entity created in entities table
- Extracted data matches document content (>95% accuracy)
- Document marked as "Verified"

### Test Case 2: Version Control - Amendment
**Precondition**: Original Operating Agreement uploaded
**Steps**:
1. Find "Operating Agreement.pdf" in documents list
2. Click "Create Amendment"
3. Upload "Amended Operating Agreement.pdf"
4. Mark effective date
5. Confirm

**Expected**:
- New document linked to original
- Version shows "Amendment 1"
- Timeline shows both versions
- Can download either version

### Test Case 3: Invoice Auto-Entry
**Precondition**: Chart of Accounts seeded
**Steps**:
1. Upload vendor invoice PDF
2. Wait for extraction
3. Review extracted data and suggested accounts
4. Confirm
5. Navigate to Journal Entries

**Expected**:
- Draft journal entry created
- Debit: Expense account (extracted)
- Credit: Accounts Payable
- Document attached to JE
- Amounts match invoice total

### Test Case 4: Search Functionality
**Steps**:
1. Enter "AWS" in search box
2. Apply filter: Category = "Receipts"
3. Date range: Last 30 days
4. Click Search

**Expected**:
- Results show only receipt documents mentioning AWS
- Within last 30 days
- Highlighted search terms in results
- Fast response (<500ms)

### Test Case 5: Entity-Specific View
**Steps**:
1. Select entity: "NGI Capital Advisory LLC"
2. View documents list

**Expected**:
- Only documents for that entity shown
- Document count badge updates
- Consolidated view shows all entities

---

## Performance Requirements

- Upload: Max 10 seconds for 25MB file
- Extraction: Max 30 seconds for complex PDFs
- Search: Results in <500ms
- Preview load: <2 seconds
- Bulk upload: 50 files simultaneously (QuickBooks standard)
- Email-to-document processing: Within 5 minutes
- Batch extraction queue: Process 100 documents/hour

---

## Security Requirements

- Documents encrypted at rest (AES-256)
- Access logged in audit trail
- Download links expire after 24 hours
- Soft delete (90-day retention before purge)
- Co-founder approval for document deletion

---

## Dependencies

- pypdf library for PDF extraction
- python-docx for Word document extraction
- pytesseract + Tesseract OCR for image/photo receipts
- Entity records in database
- Chart of Accounts for account suggestions

---

## Implementation Tasks

### Backend
- [ ] Create database schema (migrations)
- [ ] Build document upload API
- [ ] Implement AI extraction service
- [ ] Build search endpoint with full-text search
- [ ] Create version control logic
- [ ] Add soft delete functionality
- [ ] Write pytest tests (upload, extract, search, versions)

### Frontend
- [ ] Build DocumentsCenter page layout
- [ ] Create UploadZone component with drag-drop
- [ ] Build DocumentCard component
- [ ] Create DocumentViewer modal (PDF.js)
- [ ] Build search/filter interface
- [ ] Implement version timeline component
- [ ] Add entity selector with persistence
- [ ] Write Jest tests for all components

### Testing
- [ ] Unit tests for extraction service
- [ ] API integration tests
- [ ] E2E test: Upload → Extract → Verify workflow
- [ ] E2E test: Search and filter
- [ ] E2E test: Version control
- [ ] Performance test: Bulk upload (10 files)
- [ ] Load test: Search with 1000+ documents

---

## Rollout Plan

**Phase 1: MVP** (Week 1)
- Basic upload (no AI)
- Manual data entry
- Simple list view
- Entity selector

**Phase 2: AI Extraction** (Week 2)
- Formation document extraction
- Invoice extraction
- Receipt extraction
- Verification workflow

**Phase 3: Advanced** (Week 3)
- Version control
- Advanced search
- Bulk operations
- Mobile optimization

**Phase 4: Polish** (Week 3)
- UI animations
- Improved UX
- Performance optimization
- Final testing

---

## Success Metrics

- Document upload success rate: >99%
- AI extraction accuracy: >90%
- User satisfaction: >4/5 in testing
- Time to find document: <30 seconds (vs. 5+ minutes manual)
- Data entry time saved: 80% reduction

---

*End of Epic 1*

