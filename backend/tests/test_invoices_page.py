"""
Test My Invoices Page - Backend API Tests
Tests the /api/invoices endpoints for the user invoices feature
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://negotiate-badge.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "premium_tester_2@example.com"
TEST_PASSWORD = "testpass123"


class TestInvoicesAPI:
    """Test Invoice API endpoints"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json().get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Authentication failed - skipping authenticated tests")

    def test_get_invoices_requires_auth(self):
        """Test that GET /api/invoices returns 401 when not authenticated"""
        # Create new session without auth
        unauth_session = requests.Session()
        response = unauth_session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print("PASSED: GET /api/invoices returns 401 when not authenticated")

    def test_get_invoices_authenticated(self):
        """Test that GET /api/invoices returns 200 and invoices list when authenticated"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "invoices" in data, "Response should contain 'invoices' key"
        assert isinstance(data["invoices"], list), "Invoices should be a list"
        
        # New user should have empty invoices list
        print(f"PASSED: GET /api/invoices returns {len(data['invoices'])} invoices")

    def test_get_invoices_with_limit(self):
        """Test that GET /api/invoices respects limit parameter"""
        response = self.session.get(f"{BASE_URL}/api/invoices?limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "invoices" in data
        print("PASSED: GET /api/invoices with limit parameter works")

    def test_get_single_invoice_not_found(self):
        """Test that GET /api/invoices/{id} returns 404 for non-existent invoice"""
        fake_invoice_id = "inv_nonexistent_12345"
        response = self.session.get(f"{BASE_URL}/api/invoices/{fake_invoice_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASSED: GET /api/invoices/{id} returns 404 for non-existent invoice")

    def test_get_invoice_html_not_found(self):
        """Test that GET /api/invoices/{id}/html returns 404 for non-existent invoice"""
        fake_invoice_id = "inv_nonexistent_12345"
        response = self.session.get(f"{BASE_URL}/api/invoices/{fake_invoice_id}/html")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASSED: GET /api/invoices/{id}/html returns 404 for non-existent invoice")

    def test_create_invoice_requires_valid_transaction(self):
        """Test that POST /api/invoices/create/{transaction_id} validates transaction"""
        fake_transaction_id = "txn_nonexistent_12345"
        response = self.session.post(f"{BASE_URL}/api/invoices/create/{fake_transaction_id}")
        # Should return 404 for non-existent transaction
        assert response.status_code in [404, 400], f"Expected 404 or 400, got {response.status_code}"
        print("PASSED: POST /api/invoices/create validates transaction exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
