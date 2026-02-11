"""
Test Admin Analytics APIs for Seller Product Performance & Analytics Feature
Tests the admin dashboard analytics endpoints including:
- Engagement notification config GET/PUT
- Analytics settings GET/PUT  
- Trigger engagement check POST
- Platform analytics GET
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://analytics-ui-2.preview.emergentagent.com').rstrip('/')


class TestAdminAnalyticsSettings:
    """Test analytics admin settings endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login to get session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "seller@test.com", "password": "test1234"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("session_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_analytics_settings(self):
        """GET /api/analytics/admin/settings - returns global analytics settings"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/admin/settings",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # Verify required fields exist
        assert "is_enabled" in data
        assert "visible_metrics" in data
        assert "ai_insights_enabled" in data
        assert isinstance(data["is_enabled"], bool)
        assert isinstance(data["visible_metrics"], dict)
        
    def test_update_analytics_settings(self):
        """PUT /api/analytics/admin/settings - updates global analytics settings"""
        # Update settings
        update_data = {
            "is_enabled": True,
            "ai_insights_enabled": True
        }
        response = requests.put(
            f"{BASE_URL}/api/analytics/admin/settings",
            headers=self.headers,
            json=update_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["is_enabled"] == True
        assert data["ai_insights_enabled"] == True
        
    def test_analytics_settings_availability_field(self):
        """Verify analytics settings has access_level (availability) field"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/admin/settings",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # access_level corresponds to "availability" in frontend dropdown
        assert "access_level" in data
        assert data["access_level"] in ["all", "verified", "premium", "manual", "disabled"]
        
    def test_analytics_settings_visible_metrics(self):
        """Verify visible_metrics toggles are present"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/admin/settings",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        visible_metrics = data.get("visible_metrics", {})
        
        # Check expected metric toggles
        expected_metrics = ["views", "unique_views", "saves", "chats", "offers", "conversion_rate"]
        for metric in expected_metrics:
            assert metric in visible_metrics, f"Missing visible metric: {metric}"


class TestEngagementNotificationConfig:
    """Test engagement notification configuration endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login to get session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "seller@test.com", "password": "test1234"}
        )
        assert response.status_code == 200
        self.token = response.json().get("session_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_engagement_notification_config(self):
        """GET /api/analytics/admin/engagement-notification-config - returns config"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/admin/engagement-notification-config",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # Verify required fields
        assert "enabled" in data
        assert "views_threshold_multiplier" in data
        assert "saves_threshold_multiplier" in data
        assert "chats_threshold_multiplier" in data
        assert "minimum_views_for_notification" in data
        assert "notification_cooldown_hours" in data
        assert "check_interval_minutes" in data
        
    def test_engagement_config_threshold_values(self):
        """Verify threshold multiplier values are numbers"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/admin/engagement-notification-config",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data["views_threshold_multiplier"], (int, float))
        assert isinstance(data["saves_threshold_multiplier"], (int, float))
        assert isinstance(data["chats_threshold_multiplier"], (int, float))
        assert data["views_threshold_multiplier"] >= 1.5
        assert data["views_threshold_multiplier"] <= 5.0
        
    def test_update_engagement_notification_config(self):
        """PUT /api/analytics/admin/engagement-notification-config - updates config"""
        config_data = {
            "enabled": True,
            "views_threshold_multiplier": 2.5,
            "saves_threshold_multiplier": 3.0,
            "chats_threshold_multiplier": 2.0,
            "minimum_views_for_notification": 10,
            "notification_cooldown_hours": 6,
            "check_interval_minutes": 30
        }
        
        response = requests.put(
            f"{BASE_URL}/api/analytics/admin/engagement-notification-config",
            headers=self.headers,
            json=config_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "updated"
        assert "config" in data
        assert data["config"]["enabled"] == True
        assert data["config"]["views_threshold_multiplier"] == 2.5
        
    def test_update_engagement_config_toggle(self):
        """Test toggling engagement notifications enabled/disabled"""
        # First disable
        response = requests.put(
            f"{BASE_URL}/api/analytics/admin/engagement-notification-config",
            headers=self.headers,
            json={
                "enabled": False,
                "views_threshold_multiplier": 2.5,
                "saves_threshold_multiplier": 3.0,
                "chats_threshold_multiplier": 2.0,
                "minimum_views_for_notification": 10,
                "notification_cooldown_hours": 6,
                "check_interval_minutes": 30
            }
        )
        assert response.status_code == 200
        assert response.json()["config"]["enabled"] == False
        
        # Then re-enable
        response = requests.put(
            f"{BASE_URL}/api/analytics/admin/engagement-notification-config",
            headers=self.headers,
            json={
                "enabled": True,
                "views_threshold_multiplier": 2.5,
                "saves_threshold_multiplier": 3.0,
                "chats_threshold_multiplier": 2.0,
                "minimum_views_for_notification": 10,
                "notification_cooldown_hours": 6,
                "check_interval_minutes": 30
            }
        )
        assert response.status_code == 200
        assert response.json()["config"]["enabled"] == True


class TestEngagementCheck:
    """Test manual engagement check trigger"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login to get session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "seller@test.com", "password": "test1234"}
        )
        assert response.status_code == 200
        self.token = response.json().get("session_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_trigger_engagement_check(self):
        """POST /api/analytics/admin/trigger-engagement-check - triggers manual check"""
        response = requests.post(
            f"{BASE_URL}/api/analytics/admin/trigger-engagement-check",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "completed"
        assert "message" in data


class TestPlatformAnalytics:
    """Test platform-wide analytics endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login to get session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "seller@test.com", "password": "test1234"}
        )
        assert response.status_code == 200
        self.token = response.json().get("session_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_platform_analytics(self):
        """GET /api/analytics/admin/platform - returns platform analytics"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/admin/platform",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "period" in data
        assert "total_events" in data
        assert "top_listings" in data
        assert "top_categories" in data
        assert isinstance(data["top_listings"], list)
        assert isinstance(data["top_categories"], list)


class TestAuthRequired:
    """Test that endpoints require authentication"""
    
    def test_engagement_config_requires_auth(self):
        """Engagement config endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/admin/engagement-notification-config"
        )
        assert response.status_code == 401
        
    def test_settings_requires_auth(self):
        """Analytics settings endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/admin/settings"
        )
        assert response.status_code == 401
        
    def test_trigger_check_requires_auth(self):
        """Trigger engagement check requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/analytics/admin/trigger-engagement-check"
        )
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
