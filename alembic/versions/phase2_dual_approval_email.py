"""Phase 2: Dual Approval Workflow with Email Tracking

Revision ID: phase2_dual_approval
Revises: phase1_pst_asc720
Create Date: 2025-10-10 14:00:00.000000

Changes:
- Add email fields for approval tracking (created_by, approved_by, posted_by)
- Update workflow status values for clarity
- Ensure dual-approval workflow is fully supported

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'phase2_dual_approval'
down_revision = 'phase1_pst_asc720'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add email tracking columns to journal_entries
    with op.batch_alter_table('journal_entries', schema=None) as batch_op:
        batch_op.add_column(sa.Column('created_by_email', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('first_approved_by_email', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('final_approved_by_email', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('posted_by_email', sa.String(length=255), nullable=True))


def downgrade() -> None:
    # Remove email tracking columns
    with op.batch_alter_table('journal_entries', schema=None) as batch_op:
        batch_op.drop_column('posted_by_email')
        batch_op.drop_column('final_approved_by_email')
        batch_op.drop_column('first_approved_by_email')
        batch_op.drop_column('created_by_email')

