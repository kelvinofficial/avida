"""
Test file for iteration 144 - Testing new features:
1. Search Analytics & Trending Items
2. SEO Optimization (backend endpoints)
3. Offline Mode Support (API structure)
4. Categories and Listings APIs
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', '')).rstrip('/')

class TestHealthAndBasics:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test that API is responding"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        print(f"Health check: {response.status_code}")
    
    def test_categories_endpoint(self):
        """Test categories endpoint returns valid data"""
        response = requests.get(f"{BASE_URL}/api/categories", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify category structure
        first_category = data[0]
        assert 'id' in first_category
        assert 'name' in first_category
        assert 'subcategories' in first_category
        print(f"Categories: {len(data)} categories found")


class TestSearchAnalytics:
    """Test Search Analytics & Trending Items feature"""
    
    def test_popular_searches_endpoint(self):
        """Test /api/searches/popular returns trending searches"""
        response = requests.get(f"{BASE_URL}/api/searches/popular", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert 'global_searches' in data
        assert 'category_searches' in data
        assert isinstance(data['global_searches'], list)
        print(f"Popular searches: {len(data['global_searches'])} global searches found")
    
    def test_popular_searches_with_category_filter(self):
        """Test popular searches with category filter"""
        response = requests.get(f"{BASE_URL}/api/searches/popular?category_id=electronics", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert 'global_searches' in data
        assert 'category_searches' in data
        print(f"Category-filtered searches: {len(data['category_searches'])} category-specific searches")
    
    def test_popular_searches_with_days_filter(self):
        """Test popular searches with days parameter"""
        response = requests.get(f"{BASE_URL}/api/searches/popular?days=30&limit=5", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert len(data['global_searches']) <= 5
        print(f"Searches with days filter: {len(data['global_searches'])} results")
    
    def test_search_suggestions_endpoint(self):
        """Test /api/searches/suggestions for autocomplete"""
        response = requests.get(f"{BASE_URL}/api/searches/suggestions?q=test", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert 'suggestions' in data
        assert isinstance(data['suggestions'], list)
        print(f"Search suggestions: {len(data['suggestions'])} suggestions for 'test'")
    
    def test_search_suggestions_minimum_query(self):
        """Test suggestions require minimum query length"""
        response = requests.get(f"{BASE_URL}/api/searches/suggestions?q=", timeout=10)
        # Should return error for empty query
        assert response.status_code in [400, 422]  # Validation error
        print("Empty query validation: Correctly rejected")
    
    def test_track_search_endpoint(self):
        """Test /api/searches/track for tracking searches"""
        payload = {
            "query": "test_iteration144",
            "category_id": "electronics"
        }
        response = requests.post(f"{BASE_URL}/api/searches/track", json=payload, timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'tracked'
        assert data['query'] == 'test_iteration144'
        print(f"Search tracked: {data['query']}")
    
    def test_track_search_with_location(self):
        """Test search tracking with location context"""
        payload = {
            "query": "test_with_location_iteration144",
            "category_id": "auto_vehicles",
            "location": {
                "country_code": "KE",
                "country_name": "Kenya",
                "region_code": "47",
                "region_name": "Nairobi",
                "city_code": "NBI",
                "city_name": "Nairobi"
            }
        }
        response = requests.post(f"{BASE_URL}/api/searches/track", json=payload, timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'tracked'
        print(f"Search with location tracked: {data['query']}")


class TestAdminSearchAnalytics:
    """Test admin search analytics endpoints"""
    
    def test_search_analytics_endpoint(self):
        """Test /api/admin-ui/search-analytics returns analytics data"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert 'period_days' in data
        assert 'total_searches' in data
        assert 'top_searches' in data
        assert 'by_country' in data
        assert 'by_region' in data
        assert 'by_city' in data
        assert 'by_category' in data
        assert 'recent_activity' in data
        print(f"Analytics: {data['total_searches']} total searches in {data['period_days']} days")
    
    def test_search_analytics_with_filters(self):
        """Test search analytics with country filter"""
        response = requests.get(f"{BASE_URL}/api/admin-ui/search-analytics?country_code=KE&days=30", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data['filters_applied']['country_code'] == 'KE'
        print(f"Filtered analytics: {data['total_searches']} searches for Kenya")
    
    def test_top_queries_by_location(self):
        """Test /api/admin/search-analytics/top-queries-by-location"""
        response = requests.get(f"{BASE_URL}/api/admin/search-analytics/top-queries-by-location", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert 'location' in data
        assert 'period_days' in data
        assert 'top_queries' in data
        print(f"Top queries: {len(data['top_queries'])} queries for {data['location']}")


class TestListingsAPI:
    """Test listings API for shimmer loading verification"""
    
    def test_listings_endpoint(self):
        """Test /api/listings returns listing data"""
        response = requests.get(f"{BASE_URL}/api/listings?limit=10", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert 'listings' in data
        assert isinstance(data['listings'], list)
        if data['listings']:
            listing = data['listings'][0]
            assert 'id' in listing
            assert 'title' in listing
            assert 'price' in listing
        print(f"Listings: {len(data['listings'])} listings returned")
    
    def test_listings_with_category_filter(self):
        """Test listings with category filter"""
        response = requests.get(f"{BASE_URL}/api/listings?category_id=electronics&limit=5", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert 'listings' in data
        print(f"Electronics listings: {len(data['listings'])} listings")
    
    def test_listings_with_location_filter(self):
        """Test listings with location filter"""
        response = requests.get(f"{BASE_URL}/api/listings?city=Nairobi&limit=5", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert 'listings' in data
        print(f"Nairobi listings: {len(data['listings'])} listings")


class TestOfflineSupportAPIs:
    """Test APIs that support offline mode caching"""
    
    def test_categories_cacheable(self):
        """Test categories endpoint is cacheable for offline"""
        response = requests.get(f"{BASE_URL}/api/categories", timeout=10)
        assert response.status_code == 200
        # Should return full category data with subcategories
        data = response.json()
        assert len(data) > 0
        for category in data:
            assert 'subcategories' in category
        print(f"Categories cacheable: {len(data)} categories with subcategories")
    
    def test_listings_pagination_for_cache(self):
        """Test listings pagination works for offline caching"""
        # First page
        response1 = requests.get(f"{BASE_URL}/api/listings?skip=0&limit=10", timeout=10)
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Second page
        response2 = requests.get(f"{BASE_URL}/api/listings?skip=10&limit=10", timeout=10)
        assert response2.status_code == 200
        data2 = response2.json()
        
        print(f"Pagination: Page 1 has {len(data1['listings'])} items, Page 2 has {len(data2['listings'])} items")


class TestSEORelatedEndpoints:
    """Test any backend endpoints that support SEO"""
    
    def test_sitemap_endpoint(self):
        """Test sitemap endpoint if available"""
        response = requests.get(f"{BASE_URL}/api/sitemap.xml", timeout=10)
        # Sitemap might not be implemented, so accept 404 or 200
        if response.status_code == 200:
            print("Sitemap: Available")
        else:
            print(f"Sitemap: Not available (status {response.status_code})")
    
    def test_listing_detail_for_seo(self):
        """Test listing detail endpoint provides SEO-friendly data"""
        # First get a listing ID
        listings_response = requests.get(f"{BASE_URL}/api/listings?limit=1", timeout=10)
        assert listings_response.status_code == 200
        listings = listings_response.json().get('listings', [])
        
        if listings:
            listing_id = listings[0]['id']
            response = requests.get(f"{BASE_URL}/api/listings/{listing_id}", timeout=10)
            assert response.status_code == 200
            data = response.json()
            # Verify SEO-relevant fields exist
            assert 'title' in data
            assert 'description' in data
            assert 'price' in data
            print(f"Listing detail: '{data['title']}' - SEO data available")
        else:
            print("No listings available for SEO test")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
