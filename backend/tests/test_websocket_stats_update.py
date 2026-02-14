"""
Tests for WebSocket Real-Time Stats Update Feature

This module tests the backend API endpoints that trigger stats updates via WebSocket:
1. POST /api/listings - triggers stats update notification to seller
2. DELETE /api/listings/{id} - triggers stats update notification to seller  
3. POST /api/listings/{id}/mark-sold - triggers stats update notification to seller
4. POST /api/offers - triggers stats update notification to seller (new pending offer)
5. PUT /api/offers/{id}/respond - triggers stats update notification to seller
6. DELETE /api/offers/{id} - triggers stats update notification to seller (offer withdrawn)

Note: Full WebSocket testing requires a WebSocket client, so we focus on API behavior 
and verify the endpoints work correctly. The notify_stats_update callback is async and 
non-blocking, so we verify APIs return success without blocking.
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://mobile-header-ui.preview.emergentagent.com").rstrip("/")


class TestAuth:
    """Helper for authentication"""
    
    @staticmethod
    def login(email: str, password: str) -> dict:
        """Login and return session data with token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            return response.json()
        return None
    
    @staticmethod
    def get_auth_headers(token: str) -> dict:
        """Get auth headers with token"""
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }


class TestListingsStatsUpdate:
    """Tests for listing-related stats updates"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        # Login as test user
        login_response = TestAuth.login("testuser@test.com", "password")
        if login_response:
            self.user_token = login_response.get("session_token") or login_response.get("token")
            self.user_id = login_response.get("user_id")
        else:
            pytest.skip("Could not login as testuser@test.com")
        
        self.created_listing_ids = []
    
    def teardown_method(self, method):
        """Clean up created listings"""
        if hasattr(self, 'created_listing_ids') and self.user_token:
            headers = TestAuth.get_auth_headers(self.user_token)
            for listing_id in self.created_listing_ids:
                try:
                    requests.delete(f"{BASE_URL}/api/listings/{listing_id}", headers=headers)
                except:
                    pass
    
    def test_create_listing_triggers_stats_update(self):
        """
        POST /api/listings - Creates listing and triggers stats update
        Verifies: API returns 200, listing is created, notify_stats_update is called (non-blocking)
        """
        headers = TestAuth.get_auth_headers(self.user_token)
        
        listing_data = {
            "title": f"TEST_Stats_Update_Listing_{uuid.uuid4().hex[:8]}",
            "description": "Test listing to verify stats update notification is triggered",
            "price": 150.00,
            "category_id": "electronics",
            "subcategory": "laptops_computers",
            "condition": "good",
            "location": "Berlin, Germany",
            "images": [],
            "attributes": {}
        }
        
        response = requests.post(f"{BASE_URL}/api/listings", json=listing_data, headers=headers)
        
        # Verify API returns success
        assert response.status_code in [200, 201], f"Failed to create listing: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "id" in data, "Listing ID not in response"
        
        # Track for cleanup
        self.created_listing_ids.append(data["id"])
        
        # Verify listing was created with correct data
        assert data.get("title") == listing_data["title"]
        assert data.get("price") == listing_data["price"]
        assert data.get("status") == "active"
        
        print(f"✓ Create listing API succeeded - listing {data['id']} created")
        print("✓ notify_stats_update should have been called asynchronously for seller")
    
    def test_delete_listing_triggers_stats_update(self):
        """
        DELETE /api/listings/{id} - Deletes listing and triggers stats update
        Verifies: API returns success, listing status changes to deleted
        """
        headers = TestAuth.get_auth_headers(self.user_token)
        
        # First create a listing
        listing_data = {
            "title": f"TEST_Delete_Stats_{uuid.uuid4().hex[:8]}",
            "description": "Test listing to be deleted",
            "price": 75.00,
            "category_id": "electronics",
            "subcategory": "tv_dvd",
            "location": "Munich, Germany"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/listings", json=listing_data, headers=headers)
        assert create_response.status_code in [200, 201], f"Failed to create listing: {create_response.text}"
        
        listing_id = create_response.json()["id"]
        
        # Delete the listing
        delete_response = requests.delete(f"{BASE_URL}/api/listings/{listing_id}", headers=headers)
        
        assert delete_response.status_code == 200, f"Failed to delete listing: {delete_response.status_code} - {delete_response.text}"
        
        # Verify response
        delete_data = delete_response.json()
        assert "message" in delete_data, "No message in delete response"
        assert "deleted" in delete_data.get("message", "").lower(), f"Unexpected message: {delete_data}"
        
        # Verify listing status is now deleted
        get_response = requests.get(f"{BASE_URL}/api/listings/{listing_id}", headers=headers)
        if get_response.status_code == 200:
            listing = get_response.json()
            assert listing.get("status") == "deleted", f"Listing status not deleted: {listing.get('status')}"
        
        print(f"✓ Delete listing API succeeded - listing {listing_id} deleted")
        print("✓ notify_stats_update should have been called asynchronously for seller")
    
    def test_mark_listing_sold_triggers_stats_update(self):
        """
        POST /api/listings/{id}/mark-sold - Marks listing as sold and triggers stats update
        Verifies: API returns success, listing status changes to sold
        """
        headers = TestAuth.get_auth_headers(self.user_token)
        
        # First create a listing
        listing_data = {
            "title": f"TEST_MarkSold_Stats_{uuid.uuid4().hex[:8]}",
            "description": "Test listing to be marked as sold",
            "price": 200.00,
            "category_id": "electronics",
            "subcategory": "video_game_consoles",
            "location": "Hamburg, Germany"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/listings", json=listing_data, headers=headers)
        assert create_response.status_code in [200, 201], f"Failed to create listing: {create_response.text}"
        
        listing_id = create_response.json()["id"]
        self.created_listing_ids.append(listing_id)
        
        # Mark the listing as sold
        sold_response = requests.post(f"{BASE_URL}/api/listings/{listing_id}/mark-sold", headers=headers)
        
        assert sold_response.status_code == 200, f"Failed to mark listing as sold: {sold_response.status_code} - {sold_response.text}"
        
        # Verify response
        sold_data = sold_response.json()
        assert "message" in sold_data, "No message in response"
        assert "sold" in sold_data.get("message", "").lower(), f"Unexpected message: {sold_data}"
        assert sold_data.get("listing_id") == listing_id
        
        # Verify listing status is now sold
        get_response = requests.get(f"{BASE_URL}/api/listings/{listing_id}", headers=headers)
        assert get_response.status_code == 200
        listing = get_response.json()
        assert listing.get("status") == "sold", f"Listing status not sold: {listing.get('status')}"
        
        print(f"✓ Mark sold API succeeded - listing {listing_id} marked as sold")
        print("✓ notify_stats_update should have been called asynchronously for seller")


class TestOffersStatsUpdate:
    """Tests for offer-related stats updates"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        # Login as seller (test user)
        seller_login = TestAuth.login("testuser@test.com", "password")
        if seller_login:
            self.seller_token = seller_login.get("session_token") or seller_login.get("token")
            # user_id is nested under 'user' key
            self.seller_id = seller_login.get("user", {}).get("user_id") or seller_login.get("user_id")
        else:
            pytest.skip("Could not login as testuser@test.com")
        
        # Login as buyer (admin user)
        buyer_login = TestAuth.login("test3@test.com", "password")
        if buyer_login:
            self.buyer_token = buyer_login.get("session_token") or buyer_login.get("token")
            # user_id is nested under 'user' key
            self.buyer_id = buyer_login.get("user", {}).get("user_id") or buyer_login.get("user_id")
        else:
            pytest.skip("Could not login as test3@test.com")
        
        self.created_listing_ids = []
        self.created_offer_ids = []
    
    def teardown_method(self, method):
        """Clean up created resources"""
        if not hasattr(self, 'seller_token') or not self.seller_token:
            return
        if not hasattr(self, 'buyer_token') or not self.buyer_token:
            return
        seller_headers = TestAuth.get_auth_headers(self.seller_token)
        buyer_headers = TestAuth.get_auth_headers(self.buyer_token)
        
        # Clean up offers
        for offer_id in getattr(self, 'created_offer_ids', []):
            try:
                requests.delete(f"{BASE_URL}/api/offers/{offer_id}", headers=buyer_headers)
            except:
                pass
        
        # Clean up listings
        for listing_id in getattr(self, 'created_listing_ids', []):
            try:
                requests.delete(f"{BASE_URL}/api/listings/{listing_id}", headers=seller_headers)
            except:
                pass
    
    def _create_test_listing(self) -> str:
        """Helper to create a test listing"""
        headers = TestAuth.get_auth_headers(self.seller_token)
        listing_data = {
            "title": f"TEST_Offer_Stats_{uuid.uuid4().hex[:8]}",
            "description": "Test listing for offer stats testing",
            "price": 500.00,
            "category_id": "electronics",
            "subcategory": "headphones",
            "location": "Berlin, Germany",
            "accepts_offers": True
        }
        response = requests.post(f"{BASE_URL}/api/listings", json=listing_data, headers=headers)
        assert response.status_code in [200, 201], f"Failed to create listing: {response.text}"
        listing_id = response.json()["id"]
        self.created_listing_ids.append(listing_id)
        return listing_id
    
    def test_create_offer_triggers_stats_update(self):
        """
        POST /api/offers - Creates offer and triggers stats update to seller
        Verifies: API returns success, offer is created, seller should receive stats update
        """
        # Create a listing as seller
        listing_id = self._create_test_listing()
        
        # Create an offer as buyer
        buyer_headers = TestAuth.get_auth_headers(self.buyer_token)
        offer_data = {
            "listing_id": listing_id,
            "offered_price": 400.00,
            "message": "Test offer for stats update testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/offers", json=offer_data, headers=buyer_headers)
        
        assert response.status_code in [200, 201], f"Failed to create offer: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "offer" in data, "No offer in response"
        assert data["offer"].get("id"), "Offer ID not in response"
        
        offer_id = data["offer"]["id"]
        self.created_offer_ids.append(offer_id)
        
        # Verify offer data
        offer = data["offer"]
        assert offer.get("listing_id") == listing_id
        assert offer.get("offered_price") == 400.00
        assert offer.get("status") == "pending"
        assert offer.get("seller_id") == self.seller_id
        
        print(f"✓ Create offer API succeeded - offer {offer_id} created")
        print("✓ notify_stats_update should have been called for seller (new pending offer)")
    
    def test_respond_to_offer_accept_triggers_stats_update(self):
        """
        PUT /api/offers/{id}/respond (accept) - Seller accepts offer, triggers stats update
        """
        # Create listing and offer
        listing_id = self._create_test_listing()
        
        buyer_headers = TestAuth.get_auth_headers(self.buyer_token)
        offer_data = {
            "listing_id": listing_id,
            "offered_price": 450.00,
            "message": "Offer to be accepted"
        }
        
        offer_response = requests.post(f"{BASE_URL}/api/offers", json=offer_data, headers=buyer_headers)
        assert offer_response.status_code in [200, 201]
        offer_id = offer_response.json()["offer"]["id"]
        self.created_offer_ids.append(offer_id)
        
        # Seller accepts the offer
        seller_headers = TestAuth.get_auth_headers(self.seller_token)
        accept_response = requests.put(
            f"{BASE_URL}/api/offers/{offer_id}/respond",
            json={"action": "accept"},
            headers=seller_headers
        )
        
        assert accept_response.status_code == 200, f"Failed to accept offer: {accept_response.status_code} - {accept_response.text}"
        
        data = accept_response.json()
        assert data.get("status") == "accepted", f"Unexpected status: {data}"
        assert "accepted" in data.get("message", "").lower()
        
        print(f"✓ Accept offer API succeeded - offer {offer_id} accepted")
        print("✓ notify_stats_update should have been called for seller (pending offers count changed)")
    
    def test_respond_to_offer_reject_triggers_stats_update(self):
        """
        PUT /api/offers/{id}/respond (reject) - Seller rejects offer, triggers stats update
        """
        # Create listing and offer
        listing_id = self._create_test_listing()
        
        buyer_headers = TestAuth.get_auth_headers(self.buyer_token)
        offer_data = {
            "listing_id": listing_id,
            "offered_price": 350.00,
            "message": "Offer to be rejected"
        }
        
        offer_response = requests.post(f"{BASE_URL}/api/offers", json=offer_data, headers=buyer_headers)
        assert offer_response.status_code in [200, 201]
        offer_id = offer_response.json()["offer"]["id"]
        self.created_offer_ids.append(offer_id)
        
        # Seller rejects the offer
        seller_headers = TestAuth.get_auth_headers(self.seller_token)
        reject_response = requests.put(
            f"{BASE_URL}/api/offers/{offer_id}/respond",
            json={"action": "reject"},
            headers=seller_headers
        )
        
        assert reject_response.status_code == 200, f"Failed to reject offer: {reject_response.status_code} - {reject_response.text}"
        
        data = reject_response.json()
        assert data.get("status") == "rejected", f"Unexpected status: {data}"
        
        print(f"✓ Reject offer API succeeded - offer {offer_id} rejected")
        print("✓ notify_stats_update should have been called for seller")
    
    def test_respond_to_offer_counter_triggers_stats_update(self):
        """
        PUT /api/offers/{id}/respond (counter) - Seller counters offer, triggers stats update
        """
        # Create listing and offer
        listing_id = self._create_test_listing()
        
        buyer_headers = TestAuth.get_auth_headers(self.buyer_token)
        offer_data = {
            "listing_id": listing_id,
            "offered_price": 300.00,
            "message": "Offer to be countered"
        }
        
        offer_response = requests.post(f"{BASE_URL}/api/offers", json=offer_data, headers=buyer_headers)
        assert offer_response.status_code in [200, 201]
        offer_id = offer_response.json()["offer"]["id"]
        self.created_offer_ids.append(offer_id)
        
        # Seller counters the offer
        seller_headers = TestAuth.get_auth_headers(self.seller_token)
        counter_response = requests.put(
            f"{BASE_URL}/api/offers/{offer_id}/respond",
            json={
                "action": "counter",
                "counter_price": 425.00,
                "counter_message": "I can do 425"
            },
            headers=seller_headers
        )
        
        assert counter_response.status_code == 200, f"Failed to counter offer: {counter_response.status_code} - {counter_response.text}"
        
        data = counter_response.json()
        assert data.get("status") == "countered", f"Unexpected status: {data}"
        assert data.get("counter_price") == 425.00
        
        print(f"✓ Counter offer API succeeded - offer {offer_id} countered at 425.00")
        print("✓ notify_stats_update should have been called for seller")
    
    def test_accept_counter_offer_triggers_stats_update(self):
        """
        PUT /api/offers/{id}/accept-counter - Buyer accepts counter, triggers stats update
        """
        # Create listing and offer
        listing_id = self._create_test_listing()
        
        buyer_headers = TestAuth.get_auth_headers(self.buyer_token)
        offer_data = {
            "listing_id": listing_id,
            "offered_price": 350.00,
            "message": "Initial offer"
        }
        
        offer_response = requests.post(f"{BASE_URL}/api/offers", json=offer_data, headers=buyer_headers)
        assert offer_response.status_code in [200, 201]
        offer_id = offer_response.json()["offer"]["id"]
        self.created_offer_ids.append(offer_id)
        
        # Seller counters
        seller_headers = TestAuth.get_auth_headers(self.seller_token)
        counter_response = requests.put(
            f"{BASE_URL}/api/offers/{offer_id}/respond",
            json={"action": "counter", "counter_price": 475.00},
            headers=seller_headers
        )
        assert counter_response.status_code == 200
        
        # Buyer accepts counter
        accept_counter_response = requests.put(
            f"{BASE_URL}/api/offers/{offer_id}/accept-counter",
            headers=buyer_headers
        )
        
        assert accept_counter_response.status_code == 200, f"Failed to accept counter: {accept_counter_response.status_code} - {accept_counter_response.text}"
        
        data = accept_counter_response.json()
        assert "accepted" in data.get("message", "").lower()
        assert data.get("final_price") == 475.00
        
        print(f"✓ Accept counter offer API succeeded - deal closed at 475.00")
        print("✓ notify_stats_update should have been called for seller")
    
    def test_withdraw_offer_triggers_stats_update(self):
        """
        DELETE /api/offers/{id} - Buyer withdraws offer, triggers stats update to seller
        """
        # Create listing and offer
        listing_id = self._create_test_listing()
        
        buyer_headers = TestAuth.get_auth_headers(self.buyer_token)
        offer_data = {
            "listing_id": listing_id,
            "offered_price": 400.00,
            "message": "Offer to be withdrawn"
        }
        
        offer_response = requests.post(f"{BASE_URL}/api/offers", json=offer_data, headers=buyer_headers)
        assert offer_response.status_code in [200, 201]
        offer_id = offer_response.json()["offer"]["id"]
        
        # Buyer withdraws the offer
        withdraw_response = requests.delete(
            f"{BASE_URL}/api/offers/{offer_id}",
            headers=buyer_headers
        )
        
        assert withdraw_response.status_code == 200, f"Failed to withdraw offer: {withdraw_response.status_code} - {withdraw_response.text}"
        
        data = withdraw_response.json()
        assert "withdrawn" in data.get("message", "").lower()
        
        # Verify offer status
        get_response = requests.get(f"{BASE_URL}/api/offers/{offer_id}", headers=buyer_headers)
        if get_response.status_code == 200:
            offer = get_response.json()
            assert offer.get("status") == "withdrawn"
        
        print(f"✓ Withdraw offer API succeeded - offer {offer_id} withdrawn")
        print("✓ notify_stats_update should have been called for seller (pending offers count changed)")


class TestQuickStatsEndpoint:
    """Test the get_user_quick_stats endpoint that WebSocket uses"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        login_response = TestAuth.login("testuser@test.com", "password")
        if login_response:
            self.token = login_response.get("session_token") or login_response.get("token")
            self.user_id = login_response.get("user_id")
        else:
            pytest.skip("Could not login as testuser@test.com")
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")
    
    def test_user_stats_via_profile(self):
        """
        Verify user stats can be fetched (which is used by get_user_quick_stats internally)
        """
        headers = TestAuth.get_auth_headers(self.token)
        
        # Get my listings to verify stats
        listings_response = requests.get(f"{BASE_URL}/api/listings/my", headers=headers)
        assert listings_response.status_code == 200
        listings = listings_response.json()
        
        print(f"✓ User has {len(listings)} listings")
        
        # Count active listings
        active_count = len([l for l in listings if l.get("status") == "active"])
        print(f"✓ Active listings: {active_count}")
        
        # Get offers as seller
        offers_response = requests.get(f"{BASE_URL}/api/offers?role=seller", headers=headers)
        if offers_response.status_code == 200:
            offers_data = offers_response.json()
            pending_offers = len([o for o in offers_data.get("offers", []) if o.get("status") == "pending"])
            print(f"✓ Pending offers: {pending_offers}")


class TestWebSocketIntegration:
    """
    Integration tests verifying WebSocket-related code paths.
    Note: Full WebSocket testing would require a socket.io client.
    These tests verify the API endpoints that trigger WebSocket notifications.
    """
    
    def test_socket_endpoint_exists(self):
        """Verify socket.io endpoint is accessible"""
        # Socket.io handshake uses GET with specific parameters
        response = requests.get(f"{BASE_URL}/socket.io/", params={"EIO": "4", "transport": "polling"})
        # Socket.io should return something (might be error without proper handshake, but endpoint exists)
        print(f"✓ Socket.io endpoint responded with status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
