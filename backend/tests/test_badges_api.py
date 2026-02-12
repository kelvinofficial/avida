"""
Badge Management API Tests
Tests for admin badge endpoints: CRUD for badges, user badge award/revoke, user search
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = "https://classifieds-mvp-1.preview.emergentagent.com/api/admin"

# Test credentials
ADMIN_EMAIL = "admin@marketplace.com"
ADMIN_PASSWORD = "Admin@123456"


class TestBadgeAPI:
    """Test Badge Management API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication token for admin"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access token in response"
        return {"Authorization": f"Bearer {data['access_token']}"}
    
    @pytest.fixture(scope="class")
    def test_badge_id(self, auth_headers):
        """Create a test badge and return its ID for other tests"""
        unique_id = uuid.uuid4().hex[:8]
        badge_data = {
            "name": f"TEST_Badge_{unique_id}",
            "description": "Test badge for automated testing",
            "icon": "star",
            "color": "#FF5722",
            "type": "achievement",
            "criteria": "Test criteria",
            "auto_award": False,
            "points_value": 50,
            "display_priority": 5,
            "is_active": True
        }
        response = requests.post(f"{BASE_URL}/badges", json=badge_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create test badge: {response.text}"
        data = response.json()
        assert data.get("success") is True
        badge = data.get("badge", {})
        assert "id" in badge, "No badge ID returned"
        yield badge["id"]
        # Cleanup: delete test badge after tests
        requests.delete(f"{BASE_URL}/badges/{badge['id']}", headers=auth_headers)
    
    # =========================================================================
    # GET /api/admin/badges - List all badges
    # =========================================================================
    
    def test_get_badges_success(self, auth_headers):
        """Test fetching all badges returns proper structure"""
        response = requests.get(f"{BASE_URL}/badges", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get badges: {response.text}"
        
        data = response.json()
        assert "badges" in data, "Response missing 'badges' field"
        assert "stats" in data, "Response missing 'stats' field"
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_badges" in stats
        assert "active_badges" in stats
        assert "total_awards" in stats
        assert "users_with_badges" in stats
        assert "most_awarded_badge" in stats
        assert "recent_awards" in stats
        
        # Verify badges is a list
        assert isinstance(data["badges"], list)
    
    def test_get_badges_unauthorized(self):
        """Test that unauthorized requests are rejected"""
        response = requests.get(f"{BASE_URL}/badges")
        assert response.status_code == 401
    
    # =========================================================================
    # POST /api/admin/badges - Create badge
    # =========================================================================
    
    def test_create_badge_all_fields(self, auth_headers):
        """Test creating a badge with all required and optional fields"""
        unique_id = uuid.uuid4().hex[:8]
        badge_data = {
            "name": f"TEST_FullBadge_{unique_id}",
            "description": "A full badge with all fields",
            "icon": "trophy",
            "color": "#4CAF50",
            "type": "verification",
            "criteria": "Complete profile verification",
            "auto_award": True,
            "points_value": 100,
            "display_priority": 10,
            "is_active": True
        }
        
        response = requests.post(f"{BASE_URL}/badges", json=badge_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create badge: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        badge = data.get("badge", {})
        
        # Verify all fields are correctly saved
        assert badge["name"] == badge_data["name"]
        assert badge["description"] == badge_data["description"]
        assert badge["icon"] == badge_data["icon"]
        assert badge["color"] == badge_data["color"]
        assert badge["type"] == badge_data["type"]
        assert badge["criteria"] == badge_data["criteria"]
        assert badge["auto_award"] == badge_data["auto_award"]
        assert badge["points_value"] == badge_data["points_value"]
        assert badge["display_priority"] == badge_data["display_priority"]
        assert badge["is_active"] == badge_data["is_active"]
        assert "id" in badge
        assert "created_at" in badge
        
        # Cleanup
        requests.delete(f"{BASE_URL}/badges/{badge['id']}", headers=auth_headers)
    
    def test_create_badge_minimal_fields(self, auth_headers):
        """Test creating a badge with only required fields"""
        unique_id = uuid.uuid4().hex[:8]
        badge_data = {
            "name": f"TEST_MinBadge_{unique_id}"
        }
        
        response = requests.post(f"{BASE_URL}/badges", json=badge_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create minimal badge: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        badge = data.get("badge", {})
        assert badge["name"] == badge_data["name"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/badges/{badge['id']}", headers=auth_headers)
    
    # =========================================================================
    # PUT /api/admin/badges/{badge_id} - Update badge
    # =========================================================================
    
    def test_update_badge_success(self, auth_headers, test_badge_id):
        """Test updating an existing badge"""
        update_data = {
            "name": "TEST_Updated_Badge_Name",
            "description": "Updated description",
            "points_value": 75,
            "display_priority": 15,
            "is_active": False
        }
        
        response = requests.put(f"{BASE_URL}/badges/{test_badge_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to update badge: {response.text}"
        
        # Verify changes by fetching badges
        badges_response = requests.get(f"{BASE_URL}/badges", headers=auth_headers)
        badges = badges_response.json().get("badges", [])
        updated_badge = next((b for b in badges if b["id"] == test_badge_id), None)
        
        assert updated_badge is not None, "Updated badge not found"
        assert updated_badge["name"] == update_data["name"]
        assert updated_badge["description"] == update_data["description"]
        assert updated_badge["points_value"] == update_data["points_value"]
        assert updated_badge["display_priority"] == update_data["display_priority"]
        assert updated_badge["is_active"] == update_data["is_active"]
    
    def test_update_badge_not_found(self, auth_headers):
        """Test updating non-existent badge returns 404"""
        response = requests.put(f"{BASE_URL}/badges/nonexistent_badge_id", json={"name": "Test"}, headers=auth_headers)
        assert response.status_code == 404
    
    # =========================================================================
    # DELETE /api/admin/badges/{badge_id} - Delete badge
    # =========================================================================
    
    def test_delete_badge_success(self, auth_headers):
        """Test deleting a badge"""
        # First create a badge to delete
        unique_id = uuid.uuid4().hex[:8]
        create_response = requests.post(f"{BASE_URL}/badges", json={
            "name": f"TEST_ToDelete_{unique_id}",
            "description": "Badge to be deleted"
        }, headers=auth_headers)
        assert create_response.status_code == 200
        badge_id = create_response.json()["badge"]["id"]
        
        # Delete the badge
        delete_response = requests.delete(f"{BASE_URL}/badges/{badge_id}", headers=auth_headers)
        assert delete_response.status_code == 200, f"Failed to delete badge: {delete_response.text}"
        
        # Verify badge is deleted
        badges_response = requests.get(f"{BASE_URL}/badges", headers=auth_headers)
        badges = badges_response.json().get("badges", [])
        deleted_badge = next((b for b in badges if b["id"] == badge_id), None)
        assert deleted_badge is None, "Badge was not deleted"
    
    def test_delete_badge_not_found(self, auth_headers):
        """Test deleting non-existent badge returns 404"""
        response = requests.delete(f"{BASE_URL}/badges/nonexistent_badge_id", headers=auth_headers)
        assert response.status_code == 404
    
    # =========================================================================
    # GET /api/admin/badges/users - List user badges
    # =========================================================================
    
    def test_get_user_badges_success(self, auth_headers):
        """Test fetching user badges with pagination"""
        response = requests.get(f"{BASE_URL}/badges/users", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get user badges: {response.text}"
        
        data = response.json()
        assert "user_badges" in data, "Response missing 'user_badges' field"
        assert "total" in data, "Response missing 'total' field"
        assert isinstance(data["user_badges"], list)
        assert isinstance(data["total"], int)
    
    def test_get_user_badges_with_pagination(self, auth_headers):
        """Test user badges pagination parameters"""
        response = requests.get(f"{BASE_URL}/badges/users", params={"skip": 0, "limit": 5}, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data.get("user_badges", [])) <= 5
    
    def test_get_user_badges_with_search(self, auth_headers):
        """Test user badges search functionality"""
        response = requests.get(f"{BASE_URL}/badges/users", params={"search": "test"}, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "user_badges" in data
    
    # =========================================================================
    # GET /api/admin/users/search - Search users
    # =========================================================================
    
    def test_search_users_success(self, auth_headers):
        """Test searching users by email or name"""
        response = requests.get(f"{BASE_URL}/users/search", params={"q": "admin"}, headers=auth_headers)
        assert response.status_code == 200, f"Failed to search users: {response.text}"
        
        data = response.json()
        assert "users" in data, "Response missing 'users' field"
        assert isinstance(data["users"], list)
    
    def test_search_users_min_length(self, auth_headers):
        """Test that search requires minimum 2 characters"""
        response = requests.get(f"{BASE_URL}/users/search", params={"q": "a"}, headers=auth_headers)
        # Should return 422 validation error for query length < 2
        # Note: FastAPI may return 422 (validation error) or reject with error response
        assert response.status_code in [422, 400]
    
    # =========================================================================
    # POST /api/admin/badges/award - Award badge to user
    # =========================================================================
    
    def test_award_badge_badge_not_found(self, auth_headers):
        """Test awarding non-existent badge returns 404"""
        award_data = {
            "user_email": "admin@marketplace.com",
            "badge_id": "nonexistent_badge_id",
            "reason": "Test reason"
        }
        
        response = requests.post(f"{BASE_URL}/badges/award", json=award_data, headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
    
    def test_award_badge_user_not_found(self, auth_headers, test_badge_id):
        """Test awarding badge to non-existent user returns 404"""
        award_data = {
            "user_email": f"nonexistent_{uuid.uuid4().hex[:8]}@example.com",
            "badge_id": test_badge_id,
            "reason": "Test reason"
        }
        
        response = requests.post(f"{BASE_URL}/badges/award", json=award_data, headers=auth_headers)
        assert response.status_code == 404
    
    # =========================================================================
    # DELETE /api/admin/badges/users/{user_badge_id} - Revoke badge
    # =========================================================================
    
    def test_revoke_badge_not_found(self, auth_headers):
        """Test revoking non-existent user badge returns 404"""
        response = requests.delete(f"{BASE_URL}/badges/users/nonexistent_user_badge_id", headers=auth_headers)
        assert response.status_code == 404


class TestBadgeTypes:
    """Test different badge types"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication token for admin"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        return {"Authorization": f"Bearer {data['access_token']}"}
    
    @pytest.mark.parametrize("badge_type", ["achievement", "verification", "premium", "trust", "special"])
    def test_create_badge_different_types(self, auth_headers, badge_type):
        """Test creating badges with all valid types"""
        unique_id = uuid.uuid4().hex[:8]
        badge_data = {
            "name": f"TEST_{badge_type}_{unique_id}",
            "description": f"Test {badge_type} badge",
            "type": badge_type,
            "icon": "star",
            "color": "#4CAF50"
        }
        
        response = requests.post(f"{BASE_URL}/badges", json=badge_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create {badge_type} badge: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        badge = data.get("badge", {})
        assert badge["type"] == badge_type
        
        # Cleanup
        requests.delete(f"{BASE_URL}/badges/{badge['id']}", headers=auth_headers)


class TestBadgeIcons:
    """Test badge icon options"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication token for admin"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        return {"Authorization": f"Bearer {data['access_token']}"}
    
    @pytest.mark.parametrize("icon", ["verified", "star", "trophy", "fire", "shield", "diamond", "premium", "medal"])
    def test_create_badge_different_icons(self, auth_headers, icon):
        """Test creating badges with all valid icon types"""
        unique_id = uuid.uuid4().hex[:8]
        badge_data = {
            "name": f"TEST_icon_{icon}_{unique_id}",
            "icon": icon
        }
        
        response = requests.post(f"{BASE_URL}/badges", json=badge_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create badge with icon {icon}: {response.text}"
        
        data = response.json()
        badge = data.get("badge", {})
        assert badge["icon"] == icon
        
        # Cleanup
        requests.delete(f"{BASE_URL}/badges/{badge['id']}", headers=auth_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
