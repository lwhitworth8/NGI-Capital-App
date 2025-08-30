-- NGI Capital Comprehensive Accounting System Schema
-- US GAAP Compliant Double-Entry Bookkeeping System
-- Big 4 Audit Ready with Complete Audit Trail

-- =====================================================
-- CHART OF ACCOUNTS
-- =====================================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    account_number VARCHAR(5) PRIMARY KEY,
    account_name VARCHAR(200) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN (
        'Asset', 'Liability', 'Equity', 'Revenue', 'Expense', 
        'Contra-Asset', 'Contra-Liability', 'Contra-Equity'
    )),
    account_subtype VARCHAR(100),
    normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('Debit', 'Credit')),
    parent_account VARCHAR(5) REFERENCES chart_of_accounts(account_number),
    is_active BOOLEAN DEFAULT true,
    is_header BOOLEAN DEFAULT false,
    is_bank_account BOOLEAN DEFAULT false,
    bank_account_id VARCHAR(100), -- Mercury Bank account ID
    description TEXT,
    asc_reference VARCHAR(50), -- ASC standard reference
    tax_line_mapping VARCHAR(100), -- For tax reporting
    financial_statement_mapping VARCHAR(50), -- BS, IS, CF, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by VARCHAR(100)
);

-- =====================================================
-- JOURNAL ENTRIES
-- =====================================================
CREATE TABLE IF NOT EXISTS journal_entries (
    entry_id SERIAL PRIMARY KEY,
    entry_number VARCHAR(20) UNIQUE NOT NULL, -- JE-2024-00001
    entry_date DATE NOT NULL,
    posting_date DATE NOT NULL,
    entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN (
        'Standard', 'Adjusting', 'Closing', 'Reversing', 
        'Recurring', 'Automated', 'Import'
    )),
    description TEXT NOT NULL,
    reference_number VARCHAR(100), -- Check #, Invoice #, etc.
    source VARCHAR(50), -- Manual, Mercury Bank, Document Upload, etc.
    source_document_id VARCHAR(100), -- Link to uploaded document
    entity_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN (
        'Draft', 'Pending Approval', 'Approved', 'Posted', 'Reversed', 'Void'
    )),
    is_balanced BOOLEAN DEFAULT false,
    total_debits DECIMAL(15,2) DEFAULT 0,
    total_credits DECIMAL(15,2) DEFAULT 0,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    posted_by VARCHAR(100),
    posted_at TIMESTAMP,
    reversed_by_entry_id INTEGER REFERENCES journal_entries(entry_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by VARCHAR(100),
    audit_notes TEXT,
    CONSTRAINT check_balanced CHECK (
        (status != 'Posted' AND status != 'Approved') OR 
        (total_debits = total_credits AND is_balanced = true)
    ),
    CONSTRAINT check_approval CHECK (
        created_by != approved_by OR approved_by IS NULL
    )
);

-- =====================================================
-- JOURNAL ENTRY LINES
-- =====================================================
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    line_id SERIAL PRIMARY KEY,
    entry_id INTEGER NOT NULL REFERENCES journal_entries(entry_id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    account_number VARCHAR(5) NOT NULL REFERENCES chart_of_accounts(account_number),
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    entity_id VARCHAR(50),
    department VARCHAR(50),
    project_id VARCHAR(50),
    class_id VARCHAR(50),
    location VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_debit_credit CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR 
        (credit_amount > 0 AND debit_amount = 0)
    ),
    UNIQUE(entry_id, line_number)
);

-- =====================================================
-- GENERAL LEDGER (Generated from posted journal entries)
-- =====================================================
CREATE TABLE IF NOT EXISTS general_ledger (
    gl_id SERIAL PRIMARY KEY,
    account_number VARCHAR(5) NOT NULL REFERENCES chart_of_accounts(account_number),
    entry_id INTEGER NOT NULL REFERENCES journal_entries(entry_id),
    entry_date DATE NOT NULL,
    posting_date DATE NOT NULL,
    description TEXT,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    running_balance DECIMAL(15,2) DEFAULT 0,
    entity_id VARCHAR(50) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    fiscal_period INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_gl_account_date (account_number, entry_date),
    INDEX idx_gl_entity_period (entity_id, fiscal_year, fiscal_period)
);

-- =====================================================
-- TRIAL BALANCE (Snapshot for period-end closing)
-- =====================================================
CREATE TABLE IF NOT EXISTS trial_balance (
    tb_id SERIAL PRIMARY KEY,
    period_end_date DATE NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    account_number VARCHAR(5) NOT NULL REFERENCES chart_of_accounts(account_number),
    account_name VARCHAR(200) NOT NULL,
    beginning_debit DECIMAL(15,2) DEFAULT 0,
    beginning_credit DECIMAL(15,2) DEFAULT 0,
    period_debit DECIMAL(15,2) DEFAULT 0,
    period_credit DECIMAL(15,2) DEFAULT 0,
    ending_debit DECIMAL(15,2) DEFAULT 0,
    ending_credit DECIMAL(15,2) DEFAULT 0,
    adjustments_debit DECIMAL(15,2) DEFAULT 0,
    adjustments_credit DECIMAL(15,2) DEFAULT 0,
    adjusted_debit DECIMAL(15,2) DEFAULT 0,
    adjusted_credit DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL,
    is_final BOOLEAN DEFAULT false,
    UNIQUE(period_end_date, entity_id, account_number)
);

-- =====================================================
-- BANK RECONCILIATION
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_reconciliation (
    recon_id SERIAL PRIMARY KEY,
    account_number VARCHAR(5) NOT NULL REFERENCES chart_of_accounts(account_number),
    bank_account_id VARCHAR(100) NOT NULL, -- Mercury Bank account ID
    statement_date DATE NOT NULL,
    statement_ending_balance DECIMAL(15,2) NOT NULL,
    gl_ending_balance DECIMAL(15,2) NOT NULL,
    reconciled_balance DECIMAL(15,2),
    outstanding_checks DECIMAL(15,2) DEFAULT 0,
    deposits_in_transit DECIMAL(15,2) DEFAULT 0,
    bank_errors DECIMAL(15,2) DEFAULT 0,
    book_errors DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'In Progress' CHECK (status IN (
        'In Progress', 'Completed', 'Reviewed'
    )),
    reconciled_by VARCHAR(100),
    reconciled_at TIMESTAMP,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- =====================================================
-- MERCURY BANK TRANSACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS mercury_transactions (
    transaction_id VARCHAR(100) PRIMARY KEY, -- Mercury's transaction ID
    account_id VARCHAR(100) NOT NULL, -- Mercury account ID
    account_number VARCHAR(5) REFERENCES chart_of_accounts(account_number),
    transaction_date DATE NOT NULL,
    post_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    merchant_name VARCHAR(200),
    category VARCHAR(100),
    status VARCHAR(50),
    transaction_type VARCHAR(50), -- Debit, Credit, Transfer, Fee
    reference_number VARCHAR(100),
    is_reconciled BOOLEAN DEFAULT false,
    journal_entry_id INTEGER REFERENCES journal_entries(entry_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP,
    INDEX idx_mercury_date (transaction_date),
    INDEX idx_mercury_unreconciled (is_reconciled, account_id)
);

-- =====================================================
-- DOCUMENT TO JOURNAL MAPPING
-- =====================================================
CREATE TABLE IF NOT EXISTS document_journal_mapping (
    mapping_id SERIAL PRIMARY KEY,
    document_id VARCHAR(100) NOT NULL, -- From document upload system
    document_type VARCHAR(50) NOT NULL,
    journal_entry_id INTEGER REFERENCES journal_entries(entry_id),
    extraction_data JSONB, -- Extracted data from OCR
    mapping_rules JSONB, -- Rules for auto-creating journal entries
    status VARCHAR(20) DEFAULT 'Pending',
    processed_at TIMESTAMP,
    processed_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- RECURRING JOURNAL ENTRIES
-- =====================================================
CREATE TABLE IF NOT EXISTS recurring_entries (
    recurring_id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    description TEXT,
    frequency VARCHAR(20) CHECK (frequency IN (
        'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually'
    )),
    start_date DATE NOT NULL,
    end_date DATE,
    next_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    entity_id VARCHAR(50) NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recurring_entry_lines (
    line_id SERIAL PRIMARY KEY,
    recurring_id INTEGER NOT NULL REFERENCES recurring_entries(recurring_id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    account_number VARCHAR(5) NOT NULL REFERENCES chart_of_accounts(account_number),
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    UNIQUE(recurring_id, line_number)
);

-- =====================================================
-- CLOSING ENTRIES
-- =====================================================
CREATE TABLE IF NOT EXISTS closing_periods (
    period_id SERIAL PRIMARY KEY,
    entity_id VARCHAR(50) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    fiscal_period INTEGER NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    closed_at TIMESTAMP,
    closed_by VARCHAR(100),
    closing_entry_id INTEGER REFERENCES journal_entries(entry_id),
    retained_earnings_entry_id INTEGER REFERENCES journal_entries(entry_id),
    UNIQUE(entity_id, fiscal_year, fiscal_period)
);

-- =====================================================
-- AUDIT TRAIL
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_trail (
    audit_id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'POST', 'REVERSE')),
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    user_email VARCHAR(100) NOT NULL,
    user_ip VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    INDEX idx_audit_table_record (table_name, record_id),
    INDEX idx_audit_timestamp (timestamp)
);

-- =====================================================
-- FINANCIAL STATEMENT MAPPING
-- =====================================================
CREATE TABLE IF NOT EXISTS financial_statement_mapping (
    mapping_id SERIAL PRIMARY KEY,
    account_number VARCHAR(5) NOT NULL REFERENCES chart_of_accounts(account_number),
    statement_type VARCHAR(20) NOT NULL CHECK (statement_type IN (
        'BS', 'IS', 'CF', 'RE', 'EQ'  -- Balance Sheet, Income Statement, Cash Flow, Retained Earnings, Equity
    )),
    line_item VARCHAR(200) NOT NULL,
    line_order INTEGER NOT NULL,
    is_subtotal BOOLEAN DEFAULT false,
    is_total BOOLEAN DEFAULT false,
    calculation_formula TEXT, -- For calculated lines
    UNIQUE(account_number, statement_type)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_je_date ON journal_entries(entry_date);
CREATE INDEX idx_je_status ON journal_entries(status);
CREATE INDEX idx_je_entity ON journal_entries(entity_id);
CREATE INDEX idx_jel_account ON journal_entry_lines(account_number);
CREATE INDEX idx_coa_active ON chart_of_accounts(is_active);
CREATE INDEX idx_coa_type ON chart_of_accounts(account_type);

-- =====================================================
-- TRIGGERS FOR AUDIT TRAIL
-- =====================================================
-- These would be implemented based on the database system (PostgreSQL, MySQL, etc.)
-- Example for PostgreSQL:
/*
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_trail(table_name, record_id, action, user_email, timestamp)
    VALUES(TG_TABLE_NAME, NEW.entry_id, TG_OP, current_user, current_timestamp);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER journal_entries_audit
AFTER INSERT OR UPDATE OR DELETE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
*/