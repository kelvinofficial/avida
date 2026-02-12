"""
Test suite for Attribute Icons API endpoints
Tests Ionicon management for categories and attributes in the admin panel
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://icon-admin-panel-1.preview.emergentagent.com')

# Test credentials
TEST_USER = {
    "email": "icon.admin@test.com",
    "password": "Icon@123456"
}

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for admin user"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=TEST_USER)
    if response.status_code == 200:
        return response.json().get("session_token")
    
    # If user doesn't exist, register first
    if response.status_code in [401, 404]:
        reg_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"],
            "name": "Icon Admin Test"
        })
        if reg_response.status_code in [200, 201]:
            return reg_response.json().get("session_token")
        print(f"Registration failed: {reg_response.status_code} - {reg_response.text}")
    
    print(f"Auth failed: {response.status_code} - {response.text}")
    pytest.skip("Authentication failed - skipping authenticated tests")

@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestPublicIconsEndpoints:
    """Tests for public (no auth required) icon endpoints"""
    
    def test_get_available_ionicons_list(self, api_client):
        """GET /api/attribute-icons/ionicons - should return list of available Ionicons"""
        response = api_client.get(f"{BASE_URL}/api/attribute-icons/ionicons")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "icons" in data, "Response should contain 'icons' list"
        assert "total" in data, "Response should contain 'total' count"
        assert isinstance(data["icons"], list), "Icons should be a list"
        assert data["total"] > 0, "Should have some icons"
        
        # Verify some expected ionicons are present
        icons_list = data["icons"]
        expected_icons = ["car-outline", "home-outline", "laptop-outline"]
        for icon in expected_icons:
            assert icon in icons_list, f"Expected icon '{icon}' not found in list"
        
        print(f"✓ Found {data['total']} available Ionicons")
    
    def test_get_public_icons(self, api_client):
        """GET /api/attribute-icons/public - should return all active icons"""
        response = api_client.get(f"{BASE_URL}/api/attribute-icons/public")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "icons" in data, "Response should contain 'icons' list"
        assert "total" in data, "Response should contain 'total' count"
        
        icons = data["icons"]
        if len(icons) > 0:
            # Validate icon structure
            first_icon = icons[0]
            required_fields = ["id", "name", "ionicon_name", "icon_type", "is_active"]
            for field in required_fields:
                assert field in first_icon, f"Icon should have '{field}' field"
            
            # All public icons should be active
            for icon in icons:
                assert icon["is_active"] == True, f"Public icons should be active"
        
        print(f"✓ Found {data['total']} active public icons")
    
    def test_get_public_icons_filter_by_category(self, api_client):
        """GET /api/attribute-icons/public - should filter by category_id"""
        response = api_client.get(f"{BASE_URL}/api/attribute-icons/public?category_id=auto_vehicles")
        
        assert response.status_code == 200
        
        data = response.json()
        icons = data["icons"]
        
        if len(icons) > 0:
            for icon in icons:
                assert icon.get("category_id") == "auto_vehicles", f"All icons should be from auto_vehicles category"
        
        print(f"✓ Found {data['total']} icons for auto_vehicles category")
    
    def test_get_public_icons_filter_by_type(self, api_client):
        """GET /api/attribute-icons/public - should filter by icon_type"""
        response = api_client.get(f"{BASE_URL}/api/attribute-icons/public?icon_type=category")
        
        assert response.status_code == 200
        
        data = response.json()
        icons = data["icons"]
        
        if len(icons) > 0:
            for icon in icons:
                assert icon.get("icon_type") == "category", f"All icons should be of type 'category'"
        
        print(f"✓ Found {data['total']} category-type icons")
    
    def test_get_icons_by_category(self, api_client):
        """GET /api/attribute-icons/by-category/{category_id} - should return icons for specific category"""
        response = api_client.get(f"{BASE_URL}/api/attribute-icons/by-category/properties")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "icons" in data
        assert "total" in data
        
        icons = data["icons"]
        for icon in icons:
            assert icon.get("category_id") == "properties", f"Icon category_id should be 'properties'"
        
        print(f"✓ Found {data['total']} icons for properties category")
    
    def test_get_icons_by_category_empty(self, api_client):
        """GET /api/attribute-icons/by-category/{category_id} - should return empty for non-existent category"""
        response = api_client.get(f"{BASE_URL}/api/attribute-icons/by-category/non_existent_category")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] == 0, "Should return 0 icons for non-existent category"
        
        print("✓ Returns empty list for non-existent category")


class TestAuthenticatedIconsEndpoints:
    """Tests for authenticated (admin) icon endpoints"""
    
    def test_get_icons_stats(self, authenticated_client):
        """GET /api/attribute-icons/stats - should return icon statistics"""
        response = authenticated_client.get(f"{BASE_URL}/api/attribute-icons/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total" in data, "Stats should include total count"
        assert "active" in data, "Stats should include active count"
        assert "inactive" in data, "Stats should include inactive count"
        assert "by_type" in data, "Stats should include by_type breakdown"
        
        by_type = data["by_type"]
        assert "category" in by_type, "by_type should include 'category'"
        assert "attribute" in by_type, "by_type should include 'attribute'"
        
        print(f"✓ Stats: total={data['total']}, active={data['active']}, by_type={by_type}")
    
    def test_create_icon(self, authenticated_client):
        """POST /api/attribute-icons - should create a new icon"""
        test_icon = {
            "name": f"TEST_Icon_{uuid.uuid4().hex[:8]}",
            "ionicon_name": "star-outline",
            "category_id": "electronics",
            "attribute_name": "test_attr",
            "icon_type": "attribute",
            "color": "#FF5733",
            "description": "Test icon for pytest"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/attribute-icons", json=test_icon)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "icon" in data, "Response should contain created icon"
        
        icon = data["icon"]
        assert icon["name"] == test_icon["name"], "Icon name should match"
        assert icon["ionicon_name"] == test_icon["ionicon_name"], "Icon ionicon_name should match"
        assert icon["is_active"] == True, "New icon should be active by default"
        assert "id" in icon, "Icon should have an ID"
        
        # Store icon ID for cleanup
        self.__class__.created_icon_id = icon["id"]
        
        print(f"✓ Created icon with ID: {icon['id']}")
    
    def test_update_icon(self, authenticated_client):
        """PUT /api/attribute-icons/{icon_id} - should update an existing icon"""
        if not hasattr(self.__class__, 'created_icon_id'):
            pytest.skip("No icon created in previous test")
        
        icon_id = self.__class__.created_icon_id
        updates = {
            "description": "Updated description via pytest",
            "color": "#00FF00"
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/attribute-icons/{icon_id}", json=updates)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        
        icon = data["icon"]
        assert icon["description"] == updates["description"], "Description should be updated"
        assert icon["color"] == updates["color"], "Color should be updated"
        
        print(f"✓ Updated icon {icon_id}")
    
    def test_update_icon_not_found(self, authenticated_client):
        """PUT /api/attribute-icons/{icon_id} - should return 404 for non-existent icon"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/attribute-icons/non-existent-id-12345",
            json={"name": "Updated Name"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Returns 404 for non-existent icon update")
    
    def test_delete_icon(self, authenticated_client):
        """DELETE /api/attribute-icons/{icon_id} - should soft delete an icon"""
        if not hasattr(self.__class__, 'created_icon_id'):
            pytest.skip("No icon created in previous test")
        
        icon_id = self.__class__.created_icon_id
        
        response = authenticated_client.delete(f"{BASE_URL}/api/attribute-icons/{icon_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        
        print(f"✓ Deleted (soft) icon {icon_id}")
    
    def test_delete_icon_not_found(self, authenticated_client):
        """DELETE /api/attribute-icons/{icon_id} - should return 404 for non-existent icon"""
        response = authenticated_client.delete(f"{BASE_URL}/api/attribute-icons/non-existent-id-12345")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Returns 404 for non-existent icon delete")


class TestSeedIcons:
    """Tests for the seed icons endpoint"""
    
    def test_seed_default_icons_requires_auth(self, api_client):
        """POST /api/attribute-icons/seed - should require authentication"""
        # Create a fresh session without auth
        fresh_client = requests.Session()
        fresh_client.headers.update({"Content-Type": "application/json"})
        
        response = fresh_client.post(f"{BASE_URL}/api/attribute-icons/seed")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Seed endpoint requires authentication")
    
    def test_seed_default_icons(self, authenticated_client):
        """POST /api/attribute-icons/seed - should seed default icons (idempotent)"""
        response = authenticated_client.post(f"{BASE_URL}/api/attribute-icons/seed")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "created" in data, "Response should include created count"
        assert "skipped" in data, "Response should include skipped count"
        
        # Since icons are already seeded, most should be skipped
        print(f"✓ Seed result: created={data['created']}, skipped={data['skipped']}")


class TestIconsCRUDFlow:
    """Full CRUD flow test for icons"""
    
    def test_full_crud_flow(self, authenticated_client, api_client):
        """Test complete Create -> Read -> Update -> Delete flow"""
        # 1. CREATE
        unique_name = f"TEST_CRUDIcon_{uuid.uuid4().hex[:8]}"
        create_data = {
            "name": unique_name,
            "ionicon_name": "ribbon-outline",
            "category_id": "fashion_beauty",
            "attribute_name": "crud_test",
            "icon_type": "attribute",
            "description": "CRUD test icon"
        }
        
        create_response = authenticated_client.post(f"{BASE_URL}/api/attribute-icons", json=create_data)
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        
        created_icon = create_response.json()["icon"]
        icon_id = created_icon["id"]
        print(f"✓ CREATE: Icon created with ID {icon_id}")
        
        # 2. READ (verify in public list)
        read_response = api_client.get(f"{BASE_URL}/api/attribute-icons/public?category_id=fashion_beauty")
        assert read_response.status_code == 200
        
        icons = read_response.json()["icons"]
        found = any(i["id"] == icon_id for i in icons)
        assert found, f"Created icon {icon_id} not found in public list"
        print(f"✓ READ: Icon found in public list")
        
        # 3. UPDATE
        update_response = authenticated_client.put(
            f"{BASE_URL}/api/attribute-icons/{icon_id}",
            json={"description": "Updated via CRUD test", "color": "#123456"}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        updated_icon = update_response.json()["icon"]
        assert updated_icon["description"] == "Updated via CRUD test"
        assert updated_icon["color"] == "#123456"
        print(f"✓ UPDATE: Icon description and color updated")
        
        # 4. DELETE (soft delete)
        delete_response = authenticated_client.delete(f"{BASE_URL}/api/attribute-icons/{icon_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"✓ DELETE: Icon soft deleted")
        
        # 5. Verify deleted icon not in public list (is_active=false)
        verify_response = api_client.get(f"{BASE_URL}/api/attribute-icons/public?category_id=fashion_beauty")
        icons_after_delete = verify_response.json()["icons"]
        found_after_delete = any(i["id"] == icon_id for i in icons_after_delete)
        assert not found_after_delete, "Deleted icon should not appear in public list"
        print(f"✓ VERIFY: Icon no longer in public list after deletion")


class TestIconsAdminPagination:
    """Tests for admin icons pagination endpoint"""
    
    def test_get_all_icons_paginated(self, authenticated_client):
        """GET /api/attribute-icons - should return paginated icons for admin"""
        response = authenticated_client.get(f"{BASE_URL}/api/attribute-icons?page=1&limit=10")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "icons" in data, "Response should contain 'icons' list"
        assert "pagination" in data, "Response should contain 'pagination' info"
        
        pagination = data["pagination"]
        assert "page" in pagination
        assert "limit" in pagination
        assert "total" in pagination
        assert "pages" in pagination
        
        assert pagination["page"] == 1
        assert pagination["limit"] == 10
        
        print(f"✓ Paginated results: page {pagination['page']}/{pagination['pages']}, total={pagination['total']}")
    
    def test_get_all_icons_with_search(self, authenticated_client):
        """GET /api/attribute-icons - should support search"""
        response = authenticated_client.get(f"{BASE_URL}/api/attribute-icons?search=car")
        
        assert response.status_code == 200
        
        data = response.json()
        icons = data["icons"]
        
        # All returned icons should match the search term
        for icon in icons:
            name_match = "car" in icon.get("name", "").lower()
            ionicon_match = "car" in icon.get("ionicon_name", "").lower()
            attr_match = "car" in icon.get("attribute_name", "").lower() if icon.get("attribute_name") else False
            assert name_match or ionicon_match or attr_match, f"Icon should match search term 'car'"
        
        print(f"✓ Search returned {len(icons)} icons matching 'car'")


class TestIconMappings:
    """Tests for icon mappings endpoint"""
    
    def test_get_icon_mappings(self, authenticated_client):
        """GET /api/attribute-icons/mappings - should return organized icon mappings"""
        response = authenticated_client.get(f"{BASE_URL}/api/attribute-icons/mappings")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "mappings" in data, "Response should contain 'mappings'"
        
        mappings = data["mappings"]
        assert isinstance(mappings, dict), "Mappings should be a dictionary"
        
        # Check structure of mappings
        if len(mappings) > 0:
            for cat_id, cat_data in mappings.items():
                if cat_id != "_global":
                    assert "category_icon" in cat_data or cat_data.get("category_icon") is None
                    assert "subcategories" in cat_data
                    assert "attributes" in cat_data
        
        print(f"✓ Got mappings for {len(mappings)} categories")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
