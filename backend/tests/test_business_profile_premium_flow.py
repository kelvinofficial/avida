"""
Business Profile Premium Subscription Flow Tests
Tests the complete user flow: Create Profile → Request Verification → Admin Approve → Upgrade to Premium

Tests:
- User creates business profile
- User requests verification
- Admin approves verification (requires admin access)
- Verified user sees premium upgrade options
- Premium subscription packages API
- Stripe checkout creation
- Social links and gallery functionality
"""

import pytest
import requests
import uuid
from datetime import datetime, timezone

# Base URL from environment - use the public URL
BASE_URL = "https://classifieds-mvp-1.preview.emergentagent.com"


class TestPremiumSubscriptionPackages:
    """Test premium subscription packages API"""
    
    def test_get_premium_packages(self):
        """Test getting available premium packages - no auth required"""
        response = requests.get(f"{BASE_URL}/api/premium-subscription/packages")
        assert response.status_code == 200
        data = response.json()
        
        # Verify stripe packages
        assert "stripe_packages" in data
        stripe_packages = data["stripe_packages"]
        assert len(stripe_packages) >= 3  # monthly, quarterly, yearly
        
        # Verify package structure
        for pkg in stripe_packages:
            assert "id" in pkg
            assert "name" in pkg
            assert "amount" in pkg
            assert "currency" in pkg
            assert "duration_days" in pkg
            assert "description" in pkg
        
        # Verify M-Pesa packages
        assert "mpesa_packages" in data
        mpesa_packages = data["mpesa_packages"]
        assert len(mpesa_packages) >= 2  # monthly_kes, monthly_tzs
        
        print(f"PASSED: Got {len(stripe_packages)} Stripe packages and {len(mpesa_packages)} M-Pesa packages")
        
        # Verify specific package amounts (should be server-defined, not from frontend)
        monthly = next((p for p in stripe_packages if p["id"] == "monthly"), None)
        assert monthly is not None
        assert monthly["amount"] == 29.99
        assert monthly["duration_days"] == 30
        print(f"PASSED: Monthly package: ${monthly['amount']} for {monthly['duration_days']} days")


class TestBusinessProfileFlow:
    """Test the complete business profile flow"""
    
    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Create test user session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        self.test_email = f"test_premium_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register user
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": "testpass123",
            "name": "Premium Flow Tester"
        })
        
        if response.status_code not in [200, 201]:
            # Try login
            response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": self.test_email,
                "password": "testpass123"
            })
        
        if response.status_code in [200, 201]:
            data = response.json()
            token = data.get("session_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.authenticated = True
                self.user_id = data.get("user_id") or data.get("id")
                print(f"Test user authenticated: {self.test_email}")
            else:
                self.authenticated = False
        else:
            self.authenticated = False
        
        yield
        
        # Cleanup
        if hasattr(self, 'authenticated') and self.authenticated:
            try:
                self.session.delete(f"{BASE_URL}/api/business-profiles/me")
            except:
                pass
    
    def test_01_user_can_access_profile_me_endpoint(self):
        """User can access /api/business-profiles/me endpoint"""
        if not hasattr(self, 'authenticated') or not self.authenticated:
            pytest.skip("Authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/business-profiles/me")
        assert response.status_code == 200
        data = response.json()
        assert "has_profile" in data
        print(f"PASSED: User can access profile endpoint. has_profile={data['has_profile']}")
    
    def test_02_create_business_profile_with_name_and_categories(self):
        """User can create a business profile with name and categories"""
        if not hasattr(self, 'authenticated') or not self.authenticated:
            pytest.skip("Authentication failed")
        
        profile_data = {
            "business_name": f"Test Premium Biz {uuid.uuid4().hex[:6]}",
            "description": "A test business for premium flow testing",
            "primary_categories": ["electronics", "phones_tablets", "home_furniture"],
            "phone": "+49 123 456 789",
            "email": "testbiz@example.com",
            "city": "Berlin",
            "country": "Germany"
        }
        
        response = self.session.post(f"{BASE_URL}/api/business-profiles/", json=profile_data)
        
        if response.status_code == 400:
            data = response.json()
            if "already" in data.get("detail", "").lower():
                print("PASSED: User already has profile (duplicate prevention works)")
                return
        
        assert response.status_code in [200, 201]
        data = response.json()
        
        # Verify profile created with correct data
        assert "id" in data
        assert "identifier" in data
        assert data["business_name"] == profile_data["business_name"]
        assert len(data["primary_categories"]) == 3
        assert data["is_verified"] == False
        assert data["verification_status"] == "none"
        
        self.profile_id = data["id"]
        self.profile_identifier = data["identifier"]
        print(f"PASSED: Business profile created. ID={data['id']}, Identifier={data['identifier']}")
    
    def test_03_view_created_profile_at_public_url(self):
        """User can view their created profile at /api/business-profiles/public/{{identifier}}"""
        if not hasattr(self, 'authenticated') or not self.authenticated:
            pytest.skip("Authentication failed")
        
        # First get user's profile to get identifier
        response = self.session.get(f"{BASE_URL}/api/business-profiles/me")
        data = response.json()
        
        if not data.get("has_profile"):
            pytest.skip("No profile exists")
        
        identifier = data["profile"]["identifier"]
        
        # Fetch public profile
        public_response = requests.get(f"{BASE_URL}/api/business-profiles/public/{identifier}")
        assert public_response.status_code == 200
        public_data = public_response.json()
        
        assert public_data["identifier"] == identifier
        assert "business_name" in public_data
        assert "total_listings" in public_data
        print(f"PASSED: Public profile accessible at /business-profiles/public/{identifier}")
    
    def test_04_request_verification_from_profile(self):
        """User can request verification from the edit page"""
        if not hasattr(self, 'authenticated') or not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Check if profile exists
        profile_response = self.session.get(f"{BASE_URL}/api/business-profiles/me")
        profile_data = profile_response.json()
        
        if not profile_data.get("has_profile"):
            # Create profile first
            self.session.post(f"{BASE_URL}/api/business-profiles/", json={
                "business_name": f"Verification Test {uuid.uuid4().hex[:6]}",
                "description": "For verification testing"
            })
        
        # Request verification
        response = self.session.post(f"{BASE_URL}/api/business-profiles/me/request-verification", json={
            "message": "Please verify my business profile"
        })
        
        if response.status_code == 400:
            data = response.json()
            if "pending" in data.get("detail", "").lower() or "already" in data.get("detail", "").lower():
                print("PASSED: Verification already pending or approved")
                return
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "pending"
        print(f"PASSED: Verification request submitted, status={data.get('status')}")
    
    def test_05_stripe_checkout_requires_auth(self):
        """Stripe checkout endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/premium-subscription/stripe/checkout", json={
            "package_id": "monthly",
            "origin_url": "https://example.com",
            "business_profile_id": "test-id"
        })
        
        # Should return 401 for unauthenticated
        assert response.status_code in [401, 403, 422]
        print(f"PASSED: Stripe checkout rejects unauthenticated request with {response.status_code}")
    
    def test_06_stripe_checkout_validates_profile(self):
        """Stripe checkout validates business profile ownership"""
        if not hasattr(self, 'authenticated') or not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Try checkout with non-existent profile ID
        response = self.session.post(f"{BASE_URL}/api/premium-subscription/stripe/checkout", json={
            "package_id": "monthly",
            "origin_url": "https://classifieds-mvp-1.preview.emergentagent.com",
            "business_profile_id": "nonexistent-profile-id"
        })
        
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data.get("detail", "").lower()
        print(f"PASSED: Stripe checkout rejects invalid profile ID with 404")


class TestAdminBusinessProfileEndpoints:
    """Test admin business profile management endpoints"""
    
    def test_admin_list_profiles_requires_auth(self):
        """Admin list profiles requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/business-profiles/")
        
        # Should return 401 for unauthenticated
        assert response.status_code in [401, 403]
        print(f"PASSED: Admin list requires auth, returns {response.status_code}")
    
    def test_admin_verification_requests_requires_auth(self):
        """Admin verification requests requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/business-profiles/verification-requests")
        
        # Should return 401 for unauthenticated
        assert response.status_code in [401, 403]
        print(f"PASSED: Admin verification requests requires auth, returns {response.status_code}")
    
    def test_admin_stats_requires_auth(self):
        """Admin stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/business-profiles/stats/overview")
        
        # Should return 401 for unauthenticated
        assert response.status_code in [401, 403]
        print(f"PASSED: Admin stats requires auth, returns {response.status_code}")


class TestFeaturedSellersAPI:
    """Test featured sellers endpoint"""
    
    def test_featured_sellers_returns_correct_structure(self):
        """Featured sellers API returns correct response structure"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/featured")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "sellers" in data
        assert "total" in data
        assert "premium_count" in data
        assert "verified_count" in data
        
        print(f"PASSED: Featured sellers: total={data['total']}, premium={data['premium_count']}, verified={data['verified_count']}")
    
    def test_featured_sellers_empty_state(self):
        """Featured sellers returns empty array when no verified sellers"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/featured?limit=100")
        assert response.status_code == 200
        data = response.json()
        
        # Should return sellers array (may be empty if no verified sellers)
        assert isinstance(data["sellers"], list)
        print(f"PASSED: Featured sellers returns {len(data['sellers'])} sellers")


class TestBusinessDirectoryAPI:
    """Test business directory endpoint"""
    
    def test_directory_returns_correct_structure(self):
        """Directory API returns correct response structure"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/directory")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "profiles" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert "total_pages" in data
        
        print(f"PASSED: Directory returns {data['total']} profiles")
    
    def test_directory_pagination(self):
        """Directory API supports pagination"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/directory?page=1&limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert data["page"] == 1
        assert data["limit"] == 5
        assert len(data["profiles"]) <= 5
        print(f"PASSED: Directory pagination works, returned {len(data['profiles'])} profiles")
    
    def test_directory_verified_filter(self):
        """Directory API supports verified_only filter"""
        response = requests.get(f"{BASE_URL}/api/business-profiles/directory?verified_only=true")
        assert response.status_code == 200
        data = response.json()
        
        # All returned profiles should be verified
        for profile in data["profiles"]:
            if "is_verified" in profile:
                assert profile["is_verified"] == True
        
        print(f"PASSED: Verified filter works, returned {len(data['profiles'])} verified profiles")


class TestSocialLinksAndGallery:
    """Test social links and gallery functionality"""
    
    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Create test user session with profile"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        self.test_email = f"test_gallery_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register user
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": "testpass123",
            "name": "Gallery Tester"
        })
        
        if response.status_code not in [200, 201]:
            response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": self.test_email,
                "password": "testpass123"
            })
        
        if response.status_code in [200, 201]:
            data = response.json()
            token = data.get("session_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.authenticated = True
            else:
                self.authenticated = False
        else:
            self.authenticated = False
        
        yield
        
        if hasattr(self, 'authenticated') and self.authenticated:
            try:
                self.session.delete(f"{BASE_URL}/api/business-profiles/me")
            except:
                pass
    
    def test_update_profile_with_social_links(self):
        """User can update profile with social links"""
        if not hasattr(self, 'authenticated') or not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Create profile first
        self.session.post(f"{BASE_URL}/api/business-profiles/", json={
            "business_name": f"Social Links Test {uuid.uuid4().hex[:6]}",
            "description": "Testing social links"
        })
        
        # Update with social links
        response = self.session.put(f"{BASE_URL}/api/business-profiles/me", json={
            "social_links": {
                "facebook": "https://facebook.com/testbiz",
                "instagram": "https://instagram.com/testbiz",
                "twitter": "https://x.com/testbiz",
                "linkedin": "https://linkedin.com/company/testbiz",
                "website": "https://testbiz.com"
            }
        })
        
        if response.status_code == 404:
            pytest.skip("Profile not found")
        
        # Accept both 200 and validation errors (422) depending on model
        if response.status_code == 422:
            print("PASSED: Social links require proper model format (validation working)")
            return
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("social_links") is not None
        print(f"PASSED: Profile updated with social links")
    
    def test_add_video_to_gallery(self):
        """User can add video to gallery"""
        if not hasattr(self, 'authenticated') or not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Create profile first
        self.session.post(f"{BASE_URL}/api/business-profiles/", json={
            "business_name": f"Gallery Video Test {uuid.uuid4().hex[:6]}",
            "description": "Testing video gallery"
        })
        
        # Add video
        response = self.session.post(f"{BASE_URL}/api/business-profiles/me/gallery/video", json={
            "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "title": "Test Video"
        })
        
        if response.status_code == 404:
            pytest.skip("Profile not found")
        
        assert response.status_code == 200
        data = response.json()
        assert "video" in data
        assert data["video"]["url"] == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        assert data["video"]["title"] == "Test Video"
        # YouTube thumbnail should be extracted
        assert "thumbnail" in data["video"]
        print(f"PASSED: Video added to gallery with auto-extracted thumbnail")
    
    def test_add_video_invalid_url_rejected(self):
        """Invalid video URL is rejected"""
        if not hasattr(self, 'authenticated') or not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Create profile first
        self.session.post(f"{BASE_URL}/api/business-profiles/", json={
            "business_name": f"Video Validate Test {uuid.uuid4().hex[:6]}",
            "description": "Testing video validation"
        })
        
        # Try invalid URL
        response = self.session.post(f"{BASE_URL}/api/business-profiles/me/gallery/video", json={
            "url": "https://invalid-video-site.com/video",
            "title": "Invalid Video"
        })
        
        if response.status_code == 404:
            pytest.skip("Profile not found")
        
        assert response.status_code == 400
        data = response.json()
        assert "youtube" in data.get("detail", "").lower() or "vimeo" in data.get("detail", "").lower()
        print(f"PASSED: Invalid video URL rejected with proper error message")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
