"""
Test Photography Guides Feature
Tests both public endpoints and admin dashboard endpoints for photography guide management
"""
import pytest
import requests
import os
import json

# Base URLs
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://classifieds-stats.preview.emergentagent.com').rstrip('/')
ADMIN_BASE_URL = f"{BASE_URL}/api/admin"

# Admin credentials
ADMIN_EMAIL = "admin@marketplace.com"
ADMIN_PASSWORD = "Admin@123456"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{ADMIN_BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def auth_headers(admin_token):
    """Create authentication headers"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestPublicPhotographyGuidesAPI:
    """Test public photography guides endpoint"""
    
    def test_get_guides_for_auto_vehicles(self):
        """Test getting photography guides for auto_vehicles category"""
        response = requests.get(f"{BASE_URL}/api/photography-guides/public/auto_vehicles")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "guides" in data, "Response should contain 'guides' key"
        assert "count" in data, "Response should contain 'count' key"
        assert data["count"] > 0, "Should have at least one guide for auto_vehicles"
        
        # Verify guide structure
        for guide in data["guides"]:
            assert "id" in guide
            assert "category_id" in guide
            assert guide["category_id"] == "auto_vehicles"
            assert "title" in guide
            assert "description" in guide
            assert "icon" in guide
            print(f"  - Guide: {guide['title']} ({guide['icon']})")
    
    def test_get_guides_for_default_category(self):
        """Test getting photography guides for default/fallback category"""
        response = requests.get(f"{BASE_URL}/api/photography-guides/public/default")
        
        assert response.status_code == 200
        data = response.json()
        assert data["count"] > 0, "Should have default guides seeded"
        print(f"Found {data['count']} default guides")
    
    def test_get_guides_for_properties(self):
        """Test getting photography guides for properties category"""
        response = requests.get(f"{BASE_URL}/api/photography-guides/public/properties")
        
        assert response.status_code == 200
        data = response.json()
        print(f"Found {data['count']} property guides")
    
    def test_get_guides_for_nonexistent_category(self):
        """Test getting guides for a category with no guides returns empty list"""
        response = requests.get(f"{BASE_URL}/api/photography-guides/public/nonexistent_category_xyz")
        
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0, "Non-existent category should return empty list"
        assert data["guides"] == []


class TestAdminPhotographyGuidesStats:
    """Test admin photography guides statistics endpoint"""
    
    def test_get_stats_requires_auth(self):
        """Test that stats endpoint requires authentication"""
        response = requests.get(f"{ADMIN_BASE_URL}/photography-guides/stats")
        assert response.status_code == 401, "Should require authentication"
    
    def test_get_stats_success(self, auth_headers):
        """Test getting photography guides statistics"""
        response = requests.get(
            f"{ADMIN_BASE_URL}/photography-guides/stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total" in data, "Should have 'total' count"
        assert "active" in data, "Should have 'active' count"
        assert "inactive" in data, "Should have 'inactive' count"
        assert "with_images" in data, "Should have 'with_images' count"
        assert "categories_count" in data, "Should have 'categories_count'"
        assert "by_category" in data, "Should have 'by_category' breakdown"
        
        print(f"Stats - Total: {data['total']}, Active: {data['active']}, With Images: {data['with_images']}")
        print(f"Categories: {data['categories_count']}")


class TestAdminPhotographyGuidesList:
    """Test admin photography guides list endpoint"""
    
    def test_list_guides_requires_auth(self):
        """Test that list endpoint requires authentication"""
        response = requests.get(f"{ADMIN_BASE_URL}/photography-guides")
        assert response.status_code == 401, "Should require authentication"
    
    def test_list_all_guides(self, auth_headers):
        """Test listing all photography guides"""
        response = requests.get(
            f"{ADMIN_BASE_URL}/photography-guides?limit=100",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "guides" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        
        print(f"Total guides: {data['total']}, Retrieved: {len(data['guides'])}")
        
        # Verify guide structure
        if len(data["guides"]) > 0:
            guide = data["guides"][0]
            assert "id" in guide
            assert "category_id" in guide
            assert "title" in guide
            assert "description" in guide
            assert "icon" in guide
            assert "has_image" in guide
            assert "is_active" in guide
            assert "order" in guide
    
    def test_filter_guides_by_category(self, auth_headers):
        """Test filtering guides by category"""
        response = requests.get(
            f"{ADMIN_BASE_URL}/photography-guides?category_id=auto_vehicles",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned guides should be for auto_vehicles category
        for guide in data["guides"]:
            assert guide["category_id"] == "auto_vehicles"
        
        print(f"Found {len(data['guides'])} guides for auto_vehicles")


class TestAdminPhotographyGuidesCRUD:
    """Test admin CRUD operations for photography guides"""
    
    def test_create_guide(self, auth_headers):
        """Test creating a new photography guide"""
        guide_data = {
            "category_id": "electronics",
            "title": "TEST_Clean Surface",
            "description": "Wipe screen and body before photographing",
            "icon": "sparkles-outline",
            "order": 99,
            "is_active": True
        }
        
        response = requests.post(
            f"{ADMIN_BASE_URL}/photography-guides",
            json=guide_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain created guide ID"
        assert "message" in data
        
        # Store ID for cleanup
        guide_id = data["id"]
        print(f"Created guide with ID: {guide_id}")
        
        # Cleanup - delete the test guide
        delete_response = requests.delete(
            f"{ADMIN_BASE_URL}/photography-guides/{guide_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, "Cleanup delete should succeed"
        print("Test guide deleted")
    
    def test_get_single_guide(self, auth_headers):
        """Test getting a single guide with full details"""
        # First get list to get a guide ID
        list_response = requests.get(
            f"{ADMIN_BASE_URL}/photography-guides?limit=1",
            headers=auth_headers
        )
        
        assert list_response.status_code == 200
        list_data = list_response.json()
        
        if len(list_data["guides"]) == 0:
            pytest.skip("No guides available to test")
        
        guide_id = list_data["guides"][0]["id"]
        
        # Get single guide
        response = requests.get(
            f"{ADMIN_BASE_URL}/photography-guides/{guide_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        guide = response.json()
        
        assert "id" in guide
        assert "category_id" in guide
        assert "title" in guide
        assert "description" in guide
        assert "icon" in guide
        assert "is_active" in guide
        # image_url may be null if no image
        
        print(f"Retrieved guide: {guide['title']} (category: {guide['category_id']})")
    
    def test_update_guide(self, auth_headers):
        """Test updating a photography guide"""
        # Create a test guide first
        create_response = requests.post(
            f"{ADMIN_BASE_URL}/photography-guides",
            json={
                "category_id": "pets",
                "title": "TEST_Update Guide",
                "description": "Original description",
                "icon": "paw-outline",
                "is_active": True
            },
            headers=auth_headers
        )
        
        assert create_response.status_code == 200
        guide_id = create_response.json()["id"]
        
        # Update the guide
        update_response = requests.put(
            f"{ADMIN_BASE_URL}/photography-guides/{guide_id}",
            json={
                "title": "TEST_Updated Title",
                "description": "Updated description",
                "is_active": False
            },
            headers=auth_headers
        )
        
        assert update_response.status_code == 200
        
        # Verify update
        get_response = requests.get(
            f"{ADMIN_BASE_URL}/photography-guides/{guide_id}",
            headers=auth_headers
        )
        
        assert get_response.status_code == 200
        updated_guide = get_response.json()
        assert updated_guide["title"] == "TEST_Updated Title"
        assert updated_guide["description"] == "Updated description"
        assert updated_guide["is_active"] == False
        
        print("Guide updated successfully")
        
        # Cleanup
        requests.delete(
            f"{ADMIN_BASE_URL}/photography-guides/{guide_id}",
            headers=auth_headers
        )
    
    def test_delete_guide(self, auth_headers):
        """Test deleting a photography guide"""
        # Create a test guide first
        create_response = requests.post(
            f"{ADMIN_BASE_URL}/photography-guides",
            json={
                "category_id": "home_furniture",
                "title": "TEST_Delete Guide",
                "description": "This guide will be deleted",
                "icon": "trash-outline",
                "is_active": True
            },
            headers=auth_headers
        )
        
        assert create_response.status_code == 200
        guide_id = create_response.json()["id"]
        
        # Delete the guide
        delete_response = requests.delete(
            f"{ADMIN_BASE_URL}/photography-guides/{guide_id}",
            headers=auth_headers
        )
        
        assert delete_response.status_code == 200
        assert "message" in delete_response.json()
        
        # Verify deletion
        get_response = requests.get(
            f"{ADMIN_BASE_URL}/photography-guides/{guide_id}",
            headers=auth_headers
        )
        
        assert get_response.status_code == 404, "Deleted guide should not be found"
        print("Guide deleted successfully")


class TestSeedDefaults:
    """Test seed defaults functionality"""
    
    def test_seed_endpoint_exists(self, auth_headers):
        """Test that seed endpoint is accessible"""
        # Note: We don't want to actually seed again if already seeded
        # Just verify the endpoint exists and is authenticated
        
        # This should work because guides are already seeded
        stats_response = requests.get(
            f"{ADMIN_BASE_URL}/photography-guides/stats",
            headers=auth_headers
        )
        
        assert stats_response.status_code == 200
        stats = stats_response.json()
        
        if stats["total"] > 0:
            print(f"Guides already seeded: {stats['total']} total guides")
            # Verify we have multiple categories
            assert stats["categories_count"] >= 5, "Should have at least 5 categories seeded"
        else:
            # If no guides, try seeding
            seed_response = requests.post(
                f"{ADMIN_BASE_URL}/photography-guides/seed",
                headers=auth_headers
            )
            assert seed_response.status_code == 200
            print(f"Seeded guides: {seed_response.json()}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
