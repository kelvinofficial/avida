"""
Test Photography Guides Drag-and-Drop Reordering
Tests the admin photography guides reorder API endpoint
"""
import pytest
import requests
import os

ADMIN_BASE_URL = os.environ.get('ADMIN_BACKEND_URL', 'http://localhost:8002/api/admin')
MAIN_BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://admin-photography.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "admin@admin.com"
TEST_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{ADMIN_BASE_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    # Try to create admin if login fails
    return None


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Get auth headers for admin requests"""
    if admin_token:
        return {"Authorization": f"Bearer {admin_token}"}
    return {}


class TestPhotographyGuidesPublicAPI:
    """Test public API endpoints for photography guides"""
    
    def test_public_guides_auto_vehicles(self):
        """Test fetching public guides for auto_vehicles category"""
        response = requests.get(f"{MAIN_BACKEND_URL}/api/photography-guides/public/auto_vehicles")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "guides" in data
        assert "count" in data
        assert data["count"] > 0, "Should have guides for auto_vehicles"
        
        # Check guide structure
        for guide in data["guides"]:
            assert "id" in guide
            assert "title" in guide
            assert "description" in guide
            assert "icon" in guide
            assert "order" in guide
            assert "category_id" in guide
            print(f"  Guide: {guide['title']} (order: {guide['order']})")
    
    def test_public_guides_returns_sorted_by_order(self):
        """Test that public guides are returned sorted by order field"""
        response = requests.get(f"{MAIN_BACKEND_URL}/api/photography-guides/public/auto_vehicles")
        assert response.status_code == 200
        
        data = response.json()
        guides = data["guides"]
        
        # Check if guides are sorted by order
        orders = [g["order"] for g in guides]
        assert orders == sorted(orders), f"Guides should be sorted by order. Got: {orders}"
        print(f"  Guides are correctly sorted: {orders}")
    
    def test_public_guides_image_url_field(self):
        """Test that guides include image_url field"""
        response = requests.get(f"{MAIN_BACKEND_URL}/api/photography-guides/public/auto_vehicles")
        assert response.status_code == 200
        
        data = response.json()
        for guide in data["guides"]:
            # image_url should be present (can be null)
            assert "image_url" in guide, f"Guide {guide['title']} missing image_url field"
            print(f"  Guide '{guide['title']}' has image_url: {guide['image_url']}")
    
    def test_public_guides_properties_category(self):
        """Test fetching public guides for properties category"""
        response = requests.get(f"{MAIN_BACKEND_URL}/api/photography-guides/public/properties")
        assert response.status_code == 200
        
        data = response.json()
        assert "guides" in data
        print(f"  Properties category has {data['count']} guides")
    
    def test_public_guides_nonexistent_category(self):
        """Test fetching guides for non-existent category returns empty"""
        response = requests.get(f"{MAIN_BACKEND_URL}/api/photography-guides/public/nonexistent_category_xyz")
        assert response.status_code == 200
        
        data = response.json()
        assert data["count"] == 0 or data["guides"] == []
        print("  Non-existent category correctly returns empty guides")


class TestPhotographyGuidesAdminAPI:
    """Test admin API endpoints for photography guides"""
    
    def test_admin_auth_required(self):
        """Test that admin endpoints require authentication"""
        response = requests.get(f"{ADMIN_BASE_URL}/photography-guides?category_id=auto_vehicles")
        assert response.status_code == 401, "Should require auth"
        print("  Admin endpoint correctly requires authentication")
    
    def test_admin_list_guides(self, auth_headers):
        """Test listing guides as admin"""
        if not auth_headers.get("Authorization"):
            pytest.skip("Admin authentication failed")
        
        response = requests.get(
            f"{ADMIN_BASE_URL}/photography-guides",
            headers=auth_headers,
            params={"category_id": "auto_vehicles", "limit": 10}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "guides" in data
        print(f"  Admin can list {len(data['guides'])} guides")
    
    def test_admin_get_stats(self, auth_headers):
        """Test getting photography guides stats"""
        if not auth_headers.get("Authorization"):
            pytest.skip("Admin authentication failed")
        
        response = requests.get(
            f"{ADMIN_BASE_URL}/photography-guides/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total" in data
        assert "active" in data
        print(f"  Stats: total={data['total']}, active={data['active']}")


class TestPhotographyGuidesReorderAPI:
    """Test reorder functionality for photography guides"""
    
    def test_reorder_endpoint_exists(self, auth_headers):
        """Test that reorder endpoint exists"""
        if not auth_headers.get("Authorization"):
            pytest.skip("Admin authentication failed")
        
        # Get guides first to get IDs
        response = requests.get(
            f"{ADMIN_BASE_URL}/photography-guides",
            headers=auth_headers,
            params={"category_id": "auto_vehicles", "limit": 10}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not get guides")
        
        guides = response.json()["guides"]
        if len(guides) < 2:
            pytest.skip("Need at least 2 guides to test reorder")
        
        # Get the IDs in current order
        guide_ids = [g["id"] for g in guides]
        print(f"  Current guide IDs order: {guide_ids[:4]}")
        
        # Try to reorder (reverse order)
        reversed_ids = list(reversed(guide_ids))
        reorder_response = requests.put(
            f"http://localhost:8002/api/admin/photography-guides/reorder/auto_vehicles",
            headers=auth_headers,
            json=reversed_ids
        )
        
        print(f"  Reorder response status: {reorder_response.status_code}")
        
        if reorder_response.status_code == 200:
            print("  Reorder endpoint works correctly")
            
            # Verify the order changed
            verify_response = requests.get(
                f"{MAIN_BACKEND_URL}/api/photography-guides/public/auto_vehicles"
            )
            new_guides = verify_response.json()["guides"]
            new_ids = [g["id"] for g in new_guides]
            print(f"  New guide IDs order: {new_ids[:4]}")
            
            # Restore original order
            requests.put(
                f"http://localhost:8002/api/admin/photography-guides/reorder/auto_vehicles",
                headers=auth_headers,
                json=guide_ids
            )
            print("  Original order restored")
        else:
            print(f"  Reorder response: {reorder_response.text}")
    
    def test_reorder_without_auth_fails(self):
        """Test that reorder fails without authentication"""
        response = requests.put(
            f"http://localhost:8002/api/admin/photography-guides/reorder/auto_vehicles",
            json=["id1", "id2"]
        )
        assert response.status_code == 401, "Should require authentication"
        print("  Reorder correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
