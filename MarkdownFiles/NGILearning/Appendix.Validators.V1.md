# Appendix — Deterministic Validators for NGI Learning Module
**Last Updated:** October 2, 2025  
**Libraries:** openpyxl v3.1.5+, pydantic v2.10.6+, numpy v2.0+  
**Purpose:** Pre-AI validation checks that must pass before feedback

## 0) Overview

All validators are deterministic (no AI/ML) and must pass before AI feedback. Failures return actionable guidance with specific cell addresses. Validators run server-side using `openpyxl` for Excel parsing and `pydantic` for data validation.

---

## 1) Core Integrity Checks

### 1.1 Balance Sheet Balance

**Rule:** Assets = Liabilities + Equity (within $1M tolerance)

**Implementation:**
```python
from openpyxl import load_workbook
from typing import List, Dict
import numpy as np

class BalanceSheetValidator:
    def __init__(self, workbook_path: str):
        self.wb = load_workbook(workbook_path, data_only=True)
        self.errors = []
    
    def validate_bs_balance(self) -> List[Dict]:
        """Check that Balance Sheet balances for all periods"""
        ws = self.wb['Balance Sheet']
        
        # Assuming assets in row 50, liabilities + equity in row 80
        # Columns B-G represent periods (2024A, 2025E, 2026E, 2027E, 2028E, 2029E)
        
        for col_idx in range(2, 8):  # B through G
            col_letter = ws.cell(1, col_idx).value  # Period header
            assets = ws.cell(50, col_idx).value
            liabilities_equity = ws.cell(80, col_idx).value
            
            if assets is None or liabilities_equity is None:
                self.errors.append({
                    'category': 'balance_sheet',
                    'severity': 'critical',
                    'message': f'Missing values in {col_letter}: Assets or L+E is blank',
                    'cell_ref': f'{ws.cell(50, col_idx).coordinate}, {ws.cell(80, col_idx).coordinate}',
                    'fix': 'Ensure all Balance Sheet values are calculated'
                })
                continue
            
            diff = abs(assets - liabilities_equity)
            
            if diff > 1:  # $1M tolerance
                self.errors.append({
                    'category': 'balance_sheet',
                    'severity': 'critical',
                    'message': f'Balance Sheet does not balance in {col_letter}',
                    'details': f'Assets: ${assets:,.0f}M, L+E: ${liabilities_equity:,.0f}M, Diff: ${diff:,.1f}M',
                    'cell_ref': f'{ws.cell(50, col_idx).coordinate}, {ws.cell(80, col_idx).coordinate}',
                    'fix': 'Check formulas in Assets and Liabilities+Equity sections. Common issues: missing items, formula errors, wrong signs.'
                })
        
        return self.errors
```

### 1.2 Cash Flow Ties to Balance Sheet

**Rule:** Ending Cash (CF) = Cash on Balance Sheet

**Implementation:**
```python
class CashFlowValidator:
    def validate_cash_tie(self) -> List[Dict]:
        """Check that Cash Flow ending cash ties to Balance Sheet"""
        ws_cf = self.wb['Cash Flow']
        ws_bs = self.wb['Balance Sheet']
        
        # CF ending cash in row 100, BS cash in row 10
        for col_idx in range(3, 8):  # Forecast periods only (C-G)
            period = ws_cf.cell(1, col_idx).value
            cf_ending_cash = ws_cf.cell(100, col_idx).value
            bs_cash = ws_bs.cell(10, col_idx).value
            
            if cf_ending_cash and bs_cash:
                diff = abs(cf_ending_cash - bs_cash)
                
                if diff > 0.01:  # Allow 0.01M rounding
                    self.errors.append({
                        'category': 'cash_flow',
                        'severity': 'critical',
                        'message': f'Cash Flow does not tie to Balance Sheet in {period}',
                        'details': f'CF Ending Cash: ${cf_ending_cash:,.2f}M, BS Cash: ${bs_cash:,.2f}M',
                        'cell_ref': f'CF!{ws_cf.cell(100, col_idx).coordinate}, BS!{ws_bs.cell(10, col_idx).coordinate}',
                        'fix': 'Check Cash Flow statement formulas. Ending Cash should equal Beginning Cash + Cash from Operations + Cash from Investing + Cash from Financing.'
                    })
        
        return self.errors
```

### 1.3 No Formula Errors

**Rule:** No #REF!, #VALUE!, #DIV/0!, #NAME?, #N/A in output areas

**Implementation:**
```python
class FormulaErrorValidator:
    ERROR_TYPES = ['#REF!', '#VALUE!', '#DIV/0!', '#NAME?', '#N/A', '#NUM!', '#NULL!']
    
    def validate_no_errors(self) -> List[Dict]:
        """Check for formula errors in all sheets"""
        skip_sheets = ['Raw Import']  # Don't check locked sheets
        
        for sheet_name in self.wb.sheetnames:
            if sheet_name in skip_sheets:
                continue
            
            ws = self.wb[sheet_name]
            
            for row in ws.iter_rows():
                for cell in row:
                    if cell.value in self.ERROR_TYPES:
                        error_type = cell.value
                        
                        # Get cell formula if available
                        formula = ''
                        if cell.data_type == 'f':
                            formula = f' (Formula: {cell.value})'
                        
                        self.errors.append({
                            'category': 'formula_error',
                            'severity': 'critical',
                            'message': f'Formula error {error_type} in {sheet_name}!{cell.coordinate}',
                            'cell_ref': f'{sheet_name}!{cell.coordinate}',
                            'details': f'Error type: {error_type}{formula}',
                            'fix': self._get_error_fix(error_type)
                        })
        
        return self.errors
    
    def _get_error_fix(self, error_type: str) -> str:
        """Provide fix suggestions based on error type"""
        fixes = {
            '#REF!': 'Broken reference to another cell/sheet. Check if a row/column was deleted or if sheet name changed.',
            '#VALUE!': 'Wrong data type in formula (e.g., text where number expected). Check formula inputs.',
            '#DIV/0!': 'Division by zero. Add IF statement to check denominator != 0.',
            '#NAME?': 'Excel doesn\'t recognize formula name. Check spelling or if name is defined.',
            '#N/A': 'Value not available, often from VLOOKUP/MATCH. Check lookup range.',
            '#NUM!': 'Invalid numeric value. Check for negative square roots or invalid IRR.',
            '#NULL!': 'Incorrect range operator (space instead of comma/colon).'
        }
        return fixes.get(error_type, 'Unknown error type')
```

### 1.4 No Hardcodes in Formula Ranges

**Rule:** Forecast columns should contain formulas, not hardcoded values

**Implementation:**
```python
class HardcodeValidator:
    def validate_no_hardcodes(self) -> List[Dict]:
        """Check that forecast columns use formulas, not hardcoded values"""
        
        # Check Income Statement
        ws_is = self.wb['Income Statement']
        
        # Check rows 6-18 (Revenue through Net Income)
        # Columns C-G (forecast periods)
        for row_idx in range(6, 19):
            row_label = ws_is.cell(row_idx, 1).value
            
            for col_idx in range(3, 8):  # C-G (forecast)
                cell = ws_is.cell(row_idx, col_idx)
                
                # Check if cell has a value but no formula
                if cell.value is not None and cell.data_type != 'f':
                    # Exclude input cells (blue cells are OK to be hardcoded)
                    if not self._is_input_cell(cell):
                        period = ws_is.cell(1, col_idx).value
                        
                        self.errors.append({
                            'category': 'hardcode',
                            'severity': 'warning',
                            'message': f'Hardcoded value found in {row_label} for {period}',
                            'cell_ref': f'Income Statement!{cell.coordinate}',
                            'details': f'Cell contains value {cell.value} but no formula',
                            'fix': 'Replace with formula that references assumptions or prior period. Only blue (input) cells should contain hardcoded values.'
                        })
        
        return self.errors
    
    def _is_input_cell(self, cell) -> bool:
        """Check if cell is formatted as input (blue)"""
        if cell.font and cell.font.color:
            # Check if font color is blue (0070C0)
            return cell.font.color.rgb in ['000070C0', 'FF0070C0']
        return False
```

---

## 2) Revenue Driver Validation

### 2.1 Q x P Reconciliation

**Rule:** Quantity × Price (× Take-rate) must match reported revenue within ±2%

**Implementation:**
```python
from pydantic import BaseModel, Field, validator
from typing import Optional

class RevenueDriverCheck(BaseModel):
    """Pydantic model for revenue driver validation"""
    quantity: float = Field(..., gt=0, description="Quantity (Q)")
    price: float = Field(..., gt=0, description="Price (P)")
    take_rate: Optional[float] = Field(None, ge=0, le=1, description="Take-rate (if applicable)")
    reported_revenue: float = Field(..., gt=0, description="Reported revenue from financials")
    
    @property
    def calculated_revenue(self) -> float:
        if self.take_rate:
            return self.quantity * self.price * self.take_rate
        return self.quantity * self.price
    
    @property
    def variance_pct(self) -> float:
        return abs(self.calculated_revenue - self.reported_revenue) / self.reported_revenue
    
    @property
    def is_valid(self) -> bool:
        return self.variance_pct <= 0.02  # 2% tolerance

class RevenueDriverValidator:
    def validate_revenue_drivers(self) -> List[Dict]:
        """Check that Q x P reconciles to reported revenue"""
        ws_drivers = self.wb['Drivers Map']
        ws_is = self.wb['Income Statement']
        
        # For each period
        for col_idx in range(2, 8):
            period = ws_drivers.cell(1, col_idx).value
            
            # Read driver values
            quantity = ws_drivers.cell(10, col_idx).value  # Q row
            price = ws_drivers.cell(11, col_idx).value     # P row
            take_rate = ws_drivers.cell(12, col_idx).value  # Take-rate row (if used)
            reported_rev = ws_is.cell(6, col_idx).value    # Revenue from IS
            
            if not all([quantity, price, reported_rev]):
                self.errors.append({
                    'category': 'revenue_drivers',
                    'severity': 'critical',
                    'message': f'Missing revenue drivers in {period}',
                    'cell_ref': f'Drivers Map!{ws_drivers.cell(10, col_idx).coordinate}',
                    'fix': 'Fill in Quantity, Price, and ensure Revenue is calculated in Income Statement'
                })
                continue
            
            # Validate using Pydantic
            try:
                driver_check = RevenueDriverCheck(
                    quantity=quantity,
                    price=price,
                    take_rate=take_rate,
                    reported_revenue=reported_rev
                )
                
                if not driver_check.is_valid:
                    self.errors.append({
                        'category': 'revenue_drivers',
                        'severity': 'warning',
                        'message': f'Revenue driver variance exceeds 2% in {period}',
                        'details': f'Calculated: ${driver_check.calculated_revenue:,.1f}M, Reported: ${reported_rev:,.1f}M, Variance: {driver_check.variance_pct:.1%}',
                        'cell_ref': f'Drivers Map!{ws_drivers.cell(10, col_idx).coordinate}',
                        'fix': 'If variance is due to FX, reclass, or contra-revenue, add explanation in note cell. Otherwise, check driver formulas.'
                    })
            
            except Exception as e:
                self.errors.append({
                    'category': 'revenue_drivers',
                    'severity': 'critical',
                    'message': f'Revenue driver validation error in {period}: {str(e)}',
                    'cell_ref': f'Drivers Map!{ws_drivers.cell(10, col_idx).coordinate}'
                })
        
        return self.errors
```

---

## 3) Working Capital Validation

### 3.1 Days Ratios Plausibility

**Rule:** DSO, DIO, DPO must be within historical bounds and peer benchmarks

**Implementation:**
```python
class WorkingCapitalValidator:
    INDUSTRY_BENCHMARKS = {
        'Automotive': {'DSO': (30, 60), 'DIO': (20, 40), 'DPO': (40, 90)},
        'Retail': {'DSO': (5, 20), 'DIO': (30, 60), 'DPO': (30, 60)},
        'Platform': {'DSO': (20, 45), 'DIO': (0, 10), 'DPO': (30, 60)},
        'Default': {'DSO': (20, 60), 'DIO': (20, 60), 'DPO': (30, 90)}
    }
    
    def validate_wc_days(self, industry: str = 'Default') -> List[Dict]:
        """Validate working capital days ratios"""
        ws_wc = self.wb['Working Capital']
        ws_assumptions = self.wb['Assumptions & Drivers']
        
        # Get assumptions
        dso_input = ws_assumptions.cell(16, 2).value  # DSO assumption
        dio_input = ws_assumptions.cell(17, 2).value  # DIO assumption
        dpo_input = ws_assumptions.cell(18, 2).value  # DPO assumption
        
        benchmarks = self.INDUSTRY_BENCHMARKS.get(industry, self.INDUSTRY_BENCHMARKS['Default'])
        
        # Validate DSO
        if dso_input:
            dso_min, dso_max = benchmarks['DSO']
            if not (dso_min <= dso_input <= dso_max):
                self.errors.append({
                    'category': 'working_capital',
                    'severity': 'warning',
                    'message': f'DSO of {dso_input} days is outside typical range for {industry}',
                    'details': f'Typical range: {dso_min}-{dso_max} days',
                    'cell_ref': f'Assumptions & Drivers!B16',
                    'fix': 'Review customer payment terms and historical DSO. If intentional (e.g., extended payment terms), document reason.'
                })
        
        # Validate DIO
        if dio_input:
            dio_min, dio_max = benchmarks['DIO']
            if not (dio_min <= dio_input <= dio_max):
                self.errors.append({
                    'category': 'working_capital',
                    'severity': 'warning',
                    'message': f'DIO of {dio_input} days is outside typical range for {industry}',
                    'details': f'Typical range: {dio_min}-{dio_max} days',
                    'cell_ref': f'Assumptions & Drivers!B17',
                    'fix': 'Review inventory turnover and supply chain. If intentional, document reason.'
                })
        
        # Validate DPO
        if dpo_input:
            dpo_min, dpo_max = benchmarks['DPO']
            if not (dpo_min <= dpo_input <= dpo_max):
                self.errors.append({
                    'category': 'working_capital',
                    'severity': 'warning',
                    'message': f'DPO of {dpo_input} days is outside typical range for {industry}',
                    'details': f'Typical range: {dpo_min}-{dpo_max} days',
                    'cell_ref': f'Assumptions & Drivers!B18',
                    'fix': 'Review supplier payment terms. If intentional, document reason.'
                })
        
        return self.errors
```

---

## 4) DCF Validation

### 4.1 WACC Bounds

**Rule:** WACC components must be within reasonable ranges

**Implementation:**
```python
class DCFValidator:
    def validate_wacc_inputs(self) -> List[Dict]:
        """Validate WACC input parameters"""
        ws_assumptions = self.wb['Assumptions & Drivers']
        
        # Read WACC inputs
        risk_free_rate = ws_assumptions.cell(25, 2).value  # Risk-Free Rate
        equity_risk_premium = ws_assumptions.cell(26, 2).value  # ERP
        beta = ws_assumptions.cell(27, 2).value  # Beta
        terminal_growth = ws_assumptions.cell(28, 2).value  # Terminal Growth
        
        # Risk-Free Rate (should be 3-6% in 2025)
        if risk_free_rate:
            if not (0.03 <= risk_free_rate <= 0.06):
                self.errors.append({
                    'category': 'dcf',
                    'severity': 'warning',
                    'message': f'Risk-Free Rate of {risk_free_rate:.1%} is outside typical range',
                    'details': 'Typical 10-year Treasury yield: 3-6% (2025)',
                    'cell_ref': 'Assumptions & Drivers!B25',
                    'fix': 'Check current 10-year Treasury yield at https://fred.stlouisfed.org/series/DGS10'
                })
        
        # Equity Risk Premium (should be 4-7%)
        if equity_risk_premium:
            if not (0.04 <= equity_risk_premium <= 0.07):
                self.errors.append({
                    'category': 'dcf',
                    'severity': 'warning',
                    'message': f'Equity Risk Premium of {equity_risk_premium:.1%} is outside typical range',
                    'details': 'Typical ERP: 4-7%',
                    'cell_ref': 'Assumptions & Drivers!B26',
                    'fix': 'Typical range is 4-7%. Damodaran ERP is a good source.'
                })
        
        # Beta (should be 0.5-2.0 for most companies)
        if beta:
            if not (0.5 <= beta <= 2.0):
                self.errors.append({
                    'category': 'dcf',
                    'severity': 'warning',
                    'message': f'Beta of {beta:.2f} is outside typical range',
                    'details': 'Typical beta: 0.5-2.0',
                    'cell_ref': 'Assumptions & Drivers!B27',
                    'fix': 'Check beta calculation. Defensive stocks: 0.5-0.8, Market: 1.0, Aggressive: 1.2-2.0'
                })
        
        # Terminal Growth (should be < 3.5% long-run GDP)
        if terminal_growth:
            if terminal_growth > 0.035:
                self.errors.append({
                    'category': 'dcf',
                    'severity': 'critical',
                    'message': f'Terminal Growth of {terminal_growth:.1%} exceeds long-run GDP growth',
                    'details': 'Terminal growth should be ≤ 2.5-3% (long-run nominal GDP)',
                    'cell_ref': 'Assumptions & Drivers!B28',
                    'fix': 'Terminal growth above long-run GDP is unsustainable. Use 2.0-2.5% for mature companies.'
                })
        
        return self.errors
```

---

## 5) Master Validator Class

```python
class NGILearningValidator:
    """Master validator that runs all checks"""
    
    def __init__(self, workbook_path: str, company_industry: str = 'Default'):
        self.workbook_path = workbook_path
        self.company_industry = company_industry
        self.all_errors = []
    
    def validate_all(self) -> Dict:
        """Run all validation checks"""
        
        # Initialize sub-validators
        bs_validator = BalanceSheetValidator(self.workbook_path)
        cf_validator = CashFlowValidator(self.workbook_path)
        error_validator = FormulaErrorValidator(self.workbook_path)
        hardcode_validator = HardcodeValidator(self.workbook_path)
        revenue_validator = RevenueDriverValidator(self.workbook_path)
        wc_validator = WorkingCapitalValidator(self.workbook_path)
        dcf_validator = DCFValidator(self.workbook_path)
        
        # Run all validators
        self.all_errors.extend(bs_validator.validate_bs_balance())
        self.all_errors.extend(cf_validator.validate_cash_tie())
        self.all_errors.extend(error_validator.validate_no_errors())
        self.all_errors.extend(hardcode_validator.validate_no_hardcodes())
        self.all_errors.extend(revenue_validator.validate_revenue_drivers())
        self.all_errors.extend(wc_validator.validate_wc_days(self.company_industry))
        self.all_errors.extend(dcf_validator.validate_wacc_inputs())
        
        # Categorize errors
        critical_errors = [e for e in self.all_errors if e.get('severity') == 'critical']
        warnings = [e for e in self.all_errors if e.get('severity') == 'warning']
        
        # Determine pass/fail
        validation_passed = len(critical_errors) == 0
        
        return {
            'status': 'passed' if validation_passed else 'failed',
            'total_errors': len(self.all_errors),
            'critical_errors': len(critical_errors),
            'warnings': len(warnings),
            'errors': self.all_errors,
            'can_proceed_to_ai_feedback': validation_passed,
            'summary': self._generate_summary(critical_errors, warnings)
        }
    
    def _generate_summary(self, critical_errors, warnings) -> str:
        """Generate human-readable summary"""
        if len(critical_errors) == 0 and len(warnings) == 0:
            return "All validation checks passed! Your model is ready for AI feedback."
        elif len(critical_errors) == 0:
            return f"Model passed all critical checks. {len(warnings)} warnings found (can proceed, but review recommended)."
        else:
            return f"Model failed validation. {len(critical_errors)} critical errors must be fixed before AI feedback."
```

---

## 6) API Integration

```python
# src/api/learning/validators.py
from fastapi import APIRouter, UploadFile, Depends, HTTPException
from src.api.auth import require_auth
import os
import tempfile

router = APIRouter(prefix="/api/learning", tags=["learning-validators"])

@router.post("/validate")
async def validate_submission(
    file: UploadFile,
    company_id: int,
    user = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Validate student Excel submission"""
    
    # Get company info
    company = db.query(LearningCompany).filter_by(id=company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Save file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    
    try:
        # Run validation
        validator = NGILearningValidator(tmp_path, company.industry)
        result = validator.validate_all()
        
        # Save validation result to database
        submission = LearningSubmission(
            user_id=user.id,
            company_id=company_id,
            activity_id=request.form.get('activity_id'),
            file_path=tmp_path,
            validator_status=result['status'],
            validator_errors=json.dumps(result['errors'])
        )
        db.add(submission)
        db.commit()
        
        return result
    
    finally:
        # Cleanup
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
```

---

**These deterministic validators ensure all submissions meet minimum quality standards before expensive AI feedback is generated, saving costs and improving student learning outcomes.**

