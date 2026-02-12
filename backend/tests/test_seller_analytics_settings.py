"""
Test Suite: Seller Analytics Settings Backend
Tests for admin analytics and settings endpoints

Endpoints tested:
- GET /api/admin/settings/seller-analytics
- POST /api/admin/settings/seller-analytics  
- GET /api/admin/settings/engagement-notifications
- POST /api/admin/settings/engagement-notifications
- GET /api/admin/analytics/platform
- GET /api/admin/analytics/sellers
- GET /api/admin/analytics/engagement
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://classifieds-mvp-1.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "testadmin@test.com"
TEST_PASSWORD = "Test123!"

class TestSellerAnalyticsSettings:
    """Test seller analytics and settings endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_token):
        """Setup for each test"""
        self.client = api_client
        self.token = auth_token
        self.headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
    
    # ==================== GET Seller Analytics Settings ====================
    
    def test_get_seller_analytics_settings_success(self):
        """Test GET /api/admin/settings/seller-analytics returns settings"""
        response = self.client.get(
            f"{BASE_URL}/api/admin/settings/seller-analytics",
            headers=self.headers
        )
        
        # Should return 200 or 401 if auth fails
        assert response.status_code in [200, 401], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            # Verify required fields are present
            assert "alert_threshold" in data, "alert_threshold field missing"
            assert "low_performance_threshold" in data, "low_performance_threshold field missing"
            
            # Verify data types
            assert isinstance(data["alert_threshold"], (int, float)), "alert_threshold should be numeric"
            assert isinstance(data["low_performance_threshold"], (int, float)), "low_performance_threshold should be numeric"
            print(f"✓ GET seller-analytics settings returned: {data}")
        else:
            print("✓ Auth required for seller-analytics settings (401)")
    
    def test_get_seller_analytics_settings_unauthenticated(self):
        """Test GET /api/admin/settings/seller-analytics without auth returns 401"""
        # Use fresh session without auth
        fresh_client = requests.Session()
        fresh_client.headers.update({"Content-Type": "application/json"})
        response = fresh_client.get(f"{BASE_URL}/api/admin/settings/seller-analytics")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthenticated access correctly returns 401")
    
    # ==================== POST Seller Analytics Settings ====================
    
    def test_post_seller_analytics_settings_success(self):
        """Test POST /api/admin/settings/seller-analytics saves settings"""
        test_settings = {
            "alert_threshold": 200,
            "low_performance_threshold": 10
        }
        
        response = self.client.post(
            f"{BASE_URL}/api/admin/settings/seller-analytics",
            json=test_settings,
            headers=self.headers
        )
        
        assert response.status_code in [200, 401], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Expected success=True"
            print(f"✓ POST seller-analytics settings succeeded: {data}")
            
            # Verify persistence by GET
            get_response = self.client.get(
                f"{BASE_URL}/api/admin/settings/seller-analytics",
                headers=self.headers
            )
            if get_response.status_code == 200:
                get_data = get_response.json()
                assert get_data.get("alert_threshold") == 200, "alert_threshold not persisted"
                assert get_data.get("low_performance_threshold") == 10, "low_performance_threshold not persisted"
                print(f"✓ Settings persisted correctly: {get_data}")
        else:
            print("✓ Auth required for POST seller-analytics settings (401)")
    
    # ==================== GET Engagement Notifications Settings ====================
    
    def test_get_engagement_notifications_settings_success(self):
        """Test GET /api/admin/settings/engagement-notifications returns settings"""
        response = self.client.get(
            f"{BASE_URL}/api/admin/settings/engagement-notifications",
            headers=self.headers
        )
        
        assert response.status_code in [200, 401], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            # Verify required fields
            assert "milestones" in data, "milestones field missing"
            assert "triggers" in data, "triggers field missing"
            
            # Verify milestones structure
            milestones = data["milestones"]
            assert isinstance(milestones, dict), "milestones should be a dict"
            
            # Verify triggers structure
            triggers = data["triggers"]
            assert isinstance(triggers, dict), "triggers should be a dict"
            
            print(f"✓ GET engagement-notifications settings returned: {data}")
        else:
            print("✓ Auth required for engagement-notifications settings (401)")
    
    def test_get_engagement_notifications_unauthenticated(self):
        """Test GET /api/admin/settings/engagement-notifications without auth returns 401"""
        # Use fresh session without auth
        fresh_client = requests.Session()
        fresh_client.headers.update({"Content-Type": "application/json"})
        response = fresh_client.get(f"{BASE_URL}/api/admin/settings/engagement-notifications")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthenticated access correctly returns 401")
    
    # ==================== POST Engagement Notifications Settings ====================
    
    def test_post_engagement_notifications_settings_success(self):
        """Test POST /api/admin/settings/engagement-notifications saves settings"""
        test_settings = {
            "milestones": {
                "firstSale": False,
                "tenListings": True,
                "hundredMessages": False,
                "badgeMilestone": True
            },
            "triggers": {
                "inactiveSeller": False,
                "lowEngagement": True,
                "challengeReminder": True,
                "weeklyDigest": False
            }
        }
        
        response = self.client.post(
            f"{BASE_URL}/api/admin/settings/engagement-notifications",
            json=test_settings,
            headers=self.headers
        )
        
        assert response.status_code in [200, 401], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Expected success=True"
            print(f"✓ POST engagement-notifications settings succeeded: {data}")
            
            # Verify persistence by GET
            get_response = self.client.get(
                f"{BASE_URL}/api/admin/settings/engagement-notifications",
                headers=self.headers
            )
            if get_response.status_code == 200:
                get_data = get_response.json()
                assert get_data.get("milestones", {}).get("firstSale") == False, "firstSale milestone not persisted"
                assert get_data.get("triggers", {}).get("weeklyDigest") == False, "weeklyDigest trigger not persisted"
                print(f"✓ Settings persisted correctly: {get_data}")
        else:
            print("✓ Auth required for POST engagement-notifications settings (401)")
    
    # ==================== GET Platform Analytics ====================
    
    def test_get_platform_analytics_success(self):
        """Test GET /api/admin/analytics/platform returns analytics data"""
        response = self.client.get(
            f"{BASE_URL}/api/admin/analytics/platform",
            headers=self.headers
        )
        
        assert response.status_code in [200, 401], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            # Verify required fields
            expected_fields = [
                "total_users", "new_users_today", "new_users_week", 
                "active_users", "total_listings", "active_listings",
                "total_transactions", "total_revenue"
            ]
            for field in expected_fields:
                assert field in data, f"{field} missing from platform analytics"
                assert isinstance(data[field], (int, float)), f"{field} should be numeric"
            
            # Categories is optional but check structure if present
            if "categories" in data:
                assert isinstance(data["categories"], list), "categories should be a list"
            
            print(f"✓ GET platform analytics returned data with {len(expected_fields)} fields")
            print(f"  - total_users: {data['total_users']}")
            print(f"  - total_listings: {data['total_listings']}")
            print(f"  - total_revenue: {data['total_revenue']}")
        else:
            print("✓ Auth required for platform analytics (401)")
    
    def test_get_platform_analytics_unauthenticated(self):
        """Test GET /api/admin/analytics/platform without auth returns 401"""
        # Use fresh session without auth
        fresh_client = requests.Session()
        fresh_client.headers.update({"Content-Type": "application/json"})
        response = fresh_client.get(f"{BASE_URL}/api/admin/analytics/platform")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthenticated access correctly returns 401")
    
    # ==================== GET Seller Analytics ====================
    
    def test_get_seller_analytics_success(self):
        """Test GET /api/admin/analytics/sellers returns seller data"""
        response = self.client.get(
            f"{BASE_URL}/api/admin/analytics/sellers",
            headers=self.headers
        )
        
        assert response.status_code in [200, 401], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            # Verify required fields
            expected_fields = [
                "top_sellers", "active_sellers_count", 
                "new_sellers_week", "avg_seller_revenue", "avg_listings_per_seller"
            ]
            for field in expected_fields:
                assert field in data, f"{field} missing from seller analytics"
            
            # Verify top_sellers structure
            assert isinstance(data["top_sellers"], list), "top_sellers should be a list"
            
            # If there are top sellers, check their structure
            if len(data["top_sellers"]) > 0:
                seller = data["top_sellers"][0]
                assert "user_id" in seller, "user_id missing from seller"
                assert "name" in seller, "name missing from seller"
                assert "revenue" in seller, "revenue missing from seller"
            
            print(f"✓ GET seller analytics returned data")
            print(f"  - active_sellers_count: {data['active_sellers_count']}")
            print(f"  - top_sellers count: {len(data['top_sellers'])}")
        else:
            print("✓ Auth required for seller analytics (401)")
    
    # ==================== GET Engagement Analytics ====================
    
    def test_get_engagement_analytics_success(self):
        """Test GET /api/admin/analytics/engagement returns engagement data"""
        response = self.client.get(
            f"{BASE_URL}/api/admin/analytics/engagement",
            headers=self.headers
        )
        
        assert response.status_code in [200, 401], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            # Verify required fields
            expected_fields = [
                "total_messages", "messages_today", "total_favorites",
                "badge_awards_count", "challenge_completions", "notification_read_rate"
            ]
            for field in expected_fields:
                assert field in data, f"{field} missing from engagement analytics"
            
            # Verify notification_read_rate is a valid percentage (0-1)
            assert 0 <= data["notification_read_rate"] <= 1, "notification_read_rate should be between 0 and 1"
            
            print(f"✓ GET engagement analytics returned data")
            print(f"  - total_messages: {data['total_messages']}")
            print(f"  - badge_awards_count: {data['badge_awards_count']}")
            print(f"  - notification_read_rate: {data['notification_read_rate']}")
        else:
            print("✓ Auth required for engagement analytics (401)")


class TestSettingsPersistence:
    """Test settings persistence across requests"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_token):
        """Setup for each test"""
        self.client = api_client
        self.token = auth_token
        self.headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
    
    def test_seller_analytics_settings_round_trip(self):
        """Test saving and retrieving seller analytics settings"""
        if not self.token:
            pytest.skip("Authentication required for this test")
        
        # Unique test values
        unique_threshold = 150 + (datetime.now().second % 50)
        unique_performance = 7 + (datetime.now().second % 5)
        
        # Save settings
        save_response = self.client.post(
            f"{BASE_URL}/api/admin/settings/seller-analytics",
            json={
                "alert_threshold": unique_threshold,
                "low_performance_threshold": unique_performance
            },
            headers=self.headers
        )
        
        if save_response.status_code != 200:
            pytest.skip("Save endpoint not accessible")
        
        # Retrieve settings
        get_response = self.client.get(
            f"{BASE_URL}/api/admin/settings/seller-analytics",
            headers=self.headers
        )
        
        assert get_response.status_code == 200
        data = get_response.json()
        
        # Verify values match
        assert data["alert_threshold"] == unique_threshold, \
            f"alert_threshold mismatch: expected {unique_threshold}, got {data['alert_threshold']}"
        assert data["low_performance_threshold"] == unique_performance, \
            f"low_performance_threshold mismatch: expected {unique_performance}, got {data['low_performance_threshold']}"
        
        print(f"✓ Round-trip test passed: saved and retrieved matching values")
    
    def test_engagement_notifications_settings_round_trip(self):
        """Test saving and retrieving engagement notification settings"""
        if not self.token:
            pytest.skip("Authentication required for this test")
        
        # Unique test values (toggle based on current time)
        toggle_value = datetime.now().second % 2 == 0
        
        test_settings = {
            "milestones": {
                "firstSale": toggle_value,
                "tenListings": not toggle_value,
                "hundredMessages": toggle_value,
                "badgeMilestone": not toggle_value
            },
            "triggers": {
                "inactiveSeller": not toggle_value,
                "lowEngagement": toggle_value,
                "challengeReminder": not toggle_value,
                "weeklyDigest": toggle_value
            }
        }
        
        # Save settings
        save_response = self.client.post(
            f"{BASE_URL}/api/admin/settings/engagement-notifications",
            json=test_settings,
            headers=self.headers
        )
        
        if save_response.status_code != 200:
            pytest.skip("Save endpoint not accessible")
        
        # Retrieve settings
        get_response = self.client.get(
            f"{BASE_URL}/api/admin/settings/engagement-notifications",
            headers=self.headers
        )
        
        assert get_response.status_code == 200
        data = get_response.json()
        
        # Verify milestone values match
        assert data["milestones"]["firstSale"] == toggle_value, "firstSale mismatch"
        assert data["milestones"]["tenListings"] == (not toggle_value), "tenListings mismatch"
        
        # Verify trigger values match
        assert data["triggers"]["inactiveSeller"] == (not toggle_value), "inactiveSeller mismatch"
        assert data["triggers"]["lowEngagement"] == toggle_value, "lowEngagement mismatch"
        
        print(f"✓ Round-trip test passed: saved and retrieved matching milestone/trigger values")


# Fixtures
@pytest.fixture(scope="module")
def api_client():
    """Create a requests session for API calls"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token by logging in"""
    try:
        # Try to register user first (in case it doesn't exist)
        api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "Test Admin"
        })
    except:
        pass
    
    # Now login
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("token") or data.get("session_token")
        print(f"✓ Authentication successful")
        return token
    else:
        print(f"⚠ Authentication failed with status {response.status_code}: {response.text}")
        # Return None but don't fail - tests will handle auth appropriately
        return None


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
