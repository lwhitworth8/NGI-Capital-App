"""Phase 4: Accounts Payable

Revision ID: phase4_ap
Revises: phase3_ar
Create Date: 2025-10-10 18:00:00.000000

Changes:
- Add vendors table with full contact and payment information
- Add vendor_bills table with payment tracking
- Add vendor_bill_lines table for line items
- Add vendor_bill_payments table for payment tracking

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'phase4_ap'
down_revision = 'phase3_ar'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create vendors table
    op.create_table(
        'vendors',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('vendor_number', sa.String(length=50), nullable=True),
        sa.Column('vendor_name', sa.String(length=255), nullable=False),
        sa.Column('vendor_type', sa.String(length=50), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('website', sa.String(length=255), nullable=True),
        sa.Column('address_line1', sa.String(length=255), nullable=True),
        sa.Column('address_line2', sa.String(length=255), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=2), nullable=True),
        sa.Column('zip_code', sa.String(length=20), nullable=True),
        sa.Column('country', sa.String(length=2), nullable=False, server_default='US'),
        sa.Column('payment_terms', sa.String(length=50), nullable=False, server_default='Net 30'),
        sa.Column('autopay_enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('default_payment_method', sa.String(length=50), nullable=True),
        sa.Column('tax_id', sa.String(length=50), nullable=True),
        sa.Column('is_1099_vendor', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('default_expense_account_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id'], ),
        sa.ForeignKeyConstraint(['default_expense_account_id'], ['chart_of_accounts.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('vendor_number')
    )
    op.create_index('idx_vendor_entity', 'vendors', ['entity_id'], unique=False)
    op.create_index('idx_vendor_name', 'vendors', ['vendor_name'], unique=False)
    op.create_index('idx_vendor_number', 'vendors', ['vendor_number'], unique=False)
    
    # Create vendor_bills table
    op.create_table(
        'vendor_bills',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=False),
        sa.Column('bill_number', sa.String(length=50), nullable=False),
        sa.Column('internal_bill_number', sa.String(length=50), nullable=True),
        sa.Column('bill_date', sa.Date(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('payment_terms', sa.String(length=50), nullable=False, server_default='Net 30'),
        sa.Column('subtotal', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('tax_amount', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('total_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='draft'),
        sa.Column('amount_paid', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('amount_due', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('paid_date', sa.Date(), nullable=True),
        sa.Column('payment_method', sa.String(length=50), nullable=True),
        sa.Column('payment_reference', sa.String(length=100), nullable=True),
        sa.Column('document_id', sa.Integer(), nullable=True),
        sa.Column('journal_entry_id', sa.Integer(), nullable=True),
        sa.Column('memo', sa.Text(), nullable=True),
        sa.Column('internal_notes', sa.Text(), nullable=True),
        sa.Column('created_by_email', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id'], ),
        sa.ForeignKeyConstraint(['document_id'], ['accounting_documents.id'], ),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['journal_entries.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('internal_bill_number')
    )
    op.create_index('idx_bill_entity', 'vendor_bills', ['entity_id'], unique=False)
    op.create_index('idx_bill_vendor', 'vendor_bills', ['vendor_id'], unique=False)
    op.create_index('idx_bill_number', 'vendor_bills', ['bill_number'], unique=False)
    op.create_index('idx_bill_status', 'vendor_bills', ['status'], unique=False)
    op.create_index('idx_bill_date', 'vendor_bills', ['bill_date'], unique=False)
    
    # Create vendor_bill_lines table
    op.create_table(
        'vendor_bill_lines',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('bill_id', sa.Integer(), nullable=False),
        sa.Column('line_number', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=15, scale=2), nullable=False, server_default='1.00'),
        sa.Column('unit_price', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('expense_account_id', sa.Integer(), nullable=True),
        sa.Column('project_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['bill_id'], ['vendor_bills.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['expense_account_id'], ['chart_of_accounts.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('bill_id', 'line_number')
    )
    op.create_index('idx_bill_line_bill', 'vendor_bill_lines', ['bill_id'], unique=False)
    
    # Create vendor_bill_payments table
    op.create_table(
        'vendor_bill_payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('bill_id', sa.Integer(), nullable=False),
        sa.Column('payment_date', sa.Date(), nullable=False),
        sa.Column('payment_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('payment_method', sa.String(length=50), nullable=False),
        sa.Column('reference_number', sa.String(length=100), nullable=True),
        sa.Column('bank_transaction_id', sa.String(length=100), nullable=True),
        sa.Column('journal_entry_id', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('recorded_by_email', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['bill_id'], ['vendor_bills.id'], ),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['journal_entries.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_bill_payment_bill', 'vendor_bill_payments', ['bill_id'], unique=False)
    op.create_index('idx_bill_payment_date', 'vendor_bill_payments', ['payment_date'], unique=False)


def downgrade() -> None:
    # Drop vendor_bill_payments table
    op.drop_index('idx_bill_payment_date', table_name='vendor_bill_payments')
    op.drop_index('idx_bill_payment_bill', table_name='vendor_bill_payments')
    op.drop_table('vendor_bill_payments')
    
    # Drop vendor_bill_lines table
    op.drop_index('idx_bill_line_bill', table_name='vendor_bill_lines')
    op.drop_table('vendor_bill_lines')
    
    # Drop vendor_bills table
    op.drop_index('idx_bill_date', table_name='vendor_bills')
    op.drop_index('idx_bill_status', table_name='vendor_bills')
    op.drop_index('idx_bill_number', table_name='vendor_bills')
    op.drop_index('idx_bill_vendor', table_name='vendor_bills')
    op.drop_index('idx_bill_entity', table_name='vendor_bills')
    op.drop_table('vendor_bills')
    
    # Drop vendors table
    op.drop_index('idx_vendor_number', table_name='vendors')
    op.drop_index('idx_vendor_name', table_name='vendors')
    op.drop_index('idx_vendor_entity', table_name='vendors')
    op.drop_table('vendors')

