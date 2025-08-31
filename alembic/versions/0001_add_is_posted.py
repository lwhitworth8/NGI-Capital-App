"""
Add is_posted and posted_date columns to journal_entries

Revision ID: 0001_add_is_posted
Revises: None
Create Date: 2025-08-31
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0001_add_is_posted'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    try:
        op.add_column('journal_entries', sa.Column('is_posted', sa.Boolean(), server_default=sa.text('0')))
    except Exception:
        pass
    try:
        op.add_column('journal_entries', sa.Column('posted_date', sa.DateTime(), nullable=True))
    except Exception:
        pass


def downgrade():
    try:
        op.drop_column('journal_entries', 'posted_date')
    except Exception:
        pass
    try:
        op.drop_column('journal_entries', 'is_posted')
    except Exception:
        pass

