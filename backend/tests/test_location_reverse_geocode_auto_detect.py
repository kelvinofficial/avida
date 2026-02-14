"""
Test suite for new Location Manager features:
- Reverse geocoding on map click
- Auto-detect location from coordinates  
- District boundary polygon
- Export filter fix for country_code
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smart-listings-ai.preview.emergentagent.com')

class TestReverseGeocode:
    """Tests for reverse geocoding API - GET /api/admin/locations/reverse-geocode"""
    
    def test_reverse_geocode_dar_es_salaam(self):
        """Test reverse geocoding for Dar es Salaam, Tanzania"""
        # Coordinates for Dar es Salaam city center
        lat = -6.7924
        lng = 39.2083
        
        response = requests.get(
            f"{BASE_URL}/api/admin/locations/reverse-geocode",
            params={"lat": lat, "lng": lng}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "suggested_name" in data, "Missing suggested_name in response"
        assert "district" in data, "Missing district in response"
        assert "region" in data, "Missing region in response"  
        assert "country" in data, "Missing country in response"
        assert "country_code" in data, "Missing country_code in response"
        assert "address_details" in data, "Missing address_details in response"
        assert "lat" in data, "Missing lat in response"
        assert "lng" in data, "Missing lng in response"
        
        # Verify country code is TZ (Tanzania)
        assert data["country_code"] == "TZ", f"Expected country_code TZ, got {data['country_code']}"
        
        print(f"✓ Reverse geocode returned: suggested_name={data.get('suggested_name')}, district={data.get('district')}, region={data.get('region')}, country={data.get('country')}")
    
    def test_reverse_geocode_berlin(self):
        """Test reverse geocoding for Berlin, Germany"""
        lat = 52.5200
        lng = 13.4050
        
        response = requests.get(
            f"{BASE_URL}/api/admin/locations/reverse-geocode",
            params={"lat": lat, "lng": lng}
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["country_code"] == "DE", f"Expected DE, got {data['country_code']}"
        
        print(f"✓ Berlin reverse geocode: {data.get('suggested_name')}, {data.get('region')}, {data.get('country')}")
    
    def test_reverse_geocode_missing_params(self):
        """Test that missing lat/lng params return error"""
        response = requests.get(f"{BASE_URL}/api/admin/locations/reverse-geocode")
        assert response.status_code == 422, "Expected 422 for missing parameters"


class TestAutoDetect:
    """Tests for auto-detect location API - GET /api/admin/locations/auto-detect"""
    
    def test_auto_detect_tanzania(self):
        """Test auto-detect for Tanzania coordinates"""
        lat = -6.7924
        lng = 39.2083
        
        response = requests.get(
            f"{BASE_URL}/api/admin/locations/auto-detect",
            params={"lat": lat, "lng": lng}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "detected" in data, "Missing 'detected' field"
        assert "country" in data, "Missing 'country' field"
        assert "region" in data, "Missing 'region' field"
        assert "district" in data, "Missing 'district' field"
        assert "nominatim_data" in data, "Missing 'nominatim_data' field"
        assert "suggested_city_name" in data, "Missing 'suggested_city_name' field"
        assert "coordinates" in data, "Missing 'coordinates' field"
        
        # If TZ exists in our database, should be detected
        if data.get("country"):
            assert data["country"]["code"] == "TZ", f"Expected TZ, got {data['country']['code']}"
            print(f"✓ Auto-detect found country: {data['country']['name']}")
        else:
            print("⚠ Country TZ not in database - nominatim data:", data.get('nominatim_data'))
        
        # Check coordinates returned match input
        assert data["coordinates"]["lat"] == lat
        assert data["coordinates"]["lng"] == lng
    
    def test_auto_detect_germany(self):
        """Test auto-detect for Germany coordinates"""
        lat = 52.5200
        lng = 13.4050
        
        response = requests.get(
            f"{BASE_URL}/api/admin/locations/auto-detect",
            params={"lat": lat, "lng": lng}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["detected"] == True
        print(f"✓ Auto-detect nominatim data: {data.get('nominatim_data')}")
    
    def test_auto_detect_missing_params(self):
        """Test that missing params return error"""
        response = requests.get(f"{BASE_URL}/api/admin/locations/auto-detect")
        assert response.status_code == 422


class TestDistrictBoundary:
    """Tests for district boundary API - GET /api/admin/locations/district-boundary"""
    
    def test_district_boundary_success(self):
        """Test getting boundary for a known district"""
        # First, get a list of districts to test with
        countries_response = requests.get(f"{BASE_URL}/api/admin/locations/countries")
        
        if countries_response.status_code != 200:
            pytest.skip("Cannot get countries list")
        
        countries = countries_response.json()
        if not countries:
            pytest.skip("No countries in database")
        
        # Find Tanzania or first available country
        tz_country = next((c for c in countries if c['code'] == 'TZ'), countries[0])
        
        regions_response = requests.get(
            f"{BASE_URL}/api/admin/locations/regions",
            params={"country_code": tz_country['code']}
        )
        
        if regions_response.status_code != 200 or not regions_response.json():
            pytest.skip("No regions found")
        
        regions = regions_response.json()
        region = regions[0]
        
        districts_response = requests.get(
            f"{BASE_URL}/api/admin/locations/districts",
            params={
                "country_code": tz_country['code'],
                "region_code": region['region_code']
            }
        )
        
        if districts_response.status_code != 200 or not districts_response.json():
            pytest.skip("No districts found")
        
        districts = districts_response.json()
        district = districts[0]
        
        # Now test the boundary endpoint
        response = requests.get(
            f"{BASE_URL}/api/admin/locations/district-boundary",
            params={
                "country_code": tz_country['code'],
                "region_code": region['region_code'],
                "district_code": district['district_code']
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "found" in data, "Missing 'found' field"
        assert "district" in data, "Missing 'district' field"
        
        if data.get("found"):
            assert "geojson" in data, "Missing 'geojson' when found=True"
            assert "bounding_box" in data, "Missing 'bounding_box'"
            assert "center" in data, "Missing 'center'"
            
            geojson = data.get("geojson")
            if geojson:
                assert "type" in geojson, "GeoJSON missing 'type'"
                assert "coordinates" in geojson, "GeoJSON missing 'coordinates'"
            
            print(f"✓ District boundary found for {data['district']}: type={geojson.get('type') if geojson else 'N/A'}")
        else:
            print(f"⚠ No boundary found for {data.get('district')} - this is acceptable for smaller districts")
    
    def test_district_boundary_not_found(self):
        """Test boundary for non-existent district"""
        response = requests.get(
            f"{BASE_URL}/api/admin/locations/district-boundary",
            params={
                "country_code": "XX",
                "region_code": "YYY",
                "district_code": "ZZZ"
            }
        )
        
        # Should return 404 for non-existent district
        assert response.status_code == 404
    
    def test_district_boundary_missing_params(self):
        """Test missing required parameters"""
        response = requests.get(f"{BASE_URL}/api/admin/locations/district-boundary")
        assert response.status_code == 422


class TestExportFilter:
    """Tests for export API country_code filter fix - GET /api/admin/locations/export"""
    
    def test_export_cities_filter_by_country(self):
        """Test that country_code filter works for cities export"""
        # First check if TZ exists in database
        countries_response = requests.get(f"{BASE_URL}/api/admin/locations/countries")
        countries = countries_response.json()
        
        tz_country = next((c for c in countries if c['code'] == 'TZ'), None)
        if not tz_country:
            pytest.skip("Tanzania not in database")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/locations/export",
            params={"level": "cities", "country_code": "TZ"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify GeoJSON structure
        assert data.get("type") == "FeatureCollection"
        assert "features" in data
        assert "metadata" in data
        
        features = data.get("features", [])
        print(f"Export returned {len(features)} features for country_code=TZ")
        
        # CRITICAL: All features should have country_code=TZ
        for feature in features:
            props = feature.get("properties", {})
            assert props.get("country_code") == "TZ", f"Feature has wrong country_code: {props.get('country_code')}, expected TZ"
        
        print(f"✓ All {len(features)} exported cities have correct country_code=TZ")
    
    def test_export_all_cities_unfiltered(self):
        """Test unfiltered export returns cities from multiple countries"""
        response = requests.get(
            f"{BASE_URL}/api/admin/locations/export",
            params={"level": "cities"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        features = data.get("features", [])
        
        # Get unique country codes
        country_codes = set()
        for feature in features:
            props = feature.get("properties", {})
            if props.get("country_code"):
                country_codes.add(props["country_code"])
        
        print(f"✓ Unfiltered export: {len(features)} cities from {len(country_codes)} countries: {country_codes}")
    
    def test_export_districts_filter_by_country(self):
        """Test that country_code filter works for districts export"""
        response = requests.get(
            f"{BASE_URL}/api/admin/locations/export",
            params={"level": "districts", "country_code": "TZ"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        features = data.get("features", [])
        
        for feature in features:
            props = feature.get("properties", {})
            assert props.get("country_code") == "TZ", f"District has wrong country_code: {props.get('country_code')}"
        
        print(f"✓ All {len(features)} exported districts have correct country_code=TZ")
    
    def test_export_with_region_filter(self):
        """Test export with both country and region filter"""
        # Get first region from TZ
        regions_response = requests.get(
            f"{BASE_URL}/api/admin/locations/regions",
            params={"country_code": "TZ"}
        )
        
        if regions_response.status_code != 200:
            pytest.skip("Cannot get regions")
        
        regions = regions_response.json()
        if not regions:
            pytest.skip("No regions in TZ")
        
        region = regions[0]
        
        response = requests.get(
            f"{BASE_URL}/api/admin/locations/export",
            params={
                "level": "cities",
                "country_code": "TZ",
                "region_code": region["region_code"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        features = data.get("features", [])
        
        for feature in features:
            props = feature.get("properties", {})
            assert props.get("country_code") == "TZ"
            assert props.get("region_code") == region["region_code"]
        
        print(f"✓ Export with region filter: {len(features)} cities in {region['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
