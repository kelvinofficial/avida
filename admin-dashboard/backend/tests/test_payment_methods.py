"""
Payment Methods Admin API Tests
Tests for GET, UPDATE and TOGGLE endpoints for payment methods management
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://seller-promo.preview.emergentagent.com/api/admin')


class TestPaymentMethodsAdmin:
    """Test admin payment methods endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get admin token for all tests"""
        login_response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": "admin@example.com", "password": "admin123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    # GET /api/admin/boost/admin/payment-methods - All payment methods
    def test_get_all_payment_methods(self):
        """Should return all 5 payment methods with configuration details"""
        response = requests.get(
            f"{BASE_URL}/boost/admin/payment-methods",
            headers=self.headers
        )
        assert response.status_code == 200
        
        methods = response.json()
        assert isinstance(methods, list)
        assert len(methods) == 5, f"Expected 5 payment methods, got {len(methods)}"
        
        # Verify all expected methods exist
        method_ids = [m["id"] for m in methods]
        expected_ids = ["stripe", "paypal", "mpesa", "mtn", "vodacom_tz"]
        for expected_id in expected_ids:
            assert expected_id in method_ids, f"Missing payment method: {expected_id}"
        
        # Verify method has required fields
        for method in methods:
            assert "id" in method
            assert "name" in method
            assert "description" in method
            assert "is_enabled" in method
            assert "requires_phone" in method
            assert "currency" in method or method["id"] in ["stripe", "paypal"]  # Some may not have currency
            assert "exchange_rate" in method
            assert "min_amount" in method
            assert "max_amount" in method
            assert "priority" in method
        
        print(f"SUCCESS: GET all payment methods - returned {len(methods)} methods")
    
    def test_get_single_payment_method(self):
        """Should return single payment method by ID"""
        response = requests.get(
            f"{BASE_URL}/boost/admin/payment-methods/stripe",
            headers=self.headers
        )
        assert response.status_code == 200
        
        method = response.json()
        assert method["id"] == "stripe"
        assert method["name"] == "Credit/Debit Card"
        assert "is_enabled" in method
        
        print(f"SUCCESS: GET single payment method - stripe")
    
    def test_get_nonexistent_payment_method_returns_404(self):
        """Should return 404 for non-existent payment method"""
        response = requests.get(
            f"{BASE_URL}/boost/admin/payment-methods/nonexistent",
            headers=self.headers
        )
        assert response.status_code == 404
        print(f"SUCCESS: GET non-existent payment method returns 404")
    
    # PUT /api/admin/boost/admin/payment-methods/{id}/toggle - Toggle enable/disable
    def test_toggle_payment_method_disable(self):
        """Should disable a payment method"""
        # Get current state first
        get_response = requests.get(
            f"{BASE_URL}/boost/admin/payment-methods/vodacom_tz",
            headers=self.headers
        )
        original_state = get_response.json()["is_enabled"]
        
        # Disable it
        response = requests.put(
            f"{BASE_URL}/boost/admin/payment-methods/vodacom_tz/toggle?enabled=false",
            headers=self.headers
        )
        assert response.status_code == 200
        
        method = response.json()
        assert method["id"] == "vodacom_tz"
        assert method["is_enabled"] == False
        assert "updated_at" in method
        
        print(f"SUCCESS: Toggle vodacom_tz disabled")
        
        # Verify with GET
        verify_response = requests.get(
            f"{BASE_URL}/boost/admin/payment-methods/vodacom_tz",
            headers=self.headers
        )
        assert verify_response.json()["is_enabled"] == False
        print(f"SUCCESS: Verified vodacom_tz is disabled via GET")
    
    def test_toggle_payment_method_enable(self):
        """Should enable a payment method"""
        response = requests.put(
            f"{BASE_URL}/boost/admin/payment-methods/vodacom_tz/toggle?enabled=true",
            headers=self.headers
        )
        assert response.status_code == 200
        
        method = response.json()
        assert method["id"] == "vodacom_tz"
        assert method["is_enabled"] == True
        
        print(f"SUCCESS: Toggle vodacom_tz enabled")
    
    def test_toggle_nonexistent_payment_method_returns_404(self):
        """Should return 404 when toggling non-existent payment method"""
        response = requests.put(
            f"{BASE_URL}/boost/admin/payment-methods/nonexistent/toggle?enabled=true",
            headers=self.headers
        )
        assert response.status_code == 404
        print(f"SUCCESS: Toggle non-existent payment method returns 404")
    
    # PUT /api/admin/boost/admin/payment-methods/{id} - Update settings
    def test_update_payment_method_settings(self):
        """Should update payment method configuration"""
        response = requests.put(
            f"{BASE_URL}/boost/admin/payment-methods/mpesa",
            headers=self.headers,
            json={
                "description": "Updated M-Pesa description",
                "min_amount": 2.0,
                "max_amount": 750.0
            }
        )
        assert response.status_code == 200
        
        method = response.json()
        assert method["id"] == "mpesa"
        assert method["description"] == "Updated M-Pesa description"
        assert method["min_amount"] == 2.0
        assert method["max_amount"] == 750.0
        assert "updated_at" in method
        
        print(f"SUCCESS: Update mpesa settings")
        
        # Verify with GET
        verify_response = requests.get(
            f"{BASE_URL}/boost/admin/payment-methods/mpesa",
            headers=self.headers
        )
        assert verify_response.json()["min_amount"] == 2.0
        print(f"SUCCESS: Verified mpesa update via GET")
        
        # Revert changes
        requests.put(
            f"{BASE_URL}/boost/admin/payment-methods/mpesa",
            headers=self.headers,
            json={
                "description": "Pay with M-Pesa (Kenya)",
                "min_amount": 1.0,
                "max_amount": 500.0
            }
        )
    
    def test_update_payment_method_exchange_rate(self):
        """Should update payment method exchange rate"""
        response = requests.put(
            f"{BASE_URL}/boost/admin/payment-methods/mtn",
            headers=self.headers,
            json={"exchange_rate": 16.5}
        )
        assert response.status_code == 200
        
        method = response.json()
        assert method["exchange_rate"] == 16.5
        
        print(f"SUCCESS: Update mtn exchange rate")
        
        # Revert
        requests.put(
            f"{BASE_URL}/boost/admin/payment-methods/mtn",
            headers=self.headers,
            json={"exchange_rate": 15.0}
        )
    
    def test_update_nonexistent_payment_method_returns_404(self):
        """Should return 404 when updating non-existent payment method"""
        response = requests.put(
            f"{BASE_URL}/boost/admin/payment-methods/nonexistent",
            headers=self.headers,
            json={"description": "Test"}
        )
        assert response.status_code == 404
        print(f"SUCCESS: Update non-existent payment method returns 404")
    
    def test_update_with_empty_body_returns_400(self):
        """Should return 400 when no updates provided"""
        response = requests.put(
            f"{BASE_URL}/boost/admin/payment-methods/stripe",
            headers=self.headers,
            json={}
        )
        assert response.status_code == 400
        print(f"SUCCESS: Update with empty body returns 400")
    
    # Auth tests
    def test_get_payment_methods_without_auth_returns_401(self):
        """Should return 401 without auth token"""
        response = requests.get(f"{BASE_URL}/boost/admin/payment-methods")
        assert response.status_code == 401
        print(f"SUCCESS: GET without auth returns 401")
    
    def test_toggle_without_auth_returns_401(self):
        """Should return 401 without auth token"""
        response = requests.put(f"{BASE_URL}/boost/admin/payment-methods/stripe/toggle?enabled=false")
        assert response.status_code == 401
        print(f"SUCCESS: Toggle without auth returns 401")
    
    # Verify all 5 payment methods exist with correct default data
    def test_verify_stripe_defaults(self):
        """Verify Stripe payment method has correct defaults"""
        response = requests.get(
            f"{BASE_URL}/boost/admin/payment-methods/stripe",
            headers=self.headers
        )
        method = response.json()
        assert method["name"] == "Credit/Debit Card"
        assert method["requires_phone"] == False
        assert method["currency"] == "USD"
        assert method["priority"] == 1
        print(f"SUCCESS: Stripe has correct defaults")
    
    def test_verify_mpesa_defaults(self):
        """Verify M-Pesa payment method has correct defaults"""
        response = requests.get(
            f"{BASE_URL}/boost/admin/payment-methods/mpesa",
            headers=self.headers
        )
        method = response.json()
        assert method["name"] == "M-Pesa"
        assert method["requires_phone"] == True
        assert method["country"] == "KE"
        assert method["currency"] == "KES"
        print(f"SUCCESS: M-Pesa has correct defaults")
    
    def test_verify_mtn_has_networks(self):
        """Verify MTN has networks array"""
        response = requests.get(
            f"{BASE_URL}/boost/admin/payment-methods/mtn",
            headers=self.headers
        )
        method = response.json()
        assert "networks" in method
        assert isinstance(method["networks"], list)
        assert "MTN" in method["networks"]
        print(f"SUCCESS: MTN has networks array: {method['networks']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
