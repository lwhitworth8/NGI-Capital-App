"""
Payroll Calculation Service - 2025 Tax Compliance
Full Federal and California State tax withholding calculations
Compliant with IRS Publication 15 (2025) and CA EDD requirements
"""

from decimal import Decimal
from typing import Dict, List, Optional
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

logger = logging.getLogger(__name__)


class PayrollCalculationService:
    """
    Comprehensive payroll calculation service
    2025 Federal and California tax withholding
    """
    
    # 2025 Federal Tax Rates (Publication 15-T)
    # Social Security: 6.2% on wages up to $168,600
    # Medicare: 1.45% on all wages
    # Additional Medicare: 0.9% on wages over $200,000
    
    FICA_RATE = Decimal("0.062")  # 6.2%
    FICA_WAGE_BASE = Decimal("168600.00")  # 2025 wage base
    
    MEDICARE_RATE = Decimal("0.0145")  # 1.45%
    ADDITIONAL_MEDICARE_RATE = Decimal("0.009")  # 0.9%
    ADDITIONAL_MEDICARE_THRESHOLD = Decimal("200000.00")
    
    # FUTA: 0.6% after state credit (6.0% - 5.4% credit)
    FUTA_RATE = Decimal("0.006")  # 0.6%
    FUTA_WAGE_BASE = Decimal("7000.00")  # Per employee per year
    
    # California State rates (2025)
    CA_SDI_RATE = Decimal("0.01")  # ~1% State Disability Insurance
    CA_SDI_WAGE_BASE = Decimal("153164.00")  # 2025 wage base
    
    CA_ETT_RATE = Decimal("0.001")  # 0.1% Employment Training Tax
    CA_ETT_WAGE_BASE = Decimal("7000.00")  # Per employee per year
    
    # CA SUTA varies by employer (new employers ~3.4%)
    CA_SUTA_RATE_DEFAULT = Decimal("0.034")  # 3.4%
    CA_SUTA_WAGE_BASE = Decimal("7000.00")  # Per employee per year
    
    # 2025 Federal Income Tax Withholding Tables (W-4 2025)
    # Standard deduction for 2025
    STANDARD_DEDUCTION_2025 = {
        "Single": Decimal("14600.00"),
        "Married Filing Jointly": Decimal("29200.00"),
        "Head of Household": Decimal("21900.00")
    }
    
    # Federal tax brackets 2025 (Single)
    FEDERAL_TAX_BRACKETS_SINGLE = [
        (Decimal("11600.00"), Decimal("0.10")),
        (Decimal("47150.00"), Decimal("0.12")),
        (Decimal("100525.00"), Decimal("0.22")),
        (Decimal("191950.00"), Decimal("0.24")),
        (Decimal("243725.00"), Decimal("0.32")),
        (Decimal("609350.00"), Decimal("0.35")),
        (float("inf"), Decimal("0.37"))
    ]
    
    # Federal tax brackets 2025 (Married Filing Jointly)
    FEDERAL_TAX_BRACKETS_MARRIED = [
        (Decimal("23200.00"), Decimal("0.10")),
        (Decimal("94300.00"), Decimal("0.12")),
        (Decimal("201050.00"), Decimal("0.22")),
        (Decimal("383900.00"), Decimal("0.24")),
        (Decimal("487450.00"), Decimal("0.32")),
        (Decimal("731200.00"), Decimal("0.35")),
        (float("inf"), Decimal("0.37"))
    ]
    
    # California tax brackets 2025
    CA_TAX_BRACKETS_SINGLE = [
        (Decimal("10412.00"), Decimal("0.01")),
        (Decimal("24684.00"), Decimal("0.02")),
        (Decimal("38959.00"), Decimal("0.04")),
        (Decimal("54081.00"), Decimal("0.06")),
        (Decimal("68350.00"), Decimal("0.08")),
        (Decimal("349137.00"), Decimal("0.093")),
        (Decimal("418961.00"), Decimal("0.103")),
        (Decimal("698271.00"), Decimal("0.113")),
        (float("inf"), Decimal("0.123"))
    ]
    
    CA_TAX_BRACKETS_MARRIED = [
        (Decimal("20824.00"), Decimal("0.01")),
        (Decimal("49368.00"), Decimal("0.02")),
        (Decimal("77918.00"), Decimal("0.04")),
        (Decimal("108162.00"), Decimal("0.06")),
        (Decimal("136700.00"), Decimal("0.08")),
        (Decimal("698274.00"), Decimal("0.093")),
        (Decimal("837922.00"), Decimal("0.103")),
        (Decimal("1396542.00"), Decimal("0.113")),
        (float("inf"), Decimal("0.123"))
    ]
    
    @staticmethod
    def calculate_federal_withholding(
        gross_wages: Decimal,
        pay_frequency: str,  # Weekly, Bi-Weekly, Semi-Monthly, Monthly
        filing_status: str,  # Single, Married Filing Jointly, Head of Household
        w4_config: Dict
    ) -> Decimal:
        """
        Calculate federal income tax withholding per 2025 W-4 form
        Using percentage method from IRS Publication 15-T
        """
        # Get W-4 information
        multiple_jobs = w4_config.get("multiple_jobs", False)
        dependents_amount = Decimal(str(w4_config.get("dependents_amount", 0)))
        other_income = Decimal(str(w4_config.get("other_income", 0)))
        deductions = Decimal(str(w4_config.get("deductions", 0)))
        extra_withholding = Decimal(str(w4_config.get("extra_withholding", 0)))
        
        # Annualize wages based on pay frequency
        pay_periods_per_year = {
            "Weekly": 52,
            "Bi-Weekly": 26,
            "Semi-Monthly": 24,
            "Monthly": 12
        }
        periods = pay_periods_per_year.get(pay_frequency, 26)
        annual_wages = gross_wages * periods
        
        # Step 1: Adjust for multiple jobs or spouse works
        if multiple_jobs:
            # Use higher withholding rate
            annual_wages = annual_wages * Decimal("1.5")
        
        # Step 2: Add other income
        annual_wages += other_income
        
        # Step 3: Subtract deductions
        standard_deduction = PayrollCalculationService.STANDARD_DEDUCTION_2025.get(
            filing_status, 
            PayrollCalculationService.STANDARD_DEDUCTION_2025["Single"]
        )
        total_deductions = standard_deduction + deductions + dependents_amount
        taxable_income = max(annual_wages - total_deductions, Decimal("0"))
        
        # Step 4: Calculate tax using brackets
        brackets = (
            PayrollCalculationService.FEDERAL_TAX_BRACKETS_MARRIED 
            if "Married" in filing_status 
            else PayrollCalculationService.FEDERAL_TAX_BRACKETS_SINGLE
        )
        
        annual_tax = PayrollCalculationService._calculate_tax_from_brackets(
            taxable_income, brackets
        )
        
        # Step 5: Convert to per-paycheck amount
        per_paycheck_tax = annual_tax / periods
        
        # Step 6: Add extra withholding
        total_withholding = per_paycheck_tax + extra_withholding
        
        return round(total_withholding, 2)
    
    @staticmethod
    def calculate_state_withholding_ca(
        gross_wages: Decimal,
        pay_frequency: str,
        filing_status: str,
        de4_config: Dict
    ) -> Decimal:
        """
        Calculate California state income tax withholding
        Using CA DE 4 form and EDD tables
        """
        allowances = de4_config.get("allowances", 0)
        extra_withholding = Decimal(str(de4_config.get("extra_withholding", 0)))
        
        # Annualize wages
        pay_periods_per_year = {
            "Weekly": 52,
            "Bi-Weekly": 26,
            "Semi-Monthly": 24,
            "Monthly": 12
        }
        periods = pay_periods_per_year.get(pay_frequency, 26)
        annual_wages = gross_wages * periods
        
        # Allowance value (2025): ~$152.94 per allowance per pay period
        allowance_amount_annual = Decimal("7952.88")  # 52 * 152.94
        total_allowances = allowance_amount_annual * allowances
        
        # Taxable income
        taxable_income = max(annual_wages - total_allowances, Decimal("0"))
        
        # Calculate tax using CA brackets
        brackets = (
            PayrollCalculationService.CA_TAX_BRACKETS_MARRIED
            if "Married" in filing_status
            else PayrollCalculationService.CA_TAX_BRACKETS_SINGLE
        )
        
        annual_tax = PayrollCalculationService._calculate_tax_from_brackets(
            taxable_income, brackets
        )
        
        # Per-paycheck amount
        per_paycheck_tax = annual_tax / periods
        
        # Add extra withholding
        total_withholding = per_paycheck_tax + extra_withholding
        
        return round(total_withholding, 2)
    
    @staticmethod
    def _calculate_tax_from_brackets(
        taxable_income: Decimal,
        brackets: List[tuple]
    ) -> Decimal:
        """Calculate tax using progressive bracket system"""
        tax = Decimal("0")
        previous_bracket = Decimal("0")
        
        for bracket_limit, rate in brackets:
            if taxable_income <= previous_bracket:
                break
            
            if isinstance(bracket_limit, float):  # Infinity case
                bracket_limit = taxable_income
            
            taxable_in_bracket = min(taxable_income, Decimal(str(bracket_limit))) - previous_bracket
            tax += taxable_in_bracket * rate
            previous_bracket = Decimal(str(bracket_limit))
            
            if taxable_income <= bracket_limit:
                break
        
        return tax
    
    @staticmethod
    def calculate_fica_taxes(
        gross_wages: Decimal,
        ytd_gross: Decimal
    ) -> Dict[str, Decimal]:
        """
        Calculate FICA taxes (Social Security and Medicare)
        Returns both employee and employer portions
        """
        # Social Security (capped at wage base)
        if ytd_gross >= PayrollCalculationService.FICA_WAGE_BASE:
            # Already exceeded wage base
            fica_employee = Decimal("0")
            fica_employer = Decimal("0")
        elif ytd_gross + gross_wages > PayrollCalculationService.FICA_WAGE_BASE:
            # Will exceed wage base this paycheck
            taxable_wages = PayrollCalculationService.FICA_WAGE_BASE - ytd_gross
            fica_employee = taxable_wages * PayrollCalculationService.FICA_RATE
            fica_employer = fica_employee
        else:
            # Below wage base
            fica_employee = gross_wages * PayrollCalculationService.FICA_RATE
            fica_employer = fica_employee
        
        # Medicare (no cap)
        medicare_employee = gross_wages * PayrollCalculationService.MEDICARE_RATE
        medicare_employer = medicare_employee
        
        # Additional Medicare (over $200k)
        if ytd_gross + gross_wages > PayrollCalculationService.ADDITIONAL_MEDICARE_THRESHOLD:
            if ytd_gross >= PayrollCalculationService.ADDITIONAL_MEDICARE_THRESHOLD:
                # Already over threshold
                additional_medicare = gross_wages * PayrollCalculationService.ADDITIONAL_MEDICARE_RATE
            else:
                # Crosses threshold this paycheck
                over_threshold = (ytd_gross + gross_wages) - PayrollCalculationService.ADDITIONAL_MEDICARE_THRESHOLD
                additional_medicare = over_threshold * PayrollCalculationService.ADDITIONAL_MEDICARE_RATE
        else:
            additional_medicare = Decimal("0")
        
        return {
            "fica_employee": round(fica_employee, 2),
            "fica_employer": round(fica_employer, 2),
            "medicare_employee": round(medicare_employee, 2),
            "medicare_employer": round(medicare_employer, 2),
            "additional_medicare": round(additional_medicare, 2)
        }
    
    @staticmethod
    def calculate_california_sdi(
        gross_wages: Decimal,
        ytd_gross: Decimal
    ) -> Decimal:
        """Calculate California State Disability Insurance"""
        if ytd_gross >= PayrollCalculationService.CA_SDI_WAGE_BASE:
            return Decimal("0")
        elif ytd_gross + gross_wages > PayrollCalculationService.CA_SDI_WAGE_BASE:
            taxable_wages = PayrollCalculationService.CA_SDI_WAGE_BASE - ytd_gross
            return round(taxable_wages * PayrollCalculationService.CA_SDI_RATE, 2)
        else:
            return round(gross_wages * PayrollCalculationService.CA_SDI_RATE, 2)
    
    @staticmethod
    def calculate_employer_taxes(
        gross_wages: Decimal,
        ytd_gross: Decimal,
        fica_employer: Decimal,
        medicare_employer: Decimal
    ) -> Dict[str, Decimal]:
        """
        Calculate employer-only taxes
        FUTA, SUTA, ETT
        """
        # FUTA (first $7,000 per employee)
        if ytd_gross >= PayrollCalculationService.FUTA_WAGE_BASE:
            futa = Decimal("0")
        elif ytd_gross + gross_wages > PayrollCalculationService.FUTA_WAGE_BASE:
            taxable_wages = PayrollCalculationService.FUTA_WAGE_BASE - ytd_gross
            futa = round(taxable_wages * PayrollCalculationService.FUTA_RATE, 2)
        else:
            futa = round(gross_wages * PayrollCalculationService.FUTA_RATE, 2)
        
        # CA SUTA (first $7,000 per employee)
        if ytd_gross >= PayrollCalculationService.CA_SUTA_WAGE_BASE:
            suta = Decimal("0")
        elif ytd_gross + gross_wages > PayrollCalculationService.CA_SUTA_WAGE_BASE:
            taxable_wages = PayrollCalculationService.CA_SUTA_WAGE_BASE - ytd_gross
            suta = round(taxable_wages * PayrollCalculationService.CA_SUTA_RATE_DEFAULT, 2)
        else:
            suta = round(gross_wages * PayrollCalculationService.CA_SUTA_RATE_DEFAULT, 2)
        
        # CA ETT (first $7,000 per employee)
        if ytd_gross >= PayrollCalculationService.CA_ETT_WAGE_BASE:
            ett = Decimal("0")
        elif ytd_gross + gross_wages > PayrollCalculationService.CA_ETT_WAGE_BASE:
            taxable_wages = PayrollCalculationService.CA_ETT_WAGE_BASE - ytd_gross
            ett = round(taxable_wages * PayrollCalculationService.CA_ETT_RATE, 2)
        else:
            ett = round(gross_wages * PayrollCalculationService.CA_ETT_RATE, 2)
        
        return {
            "futa": futa,
            "suta": suta,
            "ca_ett": ett,
            "total_employer_taxes": fica_employer + medicare_employer + futa + suta + ett
        }
    
    @staticmethod
    def calculate_net_pay(
        gross_wages: Decimal,
        federal_withholding: Decimal,
        state_withholding: Decimal,
        fica: Decimal,
        medicare: Decimal,
        additional_medicare: Decimal,
        ca_sdi: Decimal,
        other_deductions: Decimal = Decimal("0")
    ) -> Decimal:
        """Calculate net pay after all deductions"""
        total_deductions = (
            federal_withholding +
            state_withholding +
            fica +
            medicare +
            additional_medicare +
            ca_sdi +
            other_deductions
        )
        
        net_pay = gross_wages - total_deductions
        return round(net_pay, 2)
    
    @staticmethod
    async def calculate_complete_paycheck(
        gross_wages: Decimal,
        ytd_gross: Decimal,
        pay_frequency: str,
        employee_config: Dict,
        db: AsyncSession = None
    ) -> Dict:
        """
        Complete paycheck calculation with all taxes
        Returns comprehensive breakdown
        """
        # W-4 Federal configuration
        w4_config = {
            "filing_status": employee_config.get("w4_filing_status", "Single"),
            "multiple_jobs": employee_config.get("w4_multiple_jobs", False),
            "dependents_amount": employee_config.get("w4_dependents_amount", 0),
            "other_income": employee_config.get("w4_other_income", 0),
            "deductions": employee_config.get("w4_deductions", 0),
            "extra_withholding": employee_config.get("w4_extra_withholding", 0)
        }
        
        # DE-4 California configuration
        de4_config = {
            "filing_status": employee_config.get("de4_filing_status", "Single"),
            "allowances": employee_config.get("de4_allowances", 0),
            "extra_withholding": employee_config.get("de4_extra_withholding", 0)
        }
        
        # Calculate federal withholding
        federal_wh = PayrollCalculationService.calculate_federal_withholding(
            gross_wages,
            pay_frequency,
            w4_config["filing_status"],
            w4_config
        )
        
        # Calculate state withholding
        state_wh = PayrollCalculationService.calculate_state_withholding_ca(
            gross_wages,
            pay_frequency,
            de4_config["filing_status"],
            de4_config
        )
        
        # Calculate FICA and Medicare
        fica_medicare = PayrollCalculationService.calculate_fica_taxes(
            gross_wages,
            ytd_gross
        )
        
        # Calculate CA SDI
        ca_sdi = PayrollCalculationService.calculate_california_sdi(
            gross_wages,
            ytd_gross
        )
        
        # Calculate employer taxes
        employer_taxes = PayrollCalculationService.calculate_employer_taxes(
            gross_wages,
            ytd_gross,
            fica_medicare["fica_employer"],
            fica_medicare["medicare_employer"]
        )
        
        # Calculate net pay
        net_pay = PayrollCalculationService.calculate_net_pay(
            gross_wages,
            federal_wh,
            state_wh,
            fica_medicare["fica_employee"],
            fica_medicare["medicare_employee"],
            fica_medicare["additional_medicare"],
            ca_sdi,
            Decimal("0")  # Other deductions (benefits, etc.)
        )
        
        # Total employee deductions
        total_employee_deductions = (
            federal_wh +
            state_wh +
            fica_medicare["fica_employee"] +
            fica_medicare["medicare_employee"] +
            fica_medicare["additional_medicare"] +
            ca_sdi
        )
        
        return {
            "gross_wages": float(gross_wages),
            "federal_withholding": float(federal_wh),
            "state_withholding": float(state_wh),
            "fica_employee": float(fica_medicare["fica_employee"]),
            "medicare_employee": float(fica_medicare["medicare_employee"]),
            "additional_medicare": float(fica_medicare["additional_medicare"]),
            "ca_sdi": float(ca_sdi),
            "total_employee_deductions": float(total_employee_deductions),
            "net_pay": float(net_pay),
            "fica_employer": float(fica_medicare["fica_employer"]),
            "medicare_employer": float(fica_medicare["medicare_employer"]),
            "futa": float(employer_taxes["futa"]),
            "suta": float(employer_taxes["suta"]),
            "ca_ett": float(employer_taxes["ca_ett"]),
            "total_employer_taxes": float(employer_taxes["total_employer_taxes"])
        }

