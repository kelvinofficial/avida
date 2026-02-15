"""
Test Badge Notification API Endpoints
- GET /api/badges/unviewed-count
- POST /api/badges/mark-viewed
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://classifieds-ui-fix.preview.emergentagent.com').rstrip('/')

class TestBadgeNotificationAPIs:
    """Test badge notification endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Register a test user if needed, then login
        test_email = "badge_test_user@example.com"
        test_password = "Test123!"
        
        # Try to login first
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": test_password
        })
        
        if login_response.status_code != 200:
            # Register the user
            register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
                "email": test_email,
                "password": test_password,
                "name": "Badge Test User"
            })
            print(f"Register response: {register_response.status_code}")
            
            # Login again
            login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": test_password
            })
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("session_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.auth_token = token
                print(f"Successfully authenticated with token")
            else:
                print(f"Login response: {data}")
                self.auth_token = None
        else:
            print(f"Login failed: {login_response.status_code} - {login_response.text}")
            self.auth_token = None
            
    def test_get_unviewed_badge_count_authenticated(self):
        """Test GET /api/badges/unviewed-count returns count for authenticated user"""
        if not hasattr(self, 'auth_token') or not self.auth_token:
            pytest.skip("Authentication failed - skipping test")
            
        response = self.session.get(f"{BASE_URL}/api/badges/unviewed-count")
        print(f"GET /api/badges/unviewed-count response: {response.status_code}")
        print(f"Response body: {response.text[:500] if response.text else 'Empty'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "unviewed_count" in data, "Response should have 'unviewed_count' field"
        assert isinstance(data["unviewed_count"], int), "unviewed_count should be an integer"
        assert data["unviewed_count"] >= 0, "unviewed_count should be non-negative"
        print(f"Unviewed badge count: {data['unviewed_count']}")
    
    def test_get_unviewed_badge_count_unauthenticated(self):
        """Test GET /api/badges/unviewed-count returns 401 for unauthenticated user"""
        # Create new session without auth
        unauth_session = requests.Session()
        response = unauth_session.get(f"{BASE_URL}/api/badges/unviewed-count")
        print(f"Unauthenticated GET /api/badges/unviewed-count response: {response.status_code}")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_mark_badges_as_viewed(self):
        """Test POST /api/badges/mark-viewed marks all badges as viewed"""
        if not hasattr(self, 'auth_token') or not self.auth_token:
            pytest.skip("Authentication failed - skipping test")
        
        # First get unviewed count
        get_response = self.session.get(f"{BASE_URL}/api/badges/unviewed-count")
        initial_count = get_response.json().get("unviewed_count", 0)
        print(f"Initial unviewed count: {initial_count}")
        
        # Mark all badges as viewed
        response = self.session.post(f"{BASE_URL}/api/badges/mark-viewed", json={})
        print(f"POST /api/badges/mark-viewed response: {response.status_code}")
        print(f"Response body: {response.text[:500] if response.text else 'Empty'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data, "Response should have 'message' field"
        
        # Verify count is now 0
        get_response_after = self.session.get(f"{BASE_URL}/api/badges/unviewed-count")
        final_count = get_response_after.json().get("unviewed_count", -1)
        print(f"Final unviewed count after marking viewed: {final_count}")
        
        assert final_count == 0, f"Expected 0 unviewed badges after marking viewed, got {final_count}"
    
    def test_mark_badges_as_viewed_unauthenticated(self):
        """Test POST /api/badges/mark-viewed returns 401 for unauthenticated user"""
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        response = unauth_session.post(f"{BASE_URL}/api/badges/mark-viewed", json={})
        print(f"Unauthenticated POST /api/badges/mark-viewed response: {response.status_code}")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_mark_specific_badges_as_viewed(self):
        """Test POST /api/badges/mark-viewed with specific badge_ids"""
        if not hasattr(self, 'auth_token') or not self.auth_token:
            pytest.skip("Authentication failed - skipping test")
        
        # Test with specific badge IDs (even if they don't exist, endpoint should not error)
        response = self.session.post(f"{BASE_URL}/api/badges/mark-viewed", json={
            "badge_ids": ["test_badge_1", "test_badge_2"]
        })
        print(f"POST /api/badges/mark-viewed with specific IDs response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
