"""
Boost System API Tests
Tests credit packages, boost pricing, and boost cost calculation
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://mono-to-modular-1.preview.emergentagent.com')


class TestBoostPackages:
    """Test credit packages endpoint - GET /api/boost/packages"""
    
    def test_get_packages_returns_list(self):
        """Verify packages endpoint returns a list of packages"""
        response = requests.get(f"{BASE_URL}/api/boost/packages")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3  # Should have at least 3 default packages
    
    def test_packages_have_required_fields(self):
        """Verify each package has required fields"""
        response = requests.get(f"{BASE_URL}/api/boost/packages")
        data = response.json()
        
        required_fields = ['id', 'name', 'price', 'credits', 'bonus_credits']
        
        for package in data:
            for field in required_fields:
                assert field in package, f"Package missing required field: {field}"
    
    def test_starter_pack_exists(self):
        """Verify starter pack exists with correct pricing"""
        response = requests.get(f"{BASE_URL}/api/boost/packages")
        data = response.json()
        
        starter_packs = [p for p in data if 'Starter' in p.get('name', '')]
        assert len(starter_packs) >= 1, "Starter Pack should exist"
        
        starter = starter_packs[0]
        assert starter['price'] == 5.0
        assert starter['credits'] == 50
    
    def test_popular_pack_has_bonus(self):
        """Verify popular pack has bonus credits"""
        response = requests.get(f"{BASE_URL}/api/boost/packages")
        data = response.json()
        
        popular_packs = [p for p in data if p.get('is_popular', False)]
        assert len(popular_packs) >= 1, "Should have at least one popular pack"
        
        popular = popular_packs[0]
        assert popular.get('bonus_credits', 0) > 0, "Popular pack should have bonus credits"


class TestBoostPricing:
    """Test boost pricing endpoint - GET /api/boost/pricing"""
    
    def test_get_pricing_returns_list(self):
        """Verify pricing endpoint returns a list of boost options"""
        response = requests.get(f"{BASE_URL}/api/boost/pricing")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 5  # Should have 5 boost types
    
    def test_pricing_has_required_fields(self):
        """Verify each pricing option has required fields"""
        response = requests.get(f"{BASE_URL}/api/boost/pricing")
        data = response.json()
        
        required_fields = ['boost_type', 'name', 'credits_per_hour', 'credits_per_day']
        
        for pricing in data:
            for field in required_fields:
                assert field in pricing, f"Pricing missing required field: {field}"
    
    def test_featured_boost_type_exists(self):
        """Verify featured boost type exists"""
        response = requests.get(f"{BASE_URL}/api/boost/pricing")
        data = response.json()
        
        featured = [p for p in data if p.get('boost_type') == 'featured']
        assert len(featured) == 1, "Should have exactly one featured boost type"
        assert featured[0]['credits_per_day'] == 10
    
    def test_homepage_boost_type_exists(self):
        """Verify homepage boost type exists"""
        response = requests.get(f"{BASE_URL}/api/boost/pricing")
        data = response.json()
        
        homepage = [p for p in data if p.get('boost_type') == 'homepage']
        assert len(homepage) == 1, "Should have exactly one homepage boost type"
        assert homepage[0]['credits_per_day'] == 25
    
    def test_urgent_boost_type_exists(self):
        """Verify urgent boost type exists"""
        response = requests.get(f"{BASE_URL}/api/boost/pricing")
        data = response.json()
        
        urgent = [p for p in data if p.get('boost_type') == 'urgent']
        assert len(urgent) == 1, "Should have exactly one urgent boost type"
    
    def test_location_boost_type_exists(self):
        """Verify location boost type exists"""
        response = requests.get(f"{BASE_URL}/api/boost/pricing")
        data = response.json()
        
        location = [p for p in data if p.get('boost_type') == 'location']
        assert len(location) == 1, "Should have exactly one location boost type"
    
    def test_category_boost_type_exists(self):
        """Verify category boost type exists"""
        response = requests.get(f"{BASE_URL}/api/boost/pricing")
        data = response.json()
        
        category = [p for p in data if p.get('boost_type') == 'category']
        assert len(category) == 1, "Should have exactly one category boost type"


class TestBoostCalculation:
    """Test boost cost calculation endpoint - GET /api/boost/calculate"""
    
    def test_calculate_featured_24h(self):
        """Calculate cost for 24 hours of featured placement"""
        response = requests.get(
            f"{BASE_URL}/api/boost/calculate",
            params={'boost_type': 'featured', 'duration_hours': 24}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['boost_type'] == 'featured'
        assert data['duration_hours'] == 24
        assert data['credit_cost'] == 10  # 1 day * 10 credits/day
    
    def test_calculate_featured_48h(self):
        """Calculate cost for 48 hours of featured placement"""
        response = requests.get(
            f"{BASE_URL}/api/boost/calculate",
            params={'boost_type': 'featured', 'duration_hours': 48}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['credit_cost'] == 20  # 2 days * 10 credits/day
    
    def test_calculate_homepage_24h(self):
        """Calculate cost for 24 hours of homepage spotlight"""
        response = requests.get(
            f"{BASE_URL}/api/boost/calculate",
            params={'boost_type': 'homepage', 'duration_hours': 24}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['boost_type'] == 'homepage'
        assert data['credit_cost'] == 25  # 1 day * 25 credits/day
    
    def test_calculate_with_partial_day(self):
        """Calculate cost with hours less than full day"""
        response = requests.get(
            f"{BASE_URL}/api/boost/calculate",
            params={'boost_type': 'featured', 'duration_hours': 6}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # 6 hours * 1 credit/hour = 6 credits
        assert data['credit_cost'] == 6
    
    def test_calculate_mixed_days_hours(self):
        """Calculate cost with days and remaining hours"""
        response = requests.get(
            f"{BASE_URL}/api/boost/calculate",
            params={'boost_type': 'featured', 'duration_hours': 30}  # 1 day + 6 hours
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # 1 day * 10 credits/day + 6 hours * 1 credit/hour = 16 credits
        assert data['credit_cost'] == 16
    
    def test_calculate_invalid_boost_type(self):
        """Test calculation with invalid boost type returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/boost/calculate",
            params={'boost_type': 'invalid_type', 'duration_hours': 24}
        )
        
        assert response.status_code == 404
    
    def test_calculate_missing_duration(self):
        """Test calculation without duration_hours parameter"""
        response = requests.get(
            f"{BASE_URL}/api/boost/calculate",
            params={'boost_type': 'featured'}
        )
        
        # Should return 422 (validation error) as duration_hours is required
        assert response.status_code == 422


class TestAuthenticatedBoostEndpoints:
    """Test endpoints that require authentication"""
    
    def test_credits_balance_requires_auth(self):
        """Verify credits balance endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/boost/credits/balance")
        
        # Should return 401 or 403 without authentication
        assert response.status_code in [401, 403]
    
    def test_credits_history_requires_auth(self):
        """Verify credits history endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/boost/credits/history")
        
        assert response.status_code in [401, 403]
    
    def test_purchase_credits_requires_auth(self):
        """Verify purchase credits endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/boost/credits/purchase",
            json={'package_id': 'pkg_starter', 'origin_url': 'https://test.com'}
        )
        
        assert response.status_code in [401, 403]
    
    def test_create_boost_requires_auth(self):
        """Verify create boost endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/boost/create",
            json={
                'listing_id': 'test_listing',
                'boost_type': 'featured',
                'duration_hours': 24
            }
        )
        
        assert response.status_code in [401, 403]
    
    def test_my_boosts_requires_auth(self):
        """Verify my boosts endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/boost/my-boosts")
        
        assert response.status_code in [401, 403]


class TestListingBoosts:
    """Test listing-specific boost endpoints (public)"""
    
    def test_get_listing_boosts_returns_list(self):
        """Get boosts for a specific listing - returns empty list for non-existent listing"""
        response = requests.get(f"{BASE_URL}/api/boost/listing/test_listing_id")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)  # Should return empty list, not 404


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
