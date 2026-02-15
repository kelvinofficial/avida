"""
Admin Sandbox / Preview Mode System Tests

Tests for the sandbox system that allows admins to safely test
platform features without affecting live users or real money.

Key Features Tested:
- Sandbox configuration (enable/disable, admin access)
- Session management (start, end, switch roles)
- Seed data generation
- Mock payment processing
- Simulation tools (time fast-forward, delivery failure)
- Audit logging
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://classifieds-ui-fix.preview.emergentagent.com').rstrip('/')


class TestSandboxConfiguration:
    """Test sandbox configuration endpoints"""
    
    def test_get_sandbox_config(self):
        """GET /api/sandbox/config - Get sandbox configuration"""
        response = requests.get(f"{BASE_URL}/api/sandbox/config")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify config structure
        assert "enabled" in data, "Config should have 'enabled' field"
        assert "auto_seed_data" in data, "Config should have 'auto_seed_data' field"
        assert "allowed_admin_ids" in data, "Config should have 'allowed_admin_ids' field"
        assert "max_concurrent_sessions" in data, "Config should have 'max_concurrent_sessions' field"
        assert "auto_cleanup_hours" in data, "Config should have 'auto_cleanup_hours' field"
        
        print(f"Sandbox config: enabled={data['enabled']}, auto_seed_data={data['auto_seed_data']}")
    
    def test_update_sandbox_config(self):
        """PUT /api/sandbox/config - Update sandbox configuration"""
        test_admin_id = f"test_admin_{uuid.uuid4().hex[:8]}"
        
        update_data = {
            "enabled": True,
            "auto_seed_data": True,
            "max_concurrent_sessions": 15,
            "auto_cleanup_hours": 48,
            "admin_id": test_admin_id
        }
        
        response = requests.put(
            f"{BASE_URL}/api/sandbox/config",
            json=update_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify updated values
        assert data.get("enabled") == True, "Enabled should be True"
        assert data.get("max_concurrent_sessions") == 15, "Max sessions should be 15"
        assert data.get("updated_by") == test_admin_id, "Updated_by should match admin_id"
        
        print(f"Config updated by: {data.get('updated_by')}")


class TestSandboxSessions:
    """Test sandbox session management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_admin_id = f"test_admin_{uuid.uuid4().hex[:8]}"
        self.session_id = None
    
    def test_start_sandbox_session_buyer(self):
        """POST /api/sandbox/session/start - Start session as buyer"""
        response = requests.post(
            f"{BASE_URL}/api/sandbox/session/start",
            json={
                "admin_id": self.test_admin_id,
                "role": "buyer"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify session structure
        assert "session" in data, "Response should have 'session'"
        assert "sandbox_user" in data, "Response should have 'sandbox_user'"
        assert "message" in data, "Response should have 'message'"
        
        session = data["session"]
        assert session["admin_id"] == self.test_admin_id, "Session admin_id should match"
        assert session["role"] == "buyer", "Session role should be buyer"
        assert session["status"] == "active", "Session status should be active"
        assert "id" in session, "Session should have id"
        
        self.session_id = session["id"]
        print(f"Started buyer session: {self.session_id}")
    
    def test_start_sandbox_session_seller(self):
        """POST /api/sandbox/session/start - Start session as seller"""
        response = requests.post(
            f"{BASE_URL}/api/sandbox/session/start",
            json={
                "admin_id": self.test_admin_id,
                "role": "seller"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        session = data["session"]
        assert session["role"] == "seller", "Session role should be seller"
        print(f"Started seller session: {session['id']}")
    
    def test_start_sandbox_session_transport_partner(self):
        """POST /api/sandbox/session/start - Start session as transport partner"""
        response = requests.post(
            f"{BASE_URL}/api/sandbox/session/start",
            json={
                "admin_id": self.test_admin_id,
                "role": "transport_partner"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        session = data["session"]
        assert session["role"] == "transport_partner", "Session role should be transport_partner"
        print(f"Started transport_partner session: {session['id']}")
    
    def test_start_sandbox_session_admin(self):
        """POST /api/sandbox/session/start - Start session as admin"""
        response = requests.post(
            f"{BASE_URL}/api/sandbox/session/start",
            json={
                "admin_id": self.test_admin_id,
                "role": "admin"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        session = data["session"]
        assert session["role"] == "admin", "Session role should be admin"
        print(f"Started admin session: {session['id']}")
    
    def test_get_active_session(self):
        """GET /api/sandbox/session/active/{admin_id} - Get active session"""
        # First start a session
        start_response = requests.post(
            f"{BASE_URL}/api/sandbox/session/start",
            json={
                "admin_id": self.test_admin_id,
                "role": "buyer"
            }
        )
        assert start_response.status_code == 200
        
        # Then check active session
        response = requests.get(f"{BASE_URL}/api/sandbox/session/active/{self.test_admin_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "active" in data, "Response should have 'active'"
        assert data["active"] == True, "Should have active session"
        assert "session" in data, "Response should have 'session'"
        assert data["session"]["admin_id"] == self.test_admin_id
        
        print(f"Active session found for admin: {self.test_admin_id}")
    
    def test_end_sandbox_session(self):
        """POST /api/sandbox/session/{session_id}/end - End session"""
        # First start a session
        start_response = requests.post(
            f"{BASE_URL}/api/sandbox/session/start",
            json={
                "admin_id": self.test_admin_id,
                "role": "buyer"
            }
        )
        assert start_response.status_code == 200
        session_id = start_response.json()["session"]["id"]
        
        # End the session
        response = requests.post(
            f"{BASE_URL}/api/sandbox/session/{session_id}/end",
            json={"admin_id": self.test_admin_id}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Should return success=True"
        assert "message" in data, "Should have message"
        
        print(f"Session ended: {session_id}")
    
    def test_switch_role_in_session(self):
        """POST /api/sandbox/session/{session_id}/switch-role - Switch role"""
        # Start session as buyer
        start_response = requests.post(
            f"{BASE_URL}/api/sandbox/session/start",
            json={
                "admin_id": self.test_admin_id,
                "role": "buyer"
            }
        )
        assert start_response.status_code == 200
        session_id = start_response.json()["session"]["id"]
        
        # Switch to seller
        response = requests.post(
            f"{BASE_URL}/api/sandbox/session/{session_id}/switch-role",
            json={
                "new_role": "seller",
                "admin_id": self.test_admin_id
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Should return success=True"
        assert data.get("new_role") == "seller", "New role should be seller"
        assert "sandbox_user" in data, "Should have sandbox_user"
        
        print(f"Switched role from buyer to seller in session: {session_id}")


class TestSeedDataGeneration:
    """Test seed data generation endpoint"""
    
    def test_generate_seed_data(self):
        """POST /api/sandbox/seed-data/generate - Generate seed data"""
        response = requests.post(f"{BASE_URL}/api/sandbox/seed-data/generate")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Should return success=True"
        assert "created" in data, "Should have 'created' field"
        
        created = data["created"]
        # Verify expected data was created
        assert "users" in created, "Should create users"
        assert "sellers" in created, "Should create sellers"
        assert "listings" in created, "Should create listings"
        assert "orders" in created, "Should create orders"
        assert "escrows" in created, "Should create escrows"
        
        print(f"Seed data generated: {created}")


class TestSandboxStatistics:
    """Test sandbox statistics endpoint"""
    
    def test_get_sandbox_stats(self):
        """GET /api/sandbox/stats - Get sandbox statistics"""
        response = requests.get(f"{BASE_URL}/api/sandbox/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify stats structure
        expected_fields = ["users", "sellers", "listings", "orders", "escrows", 
                          "messages", "transport", "disputes", "active_sessions"]
        
        for field in expected_fields:
            assert field in data, f"Stats should have '{field}'"
            assert isinstance(data[field], int), f"'{field}' should be an integer"
        
        print(f"Sandbox stats: users={data['users']}, orders={data['orders']}, listings={data['listings']}")


class TestSandboxDataRetrieval:
    """Test sandbox data retrieval endpoints"""
    
    def test_get_sandbox_users(self):
        """GET /api/sandbox/users - Get sandbox users"""
        response = requests.get(f"{BASE_URL}/api/sandbox/users")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Should return a list of users"
        
        if len(data) > 0:
            user = data[0]
            assert "id" in user or "user_id" in user, "User should have id"
            assert "role" in user, "User should have role"
            print(f"Found {len(data)} sandbox users")
        else:
            print("No sandbox users found (may need to generate seed data)")
    
    def test_get_sandbox_users_by_role(self):
        """GET /api/sandbox/users?role=buyer - Get users by role"""
        response = requests.get(f"{BASE_URL}/api/sandbox/users", params={"role": "buyer"})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        if len(data) > 0:
            for user in data:
                assert user.get("role") == "buyer", "All users should be buyers"
            print(f"Found {len(data)} buyers")
    
    def test_get_sandbox_orders(self):
        """GET /api/sandbox/orders - Get sandbox orders"""
        response = requests.get(f"{BASE_URL}/api/sandbox/orders")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Should return a list of orders"
        
        if len(data) > 0:
            order = data[0]
            assert "id" in order or "order_id" in order, "Order should have id"
            assert "status" in order, "Order should have status"
            assert "buyer_id" in order, "Order should have buyer_id"
            assert "seller_id" in order, "Order should have seller_id"
            print(f"Found {len(data)} sandbox orders")
        else:
            print("No sandbox orders found")
    
    def test_get_sandbox_orders_by_status(self):
        """GET /api/sandbox/orders?status=pending - Get orders by status"""
        response = requests.get(f"{BASE_URL}/api/sandbox/orders", params={"status": "pending"})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        if len(data) > 0:
            for order in data:
                assert order.get("status") == "pending", "All orders should be pending"
            print(f"Found {len(data)} pending orders")
    
    def test_get_sandbox_escrows(self):
        """GET /api/sandbox/escrows - Get sandbox escrows"""
        response = requests.get(f"{BASE_URL}/api/sandbox/escrows")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Should return a list of escrows"
        
        if len(data) > 0:
            escrow = data[0]
            assert "id" in escrow or "escrow_id" in escrow, "Escrow should have id"
            assert "status" in escrow, "Escrow should have status"
            assert "order_id" in escrow, "Escrow should have order_id"
            print(f"Found {len(data)} sandbox escrows")
        else:
            print("No sandbox escrows found")
    
    def test_get_sandbox_listings(self):
        """GET /api/sandbox/listings - Get sandbox listings"""
        response = requests.get(f"{BASE_URL}/api/sandbox/listings")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Should return a list of listings"
        
        if len(data) > 0:
            listing = data[0]
            assert "id" in listing or "listing_id" in listing, "Listing should have id"
            assert "title" in listing, "Listing should have title"
            assert "price" in listing, "Listing should have price"
            # Verify sandbox indicator
            assert "[SANDBOX]" in listing.get("title", "") or listing.get("metadata", {}).get("sandbox"), \
                "Listing should be marked as sandbox"
            print(f"Found {len(data)} sandbox listings")
        else:
            print("No sandbox listings found")


class TestMockPaymentProcessing:
    """Test mock payment processing endpoint"""
    
    def test_process_mock_payment_success(self):
        """POST /api/sandbox/payment/process - Process successful mock payment"""
        # First get an order ID
        orders_response = requests.get(f"{BASE_URL}/api/sandbox/orders")
        if orders_response.status_code != 200:
            pytest.skip("Could not get orders")
        
        orders = orders_response.json()
        pending_orders = [o for o in orders if o.get("status") == "pending"]
        
        if not pending_orders:
            # Create a test order ID
            order_id = f"test_order_{uuid.uuid4().hex[:8]}"
        else:
            order_id = pending_orders[0].get("id") or pending_orders[0].get("order_id")
        
        response = requests.post(
            f"{BASE_URL}/api/sandbox/payment/process",
            json={
                "order_id": order_id,
                "amount": 150000.0,
                "method": "mobile_money",
                "simulate_failure": False
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Payment should succeed"
        assert "transaction_id" in data, "Should have transaction_id"
        assert data.get("amount") == 150000.0, "Amount should match"
        assert data.get("method") == "mobile_money", "Method should match"
        
        print(f"Mock payment processed: {data['transaction_id']}")
    
    def test_process_mock_payment_card(self):
        """POST /api/sandbox/payment/process - Process card payment"""
        order_id = f"test_order_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/sandbox/payment/process",
            json={
                "order_id": order_id,
                "amount": 250000.0,
                "method": "card",
                "simulate_failure": False
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("method") == "card"
        print(f"Card payment processed: {data.get('transaction_id')}")
    
    def test_process_mock_payment_simulated_failure(self):
        """POST /api/sandbox/payment/process - Simulate payment failure"""
        order_id = f"test_order_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/sandbox/payment/process",
            json={
                "order_id": order_id,
                "amount": 100000.0,
                "method": "paypal",
                "simulate_failure": True
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == False, "Payment should fail when simulated"
        assert "transaction_id" in data, "Should still have transaction_id"
        assert "failed" in data.get("transaction_id", ""), "Transaction ID should indicate failure"
        
        print(f"Simulated payment failure: {data.get('message')}")


class TestSimulationTools:
    """Test simulation tools endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.test_admin_id = f"test_admin_{uuid.uuid4().hex[:8]}"
        
        # Start a session for simulation tests
        response = requests.post(
            f"{BASE_URL}/api/sandbox/session/start",
            json={
                "admin_id": self.test_admin_id,
                "role": "admin"
            }
        )
        if response.status_code == 200:
            self.session_id = response.json()["session"]["id"]
        else:
            self.session_id = None
    
    def test_fast_forward_time(self):
        """POST /api/sandbox/simulate/fast-forward - Fast forward time"""
        if not self.session_id:
            pytest.skip("Could not create session")
        
        response = requests.post(
            f"{BASE_URL}/api/sandbox/simulate/fast-forward",
            json={
                "session_id": self.session_id,
                "hours": 24,
                "admin_id": self.test_admin_id
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Should return success"
        assert data.get("hours_added") == 24, "Hours added should be 24"
        assert "total_simulated_offset" in data, "Should have total offset"
        assert "affected_escrows" in data, "Should have affected escrows count"
        
        print(f"Time fast-forwarded by 24 hours, affected {data.get('affected_escrows')} escrows")
    
    def test_simulate_delivery_failure(self):
        """POST /api/sandbox/simulate/delivery-failure - Simulate delivery failure"""
        # Get an order with shipping status
        orders_response = requests.get(f"{BASE_URL}/api/sandbox/orders")
        if orders_response.status_code != 200:
            pytest.skip("Could not get orders")
        
        orders = orders_response.json()
        shipped_orders = [o for o in orders if o.get("status") in ["shipped", "in_transit"]]
        
        if not shipped_orders:
            # Use any order or a test order ID
            if orders:
                order_id = orders[0].get("id") or orders[0].get("order_id")
            else:
                order_id = f"test_order_{uuid.uuid4().hex[:8]}"
        else:
            order_id = shipped_orders[0].get("id") or shipped_orders[0].get("order_id")
        
        response = requests.post(
            f"{BASE_URL}/api/sandbox/simulate/delivery-failure",
            json={
                "order_id": order_id,
                "reason": "Customer not available - test simulation",
                "admin_id": self.test_admin_id
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Should return success"
        assert "message" in data, "Should have message"
        
        print(f"Simulated delivery failure for order: {order_id}")


class TestAuditLogs:
    """Test audit logging endpoint"""
    
    def test_get_audit_logs(self):
        """GET /api/sandbox/audit - Get audit logs"""
        response = requests.get(f"{BASE_URL}/api/sandbox/audit")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "logs" in data, "Response should have 'logs'"
        assert "total" in data, "Response should have 'total'"
        assert "page" in data, "Response should have 'page'"
        assert "limit" in data, "Response should have 'limit'"
        
        logs = data["logs"]
        assert isinstance(logs, list), "Logs should be a list"
        
        if len(logs) > 0:
            log = logs[0]
            assert "id" in log, "Log should have id"
            assert "action" in log, "Log should have action"
            assert "admin_id" in log, "Log should have admin_id"
            assert "timestamp" in log, "Log should have timestamp"
            print(f"Found {data['total']} audit logs")
        else:
            print("No audit logs found yet")
    
    def test_get_audit_logs_with_filters(self):
        """GET /api/sandbox/audit with filters"""
        # Filter by action
        response = requests.get(
            f"{BASE_URL}/api/sandbox/audit",
            params={"action": "session_started", "page": 1, "limit": 10}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        logs = data.get("logs", [])
        for log in logs:
            assert log.get("action") == "session_started", "All logs should have action=session_started"
        
        print(f"Found {len(logs)} session_started audit logs")


class TestEndToEndSandboxWorkflow:
    """End-to-end test of sandbox workflow"""
    
    def test_complete_sandbox_workflow(self):
        """Test complete sandbox workflow: start session -> use features -> end session"""
        test_admin_id = f"e2e_admin_{uuid.uuid4().hex[:8]}"
        
        # Step 1: Check/Get config
        config_response = requests.get(f"{BASE_URL}/api/sandbox/config")
        assert config_response.status_code == 200, "Should get config"
        print("Step 1: Got sandbox config")
        
        # Step 2: Start session as buyer
        start_response = requests.post(
            f"{BASE_URL}/api/sandbox/session/start",
            json={"admin_id": test_admin_id, "role": "buyer"}
        )
        assert start_response.status_code == 200, f"Should start session: {start_response.text}"
        session_id = start_response.json()["session"]["id"]
        print(f"Step 2: Started session {session_id}")
        
        # Step 3: Get sandbox stats
        stats_response = requests.get(f"{BASE_URL}/api/sandbox/stats")
        assert stats_response.status_code == 200, "Should get stats"
        print(f"Step 3: Got stats - users: {stats_response.json().get('users')}")
        
        # Step 4: Get sandbox users
        users_response = requests.get(f"{BASE_URL}/api/sandbox/users")
        assert users_response.status_code == 200, "Should get users"
        print(f"Step 4: Got {len(users_response.json())} users")
        
        # Step 5: Get sandbox orders
        orders_response = requests.get(f"{BASE_URL}/api/sandbox/orders")
        assert orders_response.status_code == 200, "Should get orders"
        print(f"Step 5: Got {len(orders_response.json())} orders")
        
        # Step 6: Get sandbox listings
        listings_response = requests.get(f"{BASE_URL}/api/sandbox/listings")
        assert listings_response.status_code == 200, "Should get listings"
        print(f"Step 6: Got {len(listings_response.json())} listings")
        
        # Step 7: Switch role to seller
        switch_response = requests.post(
            f"{BASE_URL}/api/sandbox/session/{session_id}/switch-role",
            json={"new_role": "seller", "admin_id": test_admin_id}
        )
        assert switch_response.status_code == 200, "Should switch role"
        print("Step 7: Switched to seller role")
        
        # Step 8: Process a mock payment
        payment_response = requests.post(
            f"{BASE_URL}/api/sandbox/payment/process",
            json={
                "order_id": f"e2e_order_{uuid.uuid4().hex[:8]}",
                "amount": 500000.0,
                "method": "mobile_money",
                "simulate_failure": False
            }
        )
        assert payment_response.status_code == 200, "Should process payment"
        print(f"Step 8: Processed payment - tx: {payment_response.json().get('transaction_id')}")
        
        # Step 9: Get audit logs (should contain our actions)
        audit_response = requests.get(
            f"{BASE_URL}/api/sandbox/audit",
            params={"admin_id": test_admin_id}
        )
        assert audit_response.status_code == 200, "Should get audit logs"
        print(f"Step 9: Got {audit_response.json().get('total')} audit entries for this admin")
        
        # Step 10: End session
        end_response = requests.post(
            f"{BASE_URL}/api/sandbox/session/{session_id}/end",
            json={"admin_id": test_admin_id}
        )
        assert end_response.status_code == 200, "Should end session"
        print("Step 10: Session ended")
        
        # Step 11: Verify session is no longer active
        active_response = requests.get(f"{BASE_URL}/api/sandbox/session/active/{test_admin_id}")
        assert active_response.status_code == 200
        assert active_response.json().get("active") == False, "Session should be inactive"
        print("Step 11: Verified session is inactive")
        
        print("\n=== E2E Sandbox Workflow Complete ===")


# Run pytest with: pytest /app/backend/tests/test_sandbox_system.py -v --tb=short
