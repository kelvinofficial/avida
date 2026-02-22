"""
Backend API Tests for Avida Marketplace
Tests core functionality: health, listings, categories, search
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://ui-refactor-preview.preview.emergentagent.com')


class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns 200 and healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        
        data = response.json()
        assert "status" in data, "Response missing 'status' field"
        assert data["status"] == "healthy", f"Status is not healthy: {data['status']}"
        print(f"Health check PASSED: {data}")


class TestListingsAPI:
    """Listings endpoint tests"""
    
    def test_get_listings(self):
        """Test GET /api/listings returns listings array"""
        response = requests.get(f"{BASE_URL}/api/listings?limit=10")
        assert response.status_code == 200, f"Get listings failed: {response.status_code}"
        
        data = response.json()
        assert "listings" in data, "Response missing 'listings' field"
        assert isinstance(data["listings"], list), "Listings is not an array"
        print(f"Get listings PASSED: Found {len(data['listings'])} listings")
    
    def test_listing_structure(self):
        """Test listing data has required fields"""
        response = requests.get(f"{BASE_URL}/api/listings?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["listings"]) > 0:
            listing = data["listings"][0]
            required_fields = ["id", "title", "price", "category_id"]
            for field in required_fields:
                assert field in listing, f"Listing missing required field: {field}"
            print(f"Listing structure PASSED: {listing.keys()}")
        else:
            print("No listings to test structure - skipping")
    
    def test_get_single_listing(self):
        """Test GET /api/listings/{id} returns single listing"""
        # First get a listing ID
        response = requests.get(f"{BASE_URL}/api/listings?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["listings"]) > 0:
            listing_id = data["listings"][0]["id"]
            
            # Now get that specific listing
            detail_response = requests.get(f"{BASE_URL}/api/listings/{listing_id}")
            assert detail_response.status_code == 200, f"Get single listing failed: {detail_response.status_code}"
            
            detail_data = detail_response.json()
            assert detail_data["id"] == listing_id, "Returned listing ID doesn't match"
            print(f"Single listing PASSED: {detail_data['title']}")
        else:
            print("No listings to test - skipping single listing test")


class TestCategoriesAPI:
    """Categories endpoint tests"""
    
    def test_get_categories(self):
        """Test GET /api/categories returns categories array"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Get categories failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Categories response is not an array"
        assert len(data) > 0, "No categories returned"
        print(f"Get categories PASSED: Found {len(data)} categories")
    
    def test_category_structure(self):
        """Test category data has required fields"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            category = data[0]
            required_fields = ["id", "name"]
            for field in required_fields:
                assert field in category, f"Category missing required field: {field}"
            print(f"Category structure PASSED: {category}")


class TestSearchAPI:
    """Search endpoint tests"""
    
    def test_search_endpoint(self):
        """Test GET /api/listings/search works"""
        response = requests.get(f"{BASE_URL}/api/listings?q=car")
        assert response.status_code == 200, f"Search failed: {response.status_code}"
        
        data = response.json()
        assert "listings" in data, "Search response missing 'listings' field"
        print(f"Search PASSED: Found {len(data['listings'])} results for 'car'")
    
    def test_search_by_category(self):
        """Test search filtered by category"""
        response = requests.get(f"{BASE_URL}/api/listings?category=electronics")
        assert response.status_code == 200, f"Category search failed: {response.status_code}"
        
        data = response.json()
        print(f"Category search PASSED: Found {len(data['listings'])} electronics listings")


class TestFeatureSettings:
    """Feature settings endpoint tests"""
    
    def test_feature_settings(self):
        """Test GET /api/feature-settings returns settings"""
        response = requests.get(f"{BASE_URL}/api/feature-settings")
        assert response.status_code == 200, f"Feature settings failed: {response.status_code}"
        
        data = response.json()
        assert "show_view_count" in data or "location_mode" in data, "Missing expected settings"
        print(f"Feature settings PASSED: {list(data.keys())}")


class TestAdminUI:
    """Admin UI access tests"""
    
    def test_admin_ui_accessible(self):
        """Test admin UI returns a response"""
        response = requests.get(f"{BASE_URL}/api/admin-ui", allow_redirects=True)
        # 200 or 307 (redirect) are both acceptable
        assert response.status_code in [200, 307], f"Admin UI not accessible: {response.status_code}"
        print(f"Admin UI PASSED: Status {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
