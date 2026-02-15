"""
Backend API Tests for Escrow and Payment System
Testing: Transport Pricing, VAT Configs, Commission Configs, Seller Verification, Order Price Calculation, Payment Creation
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://marketplace-ai-tools.preview.emergentagent.com')

# Test credentials
TEST_SELLER_ID = "user_3fe547c78c76"  # verified premium seller
TEST_LISTING_ID = "5375f0a3-e119-4e70-9b80-8214c61f7d64"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestEscrowPublicEndpoints:
    """Test public escrow endpoints - no auth required"""
    
    def test_get_transport_pricing(self, api_client):
        """GET /api/escrow/transport-pricing - should return transport pricing options"""
        response = api_client.get(f"{BASE_URL}/api/escrow/transport-pricing")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list of transport pricing options"
        
        # Check structure if data exists
        if len(data) > 0:
            pricing = data[0]
            assert "id" in pricing, "Transport pricing should have 'id'"
            assert "name" in pricing, "Transport pricing should have 'name'"
            assert "base_price" in pricing, "Transport pricing should have 'base_price'"
            assert "price_per_km" in pricing, "Transport pricing should have 'price_per_km'"
            print(f"Transport pricing found: {len(data)} options")
            print(f"Sample pricing: {pricing}")
    
    def test_get_vat_configs(self, api_client):
        """GET /api/escrow/vat-configs - should return VAT configurations by country"""
        response = api_client.get(f"{BASE_URL}/api/escrow/vat-configs")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list of VAT configurations"
        
        # Check structure if data exists
        if len(data) > 0:
            vat = data[0]
            assert "country_code" in vat, "VAT config should have 'country_code'"
            assert "country_name" in vat, "VAT config should have 'country_name'"
            assert "vat_percentage" in vat, "VAT config should have 'vat_percentage'"
            print(f"VAT configs found: {len(data)} countries")
            print(f"Sample VAT: {vat}")
    
    def test_seller_can_sell_online_verified(self, api_client):
        """GET /api/escrow/seller/{seller_id}/can-sell-online - check verified seller"""
        response = api_client.get(f"{BASE_URL}/api/escrow/seller/{TEST_SELLER_ID}/can-sell-online")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "can_sell_online" in data, "Response should have 'can_sell_online'"
        print(f"Seller {TEST_SELLER_ID} can_sell_online: {data['can_sell_online']}")
        print(f"Reason: {data.get('reason', 'N/A')}")
        
        # The test seller should be verified
        assert data["can_sell_online"] == True, f"Test seller should be verified: {data}"
    
    def test_seller_can_sell_online_nonexistent(self, api_client):
        """GET /api/escrow/seller/{seller_id}/can-sell-online - check nonexistent seller"""
        response = api_client.get(f"{BASE_URL}/api/escrow/seller/nonexistent_user_xyz/can-sell-online")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["can_sell_online"] == False, "Nonexistent seller should not be able to sell online"
        assert "reason" in data, "Should provide a reason"
        print(f"Nonexistent seller response: {data}")


class TestEscrowCommissionEndpoint:
    """Test commission configs endpoint"""
    
    def test_get_commission_configs_public(self, api_client):
        """GET /api/escrow/commission-configs - should return commission configurations
        
        NOTE: According to the test requirements, this should be a PUBLIC endpoint
        but may only exist as an admin endpoint at /api/escrow/admin/config/commission
        """
        # First try public endpoint
        response = api_client.get(f"{BASE_URL}/api/escrow/commission-configs")
        
        if response.status_code == 404:
            print("WARNING: Public /api/escrow/commission-configs endpoint NOT FOUND (404)")
            print("This endpoint is required per test specification but may be missing")
            
            # Try admin endpoint as fallback info
            admin_response = api_client.get(f"{BASE_URL}/api/escrow/admin/config/commission")
            if admin_response.status_code == 401:
                print("Admin endpoint exists but requires authentication (401)")
            pytest.fail("Public /api/escrow/commission-configs endpoint is missing - needs to be added")
        else:
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            data = response.json()
            assert isinstance(data, list), "Should return a list of commission configurations"
            print(f"Commission configs found: {len(data)} configurations")


class TestPaymentEndpoints:
    """Test payment API endpoints"""
    
    def test_payment_create_endpoint_exists(self, api_client):
        """POST /api/payments/create - endpoint should exist
        
        Note: Will return 401 without auth or 422 without body, but endpoint should exist
        """
        response = api_client.post(f"{BASE_URL}/api/payments/create", json={})
        
        # 401 (not authenticated) or 422 (validation error) means endpoint exists
        # 404 means endpoint doesn't exist
        assert response.status_code != 404, f"Payment create endpoint should exist, got 404: {response.text}"
        print(f"Payment create endpoint exists, returned: {response.status_code}")
        
        if response.status_code == 401:
            print("Returns 401 - authentication required (expected)")
        elif response.status_code == 422:
            print("Returns 422 - validation error (expected without proper body)")
    
    def test_mobile_money_endpoint_exists(self, api_client):
        """POST /api/payments/mobile-money - endpoint should exist
        
        Note: Will return 401 without auth or 422 without body, but endpoint should exist
        """
        response = api_client.post(f"{BASE_URL}/api/payments/mobile-money", json={})
        
        # 401 (not authenticated) or 422 (validation error) means endpoint exists
        assert response.status_code != 404, f"Mobile money endpoint should exist, got 404: {response.text}"
        print(f"Mobile money endpoint exists, returned: {response.status_code}")


class TestCalculateOrderPrice:
    """Test order price calculation endpoint"""
    
    def test_calculate_order_price_no_auth(self, api_client):
        """POST /api/escrow/calculate-order-price - requires authentication"""
        response = api_client.post(
            f"{BASE_URL}/api/escrow/calculate-order-price",
            json={
                "listing_id": TEST_LISTING_ID,
                "quantity": 1,
                "delivery_method": "pickup",
                "buyer_country": "US"
            }
        )
        
        # This endpoint requires auth, so should return 401
        if response.status_code == 401:
            print("calculate-order-price correctly requires authentication")
        elif response.status_code == 200:
            data = response.json()
            print(f"Order price calculated (no auth required): {data}")
        else:
            print(f"Unexpected status: {response.status_code} - {response.text}")
        
        # Endpoint should exist (not 404)
        assert response.status_code != 404, "Calculate order price endpoint should exist"


class TestListingEndpoint:
    """Test listing endpoint for Buy Now flow"""
    
    def test_get_listing_details(self, api_client):
        """GET /api/listings/{id} - should return listing details"""
        response = api_client.get(f"{BASE_URL}/api/listings/{TEST_LISTING_ID}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Listing found: {data.get('title', 'N/A')}")
            print(f"Price: {data.get('price', 'N/A')}")
            print(f"Seller ID: {data.get('user_id', 'N/A')}")
            print(f"Status: {data.get('status', 'N/A')}")
            
            # Verify it's the right listing
            assert "id" in data, "Listing should have id"
            assert "title" in data, "Listing should have title"
            assert "price" in data, "Listing should have price"
        elif response.status_code == 404:
            print(f"WARNING: Test listing {TEST_LISTING_ID} not found")
        else:
            print(f"Listing fetch returned: {response.status_code}")


class TestTransportCalculation:
    """Test transport cost calculation"""
    
    def test_calculate_transport_cost(self, api_client):
        """POST /api/escrow/calculate-transport - calculate delivery cost"""
        response = api_client.post(
            f"{BASE_URL}/api/escrow/calculate-transport",
            json={
                "distance_km": 50.0,
                "weight_kg": 2.0,
                "pricing_id": "standard"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "transport_cost" in data, "Should return transport_cost"
        assert "estimated_days" in data, "Should return estimated_days"
        assert "breakdown" in data, "Should return breakdown"
        
        print(f"Transport cost for 50km, 2kg: {data['transport_cost']}")
        print(f"Estimated days: {data['estimated_days']}")
        print(f"Breakdown: {data['breakdown']}")


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self, api_client):
        """Check API is responding"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"API health check failed: {response.status_code}"
        print("API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
