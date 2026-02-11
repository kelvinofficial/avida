"""
Test: Public User Badges API and DesktopHeader Component Integration
Tests the GET /api/profile/public/{user_id}/badges endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', '')).rstrip('/')

class TestPublicBadgesAPI:
    """Test public user badges endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_health_check(self):
        """Verify API is reachable"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✅ API health check passed")
        
    def test_login_admin(self):
        """Login as admin and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@marketplace.com",
            "password": "Admin@123456"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        self.admin_token = data["access_token"]
        self.admin_user_id = data.get("user", {}).get("user_id", data.get("user_id"))
        print(f"✅ Admin login successful, user_id: {self.admin_user_id}")
        return self.admin_token, self.admin_user_id
        
    def test_public_badges_endpoint_exists(self):
        """Test that public badges endpoint returns valid response"""
        token, user_id = self.test_login_admin()
        
        # Test with admin user_id
        response = self.session.get(f"{BASE_URL}/api/profile/public/{user_id}/badges")
        assert response.status_code == 200
        data = response.json()
        assert "badges" in data
        assert isinstance(data["badges"], list)
        print(f"✅ Public badges endpoint works, found {len(data['badges'])} badges for user")
        
    def test_public_badges_no_auth_required(self):
        """Verify endpoint is public (no auth required)"""
        # First get a valid user_id
        token, user_id = self.test_login_admin()
        
        # Now test without auth
        session_no_auth = requests.Session()
        response = session_no_auth.get(f"{BASE_URL}/api/profile/public/{user_id}/badges")
        assert response.status_code == 200
        data = response.json()
        assert "badges" in data
        print("✅ Public badges endpoint accessible without authentication")
        
    def test_public_badges_invalid_user(self):
        """Test with invalid user_id returns 404"""
        response = self.session.get(f"{BASE_URL}/api/profile/public/invalid_user_12345/badges")
        assert response.status_code == 404
        print("✅ Invalid user returns 404 as expected")
        
    def test_badge_response_structure(self):
        """Test badge response has correct structure"""
        token, user_id = self.test_login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/profile/public/{user_id}/badges")
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
            print("ℹ️ No badges found for this user (may need to award one first)")
            
    def test_badges_sorted_by_priority(self):
        """Test that badges are sorted by display_priority (descending)"""
        token, user_id = self.test_login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/profile/public/{user_id}/badges")
        assert response.status_code == 200
        data = response.json()
        
        badges = data["badges"]
        if len(badges) > 1:
            priorities = [b.get("display_priority", 0) for b in badges]
            assert priorities == sorted(priorities, reverse=True), "Badges should be sorted by display_priority descending"
            print("✅ Badges are correctly sorted by display_priority")
        else:
            print("ℹ️ Not enough badges to verify sorting")


class TestPublicProfileEndpoint:
    """Test the main public profile endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_public_profile_endpoint(self):
        """Test public profile returns user data"""
        # Login to get user_id
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@marketplace.com",
            "password": "Admin@123456"
        })
        assert response.status_code == 200
        data = response.json()
        user_id = data.get("user", {}).get("user_id", data.get("user_id"))
        
        # Get public profile
        response = self.session.get(f"{BASE_URL}/api/profile/public/{user_id}")
        assert response.status_code == 200
        profile = response.json()
        
        # Verify profile fields
        assert "name" in profile
        assert "user_id" in profile
        print(f"✅ Public profile fetched: {profile.get('name')}")


class TestBadgesCRUD:
    """Test badges CRUD for context"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Get admin auth token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@marketplace.com",
            "password": "Admin@123456"
        })
        assert response.status_code == 200
        data = response.json()
        return data["access_token"], data.get("user", {}).get("user_id", data.get("user_id"))
        
    def test_list_badges(self):
        """Test listing all badges"""
        token, _ = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/admin/badges")
        assert response.status_code == 200
        data = response.json()
        assert "badges" in data
        print(f"✅ Found {len(data['badges'])} badges in system")
        return data["badges"]
        
    def test_list_user_badges(self):
        """Test listing user badges"""
        token, _ = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/admin/badges/users")
        assert response.status_code == 200
        data = response.json()
        assert "user_badges" in data
        print(f"✅ Found {len(data['user_badges'])} user badge assignments")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
