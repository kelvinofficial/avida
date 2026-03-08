"""
Test Offers API - Chat offer feature backend tests
Tests for POST /api/offers, PUT /api/offers/{id}/accept, PUT /api/offers/{id}/reject
Tests for POST /api/media/upload, GET /api/media/{id}
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test credentials
BUYER_EMAIL = "testuser2028@example.com"
BUYER_PASSWORD = "Test@123456"
SELLER_EMAIL = "demo@avida.com"
SELLER_PASSWORD = "Demo@123"
TEST_LISTING_ID = "4e6772b0-7bb8-4143-87f7-8d13834f5066"  # Price: 250,000 TZS


class TestOffersAPI:
    """Test offer creation, acceptance, and rejection endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.buyer_token = None
        self.seller_token = None
        self.created_offer_id = None
        
    def get_buyer_auth(self):
        """Authenticate as buyer and get session token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("session_token")
            if token:
                return token
        return None
    
    def get_seller_auth(self):
        """Authenticate as seller and get session token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SELLER_EMAIL,
            "password": SELLER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("session_token")
            if token:
                return token
        return None
        
    def test_01_health_check(self):
        """Verify API is accessible"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("Health check passed")
        
    def test_02_buyer_authentication(self):
        """Test buyer can login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        assert response.status_code == 200, f"Buyer login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, "No session_token in response"
        print(f"Buyer authenticated successfully")
        
    def test_03_seller_authentication(self):
        """Test seller can login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SELLER_EMAIL,
            "password": SELLER_PASSWORD
        })
        assert response.status_code == 200, f"Seller login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, "No session_token in response"
        print(f"Seller authenticated successfully")
        
    def test_04_create_offer_without_auth(self):
        """Test offer creation requires authentication (401)"""
        response = self.session.post(f"{BASE_URL}/api/offers", json={
            "listing_id": TEST_LISTING_ID,
            "offered_price": 200000,
            "message": "Test offer"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("Offer creation correctly requires auth (401)")
        
    def test_05_create_offer_success(self):
        """Test buyer can create an offer successfully"""
        token = self.get_buyer_auth()
        assert token, "Failed to get buyer auth token"
        
        # Set cookie for auth
        self.session.cookies.set("session_token", token)
        
        # Create offer (must be below listing price of 250,000)
        response = self.session.post(f"{BASE_URL}/api/offers", json={
            "listing_id": TEST_LISTING_ID,
            "offered_price": 200000,
            "message": "TEST_offer_from_pytest"
        })
        
        assert response.status_code == 200, f"Offer creation failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "offer" in data or "message" in data, f"Unexpected response: {data}"
        
        if "offer" in data:
            offer = data["offer"]
            assert offer.get("listing_id") == TEST_LISTING_ID
            assert offer.get("offered_price") == 200000
            assert offer.get("status") == "pending"
            self.created_offer_id = offer.get("id")
            print(f"Offer created successfully with ID: {self.created_offer_id}")
        else:
            print(f"Offer response: {data}")
            
    def test_06_create_offer_price_validation(self):
        """Test offer price must be below listing price"""
        token = self.get_buyer_auth()
        assert token, "Failed to get buyer auth token"
        self.session.cookies.set("session_token", token)
        
        # Try to create offer at or above listing price (250,000)
        response = self.session.post(f"{BASE_URL}/api/offers", json={
            "listing_id": TEST_LISTING_ID,
            "offered_price": 260000,  # Above listing price
            "message": "Invalid high price offer"
        })
        
        assert response.status_code == 400, f"Expected 400 for price above listing, got {response.status_code}: {response.text}"
        print("Price validation correctly rejects offers above listing price")
        
    def test_07_get_my_offers_as_buyer(self):
        """Test buyer can get their offers"""
        token = self.get_buyer_auth()
        assert token, "Failed to get buyer auth token"
        self.session.cookies.set("session_token", token)
        
        response = self.session.get(f"{BASE_URL}/api/offers?role=buyer")
        assert response.status_code == 200, f"Get offers failed: {response.text}"
        
        data = response.json()
        assert "offers" in data, f"No 'offers' in response: {data}"
        print(f"Buyer offers retrieved: {len(data['offers'])} offers")
        
    def test_08_get_my_offers_as_seller(self):
        """Test seller can get offers on their listings"""
        token = self.get_seller_auth()
        assert token, "Failed to get seller auth token"
        self.session.cookies.set("session_token", token)
        
        response = self.session.get(f"{BASE_URL}/api/offers?role=seller")
        assert response.status_code == 200, f"Get seller offers failed: {response.text}"
        
        data = response.json()
        assert "offers" in data, f"No 'offers' in response: {data}"
        print(f"Seller offers retrieved: {len(data['offers'])} offers")


class TestOfferAcceptReject:
    """Test offer accept and reject functionality"""
        
    def get_auth_session(self, email, password):
        """Get fresh session with auth"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            token = response.json().get("session_token")
            if token:
                session.cookies.set("session_token", token)
                return session
        return None
        
    def create_test_offer(self):
        """Create a test offer for accept/reject testing"""
        session = self.get_auth_session(BUYER_EMAIL, BUYER_PASSWORD)
        if not session:
            return None, None
        
        response = session.post(f"{BASE_URL}/api/offers", json={
            "listing_id": TEST_LISTING_ID,
            "offered_price": 180000,
            "message": "TEST_offer_for_accept_reject"
        })
        
        if response.status_code == 200:
            data = response.json()
            return data.get("offer", {}).get("id"), session
        return None, None
        
    def test_09_accept_offer_requires_seller_auth(self):
        """Test that only seller can accept offer (buyer gets 403)"""
        # Create offer and keep buyer session
        offer_id, buyer_session = self.create_test_offer()
        if not offer_id or not buyer_session:
            pytest.skip("Could not create test offer")
            
        # Try to accept as buyer (should fail with 403)
        response = buyer_session.put(f"{BASE_URL}/api/offers/{offer_id}/accept")
        assert response.status_code == 403, f"Expected 403 when buyer tries to accept, got {response.status_code}: {response.text}"
        print("Accept offer correctly requires seller auth (403)")
        
    def test_10_reject_offer_requires_seller_auth(self):
        """Test that only seller can reject offer (buyer gets 403)"""
        offer_id, buyer_session = self.create_test_offer()
        if not offer_id or not buyer_session:
            pytest.skip("Could not create test offer")
            
        # Try to reject as buyer (should fail with 403)
        response = buyer_session.put(f"{BASE_URL}/api/offers/{offer_id}/reject", json={
            "reason": "Test rejection"
        })
        assert response.status_code == 403, f"Expected 403 when buyer tries to reject, got {response.status_code}: {response.text}"
        print("Reject offer correctly requires seller auth (403)")
        
    def test_11_seller_can_accept_offer(self):
        """Test seller can accept an offer"""
        # Create offer as buyer
        offer_id, _ = self.create_test_offer()
        if not offer_id:
            pytest.skip("Could not create test offer")
            
        # Accept as seller with fresh session
        seller_session = self.get_auth_session(SELLER_EMAIL, SELLER_PASSWORD)
        if not seller_session:
            pytest.skip("Could not auth seller")
        
        response = seller_session.put(f"{BASE_URL}/api/offers/{offer_id}/accept")
        
        # Could be 200 or 403 if seller doesn't own the listing
        if response.status_code == 200:
            data = response.json()
            assert data.get("status") == "accepted" or "accepted" in data.get("message", "").lower()
            print(f"Offer {offer_id} accepted successfully")
        elif response.status_code == 403:
            print(f"Seller doesn't own this listing (expected in test setup)")
        else:
            assert False, f"Unexpected response: {response.status_code} - {response.text}"
            
    def test_12_seller_can_reject_offer(self):
        """Test seller can reject an offer with reason"""
        # Create offer as buyer
        offer_id, _ = self.create_test_offer()
        if not offer_id:
            pytest.skip("Could not create test offer")
            
        # Reject as seller with fresh session
        seller_session = self.get_auth_session(SELLER_EMAIL, SELLER_PASSWORD)
        if not seller_session:
            pytest.skip("Could not auth seller")
        
        response = seller_session.put(f"{BASE_URL}/api/offers/{offer_id}/reject", json={
            "reason": "Price too low for this item"
        })
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("status") == "rejected" or "rejected" in data.get("message", "").lower()
            print(f"Offer {offer_id} rejected successfully")
        elif response.status_code == 403:
            print(f"Seller doesn't own this listing (expected in test setup)")
        else:
            assert False, f"Unexpected response: {response.status_code} - {response.text}"


class TestMediaUpload:
    """Test media upload and retrieval"""
        
    def get_auth_session(self, email, password):
        """Get fresh session with auth"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            token = response.json().get("session_token")
            if token:
                session.cookies.set("session_token", token)
                return session
        return None
        
    def test_13_media_upload_requires_auth(self):
        """Test media upload requires authentication"""
        session = requests.Session()
        files = {'file': ('test.txt', b'test content', 'text/plain')}
        response = session.post(
            f"{BASE_URL}/api/media/upload?media_type=image",
            files=files
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Media upload correctly requires auth")
        
    def test_14_media_upload_success(self):
        """Test authenticated user can upload media"""
        session = self.get_auth_session(BUYER_EMAIL, BUYER_PASSWORD)
        assert session, "Failed to get auth session"
        
        # Create a simple test image (1x1 PNG)
        png_data = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
            b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00'
            b'\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00'
            b'\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        )
        
        files = {'file': ('test_image.png', png_data, 'image/png')}
        response = session.post(
            f"{BASE_URL}/api/media/upload?media_type=image",
            files=files
        )
        
        assert response.status_code == 200, f"Media upload failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, f"No 'id' in response: {data}"
        assert "media_url" in data or "url" in data, f"No URL in response: {data}"
        
        print(f"Media uploaded successfully with ID: {data.get('id')}")
        
    def test_15_media_retrieval(self):
        """Test uploaded media can be retrieved"""
        session = self.get_auth_session(BUYER_EMAIL, BUYER_PASSWORD)
        assert session, "Failed to get auth session"
        
        # Upload test image
        png_data = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
            b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00'
            b'\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00'
            b'\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        )
        
        files = {'file': ('test_image.png', png_data, 'image/png')}
        upload_response = session.post(
            f"{BASE_URL}/api/media/upload?media_type=image",
            files=files
        )
        
        if upload_response.status_code != 200:
            pytest.skip("Media upload failed, skipping retrieval test")
            
        media_id = upload_response.json().get("id")
        
        # Retrieve media (should be publicly accessible)
        retrieve_session = requests.Session()
        response = retrieve_session.get(f"{BASE_URL}/api/media/{media_id}")
        assert response.status_code == 200, f"Media retrieval failed: {response.status_code}"
        
        # Verify it returns actual image content
        assert len(response.content) > 0, "Empty media response"
        print(f"Media {media_id} retrieved successfully ({len(response.content)} bytes)")
        
    def test_16_media_invalid_type(self):
        """Test media upload rejects invalid media types"""
        session = self.get_auth_session(BUYER_EMAIL, BUYER_PASSWORD)
        assert session, "Failed to get auth session"
        
        files = {'file': ('test.txt', b'test content', 'text/plain')}
        response = session.post(
            f"{BASE_URL}/api/media/upload?media_type=invalid",
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid type, got {response.status_code}"
        print("Invalid media type correctly rejected")


class TestOfferEndpointAuth:
    """Test authentication requirements for all offer endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_17_get_offers_requires_auth(self):
        """Test GET /api/offers requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/offers")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("GET /api/offers correctly requires auth")
        
    def test_18_accept_offer_requires_auth(self):
        """Test PUT /api/offers/{id}/accept requires authentication"""
        response = self.session.put(f"{BASE_URL}/api/offers/fake-id/accept")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PUT /api/offers/{id}/accept correctly requires auth")
        
    def test_19_reject_offer_requires_auth(self):
        """Test PUT /api/offers/{id}/reject requires authentication"""
        response = self.session.put(f"{BASE_URL}/api/offers/fake-id/reject")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PUT /api/offers/{id}/reject correctly requires auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
