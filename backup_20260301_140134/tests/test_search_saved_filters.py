"""
Test Search Autocomplete and Saved Filters APIs
- GET /api/searches/suggestions - autocomplete suggestions
- POST/GET/DELETE /api/saved-filters - saved filters CRUD
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test3@test.com"
TEST_PASSWORD = "password"


class TestSearchAutocomplete:
    """Test Search Autocomplete/Suggestions API"""
    
    def test_suggestions_endpoint_exists(self):
        """Test that suggestions endpoint exists and accepts queries"""
        response = requests.get(f"{BASE_URL}/api/searches/suggestions", params={"q": "iph"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "suggestions" in data, "Response should have 'suggestions' field"
        print(f"Autocomplete suggestions for 'iph': {data['suggestions']}")
    
    def test_suggestions_with_category(self):
        """Test suggestions filtered by category"""
        response = requests.get(f"{BASE_URL}/api/searches/suggestions", params={
            "q": "iph",
            "category_id": "electronics"
        })
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        print(f"Electronics suggestions for 'iph': {data['suggestions']}")
    
    def test_suggestions_min_query_length(self):
        """Test that suggestions require minimum query length"""
        # Single character should still work (min_length=1 in API)
        response = requests.get(f"{BASE_URL}/api/searches/suggestions", params={"q": "a"})
        assert response.status_code == 200
        
    def test_track_search_and_verify_suggestions(self):
        """Test tracking a search and then getting it in suggestions"""
        unique_query = "TEST_unique_search_xyz123"
        
        # Track the search
        track_response = requests.post(f"{BASE_URL}/api/searches/track", json={
            "query": unique_query,
            "category_id": "electronics"
        })
        assert track_response.status_code == 200, f"Track failed: {track_response.text}"
        
        # Now fetch suggestions with same prefix
        suggestions_response = requests.get(f"{BASE_URL}/api/searches/suggestions", params={
            "q": "TEST_unique",
            "category_id": "electronics"
        })
        assert suggestions_response.status_code == 200
        data = suggestions_response.json()
        
        # Should find our tracked search
        found_queries = [s["query"] for s in data.get("suggestions", [])]
        assert unique_query.lower() in found_queries, f"Expected to find '{unique_query.lower()}' in suggestions: {found_queries}"
        print(f"Successfully tracked and found search: {unique_query}")


class TestSavedFiltersAuth:
    """Test Saved Filters API authentication"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Authentication failed: {response.text}")
        data = response.json()
        token = data.get("session_token") or data.get("token") or data.get("access_token")
        if not token:
            pytest.skip(f"No token in response: {data}")
        return token
    
    def test_saved_filters_requires_auth(self):
        """Test that saved filters endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/saved-filters")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("Saved filters correctly requires authentication")
    
    def test_list_saved_filters_authenticated(self, auth_token):
        """Test listing saved filters with authentication"""
        response = requests.get(
            f"{BASE_URL}/api/saved-filters",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} saved filters")
    
    def test_create_saved_filter(self, auth_token):
        """Test creating a new saved filter"""
        filter_data = {
            "name": "TEST_My Electronics Filter",
            "category_id": "electronics",
            "filters": {
                "condition": "New",
                "priceRange": {"min": "100", "max": "500"},
                "sortBy": "price_asc"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/saved-filters",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=filter_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have 'id' field"
        assert data["name"] == filter_data["name"], "Name should match"
        assert data["category_id"] == filter_data["category_id"], "Category ID should match"
        print(f"Created saved filter with ID: {data['id']}")
        
        return data["id"]
    
    def test_get_saved_filter_by_id(self, auth_token):
        """Test getting a specific saved filter by ID"""
        # First create a filter
        filter_data = {
            "name": "TEST_Filter for GET test",
            "category_id": "electronics",
            "filters": {"sortBy": "newest"}
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/saved-filters",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=filter_data
        )
        assert create_response.status_code == 200
        filter_id = create_response.json()["id"]
        
        # Now GET it
        get_response = requests.get(
            f"{BASE_URL}/api/saved-filters/{filter_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
        
        data = get_response.json()
        assert data["id"] == filter_id
        assert data["name"] == filter_data["name"]
        print(f"Successfully retrieved filter: {data['name']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/saved-filters/{filter_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_delete_saved_filter(self, auth_token):
        """Test deleting a saved filter"""
        # First create a filter
        filter_data = {
            "name": "TEST_Filter to delete",
            "category_id": "electronics",
            "filters": {"condition": "Used"}
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/saved-filters",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=filter_data
        )
        assert create_response.status_code == 200
        filter_id = create_response.json()["id"]
        
        # Now DELETE it
        delete_response = requests.delete(
            f"{BASE_URL}/api/saved-filters/{filter_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        # Verify it's deleted
        get_response = requests.get(
            f"{BASE_URL}/api/saved-filters/{filter_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 404, "Deleted filter should return 404"
        print(f"Successfully deleted filter: {filter_id}")
    
    def test_list_saved_filters_by_category(self, auth_token):
        """Test listing saved filters filtered by category"""
        response = requests.get(
            f"{BASE_URL}/api/saved-filters",
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"category_id": "electronics"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # All returned filters should be for electronics category
        for f in data:
            assert f["category_id"] == "electronics", f"Expected electronics, got {f['category_id']}"
        
        print(f"Found {len(data)} saved filters for electronics category")


class TestSavedFiltersCRUDFlow:
    """Test full CRUD flow for saved filters"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Authentication failed: {response.text}")
        data = response.json()
        token = data.get("session_token") or data.get("token") or data.get("access_token")
        if not token:
            pytest.skip(f"No token in response: {data}")
        return token
    
    def test_full_crud_flow(self, auth_token):
        """Test create -> read -> update -> delete flow"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        # 1. CREATE
        create_data = {
            "name": "TEST_CRUD_Flow_Filter",
            "category_id": "phones_tablets",
            "filters": {
                "brand": "Apple",
                "storage": "128GB",
                "condition": "Like New"
            }
        }
        
        create_response = requests.post(f"{BASE_URL}/api/saved-filters", headers=headers, json=create_data)
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        created = create_response.json()
        filter_id = created["id"]
        print(f"1. CREATED filter: {filter_id}")
        
        # 2. READ (verify persistence)
        get_response = requests.get(f"{BASE_URL}/api/saved-filters/{filter_id}", headers=headers)
        assert get_response.status_code == 200, f"Read failed: {get_response.text}"
        fetched = get_response.json()
        assert fetched["name"] == create_data["name"]
        assert fetched["filters"]["brand"] == "Apple"
        print(f"2. READ verified: {fetched['name']}")
        
        # 3. UPDATE
        update_data = {"name": "TEST_CRUD_Updated_Filter", "filters": {"brand": "Samsung"}}
        update_response = requests.put(f"{BASE_URL}/api/saved-filters/{filter_id}", headers=headers, json=update_data)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        assert updated["name"] == "TEST_CRUD_Updated_Filter"
        print(f"3. UPDATED filter: {updated['name']}")
        
        # Verify update persisted
        verify_response = requests.get(f"{BASE_URL}/api/saved-filters/{filter_id}", headers=headers)
        verified = verify_response.json()
        assert verified["name"] == "TEST_CRUD_Updated_Filter"
        assert verified["filters"]["brand"] == "Samsung"
        print(f"3b. UPDATE verified in DB")
        
        # 4. DELETE
        delete_response = requests.delete(f"{BASE_URL}/api/saved-filters/{filter_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"4. DELETED filter: {filter_id}")
        
        # Verify deletion
        verify_delete = requests.get(f"{BASE_URL}/api/saved-filters/{filter_id}", headers=headers)
        assert verify_delete.status_code == 404, "Deleted filter should return 404"
        print(f"4b. DELETE verified - filter not found (expected)")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Authentication failed: {response.text}")
        data = response.json()
        return data.get("session_token") or data.get("token") or data.get("access_token")
    
    def test_cleanup_test_filters(self, auth_token):
        """Clean up all TEST_ prefixed filters"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(f"{BASE_URL}/api/saved-filters", headers=headers)
        if response.status_code == 200:
            filters = response.json()
            deleted_count = 0
            for f in filters:
                if f["name"].startswith("TEST_"):
                    delete_resp = requests.delete(
                        f"{BASE_URL}/api/saved-filters/{f['id']}",
                        headers=headers
                    )
                    if delete_resp.status_code == 200:
                        deleted_count += 1
            print(f"Cleaned up {deleted_count} test filters")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
