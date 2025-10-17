"""phase9_tax_compliance

Revision ID: 500eb6129d5d
Revises: phase6_expenses_payroll
Create Date: 2025-10-10 03:40:18.778600

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '500eb6129d5d'
down_revision: Union[str, None] = 'phase6_expenses_payroll'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tax Payments
    op.create_table(
        'tax_payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('payment_number', sa.String(50), unique=True, nullable=True),
        sa.Column('tax_type', sa.String(50), nullable=False),
        sa.Column('tax_period', sa.String(50), nullable=False),
        sa.Column('payment_date', sa.Date(), nullable=False),
        sa.Column('amount_paid', sa.Numeric(15, 2), nullable=False),
        sa.Column('payment_method', sa.String(50), nullable=True),
        sa.Column('confirmation_number', sa.String(100), nullable=True),
        sa.Column('status', sa.String(50), default='paid'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('document_id', sa.Integer(), nullable=True),
        sa.Column('journal_entry_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id']),
        sa.ForeignKeyConstraint(['document_id'], ['accounting_documents.id']),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['journal_entries.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_tax_payments_entity_id', 'tax_payments', ['entity_id'])
    op.create_index('ix_tax_payments_tax_type', 'tax_payments', ['tax_type'])
    op.create_index('ix_tax_payments_payment_date', 'tax_payments', ['payment_date'])
    
    # Tax Provisions
    op.create_table(
        'tax_provisions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('provision_year', sa.Integer(), nullable=False),
        sa.Column('provision_period', sa.String(50), nullable=False),
        sa.Column('pretax_book_income', sa.Numeric(15, 2), nullable=False),
        sa.Column('taxable_income', sa.Numeric(15, 2), nullable=False),
        sa.Column('m1_additions', sa.JSON(), nullable=True),
        sa.Column('m1_subtractions', sa.JSON(), nullable=True),
        sa.Column('current_federal_tax', sa.Numeric(15, 2), default=0),
        sa.Column('current_state_tax', sa.Numeric(15, 2), default=0),
        sa.Column('deferred_federal_tax', sa.Numeric(15, 2), default=0),
        sa.Column('deferred_state_tax', sa.Numeric(15, 2), default=0),
        sa.Column('total_tax_provision', sa.Numeric(15, 2), nullable=False),
        sa.Column('effective_tax_rate', sa.Numeric(5, 4), nullable=True),
        sa.Column('status', sa.String(50), default='calculated'),
        sa.Column('journal_entry_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id']),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['journal_entries.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_tax_provisions_entity_id', 'tax_provisions', ['entity_id'])
    op.create_index('ix_tax_provisions_year', 'tax_provisions', ['provision_year'])
    
    # Tax Returns
    op.create_table(
        'tax_returns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('return_type', sa.String(50), nullable=False),
        sa.Column('tax_year', sa.Integer(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('extension_filed', sa.Boolean(), default=False),
        sa.Column('extended_due_date', sa.Date(), nullable=True),
        sa.Column('filing_date', sa.Date(), nullable=True),
        sa.Column('taxable_income', sa.Numeric(15, 2), nullable=True),
        sa.Column('total_tax', sa.Numeric(15, 2), nullable=True),
        sa.Column('amount_due', sa.Numeric(15, 2), nullable=True),
        sa.Column('status', sa.String(50), default='not_filed'),
        sa.Column('preparer_name', sa.String(255), nullable=True),
        sa.Column('document_id', sa.Integer(), nullable=True),
        sa.Column('provision_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id']),
        sa.ForeignKeyConstraint(['document_id'], ['accounting_documents.id']),
        sa.ForeignKeyConstraint(['provision_id'], ['tax_provisions.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_tax_returns_entity_id', 'tax_returns', ['entity_id'])
    op.create_index('ix_tax_returns_tax_year', 'tax_returns', ['tax_year'])
    
    # Tax Withholding
    op.create_table(
        'tax_withholding',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=True),
        sa.Column('withholding_type', sa.String(50), nullable=False),
        sa.Column('tax_year', sa.Integer(), nullable=False),
        sa.Column('federal_withheld', sa.Numeric(15, 2), default=0),
        sa.Column('state_withheld', sa.Numeric(15, 2), default=0),
        sa.Column('fica_withheld', sa.Numeric(15, 2), default=0),
        sa.Column('medicare_withheld', sa.Numeric(15, 2), default=0),
        sa.Column('remitted_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(50), default='pending'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Tax Deadlines
    op.create_table(
        'tax_deadlines',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('deadline_type', sa.String(50), nullable=False),
        sa.Column('deadline_date', sa.Date(), nullable=False),
        sa.Column('tax_year', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('completed', sa.Boolean(), default=False),
        sa.Column('completed_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_tax_deadlines_entity_id', 'tax_deadlines', ['entity_id'])
    op.create_index('ix_tax_deadlines_date', 'tax_deadlines', ['deadline_date'])


def downgrade() -> None:
    op.drop_index('ix_tax_deadlines_date', 'tax_deadlines')
    op.drop_index('ix_tax_deadlines_entity_id', 'tax_deadlines')
    op.drop_table('tax_deadlines')
    
    op.drop_table('tax_withholding')
    
    op.drop_index('ix_tax_returns_tax_year', 'tax_returns')
    op.drop_index('ix_tax_returns_entity_id', 'tax_returns')
    op.drop_table('tax_returns')
    
    op.drop_index('ix_tax_provisions_year', 'tax_provisions')
    op.drop_index('ix_tax_provisions_entity_id', 'tax_provisions')
    op.drop_table('tax_provisions')
    
    op.drop_index('ix_tax_payments_payment_date', 'tax_payments')
    op.drop_index('ix_tax_payments_tax_type', 'tax_payments')
    op.drop_index('ix_tax_payments_entity_id', 'tax_payments')
    op.drop_table('tax_payments')
