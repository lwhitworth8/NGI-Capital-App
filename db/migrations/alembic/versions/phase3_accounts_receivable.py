"""Phase 3: Accounts Receivable

Revision ID: phase3_ar
Revises: phase2_dual_approval
Create Date: 2025-10-10 16:00:00.000000

Changes:
- Add customers table with full contact and billing information
- Add invoices table with ASC 606 revenue recognition fields
- Add invoice_lines table for line items
- Add invoice_payments table for payment tracking

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'phase3_ar'
down_revision = 'phase2_dual_approval'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create customers table
    op.create_table(
        'customers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('customer_number', sa.String(length=50), nullable=True),
        sa.Column('customer_name', sa.String(length=255), nullable=False),
        sa.Column('customer_type', sa.String(length=50), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('website', sa.String(length=255), nullable=True),
        sa.Column('billing_address_line1', sa.String(length=255), nullable=True),
        sa.Column('billing_address_line2', sa.String(length=255), nullable=True),
        sa.Column('billing_city', sa.String(length=100), nullable=True),
        sa.Column('billing_state', sa.String(length=2), nullable=True),
        sa.Column('billing_zip', sa.String(length=20), nullable=True),
        sa.Column('billing_country', sa.String(length=2), nullable=False, server_default='US'),
        sa.Column('payment_terms', sa.String(length=50), nullable=False, server_default='Net 30'),
        sa.Column('credit_limit', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('tax_id', sa.String(length=50), nullable=True),
        sa.Column('tax_exempt', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('tax_exempt_certificate', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('customer_number')
    )
    op.create_index('idx_customer_entity', 'customers', ['entity_id'], unique=False)
    op.create_index('idx_customer_name', 'customers', ['customer_name'], unique=False)
    op.create_index('idx_customer_number', 'customers', ['customer_number'], unique=False)
    
    # Create invoices table
    op.create_table(
        'invoices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('invoice_number', sa.String(length=50), nullable=False),
        sa.Column('invoice_date', sa.Date(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('payment_terms', sa.String(length=50), nullable=False, server_default='Net 30'),
        sa.Column('subtotal', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('tax_rate', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('tax_amount', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('total_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('revenue_recognized', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('revenue_recognition_date', sa.Date(), nullable=True),
        sa.Column('performance_obligation_satisfied', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='draft'),
        sa.Column('amount_paid', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('amount_due', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('paid_date', sa.Date(), nullable=True),
        sa.Column('pdf_file_path', sa.Text(), nullable=True),
        sa.Column('pdf_generated_at', sa.DateTime(), nullable=True),
        sa.Column('sent_to_email', sa.String(length=255), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('viewed_at', sa.DateTime(), nullable=True),
        sa.Column('journal_entry_id', sa.Integer(), nullable=True),
        sa.Column('memo', sa.Text(), nullable=True),
        sa.Column('internal_notes', sa.Text(), nullable=True),
        sa.Column('created_by_email', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id'], ),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['journal_entries.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('invoice_number')
    )
    op.create_index('idx_invoice_customer', 'invoices', ['customer_id'], unique=False)
    op.create_index('idx_invoice_date', 'invoices', ['invoice_date'], unique=False)
    op.create_index('idx_invoice_entity', 'invoices', ['entity_id'], unique=False)
    op.create_index('idx_invoice_number', 'invoices', ['invoice_number'], unique=False)
    op.create_index('idx_invoice_status', 'invoices', ['status'], unique=False)
    
    # Create invoice_lines table
    op.create_table(
        'invoice_lines',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), nullable=False),
        sa.Column('line_number', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=15, scale=2), nullable=False, server_default='1.00'),
        sa.Column('unit_price', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('revenue_account_id', sa.Integer(), nullable=True),
        sa.Column('performance_obligation_description', sa.Text(), nullable=True),
        sa.Column('performance_obligation_satisfied', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('satisfaction_date', sa.Date(), nullable=True),
        sa.Column('project_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['revenue_account_id'], ['chart_of_accounts.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('invoice_id', 'line_number')
    )
    op.create_index('idx_invoice_line_invoice', 'invoice_lines', ['invoice_id'], unique=False)
    
    # Create invoice_payments table
    op.create_table(
        'invoice_payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), nullable=False),
        sa.Column('payment_date', sa.Date(), nullable=False),
        sa.Column('payment_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('payment_method', sa.String(length=50), nullable=False),
        sa.Column('reference_number', sa.String(length=100), nullable=True),
        sa.Column('bank_transaction_id', sa.String(length=100), nullable=True),
        sa.Column('journal_entry_id', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('recorded_by_email', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['journal_entries.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_payment_date', 'invoice_payments', ['payment_date'], unique=False)
    op.create_index('idx_payment_invoice', 'invoice_payments', ['invoice_id'], unique=False)


def downgrade() -> None:
    # Drop invoice_payments table
    op.drop_index('idx_payment_invoice', table_name='invoice_payments')
    op.drop_index('idx_payment_date', table_name='invoice_payments')
    op.drop_table('invoice_payments')
    
    # Drop invoice_lines table
    op.drop_index('idx_invoice_line_invoice', table_name='invoice_lines')
    op.drop_table('invoice_lines')
    
    # Drop invoices table
    op.drop_index('idx_invoice_status', table_name='invoices')
    op.drop_index('idx_invoice_number', table_name='invoices')
    op.drop_index('idx_invoice_entity', table_name='invoices')
    op.drop_index('idx_invoice_date', table_name='invoices')
    op.drop_index('idx_invoice_customer', table_name='invoices')
    op.drop_table('invoices')
    
    # Drop customers table
    op.drop_index('idx_customer_number', table_name='customers')
    op.drop_index('idx_customer_name', table_name='customers')
    op.drop_index('idx_customer_entity', table_name='customers')
    op.drop_table('customers')

