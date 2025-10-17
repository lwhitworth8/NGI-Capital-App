"""
NGI Capital - Financial Reporting API
Epic 5: Generate 5 GAAP financial statements with Excel export

Author: NGI Capital Development Team
Date: October 3, 2025
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

from ..database_async import get_async_db
from ..models_accounting import AccountingEntity
from ..models_accounting_part3 import AccountingPeriod
try:
    from ..services.financial_statement_generator import FinancialStatementGenerator
    GENERATOR_AVAILABLE = True
except ImportError:
    FinancialStatementGenerator = None
    GENERATOR_AVAILABLE = False
try:
    from ..services.excel_export import ExcelFinancialStatementExporter
    EXCEL_AVAILABLE = True
except ImportError:
    ExcelFinancialStatementExporter = None
    EXCEL_AVAILABLE = False


router = APIRouter(
    prefix="/api/accounting/financial-reporting",
    tags=["Accounting - Financial Reporting"]
)


# ============================================================================
# SCHEMAS
# ============================================================================

class FinancialStatementRequest(BaseModel):
    entity_id: int
    period_end_date: str
    report_type: str = "monthly"  # monthly, quarterly, fiscal_year
    include_comparatives: bool = False  # YYYY-MM-DD


class FinancialPeriodResponse(BaseModel):
    id: int
    entity_id: int
    fiscal_year: int
    fiscal_period: int
    period_start_date: str
    period_end_date: str
    status: str
    is_locked: bool
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# PERIODS
# ============================================================================

@router.get("/periods", response_model=List[FinancialPeriodResponse])
async def get_financial_periods(
    entity_id: int = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Get all financial periods for an entity"""
    
    result = await db.execute(
        select(AccountingPeriod).where(
            AccountingPeriod.entity_id == entity_id
        ).order_by(AccountingPeriod.fiscal_year.desc(), AccountingPeriod.fiscal_period.desc())
    )
    
    periods = result.scalars().all()
    
    return [
        FinancialPeriodResponse(
            id=p.id,
            entity_id=p.entity_id,
            fiscal_year=p.fiscal_year,
            fiscal_period=p.fiscal_period,
            period_start_date=p.period_start_date.isoformat(),
            period_end_date=p.period_end_date.isoformat(),
            status=p.status,
            is_locked=p.is_locked
        )
        for p in periods
    ]


# ============================================================================
# GENERATE STATEMENTS
# ============================================================================

@router.post("/generate")
async def generate_financial_statements(
    request: FinancialStatementRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Generate complete financial statement package
    Returns JSON with all 5 statements plus notes
    """
    
    # Validate entity exists
    entity_result = await db.execute(
        select(AccountingEntity).where(AccountingEntity.id == request.entity_id)
    )
    entity = entity_result.scalar_one_or_none()
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Parse date
    try:
        period_end = date.fromisoformat(request.period_end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Generate statements using real trial balance data
    if FinancialStatementGenerator:
        generator = FinancialStatementGenerator(db, request.entity_id, period_end)
        statements = await generator.generate_all_statements()
        return statements
    else:
        # Fallback: Generate from trial balance directly
        from sqlalchemy import text as sa_text
        from ..database import get_db as get_sync_db
        
        sync_db = next(get_sync_db())
        
        # Get trial balance for period
        tb_data = sync_db.execute(
            sa_text("""
                SELECT coa.account_number, coa.account_name, coa.account_type, 
                       COALESCE(SUM(jel.debit_amount), 0) as total_debits,
                       COALESCE(SUM(jel.credit_amount), 0) as total_credits
                FROM chart_of_accounts coa
                LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
                LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
                WHERE coa.entity_id = :eid 
                  AND coa.is_active = 1
                  AND (je.entry_date IS NULL OR je.entry_date <= :period_end)
                  AND (je.status IS NULL OR je.status = 'posted')
                GROUP BY coa.id, coa.account_number, coa.account_name, coa.account_type
                ORDER BY coa.account_number
            """),
            {"eid": request.entity_id, "period_end": period_end.isoformat()}
        ).fetchall()
        
        # Build statements from trial balance
        return _build_statements_from_trial_balance(tb_data, entity.entity_name, period_end)


async def _build_statements_from_trial_balance(db, entity_id, period_end):
    """Build financial statements from trial balance data - shows ALL accounts even with $0 balances"""
    
    # Get all chart of accounts for the entity
    result = await db.execute(text("""
        SELECT account_number, account_name, account_type, normal_balance
        FROM chart_of_accounts 
        WHERE entity_id = :entity_id AND is_active = 1
        ORDER BY account_number
    """), {"entity_id": entity_id})
    
    all_accounts = result.fetchall()
    
    # Get actual balances from journal entries
    result = await db.execute(text("""
        SELECT 
            coa.account_number,
            coa.account_name,
            coa.account_type,
            COALESCE(SUM(jel.debit_amount), 0) as total_debits,
            COALESCE(SUM(jel.credit_amount), 0) as total_credits
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.entity_id = :entity_id 
        AND coa.is_active = 1
        AND (je.status = 'posted' OR je.status IS NULL)
        AND (je.entry_date <= :period_end OR je.entry_date IS NULL)
        GROUP BY coa.id, coa.account_number, coa.account_name, coa.account_type, coa.normal_balance
        ORDER BY coa.account_number
    """), {"entity_id": entity_id, "period_end": period_end})
    
    trial_balance = result.fetchall()
    
    # Create accounts dictionary with actual balances
    accounts = {}
    for row in trial_balance:
        account_num, account_name, account_type, debits, credits = row
        balance = float(debits) - float(credits)
        if account_type in ['liability', 'equity', 'revenue']:
            balance = -balance  # Reverse for normal credit balance accounts
        accounts[account_num] = {
            "name": account_name,
            "type": account_type,
            "balance": balance
        }
    
    # Extract balances by type
    assets = {k: v for k, v in accounts.items() if v['type'] == 'asset'}
    liabilities = {k: v for k, v in accounts.items() if v['type'] == 'liability'}
    equity = {k: v for k, v in accounts.items() if v['type'] == 'equity'}
    revenue = {k: v for k, v in accounts.items() if v['type'] == 'revenue'}
    expenses = {k: v for k, v in accounts.items() if v['type'] == 'expense'}
    
    # Calculate totals
    total_assets = sum(acc['balance'] for acc in assets.values())
    total_liabilities = sum(acc['balance'] for acc in liabilities.values())
    total_equity = sum(acc['balance'] for acc in equity.values())
    total_revenue = sum(acc['balance'] for acc in revenue.values())
    total_expenses = sum(acc['balance'] for acc in expenses.values())
    
    # Build statements
    return {
        "balance_sheet": {
            "assets": assets,
            "liabilities": liabilities,
            "equity": equity,
            "total_assets": total_assets,
            "total_liabilities": total_liabilities,
            "total_equity": total_equity,
            "balanced": abs(total_assets - (total_liabilities + total_equity)) < 0.01
        },
        "income_statement": {
            "revenue": revenue,
            "expenses": expenses,
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "net_income": total_revenue - total_expenses
        },
        "cash_flow": {
            "operating_activities": {},
            "investing_activities": {},
            "financing_activities": {},
            "net_cash_flow": 0
        },
        "stockholders_equity": {
            "beginning_equity": 0,
            "net_income": total_revenue - total_expenses,
            "ending_equity": total_equity
        },
        "comprehensive_income": {
            "net_income": total_revenue - total_expenses,
            "other_comprehensive_income": 0,
            "total_comprehensive_income": total_revenue - total_expenses
        }
    }
    
    # Extract balances by type
    assets = {k: v for k, v in accounts.items() if v['type'] == 'asset'}
    liabilities = {k: v for k, v in accounts.items() if v['type'] == 'liability'}
    equity = {k: v for k, v in accounts.items() if v['type'] == 'equity'}
    revenue = {k: v for k, v in accounts.items() if v['type'] == 'revenue'}
    expenses = {k: v for k, v in accounts.items() if v['type'] == 'expense'}
    
    total_assets = sum(a['balance'] for a in assets.values())
    total_liabilities = sum(l['balance'] for l in liabilities.values())
    total_equity = sum(e['balance'] for e in equity.values())
    total_revenue = sum(r['balance'] for r in revenue.values())
    total_expenses = sum(e['balance'] for e in expenses.values())
    net_income = total_revenue - total_expenses
    
    return {
        "entity_name": entity_name,
        "period_end_date": period_end.isoformat(),
        "statements": {
            "balance_sheet": {
                "assets": assets,
                "liabilities": liabilities,
                "equity": equity,
                "total_assets": total_assets,
                "total_liabilities": total_liabilities,
                "total_equity": total_equity,
                "balanced": abs(total_assets - (total_liabilities + total_equity)) < 0.01
            },
            "income_statement": {
                "revenue": revenue,
                "expenses": expenses,
                "total_revenue": total_revenue,
                "total_expenses": total_expenses,
                "net_income": net_income
            },
            "cash_flows": {},
            "stockholders_equity": {},
            "comprehensive_income": {}
        },
        "notes": [],
        "generated_at": datetime.now().isoformat()
    }


@router.get("/preview")
async def preview_financial_statements(
    entity_id: int = Query(...),
    period_end_date: str = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Preview financial statements (same as generate, but GET endpoint)
    """
    
    # Validate entity exists
    entity_result = await db.execute(
        select(AccountingEntity).where(AccountingEntity.id == entity_id)
    )
    entity = entity_result.scalar_one_or_none()
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Parse date
    try:
        period_end = date.fromisoformat(period_end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Generate statements
    generator = FinancialStatementGenerator(db, entity_id, period_end)
    statements = await generator.generate_all_statements()
    
    return statements


# ============================================================================
# EXCEL EXPORT
# ============================================================================

@router.get("/export/excel")
async def export_to_excel(
    entity_id: int = Query(...),
    period_end_date: str = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Export financial statements to Excel (Deloitte EGC format)
    Returns Excel file for download
    Perfect for investor packages and board presentations
    """
    
    # Validate entity exists
    entity_result = await db.execute(
        select(AccountingEntity).where(AccountingEntity.id == entity_id)
    )
    entity = entity_result.scalar_one_or_none()
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Parse date
    try:
        period_end = date.fromisoformat(period_end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Generate statements
    if not GENERATOR_AVAILABLE or FinancialStatementGenerator is None:
        # Fallback to simple statement generation
        statements = await _build_statements_from_trial_balance(db, entity_id, period_end)
    else:
        generator = FinancialStatementGenerator(db, entity_id, period_end)
        statements = await generator.generate_all_statements()
    
    # Export to Excel
    if not EXCEL_AVAILABLE or ExcelFinancialStatementExporter is None:
        raise HTTPException(
            status_code=500,
            detail="Excel export is not available. Please install openpyxl."
        )
    
    try:
        exporter = ExcelFinancialStatementExporter(statements)
        excel_file = exporter.generate_workbook()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate Excel file: {str(e)}"
        )
    
    # Create filename
    entity_name = entity.entity_name.replace(" ", "_")
    period_str = period_end.strftime("%Y-%m-%d")
    filename = f"{entity_name}_Financial_Statements_{period_str}.xlsx"
    
    # Return as downloadable file
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============================================================================
# TEMPLATE DOWNLOADS
# ============================================================================

@router.get("/templates/chart-of-accounts")
async def download_chart_of_accounts_template():
    """Download blank chart of accounts template for new entities"""
    try:
        # Create a simple Excel template with chart of accounts structure
        wb = Workbook()
        ws = wb.active
        ws.title = "Chart of Accounts Template"
        
        # Headers
        headers = [
            "Account Number", "Account Name", "Account Type", "Normal Balance", 
            "Parent Account", "Description", "Is Posting Account", "Is Active"
        ]
        
        for col, header in enumerate(headers, 1):
            ws.cell(row=1, column=col, value=header)
        
        # Sample accounts for each type
        sample_accounts = [
            # Assets
            ("1000", "Cash and Cash Equivalents", "Asset", "Debit", "", "Primary operating cash accounts", "Yes", "Yes"),
            ("1100", "Accounts Receivable", "Asset", "Debit", "", "Amounts owed by customers", "Yes", "Yes"),
            ("1200", "Inventory", "Asset", "Debit", "", "Raw materials and finished goods", "Yes", "Yes"),
            ("1300", "Prepaid Expenses", "Asset", "Debit", "", "Expenses paid in advance", "Yes", "Yes"),
            ("1400", "Property, Plant & Equipment", "Asset", "Debit", "", "Fixed assets", "Yes", "Yes"),
            ("1500", "Accumulated Depreciation", "Asset", "Credit", "1400", "Contra-asset for depreciation", "Yes", "Yes"),
            
            # Liabilities
            ("2000", "Accounts Payable", "Liability", "Credit", "", "Amounts owed to vendors", "Yes", "Yes"),
            ("2100", "Accrued Expenses", "Liability", "Credit", "", "Expenses incurred but not yet paid", "Yes", "Yes"),
            ("2200", "Deferred Revenue", "Liability", "Credit", "", "Revenue received in advance", "Yes", "Yes"),
            ("2300", "Notes Payable", "Liability", "Credit", "", "Formal debt obligations", "Yes", "Yes"),
            
            # Equity
            ("3000", "Members' Capital", "Equity", "Credit", "", "Members' initial contributions", "Yes", "Yes"),
            ("3100", "Retained Earnings", "Equity", "Credit", "", "Accumulated net income/loss", "Yes", "Yes"),
            ("3200", "Current Year Earnings", "Equity", "Credit", "", "Current period net income/loss", "Yes", "Yes"),
            
            # Revenue
            ("4000", "Service Revenue", "Revenue", "Credit", "", "Revenue from services provided", "Yes", "Yes"),
            ("4100", "Interest Income", "Revenue", "Credit", "", "Interest earned on investments", "Yes", "Yes"),
            ("4200", "Other Income", "Revenue", "Credit", "", "Miscellaneous income", "Yes", "Yes"),
            
            # Expenses
            ("5000", "Cost of Services", "Expense", "Debit", "", "Direct costs of providing services", "Yes", "Yes"),
            ("5100", "Salaries and Wages", "Expense", "Debit", "", "Employee compensation", "Yes", "Yes"),
            ("5200", "Rent Expense", "Expense", "Debit", "", "Office and facility rent", "Yes", "Yes"),
            ("5300", "Utilities", "Expense", "Debit", "", "Electricity, water, internet", "Yes", "Yes"),
            ("5400", "Professional Services", "Expense", "Debit", "", "Legal, accounting, consulting", "Yes", "Yes"),
            ("5500", "Marketing and Advertising", "Expense", "Debit", "", "Promotional activities", "Yes", "Yes"),
            ("5600", "Travel and Entertainment", "Expense", "Debit", "", "Business travel and meals", "Yes", "Yes"),
            ("5700", "Office Supplies", "Expense", "Debit", "", "General office materials", "Yes", "Yes"),
            ("5800", "Insurance", "Expense", "Debit", "", "Business insurance premiums", "Yes", "Yes"),
            ("5900", "Depreciation Expense", "Expense", "Debit", "", "Periodic depreciation charges", "Yes", "Yes"),
            ("6000", "Interest Expense", "Expense", "Debit", "", "Interest on debt", "Yes", "Yes"),
            ("6100", "Other Expenses", "Expense", "Debit", "", "Miscellaneous operating expenses", "Yes", "Yes"),
        ]
        
        for row, account in enumerate(sample_accounts, 2):
            for col, value in enumerate(account, 1):
                ws.cell(row=row, column=col, value=value)
        
        # Auto-fit columns
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width
        
        # Save to BytesIO
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=chart_of_accounts_template.xlsx"
            }
        )
        
    except Exception as e:
        logger.error(f"Error creating chart of accounts template: {e}")
        raise HTTPException(status_code=500, detail="Failed to create template")


@router.get("/templates/sample-quarterly")
async def download_sample_quarterly_report():
    """Download sample quarterly financial report template"""
    try:
        # Create sample quarterly report with realistic data
        wb = Workbook()
        
        # Remove default sheet
        wb.remove(wb.active)
        
        # Create Balance Sheet
        bs_ws = wb.create_sheet("Balance Sheet")
        bs_ws.append(["NGI Capital LLC", "", ""])
        bs_ws.append(["Balance Sheet", "", ""])
        bs_ws.append(["As of September 30, 2025", "", ""])
        bs_ws.append(["", "", ""])
        bs_ws.append(["ASSETS", "", ""])
        bs_ws.append(["Current Assets", "", ""])
        bs_ws.append(["  Cash and Cash Equivalents", "", "$125,000"])
        bs_ws.append(["  Accounts Receivable", "", "$45,000"])
        bs_ws.append(["  Prepaid Expenses", "", "$8,500"])
        bs_ws.append(["Total Current Assets", "", "$178,500"])
        bs_ws.append(["", "", ""])
        bs_ws.append(["Property, Plant & Equipment", "", ""])
        bs_ws.append(["  Computer Equipment", "", "$25,000"])
        bs_ws.append(["  Less: Accumulated Depreciation", "", "($5,000)"])
        bs_ws.append(["  Net Property & Equipment", "", "$20,000"])
        bs_ws.append(["", "", ""])
        bs_ws.append(["TOTAL ASSETS", "", "$198,500"])
        bs_ws.append(["", "", ""])
        bs_ws.append(["LIABILITIES AND MEMBERS' EQUITY", "", ""])
        bs_ws.append(["Current Liabilities", "", ""])
        bs_ws.append(["  Accounts Payable", "", "$12,000"])
        bs_ws.append(["  Accrued Expenses", "", "$8,500"])
        bs_ws.append(["  Deferred Revenue", "", "$15,000"])
        bs_ws.append(["Total Current Liabilities", "", "$35,500"])
        bs_ws.append(["", "", ""])
        bs_ws.append(["Members' Equity", "", ""])
        bs_ws.append(["  Members' Capital", "", "$150,000"])
        bs_ws.append(["  Retained Earnings", "", "$13,000"])
        bs_ws.append(["Total Members' Equity", "", "$163,000"])
        bs_ws.append(["", "", ""])
        bs_ws.append(["TOTAL LIABILITIES AND EQUITY", "", "$198,500"])
        
        # Create Income Statement
        is_ws = wb.create_sheet("Income Statement")
        is_ws.append(["NGI Capital LLC", "", ""])
        is_ws.append(["Statement of Operations", "", ""])
        is_ws.append(["For the Quarter Ended September 30, 2025", "", ""])
        is_ws.append(["", "", ""])
        bs_ws.append(["REVENUE", "", ""])
        bs_ws.append(["  Advisory Services", "", "$85,000"])
        bs_ws.append(["  Management Fees", "", "$12,000"])
        bs_ws.append(["Total Revenue", "", "$97,000"])
        bs_ws.append(["", "", ""])
        bs_ws.append(["OPERATING EXPENSES", "", ""])
        bs_ws.append(["  Salaries and Wages", "", "$35,000"])
        bs_ws.append(["  Professional Services", "", "$8,500"])
        bs_ws.append(["  Rent and Utilities", "", "$6,000"])
        bs_ws.append(["  Marketing and Advertising", "", "$4,500"])
        bs_ws.append(["  Travel and Entertainment", "", "$3,200"])
        bs_ws.append(["  Office Supplies", "", "$1,800"])
        bs_ws.append(["  Insurance", "", "$2,400"])
        bs_ws.append(["  Depreciation", "", "$1,667"])
        bs_ws.append(["  Other Expenses", "", "$2,100"])
        bs_ws.append(["Total Operating Expenses", "", "$65,167"])
        bs_ws.append(["", "", ""])
        bs_ws.append(["OPERATING INCOME", "", "$31,833"])
        bs_ws.append(["", "", ""])
        bs_ws.append(["NET INCOME", "", "$31,833"])
        
        # Save to BytesIO
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=sample_quarterly_report.xlsx"
            }
        )
        
    except Exception as e:
        logger.error(f"Error creating sample quarterly report: {e}")
        raise HTTPException(status_code=500, detail="Failed to create sample report")


# ============================================================================
# INDIVIDUAL STATEMENTS
# ============================================================================

@router.get("/balance-sheet")
async def get_balance_sheet(
    entity_id: int = Query(...),
    period_end_date: str = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Get balance sheet only"""
    
    try:
        period_end = date.fromisoformat(period_end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    generator = FinancialStatementGenerator(db, entity_id, period_end)
    balance_sheet = await generator.generate_balance_sheet()
    
    return {
        "entity_id": entity_id,
        "period_end_date": period_end_date,
        "statement": balance_sheet
    }


@router.get("/income-statement")
async def get_income_statement(
    entity_id: int = Query(...),
    period_end_date: str = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Get income statement only (with expense disaggregation per 2025 GAAP)"""
    
    try:
        period_end = date.fromisoformat(period_end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    generator = FinancialStatementGenerator(db, entity_id, period_end)
    income_statement = await generator.generate_income_statement()
    
    return {
        "entity_id": entity_id,
        "period_end_date": period_end_date,
        "statement": income_statement
    }


@router.get("/cash-flows")
async def get_cash_flows(
    entity_id: int = Query(...),
    period_end_date: str = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Get statement of cash flows (indirect method per ASC 230)"""
    
    try:
        period_end = date.fromisoformat(period_end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    generator = FinancialStatementGenerator(db, entity_id, period_end)
    cash_flows = await generator.generate_cash_flows()
    
    return {
        "entity_id": entity_id,
        "period_end_date": period_end_date,
        "statement": cash_flows
    }


@router.get("/stockholders-equity")
async def get_stockholders_equity(
    entity_id: int = Query(...),
    period_end_date: str = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Get statement of stockholders' equity"""
    
    try:
        period_end = date.fromisoformat(period_end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    generator = FinancialStatementGenerator(db, entity_id, period_end)
    equity = await generator.generate_stockholders_equity()
    
    return {
        "entity_id": entity_id,
        "period_end_date": period_end_date,
        "statement": equity
    }


@router.get("/comprehensive-income")
async def get_comprehensive_income(
    entity_id: int = Query(...),
    period_end_date: str = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """Get statement of comprehensive income (2025 GAAP requirement)"""
    
    try:
        period_end = date.fromisoformat(period_end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    generator = FinancialStatementGenerator(db, entity_id, period_end)
    comp_income = await generator.generate_comprehensive_income()
    
    return {
        "entity_id": entity_id,
        "period_end_date": period_end_date,
        "statement": comp_income
    }


# ============================================================================
# INVESTOR PACKAGE
# ============================================================================

@router.get("/investor-package")
async def create_investor_package(
    entity_id: int = Query(...),
    period_end_date: str = Query(...),
    include_notes: bool = Query(True),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Create complete investor package
    Returns Excel file with all statements, notes, and cover page
    Deloitte EGC format for professional presentation
    """
    
    # Validate entity
    entity_result = await db.execute(
        select(AccountingEntity).where(AccountingEntity.id == entity_id)
    )
    entity = entity_result.scalar_one_or_none()
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Parse date
    try:
        period_end = date.fromisoformat(period_end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Generate complete financial statements
    generator = FinancialStatementGenerator(db, entity_id, period_end)
    statements = await generator.generate_all_statements()
    
    # Export to professional Excel format
    try:
        exporter = ExcelFinancialStatementExporter(statements)
        excel_file = exporter.generate_workbook()
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Excel export requires openpyxl. Please install: pip install openpyxl"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate investor package: {str(e)}"
        )
    
    # Create filename with timestamp
    entity_name = entity.entity_name.replace(" ", "_")
    period_str = period_end.strftime("%Y%m%d")
    filename = f"{entity_name}_Investor_Package_{period_str}.xlsx"
    
    # Return as downloadable file
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Financial-Period": period_end_date,
            "X-Entity-Name": entity.entity_name
        }
    )

