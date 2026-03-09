"""
Test suite for Seller Analytics - Badges and Notifications endpoints
Tests the new endpoints added in the patch:
- GET /api/analytics/badges/my-badges - Get badges for a seller
- POST /api/analytics/badges/mark-viewed - Mark badges as viewed
- POST /api/analytics/badges/evaluate - Evaluate and award badges
- GET /api/notifications/seller - Get seller notifications
- PUT /api/notifications/seller - Mark notifications as read
- POST /api/notifications/register-push - Register FCM token
- DELETE /api/notifications/register-push - Unregister FCM token
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://offer-hub-beta.preview.emergentagent.com')

# Test credentials
DEMO_EMAIL = "demo@avida.com"
DEMO_PASSWORD = "Demo@123"
DEMO_USER_ID = "user_917eeb578097"

class TestAuthHelper:
    """Helper class for authentication"""
    
    @staticmethod
    def get_session_token():
        """Login and return session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"},
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("session_token")
        return None


@pytest.fixture(scope="module")
def session_token():
    """Get session token for authenticated requests"""
    token = TestAuthHelper.get_session_token()
    if not token:
        pytest.skip("Authentication failed - cannot get session token")
    return token


@pytest.fixture(scope="module")
def auth_headers(session_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {session_token}",
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json"
    }


# =============================================================================
# BADGE ENDPOINTS TESTS
# =============================================================================

class TestSellerBadgesAPI:
    """Tests for /api/analytics/badges/* endpoints"""
    
    def test_get_my_badges_success(self, auth_headers):
        """Test GET /api/analytics/badges/my-badges returns badges list"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/badges/my-badges",
            headers=auth_headers,
            params={"seller_id": DEMO_USER_ID}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "seller_id" in data
        assert "badges" in data
        assert "earned_count" in data
        assert "total_available" in data
        assert "unviewed_count" in data
        
        # Validate data types
        assert isinstance(data["badges"], list)
        assert isinstance(data["earned_count"], int)
        assert isinstance(data["total_available"], int)
        
        # Check badge structure if any badges exist
        if data["badges"]:
            badge = data["badges"][0]
            assert "id" in badge
            assert "name" in badge
            assert "earned" in badge
            assert "tier" in badge
        
        print(f"✓ GET my-badges success: {data['earned_count']} earned, {data['total_available']} total")
    
    def test_get_my_badges_requires_auth(self):
        """Test GET /api/analytics/badges/my-badges requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/badges/my-badges",
            headers={"User-Agent": "Mozilla/5.0"},
            params={"seller_id": DEMO_USER_ID}
        )
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ GET my-badges correctly requires authentication")
    
    def test_get_my_badges_requires_seller_id(self, auth_headers):
        """Test GET /api/analytics/badges/my-badges requires seller_id param"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/badges/my-badges",
            headers=auth_headers
        )
        
        assert response.status_code == 422, f"Expected 422 without seller_id, got {response.status_code}"
        print("✓ GET my-badges correctly requires seller_id parameter")
    
    def test_mark_badges_viewed_success(self, auth_headers):
        """Test POST /api/analytics/badges/mark-viewed"""
        response = requests.post(
            f"{BASE_URL}/api/analytics/badges/mark-viewed",
            headers=auth_headers,
            json={"seller_id": DEMO_USER_ID}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        assert "updated" in data
        
        print(f"✓ POST mark-badges-viewed success: {data['updated']} badges updated")
    
    def test_mark_specific_badges_viewed(self, auth_headers):
        """Test POST /api/analytics/badges/mark-viewed with specific badge_ids"""
        response = requests.post(
            f"{BASE_URL}/api/analytics/badges/mark-viewed",
            headers=auth_headers,
            json={
                "seller_id": DEMO_USER_ID,
                "badge_ids": ["first_listing", "top_seller"]
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        print(f"✓ POST mark-specific-badges-viewed success: {data['updated']} updated")
    
    def test_evaluate_badges_success(self, auth_headers):
        """Test POST /api/analytics/badges/evaluate awards badges"""
        response = requests.post(
            f"{BASE_URL}/api/analytics/badges/evaluate",
            headers=auth_headers,
            json={"seller_id": DEMO_USER_ID}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        assert "badges_awarded" in data
        assert isinstance(data["badges_awarded"], int)
        
        print(f"✓ POST evaluate-badges success: {data['badges_awarded']} badges awarded")


# =============================================================================
# NOTIFICATION ENDPOINTS TESTS
# =============================================================================

class TestSellerNotificationsAPI:
    """Tests for /api/notifications/seller endpoints"""
    
    def test_get_notifications_success(self, auth_headers):
        """Test GET /api/notifications/seller returns notifications"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/seller",
            headers=auth_headers,
            params={"user_id": DEMO_USER_ID}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "notifications" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert "unread_count" in data
        assert "has_more" in data
        
        # Validate data types
        assert isinstance(data["notifications"], list)
        assert isinstance(data["total"], int)
        assert isinstance(data["unread_count"], int)
        
        print(f"✓ GET notifications success: {data['total']} total, {data['unread_count']} unread")
    
    def test_get_notifications_with_pagination(self, auth_headers):
        """Test GET /api/notifications/seller with pagination params"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/seller",
            headers=auth_headers,
            params={"user_id": DEMO_USER_ID, "page": 1, "limit": 5}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["page"] == 1
        assert data["limit"] == 5
        assert len(data["notifications"]) <= 5
        
        print(f"✓ GET notifications pagination works: page={data['page']}, limit={data['limit']}")
    
    def test_get_notifications_filter_by_type(self, auth_headers):
        """Test GET /api/notifications/seller with type filter"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/seller",
            headers=auth_headers,
            params={"user_id": DEMO_USER_ID, "type": "engagement_spike"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET notifications with type filter works")
    
    def test_get_notifications_requires_user_id(self, auth_headers):
        """Test GET /api/notifications/seller requires user_id param"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/seller",
            headers=auth_headers
        )
        
        assert response.status_code == 422, f"Expected 422 without user_id, got {response.status_code}"
        print("✓ GET notifications correctly requires user_id parameter")
    
    def test_mark_notification_read_success(self, auth_headers):
        """Test PUT /api/notifications/seller marks notifications as read"""
        # First, mark all as read
        response = requests.put(
            f"{BASE_URL}/api/notifications/seller",
            headers=auth_headers,
            json={"user_id": DEMO_USER_ID, "mark_all": True}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        assert "updated" in data
        
        print(f"✓ PUT mark-all-read success: {data['updated']} notifications updated")
    
    def test_mark_notification_requires_params(self, auth_headers):
        """Test PUT /api/notifications/seller requires notification_id or mark_all"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/seller",
            headers=auth_headers,
            json={"user_id": DEMO_USER_ID}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        print("✓ PUT notifications correctly requires notification_id or mark_all")


# =============================================================================
# PUSH TOKEN ENDPOINTS TESTS
# =============================================================================

class TestPushNotificationAPI:
    """Tests for /api/notifications/register-push endpoints"""
    
    def test_register_push_token_success(self):
        """Test POST /api/notifications/register-push registers FCM token"""
        test_fcm_token = f"test_fcm_token_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/notifications/register-push",
            headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"},
            json={
                "user_id": DEMO_USER_ID,
                "fcm_token": test_fcm_token,
                "device_info": {"platform": "web", "browser": "chrome"}
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        
        print(f"✓ POST register-push success: token registered")
        return test_fcm_token
    
    def test_register_push_token_requires_fields(self):
        """Test POST /api/notifications/register-push requires user_id and fcm_token"""
        # Missing user_id
        response = requests.post(
            f"{BASE_URL}/api/notifications/register-push",
            headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"},
            json={"fcm_token": "test_token"}
        )
        
        assert response.status_code == 400, f"Expected 400 without user_id, got {response.status_code}"
        
        # Missing fcm_token
        response = requests.post(
            f"{BASE_URL}/api/notifications/register-push",
            headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"},
            json={"user_id": DEMO_USER_ID}
        )
        
        assert response.status_code == 400, f"Expected 400 without fcm_token, got {response.status_code}"
        
        print("✓ POST register-push correctly requires user_id and fcm_token")
    
    def test_unregister_push_token_success(self):
        """Test DELETE /api/notifications/register-push unregisters FCM token"""
        # First register a token
        test_fcm_token = f"test_fcm_delete_{uuid.uuid4().hex[:8]}"
        
        requests.post(
            f"{BASE_URL}/api/notifications/register-push",
            headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"},
            json={
                "user_id": DEMO_USER_ID,
                "fcm_token": test_fcm_token
            }
        )
        
        # Now unregister
        response = requests.delete(
            f"{BASE_URL}/api/notifications/register-push",
            headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"},
            json={"fcm_token": test_fcm_token}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        
        print("✓ DELETE unregister-push success")
    
    def test_unregister_push_token_requires_fcm_token(self):
        """Test DELETE /api/notifications/register-push requires fcm_token"""
        response = requests.delete(
            f"{BASE_URL}/api/notifications/register-push",
            headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"},
            json={}
        )
        
        assert response.status_code == 400, f"Expected 400 without fcm_token, got {response.status_code}"
        print("✓ DELETE unregister-push correctly requires fcm_token")


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
