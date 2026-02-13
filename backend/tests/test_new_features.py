"""
Backend API Tests for:
1. Popular Searches API - track and get trending searches
2. Photography Guides API - admin management of photo tips
3. Category Filters - enhanced filter options
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ads-frontend.preview.emergentagent.com")

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for testing"""
    # Try to login first
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test_api@test.com",
        "password": "password123"
    })
    
    if response.status_code == 200:
        return response.json().get("session_token")
    
    # If login fails, register new user
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": "test_api@test.com",
        "password": "password123",
        "name": "Test API User"
    })
    
    if response.status_code == 200:
        return response.json().get("session_token")
    
    pytest.skip("Could not authenticate")

@pytest.fixture
def auth_headers(auth_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


# ============ POPULAR SEARCHES API TESTS ============

class TestPopularSearchesAPI:
    """Tests for Popular Searches feature"""
    
    def test_get_popular_searches_global(self):
        """Test GET /api/searches/popular returns global searches"""
        response = requests.get(f"{BASE_URL}/api/searches/popular")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "global_searches" in data
        assert "category_searches" in data
        assert isinstance(data["global_searches"], list)
        print(f"Found {len(data['global_searches'])} global popular searches")
    
    def test_get_popular_searches_with_category(self):
        """Test GET /api/searches/popular with category filter"""
        response = requests.get(
            f"{BASE_URL}/api/searches/popular",
            params={"category_id": "electronics", "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "global_searches" in data
        assert "category_searches" in data
        # Category searches should be filtered by electronics
        for search in data["category_searches"]:
            assert search.get("category_id") == "electronics" or "category_id" not in search
        print(f"Found {len(data['category_searches'])} category-specific searches for electronics")
    
    def test_track_search_query(self):
        """Test POST /api/searches/track tracks a search"""
        response = requests.post(
            f"{BASE_URL}/api/searches/track",
            json={"query": "test search tracking", "category_id": "electronics"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "tracked"
        assert data["query"] == "test search tracking"
        print("Search tracking successful")
    
    def test_track_search_validates_min_length(self):
        """Test search tracking validates minimum query length"""
        response = requests.post(
            f"{BASE_URL}/api/searches/track",
            json={"query": "a"}  # Too short
        )
        
        assert response.status_code == 400
        print("Validation for short queries working")
    
    def test_track_search_validates_max_length(self):
        """Test search tracking validates maximum query length"""
        long_query = "x" * 101  # Too long
        response = requests.post(
            f"{BASE_URL}/api/searches/track",
            json={"query": long_query}
        )
        
        assert response.status_code == 400
        print("Validation for long queries working")
    
    def test_search_suggestions_endpoint(self):
        """Test GET /api/searches/suggestions returns autocomplete suggestions"""
        response = requests.get(
            f"{BASE_URL}/api/searches/suggestions",
            params={"q": "lap"}  # Partial query
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        print(f"Found {len(data['suggestions'])} suggestions for 'lap'")


# ============ PHOTOGRAPHY GUIDES API TESTS ============

class TestPhotographyGuidesAPI:
    """Tests for Photography Guides admin feature"""
    
    def test_get_guides_requires_auth(self):
        """Test GET /api/photography-guides requires authentication"""
        response = requests.get(f"{BASE_URL}/api/photography-guides")
        
        # Should return 401 without auth
        assert response.status_code == 401
        print("Authentication required for admin guides endpoint")
    
    def test_get_guides_list_authenticated(self, auth_headers):
        """Test GET /api/photography-guides returns guides list when authenticated"""
        response = requests.get(
            f"{BASE_URL}/api/photography-guides",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "guides" in data
        assert "total" in data
        assert "page" in data
        assert isinstance(data["guides"], list)
        print(f"Found {data['total']} photography guides total")
    
    def test_get_guides_stats(self, auth_headers):
        """Test GET /api/photography-guides/stats returns statistics"""
        response = requests.get(
            f"{BASE_URL}/api/photography-guides/stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert "active" in data
        assert "inactive" in data
        assert "by_category" in data
        print(f"Stats: {data['total']} total, {data['active']} active, {data['categories_count']} categories")
    
    def test_get_guides_filter_by_category(self, auth_headers):
        """Test GET /api/photography-guides with category filter"""
        response = requests.get(
            f"{BASE_URL}/api/photography-guides",
            headers=auth_headers,
            params={"category_id": "electronics"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned guides should be for electronics
        for guide in data["guides"]:
            assert guide["category_id"] == "electronics"
        print(f"Found {len(data['guides'])} guides for electronics")
    
    def test_get_public_guides_no_auth_required(self):
        """Test GET /api/photography-guides/public/{category_id} works without auth"""
        response = requests.get(f"{BASE_URL}/api/photography-guides/public/electronics")
        
        assert response.status_code == 200
        data = response.json()
        
        # The response is now wrapped in {guides: [...], count: N}
        if isinstance(data, dict) and "guides" in data:
            guides = data.get("guides", [])
        else:
            guides = data if isinstance(data, list) else []
        
        # All guides should be active
        for guide in guides:
            assert guide.get("is_active", True) == True
        print(f"Found {len(guides)} public photography guides for electronics")
    
    def test_create_guide(self, auth_headers):
        """Test POST /api/photography-guides creates a new guide"""
        guide_data = {
            "category_id": "TEST_category",
            "title": "TEST Guide Title",
            "description": "TEST Guide Description for testing",
            "icon": "camera-outline",
            "order": 99,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/photography-guides",
            headers=auth_headers,
            json=guide_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] == "Photography guide created successfully"
        
        # Store for cleanup
        TestPhotographyGuidesAPI.created_guide_id = data["id"]
        print(f"Created guide with ID: {data['id']}")
    
    def test_update_guide(self, auth_headers):
        """Test PUT /api/photography-guides/{id} updates a guide"""
        guide_id = getattr(TestPhotographyGuidesAPI, "created_guide_id", None)
        if not guide_id:
            pytest.skip("No guide ID from create test")
        
        response = requests.put(
            f"{BASE_URL}/api/photography-guides/{guide_id}",
            headers=auth_headers,
            json={"title": "TEST Updated Guide Title"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Photography guide updated successfully"
        print("Guide updated successfully")
    
    def test_delete_guide(self, auth_headers):
        """Test DELETE /api/photography-guides/{id} deletes a guide"""
        guide_id = getattr(TestPhotographyGuidesAPI, "created_guide_id", None)
        if not guide_id:
            pytest.skip("No guide ID from create test")
        
        response = requests.delete(
            f"{BASE_URL}/api/photography-guides/{guide_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Photography guide deleted successfully"
        print("Guide deleted successfully")


# ============ CATEGORY FILTERS TESTS ============

class TestCategoryFilters:
    """Tests for category listing filters"""
    
    def test_get_listings_with_condition_filter(self):
        """Test GET /api/listings supports condition filter"""
        response = requests.get(
            f"{BASE_URL}/api/listings",
            params={"category": "electronics", "condition": "New", "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "listings" in data
        print(f"Found {len(data['listings'])} listings with condition=New")
    
    def test_get_listings_with_sort(self):
        """Test GET /api/listings supports sort parameter"""
        response = requests.get(
            f"{BASE_URL}/api/listings",
            params={"category": "electronics", "sort": "price_asc", "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "listings" in data
        print(f"Found {len(data['listings'])} listings sorted by price ascending")
    
    def test_get_listings_with_price_range(self):
        """Test GET /api/listings supports price range filter"""
        response = requests.get(
            f"{BASE_URL}/api/listings",
            params={"category": "electronics", "min_price": 100, "max_price": 1000, "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "listings" in data
        print(f"Found {len(data['listings'])} listings in price range 100-1000")
    
    def test_get_listings_with_search_query(self):
        """Test GET /api/listings supports search within category"""
        response = requests.get(
            f"{BASE_URL}/api/listings",
            params={"category": "electronics", "search": "laptop", "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "listings" in data
        print(f"Found {len(data['listings'])} listings matching 'laptop' in electronics")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
