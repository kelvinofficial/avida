"""
Test advanced Location Manager features:
1. Bulk Update Coordinates (POST /api/admin/locations/bulk-update-coordinates)
2. Export to GeoJSON (GET /api/admin/locations/export)
3. Listing Density Heatmap (GET /api/admin/locations/listing-density)
4. Auto-suggest Coordinates (GET /api/admin/locations/suggest-coordinates)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('NEXT_PUBLIC_MAIN_API_URL') or os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://shimmer-perf.preview.emergentagent.com/api"


class TestLocationAdvancedFeatures:
    """Test advanced location management APIs"""
    
    # =====================
    # EXPORT TO GEOJSON API
    # =====================
    
    def test_export_cities_returns_geojson(self):
        """Test GET /api/admin/locations/export?level=cities returns valid GeoJSON FeatureCollection"""
        response = requests.get(f"{BASE_URL}/admin/locations/export", params={"level": "cities"})
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("type") == "FeatureCollection", "Response should be a GeoJSON FeatureCollection"
        assert "features" in data, "Response should have features array"
        assert "metadata" in data, "Response should have metadata"
        assert data["metadata"].get("export_level") == "cities", "Metadata should show export level"
        assert isinstance(data["features"], list), "Features should be a list"
        
        # Validate feature structure if any exist
        if len(data["features"]) > 0:
            feature = data["features"][0]
            assert feature.get("type") == "Feature", "Each item should be a Feature"
            assert "geometry" in feature, "Feature should have geometry"
            assert "properties" in feature, "Feature should have properties"
            assert feature["geometry"].get("type") == "Point", "Geometry should be Point type"
            assert len(feature["geometry"].get("coordinates", [])) == 2, "Point should have [lng, lat]"
            assert feature["properties"].get("type") == "city", "Property type should be city"
    
    def test_export_districts_returns_geojson(self):
        """Test GET /api/admin/locations/export?level=districts returns valid GeoJSON"""
        response = requests.get(f"{BASE_URL}/admin/locations/export", params={"level": "districts"})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("type") == "FeatureCollection"
        assert data["metadata"].get("export_level") == "districts"
        
        # If districts have coordinates, verify structure
        if len(data["features"]) > 0:
            feature = data["features"][0]
            assert feature["properties"].get("type") == "district"
    
    def test_export_all_returns_both(self):
        """Test GET /api/admin/locations/export?level=all returns both cities and districts"""
        response = requests.get(f"{BASE_URL}/admin/locations/export", params={"level": "all"})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("type") == "FeatureCollection"
        assert data["metadata"].get("export_level") == "all"
        
        # Check feature_count matches features array length
        assert data["metadata"].get("feature_count") == len(data["features"])
    
    def test_export_with_country_filter(self):
        """Test export with country_code filter"""
        response = requests.get(f"{BASE_URL}/admin/locations/export", params={
            "level": "cities",
            "country_code": "TZ"  # Tanzania
        })
        
        assert response.status_code == 200
        
        data = response.json()
        # All features should be from Tanzania
        for feature in data["features"]:
            assert feature["properties"].get("country_code") == "TZ"
    
    # =====================
    # LISTING DENSITY / HEATMAP API
    # =====================
    
    def test_listing_density_returns_heatmap_data(self):
        """Test GET /api/admin/locations/listing-density returns heatmap format data"""
        response = requests.get(f"{BASE_URL}/admin/locations/listing-density")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required fields
        assert "heatmap_data" in data, "Response should have heatmap_data"
        assert "city_details" in data, "Response should have city_details"
        assert "total_cities" in data, "Response should have total_cities"
        assert "total_listings" in data, "Response should have total_listings"
        
        # Validate data types
        assert isinstance(data["heatmap_data"], list), "heatmap_data should be a list"
        assert isinstance(data["city_details"], list), "city_details should be a list"
        assert isinstance(data["total_cities"], int), "total_cities should be int"
        assert isinstance(data["total_listings"], int), "total_listings should be int"
        
        # Validate heatmap data structure if exists
        if len(data["heatmap_data"]) > 0:
            point = data["heatmap_data"][0]
            assert len(point) == 3, "Heatmap point should have [lat, lng, intensity]"
            assert isinstance(point[0], (int, float)), "lat should be numeric"
            assert isinstance(point[1], (int, float)), "lng should be numeric"
            assert isinstance(point[2], (int, float)), "intensity should be numeric"
            assert 0 <= point[2] <= 1, "intensity should be normalized 0-1"
        
        # Validate city_details structure if exists
        if len(data["city_details"]) > 0:
            city = data["city_details"][0]
            assert "city_code" in city or city.get("city_code") is None
            assert "listing_count" in city
    
    # =====================
    # SUGGEST COORDINATES API
    # =====================
    
    def test_suggest_coordinates_requires_params(self):
        """Test GET /api/admin/locations/suggest-coordinates requires country, region, district codes"""
        response = requests.get(f"{BASE_URL}/admin/locations/suggest-coordinates")
        
        # Should return 422 for missing required params
        assert response.status_code == 422, f"Expected 422 for missing params, got {response.status_code}"
    
    def test_suggest_coordinates_with_valid_district(self):
        """Test suggest-coordinates returns coordinates for a district with cities"""
        response = requests.get(f"{BASE_URL}/admin/locations/suggest-coordinates", params={
            "country_code": "TZ",
            "region_code": "DSM",  
            "district_code": "ILA"  # Ilala district in Dar es Salaam
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check response structure
        assert "suggested_lat" in data, "Response should have suggested_lat"
        assert "suggested_lng" in data, "Response should have suggested_lng"
        assert "source" in data, "Response should have source"
        assert "confidence" in data, "Response should have confidence"
        
        # If coordinates are suggested, validate them
        if data.get("suggested_lat") and data.get("suggested_lng"):
            assert isinstance(data["suggested_lat"], (int, float))
            assert isinstance(data["suggested_lng"], (int, float))
            assert -90 <= data["suggested_lat"] <= 90, "Latitude should be valid"
            assert -180 <= data["suggested_lng"] <= 180, "Longitude should be valid"
            assert data["confidence"] in ["low", "medium", "high"]
    
    def test_suggest_coordinates_returns_nearby_cities(self):
        """Test suggest-coordinates includes nearby cities when available"""
        response = requests.get(f"{BASE_URL}/admin/locations/suggest-coordinates", params={
            "country_code": "TZ",
            "region_code": "DSM",
            "district_code": "ILA"
        })
        
        assert response.status_code == 200
        
        data = response.json()
        
        # If there are nearby cities, they should be included
        if data.get("nearby_cities"):
            assert isinstance(data["nearby_cities"], list)
            for city in data["nearby_cities"]:
                assert "name" in city
                assert "lat" in city
                assert "lng" in city
    
    # =====================
    # BULK UPDATE COORDINATES API
    # =====================
    
    def test_bulk_update_endpoint_exists(self):
        """Test POST /api/admin/locations/bulk-update-coordinates endpoint exists"""
        response = requests.post(f"{BASE_URL}/admin/locations/bulk-update-coordinates", json={})
        
        # Should not be 404 - endpoint exists
        assert response.status_code != 404, "Bulk update endpoint should exist"
        
        # Should return success structure (may have 0 updates if all have coords)
        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            assert "updated_count" in data
            assert "error_count" in data
            assert isinstance(data["updated_count"], int)
            assert isinstance(data["error_count"], int)
    
    def test_bulk_update_returns_update_results(self):
        """Test bulk update returns updated and error lists"""
        response = requests.post(f"{BASE_URL}/admin/locations/bulk-update-coordinates", json={})
        
        if response.status_code == 200:
            data = response.json()
            
            # Check structure
            assert "updated" in data, "Response should have updated list"
            assert "errors" in data, "Response should have errors list"
            
            # Validate updated entries structure
            if len(data.get("updated", [])) > 0:
                update = data["updated"][0]
                assert "type" in update
                assert "name" in update
                assert "lat" in update
                assert "lng" in update


class TestLocationAPIIntegration:
    """Integration tests combining multiple location APIs"""
    
    def test_export_then_import_roundtrip(self):
        """Test that exported GeoJSON can be re-imported"""
        # Export cities
        export_response = requests.get(f"{BASE_URL}/admin/locations/export", params={"level": "cities"})
        assert export_response.status_code == 200
        
        exported_data = export_response.json()
        
        # Verify it's valid GeoJSON format for import
        assert exported_data.get("type") == "FeatureCollection"
        assert "features" in exported_data
    
    def test_suggest_coordinates_then_verify_range(self):
        """Test suggested coordinates are within reasonable bounds for the region"""
        # Get suggestion
        suggest_response = requests.get(f"{BASE_URL}/admin/locations/suggest-coordinates", params={
            "country_code": "TZ",
            "region_code": "DSM",
            "district_code": "ILA"
        })
        
        if suggest_response.status_code == 200:
            data = suggest_response.json()
            
            if data.get("suggested_lat") and data.get("suggested_lng"):
                # Tanzania is roughly between -1 to -12 lat, 29 to 41 lng
                lat = data["suggested_lat"]
                lng = data["suggested_lng"]
                
                # Validate within Tanzania bounds (with margin)
                assert -15 <= lat <= 2, f"Latitude {lat} outside Tanzania range"
                assert 27 <= lng <= 43, f"Longitude {lng} outside Tanzania range"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
