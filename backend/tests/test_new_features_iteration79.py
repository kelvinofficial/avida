"""
Test new features for iteration 79:
1. Listing ID displayed on listing cards (last 8 characters)
2. Featured verified listings API: GET /api/listings/featured-verified
3. Homepage shows 'From Verified Sellers' section with listings
4. BadgeCelebrationModal component exists
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFeaturedVerifiedListingsAPI:
    """Test the featured-verified listings endpoint"""
    
    def test_featured_verified_endpoint_exists(self):
        """Test that the featured-verified endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/listings/featured-verified?limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("SUCCESS: /api/listings/featured-verified endpoint returns 200")
    
    def test_featured_verified_response_structure(self):
        """Test response structure contains listings and source"""
        response = requests.get(f"{BASE_URL}/api/listings/featured-verified?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "listings" in data, "Response missing 'listings' key"
        assert "source" in data, "Response missing 'source' key"
        assert isinstance(data["listings"], list), "listings should be a list"
        assert data["source"] in ["verified_sellers", "recent"], f"Unexpected source: {data['source']}"
        print(f"SUCCESS: Response structure valid - source: {data['source']}, listings count: {len(data['listings'])}")
    
    def test_featured_verified_limit_param(self):
        """Test that limit parameter works correctly"""
        for limit in [3, 5, 12]:
            response = requests.get(f"{BASE_URL}/api/listings/featured-verified?limit={limit}")
            assert response.status_code == 200
            data = response.json()
            # Listings count should be <= limit
            assert len(data["listings"]) <= limit, f"Expected max {limit} listings, got {len(data['listings'])}"
        print("SUCCESS: Limit parameter works correctly")
    
    def test_featured_verified_listing_structure(self):
        """Test that listings have the correct structure"""
        response = requests.get(f"{BASE_URL}/api/listings/featured-verified?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["listings"]) > 0:
            listing = data["listings"][0]
            # Check required fields
            assert "id" in listing, "Listing missing 'id'"
            assert "title" in listing, "Listing missing 'title'"
            assert "price" in listing, "Listing missing 'price'"
            print(f"SUCCESS: Listing structure valid - ID: {listing['id'][:8]}...")
        else:
            print("INFO: No listings found from verified sellers (empty result)")


class TestBusinessProfilesFeaturedAPI:
    """Test the featured business profiles endpoint (fallback)"""
    
    def test_featured_sellers_endpoint_exists(self):
        """Test that the featured sellers endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/featured?limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("SUCCESS: /api/business-profiles/featured endpoint returns 200")
    
    def test_featured_sellers_response_structure(self):
        """Test featured sellers response structure"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/featured?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert "sellers" in data, "Response missing 'sellers' key"
        assert "total" in data, "Response missing 'total' key"
        assert isinstance(data["sellers"], list), "sellers should be a list"
        print(f"SUCCESS: Featured sellers response valid - total: {data['total']}")


class TestListingsHaveId:
    """Test that listings API returns ID for display"""
    
    def test_listings_have_id_field(self):
        """Test that listings include the id field"""
        response = requests.get(f"{BASE_URL}/api/listings?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        listings = data.get("listings", [])
        
        if len(listings) > 0:
            for listing in listings:
                assert "id" in listing, "Listing missing 'id' field"
                assert isinstance(listing["id"], str), "Listing id should be string"
                assert len(listing["id"]) > 8, "Listing id should be long enough for truncation"
                # Verify last 8 chars can be extracted
                truncated_id = listing["id"][-8:]
                assert len(truncated_id) == 8, "Truncated ID should be 8 characters"
            print(f"SUCCESS: All {len(listings)} listings have valid IDs for display")
        else:
            print("INFO: No listings found to verify")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
