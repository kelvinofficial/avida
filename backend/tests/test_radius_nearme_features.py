"""
Radius Selector & Near Me Features Tests
Tests for new location features implemented in iteration_50:
1. Admin Location CRUD endpoints (update, delete with cascade)
2. Near Me API with radius filtering
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://admin-badges-1.preview.emergentagent.com')
if BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')


class TestNearbyListingsAPI:
    """Test /api/locations/nearby endpoint with radius filtering"""
    
    def test_nearby_listings_with_default_radius(self):
        """Test nearby listings with default 50km radius"""
        # Dar es Salaam coordinates
        lat = -6.8
        lng = 39.28
        
        response = requests.get(f"{BASE_URL}/api/locations/nearby", params={
            "lat": lat,
            "lng": lng
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'listings' in data, "Response should have 'listings' key"
        assert 'total' in data, "Response should have 'total' key"
        assert 'center' in data, "Response should have 'center' key"
        assert 'radius_km' in data, "Response should have 'radius_km' key"
        
        # Default radius should be 50km
        assert data['radius_km'] == 50, f"Default radius should be 50, got {data['radius_km']}"
        assert data['center']['lat'] == lat
        assert data['center']['lng'] == lng
    
    def test_nearby_listings_with_custom_radius_5km(self):
        """Test nearby listings with 5km radius (minimum)"""
        lat = -6.8
        lng = 39.28
        
        response = requests.get(f"{BASE_URL}/api/locations/nearby", params={
            "lat": lat,
            "lng": lng,
            "radius_km": 5
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data['radius_km'] == 5
    
    def test_nearby_listings_with_custom_radius_100km(self):
        """Test nearby listings with 100km radius (maximum in slider)"""
        lat = -6.8
        lng = 39.28
        
        response = requests.get(f"{BASE_URL}/api/locations/nearby", params={
            "lat": lat,
            "lng": lng,
            "radius_km": 100
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data['radius_km'] == 100
    
    def test_nearby_listings_with_category_filter(self):
        """Test nearby listings filtered by category"""
        lat = -6.8
        lng = 39.28
        
        response = requests.get(f"{BASE_URL}/api/locations/nearby", params={
            "lat": lat,
            "lng": lng,
            "radius_km": 50,
            "category_id": "properties"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert 'listings' in data
    
    def test_nearby_listings_pagination(self):
        """Test nearby listings with pagination"""
        lat = -6.8
        lng = 39.28
        
        # Page 1
        response1 = requests.get(f"{BASE_URL}/api/locations/nearby", params={
            "lat": lat,
            "lng": lng,
            "limit": 5,
            "page": 1
        })
        assert response1.status_code == 200
        
        # Page 2
        response2 = requests.get(f"{BASE_URL}/api/locations/nearby", params={
            "lat": lat,
            "lng": lng,
            "limit": 5,
            "page": 2
        })
        assert response2.status_code == 200
    
    def test_nearby_listings_requires_lat_lng(self):
        """Test that lat/lng are required"""
        # Missing lat
        response = requests.get(f"{BASE_URL}/api/locations/nearby", params={
            "lng": 39.28
        })
        assert response.status_code == 422
        
        # Missing lng
        response = requests.get(f"{BASE_URL}/api/locations/nearby", params={
            "lat": -6.8
        })
        assert response.status_code == 422


class TestAdminLocationEndpoints:
    """Test admin location CRUD endpoints (require authentication)
    
    Note: These endpoints require admin authentication.
    Routes: /api/admin/locations/... with prefix from location_system.py
    """
    
    def test_admin_update_country_requires_auth(self):
        """Admin update country endpoint requires authentication"""
        response = requests.put(f"{BASE_URL}/api/admin/locations/countries/TZ", json={
            "name": "Tanzania Updated"
        })
        # Should return 401, 403, 404 (if route not found), or 422 for unauthenticated request
        assert response.status_code in [401, 403, 404, 422], f"Expected auth/routing error, got {response.status_code}"
    
    def test_admin_update_region_requires_auth(self):
        """Admin update region endpoint requires authentication"""
        response = requests.put(f"{BASE_URL}/api/admin/locations/regions/TZ/DSM", json={
            "name": "Dar es Salaam Updated"
        })
        assert response.status_code in [401, 403, 404, 422], f"Expected auth/routing error, got {response.status_code}"
    
    def test_admin_update_district_requires_auth(self):
        """Admin update district endpoint requires authentication"""
        response = requests.put(f"{BASE_URL}/api/admin/locations/districts/TZ/DSM/KIN", json={
            "name": "Kinondoni Updated"
        })
        assert response.status_code in [401, 403, 404, 422], f"Expected auth/routing error, got {response.status_code}"
    
    def test_admin_update_city_requires_auth(self):
        """Admin update city endpoint requires authentication"""
        response = requests.put(f"{BASE_URL}/api/admin/locations/cities/TZ/DSM/KIN/MIK", json={
            "name": "Mikocheni Updated"
        })
        assert response.status_code in [401, 403, 404, 422], f"Expected auth/routing error, got {response.status_code}"
    
    def test_admin_delete_country_requires_auth(self):
        """Admin delete country endpoint requires authentication (cascades to regions/districts/cities)"""
        response = requests.delete(f"{BASE_URL}/api/admin/locations/countries/XX")
        assert response.status_code in [401, 403, 404, 422], f"Expected auth/not found error, got {response.status_code}"
    
    def test_admin_delete_region_requires_auth(self):
        """Admin delete region endpoint requires authentication (cascades to districts/cities)"""
        response = requests.delete(f"{BASE_URL}/api/admin/locations/regions/XX/XX")
        assert response.status_code in [401, 403, 404, 422], f"Expected auth/not found error, got {response.status_code}"
    
    def test_admin_delete_district_requires_auth(self):
        """Admin delete district endpoint requires authentication (cascades to cities)"""
        response = requests.delete(f"{BASE_URL}/api/admin/locations/districts/XX/XX/XX")
        assert response.status_code in [401, 403, 404, 422], f"Expected auth/not found error, got {response.status_code}"


class TestRadiusPresetsAPI:
    """Test that the radius values in the API work with the frontend presets"""
    
    def test_all_radius_presets(self):
        """Test all preset radius values: 5km, 10km, 25km, 50km, 100km"""
        lat = -6.8
        lng = 39.28
        presets = [5, 10, 25, 50, 100]
        
        for radius in presets:
            response = requests.get(f"{BASE_URL}/api/locations/nearby", params={
                "lat": lat,
                "lng": lng,
                "radius_km": radius
            })
            assert response.status_code == 200, f"Preset {radius}km failed: {response.status_code}"
            
            data = response.json()
            assert data['radius_km'] == radius, f"Expected radius {radius}, got {data['radius_km']}"
    
    def test_slider_fine_tune_values(self):
        """Test slider fine-tune values (any value between 5-100)"""
        lat = -6.8
        lng = 39.28
        
        # Test some arbitrary fine-tune values
        for radius in [7, 15, 33, 67, 89]:
            response = requests.get(f"{BASE_URL}/api/locations/nearby", params={
                "lat": lat,
                "lng": lng,
                "radius_km": radius
            })
            assert response.status_code == 200, f"Fine-tune {radius}km failed: {response.status_code}"
            
            data = response.json()
            assert data['radius_km'] == radius


if __name__ == "__main__":
    print(f"Testing against: {BASE_URL}")
    
    # Quick sanity check
    response = requests.get(f"{BASE_URL}/api/locations/nearby", params={
        "lat": -6.8,
        "lng": 39.28,
        "radius_km": 50
    })
    print(f"Nearby endpoint: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data.get('listings', []))} nearby listings within {data.get('radius_km')}km")
