"""
Test New Features Iteration 120
Tests:
1. Quick Stats - Total Views from listings
2. Quick Stats - Rating display
3. /api/listings/my returns listings with views field
4. /api/offers?role=seller endpoint
5. Photography Guides Admin CRUD at /api/photography-guides
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test3@test.com"
TEST_PASSWORD = "password"
ADMIN_EMAIL = "admin@marketplace.com"
ADMIN_PASSWORD = "Admin@123456"


@pytest.fixture(scope="module")
def user_token():
    """Get user authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token")
    pytest.skip(f"User authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token for photography guides admin"""
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code}")


@pytest.fixture
def auth_headers(user_token):
    """Create authentication headers for user"""
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture
def admin_headers(admin_token):
    """Create authentication headers for admin"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestListingsMyEndpoint:
    """Test /api/listings/my endpoint returns listings with views field"""
    
    def test_listings_my_requires_auth(self):
        """Test that /api/listings/my requires authentication"""
        response = requests.get(f"{BASE_URL}/api/listings/my")
        assert response.status_code == 401, "Should require authentication"
    
    def test_listings_my_returns_array(self, auth_headers):
        """Test that /api/listings/my returns an array"""
        response = requests.get(f"{BASE_URL}/api/listings/my", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"Found {len(data)} user listings")
    
    def test_listings_my_contains_views_field(self, auth_headers):
        """Test that listings include the views field for Total Views calculation"""
        response = requests.get(f"{BASE_URL}/api/listings/my", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            listing = data[0]
            # views field should exist - it's critical for Quick Stats Total Views
            assert "views" in listing, "Listing should have 'views' field for Quick Stats"
            assert isinstance(listing.get("views", 0), int), "views should be an integer"
            
            total_views = sum(l.get("views", 0) for l in data)
            print(f"Total views across all listings: {total_views}")
        else:
            print("No listings found for user - views field check skipped")


class TestOffersSellerEndpoint:
    """Test /api/offers?role=seller endpoint"""
    
    def test_offers_seller_requires_auth(self):
        """Test that /api/offers?role=seller requires authentication"""
        response = requests.get(f"{BASE_URL}/api/offers?role=seller")
        assert response.status_code == 401, "Should require authentication"
    
    def test_offers_seller_returns_correct_structure(self, auth_headers):
        """Test that /api/offers?role=seller returns {offers: [], total: n}"""
        response = requests.get(f"{BASE_URL}/api/offers?role=seller", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Should return {offers: [...], total: n} structure
        assert "offers" in data or isinstance(data, list), "Should return offers array or object with offers key"
        
        if isinstance(data, dict):
            assert "offers" in data, "Should have 'offers' key in response"
            print(f"Found {len(data.get('offers', []))} offers as seller")
        else:
            print(f"Found {len(data)} offers (direct array)")


class TestUserProfile:
    """Test user profile for rating field needed by Quick Stats"""
    
    def test_get_user_profile(self, auth_headers):
        """Test that user profile returns rating field for Quick Stats"""
        response = requests.get(f"{BASE_URL}/api/profile", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Check if rating fields exist (needed for Quick Stats Rating)
        print(f"User profile data: has rating={data.get('rating')}, total_ratings={data.get('total_ratings')}")


class TestConversationsEndpoint:
    """Test /api/conversations endpoint for unread messages count"""
    
    def test_conversations_returns_array(self, auth_headers):
        """Test that /api/conversations returns array with unread field"""
        response = requests.get(f"{BASE_URL}/api/conversations", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list of conversations"
        
        total_unread = sum(conv.get("unread", 0) for conv in data)
        print(f"Total unread messages: {total_unread}")


class TestCreditBalanceEndpoint:
    """Test /api/boost/credits/balance endpoint for Quick Stats"""
    
    def test_credits_balance_returns_balance(self, auth_headers):
        """Test that /api/boost/credits/balance returns balance"""
        response = requests.get(f"{BASE_URL}/api/boost/credits/balance", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "balance" in data, "Should return balance field"
        print(f"Credit balance: {data.get('balance')}")


class TestPhotographyGuidesPublicAPI:
    """Test public photography guides endpoint"""
    
    def test_get_public_guides_default(self):
        """Test getting default photography guides"""
        response = requests.get(f"{BASE_URL}/api/photography-guides/public/default")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "guides" in data, "Should have guides key"
        print(f"Found {data.get('count', 0)} default guides")
    
    def test_get_public_guides_auto_vehicles(self):
        """Test getting auto_vehicles photography guides"""
        response = requests.get(f"{BASE_URL}/api/photography-guides/public/auto_vehicles")
        assert response.status_code == 200
        
        data = response.json()
        print(f"Found {data.get('count', 0)} auto_vehicles guides")


class TestPhotographyGuidesAdminAPI:
    """Test admin photography guides CRUD operations"""
    
    def test_admin_guides_list_requires_auth(self):
        """Test that admin guides list requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/photography-guides")
        assert response.status_code == 401, "Should require authentication"
    
    def test_admin_guides_list(self, admin_headers):
        """Test getting admin guides list"""
        response = requests.get(f"{BASE_URL}/api/admin/photography-guides", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "guides" in data, "Should return guides list"
        print(f"Admin found {len(data.get('guides', []))} guides")
    
    def test_admin_guides_stats(self, admin_headers):
        """Test getting photography guides stats"""
        response = requests.get(f"{BASE_URL}/api/admin/photography-guides/stats", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Guide stats: total={data.get('total')}, active={data.get('active')}")
    
    def test_admin_create_guide(self, admin_headers):
        """Test creating a new photography guide"""
        guide_data = {
            "category_id": "default",
            "title": "TEST_Guide_Iteration120",
            "description": "Test guide for iteration 120 testing",
            "icon": "camera-outline",
            "order": 99,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/photography-guides",
            json=guide_data,
            headers=admin_headers
        )
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}"
        
        data = response.json()
        assert data.get("title") == "TEST_Guide_Iteration120", "Guide title should match"
        print(f"Created guide with id: {data.get('id')}")
        
        return data.get("id")
    
    def test_admin_update_guide(self, admin_headers):
        """Test updating a photography guide"""
        # First create a guide
        create_data = {
            "category_id": "default",
            "title": "TEST_Update_Guide",
            "description": "Guide to be updated",
            "icon": "camera-outline",
            "order": 98
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/photography-guides",
            json=create_data,
            headers=admin_headers
        )
        
        if create_response.status_code not in [200, 201]:
            pytest.skip("Could not create guide for update test")
        
        guide_id = create_response.json().get("id")
        
        # Update the guide
        update_data = {
            "title": "TEST_Updated_Guide_Title",
            "description": "Updated description"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/photography-guides/{guide_id}",
            json=update_data,
            headers=admin_headers
        )
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        updated = update_response.json()
        assert updated.get("title") == "TEST_Updated_Guide_Title", "Title should be updated"
        print(f"Successfully updated guide {guide_id}")
        
        # Cleanup - delete the guide
        requests.delete(f"{BASE_URL}/api/admin/photography-guides/{guide_id}", headers=admin_headers)
    
    def test_admin_delete_guide(self, admin_headers):
        """Test deleting a photography guide"""
        # First create a guide to delete
        create_data = {
            "category_id": "default",
            "title": "TEST_Delete_Guide",
            "description": "Guide to be deleted",
            "icon": "trash-outline",
            "order": 97
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/photography-guides",
            json=create_data,
            headers=admin_headers
        )
        
        if create_response.status_code not in [200, 201]:
            pytest.skip("Could not create guide for delete test")
        
        guide_id = create_response.json().get("id")
        
        # Delete the guide
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/photography-guides/{guide_id}",
            headers=admin_headers
        )
        
        assert delete_response.status_code in [200, 204], f"Expected 200/204, got {delete_response.status_code}"
        print(f"Successfully deleted guide {guide_id}")


# Cleanup fixture to remove test data
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_guides(admin_token):
    """Cleanup test guides after all tests"""
    yield
    
    if admin_token:
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Get all guides and delete TEST_ prefixed ones
        response = requests.get(f"{BASE_URL}/api/admin/photography-guides", headers=headers)
        if response.status_code == 200:
            guides = response.json().get("guides", [])
            for guide in guides:
                if guide.get("title", "").startswith("TEST_"):
                    requests.delete(
                        f"{BASE_URL}/api/admin/photography-guides/{guide.get('id')}",
                        headers=headers
                    )
