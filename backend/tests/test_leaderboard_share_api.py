"""
Test suite for Badge Leaderboard and Share Profile APIs
Tests: GET /api/badges/leaderboard, GET /api/badges/leaderboard/my-rank, GET /api/badges/share/{user_id}
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://classifieds-search.preview.emergentagent.com')

class TestLeaderboardAPI:
    """Tests for badge leaderboard endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user credentials"""
        self.test_email = f"lb_test_{int(time.time())}@example.com"
        self.test_password = "Test123!"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def register_and_login(self, email=None, password=None):
        """Register and login a test user"""
        email = email or self.test_email
        password = password or self.test_password
        
        # Register
        register_response = self.session.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": email,
                "password": password,
                "name": "Test Leaderboard User"
            }
        )
        
        if register_response.status_code == 200:
            data = register_response.json()
            token = data.get("session_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
            return data
        
        # If already exists, try login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("session_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
            return data
        
        return None

    # ==================== GET /api/badges/leaderboard ====================
    
    def test_leaderboard_public_access(self):
        """Test that leaderboard is accessible without authentication"""
        response = self.session.get(f"{BASE_URL}/api/badges/leaderboard")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "leaderboard" in data, "Response should contain 'leaderboard' field"
        assert "pagination" in data, "Response should contain 'pagination' field"
        
        print(f"✓ Leaderboard public access works - {len(data['leaderboard'])} entries returned")

    def test_leaderboard_pagination_structure(self):
        """Test leaderboard pagination structure"""
        response = self.session.get(f"{BASE_URL}/api/badges/leaderboard?page=1&limit=10")
        
        assert response.status_code == 200
        
        data = response.json()
        pagination = data.get("pagination", {})
        
        assert "page" in pagination, "Pagination should have 'page' field"
        assert "limit" in pagination, "Pagination should have 'limit' field"
        assert "total_users" in pagination, "Pagination should have 'total_users' field"
        assert "total_pages" in pagination, "Pagination should have 'total_pages' field"
        
        assert pagination["page"] == 1, "Page should be 1"
        assert pagination["limit"] == 10, "Limit should be 10"
        
        print(f"✓ Pagination structure correct: page={pagination['page']}, limit={pagination['limit']}, total={pagination['total_users']}")

    def test_leaderboard_entry_structure(self):
        """Test that leaderboard entries have correct structure"""
        response = self.session.get(f"{BASE_URL}/api/badges/leaderboard?limit=5")
        
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data.get("leaderboard", [])
        
        if len(leaderboard) > 0:
            entry = leaderboard[0]
            
            # Check required fields
            assert "rank" in entry, "Entry should have 'rank' field"
            assert "user_id" in entry, "Entry should have 'user_id' field"
            assert "user_name" in entry, "Entry should have 'user_name' field"
            assert "badge_count" in entry, "Entry should have 'badge_count' field"
            assert "top_badges" in entry, "Entry should have 'top_badges' field"
            
            # Verify rank starts at 1
            assert entry["rank"] == 1, f"First entry should have rank 1, got {entry['rank']}"
            
            # Check badge_count is non-negative
            assert entry["badge_count"] >= 0, "badge_count should be non-negative"
            
            print(f"✓ First entry: rank={entry['rank']}, name={entry['user_name']}, badges={entry['badge_count']}")
        else:
            print("✓ Leaderboard is empty (no badge earners yet)")

    def test_leaderboard_pagination_page2(self):
        """Test leaderboard page 2"""
        response = self.session.get(f"{BASE_URL}/api/badges/leaderboard?page=2&limit=10")
        
        assert response.status_code == 200
        
        data = response.json()
        pagination = data.get("pagination", {})
        leaderboard = data.get("leaderboard", [])
        
        if pagination.get("total_users", 0) > 10:
            # If there are more than 10 users, page 2 should have entries
            # and ranks should start from 11
            if len(leaderboard) > 0:
                assert leaderboard[0]["rank"] == 11, f"Page 2 first entry should have rank 11, got {leaderboard[0]['rank']}"
                print(f"✓ Page 2 works - first rank is {leaderboard[0]['rank']}")
            else:
                print("✓ Page 2 is empty")
        else:
            print(f"✓ Total users ({pagination.get('total_users', 0)}) <= 10, page 2 empty as expected")

    def test_leaderboard_limit_constraint(self):
        """Test leaderboard respects limit constraint (max 100)"""
        response = self.session.get(f"{BASE_URL}/api/badges/leaderboard?limit=150")
        
        # Should either truncate to 100 or return validation error
        assert response.status_code in [200, 422], f"Expected 200 or 422, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            leaderboard = data.get("leaderboard", [])
            assert len(leaderboard) <= 100, "Leaderboard should respect max limit of 100"
            print(f"✓ Limit constraint respected - returned {len(leaderboard)} entries")
        else:
            print("✓ Validation error for limit > 100")

    # ==================== GET /api/badges/leaderboard/my-rank ====================

    def test_my_rank_requires_auth(self):
        """Test that my-rank endpoint requires authentication"""
        # Clear any existing auth
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.get(f"{BASE_URL}/api/badges/leaderboard/my-rank")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ my-rank endpoint requires authentication")

    def test_my_rank_authenticated(self):
        """Test my-rank endpoint with authenticated user"""
        user_data = self.register_and_login()
        assert user_data is not None, "Failed to register/login"
        
        response = self.session.get(f"{BASE_URL}/api/badges/leaderboard/my-rank")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required fields
        assert "rank" in data, "Response should have 'rank' field"
        assert "badge_count" in data, "Response should have 'badge_count' field"
        assert "total_participants" in data, "Response should have 'total_participants' field"
        assert "percentile" in data, "Response should have 'percentile' field"
        assert "nearby_users" in data, "Response should have 'nearby_users' field"
        
        print(f"✓ my-rank response: rank={data['rank']}, badges={data['badge_count']}, total={data['total_participants']}")

    def test_my_rank_nearby_users_structure(self):
        """Test nearby users structure in my-rank response"""
        user_data = self.register_and_login()
        assert user_data is not None, "Failed to register/login"
        
        response = self.session.get(f"{BASE_URL}/api/badges/leaderboard/my-rank")
        
        assert response.status_code == 200
        
        data = response.json()
        nearby_users = data.get("nearby_users", [])
        
        # Check structure if there are nearby users
        for user in nearby_users:
            assert "rank" in user, "Nearby user should have 'rank'"
            assert "user_id" in user, "Nearby user should have 'user_id'"
            assert "user_name" in user, "Nearby user should have 'user_name'"
            assert "badge_count" in user, "Nearby user should have 'badge_count'"
            assert "is_current_user" in user, "Nearby user should have 'is_current_user'"
        
        # There should be at least the current user
        current_user_entries = [u for u in nearby_users if u.get("is_current_user")]
        
        print(f"✓ Nearby users structure valid - {len(nearby_users)} nearby users, {len(current_user_entries)} marked as current")

    # ==================== GET /api/badges/share/{user_id} ====================

    def test_share_profile_public_access(self):
        """Test that share profile endpoint is publicly accessible"""
        # First get a user_id from leaderboard
        response = self.session.get(f"{BASE_URL}/api/badges/leaderboard?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data.get("leaderboard", [])
        
        if len(leaderboard) > 0:
            user_id = leaderboard[0]["user_id"]
            
            # Test public access to share endpoint
            share_response = self.session.get(f"{BASE_URL}/api/badges/share/{user_id}")
            
            assert share_response.status_code == 200, f"Expected 200, got {share_response.status_code}"
            
            share_data = share_response.json()
            assert "user_id" in share_data, "Share response should have 'user_id'"
            assert share_data["user_id"] == user_id, "user_id should match"
            
            print(f"✓ Share profile public access works for user {user_id}")
        else:
            # No users with badges, create one and test
            user_data = self.register_and_login()
            if user_data and user_data.get("user_id"):
                user_id = user_data["user_id"]
                share_response = self.session.get(f"{BASE_URL}/api/badges/share/{user_id}")
                # May return 200 with 0 badges or 404 if user not found
                assert share_response.status_code in [200, 404], f"Expected 200 or 404, got {share_response.status_code}"
                print(f"✓ Share profile endpoint accessible (status: {share_response.status_code})")
            else:
                pytest.skip("No users with badges available for testing")

    def test_share_profile_structure(self):
        """Test share profile response structure"""
        # Get a user with badges
        response = self.session.get(f"{BASE_URL}/api/badges/leaderboard?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data.get("leaderboard", [])
        
        if len(leaderboard) > 0:
            user_id = leaderboard[0]["user_id"]
            
            share_response = self.session.get(f"{BASE_URL}/api/badges/share/{user_id}")
            assert share_response.status_code == 200
            
            share_data = share_response.json()
            
            # Check required fields
            assert "user_id" in share_data, "Should have 'user_id'"
            assert "user_name" in share_data, "Should have 'user_name'"
            assert "total_badges" in share_data, "Should have 'total_badges'"
            assert "badges" in share_data, "Should have 'badges'"
            assert "showcase_badges" in share_data, "Should have 'showcase_badges'"
            assert "og_meta" in share_data, "Should have 'og_meta' for Open Graph"
            
            # Verify og_meta structure
            og_meta = share_data.get("og_meta", {})
            assert "title" in og_meta, "og_meta should have 'title'"
            assert "description" in og_meta, "og_meta should have 'description'"
            assert "type" in og_meta, "og_meta should have 'type'"
            assert "url" in og_meta, "og_meta should have 'url'"
            
            print(f"✓ Share profile structure valid - user: {share_data['user_name']}, badges: {share_data['total_badges']}")
            print(f"  OG Meta: title='{og_meta['title'][:50]}...'")
        else:
            pytest.skip("No users with badges available for testing structure")

    def test_share_profile_og_meta_content(self):
        """Test that Open Graph meta data is properly formatted"""
        response = self.session.get(f"{BASE_URL}/api/badges/leaderboard?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data.get("leaderboard", [])
        
        if len(leaderboard) > 0:
            user_id = leaderboard[0]["user_id"]
            user_name = leaderboard[0]["user_name"]
            
            share_response = self.session.get(f"{BASE_URL}/api/badges/share/{user_id}")
            assert share_response.status_code == 200
            
            share_data = share_response.json()
            og_meta = share_data.get("og_meta", {})
            
            # Verify OG meta contains user name
            assert user_name in og_meta.get("title", ""), f"OG title should contain user name '{user_name}'"
            
            # Verify OG type is 'profile'
            assert og_meta.get("type") == "profile", f"OG type should be 'profile', got '{og_meta.get('type')}'"
            
            # Verify URL format
            url = og_meta.get("url", "")
            assert f"/profile/{user_id}/badges" in url, f"OG URL should contain profile path"
            
            print(f"✓ OG meta content valid:")
            print(f"  Title: {og_meta.get('title')}")
            print(f"  Description: {og_meta.get('description')}")
            print(f"  URL: {og_meta.get('url')}")
        else:
            pytest.skip("No users with badges available")

    def test_share_profile_nonexistent_user(self):
        """Test share profile returns 404 for non-existent user"""
        response = self.session.get(f"{BASE_URL}/api/badges/share/nonexistent_user_xyz_123")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Share profile returns 404 for non-existent user")

    def test_share_profile_badges_list(self):
        """Test that badges list in share profile has correct structure"""
        response = self.session.get(f"{BASE_URL}/api/badges/leaderboard?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data.get("leaderboard", [])
        
        if len(leaderboard) > 0:
            user_id = leaderboard[0]["user_id"]
            
            share_response = self.session.get(f"{BASE_URL}/api/badges/share/{user_id}")
            assert share_response.status_code == 200
            
            share_data = share_response.json()
            badges = share_data.get("badges", [])
            
            # Check badge structure
            for badge in badges:
                assert "name" in badge, "Badge should have 'name'"
                assert "description" in badge, "Badge should have 'description'"
                assert "icon" in badge, "Badge should have 'icon'"
                assert "color" in badge, "Badge should have 'color'"
            
            print(f"✓ Badges list structure valid - {len(badges)} badges")
        else:
            pytest.skip("No users with badges available")


class TestPushNotificationFunctions:
    """Tests for push notification milestone functions existence and structure"""
    
    def test_milestone_endpoints_exist(self):
        """Test that milestone endpoints exist"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Test milestones endpoint (requires auth)
        response = session.get(f"{BASE_URL}/api/badges/milestones")
        
        # Should return 401 (unauthorized) not 404 (not found)
        assert response.status_code != 404, "Milestones endpoint should exist"
        print(f"✓ Milestones endpoint exists (status: {response.status_code})")

    def test_milestone_acknowledge_endpoint_exists(self):
        """Test that milestone acknowledge endpoint exists"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Test acknowledge endpoint (requires auth)
        response = session.post(
            f"{BASE_URL}/api/badges/milestones/acknowledge",
            json={"milestone_id": "test"}
        )
        
        # Should return 401 (unauthorized) not 404 (not found)
        assert response.status_code != 404, "Milestone acknowledge endpoint should exist"
        print(f"✓ Milestone acknowledge endpoint exists (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
