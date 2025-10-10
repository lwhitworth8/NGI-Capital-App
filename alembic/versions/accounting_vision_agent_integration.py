"""Accounting Vision & Agent Integration

Revision ID: accounting_vision_agent_integration
Revises: d3cd32eaa4ba
Create Date: 2024-10-08 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'accounting_vision_agent_integration'
down_revision = 'd3cd32eaa4ba'
branch_labels = None
depends_on = None


def upgrade():
    """Add vision tracking and agent validation fields"""
    
    # Add vision tracking fields to accounting_documents table
    op.add_column('accounting_documents', sa.Column('vision_model_version', sa.VARCHAR(50), nullable=True))
    op.add_column('accounting_documents', sa.Column('vision_processing_time_ms', sa.INTEGER(), nullable=True))
    op.add_column('accounting_documents', sa.Column('agent_validation_id', sa.INTEGER(), nullable=True))
    op.add_column('accounting_documents', sa.Column('agent_validation_status', sa.VARCHAR(50), nullable=True))
    
    # Add Mercury and startup cost fields to accounting_entities table
    op.add_column('accounting_entities', sa.Column('mercury_first_deposit_date', sa.DATE(), nullable=True))
    op.add_column('accounting_entities', sa.Column('contributed_capital_threshold_date', sa.DATE(), nullable=True))
    op.add_column('accounting_entities', sa.Column('startup_costs_cumulative', sa.DECIMAL(15, 2), nullable=True, default=0.00))
    op.add_column('accounting_entities', sa.Column('startup_costs_threshold', sa.DECIMAL(15, 2), nullable=True, default=5000.00))
    
    # Add agent validation fields to journal_entries table
    op.add_column('journal_entries', sa.Column('agent_validated_at', sa.TIMESTAMP(), nullable=True))
    op.add_column('journal_entries', sa.Column('agent_validation_score', sa.DECIMAL(3, 2), nullable=True))
    op.add_column('journal_entries', sa.Column('agent_corrections_made', sa.BOOLEAN(), nullable=True, default=False))
    op.add_column('journal_entries', sa.Column('agent_validation_notes', sa.TEXT(), nullable=True))
    
    # Create agent_validations table
    op.create_table('agent_validations',
        sa.Column('id', sa.INTEGER(), nullable=False),
        sa.Column('journal_entry_id', sa.INTEGER(), nullable=False),
        sa.Column('agent_run_id', sa.VARCHAR(100), nullable=True),
        sa.Column('workflow_id', sa.VARCHAR(100), nullable=True),
        sa.Column('validation_status', sa.VARCHAR(50), nullable=True),
        sa.Column('gaap_compliance_score', sa.DECIMAL(3, 2), nullable=True),
        sa.Column('corrections_made', sa.JSON(), nullable=True),
        sa.Column('validation_notes', sa.TEXT(), nullable=True),
        sa.Column('asc_references', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['journal_entries.id'], ondelete='CASCADE')
    )
    
    # Create indexes for performance
    op.create_index('idx_agent_validations_journal_entry_id', 'agent_validations', ['journal_entry_id'])
    op.create_index('idx_agent_validations_agent_run_id', 'agent_validations', ['agent_run_id'])
    op.create_index('idx_agent_validations_validation_status', 'agent_validations', ['validation_status'])
    op.create_index('idx_accounting_entities_mercury_deposit', 'accounting_entities', ['mercury_first_deposit_date'])
    op.create_index('idx_journal_entries_agent_validated', 'journal_entries', ['agent_validated_at'])
    
    # Create GIN indexes for JSONB columns
    op.create_index('idx_agent_validations_corrections_gin', 'agent_validations', ['corrections_made'], postgresql_using='gin')
    op.create_index('idx_agent_validations_asc_refs_gin', 'agent_validations', ['asc_references'], postgresql_using='gin')


def downgrade():
    """Remove vision tracking and agent validation fields"""
    
    # Drop indexes
    op.drop_index('idx_agent_validations_asc_refs_gin', 'agent_validations')
    op.drop_index('idx_agent_validations_corrections_gin', 'agent_validations')
    op.drop_index('idx_journal_entries_agent_validated', 'journal_entries')
    op.drop_index('idx_accounting_entities_mercury_deposit', 'accounting_entities')
    op.drop_index('idx_agent_validations_validation_status', 'agent_validations')
    op.drop_index('idx_agent_validations_agent_run_id', 'agent_validations')
    op.drop_index('idx_agent_validations_journal_entry_id', 'agent_validations')
    
    # Drop agent_validations table
    op.drop_table('agent_validations')
    
    # Remove columns from journal_entries
    op.drop_column('journal_entries', 'agent_validation_notes')
    op.drop_column('journal_entries', 'agent_corrections_made')
    op.drop_column('journal_entries', 'agent_validation_score')
    op.drop_column('journal_entries', 'agent_validated_at')
    
    # Remove columns from accounting_entities
    op.drop_column('accounting_entities', 'startup_costs_threshold')
    op.drop_column('accounting_entities', 'startup_costs_cumulative')
    op.drop_column('accounting_entities', 'contributed_capital_threshold_date')
    op.drop_column('accounting_entities', 'mercury_first_deposit_date')
    
    # Remove columns from accounting_documents
    op.drop_column('accounting_documents', 'agent_validation_status')
    op.drop_column('accounting_documents', 'agent_validation_id')
    op.drop_column('accounting_documents', 'vision_processing_time_ms')
    op.drop_column('accounting_documents', 'vision_model_version')
