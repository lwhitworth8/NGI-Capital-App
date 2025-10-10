"""Phase 5: Fixed Assets

Revision ID: phase5_fixed_assets
Revises: phase4_ap
Create Date: 2025-10-10 19:00:00.000000

Changes:
- Add fixed_assets table with depreciation tracking
- Add depreciation_entries table for monthly depreciation records
- Add asset_disposals table for disposal tracking
- Add audit_packages table for Big 4 audit package tracking

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'phase5_fixed_assets'
down_revision = 'phase4_ap'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create fixed_assets table
    op.create_table(
        'fixed_assets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('asset_number', sa.String(length=50), nullable=False),
        sa.Column('asset_name', sa.String(length=255), nullable=False),
        sa.Column('asset_category', sa.String(length=50), nullable=False),
        sa.Column('asset_description', sa.Text(), nullable=True),
        sa.Column('acquisition_date', sa.Date(), nullable=False),
        sa.Column('acquisition_cost', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('salvage_value', sa.Numeric(precision=15, scale=2), server_default='0'),
        sa.Column('placed_in_service_date', sa.Date(), nullable=True),
        sa.Column('useful_life_years', sa.Integer(), nullable=False),
        sa.Column('useful_life_months', sa.Integer(), nullable=True),
        sa.Column('depreciation_method', sa.String(length=50), server_default='Straight-Line'),
        sa.Column('accumulated_depreciation', sa.Numeric(precision=15, scale=2), server_default='0'),
        sa.Column('net_book_value', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('current_year_depreciation', sa.Numeric(precision=15, scale=2), server_default='0'),
        sa.Column('last_depreciation_date', sa.Date(), nullable=True),
        sa.Column('months_depreciated', sa.Integer(), server_default='0'),
        sa.Column('status', sa.String(length=50), server_default='In Service'),
        sa.Column('is_fully_depreciated', sa.Boolean(), server_default='0'),
        sa.Column('disposal_date', sa.Date(), nullable=True),
        sa.Column('disposal_amount', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('disposal_gain_loss', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('disposal_notes', sa.Text(), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('serial_number', sa.String(length=100), nullable=True),
        sa.Column('responsible_party', sa.String(length=255), nullable=True),
        sa.Column('purchase_document_id', sa.Integer(), nullable=True),
        sa.Column('purchase_journal_entry_id', sa.Integer(), nullable=True),
        sa.Column('auto_detected', sa.Boolean(), server_default='0'),
        sa.Column('detection_confidence', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('detection_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('created_by_email', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id'], ),
        sa.ForeignKeyConstraint(['purchase_document_id'], ['accounting_documents.id'], ),
        sa.ForeignKeyConstraint(['purchase_journal_entry_id'], ['journal_entries.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('asset_number')
    )
    op.create_index('idx_asset_entity', 'fixed_assets', ['entity_id'], unique=False)
    op.create_index('idx_asset_number', 'fixed_assets', ['asset_number'], unique=False)
    op.create_index('idx_asset_status', 'fixed_assets', ['status'], unique=False)
    op.create_index('idx_asset_acquisition_date', 'fixed_assets', ['acquisition_date'], unique=False)
    
    # Create depreciation_entries table
    op.create_table(
        'depreciation_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('asset_id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('period_date', sa.Date(), nullable=False),
        sa.Column('period_month', sa.Integer(), nullable=False),
        sa.Column('period_year', sa.Integer(), nullable=False),
        sa.Column('depreciation_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('accumulated_depreciation_before', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('accumulated_depreciation_after', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('net_book_value_after', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('journal_entry_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='draft'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('created_by_email', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['asset_id'], ['fixed_assets.id'], ),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id'], ),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['journal_entries.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_dep_asset', 'depreciation_entries', ['asset_id'], unique=False)
    op.create_index('idx_dep_period', 'depreciation_entries', ['period_date'], unique=False)
    
    # Create asset_disposals table
    op.create_table(
        'asset_disposals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('asset_id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('disposal_date', sa.Date(), nullable=False),
        sa.Column('disposal_type', sa.String(length=50), nullable=False),
        sa.Column('disposal_amount', sa.Numeric(precision=15, scale=2), server_default='0'),
        sa.Column('original_cost', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('accumulated_depreciation', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('net_book_value', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('gain_loss', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('buyer_name', sa.String(length=255), nullable=True),
        sa.Column('buyer_contact', sa.String(length=255), nullable=True),
        sa.Column('disposal_notes', sa.Text(), nullable=True),
        sa.Column('disposal_document_id', sa.Integer(), nullable=True),
        sa.Column('journal_entry_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('created_by_email', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['asset_id'], ['fixed_assets.id'], ),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id'], ),
        sa.ForeignKeyConstraint(['disposal_document_id'], ['accounting_documents.id'], ),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['journal_entries.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_disposal_asset', 'asset_disposals', ['asset_id'], unique=False)
    op.create_index('idx_disposal_date', 'asset_disposals', ['disposal_date'], unique=False)
    
    # Create audit_packages table
    op.create_table(
        'audit_packages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('package_type', sa.String(length=50), nullable=False),
        sa.Column('period_year', sa.Integer(), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=True),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('includes_asset_register', sa.Boolean(), server_default='1'),
        sa.Column('includes_depreciation_schedule', sa.Boolean(), server_default='1'),
        sa.Column('includes_roll_forward', sa.Boolean(), server_default='1'),
        sa.Column('includes_additions_schedule', sa.Boolean(), server_default='1'),
        sa.Column('includes_disposals_schedule', sa.Boolean(), server_default='1'),
        sa.Column('includes_supporting_docs', sa.Boolean(), server_default='0'),
        sa.Column('total_assets_count', sa.Integer(), nullable=True),
        sa.Column('total_original_cost', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('total_accumulated_depreciation', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('total_net_book_value', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
        sa.Column('generated_by_email', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_audit_entity', 'audit_packages', ['entity_id'], unique=False)


def downgrade() -> None:
    # Drop audit_packages table
    op.drop_index('idx_audit_entity', table_name='audit_packages')
    op.drop_table('audit_packages')
    
    # Drop asset_disposals table
    op.drop_index('idx_disposal_date', table_name='asset_disposals')
    op.drop_index('idx_disposal_asset', table_name='asset_disposals')
    op.drop_table('asset_disposals')
    
    # Drop depreciation_entries table
    op.drop_index('idx_dep_period', table_name='depreciation_entries')
    op.drop_index('idx_dep_asset', table_name='depreciation_entries')
    op.drop_table('depreciation_entries')
    
    # Drop fixed_assets table
    op.drop_index('idx_asset_acquisition_date', table_name='fixed_assets')
    op.drop_index('idx_asset_status', table_name='fixed_assets')
    op.drop_index('idx_asset_number', table_name='fixed_assets')
    op.drop_index('idx_asset_entity', table_name='fixed_assets')
    op.drop_table('fixed_assets')

