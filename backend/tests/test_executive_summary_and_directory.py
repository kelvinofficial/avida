"""
Test Executive Summary and Business Directory APIs
Tests for features fixed in iteration 78:
1. Executive Summary page API authentication (401 fix)
2. Business Directory API endpoint
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://quick-sell-15.preview.emergentagent.com')


class TestExecutiveSummaryAPI:
    """Tests for Executive Summary APIs - requires admin authentication"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin JWT token for authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={
                "email": "admin@marketplace.com",
                "password": "Admin@123456"
            }
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    def test_quick_stats_requires_auth(self):
        """Test that quick stats endpoint returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/executive-summary/quick-stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_quick_stats_with_admin_token(self, admin_token):
        """Test quick stats endpoint works with admin JWT token"""
        response = requests.get(
            f"{BASE_URL}/api/executive-summary/quick-stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "total_users" in data, "Missing total_users field"
        assert "active_listings" in data, "Missing active_listings field"
        assert "new_users_week" in data, "Missing new_users_week field"
        assert "generated_at" in data, "Missing generated_at field"
        
        # Validate data types
        assert isinstance(data["total_users"], int), "total_users should be integer"
        assert isinstance(data["active_listings"], int), "active_listings should be integer"
    
    def test_config_endpoint(self, admin_token):
        """Test executive summary config endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/executive-summary/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "id" in data or "enabled" in data or "ai_model" in data, "Config should have configuration fields"
    
    def test_latest_summary_endpoint(self, admin_token):
        """Test get latest executive summary endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/executive-summary/latest",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Can be 200 (summary exists) or 404 (no summary generated yet)
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            # Validate summary structure if exists
            assert "executive_brief" in data or "generated_at" in data, "Summary should have expected fields"


class TestBusinessDirectoryAPI:
    """Tests for Business Directory API - publicly accessible"""
    
    def test_directory_endpoint_exists(self):
        """Test that business directory endpoint exists and returns 200"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/directory")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_directory_returns_profiles(self):
        """Test that directory returns profiles list"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/directory")
        assert response.status_code == 200
        
        data = response.json()
        # Validate response structure
        assert "profiles" in data, "Response should have profiles field"
        assert "total" in data, "Response should have total field"
        assert isinstance(data["profiles"], list), "profiles should be a list"
        assert isinstance(data["total"], int), "total should be integer"
    
    def test_directory_pagination(self):
        """Test directory supports pagination parameters"""
        response = requests.get(
            f"{BASE_URL}/api/business-profiles/directory",
            params={"limit": 5, "page": 1}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["profiles"]) <= 5, "Should respect limit parameter"
    
    def test_directory_profile_structure(self):
        """Test that business profiles have expected fields"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/directory")
        assert response.status_code == 200
        
        data = response.json()
        if data["profiles"]:
            profile = data["profiles"][0]
            # Verify key fields exist
            assert "id" in profile, "Profile should have id"
            assert "user_id" in profile, "Profile should have user_id"
            assert "business_name" in profile, "Profile should have business_name"


class TestOldEndpoints:
    """Tests to verify old wrong endpoints don't work"""
    
    def test_old_admin_exec_summary_not_found(self):
        """Test that old /api/admin/executive-summary/* endpoints don't exist"""
        response = requests.get(f"{BASE_URL}/api/admin/executive-summary/quick-stats")
        # Should be 404 or 401 (not on main backend)
        assert response.status_code in [401, 404], f"Old endpoint should not exist: {response.status_code}"
    
    def test_old_business_directory_not_found(self):
        """Test that /api/business/directory endpoint doesn't exist"""
        response = requests.get(f"{BASE_URL}/api/business/directory")
        assert response.status_code == 404, f"Expected 404 for old endpoint, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
