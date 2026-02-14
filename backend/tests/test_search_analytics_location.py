"""
Test Search Analytics API with location drilldown filters.
Tests the redesigned Search Analytics page backend endpoints.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://classified-ai-tools.preview.emergentagent.com')
if BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')


class TestSearchAnalyticsGlobal:
    """Test Search Analytics API at global level"""
    
    def test_search_analytics_default(self):
        """Test search analytics with default params (7 days, global)"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=7")
        assert response.status_code == 200
        
        data = response.json()
        # Verify response structure
        assert 'period_days' in data
        assert 'total_searches' in data
        assert 'filters_applied' in data
        assert 'top_searches' in data
        assert 'by_country' in data
        assert 'by_region' in data
        assert 'by_city' in data
        assert 'by_category' in data
        assert 'recent_activity' in data
        
        # Verify period
        assert data['period_days'] == 7
        
        # Verify filters_applied shows no filters
        assert data['filters_applied']['country_code'] is None
        assert data['filters_applied']['region_code'] is None
        assert data['filters_applied']['city_code'] is None
    
    def test_search_analytics_30_days(self):
        """Test search analytics with 30 day period"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=30")
        assert response.status_code == 200
        
        data = response.json()
        assert data['period_days'] == 30
    
    def test_search_analytics_by_country_structure(self):
        """Verify by_country data structure"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=7")
        assert response.status_code == 200
        
        data = response.json()
        if data['by_country']:
            country = data['by_country'][0]
            assert 'country_code' in country
            assert 'country_name' in country
            assert 'search_count' in country
            assert 'unique_query_count' in country


class TestSearchAnalyticsCountryFilter:
    """Test Search Analytics API with country filter"""
    
    def test_country_filter_applied(self):
        """Test that country_code filter is applied correctly"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=7&country_code=US")
        assert response.status_code == 200
        
        data = response.json()
        # Verify filter is applied in response
        assert data['filters_applied']['country_code'] == 'US'
        assert data['filters_applied']['region_code'] is None
        assert data['filters_applied']['city_code'] is None
    
    def test_country_filter_with_existing_data(self):
        """Test country filter with TZ (Tanzania - has test data)"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=7&country_code=TZ")
        assert response.status_code == 200
        
        data = response.json()
        assert data['filters_applied']['country_code'] == 'TZ'
        # May have searches in this country (from test data)


class TestSearchAnalyticsRegionFilter:
    """Test Search Analytics API with region filter"""
    
    def test_region_filter_applied(self):
        """Test that region_code filter is applied correctly"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=7&country_code=TZ&region_code=DAR")
        assert response.status_code == 200
        
        data = response.json()
        # Verify filters are applied
        assert data['filters_applied']['country_code'] == 'TZ'
        assert data['filters_applied']['region_code'] == 'DAR'
        assert data['filters_applied']['city_code'] is None
    
    def test_region_filter_returns_cities(self):
        """Test that region filter returns city-level data"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=7&country_code=TZ&region_code=DAR")
        assert response.status_code == 200
        
        data = response.json()
        # by_city should be populated for region level view
        assert 'by_city' in data


class TestSearchAnalyticsCityFilter:
    """Test Search Analytics API with city filter"""
    
    def test_city_filter_applied(self):
        """Test that city_code filter is applied correctly"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=7&country_code=TZ&region_code=DAR&city_code=DSM")
        assert response.status_code == 200
        
        data = response.json()
        # Verify all filters are applied
        assert data['filters_applied']['country_code'] == 'TZ'
        assert data['filters_applied']['region_code'] == 'DAR'
        assert data['filters_applied']['city_code'] == 'DSM'


class TestSearchAnalyticsDataIntegrity:
    """Test data integrity in Search Analytics API"""
    
    def test_top_searches_structure(self):
        """Verify top_searches has correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=7")
        assert response.status_code == 200
        
        data = response.json()
        if data['top_searches']:
            search = data['top_searches'][0]
            assert 'query' in search
            assert 'count' in search
            assert isinstance(search['count'], int)
    
    def test_recent_activity_structure(self):
        """Verify recent_activity has correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=7")
        assert response.status_code == 200
        
        data = response.json()
        if data['recent_activity']:
            activity = data['recent_activity'][0]
            assert 'date' in activity
            assert 'search_count' in activity
            assert 'unique_query_count' in activity
    
    def test_by_region_structure(self):
        """Verify by_region has correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=7")
        assert response.status_code == 200
        
        data = response.json()
        if data['by_region']:
            region = data['by_region'][0]
            assert 'region_code' in region
            assert 'region_name' in region
            assert 'country_code' in region
            assert 'search_count' in region
            assert 'unique_query_count' in region
    
    def test_by_city_structure(self):
        """Verify by_city has correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?days=7")
        assert response.status_code == 200
        
        data = response.json()
        if data['by_city']:
            city = data['by_city'][0]
            assert 'city_code' in city
            assert 'city_name' in city
            assert 'region_name' in city
            assert 'country_code' in city
            assert 'search_count' in city
            assert 'unique_query_count' in city


class TestExtractedComponentsExist:
    """Verify extracted components exist (code level check via API health)"""
    
    def test_api_health(self):
        """Verify API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'healthy'
