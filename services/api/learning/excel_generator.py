"""
Excel Package Generator for NGI Learning Module
Generates banker-grade financial model templates following NGI Excel Standards
Using xlsxwriter 3.2.9+ for programmatic generation
Following specifications from MarkdownFiles/NGILearning/Appendix.ExcelStandards.md
"""

import os
from datetime import datetime
from typing import Dict, Optional, List
import xlsxwriter
from xlsxwriter.workbook import Workbook
from xlsxwriter.worksheet import Worksheet


class ExcelPackageGenerator:
    """
    Generate Excel banker packages for learning module companies.
    Follows NGI Excel Standards with color conventions, tab structure, and formulas.
    """
    
    # NGI Color Standards (RGB)
    COLOR_INPUT = '#0070C0'          # Blue - User inputs
    COLOR_INPUT_BG = '#E7F3FF'       # Light blue background
    COLOR_FORMULA = '#000000'        # Black - Calculated
    COLOR_EXTERNAL = '#00B050'       # Green - External links
    COLOR_CHECK = '#FF0000'          # Red - Checks
    COLOR_WARNING = '#FFFF00'        # Yellow - Warnings
    COLOR_HEADER = '#002060'         # Dark blue - Headers
    COLOR_HEADER_TEXT = '#FFFFFF'    # White text on headers
    
    def __init__(self, output_dir: str = "uploads/learning_packages"):
        """Initialize generator with output directory"""
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        self.workbook: Optional[Workbook] = None
        self.formats: Dict[str, xlsxwriter.format.Format] = {}
    
    def generate_package(
        self,
        ticker: str,
        company_name: str,
        fiscal_year_end: str = "December 31",
        version: int = 1
    ) -> str:
        """
        Generate complete Excel package for a company.
        
        Args:
            ticker: Company ticker (e.g., 'TSLA')
            company_name: Full company name (e.g., 'Tesla, Inc.')
            fiscal_year_end: Fiscal year end date
            version: Package version number
        
        Returns:
            Path to generated Excel file
        """
        # Generate filename following NGI naming convention
        year = datetime.now().year
        filename = f"{ticker}_{year}_Model_v{version}.xlsx"
        filepath = os.path.join(self.output_dir, filename)
        
        # Create workbook
        self.workbook = xlsxwriter.Workbook(filepath, {'nan_inf_to_errors': True})
        
        # Initialize formats
        self._init_formats()
        
        # Create all required tabs
        self._create_readme_tab(ticker, company_name, version, fiscal_year_end)
        self._create_assumptions_tab(ticker, company_name)
        self._create_income_statement_tab(ticker, company_name)
        self._create_balance_sheet_tab(ticker, company_name)
        self._create_cash_flow_tab(ticker, company_name)
        self._create_working_capital_tab(ticker, company_name)
        self._create_debt_schedule_tab(ticker, company_name)
        self._create_equity_schedule_tab(ticker, company_name)
        self._create_ppe_depreciation_tab(ticker, company_name)
        self._create_stock_comp_tab(ticker, company_name)
        self._create_leases_tab(ticker, company_name)
        self._create_dcf_tab(ticker, company_name)
        self._create_comps_tab(ticker, company_name)
        self._create_outputs_tab(ticker, company_name)
        self._create_drivers_map_tab(ticker, company_name)
        self._create_raw_import_tab(ticker, company_name)
        
        # Close workbook
        self.workbook.close()
        
        return filepath
    
    def _init_formats(self):
        """Initialize all cell formats following NGI standards"""
        # Input format (blue, bold, bordered)
        self.formats['input'] = self.workbook.add_format({
            'font_color': self.COLOR_INPUT,
            'bold': True,
            'border': 1,
            'bg_color': self.COLOR_INPUT_BG,
            'align': 'left'
        })
        
        # Input number format
        self.formats['input_number'] = self.workbook.add_format({
            'font_color': self.COLOR_INPUT,
            'bold': True,
            'border': 1,
            'bg_color': self.COLOR_INPUT_BG,
            'num_format': '#,##0'
        })
        
        # Input percentage format
        self.formats['input_pct'] = self.workbook.add_format({
            'font_color': self.COLOR_INPUT,
            'bold': True,
            'border': 1,
            'bg_color': self.COLOR_INPUT_BG,
            'num_format': '0.0%'
        })
        
        # Formula format (black)
        self.formats['formula'] = self.workbook.add_format({
            'font_color': self.COLOR_FORMULA,
            'num_format': '#,##0'
        })
        
        # Formula percentage
        self.formats['formula_pct'] = self.workbook.add_format({
            'font_color': self.COLOR_FORMULA,
            'num_format': '0.0%'
        })
        
        # External link format (green)
        self.formats['external'] = self.workbook.add_format({
            'font_color': self.COLOR_EXTERNAL,
            'num_format': '#,##0'
        })
        
        # Header format (dark blue bg, white text, bold)
        self.formats['header'] = self.workbook.add_format({
            'font_color': self.COLOR_HEADER_TEXT,
            'bg_color': self.COLOR_HEADER,
            'bold': True,
            'align': 'center',
            'valign': 'vcenter',
            'border': 1
        })
        
        # Subheader format
        self.formats['subheader'] = self.workbook.add_format({
            'bold': True,
            'bg_color': '#D9E1F2',
            'border': 1
        })
        
        # Check format (red)
        self.formats['check'] = self.workbook.add_format({
            'font_color': self.COLOR_CHECK,
            'bold': True
        })
        
        # Warning format (yellow)
        self.formats['warning'] = self.workbook.add_format({
            'bg_color': self.COLOR_WARNING,
            'bold': True
        })
        
        # Bold format
        self.formats['bold'] = self.workbook.add_format({'bold': True})
        
        # Currency format
        self.formats['currency'] = self.workbook.add_format({
            'num_format': '$#,##0'
        })
    
    def _create_readme_tab(self, ticker: str, company_name: str, version: int, fiscal_year_end: str):
        """Create README tab with instructions and metadata"""
        ws = self.workbook.add_worksheet('README')
        ws.set_column('A:A', 30)
        ws.set_column('B:B', 50)
        
        # Title
        ws.merge_range('A1:B1', f'{company_name} ({ticker}) - Financial Model', self.formats['header'])
        
        # Metadata
        ws.write('A3', 'Metadata', self.formats['bold'])
        ws.write('A4', 'Company:', self.formats['bold'])
        ws.write('B4', company_name)
        ws.write('A5', 'Ticker:', self.formats['bold'])
        ws.write('B5', ticker)
        ws.write('A6', 'Fiscal Year End:', self.formats['bold'])
        ws.write('B6', fiscal_year_end)
        ws.write('A7', 'Version:', self.formats['bold'])
        ws.write('B7', f'v{version}', self.formats['input'])
        ws.write('A8', 'Generated:', self.formats['bold'])
        ws.write('B8', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        
        # Instructions
        ws.write('A10', 'Instructions', self.formats['bold'])
        instructions = [
            ('A11', '1. Review Raw Import tab (do not edit - locked)'),
            ('A12', '2. Complete Drivers Map to identify Q, P, and T drivers'),
            ('A13', '3. Fill Assumptions & Drivers with your forecasts'),
            ('A14', '4. Build 3-statement model (IS, BS, CF)'),
            ('A15', '5. Complete supporting schedules (WC, Debt, PP&E, Stock Comp, Leases)'),
            ('A16', '6. Build DCF valuation'),
            ('A17', '7. Complete Comparable Companies analysis'),
            ('A18', '8. Review Outputs tab for summary'),
            ('A19', '9. Submit: Excel + Memo (1-2 pages) + Deck (3-5 slides)'),
        ]
        for cell, text in instructions:
            ws.write(cell, text)
        
        # Color conventions
        ws.write('A21', 'Color Conventions', self.formats['bold'])
        ws.write('A22', 'Blue cells:', self.formats['input'])
        ws.write('B22', 'User inputs (editable)')
        ws.write('A23', 'Black cells:')
        ws.write('B23', 'Formulas (auto-calculated)')
        ws.write('A24', 'Green cells:', self.formats['external'])
        ws.write('B24', 'Links to other tabs')
        ws.write('A25', 'Red cells:', self.formats['check'])
        ws.write('B25', 'Error checks (should be zero)')
        
        # Deliverables
        ws.write('A27', 'Deliverables', self.formats['bold'])
        ws.write('A28', '- Excel model with all tabs complete')
        ws.write('A29', '- 1-2 page investment memo (PDF)')
        ws.write('A30', '- 3-5 slide deck (PDF)')
    
    def _create_assumptions_tab(self, ticker: str, company_name: str):
        """Create Assumptions & Drivers tab"""
        ws = self.workbook.add_worksheet('Assumptions & Drivers')
        ws.set_column('A:A', 30)
        ws.set_column('B:K', 12)
        
        # Title
        ws.merge_range('A1:K1', f'{ticker} - Assumptions & Drivers', self.formats['header'])
        
        # Revenue Drivers Section
        ws.write('A3', 'Revenue Drivers', self.formats['subheader'])
        ws.write('A4', 'Metric', self.formats['bold'])
        
        # Year headers (2020-2029E)
        current_year = datetime.now().year
        for i in range(10):
            year = current_year - 4 + i
            suffix = 'E' if i >= 5 else ''
            ws.write(0, i + 1, f'{year}{suffix}', self.formats['header'])
        
        # Example driver rows (to be customized per company)
        drivers = [
            'Quantity (Q)',
            'Price (P)',
            'Revenue = Q x P',
        ]
        for idx, driver in enumerate(drivers, start=4):
            ws.write(f'A{idx}', driver, self.formats['bold'])
            # Input cells for user entry
            for col in range(1, 11):
                cell = f'{chr(65 + col)}{idx}'
                if 'Revenue' in driver:
                    ws.write(cell, f'=B{idx-2}*B{idx-1}', self.formats['formula'])
                else:
                    ws.write(cell, 0, self.formats['input_number'])
        
        # Operating Assumptions
        ws.write('A8', 'Operating Assumptions', self.formats['subheader'])
        op_assumptions = [
            ('Gross Margin %', '0.0%'),
            ('EBITDA Margin %', '0.0%'),
            ('D&A % of Revenue', '0.0%'),
            ('CapEx % of Revenue', '0.0%'),
        ]
        for idx, (metric, default) in enumerate(op_assumptions, start=9):
            ws.write(f'A{idx}', metric, self.formats['bold'])
            for col in range(1, 11):
                ws.write(f'{chr(65 + col)}{idx}', default, self.formats['input_pct'])
    
    def _create_income_statement_tab(self, ticker: str, company_name: str):
        """Create Income Statement tab"""
        ws = self.workbook.add_worksheet('Income Statement')
        ws.set_column('A:A', 30)
        ws.set_column('B:K', 12)
        
        # Title
        ws.merge_range('A1:K1', f'{ticker} - Income Statement', self.formats['header'])
        
        # Year headers
        current_year = datetime.now().year
        for i in range(10):
            year = current_year - 4 + i
            suffix = 'E' if i >= 5 else ''
            ws.write(0, i + 1, f'{year}{suffix}', self.formats['header'])
        
        # IS line items
        is_items = [
            ('Revenue', 'formula'),
            ('Cost of Revenue', 'formula'),
            ('Gross Profit', 'formula'),
            ('Operating Expenses', 'formula'),
            ('EBITDA', 'formula'),
            ('Depreciation & Amortization', 'formula'),
            ('EBIT', 'formula'),
            ('Interest Expense', 'formula'),
            ('EBT', 'formula'),
            ('Income Tax', 'formula'),
            ('Net Income', 'formula'),
        ]
        
        row = 3
        for item, fmt_type in is_items:
            ws.write(f'A{row}', item, self.formats['bold'])
            row += 1
        
        # Add check row
        ws.write(f'A{row+1}', 'Check: Revenue - COGS - OpEx - D&A - Interest - Tax = NI', self.formats['check'])
    
    def _create_balance_sheet_tab(self, ticker: str, company_name: str):
        """Create Balance Sheet tab"""
        ws = self.workbook.add_worksheet('Balance Sheet')
        ws.set_column('A:A', 30)
        ws.set_column('B:K', 12)
        
        ws.merge_range('A1:K1', f'{ticker} - Balance Sheet', self.formats['header'])
        
        # Year headers
        current_year = datetime.now().year
        for i in range(10):
            year = current_year - 4 + i
            suffix = 'E' if i >= 5 else ''
            ws.write(0, i + 1, f'{year}{suffix}', self.formats['header'])
        
        # Placeholder structure
        ws.write('A3', 'ASSETS', self.formats['subheader'])
        ws.write('A4', 'Current Assets', self.formats['bold'])
        ws.write('A10', 'LIABILITIES', self.formats['subheader'])
        ws.write('A11', 'Current Liabilities', self.formats['bold'])
        ws.write('A17', 'EQUITY', self.formats['subheader'])
        ws.write('A18', 'Total Equity', self.formats['bold'])
        ws.write('A20', 'Check: Assets = Liabilities + Equity', self.formats['check'])
    
    def _create_cash_flow_tab(self, ticker: str, company_name: str):
        """Create Cash Flow Statement tab"""
        ws = self.workbook.add_worksheet('Cash Flow')
        ws.set_column('A:A', 30)
        ws.set_column('B:K', 12)
        
        ws.merge_range('A1:K1', f'{ticker} - Cash Flow Statement', self.formats['header'])
        
        # Placeholder structure
        ws.write('A3', 'Operating Activities', self.formats['subheader'])
        ws.write('A10', 'Investing Activities', self.formats['subheader'])
        ws.write('A15', 'Financing Activities', self.formats['subheader'])
        ws.write('A20', 'Net Change in Cash', self.formats['bold'])
        ws.write('A21', 'Check: CF ties to BS', self.formats['check'])
    
    def _create_working_capital_tab(self, ticker: str, company_name: str):
        """Create Working Capital schedule"""
        ws = self.workbook.add_worksheet('Working Capital')
        ws.set_column('A:A', 30)
        ws.set_column('B:K', 12)
        
        ws.merge_range('A1:K1', f'{ticker} - Working Capital Schedule', self.formats['header'])
        ws.write('A3', 'Working Capital Components', self.formats['subheader'])
        
        wc_items = ['Accounts Receivable', 'Inventory', 'Accounts Payable', 'Net Working Capital']
        for idx, item in enumerate(wc_items, start=4):
            ws.write(f'A{idx}', item, self.formats['bold'])
    
    def _create_debt_schedule_tab(self, ticker: str, company_name: str):
        """Create Debt schedule"""
        ws = self.workbook.add_worksheet('Debt Schedule')
        ws.set_column('A:A', 30)
        ws.set_column('B:K', 12)
        
        ws.merge_range('A1:K1', f'{ticker} - Debt Schedule', self.formats['header'])
        ws.write('A3', 'Debt Rollforward', self.formats['subheader'])
        
        debt_items = ['Beginning Balance', 'Additions', 'Repayments', 'Ending Balance', 'Interest Expense']
        for idx, item in enumerate(debt_items, start=4):
            ws.write(f'A{idx}', item, self.formats['bold'])
    
    def _create_equity_schedule_tab(self, ticker: str, company_name: str):
        """Create Equity schedule"""
        ws = self.workbook.add_worksheet('Equity Schedule')
        ws.set_column('A:A', 30)
        ws.set_column('B:K', 12)
        
        ws.merge_range('A1:K1', f'{ticker} - Equity Schedule', self.formats['header'])
        ws.write('A3', 'Share Count Rollforward', self.formats['subheader'])
    
    def _create_ppe_depreciation_tab(self, ticker: str, company_name: str):
        """Create PP&E & Depreciation schedule"""
        ws = self.workbook.add_worksheet('PP&E & Depreciation')
        ws.set_column('A:A', 30)
        ws.set_column('B:K', 12)
        
        ws.merge_range('A1:K1', f'{ticker} - PP&E & Depreciation', self.formats['header'])
        ws.write('A3', 'PP&E Rollforward', self.formats['subheader'])
    
    def _create_stock_comp_tab(self, ticker: str, company_name: str):
        """Create Stock Compensation schedule"""
        ws = self.workbook.add_worksheet('Stock Compensation')
        ws.set_column('A:A', 30)
        ws.set_column('B:K', 12)
        
        ws.merge_range('A1:K1', f'{ticker} - Stock-Based Compensation', self.formats['header'])
        ws.write('A3', 'SBC Expense Schedule', self.formats['subheader'])
    
    def _create_leases_tab(self, ticker: str, company_name: str):
        """Create Leases schedule"""
        ws = self.workbook.add_worksheet('Leases')
        ws.set_column('A:A', 30)
        ws.set_column('B:K', 12)
        
        ws.merge_range('A1:K1', f'{ticker} - Lease Schedule (ASC 842)', self.formats['header'])
        ws.write('A3', 'ROU Asset & Lease Liability', self.formats['subheader'])
    
    def _create_dcf_tab(self, ticker: str, company_name: str):
        """Create DCF valuation tab"""
        ws = self.workbook.add_worksheet('DCF')
        ws.set_column('A:A', 30)
        ws.set_column('B:K', 12)
        
        ws.merge_range('A1:K1', f'{ticker} - DCF Valuation', self.formats['header'])
        
        # DCF sections
        ws.write('A3', 'Free Cash Flow (FCFF)', self.formats['subheader'])
        ws.write('A12', 'WACC Calculation', self.formats['subheader'])
        ws.write('A20', 'Terminal Value', self.formats['subheader'])
        ws.write('A25', 'Valuation Summary', self.formats['subheader'])
    
    def _create_comps_tab(self, ticker: str, company_name: str):
        """Create Comparable Companies tab"""
        ws = self.workbook.add_worksheet('Comparable Companies')
        ws.set_column('A:A', 30)
        ws.set_column('B:K', 12)
        
        ws.merge_range('A1:K1', f'{ticker} - Comparable Companies Analysis', self.formats['header'])
        ws.write('A3', 'Trading Multiples', self.formats['subheader'])
    
    def _create_outputs_tab(self, ticker: str, company_name: str):
        """Create Outputs summary tab"""
        ws = self.workbook.add_worksheet('Outputs')
        ws.set_column('A:A', 30)
        ws.set_column('B:B', 20)
        
        ws.merge_range('A1:B1', f'{ticker} - Valuation Summary', self.formats['header'])
        
        # Summary outputs
        ws.write('A3', 'Valuation Methods', self.formats['subheader'])
        ws.write('A4', 'DCF Value per Share', self.formats['bold'])
        ws.write('A5', 'Comps Value per Share', self.formats['bold'])
        ws.write('A6', 'Target Price', self.formats['bold'])
        ws.write('A7', 'Current Price', self.formats['bold'])
        ws.write('A8', 'Upside/(Downside)', self.formats['bold'])
    
    def _create_drivers_map_tab(self, ticker: str, company_name: str):
        """Create Drivers Map tab"""
        ws = self.workbook.add_worksheet('Drivers Map')
        ws.set_column('A:A', 30)
        ws.set_column('B:D', 40)
        
        ws.merge_range('A1:D1', f'{ticker} - Revenue Drivers Map', self.formats['header'])
        
        ws.write('A3', 'Driver Type', self.formats['bold'])
        ws.write('B3', 'Description', self.formats['bold'])
        ws.write('C3', 'SEC/IR Source', self.formats['bold'])
        ws.write('D3', 'Notes', self.formats['bold'])
        
        ws.write('A4', 'Quantity (Q)', self.formats['bold'])
        ws.write('A5', 'Price (P)', self.formats['bold'])
        ws.write('A6', 'Take-Rate (T)', self.formats['bold'])
    
    def _create_raw_import_tab(self, ticker: str, company_name: str):
        """Create Raw Import tab (LOCKED)"""
        ws = self.workbook.add_worksheet('Raw Import')
        ws.set_column('A:A', 30)
        ws.set_column('B:K', 12)
        
        ws.merge_range('A1:K1', f'{ticker} - Raw Import (DO NOT EDIT)', self.formats['header'])
        
        ws.write('A3', 'Note:', self.formats['warning'])
        ws.write('B3', 'This tab contains machine-ingested data from SEC filings and IR materials.')
        ws.write('A4', 'DO NOT EDIT this tab. Use it as reference only.')
        
        # Lock the sheet (users can still view)
        ws.protect('', {
            'objects': True,
            'scenarios': True,
            'format_cells': False,
            'format_columns': False,
            'format_rows': False,
            'insert_columns': False,
            'insert_rows': False,
            'insert_hyperlinks': False,
            'delete_columns': False,
            'delete_rows': False,
            'select_locked_cells': True,
            'sort': False,
            'autofilter': False,
            'pivot_tables': False,
            'select_unlocked_cells': True
        })

