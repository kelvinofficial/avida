"""
Location System API Tests
Tests hierarchical location endpoints for 13 countries seeded with location data.
Endpoints tested:
- GET /api/locations/countries - All countries
- GET /api/locations/regions - Regions by country
- GET /api/locations/districts - Districts by region
- GET /api/locations/cities - Cities by district
- GET /api/locations/cities/search - City search
- GET /api/locations/stats - Location statistics
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://listing-hub-15.preview.emergentagent.com')
if BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')


class TestLocationCountries:
    """Test /api/locations/countries endpoint"""
    
    def test_get_countries_returns_all_13_countries(self):
        """Verify all 13 seeded countries are returned"""
        response = requests.get(f"{BASE_URL}/api/locations/countries")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        countries = response.json()
        assert isinstance(countries, list), "Response should be a list"
        assert len(countries) == 13, f"Expected 13 countries, got {len(countries)}"
        
        # Verify expected countries exist
        country_codes = [c['code'] for c in countries]
        expected_codes = ['TZ', 'KE', 'UG', 'ZA', 'NG', 'GH', 'ZM', 'ZW', 'DE', 'US', 'NL', 'AU', 'CA']
        for code in expected_codes:
            assert code in country_codes, f"Missing country code: {code}"
    
    def test_countries_have_required_fields(self):
        """Verify country objects have required fields"""
        response = requests.get(f"{BASE_URL}/api/locations/countries")
        assert response.status_code == 200
        
        countries = response.json()
        for country in countries:
            assert 'code' in country, "Country missing 'code'"
            assert 'name' in country, "Country missing 'name'"
            assert isinstance(country['code'], str), "Code should be string"
            assert isinstance(country['name'], str), "Name should be string"


class TestLocationRegions:
    """Test /api/locations/regions endpoint"""
    
    def test_get_tanzania_regions(self):
        """Verify Tanzania regions are returned correctly"""
        response = requests.get(f"{BASE_URL}/api/locations/regions", params={"country_code": "TZ"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        regions = response.json()
        assert isinstance(regions, list), "Response should be a list"
        assert len(regions) >= 5, f"Expected at least 5 Tanzania regions, got {len(regions)}"
        
        # Verify region structure
        for region in regions:
            assert 'country_code' in region, "Region missing 'country_code'"
            assert 'region_code' in region, "Region missing 'region_code'"
            assert 'name' in region, "Region missing 'name'"
            assert region['country_code'] == 'TZ', f"Wrong country_code: {region['country_code']}"
        
        # Check for known regions
        region_names = [r['name'] for r in regions]
        assert 'Dar es Salaam' in region_names, "Missing 'Dar es Salaam' region"
    
    def test_get_kenya_regions(self):
        """Verify Kenya regions are returned"""
        response = requests.get(f"{BASE_URL}/api/locations/regions", params={"country_code": "KE"})
        assert response.status_code == 200
        
        regions = response.json()
        assert len(regions) >= 4, f"Expected at least 4 Kenya regions, got {len(regions)}"
        
        region_names = [r['name'] for r in regions]
        assert 'Nairobi' in region_names, "Missing 'Nairobi' region"
    
    def test_get_regions_requires_country_code(self):
        """Verify country_code is required"""
        response = requests.get(f"{BASE_URL}/api/locations/regions")
        assert response.status_code == 422, f"Expected 422 for missing param, got {response.status_code}"


class TestLocationDistricts:
    """Test /api/locations/districts endpoint"""
    
    def test_get_dar_es_salaam_districts(self):
        """Verify Dar es Salaam districts are returned correctly"""
        response = requests.get(f"{BASE_URL}/api/locations/districts", params={
            "country_code": "TZ",
            "region_code": "DSM"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        districts = response.json()
        assert isinstance(districts, list), "Response should be a list"
        assert len(districts) >= 3, f"Expected at least 3 DSM districts, got {len(districts)}"
        
        # Verify district structure
        for district in districts:
            assert 'country_code' in district
            assert 'region_code' in district
            assert 'district_code' in district
            assert 'name' in district
            assert district['country_code'] == 'TZ'
            assert district['region_code'] == 'DSM'
        
        # Check for known districts
        district_names = [d['name'] for d in districts]
        expected_districts = ['Ilala', 'Kinondoni', 'Temeke']
        for district in expected_districts:
            assert district in district_names, f"Missing '{district}' district"
    
    def test_get_districts_requires_params(self):
        """Verify both country_code and region_code are required"""
        # Missing region_code
        response = requests.get(f"{BASE_URL}/api/locations/districts", params={
            "country_code": "TZ"
        })
        assert response.status_code == 422
        
        # Missing country_code
        response = requests.get(f"{BASE_URL}/api/locations/districts", params={
            "region_code": "DSM"
        })
        assert response.status_code == 422


class TestLocationCities:
    """Test /api/locations/cities endpoint"""
    
    def test_get_kinondoni_cities(self):
        """Verify Kinondoni district cities are returned"""
        response = requests.get(f"{BASE_URL}/api/locations/cities", params={
            "country_code": "TZ",
            "region_code": "DSM",
            "district_code": "KIN"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        cities = response.json()
        assert isinstance(cities, list), "Response should be a list"
        assert len(cities) >= 3, f"Expected at least 3 Kinondoni cities, got {len(cities)}"
        
        # Verify city structure with coordinates
        for city in cities:
            assert 'country_code' in city
            assert 'region_code' in city
            assert 'district_code' in city
            assert 'city_code' in city
            assert 'name' in city
            assert 'lat' in city, "City missing latitude"
            assert 'lng' in city, "City missing longitude"
            assert isinstance(city['lat'], (int, float)), "Latitude should be numeric"
            assert isinstance(city['lng'], (int, float)), "Longitude should be numeric"
        
        # Check for known cities
        city_names = [c['name'] for c in cities]
        expected_cities = ['Mikocheni', 'Msasani', 'Sinza']
        for city in expected_cities:
            assert city in city_names, f"Missing '{city}' city"
    
    def test_get_cities_requires_all_params(self):
        """Verify all hierarchy params are required"""
        # Missing district_code
        response = requests.get(f"{BASE_URL}/api/locations/cities", params={
            "country_code": "TZ",
            "region_code": "DSM"
        })
        assert response.status_code == 422


class TestLocationCitySearch:
    """Test /api/locations/cities/search endpoint"""
    
    def test_search_nigerian_cities_lagos(self):
        """Search for Lagos cities in Nigeria"""
        response = requests.get(f"{BASE_URL}/api/locations/cities/search", params={
            "country_code": "NG",
            "q": "lagos"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        cities = response.json()
        assert isinstance(cities, list), "Response should be a list"
        
        # Should find Lagos-related cities
        city_names = [c['name'].lower() for c in cities]
        found_lagos = any('lagos' in name for name in city_names)
        assert found_lagos, f"Should find Lagos-related cities, got: {city_names}"
        
        # Verify enriched data is present
        if len(cities) > 0:
            city = cities[0]
            assert 'lat' in city
            assert 'lng' in city
    
    def test_search_cities_requires_min_2_chars(self):
        """Verify search requires at least 2 characters"""
        response = requests.get(f"{BASE_URL}/api/locations/cities/search", params={
            "country_code": "NG",
            "q": "a"  # Only 1 character
        })
        assert response.status_code == 422, f"Expected 422 for short query, got {response.status_code}"
    
    def test_search_cities_with_limit(self):
        """Test search with custom limit parameter"""
        response = requests.get(f"{BASE_URL}/api/locations/cities/search", params={
            "country_code": "US",
            "q": "an",  # Should match many cities
            "limit": 5
        })
        assert response.status_code == 200
        
        cities = response.json()
        assert len(cities) <= 5, f"Expected max 5 cities, got {len(cities)}"


class TestLocationStats:
    """Test /api/locations/stats endpoint"""
    
    def test_get_location_stats(self):
        """Verify location statistics are returned correctly"""
        response = requests.get(f"{BASE_URL}/api/locations/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        stats = response.json()
        
        # Verify stats structure
        assert 'countries' in stats, "Stats missing 'countries'"
        assert 'regions' in stats, "Stats missing 'regions'"
        assert 'districts' in stats, "Stats missing 'districts'"
        assert 'cities' in stats, "Stats missing 'cities'"
        
        # Verify expected counts (based on agent context: 13 countries, 55 regions, 79 districts, 130 cities)
        assert stats['countries'] == 13, f"Expected 13 countries, got {stats['countries']}"
        assert stats['regions'] >= 50, f"Expected at least 50 regions, got {stats['regions']}"
        assert stats['districts'] >= 70, f"Expected at least 70 districts, got {stats['districts']}"
        assert stats['cities'] >= 120, f"Expected at least 120 cities, got {stats['cities']}"


class TestLocationSpecificCountries:
    """Test location endpoints for specific countries mentioned in requirements"""
    
    def test_germany_has_regions(self):
        """Verify Germany has seeded regions"""
        response = requests.get(f"{BASE_URL}/api/locations/regions", params={"country_code": "DE"})
        assert response.status_code == 200
        
        regions = response.json()
        assert len(regions) >= 3, f"Germany should have at least 3 regions, got {len(regions)}"
        
        region_names = [r['name'] for r in regions]
        assert 'Berlin' in region_names, "Germany missing 'Berlin' region"
    
    def test_usa_has_regions(self):
        """Verify USA has seeded regions"""
        response = requests.get(f"{BASE_URL}/api/locations/regions", params={"country_code": "US"})
        assert response.status_code == 200
        
        regions = response.json()
        assert len(regions) >= 4, f"USA should have at least 4 regions, got {len(regions)}"
        
        region_names = [r['name'] for r in regions]
        assert 'California' in region_names, "USA missing 'California' region"
    
    def test_canada_has_regions(self):
        """Verify Canada has seeded regions"""
        response = requests.get(f"{BASE_URL}/api/locations/regions", params={"country_code": "CA"})
        assert response.status_code == 200
        
        regions = response.json()
        assert len(regions) >= 3, f"Canada should have at least 3 regions, got {len(regions)}"
        
        region_names = [r['name'] for r in regions]
        assert 'Ontario' in region_names, "Canada missing 'Ontario' region"
    
    def test_australia_has_regions(self):
        """Verify Australia has seeded regions"""
        response = requests.get(f"{BASE_URL}/api/locations/regions", params={"country_code": "AU"})
        assert response.status_code == 200
        
        regions = response.json()
        assert len(regions) >= 3, f"Australia should have at least 3 regions, got {len(regions)}"


# Run a quick health check
if __name__ == "__main__":
    print(f"Testing against: {BASE_URL}")
    
    # Quick sanity check
    response = requests.get(f"{BASE_URL}/api/locations/countries")
    print(f"Countries endpoint: {response.status_code}")
    if response.status_code == 200:
        countries = response.json()
        print(f"Found {len(countries)} countries")
        for c in countries[:5]:
            print(f"  - {c.get('flag', '')} {c['name']} ({c['code']})")
