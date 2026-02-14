"""
Admin Dashboard Backend API Tests
Tests for: Auth, Categories, Users, Listings, Audit Logs, Tickets, Analytics
"""

import pytest
import requests
import os

# Use the public URL for testing
BASE_URL = "https://mobile-header-ui.preview.emergentagent.com"

# Test credentials
ADMIN_EMAIL = "admin@marketplace.com"
ADMIN_PASSWORD = "Admin@123456"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestAdminAuth:
    """Admin Authentication endpoint tests"""
    
    def test_login_success(self, api_client):
        """Test successful login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "refresh_token" in data, "Response should contain refresh_token"
        assert "admin" in data, "Response should contain admin info"
        assert data["admin"]["email"] == ADMIN_EMAIL
        assert data["admin"]["role"] == "super_admin"
        assert isinstance(data["expires_in"], int)
        assert data["expires_in"] > 0
    
    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    def test_login_missing_fields(self, api_client):
        """Test login with missing fields"""
        response = api_client.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL
        })
        assert response.status_code == 422  # Validation error
    
    def test_get_current_admin(self, authenticated_client):
        """Test getting current admin info"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/auth/me")
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert "id" in data
        assert "name" in data
        assert "role" in data


class TestCategories:
    """Category management endpoint tests"""
    
    def test_list_categories(self, authenticated_client):
        """Test getting categories list"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/categories")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should have seeded categories"
        
        # Verify category structure
        first_category = data[0]
        assert "id" in first_category
        assert "name" in first_category
        assert "slug" in first_category
        assert "is_visible" in first_category
    
    def test_list_categories_flat(self, authenticated_client):
        """Test getting flat categories list"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/categories", params={"flat": True})
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_single_category(self, authenticated_client):
        """Test getting a single category"""
        # First get list to get an ID
        list_response = authenticated_client.get(f"{BASE_URL}/api/admin/categories", params={"flat": True})
        categories = list_response.json()
        
        if len(categories) > 0:
            category_id = categories[0]["id"]
            response = authenticated_client.get(f"{BASE_URL}/api/admin/categories/{category_id}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == category_id
            assert "listings_count" in data
    
    def test_create_category_and_verify(self, authenticated_client):
        """Test creating a new category and verify persistence"""
        category_data = {
            "name": "TEST_New Category",
            "slug": "test-new-category",
            "icon": "test",
            "color": "#FF0000",
            "is_visible": True,
            "order": 99
        }
        
        # Create category
        response = authenticated_client.post(f"{BASE_URL}/api/admin/categories", json=category_data)
        
        assert response.status_code == 200, f"Failed to create category: {response.text}"
        created = response.json()
        assert created["name"] == category_data["name"]
        assert created["slug"] == category_data["slug"]
        category_id = created["id"]
        
        # Verify with GET
        get_response = authenticated_client.get(f"{BASE_URL}/api/admin/categories/{category_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == category_data["name"]
        
        # Cleanup - delete the test category
        delete_response = authenticated_client.delete(f"{BASE_URL}/api/admin/categories/{category_id}")
        assert delete_response.status_code == 200


class TestUsers:
    """User management endpoint tests"""
    
    def test_list_users(self, authenticated_client):
        """Test getting users list"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/users")
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert isinstance(data["items"], list)
        assert data["total"] >= 0
    
    def test_list_users_with_pagination(self, authenticated_client):
        """Test users pagination"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/users", params={
            "page": 1,
            "limit": 5
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 5
        assert len(data["items"]) <= 5
    
    def test_list_users_with_status_filter(self, authenticated_client):
        """Test users status filtering"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/users", params={
            "status": "active"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
    
    def test_list_users_with_search(self, authenticated_client):
        """Test users search functionality"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/users", params={
            "search": "test"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data


class TestListings:
    """Listing management endpoint tests"""
    
    def test_list_listings(self, authenticated_client):
        """Test getting listings list"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/listings")
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
    
    def test_list_listings_with_pagination(self, authenticated_client):
        """Test listings pagination"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/listings", params={
            "page": 1,
            "limit": 10
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 10
        assert len(data["items"]) <= 10
    
    def test_list_listings_with_status_filter(self, authenticated_client):
        """Test listings status filtering"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/listings", params={
            "status": "active"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
    
    def test_get_single_listing(self, authenticated_client):
        """Test getting a single listing"""
        # First get list to get an ID
        list_response = authenticated_client.get(f"{BASE_URL}/api/admin/listings")
        listings = list_response.json()
        
        if listings["total"] > 0 and len(listings["items"]) > 0:
            listing_id = listings["items"][0]["id"]
            response = authenticated_client.get(f"{BASE_URL}/api/admin/listings/{listing_id}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == listing_id


class TestAuditLogs:
    """Audit logs endpoint tests"""
    
    def test_list_audit_logs(self, authenticated_client):
        """Test getting audit logs list"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/audit-logs")
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
        
        # Verify audit log structure if we have data
        if len(data["items"]) > 0:
            first_log = data["items"][0]
            assert "id" in first_log
            assert "admin_id" in first_log
            assert "admin_email" in first_log
            assert "action" in first_log
            assert "entity_type" in first_log
            assert "timestamp" in first_log
    
    def test_list_audit_logs_with_pagination(self, authenticated_client):
        """Test audit logs pagination"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/audit-logs", params={
            "page": 1,
            "limit": 10
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 10
    
    def test_list_audit_logs_with_action_filter(self, authenticated_client):
        """Test audit logs action filtering"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/audit-logs", params={
            "action": "login"
        })
        
        assert response.status_code == 200
        data = response.json()
        # Verify all returned logs have the login action
        for log in data["items"]:
            assert log["action"] == "login"


class TestTickets:
    """Support tickets endpoint tests"""
    
    def test_list_tickets(self, authenticated_client):
        """Test getting tickets list"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/tickets")
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
    
    def test_list_tickets_with_filters(self, authenticated_client):
        """Test tickets with status filter"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/tickets", params={
            "status": "open"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data


class TestAnalytics:
    """Analytics endpoint tests"""
    
    def test_get_analytics_overview(self, authenticated_client):
        """Test getting analytics overview"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/analytics/overview")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "users" in data
        assert "listings" in data
        assert "reports" in data
        assert "tickets" in data
        
        # Verify users stats
        assert "total" in data["users"]
        assert "new_7d" in data["users"]
        assert "new_30d" in data["users"]
        
        # Verify listings stats
        assert "total" in data["listings"]
        assert "active" in data["listings"]
        assert "pending" in data["listings"]
    
    def test_get_listings_by_category(self, authenticated_client):
        """Test getting listings by category analytics"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/analytics/listings-by-category")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_users_growth(self, authenticated_client):
        """Test getting users growth analytics"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/analytics/users-growth", params={
            "days": 30
        })
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestReports:
    """Reports endpoint tests"""
    
    def test_list_reports(self, authenticated_client):
        """Test getting reports list"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/reports")
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data


class TestSettings:
    """Settings endpoint tests"""
    
    def test_get_settings(self, authenticated_client):
        """Test getting app settings"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/settings")
        
        assert response.status_code == 200
        data = response.json()
        # Settings should have default values
        assert "currencies" in data or "feature_flags" in data


class TestUnauthorizedAccess:
    """Test unauthorized access to protected endpoints"""
    
    def test_categories_without_auth(self, api_client):
        """Test accessing categories without auth"""
        # Create new session without auth
        response = requests.get(f"{BASE_URL}/api/admin/categories")
        assert response.status_code == 401
    
    def test_users_without_auth(self, api_client):
        """Test accessing users without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 401
    
    def test_audit_logs_without_auth(self, api_client):
        """Test accessing audit logs without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/audit-logs")
        assert response.status_code == 401
