"""
Expenses & Payroll API Routes
Complete API for expense reports, timesheets, and payroll processing
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
import logging

from ..database_async import get_async_db
from src.api.models_expenses_payroll import (
    ExpenseReport, ExpenseLine, Timesheet, TimesheetEntry,
    PayrollRun, Paystub, EmployeePayrollInfo
)
from src.api.services.expense_workflow_service import ExpenseWorkflowService
from src.api.services.payroll_calculation_service import PayrollCalculationService
from src.api.services.mercury_ach_service import MercuryACHService
from src.api.utils.datetime_utils import get_pst_now
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/accounting/expenses-payroll", tags=["expenses-payroll"])


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class ExpenseLineCreate(BaseModel):
    expense_date: date
    merchant: str
    category: str
    description: str
    amount: float
    tax_amount: float = 0
    is_tax_deductible: bool = True
    deductibility_percentage: float = 100

class ExpenseReportCreate(BaseModel):
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    memo: Optional[str] = None
    lines: List[ExpenseLineCreate]

class TimesheetEntryCreate(BaseModel):
    work_date: date
    hours: float
    project_name: Optional[str] = None
    task_description: Optional[str] = None
    pay_type: str = "Regular"

class TimesheetCreate(BaseModel):
    week_start_date: date
    week_end_date: date
    entries: List[TimesheetEntryCreate]


# ============================================================================
# EXPENSE REPORTS
# ============================================================================

@router.get("/expense-reports")
async def get_expense_reports(
    entity_id: int = Query(...),
    status: Optional[str] = None,
    employee_email: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """Get expense reports with filters"""
    try:
        query = select(ExpenseReport).where(ExpenseReport.entity_id == entity_id)
        
        if status:
            query = query.where(ExpenseReport.status == status)
        if employee_email:
            query = query.where(ExpenseReport.employee_email == employee_email)
        if date_from:
            query = query.where(ExpenseReport.report_date >= date_from)
        if date_to:
            query = query.where(ExpenseReport.report_date <= date_to)
        
        query = query.order_by(ExpenseReport.report_date.desc())
        
        result = await db.execute(query)
        reports = result.scalars().all()
        
        return {
            "success": True,
            "reports": [
                {
                    "id": r.id,
                    "report_number": r.report_number,
                    "report_date": r.report_date.isoformat(),
                    "employee_email": r.employee_email,
                    "employee_name": r.employee_name,
                    "total_amount": float(r.total_amount),
                    "reimbursable_amount": float(r.reimbursable_amount),
                    "status": r.status,
                    "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
                    "approved_at": r.approved_at.isoformat() if r.approved_at else None,
                    "reimbursed_at": r.reimbursed_at.isoformat() if r.reimbursed_at else None
                }
                for r in reports
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching expense reports: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/expense-reports")
async def create_expense_report(
    entity_id: int,
    employee_email: str,
    employee_name: str,
    report_data: ExpenseReportCreate,
    db: AsyncSession = Depends(get_async_db)
):
    """Create new expense report"""
    try:
        # Generate report number
        report_number = await _generate_report_number(entity_id, "EXP", db)
        
        # Create report
        report = ExpenseReport(
            entity_id=entity_id,
            report_number=report_number,
            report_date=date.today(),
            period_start=report_data.period_start,
            period_end=report_data.period_end,
            employee_email=employee_email,
            employee_name=employee_name,
            memo=report_data.memo,
            status="draft",
            created_at=get_pst_now()
        )
        db.add(report)
        await db.flush()
        
        # Add lines
        total_amount = Decimal("0")
        reimbursable_amount = Decimal("0")
        
        for idx, line_data in enumerate(report_data.lines):
            line = ExpenseLine(
                expense_report_id=report.id,
                line_number=idx + 1,
                expense_date=line_data.expense_date,
                merchant=line_data.merchant,
                category=line_data.category,
                description=line_data.description,
                amount=Decimal(str(line_data.amount)),
                tax_amount=Decimal(str(line_data.tax_amount)),
                is_tax_deductible=line_data.is_tax_deductible,
                deductibility_percentage=Decimal(str(line_data.deductibility_percentage)),
                created_at=get_pst_now()
            )
            db.add(line)
            
            total_amount += line.amount
            if line.is_tax_deductible:
                reimbursable_amount += line.amount
        
        report.total_amount = total_amount
        report.reimbursable_amount = reimbursable_amount
        
        await db.commit()
        await db.refresh(report)
        
        return {
            "success": True,
            "message": "Expense report created",
            "report_id": report.id,
            "report_number": report.report_number
        }
        
    except Exception as e:
        logger.error(f"Error creating expense report: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/expense-reports/{report_id}/submit")
async def submit_expense_report(
    report_id: int,
    submitted_by_email: str,
    db: AsyncSession = Depends(get_async_db)
):
    """Submit expense report for approval"""
    try:
        workflow_service = ExpenseWorkflowService(db)
        result = await workflow_service.submit_for_approval(report_id, submitted_by_email)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting expense report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/expense-reports/{report_id}/approve")
async def approve_expense_report(
    report_id: int,
    approved_by_email: str,
    db: AsyncSession = Depends(get_async_db)
):
    """Approve expense report and create JE"""
    try:
        workflow_service = ExpenseWorkflowService(db)
        result = await workflow_service.approve(report_id, approved_by_email)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving expense report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/expense-reports/{report_id}/reject")
async def reject_expense_report(
    report_id: int,
    rejected_by_email: str,
    reason: str,
    db: AsyncSession = Depends(get_async_db)
):
    """Reject expense report"""
    try:
        workflow_service = ExpenseWorkflowService(db)
        result = await workflow_service.reject(report_id, rejected_by_email, reason)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting expense report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# TIMESHEETS
# ============================================================================

@router.get("/timesheets")
async def get_timesheets(
    entity_id: int = Query(...),
    employee_email: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """Get timesheets with filters"""
    try:
        query = select(Timesheet).where(Timesheet.entity_id == entity_id)
        
        if employee_email:
            query = query.where(Timesheet.employee_email == employee_email)
        if status:
            query = query.where(Timesheet.status == status)
        if date_from:
            query = query.where(Timesheet.week_start_date >= date_from)
        if date_to:
            query = query.where(Timesheet.week_end_date <= date_to)
        
        query = query.order_by(Timesheet.week_start_date.desc())
        
        result = await db.execute(query)
        timesheets = result.scalars().all()
        
        return {
            "success": True,
            "timesheets": [
                {
                    "id": t.id,
                    "timesheet_number": t.timesheet_number,
                    "week_start_date": t.week_start_date.isoformat(),
                    "week_end_date": t.week_end_date.isoformat(),
                    "employee_email": t.employee_email,
                    "employee_name": t.employee_name,
                    "total_hours": float(t.total_hours),
                    "regular_hours": float(t.regular_hours),
                    "overtime_hours": float(t.overtime_hours),
                    "status": t.status,
                    "submitted_at": t.submitted_at.isoformat() if t.submitted_at else None,
                    "approved_at": t.approved_at.isoformat() if t.approved_at else None
                }
                for t in timesheets
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching timesheets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/timesheets")
async def create_timesheet(
    entity_id: int,
    employee_email: str,
    employee_name: str,
    timesheet_data: TimesheetCreate,
    db: AsyncSession = Depends(get_async_db)
):
    """Create new timesheet"""
    try:
        # Generate timesheet number
        timesheet_number = await _generate_report_number(entity_id, "TS", db)
        
        # Create timesheet
        timesheet = Timesheet(
            entity_id=entity_id,
            timesheet_number=timesheet_number,
            week_start_date=timesheet_data.week_start_date,
            week_end_date=timesheet_data.week_end_date,
            employee_email=employee_email,
            employee_name=employee_name,
            status="draft",
            created_at=get_pst_now()
        )
        db.add(timesheet)
        await db.flush()
        
        # Add entries
        total_hours = Decimal("0")
        regular_hours = Decimal("0")
        overtime_hours = Decimal("0")
        
        for entry_data in timesheet_data.entries:
            entry = TimesheetEntry(
                timesheet_id=timesheet.id,
                work_date=entry_data.work_date,
                hours=Decimal(str(entry_data.hours)),
                project_name=entry_data.project_name,
                task_description=entry_data.task_description,
                pay_type=entry_data.pay_type,
                created_at=get_pst_now()
            )
            db.add(entry)
            
            total_hours += entry.hours
            if entry.pay_type == "Overtime":
                overtime_hours += entry.hours
            else:
                regular_hours += entry.hours
        
        timesheet.total_hours = total_hours
        timesheet.regular_hours = regular_hours
        timesheet.overtime_hours = overtime_hours
        
        await db.commit()
        await db.refresh(timesheet)
        
        return {
            "success": True,
            "message": "Timesheet created",
            "timesheet_id": timesheet.id,
            "timesheet_number": timesheet.timesheet_number
        }
        
    except Exception as e:
        logger.error(f"Error creating timesheet: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/timesheets/{timesheet_id}/submit")
async def submit_timesheet(
    timesheet_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Submit timesheet for approval"""
    try:
        result = await db.execute(
            select(Timesheet).where(Timesheet.id == timesheet_id)
        )
        timesheet = result.scalar_one_or_none()
        
        if not timesheet:
            raise HTTPException(status_code=404, detail="Timesheet not found")
        
        if timesheet.status != "draft":
            raise HTTPException(status_code=400, detail="Can only submit draft timesheets")
        
        timesheet.status = "submitted"
        timesheet.submitted_at = get_pst_now()
        
        await db.commit()
        
        return {"success": True, "message": "Timesheet submitted for approval"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting timesheet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/timesheets/{timesheet_id}/approve")
async def approve_timesheet(
    timesheet_id: int,
    approved_by_email: str,
    db: AsyncSession = Depends(get_async_db)
):
    """Approve timesheet"""
    try:
        result = await db.execute(
            select(Timesheet).where(Timesheet.id == timesheet_id)
        )
        timesheet = result.scalar_one_or_none()
        
        if not timesheet:
            raise HTTPException(status_code=404, detail="Timesheet not found")
        
        if timesheet.status != "submitted":
            raise HTTPException(status_code=400, detail="Can only approve submitted timesheets")
        
        # Cannot approve own timesheet
        if timesheet.employee_email == approved_by_email:
            raise HTTPException(status_code=403, detail="Cannot approve your own timesheet")
        
        timesheet.status = "approved"
        timesheet.approved_by_email = approved_by_email
        timesheet.approved_at = get_pst_now()
        
        await db.commit()
        
        return {"success": True, "message": "Timesheet approved"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving timesheet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# PAYROLL
# ============================================================================

@router.get("/payroll-runs")
async def get_payroll_runs(
    entity_id: int = Query(...),
    status: Optional[str] = None,
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """Get payroll runs"""
    try:
        query = select(PayrollRun).where(PayrollRun.entity_id == entity_id)
        
        if status:
            query = query.where(PayrollRun.status == status)
        if year:
            query = query.where(func.extract('year', PayrollRun.pay_period_start) == year)
        
        query = query.order_by(PayrollRun.pay_period_start.desc())
        
        result = await db.execute(query)
        payroll_runs = result.scalars().all()
        
        return {
            "success": True,
            "payroll_runs": [
                {
                    "id": pr.id,
                    "payroll_run_number": pr.payroll_run_number,
                    "pay_period_start": pr.pay_period_start.isoformat(),
                    "pay_period_end": pr.pay_period_end.isoformat(),
                    "pay_date": pr.pay_date.isoformat(),
                    "total_gross_wages": float(pr.total_gross_wages),
                    "total_net_pay": float(pr.total_net_pay),
                    "status": pr.status,
                    "approved_at": pr.approved_at.isoformat() if pr.approved_at else None,
                    "processed_at": pr.processed_at.isoformat() if pr.processed_at else None
                }
                for pr in payroll_runs
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching payroll runs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payroll-runs/calculate")
async def calculate_payroll(
    entity_id: int,
    pay_period_start: date,
    pay_period_end: date,
    pay_date: date,
    timesheet_ids: List[int],
    db: AsyncSession = Depends(get_async_db)
):
    """Calculate payroll from approved timesheets"""
    try:
        # Generate payroll run number
        payroll_number = await _generate_report_number(entity_id, "PR", db)
        
        # Create payroll run
        payroll_run = PayrollRun(
            entity_id=entity_id,
            payroll_run_number=payroll_number,
            pay_period_start=pay_period_start,
            pay_period_end=pay_period_end,
            pay_date=pay_date,
            payroll_type="Regular",
            status="draft",
            created_at=get_pst_now()
        )
        db.add(payroll_run)
        await db.flush()
        
        # Process each timesheet
        for timesheet_id in timesheet_ids:
            result = await db.execute(
                select(Timesheet).where(Timesheet.id == timesheet_id)
            )
            timesheet = result.scalar_one_or_none()
            
            if not timesheet or timesheet.status != "approved":
                continue
            
            # Get employee payroll info
            emp_result = await db.execute(
                select(EmployeePayrollInfo).where(
                    EmployeePayrollInfo.employee_email == timesheet.employee_email
                )
            )
            employee = emp_result.scalar_one_or_none()
            
            if not employee:
                continue
            
            # Calculate gross wages
            gross_wages = float(timesheet.regular_hours) * float(employee.hourly_rate or 0)
            if timesheet.overtime_hours > 0:
                overtime_rate = float(employee.hourly_rate or 0) * 1.5
                gross_wages += float(timesheet.overtime_hours) * overtime_rate
            
            # Get employee config
            employee_config = {
                "w4_filing_status": employee.w4_filing_status,
                "w4_multiple_jobs": employee.w4_multiple_jobs,
                "w4_dependents_amount": float(employee.w4_dependents_amount or 0),
                "w4_other_income": float(employee.w4_other_income or 0),
                "w4_deductions": float(employee.w4_deductions or 0),
                "w4_extra_withholding": float(employee.w4_extra_withholding or 0),
                "de4_filing_status": employee.de4_filing_status,
                "de4_allowances": employee.de4_allowances or 0,
                "de4_extra_withholding": float(employee.de4_extra_withholding or 0)
            }
            
            # Calculate complete paycheck
            paycheck = await PayrollCalculationService.calculate_complete_paycheck(
                Decimal(str(gross_wages)),
                Decimal("0"),  # YTD gross (would need to calculate from previous paystubs)
                employee.pay_frequency or "Bi-Weekly",
                employee_config,
                db
            )
            
            # Create paystub
            paystub = Paystub(
                payroll_run_id=payroll_run.id,
                employee_email=timesheet.employee_email,
                employee_name=timesheet.employee_name,
                gross_wages=Decimal(str(paycheck["gross_wages"])),
                regular_wages=Decimal(str(gross_wages - (float(timesheet.overtime_hours) * float(employee.hourly_rate or 0) * 0.5 if timesheet.overtime_hours > 0 else 0))),
                overtime_wages=Decimal(str(float(timesheet.overtime_hours) * float(employee.hourly_rate or 0) * 0.5 if timesheet.overtime_hours > 0 else 0)),
                regular_hours=timesheet.regular_hours,
                overtime_hours=timesheet.overtime_hours,
                federal_withholding=Decimal(str(paycheck["federal_withholding"])),
                fica_employee=Decimal(str(paycheck["fica_employee"])),
                medicare_employee=Decimal(str(paycheck["medicare_employee"])),
                additional_medicare=Decimal(str(paycheck["additional_medicare"])),
                state_withholding=Decimal(str(paycheck["state_withholding"])),
                ca_sdi=Decimal(str(paycheck["ca_sdi"])),
                fica_employer=Decimal(str(paycheck["fica_employer"])),
                medicare_employer=Decimal(str(paycheck["medicare_employer"])),
                futa=Decimal(str(paycheck["futa"])),
                suta=Decimal(str(paycheck["suta"])),
                ca_ett=Decimal(str(paycheck["ca_ett"])),
                total_deductions=Decimal(str(paycheck["total_employee_deductions"])),
                net_pay=Decimal(str(paycheck["net_pay"])),
                bank_account_last_four=employee.bank_account_last_four,
                payment_method="Direct Deposit",
                created_at=get_pst_now()
            )
            db.add(paystub)
            
            # Update payroll run totals
            payroll_run.total_gross_wages += paystub.gross_wages
            payroll_run.total_federal_withholding += paystub.federal_withholding
            payroll_run.total_state_withholding += paystub.state_withholding
            payroll_run.total_fica_employee += paystub.fica_employee
            payroll_run.total_medicare_employee += paystub.medicare_employee
            payroll_run.total_fica_employer += paystub.fica_employer
            payroll_run.total_medicare_employer += paystub.medicare_employer
            payroll_run.total_futa += paystub.futa
            payroll_run.total_suta += paystub.suta
            payroll_run.total_ca_sdi += paystub.ca_sdi
            payroll_run.total_ca_ett += paystub.ca_ett
            payroll_run.total_deductions += paystub.total_deductions
            payroll_run.total_net_pay += paystub.net_pay
            
            # Mark timesheet as processed
            timesheet.processed_in_payroll = True
            timesheet.payroll_run_id = payroll_run.id
        
        await db.commit()
        await db.refresh(payroll_run)
        
        return {
            "success": True,
            "message": "Payroll calculated",
            "payroll_run_id": payroll_run.id,
            "payroll_run_number": payroll_number,
            "total_gross": float(payroll_run.total_gross_wages),
            "total_net": float(payroll_run.total_net_pay)
        }
        
    except Exception as e:
        logger.error(f"Error calculating payroll: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def _generate_report_number(entity_id: int, prefix: str, db: AsyncSession) -> str:
    """Generate sequential report/timesheet/payroll number"""
    # This is simplified - in production would query the appropriate table
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"{prefix}-{entity_id}-{timestamp}"

