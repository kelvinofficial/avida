"""
Test Backend APIs for Feature Settings and Listings
Iteration 150 - Testing features to fix from the main agent
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://marketplace-hub-264.preview.emergentagent.com')

class TestFeatureSettings:
    """Tests for Feature Settings API"""
    
    def test_get_feature_settings_returns_defaults(self):
        """Test GET /api/feature-settings returns correct default values"""
        response = requests.get(f"{BASE_URL}/api/feature-settings")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields are present
        expected_fields = [
            "show_view_count",
            "show_save_count",
            "show_listing_stats",
            "show_seller_stats",
            "show_distance",
            "show_time_ago",
            "show_negotiable_badge",
            "show_featured_badge",
            "location_mode",
            "default_country",
            "allow_country_change"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify Tanzania-only location settings
        assert data["default_country"] == "TZ", "Default country should be Tanzania (TZ)"
        assert data["allow_country_change"] == False, "Country change should be disabled"
        
    def test_location_mode_is_region(self):
        """Test that location_mode is set to 'region'"""
        response = requests.get(f"{BASE_URL}/api/feature-settings")
        assert response.status_code == 200
        data = response.json()
        assert data["location_mode"] == "region", "Location mode should be 'region'"


class TestListingsAPI:
    """Tests for Listings API"""
    
    def test_get_listings_with_images(self):
        """Test GET /api/listings returns listings with images"""
        response = requests.get(f"{BASE_URL}/api/listings?limit=5")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check that listings key exists
        assert "listings" in data
        
        listings = data["listings"]
        if len(listings) > 0:
            # Check at least one listing has images
            listings_with_images = [l for l in listings if l.get("images") and len(l["images"]) > 0]
            print(f"Found {len(listings_with_images)} listings with images out of {len(listings)}")
            
    def test_listings_structure(self):
        """Test listings have correct structure"""
        response = requests.get(f"{BASE_URL}/api/listings?limit=1")
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("listings") and len(data["listings"]) > 0:
            listing = data["listings"][0]
            
            # Check essential fields
            assert "id" in listing
            assert "title" in listing
            assert "price" in listing


class TestCategoriesAPI:
    """Tests for Categories API"""
    
    def test_get_categories(self):
        """Test GET /api/categories returns categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response is a list or has categories key
        categories = data if isinstance(data, list) else data.get("categories", [])
        
        print(f"Found {len(categories)} categories")
        
        # Check that auto_vehicles exists
        category_ids = [c.get("id") or c.get("category_id") for c in categories]
        print(f"Category IDs: {category_ids[:5]}...")


class TestHealthCheck:
    """Health check tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"


class TestLocationsAPI:
    """Tests for Locations API"""
    
    def test_get_regions_for_tanzania(self):
        """Test GET /api/locations/regions returns Tanzania regions"""
        response = requests.get(f"{BASE_URL}/api/locations/regions?country_code=TZ")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check we get regions data
        regions = data if isinstance(data, list) else data.get("regions", [])
        print(f"Found {len(regions)} regions for Tanzania")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
