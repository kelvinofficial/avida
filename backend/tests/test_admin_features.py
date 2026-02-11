"""
Test Admin Dashboard New Features - Iteration 2
Tests: Notifications API (CRUD + Send), Categories CSV Import, Language Switcher
"""

import pytest
import requests
import os
import io
import csv

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://seller-connect-15.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api/admin"

# Test credentials
TEST_EMAIL = "admin@marketplace.com"
TEST_PASSWORD = "Admin@123456"


class TestAuthAndSetup:
    """Setup and authentication tests"""
    
    def test_login_success(self):
        """Test admin login returns valid token"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "admin" in data
        assert data["admin"]["email"] == TEST_EMAIL
        print(f"✓ Login successful, token received")
        return data["access_token"]
    
    def test_get_me(self):
        """Test getting current admin info"""
        token = self.test_login_success()
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_URL}/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_EMAIL
        print(f"✓ Get me successful: {data['name']}")


class TestNotificationsAPI:
    """Test Notifications CRUD operations with live API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_notifications(self):
        """Test GET /notifications returns list"""
        response = requests.get(f"{API_URL}/notifications", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Can be array or paginated response
        if isinstance(data, list):
            print(f"✓ Listed {len(data)} notifications (array format)")
        else:
            assert "items" in data or "total" in data or isinstance(data, list)
            print(f"✓ Listed notifications (paginated format)")
    
    def test_create_notification(self):
        """Test POST /notifications creates new notification"""
        notification_data = {
            "title": "TEST_Notification_Title",
            "message": "This is a test notification message for automated testing",
            "type": "broadcast",
            "target_type": "all"
        }
        response = requests.post(f"{API_URL}/notifications", json=notification_data, headers=self.headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["title"] == notification_data["title"]
        assert data["message"] == notification_data["message"]
        assert data["status"] == "draft"
        print(f"✓ Created notification: {data['id']}")
        return data["id"]
    
    def test_get_notification_by_id(self):
        """Test GET /notifications/{id} returns notification"""
        # First create a notification
        notif_id = self.test_create_notification()
        
        response = requests.get(f"{API_URL}/notifications/{notif_id}", headers=self.headers)
        assert response.status_code == 200, f"Get failed: {response.text}"
        data = response.json()
        assert data["id"] == notif_id
        print(f"✓ Retrieved notification by ID: {notif_id}")
    
    def test_update_notification(self):
        """Test PATCH /notifications/{id} updates notification"""
        # First create a notification
        notif_id = self.test_create_notification()
        
        update_data = {
            "title": "TEST_Updated_Title",
            "message": "Updated test message"
        }
        response = requests.patch(f"{API_URL}/notifications/{notif_id}", json=update_data, headers=self.headers)
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert data["title"] == "TEST_Updated_Title"
        print(f"✓ Updated notification: {notif_id}")
    
    def test_send_notification(self):
        """Test POST /notifications/{id}/send sends notification"""
        # First create a notification
        notif_id = self.test_create_notification()
        
        response = requests.post(f"{API_URL}/notifications/{notif_id}/send", headers=self.headers)
        # Push service is MOCKED so it should return success even without real push
        assert response.status_code == 200, f"Send failed: {response.text}"
        data = response.json()
        assert "message" in data or "status" in data
        print(f"✓ Send notification endpoint works (push service is mocked): {notif_id}")
    
    def test_delete_notification(self):
        """Test DELETE /notifications/{id} deletes notification"""
        # First create a notification
        notif_id = self.test_create_notification()
        
        response = requests.delete(f"{API_URL}/notifications/{notif_id}", headers=self.headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{API_URL}/notifications/{notif_id}", headers=self.headers)
        assert get_response.status_code == 404
        print(f"✓ Deleted notification: {notif_id}")
    
    def test_create_targeted_notification(self):
        """Test creating targeted notification type"""
        notification_data = {
            "title": "TEST_Targeted_Notification",
            "message": "Targeted test message",
            "type": "targeted",
            "target_type": "users",
            "target_ids": ["user_123", "user_456"]
        }
        response = requests.post(f"{API_URL}/notifications", json=notification_data, headers=self.headers)
        assert response.status_code == 200, f"Create targeted failed: {response.text}"
        data = response.json()
        assert data["type"] == "targeted"
        print(f"✓ Created targeted notification: {data['id']}")
    
    def test_create_scheduled_notification(self):
        """Test creating scheduled notification type"""
        notification_data = {
            "title": "TEST_Scheduled_Notification",
            "message": "Scheduled test message",
            "type": "scheduled",
            "scheduled_at": "2026-02-15T10:00:00"
        }
        response = requests.post(f"{API_URL}/notifications", json=notification_data, headers=self.headers)
        assert response.status_code == 200, f"Create scheduled failed: {response.text}"
        data = response.json()
        assert data["type"] == "scheduled"
        print(f"✓ Created scheduled notification: {data['id']}")


class TestCategoriesCSVImport:
    """Test Categories CSV Import functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_categories_import_endpoint_exists(self):
        """Test POST /categories/import endpoint exists"""
        # Create a simple CSV file in memory
        csv_content = "name,slug,is_visible\nTEST_Category_Import,test-category-import,true"
        files = {'file': ('test_categories.csv', csv_content, 'text/csv')}
        
        # Remove Content-Type for multipart
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(f"{API_URL}/categories/import", files=files, headers=headers)
        # Even if import has issues, we expect 200 or 400/422, not 404
        assert response.status_code != 404, "Categories import endpoint does not exist"
        print(f"✓ Categories import endpoint exists, status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  Import result: {data}")
    
    def test_categories_export_works(self):
        """Test that categories can be exported (listed with all data)"""
        response = requests.get(f"{API_URL}/categories?include_hidden=true&flat=true", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Categories export works, {len(data)} categories found")


class TestCategoriesAPI:
    """Test Categories CRUD to ensure it still works after changes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_categories_tree(self):
        """Test GET /categories returns hierarchical tree"""
        response = requests.get(f"{API_URL}/categories", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} root categories")
    
    def test_list_categories_flat(self):
        """Test GET /categories?flat=true returns flat list"""
        response = requests.get(f"{API_URL}/categories?flat=true&include_hidden=true", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} categories (flat)")


class TestAnalytics:
    """Test Analytics endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_analytics_overview(self):
        """Test GET /analytics/overview"""
        response = requests.get(f"{API_URL}/analytics/overview", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "listings" in data
        print(f"✓ Analytics overview: {data['users']['total']} users, {data['listings']['total']} listings")


# Cleanup test data after tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed notifications after all tests"""
    yield
    # Cleanup after tests
    try:
        login_response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code == 200:
            token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Get all notifications and delete test ones
            notifs = requests.get(f"{API_URL}/notifications", headers=headers)
            if notifs.status_code == 200:
                data = notifs.json()
                items = data if isinstance(data, list) else data.get("items", [])
                for notif in items:
                    if notif.get("title", "").startswith("TEST_"):
                        requests.delete(f"{API_URL}/notifications/{notif['id']}", headers=headers)
            print("✓ Cleanup completed")
    except Exception as e:
        print(f"Cleanup error (non-critical): {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
