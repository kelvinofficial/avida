"""
Test Badge Challenges Router Extraction
Tests the badge challenges functionality extracted from server.py to routes/badge_challenges.py
Includes: seasonal challenges, weekly/monthly challenges, challenge joining, progress tracking, 
streak management, and badge awarding.
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://seo-performance-10.preview.emergentagent.com').rstrip('/')


class TestBadgeChallengesSetup:
    """Setup tests to verify the router is properly loaded."""
    
    def test_health_check(self):
        """Verify API is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ API health check passed: {data}")
    
    def test_challenges_endpoint_accessible(self):
        """Verify /challenges endpoint is accessible (public)"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        assert "challenges" in data
        assert "total_weekly" in data
        assert "total_monthly" in data
        assert "total_seasonal" in data
        print(f"✓ Challenges endpoint accessible with {len(data['challenges'])} challenges")


class TestChallengesEndpoint:
    """Test GET /challenges - List all active challenges"""
    
    def test_get_all_challenges(self):
        """GET /challenges returns all active challenges"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "challenges" in data
        assert isinstance(data["challenges"], list)
        assert len(data["challenges"]) > 0
        
        # Verify counts
        assert data["total_weekly"] == 3  # weekend_warrior, weekly_seller, listing_sprint
        assert data["total_monthly"] == 4  # monthly_top_seller, inventory_king, high_value_month, community_connector
        # Seasonal varies by date
        assert data["total_seasonal"] >= 0
        
        print(f"✓ GET /challenges returned {len(data['challenges'])} challenges")
        print(f"  - Weekly: {data['total_weekly']}, Monthly: {data['total_monthly']}, Seasonal: {data['total_seasonal']}")
    
    def test_weekly_challenges_present(self):
        """Verify weekly challenges are present"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        
        weekly_ids = [c["id"] for c in data["challenges"] if c["type"] == "weekly"]
        expected_weekly = ["weekend_warrior", "weekly_seller", "listing_sprint"]
        
        for challenge_id in expected_weekly:
            assert challenge_id in weekly_ids, f"Missing weekly challenge: {challenge_id}"
        
        print(f"✓ All expected weekly challenges present: {weekly_ids}")
    
    def test_monthly_challenges_present(self):
        """Verify monthly challenges are present"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        
        monthly_ids = [c["id"] for c in data["challenges"] if c["type"] == "monthly"]
        expected_monthly = ["monthly_top_seller", "inventory_king", "high_value_month", "community_connector"]
        
        for challenge_id in expected_monthly:
            assert challenge_id in monthly_ids, f"Missing monthly challenge: {challenge_id}"
        
        print(f"✓ All expected monthly challenges present: {monthly_ids}")
    
    def test_seasonal_challenge_february(self):
        """Verify Valentine's seasonal challenge is active in February"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        
        # Check if currently February
        now = datetime.utcnow()
        if now.month == 2 and now.day <= 14:
            seasonal_ids = [c["id"] for c in data["challenges"] if c["type"] == "seasonal"]
            assert "valentines_special" in seasonal_ids, "Valentine's challenge should be active in February 1-14"
            print(f"✓ Valentine's seasonal challenge active: {seasonal_ids}")
        else:
            print(f"⚠ Skipping Valentine's test - current month is not February 1-14")
    
    def test_challenge_structure(self):
        """Verify challenge data structure"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        
        # Check first challenge structure
        challenge = data["challenges"][0]
        required_fields = ["id", "name", "description", "type", "target", "icon", "color", 
                          "badge_reward", "start_date", "end_date", "days_remaining", 
                          "progress", "completed", "joined"]
        
        for field in required_fields:
            assert field in challenge, f"Missing field: {field}"
        
        # Verify badge_reward structure
        badge_reward = challenge["badge_reward"]
        badge_fields = ["name", "description", "icon", "color", "points_value"]
        for field in badge_fields:
            assert field in badge_reward, f"Missing badge_reward field: {field}"
        
        print(f"✓ Challenge structure verified with all required fields")


class TestChallengeDetailsEndpoint:
    """Test GET /challenges/{challenge_id} - Challenge details with leaderboard"""
    
    def test_get_challenge_details(self):
        """GET /challenges/{id} returns challenge details"""
        challenge_ids = ["weekend_warrior", "weekly_seller", "monthly_top_seller"]
        
        for challenge_id in challenge_ids:
            response = requests.get(f"{BASE_URL}/api/challenges/{challenge_id}")
            assert response.status_code == 200
            data = response.json()
            
            assert data["id"] == challenge_id
            assert "name" in data
            assert "description" in data
            assert "leaderboard" in data
            assert "total_participants" in data
            assert isinstance(data["leaderboard"], list)
            
            print(f"✓ Challenge details for '{challenge_id}': {data['name']}")
    
    def test_get_seasonal_challenge_details(self):
        """GET /challenges/valentines_special returns seasonal challenge details"""
        response = requests.get(f"{BASE_URL}/api/challenges/valentines_special")
        
        # May return 404 if not in date range
        if response.status_code == 200:
            data = response.json()
            assert data["id"] == "valentines_special"
            assert data["type"] == "seasonal"
            assert "theme" in data or data.get("type") == "seasonal"
            print(f"✓ Valentine's challenge details: {data.get('name', 'N/A')}")
        else:
            print(f"⚠ Valentine's challenge may not be active currently")
    
    def test_nonexistent_challenge_404(self):
        """GET /challenges/nonexistent returns 404"""
        response = requests.get(f"{BASE_URL}/api/challenges/nonexistent_challenge_xyz")
        assert response.status_code == 404
        print("✓ Nonexistent challenge returns 404")


class TestAuthenticatedEndpoints:
    """Test authenticated badge challenge endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Create test user and get auth token"""
        unique_id = str(uuid.uuid4())[:8]
        self.test_email = f"TEST_badge_user_{unique_id}@test.com"
        
        # Register user
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": self.test_email,
                "password": "TestPass123!",
                "name": "TEST Badge User"
            }
        )
        
        if register_response.status_code == 200:
            data = register_response.json()
            self.session_token = data.get("session_token")
            self.user_id = data.get("user", {}).get("user_id")
        else:
            # Try login if already exists
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": self.test_email, "password": "TestPass123!"}
            )
            if login_response.status_code == 200:
                data = login_response.json()
                self.session_token = data.get("session_token")
                self.user_id = data.get("user", {}).get("user_id")
            else:
                pytest.skip("Failed to authenticate test user")
        
        self.auth_headers = {"Authorization": f"Bearer {self.session_token}"}
    
    def test_get_my_challenge_progress(self):
        """GET /challenges/my-progress returns user's challenge progress"""
        response = requests.get(
            f"{BASE_URL}/api/challenges/my-progress",
            headers=self.auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "challenges" in data
        assert "summary" in data
        assert isinstance(data["challenges"], list)
        
        # Verify summary structure
        summary = data["summary"]
        assert "total" in summary
        assert "completed" in summary
        assert "in_progress" in summary
        assert "not_started" in summary
        
        print(f"✓ My progress: {len(data['challenges'])} challenges tracked")
        print(f"  Summary: total={summary['total']}, completed={summary['completed']}")
    
    def test_get_my_streak(self):
        """GET /streaks/my-streak returns user's streak"""
        response = requests.get(
            f"{BASE_URL}/api/streaks/my-streak",
            headers=self.auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "current_streak" in data
        assert "longest_streak" in data
        assert "total_completions" in data
        assert "streak_bonus_points" in data
        
        print(f"✓ My streak: current={data['current_streak']}, longest={data['longest_streak']}")


class TestJoinChallengeEndpoint:
    """Test POST /challenges/{challenge_id}/join"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Create test user for join tests"""
        unique_id = str(uuid.uuid4())[:8]
        self.test_email = f"TEST_join_user_{unique_id}@test.com"
        
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": self.test_email,
                "password": "TestPass123!",
                "name": "TEST Join User"
            }
        )
        
        if register_response.status_code == 200:
            data = register_response.json()
            self.session_token = data.get("session_token")
        else:
            pytest.skip("Failed to create test user")
        
        self.auth_headers = {"Authorization": f"Bearer {self.session_token}"}
    
    def test_join_challenge(self):
        """POST /challenges/{id}/join creates participation record"""
        # Join a weekly challenge
        response = requests.post(
            f"{BASE_URL}/api/challenges/listing_sprint/join",
            headers=self.auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["joined"] == True
        assert "progress" in data
        assert "target" in data
        
        print(f"✓ Joined challenge: progress={data['progress']}/{data['target']}")
    
    def test_join_challenge_twice(self):
        """Joining same challenge twice returns already joined message"""
        # First join
        requests.post(
            f"{BASE_URL}/api/challenges/inventory_king/join",
            headers=self.auth_headers
        )
        
        # Second join attempt
        response = requests.post(
            f"{BASE_URL}/api/challenges/inventory_king/join",
            headers=self.auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["joined"] == True
        assert "Already joined" in data.get("message", "")
        
        print("✓ Re-joining returns 'already joined' message")
    
    def test_join_nonexistent_challenge_404(self):
        """Joining nonexistent challenge returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/challenges/nonexistent_xyz/join",
            headers=self.auth_headers
        )
        assert response.status_code == 404
        print("✓ Joining nonexistent challenge returns 404")
    
    def test_join_challenge_requires_auth(self):
        """Joining challenge requires authentication"""
        response = requests.post(f"{BASE_URL}/api/challenges/weekend_warrior/join")
        assert response.status_code == 401
        print("✓ Join challenge requires authentication")


class TestPastSeasonalBadges:
    """Test GET /badges/past-seasonal endpoint"""
    
    def test_get_past_seasonal_badges(self):
        """GET /badges/past-seasonal returns badge gallery"""
        response = requests.get(f"{BASE_URL}/api/badges/past-seasonal")
        assert response.status_code == 200
        data = response.json()
        
        assert "badges" in data
        assert "available_years" in data
        assert "pagination" in data
        
        # Verify pagination structure
        pagination = data["pagination"]
        assert "page" in pagination
        assert "limit" in pagination
        assert "total" in pagination
        assert "pages" in pagination
        
        print(f"✓ Past seasonal badges: {len(data['badges'])} badges found")
        print(f"  Available years: {data['available_years']}")
    
    def test_past_seasonal_badges_with_year_filter(self):
        """GET /badges/past-seasonal?year=2025 filters by year"""
        response = requests.get(f"{BASE_URL}/api/badges/past-seasonal?year=2025")
        assert response.status_code == 200
        data = response.json()
        
        assert "badges" in data
        print(f"✓ Filtered past seasonal badges for 2025: {len(data['badges'])} badges")
    
    def test_past_seasonal_badges_pagination(self):
        """GET /badges/past-seasonal supports pagination"""
        response = requests.get(f"{BASE_URL}/api/badges/past-seasonal?page=1&limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["limit"] == 5
        
        print("✓ Past seasonal badges pagination works")


class TestStreakLeaderboard:
    """Test GET /streaks/leaderboard endpoint"""
    
    def test_get_streak_leaderboard(self):
        """GET /streaks/leaderboard returns public leaderboard"""
        response = requests.get(f"{BASE_URL}/api/streaks/leaderboard")
        assert response.status_code == 200
        data = response.json()
        
        assert "leaderboard" in data
        assert "pagination" in data
        assert isinstance(data["leaderboard"], list)
        
        print(f"✓ Streak leaderboard: {len(data['leaderboard'])} entries")
    
    def test_streak_leaderboard_pagination(self):
        """GET /streaks/leaderboard supports pagination"""
        response = requests.get(f"{BASE_URL}/api/streaks/leaderboard?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["limit"] == 10
        
        print("✓ Streak leaderboard pagination works")


class TestChallengeProgressCalculation:
    """Test challenge progress calculation"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Create test user"""
        unique_id = str(uuid.uuid4())[:8]
        self.test_email = f"TEST_progress_user_{unique_id}@test.com"
        
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": self.test_email,
                "password": "TestPass123!",
                "name": "TEST Progress User"
            }
        )
        
        if register_response.status_code == 200:
            data = register_response.json()
            self.session_token = data.get("session_token")
        else:
            pytest.skip("Failed to create test user")
        
        self.auth_headers = {"Authorization": f"Bearer {self.session_token}"}
    
    def test_progress_starts_at_zero(self):
        """New user's challenge progress starts at zero"""
        response = requests.get(
            f"{BASE_URL}/api/challenges/my-progress",
            headers=self.auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # All challenges should have progress=0 for new user
        for challenge in data["challenges"]:
            assert challenge["progress"] == 0
            assert challenge["percentage"] == 0
            assert challenge["completed"] == False
        
        print(f"✓ New user progress starts at 0 for all {len(data['challenges'])} challenges")
    
    def test_challenge_percentage_calculation(self):
        """Challenge percentage is calculated correctly"""
        response = requests.get(
            f"{BASE_URL}/api/challenges/my-progress",
            headers=self.auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for challenge in data["challenges"]:
            expected_percentage = min(100, int((challenge["progress"] / challenge["target"]) * 100))
            assert challenge["percentage"] == expected_percentage
        
        print("✓ Challenge percentage calculation verified")


class TestChallengeTypes:
    """Test challenge type definitions and configurations"""
    
    def test_challenge_types_valid(self):
        """All challenges have valid type"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        
        valid_types = ["weekly", "monthly", "seasonal", "special"]
        for challenge in data["challenges"]:
            assert challenge["type"] in valid_types, f"Invalid type: {challenge['type']}"
        
        print("✓ All challenges have valid types")
    
    def test_challenge_targets_positive(self):
        """All challenges have positive targets"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        
        for challenge in data["challenges"]:
            assert challenge["target"] > 0, f"Challenge {challenge['id']} has non-positive target"
        
        print("✓ All challenges have positive targets")
    
    def test_challenge_dates_valid(self):
        """All challenges have valid date ranges"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        
        for challenge in data["challenges"]:
            start = challenge["start_date"]
            end = challenge["end_date"]
            assert start is not None
            assert end is not None
            # End should be after start (string comparison works for ISO dates)
            assert end >= start, f"Challenge {challenge['id']} has invalid date range"
        
        print("✓ All challenges have valid date ranges")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
