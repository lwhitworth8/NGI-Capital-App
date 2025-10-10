"""Phase 6: Expenses & Payroll Module

Revision ID: phase6_expenses_payroll
Revises: phase5_fixed_assets
Create Date: 2025-10-10 02:40:00.000000

Creates tables for:
- Expense Reports (dual-approval workflow)
- Expense Lines (receipt tracking)
- Timesheets (partner hours)
- Timesheet Entries (daily hours)
- Payroll Runs (2025 tax compliance)
- Paystubs (complete tax breakdown)
- Employee Payroll Info (W-4, DE-4, direct deposit)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'phase6_expenses_payroll'
down_revision = 'phase5_fixed_assets'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Expense Reports
    op.create_table(
        'expense_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('report_number', sa.String(50), nullable=False),
        sa.Column('report_date', sa.Date(), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=True),
        sa.Column('period_end', sa.Date(), nullable=True),
        sa.Column('employee_email', sa.String(255), nullable=False),
        sa.Column('employee_name', sa.String(255), nullable=True),
        sa.Column('total_amount', sa.Numeric(15, 2), server_default='0'),
        sa.Column('reimbursable_amount', sa.Numeric(15, 2), server_default='0'),
        sa.Column('status', sa.String(50), server_default='draft'),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('submitted_by_email', sa.String(255), nullable=True),
        sa.Column('approved_by_email', sa.String(255), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('rejected_by_email', sa.String(255), nullable=True),
        sa.Column('rejected_at', sa.DateTime(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('reimbursement_method', sa.String(50), nullable=True),
        sa.Column('reimbursed_at', sa.DateTime(), nullable=True),
        sa.Column('reimbursement_transaction_id', sa.String(100), nullable=True),
        sa.Column('bank_account_last_four', sa.String(4), nullable=True),
        sa.Column('routing_number', sa.String(50), nullable=True),
        sa.Column('journal_entry_id', sa.Integer(), nullable=True),
        sa.Column('memo', sa.Text(), nullable=True),
        sa.Column('internal_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id']),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['journal_entries.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_expense_reports_report_number', 'expense_reports', ['report_number'], unique=True)
    op.create_index('ix_expense_reports_entity_id', 'expense_reports', ['entity_id'])
    op.create_index('ix_expense_reports_employee_email', 'expense_reports', ['employee_email'])
    op.create_index('ix_expense_reports_status', 'expense_reports', ['status'])
    
    # Expense Lines
    op.create_table(
        'expense_lines',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('expense_report_id', sa.Integer(), nullable=False),
        sa.Column('line_number', sa.Integer(), nullable=False),
        sa.Column('expense_date', sa.Date(), nullable=False),
        sa.Column('merchant', sa.String(255), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('tax_amount', sa.Numeric(15, 2), server_default='0'),
        sa.Column('is_tax_deductible', sa.Boolean(), server_default='1'),
        sa.Column('deductibility_percentage', sa.Numeric(5, 2), server_default='100'),
        sa.Column('expense_account_id', sa.Integer(), nullable=True),
        sa.Column('project_id', sa.Integer(), nullable=True),
        sa.Column('receipt_document_id', sa.Integer(), nullable=True),
        sa.Column('ocr_extracted', sa.Boolean(), server_default='0'),
        sa.Column('ocr_confidence', sa.Numeric(5, 2), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['expense_report_id'], ['expense_reports.id']),
        sa.ForeignKeyConstraint(['expense_account_id'], ['chart_of_accounts.id']),
        sa.ForeignKeyConstraint(['receipt_document_id'], ['accounting_documents.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_expense_lines_expense_report_id', 'expense_lines', ['expense_report_id'])
    
    # Timesheets
    op.create_table(
        'timesheets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('timesheet_number', sa.String(50), nullable=False),
        sa.Column('week_start_date', sa.Date(), nullable=False),
        sa.Column('week_end_date', sa.Date(), nullable=False),
        sa.Column('employee_email', sa.String(255), nullable=False),
        sa.Column('employee_name', sa.String(255), nullable=True),
        sa.Column('total_hours', sa.Numeric(10, 2), server_default='0'),
        sa.Column('regular_hours', sa.Numeric(10, 2), server_default='0'),
        sa.Column('overtime_hours', sa.Numeric(10, 2), server_default='0'),
        sa.Column('status', sa.String(50), server_default='draft'),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('approved_by_email', sa.String(255), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('rejected_by_email', sa.String(255), nullable=True),
        sa.Column('rejected_at', sa.DateTime(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('payroll_run_id', sa.Integer(), nullable=True),
        sa.Column('processed_in_payroll', sa.Boolean(), server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_timesheets_timesheet_number', 'timesheets', ['timesheet_number'], unique=True)
    op.create_index('ix_timesheets_entity_id', 'timesheets', ['entity_id'])
    op.create_index('ix_timesheets_employee_email', 'timesheets', ['employee_email'])
    op.create_index('ix_timesheets_status', 'timesheets', ['status'])
    op.create_index('ix_timesheets_week_start_date', 'timesheets', ['week_start_date'])
    
    # Timesheet Entries
    op.create_table(
        'timesheet_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timesheet_id', sa.Integer(), nullable=False),
        sa.Column('work_date', sa.Date(), nullable=False),
        sa.Column('hours', sa.Numeric(10, 2), nullable=False),
        sa.Column('project_name', sa.String(255), nullable=True),
        sa.Column('task_description', sa.Text(), nullable=True),
        sa.Column('pay_type', sa.String(50), server_default='Regular'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['timesheet_id'], ['timesheets.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_timesheet_entries_timesheet_id', 'timesheet_entries', ['timesheet_id'])
    
    # Payroll Runs
    op.create_table(
        'payroll_runs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('payroll_run_number', sa.String(50), nullable=False),
        sa.Column('pay_period_start', sa.Date(), nullable=False),
        sa.Column('pay_period_end', sa.Date(), nullable=False),
        sa.Column('pay_date', sa.Date(), nullable=False),
        sa.Column('payroll_type', sa.String(50), server_default='Regular'),
        sa.Column('total_gross_wages', sa.Numeric(15, 2), server_default='0'),
        sa.Column('total_federal_withholding', sa.Numeric(15, 2), server_default='0'),
        sa.Column('total_state_withholding', sa.Numeric(15, 2), server_default='0'),
        sa.Column('total_fica_employee', sa.Numeric(15, 2), server_default='0'),
        sa.Column('total_medicare_employee', sa.Numeric(15, 2), server_default='0'),
        sa.Column('total_fica_employer', sa.Numeric(15, 2), server_default='0'),
        sa.Column('total_medicare_employer', sa.Numeric(15, 2), server_default='0'),
        sa.Column('total_futa', sa.Numeric(15, 2), server_default='0'),
        sa.Column('total_suta', sa.Numeric(15, 2), server_default='0'),
        sa.Column('total_ca_sdi', sa.Numeric(15, 2), server_default='0'),
        sa.Column('total_ca_ett', sa.Numeric(15, 2), server_default='0'),
        sa.Column('total_deductions', sa.Numeric(15, 2), server_default='0'),
        sa.Column('total_net_pay', sa.Numeric(15, 2), server_default='0'),
        sa.Column('status', sa.String(50), server_default='draft'),
        sa.Column('approved_by_email', sa.String(255), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('processed_by_email', sa.String(255), nullable=True),
        sa.Column('ach_batch_id', sa.String(100), nullable=True),
        sa.Column('ach_batch_status', sa.String(50), nullable=True),
        sa.Column('journal_entry_id', sa.Integer(), nullable=True),
        sa.Column('form_941_filed', sa.Boolean(), server_default='0'),
        sa.Column('form_941_filed_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id']),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['journal_entries.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_payroll_runs_payroll_run_number', 'payroll_runs', ['payroll_run_number'], unique=True)
    op.create_index('ix_payroll_runs_entity_id', 'payroll_runs', ['entity_id'])
    op.create_index('ix_payroll_runs_status', 'payroll_runs', ['status'])
    op.create_index('ix_payroll_runs_pay_period_start', 'payroll_runs', ['pay_period_start'])
    op.create_index('ix_payroll_runs_pay_period_end', 'payroll_runs', ['pay_period_end'])
    
    # Paystubs
    op.create_table(
        'paystubs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('payroll_run_id', sa.Integer(), nullable=False),
        sa.Column('employee_email', sa.String(255), nullable=False),
        sa.Column('employee_name', sa.String(255), nullable=True),
        sa.Column('gross_wages', sa.Numeric(15, 2), nullable=False),
        sa.Column('regular_wages', sa.Numeric(15, 2), server_default='0'),
        sa.Column('overtime_wages', sa.Numeric(15, 2), server_default='0'),
        sa.Column('bonus', sa.Numeric(15, 2), server_default='0'),
        sa.Column('regular_hours', sa.Numeric(10, 2), server_default='0'),
        sa.Column('overtime_hours', sa.Numeric(10, 2), server_default='0'),
        sa.Column('federal_withholding', sa.Numeric(15, 2), server_default='0'),
        sa.Column('fica_employee', sa.Numeric(15, 2), server_default='0'),
        sa.Column('medicare_employee', sa.Numeric(15, 2), server_default='0'),
        sa.Column('additional_medicare', sa.Numeric(15, 2), server_default='0'),
        sa.Column('state_withholding', sa.Numeric(15, 2), server_default='0'),
        sa.Column('ca_sdi', sa.Numeric(15, 2), server_default='0'),
        sa.Column('fica_employer', sa.Numeric(15, 2), server_default='0'),
        sa.Column('medicare_employer', sa.Numeric(15, 2), server_default='0'),
        sa.Column('futa', sa.Numeric(15, 2), server_default='0'),
        sa.Column('suta', sa.Numeric(15, 2), server_default='0'),
        sa.Column('ca_ett', sa.Numeric(15, 2), server_default='0'),
        sa.Column('total_deductions', sa.Numeric(15, 2), server_default='0'),
        sa.Column('net_pay', sa.Numeric(15, 2), nullable=False),
        sa.Column('ytd_gross', sa.Numeric(15, 2), server_default='0'),
        sa.Column('ytd_federal_withholding', sa.Numeric(15, 2), server_default='0'),
        sa.Column('ytd_fica', sa.Numeric(15, 2), server_default='0'),
        sa.Column('ytd_medicare', sa.Numeric(15, 2), server_default='0'),
        sa.Column('ytd_state_withholding', sa.Numeric(15, 2), server_default='0'),
        sa.Column('ytd_net_pay', sa.Numeric(15, 2), server_default='0'),
        sa.Column('payment_method', sa.String(50), server_default='Direct Deposit'),
        sa.Column('bank_account_last_four', sa.String(4), nullable=True),
        sa.Column('direct_deposit_transaction_id', sa.String(100), nullable=True),
        sa.Column('w4_configuration', sa.JSON(), nullable=True),
        sa.Column('de4_configuration', sa.JSON(), nullable=True),
        sa.Column('timesheet_ids', sa.JSON(), nullable=True),
        sa.Column('paystub_pdf_path', sa.String(500), nullable=True),
        sa.Column('paystub_generated_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['payroll_run_id'], ['payroll_runs.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_paystubs_payroll_run_id', 'paystubs', ['payroll_run_id'])
    op.create_index('ix_paystubs_employee_email', 'paystubs', ['employee_email'])
    
    # Employee Payroll Info
    op.create_table(
        'employee_payroll_info',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('employee_email', sa.String(255), nullable=False),
        sa.Column('employee_name', sa.String(255), nullable=False),
        sa.Column('job_title', sa.String(255), nullable=True),
        sa.Column('hire_date', sa.Date(), nullable=True),
        sa.Column('employment_type', sa.String(50), nullable=True),
        sa.Column('hourly_rate', sa.Numeric(15, 2), nullable=True),
        sa.Column('salary', sa.Numeric(15, 2), nullable=True),
        sa.Column('pay_frequency', sa.String(50), nullable=True),
        sa.Column('ssn_last_four', sa.String(4), nullable=True),
        sa.Column('w4_filing_status', sa.String(50), nullable=True),
        sa.Column('w4_multiple_jobs', sa.Boolean(), server_default='0'),
        sa.Column('w4_dependents_amount', sa.Numeric(15, 2), server_default='0'),
        sa.Column('w4_other_income', sa.Numeric(15, 2), server_default='0'),
        sa.Column('w4_deductions', sa.Numeric(15, 2), server_default='0'),
        sa.Column('w4_extra_withholding', sa.Numeric(15, 2), server_default='0'),
        sa.Column('de4_filing_status', sa.String(50), nullable=True),
        sa.Column('de4_allowances', sa.Integer(), server_default='0'),
        sa.Column('de4_extra_withholding', sa.Numeric(15, 2), server_default='0'),
        sa.Column('bank_name', sa.String(255), nullable=True),
        sa.Column('bank_routing_number', sa.String(50), nullable=True),
        sa.Column('bank_account_number_encrypted', sa.String(500), nullable=True),
        sa.Column('bank_account_last_four', sa.String(4), nullable=True),
        sa.Column('bank_account_type', sa.String(50), nullable=True),
        sa.Column('health_insurance_deduction', sa.Numeric(15, 2), server_default='0'),
        sa.Column('retirement_contribution', sa.Numeric(15, 2), server_default='0'),
        sa.Column('is_active', sa.Boolean(), server_default='1'),
        sa.Column('termination_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['entity_id'], ['accounting_entities.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_employee_payroll_info_employee_email', 'employee_payroll_info', ['employee_email'], unique=True)
    op.create_index('ix_employee_payroll_info_entity_id', 'employee_payroll_info', ['entity_id'])
    
    # Add foreign key from timesheets to payroll_runs (deferred)
    with op.batch_alter_table('timesheets', schema=None) as batch_op:
        batch_op.create_foreign_key(
            'fk_timesheets_payroll_run_id',
            'payroll_runs',
            ['payroll_run_id'],
            ['id']
        )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('employee_payroll_info')
    op.drop_table('paystubs')
    op.drop_table('payroll_runs')
    op.drop_table('timesheet_entries')
    op.drop_table('timesheets')
    op.drop_table('expense_lines')
    op.drop_table('expense_reports')

