"""
Test Profile Router Module
Tests the refactored profile endpoints extracted from server.py to routes/profile.py

Endpoints tested:
- GET /api/profile - returns 401 if not authenticated
- PUT /api/profile - returns 401 if not authenticated
- GET /api/profile/public/{user_id} - returns 404 for non-existent user
- GET /api/profile/public/{user_id}/badges - returns empty badges or 404 for non-existent user
- GET /api/profile/activity/favorites - returns 401 if not authenticated
- DELETE /api/profile/activity/recently-viewed - returns 401 if not authenticated
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://category-classifier-1.preview.emergentagent.com')


class TestProfileUnauthenticated:
    """Tests for profile endpoints that require authentication - should return 401"""

    def test_get_profile_unauthenticated(self):
        """GET /api/profile should return 401 if not authenticated"""
        response = requests.get(f"{BASE_URL}/api/profile")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data or "error" in data, "Response should contain error detail"
        print(f"PASS: GET /api/profile returns 401 for unauthenticated user")

    def test_put_profile_unauthenticated(self):
        """PUT /api/profile should return 401 if not authenticated"""
        response = requests.put(
            f"{BASE_URL}/api/profile",
            json={"name": "Test User"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data or "error" in data, "Response should contain error detail"
        print(f"PASS: PUT /api/profile returns 401 for unauthenticated user")

    def test_get_favorites_unauthenticated(self):
        """GET /api/profile/activity/favorites should return 401 if not authenticated"""
        response = requests.get(f"{BASE_URL}/api/profile/activity/favorites")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data or "error" in data, "Response should contain error detail"
        print(f"PASS: GET /api/profile/activity/favorites returns 401 for unauthenticated user")

    def test_delete_recently_viewed_unauthenticated(self):
        """DELETE /api/profile/activity/recently-viewed should return 401 if not authenticated"""
        response = requests.delete(f"{BASE_URL}/api/profile/activity/recently-viewed")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data or "error" in data, "Response should contain error detail"
        print(f"PASS: DELETE /api/profile/activity/recently-viewed returns 401 for unauthenticated user")


class TestPublicProfile:
    """Tests for public profile endpoints - no auth required"""

    def test_get_public_profile_nonexistent_user(self):
        """GET /api/profile/public/{user_id} should return 404 for non-existent user"""
        fake_user_id = f"nonexistent_user_{uuid.uuid4()}"
        response = requests.get(f"{BASE_URL}/api/profile/public/{fake_user_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data or "error" in data, "Response should contain error detail"
        print(f"PASS: GET /api/profile/public/{fake_user_id} returns 404 for non-existent user")

    def test_get_public_badges_nonexistent_user(self):
        """GET /api/profile/public/{user_id}/badges should return 404 for non-existent user"""
        fake_user_id = f"nonexistent_user_{uuid.uuid4()}"
        response = requests.get(f"{BASE_URL}/api/profile/public/{fake_user_id}/badges")
        # Should return 404 since user doesn't exist and has no listings
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"PASS: GET /api/profile/public/{fake_user_id}/badges returns 404 for non-existent user")


class TestHealthAndChallenges:
    """Tests for other endpoints to ensure the router didn't break existing functionality"""

    def test_health_endpoint(self):
        """GET /api/health should still work after refactoring"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "healthy", f"Expected healthy status, got {data}"
        print(f"PASS: GET /api/health returns healthy status")

    def test_challenges_endpoint(self):
        """GET /api/challenges should still work after refactoring"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "challenges" in data, f"Expected challenges in response, got {data.keys()}"
        print(f"PASS: GET /api/challenges returns challenges list")


class TestProfileAuthenticated:
    """Tests for authenticated profile endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for testing"""
        # First try to register a test user
        test_email = f"test_profile_{uuid.uuid4().hex[:8]}@test.com"
        test_password = "Test123!"
        
        # Register
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": test_password,
                "name": "Test Profile User"
            }
        )
        
        if register_response.status_code == 201:
            token = register_response.json().get("session_token") or register_response.json().get("token")
            if token:
                return token
        
        # If registration fails (user may exist), try login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "testadmin@test.com",
                "password": "Test123!"
            }
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("session_token") or login_response.json().get("token")
            if token:
                return token
        
        pytest.skip("Could not obtain authentication token")

    def test_get_profile_authenticated(self, auth_token):
        """GET /api/profile should return user profile when authenticated"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/profile", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Profile should have user_id and stats
        assert "user_id" in data or "email" in data, f"Expected user data, got {data.keys()}"
        print(f"PASS: GET /api/profile returns user profile for authenticated user")

    def test_put_profile_authenticated(self, auth_token):
        """PUT /api/profile should update profile when authenticated"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        update_data = {
            "name": "Updated Test Name",
            "bio": "Test bio updated"
        }
        response = requests.put(f"{BASE_URL}/api/profile", headers=headers, json=update_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data or "user" in data, f"Expected success response, got {data.keys()}"
        print(f"PASS: PUT /api/profile updates profile for authenticated user")

    def test_get_favorites_authenticated(self, auth_token):
        """GET /api/profile/activity/favorites should return favorites for authenticated user"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/profile/activity/favorites", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "items" in data, f"Expected items in response, got {data.keys()}"
        print(f"PASS: GET /api/profile/activity/favorites returns favorites list")

    def test_delete_recently_viewed_authenticated(self, auth_token):
        """DELETE /api/profile/activity/recently-viewed should clear history for authenticated user"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.delete(f"{BASE_URL}/api/profile/activity/recently-viewed", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, f"Expected message in response, got {data.keys()}"
        print(f"PASS: DELETE /api/profile/activity/recently-viewed clears history")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
