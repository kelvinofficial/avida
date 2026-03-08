"""
Test Escrow and Order Tracking API Endpoints (Patch Features)
Tests for:
- Login API
- Escrow seller orders endpoint
- Escrow buyer orders endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://order-checkout-demo.preview.emergentagent.com')

class TestAuthAPI:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test login with demo credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "demo@avida.com", "password": "Demo@123"},
            headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "session_token" in data, "No session_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == "demo@avida.com"
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@example.com", "password": "wrongpassword"},
            headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
        )
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"


class TestEscrowAPI:
    """Escrow order management endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "demo@avida.com", "password": "Demo@123"},
            headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
        )
        if response.status_code == 200:
            self.token = response.json().get("session_token")
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0"
            }
        else:
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_get_seller_orders(self):
        """Test GET /api/escrow/seller/orders"""
        response = requests.get(
            f"{BASE_URL}/api/escrow/seller/orders",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get seller orders: {response.text}"
        
        data = response.json()
        assert "orders" in data, "No orders field in response"
        assert "total" in data, "No total field in response"
        assert isinstance(data["orders"], list), "orders should be a list"
        
    def test_get_buyer_orders(self):
        """Test GET /api/escrow/buyer/orders"""
        response = requests.get(
            f"{BASE_URL}/api/escrow/buyer/orders",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get buyer orders: {response.text}"
        
        data = response.json()
        assert "orders" in data, "No orders field in response"
        assert "total" in data, "No total field in response"
        assert isinstance(data["orders"], list), "orders should be a list"
        
    def test_seller_orders_without_auth(self):
        """Test seller orders endpoint without authentication"""
        response = requests.get(
            f"{BASE_URL}/api/escrow/seller/orders",
            headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        
    def test_buyer_orders_without_auth(self):
        """Test buyer orders endpoint without authentication"""
        response = requests.get(
            f"{BASE_URL}/api/escrow/buyer/orders",
            headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"


class TestHealthAPI:
    """Health check endpoint tests"""
    
    def test_health_check(self):
        """Test health endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/health",
            headers={"User-Agent": "Mozilla/5.0"}
        )
        assert response.status_code == 200, f"Health check failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "healthy", f"Health status not healthy: {data}"


class TestSettingsAPI:
    """Settings and feature flags endpoint tests"""
    
    def test_feature_settings(self):
        """Test feature settings endpoint (currency should be TZS)"""
        response = requests.get(
            f"{BASE_URL}/api/feature-settings",
            headers={"User-Agent": "Mozilla/5.0"}
        )
        assert response.status_code == 200, f"Failed to get feature settings: {response.text}"
        
        data = response.json()
        # Check TZS currency configuration
        assert data.get("currency") == "TZS", f"Expected currency TZS, got {data.get('currency')}"
        assert data.get("default_country") == "TZ", f"Expected default_country TZ, got {data.get('default_country')}"
