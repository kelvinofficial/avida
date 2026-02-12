"""
Tests for Badge Milestones Router endpoints
Tests refactored badge milestone endpoints from routes/badges.py:
- GET /api/badges/milestones (requires auth)
- POST /api/badges/milestones/acknowledge (requires auth)
- GET /api/badges/share/{user_id} (public, returns 404 for non-existent)
- GET /api/badges/leaderboard (public with pagination)
- GET /api/badges/leaderboard/my-rank (requires auth)
- GET /api/health (health check still works)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestHealthEndpoint:
    """Health check endpoint tests - verify not affected by refactoring"""
    
    def test_health_check_working(self):
        """Test GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        data = response.json()
        assert "status" in data or response.status_code == 200
        print(f"✓ Health check passed: {data}")


class TestBadgeMilestonesAuthentication:
    """Tests for badge milestones endpoints requiring authentication"""
    
    def test_get_milestones_returns_401_without_auth(self):
        """Test GET /api/badges/milestones returns 401 if not authenticated"""
        response = requests.get(f"{BASE_URL}/api/badges/milestones")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"✓ GET /api/badges/milestones returns 401 without auth")
    
    def test_acknowledge_milestone_returns_401_without_auth(self):
        """Test POST /api/badges/milestones/acknowledge returns 401 if not authenticated"""
        response = requests.post(
            f"{BASE_URL}/api/badges/milestones/acknowledge",
            params={"milestone_id": "test_milestone"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"✓ POST /api/badges/milestones/acknowledge returns 401 without auth")
    
    def test_my_rank_returns_401_without_auth(self):
        """Test GET /api/badges/leaderboard/my-rank returns 401 if not authenticated"""
        response = requests.get(f"{BASE_URL}/api/badges/leaderboard/my-rank")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"✓ GET /api/badges/leaderboard/my-rank returns 401 without auth")


class TestBadgeSharePublicEndpoint:
    """Tests for public badge share endpoint"""
    
    def test_share_returns_404_for_nonexistent_user(self):
        """Test GET /api/badges/share/{user_id} returns 404 for non-existent user"""
        fake_user_id = f"nonexistent_user_{uuid.uuid4()}"
        response = requests.get(f"{BASE_URL}/api/badges/share/{fake_user_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ GET /api/badges/share/{{user_id}} returns 404 for non-existent user")
    
    def test_share_endpoint_is_public(self):
        """Test GET /api/badges/share/{user_id} is accessible without auth (returns 404 not 401)"""
        fake_user_id = f"test_{uuid.uuid4()}"
        response = requests.get(f"{BASE_URL}/api/badges/share/{fake_user_id}")
        # Should return 404 (user not found), NOT 401 (unauthorized)
        assert response.status_code != 401, f"Endpoint should be public, got 401"
        print(f"✓ /api/badges/share/{{user_id}} is a public endpoint (no auth required)")


class TestBadgeLeaderboardPublicEndpoint:
    """Tests for public badge leaderboard endpoint"""
    
    def test_leaderboard_returns_200_without_auth(self):
        """Test GET /api/badges/leaderboard returns 200 without authentication"""
        response = requests.get(f"{BASE_URL}/api/badges/leaderboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "leaderboard" in data, f"Response should contain 'leaderboard' key"
        assert "pagination" in data, f"Response should contain 'pagination' key"
        print(f"✓ GET /api/badges/leaderboard returns 200 with leaderboard and pagination")
    
    def test_leaderboard_pagination_params(self):
        """Test GET /api/badges/leaderboard supports pagination parameters"""
        response = requests.get(f"{BASE_URL}/api/badges/leaderboard", params={"page": 1, "limit": 10})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        pagination = data.get("pagination", {})
        assert pagination.get("page") == 1, f"Expected page 1, got {pagination.get('page')}"
        assert pagination.get("limit") == 10, f"Expected limit 10, got {pagination.get('limit')}"
        print(f"✓ GET /api/badges/leaderboard supports pagination: {pagination}")
    
    def test_leaderboard_pagination_limit_validation(self):
        """Test GET /api/badges/leaderboard validates limit parameter (max 50)"""
        # Test with valid limit
        response = requests.get(f"{BASE_URL}/api/badges/leaderboard", params={"page": 1, "limit": 20})
        assert response.status_code == 200, f"Expected 200 for valid limit 20, got {response.status_code}"
        
        # Test with max limit
        response = requests.get(f"{BASE_URL}/api/badges/leaderboard", params={"page": 1, "limit": 50})
        assert response.status_code == 200, f"Expected 200 for max limit 50, got {response.status_code}"
        print(f"✓ GET /api/badges/leaderboard validates limit parameter")


class TestBadgeMilestonesWithAuth:
    """Tests for badge milestones endpoints with authentication"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Setup authentication for tests"""
        # Try to login or register
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testbadges@test.com",
            "password": "Test123!"
        })
        
        if login_response.status_code == 200:
            self.auth_token = login_response.json().get("session_token") or login_response.json().get("token")
            self.user_id = login_response.json().get("user", {}).get("user_id") or login_response.json().get("user_id")
        elif login_response.status_code in [401, 404]:
            # Register new user
            register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": "testbadges@test.com",
                "password": "Test123!",
                "name": "Test Badges User"
            })
            if register_response.status_code in [200, 201]:
                self.auth_token = register_response.json().get("session_token") or register_response.json().get("token")
                self.user_id = register_response.json().get("user", {}).get("user_id") or register_response.json().get("user_id")
            else:
                self.auth_token = None
                self.user_id = None
        else:
            self.auth_token = None
            self.user_id = None
    
    def test_get_milestones_with_auth(self):
        """Test GET /api/badges/milestones with valid authentication"""
        if not self.auth_token:
            pytest.skip("Authentication not available")
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response = requests.get(f"{BASE_URL}/api/badges/milestones", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure based on routes/badges.py implementation
        assert "total_badges" in data, f"Response should contain 'total_badges'"
        assert "achieved_milestones" in data, f"Response should contain 'achieved_milestones'"
        assert "pending_milestones" in data, f"Response should contain 'pending_milestones'"
        assert "new_milestones" in data, f"Response should contain 'new_milestones'"
        print(f"✓ GET /api/badges/milestones returns milestone data with auth")
    
    def test_acknowledge_milestone_with_auth(self):
        """Test POST /api/badges/milestones/acknowledge with valid authentication"""
        if not self.auth_token:
            pytest.skip("Authentication not available")
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        # Use a valid milestone ID format from the implementation
        milestone_id = "count_1"
        
        response = requests.post(
            f"{BASE_URL}/api/badges/milestones/acknowledge",
            headers=headers,
            params={"milestone_id": milestone_id}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, f"Response should contain 'message'"
        assert "milestone_id" in data, f"Response should contain 'milestone_id'"
        print(f"✓ POST /api/badges/milestones/acknowledge works with auth")
    
    def test_my_rank_with_auth(self):
        """Test GET /api/badges/leaderboard/my-rank with valid authentication"""
        if not self.auth_token:
            pytest.skip("Authentication not available")
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response = requests.get(f"{BASE_URL}/api/badges/leaderboard/my-rank", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure based on routes/badges.py implementation
        assert "rank" in data, f"Response should contain 'rank'"
        assert "total_points" in data, f"Response should contain 'total_points'"
        assert "badge_count" in data, f"Response should contain 'badge_count'"
        assert "total_users" in data, f"Response should contain 'total_users'"
        print(f"✓ GET /api/badges/leaderboard/my-rank returns rank data with auth")
    
    def test_share_endpoint_with_existing_user(self):
        """Test GET /api/badges/share/{user_id} returns data for existing user"""
        if not self.user_id:
            pytest.skip("User ID not available")
        
        response = requests.get(f"{BASE_URL}/api/badges/share/{self.user_id}")
        # May return 200 (user exists) or 404 (user exists but no profile setup)
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            # Verify response structure based on routes/badges.py implementation
            assert "user_id" in data, f"Response should contain 'user_id'"
            assert "user_name" in data, f"Response should contain 'user_name'"
            assert "total_badges" in data, f"Response should contain 'total_badges'"
            assert "og_meta" in data, f"Response should contain 'og_meta'"
            print(f"✓ GET /api/badges/share/{{user_id}} returns profile data for existing user")
        else:
            print(f"✓ GET /api/badges/share/{{user_id}} returns 404 (user not found in DB)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
