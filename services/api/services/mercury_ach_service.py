"""
Mercury ACH Service
Direct deposit and reimbursement via Mercury API
NACHA compliance for ACH transactions
"""

from decimal import Decimal
from typing import Dict, List, Optional
from datetime import date, datetime
import os
import logging
import httpx

from services.api.utils.datetime_utils import get_pst_now

logger = logging.getLogger(__name__)


class MercuryACHService:
    """
    Service for Mercury ACH transactions
    Direct deposit for payroll and expense reimbursements
    """
    
    def __init__(self):
        self.api_key = os.getenv("MERCURY_API_KEY")
        self.base_url = "https://api.mercury.com/api/v1"
        self.account_id = os.getenv("MERCURY_ACCOUNT_ID")
        
    async def create_direct_deposit(
        self,
        recipient_name: str,
        recipient_email: str,
        routing_number: str,
        account_number: str,
        amount: Decimal,
        description: str,
        idempotency_key: str
    ) -> Dict:
        """
        Create direct deposit ACH transaction
        
        Args:
            recipient_name: Employee/Partner name
            recipient_email: Email for notifications
            routing_number: Bank routing number (9 digits)
            account_number: Bank account number
            amount: Amount to deposit (in dollars)
            description: Transaction description (appears on statement)
            idempotency_key: Unique key to prevent duplicates
        
        Returns:
            Dict with transaction status and ID
        """
        try:
            # Validate inputs
            if not self._validate_routing_number(routing_number):
                return {
                    "success": False,
                    "message": "Invalid routing number format"
                }
            
            if amount <= 0:
                return {
                    "success": False,
                    "message": "Amount must be greater than zero"
                }
            
            # Mercury API payload
            payload = {
                "accountId": self.account_id,
                "recipientName": recipient_name,
                "recipientEmail": recipient_email,
                "routingNumber": routing_number,
                "accountNumber": account_number,
                "amount": float(amount),
                "currency": "USD",
                "description": description,
                "type": "directDeposit",
                "idempotencyKey": idempotency_key
            }
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/ach/transactions",
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
            
            if response.status_code == 200 or response.status_code == 201:
                data = response.json()
                return {
                    "success": True,
                    "transaction_id": data.get("id"),
                    "status": data.get("status"),
                    "message": "Direct deposit initiated successfully",
                    "expected_delivery": data.get("expectedDeliveryDate")
                }
            else:
                logger.error(f"Mercury ACH error: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "message": f"Mercury API error: {response.text}"
                }
                
        except Exception as e:
            logger.error(f"Error creating direct deposit: {str(e)}")
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }
    
    async def create_payroll_batch(
        self,
        payroll_run_id: int,
        pay_date: date,
        paystubs: List[Dict]
    ) -> Dict:
        """
        Create batch ACH for payroll
        Multiple direct deposits in single batch
        
        Args:
            payroll_run_id: ID of payroll run
            pay_date: Date payments should be delivered
            paystubs: List of paystub dicts with payment info
        
        Returns:
            Dict with batch status and transaction IDs
        """
        try:
            transactions = []
            
            for stub in paystubs:
                transaction = {
                    "recipientName": stub["employee_name"],
                    "recipientEmail": stub["employee_email"],
                    "routingNumber": stub["routing_number"],
                    "accountNumber": stub["account_number"],
                    "amount": float(stub["net_pay"]),
                    "description": f"Payroll - {pay_date.strftime('%m/%d/%Y')}",
                    "idempotencyKey": f"payroll-{payroll_run_id}-{stub['employee_email']}"
                }
                transactions.append(transaction)
            
            # Mercury batch payload
            payload = {
                "accountId": self.account_id,
                "transactions": transactions,
                "effectiveDate": pay_date.isoformat(),
                "batchName": f"Payroll Run {payroll_run_id}",
                "type": "directDeposit"
            }
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/ach/batches",
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
            
            if response.status_code == 200 or response.status_code == 201:
                data = response.json()
                return {
                    "success": True,
                    "batch_id": data.get("id"),
                    "status": data.get("status"),
                    "transaction_count": len(transactions),
                    "total_amount": sum(t["amount"] for t in transactions),
                    "message": "Payroll batch created successfully"
                }
            else:
                logger.error(f"Mercury batch error: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "message": f"Mercury API error: {response.text}"
                }
                
        except Exception as e:
            logger.error(f"Error creating payroll batch: {str(e)}")
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }
    
    async def get_transaction_status(self, transaction_id: str) -> Dict:
        """
        Check status of ACH transaction
        
        Status values:
        - pending: Transaction submitted, not yet processed
        - processing: In ACH network
        - completed: Successfully delivered
        - returned: Rejected by recipient bank
        - failed: Transaction failed
        """
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/ach/transactions/{transaction_id}",
                    headers=headers,
                    timeout=30.0
                )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "status": data.get("status"),
                    "amount": data.get("amount"),
                    "created_at": data.get("createdAt"),
                    "completed_at": data.get("completedAt"),
                    "return_reason": data.get("returnReason")
                }
            else:
                return {
                    "success": False,
                    "message": f"Error fetching transaction status: {response.text}"
                }
                
        except Exception as e:
            logger.error(f"Error getting transaction status: {str(e)}")
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }
    
    async def cancel_transaction(self, transaction_id: str) -> Dict:
        """
        Cancel pending ACH transaction
        Only works if transaction hasn't been submitted to ACH network
        """
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/ach/transactions/{transaction_id}/cancel",
                    headers=headers,
                    timeout=30.0
                )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "message": "Transaction cancelled successfully"
                }
            else:
                return {
                    "success": False,
                    "message": f"Error cancelling transaction: {response.text}"
                }
                
        except Exception as e:
            logger.error(f"Error cancelling transaction: {str(e)}")
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }
    
    @staticmethod
    def _validate_routing_number(routing_number: str) -> bool:
        """
        Validate routing number using ABA checksum algorithm
        Routing number must be 9 digits
        """
        if not routing_number or len(routing_number) != 9:
            return False
        
        if not routing_number.isdigit():
            return False
        
        # ABA checksum algorithm
        try:
            digits = [int(d) for d in routing_number]
            checksum = (
                3 * (digits[0] + digits[3] + digits[6]) +
                7 * (digits[1] + digits[4] + digits[7]) +
                1 * (digits[2] + digits[5] + digits[8])
            )
            return checksum % 10 == 0
        except:
            return False
    
    @staticmethod
    def generate_idempotency_key(
        entity: str,
        entity_id: int,
        recipient_email: str
    ) -> str:
        """
        Generate unique idempotency key for transaction
        Prevents duplicate transactions
        """
        timestamp = get_pst_now().strftime("%Y%m%d%H%M%S")
        return f"{entity}-{entity_id}-{recipient_email}-{timestamp}"
    
    async def verify_bank_account(
        self,
        routing_number: str,
        account_number: str
    ) -> Dict:
        """
        Verify bank account before initiating transfer
        Uses micro-deposits or instant verification (if available)
        """
        try:
            payload = {
                "routingNumber": routing_number,
                "accountNumber": account_number
            }
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/ach/verify",
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "verified": data.get("verified", False),
                    "bank_name": data.get("bankName"),
                    "account_type": data.get("accountType")
                }
            else:
                return {
                    "success": False,
                    "message": f"Verification failed: {response.text}"
                }
                
        except Exception as e:
            logger.error(f"Error verifying bank account: {str(e)}")
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }

