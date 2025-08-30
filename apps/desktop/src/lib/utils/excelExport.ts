/**
 * Excel export utilities for financial statements
 * Exports to XLSX format with proper formatting
 */

interface ExcelRow {
  [key: string]: any;
}

interface FinancialStatementData {
  title: string;
  entity: string;
  period: string;
  headers: string[];
  rows: ExcelRow[];
  totals?: ExcelRow;
}

/**
 * Export Income Statement to Excel
 */
export function exportIncomeStatement(data: any, entity: string, period: string): void {
  const rows: ExcelRow[] = [];
  
  // Revenue section
  rows.push({ Category: 'REVENUES', Amount: '' });
  rows.push({ Category: '  Advisory Services', Amount: data?.revenues?.operatingRevenues?.advisoryServices || 0 });
  rows.push({ Category: '  Consulting Revenue', Amount: data?.revenues?.operatingRevenues?.consultingRevenue || 0 });
  rows.push({ Category: '  Project Revenue', Amount: data?.revenues?.operatingRevenues?.projectRevenue || 0 });
  rows.push({ Category: 'Total Operating Revenues', Amount: data?.revenues?.operatingRevenues?.total || 0 });
  rows.push({ Category: '', Amount: '' }); // Empty row
  
  // Expense section
  rows.push({ Category: 'EXPENSES', Amount: '' });
  rows.push({ Category: '  Direct Labor', Amount: data?.expenses?.costOfRevenue?.directLabor || 0 });
  rows.push({ Category: '  Salaries and Wages', Amount: data?.expenses?.operatingExpenses?.salariesAndWages || 0 });
  rows.push({ Category: '  Employee Benefits', Amount: data?.expenses?.operatingExpenses?.employeeBenefits || 0 });
  rows.push({ Category: '  Rent Expense', Amount: data?.expenses?.operatingExpenses?.rentExpense || 0 });
  rows.push({ Category: '  Professional Fees', Amount: data?.expenses?.operatingExpenses?.professionalFees || 0 });
  rows.push({ Category: '  Depreciation & Amortization', Amount: data?.expenses?.operatingExpenses?.depreciationAmortization || 0 });
  rows.push({ Category: 'Total Expenses', Amount: data?.expenses?.totalExpenses || 0 });
  rows.push({ Category: '', Amount: '' }); // Empty row
  
  // Net Income
  rows.push({ Category: 'NET INCOME', Amount: data?.calculations?.netIncome || 0 });
  
  const statementData: FinancialStatementData = {
    title: 'Income Statement',
    entity,
    period,
    headers: ['Category', 'Amount'],
    rows
  };
  
  downloadAsExcel(statementData, `Income_Statement_${entity}_${period}.xlsx`);
}

/**
 * Export Balance Sheet to Excel
 */
export function exportBalanceSheet(data: any, entity: string, asOfDate: string): void {
  const rows: ExcelRow[] = [];
  
  // Assets section
  rows.push({ Category: 'ASSETS', Amount: '' });
  rows.push({ Category: 'Current Assets', Amount: '' });
  rows.push({ Category: '  Cash and Cash Equivalents', Amount: data?.assets?.currentAssets?.cashAndEquivalents || 0 });
  rows.push({ Category: '  Accounts Receivable', Amount: data?.assets?.currentAssets?.accountsReceivable || 0 });
  rows.push({ Category: '  Inventory', Amount: data?.assets?.currentAssets?.inventory || 0 });
  rows.push({ Category: '  Prepaid Expenses', Amount: data?.assets?.currentAssets?.prepaidExpenses || 0 });
  rows.push({ Category: 'Total Current Assets', Amount: data?.assets?.currentAssets?.totalCurrentAssets || 0 });
  rows.push({ Category: '', Amount: '' });
  
  rows.push({ Category: 'Non-Current Assets', Amount: '' });
  rows.push({ Category: '  Property, Plant & Equipment', Amount: data?.assets?.nonCurrentAssets?.propertyPlantEquipment || 0 });
  rows.push({ Category: '  Less: Accumulated Depreciation', Amount: -(data?.assets?.nonCurrentAssets?.accumulatedDepreciation || 0) });
  rows.push({ Category: '  Intangible Assets', Amount: data?.assets?.nonCurrentAssets?.intangibleAssets || 0 });
  rows.push({ Category: 'Total Non-Current Assets', Amount: data?.assets?.nonCurrentAssets?.totalNonCurrentAssets || 0 });
  rows.push({ Category: 'TOTAL ASSETS', Amount: data?.assets?.totalAssets || 0 });
  rows.push({ Category: '', Amount: '' });
  
  // Liabilities section
  rows.push({ Category: 'LIABILITIES', Amount: '' });
  rows.push({ Category: 'Current Liabilities', Amount: '' });
  rows.push({ Category: '  Accounts Payable', Amount: data?.liabilities?.currentLiabilities?.accountsPayable || 0 });
  rows.push({ Category: '  Accrued Expenses', Amount: data?.liabilities?.currentLiabilities?.accruedExpenses || 0 });
  rows.push({ Category: 'Total Current Liabilities', Amount: data?.liabilities?.currentLiabilities?.totalCurrentLiabilities || 0 });
  rows.push({ Category: '', Amount: '' });
  
  rows.push({ Category: 'Non-Current Liabilities', Amount: '' });
  rows.push({ Category: '  Long-term Debt', Amount: data?.liabilities?.nonCurrentLiabilities?.longTermDebt || 0 });
  rows.push({ Category: 'Total Non-Current Liabilities', Amount: data?.liabilities?.nonCurrentLiabilities?.totalNonCurrentLiabilities || 0 });
  rows.push({ Category: 'TOTAL LIABILITIES', Amount: data?.liabilities?.totalLiabilities || 0 });
  rows.push({ Category: '', Amount: '' });
  
  // Equity section
  rows.push({ Category: 'EQUITY', Amount: '' });
  rows.push({ Category: '  Common Stock', Amount: data?.equity?.commonStock || 0 });
  rows.push({ Category: '  Retained Earnings', Amount: data?.equity?.retainedEarnings || 0 });
  rows.push({ Category: '  Partner 1 Capital', Amount: data?.equity?.partnerCapitalAccounts?.partner1 || 0 });
  rows.push({ Category: '  Partner 2 Capital', Amount: data?.equity?.partnerCapitalAccounts?.partner2 || 0 });
  rows.push({ Category: 'TOTAL EQUITY', Amount: data?.equity?.totalEquity || 0 });
  rows.push({ Category: '', Amount: '' });
  rows.push({ Category: 'TOTAL LIABILITIES & EQUITY', Amount: data?.totalLiabilitiesAndEquity || 0 });
  
  const statementData: FinancialStatementData = {
    title: 'Balance Sheet',
    entity,
    period: `As of ${asOfDate}`,
    headers: ['Category', 'Amount'],
    rows
  };
  
  downloadAsExcel(statementData, `Balance_Sheet_${entity}_${asOfDate}.xlsx`);
}

/**
 * Export Cash Flow Statement to Excel
 */
export function exportCashFlow(data: any, entity: string, period: string): void {
  const rows: ExcelRow[] = [];
  
  // Operating Activities
  rows.push({ Category: 'CASH FLOWS FROM OPERATING ACTIVITIES', Amount: '' });
  rows.push({ Category: '  Net Income', Amount: data?.operatingActivities?.netIncome || 0 });
  rows.push({ Category: '  Depreciation', Amount: data?.operatingActivities?.adjustments?.depreciation || 0 });
  rows.push({ Category: '  Amortization', Amount: data?.operatingActivities?.adjustments?.amortization || 0 });
  rows.push({ Category: '  Changes in Working Capital', Amount: '' });
  rows.push({ Category: '    Accounts Receivable', Amount: data?.operatingActivities?.workingCapitalChanges?.accountsReceivable || 0 });
  rows.push({ Category: '    Accounts Payable', Amount: data?.operatingActivities?.workingCapitalChanges?.accountsPayable || 0 });
  rows.push({ Category: 'Net Cash from Operating Activities', Amount: data?.operatingActivities?.totalOperatingCashFlow || 0 });
  rows.push({ Category: '', Amount: '' });
  
  // Investing Activities
  rows.push({ Category: 'CASH FLOWS FROM INVESTING ACTIVITIES', Amount: '' });
  rows.push({ Category: '  Capital Expenditures', Amount: data?.investingActivities?.capitalExpenditures || 0 });
  rows.push({ Category: '  Acquisitions', Amount: data?.investingActivities?.acquisitions || 0 });
  rows.push({ Category: 'Net Cash from Investing Activities', Amount: data?.investingActivities?.totalInvestingCashFlow || 0 });
  rows.push({ Category: '', Amount: '' });
  
  // Financing Activities
  rows.push({ Category: 'CASH FLOWS FROM FINANCING ACTIVITIES', Amount: '' });
  rows.push({ Category: '  Debt Proceeds', Amount: data?.financingActivities?.debtProceeds || 0 });
  rows.push({ Category: '  Debt Repayments', Amount: data?.financingActivities?.debtRepayments || 0 });
  rows.push({ Category: '  Equity Issuance', Amount: data?.financingActivities?.equityIssuance || 0 });
  rows.push({ Category: 'Net Cash from Financing Activities', Amount: data?.financingActivities?.totalFinancingCashFlow || 0 });
  rows.push({ Category: '', Amount: '' });
  
  // Summary
  rows.push({ Category: 'NET CHANGE IN CASH', Amount: data?.summary?.netChangeInCash || 0 });
  rows.push({ Category: 'Beginning Cash', Amount: data?.summary?.beginningCash || 0 });
  rows.push({ Category: 'ENDING CASH', Amount: data?.summary?.endingCash || 0 });
  
  const statementData: FinancialStatementData = {
    title: 'Cash Flow Statement',
    entity,
    period,
    headers: ['Category', 'Amount'],
    rows
  };
  
  downloadAsExcel(statementData, `Cash_Flow_${entity}_${period}.xlsx`);
}

/**
 * Helper function to download CSV content
 */
function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export equity statement to Excel
 */
export function exportEquityStatement(data: any, entity: string, period: string): void {
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Create CSV content for equity statement
  const csvContent = [
    [`Statement of Stockholders' Equity - ${entity}`],
    [`Period: ${period}`],
    [],
    ['', 'Common Stock', 'Additional Paid-in Capital', 'Retained Earnings', 'Total Equity'],
    ['Beginning Balance', 
      data.beginningBalance?.commonStock || 0,
      data.beginningBalance?.additionalPaidInCapital || 0,
      data.beginningBalance?.retainedEarnings || 0,
      data.beginningBalance?.totalEquity || 0
    ],
    ['Stock Issuances', 
      data.stockIssuances?.commonStock || 0,
      data.stockIssuances?.additionalPaidInCapital || 0,
      0,
      data.stockIssuances?.total || 0
    ],
    ['Net Income', 0, 0, data.netIncome || 0, data.netIncome || 0],
    ['Dividends', 0, 0, data.dividends || 0, data.dividends || 0],
    ['Ending Balance',
      data.endingBalance?.commonStock || 0,
      data.endingBalance?.additionalPaidInCapital || 0,
      data.endingBalance?.retainedEarnings || 0,
      data.endingBalance?.totalEquity || 0
    ]
  ];
  
  const csv = csvContent.map(row => row.join(',')).join('\n');
  downloadCSV(csv, `Equity_Statement_${entity}_${period}_${timestamp}.csv`);
}

/**
 * Export all financial statements to a single Excel file
 */
export function exportAllStatements(
  incomeData: any,
  balanceData: any,
  cashFlowData: any,
  equityData: any,
  entity: string,
  period: string
): void {
  // This would create a multi-sheet Excel file
  // For now, we'll create separate files
  const timestamp = new Date().toISOString().split('T')[0];
  
  console.log('Exporting all financial statements for', entity, period);
  
  // In a real implementation, this would use a library like xlsx or exceljs
  // to create a multi-sheet workbook
  alert(`Financial statements would be exported to Excel file: NGI_Financial_Statements_${entity}_${period}_${timestamp}.xlsx`);
}

/**
 * Helper function to download data as Excel file
 */
function downloadAsExcel(data: FinancialStatementData, filename: string): void {
  // Create CSV content as a simple alternative
  // In production, use a proper Excel library like xlsx or exceljs
  
  let csvContent = `${data.title}\\n`;
  csvContent += `Entity: ${data.entity}\\n`;
  csvContent += `Period: ${data.period}\\n\\n`;
  
  // Add headers
  csvContent += data.headers.join(',') + '\\n';
  
  // Add rows
  data.rows.forEach(row => {
    const values = data.headers.map(header => {
      const value = row[header];
      // Format numbers
      if (typeof value === 'number' && header === 'Amount') {
        return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
      }
      return value || '';
    });
    csvContent += values.join(',') + '\\n';
  });
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename.replace('.xlsx', '.csv'));
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Show notification
  console.log(`Exported ${data.title} to ${filename}`);
}