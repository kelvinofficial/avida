"""
Test: Public User Badges API and Public Profile Badges
Tests the GET /api/profile/public/{user_id}/badges endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', '')).rstrip('/')

class TestPublicBadgesAPI:
    """Test public user badges endpoint - no authentication required"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Get a user_id from listings for testing
        response = self.session.get(f"{BASE_URL}/api/listings?limit=1")
        if response.status_code == 200:
            listings = response.json().get('listings', [])
            if listings:
                self.test_user_id = listings[0].get('user_id')
            else:
                self.test_user_id = None
        else:
            self.test_user_id = None
        
    def test_health_check(self):
        """Verify API is reachable"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✅ API health check passed")
        
    def test_public_badges_endpoint_exists(self):
        """Test that public badges endpoint returns valid response"""
        if not self.test_user_id:
            pytest.skip("No user_id found to test with")
            
        response = self.session.get(f"{BASE_URL}/api/profile/public/{self.test_user_id}/badges")
        assert response.status_code == 200
        data = response.json()
        assert "badges" in data
        assert isinstance(data["badges"], list)
        print(f"✅ Public badges endpoint works, found {len(data['badges'])} badges for user")
        
    def test_public_badges_no_auth_required(self):
        """Verify endpoint is public (no auth required)"""
        if not self.test_user_id:
            pytest.skip("No user_id found to test with")
            
        # Use a fresh session without any auth
        session_no_auth = requests.Session()
        response = session_no_auth.get(f"{BASE_URL}/api/profile/public/{self.test_user_id}/badges")
        assert response.status_code == 200
        data = response.json()
        assert "badges" in data
        print("✅ Public badges endpoint accessible without authentication")
        
    def test_public_badges_invalid_user(self):
        """Test with invalid user_id returns 404"""
        response = self.session.get(f"{BASE_URL}/api/profile/public/invalid_user_12345/badges")
        assert response.status_code == 404
        print("✅ Invalid user returns 404 as expected")

    def test_badge_response_structure_if_has_badges(self):
        """Test badge response structure if user has badges"""
        if not self.test_user_id:
            pytest.skip("No user_id found to test with")
            
        response = self.session.get(f"{BASE_URL}/api/profile/public/{self.test_user_id}/badges")
        assert response.status_code == 200
        data = response.json()
        
        # If badges exist, verify structure
        if data["badges"]:
            badge = data["badges"][0]
            # Verify badge fields
            assert "id" in badge
            assert "name" in badge
            assert "icon" in badge
            assert "color" in badge
            assert "display_priority" in badge
            print(f"✅ Badge structure verified: {badge['name']}")
        else:
            print("ℹ️ No badges found for this user (user may not have any badges)")


class TestPublicProfileEndpoint:
    """Test the main public profile endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Get a user_id from listings for testing
        response = self.session.get(f"{BASE_URL}/api/listings?limit=1")
        if response.status_code == 200:
            listings = response.json().get('listings', [])
            if listings:
                self.test_user_id = listings[0].get('user_id')
            else:
                self.test_user_id = None
        else:
            self.test_user_id = None
        
    def test_public_profile_endpoint(self):
        """Test public profile returns user data"""
        if not self.test_user_id:
            pytest.skip("No user_id found to test with")
            
        # Get public profile (no auth needed)
        response = self.session.get(f"{BASE_URL}/api/profile/public/{self.test_user_id}")
        assert response.status_code == 200
        profile = response.json()
        
        # Verify profile fields
        assert "name" in profile
        assert "user_id" in profile
        print(f"✅ Public profile fetched: {profile.get('name')}")


class TestAuthenticatedBadgesFlow:
    """Test badges with authenticated user (using cookie auth)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_register_and_check_badges(self):
        """Register a user and check their badges"""
        import uuid
        unique_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@123456",
            "name": "Test User"
        })
        
        if response.status_code == 400 and "already registered" in response.text:
            # User exists, try to login
            pytest.skip("User already registered, skipping")
        
        assert response.status_code == 200
        data = response.json()
        user_id = data.get("user", {}).get("user_id")
        assert user_id is not None
        print(f"✅ User registered: {user_id}")
        
        # Check their public badges
        response = self.session.get(f"{BASE_URL}/api/profile/public/{user_id}/badges")
        assert response.status_code == 200
        data = response.json()
        assert "badges" in data
        print(f"✅ New user has {len(data['badges'])} badges (expected 0)")


class TestPublicProfileBadgesEndpointStructure:
    """Validate the structure of the public badges API response"""
    
    def test_endpoint_returns_json(self):
        """Ensure endpoint returns JSON"""
        session = requests.Session()
        # Use any user_id
        response = session.get(f"{BASE_URL}/api/profile/public/user_test123/badges")
        # Should return JSON even for 404
        assert response.headers.get('content-type', '').startswith('application/json')
        print("✅ Endpoint returns JSON content type")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
