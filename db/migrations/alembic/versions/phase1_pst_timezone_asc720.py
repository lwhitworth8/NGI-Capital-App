"""Phase 1: PST Timezone and ASC 720 Compliance

Revision ID: phase1_pst_asc720
Revises: accounting_vision_agent_integration
Create Date: 2025-10-10 12:00:00.000000

Changes:
- All datetime fields now use PST (Pacific Standard Time)
- Add ASC 720 startup cost tracking fields to journal_entry_lines
- Add startup_cost_metadata table for separate tracking
- Existing datetime data remains in UTC, will be converted to PST on read

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'phase1_pst_asc720'
down_revision = 'accounting_vision_agent_integration'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add ASC 720 columns to journal_entry_lines
    with op.batch_alter_table('journal_entry_lines', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_startup_cost', sa.Boolean(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('startup_cost_metadata', sa.JSON(), nullable=True))
    
    # Create startup_cost_metadata table
    op.create_table(
        'startup_cost_metadata',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('journal_entry_line_id', sa.Integer(), nullable=False),
        sa.Column('tracked_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('cumulative_startup_costs', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('within_threshold', sa.Boolean(), nullable=True, server_default='1'),
        sa.Column('cost_category', sa.String(length=100), nullable=True),
        sa.Column('classification_date', sa.DateTime(), nullable=False),
        sa.Column('classification_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id'], ),
        sa.ForeignKeyConstraint(['journal_entry_line_id'], ['journal_entry_lines.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_startup_entity', 'startup_cost_metadata', ['entity_id'], unique=False)
    op.create_index('idx_startup_je_line', 'startup_cost_metadata', ['journal_entry_line_id'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_startup_je_line', table_name='startup_cost_metadata')
    op.drop_index('idx_startup_entity', table_name='startup_cost_metadata')
    
    # Drop startup_cost_metadata table
    op.drop_table('startup_cost_metadata')
    
    # Remove ASC 720 columns from journal_entry_lines
    with op.batch_alter_table('journal_entry_lines', schema=None) as batch_op:
        batch_op.drop_column('startup_cost_metadata')
        batch_op.drop_column('is_startup_cost')

