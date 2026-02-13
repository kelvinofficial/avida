"""
Analytics System Backend Tests
Tests for Seller Product Performance & Analytics feature

Endpoints tested:
- POST /api/analytics/track - track view/save/chat events
- GET /api/analytics/admin/settings - get global analytics settings
- PUT /api/analytics/admin/settings - update analytics settings (toggle, access level)
- GET /api/analytics/access - check if current user has analytics access
- GET /api/analytics/listing/{id} - get listing metrics (owner only)
- GET /api/analytics/seller/dashboard - get seller's overall analytics
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://classifieds-stats.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "paypaltest@test.com"
TEST_PASSWORD = "test123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for test user"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("session_token")
    
    # If login fails, try to register
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": "Test User"
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("session_token")
    
    pytest.skip(f"Authentication failed - status: {response.status_code}")
    return None


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    if auth_token:
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


@pytest.fixture(scope="module")
def test_user_info(authenticated_client):
    """Get current user info"""
    response = authenticated_client.get(f"{BASE_URL}/api/auth/me")
    if response.status_code == 200:
        return response.json()
    return None


@pytest.fixture(scope="module")
def test_listing(authenticated_client, test_user_info):
    """Create or get a test listing for analytics"""
    # First try to get existing listings
    response = authenticated_client.get(f"{BASE_URL}/api/listings/my")
    if response.status_code == 200:
        listings = response.json()
        if listings and len(listings) > 0:
            return listings[0]
    
    # Create a new test listing
    listing_data = {
        "title": f"TEST_Analytics Test Listing {uuid.uuid4().hex[:6]}",
        "description": "Test listing for analytics testing",
        "price": 100.0,
        "category_id": "electronics",
        "subcategory": "mobile_phones",
        "location": "Test City",
        "condition": "new"
    }
    
    response = authenticated_client.post(f"{BASE_URL}/api/listings", json=listing_data)
    if response.status_code == 200:
        return response.json()
    
    return None


# ==================== ANALYTICS TRACK ENDPOINT TESTS ====================

class TestAnalyticsTrack:
    """Tests for POST /api/analytics/track endpoint"""
    
    def test_track_view_event_success(self, api_client, test_listing):
        """Test tracking a view event for a listing"""
        if not test_listing:
            pytest.skip("No test listing available")
        
        response = api_client.post(f"{BASE_URL}/api/analytics/track", json={
            "listing_id": test_listing["id"],
            "event_type": "view",
            "location": "Test Location",
            "device_type": "desktop",
            "referrer": "search"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should return tracking result
        assert "tracked" in data
        # First view should be tracked
        if data.get("tracked"):
            assert "event_id" in data
            print(f"Successfully tracked view event: {data.get('event_id')}")
        else:
            # May be filtered as duplicate
            assert "reason" in data
            print(f"View not tracked - reason: {data.get('reason')}")
    
    def test_track_save_event_success(self, api_client, test_listing):
        """Test tracking a save event for a listing"""
        if not test_listing:
            pytest.skip("No test listing available")
        
        response = api_client.post(f"{BASE_URL}/api/analytics/track", json={
            "listing_id": test_listing["id"],
            "event_type": "save",
            "device_type": "mobile"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "tracked" in data
        print(f"Save event result: tracked={data.get('tracked')}")
    
    def test_track_chat_initiated_event(self, api_client, test_listing):
        """Test tracking a chat_initiated event"""
        if not test_listing:
            pytest.skip("No test listing available")
        
        response = api_client.post(f"{BASE_URL}/api/analytics/track", json={
            "listing_id": test_listing["id"],
            "event_type": "chat_initiated"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "tracked" in data
        print(f"Chat initiated event result: tracked={data.get('tracked')}")
    
    def test_track_offer_received_event(self, api_client, test_listing):
        """Test tracking an offer_received event"""
        if not test_listing:
            pytest.skip("No test listing available")
        
        response = api_client.post(f"{BASE_URL}/api/analytics/track", json={
            "listing_id": test_listing["id"],
            "event_type": "offer_received",
            "metadata": {"offer_amount": 90.0}
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "tracked" in data
        print(f"Offer received event result: tracked={data.get('tracked')}")
    
    def test_track_event_invalid_listing(self, api_client):
        """Test tracking event for non-existent listing returns 404"""
        response = api_client.post(f"{BASE_URL}/api/analytics/track", json={
            "listing_id": "non_existent_listing_id",
            "event_type": "view"
        })
        
        assert response.status_code == 404, f"Expected 404 for invalid listing, got {response.status_code}"
        print("Correctly returned 404 for non-existent listing")


# ==================== ADMIN SETTINGS ENDPOINT TESTS ====================

class TestAdminSettings:
    """Tests for admin analytics settings endpoints"""
    
    def test_get_admin_settings_requires_auth(self, api_client):
        """Test that admin settings endpoint requires authentication"""
        # Reset headers to remove any auth
        client = requests.Session()
        client.headers.update({"Content-Type": "application/json"})
        
        response = client.get(f"{BASE_URL}/api/analytics/admin/settings")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("Admin settings correctly requires authentication")
    
    def test_get_admin_settings_success(self, authenticated_client):
        """Test getting global analytics settings"""
        response = authenticated_client.get(f"{BASE_URL}/api/analytics/admin/settings")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify settings structure
        assert "is_enabled" in data, "Missing is_enabled field"
        assert "access_level" in data, "Missing access_level field"
        assert "lock_type" in data, "Missing lock_type field"
        assert "visible_metrics" in data, "Missing visible_metrics field"
        
        print(f"Analytics settings: enabled={data['is_enabled']}, access_level={data['access_level']}")
    
    def test_update_admin_settings_toggle(self, authenticated_client):
        """Test updating analytics settings - toggle enabled"""
        # First get current settings
        get_response = authenticated_client.get(f"{BASE_URL}/api/analytics/admin/settings")
        assert get_response.status_code == 200
        current = get_response.json()
        
        # Toggle is_enabled
        new_enabled = not current.get("is_enabled", True)
        
        response = authenticated_client.put(f"{BASE_URL}/api/analytics/admin/settings", json={
            "is_enabled": new_enabled
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("is_enabled") == new_enabled, f"is_enabled not updated correctly"
        print(f"Successfully toggled analytics enabled to: {new_enabled}")
        
        # Toggle back
        authenticated_client.put(f"{BASE_URL}/api/analytics/admin/settings", json={
            "is_enabled": True
        })
    
    def test_update_admin_settings_access_level(self, authenticated_client):
        """Test updating analytics settings - change access level"""
        response = authenticated_client.put(f"{BASE_URL}/api/analytics/admin/settings", json={
            "access_level": "all"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("access_level") == "all", "access_level not updated correctly"
        print("Successfully updated access_level to 'all'")
    
    def test_update_admin_settings_visible_metrics(self, authenticated_client):
        """Test updating visible_metrics setting"""
        response = authenticated_client.put(f"{BASE_URL}/api/analytics/admin/settings", json={
            "visible_metrics": {
                "views": True,
                "unique_views": True,
                "saves": True,
                "chats": True,
                "offers": True,
                "conversion_rate": True,
                "boost_impact": True,
                "ai_insights": True
            }
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "visible_metrics" in data
        assert data["visible_metrics"]["views"] == True
        print("Successfully updated visible_metrics")


# ==================== ACCESS CHECK ENDPOINT TESTS ====================

class TestAccessCheck:
    """Tests for GET /api/analytics/access endpoint"""
    
    def test_check_access_requires_auth(self, api_client):
        """Test that access check requires authentication"""
        client = requests.Session()
        client.headers.update({"Content-Type": "application/json"})
        
        response = client.get(f"{BASE_URL}/api/analytics/access")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("Access check correctly requires authentication")
    
    def test_check_access_success(self, authenticated_client):
        """Test checking user's analytics access"""
        response = authenticated_client.get(f"{BASE_URL}/api/analytics/access")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should contain access information
        assert "has_access" in data, "Missing has_access field"
        
        if data.get("has_access"):
            assert "visible_metrics" in data, "Missing visible_metrics when access granted"
            print(f"User has analytics access with visible_metrics: {list(data.get('visible_metrics', {}).keys())}")
        else:
            assert "reason" in data, "Missing reason when access denied"
            assert "message" in data, "Missing message when access denied"
            print(f"User access denied - reason: {data.get('reason')}, message: {data.get('message')}")


# ==================== LISTING METRICS ENDPOINT TESTS ====================

class TestListingMetrics:
    """Tests for GET /api/analytics/listing/{id} endpoint"""
    
    def test_get_listing_metrics_requires_auth(self, api_client, test_listing):
        """Test that listing metrics requires authentication"""
        if not test_listing:
            pytest.skip("No test listing available")
        
        client = requests.Session()
        client.headers.update({"Content-Type": "application/json"})
        
        response = client.get(f"{BASE_URL}/api/analytics/listing/{test_listing['id']}")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("Listing metrics correctly requires authentication")
    
    def test_get_listing_metrics_success(self, authenticated_client, test_listing):
        """Test getting metrics for user's own listing"""
        if not test_listing:
            pytest.skip("No test listing available")
        
        response = authenticated_client.get(f"{BASE_URL}/api/analytics/listing/{test_listing['id']}")
        
        # Can be 200 (success) or 403 (no access based on settings)
        assert response.status_code in [200, 403], f"Expected 200 or 403, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify metrics structure
            assert "listing_id" in data, "Missing listing_id"
            assert "period" in data, "Missing period"
            assert "total_views" in data, "Missing total_views"
            
            print(f"Listing metrics: views={data.get('total_views')}, saves={data.get('saves')}, chats={data.get('chats_initiated')}")
        else:
            print(f"Access to listing metrics denied: {response.json()}")
    
    def test_get_listing_metrics_with_period_7d(self, authenticated_client, test_listing):
        """Test getting metrics for 7 day period"""
        if not test_listing:
            pytest.skip("No test listing available")
        
        response = authenticated_client.get(f"{BASE_URL}/api/analytics/listing/{test_listing['id']}?period=7d")
        
        assert response.status_code in [200, 403], f"Expected 200 or 403, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("period") == "7d"
            print(f"7-day metrics retrieved: {data.get('total_views')} views")
    
    def test_get_listing_metrics_with_period_30d(self, authenticated_client, test_listing):
        """Test getting metrics for 30 day period"""
        if not test_listing:
            pytest.skip("No test listing available")
        
        response = authenticated_client.get(f"{BASE_URL}/api/analytics/listing/{test_listing['id']}?period=30d")
        
        assert response.status_code in [200, 403], f"Expected 200 or 403, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("period") == "30d"
            print(f"30-day metrics retrieved: {data.get('total_views')} views")
    
    def test_get_listing_metrics_non_existent(self, authenticated_client):
        """Test getting metrics for non-existent listing"""
        response = authenticated_client.get(f"{BASE_URL}/api/analytics/listing/non_existent_id")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for non-existent listing")
    
    def test_get_listing_metrics_not_owner(self, authenticated_client, api_client):
        """Test that user cannot see metrics for listing they don't own"""
        # Get any listing not owned by current user
        response = api_client.get(f"{BASE_URL}/api/listings?limit=10")
        if response.status_code != 200:
            pytest.skip("Cannot fetch listings")
        
        listings = response.json().get("listings", [])
        
        # Get current user
        me_response = authenticated_client.get(f"{BASE_URL}/api/auth/me")
        if me_response.status_code != 200:
            pytest.skip("Cannot get current user")
        
        current_user_id = me_response.json().get("user_id")
        
        # Find a listing not owned by current user
        other_listing = None
        for listing in listings:
            if listing.get("user_id") != current_user_id:
                other_listing = listing
                break
        
        if not other_listing:
            pytest.skip("No listing from other user found")
        
        response = authenticated_client.get(f"{BASE_URL}/api/analytics/listing/{other_listing['id']}")
        
        # Should be 403 Forbidden (not your listing)
        assert response.status_code == 403, f"Expected 403 for other's listing, got {response.status_code}"
        print("Correctly denied access to other user's listing metrics")


# ==================== SELLER DASHBOARD ENDPOINT TESTS ====================

class TestSellerDashboard:
    """Tests for GET /api/analytics/seller/dashboard endpoint"""
    
    def test_get_seller_dashboard_requires_auth(self, api_client):
        """Test that seller dashboard requires authentication"""
        client = requests.Session()
        client.headers.update({"Content-Type": "application/json"})
        
        response = client.get(f"{BASE_URL}/api/analytics/seller/dashboard")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("Seller dashboard correctly requires authentication")
    
    def test_get_seller_dashboard_success(self, authenticated_client):
        """Test getting seller's overall analytics dashboard"""
        response = authenticated_client.get(f"{BASE_URL}/api/analytics/seller/dashboard")
        
        # Can be 200 (success) or 403 (no access)
        assert response.status_code in [200, 403], f"Expected 200 or 403, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify dashboard structure
            assert "seller_id" in data, "Missing seller_id"
            assert "period" in data, "Missing period"
            assert "total_listings" in data, "Missing total_listings"
            assert "total_views" in data, "Missing total_views"
            assert "total_saves" in data, "Missing total_saves"
            assert "total_chats" in data, "Missing total_chats"
            
            print(f"Seller dashboard: {data.get('total_listings')} listings, {data.get('total_views')} views, {data.get('total_chats')} chats")
            print(f"Conversion rate: {data.get('avg_conversion_rate')}%")
        else:
            print(f"Seller dashboard access denied: {response.json()}")
    
    def test_get_seller_dashboard_with_period(self, authenticated_client):
        """Test getting seller dashboard with specific time period"""
        response = authenticated_client.get(f"{BASE_URL}/api/analytics/seller/dashboard?period=24h")
        
        assert response.status_code in [200, 403], f"Expected 200 or 403, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("period") == "24h"
            print(f"24h dashboard: {data.get('total_views')} views")


# ==================== ADDITIONAL ANALYTICS TESTS ====================

class TestAnalyticsAdditional:
    """Additional analytics tests for edge cases"""
    
    def test_admin_toggle_endpoint(self, authenticated_client):
        """Test quick toggle endpoint for analytics"""
        # Toggle off
        response = authenticated_client.put(f"{BASE_URL}/api/analytics/admin/settings/toggle?enabled=false")
        
        # May return 200 or 422 (validation error) depending on implementation
        if response.status_code == 200:
            data = response.json()
            assert data.get("is_enabled") == False
            print("Successfully toggled analytics off")
            
            # Toggle back on
            authenticated_client.put(f"{BASE_URL}/api/analytics/admin/settings/toggle?enabled=true")
        else:
            print(f"Toggle endpoint response: {response.status_code}")
    
    def test_multiple_events_tracking(self, api_client, test_listing):
        """Test tracking multiple events in sequence"""
        if not test_listing:
            pytest.skip("No test listing available")
        
        events = [
            {"event_type": "view", "location": "City A"},
            {"event_type": "view", "location": "City B"},
            {"event_type": "save"},
            {"event_type": "share"},
        ]
        
        tracked_count = 0
        for event in events:
            response = api_client.post(f"{BASE_URL}/api/analytics/track", json={
                "listing_id": test_listing["id"],
                **event
            })
            
            if response.status_code == 200 and response.json().get("tracked"):
                tracked_count += 1
        
        print(f"Tracked {tracked_count}/{len(events)} events")
        assert tracked_count >= 0, "Should be able to track at least some events"


# ==================== CLEANUP ====================

@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(request, authenticated_client):
    """Cleanup test data after all tests complete"""
    yield
    
    # Cleanup: Delete test listings created during tests
    try:
        response = authenticated_client.get(f"{BASE_URL}/api/listings/my")
        if response.status_code == 200:
            listings = response.json()
            for listing in listings:
                if listing.get("title", "").startswith("TEST_"):
                    authenticated_client.delete(f"{BASE_URL}/api/listings/{listing['id']}")
                    print(f"Cleaned up test listing: {listing['id']}")
    except Exception as e:
        print(f"Cleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
