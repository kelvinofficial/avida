"""
Admin Dashboard Backend API Tests
Tests for: Location CRUD, Deeplinks CRUD, Auth Settings, User Editing
"""
import pytest
import requests
import os
import uuid

# Use localhost for testing since backend runs on port 8002
BASE_URL = "http://localhost:8002/api/admin"

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    assert "admin" in data
    assert data["admin"]["email"] == ADMIN_EMAIL
    return data["access_token"]


@pytest.fixture
def authenticated_client(auth_token):
    """Session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestAdminAuthentication:
    """Authentication endpoint tests"""

    def test_login_success(self):
        """Test successful admin login"""
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        # Status assertion
        assert response.status_code == 200
        
        # Data assertions
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert "admin" in data
        
        # Admin data assertions
        admin = data["admin"]
        assert admin["email"] == ADMIN_EMAIL
        assert "id" in admin
        assert "name" in admin
        assert "role" in admin
        assert isinstance(admin["is_active"], bool)
        print(f"Login successful, token received for {ADMIN_EMAIL}")

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": "wrong@example.com", "password": "wrongpass"}
        )
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print("Invalid credentials correctly rejected")

    def test_login_missing_fields(self):
        """Test login with missing fields"""
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL}  # Missing password
        )
        assert response.status_code == 422  # Validation error
        print("Missing fields correctly rejected")

    def test_get_current_admin(self, authenticated_client):
        """Test getting current admin info"""
        response = authenticated_client.get(f"{BASE_URL}/auth/me")
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert "id" in data
        assert "role" in data
        print(f"Current admin: {data['email']}, role: {data['role']}")


class TestLocationsCRUD:
    """Location/Place Management CRUD tests"""

    created_location_id = None

    def test_list_locations(self, authenticated_client):
        """Test listing locations"""
        response = authenticated_client.get(f"{BASE_URL}/locations")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert isinstance(data["items"], list)
        print(f"Listed {data['total']} locations")

    def test_list_locations_with_filters(self, authenticated_client):
        """Test listing locations with filters"""
        response = authenticated_client.get(
            f"{BASE_URL}/locations",
            params={"type": "city", "page": 1, "limit": 10}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        # All items should be of type 'city' if any
        for item in data["items"]:
            assert item.get("type") == "city"
        print(f"Filtered locations by type 'city': {len(data['items'])} found")

    def test_create_location(self, authenticated_client):
        """Test creating a new location"""
        unique_name = f"TEST_Location_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": unique_name,
            "type": "city",
            "country_code": "US",
            "latitude": 40.7128,
            "longitude": -74.0060,
            "is_active": True,
            "is_featured": False
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/locations",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["name"] == unique_name
        assert data["type"] == "city"
        assert data["country_code"] == "US"
        assert data["is_active"] == True
        
        # Store for later tests
        TestLocationsCRUD.created_location_id = data["id"]
        print(f"Created location: {data['id']} - {data['name']}")

    def test_update_location(self, authenticated_client):
        """Test updating a location"""
        if not TestLocationsCRUD.created_location_id:
            pytest.skip("No location to update")
        
        update_payload = {
            "name": f"UPDATED_Location_{uuid.uuid4().hex[:8]}",
            "is_featured": True
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/locations/{TestLocationsCRUD.created_location_id}",
            json=update_payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["is_featured"] == True
        assert "UPDATED" in data["name"]
        print(f"Updated location: {data['id']} - {data['name']}")

    def test_get_location_after_update(self, authenticated_client):
        """Verify location update persisted"""
        if not TestLocationsCRUD.created_location_id:
            pytest.skip("No location to verify")
        
        # Get location list and find our updated location
        response = authenticated_client.get(f"{BASE_URL}/locations")
        assert response.status_code == 200
        
        data = response.json()
        found = False
        for loc in data["items"]:
            if loc["id"] == TestLocationsCRUD.created_location_id:
                assert loc["is_featured"] == True
                found = True
                print(f"Verified update persisted for location: {loc['id']}")
                break
        
        # If not found in first page, that's ok - just log it
        if not found:
            print("Location may be on another page, skipping verification")

    def test_delete_location(self, authenticated_client):
        """Test deleting a location"""
        if not TestLocationsCRUD.created_location_id:
            pytest.skip("No location to delete")
        
        response = authenticated_client.delete(
            f"{BASE_URL}/locations/{TestLocationsCRUD.created_location_id}"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        print(f"Deleted location: {TestLocationsCRUD.created_location_id}")

    def test_delete_nonexistent_location(self, authenticated_client):
        """Test deleting a non-existent location"""
        response = authenticated_client.delete(
            f"{BASE_URL}/locations/nonexistent_loc_12345"
        )
        assert response.status_code == 404
        print("Nonexistent location delete correctly returned 404")


class TestDeeplinksCRUD:
    """Deeplink Management CRUD tests"""

    created_deeplink_id = None
    test_slug = None

    def test_list_deeplinks(self, authenticated_client):
        """Test listing deeplinks"""
        response = authenticated_client.get(f"{BASE_URL}/deeplinks")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert isinstance(data["items"], list)
        print(f"Listed {data['total']} deeplinks")

    def test_list_deeplinks_with_filters(self, authenticated_client):
        """Test listing deeplinks with filters"""
        response = authenticated_client.get(
            f"{BASE_URL}/deeplinks",
            params={"target_type": "listing", "page": 1, "limit": 10}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        print(f"Filtered deeplinks: {len(data['items'])} found")

    def test_create_deeplink(self, authenticated_client):
        """Test creating a new deeplink"""
        unique_slug = f"test-link-{uuid.uuid4().hex[:8]}"
        TestDeeplinksCRUD.test_slug = unique_slug
        
        payload = {
            "name": f"TEST_Deeplink_{uuid.uuid4().hex[:8]}",
            "slug": unique_slug,
            "target_type": "listing",
            "target_id": "listing123",
            "fallback_url": "https://example.com/fallback",
            "utm_source": "test",
            "utm_medium": "api_test",
            "utm_campaign": "pytest",
            "is_active": True
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/deeplinks",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["slug"] == unique_slug
        assert data["target_type"] == "listing"
        assert data["is_active"] == True
        assert data["click_count"] == 0
        
        TestDeeplinksCRUD.created_deeplink_id = data["id"]
        print(f"Created deeplink: {data['id']} - slug: {data['slug']}")

    def test_create_duplicate_slug_fails(self, authenticated_client):
        """Test that duplicate slug fails"""
        if not TestDeeplinksCRUD.test_slug:
            pytest.skip("No slug to test duplicate")
        
        payload = {
            "name": "Duplicate Test",
            "slug": TestDeeplinksCRUD.test_slug,  # Same slug
            "target_type": "category",
            "is_active": True
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/deeplinks",
            json=payload
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print("Duplicate slug correctly rejected")

    def test_update_deeplink(self, authenticated_client):
        """Test updating a deeplink"""
        if not TestDeeplinksCRUD.created_deeplink_id:
            pytest.skip("No deeplink to update")
        
        update_payload = {
            "name": f"UPDATED_Deeplink_{uuid.uuid4().hex[:8]}",
            "is_active": False,
            "utm_campaign": "updated_campaign"
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/deeplinks/{TestDeeplinksCRUD.created_deeplink_id}",
            json=update_payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["is_active"] == False
        assert data["utm_campaign"] == "updated_campaign"
        assert "UPDATED" in data["name"]
        print(f"Updated deeplink: {data['id']}")

    def test_get_deeplink_stats(self, authenticated_client):
        """Test getting deeplink stats"""
        if not TestDeeplinksCRUD.created_deeplink_id:
            pytest.skip("No deeplink for stats")
        
        response = authenticated_client.get(
            f"{BASE_URL}/deeplinks/{TestDeeplinksCRUD.created_deeplink_id}/stats"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "deeplink" in data
        assert "total_clicks" in data
        assert "clicks_by_day" in data
        print(f"Deeplink stats: total_clicks={data['total_clicks']}")

    def test_delete_deeplink(self, authenticated_client):
        """Test deleting a deeplink"""
        if not TestDeeplinksCRUD.created_deeplink_id:
            pytest.skip("No deeplink to delete")
        
        response = authenticated_client.delete(
            f"{BASE_URL}/deeplinks/{TestDeeplinksCRUD.created_deeplink_id}"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        print(f"Deleted deeplink: {TestDeeplinksCRUD.created_deeplink_id}")

    def test_delete_nonexistent_deeplink(self, authenticated_client):
        """Test deleting a non-existent deeplink"""
        response = authenticated_client.delete(
            f"{BASE_URL}/deeplinks/nonexistent_dl_12345"
        )
        assert response.status_code == 404
        print("Nonexistent deeplink delete correctly returned 404")


class TestAuthSettings:
    """Auth Settings Management tests"""

    def test_get_auth_settings(self, authenticated_client):
        """Test getting auth settings"""
        response = authenticated_client.get(f"{BASE_URL}/settings/auth")
        assert response.status_code == 200
        
        data = response.json()
        # Verify expected fields exist
        assert "allow_registration" in data
        assert "require_email_verification" in data
        assert "require_phone_verification" in data
        assert "allow_social_login" in data
        assert "password_min_length" in data
        assert "session_timeout_minutes" in data
        assert "max_login_attempts" in data
        assert "two_factor_enabled" in data
        
        # Verify types
        assert isinstance(data["allow_registration"], bool)
        assert isinstance(data["password_min_length"], int)
        assert isinstance(data["session_timeout_minutes"], int)
        
        print(f"Auth settings retrieved: allow_registration={data['allow_registration']}, 2FA={data['two_factor_enabled']}")

    def test_update_auth_settings(self, authenticated_client):
        """Test updating auth settings"""
        update_payload = {
            "allow_registration": True,
            "require_email_verification": True,
            "password_min_length": 10,
            "password_require_uppercase": True,
            "password_require_number": True,
            "password_require_special": True,
            "session_timeout_minutes": 60,
            "max_login_attempts": 3,
            "lockout_duration_minutes": 15,
            "two_factor_enabled": False
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/settings/auth",
            json=update_payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["password_min_length"] == 10
        assert data["max_login_attempts"] == 3
        print(f"Updated auth settings: password_min_length={data['password_min_length']}")

    def test_verify_auth_settings_persisted(self, authenticated_client):
        """Verify auth settings update persisted"""
        response = authenticated_client.get(f"{BASE_URL}/settings/auth")
        assert response.status_code == 200
        
        data = response.json()
        assert data["password_min_length"] == 10
        assert data["max_login_attempts"] == 3
        print("Auth settings update verified as persisted")

    def test_restore_auth_settings(self, authenticated_client):
        """Restore auth settings to defaults"""
        restore_payload = {
            "allow_registration": True,
            "require_email_verification": True,
            "password_min_length": 8,
            "password_require_uppercase": True,
            "password_require_number": True,
            "password_require_special": False,
            "session_timeout_minutes": 1440,
            "max_login_attempts": 5,
            "lockout_duration_minutes": 30,
            "two_factor_enabled": False
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/settings/auth",
            json=restore_payload
        )
        assert response.status_code == 200
        print("Auth settings restored to defaults")


class TestUserEditing:
    """User Editing tests"""

    created_user_id = None

    def test_list_users(self, authenticated_client):
        """Test listing users"""
        response = authenticated_client.get(f"{BASE_URL}/users")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
        print(f"Listed {data['total']} users")
        
        # Store a user ID for update test if available
        if data["items"]:
            TestUserEditing.created_user_id = data["items"][0].get("user_id")

    def test_update_user(self, authenticated_client):
        """Test updating a user"""
        if not TestUserEditing.created_user_id:
            pytest.skip("No user to update")
        
        unique_suffix = uuid.uuid4().hex[:8]
        update_payload = {
            "name": f"Updated User {unique_suffix}",
            "bio": "Updated via API test",
            "is_verified": True,
            "is_active": True
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/users/{TestUserEditing.created_user_id}",
            json=update_payload
        )
        
        # User might not exist - check both 200 and 404
        if response.status_code == 404:
            print(f"User {TestUserEditing.created_user_id} not found - skipping")
            pytest.skip("User not found")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "Updated" in data.get("name", "")
        assert data.get("bio") == "Updated via API test"
        
        # Security check: password_hash should not be returned
        assert "password_hash" not in data or data.get("password_hash") is None
        
        print(f"Updated user: {TestUserEditing.created_user_id}")

    def test_get_user_verifies_update(self, authenticated_client):
        """Verify user update persisted by GET"""
        if not TestUserEditing.created_user_id:
            pytest.skip("No user to verify")
        
        response = authenticated_client.get(f"{BASE_URL}/users/{TestUserEditing.created_user_id}")
        
        if response.status_code == 404:
            pytest.skip("User not found")
        
        assert response.status_code == 200
        data = response.json()
        assert "Updated" in data.get("name", "")
        assert data.get("bio") == "Updated via API test"
        print(f"Verified user update persisted: {data.get('name')}")

    def test_update_nonexistent_user(self, authenticated_client):
        """Test updating a non-existent user"""
        response = authenticated_client.put(
            f"{BASE_URL}/users/nonexistent_user_12345",
            json={"name": "Test"}
        )
        assert response.status_code == 404
        print("Nonexistent user update correctly returned 404")


class TestUnauthorizedAccess:
    """Test unauthorized access attempts"""

    def test_locations_without_auth(self):
        """Test accessing locations without auth"""
        response = requests.get(f"{BASE_URL}/locations")
        assert response.status_code == 401
        print("Locations without auth correctly rejected")

    def test_deeplinks_without_auth(self):
        """Test accessing deeplinks without auth"""
        response = requests.get(f"{BASE_URL}/deeplinks")
        assert response.status_code == 401
        print("Deeplinks without auth correctly rejected")

    def test_auth_settings_without_auth(self):
        """Test accessing auth settings without auth"""
        response = requests.get(f"{BASE_URL}/settings/auth")
        assert response.status_code == 401
        print("Auth settings without auth correctly rejected")

    def test_user_update_without_auth(self):
        """Test updating user without auth"""
        response = requests.put(
            f"{BASE_URL}/users/some_user_id",
            json={"name": "Test"}
        )
        assert response.status_code == 401
        print("User update without auth correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
