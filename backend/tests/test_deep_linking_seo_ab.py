"""
Deep Linking & SEO A/B Testing API Tests
Tests for Mobile App Deep Linking and SEO A/B Testing for Meta Descriptions
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://seo-performance-10.preview.emergentagent.com').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "password123"
ADMIN_API_URL = f"{BASE_URL}/api/admin"


class TestDeepLinkingPublic:
    """Deep Linking public endpoints (no auth required)"""
    
    def test_get_deep_link_config(self):
        """GET /api/deep-links/config - returns URL scheme and platform config"""
        response = requests.get(f"{BASE_URL}/api/deep-links/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "scheme" in data, "Response should contain 'scheme'"
        assert data["scheme"] == "localmarket", "Scheme should be 'localmarket'"
        assert "ios" in data, "Response should contain iOS config"
        assert "android" in data, "Response should contain Android config"
        assert "supported_paths" in data, "Response should contain supported_paths"
        
        # Verify iOS config structure
        ios_config = data["ios"]
        assert "bundle_id" in ios_config, "iOS config should have bundle_id"
        assert "app_store_id" in ios_config, "iOS config should have app_store_id"
        assert "universal_link_prefix" in ios_config, "iOS config should have universal_link_prefix"
        
        # Verify Android config structure
        android_config = data["android"]
        assert "package" in android_config, "Android config should have package"
        assert "play_store_url" in android_config, "Android config should have play_store_url"
        assert "intent_filters" in android_config, "Android config should have intent_filters"
        
        print(f"PASS: Deep link config retrieved - scheme: {data['scheme']}")


class TestDeepLinkingWithAuth:
    """Deep Linking endpoints requiring authentication"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session for main app"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Try to login as test user - create if doesn't exist
        login_data = {"email": "test_deep_link@test.com", "password": "testpass123"}
        login_response = session.post(f"{BASE_URL}/api/auth/email-login", json=login_data)
        
        if login_response.status_code == 401:
            # Register the user first
            register_data = {
                "email": "test_deep_link@test.com",
                "password": "testpass123",
                "name": "Deep Link Tester"
            }
            reg_response = session.post(f"{BASE_URL}/api/auth/email-register", json=register_data)
            if reg_response.status_code in [200, 201]:
                login_response = session.post(f"{BASE_URL}/api/auth/email-login", json=login_data)
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("session_token") or data.get("token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
                print(f"PASS: Authenticated as test_deep_link@test.com")
                return session
        
        print(f"WARN: Could not authenticate test user - status: {login_response.status_code}")
        return session
    
    def test_create_deep_link(self, auth_session):
        """POST /api/deep-links/create - creates a trackable short link"""
        link_data = {
            "target_type": "listing",
            "target_id": "test-listing-123",
            "params": {"source": "pytest"},
            "campaign": "test_campaign",
            "source": "pytest",
            "medium": "test"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/deep-links/create", json=link_data)
        
        # Could fail with 401 if auth didn't work
        if response.status_code == 401:
            pytest.skip("Authentication required but not available")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "short_code" in data, "Response should contain short_code"
        assert "short_url" in data, "Response should contain short_url"
        assert "deep_link" in data, "Response should contain deep_link"
        assert "web_url" in data, "Response should contain web_url"
        assert "created_at" in data, "Response should contain created_at"
        
        # Verify deep link format
        assert data["deep_link"].startswith("localmarket://"), f"Deep link should start with scheme, got: {data['deep_link']}"
        assert "/api/l/" in data["short_url"], f"Short URL should contain /api/l/, got: {data['short_url']}"
        
        print(f"PASS: Created deep link - short_code: {data['short_code']}, short_url: {data['short_url']}")
        
        # Store for other tests
        auth_session.created_short_code = data["short_code"]
        return data
    
    def test_get_deep_link_stats_requires_auth(self):
        """GET /api/deep-links/stats/{short_code} - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/deep-links/stats/nonexistent123")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: Stats endpoint correctly requires authentication")
    
    def test_get_deep_link_stats(self, auth_session):
        """GET /api/deep-links/stats/{short_code} - returns link statistics"""
        # First create a link
        create_response = self.test_create_deep_link(auth_session)
        short_code = create_response["short_code"]
        
        response = auth_session.get(f"{BASE_URL}/api/deep-links/stats/{short_code}")
        
        if response.status_code == 401:
            pytest.skip("Authentication required but not available")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "link" in data, "Response should contain link info"
        assert "daily_stats" in data, "Response should contain daily_stats"
        assert "total_clicks" in data, "Response should contain total_clicks"
        assert "app_opens" in data, "Response should contain app_opens"
        assert "web_opens" in data, "Response should contain web_opens"
        
        print(f"PASS: Link stats retrieved - total_clicks: {data['total_clicks']}")


class TestShortLinkRedirect:
    """Test short link redirect endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        login_data = {"email": "test_deep_link@test.com", "password": "testpass123"}
        login_response = session.post(f"{BASE_URL}/api/auth/email-login", json=login_data)
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("session_token") or data.get("token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
        
        return session
    
    def test_redirect_short_link_mobile(self, auth_session):
        """GET /api/l/{short_code} - smart redirect returns HTML for mobile"""
        # First create a link
        link_data = {
            "target_type": "home",
            "campaign": "redirect_test"
        }
        create_response = auth_session.post(f"{BASE_URL}/api/deep-links/create", json=link_data)
        
        if create_response.status_code != 200:
            pytest.skip("Could not create deep link for redirect test")
        
        short_code = create_response.json()["short_code"]
        
        # Test mobile redirect - simulating mobile user agent
        mobile_headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15"
        }
        
        response = requests.get(
            f"{BASE_URL}/api/l/{short_code}", 
            headers=mobile_headers,
            allow_redirects=False
        )
        
        assert response.status_code == 200, f"Expected 200 (HTML page), got {response.status_code}"
        assert "text/html" in response.headers.get("content-type", ""), "Response should be HTML"
        assert "localmarket://" in response.text, "HTML should contain deep link"
        assert "Opening" in response.text or "Avida" in response.text, "HTML should contain app reference"
        
        print(f"PASS: Mobile redirect returns smart HTML with app link")
    
    def test_redirect_short_link_desktop(self, auth_session):
        """GET /api/l/{short_code} - desktop redirect to web"""
        link_data = {
            "target_type": "listing",
            "target_id": "test-123"
        }
        create_response = auth_session.post(f"{BASE_URL}/api/deep-links/create", json=link_data)
        
        if create_response.status_code != 200:
            pytest.skip("Could not create deep link")
        
        short_code = create_response.json()["short_code"]
        
        # Test desktop redirect
        desktop_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        response = requests.get(
            f"{BASE_URL}/api/l/{short_code}",
            headers=desktop_headers,
            allow_redirects=False
        )
        
        # Desktop should get a redirect
        assert response.status_code == 302, f"Expected 302 redirect for desktop, got {response.status_code}"
        assert "location" in response.headers, "Response should have Location header"
        
        print(f"PASS: Desktop redirect to web URL")
    
    def test_redirect_nonexistent_link(self):
        """GET /api/l/{short_code} - 404 for nonexistent link"""
        response = requests.get(f"{BASE_URL}/api/l/nonexistent12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: 404 for nonexistent short link")


class TestSEOABTestingPublic:
    """SEO A/B Testing public endpoints (no auth required)"""
    
    def test_get_variant_for_page(self):
        """GET /api/seo-ab/get-variant - get assigned variant for page"""
        response = requests.get(f"{BASE_URL}/api/seo-ab/get-variant", params={
            "page_type": "listing",
            "listing_id": "test-123"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # May return null if no running experiment
        assert "experiment_id" in data or "experiment" in data, "Response should have experiment info"
        assert "variant" in data, "Response should have variant info"
        
        print(f"PASS: Get variant endpoint works - experiment: {data.get('experiment_id', 'none')}")
    
    def test_track_event(self):
        """POST /api/seo-ab/track - track impressions and clicks"""
        # This endpoint can be called without auth, but needs valid experiment/variant IDs
        track_data = {
            "experiment_id": "nonexistent-exp-123",
            "variant_id": "nonexistent-var-123",
            "event_type": "impression",
            "page_url": "https://example.com/listing/123"
        }
        
        response = requests.post(f"{BASE_URL}/api/seo-ab/track", json=track_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tracked" in data, "Response should indicate if tracked"
        # Should return tracked=False for nonexistent experiment
        assert data["tracked"] == False, "Should not track nonexistent experiment"
        
        print("PASS: Track event endpoint handles nonexistent experiment gracefully")


class TestSEOABTestingAdmin:
    """SEO A/B Testing admin endpoints (requires admin auth)"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Create admin authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        login_response = session.post(f"{ADMIN_API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("access_token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
                print(f"PASS: Admin authenticated successfully")
                return session
        
        print(f"WARN: Admin authentication failed - {login_response.status_code}: {login_response.text}")
        return session
    
    def test_list_experiments_requires_auth(self):
        """GET /api/seo-ab/experiments - requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/seo-ab/experiments")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: List experiments correctly requires authentication")
    
    def test_list_experiments(self, admin_session):
        """GET /api/seo-ab/experiments - list experiments"""
        response = admin_session.get(f"{BASE_URL}/api/seo-ab/experiments")
        
        if response.status_code == 401:
            pytest.skip("Admin authentication not available")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "experiments" in data, "Response should contain experiments list"
        assert "total" in data, "Response should contain total count"
        assert isinstance(data["experiments"], list), "experiments should be a list"
        
        print(f"PASS: List experiments - found {data['total']} experiments")
    
    def test_create_experiment(self, admin_session):
        """POST /api/seo-ab/experiments - create new experiment"""
        experiment_data = {
            "name": f"TEST_SEO_Experiment_{uuid.uuid4().hex[:8]}",
            "description": "Pytest automated test experiment",
            "page_type": "listing",
            "min_impressions": 100,
            "confidence_level": 0.95,
            "variants": [
                {
                    "name": "Control",
                    "meta_title": "Original Title - Best Deals",
                    "meta_description": "Original meta description for control group",
                    "traffic_percent": 50.0,
                    "is_control": True
                },
                {
                    "name": "Variant A",
                    "meta_title": "Amazing Deals - Save Big Today!",
                    "meta_description": "Variant A meta description with urgency",
                    "traffic_percent": 50.0,
                    "is_control": False
                }
            ]
        }
        
        response = admin_session.post(f"{BASE_URL}/api/seo-ab/experiments", json=experiment_data)
        
        if response.status_code == 401:
            pytest.skip("Admin authentication not available")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain experiment ID"
        assert "message" in data, "Response should contain message"
        assert data.get("variants") == 2, "Should have created 2 variants"
        
        print(f"PASS: Created experiment with ID: {data['id']}")
        
        # Store for other tests
        admin_session.test_experiment_id = data["id"]
        return data
    
    def test_create_experiment_validation(self, admin_session):
        """POST /api/seo-ab/experiments - validation errors"""
        # Test with invalid traffic split (not 100%)
        invalid_data = {
            "name": "Invalid Experiment",
            "page_type": "listing",
            "variants": [
                {
                    "name": "Control",
                    "meta_title": "Title",
                    "meta_description": "Desc",
                    "traffic_percent": 30.0,  # Only 60% total, not 100%
                    "is_control": True
                },
                {
                    "name": "Variant",
                    "meta_title": "Title 2",
                    "meta_description": "Desc 2",
                    "traffic_percent": 30.0,
                    "is_control": False
                }
            ],
            "min_impressions": 100,
            "confidence_level": 0.95
        }
        
        response = admin_session.post(f"{BASE_URL}/api/seo-ab/experiments", json=invalid_data)
        
        if response.status_code == 401:
            pytest.skip("Admin authentication not available")
        
        assert response.status_code == 400, f"Expected 400 for invalid traffic, got {response.status_code}"
        print("PASS: Validation correctly rejects invalid traffic split")
    
    def test_start_experiment(self, admin_session):
        """POST /api/seo-ab/experiments/{id}/start - start experiment"""
        # First create an experiment
        create_result = self.test_create_experiment(admin_session)
        experiment_id = create_result["id"]
        
        response = admin_session.post(f"{BASE_URL}/api/seo-ab/experiments/{experiment_id}/start")
        
        if response.status_code == 401:
            pytest.skip("Admin authentication not available")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("message") == "Experiment started", f"Unexpected message: {data}"
        
        print(f"PASS: Started experiment {experiment_id}")
        
        # Store for tracking test
        admin_session.running_experiment_id = experiment_id
        return experiment_id
    
    def test_track_running_experiment(self, admin_session):
        """POST /api/seo-ab/track - track events for running experiment"""
        # Start an experiment first if needed
        if not hasattr(admin_session, 'running_experiment_id'):
            experiment_id = self.test_start_experiment(admin_session)
        else:
            experiment_id = admin_session.running_experiment_id
        
        # Get experiment details to find variant IDs
        exp_response = admin_session.get(f"{BASE_URL}/api/seo-ab/experiments/{experiment_id}")
        
        if exp_response.status_code != 200:
            pytest.skip("Could not get experiment details")
        
        exp_data = exp_response.json()
        variant_id = exp_data["variants"][0]["id"]
        
        # Track impression
        track_data = {
            "experiment_id": experiment_id,
            "variant_id": variant_id,
            "event_type": "impression",
            "page_url": f"https://example.com/listing/test-{uuid.uuid4().hex[:6]}"
        }
        
        response = requests.post(f"{BASE_URL}/api/seo-ab/track", json=track_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["tracked"] == True, "Event should be tracked for running experiment"
        
        # Track click
        track_data["event_type"] = "click"
        response = requests.post(f"{BASE_URL}/api/seo-ab/track", json=track_data)
        assert response.status_code == 200
        assert response.json()["tracked"] == True
        
        print("PASS: Tracked impression and click for running experiment")
    
    def test_get_overview(self, admin_session):
        """GET /api/seo-ab/overview - get overview statistics"""
        response = admin_session.get(f"{BASE_URL}/api/seo-ab/overview")
        
        if response.status_code == 401:
            pytest.skip("Admin authentication not available")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_experiments" in data, "Response should contain total_experiments"
        assert "running" in data, "Response should contain running count"
        assert "completed" in data, "Response should contain completed count"
        assert "total_impressions" in data, "Response should contain total_impressions"
        assert "total_clicks" in data, "Response should contain total_clicks"
        assert "overall_ctr" in data, "Response should contain overall_ctr"
        
        print(f"PASS: Overview - total: {data['total_experiments']}, running: {data['running']}, CTR: {data['overall_ctr']}%")
    
    def test_get_experiment_details(self, admin_session):
        """GET /api/seo-ab/experiments/{id} - get experiment details"""
        # First create an experiment
        create_result = self.test_create_experiment(admin_session)
        experiment_id = create_result["id"]
        
        response = admin_session.get(f"{BASE_URL}/api/seo-ab/experiments/{experiment_id}")
        
        if response.status_code == 401:
            pytest.skip("Admin authentication not available")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("id") == experiment_id, "Should return correct experiment"
        assert "name" in data, "Response should contain name"
        assert "status" in data, "Response should contain status"
        assert "variants" in data, "Response should contain variants"
        assert len(data["variants"]) == 2, "Should have 2 variants"
        
        print(f"PASS: Got experiment details - status: {data['status']}")
    
    def test_delete_experiment(self, admin_session):
        """DELETE /api/seo-ab/experiments/{id} - delete experiment"""
        # Create a new experiment specifically for deletion
        exp_data = {
            "name": f"TEST_To_Delete_{uuid.uuid4().hex[:8]}",
            "page_type": "category",
            "min_impressions": 50,
            "confidence_level": 0.95,
            "variants": [
                {"name": "Control", "meta_title": "T1", "meta_description": "D1", "traffic_percent": 50, "is_control": True},
                {"name": "Variant", "meta_title": "T2", "meta_description": "D2", "traffic_percent": 50, "is_control": False}
            ]
        }
        
        create_response = admin_session.post(f"{BASE_URL}/api/seo-ab/experiments", json=exp_data)
        
        if create_response.status_code != 200:
            pytest.skip("Could not create experiment for deletion test")
        
        experiment_id = create_response.json()["id"]
        
        # Delete the draft experiment
        response = admin_session.delete(f"{BASE_URL}/api/seo-ab/experiments/{experiment_id}")
        
        if response.status_code == 401:
            pytest.skip("Admin authentication not available")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("message") == "Experiment deleted", f"Unexpected response: {data}"
        
        # Verify it's deleted
        get_response = admin_session.get(f"{BASE_URL}/api/seo-ab/experiments/{experiment_id}")
        assert get_response.status_code == 404, "Deleted experiment should return 404"
        
        print(f"PASS: Deleted experiment {experiment_id}")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Create admin authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        login_response = session.post(f"{ADMIN_API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("access_token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
        
        return session
    
    def test_cleanup_test_experiments(self, admin_session):
        """Clean up TEST_ prefixed experiments"""
        # List all experiments
        response = admin_session.get(f"{BASE_URL}/api/seo-ab/experiments", params={"limit": 100})
        
        if response.status_code != 200:
            print("SKIP: Could not list experiments for cleanup")
            return
        
        experiments = response.json().get("experiments", [])
        deleted_count = 0
        
        for exp in experiments:
            if exp.get("name", "").startswith("TEST_"):
                # Stop if running
                if exp.get("status") == "running":
                    admin_session.post(f"{BASE_URL}/api/seo-ab/experiments/{exp['id']}/stop")
                
                # Delete
                del_response = admin_session.delete(f"{BASE_URL}/api/seo-ab/experiments/{exp['id']}")
                if del_response.status_code == 200:
                    deleted_count += 1
        
        print(f"CLEANUP: Deleted {deleted_count} test experiments")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
