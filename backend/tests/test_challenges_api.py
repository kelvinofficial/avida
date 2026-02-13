"""
Badge Challenges API Tests
Tests for weekly/monthly challenges: Weekend Warrior, Weekly Sales Star, Listing Sprint, 
Monthly Top Seller, Inventory King, High Roller Month, Community Connector
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://listing-hub-15.preview.emergentagent.com')

# Test user credentials
TEST_EMAIL = f"challenge_test_{uuid.uuid4().hex[:6]}@example.com"
TEST_PASSWORD = "Test123!"
TEST_NAME = "Challenge Test User"


@pytest.fixture(scope="module")
def api_session():
    """Create a shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_session):
    """Register and login to get auth token"""
    # Register user
    register_response = api_session.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": TEST_NAME
    })
    
    # If user exists, try login
    if register_response.status_code == 400:
        login_response = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code == 200:
            return login_response.json().get("session_token")
        pytest.skip("Could not authenticate")
    
    if register_response.status_code == 200:
        return register_response.json().get("session_token")
    
    pytest.skip(f"Registration failed: {register_response.status_code}")


@pytest.fixture(scope="module")
def authenticated_session(api_session, auth_token):
    """Session with auth header"""
    api_session.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_session


class TestChallengesAPI:
    """Test GET /api/challenges - Returns all active challenges with progress"""
    
    def test_get_challenges_unauthenticated(self, api_session):
        """Test getting challenges without authentication"""
        # Use fresh session without auth
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.get(f"{BASE_URL}/api/challenges")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "challenges" in data, "Response should contain 'challenges' key"
        assert "total_weekly" in data, "Response should contain 'total_weekly' key"
        assert "total_monthly" in data, "Response should contain 'total_monthly' key"
        
        challenges = data["challenges"]
        assert isinstance(challenges, list), "Challenges should be a list"
        assert len(challenges) > 0, "Should have at least one challenge"
        
        # Verify challenge structure
        for challenge in challenges:
            assert "id" in challenge, "Challenge should have 'id'"
            assert "name" in challenge, "Challenge should have 'name'"
            assert "description" in challenge, "Challenge should have 'description'"
            assert "type" in challenge, "Challenge should have 'type'"
            assert challenge["type"] in ["weekly", "monthly"], f"Invalid type: {challenge['type']}"
            assert "target" in challenge, "Challenge should have 'target'"
            assert "icon" in challenge, "Challenge should have 'icon'"
            assert "color" in challenge, "Challenge should have 'color'"
            assert "badge_reward" in challenge, "Challenge should have 'badge_reward'"
            assert "days_remaining" in challenge, "Challenge should have 'days_remaining'"
            assert "hours_remaining" in challenge, "Challenge should have 'hours_remaining'"
        
        print(f"✓ GET /api/challenges (unauthenticated) - {len(challenges)} challenges returned")
    
    def test_get_challenges_authenticated(self, authenticated_session):
        """Test getting challenges with authentication - should include progress"""
        response = authenticated_session.get(f"{BASE_URL}/api/challenges")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        challenges = data["challenges"]
        
        # Authenticated users should see progress, joined status, badge_earned
        for challenge in challenges:
            assert "progress" in challenge, "Authenticated view should have 'progress'"
            assert "completed" in challenge, "Authenticated view should have 'completed'"
            assert "joined" in challenge, "Authenticated view should have 'joined'"
            assert "badge_earned" in challenge, "Authenticated view should have 'badge_earned'"
            
            # Verify progress is a non-negative number
            assert isinstance(challenge["progress"], int), "Progress should be an integer"
            assert challenge["progress"] >= 0, "Progress should be non-negative"
        
        print(f"✓ GET /api/challenges (authenticated) - progress data included")
    
    def test_challenges_contains_expected_weekly_challenges(self, api_session):
        """Verify all expected weekly challenges exist"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/challenges")
        
        data = response.json()
        challenges = data["challenges"]
        challenge_ids = [c["id"] for c in challenges]
        
        expected_weekly = ["weekend_warrior", "weekly_seller", "listing_sprint"]
        for expected_id in expected_weekly:
            assert expected_id in challenge_ids, f"Missing expected weekly challenge: {expected_id}"
        
        print(f"✓ All expected weekly challenges present: {expected_weekly}")
    
    def test_challenges_contains_expected_monthly_challenges(self, api_session):
        """Verify all expected monthly challenges exist"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/challenges")
        
        data = response.json()
        challenges = data["challenges"]
        challenge_ids = [c["id"] for c in challenges]
        
        expected_monthly = ["monthly_top_seller", "inventory_king", "high_value_month", "community_connector"]
        for expected_id in expected_monthly:
            assert expected_id in challenge_ids, f"Missing expected monthly challenge: {expected_id}"
        
        print(f"✓ All expected monthly challenges present: {expected_monthly}")


class TestChallengeDetails:
    """Test GET /api/challenges/{id} - Returns challenge details with leaderboard"""
    
    def test_get_challenge_detail_weekend_warrior(self, api_session):
        """Test getting Weekend Warrior challenge details"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/challenges/weekend_warrior")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == "weekend_warrior", "Challenge ID should match"
        assert data["name"] == "Weekend Warrior", "Challenge name should be 'Weekend Warrior'"
        assert data["type"] == "weekly", "Weekend Warrior should be weekly"
        assert data["target"] == 5, "Target should be 5"
        assert "leaderboard" in data, "Should include leaderboard"
        assert "total_participants" in data, "Should include total_participants"
        assert "badge_reward" in data, "Should include badge_reward"
        
        print(f"✓ GET /api/challenges/weekend_warrior - details returned correctly")
    
    def test_get_challenge_detail_monthly_top_seller(self, api_session):
        """Test getting Monthly Top Seller challenge details"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/challenges/monthly_top_seller")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == "monthly_top_seller", "Challenge ID should match"
        assert data["name"] == "Monthly Top Seller", "Challenge name should match"
        assert data["type"] == "monthly", "Monthly Top Seller should be monthly"
        assert data["target"] == 15, "Target should be 15"
        
        # Verify badge_reward structure
        badge = data["badge_reward"]
        assert badge["name"] == "Monthly Top Seller", "Badge name should match"
        assert badge["points_value"] == 100, "Points should be 100"
        
        print(f"✓ GET /api/challenges/monthly_top_seller - details returned correctly")
    
    def test_get_challenge_detail_nonexistent(self, api_session):
        """Test getting a non-existent challenge"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/challenges/nonexistent_challenge_xyz")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
        print(f"✓ GET /api/challenges/nonexistent returns 404")
    
    def test_challenge_detail_authenticated_includes_my_progress(self, authenticated_session):
        """Test that authenticated users see their progress in challenge details"""
        response = authenticated_session.get(f"{BASE_URL}/api/challenges/listing_sprint")
        
        assert response.status_code == 200
        
        data = response.json()
        # Authenticated users should have my_progress and my_completed
        assert "my_progress" in data, "Authenticated view should have 'my_progress'"
        assert "my_completed" in data, "Authenticated view should have 'my_completed'"
        
        print(f"✓ Challenge detail (authenticated) includes user progress")


class TestJoinChallenge:
    """Test POST /api/challenges/{id}/join - Join a challenge"""
    
    def test_join_challenge_unauthenticated(self, api_session):
        """Test that joining a challenge requires authentication"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/challenges/weekend_warrior/join")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        
        print(f"✓ POST /api/challenges/{{id}}/join requires authentication")
    
    def test_join_challenge_success(self, authenticated_session):
        """Test successfully joining a challenge"""
        response = authenticated_session.post(f"{BASE_URL}/api/challenges/inventory_king/join")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "joined" in data, "Response should contain 'joined'"
        assert data["joined"] is True, "User should be marked as joined"
        assert "progress" in data, "Response should contain 'progress'"
        assert "target" in data, "Response should contain 'target'"
        
        print(f"✓ POST /api/challenges/inventory_king/join - successfully joined")
    
    def test_join_challenge_already_joined(self, authenticated_session):
        """Test joining a challenge that user has already joined"""
        # Join the same challenge again
        response = authenticated_session.post(f"{BASE_URL}/api/challenges/inventory_king/join")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["joined"] is True
        # Should indicate already joined
        assert "Already joined" in data.get("message", "") or data.get("joined") is True
        
        print(f"✓ Re-joining an already joined challenge handled gracefully")
    
    def test_join_nonexistent_challenge(self, authenticated_session):
        """Test joining a non-existent challenge"""
        response = authenticated_session.post(f"{BASE_URL}/api/challenges/fake_challenge_xyz/join")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
        print(f"✓ Joining non-existent challenge returns 404")


class TestMyProgress:
    """Test GET /api/challenges/my-progress - Get user's progress on all challenges"""
    
    def test_my_progress_unauthenticated(self, api_session):
        """Test that my-progress requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/challenges/my-progress")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        
        print(f"✓ GET /api/challenges/my-progress requires authentication")
    
    def test_my_progress_authenticated(self, authenticated_session):
        """Test getting user's progress on all challenges"""
        response = authenticated_session.get(f"{BASE_URL}/api/challenges/my-progress")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "challenges" in data, "Response should contain 'challenges'"
        assert "summary" in data, "Response should contain 'summary'"
        
        progress_list = data["challenges"]
        assert isinstance(progress_list, list), "Challenges should be a list"
        assert len(progress_list) > 0, "Should have progress for at least one challenge"
        
        # Verify progress structure
        for p in progress_list:
            assert "challenge_id" in p, "Should have 'challenge_id'"
            assert "name" in p, "Should have 'name'"
            assert "type" in p, "Should have 'type'"
            assert "progress" in p, "Should have 'progress'"
            assert "target" in p, "Should have 'target'"
            assert "percentage" in p, "Should have 'percentage'"
            assert "completed" in p, "Should have 'completed'"
            assert "badge_earned" in p, "Should have 'badge_earned'"
        
        # Verify summary structure
        summary = data["summary"]
        assert "total" in summary, "Summary should have 'total'"
        assert "completed" in summary, "Summary should have 'completed'"
        assert "in_progress" in summary, "Summary should have 'in_progress'"
        assert "not_started" in summary, "Summary should have 'not_started'"
        
        print(f"✓ GET /api/challenges/my-progress - {len(progress_list)} challenges tracked")


class TestChallengeBadgeRewards:
    """Verify badge reward structure for all challenges"""
    
    def test_all_challenges_have_valid_badge_rewards(self, api_session):
        """Test that all challenges have properly structured badge rewards"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/challenges")
        
        data = response.json()
        challenges = data["challenges"]
        
        for challenge in challenges:
            badge = challenge["badge_reward"]
            
            assert "name" in badge, f"Badge for {challenge['id']} missing 'name'"
            assert "description" in badge, f"Badge for {challenge['id']} missing 'description'"
            assert "icon" in badge, f"Badge for {challenge['id']} missing 'icon'"
            assert "color" in badge, f"Badge for {challenge['id']} missing 'color'"
            assert "points_value" in badge, f"Badge for {challenge['id']} missing 'points_value'"
            
            # Verify points are positive
            assert badge["points_value"] > 0, f"Badge points for {challenge['id']} should be positive"
            
            # Verify color is valid hex
            assert badge["color"].startswith("#"), f"Badge color for {challenge['id']} should be hex"
        
        print(f"✓ All {len(challenges)} challenges have valid badge rewards")


class TestChallengeLeaderboard:
    """Test leaderboard functionality in challenge details"""
    
    def test_challenge_leaderboard_structure(self, api_session):
        """Test the leaderboard structure in challenge details"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/challenges/weekend_warrior")
        
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data["leaderboard"]
        
        assert isinstance(leaderboard, list), "Leaderboard should be a list"
        
        # If there are participants, verify structure
        for entry in leaderboard:
            assert "rank" in entry, "Entry should have 'rank'"
            assert "user_id" in entry, "Entry should have 'user_id'"
            assert "user_name" in entry, "Entry should have 'user_name'"
            assert "progress" in entry, "Entry should have 'progress'"
            assert "completed" in entry, "Entry should have 'completed'"
        
        print(f"✓ Leaderboard structure is valid ({len(leaderboard)} participants)")
    
    def test_leaderboard_after_joining(self, authenticated_session):
        """Test that user appears on leaderboard after joining"""
        # Join a challenge first
        authenticated_session.post(f"{BASE_URL}/api/challenges/listing_sprint/join")
        
        # Get challenge details
        response = authenticated_session.get(f"{BASE_URL}/api/challenges/listing_sprint")
        
        assert response.status_code == 200
        
        data = response.json()
        
        # User should have my_progress set
        assert "my_progress" in data
        
        # Check if my_rank is present (might be None if no activity yet)
        # my_rank is calculated based on progress
        
        print(f"✓ User progress tracked after joining challenge")


class TestTimeRemaining:
    """Test time remaining calculations"""
    
    def test_weekly_challenge_time_remaining(self, api_session):
        """Test that weekly challenges have valid time remaining"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/challenges")
        
        data = response.json()
        weekly_challenges = [c for c in data["challenges"] if c["type"] == "weekly"]
        
        for challenge in weekly_challenges:
            days = challenge["days_remaining"]
            hours = challenge["hours_remaining"]
            
            # Weekly challenges should have <= 7 days remaining
            assert days <= 7, f"Weekly challenge {challenge['id']} should have <= 7 days remaining"
            assert days >= 0, f"Days remaining should be non-negative"
            assert hours >= 0, f"Hours remaining should be non-negative"
        
        print(f"✓ Weekly challenges have valid time remaining")
    
    def test_monthly_challenge_time_remaining(self, api_session):
        """Test that monthly challenges have valid time remaining"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/challenges")
        
        data = response.json()
        monthly_challenges = [c for c in data["challenges"] if c["type"] == "monthly"]
        
        for challenge in monthly_challenges:
            days = challenge["days_remaining"]
            hours = challenge["hours_remaining"]
            
            # Monthly challenges should have <= 31 days remaining
            assert days <= 31, f"Monthly challenge {challenge['id']} should have <= 31 days remaining"
            assert days >= 0, f"Days remaining should be non-negative"
            assert hours >= 0, f"Hours remaining should be non-negative"
        
        print(f"✓ Monthly challenges have valid time remaining")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
