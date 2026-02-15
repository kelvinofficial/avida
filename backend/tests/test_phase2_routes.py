"""
Test Suite for Phase 2 Refactored Routes (Categories, Favorites, Conversations)
Tests the modular routes extracted from server.py into backend/routes/
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Base URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://marketplace-ai-tools-1.preview.emergentagent.com')

# Test user credentials
TEST_PASSWORD = "test123456"


class TestCategoriesRoutes:
    """Test categories routes: /api/categories, /api/categories/{id}, /api/categories/{id}/subcategories"""
    
    def test_get_all_categories(self):
        """Test GET /api/categories returns all categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        
        assert response.status_code == 200, f"GET categories failed: {response.text}"
        data = response.json()
        
        # Should be a list of categories
        assert isinstance(data, list), "Categories should be a list"
        assert len(data) >= 13, f"Expected at least 13 categories, got {len(data)}"
        
        # Validate structure of first category
        first_cat = data[0]
        assert "id" in first_cat, "Category missing 'id'"
        assert "name" in first_cat, "Category missing 'name'"
        assert "icon" in first_cat, "Category missing 'icon'"
        assert "subcategories" in first_cat, "Category missing 'subcategories'"
        
        print(f"✓ Got {len(data)} categories")
    
    def test_get_specific_category(self):
        """Test GET /api/categories/{category_id} returns single category"""
        response = requests.get(f"{BASE_URL}/api/categories/auto_vehicles")
        
        assert response.status_code == 200, f"GET category failed: {response.text}"
        data = response.json()
        
        assert data["id"] == "auto_vehicles", f"Expected 'auto_vehicles', got {data['id']}"
        assert data["name"] == "Auto & Vehicles", f"Name mismatch: {data['name']}"
        assert len(data["subcategories"]) > 0, "Should have subcategories"
        
        # Validate subcategory structure
        first_sub = data["subcategories"][0]
        assert "id" in first_sub, "Subcategory missing 'id'"
        assert "name" in first_sub, "Subcategory missing 'name'"
        
        print(f"✓ Got category 'auto_vehicles' with {len(data['subcategories'])} subcategories")
    
    def test_get_category_legacy_mapping(self):
        """Test that legacy category IDs are mapped correctly"""
        # Legacy 'vehicles' should map to 'auto_vehicles'
        response = requests.get(f"{BASE_URL}/api/categories/vehicles")
        
        assert response.status_code == 200, f"Legacy category mapping failed: {response.text}"
        data = response.json()
        
        # Should return auto_vehicles data
        assert data["id"] == "auto_vehicles", "Legacy 'vehicles' should map to 'auto_vehicles'"
        print("✓ Legacy category 'vehicles' correctly mapped to 'auto_vehicles'")
    
    def test_get_category_not_found(self):
        """Test GET /api/categories/{id} returns 404 for invalid category"""
        response = requests.get(f"{BASE_URL}/api/categories/invalid_category_123")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid category correctly returns 404")
    
    def test_get_subcategories(self):
        """Test GET /api/categories/{id}/subcategories"""
        response = requests.get(f"{BASE_URL}/api/categories/electronics/subcategories")
        
        assert response.status_code == 200, f"GET subcategories failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Subcategories should be a list"
        assert len(data) > 0, "Electronics should have subcategories"
        
        # Check for known subcategories
        sub_ids = [s["id"] for s in data]
        assert "laptops_computers" in sub_ids, "Missing 'laptops_computers' subcategory"
        assert "video_games" in sub_ids, "Missing 'video_games' subcategory"
        
        print(f"✓ Got {len(data)} subcategories for 'electronics'")
    
    def test_get_subcategories_legacy_mapping(self):
        """Test subcategories endpoint with legacy category ID"""
        response = requests.get(f"{BASE_URL}/api/categories/realestate/subcategories")
        
        assert response.status_code == 200, f"Legacy subcategories failed: {response.text}"
        data = response.json()
        
        # Should return properties subcategories
        sub_ids = [s["id"] for s in data]
        assert "houses_apartments_rent" in sub_ids or "houses_apartments_sale" in sub_ids, \
            "Should have property subcategories"
        
        print("✓ Legacy 'realestate' subcategories correctly mapped to 'properties'")
    
    def test_get_subcategory_counts(self):
        """Test GET /api/categories/{id}/subcategory-counts"""
        response = requests.get(f"{BASE_URL}/api/categories/phones_tablets/subcategory-counts")
        
        assert response.status_code == 200, f"GET subcategory counts failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, dict), "Subcategory counts should be a dict"
        assert "_total" in data, "Should have _total field"
        
        # Should have counts for each subcategory (even if 0)
        assert "mobile_phones" in data, "Missing 'mobile_phones' count"
        assert isinstance(data["mobile_phones"], int), "Count should be an integer"
        
        print(f"✓ Got subcategory counts, total: {data['_total']}")


class TestFavoritesRoutes:
    """Test favorites routes: POST/DELETE /api/favorites/{listing_id}, GET /api/favorites"""
    
    session_token = None
    user_id = None
    listing_id = None
    
    @classmethod
    def setup_class(cls):
        """Create test user and listing before running favorites tests"""
        # Create test user
        email = f"test_favorites_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": "Test Favorites User"
        })
        assert response.status_code == 200, f"Failed to create test user: {response.text}"
        data = response.json()
        cls.session_token = data["session_token"]
        cls.user_id = data["user"]["user_id"]
        
        # Create a test listing to favorite
        headers = {"Authorization": f"Bearer {cls.session_token}"}
        listing_response = requests.post(f"{BASE_URL}/api/listings", json={
            "title": "Test Item for Favorites",
            "description": "This is a test listing for favorites testing",
            "price": 100,
            "category_id": "electronics",
            "subcategory": "laptops_computers",
            "location": "Berlin"
        }, headers=headers)
        assert listing_response.status_code == 200, f"Failed to create listing: {listing_response.text}"
        cls.listing_id = listing_response.json()["id"]
        
        print(f"Setup: Created user {cls.user_id} and listing {cls.listing_id}")
    
    def test_add_favorite(self):
        """Test POST /api/favorites/{listing_id}"""
        headers = {"Authorization": f"Bearer {TestFavoritesRoutes.session_token}"}
        response = requests.post(
            f"{BASE_URL}/api/favorites/{TestFavoritesRoutes.listing_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Add favorite failed: {response.text}"
        data = response.json()
        assert "message" in data, "Missing message in response"
        
        print(f"✓ Added listing {TestFavoritesRoutes.listing_id} to favorites")
    
    def test_add_favorite_duplicate(self):
        """Test adding same favorite twice returns 'already favorited'"""
        headers = {"Authorization": f"Bearer {TestFavoritesRoutes.session_token}"}
        response = requests.post(
            f"{BASE_URL}/api/favorites/{TestFavoritesRoutes.listing_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Duplicate favorite request failed: {response.text}"
        data = response.json()
        assert "already" in data.get("message", "").lower(), \
            "Should indicate already favorited"
        
        print("✓ Duplicate favorite correctly handled")
    
    def test_add_favorite_nonexistent_listing(self):
        """Test POST /api/favorites/{listing_id} for non-existent listing"""
        headers = {"Authorization": f"Bearer {TestFavoritesRoutes.session_token}"}
        response = requests.post(
            f"{BASE_URL}/api/favorites/nonexistent_listing_123",
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent listing favorite correctly returns 404")
    
    def test_add_favorite_unauthenticated(self):
        """Test POST /api/favorites/{listing_id} without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/favorites/{TestFavoritesRoutes.listing_id}"
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthenticated favorite request correctly rejected")
    
    def test_get_favorites(self):
        """Test GET /api/favorites returns user's favorites"""
        headers = {"Authorization": f"Bearer {TestFavoritesRoutes.session_token}"}
        response = requests.get(f"{BASE_URL}/api/favorites", headers=headers)
        
        assert response.status_code == 200, f"GET favorites failed: {response.text}"
        data = response.json()
        
        # Should be a list of listings
        assert isinstance(data, list), "Favorites should be a list"
        
        # Should contain our test listing
        listing_ids = [l["id"] for l in data]
        assert TestFavoritesRoutes.listing_id in listing_ids, \
            "Test listing should be in favorites"
        
        print(f"✓ Got {len(data)} favorite listings")
    
    def test_get_favorites_unauthenticated(self):
        """Test GET /api/favorites without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/favorites")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthenticated GET favorites correctly rejected")
    
    def test_remove_favorite(self):
        """Test DELETE /api/favorites/{listing_id}"""
        headers = {"Authorization": f"Bearer {TestFavoritesRoutes.session_token}"}
        response = requests.delete(
            f"{BASE_URL}/api/favorites/{TestFavoritesRoutes.listing_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Remove favorite failed: {response.text}"
        data = response.json()
        assert "message" in data, "Missing message in response"
        
        print(f"✓ Removed listing {TestFavoritesRoutes.listing_id} from favorites")
    
    def test_remove_favorite_verify_removed(self):
        """Verify favorite is actually removed from list"""
        headers = {"Authorization": f"Bearer {TestFavoritesRoutes.session_token}"}
        response = requests.get(f"{BASE_URL}/api/favorites", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should not contain our test listing anymore
        listing_ids = [l["id"] for l in data]
        assert TestFavoritesRoutes.listing_id not in listing_ids, \
            "Removed listing should not be in favorites"
        
        print("✓ Verified favorite was removed from list")


class TestConversationsRoutes:
    """Test conversations routes: POST/GET /api/conversations, POST /api/conversations/{id}/messages"""
    
    buyer_session_token = None
    buyer_user_id = None
    seller_session_token = None
    seller_user_id = None
    listing_id = None
    conversation_id = None
    
    @classmethod
    def setup_class(cls):
        """Create test users and listing before running conversation tests"""
        # Create seller user
        seller_email = f"test_seller_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": seller_email,
            "password": TEST_PASSWORD,
            "name": "Test Seller"
        })
        assert response.status_code == 200, f"Failed to create seller: {response.text}"
        data = response.json()
        cls.seller_session_token = data["session_token"]
        cls.seller_user_id = data["user"]["user_id"]
        
        # Create buyer user
        buyer_email = f"test_buyer_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": buyer_email,
            "password": TEST_PASSWORD,
            "name": "Test Buyer"
        })
        assert response.status_code == 200, f"Failed to create buyer: {response.text}"
        data = response.json()
        cls.buyer_session_token = data["session_token"]
        cls.buyer_user_id = data["user"]["user_id"]
        
        # Seller creates a listing
        headers = {"Authorization": f"Bearer {cls.seller_session_token}"}
        listing_response = requests.post(f"{BASE_URL}/api/listings", json={
            "title": "Test Item for Conversation",
            "description": "This is a test listing for conversation testing",
            "price": 500,
            "category_id": "electronics",
            "subcategory": "laptops_computers",
            "location": "Munich"
        }, headers=headers)
        assert listing_response.status_code == 200, f"Failed to create listing: {listing_response.text}"
        cls.listing_id = listing_response.json()["id"]
        
        print(f"Setup: Created seller {cls.seller_user_id}, buyer {cls.buyer_user_id}, listing {cls.listing_id}")
    
    def test_create_conversation(self):
        """Test POST /api/conversations to create a conversation for a listing"""
        headers = {"Authorization": f"Bearer {TestConversationsRoutes.buyer_session_token}"}
        response = requests.post(
            f"{BASE_URL}/api/conversations",
            params={"listing_id": TestConversationsRoutes.listing_id},
            headers=headers
        )
        
        assert response.status_code == 200, f"Create conversation failed: {response.text}"
        data = response.json()
        
        # Validate conversation structure
        assert "id" in data, "Missing conversation id"
        assert data["listing_id"] == TestConversationsRoutes.listing_id, "Listing ID mismatch"
        assert data["buyer_id"] == TestConversationsRoutes.buyer_user_id, "Buyer ID mismatch"
        assert data["seller_id"] == TestConversationsRoutes.seller_user_id, "Seller ID mismatch"
        
        # Store for subsequent tests
        TestConversationsRoutes.conversation_id = data["id"]
        
        print(f"✓ Created conversation {data['id']}")
    
    def test_create_conversation_duplicate(self):
        """Test creating conversation for same listing returns existing conversation"""
        headers = {"Authorization": f"Bearer {TestConversationsRoutes.buyer_session_token}"}
        response = requests.post(
            f"{BASE_URL}/api/conversations",
            params={"listing_id": TestConversationsRoutes.listing_id},
            headers=headers
        )
        
        assert response.status_code == 200, f"Duplicate conversation request failed: {response.text}"
        data = response.json()
        
        # Should return the same conversation ID
        assert data["id"] == TestConversationsRoutes.conversation_id, \
            "Should return existing conversation"
        
        print("✓ Duplicate conversation request returns existing conversation")
    
    def test_create_conversation_own_listing(self):
        """Test creating conversation for own listing returns 400"""
        headers = {"Authorization": f"Bearer {TestConversationsRoutes.seller_session_token}"}
        response = requests.post(
            f"{BASE_URL}/api/conversations",
            params={"listing_id": TestConversationsRoutes.listing_id},
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400 for own listing, got {response.status_code}"
        data = response.json()
        assert "own" in data.get("detail", "").lower(), "Should mention can't message own listing"
        
        print("✓ Cannot create conversation for own listing")
    
    def test_create_conversation_nonexistent_listing(self):
        """Test POST /api/conversations for non-existent listing"""
        headers = {"Authorization": f"Bearer {TestConversationsRoutes.buyer_session_token}"}
        response = requests.post(
            f"{BASE_URL}/api/conversations",
            params={"listing_id": "nonexistent_listing_123"},
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent listing correctly returns 404")
    
    def test_create_conversation_unauthenticated(self):
        """Test POST /api/conversations without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/conversations",
            params={"listing_id": TestConversationsRoutes.listing_id}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthenticated conversation creation correctly rejected")
    
    def test_get_conversations(self):
        """Test GET /api/conversations returns user's conversations"""
        headers = {"Authorization": f"Bearer {TestConversationsRoutes.buyer_session_token}"}
        response = requests.get(f"{BASE_URL}/api/conversations", headers=headers)
        
        assert response.status_code == 200, f"GET conversations failed: {response.text}"
        data = response.json()
        
        # Should be a list of conversations
        assert isinstance(data, list), "Conversations should be a list"
        
        # Should contain our test conversation
        conv_ids = [c["id"] for c in data]
        assert TestConversationsRoutes.conversation_id in conv_ids, \
            "Test conversation should be in list"
        
        # Validate enriched data
        test_conv = next(c for c in data if c["id"] == TestConversationsRoutes.conversation_id)
        assert "listing" in test_conv or test_conv.get("listing_id"), "Should have listing info"
        assert "other_user" in test_conv, "Should have other_user info"
        
        print(f"✓ Got {len(data)} conversations")
    
    def test_get_conversations_seller_view(self):
        """Test seller also sees the conversation"""
        headers = {"Authorization": f"Bearer {TestConversationsRoutes.seller_session_token}"}
        response = requests.get(f"{BASE_URL}/api/conversations", headers=headers)
        
        assert response.status_code == 200, f"GET seller conversations failed: {response.text}"
        data = response.json()
        
        conv_ids = [c["id"] for c in data]
        assert TestConversationsRoutes.conversation_id in conv_ids, \
            "Seller should also see the conversation"
        
        print("✓ Seller correctly sees conversation")
    
    def test_get_single_conversation(self):
        """Test GET /api/conversations/{id}"""
        headers = {"Authorization": f"Bearer {TestConversationsRoutes.buyer_session_token}"}
        response = requests.get(
            f"{BASE_URL}/api/conversations/{TestConversationsRoutes.conversation_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"GET conversation failed: {response.text}"
        data = response.json()
        
        assert data["id"] == TestConversationsRoutes.conversation_id, "ID mismatch"
        assert "messages" in data, "Should have messages array"
        assert "listing" in data or data.get("listing_id"), "Should have listing info"
        assert "other_user" in data, "Should have other_user info"
        
        print(f"✓ Got conversation with {len(data.get('messages', []))} messages")
    
    def test_get_conversation_unauthorized(self):
        """Test GET /api/conversations/{id} by non-participant returns 403"""
        # Create third user
        email = f"test_third_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": "Third User"
        })
        third_token = response.json()["session_token"]
        
        headers = {"Authorization": f"Bearer {third_token}"}
        response = requests.get(
            f"{BASE_URL}/api/conversations/{TestConversationsRoutes.conversation_id}",
            headers=headers
        )
        
        assert response.status_code == 403, f"Expected 403 for non-participant, got {response.status_code}"
        print("✓ Non-participant correctly denied access to conversation")
    
    def test_send_message(self):
        """Test POST /api/conversations/{id}/messages"""
        headers = {"Authorization": f"Bearer {TestConversationsRoutes.buyer_session_token}"}
        message_content = "Hello! Is this item still available?"
        
        response = requests.post(
            f"{BASE_URL}/api/conversations/{TestConversationsRoutes.conversation_id}/messages",
            json={"content": message_content},
            headers=headers
        )
        
        assert response.status_code == 200, f"Send message failed: {response.text}"
        data = response.json()
        
        assert "id" in data, "Message should have id"
        assert data["content"] == message_content, "Message content mismatch"
        assert data["sender_id"] == TestConversationsRoutes.buyer_user_id, "Sender ID mismatch"
        
        print(f"✓ Sent message: {message_content[:30]}...")
    
    def test_send_message_seller_reply(self):
        """Test seller can reply to the conversation"""
        headers = {"Authorization": f"Bearer {TestConversationsRoutes.seller_session_token}"}
        message_content = "Yes, it's still available! Would you like to meet?"
        
        response = requests.post(
            f"{BASE_URL}/api/conversations/{TestConversationsRoutes.conversation_id}/messages",
            json={"content": message_content},
            headers=headers
        )
        
        assert response.status_code == 200, f"Seller reply failed: {response.text}"
        data = response.json()
        
        assert data["sender_id"] == TestConversationsRoutes.seller_user_id, "Seller ID mismatch"
        
        print(f"✓ Seller replied: {message_content[:30]}...")
    
    def test_verify_messages_in_conversation(self):
        """Verify all messages appear in conversation"""
        headers = {"Authorization": f"Bearer {TestConversationsRoutes.buyer_session_token}"}
        response = requests.get(
            f"{BASE_URL}/api/conversations/{TestConversationsRoutes.conversation_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        messages = data.get("messages", [])
        assert len(messages) >= 2, f"Should have at least 2 messages, got {len(messages)}"
        
        # Check both buyer and seller messages exist
        sender_ids = [m["sender_id"] for m in messages]
        assert TestConversationsRoutes.buyer_user_id in sender_ids, "Buyer message missing"
        assert TestConversationsRoutes.seller_user_id in sender_ids, "Seller message missing"
        
        print(f"✓ Verified {len(messages)} messages in conversation")
    
    def test_send_message_unauthorized(self):
        """Test sending message to conversation you're not part of returns 403"""
        # Create third user
        email = f"test_intruder_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": "Intruder User"
        })
        intruder_token = response.json()["session_token"]
        
        headers = {"Authorization": f"Bearer {intruder_token}"}
        response = requests.post(
            f"{BASE_URL}/api/conversations/{TestConversationsRoutes.conversation_id}/messages",
            json={"content": "Intruder message!"},
            headers=headers
        )
        
        assert response.status_code == 403, f"Expected 403 for intruder, got {response.status_code}"
        print("✓ Non-participant correctly denied sending messages")


class TestDirectConversations:
    """Test direct conversation routes: POST /api/conversations/direct"""
    
    user1_token = None
    user1_id = None
    user2_token = None
    user2_id = None
    direct_conv_id = None
    
    @classmethod
    def setup_class(cls):
        """Create test users for direct conversations"""
        # Create first user
        email1 = f"test_direct1_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email1,
            "password": TEST_PASSWORD,
            "name": "Direct User 1"
        })
        assert response.status_code == 200
        data = response.json()
        cls.user1_token = data["session_token"]
        cls.user1_id = data["user"]["user_id"]
        
        # Create second user
        email2 = f"test_direct2_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email2,
            "password": TEST_PASSWORD,
            "name": "Direct User 2"
        })
        assert response.status_code == 200
        data = response.json()
        cls.user2_token = data["session_token"]
        cls.user2_id = data["user"]["user_id"]
        
        print(f"Setup: Created users {cls.user1_id} and {cls.user2_id}")
    
    def test_create_direct_conversation(self):
        """Test POST /api/conversations/direct to create a direct conversation"""
        headers = {"Authorization": f"Bearer {TestDirectConversations.user1_token}"}
        response = requests.post(
            f"{BASE_URL}/api/conversations/direct",
            json={"user_id": TestDirectConversations.user2_id},
            headers=headers
        )
        
        assert response.status_code == 200, f"Create direct conversation failed: {response.text}"
        data = response.json()
        
        assert "id" in data, "Missing conversation id"
        assert data.get("listing_id") == "direct" or data.get("is_direct") == True, \
            "Should be marked as direct conversation"
        
        TestDirectConversations.direct_conv_id = data["id"]
        print(f"✓ Created direct conversation {data['id']}")
    
    def test_create_direct_conversation_self(self):
        """Test creating direct conversation with self returns 400"""
        headers = {"Authorization": f"Bearer {TestDirectConversations.user1_token}"}
        response = requests.post(
            f"{BASE_URL}/api/conversations/direct",
            json={"user_id": TestDirectConversations.user1_id},
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400 for self-conversation, got {response.status_code}"
        print("✓ Cannot create direct conversation with self")
    
    def test_create_direct_conversation_nonexistent_user(self):
        """Test POST /api/conversations/direct with non-existent user returns 404"""
        headers = {"Authorization": f"Bearer {TestDirectConversations.user1_token}"}
        response = requests.post(
            f"{BASE_URL}/api/conversations/direct",
            json={"user_id": "nonexistent_user_123"},
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent user correctly returns 404")


class TestAuthRoutesPhase2:
    """Verify auth routes still work after Phase 2 refactoring"""
    
    def test_auth_register(self):
        """Test POST /api/auth/register still works"""
        email = f"test_auth_p2_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": "Auth Test User P2"
        })
        
        assert response.status_code == 200, f"Register failed: {response.text}"
        data = response.json()
        assert "session_token" in data, "Missing session_token"
        assert "user" in data, "Missing user"
        
        print("✓ Auth register still working")
    
    def test_auth_login(self):
        """Test POST /api/auth/login still works"""
        # First register
        email = f"test_login_p2_{uuid.uuid4().hex[:8]}@test.com"
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": "Login Test User P2"
        })
        
        # Then login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        print("✓ Auth login still working")
    
    def test_auth_me(self):
        """Test GET /api/auth/me still works"""
        email = f"test_me_p2_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": "Me Test User P2"
        })
        token = reg_response.json()["session_token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert response.status_code == 200, f"GET /me failed: {response.text}"
        print("✓ Auth /me still working")
    
    def test_auth_logout(self):
        """Test POST /api/auth/logout still works"""
        email = f"test_logout_p2_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": "Logout Test User P2"
        })
        token = reg_response.json()["session_token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(f"{BASE_URL}/api/auth/logout", headers=headers)
        
        assert response.status_code == 200, f"Logout failed: {response.text}"
        print("✓ Auth logout still working")


class TestListingsRoutesPhase2:
    """Verify listings routes still work after Phase 2 refactoring"""
    
    session_token = None
    listing_id = None
    
    @classmethod
    def setup_class(cls):
        """Setup for listings tests"""
        email = f"test_listings_p2_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": "Listings Test User P2"
        })
        cls.session_token = response.json()["session_token"]
    
    def test_create_listing(self):
        """Test POST /api/listings still works"""
        headers = {"Authorization": f"Bearer {TestListingsRoutesPhase2.session_token}"}
        response = requests.post(f"{BASE_URL}/api/listings", json={
            "title": "Test Listing P2",
            "description": "Test description",
            "price": 100,
            "category_id": "electronics",
            "subcategory": "laptops_computers"
        }, headers=headers)
        
        assert response.status_code == 200, f"Create listing failed: {response.text}"
        TestListingsRoutesPhase2.listing_id = response.json()["id"]
        print("✓ Listings create still working")
    
    def test_get_listings(self):
        """Test GET /api/listings still works"""
        response = requests.get(f"{BASE_URL}/api/listings")
        
        assert response.status_code == 200, f"GET listings failed: {response.text}"
        data = response.json()
        assert "listings" in data, "Missing listings"
        print("✓ Listings GET still working")
    
    def test_get_my_listings(self):
        """Test GET /api/listings/my still works"""
        headers = {"Authorization": f"Bearer {TestListingsRoutesPhase2.session_token}"}
        response = requests.get(f"{BASE_URL}/api/listings/my", headers=headers)
        
        assert response.status_code == 200, f"GET my listings failed: {response.text}"
        print("✓ Listings /my still working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
