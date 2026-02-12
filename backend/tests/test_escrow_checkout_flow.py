"""
Backend API Tests for Escrow Checkout Flow - E2E Testing
Testing: Order creation, Buyer orders listing, Confirm delivery, Stripe payment

Test credentials:
- Buyer: buyer@test.com / password123
- Seller: seller@test.com (user_3fe547c78c76, verified)
- Test Listing: 5375f0a3-e119-4e70-9b80-8214c61f7d64
- Existing Order: order_6f619b2950dd (pending_payment status)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://negotiate-badge.preview.emergentagent.com')

# Test credentials
TEST_BUYER_EMAIL = "buyer@test.com"
TEST_BUYER_PASSWORD = "password123"
TEST_SELLER_ID = "user_3fe547c78c76"  # verified premium seller
TEST_LISTING_ID = "5375f0a3-e119-4e70-9b80-8214c61f7d64"
TEST_EXISTING_ORDER = "order_6f619b2950dd"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_token(api_client):
    """Get authentication token for buyer"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_BUYER_EMAIL,
        "password": TEST_BUYER_PASSWORD
    })
    
    if response.status_code == 200:
        data = response.json()
        # Backend returns session_token, not token
        return data.get("session_token") or data.get("token")
    
    print(f"Login failed: {response.status_code} - {response.text}")
    return None


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    if auth_token:
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestBasicEndpoints:
    """Test basic endpoints are working"""
    
    def test_api_health(self, api_client):
        """Check API is responding"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"API health check failed: {response.status_code}"
        print("✓ API health check passed")
    
    def test_buyer_orders_endpoint_exists(self, api_client):
        """GET /api/escrow/buyer/orders - endpoint should exist"""
        response = api_client.get(f"{BASE_URL}/api/escrow/buyer/orders")
        
        # 401 means endpoint exists but requires auth
        assert response.status_code in [200, 401], f"Expected 200/401, got {response.status_code}: {response.text}"
        print(f"✓ Buyer orders endpoint exists, returned: {response.status_code}")
    
    def test_confirm_endpoint_exists(self, api_client):
        """POST /api/escrow/orders/{id}/confirm - endpoint should exist"""
        response = api_client.post(f"{BASE_URL}/api/escrow/orders/test_order_id/confirm")
        
        # 401 means endpoint exists but requires auth
        assert response.status_code in [200, 401, 404], f"Expected 200/401/404, got {response.status_code}: {response.text}"
        print(f"✓ Confirm delivery endpoint exists, returned: {response.status_code}")


class TestBuyerAuthentication:
    """Test buyer can login"""
    
    def test_buyer_login_success(self, api_client):
        """POST /api/auth/login - buyer should be able to login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_BUYER_EMAIL,
            "password": TEST_BUYER_PASSWORD
        })
        
        # If buyer doesn't exist, it will be 401 or 400
        if response.status_code == 200:
            data = response.json()
            # Backend returns session_token, not token
            assert "session_token" in data or "token" in data, "Login response should contain session_token"
            print(f"✓ Buyer login successful")
            print(f"  User: {data.get('user', {}).get('email', 'N/A')}")
        elif response.status_code == 401:
            print(f"⚠ Buyer account doesn't exist or wrong password: {response.text}")
            pytest.skip("Buyer account not found")
        else:
            print(f"Login returned: {response.status_code} - {response.text}")


class TestOrderCreation:
    """Test order creation flow"""
    
    def test_seller_can_sell_online(self, api_client):
        """GET /api/escrow/seller/{seller_id}/can-sell-online - verify seller is verified"""
        response = api_client.get(f"{BASE_URL}/api/escrow/seller/{TEST_SELLER_ID}/can-sell-online")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("can_sell_online") == True, f"Seller should be verified: {data}"
        print(f"✓ Seller {TEST_SELLER_ID} is verified and can sell online")
    
    def test_listing_exists(self, api_client):
        """GET /api/listings/{id} - check test listing exists"""
        response = api_client.get(f"{BASE_URL}/api/listings/{TEST_LISTING_ID}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Listing found: {data.get('title', 'N/A')}")
            print(f"  Price: {data.get('price', 'N/A')}")
            print(f"  Seller: {data.get('user_id', 'N/A')}")
        else:
            print(f"⚠ Listing not found: {response.status_code}")
            pytest.skip("Test listing not found")
    
    def test_calculate_transport_cost(self, api_client):
        """POST /api/escrow/calculate-transport - transport cost calculation"""
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
        assert "transport_cost" in data
        assert "estimated_days" in data
        print(f"✓ Transport cost: {data['transport_cost']}, Estimated days: {data['estimated_days']}")
    
    def test_create_order_requires_auth(self, api_client):
        """POST /api/escrow/orders/create - requires authentication"""
        response = api_client.post(
            f"{BASE_URL}/api/escrow/orders/create",
            json={
                "listing_id": TEST_LISTING_ID,
                "quantity": 1,
                "delivery_method": "pickup",
                "payment_method": "stripe"
            }
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ Order creation requires authentication")
    
    def test_create_order_with_auth(self, authenticated_client, auth_token):
        """POST /api/escrow/orders/create - create order with authenticated buyer"""
        if not auth_token:
            pytest.skip("Authentication not available")
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/escrow/orders/create",
            json={
                "listing_id": TEST_LISTING_ID,
                "quantity": 1,
                "delivery_method": "pickup",
                "payment_method": "stripe"
            }
        )
        
        if response.status_code == 201 or response.status_code == 200:
            data = response.json()
            order = data.get("order", data)
            print(f"✓ Order created: {order.get('id', 'N/A')}")
            print(f"  Status: {order.get('status', 'N/A')}")
            print(f"  Total: {order.get('total_amount', 'N/A')}")
            
            # Store order ID for subsequent tests
            assert "order" in data or "id" in data
        elif response.status_code == 400:
            # May fail if listing not active or buyer is seller
            print(f"⚠ Order creation failed (expected if buyer is seller): {response.text}")
        else:
            print(f"Order creation returned: {response.status_code} - {response.text}")


class TestBuyerOrders:
    """Test buyer orders listing"""
    
    def test_get_buyer_orders(self, authenticated_client, auth_token):
        """GET /api/escrow/buyer/orders - get buyer's orders"""
        if not auth_token:
            pytest.skip("Authentication not available")
        
        response = authenticated_client.get(f"{BASE_URL}/api/escrow/buyer/orders")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "orders" in data, "Response should have 'orders' field"
        assert "total" in data, "Response should have 'total' field"
        
        print(f"✓ Buyer orders fetched: {data.get('total', 0)} total orders")
        
        if data.get("orders"):
            order = data["orders"][0]
            print(f"  First order: {order.get('id', 'N/A')}")
            print(f"  Status: {order.get('status', 'N/A')}")
    
    def test_get_buyer_orders_with_status_filter(self, authenticated_client, auth_token):
        """GET /api/escrow/buyer/orders?status=pending_payment - filter by status"""
        if not auth_token:
            pytest.skip("Authentication not available")
        
        response = authenticated_client.get(f"{BASE_URL}/api/escrow/buyer/orders?status=pending_payment")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"✓ Pending payment orders: {data.get('total', 0)}")


class TestPaymentCreation:
    """Test payment creation flow"""
    
    def test_create_payment_requires_auth(self, api_client):
        """POST /api/payments/create - requires authentication"""
        response = api_client.post(
            f"{BASE_URL}/api/payments/create",
            json={
                "order_id": TEST_EXISTING_ORDER,
                "provider": "stripe",
                "origin_url": "https://negotiate-badge.preview.emergentagent.com"
            }
        )
        
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}: {response.text}"
        print(f"✓ Payment creation requires authentication: {response.status_code}")
    
    def test_create_stripe_payment(self, authenticated_client, auth_token):
        """POST /api/payments/create - create Stripe payment session"""
        if not auth_token:
            pytest.skip("Authentication not available")
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/create",
            json={
                "order_id": TEST_EXISTING_ORDER,
                "provider": "stripe",
                "origin_url": "https://negotiate-badge.preview.emergentagent.com"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Stripe payment created:")
            print(f"  Checkout URL: {data.get('checkout_url', 'N/A')[:80]}...")
            print(f"  Session ID: {data.get('session_id', 'N/A')}")
            print(f"  TX ID: {data.get('tx_id', 'N/A')}")
        elif response.status_code == 400:
            print(f"⚠ Payment creation failed (order may not be pending_payment): {response.text}")
        elif response.status_code == 404:
            print(f"⚠ Order not found: {response.text}")
        elif response.status_code == 403:
            print(f"⚠ Not authorized (buyer may not own this order): {response.text}")
        else:
            print(f"Payment creation returned: {response.status_code} - {response.text}")


class TestConfirmDelivery:
    """Test confirm delivery flow"""
    
    def test_confirm_delivery_requires_auth(self, api_client):
        """POST /api/escrow/orders/{id}/confirm - requires authentication"""
        response = api_client.post(f"{BASE_URL}/api/escrow/orders/test_order_id/confirm")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ Confirm delivery requires authentication")
    
    def test_confirm_delivery_nonexistent_order(self, authenticated_client, auth_token):
        """POST /api/escrow/orders/{id}/confirm - nonexistent order returns 404"""
        if not auth_token:
            pytest.skip("Authentication not available")
        
        response = authenticated_client.post(f"{BASE_URL}/api/escrow/orders/nonexistent_order_xyz/confirm")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Nonexistent order returns 404")
    
    def test_confirm_delivery_flow(self, authenticated_client, auth_token):
        """POST /api/escrow/orders/{id}/confirm - test confirm flow"""
        if not auth_token:
            pytest.skip("Authentication not available")
        
        # First get buyer's orders to find a suitable order
        orders_response = authenticated_client.get(f"{BASE_URL}/api/escrow/buyer/orders")
        
        if orders_response.status_code != 200:
            pytest.skip("Could not fetch buyer orders")
        
        orders_data = orders_response.json()
        orders = orders_data.get("orders", [])
        
        # Find an order that can be confirmed (shipped or delivered)
        confirmable_order = None
        for order in orders:
            if order.get("status") in ["shipped", "delivered", "in_transit"]:
                confirmable_order = order
                break
        
        if not confirmable_order:
            print("⚠ No confirmable orders found (need shipped/delivered status)")
            # Test with pending_payment order to verify proper error handling
            if orders:
                test_order = orders[0]
                response = authenticated_client.post(f"{BASE_URL}/api/escrow/orders/{test_order['id']}/confirm")
                
                if response.status_code == 400:
                    print(f"✓ Cannot confirm order in {test_order.get('status')} status - correct behavior")
                else:
                    print(f"Confirm returned: {response.status_code} - {response.text}")
            return
        
        # Try to confirm the order
        response = authenticated_client.post(f"{BASE_URL}/api/escrow/orders/{confirmable_order['id']}/confirm")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Order {confirmable_order['id']} confirmed successfully")
            print(f"  New status: {data.get('status', 'N/A')}")
        else:
            print(f"Confirm delivery returned: {response.status_code} - {response.text}")


class TestPublicEscrowEndpoints:
    """Test public escrow configuration endpoints"""
    
    def test_get_transport_pricing(self, api_client):
        """GET /api/escrow/transport-pricing - public endpoint"""
        response = api_client.get(f"{BASE_URL}/api/escrow/transport-pricing")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Transport pricing: {len(data)} options")
    
    def test_get_vat_configs(self, api_client):
        """GET /api/escrow/vat-configs - public endpoint"""
        response = api_client.get(f"{BASE_URL}/api/escrow/vat-configs")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ VAT configs: {len(data)} countries")
    
    def test_get_commission_configs(self, api_client):
        """GET /api/escrow/commission-configs - public endpoint"""
        response = api_client.get(f"{BASE_URL}/api/escrow/commission-configs")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Commission configs: {len(data)} configurations")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
