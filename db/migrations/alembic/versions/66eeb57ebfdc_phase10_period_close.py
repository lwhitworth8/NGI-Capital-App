"""phase10_period_close

Revision ID: 66eeb57ebfdc
Revises: 500eb6129d5d
Create Date: 2025-10-10 03:49:01.838270

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '66eeb57ebfdc'
down_revision: Union[str, None] = '500eb6129d5d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Period Closes
    op.create_table(
        'period_closes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('period_type', sa.String(50), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('fiscal_year', sa.Integer(), nullable=False),
        sa.Column('fiscal_period', sa.String(50), nullable=True),
        sa.Column('status', sa.String(50), default='draft'),
        sa.Column('checklist_status', sa.JSON(), nullable=True),
        sa.Column('total_assets', sa.Numeric(15, 2), default=0),
        sa.Column('total_liabilities', sa.Numeric(15, 2), default=0),
        sa.Column('total_equity', sa.Numeric(15, 2), default=0),
        sa.Column('period_revenue', sa.Numeric(15, 2), default=0),
        sa.Column('period_expenses', sa.Numeric(15, 2), default=0),
        sa.Column('net_income', sa.Numeric(15, 2), default=0),
        sa.Column('trial_balance_debits', sa.Numeric(15, 2), default=0),
        sa.Column('trial_balance_credits', sa.Numeric(15, 2), default=0),
        sa.Column('is_balanced', sa.Boolean(), default=False),
        sa.Column('documents_complete', sa.Boolean(), default=False),
        sa.Column('reconciliation_complete', sa.Boolean(), default=False),
        sa.Column('journal_entries_complete', sa.Boolean(), default=False),
        sa.Column('depreciation_complete', sa.Boolean(), default=False),
        sa.Column('adjusting_entries_complete', sa.Boolean(), default=False),
        sa.Column('trial_balance_complete', sa.Boolean(), default=False),
        sa.Column('statements_complete', sa.Boolean(), default=False),
        sa.Column('financial_statements', sa.JSON(), nullable=True),
        sa.Column('initiated_by_email', sa.String(255), nullable=True),
        sa.Column('initiated_at', sa.DateTime(), nullable=True),
        sa.Column('reviewed_by_email', sa.String(255), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('closed_by_email', sa.String(255), nullable=True),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('reopened_by_email', sa.String(255), nullable=True),
        sa.Column('reopened_at', sa.DateTime(), nullable=True),
        sa.Column('reopen_reason', sa.Text(), nullable=True),
        sa.Column('close_notes', sa.Text(), nullable=True),
        sa.Column('issues_encountered', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_period_closes_entity_id', 'period_closes', ['entity_id'])
    op.create_index('ix_period_closes_period_end', 'period_closes', ['period_end'])
    op.create_index('ix_period_closes_status', 'period_closes', ['status'])
    
    # Closing Entries
    op.create_table(
        'closing_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('period_close_id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('journal_entry_id', sa.Integer(), nullable=True),
        sa.Column('entry_type', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('total_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('status', sa.String(50), default='draft'),
        sa.Column('posted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['period_close_id'], ['period_closes.id']),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id']),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['journal_entries.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Period Locks
    op.create_table(
        'period_locks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('period_close_id', sa.Integer(), nullable=True),
        sa.Column('lock_start_date', sa.Date(), nullable=False),
        sa.Column('lock_end_date', sa.Date(), nullable=False),
        sa.Column('is_locked', sa.Boolean(), default=True),
        sa.Column('lock_reason', sa.Text(), nullable=True),
        sa.Column('can_override', sa.Boolean(), default=False),
        sa.Column('override_approved_by', sa.String(255), nullable=True),
        sa.Column('override_approved_at', sa.DateTime(), nullable=True),
        sa.Column('locked_by_email', sa.String(255), nullable=True),
        sa.Column('locked_at', sa.DateTime(), nullable=True),
        sa.Column('unlocked_by_email', sa.String(255), nullable=True),
        sa.Column('unlocked_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id']),
        sa.ForeignKeyConstraint(['period_close_id'], ['period_closes.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_period_locks_entity_id', 'period_locks', ['entity_id'])
    op.create_index('ix_period_locks_dates', 'period_locks', ['lock_start_date', 'lock_end_date'])
    
    # Adjusting Entries
    op.create_table(
        'adjusting_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('period_close_id', sa.Integer(), nullable=True),
        sa.Column('journal_entry_id', sa.Integer(), nullable=True),
        sa.Column('adjustment_type', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('total_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('status', sa.String(50), default='draft'),
        sa.Column('approved_by_email', sa.String(255), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('posted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id']),
        sa.ForeignKeyConstraint(['period_close_id'], ['period_closes.id']),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['journal_entries.id']),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('adjusting_entries')
    
    op.drop_index('ix_period_locks_dates', 'period_locks')
    op.drop_index('ix_period_locks_entity_id', 'period_locks')
    op.drop_table('period_locks')
    
    op.drop_table('closing_entries')
    
    op.drop_index('ix_period_closes_status', 'period_closes')
    op.drop_index('ix_period_closes_period_end', 'period_closes')
    op.drop_index('ix_period_closes_entity_id', 'period_closes')
    op.drop_table('period_closes')
