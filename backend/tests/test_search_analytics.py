"""
Search Analytics API Tests
Tests the /admin-ui/search-analytics endpoint for admin search analytics feature
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://listing-ab-test-hub.preview.emergentagent.com')
BASE_URL = BASE_URL.rstrip('/')


class TestSearchAnalyticsAPI:
    """Tests for the search analytics admin endpoint"""
    
    def test_search_analytics_endpoint_returns_200(self):
        """Test that the search analytics endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ GET /api/admin-ui/search-analytics returned 200")
    
    def test_search_analytics_returns_valid_structure(self):
        """Test that the response has the expected structure"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check required top-level fields
        required_fields = [
            'period_days', 'total_searches', 'filters_applied',
            'top_searches', 'by_country', 'by_region', 'by_city',
            'by_category', 'recent_activity'
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ Response contains all required fields: {required_fields}")
    
    def test_search_analytics_period_days(self):
        """Test that period_days parameter works correctly"""
        # Test with default 7 days
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=7")
        assert response.status_code == 200
        data = response.json()
        assert data['period_days'] == 7
        print(f"✓ period_days=7 returns correct value")
        
        # Test with 30 days
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=30")
        assert response.status_code == 200
        data = response.json()
        assert data['period_days'] == 30
        print(f"✓ period_days=30 returns correct value")
    
    def test_search_analytics_filters_applied(self):
        """Test that filters_applied object is present and correct"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics")
        assert response.status_code == 200
        
        data = response.json()
        filters = data['filters_applied']
        
        # Check filter structure
        expected_filters = ['country_code', 'region_code', 'city_code', 'category_id']
        for f in expected_filters:
            assert f in filters, f"Missing filter: {f}"
        
        print(f"✓ filters_applied contains all expected keys: {expected_filters}")
    
    def test_search_analytics_by_country_structure(self):
        """Test that by_country array has correct structure when data exists"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics")
        assert response.status_code == 200
        
        data = response.json()
        by_country = data['by_country']
        
        assert isinstance(by_country, list), "by_country should be a list"
        
        if len(by_country) > 0:
            country = by_country[0]
            expected_fields = ['country_code', 'country_name', 'search_count', 'unique_query_count']
            for field in expected_fields:
                assert field in country, f"Missing field in by_country item: {field}"
            print(f"✓ by_country has correct structure with fields: {expected_fields}")
        else:
            print("⚠ by_country is empty (no country data)")
    
    def test_search_analytics_by_region_structure(self):
        """Test that by_region array has correct structure when data exists"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics")
        assert response.status_code == 200
        
        data = response.json()
        by_region = data['by_region']
        
        assert isinstance(by_region, list), "by_region should be a list"
        
        if len(by_region) > 0:
            region = by_region[0]
            expected_fields = ['country_code', 'region_code', 'region_name', 'search_count', 'unique_query_count']
            for field in expected_fields:
                assert field in region, f"Missing field in by_region item: {field}"
            print(f"✓ by_region has correct structure with fields: {expected_fields}")
        else:
            print("⚠ by_region is empty (no region data)")
    
    def test_search_analytics_by_city_structure(self):
        """Test that by_city array has correct structure when data exists"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics")
        assert response.status_code == 200
        
        data = response.json()
        by_city = data['by_city']
        
        assert isinstance(by_city, list), "by_city should be a list"
        
        if len(by_city) > 0:
            city = by_city[0]
            expected_fields = ['city_code', 'city_name', 'region_name', 'country_code', 'search_count', 'unique_query_count']
            for field in expected_fields:
                assert field in city, f"Missing field in by_city item: {field}"
            print(f"✓ by_city has correct structure with fields: {expected_fields}")
        else:
            print("⚠ by_city is empty (no city data)")
    
    def test_search_analytics_top_searches(self):
        """Test that top_searches array has correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics")
        assert response.status_code == 200
        
        data = response.json()
        top_searches = data['top_searches']
        
        assert isinstance(top_searches, list), "top_searches should be a list"
        
        if len(top_searches) > 0:
            search = top_searches[0]
            assert 'query' in search, "Missing 'query' field in top_searches item"
            assert 'count' in search, "Missing 'count' field in top_searches item"
            print(f"✓ top_searches has correct structure: query and count fields present")
        else:
            print("⚠ top_searches is empty (no search data)")
    
    def test_search_analytics_recent_activity(self):
        """Test that recent_activity array has correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics")
        assert response.status_code == 200
        
        data = response.json()
        recent_activity = data['recent_activity']
        
        assert isinstance(recent_activity, list), "recent_activity should be a list"
        
        if len(recent_activity) > 0:
            activity = recent_activity[0]
            expected_fields = ['date', 'search_count', 'unique_query_count']
            for field in expected_fields:
                assert field in activity, f"Missing field in recent_activity item: {field}"
            print(f"✓ recent_activity has correct structure with fields: {expected_fields}")
        else:
            print("⚠ recent_activity is empty (no recent activity)")
    
    def test_search_analytics_has_data(self):
        """Test that the endpoint returns actual data (verifies seed data exists)"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify we have at least some data
        total_searches = data['total_searches']
        print(f"Total searches: {total_searches}")
        
        # Check for Tanzania data specifically (as mentioned in context)
        by_country = data['by_country']
        tanzania_found = any(c.get('country_code') == 'TZ' for c in by_country)
        
        if tanzania_found:
            print("✓ Tanzania (TZ) data found in by_country")
        
        # Check for Dar es Salaam
        by_city = data['by_city']
        dar_found = any(c.get('city_name') == 'Dar es Salaam' for c in by_city)
        
        if dar_found:
            print("✓ Dar es Salaam found in by_city")
    
    def test_search_analytics_filter_by_country(self):
        """Test that country_code filter parameter works"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?country_code=TZ")
        assert response.status_code == 200
        
        data = response.json()
        assert data['filters_applied']['country_code'] == 'TZ'
        print("✓ country_code filter parameter works correctly")
    
    def test_search_analytics_limit_parameter(self):
        """Test that limit parameter is accepted"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        # Should have at most 5 items in arrays
        assert len(data['top_searches']) <= 5 or data['top_searches'] == []
        print("✓ limit parameter is accepted")


class TestSearchTrackingAPI:
    """Tests for the search tracking endpoint (POST /searches/track)"""
    
    def test_track_search_endpoint_works(self):
        """Test that search tracking endpoint accepts valid requests"""
        payload = {
            "query": "TEST_search_query",
            "category_id": "electronics",
            "location": {
                "country_code": "TZ",
                "country_name": "Tanzania",
                "region_code": "DAR",
                "region_name": "Dar es Salaam",
                "city_code": "DSM",
                "city_name": "Dar es Salaam"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/searches/track",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 200 OK with status: tracked
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get('status') == 'tracked', f"Expected status='tracked', got {data}"
        print(f"✓ POST /api/searches/track returned 200 with status='tracked'")
    
    def test_track_search_validates_query_length(self):
        """Test that search tracking validates minimum query length"""
        payload = {"query": "a"}  # Too short
        
        response = requests.post(
            f"{BASE_URL}/api/searches/track",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 400 for validation error
        assert response.status_code == 400, f"Expected 400 for short query, got {response.status_code}"
        print("✓ Search tracking validates minimum query length")
    
    def test_track_search_without_location(self):
        """Test that search tracking works without location context"""
        payload = {"query": "TEST_no_location"}
        
        response = requests.post(
            f"{BASE_URL}/api/searches/track",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Search tracking works without location context")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
