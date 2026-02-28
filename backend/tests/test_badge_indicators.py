"""
Badge Indicators API Tests
Tests for notification and message unread count endpoints used by badge indicators
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://listing-core.preview.emergentagent.com')

# Test user credentials
TEST_USER_EMAIL = "testbadge@test.com"
TEST_USER_PASSWORD = "test123"


class TestBadgeIndicatorsAPI:
    """Tests for badge indicators - notification and message unread counts"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        # API returns session_token (not token)
        self.token = data.get("session_token")
        assert self.token, "No session_token in login response"
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_notification_unread_count_endpoint_exists(self):
        """Test that /api/notifications/unread-count endpoint exists and responds"""
        response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_notification_unread_count_returns_count(self):
        """Test that notification unread count returns expected structure"""
        response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code == 200
        
        data = response.json()
        assert "unread_count" in data, f"Response missing 'unread_count': {data}"
        assert isinstance(data["unread_count"], int), f"unread_count should be int: {data}"
    
    def test_notification_unread_count_value(self):
        """Test that test user has expected notification unread count (3)"""
        response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code == 200
        
        data = response.json()
        # Test user was created with 3 unread notifications
        assert data["unread_count"] == 3, f"Expected 3 unread notifications, got {data['unread_count']}"
    
    def test_conversation_unread_count_endpoint_exists(self):
        """Test that /api/conversations/unread-count endpoint exists and responds"""
        response = self.session.get(f"{BASE_URL}/api/conversations/unread-count")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_conversation_unread_count_returns_count(self):
        """Test that conversation unread count returns expected structure"""
        response = self.session.get(f"{BASE_URL}/api/conversations/unread-count")
        assert response.status_code == 200
        
        data = response.json()
        assert "count" in data, f"Response missing 'count': {data}"
        assert isinstance(data["count"], int), f"count should be int: {data}"
    
    def test_conversation_unread_count_value(self):
        """Test that test user has expected message unread count (5)"""
        response = self.session.get(f"{BASE_URL}/api/conversations/unread-count")
        assert response.status_code == 200
        
        data = response.json()
        # Test user was created with 5 unread messages
        assert data["count"] == 5, f"Expected 5 unread messages, got {data['count']}"
    
    def test_notification_unread_count_requires_auth(self):
        """Test that notification unread count requires authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_conversation_unread_count_requires_auth(self):
        """Test that conversation unread count requires authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/conversations/unread-count")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestBadgeDataConsistency:
    """Tests for badge data consistency after operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        assert response.status_code == 200
        
        data = response.json()
        self.token = data.get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_notification_count_not_negative(self):
        """Test that unread notification count is never negative"""
        response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code == 200
        
        data = response.json()
        assert data["unread_count"] >= 0, "Unread count should never be negative"
    
    def test_conversation_count_not_negative(self):
        """Test that unread message count is never negative"""
        response = self.session.get(f"{BASE_URL}/api/conversations/unread-count")
        assert response.status_code == 200
        
        data = response.json()
        assert data["count"] >= 0, "Unread count should never be negative"
