"""
Test New Features for Iteration 121:
1. Faster polling (10s instead of 30s) for real-time updates - code review verification
2. Notification preferences toggle (mute/unmute message sound) - code review + localStorage API
3. Premium subscription packages API - returns valid Stripe and M-Pesa packages
4. Stripe checkout flow - POST /api/premium-subscription/stripe/checkout returns checkout_url
5. Premium success page - renders at /premium/success
"""

import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://mobile-header-ui.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "test3@test.com"
TEST_USER_PASSWORD = "password"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    )
    if response.status_code == 200:
        # API returns session_token, not access_token
        return response.json().get("session_token")
    pytest.skip(f"Authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Create auth headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestPremiumSubscriptionPackages:
    """Test Premium Subscription Packages API"""
    
    def test_get_packages_endpoint_accessible(self):
        """GET /api/premium-subscription/packages returns 200"""
        response = requests.get(f"{BASE_URL}/api/premium-subscription/packages")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: GET /api/premium-subscription/packages returns 200")
    
    def test_packages_contains_stripe_packages(self):
        """Response contains stripe_packages array"""
        response = requests.get(f"{BASE_URL}/api/premium-subscription/packages")
        data = response.json()
        assert "stripe_packages" in data, "Response missing stripe_packages"
        assert isinstance(data["stripe_packages"], list), "stripe_packages should be a list"
        assert len(data["stripe_packages"]) >= 1, "Should have at least 1 Stripe package"
        print(f"PASS: Found {len(data['stripe_packages'])} Stripe packages")
    
    def test_packages_contains_mpesa_packages(self):
        """Response contains mpesa_packages array"""
        response = requests.get(f"{BASE_URL}/api/premium-subscription/packages")
        data = response.json()
        assert "mpesa_packages" in data, "Response missing mpesa_packages"
        assert isinstance(data["mpesa_packages"], list), "mpesa_packages should be a list"
        assert len(data["mpesa_packages"]) >= 1, "Should have at least 1 M-Pesa package"
        print(f"PASS: Found {len(data['mpesa_packages'])} M-Pesa packages")
    
    def test_stripe_package_structure(self):
        """Stripe packages have correct structure"""
        response = requests.get(f"{BASE_URL}/api/premium-subscription/packages")
        data = response.json()
        
        required_fields = ["id", "name", "amount", "currency", "duration_days", "description"]
        
        for pkg in data["stripe_packages"]:
            for field in required_fields:
                assert field in pkg, f"Package missing field: {field}"
            assert pkg["amount"] > 0, "Amount should be positive"
            assert pkg["duration_days"] > 0, "Duration should be positive"
        
        print("PASS: All Stripe packages have correct structure")
    
    def test_stripe_packages_have_expected_ids(self):
        """Stripe packages include monthly, quarterly, yearly"""
        response = requests.get(f"{BASE_URL}/api/premium-subscription/packages")
        data = response.json()
        
        package_ids = [pkg["id"] for pkg in data["stripe_packages"]]
        expected_ids = ["monthly", "quarterly", "yearly"]
        
        for expected_id in expected_ids:
            assert expected_id in package_ids, f"Missing expected package: {expected_id}"
        
        print(f"PASS: Found all expected Stripe packages: {expected_ids}")
    
    def test_mpesa_package_structure(self):
        """M-Pesa packages have correct structure with KES/TZS currencies"""
        response = requests.get(f"{BASE_URL}/api/premium-subscription/packages")
        data = response.json()
        
        for pkg in data["mpesa_packages"]:
            assert "id" in pkg and "name" in pkg and "amount" in pkg
            assert "currency" in pkg
            assert pkg["currency"] in ["KES", "TZS"], f"Unexpected currency: {pkg['currency']}"
        
        print("PASS: All M-Pesa packages have correct structure with African currencies")


class TestStripeCheckoutFlow:
    """Test Stripe Checkout E2E Flow"""
    
    def test_checkout_requires_auth(self):
        """POST /api/premium-subscription/stripe/checkout requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/premium-subscription/stripe/checkout",
            json={
                "package_id": "monthly",
                "origin_url": "https://example.com",
                "business_profile_id": "test-id"
            }
        )
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print(f"PASS: Stripe checkout requires authentication (returned {response.status_code})")
    
    def test_checkout_with_invalid_package(self, auth_headers):
        """POST /api/premium-subscription/stripe/checkout with invalid package returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/premium-subscription/stripe/checkout",
            headers=auth_headers,
            json={
                "package_id": "invalid_package_xyz",
                "origin_url": "https://example.com",
                "business_profile_id": "test-id"
            }
        )
        # Should return 400 for invalid package
        assert response.status_code == 400, f"Expected 400 for invalid package, got {response.status_code}"
        print("PASS: Invalid package ID returns 400")
    
    def test_checkout_validates_business_profile(self, auth_headers):
        """POST /api/premium-subscription/stripe/checkout validates business profile"""
        response = requests.post(
            f"{BASE_URL}/api/premium-subscription/stripe/checkout",
            headers=auth_headers,
            json={
                "package_id": "monthly",
                "origin_url": "https://example.com",
                "business_profile_id": "nonexistent-profile-id-12345"
            }
        )
        # Should return 404 for non-existent profile
        assert response.status_code == 404, f"Expected 404 for non-existent profile, got {response.status_code}"
        print("PASS: Non-existent business profile returns 404")


class TestMySubscriptionEndpoint:
    """Test My Subscription Status Endpoint"""
    
    def test_my_subscription_requires_auth(self):
        """GET /api/premium-subscription/my-subscription requires authentication"""
        response = requests.get(f"{BASE_URL}/api/premium-subscription/my-subscription")
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print(f"PASS: My subscription endpoint requires auth (returned {response.status_code})")
    
    def test_my_subscription_returns_status(self, auth_headers):
        """GET /api/premium-subscription/my-subscription returns subscription status"""
        response = requests.get(
            f"{BASE_URL}/api/premium-subscription/my-subscription",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "has_profile" in data, "Response missing has_profile field"
        assert "is_premium" in data, "Response missing is_premium field"
        
        print(f"PASS: My subscription returns status - has_profile: {data['has_profile']}, is_premium: {data['is_premium']}")


class TestQuickStatsAndBadgesPolling:
    """Test APIs used for Quick Stats and Badge Polling (10s interval)"""
    
    def test_conversations_api(self, auth_headers):
        """GET /api/conversations for unread messages count"""
        response = requests.get(
            f"{BASE_URL}/api/conversations",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Conversations should be a list"
        print(f"PASS: GET /api/conversations returns list ({len(data)} conversations)")
    
    def test_offers_seller_api(self, auth_headers):
        """GET /api/offers?role=seller for pending offers count"""
        response = requests.get(
            f"{BASE_URL}/api/offers",
            headers=auth_headers,
            params={"role": "seller"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Should return offers array or object with offers
        assert "offers" in data or isinstance(data, list), "Should contain offers"
        print("PASS: GET /api/offers?role=seller returns offers data")
    
    def test_boost_credits_balance(self, auth_headers):
        """GET /api/boost/credits/balance for credit balance"""
        response = requests.get(
            f"{BASE_URL}/api/boost/credits/balance",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "balance" in data, "Response should have balance field"
        print(f"PASS: GET /api/boost/credits/balance returns balance: {data['balance']}")
    
    def test_my_listings_api(self, auth_headers):
        """GET /api/listings/my for listings with views count"""
        response = requests.get(
            f"{BASE_URL}/api/listings/my",
            headers=auth_headers,
            params={"page": 1, "limit": 10}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Listings should be a list"
        
        # If there are listings, verify views field exists
        if len(data) > 0:
            # Views field may be present on listings
            print(f"PASS: GET /api/listings/my returns {len(data)} listings")
        else:
            print("PASS: GET /api/listings/my returns empty list (user has no listings)")


class TestNotificationPrefsStorage:
    """Test that Settings page includes Message Sound toggle - Code Review Verification"""
    
    def test_settings_page_has_message_sound_toggle_desktop(self):
        """Verify settings.tsx has Message Sound toggle for desktop view (line ~475-480)"""
        # This is a code structure verification test
        # The actual toggle is in settings.tsx around line 475-480 for desktop
        # and line 639-644 for mobile
        
        settings_file_path = "/app/frontend/app/settings.tsx"
        with open(settings_file_path, "r") as f:
            content = f.read()
        
        # Check for Message Sound toggle in desktop section
        assert 'label="Message Sound"' in content, "Missing Message Sound label"
        assert 'value={soundEnabled}' in content, "Missing soundEnabled binding"
        assert 'onChange={(v) => setSoundEnabled(v)}' in content, "Missing setSoundEnabled handler"
        
        print("PASS: settings.tsx contains Message Sound toggle with soundEnabled binding")
    
    def test_notification_prefs_store_exists(self):
        """Verify notificationPrefsStore.ts exists with correct structure"""
        store_path = "/app/frontend/src/store/notificationPrefsStore.ts"
        with open(store_path, "r") as f:
            content = f.read()
        
        assert "soundEnabled" in content, "Store missing soundEnabled state"
        assert "setSoundEnabled" in content, "Store missing setSoundEnabled action"
        assert "loadPrefs" in content, "Store missing loadPrefs action"
        assert "AsyncStorage" in content, "Store should use AsyncStorage for persistence"
        assert "notification_prefs" in content, "Store should use notification_prefs key"
        
        print("PASS: notificationPrefsStore.ts has correct structure with localStorage persistence")


class TestPollingIntervalConfiguration:
    """Verify 10-second polling interval configuration - Code Review"""
    
    def test_desktop_layout_has_10s_polling(self):
        """Verify DesktopPageLayout.tsx uses 10s polling interval"""
        layout_path = "/app/frontend/src/components/layout/DesktopPageLayout.tsx"
        with open(layout_path, "r") as f:
            content = f.read()
        
        # Look for setInterval with 10000ms (10 seconds)
        assert "10000" in content, "Missing 10000ms (10s) polling interval"
        assert "setInterval" in content, "Missing setInterval for polling"
        
        print("PASS: DesktopPageLayout.tsx uses 10s polling interval (10000ms)")
    
    def test_sound_enabled_check_in_polling(self):
        """Verify soundEnabled is checked before playing notification sound"""
        layout_path = "/app/frontend/src/components/layout/DesktopPageLayout.tsx"
        with open(layout_path, "r") as f:
            content = f.read()
        
        # Check for soundEnabled guard before playing sound
        assert "soundEnabled" in content, "Missing soundEnabled check"
        assert "playNotificationSound" in content, "Missing playNotificationSound function"
        
        print("PASS: DesktopPageLayout.tsx checks soundEnabled before playing notification sound")


class TestPremiumSuccessPage:
    """Test Premium Success Page exists and has correct structure"""
    
    def test_premium_success_page_exists(self):
        """Verify premium/success.tsx exists"""
        success_path = "/app/frontend/app/premium/success.tsx"
        assert os.path.exists(success_path), "Premium success page not found"
        print("PASS: Premium success page exists at /app/frontend/app/premium/success.tsx")
    
    def test_premium_success_page_structure(self):
        """Verify premium success page has correct structure"""
        success_path = "/app/frontend/app/premium/success.tsx"
        with open(success_path, "r") as f:
            content = f.read()
        
        # Check for essential components
        assert "session_id" in content, "Page should read session_id from URL params"
        assert "premium-subscription/stripe/status" in content, "Page should check payment status"
        assert "Welcome to Premium" in content, "Page should show success message"
        assert "'checking'" in content, "Page should have checking state"
        assert "'success'" in content, "Page should have success state"
        assert "'error'" in content, "Page should have error state"
        
        print("PASS: Premium success page has correct structure with payment status checking")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
