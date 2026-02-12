"""
Test file for Seller Product Performance & Analytics Feature
Tests both backend APIs and frontend integration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://classifieds-search.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "seller@test.com"
TEST_PASSWORD = "test1234"
TEST_LISTING_ID = "5375f0a3-e119-4e70-9b80-8214c61f7d64"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("session_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def authenticated_headers(auth_token):
    """Return headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestAnalyticsAccess:
    """Test analytics access control endpoints"""
    
    def test_access_check_authenticated(self, authenticated_headers):
        """Test that authenticated user can check analytics access"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/access",
            headers=authenticated_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "has_access" in data
        assert data["has_access"] == True
        assert "visible_metrics" in data
    
    def test_access_check_unauthenticated(self):
        """Test that unauthenticated user gets 401"""
        response = requests.get(f"{BASE_URL}/api/analytics/access")
        assert response.status_code == 401


class TestListingMetrics:
    """Test listing metrics endpoints"""
    
    def test_get_listing_metrics_7d(self, authenticated_headers):
        """Test getting listing metrics for 7 day period"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/listing/{TEST_LISTING_ID}?period=7d",
            headers=authenticated_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data["listing_id"] == TEST_LISTING_ID
        assert data["period"] == "7d"
        assert "total_views" in data
        assert "unique_views" in data
        assert "saves" in data
        assert "chats_initiated" in data
        assert "offers_received" in data
        assert "view_to_chat_rate" in data
        assert "view_to_offer_rate" in data
        assert "boost_views" in data
        assert "non_boost_views" in data
        assert "boost_impact_percent" in data
        assert "location_breakdown" in data
        assert "hourly_trend" in data
        assert "daily_trend" in data
        
        # Verify data types
        assert isinstance(data["total_views"], int)
        assert isinstance(data["unique_views"], int)
        assert isinstance(data["view_to_chat_rate"], (int, float))
        assert isinstance(data["hourly_trend"], list)
        assert len(data["hourly_trend"]) == 24  # 24 hours
    
    def test_get_listing_metrics_24h(self, authenticated_headers):
        """Test getting listing metrics for 24 hour period"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/listing/{TEST_LISTING_ID}?period=24h",
            headers=authenticated_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "24h"
    
    def test_get_listing_metrics_30d(self, authenticated_headers):
        """Test getting listing metrics for 30 day period"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/listing/{TEST_LISTING_ID}?period=30d",
            headers=authenticated_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "30d"
    
    def test_get_listing_metrics_nonexistent(self, authenticated_headers):
        """Test getting metrics for non-existent listing returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/listing/nonexistent-id?period=7d",
            headers=authenticated_headers
        )
        assert response.status_code == 404


class TestListingInsights:
    """Test AI insights endpoint"""
    
    def test_get_listing_insights(self, authenticated_headers):
        """Test getting AI-powered insights"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/listing/{TEST_LISTING_ID}/insights",
            headers=authenticated_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Insights should be a list
        assert isinstance(data, list)
        
        # Each insight should have required fields
        for insight in data:
            assert "type" in insight
            assert "title" in insight
            assert "description" in insight
            assert insight["type"] in ["suggestion", "warning", "opportunity", "success"]


class TestListingComparison:
    """Test comparison metrics endpoint"""
    
    def test_get_listing_comparison(self, authenticated_headers):
        """Test getting comparison metrics"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/listing/{TEST_LISTING_ID}/comparison",
            headers=authenticated_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "listing" in data
        assert "seller_average" in data
        assert "comparison" in data
        
        # Verify listing metrics
        assert "views" in data["listing"]
        assert "saves" in data["listing"]
        assert "chats" in data["listing"]
        
        # Verify comparison metrics
        assert "views_vs_avg" in data["comparison"]
        assert "saves_vs_avg" in data["comparison"]
        assert "chats_vs_avg" in data["comparison"]


class TestEventTracking:
    """Test event tracking endpoint"""
    
    def test_track_view_event(self):
        """Test tracking a view event"""
        response = requests.post(
            f"{BASE_URL}/api/analytics/track",
            json={
                "listing_id": TEST_LISTING_ID,
                "event_type": "view",
                "location": "Test Location"
            }
        )
        assert response.status_code == 200
        data = response.json()
        # May be tracked or duplicate
        assert "tracked" in data or "event_id" in data
    
    def test_track_save_event(self):
        """Test tracking a save event"""
        response = requests.post(
            f"{BASE_URL}/api/analytics/track",
            json={
                "listing_id": TEST_LISTING_ID,
                "event_type": "save"
            }
        )
        assert response.status_code == 200
    
    def test_track_chat_event(self):
        """Test tracking a chat_initiated event"""
        response = requests.post(
            f"{BASE_URL}/api/analytics/track",
            json={
                "listing_id": TEST_LISTING_ID,
                "event_type": "chat_initiated"
            }
        )
        assert response.status_code == 200
    
    def test_track_invalid_listing(self):
        """Test tracking event for non-existent listing returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/analytics/track",
            json={
                "listing_id": "nonexistent-listing",
                "event_type": "view"
            }
        )
        assert response.status_code == 404


class TestSellerDashboard:
    """Test seller dashboard endpoint"""
    
    def test_get_seller_dashboard(self, authenticated_headers):
        """Test getting seller dashboard metrics"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/seller/dashboard?period=7d",
            headers=authenticated_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "seller_id" in data
        assert "period" in data
        assert "total_listings" in data
        assert "total_views" in data
        assert "total_saves" in data
        assert "total_chats" in data


class TestBoostProjection:
    """Test boost projection endpoint"""
    
    def test_get_boost_projection(self, authenticated_headers):
        """Test getting boost projection"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/listing/{TEST_LISTING_ID}/boost-projection?boost_type=featured&duration_hours=168",
            headers=authenticated_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "current_weekly_views" in data
        assert "projected_views" in data
        assert "projected_chats" in data
        assert "boost_type" in data
        assert "duration_hours" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
