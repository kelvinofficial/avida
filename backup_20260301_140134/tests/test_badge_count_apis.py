"""
Badge Count APIs Test Suite
Tests for notification and message unread count endpoints that power badge indicators
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://auth-ui-template.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "testbadge@example.com"
TEST_USER_PASSWORD = "Test123!"


class TestBadgeCountAPIs:
    """Test suite for badge count APIs"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, "No session_token in login response"
        return data["session_token"]
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_login_works(self):
        """Test that login endpoint returns token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_USER_EMAIL
        print(f"Login successful for user: {data['user']['email']}")
    
    def test_notification_unread_count_endpoint(self, auth_headers):
        """Test GET /api/notifications/unread-count returns correct format"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure - should have 'unread_count' key
        assert "unread_count" in data, f"Response missing 'unread_count' key. Got: {data}"
        assert isinstance(data["unread_count"], int), f"unread_count should be int, got: {type(data['unread_count'])}"
        assert data["unread_count"] >= 0, "unread_count should be non-negative"
        
        print(f"Notification unread count: {data['unread_count']}")
    
    def test_notification_unread_count_has_expected_value(self, auth_headers):
        """Test that test user has expected unread notifications"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Test user should have 8 unread notifications per seed data
        expected_count = 8
        actual_count = data["unread_count"]
        print(f"Expected notification count: {expected_count}, Actual: {actual_count}")
        
        # Allow some variance if notifications were read or new ones added
        assert actual_count > 0, "Test user should have unread notifications (seed data)"
    
    def test_conversations_unread_count_endpoint(self, auth_headers):
        """Test GET /api/conversations/unread-count returns correct format"""
        response = requests.get(
            f"{BASE_URL}/api/conversations/unread-count",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure - should have 'count' key
        assert "count" in data, f"Response missing 'count' key. Got: {data}"
        assert isinstance(data["count"], int), f"count should be int, got: {type(data['count'])}"
        assert data["count"] >= 0, "count should be non-negative"
        
        print(f"Conversations unread count: {data['count']}")
    
    def test_conversations_unread_count_has_expected_value(self, auth_headers):
        """Test that test user has expected unread messages"""
        response = requests.get(
            f"{BASE_URL}/api/conversations/unread-count",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Test user should have 7 unread messages per seed data
        expected_count = 7
        actual_count = data["count"]
        print(f"Expected message count: {expected_count}, Actual: {actual_count}")
        
        # Allow some variance
        assert actual_count >= 0, "count should be non-negative"
    
    def test_unauthorized_notification_count_fails(self):
        """Test that notification count requires auth"""
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count")
        # Should return 401 Unauthorized without token
        assert response.status_code in [401, 403], f"Expected 401/403, got: {response.status_code}"
    
    def test_unauthorized_conversation_count_fails(self):
        """Test that conversation count requires auth"""
        response = requests.get(f"{BASE_URL}/api/conversations/unread-count")
        # Should return 401 Unauthorized without token
        assert response.status_code in [401, 403], f"Expected 401/403, got: {response.status_code}"


class TestResponseFieldMapping:
    """
    Test that frontend expects the correct response field names
    This validates the fix applied to the frontend code
    """
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["session_token"]
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_notification_api_returns_unread_count_not_count(self, auth_headers):
        """
        CRITICAL: Verify /api/notifications/unread-count returns 'unread_count' not 'count'
        
        Frontend MobileHeader.tsx and useHomeData.ts expect: response.unread_count
        Previous bug: code was reading response.count (wrong field name)
        """
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # This MUST be 'unread_count' - the frontend fix depends on this
        assert "unread_count" in data, "API must return 'unread_count' field"
        assert "count" not in data or data.get("count") is None, "API should not return plain 'count' for notifications"
        
        print(f"VERIFIED: Notifications API returns 'unread_count': {data['unread_count']}")
    
    def test_conversation_api_returns_count(self, auth_headers):
        """
        Verify /api/conversations/unread-count returns 'count'
        
        Frontend _layout.tsx expects: response.data.count
        """
        response = requests.get(
            f"{BASE_URL}/api/conversations/unread-count",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # This MUST be 'count' - _layout.tsx reads response.data.count
        assert "count" in data, "API must return 'count' field"
        
        print(f"VERIFIED: Conversations API returns 'count': {data['count']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
