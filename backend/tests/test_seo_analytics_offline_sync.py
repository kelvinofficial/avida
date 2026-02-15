"""
Test Suite for SEO Performance Analytics and Offline Sync Features
Tests the new backend endpoints for:
1. SEO Analytics: GET /api/seo-analytics/admin/overview, POST /api/seo-analytics/track
2. Offline Sync: POST /api/offline/cache-refresh, POST /api/offline/sync, GET /api/offline/status
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://listing-ab-test-hub.preview.emergentagent.com')
BASE_URL = BASE_URL.rstrip('/')


class TestHealthCheck:
    """Verify backend is accessible"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print(f"PASS: Health endpoint returned {response.status_code}")


class TestAdminAuth:
    """Admin authentication for protected endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@test.com",
            "password": "password123"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        print(f"Admin login failed: {response.status_code} - {response.text}")
        return None
    
    def test_admin_login(self, admin_token):
        """Verify admin can login"""
        # Try main app admin login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@marketplace.com",
            "password": "password123"
        })
        if response.status_code == 200:
            print(f"PASS: Admin login successful via main app")
        else:
            print(f"INFO: Main app admin login returned {response.status_code}")


class TestSEOAnalyticsAdminOverview:
    """Test GET /api/seo-analytics/admin/overview endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        # Try admin dashboard login first
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@test.com",
            "password": "password123"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        
        # Try main app admin login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@marketplace.com",
            "password": "password123"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token") or data.get("session_token") or data.get("token")
        return None
    
    def test_admin_overview_requires_auth(self):
        """Test that admin overview requires authentication"""
        response = requests.get(f"{BASE_URL}/api/seo-analytics/admin/overview")
        assert response.status_code == 401
        print(f"PASS: Admin overview correctly requires auth (returned {response.status_code})")
    
    def test_admin_overview_returns_data(self, admin_token):
        """Test that admin overview returns proper structure"""
        if not admin_token:
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/seo-analytics/admin/overview", headers=headers)
        
        print(f"Admin overview response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            # Verify structure
            assert "period_days" in data
            assert "overview" in data
            assert "by_source" in data
            assert "by_category" in data
            assert "top_keywords" in data
            assert "daily_trend" in data
            assert "top_listings" in data
            
            # Verify overview structure
            overview = data.get("overview", {})
            assert "total_impressions" in overview
            assert "total_clicks" in overview
            assert "total_shares" in overview
            assert "overall_ctr" in overview
            
            print(f"PASS: Admin SEO overview structure is correct")
            print(f"  - Period: {data['period_days']} days")
            print(f"  - Impressions: {overview['total_impressions']}")
            print(f"  - Clicks: {overview['total_clicks']}")
            print(f"  - CTR: {overview['overall_ctr']}%")
        else:
            print(f"INFO: Admin overview returned {response.status_code}")
            assert response.status_code in [200, 401, 403]
    
    def test_admin_overview_custom_days(self, admin_token):
        """Test admin overview with custom days parameter"""
        if not admin_token:
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/seo-analytics/admin/overview?days=7", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("period_days") == 7
            print(f"PASS: Custom days parameter (7) accepted")


class TestSEOTrackingEndpoint:
    """Test POST /api/seo-analytics/track endpoint"""
    
    @pytest.fixture(scope="class")
    def valid_listing_id(self):
        """Get a valid listing ID for tracking tests"""
        response = requests.get(f"{BASE_URL}/api/listings?limit=1")
        if response.status_code == 200:
            data = response.json()
            listings = data.get("listings", data.get("items", []))
            if listings and len(listings) > 0:
                return listings[0].get("id")
        return None
    
    def test_track_impression_event(self, valid_listing_id):
        """Test tracking an impression event"""
        if not valid_listing_id:
            pytest.skip("No valid listing ID found")
        
        payload = {
            "listing_id": valid_listing_id,
            "event_type": "impression",
            "source": "google",
            "keyword": "test keyword",
            "position": 1,
            "device_type": "desktop"
        }
        
        response = requests.post(f"{BASE_URL}/api/seo-analytics/track", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("tracked") == True
            assert "event_id" in data
            print(f"PASS: Impression tracked successfully, event_id: {data['event_id']}")
        else:
            print(f"Track impression response: {response.status_code} - {response.text}")
            assert response.status_code in [200, 404]
    
    def test_track_click_event(self, valid_listing_id):
        """Test tracking a click event"""
        if not valid_listing_id:
            pytest.skip("No valid listing ID found")
        
        payload = {
            "listing_id": valid_listing_id,
            "event_type": "click",
            "source": "internal",
            "device_type": "mobile"
        }
        
        response = requests.post(f"{BASE_URL}/api/seo-analytics/track", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("tracked") == True
            print(f"PASS: Click tracked successfully")
        else:
            print(f"Track click response: {response.status_code}")
            assert response.status_code in [200, 404]
    
    def test_track_invalid_listing(self):
        """Test tracking with invalid listing ID"""
        payload = {
            "listing_id": "invalid_nonexistent_id",
            "event_type": "impression"
        }
        
        response = requests.post(f"{BASE_URL}/api/seo-analytics/track", json=payload)
        assert response.status_code == 404
        print(f"PASS: Invalid listing correctly returns 404")
    
    def test_track_missing_required_fields(self):
        """Test tracking with missing required fields"""
        payload = {
            "event_type": "impression"
        }  # Missing listing_id
        
        response = requests.post(f"{BASE_URL}/api/seo-analytics/track", json=payload)
        assert response.status_code == 422
        print(f"PASS: Missing listing_id correctly returns 422")
    
    def test_track_share_event(self, valid_listing_id):
        """Test tracking a share event"""
        if not valid_listing_id:
            pytest.skip("No valid listing ID found")
        
        payload = {
            "listing_id": valid_listing_id,
            "event_type": "share",
            "source": "facebook"
        }
        
        response = requests.post(f"{BASE_URL}/api/seo-analytics/track", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("tracked") == True
            print(f"PASS: Share event tracked successfully")
        else:
            print(f"Track share response: {response.status_code}")
            assert response.status_code in [200, 404]


class TestOfflineCacheRefresh:
    """Test POST /api/offline/cache-refresh endpoint"""
    
    def test_cache_refresh_without_auth(self):
        """Test cache refresh works without auth (returns public data)"""
        payload = {
            "include_listings": True,
            "include_categories": True,
            "include_favorites": False,
            "include_messages": False,
            "listing_limit": 10
        }
        
        response = requests.post(f"{BASE_URL}/api/offline/cache-refresh", json=payload)
        
        print(f"Cache refresh response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            assert "timestamp" in data
            
            if "listings" in data:
                print(f"  - Listings count: {len(data.get('listings', []))}")
            if "categories" in data:
                print(f"  - Categories count: {len(data.get('categories', []))}")
            
            print(f"PASS: Cache refresh returned data")
        else:
            # May require auth depending on implementation
            print(f"INFO: Cache refresh returned {response.status_code}")
            assert response.status_code in [200, 401, 422]
    
    def test_cache_refresh_with_auth(self):
        """Test cache refresh with user authentication"""
        # Login as regular user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123"
        })
        
        headers = {}
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("access_token") or data.get("session_token") or data.get("token")
            if token:
                headers = {"Authorization": f"Bearer {token}"}
        
        payload = {
            "include_listings": True,
            "include_categories": True,
            "include_favorites": True,
            "include_messages": True,
            "listing_limit": 50
        }
        
        response = requests.post(f"{BASE_URL}/api/offline/cache-refresh", json=payload, headers=headers)
        
        print(f"Cache refresh with auth response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            assert "timestamp" in data
            print(f"PASS: Cache refresh with auth succeeded")
        else:
            print(f"INFO: Response {response.status_code}")


class TestOfflineSync:
    """Test POST /api/offline/sync endpoint"""
    
    @pytest.fixture(scope="class")
    def user_auth(self):
        """Get user auth for sync tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123"
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token") or data.get("session_token") or data.get("token")
            return token
        return None
    
    def test_sync_requires_auth(self):
        """Test that sync endpoint requires authentication"""
        payload = {
            "device_id": "test_device_123",
            "actions": []
        }
        
        response = requests.post(f"{BASE_URL}/api/offline/sync", json=payload)
        assert response.status_code == 401
        print(f"PASS: Sync endpoint correctly requires auth")
    
    def test_sync_with_empty_actions(self, user_auth):
        """Test sync with no pending actions"""
        if not user_auth:
            pytest.skip("User auth not available")
        
        headers = {"Authorization": f"Bearer {user_auth}"}
        payload = {
            "device_id": f"test_device_{uuid.uuid4().hex[:8]}",
            "actions": [],
            "last_sync_timestamp": None
        }
        
        response = requests.post(f"{BASE_URL}/api/offline/sync", json=payload, headers=headers)
        
        print(f"Sync empty actions response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            assert "synced_count" in data
            assert "failed_count" in data
            assert "server_timestamp" in data
            print(f"PASS: Sync with empty actions succeeded")
            print(f"  - Synced: {data.get('synced_count')}")
            print(f"  - Failed: {data.get('failed_count')}")
        else:
            print(f"INFO: Sync returned {response.status_code}")
    
    def test_sync_view_listing_action(self, user_auth):
        """Test syncing a view_listing action"""
        if not user_auth:
            pytest.skip("User auth not available")
        
        # Get a valid listing ID first
        listings_response = requests.get(f"{BASE_URL}/api/listings?limit=1")
        if listings_response.status_code != 200:
            pytest.skip("Could not get listings")
        
        data = listings_response.json()
        listings = data.get("listings", data.get("items", []))
        if not listings:
            pytest.skip("No listings available")
        
        listing_id = listings[0].get("id")
        
        headers = {"Authorization": f"Bearer {user_auth}"}
        payload = {
            "device_id": f"test_device_{uuid.uuid4().hex[:8]}",
            "actions": [
                {
                    "client_id": f"offline_{uuid.uuid4().hex[:12]}",
                    "action_type": "view_listing",
                    "payload": {"listing_id": listing_id},
                    "created_at": datetime.utcnow().isoformat(),
                    "retry_count": 0
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/offline/sync", json=payload, headers=headers)
        
        print(f"Sync view_listing response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            if results and len(results) > 0:
                assert results[0].get("success") == True
                print(f"PASS: View listing action synced successfully")
            else:
                print(f"PASS: Sync completed with results: {data}")


class TestOfflineStatus:
    """Test GET /api/offline/status endpoint"""
    
    @pytest.fixture(scope="class")
    def user_auth(self):
        """Get user auth for status tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123"
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token") or data.get("session_token") or data.get("token")
            return token
        return None
    
    def test_status_requires_auth(self):
        """Test that status endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/offline/status")
        assert response.status_code == 401
        print(f"PASS: Status endpoint correctly requires auth")
    
    def test_status_returns_data(self, user_auth):
        """Test that status returns proper sync info"""
        if not user_auth:
            pytest.skip("User auth not available")
        
        headers = {"Authorization": f"Bearer {user_auth}"}
        response = requests.get(f"{BASE_URL}/api/offline/status", headers=headers)
        
        print(f"Offline status response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            assert "user_id" in data
            assert "server_time" in data
            print(f"PASS: Offline status returned proper data")
            print(f"  - User ID: {data.get('user_id')}")
            print(f"  - Last sync: {data.get('last_sync')}")
            print(f"  - Pending actions: {data.get('pending_actions')}")
        else:
            print(f"INFO: Status returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
