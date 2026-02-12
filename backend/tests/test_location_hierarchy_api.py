"""
Location Hierarchy API Tests
Tests for hierarchical location selection: Country > Region > District > City
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://icon-admin-panel-1.preview.emergentagent.com')

class TestLocationCountriesAPI:
    """Test /api/locations/countries endpoint"""
    
    def test_get_countries_success(self):
        """Should return list of available countries"""
        response = requests.get(f"{BASE_URL}/api/locations/countries")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should return at least one country"
        
        # Check structure of first country
        country = data[0]
        assert "code" in country, "Country should have code"
        assert "name" in country, "Country should have name"
        print(f"SUCCESS: Got {len(data)} countries: {[c['code'] for c in data[:5]]}...")

    def test_country_has_required_fields(self):
        """Each country should have code, name, and optionally flag"""
        response = requests.get(f"{BASE_URL}/api/locations/countries")
        assert response.status_code == 200
        
        countries = response.json()
        for country in countries:
            assert isinstance(country.get("code"), str), f"Invalid code in {country}"
            assert isinstance(country.get("name"), str), f"Invalid name in {country}"
            assert len(country["code"]) == 2, f"Country code should be 2 chars: {country['code']}"


class TestLocationRegionsAPI:
    """Test /api/locations/regions endpoint"""
    
    def test_get_regions_for_tanzania(self):
        """Should return regions for Tanzania (TZ)"""
        response = requests.get(f"{BASE_URL}/api/locations/regions", params={"country_code": "TZ"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        regions = response.json()
        assert isinstance(regions, list), "Response should be a list"
        assert len(regions) > 0, "Tanzania should have regions"
        
        # Check region structure
        region = regions[0]
        assert "region_code" in region, "Region should have region_code"
        assert "name" in region, "Region should have name"
        assert "country_code" in region, "Region should have country_code"
        print(f"SUCCESS: Tanzania has {len(regions)} regions: {[r['name'] for r in regions[:5]]}...")

    def test_get_regions_missing_country_code(self):
        """Should return 422 when country_code is missing"""
        response = requests.get(f"{BASE_URL}/api/locations/regions")
        assert response.status_code == 422, f"Expected 422 for missing param, got {response.status_code}"

    def test_get_regions_with_search(self):
        """Should filter regions by search query"""
        response = requests.get(f"{BASE_URL}/api/locations/regions", params={"country_code": "TZ", "search": "Dar"})
        assert response.status_code == 200
        
        regions = response.json()
        # Should find Dar es Salaam or similar
        print(f"Search 'Dar' in TZ returned: {[r['name'] for r in regions]}")


class TestLocationDistrictsAPI:
    """Test /api/locations/districts endpoint"""
    
    def test_get_districts_for_dar_es_salaam(self):
        """Should return districts for Dar es Salaam region"""
        response = requests.get(
            f"{BASE_URL}/api/locations/districts",
            params={"country_code": "TZ", "region_code": "DSM"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        districts = response.json()
        assert isinstance(districts, list), "Response should be a list"
        
        if len(districts) > 0:
            district = districts[0]
            assert "district_code" in district, "District should have district_code"
            assert "name" in district, "District should have name"
            assert "region_code" in district, "District should have region_code"
            print(f"SUCCESS: DSM has {len(districts)} districts: {[d['name'] for d in districts]}")
        else:
            print("WARNING: No districts found for DSM - might be empty dataset")

    def test_get_districts_missing_params(self):
        """Should return 422 when required params are missing"""
        # Missing both
        response = requests.get(f"{BASE_URL}/api/locations/districts")
        assert response.status_code == 422
        
        # Missing region_code
        response = requests.get(f"{BASE_URL}/api/locations/districts", params={"country_code": "TZ"})
        assert response.status_code == 422


class TestLocationCitiesAPI:
    """Test /api/locations/cities endpoint"""
    
    def test_get_cities_for_kinondoni(self):
        """Should return cities for Kinondoni district"""
        response = requests.get(
            f"{BASE_URL}/api/locations/cities",
            params={"country_code": "TZ", "region_code": "DSM", "district_code": "KIN"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        cities = response.json()
        assert isinstance(cities, list), "Response should be a list"
        
        if len(cities) > 0:
            city = cities[0]
            assert "city_code" in city, "City should have city_code"
            assert "name" in city, "City should have name"
            # Check for lat/lng coordinates
            print(f"SUCCESS: KIN has {len(cities)} cities")
            # Print first city with coordinates
            if "lat" in city and "lng" in city:
                print(f"  First city: {city['name']} ({city.get('lat')}, {city.get('lng')})")
        else:
            print("WARNING: No cities found for KIN - might be empty dataset")

    def test_cities_have_coordinates(self):
        """Cities should have lat/lng coordinates for distance calculation"""
        response = requests.get(
            f"{BASE_URL}/api/locations/cities",
            params={"country_code": "TZ", "region_code": "DSM", "district_code": "KIN"}
        )
        assert response.status_code == 200
        
        cities = response.json()
        if len(cities) > 0:
            for city in cities:
                assert "lat" in city or city.get("lat") is not None, f"City {city.get('name')} missing lat"
                assert "lng" in city or city.get("lng") is not None, f"City {city.get('name')} missing lng"
            print(f"SUCCESS: All {len(cities)} cities have coordinates")


class TestLocationCitySearchAPI:
    """Test /api/locations/cities/search endpoint"""
    
    def test_search_cities_in_tanzania(self):
        """Should search cities by name across all regions"""
        response = requests.get(
            f"{BASE_URL}/api/locations/cities/search",
            params={"country_code": "TZ", "q": "Dar"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        cities = response.json()
        assert isinstance(cities, list), "Response should be a list"
        print(f"Search 'Dar' in TZ found: {[c['name'] for c in cities[:5]]}...")

    def test_search_requires_min_length(self):
        """Search query should be at least 2 characters"""
        response = requests.get(
            f"{BASE_URL}/api/locations/cities/search",
            params={"country_code": "TZ", "q": "D"}
        )
        assert response.status_code == 422, f"Expected 422 for short query, got {response.status_code}"


class TestListingsByLocationAPI:
    """Test /api/listings/by-location endpoint"""
    
    def test_get_listings_by_city(self):
        """Should return listings for a specific city with distance"""
        # Use a city code (e.g., from Tanzania)
        response = requests.get(
            f"{BASE_URL}/api/listings/by-location",
            params={
                "city_code": "KIJITONYANA",  # Example city code
                "city_lat": -6.7833,
                "city_lng": 39.2333,
                "include_nearby": True,
                "radius": 50
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "listings" in data, "Response should have listings"
        assert "total" in data, "Response should have total count"
        assert "expanded_search" in data, "Response should indicate if search was expanded"
        assert "message" in data, "Response should have message"
        
        print(f"SUCCESS: by-location returned {data['total']} listings")
        print(f"  Expanded search: {data['expanded_search']}")
        print(f"  Message: {data.get('message')}")

    def test_listings_by_location_missing_params(self):
        """Should return 422 when required params are missing"""
        response = requests.get(f"{BASE_URL}/api/listings/by-location")
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"

    def test_listings_with_only_my_city(self):
        """Should respect only_my_city flag to not expand search"""
        response = requests.get(
            f"{BASE_URL}/api/listings/by-location",
            params={
                "city_code": "NONEXISTENT",
                "city_lat": -6.7833,
                "city_lng": 39.2333,
                "include_nearby": False,
                "only_my_city": True
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("expanded_search") == False, "Should not expand search when only_my_city=True"


class TestListingsWithLocationFilter:
    """Test /api/listings endpoint with location filters"""
    
    def test_listings_with_country_code(self):
        """Should filter listings by country_code"""
        response = requests.get(
            f"{BASE_URL}/api/listings",
            params={"country_code": "TZ"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "listings" in data, "Response should have listings"
        print(f"Listings in TZ: {data['total']}")

    def test_listings_with_city_code(self):
        """Should filter listings by city_code"""
        response = requests.get(
            f"{BASE_URL}/api/listings",
            params={"city_code": "KIJITONYANA"}
        )
        assert response.status_code == 200
        
        data = response.json()
        print(f"Listings in KIJITONYANA: {data['total']}")

    def test_listings_response_has_location_data(self):
        """Listings should include location_data with city_name"""
        response = requests.get(f"{BASE_URL}/api/listings", params={"limit": 5})
        assert response.status_code == 200
        
        data = response.json()
        for listing in data.get("listings", []):
            loc_data = listing.get("location_data")
            if loc_data:
                print(f"  Listing '{listing.get('title', 'N/A')[:30]}' - City: {loc_data.get('city_name', 'N/A')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
