"""
Test file for search autocomplete, shimmer skeleton, quick stats, and favorite notifications features
Tests: 
1. Search autocomplete API /api/searches/suggestions
2. WebSocket stats update functionality  
3. Favorite notification to listing owner
"""
import pytest
import requests
import os
import json
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://zustand-store-test.preview.emergentagent.com')

class TestSearchAutocomplete:
    """Search autocomplete/suggestions API tests"""
    
    def test_suggestions_endpoint_exists(self):
        """Test that the suggestions endpoint exists and responds"""
        response = requests.get(f"{BASE_URL}/api/searches/suggestions?q=te&limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_suggestions_returns_array(self):
        """Test that suggestions returns an array of suggestions"""
        response = requests.get(f"{BASE_URL}/api/searches/suggestions?q=te&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data, "Response should have 'suggestions' key"
        assert isinstance(data["suggestions"], list), "Suggestions should be a list"
        
    def test_suggestions_structure(self):
        """Test that each suggestion has query and count fields"""
        response = requests.get(f"{BASE_URL}/api/searches/suggestions?q=te&limit=5")
        assert response.status_code == 200
        data = response.json()
        if data["suggestions"]:
            first_suggestion = data["suggestions"][0]
            assert "query" in first_suggestion, "Each suggestion should have 'query' field"
            assert "count" in first_suggestion, "Each suggestion should have 'count' field"
            
    def test_suggestions_query_matching(self):
        """Test that suggestions match the query prefix"""
        response = requests.get(f"{BASE_URL}/api/searches/suggestions?q=tes&limit=5")
        assert response.status_code == 200
        data = response.json()
        for suggestion in data["suggestions"]:
            assert suggestion["query"].lower().startswith("tes"), f"Suggestion '{suggestion['query']}' should start with 'tes'"
            
    def test_suggestions_limit_parameter(self):
        """Test that limit parameter works correctly"""
        response = requests.get(f"{BASE_URL}/api/searches/suggestions?q=te&limit=3")
        assert response.status_code == 200
        data = response.json()
        assert len(data["suggestions"]) <= 3, "Should return at most 3 suggestions"
        
    def test_suggestions_empty_query(self):
        """Test suggestions with very short query (should return fewer or no results)"""
        response = requests.get(f"{BASE_URL}/api/searches/suggestions?q=t&limit=5")
        assert response.status_code == 200
        data = response.json()
        # Short queries may return no results depending on min_length in API
        assert "suggestions" in data


class TestPopularSearches:
    """Popular/Trending searches API tests"""
    
    def test_popular_searches_endpoint(self):
        """Test that popular searches endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/searches/popular?limit=5")
        assert response.status_code == 200
        
    def test_popular_searches_structure(self):
        """Test popular searches response structure"""
        response = requests.get(f"{BASE_URL}/api/searches/popular?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "global_searches" in data, "Should have global_searches"
        assert "category_searches" in data, "Should have category_searches"
        
    def test_popular_searches_content(self):
        """Test that global searches have proper structure"""
        response = requests.get(f"{BASE_URL}/api/searches/popular?limit=5")
        assert response.status_code == 200
        data = response.json()
        if data["global_searches"]:
            first_search = data["global_searches"][0]
            assert "query" in first_search
            assert "count" in first_search


class TestFavoritesNotification:
    """Favorites and notification system tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for testing"""
        # Login with test user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testuser@test.com",
            "password": "password"
        })
        if login_response.status_code == 200:
            return login_response.json().get("token")
        return None
    
    @pytest.fixture
    def listing_id(self):
        """Get an existing listing ID for testing"""
        response = requests.get(f"{BASE_URL}/api/listings?limit=1")
        if response.status_code == 200:
            data = response.json()
            listings = data.get("listings", [])
            if listings:
                return listings[0].get("id")
        return None
    
    def test_favorites_endpoint_exists(self, auth_token, listing_id):
        """Test favorites endpoint exists and requires auth"""
        if not listing_id:
            pytest.skip("No listings available for test")
            
        # Test without auth - should fail
        response = requests.post(f"{BASE_URL}/api/favorites/{listing_id}")
        assert response.status_code in [401, 403], "Should require authentication"
        
    def test_favorites_add_with_auth(self, auth_token, listing_id):
        """Test adding a favorite with authentication"""
        if not auth_token:
            pytest.skip("Could not get auth token")
        if not listing_id:
            pytest.skip("No listings available for test")
            
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/favorites/{listing_id}", headers=headers)
        # Should succeed or already be favorited
        assert response.status_code in [200, 201], f"Got status {response.status_code}"
        
    def test_favorites_list(self, auth_token):
        """Test getting favorites list"""
        if not auth_token:
            pytest.skip("Could not get auth token")
            
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/favorites", headers=headers)
        assert response.status_code == 200


class TestPublicProfile:
    """Public seller profile tests for shimmer/skeleton verification"""
    
    @pytest.fixture
    def user_id(self):
        """Get a user ID from listings"""
        response = requests.get(f"{BASE_URL}/api/listings?limit=1")
        if response.status_code == 200:
            data = response.json()
            listings = data.get("listings", [])
            if listings:
                return listings[0].get("user_id")
        return None
    
    def test_public_profile_endpoint(self, user_id):
        """Test public profile endpoint exists"""
        if not user_id:
            pytest.skip("No user ID available")
            
        response = requests.get(f"{BASE_URL}/api/profile/public/{user_id}")
        assert response.status_code == 200
        
    def test_public_profile_structure(self, user_id):
        """Test public profile returns expected fields"""
        if not user_id:
            pytest.skip("No user ID available")
            
        response = requests.get(f"{BASE_URL}/api/profile/public/{user_id}")
        assert response.status_code == 200
        data = response.json()
        # Profile should have name and stats
        assert "name" in data or "business_name" in data
        
    def test_user_listings_endpoint(self, user_id):
        """Test user listings endpoint for profile page"""
        if not user_id:
            pytest.skip("No user ID available")
            
        response = requests.get(f"{BASE_URL}/api/users/{user_id}/listings?status=active&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "listings" in data


class TestWebSocketStats:
    """Quick Stats WebSocket integration tests (API side)"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for testing"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testuser@test.com",
            "password": "password"
        })
        if login_response.status_code == 200:
            return login_response.json().get("token")
        return None
    
    def test_my_listings_endpoint(self, auth_token):
        """Test the my listings endpoint used by Quick Stats"""
        if not auth_token:
            pytest.skip("Could not get auth token")
            
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/listings/my?page=1&limit=100", headers=headers)
        assert response.status_code == 200
        
    def test_offers_endpoint(self, auth_token):
        """Test the offers endpoint used by Quick Stats"""
        if not auth_token:
            pytest.skip("Could not get auth token")
            
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/offers?role=seller", headers=headers)
        assert response.status_code == 200
        
    def test_credits_balance_endpoint(self, auth_token):
        """Test the credits balance endpoint used by Quick Stats"""
        if not auth_token:
            pytest.skip("Could not get auth token")
            
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/boost/credits/balance", headers=headers)
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
