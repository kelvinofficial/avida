"""
Test Mobile Money Integration (M-Pesa, MTN) and Payment Provider API
Tests:
1. GET /api/boost/payment-providers - returns 4 payment methods
2. Credit/Debit Card and PayPal available, M-Pesa and MTN show 'Coming soon'
3. Mobile Money purchase endpoints return proper errors without FW_SECRET_KEY
4. Stripe and PayPal purchase endpoints still work
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPaymentProviders:
    """Test GET /api/boost/payment-providers endpoint"""
    
    def test_payment_providers_returns_four_methods(self):
        """Verify endpoint returns exactly 4 payment providers"""
        response = requests.get(f"{BASE_URL}/api/boost/payment-providers")
        assert response.status_code == 200
        
        providers = response.json()
        assert len(providers) == 4, f"Expected 4 providers, got {len(providers)}"
        
        # Verify all expected provider IDs are present
        provider_ids = [p['id'] for p in providers]
        assert 'stripe' in provider_ids, "Missing stripe provider"
        assert 'paypal' in provider_ids, "Missing paypal provider"
        assert 'mpesa' in provider_ids, "Missing mpesa provider"
        assert 'mtn' in provider_ids, "Missing mtn provider"
    
    def test_stripe_provider_is_available(self):
        """Verify Stripe (Credit/Debit Card) is available"""
        response = requests.get(f"{BASE_URL}/api/boost/payment-providers")
        assert response.status_code == 200
        
        providers = response.json()
        stripe = next((p for p in providers if p['id'] == 'stripe'), None)
        
        assert stripe is not None
        assert stripe['name'] == 'Credit/Debit Card'
        assert stripe['available'] == True
        assert stripe['requires_phone'] == False
        assert stripe['icon'] == 'card'
        assert 'Visa' in stripe['description'] or 'securely' in stripe['description']
    
    def test_paypal_provider_status(self):
        """Verify PayPal is available (when configured) or shows Coming Soon"""
        response = requests.get(f"{BASE_URL}/api/boost/payment-providers")
        assert response.status_code == 200
        
        providers = response.json()
        paypal = next((p for p in providers if p['id'] == 'paypal'), None)
        
        assert paypal is not None
        assert paypal['name'] == 'PayPal'
        assert paypal['icon'] == 'logo-paypal'
        assert paypal['requires_phone'] == False
        # PayPal is configured in this environment
        assert paypal['available'] == True
        assert 'PayPal account' in paypal['description']
    
    def test_mpesa_provider_coming_soon(self):
        """Verify M-Pesa shows 'Coming soon' without Flutterwave key"""
        response = requests.get(f"{BASE_URL}/api/boost/payment-providers")
        assert response.status_code == 200
        
        providers = response.json()
        mpesa = next((p for p in providers if p['id'] == 'mpesa'), None)
        
        assert mpesa is not None
        assert mpesa['name'] == 'M-Pesa'
        assert mpesa['available'] == False  # Not available without FW_SECRET_KEY
        assert mpesa['description'] == 'Coming soon'
        assert mpesa['requires_phone'] == True
        assert mpesa['country'] == 'KE'
        assert mpesa['currency'] == 'KES'
    
    def test_mtn_provider_coming_soon(self):
        """Verify MTN Mobile Money shows 'Coming soon' without Flutterwave key"""
        response = requests.get(f"{BASE_URL}/api/boost/payment-providers")
        assert response.status_code == 200
        
        providers = response.json()
        mtn = next((p for p in providers if p['id'] == 'mtn'), None)
        
        assert mtn is not None
        assert mtn['name'] == 'MTN Mobile Money'
        assert mtn['available'] == False  # Not available without FW_SECRET_KEY
        assert mtn['description'] == 'Coming soon'
        assert mtn['requires_phone'] == True
        assert 'MTN' in mtn['networks']
        assert 'VODAFONE' in mtn['networks']
        assert 'TIGO' in mtn['networks']
        assert 'GH' in mtn['countries']  # Ghana
        assert 'UG' in mtn['countries']  # Uganda
        assert 'ZM' in mtn['countries']  # Zambia


class TestMobileMoneyPurchase:
    """Test Mobile Money purchase endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user authentication"""
        # Login with test user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "paypaltest@test.com",
            "password": "test123"
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get('session_token')
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
        else:
            pytest.skip("Could not authenticate test user")
    
    def test_mpesa_purchase_returns_not_configured(self):
        """Verify M-Pesa purchase returns 'not configured' error without FW_SECRET_KEY"""
        response = requests.post(
            f"{BASE_URL}/api/boost/credits/purchase",
            headers=self.headers,
            json={
                "package_id": "pkg_starter",
                "origin_url": "https://test.example.com",
                "provider": "mpesa",
                "phone_number": "254712345678"
            }
        )
        
        # Should return 500 with 'not configured' message (520 is Cloudflare wrap for 500)
        assert response.status_code in [500, 520]
        data = response.json()
        assert 'not configured' in data.get('detail', '').lower() or 'FW_SECRET_KEY' in data.get('detail', '')
    
    def test_mtn_purchase_returns_not_configured(self):
        """Verify MTN Mobile Money purchase returns 'not configured' error without FW_SECRET_KEY"""
        response = requests.post(
            f"{BASE_URL}/api/boost/credits/purchase",
            headers=self.headers,
            json={
                "package_id": "pkg_starter",
                "origin_url": "https://test.example.com",
                "provider": "mtn",
                "phone_number": "233241234567",
                "mobile_network": "MTN"
            }
        )
        
        # Should return 500 with 'not configured' message (520 is Cloudflare wrap for 500)
        assert response.status_code in [500, 520]
        data = response.json()
        assert 'not configured' in data.get('detail', '').lower() or 'FW_SECRET_KEY' in data.get('detail', '')
    
    def test_mpesa_purchase_requires_phone_number(self):
        """Verify M-Pesa purchase requires phone number"""
        response = requests.post(
            f"{BASE_URL}/api/boost/credits/purchase",
            headers=self.headers,
            json={
                "package_id": "pkg_starter",
                "origin_url": "https://test.example.com",
                "provider": "mpesa"
                # No phone_number provided
            }
        )
        
        # Should return 400 or 500 with phone required message (520 is Cloudflare wrap)
        assert response.status_code in [400, 500, 520]
        data = response.json()
        # Either phone required or not configured (since no FW key)
        assert 'phone' in data.get('detail', '').lower() or 'configured' in data.get('detail', '').lower()


class TestStripePurchaseStillWorks:
    """Test that Stripe purchase still works after Mobile Money integration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user authentication"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "paypaltest@test.com",
            "password": "test123"
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get('session_token')
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
        else:
            pytest.skip("Could not authenticate test user")
    
    def test_stripe_purchase_returns_checkout_url(self):
        """Verify Stripe purchase returns checkout URL"""
        response = requests.post(
            f"{BASE_URL}/api/boost/credits/purchase",
            headers=self.headers,
            json={
                "package_id": "pkg_starter",
                "origin_url": "https://test.example.com",
                "provider": "stripe"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'checkout_url' in data
        assert 'session_id' in data
        assert data['provider'] == 'stripe'
        assert 'stripe.com' in data['checkout_url'] or 'checkout' in data['checkout_url'].lower()


class TestPayPalPurchaseStillWorks:
    """Test that PayPal purchase still works after Mobile Money integration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user authentication"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "paypaltest@test.com",
            "password": "test123"
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get('session_token')
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
        else:
            pytest.skip("Could not authenticate test user")
    
    def test_paypal_purchase_returns_checkout_url(self):
        """Verify PayPal purchase returns checkout/approval URL"""
        response = requests.post(
            f"{BASE_URL}/api/boost/credits/purchase",
            headers=self.headers,
            json={
                "package_id": "pkg_starter",
                "origin_url": "https://test.example.com",
                "provider": "paypal"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'checkout_url' in data
        assert 'order_id' in data or 'session_id' in data
        assert data['provider'] == 'paypal'
        assert 'paypal.com' in data['checkout_url']


class TestPackagesEndpoint:
    """Test that packages endpoint still works"""
    
    def test_packages_returns_credit_packages(self):
        """Verify packages endpoint returns credit packages"""
        response = requests.get(f"{BASE_URL}/api/boost/packages")
        assert response.status_code == 200
        
        packages = response.json()
        assert len(packages) >= 3, "Expected at least 3 packages"
        
        # Verify package structure
        for pkg in packages:
            assert 'id' in pkg
            assert 'name' in pkg
            assert 'price' in pkg
            assert 'credits' in pkg


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
