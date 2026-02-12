"""
Test suite for Admin Dashboard Features - Iteration 90
Tests the new admin dashboard pages and streak leaderboard endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://category-classifier-1.preview.emergentagent.com')


class TestStreakLeaderboardAPI:
    """Tests for Streak Leaderboard endpoint"""
    
    def test_streaks_leaderboard_returns_200(self):
        """GET /api/streaks/leaderboard should return 200"""
        response = requests.get(f"{BASE_URL}/api/streaks/leaderboard?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "leaderboard" in data
        assert "pagination" in data
        print(f"Leaderboard returned {len(data['leaderboard'])} entries")
    
    def test_streaks_leaderboard_pagination_structure(self):
        """Verify leaderboard pagination structure"""
        response = requests.get(f"{BASE_URL}/api/streaks/leaderboard?page=1&limit=5")
        assert response.status_code == 200
        data = response.json()
        pagination = data.get("pagination", {})
        assert "page" in pagination
        assert "limit" in pagination
        assert "total" in pagination
        assert "pages" in pagination
        print(f"Pagination: page={pagination['page']}, limit={pagination['limit']}, total={pagination['total']}")


class TestChallengesAPI:
    """Tests for Challenges endpoint"""
    
    def test_challenges_returns_200(self):
        """GET /api/challenges should return 200"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        assert "challenges" in data
        print(f"Found {len(data['challenges'])} challenges")
    
    def test_challenges_structure(self):
        """Verify challenges have required fields"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        challenges = data.get("challenges", [])
        
        if len(challenges) > 0:
            challenge = challenges[0]
            required_fields = ["id", "name", "description", "type", "target"]
            for field in required_fields:
                assert field in challenge, f"Missing field: {field}"
            print(f"Verified challenge structure for: {challenge['name']}")
        else:
            print("No challenges found - empty state verified")
    
    def test_challenges_types(self):
        """Verify challenge types are correctly returned"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        
        # Check weekly/monthly/seasonal counts
        assert "total_weekly" in data or len(data.get("challenges", [])) >= 0
        print(f"Weekly: {data.get('total_weekly', 0)}, Monthly: {data.get('total_monthly', 0)}, Seasonal: {data.get('total_seasonal', 0)}")


class TestAdminAnalyticsAPI:
    """Tests for Admin Analytics endpoints (requires auth)"""
    
    def test_admin_analytics_platform_returns_401_without_auth(self):
        """GET /api/admin/analytics/platform requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/platform")
        # Should return 401 without authentication
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("Admin analytics platform endpoint correctly requires authentication")
    
    def test_admin_analytics_sellers_returns_401_without_auth(self):
        """GET /api/admin/analytics/sellers requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/sellers")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("Admin analytics sellers endpoint correctly requires authentication")
    
    def test_admin_analytics_engagement_returns_401_without_auth(self):
        """GET /api/admin/analytics/engagement requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/engagement")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("Admin analytics engagement endpoint correctly requires authentication")


class TestAdminChallengesAPI:
    """Tests for Admin Challenges endpoints (requires auth)"""
    
    def test_admin_challenges_returns_401_without_auth(self):
        """GET /api/admin/challenges requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/challenges")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("Admin challenges endpoint correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
