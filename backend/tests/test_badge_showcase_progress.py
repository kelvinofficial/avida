"""
Test Badge Showcase and Progress APIs
Tests:
- GET /api/badges/progress - Get badge progress for authenticated user
- PUT /api/badges/showcase - Update showcase badges (max 5)
- GET /api/profile/public/{user_id}/badges/showcase - Get user's showcase badges
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL') or "https://shimmer-loading.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip('/')

class TestBadgeShowcaseAndProgressAPIs:
    """Test badge showcase and progress endpoints"""
    
    @pytest.fixture(scope="class")
    def test_session(self):
        """Create and get authenticated test session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Create unique test user
        test_email = f"test_badge_showcase_{uuid.uuid4().hex[:8]}@test.com"
        test_password = "TestPass123!"
        
        # Register new user
        register_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": test_password,
            "name": "Badge Showcase Test User"
        })
        
        if register_response.status_code in [200, 201]:
            data = register_response.json()
            token = data.get("session_token") or data.get("token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
            user_id = data.get("user", {}).get("user_id") or data.get("user_id")
            return session, user_id, test_email
        
        # If registration fails, try login
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": test_password
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("session_token") or data.get("token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
            user_id = data.get("user", {}).get("user_id") or data.get("user_id")
            return session, user_id, test_email
        
        pytest.skip(f"Failed to create/login test user: {register_response.text}")
    
    # ==================== Badge Progress Tests ====================
    
    def test_badge_progress_unauthenticated(self):
        """Test that unauthenticated users cannot access badge progress"""
        response = requests.get(f"{BASE_URL}/api/badges/progress")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASSED: Badge progress requires authentication")
    
    def test_badge_progress_authenticated(self, test_session):
        """Test getting badge progress for authenticated user"""
        session, user_id, email = test_session
        
        response = session.get(f"{BASE_URL}/api/badges/progress")
        assert response.status_code == 200, f"Failed to get badge progress: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "progress" in data, "Response should contain 'progress' field"
        assert "showcase_badges" in data, "Response should contain 'showcase_badges' field"
        assert "total_badges_earned" in data, "Response should contain 'total_badges_earned' field"
        assert "total_points" in data, "Response should contain 'total_points' field"
        
        # Verify progress is a list
        progress = data["progress"]
        assert isinstance(progress, list), "Progress should be a list"
        
        # If there are badges in progress, verify structure
        if progress:
            badge = progress[0]
            assert "badge_id" in badge, "Badge should have badge_id"
            assert "name" in badge, "Badge should have name"
            assert "description" in badge, "Badge should have description"
            assert "icon" in badge, "Badge should have icon"
            assert "color" in badge, "Badge should have color"
            assert "is_earned" in badge, "Badge should have is_earned"
            assert "progress" in badge, "Badge should have progress info"
            
            # Verify progress sub-structure
            badge_progress = badge["progress"]
            assert "current" in badge_progress, "Progress should have current"
            assert "target" in badge_progress, "Progress should have target"
            assert "percent" in badge_progress, "Progress should have percent"
            assert "label" in badge_progress, "Progress should have label"
        
        print(f"PASSED: Badge progress retrieved - {len(progress)} badges, {data['total_badges_earned']} earned, {data['total_points']} points")
    
    def test_badge_progress_shows_all_10_badges(self, test_session):
        """Test that progress shows all 10 automatic badges"""
        session, user_id, email = test_session
        
        response = session.get(f"{BASE_URL}/api/badges/progress")
        assert response.status_code == 200
        
        data = response.json()
        progress = data["progress"]
        
        # Should have 10 badges (all predefined automatic badges)
        assert len(progress) == 10, f"Expected 10 badges, got {len(progress)}"
        
        # Verify specific badges exist
        badge_names = [b["name"] for b in progress]
        expected_badges = [
            "First Sale", "Active Seller", "Experienced Seller", "Top Seller",
            "Trusted Member", "Veteran Member", "5-Star Seller",
            "First Listing", "Prolific Seller", "Verified Seller"
        ]
        
        for expected in expected_badges:
            assert expected in badge_names, f"Missing badge: {expected}"
        
        print(f"PASSED: All 10 automatic badges present: {badge_names}")
    
    def test_badge_progress_calculation(self, test_session):
        """Test that badge progress calculation is correct"""
        session, user_id, email = test_session
        
        response = session.get(f"{BASE_URL}/api/badges/progress")
        assert response.status_code == 200
        
        data = response.json()
        progress = data["progress"]
        
        # Find a specific badge and verify progress structure
        first_sale_badge = next((b for b in progress if b["badge_id"] == "badge_first_sale"), None)
        assert first_sale_badge is not None, "First Sale badge not found"
        
        # Verify progress values are valid
        prog = first_sale_badge["progress"]
        assert isinstance(prog["current"], (int, float)), "Current should be numeric"
        assert isinstance(prog["target"], (int, float)), "Target should be numeric"
        assert 0 <= prog["percent"] <= 100, f"Percent should be 0-100, got {prog['percent']}"
        assert isinstance(prog["label"], str), "Label should be string"
        
        print(f"PASSED: Badge progress calculation correct - First Sale: {prog['label']} ({prog['percent']:.1f}%)")
    
    # ==================== Showcase Badges Tests ====================
    
    def test_update_showcase_unauthenticated(self):
        """Test that unauthenticated users cannot update showcase"""
        response = requests.put(
            f"{BASE_URL}/api/badges/showcase",
            json={"badge_ids": []},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASSED: Update showcase requires authentication")
    
    def test_update_showcase_empty_list(self, test_session):
        """Test updating showcase with empty list"""
        session, user_id, email = test_session
        
        response = session.put(
            f"{BASE_URL}/api/badges/showcase",
            json={"badge_ids": []}
        )
        assert response.status_code == 200, f"Failed to clear showcase: {response.text}"
        
        data = response.json()
        assert "showcase_badges" in data
        assert data["showcase_badges"] == []
        
        print("PASSED: Can set empty showcase")
    
    def test_update_showcase_max_5_badges(self, test_session):
        """Test that max 5 badges can be showcased"""
        session, user_id, email = test_session
        
        # Try to add 6 badges (should fail)
        response = session.put(
            f"{BASE_URL}/api/badges/showcase",
            json={"badge_ids": ["badge_1", "badge_2", "badge_3", "badge_4", "badge_5", "badge_6"]}
        )
        assert response.status_code == 400, f"Expected 400 for >5 badges, got {response.status_code}"
        
        data = response.json()
        assert "Maximum 5 badges" in data.get("detail", ""), "Should mention max 5 limit"
        
        print("PASSED: Max 5 badges limit enforced")
    
    def test_update_showcase_unearned_badge(self, test_session):
        """Test that user cannot showcase unearned badges"""
        session, user_id, email = test_session
        
        # Try to showcase a badge that likely isn't earned
        response = session.put(
            f"{BASE_URL}/api/badges/showcase",
            json={"badge_ids": ["badge_top_seller"]}  # Requires 100 sales
        )
        
        # Should fail with 400 since user hasn't earned this badge
        assert response.status_code == 400, f"Expected 400 for unearned badge, got {response.status_code}"
        
        data = response.json()
        assert "haven't earned" in data.get("detail", "").lower() or "cannot showcase" in data.get("detail", "").lower()
        
        print("PASSED: Cannot showcase unearned badges")
    
    def test_update_showcase_with_earned_badge(self, test_session):
        """Test showcasing an earned badge"""
        session, user_id, email = test_session
        
        # First get badge progress to find earned badges
        progress_response = session.get(f"{BASE_URL}/api/badges/progress")
        assert progress_response.status_code == 200
        
        progress_data = progress_response.json()
        earned_badges = [b for b in progress_data["progress"] if b["is_earned"]]
        
        if not earned_badges:
            # If user has no earned badges, just verify the empty showcase works
            response = session.put(
                f"{BASE_URL}/api/badges/showcase",
                json={"badge_ids": []}
            )
            assert response.status_code == 200
            print("PASSED: No earned badges to showcase - verified empty showcase works")
            return
        
        # Try to showcase earned badges
        earned_ids = [b["badge_id"] for b in earned_badges[:5]]
        response = session.put(
            f"{BASE_URL}/api/badges/showcase",
            json={"badge_ids": earned_ids}
        )
        
        assert response.status_code == 200, f"Failed to update showcase: {response.text}"
        
        data = response.json()
        assert data["showcase_badges"] == earned_ids
        
        print(f"PASSED: Successfully showcased {len(earned_ids)} earned badges")
    
    # ==================== Public Showcase Tests ====================
    
    def test_public_showcase_no_auth_required(self, test_session):
        """Test that public showcase doesn't require authentication"""
        session, user_id, email = test_session
        
        # Use a new session without auth
        response = requests.get(f"{BASE_URL}/api/profile/public/{user_id}/badges/showcase")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "showcase_badges" in data
        assert "has_custom_showcase" in data
        
        print("PASSED: Public showcase accessible without authentication")
    
    def test_public_showcase_nonexistent_user(self):
        """Test public showcase for nonexistent user returns empty"""
        response = requests.get(f"{BASE_URL}/api/profile/public/nonexistent_user_123/badges/showcase")
        assert response.status_code == 200, f"Expected 200 for nonexistent user, got {response.status_code}"
        
        data = response.json()
        assert data["showcase_badges"] == []
        assert data["has_custom_showcase"] == False
        
        print("PASSED: Nonexistent user returns empty showcase")
    
    def test_public_showcase_structure(self, test_session):
        """Test public showcase response structure"""
        session, user_id, email = test_session
        
        response = requests.get(f"{BASE_URL}/api/profile/public/{user_id}/badges/showcase")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify structure
        assert "showcase_badges" in data
        assert "has_custom_showcase" in data
        assert isinstance(data["showcase_badges"], list)
        assert isinstance(data["has_custom_showcase"], bool)
        
        # If there are showcase badges, verify their structure
        if data["showcase_badges"]:
            badge = data["showcase_badges"][0]
            required_fields = ["id", "name", "description", "icon", "color", "type"]
            for field in required_fields:
                assert field in badge, f"Missing field {field} in showcase badge"
        
        print(f"PASSED: Public showcase structure correct - {len(data['showcase_badges'])} badges, custom={data['has_custom_showcase']}")
    
    def test_showcase_flow_integration(self, test_session):
        """Integration test: update showcase then verify public endpoint"""
        session, user_id, email = test_session
        
        # Step 1: Get progress to find earned badges
        progress_response = session.get(f"{BASE_URL}/api/badges/progress")
        assert progress_response.status_code == 200
        
        earned_badges = [b for b in progress_response.json()["progress"] if b["is_earned"]]
        
        if len(earned_badges) >= 2:
            # Step 2: Update showcase with first 2 earned badges
            earned_ids = [earned_badges[0]["badge_id"], earned_badges[1]["badge_id"]]
            update_response = session.put(
                f"{BASE_URL}/api/badges/showcase",
                json={"badge_ids": earned_ids}
            )
            assert update_response.status_code == 200
            
            # Step 3: Verify public endpoint shows the same badges
            public_response = requests.get(f"{BASE_URL}/api/profile/public/{user_id}/badges/showcase")
            assert public_response.status_code == 200
            
            public_data = public_response.json()
            public_badge_ids = [b["id"] for b in public_data["showcase_badges"]]
            
            # Order should be preserved
            assert public_badge_ids == earned_ids, f"Expected {earned_ids}, got {public_badge_ids}"
            assert public_data["has_custom_showcase"] == True
            
            print(f"PASSED: Integration flow - showcased {earned_ids} and verified on public endpoint")
        else:
            print("PASSED: Integration flow - user has <2 earned badges, skipping full flow test")
    
    # ==================== Cleanup ====================
    
    def test_cleanup_showcase(self, test_session):
        """Cleanup: Reset showcase to empty"""
        session, user_id, email = test_session
        
        response = session.put(
            f"{BASE_URL}/api/badges/showcase",
            json={"badge_ids": []}
        )
        assert response.status_code == 200
        
        print("PASSED: Cleanup - showcase reset to empty")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
