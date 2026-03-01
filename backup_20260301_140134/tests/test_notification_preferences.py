"""
Notification Preferences API Tests
Tests for notification preferences endpoints and notification service integration.

Test Coverage:
1. GET /api/notification-preferences/categories - Get email and push notification categories
2. GET /api/notification-preferences - Get user's notification preferences
3. POST /api/notification-preferences/toggle - Toggle a specific notification preference
4. POST /api/notification-preferences/test - Send a test notification
5. GET /api/email/status - Check SendGrid email service status
6. Notification service initialization verification
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


# ==============================================================================
# Fixtures
# ==============================================================================

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token by logging in"""
    login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@marketplace.com",
        "password": "Admin@123456"
    })
    
    if login_response.status_code == 200:
        data = login_response.json()
        return data.get("session_token") or data.get("token")
    
    # If login fails, try to register first
    register_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": "admin@marketplace.com",
        "password": "Admin@123456",
        "name": "Test Admin"
    })
    
    if register_response.status_code in [200, 201]:
        data = register_response.json()
        return data.get("session_token") or data.get("token")
    
    pytest.skip("Authentication failed - skipping authenticated tests")
    return None


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


# ==============================================================================
# Email Service Status Tests
# ==============================================================================

class TestEmailServiceStatus:
    """Tests for GET /api/email/status endpoint"""
    
    def test_email_status_returns_ready(self, api_client):
        """Test that email status endpoint returns 'ready' status"""
        response = api_client.get(f"{BASE_URL}/api/email/status")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data, "Response should contain 'status' field"
        assert data["status"] == "ready", f"Expected status 'ready', got '{data.get('status')}'"
        
        # Check additional SendGrid configuration info
        if "config" in data:
            assert "from_email" in data["config"], "Config should contain from_email"
    
    def test_email_status_contains_sendgrid_info(self, api_client):
        """Test that email status contains SendGrid configuration details"""
        response = api_client.get(f"{BASE_URL}/api/email/status")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify SendGrid is configured
        assert data.get("status") == "ready", "SendGrid should be ready"


# ==============================================================================
# Notification Preferences Categories Tests
# ==============================================================================

class TestNotificationPreferencesCategories:
    """Tests for GET /api/notification-preferences/categories endpoint"""
    
    def test_categories_returns_200(self, api_client):
        """Test that categories endpoint returns 200 OK"""
        response = api_client.get(f"{BASE_URL}/api/notification-preferences/categories")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_categories_contains_email_and_push(self, api_client):
        """Test that categories include both email and push notification types"""
        response = api_client.get(f"{BASE_URL}/api/notification-preferences/categories")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "categories" in data, "Response should contain 'categories' field"
        categories = data["categories"]
        
        assert isinstance(categories, list), "Categories should be a list"
        assert len(categories) >= 2, "Should have at least 2 categories (email and push)"
        
        # Extract category IDs
        category_ids = [cat["id"] for cat in categories]
        
        assert "email" in category_ids, "Should have 'email' category"
        assert "push" in category_ids, "Should have 'push' category"
    
    def test_email_category_structure(self, api_client):
        """Test email category contains proper preference structure"""
        response = api_client.get(f"{BASE_URL}/api/notification-preferences/categories")
        
        assert response.status_code == 200
        data = response.json()
        
        email_category = next((cat for cat in data["categories"] if cat["id"] == "email"), None)
        
        assert email_category is not None, "Email category should exist"
        assert "name" in email_category, "Email category should have 'name'"
        assert "description" in email_category, "Email category should have 'description'"
        assert "preferences" in email_category, "Email category should have 'preferences'"
        
        # Verify preferences structure
        preferences = email_category["preferences"]
        assert isinstance(preferences, list), "Preferences should be a list"
        assert len(preferences) > 0, "Email preferences should not be empty"
        
        # Check first preference structure
        first_pref = preferences[0]
        assert "key" in first_pref, "Preference should have 'key'"
        assert "name" in first_pref, "Preference should have 'name'"
        assert "description" in first_pref, "Preference should have 'description'"
    
    def test_push_category_structure(self, api_client):
        """Test push category contains proper preference structure"""
        response = api_client.get(f"{BASE_URL}/api/notification-preferences/categories")
        
        assert response.status_code == 200
        data = response.json()
        
        push_category = next((cat for cat in data["categories"] if cat["id"] == "push"), None)
        
        assert push_category is not None, "Push category should exist"
        assert "preferences" in push_category, "Push category should have 'preferences'"
        
        # Verify push preferences exist
        preferences = push_category["preferences"]
        assert isinstance(preferences, list), "Preferences should be a list"
        assert len(preferences) > 0, "Push preferences should not be empty"


# ==============================================================================
# Get Notification Preferences Tests
# ==============================================================================

class TestGetNotificationPreferences:
    """Tests for GET /api/notification-preferences endpoint"""
    
    def test_requires_authentication(self, api_client):
        """Test that endpoint requires authentication"""
        # Make request without auth
        response = requests.get(f"{BASE_URL}/api/notification-preferences")
        
        assert response.status_code == 401, "Should require authentication"
    
    def test_returns_user_preferences(self, authenticated_client):
        """Test that endpoint returns user's notification preferences"""
        response = authenticated_client.get(f"{BASE_URL}/api/notification-preferences")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user_id" in data, "Response should contain user_id"
    
    def test_returns_default_preferences_for_new_user(self, authenticated_client):
        """Test that default preferences are returned for users without custom settings"""
        response = authenticated_client.get(f"{BASE_URL}/api/notification-preferences")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check default email preferences exist
        assert "email_transactional" in data or data.get("email_transactional") is not None, "Should have email_transactional preference"


# ==============================================================================
# Toggle Notification Preference Tests
# ==============================================================================

class TestToggleNotificationPreference:
    """Tests for POST /api/notification-preferences/toggle endpoint"""
    
    def test_requires_authentication(self, api_client):
        """Test that toggle endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/notification-preferences/toggle", json={
            "key": "email_marketing",
            "enabled": False
        })
        
        assert response.status_code == 401, "Should require authentication"
    
    def test_toggle_preference_successfully(self, authenticated_client):
        """Test toggling a notification preference"""
        # Toggle email_marketing to False
        response = authenticated_client.post(f"{BASE_URL}/api/notification-preferences/toggle", json={
            "key": "email_marketing",
            "enabled": False
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "key" in data, "Response should contain key"
        assert data["key"] == "email_marketing"
        assert "enabled" in data, "Response should contain enabled"
        assert data["enabled"] == False
    
    def test_toggle_preference_to_true(self, authenticated_client):
        """Test toggling a notification preference back to True"""
        response = authenticated_client.post(f"{BASE_URL}/api/notification-preferences/toggle", json={
            "key": "push_messages",
            "enabled": True
        })
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["enabled"] == True
    
    def test_toggle_invalid_key_returns_400(self, authenticated_client):
        """Test that toggling an invalid key returns 400"""
        response = authenticated_client.post(f"{BASE_URL}/api/notification-preferences/toggle", json={
            "key": "invalid_preference_key_xyz",
            "enabled": True
        })
        
        assert response.status_code == 400, f"Expected 400 for invalid key, got {response.status_code}"
    
    def test_toggle_missing_params_returns_400(self, authenticated_client):
        """Test that missing parameters returns 400"""
        # Missing 'enabled'
        response = authenticated_client.post(f"{BASE_URL}/api/notification-preferences/toggle", json={
            "key": "email_marketing"
        })
        
        assert response.status_code == 400, "Should return 400 for missing 'enabled'"


# ==============================================================================
# Test Notification Endpoint Tests
# ==============================================================================

class TestSendTestNotification:
    """Tests for POST /api/notification-preferences/test endpoint"""
    
    def test_requires_authentication(self, api_client):
        """Test that test notification endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/notification-preferences/test", json={
            "channel": "all"
        })
        
        assert response.status_code == 401, "Should require authentication"
    
    def test_send_test_notification_successfully(self, authenticated_client):
        """Test sending a test notification"""
        response = authenticated_client.post(f"{BASE_URL}/api/notification-preferences/test", json={
            "channel": "all"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "notification_id" in data or "channels_sent" in data, "Response should contain notification details"
    
    def test_send_test_notification_email_only(self, authenticated_client):
        """Test sending a test notification via email channel only"""
        response = authenticated_client.post(f"{BASE_URL}/api/notification-preferences/test", json={
            "channel": "email"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data


# ==============================================================================
# Notification Service Integration Tests
# ==============================================================================

class TestNotificationServiceIntegration:
    """Tests for notification service initialization in routes"""
    
    def test_offers_endpoint_accessible(self, authenticated_client):
        """Test that offers endpoint is accessible (notification service should be initialized)"""
        response = authenticated_client.get(f"{BASE_URL}/api/offers?role=buyer")
        
        # Should return 200 even if no offers
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "offers" in data, "Response should contain 'offers' field"
    
    def test_listings_endpoint_accessible(self, authenticated_client):
        """Test that listings endpoint is accessible"""
        response = authenticated_client.get(f"{BASE_URL}/api/listings")
        
        # Should return 200
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_feed_listings_endpoint_accessible(self, api_client):
        """Test that feed listings endpoint is accessible (public)"""
        response = api_client.get(f"{BASE_URL}/api/feed/listings?limit=5")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
