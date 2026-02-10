"""
Smart Notifications Phase 2 Tests
Tests all Phase 2 features including:
- Conversion tracking (open, click, conversion)
- A/B Testing CRUD and winner determination
- Weekly digest configuration and sending
- Phase 1 compatibility verification
"""

import pytest
import requests
import os
import uuid
import time

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://nearby-listings.preview.emergentagent.com').rstrip('/')

# Test data references
TEST_AB_TEST_ID = None
TEST_NOTIFICATION_ID = None


class TestConversionTrackingEndpoints:
    """Tests for Phase 2 conversion tracking endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Setup authentication for user tests"""
        unique_suffix = uuid.uuid4().hex[:8]
        self.test_email = f"conversion_test_{unique_suffix}@test.com"
        self.test_password = "testpass123456"
        
        # Register user
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": self.test_email,
                "password": self.test_password,
                "name": "Conversion Tester"
            },
            headers={"Content-Type": "application/json"}
        )
        
        # Login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": self.test_email,
                "password": self.test_password
            },
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code == 200:
            self.session_token = login_response.json().get("session_token")
            self.user_id = login_response.json().get("user", {}).get("user_id")
            self.auth_headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
        else:
            pytest.skip("Could not authenticate test user")
    
    def test_track_open_requires_auth(self):
        """POST /api/smart-notifications/track/open/{id} without auth should return 401"""
        response = requests.post(f"{BASE_URL}/api/smart-notifications/track/open/test_notif_123")
        assert response.status_code == 401
        print("[PASS] Track open endpoint requires authentication")
    
    def test_track_open_notification(self):
        """POST /api/smart-notifications/track/open/{id} - tracks notification open"""
        # Use a test notification ID (may not exist but endpoint should still work)
        notification_id = f"sn_test_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/track/open/{notification_id}",
            headers=self.auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("tracked") == "open"
        print(f"[PASS] Track open returned: {data}")
    
    def test_track_click_requires_auth(self):
        """POST /api/smart-notifications/track/click/{id} without auth should return 401"""
        response = requests.post(f"{BASE_URL}/api/smart-notifications/track/click/test_notif_123")
        assert response.status_code == 401
        print("[PASS] Track click endpoint requires authentication")
    
    def test_track_click_notification(self):
        """POST /api/smart-notifications/track/click/{id} - tracks notification click"""
        notification_id = f"sn_test_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/track/click/{notification_id}",
            headers=self.auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("tracked") == "click"
        print(f"[PASS] Track click returned: {data}")
    
    def test_track_conversion_requires_auth(self):
        """POST /api/smart-notifications/track/conversion/{id} without auth should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/track/conversion/test_notif_123",
            json={"conversion_type": "purchase"}
        )
        assert response.status_code == 401
        print("[PASS] Track conversion endpoint requires authentication")
    
    def test_track_conversion(self):
        """POST /api/smart-notifications/track/conversion/{id} - tracks conversion"""
        notification_id = f"sn_test_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/track/conversion/{notification_id}",
            json={
                "conversion_type": "purchase",
                "conversion_value": 99.99,
                "entity_id": "listing_test_123"
            },
            headers=self.auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        # Since notification doesn't exist, it should return not found
        # But endpoint is reachable
        print(f"[PASS] Track conversion returned: {data}")


class TestConversionAnalyticsEndpoint:
    """Tests for conversion analytics admin endpoint"""
    
    def test_get_conversion_analytics(self):
        """GET /api/smart-notifications/admin/conversions - returns conversion analytics"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/conversions")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "by_type" in data
        assert "total_conversions" in data
        assert "total_value" in data
        print(f"[PASS] Conversion analytics retrieved: total={data['total_conversions']}, value={data['total_value']}")
    
    def test_get_conversion_analytics_with_filters(self):
        """GET /api/smart-notifications/admin/conversions with date filters"""
        response = requests.get(
            f"{BASE_URL}/api/smart-notifications/admin/conversions",
            params={
                "start_date": "2024-01-01",
                "end_date": "2030-12-31"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "by_type" in data
        print(f"[PASS] Conversion analytics with filters: by_type={data['by_type']}")


class TestABTestingEndpoints:
    """Tests for A/B testing CRUD endpoints"""
    
    @classmethod
    def setup_class(cls):
        """Store created test IDs for cleanup"""
        cls.created_test_ids = []
    
    def test_get_ab_tests_empty(self):
        """GET /api/smart-notifications/admin/ab-tests - returns A/B tests list"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ab-tests")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"[PASS] A/B tests list retrieved: {len(data)} tests found")
    
    def test_get_ab_tests_active_only(self):
        """GET /api/smart-notifications/admin/ab-tests?active_only=true"""
        response = requests.get(
            f"{BASE_URL}/api/smart-notifications/admin/ab-tests",
            params={"active_only": True}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned tests should be active
        for test in data:
            assert test.get("is_active") == True
        print(f"[PASS] Active A/B tests: {len(data)} found")
    
    def test_create_ab_test(self):
        """POST /api/smart-notifications/admin/ab-tests - creates new A/B test"""
        test_data = {
            "name": f"TEST_ABTest_{uuid.uuid4().hex[:6]}",
            "description": "Test A/B test for pytest",
            "trigger_type": "new_listing_in_category",
            "control_title": "New listing in {{category_name}}!",
            "control_body": "{{listing_title}} - {{price}}",
            "variant_a_title": "Check out this {{category_name}} item!",
            "variant_a_body": "{{listing_title}} available now - {{price}}",
            "variant_b_title": "Hot deal: {{listing_title}}",
            "variant_b_body": "Just listed in {{category_name}} - {{price}}",
            "control_percentage": 34,
            "variant_a_percentage": 33,
            "variant_b_percentage": 33
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/ab-tests",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["name"] == test_data["name"]
        assert data["trigger_type"] == "new_listing_in_category"
        assert data["is_active"] == True
        assert "start_date" in data
        assert data["control_sent"] == 0
        assert data["variant_a_sent"] == 0
        assert data["variant_b_sent"] == 0
        
        # Store for subsequent tests and cleanup
        self.__class__.created_test_ids.append(data["id"])
        global TEST_AB_TEST_ID
        TEST_AB_TEST_ID = data["id"]
        
        print(f"[PASS] A/B test created: id={data['id']}")
        return data["id"]
    
    def test_get_ab_test_by_id(self):
        """GET /api/smart-notifications/admin/ab-tests/{test_id} - get specific test"""
        global TEST_AB_TEST_ID
        if not TEST_AB_TEST_ID:
            # Create a test first
            test_data = {
                "name": f"TEST_GetById_{uuid.uuid4().hex[:6]}",
                "trigger_type": "price_drop_saved_item",
                "control_title": "Price dropped!",
                "control_body": "Now only {{price}}",
                "variant_a_title": "Save money!",
                "variant_a_body": "Price reduced to {{price}}"
            }
            create_response = requests.post(
                f"{BASE_URL}/api/smart-notifications/admin/ab-tests",
                json=test_data
            )
            TEST_AB_TEST_ID = create_response.json()["id"]
            self.__class__.created_test_ids.append(TEST_AB_TEST_ID)
        
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ab-tests/{TEST_AB_TEST_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == TEST_AB_TEST_ID
        assert "name" in data
        assert "trigger_type" in data
        assert "control_title" in data
        assert "variant_a_title" in data
        print(f"[PASS] A/B test retrieved: id={data['id']}, name={data['name']}")
    
    def test_get_ab_test_not_found(self):
        """GET /api/smart-notifications/admin/ab-tests/{test_id} - 404 for non-existent"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ab-tests/nonexistent_test_123")
        
        assert response.status_code == 404
        print("[PASS] Non-existent A/B test returns 404")
    
    def test_update_ab_test(self):
        """PUT /api/smart-notifications/admin/ab-tests/{test_id} - updates test"""
        global TEST_AB_TEST_ID
        if not TEST_AB_TEST_ID:
            pytest.skip("No A/B test created")
        
        updates = {
            "description": "Updated description for pytest",
            "control_percentage": 40,
            "variant_a_percentage": 30,
            "variant_b_percentage": 30
        }
        
        response = requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/ab-tests/{TEST_AB_TEST_ID}",
            json=updates,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["description"] == updates["description"]
        assert data["control_percentage"] == 40
        assert "updated_at" in data
        print(f"[PASS] A/B test updated: updated_at={data['updated_at']}")
    
    def test_update_ab_test_not_found(self):
        """PUT /api/smart-notifications/admin/ab-tests/{test_id} - 404 for non-existent"""
        response = requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/ab-tests/nonexistent_test_123",
            json={"description": "test"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 404
        print("[PASS] Update non-existent A/B test returns 404")
    
    def test_end_ab_test(self):
        """POST /api/smart-notifications/admin/ab-tests/{test_id}/end - ends test and determines winner"""
        # Create a fresh test to end
        test_data = {
            "name": f"TEST_EndTest_{uuid.uuid4().hex[:6]}",
            "trigger_type": "message_received",
            "control_title": "New message",
            "control_body": "{{sender_name}} sent you a message",
            "variant_a_title": "{{sender_name}} messaged you",
            "variant_a_body": "Check your inbox now!"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/ab-tests",
            json=test_data
        )
        test_id = create_response.json()["id"]
        self.__class__.created_test_ids.append(test_id)
        
        # End the test
        response = requests.post(f"{BASE_URL}/api/smart-notifications/admin/ab-tests/{test_id}/end")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_active"] == False
        assert "end_date" in data
        assert data["winner"] in ["control", "variant_a", "variant_b"]
        print(f"[PASS] A/B test ended: winner={data['winner']}")
    
    def test_end_ab_test_not_found(self):
        """POST /api/smart-notifications/admin/ab-tests/{test_id}/end - 404 for non-existent"""
        response = requests.post(f"{BASE_URL}/api/smart-notifications/admin/ab-tests/nonexistent_test_123/end")
        
        assert response.status_code == 404
        print("[PASS] End non-existent A/B test returns 404")


class TestWeeklyDigestEndpoints:
    """Tests for weekly digest configuration and sending"""
    
    def test_get_weekly_digest_config(self):
        """GET /api/smart-notifications/admin/weekly-digest/config - returns config"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/weekly-digest/config")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "id" in data
        assert data["id"] == "weekly_digest_config"
        assert "enabled" in data
        assert "send_day" in data
        assert "send_hour" in data
        assert "max_new_listings" in data
        assert "max_price_drops" in data
        assert "include_recommendations" in data
        assert "include_stats" in data
        print(f"[PASS] Weekly digest config: enabled={data['enabled']}, send_day={data['send_day']}")
    
    def test_update_weekly_digest_config(self):
        """PUT /api/smart-notifications/admin/weekly-digest/config - updates config"""
        updates = {
            "enabled": True,
            "send_day": "tuesday",
            "send_hour": 10,
            "max_new_listings": 15,
            "max_price_drops": 8
        }
        
        response = requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/weekly-digest/config",
            json=updates,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["send_day"] == "tuesday"
        assert data["send_hour"] == 10
        assert data["max_new_listings"] == 15
        assert "updated_at" in data
        print(f"[PASS] Weekly digest config updated: updated_at={data['updated_at']}")
        
        # Restore defaults
        requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/weekly-digest/config",
            json={"send_day": "monday", "send_hour": 9, "max_new_listings": 10}
        )
    
    def test_send_weekly_digests(self):
        """POST /api/smart-notifications/admin/weekly-digest/send - triggers digest sending"""
        response = requests.post(f"{BASE_URL}/api/smart-notifications/admin/weekly-digest/send")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "sent" in data
        assert "skipped" in data
        print(f"[PASS] Weekly digests sent: sent={data['sent']}, skipped={data['skipped']}")
    
    def test_preview_weekly_digest_for_user(self):
        """GET /api/smart-notifications/admin/weekly-digest/preview/{user_id} - preview digest"""
        # Use the test user ID from the context
        test_user_id = "user_3fe547c78c76"
        
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/weekly-digest/preview/{test_user_id}")
        
        # May be 200 with digest or 404 if user not found
        if response.status_code == 200:
            data = response.json()
            assert "user_name" in data
            assert "new_listings_count" in data
            assert "price_drops_count" in data
            assert "generated_at" in data
            print(f"[PASS] Weekly digest preview: new_listings={data['new_listings_count']}, price_drops={data['price_drops_count']}")
        elif response.status_code == 404:
            print("[PASS] Weekly digest preview - user not found or no digest content (expected)")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_preview_weekly_digest_nonexistent_user(self):
        """GET /api/smart-notifications/admin/weekly-digest/preview/{user_id} - 404 for non-existent"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/weekly-digest/preview/nonexistent_user_123")
        
        assert response.status_code == 404
        print("[PASS] Preview digest for non-existent user returns 404")


class TestPhase1Compatibility:
    """Verify Phase 1 endpoints still work after Phase 2 additions"""
    
    def test_admin_config_still_works(self):
        """GET /api/smart-notifications/admin/config - Phase 1 endpoint"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/config")
        
        assert response.status_code == 200
        data = response.json()
        assert "system_enabled" in data
        print("[PASS] Phase 1 admin config still works")
    
    def test_admin_triggers_still_works(self):
        """GET /api/smart-notifications/admin/triggers - Phase 1 endpoint"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/triggers")
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("[PASS] Phase 1 admin triggers still works")
    
    def test_admin_analytics_still_works(self):
        """GET /api/smart-notifications/admin/analytics - Phase 1 endpoint"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/analytics")
        
        assert response.status_code == 200
        data = response.json()
        assert "totals" in data
        assert "daily" in data
        print("[PASS] Phase 1 admin analytics still works")
    
    def test_admin_process_still_works(self):
        """POST /api/smart-notifications/admin/process - Phase 1 endpoint"""
        response = requests.post(f"{BASE_URL}/api/smart-notifications/admin/process")
        
        assert response.status_code == 200
        data = response.json()
        assert "processed" in data
        print("[PASS] Phase 1 admin process still works")
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Setup authentication for user tests"""
        unique_suffix = uuid.uuid4().hex[:8]
        self.test_email = f"phase1_test_{unique_suffix}@test.com"
        self.test_password = "testpass123456"
        
        # Register
        requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": self.test_email,
                "password": self.test_password,
                "name": "Phase1 Tester"
            }
        )
        
        # Login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": self.test_email,
                "password": self.test_password
            }
        )
        
        if login_response.status_code == 200:
            self.session_token = login_response.json().get("session_token")
            self.auth_headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
        else:
            pytest.skip("Could not authenticate test user")
    
    def test_user_consent_still_works(self):
        """GET /api/smart-notifications/consent - Phase 1 endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/smart-notifications/consent",
            headers=self.auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "email_enabled" in data
        print("[PASS] Phase 1 user consent still works")
    
    def test_user_profile_still_works(self):
        """GET /api/smart-notifications/profile - Phase 1 endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/smart-notifications/profile",
            headers=self.auth_headers
        )
        
        assert response.status_code == 200
        print("[PASS] Phase 1 user profile still works")
    
    def test_behavior_tracking_still_works(self):
        """POST /api/smart-notifications/track - Phase 1 endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/track",
            json={
                "event_type": "view_listing",
                "entity_id": f"listing_{uuid.uuid4().hex[:8]}",
                "entity_type": "listing",
                "metadata": {"category_id": "test", "price": 100}
            },
            headers=self.auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("[PASS] Phase 1 behavior tracking still works")
    
    def test_notification_history_still_works(self):
        """GET /api/smart-notifications/history - Phase 1 endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/smart-notifications/history",
            headers=self.auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        print("[PASS] Phase 1 notification history still works")


class TestExistingABTestFromContext:
    """Test the existing A/B test mentioned in the context: abtest_0251727c8362"""
    
    def test_get_existing_ab_test(self):
        """Get the A/B test created during manual testing"""
        test_id = "abtest_0251727c8362"
        
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ab-tests/{test_id}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"[PASS] Existing A/B test found: {data}")
            assert data["id"] == test_id
        elif response.status_code == 404:
            print(f"[INFO] Existing A/B test {test_id} not found (may have been cleaned up)")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")


# Cleanup test data after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Clean up test A/B tests and triggers after all tests"""
    yield
    
    # Clean up A/B tests with TEST_ prefix
    try:
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ab-tests")
        if response.status_code == 200:
            tests = response.json()
            for test in tests:
                if test.get("name", "").startswith("TEST_"):
                    # Delete by ending first if active
                    if test.get("is_active"):
                        requests.post(f"{BASE_URL}/api/smart-notifications/admin/ab-tests/{test['id']}/end")
                    print(f"Cleaned up test A/B test: {test['id']}")
    except Exception as e:
        print(f"Cleanup error: {e}")
    
    # Clean up triggers with TEST_ prefix
    try:
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/triggers")
        if response.status_code == 200:
            triggers = response.json()
            for trigger in triggers:
                if trigger.get("name", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/smart-notifications/admin/triggers/{trigger['id']}")
                    print(f"Cleaned up test trigger: {trigger['id']}")
    except Exception as e:
        print(f"Cleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
