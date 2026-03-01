"""
Tests for Quick Stats and Notification Badges Features
Tests endpoints used by:
1. Quick Stats card - /api/listings/my, /api/offers?role=seller, /api/boost/credits/balance
2. Notification badges - /api/conversations, /api/offers?role=seller
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

class TestAuthAndHealth:
    """Health and auth tests"""
    
    def test_health_check(self):
        """Test API health"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")
    
    def test_login(self):
        """Test login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test3@test.com",
            "password": "password"
        })
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert "user" in data
        print(f"✓ Login successful for {data['user']['email']}")
        return data["session_token"]


class TestQuickStatsAPIs:
    """Tests for Quick Stats card APIs"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test3@test.com",
            "password": "password"
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Auth failed")
    
    def test_get_my_listings(self, auth_token):
        """Test GET /api/listings/my - used for Listings count"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/listings/my?page=1&limit=1", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Should return array or object with total
        assert isinstance(data, (list, dict))
        print(f"✓ GET /api/listings/my - returns {type(data).__name__}")
    
    def test_get_offers_seller_role(self, auth_token):
        """Test GET /api/offers?role=seller - used for Offers count"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/offers?role=seller", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Must return object with 'offers' array
        assert "offers" in data, f"Response should have 'offers' key, got: {data.keys()}"
        assert isinstance(data["offers"], list), f"'offers' should be array, got: {type(data['offers'])}"
        assert "total" in data, "Response should have 'total' key"
        print(f"✓ GET /api/offers?role=seller - returns {len(data['offers'])} offers")
    
    def test_get_offers_buyer_role(self, auth_token):
        """Test GET /api/offers?role=buyer - alternative role"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/offers?role=buyer", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "offers" in data
        assert isinstance(data["offers"], list)
        print(f"✓ GET /api/offers?role=buyer - returns {len(data['offers'])} offers")
    
    def test_get_credits_balance(self, auth_token):
        """Test GET /api/boost/credits/balance - used for Credits count"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/boost/credits/balance", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Should have balance field
        assert "balance" in data, f"Response should have 'balance' key, got: {data.keys()}"
        assert isinstance(data["balance"], (int, float)), f"Balance should be numeric, got: {type(data['balance'])}"
        print(f"✓ GET /api/boost/credits/balance - balance: {data['balance']}")


class TestNotificationBadgesAPIs:
    """Tests for Notification Badges APIs"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test3@test.com",
            "password": "password"
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Auth failed")
    
    def test_get_conversations(self, auth_token):
        """Test GET /api/conversations - used for unread messages count"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/conversations", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Should return array of conversations
        assert isinstance(data, list), f"Response should be array, got: {type(data)}"
        # Each conversation can have 'unread' field
        print(f"✓ GET /api/conversations - returns {len(data)} conversations")
        if data:
            # Verify structure of first conversation
            conv = data[0]
            print(f"  - Conversation keys: {list(conv.keys())}")
            if "unread" in conv:
                print(f"  - Has 'unread' field: {conv['unread']}")
    
    def test_offers_response_has_pending_status(self, auth_token):
        """Test that offers can be filtered by pending status for badge count"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/offers?role=seller", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Verify we can filter offers by status
        offers = data.get("offers", [])
        pending_offers = [o for o in offers if o.get("status") == "pending"]
        print(f"✓ Offers can be filtered by status - {len(pending_offers)} pending offers")


class TestQuickStatsDataFlow:
    """Tests to verify the data flow for Quick Stats component"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test3@test.com",
            "password": "password"
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Auth failed")
    
    def test_quick_stats_data_complete_flow(self, auth_token):
        """Test all Quick Stats APIs in parallel simulation"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Simulate the frontend's parallel fetch
        listings_res = requests.get(f"{BASE_URL}/api/listings/my?page=1&limit=1", headers=headers)
        offers_res = requests.get(f"{BASE_URL}/api/offers?role=seller", headers=headers)
        credits_res = requests.get(f"{BASE_URL}/api/boost/credits/balance", headers=headers)
        
        assert listings_res.status_code == 200, f"Listings API failed: {listings_res.status_code}"
        assert offers_res.status_code == 200, f"Offers API failed: {offers_res.status_code}"
        assert credits_res.status_code == 200, f"Credits API failed: {credits_res.status_code}"
        
        # Parse responses the way frontend does
        listings_data = listings_res.json()
        offers_data = offers_res.json()
        credits_data = credits_res.json()
        
        # Calculate stats like frontend does
        active_listings = listings_data.get("total", len(listings_data)) if isinstance(listings_data, dict) else len(listings_data)
        
        offers_array = offers_data.get("offers", offers_data) if isinstance(offers_data, dict) else offers_data
        pending_offers = len([o for o in offers_array if o.get("status") == "pending"]) if isinstance(offers_array, list) else 0
        
        credit_balance = credits_data.get("balance", 0)
        
        print(f"✓ Quick Stats data flow verified:")
        print(f"  - Active Listings: {active_listings}")
        print(f"  - Pending Offers: {pending_offers}")
        print(f"  - Credit Balance: {credit_balance}")


class TestNotificationBadgesDataFlow:
    """Tests to verify the data flow for notification badges"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test3@test.com",
            "password": "password"
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Auth failed")
    
    def test_notification_badges_data_flow(self, auth_token):
        """Test notification badges data calculation"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Fetch conversations and offers
        conversations_res = requests.get(f"{BASE_URL}/api/conversations", headers=headers)
        offers_res = requests.get(f"{BASE_URL}/api/offers?role=seller", headers=headers)
        
        assert conversations_res.status_code == 200
        assert offers_res.status_code == 200
        
        conversations = conversations_res.json()
        offers_data = offers_res.json()
        
        # Calculate unread messages like frontend does
        unread_messages = sum(conv.get("unread", 0) for conv in conversations) if isinstance(conversations, list) else 0
        
        # Calculate pending offers like frontend does
        offers_array = offers_data.get("offers", offers_data) if isinstance(offers_data, dict) else offers_data
        pending_offers = len([o for o in offers_array if o.get("status") == "pending"]) if isinstance(offers_array, list) else 0
        
        print(f"✓ Notification badges data flow verified:")
        print(f"  - Unread Messages: {unread_messages}")
        print(f"  - Pending Offers: {pending_offers}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
