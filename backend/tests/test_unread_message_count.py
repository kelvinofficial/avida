"""
Test for unread message count endpoint
Tests the GET /api/conversations/unread-count endpoint functionality
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://classified-inbox.preview.emergentagent.com')

class TestUnreadMessageCount:
    """Tests for unread message count endpoint"""
    
    @pytest.fixture
    def seller_auth(self):
        """Authenticate as seller (testuser@test.com) and return token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testuser@test.com",
            "password": "password"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("session_token")
        pytest.skip(f"Seller authentication failed: {response.status_code} - {response.text}")
    
    @pytest.fixture
    def buyer_auth(self):
        """Authenticate as buyer (testbuyer@test.com) and return token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testbuyer@test.com",
            "password": "password"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("session_token")
        pytest.skip(f"Buyer authentication failed: {response.status_code} - {response.text}")
    
    def test_unread_count_endpoint_requires_auth(self):
        """Test that endpoint returns 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/conversations/unread-count")
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("✓ Endpoint correctly requires authentication")
    
    def test_unread_count_returns_count_for_seller(self, seller_auth):
        """Test that seller gets unread count response"""
        headers = {"Authorization": f"Bearer {seller_auth}"}
        response = requests.get(f"{BASE_URL}/api/conversations/unread-count", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Validate response structure
        assert "count" in data, "Response should contain 'count' field"
        assert isinstance(data["count"], int), "Count should be an integer"
        assert data["count"] >= 0, "Count should be non-negative"
        
        print(f"✓ Seller unread count: {data['count']}")
        return data["count"]
    
    def test_unread_count_returns_count_for_buyer(self, buyer_auth):
        """Test that buyer gets unread count response"""
        headers = {"Authorization": f"Bearer {buyer_auth}"}
        response = requests.get(f"{BASE_URL}/api/conversations/unread-count", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Validate response structure
        assert "count" in data, "Response should contain 'count' field"
        assert isinstance(data["count"], int), "Count should be an integer"
        assert data["count"] >= 0, "Count should be non-negative"
        
        print(f"✓ Buyer unread count: {data['count']}")
        return data["count"]
    
    def test_login_returns_user_data(self, seller_auth):
        """Verify login also returns user data needed for frontend storage"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testuser@test.com",
            "password": "password"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Check that user data is present
        assert "user" in data or "user_id" in data, "Login should return user data"
        print(f"✓ Login returns user data: {list(data.keys())}")
        
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
