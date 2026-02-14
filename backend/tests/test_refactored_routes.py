"""
Test Suite for Refactored Routes (Auth, Users, Listings)
Tests the modular routes extracted from server.py into backend/routes/
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Base URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://mobile-header-ui.preview.emergentagent.com')

# Test user credentials
TEST_EMAIL = f"test_refactor_{uuid.uuid4().hex[:8]}@test.com"
TEST_PASSWORD = "test123456"
TEST_NAME = "Test Refactor User"


class TestAuthRoutes:
    """Test auth routes: /api/auth/register, /api/auth/login, /api/auth/me, /api/auth/logout"""
    
    session_token = None
    user_id = None
    
    def test_register_user(self):
        """Test user registration via /api/auth/register"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "user" in data, "Missing 'user' in response"
        assert "session_token" in data, "Missing 'session_token' in response"
        assert "message" in data, "Missing 'message' in response"
        
        # Validate user data
        user = data["user"]
        assert user["email"] == TEST_EMAIL.lower(), "Email mismatch"
        assert user["name"] == TEST_NAME, "Name mismatch"
        assert "user_id" in user, "Missing user_id"
        assert "password_hash" not in user, "Password hash should not be returned"
        
        # Store for subsequent tests
        TestAuthRoutes.session_token = data["session_token"]
        TestAuthRoutes.user_id = user["user_id"]
        
        print(f"✓ User registered successfully: {user['user_id']}")
    
    def test_register_duplicate_email(self):
        """Test registration with duplicate email returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,  # Same email as above
            "password": TEST_PASSWORD,
            "name": "Duplicate User"
        })
        
        assert response.status_code == 400, f"Expected 400 for duplicate email, got {response.status_code}"
        data = response.json()
        assert "already registered" in data.get("detail", "").lower(), "Expected 'already registered' message"
        
        print("✓ Duplicate email registration correctly rejected")
    
    def test_register_invalid_email(self):
        """Test registration with invalid email returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "invalid-email",
            "password": TEST_PASSWORD,
            "name": "Test User"
        })
        
        assert response.status_code == 400, f"Expected 400 for invalid email, got {response.status_code}"
        print("✓ Invalid email registration correctly rejected")
    
    def test_register_short_password(self):
        """Test registration with short password returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_{uuid.uuid4().hex[:6]}@test.com",
            "password": "123",  # Too short
            "name": "Test User"
        })
        
        assert response.status_code == 400, f"Expected 400 for short password, got {response.status_code}"
        data = response.json()
        assert "at least 6 characters" in data.get("detail", "").lower(), "Expected password length error"
        
        print("✓ Short password registration correctly rejected")
    
    def test_login_success(self):
        """Test login with valid credentials via /api/auth/login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "user" in data, "Missing 'user' in response"
        assert "session_token" in data, "Missing 'session_token' in response"
        
        # Validate user data
        user = data["user"]
        assert user["email"] == TEST_EMAIL.lower(), "Email mismatch"
        assert "password_hash" not in user, "Password hash should not be returned"
        
        # Update session token
        TestAuthRoutes.session_token = data["session_token"]
        
        print(f"✓ Login successful for {user['email']}")
    
    def test_login_invalid_password(self):
        """Test login with invalid password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401 for invalid password, got {response.status_code}"
        print("✓ Invalid password login correctly rejected")
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent email returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 401, f"Expected 401 for nonexistent user, got {response.status_code}"
        print("✓ Non-existent user login correctly rejected")
    
    def test_get_me_authenticated(self):
        """Test GET /api/auth/me with valid session"""
        headers = {"Authorization": f"Bearer {TestAuthRoutes.session_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert response.status_code == 200, f"GET /me failed: {response.text}"
        data = response.json()
        
        assert data["email"] == TEST_EMAIL.lower(), "Email mismatch"
        assert data["user_id"] == TestAuthRoutes.user_id, "User ID mismatch"
        
        print(f"✓ GET /me returned correct user: {data['email']}")
    
    def test_get_me_unauthenticated(self):
        """Test GET /api/auth/me without session returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ GET /me without auth correctly rejected")
    
    def test_logout(self):
        """Test POST /api/auth/logout"""
        headers = {"Authorization": f"Bearer {TestAuthRoutes.session_token}"}
        response = requests.post(f"{BASE_URL}/api/auth/logout", headers=headers)
        
        assert response.status_code == 200, f"Logout failed: {response.text}"
        data = response.json()
        assert "message" in data, "Missing message in logout response"
        
        print("✓ Logout successful")
    
    def test_session_invalid_after_logout(self):
        """Test that session is invalid after logout"""
        headers = {"Authorization": f"Bearer {TestAuthRoutes.session_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        # Session should be invalid now
        assert response.status_code == 401, f"Expected 401 after logout, got {response.status_code}"
        print("✓ Session correctly invalidated after logout")


class TestUsersRoutes:
    """Test user routes: /api/users/{id}, /api/users/me, block/unblock, status"""
    
    session_token = None
    user_id = None
    other_user_id = None
    
    @classmethod
    def setup_class(cls):
        """Create test users before running user tests"""
        # Create primary test user
        email = f"test_user_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": "Test User Primary"
        })
        assert response.status_code == 200, f"Failed to create test user: {response.text}"
        data = response.json()
        cls.session_token = data["session_token"]
        cls.user_id = data["user"]["user_id"]
        
        # Create secondary user to test block/unblock
        email2 = f"test_user2_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email2,
            "password": TEST_PASSWORD,
            "name": "Test User Secondary"
        })
        assert response.status_code == 200
        cls.other_user_id = response.json()["user"]["user_id"]
    
    def test_get_user_profile(self):
        """Test GET /api/users/{user_id} returns public profile"""
        response = requests.get(f"{BASE_URL}/api/users/{TestUsersRoutes.user_id}")
        
        assert response.status_code == 200, f"GET user failed: {response.text}"
        data = response.json()
        
        # Validate public profile fields
        assert "user_id" in data, "Missing user_id"
        assert "name" in data, "Missing name"
        assert data["user_id"] == TestUsersRoutes.user_id, "User ID mismatch"
        
        # Ensure sensitive data is not exposed
        assert "password_hash" not in data, "Password hash should not be in public profile"
        assert "blocked_users" not in data, "Blocked users should not be in public profile"
        
        print(f"✓ Got public profile for user: {data['user_id']}")
    
    def test_get_nonexistent_user(self):
        """Test GET /api/users/{user_id} for non-existent user returns 404"""
        response = requests.get(f"{BASE_URL}/api/users/nonexistent_user_123")
        
        assert response.status_code == 404, f"Expected 404 for nonexistent user, got {response.status_code}"
        print("✓ Non-existent user correctly returns 404")
    
    def test_update_user_profile(self):
        """Test PUT /api/users/me to update profile"""
        headers = {"Authorization": f"Bearer {TestUsersRoutes.session_token}"}
        update_data = {
            "name": "Updated Test User",
            "bio": "This is my updated bio",
            "location": "Test City"
        }
        
        response = requests.put(f"{BASE_URL}/api/users/me", json=update_data, headers=headers)
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "Updated Test User", "Name not updated"
        assert data.get("bio") == "This is my updated bio", "Bio not updated"
        assert data.get("location") == "Test City", "Location not updated"
        
        print("✓ User profile updated successfully")
    
    def test_update_user_unauthenticated(self):
        """Test PUT /api/users/me without auth returns 401"""
        response = requests.put(f"{BASE_URL}/api/users/me", json={"name": "New Name"})
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Update without auth correctly rejected")
    
    def test_block_user(self):
        """Test POST /api/users/block/{user_id}"""
        headers = {"Authorization": f"Bearer {TestUsersRoutes.session_token}"}
        response = requests.post(
            f"{BASE_URL}/api/users/block/{TestUsersRoutes.other_user_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Block user failed: {response.text}"
        data = response.json()
        assert "blocked" in data.get("message", "").lower(), "Expected 'blocked' in message"
        
        print(f"✓ User {TestUsersRoutes.other_user_id} blocked successfully")
    
    def test_unblock_user(self):
        """Test POST /api/users/unblock/{user_id}"""
        headers = {"Authorization": f"Bearer {TestUsersRoutes.session_token}"}
        response = requests.post(
            f"{BASE_URL}/api/users/unblock/{TestUsersRoutes.other_user_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Unblock user failed: {response.text}"
        data = response.json()
        assert "unblocked" in data.get("message", "").lower(), "Expected 'unblocked' in message"
        
        print(f"✓ User {TestUsersRoutes.other_user_id} unblocked successfully")
    
    def test_get_user_status(self):
        """Test GET /api/users/{user_id}/status"""
        response = requests.get(f"{BASE_URL}/api/users/{TestUsersRoutes.user_id}/status")
        
        assert response.status_code == 200, f"GET status failed: {response.text}"
        data = response.json()
        
        assert "user_id" in data, "Missing user_id in status response"
        assert "is_online" in data, "Missing is_online in status response"
        
        print(f"✓ Got user status: online={data['is_online']}")
    
    def test_get_batch_user_status(self):
        """Test POST /api/users/status/batch"""
        user_ids = [TestUsersRoutes.user_id, TestUsersRoutes.other_user_id]
        response = requests.post(f"{BASE_URL}/api/users/status/batch", json=user_ids)
        
        assert response.status_code == 200, f"Batch status failed: {response.text}"
        data = response.json()
        
        # Should have status for both users
        assert TestUsersRoutes.user_id in data, "Missing status for primary user"
        assert TestUsersRoutes.other_user_id in data, "Missing status for secondary user"
        
        print(f"✓ Got batch status for {len(data)} users")


class TestListingsRoutes:
    """Test listing routes: CRUD, search, my listings, similar listings"""
    
    session_token = None
    user_id = None
    listing_id = None
    
    @classmethod
    def setup_class(cls):
        """Create test user and listing before running tests"""
        # Create test user
        email = f"test_listing_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": "Test Listing User"
        })
        assert response.status_code == 200, f"Failed to create test user: {response.text}"
        data = response.json()
        cls.session_token = data["session_token"]
        cls.user_id = data["user"]["user_id"]
    
    def test_create_listing(self):
        """Test POST /api/listings to create a new listing"""
        headers = {"Authorization": f"Bearer {TestListingsRoutes.session_token}"}
        listing_data = {
            "title": "Test iPhone 13 Pro",
            "description": "Test listing for API testing. Great condition.",
            "price": 799.99,
            "currency": "EUR",
            "negotiable": True,
            "category_id": "phones_tablets",
            "subcategory": "mobile_phones",
            "condition": "used_good",
            "images": [],
            "location": "Berlin, Germany",
            "attributes": {
                "brand": "Apple",
                "model": "iPhone 13 Pro",
                "storage": "256GB"
            },
            "accepts_offers": True,
            "accepts_exchanges": False,
            "contact_methods": ["in_app_chat"]
        }
        
        response = requests.post(f"{BASE_URL}/api/listings", json=listing_data, headers=headers)
        
        assert response.status_code == 200, f"Create listing failed: {response.text}"
        data = response.json()
        
        # Validate response
        assert "id" in data, "Missing listing id"
        assert data["title"] == listing_data["title"], "Title mismatch"
        assert data["price"] == listing_data["price"], "Price mismatch"
        assert data["status"] == "active", "Listing should be active"
        
        # Store for subsequent tests
        TestListingsRoutes.listing_id = data["id"]
        
        print(f"✓ Listing created: {data['id']}")
    
    def test_create_listing_invalid_category(self):
        """Test POST /api/listings with invalid category returns 400"""
        headers = {"Authorization": f"Bearer {TestListingsRoutes.session_token}"}
        listing_data = {
            "title": "Test Item",
            "description": "Test description",
            "price": 100,
            "category_id": "invalid_category",
            "subcategory": "invalid_sub"
        }
        
        response = requests.post(f"{BASE_URL}/api/listings", json=listing_data, headers=headers)
        
        assert response.status_code == 400, f"Expected 400 for invalid category, got {response.status_code}"
        print("✓ Invalid category correctly rejected")
    
    def test_create_listing_unauthenticated(self):
        """Test POST /api/listings without auth returns 401"""
        response = requests.post(f"{BASE_URL}/api/listings", json={
            "title": "Test",
            "description": "Test",
            "price": 100,
            "category_id": "phones_tablets",
            "subcategory": "mobile_phones"
        })
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Create listing without auth correctly rejected")
    
    def test_get_listings(self):
        """Test GET /api/listings to get all listings"""
        response = requests.get(f"{BASE_URL}/api/listings")
        
        assert response.status_code == 200, f"GET listings failed: {response.text}"
        data = response.json()
        
        assert "listings" in data, "Missing 'listings' in response"
        assert "total" in data, "Missing 'total' in response"
        assert "page" in data, "Missing 'page' in response"
        assert isinstance(data["listings"], list), "Listings should be a list"
        
        print(f"✓ Got {len(data['listings'])} listings, total: {data['total']}")
    
    def test_get_listings_with_filters(self):
        """Test GET /api/listings with category and search filters"""
        params = {
            "category": "phones_tablets",
            "search": "iPhone",
            "sort": "newest",
            "page": 1,
            "limit": 10
        }
        response = requests.get(f"{BASE_URL}/api/listings", params=params)
        
        assert response.status_code == 200, f"GET filtered listings failed: {response.text}"
        data = response.json()
        
        assert "listings" in data, "Missing 'listings' in response"
        print(f"✓ Got {len(data['listings'])} filtered listings")
    
    def test_get_single_listing(self):
        """Test GET /api/listings/{listing_id}"""
        response = requests.get(f"{BASE_URL}/api/listings/{TestListingsRoutes.listing_id}")
        
        assert response.status_code == 200, f"GET listing failed: {response.text}"
        data = response.json()
        
        assert data["id"] == TestListingsRoutes.listing_id, "Listing ID mismatch"
        assert "seller" in data, "Missing seller info"
        assert "is_favorited" in data, "Missing is_favorited field"
        
        print(f"✓ Got listing: {data['title']}")
    
    def test_get_nonexistent_listing(self):
        """Test GET /api/listings/{listing_id} for non-existent listing returns 404"""
        response = requests.get(f"{BASE_URL}/api/listings/nonexistent_listing_123")
        
        assert response.status_code == 404, f"Expected 404 for nonexistent listing, got {response.status_code}"
        print("✓ Non-existent listing correctly returns 404")
    
    def test_get_my_listings(self):
        """Test GET /api/listings/my to get user's own listings"""
        headers = {"Authorization": f"Bearer {TestListingsRoutes.session_token}"}
        response = requests.get(f"{BASE_URL}/api/listings/my", headers=headers)
        
        assert response.status_code == 200, f"GET my listings failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        # Should contain the listing we created
        listing_ids = [l["id"] for l in data]
        assert TestListingsRoutes.listing_id in listing_ids, "Created listing not in my listings"
        
        print(f"✓ Got {len(data)} user listings")
    
    def test_get_my_listings_unauthenticated(self):
        """Test GET /api/listings/my without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/listings/my")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ GET my listings without auth correctly rejected")
    
    def test_update_listing(self):
        """Test PUT /api/listings/{listing_id} to update a listing"""
        headers = {"Authorization": f"Bearer {TestListingsRoutes.session_token}"}
        update_data = {
            "title": "Updated iPhone 13 Pro",
            "price": 749.99,
            "description": "Updated description - price reduced!"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/listings/{TestListingsRoutes.listing_id}",
            json=update_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Update listing failed: {response.text}"
        data = response.json()
        
        assert data["title"] == "Updated iPhone 13 Pro", "Title not updated"
        assert data["price"] == 749.99, "Price not updated"
        
        print(f"✓ Listing updated: {data['title']} - €{data['price']}")
    
    def test_update_listing_unauthorized(self):
        """Test PUT /api/listings/{listing_id} by different user returns 403"""
        # Create another user
        email = f"test_other_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": "Other User"
        })
        other_token = response.json()["session_token"]
        
        # Try to update listing owned by different user
        headers = {"Authorization": f"Bearer {other_token}"}
        response = requests.put(
            f"{BASE_URL}/api/listings/{TestListingsRoutes.listing_id}",
            json={"title": "Hacked Title"},
            headers=headers
        )
        
        assert response.status_code == 403, f"Expected 403 for unauthorized update, got {response.status_code}"
        print("✓ Unauthorized update correctly rejected")
    
    def test_get_similar_listings(self):
        """Test GET /api/listings/similar/{listing_id}"""
        response = requests.get(f"{BASE_URL}/api/listings/similar/{TestListingsRoutes.listing_id}")
        
        assert response.status_code == 200, f"GET similar listings failed: {response.text}"
        data = response.json()
        
        assert "listings" in data, "Missing 'listings' in response"
        assert "total" in data, "Missing 'total' in response"
        
        print(f"✓ Got {len(data['listings'])} similar listings")
    
    def test_delete_listing(self):
        """Test DELETE /api/listings/{listing_id} (soft delete)"""
        headers = {"Authorization": f"Bearer {TestListingsRoutes.session_token}"}
        response = requests.delete(
            f"{BASE_URL}/api/listings/{TestListingsRoutes.listing_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Delete listing failed: {response.text}"
        data = response.json()
        assert "deleted" in data.get("message", "").lower(), "Expected 'deleted' in message"
        
        # Verify listing status is now 'deleted'
        get_response = requests.get(f"{BASE_URL}/api/listings/{TestListingsRoutes.listing_id}")
        if get_response.status_code == 200:
            listing_data = get_response.json()
            assert listing_data.get("status") == "deleted", "Listing status should be 'deleted'"
        
        print(f"✓ Listing {TestListingsRoutes.listing_id} deleted successfully")
    
    def test_delete_listing_unauthorized(self):
        """Test DELETE /api/listings/{listing_id} by different user returns 403"""
        # First create a new listing to delete
        headers = {"Authorization": f"Bearer {TestListingsRoutes.session_token}"}
        create_response = requests.post(f"{BASE_URL}/api/listings", json={
            "title": "Test Delete Auth",
            "description": "Test",
            "price": 100,
            "category_id": "phones_tablets",
            "subcategory": "mobile_phones"
        }, headers=headers)
        new_listing_id = create_response.json()["id"]
        
        # Create another user
        email = f"test_del_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": "Delete Test User"
        })
        other_token = response.json()["session_token"]
        
        # Try to delete listing owned by different user
        headers = {"Authorization": f"Bearer {other_token}"}
        response = requests.delete(f"{BASE_URL}/api/listings/{new_listing_id}", headers=headers)
        
        assert response.status_code == 403, f"Expected 403 for unauthorized delete, got {response.status_code}"
        print("✓ Unauthorized delete correctly rejected")


class TestLegacyCategoryMapping:
    """Test that legacy category IDs are correctly mapped to new IDs"""
    
    session_token = None
    
    @classmethod
    def setup_class(cls):
        """Create test user"""
        email = f"test_legacy_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": "Legacy Test User"
        })
        assert response.status_code == 200
        cls.session_token = response.json()["session_token"]
    
    def test_legacy_category_vehicles(self):
        """Test that legacy 'vehicles' maps to 'auto_vehicles'"""
        headers = {"Authorization": f"Bearer {TestLegacyCategoryMapping.session_token}"}
        listing_data = {
            "title": "Test Car",
            "description": "Test vehicle listing",
            "price": 15000,
            "category_id": "vehicles",  # Legacy ID
            "subcategory": "cars",  # Valid subcategory for auto_vehicles
            "location": "Berlin"
        }
        
        response = requests.post(f"{BASE_URL}/api/listings", json=listing_data, headers=headers)
        
        # Should succeed with mapped category
        assert response.status_code == 200, f"Legacy category mapping failed: {response.text}"
        data = response.json()
        assert data["category_id"] == "auto_vehicles", "Legacy 'vehicles' should map to 'auto_vehicles'"
        
        print("✓ Legacy 'vehicles' correctly mapped to 'auto_vehicles'")
    
    def test_legacy_category_realestate(self):
        """Test that legacy 'realestate' maps to 'properties'"""
        headers = {"Authorization": f"Bearer {TestLegacyCategoryMapping.session_token}"}
        listing_data = {
            "title": "Test Apartment",
            "description": "Test property listing",
            "price": 250000,
            "category_id": "realestate",  # Legacy ID
            "subcategory": "houses_apartments_sale",
            "location": "Munich"
        }
        
        response = requests.post(f"{BASE_URL}/api/listings", json=listing_data, headers=headers)
        
        assert response.status_code == 200, f"Legacy category mapping failed: {response.text}"
        data = response.json()
        assert data["category_id"] == "properties", "Legacy 'realestate' should map to 'properties'"
        
        print("✓ Legacy 'realestate' correctly mapped to 'properties'")


class TestRouteIntegration:
    """Test integration between routes (auth -> users -> listings)"""
    
    def test_full_user_journey(self):
        """Test complete user journey: register -> update profile -> create listing -> search -> delete"""
        # 1. Register
        email = f"test_journey_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": "Journey Test User"
        })
        assert reg_response.status_code == 200
        session_token = reg_response.json()["session_token"]
        user_id = reg_response.json()["user"]["user_id"]
        headers = {"Authorization": f"Bearer {session_token}"}
        
        # 2. Update profile
        update_response = requests.put(f"{BASE_URL}/api/users/me", json={
            "bio": "Integration test user",
            "location": "Test City"
        }, headers=headers)
        assert update_response.status_code == 200
        
        # 3. Verify profile via GET
        profile_response = requests.get(f"{BASE_URL}/api/users/{user_id}")
        assert profile_response.status_code == 200
        assert profile_response.json()["location"] == "Test City"
        
        # 4. Create listing
        listing_response = requests.post(f"{BASE_URL}/api/listings", json={
            "title": "Integration Test Item",
            "description": "Test item for integration testing",
            "price": 50,
            "category_id": "electronics",
            "subcategory": "laptops_computers",
            "location": "Test City"
        }, headers=headers)
        assert listing_response.status_code == 200
        listing_id = listing_response.json()["id"]
        
        # 5. Search for listing
        search_response = requests.get(f"{BASE_URL}/api/listings", params={
            "search": "Integration Test",
            "category": "electronics"
        })
        assert search_response.status_code == 200
        
        # 6. Get my listings
        my_listings = requests.get(f"{BASE_URL}/api/listings/my", headers=headers)
        assert my_listings.status_code == 200
        assert any(l["id"] == listing_id for l in my_listings.json())
        
        # 7. Delete listing
        delete_response = requests.delete(f"{BASE_URL}/api/listings/{listing_id}", headers=headers)
        assert delete_response.status_code == 200
        
        # 8. Logout
        logout_response = requests.post(f"{BASE_URL}/api/auth/logout", headers=headers)
        assert logout_response.status_code == 200
        
        # 9. Verify logged out
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 401
        
        print("✓ Full user journey completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
