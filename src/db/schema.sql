-- NGI Capital Internal Application Database Schema
-- ==================================================
-- 
-- This schema creates a comprehensive financial management system
-- for NGI Capital Advisory LLC with the following features:
--
-- - Partner management with dual approval controls
-- - Multi-entity business structure support
-- - GAAP-compliant chart of accounts
-- - Double-entry bookkeeping system
-- - Audit trail for all transactions
-- - Inter-entity transaction tracking
-- - Compliance and security controls
--
-- Author: NGI Capital Development Team
-- Version: 1.0.0
-- Date: 2024

-- Enable foreign key constraints (SQLite)
PRAGMA foreign_keys = ON;

-- =============================================================================
-- CORE ENTITIES
-- =============================================================================

-- Partners table (Andre and Landon)
CREATE TABLE partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    ownership_percentage DECIMAL(5,2) NOT NULL CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
    capital_account_balance DECIMAL(15,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT 1,
    last_login TIMESTAMP NULL,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP NULL,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email LIKE '%@ngicapital.com'),
    CONSTRAINT valid_ownership CHECK (ownership_percentage BETWEEN 0 AND 100)
);

-- Business entities table
CREATE TABLE entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    legal_name VARCHAR(200) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    ein VARCHAR(20) NULL,
    formation_date DATE NULL,
    state_of_incorporation VARCHAR(50) NULL,
    registered_address TEXT NULL,
    mailing_address TEXT NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    website VARCHAR(200) NULL,
    description TEXT NULL,
    parent_entity_id INTEGER REFERENCES entities(id),
    ownership_percentage DECIMAL(5,2) DEFAULT 100.00,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_entity_type CHECK (entity_type IN (
        'LLC', 'Corporation', 'Partnership', 'Sole Proprietorship', 
        'Trust', 'Foundation', 'Other'
    )),
    CONSTRAINT valid_ein_format CHECK (
        ein IS NULL OR 
        ein REGEXP '^[0-9]{2}-[0-9]{7}$'
    ),
    CONSTRAINT no_self_parent CHECK (id != parent_entity_id)
);

-- =============================================================================
-- CHART OF ACCOUNTS
-- =============================================================================

-- Chart of accounts (5-digit coding system)
CREATE TABLE accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_code VARCHAR(10) UNIQUE NOT NULL,
    account_name VARCHAR(200) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    account_subtype VARCHAR(50) NULL,
    parent_account_id INTEGER REFERENCES accounts(id),
    entity_id INTEGER NOT NULL REFERENCES entities(id),
    normal_balance VARCHAR(10) NOT NULL DEFAULT 'DEBIT',
    is_active BOOLEAN DEFAULT 1,
    is_bank_account BOOLEAN DEFAULT 0,
    bank_name VARCHAR(100) NULL,
    account_number_last4 VARCHAR(4) NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_account_type CHECK (account_type IN (
        'Asset', 'Liability', 'Equity', 'Revenue', 'Expense', 'Contra Asset', 'Contra Liability'
    )),
    CONSTRAINT valid_normal_balance CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
    CONSTRAINT valid_account_code CHECK (account_code REGEXP '^[0-9]{5}$'),
    CONSTRAINT no_self_parent_account CHECK (id != parent_account_id)
);

-- =============================================================================
-- TRANSACTION PROCESSING
-- =============================================================================

-- Transactions with approval workflow
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL REFERENCES entities(id),
    transaction_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    transaction_type VARCHAR(50) NOT NULL,
    category VARCHAR(100) NULL,
    description TEXT NOT NULL,
    reference_number VARCHAR(100) NULL,
    receipt_url VARCHAR(500) NULL,
    notes TEXT NULL,
    
    -- Workflow fields
    created_by VARCHAR(100) NOT NULL,
    approved_by VARCHAR(100) NULL,
    approval_status VARCHAR(20) DEFAULT 'pending',
    approval_required BOOLEAN DEFAULT 0,
    approval_comments TEXT NULL,
    approved_at TIMESTAMP NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT no_self_approval CHECK (
        created_by != approved_by OR approval_required = 0
    ),
    CONSTRAINT approved_by_required CHECK (
        (approval_status = 'approved' AND approved_by IS NOT NULL) OR 
        approval_status != 'approved'
    ),
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN (
        'REVENUE', 'EXPENSE', 'CAPITAL_CONTRIBUTION', 'CAPITAL_WITHDRAWAL',
        'INTER_ENTITY_TRANSFER', 'BANK_TRANSFER', 'LOAN', 'INVESTMENT',
        'EQUIPMENT_PURCHASE', 'ASSET_SALE', 'PAYROLL', 'TAX_PAYMENT', 'OTHER'
    ))
);

-- Journal entries for double-entry bookkeeping
CREATE TABLE journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    debit_amount DECIMAL(15,2) DEFAULT 0.00 CHECK (debit_amount >= 0),
    credit_amount DECIMAL(15,2) DEFAULT 0.00 CHECK (credit_amount >= 0),
    description TEXT NULL,
    line_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT debit_or_credit_not_both CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR 
        (credit_amount > 0 AND debit_amount = 0)
    )
);

-- Transaction approvals tracking
CREATE TABLE transaction_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    approver_email VARCHAR(100) NOT NULL,
    approval_action VARCHAR(20) NOT NULL,
    approval_comments TEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_approval_action CHECK (approval_action IN ('approve', 'reject', 'request_changes'))
);

-- =============================================================================
-- BANKING INTEGRATION
-- =============================================================================

-- Bank accounts
CREATE TABLE bank_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL REFERENCES entities(id),
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    bank_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    account_number_encrypted TEXT NOT NULL,
    routing_number_encrypted TEXT NULL,
    account_nickname VARCHAR(100) NULL,
    is_primary BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    last_sync_date TIMESTAMP NULL,
    api_account_id VARCHAR(100) NULL, -- For Mercury/Plaid integration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_bank_account_type CHECK (account_type IN (
        'checking', 'savings', 'money_market', 'cd', 'credit_line'
    ))
);

-- Bank transactions (imported from banking APIs)
CREATE TABLE bank_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_account_id INTEGER NOT NULL REFERENCES bank_accounts(id),
    external_transaction_id VARCHAR(200) UNIQUE NOT NULL,
    transaction_date DATE NOT NULL,
    posted_date DATE NULL,
    amount DECIMAL(15,2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    counterparty_name VARCHAR(200) NULL,
    category VARCHAR(100) NULL,
    subcategory VARCHAR(100) NULL,
    running_balance DECIMAL(15,2) NULL,
    is_pending BOOLEAN DEFAULT 0,
    
    -- Reconciliation
    matched_transaction_id INTEGER REFERENCES transactions(id),
    is_reconciled BOOLEAN DEFAULT 0,
    reconciled_at TIMESTAMP NULL,
    reconciled_by VARCHAR(100) NULL,
    
    -- Import metadata
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    import_source VARCHAR(50) NOT NULL DEFAULT 'manual',
    
    -- Constraints
    CONSTRAINT valid_import_source CHECK (import_source IN (
        'mercury', 'plaid', 'quickbooks', 'manual', 'csv_upload'
    ))
);

-- =============================================================================
-- REPORTING & ANALYTICS
-- =============================================================================

-- Saved reports configuration
CREATE TABLE saved_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_name VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    entity_id INTEGER REFERENCES entities(id),
    parameters TEXT NOT NULL, -- JSON parameters
    schedule_frequency VARCHAR(20) NULL,
    next_run_date TIMESTAMP NULL,
    created_by VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_report_type CHECK (report_type IN (
        'income_statement', 'balance_sheet', 'cash_flow', 'partner_capital',
        'trial_balance', 'general_ledger', 'transaction_detail', 'custom'
    )),
    CONSTRAINT valid_schedule_frequency CHECK (
        schedule_frequency IS NULL OR 
        schedule_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually')
    )
);

-- Report generation history
CREATE TABLE report_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    saved_report_id INTEGER REFERENCES saved_reports(id),
    report_type VARCHAR(50) NOT NULL,
    entity_id INTEGER REFERENCES entities(id),
    parameters TEXT NOT NULL,
    file_path VARCHAR(500) NULL,
    file_format VARCHAR(10) NULL,
    file_size INTEGER NULL,
    generation_time_ms INTEGER NULL,
    generated_by VARCHAR(100) NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_file_format CHECK (
        file_format IS NULL OR 
        file_format IN ('pdf', 'xlsx', 'csv', 'json')
    )
);

-- =============================================================================
-- COMPLIANCE & AUDIT
-- =============================================================================

-- Comprehensive audit log
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NULL,
    resource_id INTEGER NULL,
    table_name VARCHAR(50) NULL,
    record_id INTEGER NULL,
    old_values TEXT NULL,
    new_values TEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    session_id VARCHAR(100) NULL,
    request_id VARCHAR(100) NULL,
    success BOOLEAN DEFAULT 1,
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_action CHECK (action IN (
        'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT',
        'EXPORT', 'IMPORT', 'VIEW', 'DOWNLOAD', 'SYNC', 'RECONCILE', 'OTHER'
    ))
);

-- Document management
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER REFERENCES entities(id),
    transaction_id INTEGER REFERENCES transactions(id),
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    description TEXT NULL,
    tags VARCHAR(500) NULL,
    uploaded_by VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_document_type CHECK (document_type IN (
        'receipt', 'invoice', 'contract', 'tax_document', 'bank_statement',
        'legal_document', 'compliance', 'correspondence', 'other'
    ))
);

-- =============================================================================
-- SYSTEM CONFIGURATION
-- =============================================================================

-- System settings and configuration
CREATE TABLE system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NULL,
    setting_type VARCHAR(20) DEFAULT 'string',
    description TEXT NULL,
    is_encrypted BOOLEAN DEFAULT 0,
    updated_by VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_setting_type CHECK (setting_type IN (
        'string', 'integer', 'decimal', 'boolean', 'json', 'date', 'datetime'
    ))
);

-- User sessions (for JWT token management)
CREATE TABLE user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email VARCHAR(100) NOT NULL,
    session_token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500) UNIQUE NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Partners
CREATE INDEX idx_partners_email ON partners(email);
CREATE INDEX idx_partners_active ON partners(is_active);

-- Entities
CREATE INDEX idx_entities_parent ON entities(parent_entity_id);
CREATE INDEX idx_entities_type ON entities(entity_type);
CREATE INDEX idx_entities_active ON entities(is_active);

-- Accounts
CREATE INDEX idx_accounts_code ON accounts(account_code);
CREATE INDEX idx_accounts_entity ON accounts(entity_id);
CREATE INDEX idx_accounts_type ON accounts(account_type);
CREATE INDEX idx_accounts_parent ON accounts(parent_account_id);
CREATE INDEX idx_accounts_active ON accounts(is_active);

-- Transactions
CREATE INDEX idx_transactions_entity_date ON transactions(entity_id, transaction_date);
CREATE INDEX idx_transactions_status ON transactions(approval_status);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_created_by ON transactions(created_by);
CREATE INDEX idx_transactions_amount ON transactions(amount);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

-- Journal Entries
CREATE INDEX idx_journal_entries_transaction ON journal_entries(transaction_id);
CREATE INDEX idx_journal_entries_account ON journal_entries(account_id);
CREATE INDEX idx_journal_entries_debit ON journal_entries(debit_amount);
CREATE INDEX idx_journal_entries_credit ON journal_entries(credit_amount);

-- Bank Transactions
CREATE INDEX idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX idx_bank_transactions_external ON bank_transactions(external_transaction_id);
CREATE INDEX idx_bank_transactions_reconciled ON bank_transactions(is_reconciled);

-- Audit Log
CREATE INDEX idx_audit_log_user_date ON audit_log(user_email, created_at);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);

-- User Sessions
CREATE INDEX idx_user_sessions_email ON user_sessions(user_email);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);

-- =============================================================================
-- TRIGGERS FOR AUDIT TRAIL
-- =============================================================================

-- Trigger to update 'updated_at' timestamp
CREATE TRIGGER trg_partners_updated_at 
AFTER UPDATE ON partners 
FOR EACH ROW 
BEGIN
    UPDATE partners SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_entities_updated_at 
AFTER UPDATE ON entities 
FOR EACH ROW 
BEGIN
    UPDATE entities SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_accounts_updated_at 
AFTER UPDATE ON accounts 
FOR EACH ROW 
BEGIN
    UPDATE accounts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_transactions_updated_at 
AFTER UPDATE ON transactions 
FOR EACH ROW 
BEGIN
    UPDATE transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- =============================================================================
-- VIEWS FOR REPORTING
-- =============================================================================

-- Account balances view
CREATE VIEW account_balances AS
SELECT 
    a.id as account_id,
    a.account_code,
    a.account_name,
    a.account_type,
    a.entity_id,
    e.legal_name as entity_name,
    COALESCE(SUM(
        CASE 
            WHEN a.normal_balance = 'DEBIT' THEN je.debit_amount - je.credit_amount
            ELSE je.credit_amount - je.debit_amount
        END
    ), 0.00) as balance,
    COUNT(je.id) as transaction_count,
    MAX(t.transaction_date) as last_transaction_date
FROM accounts a
LEFT JOIN entities e ON a.entity_id = e.id
LEFT JOIN journal_entries je ON a.id = je.account_id
LEFT JOIN transactions t ON je.transaction_id = t.id 
    AND t.approval_status = 'approved'
WHERE a.is_active = 1
GROUP BY a.id, a.account_code, a.account_name, a.account_type, a.entity_id, e.legal_name;

-- Trial balance view
CREATE VIEW trial_balance AS
SELECT 
    entity_id,
    entity_name,
    account_code,
    account_name,
    account_type,
    balance,
    CASE WHEN balance >= 0 THEN balance ELSE 0 END as debit_balance,
    CASE WHEN balance < 0 THEN ABS(balance) ELSE 0 END as credit_balance
FROM account_balances
ORDER BY account_code;

-- =============================================================================
-- DEFAULT DATA SETUP
-- =============================================================================

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, updated_by) VALUES
('dual_approval_threshold', '500.00', 'decimal', 'Transaction amount requiring dual approval', 'system'),
('session_timeout_minutes', '30', 'integer', 'User session timeout in minutes', 'system'),
('max_login_attempts', '5', 'integer', 'Maximum failed login attempts before account lock', 'system'),
('account_lock_duration_minutes', '30', 'integer', 'Account lock duration after max failed attempts', 'system'),
('backup_retention_days', '90', 'integer', 'Number of days to retain database backups', 'system'),
('audit_log_retention_days', '2555', 'integer', 'Number of days to retain audit logs (7 years)', 'system'),
('default_fiscal_year_start', '01-01', 'string', 'Default fiscal year start (MM-DD)', 'system'),
('base_currency', 'USD', 'string', 'Base currency for financial reporting', 'system'),
('decimal_precision', '2', 'integer', 'Decimal precision for monetary amounts', 'system'),
('enable_bank_sync', 'false', 'boolean', 'Enable automatic bank synchronization', 'system');

-- =============================================================================
-- SCHEMA VERSION TRACKING
-- =============================================================================

CREATE TABLE schema_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_versions (version, description) 
VALUES ('1.0.0', 'Initial schema creation for NGI Capital Internal Application');

-- =============================================================================
-- SCHEMA VALIDATION
-- =============================================================================

-- Verify critical constraints are working
-- These would be run as tests after schema creation

-- Test: Partners ownership should not exceed 100%
-- SELECT CASE 
--     WHEN SUM(ownership_percentage) > 100 
--     THEN 'ERROR: Total ownership exceeds 100%'
--     ELSE 'OK: Ownership percentages valid'
-- END as ownership_check
-- FROM partners WHERE is_active = 1;

-- Test: All journal entries should balance (debits = credits)
-- CREATE VIEW journal_balance_check AS
-- SELECT 
--     transaction_id,
--     SUM(debit_amount) as total_debits,
--     SUM(credit_amount) as total_credits,
--     ABS(SUM(debit_amount) - SUM(credit_amount)) as difference
-- FROM journal_entries
-- GROUP BY transaction_id
-- HAVING difference > 0.01; -- Allow for small rounding differences

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = memory;