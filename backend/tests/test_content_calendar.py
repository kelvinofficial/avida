"""
Content Calendar API Tests
Tests for /api/growth/calendar/* endpoints
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://expo-connectivity.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class TestContentCalendar:
    """Content Calendar API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for each test"""
        login_res = requests.post(
            f"{API_BASE}/admin/auth/login",
            json={"email": "admin@marketplace.com", "password": "Admin@123456"}
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        self.token = login_res.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_calendar_stats(self):
        """Test GET /api/growth/calendar/stats - returns calendar statistics"""
        response = requests.get(f"{API_BASE}/growth/calendar/stats", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats structure
        assert "total_events" in data
        assert "by_type" in data
        assert "by_status" in data
        assert "by_priority" in data
        assert "by_region" in data
        assert "upcoming_this_week" in data
        assert "overdue" in data
        
        # Types should be correct
        assert isinstance(data["total_events"], int)
        assert isinstance(data["by_type"], dict)
        print(f"Stats: total_events={data['total_events']}, upcoming={data['upcoming_this_week']}")
    
    def test_get_event_templates(self):
        """Test GET /api/growth/calendar/templates - returns event templates"""
        response = requests.get(f"{API_BASE}/growth/calendar/templates", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "templates" in data
        templates = data["templates"]
        assert isinstance(templates, list)
        assert len(templates) > 0
        
        # Check template structure
        template = templates[0]
        assert "id" in template
        assert "name" in template
        assert "event_type" in template
        assert "description" in template
        assert "color" in template
        
        # Check for specific templates
        template_ids = [t["id"] for t in templates]
        assert "blog_post" in template_ids
        assert "social_twitter" in template_ids
        assert "seo_audit" in template_ids
        print(f"Found {len(templates)} templates: {template_ids}")
    
    def test_create_calendar_event(self):
        """Test POST /api/growth/calendar/events - create new event"""
        # Create a future date for the event
        future_date = (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z"
        
        event_data = {
            "title": "TEST_API: Backend Test Event",
            "description": "Test event created via API",
            "event_type": "blog",
            "scheduled_date": future_date,
            "status": "scheduled",
            "priority": "medium",
            "region": "DE",
            "tags": ["test", "api"]
        }
        
        response = requests.post(
            f"{API_BASE}/growth/calendar/events",
            json=event_data,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "event" in data
        
        event = data["event"]
        assert event["title"] == event_data["title"]
        assert event["event_type"] == event_data["event_type"]
        assert event["status"] == event_data["status"]
        assert event["priority"] == event_data["priority"]
        assert event["region"] == event_data["region"]
        assert "id" in event
        
        # Store event ID for cleanup
        self.created_event_id = event["id"]
        print(f"Created event with ID: {event['id']}")
        
        # Cleanup - delete the test event
        delete_res = requests.delete(
            f"{API_BASE}/growth/calendar/events/{event['id']}",
            headers=self.headers
        )
        assert delete_res.status_code == 200
    
    def test_get_calendar_events(self):
        """Test GET /api/growth/calendar/events - list events"""
        response = requests.get(f"{API_BASE}/growth/calendar/events", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "events" in data
        assert "total" in data
        assert isinstance(data["events"], list)
        print(f"Found {data['total']} events")
    
    def test_get_calendar_events_with_date_filter(self):
        """Test GET /api/growth/calendar/events with date filter"""
        # Get events for this month
        now = datetime.utcnow()
        start = datetime(now.year, now.month, 1).isoformat() + "Z"
        end = datetime(now.year, now.month + 1 if now.month < 12 else 1, 1).isoformat() + "Z"
        
        response = requests.get(
            f"{API_BASE}/growth/calendar/events",
            params={"start_date": start, "end_date": end},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        print(f"Found {len(data['events'])} events for this month")
    
    def test_create_and_get_single_event(self):
        """Test POST + GET /api/growth/calendar/events/{id} - verify persistence"""
        # Create event
        future_date = (datetime.utcnow() + timedelta(days=3)).isoformat() + "Z"
        event_data = {
            "title": "TEST_Persistence: Single Event Test",
            "description": "Testing single event retrieval",
            "event_type": "seo_milestone",
            "scheduled_date": future_date,
            "status": "scheduled",
            "priority": "high",
            "region": "KE"
        }
        
        create_res = requests.post(
            f"{API_BASE}/growth/calendar/events",
            json=event_data,
            headers=self.headers
        )
        assert create_res.status_code == 200
        event_id = create_res.json()["event"]["id"]
        
        # GET single event
        get_res = requests.get(
            f"{API_BASE}/growth/calendar/events/{event_id}",
            headers=self.headers
        )
        assert get_res.status_code == 200
        fetched_event = get_res.json()["event"]
        
        # Verify data persisted correctly
        assert fetched_event["title"] == event_data["title"]
        assert fetched_event["event_type"] == event_data["event_type"]
        assert fetched_event["priority"] == event_data["priority"]
        
        print(f"Verified single event GET for ID: {event_id}")
        
        # Cleanup
        requests.delete(f"{API_BASE}/growth/calendar/events/{event_id}", headers=self.headers)
    
    def test_update_calendar_event(self):
        """Test PUT /api/growth/calendar/events/{id} - update event"""
        # Create event first
        future_date = (datetime.utcnow() + timedelta(days=5)).isoformat() + "Z"
        event_data = {
            "title": "TEST_Update: Original Title",
            "event_type": "campaign",
            "scheduled_date": future_date,
            "status": "scheduled",
            "priority": "low"
        }
        
        create_res = requests.post(
            f"{API_BASE}/growth/calendar/events",
            json=event_data,
            headers=self.headers
        )
        assert create_res.status_code == 200
        event_id = create_res.json()["event"]["id"]
        
        # Update event
        update_data = {
            "title": "TEST_Update: Updated Title",
            "status": "in_progress",
            "priority": "critical"
        }
        
        update_res = requests.put(
            f"{API_BASE}/growth/calendar/events/{event_id}",
            json=update_data,
            headers=self.headers
        )
        assert update_res.status_code == 200
        updated_event = update_res.json()["event"]
        
        # Verify updates
        assert updated_event["title"] == update_data["title"]
        assert updated_event["status"] == update_data["status"]
        assert updated_event["priority"] == update_data["priority"]
        
        # Verify via GET
        get_res = requests.get(
            f"{API_BASE}/growth/calendar/events/{event_id}",
            headers=self.headers
        )
        fetched = get_res.json()["event"]
        assert fetched["title"] == update_data["title"]
        
        print(f"Successfully updated event {event_id}")
        
        # Cleanup
        requests.delete(f"{API_BASE}/growth/calendar/events/{event_id}", headers=self.headers)
    
    def test_delete_calendar_event(self):
        """Test DELETE /api/growth/calendar/events/{id}"""
        # Create event first
        event_data = {
            "title": "TEST_Delete: To Be Deleted",
            "event_type": "other",
            "scheduled_date": (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z",
            "status": "scheduled"
        }
        
        create_res = requests.post(
            f"{API_BASE}/growth/calendar/events",
            json=event_data,
            headers=self.headers
        )
        assert create_res.status_code == 200
        event_id = create_res.json()["event"]["id"]
        
        # Delete event
        delete_res = requests.delete(
            f"{API_BASE}/growth/calendar/events/{event_id}",
            headers=self.headers
        )
        assert delete_res.status_code == 200
        assert delete_res.json()["success"] == True
        
        # Verify deletion - should return 404
        get_res = requests.get(
            f"{API_BASE}/growth/calendar/events/{event_id}",
            headers=self.headers
        )
        assert get_res.status_code == 404
        
        print(f"Successfully deleted event {event_id}")
    
    def test_get_upcoming_events(self):
        """Test GET /api/growth/calendar/upcoming"""
        response = requests.get(
            f"{API_BASE}/growth/calendar/upcoming",
            params={"days": 30, "limit": 10},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "events" in data
        assert "period" in data
        assert "days" in data["period"]
        print(f"Found {len(data['events'])} upcoming events in next 30 days")
    
    def test_unauthorized_access(self):
        """Test that endpoints require authentication"""
        # Test without token
        response = requests.get(f"{API_BASE}/growth/calendar/stats")
        assert response.status_code == 401
        print("Unauthorized access correctly returns 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
