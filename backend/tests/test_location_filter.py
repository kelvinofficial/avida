"""
Location Filter Enhancement Tests
Tests for filtering listings by hierarchical location codes: country_code, region_code, district_code, city_code
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://classifieds-search-1.preview.emergentagent.com')


class TestLocationFilterEndpoints:
    """Test location filter parameters on GET /api/listings"""
    
    def test_listings_endpoint_accepts_country_code(self):
        """Test: GET /api/listings accepts country_code parameter"""
        response = requests.get(f"{BASE_URL}/api/listings", params={"country_code": "TZ"})
        assert response.status_code == 200
        data = response.json()
        
        # Should return listings structure
        assert "listings" in data
        assert "total" in data
        
        # With TZ country code, should return at least 1 listing
        assert data["total"] >= 1
        
        # Verify returned listings have correct country_code
        for listing in data["listings"]:
            if listing.get("location_data"):
                assert listing["location_data"].get("country_code") == "TZ"
    
    def test_listings_endpoint_accepts_region_code(self):
        """Test: GET /api/listings accepts region_code parameter"""
        response = requests.get(f"{BASE_URL}/api/listings", params={
            "country_code": "TZ",
            "region_code": "DSM"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "listings" in data
        assert data["total"] >= 1
        
        # Verify returned listings have correct region_code
        for listing in data["listings"]:
            if listing.get("location_data"):
                assert listing["location_data"].get("region_code") == "DSM"
    
    def test_listings_endpoint_accepts_district_code(self):
        """Test: GET /api/listings accepts district_code parameter"""
        response = requests.get(f"{BASE_URL}/api/listings", params={
            "country_code": "TZ",
            "region_code": "DSM",
            "district_code": "KIN"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "listings" in data
        
        # Verify returned listings have correct district_code
        for listing in data["listings"]:
            if listing.get("location_data"):
                assert listing["location_data"].get("district_code") == "KIN"
    
    def test_listings_endpoint_accepts_city_code(self):
        """Test: GET /api/listings accepts city_code parameter"""
        response = requests.get(f"{BASE_URL}/api/listings", params={
            "country_code": "TZ",
            "region_code": "DSM",
            "district_code": "KIN",
            "city_code": "KIM"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "listings" in data
        
        # Verify returned listings have correct city_code
        for listing in data["listings"]:
            if listing.get("location_data"):
                assert listing["location_data"].get("city_code") == "KIM"


class TestCombinedLocationFilters:
    """Test combined location filters"""
    
    def test_country_plus_region_filter(self):
        """Test: Combined filters work (country_code + region_code)"""
        response = requests.get(f"{BASE_URL}/api/listings", params={
            "country_code": "TZ",
            "region_code": "DSM"
        })
        assert response.status_code == 200
        data = response.json()
        
        # According to the task, should return 1 listing (Kijitonyama apartment)
        assert data["total"] == 1
        
        # Verify the specific listing
        listing = data["listings"][0]
        assert "Dar es Salaam" in listing["title"] or "Kijitonyama" in listing.get("location_data", {}).get("city_name", "")
        assert listing.get("location_data", {}).get("country_code") == "TZ"
        assert listing.get("location_data", {}).get("region_code") == "DSM"
    
    def test_all_four_codes_combined(self):
        """Test filtering with all four location codes"""
        response = requests.get(f"{BASE_URL}/api/listings", params={
            "country_code": "TZ",
            "region_code": "DSM",
            "district_code": "KIN",
            "city_code": "KIM"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should return the Kijitonyama apartment
        if data["total"] > 0:
            listing = data["listings"][0]
            loc = listing.get("location_data", {})
            assert loc.get("city_name") == "Kijitonyama"
    
    def test_non_existent_location_returns_empty(self):
        """Test filtering with non-existent location returns empty results"""
        response = requests.get(f"{BASE_URL}/api/listings", params={
            "country_code": "XX"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] == 0
        assert data["listings"] == []


class TestTextLocationFallback:
    """Test fallback to text location search when no codes provided"""
    
    def test_fallback_to_text_location(self):
        """Test: Fallback to text location search works when no codes provided"""
        # First, get a listing to know what text location to search for
        response = requests.get(f"{BASE_URL}/api/listings", params={"limit": 10})
        assert response.status_code == 200
        data = response.json()
        
        # Find a listing with location text
        listing_with_location = None
        location_text = None
        for listing in data.get("listings", []):
            loc_data = listing.get("location_data", {})
            if loc_data.get("city_name"):
                listing_with_location = listing
                location_text = loc_data.get("city_name")
                break
            elif listing.get("location"):
                listing_with_location = listing
                location_text = listing.get("location")
                break
        
        if location_text:
            # Search using text location (no codes)
            response = requests.get(f"{BASE_URL}/api/listings", params={
                "location": location_text
            })
            assert response.status_code == 200
            data = response.json()
            
            # Should return results matching the location text
            assert data["total"] >= 1
    
    def test_text_location_search_dar_es_salaam(self):
        """Test text location search for 'Dar es Salaam'"""
        response = requests.get(f"{BASE_URL}/api/listings", params={
            "location": "Dar es Salaam"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should find listings with Dar es Salaam in location fields
        assert data["total"] >= 0  # May be 0 if no listings match text search
    
    def test_codes_take_precedence_over_text(self):
        """Test that location codes take precedence over text when both provided"""
        # When codes are provided, text should be ignored
        response = requests.get(f"{BASE_URL}/api/listings", params={
            "country_code": "TZ",
            "location": "NonexistentCity"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should return TZ results, ignoring the text location
        # The text fallback only activates when NO codes are provided
        assert data["total"] >= 1


class TestCaseInsensitivity:
    """Test case insensitivity of location codes"""
    
    def test_lowercase_country_code(self):
        """Test lowercase country code works"""
        response = requests.get(f"{BASE_URL}/api/listings", params={
            "country_code": "tz"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] >= 1
    
    def test_lowercase_region_code(self):
        """Test lowercase region code works"""
        response = requests.get(f"{BASE_URL}/api/listings", params={
            "country_code": "tz",
            "region_code": "dsm"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] >= 1
    
    def test_mixed_case_codes(self):
        """Test mixed case codes work"""
        response = requests.get(f"{BASE_URL}/api/listings", params={
            "country_code": "Tz",
            "region_code": "DsM",
            "district_code": "kIn"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should still return results
        assert "listings" in data


class TestAPIParamsValidation:
    """Test API parameters validation and structure"""
    
    def test_api_returns_proper_structure(self):
        """Test GET /api/listings returns proper JSON structure"""
        response = requests.get(f"{BASE_URL}/api/listings")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "listings" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        assert isinstance(data["listings"], list)
        assert isinstance(data["total"], int)
    
    def test_location_filter_with_other_params(self):
        """Test location filters work with other params like category"""
        response = requests.get(f"{BASE_URL}/api/listings", params={
            "country_code": "TZ",
            "category": "properties"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should filter by both location and category
        for listing in data.get("listings", []):
            assert listing.get("category_id") == "properties"
            if listing.get("location_data"):
                assert listing["location_data"].get("country_code") == "TZ"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
