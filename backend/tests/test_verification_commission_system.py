"""
Test Verification System and Commission System APIs
Tests new verification tiers and commission configuration endpoints
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://classifieds-search-2.preview.emergentagent.com').rstrip('/')

# Test fixtures
@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    # Try to login with known admin credentials
    response = api_client.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": "admin@marketplace.com",
        "password": "Admin123!"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    
    # If login fails, skip auth tests
    pytest.skip("Admin authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, admin_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


# ============================================================
# VERIFICATION TIER TESTS (Public endpoint - no auth required)
# ============================================================

class TestVerificationTiers:
    """Test verification tier information endpoint (public)"""
    
    def test_get_verification_tiers(self, api_client):
        """GET /api/admin/verification/tiers - Returns tier info (no auth)"""
        response = api_client.get(f"{BASE_URL}/api/admin/verification/tiers")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tiers" in data, "Response should have 'tiers' key"
        
        tiers = data["tiers"]
        assert len(tiers) == 4, f"Expected 4 tiers, got {len(tiers)}"
        
        # Validate tier structure
        expected_tier_ids = ["unverified", "verified_user", "verified_seller", "premium_verified_seller"]
        actual_tier_ids = [t["id"] for t in tiers]
        
        for expected_id in expected_tier_ids:
            assert expected_id in actual_tier_ids, f"Missing tier: {expected_id}"
        
        print(f"PASSED: GET /api/admin/verification/tiers - Found {len(tiers)} tiers")
    
    def test_tier_benefits_structure(self, api_client):
        """Verify tier benefits have correct structure"""
        response = api_client.get(f"{BASE_URL}/api/admin/verification/tiers")
        data = response.json()
        
        for tier in data["tiers"]:
            assert "benefits" in tier, f"Tier {tier['id']} missing benefits"
            benefits = tier["benefits"]
            
            # Check required benefit fields exist
            assert "commission_discount" in benefits, f"Tier {tier['id']} missing commission_discount"
            assert "search_priority_boost" in benefits, f"Tier {tier['id']} missing search_priority_boost"
            
            # Verify data types
            assert isinstance(benefits["commission_discount"], (int, float))
            assert isinstance(benefits["search_priority_boost"], (int, float))
        
        print("PASSED: All tiers have valid benefits structure")
    
    def test_verification_tier_discounts(self, api_client):
        """Verify discount values are correct per tier"""
        response = api_client.get(f"{BASE_URL}/api/admin/verification/tiers")
        data = response.json()
        
        tiers_dict = {t["id"]: t for t in data["tiers"]}
        
        # Expected discounts
        assert tiers_dict["unverified"]["benefits"]["commission_discount"] == 0
        assert tiers_dict["verified_user"]["benefits"]["commission_discount"] == 0
        assert tiers_dict["verified_seller"]["benefits"]["commission_discount"] == 10
        assert tiers_dict["premium_verified_seller"]["benefits"]["commission_discount"] == 25
        
        print("PASSED: Verification tier discounts are correct")


# ============================================================
# VERIFICATION STATS TESTS (Auth required)
# ============================================================

class TestVerificationStats:
    """Test verification statistics endpoint (requires auth)"""
    
    def test_get_verification_stats_unauthorized(self, api_client):
        """GET /api/admin/verification/stats without auth returns 401"""
        # Create fresh session without auth
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/admin/verification/stats")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASSED: /api/admin/verification/stats requires authentication")
    
    def test_get_verification_stats_authorized(self, authenticated_client):
        """GET /api/admin/verification/stats - Returns stats with auth"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/verification/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required fields
        assert "by_tier" in data, "Response should have 'by_tier' key"
        assert "total_verified" in data, "Response should have 'total_verified' key"
        assert "pending_requests" in data, "Response should have 'pending_requests' key"
        
        # Verify by_tier structure
        by_tier = data["by_tier"]
        expected_tiers = ["unverified", "verified_user", "verified_seller", "premium_verified_seller"]
        for tier in expected_tiers:
            assert tier in by_tier, f"Missing tier in stats: {tier}"
            assert isinstance(by_tier[tier], int), f"Tier {tier} count should be int"
        
        print(f"PASSED: GET /api/admin/verification/stats - Total verified: {data['total_verified']}, Pending: {data['pending_requests']}")


# ============================================================
# COMMISSION CONFIG TESTS (Auth required)
# ============================================================

class TestCommissionConfig:
    """Test commission configuration endpoints"""
    
    def test_get_commission_config_unauthorized(self, api_client):
        """GET /api/admin/commission/config without auth returns 401"""
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/admin/commission/config")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASSED: /api/admin/commission/config requires authentication")
    
    def test_get_commission_config_authorized(self, authenticated_client):
        """GET /api/admin/commission/config - Returns config with auth"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/commission/config")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required fields
        assert "default_commission" in data, "Response should have 'default_commission'"
        assert "verification_discounts" in data, "Response should have 'verification_discounts'"
        
        # Verify data types
        assert isinstance(data["default_commission"], (int, float)), "default_commission should be numeric"
        assert isinstance(data["verification_discounts"], list), "verification_discounts should be a list"
        
        # Verify verification discounts structure
        for discount in data["verification_discounts"]:
            assert "tier" in discount, "Discount should have 'tier'"
            assert "discount_percentage" in discount, "Discount should have 'discount_percentage'"
        
        print(f"PASSED: GET /api/admin/commission/config - Default commission: {data['default_commission']}%")


class TestCommissionCategories:
    """Test commission categories endpoint"""
    
    def test_get_commission_categories_unauthorized(self, api_client):
        """GET /api/admin/commission/categories without auth returns 401"""
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/admin/commission/categories")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASSED: /api/admin/commission/categories requires authentication")
    
    def test_get_commission_categories_authorized(self, authenticated_client):
        """GET /api/admin/commission/categories - Returns categories with commission rates"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/commission/categories")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Should be a list of categories
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            # Verify structure of first category
            cat = data[0]
            assert "id" in cat, "Category should have 'id'"
            assert "name" in cat, "Category should have 'name'"
            assert "commission_percentage" in cat, "Category should have 'commission_percentage'"
            
        print(f"PASSED: GET /api/admin/commission/categories - Found {len(data)} categories")


class TestCommissionCalculate:
    """Test commission calculation endpoint"""
    
    def test_calculate_commission_unauthorized(self, api_client):
        """POST /api/admin/commission/calculate without auth returns 401"""
        fresh_session = requests.Session()
        fresh_session.headers.update({"Content-Type": "application/json"})
        response = fresh_session.post(f"{BASE_URL}/api/admin/commission/calculate", json={
            "amount": 100
        })
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASSED: /api/admin/commission/calculate requires authentication")
    
    def test_calculate_commission_basic(self, authenticated_client):
        """POST /api/admin/commission/calculate - Basic calculation"""
        response = authenticated_client.post(f"{BASE_URL}/api/admin/commission/calculate", json={
            "amount": 100.0,
            "seller_verification_tier": "unverified"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required fields
        assert "amount" in data, "Response should have 'amount'"
        assert "base_rate" in data, "Response should have 'base_rate'"
        assert "effective_rate" in data, "Response should have 'effective_rate'"
        assert "commission" in data, "Response should have 'commission'"
        assert "seller_receives" in data, "Response should have 'seller_receives'"
        
        # Verify calculations make sense
        assert data["amount"] == 100.0, "Amount should match input"
        assert data["commission"] + data["seller_receives"] == data["amount"], "Commission + seller_receives should equal amount"
        
        print(f"PASSED: Commission calculation - Amount: {data['amount']}, Commission: {data['commission']}, Seller receives: {data['seller_receives']}")
    
    def test_calculate_commission_with_verified_seller(self, authenticated_client):
        """POST /api/admin/commission/calculate - With verified seller discount"""
        response = authenticated_client.post(f"{BASE_URL}/api/admin/commission/calculate", json={
            "amount": 100.0,
            "seller_verification_tier": "verified_seller"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verified sellers should get discount
        assert data["discount_percentage"] == 10, f"Verified seller should have 10% discount, got {data.get('discount_percentage')}"
        assert data["effective_rate"] < data["base_rate"], "Effective rate should be lower than base rate for verified sellers"
        
        print(f"PASSED: Verified seller commission - Discount: {data['discount_percentage']}%, Effective rate: {data['effective_rate']}%")
    
    def test_calculate_commission_premium_seller(self, authenticated_client):
        """POST /api/admin/commission/calculate - Premium verified seller has highest discount"""
        response = authenticated_client.post(f"{BASE_URL}/api/admin/commission/calculate", json={
            "amount": 100.0,
            "seller_verification_tier": "premium_verified_seller"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Premium sellers should get highest discount (25%)
        assert data["discount_percentage"] == 25, f"Premium seller should have 25% discount, got {data.get('discount_percentage')}"
        
        print(f"PASSED: Premium seller commission - Discount: {data['discount_percentage']}%, Commission: {data['commission']}")


# ============================================================
# VERIFICATION PENDING REQUESTS TESTS
# ============================================================

class TestVerificationRequests:
    """Test verification requests endpoint"""
    
    def test_get_pending_requests_unauthorized(self, api_client):
        """GET /api/admin/verification/requests without auth returns 401"""
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/admin/verification/requests")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASSED: /api/admin/verification/requests requires authentication")
    
    def test_get_pending_requests_authorized(self, authenticated_client):
        """GET /api/admin/verification/requests - Returns pending requests"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/verification/requests")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required fields
        assert "requests" in data, "Response should have 'requests'"
        assert "total" in data, "Response should have 'total'"
        assert "page" in data, "Response should have 'page'"
        assert "limit" in data, "Response should have 'limit'"
        
        assert isinstance(data["requests"], list), "requests should be a list"
        
        print(f"PASSED: GET /api/admin/verification/requests - Total pending: {data['total']}")


# ============================================================
# VERIFIED USERS LIST TESTS
# ============================================================

class TestVerifiedUsers:
    """Test verified users list endpoint"""
    
    def test_get_verified_users_unauthorized(self, api_client):
        """GET /api/admin/verification/users without auth returns 401"""
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/admin/verification/users")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASSED: /api/admin/verification/users requires authentication")
    
    def test_get_verified_users_authorized(self, authenticated_client):
        """GET /api/admin/verification/users - Returns verified users"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/verification/users")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required fields
        assert "users" in data, "Response should have 'users'"
        assert "total" in data, "Response should have 'total'"
        
        print(f"PASSED: GET /api/admin/verification/users - Total verified: {data['total']}")


# ============================================================
# RUN TESTS
# ============================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
