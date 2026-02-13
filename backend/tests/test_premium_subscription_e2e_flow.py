"""
E2E Premium Subscription Flow Tests
Complete subscription journey: view packages, create checkout session, check status
Tests actual Stripe integration with test credentials
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://admin-portal-358.preview.emergentagent.com')

# Use existing test credentials
TEST_USER_EMAIL = "testuser@test.com"
TEST_USER_PASSWORD = "password"

# Alternative admin user
ADMIN_USER_EMAIL = "test3@test.com"
ADMIN_USER_PASSWORD = "password"


@pytest.fixture(scope="module")
def session():
    """Create requests session"""
    return requests.Session()


@pytest.fixture(scope="module")
def auth_token(session):
    """Login with existing test user"""
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


@pytest.fixture(scope="module")
def admin_token(session):
    """Login with admin user"""
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_USER_EMAIL,
        "password": ADMIN_USER_PASSWORD
    })
    
    if login_response.status_code != 200:
        pytest.skip(f"Could not login admin user: {login_response.text}")
    
    data = login_response.json()
    return data.get("session_token")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Get admin authenticated headers"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestPackagesEndpoint:
    """Test GET /api/premium-subscription/packages"""
    
    def test_packages_returns_stripe_packages(self, session):
        """Verify all Stripe packages are returned with correct structure"""
        response = session.get(f"{BASE_URL}/api/premium-subscription/packages")
        
        assert response.status_code == 200, f"Packages endpoint failed: {response.text}"
        data = response.json()
        
        # Verify Stripe packages structure
        assert "stripe_packages" in data
        stripe_packages = data["stripe_packages"]
        assert len(stripe_packages) == 3, "Expected 3 Stripe packages (monthly, quarterly, yearly)"
        
        # Validate monthly package
        monthly = next((p for p in stripe_packages if p["id"] == "monthly"), None)
        assert monthly is not None, "Monthly package not found"
        assert monthly["amount"] == 29.99
        assert monthly["currency"] == "usd"
        assert monthly["duration_days"] == 30
        assert "description" in monthly
        
        # Validate quarterly package
        quarterly = next((p for p in stripe_packages if p["id"] == "quarterly"), None)
        assert quarterly is not None, "Quarterly package not found"
        assert quarterly["amount"] == 79.99
        assert quarterly["duration_days"] == 90
        
        # Validate yearly package
        yearly = next((p for p in stripe_packages if p["id"] == "yearly"), None)
        assert yearly is not None, "Yearly package not found"
        assert yearly["amount"] == 249.99
        assert yearly["duration_days"] == 365
        
        print(f"PASSED: All 3 Stripe packages validated with correct pricing and duration")
    
    def test_packages_returns_mpesa_packages(self, session):
        """Verify M-Pesa packages for African markets"""
        response = session.get(f"{BASE_URL}/api/premium-subscription/packages")
        data = response.json()
        
        assert "mpesa_packages" in data
        mpesa_packages = data["mpesa_packages"]
        assert len(mpesa_packages) >= 1, "Expected at least 1 M-Pesa package"
        
        # Check Kenya Shilling package
        kes_pkg = next((p for p in mpesa_packages if p["currency"] == "KES"), None)
        assert kes_pkg is not None, "KES (Kenya) M-Pesa package not found"
        assert kes_pkg["amount"] == 3500
        assert kes_pkg["duration_days"] == 30
        
        print(f"PASSED: M-Pesa packages validated: {[p['currency'] for p in mpesa_packages]}")


class TestMySubscriptionEndpoint:
    """Test GET /api/premium-subscription/my-subscription"""
    
    def test_my_subscription_returns_premium_status(self, session, auth_headers):
        """Verify my-subscription returns user's premium status"""
        response = session.get(
            f"{BASE_URL}/api/premium-subscription/my-subscription",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"my-subscription failed: {response.text}"
        data = response.json()
        
        # Response should indicate profile status
        assert "is_premium" in data
        
        if data.get("has_profile"):
            assert "profile_id" in data
            assert "is_verified" in data
            assert "verification_tier" in data
            print(f"PASSED: User has business profile, is_premium={data['is_premium']}")
        else:
            assert data["has_profile"] == False
            assert data["is_premium"] == False
            print("PASSED: User has no business profile, is_premium=False")


class TestStripeCheckoutFlow:
    """Test POST /api/premium-subscription/stripe/checkout and status"""
    
    @pytest.fixture
    def business_profile_id(self, session, auth_headers):
        """Get or create a business profile for checkout testing"""
        # First check if user already has a profile
        my_profile = session.get(f"{BASE_URL}/api/business-profiles/me", headers=auth_headers)
        
        if my_profile.status_code == 200:
            profile_data = my_profile.json()
            if profile_data.get("has_profile"):
                return profile_data["profile"]["id"]
        
        # Create a new profile if needed
        create_response = session.post(
            f"{BASE_URL}/api/business-profiles/",
            headers=auth_headers,
            json={
                "business_name": f"E2E Test Business {uuid.uuid4().hex[:6]}",
                "description": "Test business for Stripe checkout E2E testing",
                "city": "Test City",
                "country": "Kenya"
            }
        )
        
        if create_response.status_code in [200, 201]:
            return create_response.json()["id"]
        
        pytest.skip("Could not get or create business profile")
    
    def test_stripe_checkout_creates_session(self, session, auth_headers, business_profile_id):
        """Test creating a Stripe checkout session"""
        response = session.post(
            f"{BASE_URL}/api/premium-subscription/stripe/checkout",
            headers=auth_headers,
            json={
                "package_id": "monthly",
                "origin_url": BASE_URL,
                "business_profile_id": business_profile_id
            }
        )
        
        # The response depends on whether the business is already premium
        if response.status_code == 400 and "already premium" in response.json().get("detail", "").lower():
            print("Note: Business profile is already premium, skipping checkout test")
            pytest.skip("Business already premium")
        
        if response.status_code == 500:
            # Payment system might not be fully configured in test env
            error_detail = response.json().get("detail", "")
            if "Payment system not configured" in error_detail:
                print(f"Note: {error_detail}")
                pytest.skip("Payment system not configured")
        
        assert response.status_code == 200, f"Stripe checkout failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "checkout_url" in data, "Missing checkout_url in response"
        assert "session_id" in data, "Missing session_id in response"
        assert "package" in data, "Missing package in response"
        
        # Validate checkout URL is a valid Stripe URL
        checkout_url = data["checkout_url"]
        assert checkout_url.startswith("https://checkout.stripe.com"), f"Invalid checkout URL: {checkout_url}"
        
        # Validate package info is returned
        package = data["package"]
        assert package["id"] == "monthly"
        assert package["amount"] == 29.99
        
        print(f"PASSED: Stripe checkout session created: {data['session_id'][:20]}...")
        return data["session_id"]
    
    def test_stripe_status_check_for_invalid_session(self, session, auth_headers):
        """Test checking status for non-existent session"""
        response = session.get(
            f"{BASE_URL}/api/premium-subscription/stripe/status/fake_session_123",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404 for fake session: {response.text}"
        print("PASSED: Stripe status returns 404 for non-existent session")
    
    def test_stripe_checkout_validates_package_id(self, session, auth_headers, business_profile_id):
        """Test that invalid package IDs are rejected"""
        response = session.post(
            f"{BASE_URL}/api/premium-subscription/stripe/checkout",
            headers=auth_headers,
            json={
                "package_id": "invalid_package",
                "origin_url": BASE_URL,
                "business_profile_id": business_profile_id
            }
        )
        
        # Check if already premium first
        if response.status_code == 400 and "already premium" in response.json().get("detail", "").lower():
            pytest.skip("Business already premium")
        
        assert response.status_code == 400, f"Expected 400 for invalid package: {response.text}"
        assert "Invalid package ID" in response.json().get("detail", "")
        print("PASSED: Stripe checkout rejects invalid package IDs")


class TestPayPalCheckoutFlow:
    """Test POST /api/premium-subscription/paypal/checkout"""
    
    @pytest.fixture
    def business_profile_id(self, session, auth_headers):
        """Get or create a business profile for checkout testing"""
        my_profile = session.get(f"{BASE_URL}/api/business-profiles/me", headers=auth_headers)
        
        if my_profile.status_code == 200:
            profile_data = my_profile.json()
            if profile_data.get("has_profile"):
                return profile_data["profile"]["id"]
        
        create_response = session.post(
            f"{BASE_URL}/api/business-profiles/",
            headers=auth_headers,
            json={
                "business_name": f"PayPal Test Business {uuid.uuid4().hex[:6]}",
                "description": "Test business for PayPal checkout",
                "city": "Nairobi",
                "country": "Kenya"
            }
        )
        
        if create_response.status_code in [200, 201]:
            return create_response.json()["id"]
        
        pytest.skip("Could not get or create business profile")
    
    def test_paypal_checkout_creates_transaction(self, session, auth_headers, business_profile_id):
        """Test PayPal checkout creates a pending transaction"""
        response = session.post(
            f"{BASE_URL}/api/premium-subscription/paypal/checkout",
            headers=auth_headers,
            json={
                "package_id": "monthly",
                "origin_url": BASE_URL,
                "business_profile_id": business_profile_id
            }
        )
        
        if response.status_code == 404:
            pytest.skip("Business profile not found")
        
        assert response.status_code == 200, f"PayPal checkout failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "transaction_id" in data, "Missing transaction_id"
        assert "paypal_client_id" in data, "Missing paypal_client_id"
        assert "amount" in data, "Missing amount"
        assert "currency" in data, "Missing currency"
        assert "package" in data, "Missing package"
        
        # Validate amount matches package
        assert data["amount"] == 29.99
        assert data["currency"] == "USD"
        
        print(f"PASSED: PayPal checkout created transaction: {data['transaction_id'][:8]}...")
    
    def test_paypal_checkout_validates_package_id(self, session, auth_headers, business_profile_id):
        """Test that PayPal rejects invalid package IDs"""
        response = session.post(
            f"{BASE_URL}/api/premium-subscription/paypal/checkout",
            headers=auth_headers,
            json={
                "package_id": "invalid_package",
                "origin_url": BASE_URL,
                "business_profile_id": business_profile_id
            }
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid package: {response.text}"
        print("PASSED: PayPal checkout rejects invalid package IDs")


class TestMPesaCheckoutFlow:
    """Test POST /api/premium-subscription/mpesa/stk-push"""
    
    @pytest.fixture
    def business_profile_id(self, session, auth_headers):
        """Get business profile for M-Pesa testing"""
        my_profile = session.get(f"{BASE_URL}/api/business-profiles/me", headers=auth_headers)
        
        if my_profile.status_code == 200:
            profile_data = my_profile.json()
            if profile_data.get("has_profile"):
                return profile_data["profile"]["id"]
        
        pytest.skip("No business profile for M-Pesa test")
    
    def test_mpesa_stk_push_initiates_payment(self, session, auth_headers, business_profile_id):
        """Test M-Pesa STK push initiation"""
        response = session.post(
            f"{BASE_URL}/api/premium-subscription/mpesa/stk-push",
            headers=auth_headers,
            json={
                "package_id": "monthly_kes",
                "phone_number": "+254712345678",
                "business_profile_id": business_profile_id
            }
        )
        
        if response.status_code == 404:
            pytest.skip("Business profile not found")
        
        assert response.status_code == 200, f"M-Pesa STK push failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "transaction_id" in data, "Missing transaction_id"
        assert "status" in data, "Missing status"
        assert data["status"] == "stk_sent", f"Unexpected status: {data['status']}"
        assert "message" in data, "Missing message"
        assert "package" in data, "Missing package"
        
        print(f"PASSED: M-Pesa STK push initiated: {data['transaction_id'][:8]}...")
    
    def test_mpesa_validates_package_id(self, session, auth_headers, business_profile_id):
        """Test M-Pesa rejects non-M-Pesa package IDs"""
        response = session.post(
            f"{BASE_URL}/api/premium-subscription/mpesa/stk-push",
            headers=auth_headers,
            json={
                "package_id": "monthly",  # Stripe package, not M-Pesa
                "phone_number": "+254712345678",
                "business_profile_id": business_profile_id
            }
        )
        
        assert response.status_code == 400, f"Expected 400 for non-M-Pesa package: {response.text}"
        print("PASSED: M-Pesa rejects non-M-Pesa package IDs")


class TestInvoiceAPIEndpoints:
    """Test invoice API endpoints"""
    
    def test_get_invoices_returns_list(self, session, auth_headers):
        """Test GET /api/invoices returns user's invoices"""
        response = session.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        
        assert response.status_code == 200, f"Get invoices failed: {response.text}"
        data = response.json()
        
        assert "invoices" in data, "Missing invoices key"
        assert isinstance(data["invoices"], list), "Invoices should be a list"
        
        print(f"PASSED: User has {len(data['invoices'])} invoice(s)")
    
    def test_get_invoice_by_id_not_found(self, session, auth_headers):
        """Test GET /api/invoices/{id} returns 404 for non-existent invoice"""
        response = session.get(
            f"{BASE_URL}/api/invoices/non-existent-invoice-id",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404: {response.text}"
        print("PASSED: Invoice not found returns 404")
    
    def test_create_invoice_for_invalid_transaction(self, session, auth_headers):
        """Test POST /api/invoices/create/{transaction_id} for invalid transaction"""
        response = session.post(
            f"{BASE_URL}/api/invoices/create/fake-transaction-id",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404: {response.text}"
        print("PASSED: Create invoice returns 404 for invalid transaction")


class TestErrorHandling:
    """Test error handling for edge cases"""
    
    def test_checkout_without_business_profile(self, session, auth_headers):
        """Test that checkout fails gracefully without valid profile"""
        response = session.post(
            f"{BASE_URL}/api/premium-subscription/stripe/checkout",
            headers=auth_headers,
            json={
                "package_id": "monthly",
                "origin_url": BASE_URL,
                "business_profile_id": "non-existent-profile-123"
            }
        )
        
        assert response.status_code == 404, f"Expected 404: {response.text}"
        assert "Business profile not found" in response.json().get("detail", "")
        print("PASSED: Checkout returns 404 for invalid business profile")
    
    def test_stripe_status_without_auth(self, session):
        """Test status endpoint requires authentication (returns 401 or 404)"""
        response = session.get(f"{BASE_URL}/api/premium-subscription/stripe/status/test-session")
        
        # Endpoint should return 401 (auth required) or 404 (transaction not found)
        # Both are acceptable - the important thing is no data is leaked
        assert response.status_code in [401, 404], f"Expected 401/404: {response.text}"
        print(f"PASSED: Stripe status returns {response.status_code} for unauthenticated request")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
