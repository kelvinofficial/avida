"""
Test Suite for Iteration 89 Features:
1. Main Backend: GET /api/streaks/my-streak - User's challenge completion streak
2. Main Backend: GET /api/badges/past-seasonal - Past seasonal badges gallery
3. Admin Backend: GET /api/admin/challenges - List custom challenges
4. Admin Backend: POST /api/admin/challenges - Create custom challenge
5. Admin Backend: GET /api/admin/challenges/stats/overview - Challenge stats
6. Admin Backend: GET /api/admin/leaderboard - Badge leaderboard management
7. Admin Backend: GET /api/admin/analytics/sellers - Seller analytics
8. Admin Backend: GET /api/admin/analytics/engagement - Engagement analytics
9. Admin Backend: GET /api/admin/analytics/platform - Platform analytics
"""

import pytest
import requests
import uuid
import os
from datetime import datetime, timedelta

# Base URLs from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://quick-sell-15.preview.emergentagent.com').rstrip('/')

# Admin dashboard runs on port 8002 internally
ADMIN_BASE_URL = BASE_URL  # Using same external URL with /api/admin prefix

# Test data
TEST_USER_EMAIL = f"test_user_{uuid.uuid4().hex[:8]}@example.com"
TEST_USER_PASSWORD = "Test123!"
TEST_ADMIN_EMAIL = f"test_admin_{uuid.uuid4().hex[:8]}@example.com"
TEST_ADMIN_PASSWORD = "AdminTest123!"


class TestMainBackendStreaks:
    """Test streak tracking endpoints on main backend"""
    
    @pytest.fixture
    def auth_token(self):
        """Create test user and get auth token"""
        # Register test user
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD,
                "name": "Test Streak User"
            }
        )
        
        if register_response.status_code == 200:
            return register_response.json().get("session_token") or register_response.json().get("token")
        
        # If already exists, try login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            }
        )
        
        if login_response.status_code == 200:
            return login_response.json().get("session_token") or login_response.json().get("token")
        
        pytest.skip(f"Could not authenticate test user: {login_response.text}")
    
    def test_get_my_streak_authenticated(self, auth_token):
        """Test GET /api/streaks/my-streak with authentication"""
        response = requests.get(
            f"{BASE_URL}/api/streaks/my-streak",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "current_streak" in data, "Response should contain current_streak"
        assert "longest_streak" in data, "Response should contain longest_streak"
        assert "total_completions" in data, "Response should contain total_completions"
        assert "streak_bonus_points" in data, "Response should contain streak_bonus_points"
        
        # Verify data types
        assert isinstance(data["current_streak"], int), "current_streak should be int"
        assert isinstance(data["longest_streak"], int), "longest_streak should be int"
        assert isinstance(data["total_completions"], int), "total_completions should be int"
        
        print(f"✓ User streak data: current={data['current_streak']}, longest={data['longest_streak']}")
    
    def test_get_my_streak_unauthenticated(self):
        """Test GET /api/streaks/my-streak without authentication returns 401"""
        response = requests.get(f"{BASE_URL}/api/streaks/my-streak")
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("✓ Unauthenticated request correctly returned 401")
    
    def test_streak_has_next_badge_info(self, auth_token):
        """Test that streak response includes next badge information"""
        response = requests.get(
            f"{BASE_URL}/api/streaks/my-streak",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # If user has less than 10 streak, there should be a next badge
        if data["current_streak"] < 10:
            assert "next_streak_badge" in data, "Should have next_streak_badge for users with <10 streak"
            if data["next_streak_badge"]:
                assert "threshold" in data["next_streak_badge"], "next_streak_badge should have threshold"
                assert "name" in data["next_streak_badge"], "next_streak_badge should have name"
                # Valid names are Hot Streak (3), On Fire (5), Unstoppable (10)
                assert data["next_streak_badge"]["name"] in ["Hot Streak", "On Fire", "Unstoppable"]
                print(f"✓ Next badge: {data['next_streak_badge']['name']} at {data['next_streak_badge']['threshold']} streak")


class TestMainBackendPastSeasonalBadges:
    """Test past seasonal badges gallery endpoint"""
    
    def test_get_past_seasonal_badges(self):
        """Test GET /api/badges/past-seasonal returns badges"""
        response = requests.get(f"{BASE_URL}/api/badges/past-seasonal")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "badges" in data, "Response should contain badges array"
        assert "pagination" in data, "Response should contain pagination"
        assert "available_years" in data, "Response should contain available_years"
        
        # Verify pagination structure
        pagination = data["pagination"]
        assert "page" in pagination, "Pagination should have page"
        assert "limit" in pagination, "Pagination should have limit"
        assert "total" in pagination, "Pagination should have total"
        
        print(f"✓ Found {len(data['badges'])} past seasonal badges")
        print(f"✓ Available years: {data['available_years']}")
    
    def test_past_seasonal_badges_with_year_filter(self):
        """Test GET /api/badges/past-seasonal with year filter"""
        current_year = datetime.now().year
        
        response = requests.get(
            f"{BASE_URL}/api/badges/past-seasonal",
            params={"year": current_year}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "badges" in data
        print(f"✓ Badges for year {current_year}: {len(data['badges'])}")
    
    def test_past_seasonal_badges_pagination(self):
        """Test pagination works correctly"""
        response = requests.get(
            f"{BASE_URL}/api/badges/past-seasonal",
            params={"page": 1, "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["badges"]) <= 5, "Should respect limit parameter"
        assert data["pagination"]["limit"] == 5, "Pagination should reflect requested limit"
        print("✓ Pagination works correctly")


class TestAdminBackendChallenges:
    """Test admin challenge management endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        # Use the known test admin credentials
        login_response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={
                "email": "testadmin89@test.com",
                "password": "TestAdmin123!"
            }
        )
        
        if login_response.status_code == 200:
            return login_response.json().get("access_token")
        
        pytest.skip(f"Could not authenticate admin: {login_response.text}")
    
    def test_get_admin_challenges(self, admin_token):
        """Test GET /api/admin/challenges - list custom challenges"""
        response = requests.get(
            f"{BASE_URL}/api/admin/challenges",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "challenges" in data, "Response should contain challenges array"
        assert "pagination" in data, "Response should contain pagination"
        
        # Verify pagination structure
        pagination = data["pagination"]
        assert "page" in pagination
        assert "limit" in pagination
        assert "total" in pagination
        assert "pages" in pagination
        
        print(f"✓ Found {len(data['challenges'])} custom challenges, total: {pagination['total']}")
    
    def test_create_admin_challenge(self, admin_token):
        """Test POST /api/admin/challenges - create custom challenge"""
        challenge_data = {
            "name": f"Test Challenge {uuid.uuid4().hex[:6]}",
            "description": "A test challenge for automated testing",
            "type": "seasonal",
            "criteria": "listings_created",
            "target": 10,
            "categories": ["electronics", "fashion"],
            "start_date": datetime.utcnow().isoformat() + "Z",
            "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z",
            "badge_name": "Test Challenge Badge",
            "badge_description": "Awarded for completing test challenge",
            "badge_icon": "star",
            "badge_color": "#FFD700",
            "badge_points": 100,
            "theme": "gold",
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/challenges",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=challenge_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "challenge_id" in data, "Response should contain challenge_id"
        assert data["challenge_id"].startswith("custom_"), "Challenge ID should start with 'custom_'"
        
        print(f"✓ Created challenge: {data['challenge_id']}")
        return data["challenge_id"]
    
    def test_get_challenges_stats_overview(self, admin_token):
        """Test GET /api/admin/challenges/stats/overview"""
        response = requests.get(
            f"{BASE_URL}/api/admin/challenges/stats/overview",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify expected fields
        expected_fields = [
            "total_custom_challenges", "active_challenges", "currently_running",
            "total_participants", "total_completions", "completion_rate",
            "recent_activity", "top_challenges"
        ]
        
        for field in expected_fields:
            assert field in data, f"Response should contain {field}"
        
        # Verify recent_activity structure
        assert "joins_last_7_days" in data["recent_activity"]
        assert "completions_last_7_days" in data["recent_activity"]
        
        print(f"✓ Challenge stats: {data['total_custom_challenges']} total, {data['active_challenges']} active")
        print(f"✓ Participants: {data['total_participants']}, Completions: {data['total_completions']}")
    
    def test_get_admin_challenges_unauthenticated(self):
        """Test that admin endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/challenges")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin endpoint correctly requires authentication")


class TestAdminBackendLeaderboard:
    """Test admin leaderboard management endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        login_response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={
                "email": "testadmin89@test.com",
                "password": "TestAdmin123!"
            }
        )
        
        if login_response.status_code == 200:
            return login_response.json().get("access_token")
        
        pytest.skip("Could not authenticate admin")
    
    def test_get_admin_leaderboard(self, admin_token):
        """Test GET /api/admin/leaderboard"""
        response = requests.get(
            f"{BASE_URL}/api/admin/leaderboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "leaderboard" in data, "Response should contain leaderboard array"
        assert "pagination" in data, "Response should contain pagination"
        
        # If there are users on leaderboard, verify structure
        if data["leaderboard"]:
            user = data["leaderboard"][0]
            expected_fields = ["rank", "user_id", "user_name", "badge_count"]
            for field in expected_fields:
                assert field in user, f"Leaderboard entry should contain {field}"
        
        print(f"✓ Leaderboard: {len(data['leaderboard'])} users")
    
    def test_get_admin_leaderboard_pagination(self, admin_token):
        """Test leaderboard pagination"""
        response = requests.get(
            f"{BASE_URL}/api/admin/leaderboard",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"page": 1, "limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["pagination"]["limit"] == 10
        assert len(data["leaderboard"]) <= 10
        print("✓ Leaderboard pagination works correctly")


class TestAdminBackendAnalytics:
    """Test admin analytics endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        login_response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={
                "email": "testadmin89@test.com",
                "password": "TestAdmin123!"
            }
        )
        
        if login_response.status_code == 200:
            return login_response.json().get("access_token")
        
        pytest.skip("Could not authenticate admin")
    
    def test_get_seller_analytics(self, admin_token):
        """Test GET /api/admin/analytics/sellers"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/sellers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify expected fields
        expected_fields = ["top_sellers", "active_sellers", "new_sellers", "seller_growth", "metrics"]
        for field in expected_fields:
            assert field in data, f"Response should contain {field}"
        
        # Verify metrics structure
        metrics = data["metrics"]
        assert "average_sale_price" in metrics
        assert "total_transactions" in metrics
        assert "total_volume" in metrics
        
        print(f"✓ Seller analytics: {data['active_sellers']} active sellers")
        print(f"✓ Metrics: avg price={metrics['average_sale_price']}, volume={metrics['total_volume']}")
    
    def test_get_engagement_analytics(self, admin_token):
        """Test GET /api/admin/analytics/engagement"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/engagement",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify expected fields
        expected_fields = ["messages", "favorites", "active_users", "badges", "notifications"]
        for field in expected_fields:
            assert field in data, f"Response should contain {field}"
        
        # Verify nested structures
        assert "total" in data["messages"]
        assert "trend" in data["messages"]
        assert "earned" in data["badges"]
        assert "challenges_joined" in data["badges"]
        assert "sent" in data["notifications"]
        assert "read_rate" in data["notifications"]
        
        print(f"✓ Engagement analytics: {data['active_users']} active users")
        print(f"✓ Messages: {data['messages']['total']}, Badges earned: {data['badges']['earned']}")
    
    def test_get_platform_analytics(self, admin_token):
        """Test GET /api/admin/analytics/platform"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/platform",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify expected fields
        expected_fields = ["users", "listings"]
        for field in expected_fields:
            assert field in data, f"Response should contain {field}"
        
        # Verify users structure
        users = data["users"]
        assert "total" in users
        assert "new" in users
        assert "verified" in users
        
        # Verify listings structure
        listings = data["listings"]
        assert "total" in listings
        assert "active" in listings
        
        print(f"✓ Platform analytics: {users['total']} users, {listings['total']} listings")
    
    def test_analytics_with_days_param(self, admin_token):
        """Test analytics endpoints with custom days parameter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/sellers",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"days": 7}
        )
        
        assert response.status_code == 200
        print("✓ Analytics endpoints accept days parameter")


# Run basic health check first
class TestHealthCheck:
    """Basic health checks for both backends"""
    
    def test_main_backend_health(self):
        """Test main backend is reachable"""
        response = requests.get(f"{BASE_URL}/api/health")
        
        if response.status_code == 404:
            # Try alternative health endpoint
            response = requests.get(f"{BASE_URL}/api/categories")
        
        assert response.status_code == 200, f"Main backend not healthy: {response.status_code}"
        print("✓ Main backend is healthy")
    
    def test_admin_backend_health(self):
        """Test admin backend is reachable"""
        # Try login endpoint to verify admin backend works
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": "test@test.com", "password": "wrong"}
        )
        
        # Should return 401 (unauthorized), not 404 or connection error
        assert response.status_code in [401, 400], f"Admin backend not responding correctly: {response.status_code}"
        print("✓ Admin backend is healthy")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
