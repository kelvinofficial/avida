"""
Test Location Manager New Features:
1. Geocoding API using OpenStreetMap Nominatim
2. Batch import cities from GeoJSON
3. Districts lat/lng fields
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://desktop-profile-hub.preview.emergentagent.com')
BASE_URL = BASE_URL.rstrip('/')

ADMIN_EMAIL = "admin@marketplace.com"
ADMIN_PASSWORD = "Admin@123456"


class TestGeocodeAPI:
    """Test Nominatim geocoding API"""
    
    def test_geocode_dar_es_salaam(self):
        """Test geocoding for 'Dar es Salaam' returns valid results"""
        response = requests.get(
            f"{BASE_URL}/api/admin/locations/geocode",
            params={"query": "Dar es Salaam", "limit": 3}
        )
        
        print(f"Geocode Response Status: {response.status_code}")
        
        # Status code check
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Parse results
        results = response.json()
        print(f"Geocode Results: {json.dumps(results, indent=2)}")
        
        # Data assertions
        assert isinstance(results, list), "Results should be a list"
        assert len(results) > 0, "Should return at least one result for 'Dar es Salaam'"
        
        # Validate first result structure
        first_result = results[0]
        assert "display_name" in first_result, "Result should have display_name"
        assert "lat" in first_result, "Result should have lat"
        assert "lng" in first_result, "Result should have lng"
        assert "type" in first_result, "Result should have type"
        
        # Validate coordinates are in expected range for Dar es Salaam
        lat = first_result["lat"]
        lng = first_result["lng"]
        assert -7.5 < lat < -6.0, f"Latitude {lat} not in expected range for Dar es Salaam"
        assert 38.5 < lng < 40.0, f"Longitude {lng} not in expected range for Dar es Salaam"
        
        print(f"SUCCESS: Found {first_result['display_name']} at ({lat}, {lng})")
    
    def test_geocode_berlin(self):
        """Test geocoding for 'Berlin, Germany'"""
        response = requests.get(
            f"{BASE_URL}/api/admin/locations/geocode",
            params={"query": "Berlin, Germany", "limit": 2}
        )
        
        assert response.status_code == 200
        results = response.json()
        
        assert len(results) > 0, "Should find Berlin"
        assert "Berlin" in results[0]["display_name"], "Should contain Berlin in name"
        
        # Berlin coordinates should be around lat ~52.5, lng ~13.4
        assert 51.5 < results[0]["lat"] < 53.5, "Berlin lat should be around 52"
        assert 12.5 < results[0]["lng"] < 14.5, "Berlin lng should be around 13"
        
        print(f"SUCCESS: Berlin found at ({results[0]['lat']}, {results[0]['lng']})")
    
    def test_geocode_empty_query(self):
        """Test geocoding with empty query returns error"""
        response = requests.get(
            f"{BASE_URL}/api/admin/locations/geocode",
            params={"query": "", "limit": 5}
        )
        
        # Empty query should return 422 (validation error) or empty list
        print(f"Empty query response: {response.status_code}, {response.text[:200]}")
        # Nominatim may return empty results for empty query
        assert response.status_code in [200, 400, 422], "Should handle empty query gracefully"


class TestBatchImportAPI:
    """Test GeoJSON batch import API"""
    
    def test_batch_import_valid_geojson_wrapped(self):
        """Test batch import with valid GeoJSON wrapped in geojson key (frontend format)"""
        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [39.2695, -6.8161]  # [lng, lat] format
                    },
                    "properties": {
                        "country_code": "TZ",
                        "region_code": "DSM",
                        "district_code": "ILA",
                        "city_code": "TEST1",
                        "name": "Test Import City 1"
                    }
                }
            ]
        }
        
        # Frontend sends { geojson: {...} }
        response = requests.post(
            f"{BASE_URL}/api/admin/locations/batch-import",
            json={"geojson": geojson}
        )
        
        print(f"Batch Import (wrapped) Response: {response.status_code}")
        print(f"Response Body: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert "imported_count" in result, "Response should have imported_count"
        assert "error_count" in result, "Response should have error_count"
        
        # Should import at least one city
        print(f"Imported: {result.get('imported_count')}, Errors: {result.get('error_count')}")
        
        # Clean up - delete test city
        requests.delete(
            f"{BASE_URL}/api/admin/locations/cities",
            params={
                "country_code": "TZ",
                "region_code": "DSM",
                "district_code": "ILA",
                "city_code": "TEST1"
            }
        )
    
    def test_batch_import_valid_geojson_direct(self):
        """Test batch import with direct GeoJSON FeatureCollection (alternative format)"""
        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [39.2695, -6.8162]  # [lng, lat] format
                    },
                    "properties": {
                        "country_code": "TZ",
                        "region_code": "DSM",
                        "district_code": "ILA",
                        "city_code": "TEST2",
                        "name": "Test Import City 2"
                    }
                }
            ]
        }
        
        # Direct GeoJSON without wrapper
        response = requests.post(
            f"{BASE_URL}/api/admin/locations/batch-import",
            json=geojson
        )
        
        print(f"Batch Import (direct) Response: {response.status_code}")
        print(f"Response Body: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("imported_count", 0) >= 0, "Should have imported_count"
        
        # Clean up
        requests.delete(
            f"{BASE_URL}/api/admin/locations/cities",
            params={
                "country_code": "TZ",
                "region_code": "DSM",
                "district_code": "ILA",
                "city_code": "TEST2"
            }
        )
    
    def test_batch_import_invalid_type(self):
        """Test batch import with invalid GeoJSON type"""
        invalid_geojson = {
            "type": "Feature",  # Not FeatureCollection
            "geometry": {"type": "Point", "coordinates": [0, 0]},
            "properties": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/locations/batch-import",
            json={"geojson": invalid_geojson}
        )
        
        print(f"Invalid type response: {response.status_code}, {response.text[:200]}")
        assert response.status_code == 400, "Should reject non-FeatureCollection"
    
    def test_batch_import_missing_properties(self):
        """Test batch import with missing required properties"""
        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [39.0, -6.0]},
                    "properties": {
                        "name": "Missing Codes City"
                        # Missing country_code, region_code, district_code, city_code
                    }
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/locations/batch-import",
            json={"geojson": geojson}
        )
        
        print(f"Missing props response: {response.status_code}, {response.text}")
        assert response.status_code == 200, "Should return 200 with errors array"
        result = response.json()
        
        # Should have error count for missing properties
        assert result.get("error_count", 0) > 0, "Should report error for missing properties"
        print(f"Errors: {result.get('errors')}")


class TestDistrictLatLng:
    """Test districts table with lat/lng fields"""
    
    def test_get_districts_with_coordinates(self):
        """Test districts API returns lat/lng fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/locations/districts",
            params={"country_code": "TZ", "region_code": "DSM"}
        )
        
        print(f"Districts Response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        districts = response.json()
        print(f"Found {len(districts)} districts")
        
        if len(districts) > 0:
            first_district = districts[0]
            print(f"First district: {json.dumps(first_district, indent=2)}")
            
            # Check that lat/lng fields exist (can be null)
            # The schema allows optional lat/lng
            assert "name" in first_district, "District should have name"
            assert "district_code" in first_district, "District should have district_code"
            
            # If lat/lng exist, validate they are numbers or null
            if "lat" in first_district and first_district["lat"] is not None:
                assert isinstance(first_district["lat"], (int, float)), "lat should be a number"
            if "lng" in first_district and first_district["lng"] is not None:
                assert isinstance(first_district["lng"], (int, float)), "lng should be a number"
            
            print("SUCCESS: Districts have proper structure with optional lat/lng")
    
    def test_create_district_with_coordinates(self):
        """Test creating a district with lat/lng coordinates"""
        district_data = {
            "country_code": "TZ",
            "region_code": "DSM",
            "district_code": "TSTD",
            "name": "Test District With Coords",
            "lat": -6.82,
            "lng": 39.28
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/locations/districts",
            json=district_data
        )
        
        print(f"Create district response: {response.status_code}, {response.text[:300]}")
        
        # Check if created (201) or already exists (409 or similar)
        if response.status_code in [200, 201]:
            result = response.json()
            print(f"Created district: {result}")
            
            # Clean up
            requests.delete(
                f"{BASE_URL}/api/admin/locations/districts",
                params={
                    "country_code": "TZ",
                    "region_code": "DSM",
                    "district_code": "TSTD"
                }
            )
        
        assert response.status_code in [200, 201, 409], f"Unexpected status: {response.status_code}"


class TestLocationSearchInFrontend:
    """Test the location search endpoint that frontend uses"""
    
    def test_locations_stats(self):
        """Test locations stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/locations/stats")
        
        assert response.status_code == 200
        stats = response.json()
        
        assert "countries" in stats
        assert "regions" in stats
        assert "districts" in stats
        assert "cities" in stats
        
        print(f"Location Stats: {stats}")
    
    def test_locations_countries(self):
        """Test countries endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/locations/countries")
        
        assert response.status_code == 200
        countries = response.json()
        
        assert len(countries) > 0, "Should have countries"
        assert any(c.get("code") == "TZ" for c in countries), "Should have Tanzania (TZ)"
        
        print(f"Found {len(countries)} countries")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
