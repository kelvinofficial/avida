"""
E2E Test Suite: Complete Ordering Flow
Tests: Browse items, checkout, order creation, tracking, and delivery confirmation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://order-checkout-demo.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_USER = {
    "email": "testuser2028@example.com",
    "password": "Test@123456"
}

SELLER_USER = {
    "email": "demo@avida.com",
    "password": "Demo@123"
}

# Test listing - Nice dress (50K TZS) - under Stripe limit
TEST_LISTING_ID = "fb3227c3-63b9-4005-875c-d1efa6675170"
TEST_LISTING_DETAIL_ID = "8accd855-6364-458e-9205-78e156b043e7"
TEST_SELLER_ID = "user_917eeb578097"


# Session-scoped fixtures to avoid rate limiting
@pytest.fixture(scope="session")
def test_user_token():
    """Get authentication token for test user - reused across all tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER)
    if response.status_code != 200:
        pytest.skip(f"Test user login failed: {response.text}")
    data = response.json()
    token = data.get("session_token") or data.get("token") or data.get("access_token")
    print(f"✓ Test user authenticated")
    return token


@pytest.fixture(scope="session")
def seller_token():
    """Get authentication token for seller user - reused across all tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SELLER_USER)
    if response.status_code != 200:
        pytest.skip(f"Seller login failed: {response.text}")
    data = response.json()
    token = data.get("session_token") or data.get("token") or data.get("access_token")
    print(f"✓ Seller authenticated")
    return token


class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_backend_health(self):
        """Test backend health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ Backend health: {data}")
    
    def test_user_authentication(self, test_user_token):
        """Verify test user is authenticated"""
        assert test_user_token is not None
        print("✓ Test user login successful")
    
    def test_seller_authentication(self, seller_token):
        """Verify seller is authenticated"""
        assert seller_token is not None
        print("✓ Seller login successful")


class TestBrowseListings:
    """Browse listings tests"""
    
    def test_get_listings(self):
        """Test fetching listings"""
        response = requests.get(f"{BASE_URL}/api/listings?limit=5")
        assert response.status_code == 200, f"Get listings failed: {response.text}"
        data = response.json()
        listings = data if isinstance(data, list) else data.get("listings", data.get("items", []))
        assert len(listings) > 0, "No listings returned"
        print(f"✓ Got {len(listings)} listings")
    
    def test_get_listing_detail(self):
        """Test fetching listing details"""
        response = requests.get(f"{BASE_URL}/api/listings/{TEST_LISTING_DETAIL_ID}")
        assert response.status_code == 200, f"Get listing detail failed: {response.text}"
        data = response.json()
        assert "id" in data or "title" in data
        print(f"✓ Got listing detail: {data.get('title', data.get('id'))}")


class TestSellerVerification:
    """Seller verification tests"""
    
    def test_seller_can_sell_online(self):
        """Test if seller can sell online"""
        response = requests.get(f"{BASE_URL}/api/escrow/seller/{TEST_SELLER_ID}/can-sell-online")
        assert response.status_code == 200, f"Seller check failed: {response.text}"
        data = response.json()
        assert data.get("can_sell_online") == True, f"Seller cannot sell online: {data}"
        print(f"✓ Seller {TEST_SELLER_ID} can sell online")


class TestOrderFlow:
    """Complete ordering flow tests"""
    
    def test_calculate_order_price(self, test_user_token):
        """Test order price calculation"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        payload = {
            "listing_id": TEST_LISTING_ID,
            "quantity": 1,
            "delivery_method": "pickup",
            "buyer_country": "TZ"
        }
        response = requests.post(f"{BASE_URL}/api/escrow/calculate-order-price", json=payload, headers=headers)
        assert response.status_code == 200, f"Price calculation failed: {response.text}"
        data = response.json()
        assert "total_amount" in data or "total" in data
        print(f"✓ Order price calculated: {data.get('total_amount', data.get('total'))}")
    
    def test_create_order(self, test_user_token):
        """Test order creation"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        payload = {
            "listing_id": TEST_LISTING_ID,
            "quantity": 1,
            "delivery_method": "pickup",
            "payment_method": "stripe"
        }
        response = requests.post(f"{BASE_URL}/api/escrow/orders/create", json=payload, headers=headers)
        assert response.status_code in [200, 201], f"Order creation failed: {response.text}"
        data = response.json()
        # Order response has nested structure: {order: {..., id: ...}, escrow: {...}}
        if "order" in data:
            order_id = data["order"].get("id") or data["order"].get("order_id")
        else:
            order_id = data.get("id") or data.get("order_id")
        assert order_id is not None, f"No order ID in response: {data}"
        print(f"✓ Order created: {order_id}")
        return order_id
    
    def test_get_buyer_orders(self, test_user_token):
        """Test fetching buyer's orders"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        response = requests.get(f"{BASE_URL}/api/escrow/orders/my-orders", headers=headers)
        assert response.status_code == 200, f"Get orders failed: {response.text}"
        data = response.json()
        orders = data if isinstance(data, list) else data.get("orders", data.get("items", []))
        print(f"✓ Got {len(orders)} buyer orders")
        return orders
    
    def test_get_order_details(self, test_user_token):
        """Test fetching order details"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        # Get list of orders first
        orders_response = requests.get(f"{BASE_URL}/api/escrow/orders/my-orders", headers=headers)
        if orders_response.status_code != 200:
            pytest.skip(f"Could not get orders: {orders_response.text}")
        
        orders_data = orders_response.json()
        orders = orders_data if isinstance(orders_data, list) else orders_data.get("orders", orders_data.get("items", []))
        
        if not orders:
            pytest.skip("No orders found for testing")
        
        order_id = orders[0].get("id") or orders[0].get("order_id")
        
        # Get order details
        response = requests.get(f"{BASE_URL}/api/escrow/orders/{order_id}", headers=headers)
        assert response.status_code == 200, f"Get order details failed: {response.text}"
        data = response.json()
        print(f"✓ Got order details: {order_id}, status: {data.get('status')}")
    
    def test_get_order_tracking(self, test_user_token):
        """Test fetching order tracking"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        # Get list of orders first
        orders_response = requests.get(f"{BASE_URL}/api/escrow/orders/my-orders", headers=headers)
        if orders_response.status_code != 200:
            pytest.skip(f"Could not get orders: {orders_response.text}")
        
        orders_data = orders_response.json()
        orders = orders_data if isinstance(orders_data, list) else orders_data.get("orders", orders_data.get("items", []))
        
        if not orders:
            pytest.skip("No orders found for testing")
        
        order_id = orders[0].get("id") or orders[0].get("order_id")
        
        # Get order tracking
        response = requests.get(f"{BASE_URL}/api/escrow/orders/{order_id}/tracking", headers=headers)
        assert response.status_code == 200, f"Get order tracking failed: {response.text}"
        data = response.json()
        print(f"✓ Got order tracking: {data.get('status', 'status unknown')}")


class TestSellerActions:
    """Seller actions: Get orders"""
    
    def test_get_seller_orders(self, seller_token):
        """Test fetching seller's orders"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        response = requests.get(f"{BASE_URL}/api/escrow/seller/orders", headers=headers)
        assert response.status_code == 200, f"Get seller orders failed: {response.text}"
        data = response.json()
        orders = data if isinstance(data, list) else data.get("orders", data.get("items", []))
        print(f"✓ Got {len(orders)} seller orders")


class TestPaymentFlow:
    """Payment creation tests"""
    
    def test_create_stripe_payment(self, test_user_token):
        """Test Stripe payment creation"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        # First create an order
        order_payload = {
            "listing_id": TEST_LISTING_ID,
            "quantity": 1,
            "delivery_method": "pickup",
            "payment_method": "stripe"
        }
        order_response = requests.post(f"{BASE_URL}/api/escrow/orders/create", json=order_payload, headers=headers)
        if order_response.status_code not in [200, 201]:
            pytest.skip(f"Order creation failed: {order_response.text}")
        
        order_data = order_response.json()
        # Order response has nested structure: {order: {..., id: ...}, escrow: {...}}
        if "order" in order_data:
            order_id = order_data["order"].get("id") or order_data["order"].get("order_id")
        else:
            order_id = order_data.get("id") or order_data.get("order_id")
        
        if not order_id:
            pytest.skip(f"Could not get order_id from response: {order_data}")
        
        # Create payment - origin_url is required
        payment_payload = {
            "order_id": order_id,
            "provider": "stripe",
            "origin_url": BASE_URL
        }
        response = requests.post(f"{BASE_URL}/api/payments/create", json=payment_payload, headers=headers)
        assert response.status_code in [200, 201], f"Payment creation failed: {response.text}"
        data = response.json()
        print(f"✓ Stripe payment created: {data.get('checkout_url', 'URL generated')[:50]}...")


# Run tests directly if executed as script
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
