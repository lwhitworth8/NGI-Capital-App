import os
import pytest


@pytest.mark.asyncio
async def test_legacy_auth_endpoints_disabled_by_default(client):
    # All legacy password/session endpoints should be gone (410) in Clerk-only mode
    endpoints = [
        "/api/auth/login",
        "/api/auth/request-password-reset",
        "/api/auth/reset-password",
        "/api/auth/change-password",
        "/api/auth/session",
    ]
    for ep in endpoints:
        resp = await client.post(ep, json={})
        assert resp.status_code == 410, f"Expected 410 for {ep}, got {resp.status_code}"


@pytest.mark.asyncio
async def test_require_clerk_user_bypass_in_pytest(client, monkeypatch):
    # In pytest, require_clerk_user allows a safe test principal if no auth is provided
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "1")
    resp = await client.get("/api/auth/debug")
    assert resp.status_code == 200
    data = resp.json()
    assert "email" in data


@pytest.mark.asyncio
async def test_accounting_coa_test_endpoint(client):
    # Basic route registration smoke test
    resp = await client.get("/api/accounting/coa/test")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("message", "").lower().startswith("chart of accounts route")


# ============================================================================
# A/R SYSTEM TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_create_customer(client, test_db, test_entity):
    """Test customer creation"""
    customer_data = {
        "customer_name": "Test Customer LLC",
        "customer_type": "LLC",
        "email": "test@customer.com",
        "phone": "(555) 123-4567",
        "billing_address_line1": "123 Test St",
        "billing_city": "Test City",
        "billing_state": "CA",
        "billing_zip": "90210"
    }

    resp = await client.post(f"/api/accounting/ar/customers?entity_id={test_entity.id}", json=customer_data)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "customer" in data
    assert data["customer"]["customer_name"] == "Test Customer LLC"


@pytest.mark.asyncio
async def test_create_invoice_draft(client, test_db, test_entity, test_chart_of_accounts):
    """Test creating a draft invoice"""
    # First create a customer
    customer_data = {
        "customer_name": "Invoice Test Customer",
        "email": "invoice@test.com"
    }
    customer_resp = await client.post(f"/api/accounting/ar/customers?entity_id={test_entity.id}", json=customer_data)
    customer_id = customer_resp.json()["customer"]["id"]
    
    # Create invoice
    invoice_data = {
        "customer_id": customer_id,
        "invoice_date": "2025-10-16",
        "due_date": "2025-11-15",
        "payment_terms": "Net 30",
        "lines": [
            {
                "description": "Test Service",
                "quantity": 1,
                "unit_price": 1000.00
            }
        ],
        "tax_rate": 9.5,
        "memo": "Test invoice"
    }
    
    resp = await client.post(f"/api/accounting/ar/invoices?entity_id={test_entity.id}", json=invoice_data)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "invoice" in data
    assert data["invoice"]["total_amount"] == 1095.0  # 1000 + 95 tax


@pytest.mark.asyncio
async def test_edit_draft_invoice(client, test_db, test_entity, test_chart_of_accounts):
    """Test editing a draft invoice"""
    # Create customer and invoice first
    customer_data = {"customer_name": "Edit Test Customer", "email": "edit@test.com"}
    customer_resp = await client.post(f"/api/accounting/ar/customers?entity_id={test_entity.id}", json=customer_data)
    customer_id = customer_resp.json()["customer"]["id"]

    invoice_data = {
        "customer_id": customer_id,
        "invoice_date": "2025-10-16",
        "lines": [{"description": "Original Service", "quantity": 1, "unit_price": 500.00}]
    }
    invoice_resp = await client.post(f"/api/accounting/ar/invoices?entity_id={test_entity.id}", json=invoice_data)
    invoice_id = invoice_resp.json()["invoice"]["id"]
    
    # Edit invoice
    update_data = {
        "lines": [{"description": "Updated Service", "quantity": 2, "unit_price": 750.00}]
    }
    
    resp = await client.put(f"/api/accounting/ar/invoices/{invoice_id}", json=update_data)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "pdf_path" in data


@pytest.mark.asyncio
async def test_cannot_edit_sent_invoice(client, test_db, test_entity, test_chart_of_accounts):
    """Test that sent invoices cannot be edited"""
    # Create and send invoice
    customer_data = {"customer_name": "Sent Test Customer", "email": "sent@test.com"}
    customer_resp = await client.post(f"/api/accounting/ar/customers?entity_id={test_entity.id}", json=customer_data)
    customer_id = customer_resp.json()["customer"]["id"]
    
    invoice_data = {
        "customer_id": customer_id,
        "invoice_date": "2025-10-16",
        "lines": [{"description": "Service", "quantity": 1, "unit_price": 100.00}]
    }
    invoice_resp = await client.post(f"/api/accounting/ar/invoices?entity_id={test_entity.id}", json=invoice_data)
    invoice_id = invoice_resp.json()["invoice"]["id"]
    
    # Mark as sent
    await client.put(f"/api/accounting/ar/invoices/{invoice_id}/status", json={"status": "sent"})
    
    # Try to edit
    update_data = {"lines": [{"description": "Hacked Service", "quantity": 1, "unit_price": 1000.00}]}
    resp = await client.put(f"/api/accounting/ar/invoices/{invoice_id}", json=update_data)
    assert resp.status_code == 400
    assert "Only draft invoices can be edited" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_delete_draft_invoice(client, test_db, test_entity, test_chart_of_accounts):
    """Test deleting a draft invoice"""
    # Create customer and invoice
    customer_data = {"customer_name": "Delete Test Customer", "email": "delete@test.com"}
    customer_resp = await client.post(f"/api/accounting/ar/customers?entity_id={test_entity.id}", json=customer_data)
    customer_id = customer_resp.json()["customer"]["id"]
    
    invoice_data = {
        "customer_id": customer_id,
        "invoice_date": "2025-10-16",
        "lines": [{"description": "Service", "quantity": 1, "unit_price": 100.00}]
    }
    invoice_resp = await client.post(f"/api/accounting/ar/invoices?entity_id={test_entity.id}", json=invoice_data)
    invoice_id = invoice_resp.json()["invoice"]["id"]
    
    # Delete invoice
    resp = await client.delete(f"/api/accounting/ar/invoices/{invoice_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_cannot_delete_sent_invoice(client, test_db):
    """Test that sent invoices cannot be deleted"""
    # Create and send invoice
    customer_data = {"customer_name": "No Delete Customer", "email": "nodelete@test.com"}
    customer_resp = await client.post(f"/api/accounting/ar/customers?entity_id={test_entity.id}", json=customer_data)
    customer_id = customer_resp.json()["customer"]["id"]
    
    invoice_data = {
        "customer_id": customer_id,
        "invoice_date": "2025-10-16",
        "lines": [{"description": "Service", "quantity": 1, "unit_price": 100.00}]
    }
    invoice_resp = await client.post(f"/api/accounting/ar/invoices?entity_id={test_entity.id}", json=invoice_data)
    invoice_id = invoice_resp.json()["invoice"]["id"]
    
    # Mark as sent
    await client.put(f"/api/accounting/ar/invoices/{invoice_id}/status", json={"status": "sent"})
    
    # Try to delete
    resp = await client.delete(f"/api/accounting/ar/invoices/{invoice_id}")
    assert resp.status_code == 400
    assert "Only draft invoices can be deleted" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_invoice_status_draft_to_sent(client, test_db, test_entity, test_chart_of_accounts):
    """Test invoice status transition from draft to sent"""
    # Create invoice
    customer_data = {"customer_name": "Status Test Customer", "email": "status@test.com"}
    customer_resp = await client.post(f"/api/accounting/ar/customers?entity_id={test_entity.id}", json=customer_data)
    customer_id = customer_resp.json()["customer"]["id"]
    
    invoice_data = {
        "customer_id": customer_id,
        "invoice_date": "2025-10-16",
        "lines": [{"description": "Service", "quantity": 1, "unit_price": 100.00}]
    }
    invoice_resp = await client.post(f"/api/accounting/ar/invoices?entity_id={test_entity.id}", json=invoice_data)
    invoice_id = invoice_resp.json()["invoice"]["id"]
    
    # Update status to sent
    resp = await client.put(f"/api/accounting/ar/invoices/{invoice_id}/status", json={"status": "sent"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["status"] == "sent"
    assert "sent_at" in data


@pytest.mark.asyncio
async def test_record_invoice_payment_full(client, test_db, test_entity, test_chart_of_accounts):
    """Test recording full payment for invoice"""
    # Create customer and invoice
    customer_data = {"customer_name": "Payment Test Customer", "email": "payment@test.com"}
    customer_resp = await client.post(f"/api/accounting/ar/customers?entity_id={test_entity.id}", json=customer_data)
    customer_id = customer_resp.json()["customer"]["id"]
    
    invoice_data = {
        "customer_id": customer_id,
        "invoice_date": "2025-10-16",
        "lines": [{"description": "Service", "quantity": 1, "unit_price": 100.00}]
    }
    invoice_resp = await client.post(f"/api/accounting/ar/invoices?entity_id={test_entity.id}", json=invoice_data)
    invoice_id = invoice_resp.json()["invoice"]["id"]
    
    # Record payment
    payment_data = {
        "payment_date": "2025-10-16",
        "payment_amount": 100.00,
        "payment_method": "Bank Transfer",
        "reference_number": "PAY001"
    }
    
    resp = await client.post(f"/api/accounting/ar/invoices/{invoice_id}/payments", json=payment_data)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["invoice_status"] == "paid"
    assert data["amount_due"] == 0.0


@pytest.mark.asyncio
async def test_record_invoice_payment_partial(client, test_db, test_entity, test_chart_of_accounts):
    """Test recording partial payment for invoice"""
    # Create customer and invoice
    customer_data = {"customer_name": "Partial Payment Customer", "email": "partial@test.com"}
    customer_resp = await client.post(f"/api/accounting/ar/customers?entity_id={test_entity.id}", json=customer_data)
    customer_id = customer_resp.json()["customer"]["id"]
    
    invoice_data = {
        "customer_id": customer_id,
        "invoice_date": "2025-10-16",
        "lines": [{"description": "Service", "quantity": 1, "unit_price": 100.00}]
    }
    invoice_resp = await client.post(f"/api/accounting/ar/invoices?entity_id={test_entity.id}", json=invoice_data)
    invoice_id = invoice_resp.json()["invoice"]["id"]
    
    # Record partial payment
    payment_data = {
        "payment_date": "2025-10-16",
        "payment_amount": 50.00,
        "payment_method": "Bank Transfer"
    }
    
    resp = await client.post(f"/api/accounting/ar/invoices/{invoice_id}/payments", json=payment_data)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["invoice_status"] == "partially_paid"
    assert data["amount_due"] == 50.0


@pytest.mark.asyncio
async def test_ar_aging_report(client, test_db):
    """Test AR aging report generation"""
    resp = await client.get("/api/accounting/ar/reports/ar-aging?entity_id=1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "buckets" in data
    assert "totals" in data
    assert "total_open_ar" in data


@pytest.mark.asyncio
async def test_ar_summary_dashboard(client, test_db):
    """Test AR summary dashboard metrics"""
    resp = await client.get("/api/accounting/ar/reports/ar-summary?entity_id=1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "status_totals" in data
    assert "overdue" in data
    assert "aging" in data
    assert "total_open_ar" in data


@pytest.mark.asyncio
async def test_invoice_pdf_generation(client, test_db, test_entity, test_chart_of_accounts):
    """Test invoice PDF generation"""
    # Create customer and invoice
    customer_data = {"customer_name": "PDF Test Customer", "email": "pdf@test.com"}
    customer_resp = await client.post(f"/api/accounting/ar/customers?entity_id={test_entity.id}", json=customer_data)
    customer_id = customer_resp.json()["customer"]["id"]
    
    invoice_data = {
        "customer_id": customer_id,
        "invoice_date": "2025-10-16",
        "lines": [{"description": "PDF Service", "quantity": 1, "unit_price": 100.00}]
    }
    invoice_resp = await client.post(f"/api/accounting/ar/invoices?entity_id={test_entity.id}", json=invoice_data)
    invoice_id = invoice_resp.json()["invoice"]["id"]
    
    # Download PDF
    resp = await client.get(f"/api/accounting/ar/invoices/{invoice_id}/pdf")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"


@pytest.mark.asyncio
async def test_invoice_workflow_complete(client, test_db, test_entity, test_chart_of_accounts):
    """Test complete invoice workflow: create -> send -> pay"""
    # Create customer
    customer_data = {"customer_name": "Workflow Test Customer", "email": "workflow@test.com"}
    customer_resp = await client.post(f"/api/accounting/ar/customers?entity_id={test_entity.id}", json=customer_data)
    customer_id = customer_resp.json()["customer"]["id"]
    
    # Create invoice
    invoice_data = {
        "customer_id": customer_id,
        "invoice_date": "2025-10-16",
        "lines": [{"description": "Workflow Service", "quantity": 1, "unit_price": 200.00}]
    }
    invoice_resp = await client.post(f"/api/accounting/ar/invoices?entity_id={test_entity.id}", json=invoice_data)
    invoice_id = invoice_resp.json()["invoice"]["id"]
    
    # Verify draft status
    get_resp = await client.get(f"/api/accounting/ar/invoices/{invoice_id}")
    assert get_resp.json()["invoice"]["status"] == "draft"
    
    # Send invoice
    status_resp = await client.put(f"/api/accounting/ar/invoices/{invoice_id}/status", json={"status": "sent"})
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "sent"
    
    # Record payment
    payment_data = {
        "payment_date": "2025-10-16",
        "payment_amount": 200.00,
        "payment_method": "Bank Transfer"
    }
    payment_resp = await client.post(f"/api/accounting/ar/invoices/{invoice_id}/payments", json=payment_data)
    assert payment_resp.status_code == 200
    assert payment_resp.json()["invoice_status"] == "paid"
    
    # Verify final status
    final_resp = await client.get(f"/api/accounting/ar/invoices/{invoice_id}")
    assert final_resp.json()["invoice"]["status"] ==