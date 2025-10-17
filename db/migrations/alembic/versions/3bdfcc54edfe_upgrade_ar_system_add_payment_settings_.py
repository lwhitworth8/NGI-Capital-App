"""upgrade_ar_system_add_payment_settings_and_bank_matching

Revision ID: 3bdfcc54edfe
Revises: add_je_extracted_data_document_id
Create Date: 2025-10-16 20:26:40.440721

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3bdfcc54edfe'
down_revision: Union[str, None] = 'add_je_extracted_data_document_id'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add payment settings to accounting_entities table
    op.add_column('accounting_entities', sa.Column('default_payment_terms', sa.String(50), nullable=True, default='Net 30'))
    op.add_column('accounting_entities', sa.Column('late_payment_fee', sa.Numeric(15, 2), nullable=True))
    op.add_column('accounting_entities', sa.Column('late_payment_interest_rate', sa.Numeric(5, 2), nullable=True))
    op.add_column('accounting_entities', sa.Column('invoice_payment_instructions', sa.Text(), nullable=True))
    
    # Update bank_transaction_id column type and add foreign key to invoice_payments table
    # First check if column exists and its type
    op.execute("ALTER TABLE invoice_payments RENAME TO invoice_payments_old")
    op.execute("""
        CREATE TABLE invoice_payments (
            id INTEGER PRIMARY KEY,
            invoice_id INTEGER NOT NULL,
            payment_date DATE NOT NULL,
            payment_amount NUMERIC(15, 2) NOT NULL,
            payment_method VARCHAR(50) NOT NULL,
            reference_number VARCHAR(100),
            bank_transaction_id INTEGER,
            journal_entry_id INTEGER,
            notes TEXT,
            recorded_by_email VARCHAR(255),
            created_at DATETIME NOT NULL,
            FOREIGN KEY (bank_transaction_id) REFERENCES bank_transactions(id)
        )
    """)
    op.execute("""
        INSERT INTO invoice_payments 
        SELECT id, invoice_id, payment_date, payment_amount, payment_method, 
               reference_number, NULL, journal_entry_id, notes, recorded_by_email, created_at
        FROM invoice_payments_old
    """)
    op.execute("DROP TABLE invoice_payments_old")
    
    # Add index for performance
    op.create_index('idx_invoice_payments_bank_transaction', 'invoice_payments', ['bank_transaction_id'])
    
    # Update existing entities with default payment terms
    op.execute("UPDATE accounting_entities SET default_payment_terms = 'Net 30' WHERE default_payment_terms IS NULL")


def downgrade() -> None:
    # Remove indexes
    op.drop_index('idx_invoice_payments_bank_transaction', table_name='invoice_payments')
    
    # Revert bank_transaction_id column to VARCHAR(100)
    op.execute("ALTER TABLE invoice_payments RENAME TO invoice_payments_old")
    op.execute("""
        CREATE TABLE invoice_payments (
            id INTEGER PRIMARY KEY,
            invoice_id INTEGER NOT NULL,
            payment_date DATE NOT NULL,
            payment_amount NUMERIC(15, 2) NOT NULL,
            payment_method VARCHAR(50) NOT NULL,
            reference_number VARCHAR(100),
            bank_transaction_id VARCHAR(100),
            journal_entry_id INTEGER,
            notes TEXT,
            recorded_by_email VARCHAR(255),
            created_at DATETIME NOT NULL
        )
    """)
    op.execute("""
        INSERT INTO invoice_payments 
        SELECT id, invoice_id, payment_date, payment_amount, payment_method, 
               reference_number, NULL, journal_entry_id, notes, recorded_by_email, created_at
        FROM invoice_payments_old
    """)
    op.execute("DROP TABLE invoice_payments_old")
    
    # Remove payment settings columns
    op.drop_column('accounting_entities', 'invoice_payment_instructions')
    op.drop_column('accounting_entities', 'late_payment_interest_rate')
    op.drop_column('accounting_entities', 'late_payment_fee')
    op.drop_column('accounting_entities', 'default_payment_terms')
