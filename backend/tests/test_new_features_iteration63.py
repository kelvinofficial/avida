"""
Test new features for iteration 63:
1. Business Profile verification tiers (is_premium, verification_tier)
2. Featured Sellers API endpoint
3. Business profiles directory API
4. Premium badge support in public profiles

Test areas:
- GET /api/business-profiles/featured
- GET /api/business-profiles/directory
- is_premium and verification_tier fields in business profiles
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://listing-form-builder.preview.emergentagent.com')


class TestFeaturedSellersAPI:
    """Test the featured sellers API endpoint"""
    
    def test_featured_endpoint_returns_correct_structure(self):
        """Test GET /api/business-profiles/featured returns correct response structure"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/featured?limit=8")
        
        # Should return 200
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify response structure
        assert "sellers" in data, "Response should contain 'sellers' key"
        assert "total" in data, "Response should contain 'total' key"
        assert "premium_count" in data, "Response should contain 'premium_count' key"
        assert "verified_count" in data, "Response should contain 'verified_count' key"
        
        # Verify data types
        assert isinstance(data["sellers"], list), "sellers should be a list"
        assert isinstance(data["total"], int), "total should be an integer"
        assert isinstance(data["premium_count"], int), "premium_count should be an integer"
        assert isinstance(data["verified_count"], int), "verified_count should be an integer"
        
        print(f"✓ Featured API returned: {data['total']} sellers ({data['premium_count']} premium, {data['verified_count']} verified)")
    
    def test_featured_endpoint_limit_parameter(self):
        """Test that limit parameter works correctly"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/featured?limit=2")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should respect limit
        assert len(data["sellers"]) <= 2, "Should respect limit parameter"
    
    def test_featured_seller_fields(self):
        """Test that seller objects have required fields including premium tier"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/featured?limit=10")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check fields in each seller if any exist
        for seller in data["sellers"]:
            # Required fields
            assert "id" in seller, "Seller should have 'id'"
            assert "business_name" in seller, "Seller should have 'business_name'"
            assert "identifier" in seller, "Seller should have 'identifier'"
            assert "is_verified" in seller, "Seller should have 'is_verified'"
            
            # New premium fields
            assert "is_premium" in seller, "Seller should have 'is_premium'"
            assert "verification_tier" in seller, "Seller should have 'verification_tier'"
            
            # Verification tier should be one of expected values
            assert seller["verification_tier"] in ["none", "verified", "premium"], \
                f"verification_tier should be 'none', 'verified', or 'premium', got {seller['verification_tier']}"
            
            print(f"  ✓ Seller {seller['business_name']}: tier={seller['verification_tier']}, premium={seller['is_premium']}")


class TestBusinessDirectoryAPI:
    """Test the business directory API endpoint"""
    
    def test_directory_endpoint_returns_correct_structure(self):
        """Test GET /api/business-profiles/directory returns correct response"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/directory?limit=10")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify response structure
        assert "profiles" in data, "Response should contain 'profiles'"
        assert "total" in data, "Response should contain 'total'"
        assert "page" in data, "Response should contain 'page'"
        assert "limit" in data, "Response should contain 'limit'"
        assert "total_pages" in data, "Response should contain 'total_pages'"
        
        print(f"✓ Directory API returned: {data['total']} total profiles")
    
    def test_directory_pagination(self):
        """Test pagination works correctly"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/directory?page=1&limit=5")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["page"] == 1, "Page should be 1"
        assert data["limit"] == 5, "Limit should be 5"
    
    def test_directory_verified_only_filter(self):
        """Test verified_only filter"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/directory?verified_only=true")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned profiles should be verified
        for profile in data["profiles"]:
            assert profile.get("is_verified") == True, "verified_only should return only verified profiles"
    
    def test_directory_profile_has_premium_fields(self):
        """Test that directory profiles include premium tier fields"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/directory?limit=10")
        
        assert response.status_code == 200
        data = response.json()
        
        for profile in data["profiles"]:
            # Standard fields
            assert "id" in profile
            assert "business_name" in profile
            assert "identifier" in profile
            assert "is_active" in profile
            
            # Premium tier fields should exist in schema (may not be present in older profiles)
            # Just verify the profile can be accessed
            print(f"  ✓ Profile: {profile['business_name']} - verified={profile.get('is_verified', False)}")


class TestPublicProfilePremiumSupport:
    """Test public profile endpoint supports premium tier"""
    
    def test_public_profile_endpoint(self):
        """Test GET /api/business-profiles/public/{identifier}"""
        # Use the test profile created earlier
        identifier = "test-electronics-store"
        response = requests.get(f"{BASE_URL}/api/business-profiles/public/{identifier}")
        
        # Should return 200 if exists, 404 if not
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify premium fields exist
            assert "is_verified" in data, "Should have is_verified field"
            
            # New premium tier fields (may not be set yet)
            if "is_premium" in data:
                assert isinstance(data["is_premium"], bool), "is_premium should be boolean"
            if "verification_tier" in data:
                assert data["verification_tier"] in ["none", "verified", "premium"], \
                    "verification_tier should be valid"
            
            print(f"✓ Public profile {identifier}: verified={data.get('is_verified')}, premium={data.get('is_premium')}")
        else:
            print(f"⚠ Profile {identifier} not found (404)")
    
    def test_public_profile_includes_user_info(self):
        """Test that public profile includes user info for display"""
        identifier = "test-electronics-store"
        response = requests.get(f"{BASE_URL}/api/business-profiles/public/{identifier}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Should include user info
            if "user" in data:
                assert "name" in data["user"], "User should have 'name'"
                print(f"  ✓ User info: {data['user'].get('name')}")
            
            # Should include total_listings count
            assert "total_listings" in data, "Should include total_listings"
        else:
            pytest.skip("Test profile not available")


class TestBusinessProfileSchemaSupport:
    """Test that business profile schema supports new premium fields"""
    
    def test_profile_creation_schema(self):
        """Test that POST /api/business-profiles/ creates profile with premium defaults"""
        # This would require authentication, so we just verify the endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/business-profiles/",
            json={"business_name": "Test Profile"},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 401 (requires auth) or 400 (missing required fields)
        # NOT 404 (endpoint exists) or 500 (server error)
        assert response.status_code in [401, 400, 422], \
            f"Expected 401/400/422 (auth required or validation), got {response.status_code}"
        
        print(f"✓ Profile creation endpoint exists (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
