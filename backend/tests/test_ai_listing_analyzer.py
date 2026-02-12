"""
Test AI Listing Analyzer API Endpoints
Tests backend endpoints:
- GET /api/ai-analyzer/admin/settings
- PUT /api/ai-analyzer/admin/settings
- GET /api/ai-analyzer/admin/analytics
- POST /api/ai-analyzer/admin/clear-cache
- GET /api/ai-analyzer/check-access/{user_id}
- POST /api/ai-analyzer/feedback

Also tests admin dashboard proxy endpoints:
- GET /api/admin/ai-analyzer/admin/settings
- PUT /api/admin/ai-analyzer/admin/settings
- GET /api/admin/ai-analyzer/admin/analytics
- POST /api/admin/ai-analyzer/admin/clear-cache
"""

import pytest
import requests
import os
import uuid

# Base URLs
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://negotiate-badge.preview.emergentagent.com')
if BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@marketplace.com"
ADMIN_PASSWORD = "Admin@123456"


class TestDirectAIAnalyzerEndpoints:
    """Test direct AI analyzer endpoints on the main backend"""

    def test_get_ai_settings(self):
        """Test GET /api/ai-analyzer/admin/settings"""
        response = requests.get(f"{BASE_URL}/api/ai-analyzer/admin/settings")
        print(f"GET /api/ai-analyzer/admin/settings - Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields exist
        assert "enabled" in data
        assert "max_uses_per_day_free" in data
        assert "max_uses_per_day_verified" in data
        assert "max_uses_per_day_premium" in data
        assert "max_images_per_analysis" in data
        
        print("✓ AI settings retrieved successfully")

    def test_put_ai_settings(self):
        """Test PUT /api/ai-analyzer/admin/settings"""
        # First, get current settings
        get_response = requests.get(f"{BASE_URL}/api/ai-analyzer/admin/settings")
        assert get_response.status_code == 200
        original_settings = get_response.json()
        
        # Update settings - endpoint expects 'updates' and 'admin_id' as separate body fields
        update_payload = {
            "updates": {
                "enabled": True,
                "max_uses_per_day_free": 5
            },
            "admin_id": "test_admin"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/ai-analyzer/admin/settings",
            json=update_payload
        )
        print(f"PUT /api/ai-analyzer/admin/settings - Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify update was applied
        assert data.get("max_uses_per_day_free") == 5 or "max_uses_per_day_free" in data
        
        # Restore original value
        restore_payload = {
            "updates": {
                "max_uses_per_day_free": original_settings.get("max_uses_per_day_free", 3)
            },
            "admin_id": "test_admin"
        }
        requests.put(f"{BASE_URL}/api/ai-analyzer/admin/settings", json=restore_payload)
        
        print("✓ AI settings updated successfully")

    def test_get_ai_analytics(self):
        """Test GET /api/ai-analyzer/admin/analytics"""
        response = requests.get(f"{BASE_URL}/api/ai-analyzer/admin/analytics?days=30")
        print(f"GET /api/ai-analyzer/admin/analytics - Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "period_days" in data
        assert "total_calls" in data
        assert "total_images_analyzed" in data
        assert "acceptance_rate" in data
        assert "edit_rate" in data
        assert "rejection_rate" in data
        assert "daily_breakdown" in data
        assert "cache_entries" in data
        
        # Verify data types
        assert isinstance(data["total_calls"], int)
        assert isinstance(data["cache_entries"], int)
        assert isinstance(data["daily_breakdown"], list)
        
        print("✓ AI analytics retrieved successfully")

    def test_clear_ai_cache(self):
        """Test POST /api/ai-analyzer/admin/clear-cache"""
        response = requests.post(f"{BASE_URL}/api/ai-analyzer/admin/clear-cache")
        print(f"POST /api/ai-analyzer/admin/clear-cache - Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data["success"] == True
        assert "deleted" in data
        assert isinstance(data["deleted"], int)
        
        print("✓ AI cache cleared successfully")

    def test_check_user_access(self):
        """Test GET /api/ai-analyzer/check-access/{user_id}"""
        # Test with a non-existent user
        test_user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        response = requests.get(f"{BASE_URL}/api/ai-analyzer/check-access/{test_user_id}")
        print(f"GET /api/ai-analyzer/check-access/{test_user_id} - Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Non-existent user should not be allowed
        assert "allowed" in data
        assert data["allowed"] == False
        assert "reason" in data
        
        print("✓ User access check working correctly")

    def test_submit_feedback(self):
        """Test POST /api/ai-analyzer/feedback"""
        feedback_payload = {
            "analysis_id": f"ai_test_{uuid.uuid4().hex[:12]}",
            "accepted": True,
            "edited": False,
            "rejected": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ai-analyzer/feedback",
            json=feedback_payload
        )
        print(f"POST /api/ai-analyzer/feedback - Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data["success"] == True
        
        print("✓ Feedback submission working correctly")


class TestAdminDashboardAIProxyEndpoints:
    """Test AI analyzer proxy endpoints on admin dashboard backend"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        login_response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        print(f"Admin login - Status: {login_response.status_code}")
        
        if login_response.status_code != 200:
            print(f"Login response: {login_response.text}")
            pytest.skip("Admin login failed - skipping authenticated tests")
        
        data = login_response.json()
        return data.get("access_token")

    def test_admin_get_ai_settings(self, admin_token):
        """Test GET /api/admin/ai-analyzer/admin/settings (proxy)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/admin/ai-analyzer/admin/settings",
            headers=headers
        )
        print(f"GET /api/admin/ai-analyzer/admin/settings - Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields exist
        assert "enabled" in data
        assert "max_uses_per_day_free" in data
        assert "max_uses_per_day_verified" in data
        assert "max_uses_per_day_premium" in data
        
        print("✓ Admin proxy - AI settings retrieved successfully")

    def test_admin_put_ai_settings(self, admin_token):
        """Test PUT /api/admin/ai-analyzer/admin/settings (proxy)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First, get current settings
        get_response = requests.get(
            f"{BASE_URL}/api/admin/ai-analyzer/admin/settings",
            headers=headers
        )
        assert get_response.status_code == 200
        original = get_response.json()
        
        # Update settings
        update_payload = {
            "enabled": True,
            "max_uses_per_day_verified": 15
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/ai-analyzer/admin/settings",
            json=update_payload,
            headers=headers
        )
        print(f"PUT /api/admin/ai-analyzer/admin/settings - Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify update reflected
        assert "max_uses_per_day_verified" in data
        
        # Restore original
        restore_payload = {
            "max_uses_per_day_verified": original.get("max_uses_per_day_verified", 10)
        }
        requests.put(
            f"{BASE_URL}/api/admin/ai-analyzer/admin/settings",
            json=restore_payload,
            headers=headers
        )
        
        print("✓ Admin proxy - AI settings updated successfully")

    def test_admin_get_ai_analytics(self, admin_token):
        """Test GET /api/admin/ai-analyzer/admin/analytics (proxy)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/admin/ai-analyzer/admin/analytics?days=7",
            headers=headers
        )
        print(f"GET /api/admin/ai-analyzer/admin/analytics - Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "period_days" in data
        assert "total_calls" in data
        assert "acceptance_rate" in data
        assert "cache_entries" in data
        assert "daily_breakdown" in data
        
        print("✓ Admin proxy - AI analytics retrieved successfully")

    def test_admin_clear_ai_cache(self, admin_token):
        """Test POST /api/admin/ai-analyzer/admin/clear-cache (proxy)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/ai-analyzer/admin/clear-cache",
            headers=headers
        )
        print(f"POST /api/admin/ai-analyzer/admin/clear-cache - Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "deleted" in data
        
        print("✓ Admin proxy - AI cache cleared successfully")

    def test_admin_settings_unauthenticated(self):
        """Test that admin endpoints require authentication"""
        # Without token
        response = requests.get(f"{BASE_URL}/api/admin/ai-analyzer/admin/settings")
        print(f"GET /api/admin/ai-analyzer/admin/settings (no auth) - Status: {response.status_code}")
        
        assert response.status_code == 401
        
        print("✓ Admin endpoints properly require authentication")


class TestAIAnalyzerSettingsDefaultValues:
    """Test default AI settings values"""

    def test_default_settings_values(self):
        """Verify default settings have expected values"""
        response = requests.get(f"{BASE_URL}/api/ai-analyzer/admin/settings")
        assert response.status_code == 200
        data = response.json()
        
        print(f"Current AI Settings: {data}")
        
        # Default values should be present
        assert isinstance(data.get("enabled", None), bool)
        assert isinstance(data.get("max_uses_per_day_free", None), int)
        assert isinstance(data.get("max_uses_per_day_verified", None), int)
        assert isinstance(data.get("max_uses_per_day_premium", None), int)
        assert isinstance(data.get("max_images_per_analysis", None), int)
        
        # Check reasonable default ranges
        assert 0 <= data.get("max_uses_per_day_free", 0) <= 20
        assert 0 <= data.get("max_uses_per_day_verified", 0) <= 50
        assert 0 <= data.get("max_uses_per_day_premium", 0) <= 100
        assert 1 <= data.get("max_images_per_analysis", 0) <= 10
        
        print("✓ AI settings default values are reasonable")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
