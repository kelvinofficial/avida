"""
Test Share Profile Features:
1. OG Meta endpoint for social media sharing
2. Business profile creation with pending image upload flow
3. Success modal with profile URL after save

Field notes:
- New profiles use 'identifier' field
- Legacy profiles may use 'slug' field
- Both fields are supported for lookups
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://loading-gloss.preview.emergentagent.com')


def get_profile_slug(profile_data):
    """Get the slug/identifier from profile data (supports both field names)"""
    return profile_data.get("identifier") or profile_data.get("slug")


class TestOGMetaEndpoint:
    """Test OG Meta tags endpoint for social sharing"""
    
    def test_og_meta_endpoint_public_access(self):
        """OG meta endpoint should be publicly accessible (no auth required)"""
        # First, get an existing business profile slug
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "premium_tester_2@example.com",
            "password": "testpass123"
        })
        
        if login_resp.status_code == 200:
            token = login_resp.json().get("session_token")
            headers = {"Authorization": f"Bearer {token}"}
            profile_resp = requests.get(f"{BASE_URL}/api/business-profiles/me", headers=headers)
            
            if profile_resp.status_code == 200 and profile_resp.json().get("has_profile"):
                slug = get_profile_slug(profile_resp.json()["profile"])
                
                # Test OG meta endpoint WITHOUT auth (should work)
                og_response = requests.get(f"{BASE_URL}/api/business-profiles/{slug}/og-meta")
                
                assert og_response.status_code == 200, f"OG meta should be publicly accessible, got {og_response.status_code}"
                print(f"PASS: OG meta endpoint is publicly accessible for slug: {slug}")
                return
        
        # If no profile exists, test with a non-existent slug (should 404)
        og_response = requests.get(f"{BASE_URL}/api/business-profiles/test-slug-does-not-exist/og-meta")
        assert og_response.status_code == 404, "Non-existent slug should return 404"
        print("PASS: OG meta endpoint returns 404 for non-existent profiles")
    
    def test_og_meta_response_structure(self):
        """OG meta response should contain all required fields for social sharing"""
        # Login and get profile
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "premium_tester_2@example.com",
            "password": "testpass123"
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Cannot login as premium_tester_2")
        
        token = login_resp.json().get("session_token")
        headers = {"Authorization": f"Bearer {token}"}
        profile_resp = requests.get(f"{BASE_URL}/api/business-profiles/me", headers=headers)
        
        if profile_resp.status_code != 200 or not profile_resp.json().get("has_profile"):
            pytest.skip("No business profile exists for premium_tester_2")
        
        slug = get_profile_slug(profile_resp.json()["profile"])
        
        # Get OG meta
        og_response = requests.get(f"{BASE_URL}/api/business-profiles/{slug}/og-meta")
        assert og_response.status_code == 200
        
        data = og_response.json()
        
        # Verify required fields
        required_fields = ["title", "description", "url", "image", "site_name", "type", "share_text", "share_url"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
            assert data[field] is not None, f"Field {field} should not be None"
        
        # Verify og_tags nested object
        assert "og_tags" in data, "Missing og_tags object"
        required_og_tags = ["og:title", "og:description", "og:url", "og:image", "og:type", "og:site_name", 
                          "twitter:card", "twitter:title", "twitter:description", "twitter:image"]
        for tag in required_og_tags:
            assert tag in data["og_tags"], f"Missing og tag: {tag}"
        
        # Verify share_url format
        assert "/business/" in data["share_url"], "share_url should contain /business/ path"
        assert slug in data["share_url"], "share_url should contain the profile slug"
        
        print(f"PASS: OG meta response has all required fields")
        print(f"  - Title: {data['title']}")
        print(f"  - Share URL: {data['share_url']}")
    
    def test_og_meta_premium_badge(self):
        """Premium verified profiles should show badge in OG title"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "premium_tester_2@example.com",
            "password": "testpass123"
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Cannot login as premium_tester_2")
        
        token = login_resp.json().get("session_token")
        headers = {"Authorization": f"Bearer {token}"}
        profile_resp = requests.get(f"{BASE_URL}/api/business-profiles/me", headers=headers)
        
        if profile_resp.status_code != 200 or not profile_resp.json().get("has_profile"):
            pytest.skip("No business profile exists")
        
        profile = profile_resp.json()["profile"]
        slug = get_profile_slug(profile)
        
        og_response = requests.get(f"{BASE_URL}/api/business-profiles/{slug}/og-meta")
        assert og_response.status_code == 200
        
        data = og_response.json()
        
        # Check if premium badge is in title
        if profile.get("is_premium"):
            assert "(Premium Verified)" in data["title"], "Premium profile should have badge in title"
            print(f"PASS: Premium badge shown in OG title: {data['title']}")
        elif profile.get("is_verified") or profile.get("verification_status") == "verified":
            assert "(Verified)" in data["title"], "Verified profile should have badge in title"
            print(f"PASS: Verified badge shown in OG title: {data['title']}")
        else:
            print(f"INFO: Profile is not verified, no badge expected. Title: {data['title']}")


class TestBusinessProfileCreation:
    """Test business profile creation flow"""
    
    def test_create_profile_returns_identifier(self):
        """Creating a profile should return the identifier/slug for URL construction"""
        # Create a unique test user
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"share_test_{unique_id}@example.com"
        test_password = "testpass123"
        
        # Register
        register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": test_password,
            "name": f"Share Test User {unique_id}"
        })
        
        if register_resp.status_code != 200:
            pytest.skip(f"Could not register test user: {register_resp.text}")
        
        token = register_resp.json().get("session_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create business profile
        profile_data = {
            "business_name": f"Test Business {unique_id}",
            "description": "A test business for share profile testing",
            "primary_categories": ["electronics"]
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/business-profiles/", json=profile_data, headers=headers)
        
        assert create_resp.status_code in [200, 201], f"Failed to create profile: {create_resp.text}"
        
        data = create_resp.json()
        
        # Verify identifier is returned
        assert "id" in data, "Response should contain profile id"
        slug = get_profile_slug(data)
        assert slug is not None, "Response should contain identifier/slug"
        assert len(slug) > 0, "Identifier should not be empty"
        
        # Verify the identifier can be used to access the profile
        public_resp = requests.get(f"{BASE_URL}/api/business-profiles/public/{slug}")
        assert public_resp.status_code == 200, f"Should be able to access profile by identifier, got {public_resp.status_code}"
        
        # Verify OG meta endpoint works with new profile
        og_resp = requests.get(f"{BASE_URL}/api/business-profiles/{slug}/og-meta")
        assert og_resp.status_code == 200, "OG meta should work for new profile"
        
        print(f"PASS: Profile created with slug: {slug}")
        print(f"  - Profile URL: /business/{slug}")
        
        # Cleanup - delete the profile
        requests.delete(f"{BASE_URL}/api/business-profiles/me", headers=headers)


class TestImageUploadEndpoints:
    """Test logo and cover image upload endpoints"""
    
    def test_logo_upload_endpoint_exists(self):
        """Logo upload endpoint should exist and require auth"""
        # Test without auth - should fail
        resp = requests.post(f"{BASE_URL}/api/business-profiles/me/logo")
        assert resp.status_code in [401, 422], "Logo upload should require auth"
        print("PASS: Logo upload endpoint requires authentication")
    
    def test_cover_upload_endpoint_exists(self):
        """Cover upload endpoint should exist and require auth"""
        # Test without auth - should fail
        resp = requests.post(f"{BASE_URL}/api/business-profiles/me/cover")
        assert resp.status_code in [401, 422], "Cover upload should require auth"
        print("PASS: Cover upload endpoint requires authentication")
    
    def test_logo_upload_requires_profile(self):
        """Logo upload should require existing profile or handle profile-less user"""
        # Login as premium_tester_2 who has a profile
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "premium_tester_2@example.com",
            "password": "testpass123"
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Cannot login")
        
        token = login_resp.json().get("session_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try to upload without file - should get validation error
        resp = requests.post(f"{BASE_URL}/api/business-profiles/me/logo", headers=headers)
        # Expected: 422 for validation (missing file) or 400 for bad request
        assert resp.status_code in [400, 422], f"Should require file, got {resp.status_code}"
        print("PASS: Logo upload validates file requirement")


class TestPublicProfileAccess:
    """Test public profile and share URLs"""
    
    def test_public_profile_endpoint(self):
        """Public profile endpoint should work without auth"""
        # First get a valid slug
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "premium_tester_2@example.com",
            "password": "testpass123"
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Cannot login to get profile slug")
        
        token = login_resp.json().get("session_token")
        headers = {"Authorization": f"Bearer {token}"}
        profile_resp = requests.get(f"{BASE_URL}/api/business-profiles/me", headers=headers)
        
        if profile_resp.status_code != 200 or not profile_resp.json().get("has_profile"):
            pytest.skip("No profile to test")
        
        slug = get_profile_slug(profile_resp.json()["profile"])
        
        # Access without auth
        public_resp = requests.get(f"{BASE_URL}/api/business-profiles/public/{slug}")
        assert public_resp.status_code == 200, f"Public profile should be accessible without auth, got {public_resp.status_code}"
        
        data = public_resp.json()
        assert "business_name" in data, "Public profile should contain business_name"
        profile_slug = get_profile_slug(data)
        assert profile_slug is not None, "Public profile should contain identifier or slug"
        
        print(f"PASS: Public profile accessible at /api/business-profiles/public/{slug}")
    
    def test_public_profile_listings(self):
        """Public profile listings endpoint should work without auth"""
        # First get a valid slug
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "premium_tester_2@example.com",
            "password": "testpass123"
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Cannot login to get profile slug")
        
        token = login_resp.json().get("session_token")
        headers = {"Authorization": f"Bearer {token}"}
        profile_resp = requests.get(f"{BASE_URL}/api/business-profiles/me", headers=headers)
        
        if profile_resp.status_code != 200 or not profile_resp.json().get("has_profile"):
            pytest.skip("No profile to test")
        
        slug = get_profile_slug(profile_resp.json()["profile"])
        
        # Access listings without auth
        listings_resp = requests.get(f"{BASE_URL}/api/business-profiles/public/{slug}/listings")
        assert listings_resp.status_code == 200, f"Public listings should be accessible without auth, got {listings_resp.status_code}"
        
        data = listings_resp.json()
        assert "listings" in data, "Response should contain listings array"
        assert "total" in data, "Response should contain total count"
        
        print(f"PASS: Public profile listings accessible")


class TestShareFunctionality:
    """Test share-related functionality"""
    
    def test_share_url_format(self):
        """Share URL should be properly formatted"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "premium_tester_2@example.com",
            "password": "testpass123"
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Cannot login")
        
        token = login_resp.json().get("session_token")
        headers = {"Authorization": f"Bearer {token}"}
        profile_resp = requests.get(f"{BASE_URL}/api/business-profiles/me", headers=headers)
        
        if profile_resp.status_code != 200 or not profile_resp.json().get("has_profile"):
            pytest.skip("No profile to test")
        
        slug = get_profile_slug(profile_resp.json()["profile"])
        
        og_resp = requests.get(f"{BASE_URL}/api/business-profiles/{slug}/og-meta")
        assert og_resp.status_code == 200
        
        data = og_resp.json()
        
        # Verify share URL is absolute
        assert data["share_url"].startswith("http"), "share_url should be absolute URL"
        
        # Verify share_text is meaningful
        assert len(data["share_text"]) > 10, "share_text should be meaningful"
        assert "Avida" in data["share_text"] or "marketplace" in data["share_text"].lower(), "share_text should mention Avida Marketplace"
        
        print(f"PASS: Share URL format is correct")
        print(f"  - URL: {data['share_url']}")
        print(f"  - Text: {data['share_text']}")
    
    def test_twitter_card_format(self):
        """Twitter card should use large image format"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "premium_tester_2@example.com",
            "password": "testpass123"
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Cannot login")
        
        token = login_resp.json().get("session_token")
        headers = {"Authorization": f"Bearer {token}"}
        profile_resp = requests.get(f"{BASE_URL}/api/business-profiles/me", headers=headers)
        
        if profile_resp.status_code != 200 or not profile_resp.json().get("has_profile"):
            pytest.skip("No profile to test")
        
        slug = get_profile_slug(profile_resp.json()["profile"])
        
        og_resp = requests.get(f"{BASE_URL}/api/business-profiles/{slug}/og-meta")
        assert og_resp.status_code == 200
        
        data = og_resp.json()
        
        # Verify Twitter card format
        assert data["og_tags"]["twitter:card"] == "summary_large_image", "Twitter card should use large image format"
        
        print("PASS: Twitter card format is correct (summary_large_image)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
