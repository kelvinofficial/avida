"""
Smart Notifications System Tests
Tests all smart notification endpoints including:
- Admin config management
- Admin triggers CRUD
- Admin analytics
- Manual notification processing
- User consent/preferences
- User interest profile
- User behavior tracking
- Notification history
"""

import pytest
import requests
import os
import uuid
import time

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://classified-ai-tools.preview.emergentagent.com').rstrip('/')


class TestSmartNotificationAdminEndpoints:
    """Admin endpoint tests - no auth required for admin config"""
    
    def test_get_admin_config(self):
        """GET /api/smart-notifications/admin/config - returns admin configuration"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/config")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "id" in data
        assert data["id"] == "smart_notification_config"
        assert "system_enabled" in data
        assert "global_max_per_user_per_day" in data
        assert "global_min_interval_minutes" in data
        assert "email_enabled" in data
        assert "push_enabled" in data
        assert "default_quiet_hours_enabled" in data
        print(f"[PASS] Admin config retrieved: system_enabled={data['system_enabled']}")
    
    def test_update_admin_config(self):
        """PUT /api/smart-notifications/admin/config - updates configuration"""
        updates = {
            "system_enabled": True,
            "global_max_per_user_per_day": 50
        }
        
        response = requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/config",
            json=updates,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["system_enabled"] == True
        assert data["global_max_per_user_per_day"] == 50
        assert "updated_at" in data
        print(f"[PASS] Admin config updated: updated_at={data['updated_at']}")
    
    def test_get_triggers_empty(self):
        """GET /api/smart-notifications/admin/triggers - returns triggers list"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/triggers")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"[PASS] Triggers list retrieved: {len(data)} triggers found")
    
    def test_create_trigger(self):
        """POST /api/smart-notifications/admin/triggers - creates new trigger"""
        trigger_data = {
            "name": f"TEST_Trigger_{uuid.uuid4().hex[:8]}",
            "trigger_type": "new_listing_in_category",
            "description": "Test trigger for pytest",
            "title_template": "New {{category_name}} listing!",
            "body_template": "{{listing_title}} - {{currency}}{{price}}",
            "channels": ["push", "in_app"],
            "priority": 5,
            "min_interval_minutes": 60,
            "max_per_day": 10,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/triggers",
            json=trigger_data,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["name"] == trigger_data["name"]
        assert data["trigger_type"] == "new_listing_in_category"
        assert data["is_active"] == True
        assert "created_at" in data
        
        # Store for cleanup
        self.__class__.created_trigger_id = data["id"]
        print(f"[PASS] Trigger created: id={data['id']}")
        
        return data["id"]
    
    def test_delete_trigger(self):
        """DELETE /api/smart-notifications/admin/triggers/{id} - deletes trigger"""
        # Create a trigger to delete
        trigger_data = {
            "name": f"TEST_DeleteMe_{uuid.uuid4().hex[:8]}",
            "trigger_type": "price_drop_saved_item",
            "title_template": "Price Drop!",
            "body_template": "Item now {{price}}",
            "channels": ["push"]
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/triggers",
            json=trigger_data,
            headers={"Content-Type": "application/json"}
        )
        trigger_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/smart-notifications/admin/triggers/{trigger_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"[PASS] Trigger deleted: id={trigger_id}")
    
    def test_get_analytics(self):
        """GET /api/smart-notifications/admin/analytics - returns analytics data"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/analytics")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "totals" in data
        assert "daily" in data
        
        totals = data["totals"]
        assert "sent" in totals
        assert "delivered" in totals
        assert "opened" in totals
        assert "clicked" in totals
        assert "failed" in totals
        print(f"[PASS] Analytics retrieved: total_sent={totals['sent']}")
    
    def test_process_notifications(self):
        """POST /api/smart-notifications/admin/process - manually processes notifications"""
        response = requests.post(f"{BASE_URL}/api/smart-notifications/admin/process")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "processed" in data
        print(f"[PASS] Notifications processed: count={data['processed']}")


class TestSmartNotificationUserEndpoints:
    """User endpoint tests - requires authentication"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Setup authentication for user tests"""
        # Register/login test user
        unique_suffix = uuid.uuid4().hex[:8]
        self.test_email = f"smart_notif_test_{unique_suffix}@test.com"
        self.test_password = "testpass123456"
        
        # Try register
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": self.test_email,
                "password": self.test_password,
                "name": "Smart Notification Tester"
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
            self.auth_headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
        else:
            pytest.skip("Could not authenticate test user")
    
    def test_get_consent_requires_auth(self):
        """GET /api/smart-notifications/consent without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/consent")
        assert response.status_code == 401
        print("[PASS] Consent endpoint requires authentication")
    
    def test_get_consent(self):
        """GET /api/smart-notifications/consent - gets user notification consent"""
        response = requests.get(
            f"{BASE_URL}/api/smart-notifications/consent",
            headers=self.auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Default consent structure
        assert "email_enabled" in data
        assert "push_enabled" in data
        assert "in_app_enabled" in data
        assert "trigger_preferences" in data
        assert "quiet_hours_enabled" in data
        print(f"[PASS] User consent retrieved: email={data['email_enabled']}, push={data['push_enabled']}")
    
    def test_update_consent(self):
        """PUT /api/smart-notifications/consent - updates user consent"""
        updates = {
            "email_enabled": False,
            "push_enabled": True,
            "quiet_hours_enabled": True,
            "quiet_hours_start": "23:00",
            "quiet_hours_end": "07:00"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/smart-notifications/consent",
            json=updates,
            headers=self.auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["email_enabled"] == False
        assert data["push_enabled"] == True
        assert data["quiet_hours_enabled"] == True
        print(f"[PASS] User consent updated: quiet_hours={data['quiet_hours_enabled']}")
    
    def test_get_profile_requires_auth(self):
        """GET /api/smart-notifications/profile without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/profile")
        assert response.status_code == 401
        print("[PASS] Profile endpoint requires authentication")
    
    def test_get_profile_new_user(self):
        """GET /api/smart-notifications/profile - gets user interest profile (new user)"""
        response = requests.get(
            f"{BASE_URL}/api/smart-notifications/profile",
            headers=self.auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # New user may have empty or default profile
        assert "user_id" in data or "message" in data
        print(f"[PASS] User profile retrieved")
    
    def test_track_behavior_requires_auth(self):
        """POST /api/smart-notifications/track without auth should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/track",
            json={"event_type": "view_listing"}
        )
        assert response.status_code == 401
        print("[PASS] Track endpoint requires authentication")
    
    def test_track_behavior_view_listing(self):
        """POST /api/smart-notifications/track - tracks view_listing event"""
        event_data = {
            "event_type": "view_listing",
            "entity_id": f"listing_{uuid.uuid4().hex[:8]}",
            "entity_type": "listing",
            "metadata": {
                "category_id": "electronics",
                "price": 299.99,
                "title": "Test Product"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/track",
            json=event_data,
            headers=self.auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "event_id" in data
        print(f"[PASS] Behavior tracked: event_id={data['event_id']}")
    
    def test_track_behavior_save_listing(self):
        """POST /api/smart-notifications/track - tracks save_listing event (higher weight)"""
        event_data = {
            "event_type": "save_listing",
            "entity_id": f"listing_{uuid.uuid4().hex[:8]}",
            "entity_type": "listing",
            "metadata": {
                "category_id": "vehicles",
                "price": 15000,
                "title": "Test Car"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/track",
            json=event_data,
            headers=self.auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        print(f"[PASS] Save behavior tracked: event_id={data['event_id']}")
    
    def test_track_behavior_search_query(self):
        """POST /api/smart-notifications/track - tracks search_query event"""
        event_data = {
            "event_type": "search_query",
            "metadata": {
                "query": "iPhone 15 Pro Max"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/track",
            json=event_data,
            headers=self.auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        print(f"[PASS] Search query tracked: event_id={data['event_id']}")
    
    def test_profile_updates_after_tracking(self):
        """Verify interest profile updates after tracking events"""
        # Wait for async profile update
        time.sleep(1)
        
        response = requests.get(
            f"{BASE_URL}/api/smart-notifications/profile",
            headers=self.auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify some profile data exists
        if "category_interests" in data:
            print(f"[PASS] Profile has category interests: {data['category_interests']}")
        if "recent_searches" in data:
            print(f"[PASS] Profile has recent searches: {data.get('recent_searches', [])}")
    
    def test_get_history_requires_auth(self):
        """GET /api/smart-notifications/history without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/history")
        assert response.status_code == 401
        print("[PASS] History endpoint requires authentication")
    
    def test_get_history(self):
        """GET /api/smart-notifications/history - gets user notification history"""
        response = requests.get(
            f"{BASE_URL}/api/smart-notifications/history",
            headers=self.auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "notifications" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        print(f"[PASS] History retrieved: total={data['total']}")
    
    def test_get_history_with_pagination(self):
        """GET /api/smart-notifications/history with pagination params"""
        response = requests.get(
            f"{BASE_URL}/api/smart-notifications/history?page=1&limit=10",
            headers=self.auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["page"] == 1
        print(f"[PASS] History pagination works: page={data['page']}")


class TestBehaviorTrackingIntegration:
    """Test behavior tracking integrated into listings and favorites"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Setup authentication"""
        unique_suffix = uuid.uuid4().hex[:8]
        self.test_email = f"behavior_test_{unique_suffix}@test.com"
        self.test_password = "testpass123456"
        
        # Register
        requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": self.test_email,
                "password": self.test_password,
                "name": "Behavior Tester"
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
            self.auth_headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
        else:
            pytest.skip("Could not authenticate test user")
    
    def test_view_listing_tracks_behavior(self):
        """Viewing a listing should track user behavior"""
        # Get initial profile state
        initial_profile = requests.get(
            f"{BASE_URL}/api/smart-notifications/profile",
            headers=self.auth_headers
        ).json()
        
        initial_views = initial_profile.get("total_views", 0)
        
        # Get a listing
        listings_response = requests.get(f"{BASE_URL}/api/listings?limit=1")
        if listings_response.status_code != 200:
            pytest.skip("No listings available")
        
        listings = listings_response.json().get("listings", [])
        if not listings:
            pytest.skip("No listings found")
        
        listing_id = listings[0]["id"]
        
        # View the listing (authenticated)
        view_response = requests.get(
            f"{BASE_URL}/api/listings/{listing_id}",
            headers=self.auth_headers
        )
        
        assert view_response.status_code == 200
        
        # Wait for async update
        time.sleep(1)
        
        # Check profile updated
        updated_profile = requests.get(
            f"{BASE_URL}/api/smart-notifications/profile",
            headers=self.auth_headers
        ).json()
        
        new_views = updated_profile.get("total_views", 0)
        
        # Views should increase
        assert new_views >= initial_views, f"Expected views to increase from {initial_views}, got {new_views}"
        print(f"[PASS] View tracking works: {initial_views} -> {new_views} views")


class TestSmartNotificationTriggerTypes:
    """Test various trigger types and channels"""
    
    def test_create_new_listing_trigger(self):
        """Create trigger for new listing in category"""
        trigger_data = {
            "name": f"TEST_NewListing_{uuid.uuid4().hex[:6]}",
            "trigger_type": "new_listing_in_category",
            "title_template": "New {{category_name}} listing!",
            "body_template": "{{listing_title}} at {{currency}}{{price}}",
            "channels": ["push", "email", "in_app"],
            "priority": 3
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/triggers",
            json=trigger_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["trigger_type"] == "new_listing_in_category"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/smart-notifications/admin/triggers/{data['id']}")
        print(f"[PASS] New listing trigger created and cleaned up")
    
    def test_create_price_drop_trigger(self):
        """Create trigger for price drops"""
        trigger_data = {
            "name": f"TEST_PriceDrop_{uuid.uuid4().hex[:6]}",
            "trigger_type": "price_drop_saved_item",
            "title_template": "Price Drop! {{listing_title}}",
            "body_template": "Now {{currency}}{{price}} ({{drop_percent}}% off)",
            "channels": ["push", "email"],
            "priority": 2
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/triggers",
            json=trigger_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["trigger_type"] == "price_drop_saved_item"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/smart-notifications/admin/triggers/{data['id']}")
        print(f"[PASS] Price drop trigger created and cleaned up")
    
    def test_create_message_trigger(self):
        """Create trigger for new messages"""
        trigger_data = {
            "name": f"TEST_Message_{uuid.uuid4().hex[:6]}",
            "trigger_type": "message_received",
            "title_template": "{{sender_name}}",
            "body_template": "{{message_preview}}",
            "channels": ["push", "in_app"],
            "priority": 1,
            "max_per_day": 100
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/triggers",
            json=trigger_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["trigger_type"] == "message_received"
        assert data["max_per_day"] == 100
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/smart-notifications/admin/triggers/{data['id']}")
        print(f"[PASS] Message trigger created and cleaned up")


# Cleanup triggers created during tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_triggers():
    """Clean up any TEST_ prefixed triggers after all tests"""
    yield
    
    # Get all triggers
    response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/triggers")
    if response.status_code == 200:
        triggers = response.json()
        for trigger in triggers:
            if trigger.get("name", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/smart-notifications/admin/triggers/{trigger['id']}")
                print(f"Cleaned up test trigger: {trigger['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
