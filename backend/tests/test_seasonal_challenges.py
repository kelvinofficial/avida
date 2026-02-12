"""
Seasonal Challenges API Tests
Tests for seasonal/event-based challenges feature (Valentine's, Black Friday, etc.)
"""
import pytest
import requests
import os
from datetime import datetime, timezone

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://classifieds-ui.preview.emergentagent.com').rstrip('/')


class TestSeasonalChallengesAPI:
    """Test seasonal challenges API endpoints"""
    
    def test_get_challenges_returns_seasonal(self):
        """GET /api/challenges should include active seasonal challenges"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "challenges" in data
        assert "total_seasonal" in data
        assert "total_weekly" in data
        assert "total_monthly" in data
        
        print(f"Total challenges: {len(data['challenges'])}")
        print(f"Seasonal: {data['total_seasonal']}, Weekly: {data['total_weekly']}, Monthly: {data['total_monthly']}")
    
    def test_valentines_challenge_active_in_february(self):
        """Valentine's Special challenge should be active Feb 1-14"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        
        # Check current date
        now = datetime.now(timezone.utc)
        print(f"Current date: {now.strftime('%Y-%m-%d')}")
        
        # If it's Feb 1-14, Valentine's should be active
        if now.month == 2 and 1 <= now.day <= 14:
            seasonal_challenges = [c for c in data['challenges'] if c['type'] == 'seasonal']
            valentines = [c for c in seasonal_challenges if c['id'] == 'valentines_special']
            
            assert len(valentines) == 1, "Valentine's Special should be active in Feb 1-14"
            valentine = valentines[0]
            
            # Verify challenge structure
            assert valentine['name'] == "Valentine's Special"
            assert valentine['type'] == 'seasonal'
            assert valentine['target'] == 5
            assert 'categories' in valentine
            assert 'fashion_beauty' in valentine['categories']
            assert 'home_furniture' in valentine['categories']
            
            # Verify badge reward
            assert 'badge_reward' in valentine
            assert valentine['badge_reward']['name'] == "Valentine's Champion"
            assert valentine['badge_reward']['points_value'] == 50
            
            # Verify date range
            assert valentine['start_date'].startswith(f"{now.year}-02-01")
            assert valentine['end_date'].startswith(f"{now.year}-02-14")
            
            print(f"✓ Valentine's Special challenge verified")
            print(f"  - Target: {valentine['target']} items")
            print(f"  - Categories: {valentine['categories']}")
            print(f"  - Days remaining: {valentine['days_remaining']}")
            print(f"  - Badge reward: {valentine['badge_reward']['name']} (+{valentine['badge_reward']['points_value']} pts)")
        else:
            print(f"Skipping Valentine's test - not in Feb 1-14 period")
    
    def test_seasonal_challenge_structure(self):
        """Verify seasonal challenges have required fields"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        
        seasonal_challenges = [c for c in data['challenges'] if c['type'] == 'seasonal']
        
        for challenge in seasonal_challenges:
            # Required fields for all challenges
            assert 'id' in challenge
            assert 'name' in challenge
            assert 'description' in challenge
            assert 'type' in challenge
            assert challenge['type'] == 'seasonal'
            assert 'target' in challenge
            assert 'icon' in challenge
            assert 'color' in challenge
            assert 'badge_reward' in challenge
            assert 'start_date' in challenge
            assert 'end_date' in challenge
            assert 'days_remaining' in challenge
            assert 'hours_remaining' in challenge
            assert 'progress' in challenge
            assert 'completed' in challenge
            assert 'joined' in challenge
            
            # Seasonal-specific fields
            assert 'theme' in challenge
            
            # Badge reward structure
            badge = challenge['badge_reward']
            assert 'name' in badge
            assert 'description' in badge
            assert 'icon' in badge
            assert 'color' in badge
            assert 'points_value' in badge
            
            print(f"✓ Seasonal challenge '{challenge['name']}' structure validated")
    
    def test_seasonal_challenges_sorted_first(self):
        """Seasonal challenges should appear before weekly/monthly"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        
        challenges = data['challenges']
        if len(challenges) == 0:
            pytest.skip("No challenges available")
        
        # Check if there are seasonal challenges
        seasonal_count = data.get('total_seasonal', 0)
        if seasonal_count > 0:
            # First N challenges should be seasonal
            for i in range(seasonal_count):
                assert challenges[i]['type'] == 'seasonal', f"Challenge {i} should be seasonal but is {challenges[i]['type']}"
            print(f"✓ {seasonal_count} seasonal challenges sorted first")
        else:
            print("No seasonal challenges currently active")
    
    def test_category_based_challenge_has_categories(self):
        """Category-based seasonal challenges should include category list"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        
        seasonal_challenges = [c for c in data['challenges'] if c['type'] == 'seasonal']
        
        # Check challenges that have categories
        for challenge in seasonal_challenges:
            if 'categories' in challenge and len(challenge['categories']) > 0:
                print(f"✓ Challenge '{challenge['name']}' has categories: {challenge['categories']}")
                # Ensure categories are valid strings
                for cat in challenge['categories']:
                    assert isinstance(cat, str)
                    assert len(cat) > 0


class TestSeasonalChallengeDateRanges:
    """Test seasonal challenge date range calculations"""
    
    def test_get_challenge_detail_for_seasonal(self):
        """GET /api/challenges/{id} should work for seasonal challenges"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        
        seasonal_challenges = [c for c in data['challenges'] if c['type'] == 'seasonal']
        
        if len(seasonal_challenges) == 0:
            pytest.skip("No seasonal challenges currently active")
        
        # Get details for first seasonal challenge
        challenge_id = seasonal_challenges[0]['id']
        detail_response = requests.get(f"{BASE_URL}/api/challenges/{challenge_id}")
        
        assert detail_response.status_code == 200
        detail = detail_response.json()
        
        # Verify detail response
        assert detail['id'] == challenge_id
        assert detail['type'] == 'seasonal'
        assert 'leaderboard' in detail
        assert 'total_participants' in detail
        
        print(f"✓ Challenge detail for '{detail['name']}' retrieved")
        print(f"  - Total participants: {detail['total_participants']}")
        print(f"  - Leaderboard entries: {len(detail['leaderboard'])}")
    
    def test_seasonal_date_calculations(self):
        """Verify seasonal challenge date ranges are correctly calculated"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        
        seasonal_challenges = [c for c in data['challenges'] if c['type'] == 'seasonal']
        
        for challenge in seasonal_challenges:
            start_date = challenge['start_date']
            end_date = challenge['end_date']
            days_remaining = challenge['days_remaining']
            
            # Parse dates
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            
            # Verify challenge is currently active (start <= now <= end)
            assert start <= now <= end, f"Challenge '{challenge['name']}' should be active but dates don't match"
            
            # Verify days remaining is non-negative
            assert days_remaining >= 0
            
            print(f"✓ Challenge '{challenge['name']}' date range verified: {start.date()} to {end.date()}, {days_remaining} days left")


class TestSeasonalChallengeJoin:
    """Test joining seasonal challenges (requires authentication)"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token by registering/logging in"""
        # Try to register
        register_data = {
            "email": "seasonal_test@example.com",
            "password": "Test123!",
            "name": "Seasonal Test User"
        }
        
        # Try login first (in case user exists)
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": register_data["email"],
            "password": register_data["password"]
        })
        
        if login_response.status_code == 200:
            return login_response.json().get("token")
        
        # If login fails, try register
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        if register_response.status_code in [200, 201]:
            return register_response.json().get("token")
        
        pytest.skip("Could not authenticate for join test")
    
    def test_join_seasonal_challenge_requires_auth(self):
        """POST /api/challenges/{id}/join without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        
        seasonal_challenges = [c for c in data['challenges'] if c['type'] == 'seasonal']
        
        if len(seasonal_challenges) == 0:
            pytest.skip("No seasonal challenges currently active")
        
        challenge_id = seasonal_challenges[0]['id']
        
        # Try to join without auth
        join_response = requests.post(f"{BASE_URL}/api/challenges/{challenge_id}/join")
        
        # Should return 401 or redirect
        assert join_response.status_code in [401, 403], f"Expected 401/403, got {join_response.status_code}"
        print(f"✓ Join without auth correctly rejected with status {join_response.status_code}")
    
    def test_join_seasonal_challenge_with_auth(self, auth_token):
        """POST /api/challenges/{id}/join with auth should succeed"""
        if not auth_token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        
        seasonal_challenges = [c for c in data['challenges'] if c['type'] == 'seasonal']
        
        if len(seasonal_challenges) == 0:
            pytest.skip("No seasonal challenges currently active")
        
        challenge_id = seasonal_challenges[0]['id']
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Join the challenge
        join_response = requests.post(
            f"{BASE_URL}/api/challenges/{challenge_id}/join",
            headers=headers
        )
        
        # Should succeed or indicate already joined
        assert join_response.status_code in [200, 201, 400], f"Got {join_response.status_code}"
        print(f"✓ Join seasonal challenge response: {join_response.status_code}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
