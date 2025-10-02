# Appendix — Excel Standards for NGI Learning Module
**Last Updated:** October 2, 2025  
**Programmatic Generation:** xlsxwriter v3.2.9+  
**Validation:** openpyxl v3.1.5+  
**Target:** Banker-grade financial models

## 0) Overview

All Excel packages are programmatically generated using `xlsxwriter` for consistency, auditability, and scalability. This document defines standards for workbook structure, formatting, naming conventions, and best practices.

---

## 1) Color Conventions

| Element | Color | RGB | Usage |
|---------|-------|-----|-------|
| **Inputs** | Blue | #0070C0 | User-editable cells |
| **Formulas** | Black | #000000 | Calculated cells |
| **External Links** | Green | #00B050 | Links to other tabs |
| **Checks** | Red | #FF0000 | Error checks |
| **Warnings** | Yellow | #FFFF00 | Warnings |
| **Headers** | Dark Blue | #002060 | Section headers |

**xlsxwriter Implementation:**
```python
import xlsxwriter

workbook = xlsxwriter.Workbook('TSLA_2025_Model_v1.xlsx')

fmt_input = workbook.add_format({
    'font_color': '#0070C0',
    'bold': True,
    'border': 1,
    'bg_color': '#E7F3FF'
})

fmt_formula = workbook.add_format({
    'font_color': '#000000',
    'num_format': '#,##0'
})

fmt_header = workbook.add_format({
    'font_color': '#FFFFFF',
    'bg_color': '#002060',
    'bold': True,
    'align': 'center'
})
```

---

## 2) Required Tabs

1. README
2. Assumptions & Drivers
3. Income Statement
4. Balance Sheet
5. Cash Flow
6. Working Capital
7. Debt Schedule
8. Equity Schedule
9. PP&E & Depreciation
10. Stock Compensation
11. Leases
12. DCF
13. Comparable Companies
14. Outputs
15. Drivers Map
16. Raw Import (LOCKED)

**Tab Creation:**
```python
ws_readme = workbook.add_worksheet('README')
ws_assumptions = workbook.add_worksheet('Assumptions & Drivers')
ws_is = workbook.add_worksheet('Income Statement')
ws_bs = workbook.add_worksheet('Balance Sheet')
ws_cf = workbook.add_worksheet('Cash Flow')
# ... continue for all tabs
```

---

## 3) README Tab Template

```python
def create_readme_tab(worksheet, company_name, ticker):
    worksheet.merge_range('A1:D1', f'{company_name} ({ticker}) - Financial Model', fmt_header)
    worksheet.write('A2', 'Version:', fmt_bold)
    worksheet.write('B2', 'v1.0', fmt_input)
    
    instructions = [
        '1. Start with Assumptions & Drivers tab',
        '2. Review Raw Import tab (do not edit)',
        '3. Complete Drivers Map',
        '4. Build revenue projections (A3)',
        '5. Complete WC and Debt schedules (A2)',
        '6. Build DCF (A4)',
        '7. Add comps (A5)',
        '8. Submit: Excel + Memo + Deck',
    ]
    
    for i, instruction in enumerate(instructions):
        worksheet.write(f'A{7+i}', instruction)
    
    worksheet.set_column('A:A', 25)
```

---

## 4) Assumptions & Drivers Tab

```python
def create_assumptions_tab(worksheet):
    worksheet.merge_range('A1:H1', 'ASSUMPTIONS & DRIVERS', fmt_header)
    
    # Scenario dropdown
    worksheet.data_validation('B8', {
        'validate': 'list',
        'source': ['Base Case', 'Bull Case', 'Bear Case']
    })
    
    # Revenue assumptions
    years = [2024, 2025, 2026, 2027, 2028, 2029]
    for i, year in enumerate(years):
        worksheet.write(i+1, 11, year, fmt_header)
    
    # Growth rates
    worksheet.write('A12', 'Revenue Growth %', fmt_bold)
    growth_rates = ['5.0%', '6.0%', '6.0%', '6.0%', '6.0%']
    for i, rate in enumerate(growth_rates):
        worksheet.write(i+2, 12, rate, fmt_input)
```

---

## 5) Charts

**Football Field Chart:**
```python
chart = workbook.add_chart({'type': 'bar', 'subtype': 'stacked'})

chart.add_series({
    'name': 'DCF Valuation',
    'categories': '=Outputs!$A$50:$A$52',
    'values': '=Outputs!$B$50:$B$52',
    'fill': {'color': '#0070C0'}
})

chart.set_title({'name': 'Valuation Football Field'})
chart.set_x_axis({'name': 'Price per Share ($)'})

worksheet.insert_chart('D5', chart)
```

---

## 6) Validation with openpyxl

```python
from openpyxl import load_workbook

class ExcelValidator:
    def __init__(self, file_path):
        self.wb = load_workbook(file_path)
        self.errors = []
    
    def check_balance_sheet_balance(self):
        ws = self.wb['Balance Sheet']
        for col in range(2, 8):
            assets = ws.cell(50, col).value
            liabilities_equity = ws.cell(80, col).value
            if abs(assets - liabilities_equity) > 1:
                self.errors.append(f"BS doesn't balance in column {col}")
    
    def check_no_errors(self):
        errors = ['#REF!', '#VALUE!', '#DIV/0!']
        for sheet in self.wb.sheetnames:
            ws = self.wb[sheet]
            for row in ws.iter_rows():
                for cell in row:
                    if cell.value in errors:
                        self.errors.append(f"Error in {sheet}!{cell.coordinate}")
```

---

## 7) File Naming

**Format:** `{TICKER}_{YEAR}_Model_v{VERSION}.xlsx`

Examples:
- `TSLA_2025_Model_v1.xlsx`
- `COST_2025_Model_v1.xlsx`

```python
def generate_filename(ticker, year, version):
    return f"{ticker.upper()}_{year}_Model_v{version}.xlsx"
```

---

## 8) Protection

```python
# Unlock input cells
fmt_input_unlocked = workbook.add_format({
    'font_color': '#0070C0',
    'locked': False
})

# Protect sheet
ws_assumptions.protect('')

# Raw Import: fully locked
ws_raw_import.protect('ngi_learning_2025')
```

---

**This ensures all packages are consistent, professional, and banker-grade.**

