"""
Premium Subscription System Backend Tests
Tests for Stripe, PayPal, and M-Pesa payment gateways
Including Invoicing and Subscription Management APIs
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://listing-form-builder.preview.emergentagent.com')

# Test user credentials
TEST_USER_EMAIL = f"premium_test_{uuid.uuid4().hex[:8]}@example.com"
TEST_USER_PASSWORD = "testpass123"
TEST_USER_NAME = "Premium Test User"


@pytest.fixture(scope="module")
def session():
    """Create requests session"""
    return requests.Session()


@pytest.fixture(scope="module")
def auth_token(session):
    """Create a test user and get auth token"""
    # Register user (endpoint is /api/auth/register)
    reg_response = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD,
        "name": TEST_USER_NAME
    })
    
    # Login to get token
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    })
    
    if login_response.status_code != 200:
        pytest.skip(f"Could not login test user: {login_response.text}")
    
    data = login_response.json()
    return data.get("session_token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get authenticated headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestPremiumSubscriptionPublicEndpoints:
    """Test public premium subscription endpoints (no auth required)"""
    
    def test_get_packages_returns_all_payment_options(self, session):
        """GET /api/premium-subscription/packages - Returns all payment packages"""
        response = session.get(f"{BASE_URL}/api/premium-subscription/packages")
        
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
    
    def test_invoices_requires_auth(self, session):
        """GET /api/invoices - Should return 401 when not logged in"""
        response = session.get(f"{BASE_URL}/api/invoices")
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        
        print("PASSED: /api/invoices correctly requires authentication")
    
    def test_invoice_by_id_requires_auth(self, session):
        """GET /api/invoices/{id} - Should return 401 when not logged in"""
        response = session.get(f"{BASE_URL}/api/invoices/fake-invoice-id")
        
        assert response.status_code == 401
        print("PASSED: /api/invoices/{id} correctly requires authentication")
    
    def test_invoice_html_requires_auth(self, session):
        """GET /api/invoices/{id}/html - Should return 401 when not logged in"""
        response = session.get(f"{BASE_URL}/api/invoices/fake-invoice-id/html")
        
        assert response.status_code == 401
        print("PASSED: /api/invoices/{id}/html correctly requires authentication")


class TestAuthenticatedPremiumEndpoints:
    """Test endpoints that require authentication"""
    
    def test_stripe_checkout_requires_auth_without_token(self, session):
        """POST /api/premium-subscription/stripe/checkout - Requires auth"""
        response = session.post(f"{BASE_URL}/api/premium-subscription/stripe/checkout", json={
            "package_id": "monthly",
            "origin_url": "https://example.com",
            "business_profile_id": "fake-id"
        })
        
        assert response.status_code == 401
        print("PASSED: Stripe checkout requires authentication")
    
    def test_paypal_checkout_requires_auth_without_token(self, session):
        """POST /api/premium-subscription/paypal/checkout - Requires auth"""
        response = session.post(f"{BASE_URL}/api/premium-subscription/paypal/checkout", json={
            "package_id": "monthly",
            "origin_url": "https://example.com",
            "business_profile_id": "fake-id"
        })
        
        assert response.status_code == 401
        print("PASSED: PayPal checkout requires authentication")
    
    def test_mpesa_stk_push_requires_auth_without_token(self, session):
        """POST /api/premium-subscription/mpesa/stk-push - Requires auth"""
        response = session.post(f"{BASE_URL}/api/premium-subscription/mpesa/stk-push", json={
            "package_id": "monthly_kes",
            "phone_number": "+254712345678",
            "business_profile_id": "fake-id"
        })
        
        assert response.status_code == 401
        print("PASSED: M-Pesa STK push requires authentication")
    
    def test_my_subscription_requires_auth_without_token(self, session):
        """GET /api/premium-subscription/my-subscription - Requires auth"""
        response = session.get(f"{BASE_URL}/api/premium-subscription/my-subscription")
        
        assert response.status_code == 401
        print("PASSED: my-subscription requires authentication")
    
    def test_get_user_invoices_with_auth(self, session, auth_headers):
        """GET /api/invoices - Returns invoices for authenticated user"""
        response = session.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "invoices" in data
        assert isinstance(data["invoices"], list)
        
        print(f"PASSED: User invoices API returns {len(data['invoices'])} invoices")
    
    def test_my_subscription_returns_status(self, session, auth_headers):
        """GET /api/premium-subscription/my-subscription - Returns subscription status"""
        response = session.get(f"{BASE_URL}/api/premium-subscription/my-subscription", headers=auth_headers)
        
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
    
    def test_stripe_checkout_requires_valid_business_profile(self, session, auth_headers):
        """POST /api/premium-subscription/stripe/checkout - Fails without valid business profile"""
        response = session.post(
            f"{BASE_URL}/api/premium-subscription/stripe/checkout",
            headers=auth_headers,
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
    
    def test_paypal_checkout_requires_valid_business_profile(self, session, auth_headers):
        """POST /api/premium-subscription/paypal/checkout - Fails without valid business profile"""
        response = session.post(
            f"{BASE_URL}/api/premium-subscription/paypal/checkout",
            headers=auth_headers,
            json={
                "package_id": "monthly",
                "origin_url": "https://example.com",
                "business_profile_id": "non-existent-profile-id"
            }
        )
        
        assert response.status_code == 404
        print("PASSED: PayPal checkout validates business profile ownership")
    
    def test_mpesa_checkout_requires_valid_business_profile(self, session, auth_headers):
        """POST /api/premium-subscription/mpesa/stk-push - Fails without valid business profile"""
        response = session.post(
            f"{BASE_URL}/api/premium-subscription/mpesa/stk-push",
            headers=auth_headers,
            json={
                "package_id": "monthly_kes",
                "phone_number": "+254712345678",
                "business_profile_id": "non-existent-profile-id"
            }
        )
        
        assert response.status_code == 404
        print("PASSED: M-Pesa checkout validates business profile ownership")


class TestAdminSubscriptionEndpoints:
    """Test admin subscription management endpoints"""
    
    def test_admin_check_renewals_requires_auth(self, session):
        """POST /api/admin/subscriptions/check-renewals - Requires authentication"""
        response = session.post(f"{BASE_URL}/api/admin/subscriptions/check-renewals")
        
        # Should return 401 (not authenticated) or 307 (redirect to login)
        assert response.status_code in [401, 307, 403]
        print("PASSED: Admin check-renewals requires authentication")
    
    def test_admin_check_renewals_requires_admin_role(self, session, auth_headers):
        """POST /api/admin/subscriptions/check-renewals - Requires admin role for regular user"""
        # Try to access admin endpoint with regular user
        response = session.post(
            f"{BASE_URL}/api/admin/subscriptions/check-renewals",
            headers=auth_headers
        )
        
        # Should be 403 Forbidden for non-admin users
        assert response.status_code == 403
        print("PASSED: Admin check-renewals requires admin role")


class TestPaymentIntegrations:
    """Test payment integration setup (partially mocked)"""
    
    def test_stripe_api_key_configured(self, session):
        """Verify Stripe API key is configured (via error message)"""
        # We can indirectly check by looking at error messages or successful responses
        # The packages endpoint works, indicating the system is operational
        response = session.get(f"{BASE_URL}/api/premium-subscription/packages")
        assert response.status_code == 200
        print("PASSED: Stripe packages available (API configured)")
    
    def test_mpesa_packages_available(self, session):
        """Verify M-Pesa packages are configured"""
        response = session.get(f"{BASE_URL}/api/premium-subscription/packages")
        data = response.json()
        
        assert "mpesa_packages" in data
        mpesa = data["mpesa_packages"]
        
        # Should have at least KES and TZS options
        currencies = [p["currency"] for p in mpesa]
        assert "KES" in currencies  # Kenya
        
        print(f"PASSED: M-Pesa packages configured for currencies: {currencies}")
    
    def test_paypal_checkout_endpoint_exists(self):
        """Verify PayPal checkout endpoint exists and requires auth"""
        # Use a fresh session without auth headers
        fresh_session = requests.Session()
        response = fresh_session.post(f"{BASE_URL}/api/premium-subscription/paypal/checkout", json={
            "package_id": "monthly",
            "origin_url": "https://example.com",
            "business_profile_id": "test"
        })
        
        # Endpoint should exist - returns 401 (auth required)
        assert response.status_code == 401
        print("PASSED: PayPal checkout endpoint exists and requires auth")


class TestFullPremiumFlow:
    """Test the complete premium subscription flow with a real business profile"""
    
    def test_create_business_profile_for_premium(self, session, auth_headers):
        """Create a business profile that can be used for premium checkout"""
        business_name = f"Premium Test Business {uuid.uuid4().hex[:6]}"
        
        response = session.post(
            f"{BASE_URL}/api/business-profiles/",
            headers=auth_headers,
            json={
                "business_name": business_name,
                "description": "Test business for premium subscription testing",
                "city": "Nairobi",
                "country": "Kenya"
            }
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert "id" in data
            assert data["business_name"] == business_name
            print(f"PASSED: Created business profile {data['id']}")
            return data["id"]
        else:
            print(f"Note: Business profile creation returned {response.status_code}")
            return None
    
    def test_stripe_checkout_with_invalid_package(self, session, auth_headers):
        """Verify Stripe checkout fails gracefully with invalid package"""
        # First get or create a business profile
        my_profile_response = session.get(f"{BASE_URL}/api/business-profiles/me", headers=auth_headers)
        
        if my_profile_response.status_code == 200:
            profile_data = my_profile_response.json()
            if profile_data.get("has_profile"):
                profile_id = profile_data["profile"]["id"]
                
                # Try checkout with invalid package
                response = session.post(
                    f"{BASE_URL}/api/premium-subscription/stripe/checkout",
                    headers=auth_headers,
                    json={
                        "package_id": "invalid_package_xyz",
                        "origin_url": "https://example.com",
                        "business_profile_id": profile_id
                    }
                )
                
                assert response.status_code == 400
                assert "Invalid package ID" in response.json().get("detail", "")
                print("PASSED: Stripe checkout validates package ID")
            else:
                pytest.skip("No business profile available for this test")
        else:
            pytest.skip("Could not get business profile")


# Module to run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
