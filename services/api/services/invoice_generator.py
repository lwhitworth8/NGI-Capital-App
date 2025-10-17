"""
NGI Capital - Professional Invoice PDF Generator
Generates GAAP-compliant invoices with company branding

Author: NGI Capital Development Team
Date: October 10, 2025
"""

import os
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models_ar import Invoice, InvoiceLine, Customer
from ..models_accounting import AccountingEntity
from ..utils.datetime_utils import format_date_us, convert_to_pst


async def generate_invoice_pdf(invoice_id: int, db: AsyncSession) -> str:
    """
    Generate professional invoice PDF with NGI Capital branding
    
    Args:
        invoice_id: ID of invoice to generate
        db: Database session
        
    Returns:
        str: Path to generated PDF file
    """
    # Fetch invoice with relationships
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one()
    
    # Fetch customer
    customer_result = await db.execute(
        select(Customer).where(Customer.id == invoice.customer_id)
    )
    customer = customer_result.scalar_one()
    
    # Fetch entity
    entity_result = await db.execute(
        select(AccountingEntity).where(AccountingEntity.id == invoice.entity_id)
    )
    entity = entity_result.scalar_one()
    
    # Fetch invoice lines
    lines_result = await db.execute(
        select(InvoiceLine).where(InvoiceLine.invoice_id == invoice_id).order_by(InvoiceLine.line_number)
    )
    lines = lines_result.scalars().all()
    
    # Create PDF directory if it doesn't exist
    pdf_dir = Path("uploads/invoices")
    pdf_dir.mkdir(parents=True, exist_ok=True)
    
    # PDF file path
    pdf_filename = f"{invoice.invoice_number.replace('/', '_')}.pdf"
    pdf_path = pdf_dir / pdf_filename
    
    # Create PDF
    c = canvas.Canvas(str(pdf_path), pagesize=letter)
    width, height = letter
    
    # Set fonts
    c.setFont("Helvetica-Bold", 24)
    
    # ========================================================================
    # HEADER SECTION
    # ========================================================================
    
    # NGI Capital Logo (placeholder - would use actual logo)
    # For now, use text
    c.setFillColorRGB(0.2, 0.3, 0.5)  # Dark blue
    c.setFont("Helvetica-Bold", 20)
    c.drawString(50, height - 60, "NGI CAPITAL")
    
    # Company details (top right)
    c.setFillColorRGB(0, 0, 0)  # Black
    c.setFont("Helvetica", 10)
    y_pos = height - 50
    
    # Entity name
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(width - 50, y_pos, entity.entity_name)
    
    # Address (if available)
    y_pos -= 15
    c.setFont("Helvetica", 9)
    # Default address (would come from entity settings)
    c.drawRightString(width - 50, y_pos, "Los Angeles, California")
    y_pos -= 12
    c.drawRightString(width - 50, y_pos, f"EIN: {entity.ein or 'N/A'}")
    y_pos -= 12
    c.drawRightString(width - 50, y_pos, "contact@ngicapitaladvisory.com")
    
    # ========================================================================
    # INVOICE TITLE & DETAILS
    # ========================================================================
    
    y_pos = height - 150
    c.setFillColorRGB(0.2, 0.3, 0.5)  # Dark blue
    c.setFont("Helvetica-Bold", 32)
    c.drawString(50, y_pos, "INVOICE")
    
    # Invoice details (right side)
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica", 10)
    y_detail = y_pos + 5
    
    c.drawRightString(width - 200, y_detail, "Invoice Number:")
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(width - 50, y_detail, invoice.invoice_number)
    
    y_detail -= 15
    c.setFont("Helvetica", 10)
    c.drawRightString(width - 200, y_detail, "Invoice Date:")
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(width - 50, y_detail, format_date_us(invoice.invoice_date))
    
    y_detail -= 15
    c.setFont("Helvetica", 10)
    c.drawRightString(width - 200, y_detail, "Due Date:")
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(width - 50, y_detail, format_date_us(invoice.due_date))
    
    # Terms are not printed; Due Date shown above
    
    # ========================================================================
    # BILL TO SECTION
    # ========================================================================
    
    y_pos -= 60
    c.setFont("Helvetica-Bold", 11)
    c.setFillColorRGB(0.2, 0.3, 0.5)
    c.drawString(50, y_pos, "BILL TO:")
    
    y_pos -= 18
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y_pos, customer.customer_name)
    
    # Customer address
    y_pos -= 15
    c.setFont("Helvetica", 10)
    if customer.billing_address_line1:
        c.drawString(50, y_pos, customer.billing_address_line1)
        y_pos -= 12
    if customer.billing_address_line2:
        c.drawString(50, y_pos, customer.billing_address_line2)
        y_pos -= 12
    if customer.billing_city and customer.billing_state:
        address_line = f"{customer.billing_city}, {customer.billing_state} {customer.billing_zip or ''}"
        c.drawString(50, y_pos, address_line.strip())
        y_pos -= 12
    
    # Customer email
    if customer.email:
        c.drawString(50, y_pos, customer.email)
        y_pos -= 12
    
    # ========================================================================
    # LINE ITEMS TABLE
    # ========================================================================
    
    y_pos -= 30
    
    # Prepare table data (support amount-only)
    hide_qty_rate = all(((float(line.quantity or 0) == 0.0) or (float(line.unit_price or 0) == 0.0)) for line in lines)
    if hide_qty_rate:
        table_data = [["Description", "Amount"]]
        for line in lines:
            table_data.append([
                line.description,
                f"${float(line.total_amount):,.2f}"
            ])
        col_widths = [5.75*inch, 1.25*inch]
    else:
        table_data = [["Description", "Qty", "Rate", "Amount"]]
        for line in lines:
            table_data.append([
                line.description,
                f"{float(line.quantity or 0):.2f}",
                f"${float(line.unit_price or 0):,.2f}",
                f"${float(line.total_amount):,.2f}"
            ])
        col_widths = [3.5*inch, 1*inch, 1.25*inch, 1.25*inch]
    
    # Create table
    table = Table(table_data, colWidths=col_widths)
    
    # Style the table
    table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E4A6B')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        
        # Data rows
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        
        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#2E4A6B')),
    ]))
    
    # Draw table
    table.wrapOn(c, width, height)
    table_height = table._height
    table.drawOn(c, 50, y_pos - table_height)
    
    # ========================================================================
    # TOTALS SECTION
    # ========================================================================
    
    y_pos = y_pos - table_height - 30
    
    c.setFont("Helvetica", 11)
    c.drawRightString(width - 150, y_pos, "Subtotal:")
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(width - 50, y_pos, f"${float(invoice.subtotal):,.2f}")
    
    # Tax (if applicable) - only show if tax amount > 0
    if invoice.tax_amount and invoice.tax_amount > 0:
        y_pos -= 20
        c.setFont("Helvetica", 11)
        tax_label = f"Tax ({float(invoice.tax_rate):.2f}%):" if invoice.tax_rate else "Tax:"
        c.drawRightString(width - 150, y_pos, tax_label)
        c.setFont("Helvetica-Bold", 11)
        c.drawRightString(width - 50, y_pos, f"${float(invoice.tax_amount):,.2f}")
    
    # Total
    y_pos -= 25
    c.setFillColorRGB(0.2, 0.3, 0.5)  # Dark blue
    c.setFont("Helvetica-Bold", 14)
    c.drawRightString(width - 150, y_pos, "Total Amount Due:")
    c.setFont("Helvetica-Bold", 16)
    c.drawRightString(width - 50, y_pos, f"${float(invoice.total_amount):,.2f}")
    
    # ========================================================================
    # PAYMENT INSTRUCTIONS / REMIT TO
    # ========================================================================
    
    y_pos -= 50
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y_pos, "Remit To (ACH/Wire):")
    
    y_pos -= 20
    c.setFont("Helvetica", 10)
    
    # Pull primary bank account for entity (Mercury sync stores details)
    try:
        from sqlalchemy import select as sa_select
        from ..models_accounting_part2 import BankAccount
        ba_res = await db.execute(
            sa_select(BankAccount).where(
                BankAccount.entity_id == entity.id,
                BankAccount.is_active == True,
                BankAccount.is_primary == True
            )
        )
        ba = ba_res.scalar_one_or_none()
    except Exception:
        ba = None
    
    payment_instructions = []
    if ba is not None:
        payment_instructions.append(f"Bank Name: {ba.bank_name}")
        payment_instructions.append(f"Account Name: {ba.account_name}")
        if ba.routing_number:
            payment_instructions.append(f"Routing Number: {ba.routing_number}")
        acct_disp = ba.account_number or ba.account_number_masked or ""
        if acct_disp:
            payment_instructions.append(f"Account Number: {acct_disp}")
    else:
        # Fallback minimal message
        payment_instructions.append("Contact NGI Capital for remittance instructions.")
    payment_instructions.append("")
    payment_instructions.append("Please include Invoice # in payment memo.")

    for instruction in payment_instructions:
        c.drawString(50, y_pos, instruction)
        y_pos -= 14
    
    # ========================================================================
    # MEMO (if provided)
    # ========================================================================
    
    if invoice.memo:
        y_pos -= 20
        c.setFont("Helvetica-Bold", 10)
        c.drawString(50, y_pos, "Notes:")
        y_pos -= 15
        c.setFont("Helvetica", 9)
        
        # Wrap memo text if too long
        memo_lines = invoice.memo.split('\n')
        for memo_line in memo_lines[:3]:  # Max 3 lines
            if len(memo_line) > 80:
                memo_line = memo_line[:77] + "..."
            c.drawString(50, y_pos, memo_line)
            y_pos -= 12
    
    # ========================================================================
    # ENTITY PAYMENT TERMS (if configured)
    # ========================================================================
    
    # Check if entity has custom payment terms configured
    if entity.late_payment_fee or entity.late_payment_interest_rate or entity.invoice_payment_instructions:
        y_pos -= 30
        c.setFont("Helvetica-Bold", 10)
        c.setFillColorRGB(0.2, 0.3, 0.5)  # Dark blue
        c.drawString(50, y_pos, "Payment Terms:")
        y_pos -= 15
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica", 9)
        
        # Payment terms
        if entity.default_payment_terms:
            c.drawString(50, y_pos, f"Payment is due within {entity.default_payment_terms}.")
            y_pos -= 12
        
        # Late payment policy
        if entity.late_payment_fee or entity.late_payment_interest_rate:
            c.drawString(50, y_pos, "Late Payment Policy:")
            y_pos -= 12
            if entity.late_payment_fee:
                c.drawString(50, y_pos, f"Late fee: ${float(entity.late_payment_fee):,.2f}")
                y_pos -= 12
            if entity.late_payment_interest_rate:
                c.drawString(50, y_pos, f"Interest rate: {float(entity.late_payment_interest_rate):.2f}% per month on overdue balances")
                y_pos -= 12
        
        # Custom payment instructions
        if entity.invoice_payment_instructions:
            c.drawString(50, y_pos, "Additional Instructions:")
            y_pos -= 12
            instructions_lines = entity.invoice_payment_instructions.split('\n')
            for inst_line in instructions_lines[:2]:  # Max 2 lines
                if len(inst_line) > 80:
                    inst_line = inst_line[:77] + "..."
                c.drawString(50, y_pos, inst_line)
                y_pos -= 12
    
    # ========================================================================
    # FOOTER
    # ========================================================================
    
    c.setFont("Helvetica", 8)
    c.setFillColorRGB(0.5, 0.5, 0.5)
    c.drawCentredString(width / 2, 50, "Thank you for your business!")
    c.drawCentredString(width / 2, 35, f"Generated on {format_date_us(date.today())} | {entity.entity_name}")
    
    # Save PDF
    c.save()
    
    # Update invoice record with PDF path
    invoice.pdf_file_path = str(pdf_path)
    invoice.pdf_generated_at = convert_to_pst(datetime.utcnow())
    await db.commit()
    
    return str(pdf_path)


def format_currency(amount: Decimal) -> str:
    """Format currency with proper thousands separator"""
    return f"${float(amount):,.2f}"

