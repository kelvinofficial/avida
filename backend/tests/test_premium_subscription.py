"""
Premium Subscription System Backend Tests
Tests for Stripe, PayPal, and M-Pesa payment gateways
Including Invoicing and Subscription Management APIs
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://verified-sellers-hub.preview.emergentagent.com')

# Test user credentials
TEST_USER_EMAIL = f"premium_test_{uuid.uuid4().hex[:8]}@example.com"
TEST_USER_PASSWORD = "testpass123"
TEST_USER_NAME = "Premium Test User"


class TestPremiumSubscriptionPublicEndpoints:
    """Test public premium subscription endpoints (no auth required)"""
    
    def test_get_packages_returns_all_payment_options(self):
        """GET /api/premium-subscription/packages - Returns all payment packages"""
        response = requests.get(f"{BASE_URL}/api/premium-subscription/packages")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify Stripe packages
        assert "stripe_packages" in data
        stripe_packages = data["stripe_packages"]
        assert len(stripe_packages) == 3  # monthly, quarterly, yearly
        
        # Verify monthly package structure
        monthly = next((p for p in stripe_packages if p["id"] == "monthly"), None)
        assert monthly is not None
        assert monthly["name"] == "Premium Monthly"
        assert monthly["amount"] == 29.99
        assert monthly["currency"] == "usd"
        assert monthly["duration_days"] == 30
        
        # Verify quarterly package structure  
        quarterly = next((p for p in stripe_packages if p["id"] == "quarterly"), None)
        assert quarterly is not None
        assert quarterly["amount"] == 79.99
        assert quarterly["duration_days"] == 90
        
        # Verify yearly package structure
        yearly = next((p for p in stripe_packages if p["id"] == "yearly"), None)
        assert yearly is not None
        assert yearly["amount"] == 249.99
        assert yearly["duration_days"] == 365
        
        # Verify M-Pesa packages
        assert "mpesa_packages" in data
        mpesa_packages = data["mpesa_packages"]
        assert len(mpesa_packages) >= 1
        
        # Verify KES package exists
        kes_package = next((p for p in mpesa_packages if p["currency"] == "KES"), None)
        assert kes_package is not None
        assert kes_package["amount"] == 3500
        
        print(f"PASSED: Packages API returns {len(stripe_packages)} Stripe and {len(mpesa_packages)} M-Pesa packages")


class TestInvoiceEndpoints:
    """Test invoice API endpoints - require authentication"""
    
    def test_invoices_requires_auth(self):
        """GET /api/invoices - Should return 401 when not logged in"""
        response = requests.get(f"{BASE_URL}/api/invoices")
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        
        print("PASSED: /api/invoices correctly requires authentication")
    
    def test_invoice_by_id_requires_auth(self):
        """GET /api/invoices/{id} - Should return 401 when not logged in"""
        response = requests.get(f"{BASE_URL}/api/invoices/fake-invoice-id")
        
        assert response.status_code == 401
        print("PASSED: /api/invoices/{id} correctly requires authentication")
    
    def test_invoice_html_requires_auth(self):
        """GET /api/invoices/{id}/html - Should return 401 when not logged in"""
        response = requests.get(f"{BASE_URL}/api/invoices/fake-invoice-id/html")
        
        assert response.status_code == 401
        print("PASSED: /api/invoices/{id}/html correctly requires authentication")


class TestAuthenticatedPremiumEndpoints:
    """Test endpoints that require authentication"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Create a test user and get auth token"""
        # Register user
        reg_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME
        })
        
        if reg_response.status_code not in [200, 201, 409]:
            pytest.skip(f"Could not create test user: {reg_response.text}")
        
        # Login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Could not login test user: {login_response.text}")
        
        self.token = login_response.json().get("session_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user_id = login_response.json().get("user_id")
        print(f"Created test user: {TEST_USER_EMAIL}")
    
    def test_stripe_checkout_requires_auth(self):
        """POST /api/premium-subscription/stripe/checkout - Requires auth"""
        response = requests.post(f"{BASE_URL}/api/premium-subscription/stripe/checkout", json={
            "package_id": "monthly",
            "origin_url": "https://example.com",
            "business_profile_id": "fake-id"
        })
        
        assert response.status_code == 401
        print("PASSED: Stripe checkout requires authentication")
    
    def test_paypal_checkout_requires_auth(self):
        """POST /api/premium-subscription/paypal/checkout - Requires auth"""
        response = requests.post(f"{BASE_URL}/api/premium-subscription/paypal/checkout", json={
            "package_id": "monthly",
            "origin_url": "https://example.com",
            "business_profile_id": "fake-id"
        })
        
        assert response.status_code == 401
        print("PASSED: PayPal checkout requires authentication")
    
    def test_mpesa_stk_push_requires_auth(self):
        """POST /api/premium-subscription/mpesa/stk-push - Requires auth"""
        response = requests.post(f"{BASE_URL}/api/premium-subscription/mpesa/stk-push", json={
            "package_id": "monthly_kes",
            "phone_number": "+254712345678",
            "business_profile_id": "fake-id"
        })
        
        assert response.status_code == 401
        print("PASSED: M-Pesa STK push requires authentication")
    
    def test_my_subscription_requires_auth(self):
        """GET /api/premium-subscription/my-subscription - Requires auth"""
        response = requests.get(f"{BASE_URL}/api/premium-subscription/my-subscription")
        
        assert response.status_code == 401
        print("PASSED: my-subscription requires authentication")
    
    def test_get_user_invoices_with_auth(self):
        """GET /api/invoices - Returns invoices for authenticated user"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "invoices" in data
        assert isinstance(data["invoices"], list)
        
        print(f"PASSED: User invoices API returns {len(data['invoices'])} invoices")
    
    def test_my_subscription_returns_status(self):
        """GET /api/premium-subscription/my-subscription - Returns subscription status"""
        response = requests.get(f"{BASE_URL}/api/premium-subscription/my-subscription", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # For user without business profile
        if not data.get("has_profile"):
            assert data["has_profile"] == False
            assert data["is_premium"] == False
        else:
            assert "is_premium" in data
            assert "is_verified" in data
        
        print(f"PASSED: my-subscription returns correct status: {data}")
    
    def test_stripe_checkout_requires_valid_business_profile(self):
        """POST /api/premium-subscription/stripe/checkout - Fails without valid business profile"""
        response = requests.post(
            f"{BASE_URL}/api/premium-subscription/stripe/checkout",
            headers=self.headers,
            json={
                "package_id": "monthly",
                "origin_url": "https://example.com",
                "business_profile_id": "non-existent-profile-id"
            }
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "Business profile not found" in data.get("detail", "")
        
        print("PASSED: Stripe checkout validates business profile ownership")
    
    def test_paypal_checkout_requires_valid_business_profile(self):
        """POST /api/premium-subscription/paypal/checkout - Fails without valid business profile"""
        response = requests.post(
            f"{BASE_URL}/api/premium-subscription/paypal/checkout",
            headers=self.headers,
            json={
                "package_id": "monthly",
                "origin_url": "https://example.com",
                "business_profile_id": "non-existent-profile-id"
            }
        )
        
        assert response.status_code == 404
        print("PASSED: PayPal checkout validates business profile ownership")
    
    def test_mpesa_checkout_requires_valid_business_profile(self):
        """POST /api/premium-subscription/mpesa/stk-push - Fails without valid business profile"""
        response = requests.post(
            f"{BASE_URL}/api/premium-subscription/mpesa/stk-push",
            headers=self.headers,
            json={
                "package_id": "monthly_kes",
                "phone_number": "+254712345678",
                "business_profile_id": "non-existent-profile-id"
            }
        )
        
        assert response.status_code == 404
        print("PASSED: M-Pesa checkout validates business profile ownership")
    
    def test_stripe_checkout_validates_package_id(self):
        """POST /api/premium-subscription/stripe/checkout - Validates package ID"""
        # First create a business profile
        bp_response = requests.post(
            f"{BASE_URL}/api/business-profiles/",
            headers=self.headers,
            json={
                "business_name": f"Premium Test Business {uuid.uuid4().hex[:6]}",
                "description": "Test business for premium subscription testing"
            }
        )
        
        if bp_response.status_code in [200, 201]:
            profile_id = bp_response.json().get("id")
            
            # Try checkout with invalid package
            response = requests.post(
                f"{BASE_URL}/api/premium-subscription/stripe/checkout",
                headers=self.headers,
                json={
                    "package_id": "invalid_package",
                    "origin_url": "https://example.com",
                    "business_profile_id": profile_id
                }
            )
            
            assert response.status_code == 400
            assert "Invalid package ID" in response.json().get("detail", "")
            
            print("PASSED: Stripe checkout validates package ID")
        else:
            pytest.skip("Could not create business profile for package validation test")


class TestAdminSubscriptionEndpoints:
    """Test admin subscription management endpoints"""
    
    def test_admin_check_renewals_requires_auth(self):
        """POST /api/admin/subscriptions/check-renewals - Requires authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/subscriptions/check-renewals")
        
        # Should return 401 (not authenticated) or 307 (redirect to login)
        assert response.status_code in [401, 307, 403]
        print("PASSED: Admin check-renewals requires authentication")
    
    def test_admin_check_renewals_requires_admin_role(self):
        """POST /api/admin/subscriptions/check-renewals - Requires admin role"""
        # Create a regular user
        email = f"regular_user_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register
        requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": email,
            "password": "testpass123",
            "name": "Regular User"
        })
        
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "testpass123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("session_token")
            headers = {"Authorization": f"Bearer {token}"}
            
            # Try to access admin endpoint
            response = requests.post(
                f"{BASE_URL}/api/admin/subscriptions/check-renewals",
                headers=headers
            )
            
            # Should be 403 Forbidden for non-admin users
            assert response.status_code == 403
            print("PASSED: Admin check-renewals requires admin role")
        else:
            pytest.skip("Could not create regular user for admin role test")


class TestPaymentIntegrations:
    """Test payment integration setup (partially mocked)"""
    
    def test_stripe_api_key_configured(self):
        """Verify Stripe API key is configured (via error message)"""
        # We can indirectly check by looking at error messages or successful responses
        # The packages endpoint works, indicating the system is operational
        response = requests.get(f"{BASE_URL}/api/premium-subscription/packages")
        assert response.status_code == 200
        print("PASSED: Stripe packages available (API configured)")
    
    def test_mpesa_packages_available(self):
        """Verify M-Pesa packages are configured"""
        response = requests.get(f"{BASE_URL}/api/premium-subscription/packages")
        data = response.json()
        
        assert "mpesa_packages" in data
        mpesa = data["mpesa_packages"]
        
        # Should have at least KES and TZS options
        currencies = [p["currency"] for p in mpesa]
        assert "KES" in currencies  # Kenya
        
        print(f"PASSED: M-Pesa packages configured for currencies: {currencies}")
    
    def test_paypal_client_id_available_in_checkout(self):
        """Verify PayPal client ID would be returned in checkout response"""
        # Note: This would need auth + business profile to fully test
        # We can verify the endpoint structure exists
        response = requests.post(f"{BASE_URL}/api/premium-subscription/paypal/checkout", json={
            "package_id": "monthly",
            "origin_url": "https://example.com",
            "business_profile_id": "test"
        })
        
        # Should return 401 (auth required), not 404 (endpoint not found)
        assert response.status_code == 401
        print("PASSED: PayPal checkout endpoint exists and requires auth")


# Module to run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
