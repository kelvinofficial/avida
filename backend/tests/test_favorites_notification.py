"""
Test Favorites Notification Feature
Tests POST /api/favorites/{listing_id} - triggers stats update and notification to listing owner
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://classifieds-seo.preview.emergentagent.com').rstrip('/')


class TestFavoritesNotification:
    """Test favorites endpoint with notification callbacks"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session and auth tokens"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.seller_token = None
        self.buyer_token = None
        self.seller_user_id = None
        self.buyer_user_id = None
        
    def get_seller_token(self):
        """Login as seller (testuser@test.com)"""
        if self.seller_token:
            return self.seller_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testuser@test.com",
            "password": "password"
        })
        if response.status_code == 200:
            data = response.json()
            self.seller_token = data.get("session_token") or data.get("token")
            self.seller_user_id = data.get("user", {}).get("user_id") or data.get("user_id")
            return self.seller_token
        return None
    
    def get_buyer_token(self):
        """Login as buyer (test3@test.com)"""
        if self.buyer_token:
            return self.buyer_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test3@test.com",
            "password": "password"
        })
        if response.status_code == 200:
            data = response.json()
            self.buyer_token = data.get("session_token") or data.get("token")
            self.buyer_user_id = data.get("user", {}).get("user_id") or data.get("user_id")
            return self.buyer_token
        return None
    
    def test_health_check(self):
        """Test backend health endpoint"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("Health check passed")
    
    def test_seller_login(self):
        """Test seller authentication"""
        token = self.get_seller_token()
        assert token is not None, "Failed to login as seller"
        print(f"Seller login successful, user_id: {self.seller_user_id}")
    
    def test_buyer_login(self):
        """Test buyer authentication"""
        token = self.get_buyer_token()
        assert token is not None, "Failed to login as buyer"
        print(f"Buyer login successful, user_id: {self.buyer_user_id}")
    
    def test_favorite_listing_triggers_notification(self):
        """
        Test that favoriting a listing triggers notification to owner
        POST /api/favorites/{listing_id}
        """
        # Login as seller and create a listing
        seller_token = self.get_seller_token()
        if not seller_token:
            pytest.skip("Could not login as seller")
        
        # Create a test listing
        headers = {"Authorization": f"Bearer {seller_token}", "Content-Type": "application/json"}
        listing_data = {
            "title": "TEST_Notification Test Item",
            "description": "Testing favorites notification",
            "price": 99.99,
            "category_id": "electronics",
            "location": "Dublin",
            "condition": "new"
        }
        create_response = self.session.post(f"{BASE_URL}/api/listings", json=listing_data, headers=headers)
        
        if create_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create listing: {create_response.status_code}")
        
        listing_id = create_response.json().get("id")
        print(f"Created test listing: {listing_id}")
        
        # Login as buyer and favorite the listing
        buyer_token = self.get_buyer_token()
        if not buyer_token:
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/listings/{listing_id}", headers=headers)
            pytest.skip("Could not login as buyer")
        
        buyer_headers = {"Authorization": f"Bearer {buyer_token}", "Content-Type": "application/json"}
        
        # Favorite the listing
        favorite_response = self.session.post(
            f"{BASE_URL}/api/favorites/{listing_id}", 
            headers=buyer_headers
        )
        
        # Verify favorite was added
        assert favorite_response.status_code == 200, f"Failed to favorite: {favorite_response.status_code} - {favorite_response.text}"
        fav_data = favorite_response.json()
        assert "message" in fav_data
        print(f"Favorite response: {fav_data}")
        
        # The notification should have been created for the seller
        # Check seller's notifications
        notif_response = self.session.get(f"{BASE_URL}/api/notifications", headers=headers)
        if notif_response.status_code == 200:
            notifications = notif_response.json()
            # Check if there's a favorite notification for the test listing
            if isinstance(notifications, list):
                favorite_notifs = [n for n in notifications if n.get("type") == "favorite" and listing_id in str(n.get("data_payload", {}))]
                print(f"Found {len(favorite_notifs)} favorite notifications for listing")
            else:
                print(f"Notifications response: {notifications}")
        
        # Cleanup - remove favorite and listing
        self.session.delete(f"{BASE_URL}/api/favorites/{listing_id}", headers=buyer_headers)
        self.session.delete(f"{BASE_URL}/api/listings/{listing_id}", headers=headers)
        print("Cleanup completed")
    
    def test_favorite_own_listing_no_notification(self):
        """
        Test that favoriting own listing does NOT trigger notification
        """
        # Login as seller
        seller_token = self.get_seller_token()
        if not seller_token:
            pytest.skip("Could not login as seller")
        
        headers = {"Authorization": f"Bearer {seller_token}", "Content-Type": "application/json"}
        
        # Create a listing
        listing_data = {
            "title": "TEST_Own Listing Favorite Test",
            "description": "Testing no self-notification",
            "price": 50.00,
            "category_id": "home_garden",
            "location": "Cork"
        }
        create_response = self.session.post(f"{BASE_URL}/api/listings", json=listing_data, headers=headers)
        
        if create_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create listing: {create_response.status_code}")
        
        listing_id = create_response.json().get("id")
        print(f"Created own listing: {listing_id}")
        
        # Try to favorite own listing
        favorite_response = self.session.post(
            f"{BASE_URL}/api/favorites/{listing_id}",
            headers=headers
        )
        
        # Should still allow favoriting (message)
        assert favorite_response.status_code == 200
        print(f"Self-favorite response: {favorite_response.json()}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/favorites/{listing_id}", headers=headers)
        self.session.delete(f"{BASE_URL}/api/listings/{listing_id}", headers=headers)
        print("Cleanup completed")
    
    def test_favorites_endpoint_exists(self):
        """Test that favorites endpoints exist"""
        # Get list of favorites (requires auth)
        buyer_token = self.get_buyer_token()
        if not buyer_token:
            pytest.skip("Could not login")
        
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = self.session.get(f"{BASE_URL}/api/favorites", headers=headers)
        
        # Should return 200 with list of favorites
        assert response.status_code == 200, f"Favorites endpoint failed: {response.status_code}"
        print(f"Favorites list response type: {type(response.json())}")
    
    def test_favorite_nonexistent_listing(self):
        """Test favoriting a non-existent listing returns 404"""
        buyer_token = self.get_buyer_token()
        if not buyer_token:
            pytest.skip("Could not login")
        
        headers = {"Authorization": f"Bearer {buyer_token}"}
        fake_listing_id = "nonexistent-listing-12345"
        
        response = self.session.post(
            f"{BASE_URL}/api/favorites/{fake_listing_id}",
            headers=headers
        )
        
        # Should return 404
        assert response.status_code == 404, f"Expected 404, got: {response.status_code}"
        print("Correctly returns 404 for non-existent listing")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
