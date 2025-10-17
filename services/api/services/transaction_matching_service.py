"""
Transaction Matching Service
US GAAP-compliant bank transaction matching to invoices/receipts
Supports single, monthly aggregation, and split matching scenarios

Author: NGI Capital Development Team
Date: December 2025
"""

import logging
from typing import Dict, List, Optional, Tuple
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
import json

from services.api.models_accounting import (
    JournalEntry, JournalEntryLine, ChartOfAccounts
)
from services.api.models_ar import Invoice, InvoicePayment
from services.api.models_accounting_part2 import (
    BankAccount, BankTransaction, AccountingDocument
)
from services.api.utils.datetime_utils import get_pst_now

logger = logging.getLogger(__name__)


class TransactionMatchingService:
    """
    Intelligent matching service for bank transactions
    Implements US GAAP standards for supporting documentation
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def suggest_matches_for_document(
        self,
        document: AccountingDocument,
        entity_id: int
    ) -> Dict:
        """
        When user uploads document (invoice/receipt), suggest matching bank transactions

        Scenarios:
        1. Single transaction match (most common)
        2. Monthly aggregation (API bills, subscriptions)
        3. Partial payments (large invoices paid in installments)
        4. Split transaction (one payment for multiple invoices)

        Returns suggestions with confidence scores
        """
        try:
            extracted_data = document.extracted_data or {}

            # Extract key fields from document
            invoice_amount = self._parse_amount(extracted_data.get("total_amount"))
            invoice_date = self._parse_date(extracted_data.get("invoice_date") or document.effective_date)
            vendor_name = extracted_data.get("vendor_name", "").lower()

            if not invoice_amount:
                logger.warning(f"Document {document.id} missing total_amount")
                return {"success": False, "message": "Cannot extract invoice amount"}

            # Define search window (30 days before/after invoice date)
            date_start = invoice_date - timedelta(days=30) if invoice_date else None
            date_end = invoice_date + timedelta(days=30) if invoice_date else None

            # Get unmatched bank transactions in window
            query = select(BankTransaction).where(
                and_(
                    BankTransaction.entity_id == entity_id,
                    BankTransaction.status == "unmatched",
                    BankTransaction.needs_review == True
                )
            )

            if date_start and date_end:
                query = query.where(
                    BankTransaction.transaction_date.between(date_start, date_end)
                )

            result = await self.db.execute(query)
            unmatched_transactions = result.scalars().all()

            # Try matching scenarios
            suggestions = []

            # Scenario 1: Single exact match
            single_match = self._find_single_match(
                unmatched_transactions, invoice_amount, vendor_name
            )
            if single_match:
                suggestions.append({
                    "scenario": "single",
                    "confidence": single_match["confidence"],
                    "transaction_ids": [single_match["transaction"].id],
                    "total_amount": float(single_match["transaction"].amount),
                    "description": f"Exact match: {single_match['transaction'].description}",
                    "match_type": "single"
                })

            # Scenario 2: Monthly aggregation (multiple small transactions = one invoice)
            monthly_match = self._find_monthly_aggregation(
                unmatched_transactions, invoice_amount, vendor_name
            )
            if monthly_match:
                suggestions.append({
                    "scenario": "monthly_aggregate",
                    "confidence": monthly_match["confidence"],
                    "transaction_ids": [t.id for t in monthly_match["transactions"]],
                    "total_amount": float(monthly_match["total"]),
                    "description": f"Monthly aggregation: {len(monthly_match['transactions'])} transactions totaling ${monthly_match['total']}",
                    "match_type": "monthly_aggregate",
                    "transactions_detail": [
                        {
                            "id": t.id,
                            "date": t.transaction_date.isoformat(),
                            "amount": float(t.amount),
                            "description": t.description
                        }
                        for t in monthly_match["transactions"]
                    ]
                })

            # Scenario 3: Partial payment
            partial_match = self._find_partial_payments(
                unmatched_transactions, invoice_amount, vendor_name
            )
            if partial_match:
                suggestions.append({
                    "scenario": "partial_payment",
                    "confidence": partial_match["confidence"],
                    "transaction_ids": [t.id for t in partial_match["transactions"]],
                    "total_amount": float(partial_match["total"]),
                    "description": f"Partial payments: {len(partial_match['transactions'])} payments totaling ${partial_match['total']}",
                    "match_type": "partial_payment"
                })

            # Sort by confidence
            suggestions.sort(key=lambda x: x["confidence"], reverse=True)

            return {
                "success": True,
                "document_id": document.id,
                "invoice_amount": float(invoice_amount),
                "vendor_name": vendor_name,
                "suggestions": suggestions,
                "total_suggestions": len(suggestions)
            }

        except Exception as e:
            logger.error(f"Error suggesting matches for document {document.id}: {str(e)}")
            return {"success": False, "message": str(e)}

    async def suggest_matches_for_transaction(
        self,
        transaction: BankTransaction
    ) -> Dict:
        """
        When user reviews unmatched transaction, suggest matching documents/vendors
        """
        try:
            entity_id = transaction.entity_id
            amount = abs(transaction.amount)
            date = transaction.transaction_date
            description = transaction.description.lower()

            # Search for matching documents (invoices/receipts)
            date_start = date - timedelta(days=30)
            date_end = date + timedelta(days=30)

            query = select(AccountingDocument).where(
                and_(
                    AccountingDocument.entity_id == entity_id,
                    AccountingDocument.category.in_(["invoices", "receipts", "bills"]),
                    AccountingDocument.processing_status == "extracted",
                    or_(
                        AccountingDocument.effective_date.between(date_start, date_end),
                        AccountingDocument.upload_date.between(
                            datetime.combine(date_start, datetime.min.time()),
                            datetime.combine(date_end, datetime.max.time())
                        )
                    )
                )
            )

            result = await self.db.execute(query)
            documents = result.scalars().all()

            suggestions = []

            for doc in documents:
                extracted_data = doc.extracted_data or {}
                doc_amount = self._parse_amount(extracted_data.get("total_amount"))
                vendor_name = extracted_data.get("vendor_name", "").lower()

                if not doc_amount:
                    continue

                # Check amount match
                amount_diff = abs(doc_amount - amount)
                if amount_diff <= Decimal("0.01"):
                    # Exact match
                    confidence = 0.95

                    # Boost confidence if vendor name matches
                    if vendor_name and vendor_name in description:
                        confidence = 0.99

                    suggestions.append({
                        "document_id": doc.id,
                        "filename": doc.filename,
                        "vendor_name": vendor_name,
                        "amount": float(doc_amount),
                        "date": doc.effective_date.isoformat() if doc.effective_date else None,
                        "confidence": confidence,
                        "match_reason": "Exact amount match"
                    })

            # Sort by confidence
            suggestions.sort(key=lambda x: x["confidence"], reverse=True)

            return {
                "success": True,
                "transaction_id": transaction.id,
                "suggestions": suggestions,
                "total_suggestions": len(suggestions)
            }

        except Exception as e:
            logger.error(f"Error suggesting matches for transaction {transaction.id}: {str(e)}")
            return {"success": False, "message": str(e)}

    async def create_je_from_match(
        self,
        transaction_ids: List[int],
        document_id: int,
        account_id: int,
        memo: Optional[str] = None
    ) -> JournalEntry:
        """
        User-initiated JE creation from confirmed match
        This is the ONLY place JEs should be created for bank transactions

        Args:
            transaction_ids: List of bank transaction IDs to match
            document_id: Supporting document (invoice/receipt)
            account_id: GL account to debit/credit (expense/revenue account)
            memo: Optional memo override
        """
        try:
            # Get all transactions
            transactions_result = await self.db.execute(
                select(BankTransaction).where(
                    BankTransaction.id.in_(transaction_ids)
                )
            )
            transactions = transactions_result.scalars().all()

            if not transactions:
                raise ValueError("No transactions found")

            # Get document
            document = await self.db.get(AccountingDocument, document_id)
            if not document:
                raise ValueError("Document not found")

            # Get account (used for non-AR cases)
            account = await self.db.get(ChartOfAccounts, account_id)
            if not account:
                raise ValueError("Account not found")

            # Calculate totals
            total_amount = sum(abs(t.amount) for t in transactions)
            entity_id = transactions[0].entity_id

            # Determine transaction date (latest transaction date)
            entry_date = max(t.transaction_date for t in transactions)

            # Generate entry number
            entry_number = await self._generate_je_number(entity_id, entry_date.year)

            # Build memo
            if not memo:
                extracted_data = document.extracted_data or {}
                vendor_name = extracted_data.get("vendor_name", "Unknown vendor")
                invoice_number = extracted_data.get("invoice_number", "")

                if len(transactions) == 1:
                    memo = f"{vendor_name} - Invoice {invoice_number}" if invoice_number else f"{vendor_name}"
                else:
                    memo = f"{vendor_name} - Monthly aggregation ({len(transactions)} transactions)"

            # Create Journal Entry
            je = JournalEntry(
                entity_id=entity_id,
                entry_number=entry_number,
                entry_date=entry_date,
                fiscal_year=entry_date.year,
                fiscal_period=entry_date.month,
                entry_type="Standard",
                memo=memo,
                source_type="BankMatch",
                source_id=str(document_id),
                status="draft",  # Requires approval
                workflow_stage=0,
                reconciliation_status="matched",
                needs_review=False,  # Already reviewed during match
                created_by_id=2,  # System user (TODO: get from auth)
                created_by_email="bank-match@system",
                created_at=get_pst_now()
            )
            self.db.add(je)
            await self.db.flush()

            # Get cash account (from first transaction's bank account)
            bank_account = await self.db.get(BankAccount, transactions[0].bank_account_id)
            cash_account_id = bank_account.gl_account_id

            # Determine debit/credit based on transaction type
            is_deposit = transactions[0].amount > 0

            if is_deposit:
                # Determine if this is an AR payment (invoice receipt)
                # Heuristic: document category 'invoices' or extracted_data has invoice_id
                doc_is_ar = False
                inv_obj = None
                try:
                    if (document.category or '').lower() == 'invoices':
                        doc_is_ar = True
                    inv_id = None
                    if document.extracted_data and isinstance(document.extracted_data, dict):
                        inv_id = document.extracted_data.get('invoice_id')
                    if inv_id:
                        inv_obj = await self.db.get(Invoice, int(inv_id))
                        if inv_obj and inv_obj.entity_id == entity_id:
                            doc_is_ar = True
                except Exception:
                    pass

                # Always DR Cash
                self.db.add(JournalEntryLine(
                    journal_entry_id=je.id,
                    line_number=1,
                    account_id=cash_account_id,
                    debit_amount=total_amount,
                    credit_amount=Decimal("0"),
                    description=f"Bank deposit - {memo}"
                ))

                if doc_is_ar:
                    # AR receipt: CR Accounts Receivable (10310)
                    ar_acc = await self.db.execute(
                        select(ChartOfAccounts).where(
                            ChartOfAccounts.entity_id == entity_id,
                            ChartOfAccounts.account_number == "10310"
                        )
                    )
                    ar_row = ar_acc.scalar_one_or_none()
                    if not ar_row:
                        raise ValueError("AR account 10310 not found for entity")
                    self.db.add(JournalEntryLine(
                        journal_entry_id=je.id,
                        line_number=2,
                        account_id=ar_row.id,
                        debit_amount=Decimal("0"),
                        credit_amount=total_amount,
                        description=(f"AR Payment - {inv_obj.invoice_number}" if inv_obj else memo)
                    ))

                    # Create/update InvoicePayment and invoice status
                    try:
                        if inv_obj:
                            # Amount: if multiple txns, sum to one payment record; link first txn id
                            bank_txn_ref = ",".join([str(t.id) for t in transactions]) if len(transactions) > 1 else str(transactions[0].id)
                            payment = InvoicePayment(
                                invoice_id=inv_obj.id,
                                payment_date=entry_date,
                                payment_amount=Decimal(str(total_amount)),
                                payment_method="Bank",
                                reference_number=None,
                                notes=f"Linked via Bank Match - JE {entry_number}",
                                bank_transaction_id=bank_txn_ref,
                                journal_entry_id=je.id,
                                recorded_by_email="bank-match@system",
                                created_at=get_pst_now()
                            )
                            self.db.add(payment)
                            await self.db.flush()
                            # Update invoice balances
                            inv_obj.amount_paid = (inv_obj.amount_paid or Decimal("0")) + Decimal(str(total_amount))
                            inv_obj.amount_due = (inv_obj.total_amount or Decimal("0")) - (inv_obj.amount_paid or Decimal("0"))
                            if inv_obj.amount_due <= Decimal("0.01"):
                                inv_obj.status = "paid"
                                inv_obj.paid_date = entry_date
                            else:
                                inv_obj.status = "partially_paid"
                    except Exception as e:
                        logger.warning(f"Failed to link AR payment to invoice: {e}")
                else:
                    # General case: CR provided revenue/other income account
                    self.db.add(JournalEntryLine(
                        journal_entry_id=je.id,
                        line_number=2,
                        account_id=account_id,
                        debit_amount=Decimal("0"),
                        credit_amount=total_amount,
                        description=memo
                    ))
            else:
                # Money OUT: DR Expense, CR Cash
                line1 = JournalEntryLine(
                    journal_entry_id=je.id,
                    line_number=1,
                    account_id=account_id,
                    debit_amount=total_amount,
                    credit_amount=Decimal("0"),
                    description=memo
                )
                self.db.add(line1)

                line2 = JournalEntryLine(
                    journal_entry_id=je.id,
                    line_number=2,
                    account_id=cash_account_id,
                    debit_amount=Decimal("0"),
                    credit_amount=total_amount,
                    description=f"Bank payment - {memo}"
                )
                self.db.add(line2)

            # Link all transactions to this JE
            for txn in transactions:
                txn.matched_journal_entry_id = je.id
                txn.status = "matched"
                txn.is_matched = True
                txn.matched_at = get_pst_now()
                txn.needs_review = False

                # Store grouped transaction IDs if multiple
                if len(transactions) > 1:
                    grouped_ids = [t.id for t in transactions if t.id != txn.id]
                    txn.grouped_transaction_ids = json.dumps(grouped_ids)

            await self.db.commit()
            await self.db.refresh(je)

            logger.info(
                f"Created JE {entry_number} (ID: {je.id}) from match: "
                f"{len(transactions)} transactions, document {document_id}, "
                f"amount ${total_amount}"
            )

            return je

        except Exception as e:
            logger.error(f"Error creating JE from match: {str(e)}")
            await self.db.rollback()
            raise

    # ========================================================================
    # PRIVATE HELPER METHODS
    # ========================================================================

    def _find_single_match(
        self,
        transactions: List[BankTransaction],
        target_amount: Decimal,
        vendor_name: str
    ) -> Optional[Dict]:
        """Find single transaction that matches amount"""
        for txn in transactions:
            amount_diff = abs(abs(txn.amount) - target_amount)

            if amount_diff <= Decimal("0.01"):
                # Exact amount match
                confidence = 0.90

                # Boost if vendor name matches
                if vendor_name and vendor_name in txn.description.lower():
                    confidence = 0.98

                return {
                    "transaction": txn,
                    "confidence": confidence
                }

        return None

    def _find_monthly_aggregation(
        self,
        transactions: List[BankTransaction],
        target_amount: Decimal,
        vendor_name: str
    ) -> Optional[Dict]:
        """
        Find multiple transactions that sum to target amount
        Common for API bills, subscriptions (e.g., Claude API charges)
        """
        # Filter transactions by vendor name if available
        if vendor_name:
            relevant_txns = [
                t for t in transactions
                if vendor_name in t.description.lower()
                or (t.merchant_name and vendor_name in t.merchant_name.lower())
            ]
        else:
            relevant_txns = transactions

        # Try to find combination that sums to target
        for i in range(2, min(len(relevant_txns) + 1, 10)):  # Max 10 transactions
            from itertools import combinations

            for combo in combinations(relevant_txns, i):
                combo_total = sum(abs(t.amount) for t in combo)
                diff = abs(combo_total - target_amount)

                if diff <= Decimal("0.01"):
                    # Found match!
                    confidence = 0.85 if vendor_name else 0.70

                    return {
                        "transactions": list(combo),
                        "total": combo_total,
                        "confidence": confidence
                    }

        return None

    def _find_partial_payments(
        self,
        transactions: List[BankTransaction],
        target_amount: Decimal,
        vendor_name: str
    ) -> Optional[Dict]:
        """Find partial payments for a larger invoice"""
        # Similar to monthly aggregation but lower confidence
        result = self._find_monthly_aggregation(transactions, target_amount, vendor_name)

        if result:
            result["confidence"] = max(0.60, result["confidence"] - 0.15)

        return result

    def _parse_amount(self, value) -> Optional[Decimal]:
        """Parse amount from various formats"""
        if value is None:
            return None

        if isinstance(value, (int, float, Decimal)):
            return Decimal(str(value))

        if isinstance(value, str):
            # Remove currency symbols and commas
            cleaned = value.replace("$", "").replace(",", "").strip()
            try:
                return Decimal(cleaned)
            except:
                return None

        return None

    def _parse_date(self, value) -> Optional[date]:
        """Parse date from various formats"""
        if value is None:
            return None

        if isinstance(value, date):
            return value

        if isinstance(value, datetime):
            return value.date()

        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
            except:
                try:
                    return datetime.strptime(value, "%Y-%m-%d").date()
                except:
                    return None

        return None

    async def _generate_je_number(self, entity_id: int, fiscal_year: int) -> str:
        """Generate US GAAP compliant journal entry number: JE-YYYY-NNNNNN"""
        result = await self.db.execute(
            select(func.count(JournalEntry.id)).where(
                and_(
                    JournalEntry.entity_id == entity_id,
                    JournalEntry.fiscal_year == fiscal_year
                )
            )
        )
        count = result.scalar()
        return f"JE-{fiscal_year}-{(count + 1):06d}"
