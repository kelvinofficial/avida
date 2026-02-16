"""
Test file for iteration 166 - Growth Engine Features:
1. Recurring events for Content Calendar
2. Google Analytics Settings API
3. Authority Building System (campaigns, backlinks, templates)
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://zero-loader.preview.emergentagent.com/api')

# Test admin credentials
ADMIN_EMAIL = "admin@marketplace.com"
ADMIN_PASSWORD = "Admin@123456"

class TestHelpers:
    """Helper methods for tests"""
    
    @staticmethod
    def get_admin_token():
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    @staticmethod
    def get_auth_headers(token):
        """Get headers with authentication"""
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }


class TestRecurringCalendarEvents:
    """Test recurring events feature for Content Calendar"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.created_event_ids = []
        self.token = TestHelpers.get_admin_token()
        if not self.token:
            pytest.skip("Could not obtain admin token")
        self.headers = TestHelpers.get_auth_headers(self.token)
    
    def teardown_method(self):
        """Cleanup created events"""
        for event_id in self.created_event_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/growth/calendar/events/{event_id}?delete_series=true",
                    headers=self.headers
                )
            except:
                pass
    
    def test_create_weekly_recurring_event(self):
        """Test creating a weekly recurring event generates multiple instances"""
        # Create event starting today, recurring weekly for 4 weeks
        start_date = datetime.now()
        end_date = start_date + timedelta(weeks=4)
        
        payload = {
            "title": "TEST_Weekly Team Meeting",
            "description": "Weekly recurring test event",
            "event_type": "campaign",
            "scheduled_date": start_date.isoformat(),
            "status": "scheduled",
            "priority": "medium",
            "recurrence": "weekly",
            "recurrence_end_date": end_date.isoformat()
        }
        
        response = requests.post(
            f"{BASE_URL}/growth/calendar/events",
            headers=self.headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Store parent event ID for cleanup
        self.created_event_ids.append(data["event"]["id"])
        
        # Verify response has recurring_count
        assert "recurring_count" in data, "Response should include recurring_count"
        # Should have at least 3 recurring instances (weeks 1, 2, 3 after initial)
        assert data["recurring_count"] >= 3, f"Expected at least 3 recurring events, got {data['recurring_count']}"
        print(f"Created weekly event with {data['recurring_count']} recurring instances")
    
    def test_create_daily_recurring_event(self):
        """Test creating a daily recurring event"""
        start_date = datetime.now()
        end_date = start_date + timedelta(days=5)
        
        payload = {
            "title": "TEST_Daily Standup",
            "description": "Daily recurring test event",
            "event_type": "blog",
            "scheduled_date": start_date.isoformat(),
            "status": "scheduled",
            "priority": "high",
            "recurrence": "daily",
            "recurrence_end_date": end_date.isoformat()
        }
        
        response = requests.post(
            f"{BASE_URL}/growth/calendar/events",
            headers=self.headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        self.created_event_ids.append(data["event"]["id"])
        
        # Daily event for 5 days should have ~4 recurring instances
        assert data["recurring_count"] >= 4, f"Expected at least 4 daily events, got {data['recurring_count']}"
        print(f"Created daily event with {data['recurring_count']} recurring instances")
    
    def test_create_monthly_recurring_event(self):
        """Test creating a monthly recurring event"""
        start_date = datetime.now()
        end_date = start_date + timedelta(days=90)  # ~3 months
        
        payload = {
            "title": "TEST_Monthly Report",
            "description": "Monthly recurring test event",
            "event_type": "seo_milestone",
            "scheduled_date": start_date.isoformat(),
            "status": "scheduled",
            "priority": "medium",
            "recurrence": "monthly",
            "recurrence_end_date": end_date.isoformat()
        }
        
        response = requests.post(
            f"{BASE_URL}/growth/calendar/events",
            headers=self.headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        self.created_event_ids.append(data["event"]["id"])
        
        # Monthly event for 3 months should have 2-3 recurring instances
        assert data["recurring_count"] >= 2, f"Expected at least 2 monthly events, got {data['recurring_count']}"
        print(f"Created monthly event with {data['recurring_count']} recurring instances")
    
    def test_create_non_recurring_event(self):
        """Test that non-recurring events don't create extra instances"""
        payload = {
            "title": "TEST_Single Event",
            "description": "Non-recurring event",
            "event_type": "blog",
            "scheduled_date": datetime.now().isoformat(),
            "status": "scheduled",
            "priority": "low",
            "recurrence": "none"
        }
        
        response = requests.post(
            f"{BASE_URL}/growth/calendar/events",
            headers=self.headers,
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        self.created_event_ids.append(data["event"]["id"])
        
        assert data["recurring_count"] == 0, f"Non-recurring should have 0 recurring instances, got {data['recurring_count']}"
        print("Created non-recurring event successfully")


class TestAnalyticsSettings:
    """Test Google Analytics Settings API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.token = TestHelpers.get_admin_token()
        if not self.token:
            pytest.skip("Could not obtain admin token")
        self.headers = TestHelpers.get_auth_headers(self.token)
    
    def test_get_analytics_settings(self):
        """Test GET /api/growth/analytics-settings returns settings"""
        response = requests.get(
            f"{BASE_URL}/growth/analytics-settings",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify expected fields exist
        expected_fields = [
            "ga4_measurement_id", "ga4_enabled", "track_page_views",
            "track_blog_reads", "track_conversions", "anonymize_ip"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Should have setup instructions if not configured
        if not data.get("ga4_measurement_id"):
            assert "setup_instructions" in data or data.get("setup_complete") == False
        
        print(f"Analytics settings retrieved. GA4 enabled: {data.get('ga4_enabled')}")
    
    def test_update_analytics_settings_valid_ga4(self):
        """Test updating analytics settings with valid GA4 ID"""
        payload = {
            "ga4_measurement_id": "G-TEST123456",
            "ga4_enabled": True,
            "track_page_views": True,
            "track_user_engagement": True,
            "track_blog_reads": True,
            "track_listing_views": True,
            "track_conversions": True,
            "anonymize_ip": True
        }
        
        response = requests.put(
            f"{BASE_URL}/growth/analytics-settings",
            headers=self.headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "settings" in data
        print("Analytics settings updated successfully")
    
    def test_update_analytics_settings_invalid_ga4(self):
        """Test that invalid GA4 ID format is rejected"""
        payload = {
            "ga4_measurement_id": "INVALID-123",  # Should start with G-
            "ga4_enabled": True
        }
        
        response = requests.put(
            f"{BASE_URL}/growth/analytics-settings",
            headers=self.headers,
            json=payload
        )
        
        # Should return 400 for invalid format
        assert response.status_code == 400, f"Expected 400 for invalid GA4 ID, got {response.status_code}"
        print("Invalid GA4 ID correctly rejected")
    
    def test_get_tracking_code(self):
        """Test GET /api/growth/analytics-settings/tracking-code"""
        response = requests.get(
            f"{BASE_URL}/growth/analytics-settings/tracking-code",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Either has tracking code or message about configuring first
        assert "ga4_tracking_code" in data or "message" in data
        print("Tracking code endpoint working")
    
    def test_test_connection(self):
        """Test POST /api/growth/analytics-settings/test-connection"""
        response = requests.post(
            f"{BASE_URL}/growth/analytics-settings/test-connection",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "status" in data
        assert data["status"] in ["configured", "not_configured"]
        print(f"Connection test status: {data['status']}")


class TestAuthorityBuilding:
    """Test Authority Building System APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.created_campaign_ids = []
        self.created_backlink_ids = []
        self.token = TestHelpers.get_admin_token()
        if not self.token:
            pytest.skip("Could not obtain admin token")
        self.headers = TestHelpers.get_auth_headers(self.token)
    
    def teardown_method(self):
        """Cleanup created resources"""
        for campaign_id in self.created_campaign_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/growth/authority/campaigns/{campaign_id}",
                    headers=self.headers
                )
            except:
                pass
    
    def test_get_authority_dashboard(self):
        """Test GET /api/growth/authority/dashboard returns stats"""
        response = requests.get(
            f"{BASE_URL}/growth/authority/dashboard",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify expected sections
        assert "campaigns" in data, "Dashboard should have campaigns stats"
        assert "outreach" in data, "Dashboard should have outreach stats"
        assert "backlinks" in data, "Dashboard should have backlinks stats"
        
        print(f"Dashboard stats - Campaigns: {data['campaigns']}, Backlinks: {data['backlinks']}")
    
    def test_create_pr_campaign(self):
        """Test creating a new PR campaign"""
        payload = {
            "name": "TEST_PR Campaign Q1",
            "description": "Test PR campaign for media outreach",
            "campaign_type": "pr",
            "target_domains": ["techcrunch.com", "forbes.com"],
            "status": "draft",
            "goal": "Generate 5 media mentions"
        }
        
        response = requests.post(
            f"{BASE_URL}/growth/authority/campaigns",
            headers=self.headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "campaign" in data
        assert data["campaign"]["name"] == payload["name"]
        assert data["campaign"]["campaign_type"] == "pr"
        
        self.created_campaign_ids.append(data["campaign"]["id"])
        print(f"Created PR campaign: {data['campaign']['id']}")
    
    def test_get_campaigns(self):
        """Test GET /api/growth/authority/campaigns"""
        response = requests.get(
            f"{BASE_URL}/growth/authority/campaigns",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "campaigns" in data
        assert "total" in data
        print(f"Total campaigns: {data['total']}")
    
    def test_get_templates(self):
        """Test GET /api/growth/authority/templates returns default templates"""
        response = requests.get(
            f"{BASE_URL}/growth/authority/templates",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "templates" in data
        templates = data["templates"]
        
        # Should have 5 default templates
        assert len(templates) >= 5, f"Expected at least 5 templates, got {len(templates)}"
        
        # Verify template structure
        if templates:
            template = templates[0]
            assert "name" in template
            assert "template_type" in template
            assert "subject" in template
            assert "body" in template
        
        print(f"Found {len(templates)} email templates")
        for t in templates[:5]:
            print(f"  - {t['name']} ({t['template_type']})")
    
    def test_add_backlink(self):
        """Test adding a new backlink"""
        payload = {
            "source_url": "https://techblog.example.com/article/best-marketplaces",
            "source_domain": "techblog.example.com",
            "target_url": "https://avida.com/",
            "anchor_text": "Avida marketplace",
            "domain_authority": 45,
            "status": "active",
            "link_type": "dofollow",
            "notes": "TEST backlink from tech blog"
        }
        
        response = requests.post(
            f"{BASE_URL}/growth/authority/backlinks",
            headers=self.headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "backlink" in data
        assert data["backlink"]["source_domain"] == payload["source_domain"]
        assert data["backlink"]["link_type"] == "dofollow"
        
        self.created_backlink_ids.append(data["backlink"]["id"])
        print(f"Created backlink: {data['backlink']['id']}")
    
    def test_get_backlinks(self):
        """Test GET /api/growth/authority/backlinks"""
        response = requests.get(
            f"{BASE_URL}/growth/authority/backlinks",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "backlinks" in data
        assert "total" in data
        assert "stats" in data
        
        print(f"Total backlinks: {data['total']}, Stats: {data['stats']}")
    
    def test_create_campaign_and_add_contact(self):
        """Test creating a campaign then adding a contact to it"""
        # First create a campaign
        campaign_payload = {
            "name": "TEST_Link Building Campaign",
            "description": "Test campaign for contact management",
            "campaign_type": "link_building",
            "status": "active"
        }
        
        campaign_response = requests.post(
            f"{BASE_URL}/growth/authority/campaigns",
            headers=self.headers,
            json=campaign_payload
        )
        
        assert campaign_response.status_code == 200
        campaign_data = campaign_response.json()
        campaign_id = campaign_data["campaign"]["id"]
        self.created_campaign_ids.append(campaign_id)
        
        # Now add a contact to the campaign
        contact_payload = {
            "campaign_id": campaign_id,
            "domain": "example-blog.com",
            "contact_name": "John Editor",
            "contact_email": "john@example-blog.com",
            "contact_role": "Editor",
            "domain_authority": 35,
            "status": "identified",
            "notes": "TEST contact for outreach"
        }
        
        contact_response = requests.post(
            f"{BASE_URL}/growth/authority/contacts",
            headers=self.headers,
            json=contact_payload
        )
        
        assert contact_response.status_code == 200, f"Expected 200, got {contact_response.status_code}: {contact_response.text}"
        contact_data = contact_response.json()
        
        assert contact_data.get("success") == True
        assert "contact" in contact_data
        assert contact_data["contact"]["domain"] == "example-blog.com"
        
        print(f"Created contact {contact_data['contact']['id']} in campaign {campaign_id}")


class TestAPIAuthentication:
    """Test that APIs require authentication"""
    
    def test_calendar_events_requires_auth(self):
        """Test calendar events endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/growth/calendar/events")
        assert response.status_code == 401, "Should require authentication"
    
    def test_analytics_settings_requires_auth(self):
        """Test analytics settings endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/growth/analytics-settings")
        assert response.status_code == 401, "Should require authentication"
    
    def test_authority_dashboard_requires_auth(self):
        """Test authority dashboard endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/growth/authority/dashboard")
        assert response.status_code == 401, "Should require authentication"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
