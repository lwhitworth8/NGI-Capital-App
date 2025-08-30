/**
 * Document Types Configuration for NGI Capital Multi-Entity Structure
 * Defines all document categories and types for LLC, C-Corp, and subsidiary entities
 */

export interface DocumentType {
  id: string;
  name: string;
  category: string;
  entityTypes: ('LLC' | 'C-Corp' | 'All')[];
  required: boolean;
  description: string;
  extractableData?: string[];
  status?: 'active' | 'future' | 'pending';
}

export interface DocumentCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  order: number;
}

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: 'formation',
    name: 'Formation Documents',
    description: 'Legal formation and organizational documents',
    order: 1
  },
  {
    id: 'governance',
    name: 'Governance & Compliance',
    description: 'Board resolutions, consents, and meeting minutes',
    order: 2
  },
  {
    id: 'equity',
    name: 'Equity & Ownership',
    description: 'Stock certificates, cap tables, and purchase agreements',
    order: 3
  },
  {
    id: 'financial',
    name: 'Financial & Banking',
    description: 'Banking resolutions, EIN letters, and financial policies',
    order: 4
  },
  {
    id: 'intellectual-property',
    name: 'Intellectual Property',
    description: 'IP assignments and technology transfer agreements',
    order: 5
  },
  {
    id: 'compliance',
    name: 'State & Tax Compliance',
    description: 'State filings, franchise tax, and regulatory documents',
    order: 6
  },
  {
    id: 'policies',
    name: 'Policies & Controls',
    description: 'Internal controls, accounting policies, and procedures',
    order: 7
  },
  {
    id: 'intercompany',
    name: 'Intercompany Agreements',
    description: 'Agreements between affiliated entities',
    order: 8
  },
  {
    id: 'conversion',
    name: 'Conversion Documents',
    description: 'LLC to C-Corp conversion documents',
    order: 9
  }
];

// NGI Capital LLC (Original Entity) Documents
export const NGI_CAPITAL_LLC_DOCUMENTS: DocumentType[] = [
  // Formation
  {
    id: 'llc-certificate-formation',
    name: 'Certificate of Formation',
    category: 'formation',
    entityTypes: ['LLC'],
    required: true,
    description: 'Delaware LLC Certificate of Formation',
    extractableData: ['entityName', 'formationDate', 'registeredAgent', 'principalAddress'],
    status: 'active'
  },
  {
    id: 'llc-operating-agreement',
    name: 'Operating Agreement',
    category: 'formation',
    entityTypes: ['LLC'],
    required: true,
    description: 'LLC Operating Agreement defining member rights and responsibilities',
    extractableData: ['members', 'ownershipPercentages', 'managementStructure', 'votingRights'],
    status: 'active'
  },
  
  // Financial
  {
    id: 'llc-initial-capital',
    name: 'Initial Capital Contribution Record',
    category: 'financial',
    entityTypes: ['LLC'],
    required: true,
    description: 'Record of initial member capital contributions',
    extractableData: ['contributionAmounts', 'contributionDates', 'memberNames'],
    status: 'active'
  },
  {
    id: 'llc-ein-letter',
    name: 'EIN Assignment Letter',
    category: 'financial',
    entityTypes: ['LLC'],
    required: true,
    description: 'IRS EIN assignment letter',
    extractableData: ['ein', 'entityName', 'assignmentDate'],
    status: 'active'
  },
  {
    id: 'llc-bank-resolution',
    name: 'Member Consent - Bank Account Opening',
    category: 'financial',
    entityTypes: ['LLC'],
    required: true,
    description: 'Member consent authorizing bank account opening',
    extractableData: ['authorizedSigners', 'bankName', 'accountTypes'],
    status: 'active'
  },
  
  // IP
  {
    id: 'llc-ip-assignment',
    name: 'Intellectual Property Assignment Agreements',
    category: 'intellectual-property',
    entityTypes: ['LLC'],
    required: true,
    description: 'IP assignment from founders to LLC',
    extractableData: ['assignors', 'ipDescription', 'effectiveDate'],
    status: 'active'
  },
  
  // Governance
  {
    id: 'llc-consent-lieu',
    name: 'Consent to Action in Lieu of Meeting',
    category: 'governance',
    entityTypes: ['LLC'],
    required: false,
    description: 'Written consent for actions without formal meeting',
    extractableData: ['consentDate', 'actions', 'signatories'],
    status: 'active'
  },
  
  // Policies
  {
    id: 'llc-internal-controls',
    name: 'Internal Controls and Accounting Policies Manual',
    category: 'policies',
    entityTypes: ['LLC'],
    required: true,
    description: 'Comprehensive internal controls and policies document',
    extractableData: ['controlCategories', 'policies', 'procedures', 'approvalMatrix'],
    status: 'active'
  },
  {
    id: 'llc-accounting-policies',
    name: 'Documented Accounting Policies',
    category: 'policies',
    entityTypes: ['LLC'],
    required: true,
    description: 'Detailed accounting policies and procedures',
    extractableData: ['revenueRecognition', 'expenseCategories', 'depreciationMethods'],
    status: 'active'
  },
  
  // Future Conversion Documents
  {
    id: 'llc-conversion-certificate',
    name: 'Certificate of Conversion',
    category: 'conversion',
    entityTypes: ['LLC'],
    required: false,
    description: 'Certificate converting LLC to Corporation',
    extractableData: ['conversionDate', 'newEntityType', 'continuityProvisions'],
    status: 'future'
  },
  {
    id: 'llc-conversion-consent',
    name: 'Member Consent Approving Conversion',
    category: 'conversion',
    entityTypes: ['LLC'],
    required: false,
    description: 'Member consent to convert LLC to C-Corp',
    extractableData: ['consentDate', 'approvedBy', 'conversionTerms'],
    status: 'future'
  }
];

// NGI Capital, Inc. (Delaware C-Corp Holding Company) Documents
export const NGI_CAPITAL_INC_DOCUMENTS: DocumentType[] = [
  // Formation
  {
    id: 'corp-certificate-incorporation',
    name: 'Certificate of Incorporation',
    category: 'formation',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Delaware Certificate of Incorporation',
    extractableData: ['corporationName', 'incorporationDate', 'authorizedShares', 'parValue'],
    status: 'pending'
  },
  {
    id: 'corp-bylaws',
    name: 'Corporate Bylaws',
    category: 'formation',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Corporate bylaws governing operations',
    extractableData: ['boardStructure', 'officerRoles', 'meetingRequirements', 'votingRules'],
    status: 'pending'
  },
  
  // Governance
  {
    id: 'corp-initial-board-consent',
    name: 'Initial Board Consent',
    category: 'governance',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Initial board organizational consent',
    extractableData: ['directors', 'officers', 'initialResolutions'],
    status: 'pending'
  },
  {
    id: 'corp-board-resolutions',
    name: 'Board Resolutions',
    category: 'governance',
    entityTypes: ['C-Corp'],
    required: false,
    description: 'Ongoing board resolutions',
    extractableData: ['resolutionDate', 'resolutionText', 'approvedBy'],
    status: 'pending'
  },
  {
    id: 'corp-board-minutes',
    name: 'Board Meeting Minutes',
    category: 'governance',
    entityTypes: ['C-Corp'],
    required: false,
    description: 'Minutes from board meetings',
    extractableData: ['meetingDate', 'attendees', 'resolutions', 'actions'],
    status: 'future'
  },
  
  // Equity
  {
    id: 'corp-stock-purchase',
    name: 'Stock Purchase Agreements',
    category: 'equity',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Founder stock purchase agreements',
    extractableData: ['purchaser', 'shares', 'pricePerShare', 'vestingSchedule'],
    status: 'pending'
  },
  {
    id: 'corp-stock-ledger',
    name: 'Stock Ledger and Cap Table',
    category: 'equity',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Official stock ledger and capitalization table',
    extractableData: ['shareholders', 'shareClasses', 'ownership', 'fullyDiluted'],
    status: 'pending'
  },
  {
    id: 'corp-stock-certificates',
    name: 'Stock Certificates',
    category: 'equity',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Issued stock certificates',
    extractableData: ['certificateNumber', 'shareholder', 'shares', 'issueDate'],
    status: 'pending'
  },
  
  // Financial
  {
    id: 'corp-ein-letter',
    name: 'EIN Assignment Letter',
    category: 'financial',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'IRS EIN assignment for corporation',
    extractableData: ['ein', 'corporationName', 'assignmentDate'],
    status: 'pending'
  },
  {
    id: 'corp-bank-resolution',
    name: 'Bank Account Opening Resolution',
    category: 'financial',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Board resolution for bank accounts',
    extractableData: ['authorizedSigners', 'bankName', 'accountTypes', 'signingLimits'],
    status: 'pending'
  },
  
  // IP
  {
    id: 'corp-ip-assignment-llc',
    name: 'IP Assignment from LLC',
    category: 'intellectual-property',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'IP transfer from LLC to C-Corp',
    extractableData: ['transferredIP', 'effectiveDate', 'consideration'],
    status: 'pending'
  },
  
  // Compliance
  {
    id: 'corp-foreign-qual-ca',
    name: 'Foreign Qualification - California',
    category: 'compliance',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'California foreign corporation registration',
    extractableData: ['qualificationDate', 'californiaNumber'],
    status: 'future'
  },
  {
    id: 'corp-ca-statement-info',
    name: 'California Statement of Information',
    category: 'compliance',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Annual California SI-550',
    extractableData: ['filingDate', 'officers', 'principalAddress'],
    status: 'future'
  },
  {
    id: 'corp-de-franchise-tax',
    name: 'Delaware Annual Franchise Tax Report',
    category: 'compliance',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Annual Delaware franchise tax filing',
    extractableData: ['taxYear', 'authorizedShares', 'parValue', 'taxAmount'],
    status: 'future'
  },
  {
    id: 'corp-registered-agent',
    name: 'Registered Agent Agreement',
    category: 'compliance',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Delaware registered agent service agreement',
    extractableData: ['agentName', 'agentAddress', 'effectiveDate'],
    status: 'pending'
  },
  
  // Policies
  {
    id: 'corp-internal-controls',
    name: 'C-Corp Level Internal Controls',
    category: 'policies',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Corporate-level internal control policies',
    extractableData: ['controlFramework', 'riskAssessment', 'controlActivities'],
    status: 'pending'
  }
];

// The Creator Terminal, Inc. (Delaware C-Corp Subsidiary) Documents
export const CREATOR_TERMINAL_DOCUMENTS: DocumentType[] = [
  // Formation
  {
    id: 'ct-certificate-incorporation',
    name: 'Certificate of Incorporation',
    category: 'formation',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Delaware Certificate of Incorporation for Creator Terminal',
    extractableData: ['corporationName', 'incorporationDate', 'authorizedShares'],
    status: 'pending'
  },
  {
    id: 'ct-bylaws',
    name: 'Corporate Bylaws',
    category: 'formation',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Creator Terminal bylaws',
    extractableData: ['boardStructure', 'officers', 'governance'],
    status: 'pending'
  },
  {
    id: 'ct-board-consent',
    name: 'Initial Board Consent',
    category: 'governance',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Initial board consent for Creator Terminal',
    extractableData: ['directors', 'officers', 'resolutions'],
    status: 'pending'
  },
  
  // Equity
  {
    id: 'ct-stock-ledger',
    name: 'Stock Ledger',
    category: 'equity',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Creator Terminal stock ledger',
    extractableData: ['shareholders', 'shares', 'ownership'],
    status: 'pending'
  },
  {
    id: 'ct-stock-certificates',
    name: 'Stock Certificates',
    category: 'equity',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Issued stock certificates to NGI Capital, Inc.',
    extractableData: ['certificateNumber', 'shares', 'issueDate'],
    status: 'pending'
  },
  {
    id: 'ct-stock-subscription',
    name: 'Stock Subscription Agreement',
    category: 'equity',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'NGI Capital, Inc. subscription for Creator Terminal stock',
    extractableData: ['subscriber', 'shares', 'consideration'],
    status: 'pending'
  },
  
  // Financial
  {
    id: 'ct-ein-letter',
    name: 'EIN Assignment Letter',
    category: 'financial',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'IRS EIN for Creator Terminal',
    extractableData: ['ein', 'entityName', 'assignmentDate'],
    status: 'pending'
  },
  {
    id: 'ct-bank-resolution',
    name: 'Bank Account Opening Resolution',
    category: 'financial',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Board resolution for Creator Terminal bank accounts',
    extractableData: ['authorizedSigners', 'bankName', 'accountTypes'],
    status: 'pending'
  },
  
  // IP & Intercompany
  {
    id: 'ct-ip-agreements',
    name: 'IP and Ownership Agreements',
    category: 'intellectual-property',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'IP assignments for Creator Terminal platform',
    extractableData: ['ipDescription', 'ownership', 'licenses'],
    status: 'pending'
  },
  {
    id: 'ct-intercompany-contribution',
    name: 'Intercompany Capital Contribution Agreement',
    category: 'intercompany',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Capital contribution from NGI Capital, Inc.',
    extractableData: ['contributionAmount', 'terms', 'date'],
    status: 'pending'
  },
  
  // Compliance
  {
    id: 'ct-foreign-qual-ca',
    name: 'Foreign Qualification - California',
    category: 'compliance',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'California foreign corporation registration',
    extractableData: ['qualificationDate', 'californiaNumber'],
    status: 'future'
  },
  {
    id: 'ct-ca-si-550',
    name: 'California SI-550',
    category: 'compliance',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'California Statement of Information',
    extractableData: ['filingDate', 'officers', 'address'],
    status: 'future'
  },
  {
    id: 'ct-de-franchise-tax',
    name: 'Delaware Franchise Tax Report',
    category: 'compliance',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Annual Delaware franchise tax',
    extractableData: ['taxYear', 'taxAmount'],
    status: 'future'
  },
  {
    id: 'ct-registered-agent',
    name: 'Registered Agent Agreement',
    category: 'compliance',
    entityTypes: ['C-Corp'],
    required: true,
    description: 'Delaware registered agent for Creator Terminal',
    extractableData: ['agentName', 'agentAddress'],
    status: 'pending'
  }
];

// NGI Capital Advisory LLC (Delaware LLC Subsidiary) Documents
export const NGI_ADVISORY_DOCUMENTS: DocumentType[] = [
  // Formation
  {
    id: 'adv-certificate-formation',
    name: 'Certificate of Formation',
    category: 'formation',
    entityTypes: ['LLC'],
    required: true,
    description: 'Delaware LLC Certificate for NGI Advisory',
    extractableData: ['entityName', 'formationDate', 'registeredAgent'],
    status: 'pending'
  },
  {
    id: 'adv-operating-agreement',
    name: 'Operating Agreement',
    category: 'formation',
    entityTypes: ['LLC'],
    required: true,
    description: 'NGI Advisory LLC Operating Agreement',
    extractableData: ['members', 'ownership', 'management'],
    status: 'pending'
  },
  
  // Governance
  {
    id: 'adv-board-consent',
    name: 'NGI Capital Board Consent Approving Formation',
    category: 'governance',
    entityTypes: ['LLC'],
    required: true,
    description: 'Parent company consent to form subsidiary',
    extractableData: ['approvalDate', 'boardMembers', 'resolutions'],
    status: 'pending'
  },
  
  // Ownership
  {
    id: 'adv-membership-ledger',
    name: 'Membership Ledger',
    category: 'equity',
    entityTypes: ['LLC'],
    required: true,
    description: 'Record of LLC membership interests',
    extractableData: ['members', 'percentages', 'capitalAccounts'],
    status: 'pending'
  },
  
  // Financial
  {
    id: 'adv-ein-letter',
    name: 'EIN Assignment Letter',
    category: 'financial',
    entityTypes: ['LLC'],
    required: true,
    description: 'IRS EIN for NGI Advisory',
    extractableData: ['ein', 'entityName', 'assignmentDate'],
    status: 'pending'
  },
  {
    id: 'adv-bank-resolution',
    name: 'Bank Account Opening Resolution',
    category: 'financial',
    entityTypes: ['LLC'],
    required: true,
    description: 'Resolution for NGI Advisory bank accounts',
    extractableData: ['authorizedSigners', 'bankName', 'accountTypes'],
    status: 'pending'
  },
  
  // Intercompany
  {
    id: 'adv-intercompany-contribution',
    name: 'Intercompany Contribution Agreements',
    category: 'intercompany',
    entityTypes: ['LLC'],
    required: false,
    description: 'Capital contributions from parent',
    extractableData: ['contributionAmount', 'terms', 'date'],
    status: 'future'
  },
  
  // Future Client Agreements
  {
    id: 'adv-service-agreements',
    name: 'Service Agreements with Clients',
    category: 'intercompany',
    entityTypes: ['LLC'],
    required: false,
    description: 'Advisory service agreements',
    extractableData: ['clientName', 'services', 'fees', 'term'],
    status: 'future'
  },
  {
    id: 'adv-contractor-agreements',
    name: 'Independent Contractor Agreements',
    category: 'intercompany',
    entityTypes: ['LLC'],
    required: false,
    description: 'Agreements with student contractors',
    extractableData: ['contractorName', 'services', 'compensation'],
    status: 'future'
  },
  
  // Compliance
  {
    id: 'adv-ca-llc-statement',
    name: 'California LLC Statement of Information',
    category: 'compliance',
    entityTypes: ['LLC'],
    required: true,
    description: 'California LLC-12',
    extractableData: ['filingDate', 'members', 'address'],
    status: 'future'
  },
  {
    id: 'adv-de-franchise-tax',
    name: 'Delaware Franchise Tax',
    category: 'compliance',
    entityTypes: ['LLC'],
    required: true,
    description: 'Annual Delaware LLC tax',
    extractableData: ['taxYear', 'taxAmount'],
    status: 'future'
  },
  {
    id: 'adv-registered-agent',
    name: 'Registered Agent Information',
    category: 'compliance',
    entityTypes: ['LLC'],
    required: true,
    description: 'Delaware registered agent for Advisory',
    extractableData: ['agentName', 'agentAddress'],
    status: 'pending'
  }
];

// Consolidated/Group Documents
export const CONSOLIDATED_DOCUMENTS: DocumentType[] = [
  {
    id: 'group-intercompany-agreements',
    name: 'Intercompany Agreements Bundle',
    category: 'intercompany',
    entityTypes: ['All'],
    required: false,
    description: 'Funding, IP, and management services agreements between entities',
    extractableData: ['parties', 'agreementType', 'terms', 'consideration'],
    status: 'future'
  },
  {
    id: 'group-accounting-policies',
    name: 'Consolidated Accounting Policies (U.S. GAAP)',
    category: 'policies',
    entityTypes: ['All'],
    required: true,
    description: 'Group-wide GAAP accounting policies',
    extractableData: ['consolidationMethod', 'eliminationEntries', 'policies'],
    status: 'future'
  },
  {
    id: 'group-internal-controls',
    name: 'Consolidated Internal Controls Manual',
    category: 'policies',
    entityTypes: ['All'],
    required: true,
    description: 'Enterprise-wide internal control framework',
    extractableData: ['controlFramework', 'riskMatrix', 'procedures'],
    status: 'future'
  },
  {
    id: 'group-filing-calendar',
    name: 'Calendar of Filing Deadlines',
    category: 'compliance',
    entityTypes: ['All'],
    required: true,
    description: 'Delaware franchise tax, California filings, IRS deadlines',
    extractableData: ['deadlines', 'filingTypes', 'responsibleParty'],
    status: 'future'
  },
  {
    id: 'group-audit-trail',
    name: 'Audit Trail Documentation',
    category: 'compliance',
    entityTypes: ['All'],
    required: false,
    description: 'Reconciliations, board minutes, signed consents',
    extractableData: ['auditDate', 'findings', 'adjustments'],
    status: 'future'
  }
];

// Combine all document types for easy access
export const ALL_DOCUMENT_TYPES: DocumentType[] = [
  ...NGI_CAPITAL_LLC_DOCUMENTS,
  ...NGI_CAPITAL_INC_DOCUMENTS,
  ...CREATOR_TERMINAL_DOCUMENTS,
  ...NGI_ADVISORY_DOCUMENTS,
  ...CONSOLIDATED_DOCUMENTS
];

// Helper function to get documents by entity
export function getDocumentsByEntity(entityId: string): DocumentType[] {
  switch (entityId) {
    case 'ngi-capital-llc':
      return NGI_CAPITAL_LLC_DOCUMENTS;
    case 'ngi-capital-inc':
      return NGI_CAPITAL_INC_DOCUMENTS;
    case 'creator-terminal':
      return CREATOR_TERMINAL_DOCUMENTS;
    case 'ngi-advisory':
      return NGI_ADVISORY_DOCUMENTS;
    default:
      return ALL_DOCUMENT_TYPES;
  }
}

// Helper function to get documents by category
export function getDocumentsByCategory(category: string): DocumentType[] {
  return ALL_DOCUMENT_TYPES.filter(doc => doc.category === category);
}

// Helper function to get required documents for an entity
export function getRequiredDocuments(entityId: string): DocumentType[] {
  return getDocumentsByEntity(entityId).filter(doc => doc.required && doc.status !== 'future');
}

// Helper function to check document completeness
export function checkDocumentCompleteness(entityId: string, uploadedDocIds: string[]): {
  complete: boolean;
  missing: DocumentType[];
  percentage: number;
} {
  const required = getRequiredDocuments(entityId);
  const missing = required.filter(doc => !uploadedDocIds.includes(doc.id));
  const percentage = required.length > 0 
    ? Math.round(((required.length - missing.length) / required.length) * 100)
    : 0;
  
  return {
    complete: missing.length === 0,
    missing,
    percentage
  };
}