"""
Test suite for Iteration 151 - Testing Location Picker, Mobile All Dropdown, and Feature Settings
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://classifieds-ui-fix.preview.emergentagent.com')

class TestFeatureSettingsAPI:
    """Test the /api/feature-settings endpoint"""
    
    def test_feature_settings_returns_data(self):
        """Test that feature settings API returns valid data"""
        response = requests.get(f"{BASE_URL}/api/feature-settings")
        assert response.status_code == 200
        data = response.json()
        assert "show_view_count" in data
        assert "show_time_ago" in data
        assert "show_featured_badge" in data
        assert "currency" in data
        assert "currency_symbol" in data
    
    def test_feature_settings_currency_tzs(self):
        """Test that currency is TZS with TSh symbol"""
        response = requests.get(f"{BASE_URL}/api/feature-settings")
        assert response.status_code == 200
        data = response.json()
        assert data["currency"] == "TZS"
        assert data["currency_symbol"] == "TSh"
        assert data["currency_position"] == "before"
    
    def test_feature_settings_location_mode(self):
        """Test location mode is set to region"""
        response = requests.get(f"{BASE_URL}/api/feature-settings")
        assert response.status_code == 200
        data = response.json()
        assert data["location_mode"] == "region"
        assert data["default_country"] == "TZ"
    
    def test_feature_settings_display_options(self):
        """Test display options are correct"""
        response = requests.get(f"{BASE_URL}/api/feature-settings")
        assert response.status_code == 200
        data = response.json()
        assert data["show_view_count"] == True
        assert data["show_time_ago"] == True
        assert data["show_featured_badge"] == True


class TestLocationRegionsAPI:
    """Test the /api/locations/regions endpoint for Tanzania"""
    
    def test_locations_regions_tanzania(self):
        """Test that Tanzania regions are returned"""
        response = requests.get(f"{BASE_URL}/api/locations/regions?country_code=TZ")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
    def test_locations_regions_contain_dar_es_salaam(self):
        """Test that Dar es Salaam is in the list"""
        response = requests.get(f"{BASE_URL}/api/locations/regions?country_code=TZ")
        assert response.status_code == 200
        data = response.json()
        region_names = [r.get("name") for r in data]
        assert "Dar es Salaam" in region_names
    
    def test_locations_regions_contain_arusha(self):
        """Test that Arusha is in the list"""
        response = requests.get(f"{BASE_URL}/api/locations/regions?country_code=TZ")
        assert response.status_code == 200
        data = response.json()
        region_names = [r.get("name") for r in data]
        assert "Arusha" in region_names
    
    def test_locations_regions_have_codes(self):
        """Test that regions have country and region codes"""
        response = requests.get(f"{BASE_URL}/api/locations/regions?country_code=TZ")
        assert response.status_code == 200
        data = response.json()
        for region in data:
            assert "country_code" in region
            assert "region_code" in region
            assert region["country_code"] == "TZ"


class TestListingsWithLocationFilter:
    """Test listings filtering by location"""
    
    def test_listings_api_works(self):
        """Test that listings API returns data"""
        response = requests.get(f"{BASE_URL}/api/listings")
        assert response.status_code == 200
        data = response.json()
        assert "listings" in data
        assert "total" in data
    
    def test_listings_filter_by_category(self):
        """Test filtering listings by category"""
        response = requests.get(f"{BASE_URL}/api/listings?category=electronics")
        assert response.status_code == 200
        data = response.json()
        assert "listings" in data


class TestHomepageAPI:
    """Test homepage related APIs"""
    
    def test_categories_api(self):
        """Test categories API"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_featured_sellers(self):
        """Test featured sellers API"""
        response = requests.get(f"{BASE_URL}/api/featured-sellers")
        assert response.status_code in [200, 404]  # May not have featured sellers


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
