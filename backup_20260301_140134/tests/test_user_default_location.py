"""
Test User Default Location Feature
Tests for PUT /api/users/me/location and GET /api/users/me/location endpoints
This feature allows users to save a default location that pre-populates when posting listings.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def test_user():
    """Create a test user and session for authenticated tests"""
    import subprocess
    
    timestamp = int(time.time() * 1000)
    user_id = f"test_location_user_{timestamp}"
    session_token = f"test_session_{timestamp}"
    email = f"test.location.{timestamp}@example.com"
    
    # Create test user and session in MongoDB
    mongo_script = f"""
    use('classifieds_db');
    db.users.insertOne({{
        user_id: "{user_id}",
        email: "{email}",
        name: "Test Location User",
        picture: "https://via.placeholder.com/150",
        created_at: new Date()
    }});
    db.user_sessions.insertOne({{
        user_id: "{user_id}",
        session_token: "{session_token}",
        expires_at: new Date(Date.now() + 7*24*60*60*1000),
        created_at: new Date()
    }});
    """
    
    result = subprocess.run(['mongosh', '--eval', mongo_script], capture_output=True, text=True)
    
    yield {
        "user_id": user_id,
        "session_token": session_token,
        "email": email
    }
    
    # Cleanup after tests
    cleanup_script = f"""
    use('classifieds_db');
    db.users.deleteOne({{ user_id: "{user_id}" }});
    db.user_sessions.deleteOne({{ session_token: "{session_token}" }});
    """
    subprocess.run(['mongosh', '--eval', cleanup_script], capture_output=True, text=True)


class TestUserLocationEndpointsUnauthenticated:
    """Tests for user location endpoints without authentication - should return 401"""
    
    def test_get_location_requires_auth(self):
        """GET /api/users/me/location without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/users/me/location")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: GET /api/users/me/location returns 401 for unauthenticated requests")
    
    def test_put_location_requires_auth(self):
        """PUT /api/users/me/location without auth should return 401"""
        location_data = {
            "default_location": {
                "country_code": "DE",
                "country_name": "Germany",
                "region_code": "BY",
                "region_name": "Bavaria", 
                "city_code": "munich",
                "city_name": "Munich",
                "location_text": "Munich, Bavaria, Germany"
            }
        }
        response = requests.put(f"{BASE_URL}/api/users/me/location", json=location_data)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: PUT /api/users/me/location returns 401 for unauthenticated requests")


class TestUserLocationEndpointsAuthenticated:
    """Tests for user location endpoints with authentication"""
    
    def test_set_default_location(self, test_user):
        """PUT /api/users/me/location should save default location"""
        location_data = {
            "default_location": {
                "country_code": "DE",
                "country_name": "Germany",
                "region_code": "BY",
                "region_name": "Bavaria",
                "city_code": "munich",
                "city_name": "Munich",
                "location_text": "Munich, Bavaria, Germany"
            }
        }
        
        headers = {"Authorization": f"Bearer {test_user['session_token']}"}
        response = requests.put(f"{BASE_URL}/api/users/me/location", json=location_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "default_location" in data, "Response should contain default_location"
        assert data["default_location"]["city_name"] == "Munich", "City name should be Munich"
        print("PASS: PUT /api/users/me/location successfully saves default location")
    
    def test_get_default_location(self, test_user):
        """GET /api/users/me/location should return saved default location"""
        # First set a location
        location_data = {
            "default_location": {
                "country_code": "FR",
                "country_name": "France",
                "region_code": "IDF",
                "region_name": "Île-de-France",
                "city_code": "paris",
                "city_name": "Paris",
                "location_text": "Paris, Île-de-France, France"
            }
        }
        
        headers = {"Authorization": f"Bearer {test_user['session_token']}"}
        
        # Set the location
        put_response = requests.put(f"{BASE_URL}/api/users/me/location", json=location_data, headers=headers)
        assert put_response.status_code == 200, f"PUT failed: {put_response.text}"
        
        # Get the location
        get_response = requests.get(f"{BASE_URL}/api/users/me/location", headers=headers)
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}: {get_response.text}"
        
        data = get_response.json()
        assert "default_location" in data, "Response should contain default_location"
        assert data["default_location"]["city_name"] == "Paris", "City name should be Paris"
        assert data["default_location"]["country_code"] == "FR", "Country code should be FR"
        print("PASS: GET /api/users/me/location returns saved default location")
    
    def test_clear_default_location(self, test_user):
        """PUT /api/users/me/location with null should clear default location"""
        headers = {"Authorization": f"Bearer {test_user['session_token']}"}
        
        # Clear location by setting it to null
        clear_data = {"default_location": None}
        put_response = requests.put(f"{BASE_URL}/api/users/me/location", json=clear_data, headers=headers)
        assert put_response.status_code == 200, f"PUT failed: {put_response.text}"
        
        data = put_response.json()
        assert data["default_location"] is None, "Default location should be null after clearing"
        
        # Verify it's cleared by getting it
        get_response = requests.get(f"{BASE_URL}/api/users/me/location", headers=headers)
        assert get_response.status_code == 200
        
        get_data = get_response.json()
        assert get_data["default_location"] is None, "GET should return null for cleared location"
        print("PASS: Default location can be cleared by setting to null")
    
    def test_update_default_location(self, test_user):
        """PUT /api/users/me/location should update existing location"""
        headers = {"Authorization": f"Bearer {test_user['session_token']}"}
        
        # Set initial location
        initial_location = {
            "default_location": {
                "country_code": "ES",
                "country_name": "Spain",
                "city_name": "Madrid",
                "location_text": "Madrid, Spain"
            }
        }
        requests.put(f"{BASE_URL}/api/users/me/location", json=initial_location, headers=headers)
        
        # Update to new location
        new_location = {
            "default_location": {
                "country_code": "IT",
                "country_name": "Italy",
                "city_name": "Rome",
                "location_text": "Rome, Italy"
            }
        }
        response = requests.put(f"{BASE_URL}/api/users/me/location", json=new_location, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["default_location"]["city_name"] == "Rome", "Location should be updated to Rome"
        assert data["default_location"]["country_code"] == "IT", "Country should be updated to Italy"
        print("PASS: Default location can be updated")


class TestUserLocationDataPersistence:
    """Tests to verify location data is properly persisted"""
    
    def test_location_persists_after_multiple_gets(self, test_user):
        """Verify location data persists correctly across multiple reads"""
        headers = {"Authorization": f"Bearer {test_user['session_token']}"}
        
        # Set location
        location = {
            "default_location": {
                "country_code": "GB",
                "country_name": "United Kingdom",
                "city_name": "London",
                "location_text": "London, UK"
            }
        }
        requests.put(f"{BASE_URL}/api/users/me/location", json=location, headers=headers)
        
        # Get multiple times to verify persistence
        for i in range(3):
            response = requests.get(f"{BASE_URL}/api/users/me/location", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert data["default_location"]["city_name"] == "London", f"Read {i+1}: City should be London"
        
        print("PASS: Location data persists correctly across multiple reads")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
