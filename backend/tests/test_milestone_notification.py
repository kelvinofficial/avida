"""
Milestone Notification API Tests
Tests for badge milestone notification feature including:
- GET /api/badges/milestones - Returns user's achieved/pending/new milestones
- POST /api/badges/milestones/acknowledge - Marks a milestone as acknowledged
- GET /api/badges/share/{user_id} - Returns shareable badge profile (public endpoint)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = f"milestone_test_{uuid.uuid4().hex[:8]}@example.com"
TEST_PASSWORD = "Test123!"
TEST_NAME = "Milestone Test User"


class TestMilestoneNotificationAPI:
    """Tests for badge milestone notification endpoints"""
    
    session_token = None
    user_id = None
    created_badge_id = None
    
    @classmethod
    def setup_class(cls):
        """Setup: Register a test user"""
        # Register user
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            }
        )
        
        if register_response.status_code in [200, 201]:
            data = register_response.json()
            cls.session_token = data.get("session_token")
            cls.user_id = data.get("user", {}).get("user_id") or data.get("user_id")
        else:
            # Try login if user exists
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD
                }
            )
            if login_response.status_code == 200:
                data = login_response.json()
                cls.session_token = data.get("session_token")
                cls.user_id = data.get("user", {}).get("user_id") or data.get("user_id")
    
    def get_auth_headers(self):
        """Get authorization headers"""
        if self.session_token:
            return {"Authorization": f"Bearer {self.session_token}"}
        return {}
    
    # ==== GET /api/badges/milestones ====
    
    def test_get_milestones_requires_auth(self):
        """Test that GET /api/badges/milestones requires authentication"""
        response = requests.get(f"{BASE_URL}/api/badges/milestones")
        
        # Should return 401 Unauthorized without auth
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/badges/milestones requires authentication")
    
    def test_get_milestones_authenticated(self):
        """Test GET /api/badges/milestones returns milestone data"""
        response = requests.get(
            f"{BASE_URL}/api/badges/milestones",
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "total_badges" in data, "Response should contain total_badges"
        assert "achieved_milestones" in data, "Response should contain achieved_milestones"
        assert "pending_milestones" in data, "Response should contain pending_milestones"
        assert "new_milestones" in data, "Response should contain new_milestones"
        
        # Validate data types
        assert isinstance(data["total_badges"], int), "total_badges should be an integer"
        assert isinstance(data["achieved_milestones"], list), "achieved_milestones should be a list"
        assert isinstance(data["pending_milestones"], list), "pending_milestones should be a list"
        assert isinstance(data["new_milestones"], list), "new_milestones should be a list"
        
        # For new user with no badges, should have pending milestones
        # Count-based milestones (1, 5, 10, 25, 50)
        assert len(data["pending_milestones"]) >= 5, "Should have at least 5 pending count-based milestones for new user"
        
        print(f"✓ GET /api/badges/milestones returns valid data structure")
        print(f"  - Total badges: {data['total_badges']}")
        print(f"  - Achieved: {len(data['achieved_milestones'])}")
        print(f"  - Pending: {len(data['pending_milestones'])}")
        print(f"  - New (unacknowledged): {len(data['new_milestones'])}")
    
    def test_milestone_data_structure(self):
        """Test that milestone objects have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/badges/milestones",
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check pending milestones structure (should have at least count-based ones)
        if data["pending_milestones"]:
            milestone = data["pending_milestones"][0]
            
            # Required fields for milestone
            assert "id" in milestone, "Milestone should have id"
            assert "type" in milestone, "Milestone should have type"
            assert "name" in milestone, "Milestone should have name"
            assert "message" in milestone, "Milestone should have message"
            assert "icon" in milestone, "Milestone should have icon"
            assert "achieved" in milestone, "Milestone should have achieved status"
            assert "acknowledged" in milestone, "Milestone should have acknowledged status"
            
            # Type-specific fields
            if milestone["type"] == "count":
                assert "threshold" in milestone, "Count milestone should have threshold"
            elif milestone["type"] == "special":
                assert "badge_name" in milestone, "Special milestone should have badge_name"
            
            print("✓ Milestone data structure is valid")
            print(f"  - Sample milestone: {milestone['name']}")
    
    # ==== POST /api/badges/milestones/acknowledge ====
    
    def test_acknowledge_milestone_requires_auth(self):
        """Test that POST /api/badges/milestones/acknowledge requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/badges/milestones/acknowledge",
            json={"milestone_id": "count_1"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /api/badges/milestones/acknowledge requires authentication")
    
    def test_acknowledge_milestone_requires_id(self):
        """Test that acknowledge requires milestone_id"""
        response = requests.post(
            f"{BASE_URL}/api/badges/milestones/acknowledge",
            headers=self.get_auth_headers(),
            json={}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "milestone_id" in data.get("detail", "").lower() or "milestone_id" in str(data).lower()
        print("✓ POST /api/badges/milestones/acknowledge validates milestone_id is required")
    
    def test_acknowledge_milestone_success(self):
        """Test successfully acknowledging a milestone"""
        # First, award a badge to the user to trigger a milestone
        # We'll manually insert a badge for testing
        
        # Test acknowledging a count-based milestone (even if not achieved yet, it should store)
        response = requests.post(
            f"{BASE_URL}/api/badges/milestones/acknowledge",
            headers=self.get_auth_headers(),
            json={"milestone_id": "count_1"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "message" in data, "Response should contain message"
        assert "milestone_id" in data, "Response should contain milestone_id"
        assert data["milestone_id"] == "count_1", "Should return the acknowledged milestone_id"
        
        print("✓ POST /api/badges/milestones/acknowledge works correctly")
    
    def test_acknowledge_idempotent(self):
        """Test that acknowledging same milestone twice is idempotent"""
        # First acknowledge
        response1 = requests.post(
            f"{BASE_URL}/api/badges/milestones/acknowledge",
            headers=self.get_auth_headers(),
            json={"milestone_id": "count_5"}
        )
        assert response1.status_code == 200
        
        # Second acknowledge (should also succeed without error)
        response2 = requests.post(
            f"{BASE_URL}/api/badges/milestones/acknowledge",
            headers=self.get_auth_headers(),
            json={"milestone_id": "count_5"}
        )
        assert response2.status_code == 200, f"Acknowledge should be idempotent, got {response2.status_code}"
        
        print("✓ Acknowledging milestone is idempotent (can be called multiple times)")
    
    def test_acknowledge_special_milestone(self):
        """Test acknowledging a special badge milestone"""
        response = requests.post(
            f"{BASE_URL}/api/badges/milestones/acknowledge",
            headers=self.get_auth_headers(),
            json={"milestone_id": "special_first_listing"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["milestone_id"] == "special_first_listing"
        
        print("✓ Special milestone acknowledgment works correctly")
    
    # ==== GET /api/badges/share/{user_id} ====
    
    def test_shareable_profile_public_access(self):
        """Test that GET /api/badges/share/{user_id} is publicly accessible"""
        # Should work without authentication
        response = requests.get(f"{BASE_URL}/api/badges/share/{self.user_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "user_name" in data, "Response should contain user_name"
        assert "total_badges" in data, "Response should contain total_badges"
        assert "badges" in data, "Response should contain badges array"
        assert "showcase_badges" in data, "Response should contain showcase_badges array"
        
        print("✓ GET /api/badges/share/{user_id} is publicly accessible")
        print(f"  - User name: {data['user_name']}")
        print(f"  - Total badges: {data['total_badges']}")
    
    def test_shareable_profile_user_not_found(self):
        """Test that shareable profile returns 404 for non-existent user"""
        response = requests.get(f"{BASE_URL}/api/badges/share/non_existent_user_xyz")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ GET /api/badges/share/{user_id} returns 404 for non-existent user")
    
    def test_shareable_profile_badge_structure(self):
        """Test badge structure in shareable profile"""
        response = requests.get(f"{BASE_URL}/api/badges/share/{self.user_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # badges array should exist (might be empty for new user)
        assert isinstance(data["badges"], list)
        assert isinstance(data["showcase_badges"], list)
        
        # If user has badges, validate structure
        if data["badges"]:
            badge = data["badges"][0]
            assert "name" in badge, "Badge should have name"
            assert "description" in badge, "Badge should have description"
            assert "icon" in badge, "Badge should have icon"
            assert "color" in badge, "Badge should have color"
        
        print("✓ Shareable profile badge structure is valid")
    
    # ==== Integration Test: Milestone Flow ====
    
    def test_milestone_flow_integration(self):
        """Test the complete milestone flow: check -> acknowledge -> verify acknowledged"""
        # Step 1: Get milestones
        response1 = requests.get(
            f"{BASE_URL}/api/badges/milestones",
            headers=self.get_auth_headers()
        )
        assert response1.status_code == 200
        initial_data = response1.json()
        
        # Step 2: Pick a milestone to acknowledge (use count_10 which isn't acknowledged yet)
        test_milestone_id = "count_10"
        
        # Step 3: Acknowledge it
        response2 = requests.post(
            f"{BASE_URL}/api/badges/milestones/acknowledge",
            headers=self.get_auth_headers(),
            json={"milestone_id": test_milestone_id}
        )
        assert response2.status_code == 200
        
        # Step 4: Get milestones again and verify it's acknowledged
        response3 = requests.get(
            f"{BASE_URL}/api/badges/milestones",
            headers=self.get_auth_headers()
        )
        assert response3.status_code == 200
        final_data = response3.json()
        
        # Find the milestone in pending (since user doesn't have 10 badges)
        milestone = None
        for m in final_data["pending_milestones"]:
            if m["id"] == test_milestone_id:
                milestone = m
                break
        
        # It should be marked as acknowledged
        assert milestone is not None, f"Milestone {test_milestone_id} should be in pending"
        assert milestone["acknowledged"] == True, "Milestone should be marked as acknowledged"
        
        print("✓ Complete milestone flow works correctly (check -> acknowledge -> verify)")


# Run tests directly if script is executed
if __name__ == "__main__":
    import sys
    # Run with pytest
    sys.exit(pytest.main([__file__, "-v", "--tb=short"]))
