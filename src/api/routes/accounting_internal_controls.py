"""
Internal Controls API Routes for NGI Capital Accounting Module
Implements Epic 5: Internal Controls
2025 GAAP Compliance & Investor-Ready Display
"""

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List, Optional
from datetime import datetime
import json

from ..database_async import get_async_db
from ..models_accounting_part2 import (
    InternalControl,
    AuthorizationMatrix,
    ControlTestResult
)

router = APIRouter(prefix="/accounting/internal-controls", tags=["accounting-internal-controls"])


@router.get("/controls")
async def get_internal_controls(
    control_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all internal controls with optional filtering
    Used for investor dashboard and compliance reporting
    """
    query = select(InternalControl)
    
    if control_type:
        query = query.where(InternalControl.control_type == control_type)
    
    if entity_id:
        query = query.where(InternalControl.entity_id == entity_id)
    
    query = query.order_by(InternalControl.control_category, InternalControl.control_id)
    
    result = await db.execute(query)
    controls = result.scalars().all()
    
    # Group by category for better UI display
    controls_by_category = {}
    for control in controls:
        category = control.control_category
        if category not in controls_by_category:
            controls_by_category[category] = []
        
        controls_by_category[category].append({
            "id": control.id,
            "control_id": control.control_id,
            "control_name": control.control_name,
            "control_description": control.control_description,
            "control_type": control.control_type,
            "control_category": control.control_category,
            "risk_level": control.risk_level,
            "frequency": control.frequency,
            "control_owner": control.control_owner,
            "is_automated": control.is_automated,
            "is_active": control.is_active,
            "last_tested_date": control.last_tested_date.isoformat() if control.last_tested_date else None,
            "last_test_result": control.last_test_result,
            "sox_relevant": control.sox_relevant,
            "metadata": control.metadata
        })
    
    # Calculate summary stats
    total_controls = len(controls)
    active_controls = sum(1 for c in controls if c.is_active)
    automated_controls = sum(1 for c in controls if c.is_automated)
    controls_by_risk = {
        "high": sum(1 for c in controls if c.risk_level == "high"),
        "medium": sum(1 for c in controls if c.risk_level == "medium"),
        "low": sum(1 for c in controls if c.risk_level == "low")
    }
    
    return {
        "controls_by_category": controls_by_category,
        "summary": {
            "total_controls": total_controls,
            "active_controls": active_controls,
            "automated_controls": automated_controls,
            "automation_rate": round((automated_controls / total_controls * 100) if total_controls > 0 else 0, 1),
            "controls_by_risk": controls_by_risk
        }
    }


@router.get("/authorization-matrix")
async def get_authorization_matrix(
    entity_id: Optional[int] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get authorization matrix showing who can approve what
    Critical for segregation of duties and investor demos
    """
    query = select(AuthorizationMatrix)
    
    if entity_id:
        query = query.where(AuthorizationMatrix.entity_id == entity_id)
    
    query = query.order_by(AuthorizationMatrix.transaction_type, AuthorizationMatrix.amount_threshold)
    
    result = await db.execute(query)
    matrix_entries = result.scalars().all()
    
    # Structure for UI display
    matrix_by_type = {}
    for entry in matrix_entries:
        tx_type = entry.transaction_type
        if tx_type not in matrix_by_type:
            matrix_by_type[tx_type] = []
        
        matrix_by_type[tx_type].append({
            "id": entry.id,
            "transaction_type": entry.transaction_type,
            "amount_threshold": float(entry.amount_threshold) if entry.amount_threshold else None,
            "required_approvers": entry.required_approvers,
            "approver_roles": entry.approver_roles,
            "approver_users": entry.approver_users,
            "requires_dual_approval": entry.requires_dual_approval,
            "conditions": entry.conditions,
            "is_active": entry.is_active
        })
    
    return {
        "authorization_matrix": matrix_by_type,
        "summary": {
            "total_rules": len(matrix_entries),
            "dual_approval_rules": sum(1 for e in matrix_entries if e.requires_dual_approval),
            "transaction_types": len(matrix_by_type)
        }
    }


@router.post("/upload-control-document")
async def upload_control_document(
    file: UploadFile = File(...),
    entity_id: Optional[int] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Upload internal controls document (Word/PDF)
    Extracts controls and populates the database
    """
    from ..services.document_extractor import DocumentExtractorService
    
    # Read file content
    content = await file.read()
    
    # Extract controls from document
    extractor = DocumentExtractorService()
    extracted_data = await extractor.extract_internal_controls(
        file_content=content,
        filename=file.filename
    )
    
    if not extracted_data.get("success"):
        raise HTTPException(status_code=400, detail="Failed to extract controls from document")
    
    # Parse and save controls
    controls_data = extracted_data.get("controls", [])
    created_controls = []
    
    for control_data in controls_data:
        if not entity_id:
            raise HTTPException(status_code=400, detail="entity_id is required")
        
        control = InternalControl(
            entity_id=entity_id,
            control_id=control_data.get("control_id"),
            control_name=control_data.get("control_name"),
            control_description=control_data.get("control_description"),
            control_type=control_data.get("control_type", "Manual"),
            control_category=control_data.get("control_category", "Financial Reporting"),
            risk_level=control_data.get("risk_level", "Medium"),
            frequency=control_data.get("frequency", "Monthly"),
            control_owner=control_data.get("control_owner", "Landon Whitworth"),
            is_automated=control_data.get("is_automated", False),
            is_active=True,
            sox_relevant=control_data.get("sox_relevant", False),
            metadata=control_data.get("metadata", {})
        )
        db.add(control)
        created_controls.append(control)
    
    await db.commit()
    
    return {
        "success": True,
        "controls_created": len(created_controls),
        "controls": [{"id": c.id, "control_name": c.control_name} for c in created_controls]
    }


@router.get("/control-testing")
async def get_control_test_results(
    control_id: Optional[int] = None,
    test_status: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get control testing results for audit trail
    """
    query = select(ControlTestResult)
    
    if control_id:
        query = query.where(ControlTestResult.control_id == control_id)
    
    if test_status:
        query = query.where(ControlTestResult.test_status == test_status)
    
    query = query.order_by(ControlTestResult.test_date.desc())
    
    result = await db.execute(query)
    test_results = result.scalars().all()
    
    return {
        "test_results": [
            {
                "id": tr.id,
                "control_id": tr.control_id,
                "test_date": tr.test_date.isoformat(),
                "tested_by": tr.tested_by,
                "test_status": tr.test_status,
                "test_method": tr.test_method,
                "sample_size": tr.sample_size,
                "exceptions_found": tr.exceptions_found,
                "test_notes": tr.test_notes,
                "evidence_path": tr.evidence_path
            }
            for tr in test_results
        ],
        "summary": {
            "total_tests": len(test_results),
            "passed_tests": sum(1 for tr in test_results if tr.test_status == "Passed"),
            "failed_tests": sum(1 for tr in test_results if tr.test_status == "Failed"),
            "pass_rate": round((sum(1 for tr in test_results if tr.test_status == "Passed") / len(test_results) * 100) if test_results else 0, 1)
        }
    }


@router.get("/dashboard")
async def get_controls_dashboard(
    entity_id: Optional[int] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get dashboard view for investors showing all controls, maturity, and compliance
    """
    # Get all controls
    controls_query = select(InternalControl)
    if entity_id:
        controls_query = controls_query.where(InternalControl.entity_id == entity_id)
    
    controls_result = await db.execute(controls_query)
    controls = controls_result.scalars().all()
    
    # Get recent test results
    tests_query = select(ControlTestResult).order_by(ControlTestResult.test_date.desc()).limit(10)
    tests_result = await db.execute(tests_query)
    recent_tests = tests_result.scalars().all()
    
    # Calculate control maturity score (0-100)
    # Based on: automation %, testing coverage, pass rate
    total_controls = len(controls)
    automated = sum(1 for c in controls if c.is_automated)
    tested = sum(1 for c in controls if c.last_tested_date)
    
    automation_score = (automated / total_controls * 100) if total_controls > 0 else 0
    testing_coverage = (tested / total_controls * 100) if total_controls > 0 else 0
    
    # Calculate pass rate from recent tests
    if recent_tests:
        pass_rate = (sum(1 for t in recent_tests if t.test_status == "Passed") / len(recent_tests) * 100)
    else:
        pass_rate = 0
    
    maturity_score = round((automation_score * 0.4 + testing_coverage * 0.3 + pass_rate * 0.3), 1)
    
    return {
        "overview": {
            "total_controls": total_controls,
            "active_controls": sum(1 for c in controls if c.is_active),
            "automated_controls": automated,
            "automation_rate": round(automation_score, 1),
            "testing_coverage": round(testing_coverage, 1),
            "maturity_score": maturity_score,
            "sox_ready": maturity_score >= 75
        },
        "controls_by_category": {
            "Financial Reporting": sum(1 for c in controls if c.control_category == "Financial Reporting"),
            "Revenue Recognition": sum(1 for c in controls if c.control_category == "Revenue Recognition"),
            "Cash Management": sum(1 for c in controls if c.control_category == "Cash Management"),
            "Payroll": sum(1 for c in controls if c.control_category == "Payroll"),
            "Fixed Assets": sum(1 for c in controls if c.control_category == "Fixed Assets"),
            "Period Close": sum(1 for c in controls if c.control_category == "Period Close")
        },
        "controls_by_risk": {
            "high": sum(1 for c in controls if c.risk_level == "high"),
            "medium": sum(1 for c in controls if c.risk_level == "medium"),
            "low": sum(1 for c in controls if c.risk_level == "low")
        },
        "recent_test_results": [
            {
                "control_name": next((c.control_name for c in controls if c.id == t.control_id), "Unknown"),
                "test_date": t.test_date.isoformat(),
                "test_status": t.test_status,
                "tested_by": t.tested_by
            }
            for t in recent_tests
        ]
    }

