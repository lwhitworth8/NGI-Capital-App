"""Add extracted_data and document_id to journal_entries

Revision ID: add_je_extracted_data_document_id
Revises: 66eeb57ebfdc
Create Date: 2025-10-12 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'add_je_extracted_data_document_id'
down_revision = '66eeb57ebfdc'
branch_labels = None
depends_on = None


def upgrade():
    """Add extracted_data and document_id fields to journal_entries"""

    # Add extracted_data field (JSON field for invoice metadata)
    # SQLite stores JSON as TEXT
    op.add_column('journal_entries', sa.Column('extracted_data', sa.JSON(), nullable=True))

    # Add document_id field (FK to accounting_documents)
    op.add_column('journal_entries', sa.Column('document_id', sa.INTEGER(), nullable=True))

    # Create foreign key constraint
    # Note: SQLite doesn't support adding FK constraints after table creation,
    # so we'll skip this for SQLite. The relationship is defined in the model.
    # For PostgreSQL production, this would be:
    # op.create_foreign_key('fk_journal_entries_document_id', 'journal_entries',
    #                       'accounting_documents', ['document_id'], ['id'])

    # Create index for performance on document_id lookups
    op.create_index('idx_journal_entries_document_id', 'journal_entries', ['document_id'])


def downgrade():
    """Remove extracted_data and document_id fields from journal_entries"""

    # Drop index
    op.drop_index('idx_journal_entries_document_id', 'journal_entries')

    # Drop columns
    op.drop_column('journal_entries', 'document_id')
    op.drop_column('journal_entries', 'extracted_data')
