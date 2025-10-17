"""
Investor-ready financials preview/export endpoints
Prefix: /api/reporting/financials
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional, Dict, Any, List
from datetime import date, datetime
import io

from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text

from services.api.database import get_db
from pathlib import Path
import json as _jsonlib
# Legacy aggregated accounting module removed. Use local reporting functions below.

try:
    import weasyprint as _weasy  # type: ignore
except Exception:  # pragma: no cover
    _weasy = None  # type: ignore
try:
    import xlsxwriter  # type: ignore
except Exception:  # pragma: no cover
    xlsxwriter = None  # type: ignore

router = APIRouter(prefix="/api/reporting/financials", tags=["reporting"])


def _period_start_end(period: str, period_type: str) -> (date, date):
    y = int(period[0:4]); m = int(period[5:7])
    from calendar import monthrange
    if period_type == 'monthly':
        start = date(y, m, 1); end = date(y, m, monthrange(y, m)[1])
    elif period_type == 'quarterly':
        q = (m - 1)//3 + 1; sm = (q-1)*3 + 1; em = sm+2
        start = date(y, sm, 1); end = date(y, em, monthrange(y, em)[1])
    else:  # annual
        start = date(y, 1, 1); end = date(y, 12, 31)
    return start, end


def _branding(entity_id: int) -> Dict[str, Any]:
    try:
        p = Path('public/branding/branding.json')
        if p.exists():
            data = _jsonlib.loads(p.read_text(encoding='utf-8'))
            k = str(entity_id)
            return data.get(k) or {}
    except Exception:
        pass
    return {}


@router.get("/preview")
async def preview(
    entity_id: int,
    period: str = Query(..., description="YYYY-MM (start of period)"),
    period_type: str = Query('monthly', pattern='^(monthly|quarterly|annual)$'),
    type: str = Query('IS', pattern='^(IS|BS|CF|EQUITY|NOTES)$'),
    db: Session = Depends(get_db),
):
    start, end = _period_start_end(period, period_type)
    if type == 'IS':
        data = await get_income_statement(entity_id=entity_id, period=f"{period_type.upper()}-{start.year}", fiscal_year=None, db=db)  # type: ignore
        rows = ([{"label":"Revenue","level":1,"amount":data['total_revenue']}]+[
            {"label":f"{l['account_code']} {l['account_name']}","level":2,"amount":l['amount']} for l in data['revenue_lines']
        ] + [{"label":"Expenses","level":1,"amount":data['total_expenses']}] + [
            {"label":f"{l['account_code']} {l['account_name']}","level":2,"amount":l['amount']} for l in data['expense_lines']
        ] + [{"label":"Net Income","level":1,"amount":data['net_income']}])
        return {"statement":"IS","period":{"start":start.isoformat(),"end":end.isoformat()},"rows":rows}
    if type == 'BS':
        data = await get_balance_sheet(entity_id=entity_id, as_of_date=end, db=db)  # type: ignore
        rows: List[Dict[str,Any]] = []
        for sec, key in (("Assets","asset_lines"),("Liabilities","liability_lines"),("Equity","equity_lines")):
            rows.append({"label":sec,"level":1,"amount":0})
            for l in data[key]:
                rows.append({"label":f"{l['account_code']} {l['account_name']}","level":2,"amount":l['amount']})
        return {"statement":"BS","period":{"as_of":end.isoformat()},"rows":rows}
    if type == 'CF':
        data = await _cf(entity_id=entity_id, start_date=start, end_date=end, current_user=None, db=db)  # type: ignore
        rows = [{"label":f"{l['account_code']} {l['account_name']}","level":2,"amount":l['amount']} for l in data['cash_lines']]
        rows.append({"label":"Net Change in Cash","level":1,"amount":data['net_change_in_cash']})
        return {"statement":"CF","period":{"start":start.isoformat(),"end":end.isoformat()},"rows":rows}
    if type == 'EQUITY':
        b = await _bs(entity_id=entity_id, as_of_date=end, current_user=None, db=db)  # type: ignore
        rows = [{"label":f"{l['account_code']} {l['account_name']}","level":2,"amount":l['amount']} for l in b['equity_lines']]
        return {"statement":"EQUITY","period":{"as_of":end.isoformat()},"rows":rows}
    # NOTES shell
    return {"statement":"NOTES","period":{"as_of":end.isoformat()},"rows":[{"label":"Notes (skeleton)","level":1,"amount":0}]}


@router.get("/export")
async def export_financials(
    entity_id: int,
    period: str,
    period_type: str = Query('monthly', pattern='^(monthly|quarterly|annual)$'),
    format: str = Query('pdf', pattern='^(pdf|xlsx)$'),
    db: Session = Depends(get_db),
):
    start, end = _period_start_end(period, period_type)
    # Use local reporting endpoints (posted entries only)
    # Map period_type to input acceptable by get_income_statement (expects period string)
    # For export, we directly call the underlying queries instead of string period mapping
    isd = await get_income_statement(entity_id=entity_id, period=f"{period_type.upper()}-{start.year}", fiscal_year=None, db=db)  # type: ignore
    bsd = await get_balance_sheet(entity_id=entity_id, as_of_date=end, db=db)  # type: ignore
    cfd = await get_cash_flow_statement(entity_id=entity_id, period=f"{period_type.upper()}-{start.year}", db=db)  # type: ignore
    if format == 'xlsx':
        if xlsxwriter is None:
            raise HTTPException(status_code=501, detail='xlsxwriter not available')
        mem = io.BytesIO(); wb = xlsxwriter.Workbook(mem, {"in_memory": True}); fmt = wb.add_format({"bold": True}); title = wb.add_format({"bold": True, "font_size": 16}); small = wb.add_format({"font_size": 9, "italic": True})
        b = _branding(entity_id)
        disp = b.get('display_name') or f"Entity {entity_id}"
        # Cover
        shc = wb.add_worksheet('Cover');
        shc.write(0,0,f'{disp} — Financial Statements', title); shc.write(1,0,f'Period: {start.isoformat()} – {end.isoformat()}'); shc.write(3,0,'Prepared by: __________    Reviewed by: __________    Approved by: __________', small)
        sh = wb.add_worksheet('Income Statement'); sh.write_row(0,0,["Account","Amount"],fmt); r=1
        for l in isd['revenue_lines']: sh.write_row(r,0,[f"{l['account_code']} {l['account_name']}", l['amount']]); r+=1
        sh.write_row(r,0,["Total Revenue", isd['total_revenue']],fmt); r+=2
        for l in isd['expense_lines']: sh.write_row(r,0,[f"{l['account_code']} {l['account_name']}", l['amount']]); r+=1
        sh.write_row(r,0,["Total Expenses", isd['total_expenses']],fmt); r+=1
        sh.write_row(r,0,["Net Income", isd['net_income']],fmt)
        sh = wb.add_worksheet('Balance Sheet'); sh.write_row(0,0,["Section","Account","Amount"],fmt); r=1
        for sec,key in (("Assets",'asset_lines'),("Liabilities",'liability_lines'),("Equity",'equity_lines')):
            for l in bsd[key]: sh.write_row(r,0,[sec, f"{l['account_code']} {l['account_name']}", l['amount']]); r+=1
        sh = wb.add_worksheet('Cash Flows'); sh.write_row(0,0,["Account","Amount"],fmt); r=1
        for l in cfd['cash_lines']: sh.write_row(r,0,[f"{l['account_code']} {l['account_name']}", l['amount']]); r+=1
        sh.write_row(r,0,["Net Change in Cash", cfd['net_change_in_cash']],fmt)
        # Notes
        shn = wb.add_worksheet('Notes'); shn.write(0,0,'Notes to Financial Statements', title)
        notes = [
            '1. Organization and Nature of Operations.',
            '2. Basis of Presentation.',
            '3. Summary of Significant Accounting Policies.',
            '4. Revenue Recognition.',
            '5. Property and Equipment.',
            '6. Income Taxes.',
            '7. Commitments and Contingencies.',
        ]
        for i,n in enumerate(notes, start=2): shn.write(i,0,n)
        wb.close(); mem.seek(0)
        return StreamingResponse(mem, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers={'Content-Disposition': f"attachment; filename=financials_{entity_id}_{period}.xlsx"})
    # PDF
    b = _branding(entity_id)
    disp = b.get('display_name') or f"Entity {entity_id}"
    html = f"""
    <html>
      <head>
        <meta charset='utf-8'>
        <style>
          @page {{ margin: 24mm; }}
          body {{ font-family: Arial, sans-serif; font-size: 12px; }}
          .cover {{ height: 100%; display:flex; flex-direction:column; justify-content:center; align-items:center; }}
          .muted {{ color:#666; font-size:11px; }} .page-break {{ page-break-after: always; }} table {{ width:100%; border-collapse: collapse; }} th,td {{ border:1px solid #ccc; padding:6px; }} .right {{ text-align:right; }}
        </style>
      </head>
      <body>
        <div class='cover'>
          <h1>{disp} — Financial Statements</h1>
          <div class='muted'>Period: {start.isoformat()} – {end.isoformat()}</div>
          <div class='muted'>Prepared: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</div>
          <div>Prepared by: __________ &nbsp;&nbsp; Reviewed by: __________ &nbsp;&nbsp; Approved by: __________</div>
        </div>
        <div class='page-break'></div>
        <h2>Balance Sheet</h2>
        <table><tr><th>Section</th><th>Account</th><th class='right'>Amount</th></tr>
        {''.join([f"<tr><td>Assets</td><td>{l['account_code']} {l['account_name']}</td><td class='right'>{l['amount']:.2f}</td></tr>" for l in bsd['asset_lines']])}
        {''.join([f"<tr><td>Liabilities</td><td>{l['account_code']} {l['account_name']}</td><td class='right'>{l['amount']:.2f}</td></tr>" for l in bsd['liability_lines']])}
        {''.join([f"<tr><td>Equity</td><td>{l['account_code']} {l['account_name']}</td><td class='right'>{l['amount']:.2f}</td></tr>" for l in bsd['equity_lines']])}
        </table>
        <div class='page-break'></div>
        <h2>Statement of Operations</h2>
        <table><tr><th>Account</th><th class='right'>Amount</th></tr>
        {''.join([f"<tr><td>{l['account_code']} {l['account_name']}</td><td class='right'>{l['amount']:.2f}</td></tr>" for l in isd['revenue_lines']])}
        <tr><td><b>Total Revenue</b></td><td class='right'><b>{isd['total_revenue']:.2f}</b></td></tr>
        {''.join([f"<tr><td>{l['account_code']} {l['account_name']}</td><td class='right'>{l['amount']:.2f}</td></tr>" for l in isd['expense_lines']])}
        <tr><td><b>Total Expenses</b></td><td class='right'><b>{isd['total_expenses']:.2f}</b></td></tr>
        <tr><td><b>Net Income</b></td><td class='right'><b>{isd['net_income']:.2f}</b></td></tr>
        </table>
        <div class='page-break'></div>
        <h2>Statement of Cash Flows (Indirect)</h2>
        <table><tr><th>Account</th><th class='right'>Amount</th></tr>
        {''.join([f"<tr><td>{l['account_code']} {l['account_name']}</td><td class='right'>{l['amount']:.2f}</td></tr>" for l in cfd['cash_lines']])}
        <tr><td><b>Net Change in Cash</b></td><td class='right'><b>{cfd['net_change_in_cash']:.2f}</b></td></tr>
        </table>
        <div class='page-break'></div>
        <h2>Notes to Financial Statements</h2>
        <ol>
          <li><b>Organization and Nature of Operations.</b> [Placeholder]</li>
          <li><b>Basis of Presentation.</b> [Placeholder]</li>
          <li><b>Significant Accounting Policies.</b> [Placeholder]</li>
          <li><b>Revenue Recognition.</b> [Placeholder]</li>
          <li><b>Property and Equipment.</b> [Placeholder]</li>
          <li><b>Income Taxes.</b> [Placeholder]</li>
          <li><b>Commitments and Contingencies.</b> [Placeholder]</li>
        </ol>
      </body>
    </html>
    """
    if _weasy is None:
        raise HTTPException(status_code=501, detail='WeasyPrint not available')
    pdf = _weasy.HTML(string=html).write_pdf()
    return StreamingResponse(io.BytesIO(pdf), media_type='application/pdf', headers={'Content-Disposition': f"attachment; filename=financials_{entity_id}_{period}.pdf"})
