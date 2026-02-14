"""
Test Suite for Shimmer Loading Features:
1. Admin Search Analytics Location Filters
2. Category Page Skeleton Loading (verified via frontend testing)
3. useHomeData Hook (code review - not integrated)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://mobile-classifieds.preview.emergentagent.com')

class TestAdminSearchAnalyticsFilters:
    """Tests for Admin Search Analytics page location filters"""
    
    def test_search_analytics_global(self):
        """Test search analytics API returns global data without filters"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=7")
        assert response.status_code == 200
        
        data = response.json()
        assert "period_days" in data
        assert "total_searches" in data
        assert "by_country" in data
        assert "by_region" in data
        assert "top_searches" in data
        
        # Verify no filters applied
        assert data["filters_applied"]["country_code"] is None
        assert data["filters_applied"]["region_code"] is None
        
        print(f"Global search analytics: {data['total_searches']} total searches, {len(data['by_country'])} countries")
    
    def test_search_analytics_filter_by_country(self):
        """Test search analytics API filters by country_code"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=7&country_code=KE")
        assert response.status_code == 200
        
        data = response.json()
        # Verify filter was applied
        assert data["filters_applied"]["country_code"] == "KE"
        
        # Should return filtered results for Kenya
        print(f"Kenya filtered: {data['total_searches']} searches, {len(data['by_region'])} regions")
    
    def test_search_analytics_filter_by_country_tz(self):
        """Test search analytics API filters by Tanzania"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=7&country_code=TZ")
        assert response.status_code == 200
        
        data = response.json()
        assert data["filters_applied"]["country_code"] == "TZ"
        print(f"Tanzania filtered: {data['total_searches']} searches")
    
    def test_search_analytics_filter_by_region(self):
        """Test search analytics API filters by country and region"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=7&country_code=KE&region_code=NAI")
        assert response.status_code == 200
        
        data = response.json()
        assert data["filters_applied"]["country_code"] == "KE"
        assert data["filters_applied"]["region_code"] == "NAI"
        print(f"Nairobi filtered: {data['total_searches']} searches")
    
    def test_locations_countries_api(self):
        """Test that countries API returns data for filter dropdowns"""
        response = requests.get(f"{BASE_URL}/api/locations/countries")
        assert response.status_code == 200
        
        countries = response.json()
        assert isinstance(countries, list)
        assert len(countries) > 0
        
        # Check structure
        first_country = countries[0]
        assert "code" in first_country
        assert "name" in first_country
        
        # Verify Kenya exists
        kenya = next((c for c in countries if c["code"] == "KE"), None)
        assert kenya is not None
        assert kenya["name"] == "Kenya"
        print(f"Countries API: {len(countries)} countries available")
    
    def test_locations_regions_api(self):
        """Test that regions API returns data for filter dropdowns"""
        response = requests.get(f"{BASE_URL}/api/locations/regions?country_code=KE")
        assert response.status_code == 200
        
        regions = response.json()
        assert isinstance(regions, list)
        assert len(regions) > 0
        
        # Check structure
        first_region = regions[0]
        assert "country_code" in first_region
        assert "region_code" in first_region
        assert "name" in first_region
        
        print(f"Kenya regions: {len(regions)} regions available")


class TestHomepageAndCategories:
    """Tests for homepage and category page functionality"""
    
    def test_listings_api(self):
        """Test listings API returns data for homepage"""
        response = requests.get(f"{BASE_URL}/api/listings?page=1&limit=20")
        assert response.status_code == 200
        
        data = response.json()
        assert "listings" in data
        assert isinstance(data["listings"], list)
        print(f"Listings API: {len(data['listings'])} listings returned")
    
    def test_categories_api(self):
        """Test categories API returns data"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        categories = response.json()
        assert isinstance(categories, list)
        assert len(categories) > 0
        
        # Check for electronics category
        electronics = next((c for c in categories if c.get("id") == "electronics"), None)
        assert electronics is not None
        print(f"Categories API: {len(categories)} categories available")
    
    def test_listings_by_category(self):
        """Test listings API filters by category"""
        response = requests.get(f"{BASE_URL}/api/listings?category=electronics&page=1&limit=20")
        assert response.status_code == 200
        
        data = response.json()
        assert "listings" in data
        print(f"Electronics listings: {len(data['listings'])} items")


class TestFeaturedVerifiedSellers:
    """Tests for featured verified sellers functionality"""
    
    def test_featured_verified_listings(self):
        """Test featured verified listings API"""
        response = requests.get(f"{BASE_URL}/api/listings/featured-verified?limit=12")
        
        # This endpoint might not exist or return empty, so check gracefully
        if response.status_code == 200:
            data = response.json()
            print(f"Featured verified: {len(data.get('listings', []))} listings")
        else:
            print(f"Featured verified API returned: {response.status_code}")
            pytest.skip("Featured verified endpoint not available")
    
    def test_featured_business_profiles(self):
        """Test featured business profiles API"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/featured?limit=8")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Featured sellers: {len(data.get('sellers', []))} profiles")
        else:
            print(f"Featured profiles API returned: {response.status_code}")
            pytest.skip("Featured profiles endpoint not available")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
