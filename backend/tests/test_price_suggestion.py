"""
Test AI-powered Price Suggestion API
Tests the price suggestion feature:
- POST /api/ai-analyzer/price-suggestion - Returns price suggestion with min, max, recommended prices
- Price suggestion includes reasoning and tip
- Price suggestion works even without market data (AI fallback)
- Price suggestions respect admin enable/disable toggle
- GET /api/ai-analyzer/admin/settings shows enable_price_suggestions status
"""

import pytest
import requests
import os

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://classified-ai-tools.preview.emergentagent.com')
if BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')


class TestPriceSuggestionAPI:
    """Test price suggestion endpoint functionality"""

    @pytest.fixture(autouse=True)
    def ensure_price_suggestions_enabled(self):
        """Ensure price suggestions are enabled before each test"""
        # Enable price suggestions
        response = requests.put(
            f"{BASE_URL}/api/ai-analyzer/admin/settings",
            json={
                "updates": {"enable_price_suggestions": True},
                "admin_id": "test_admin"
            }
        )
        assert response.status_code == 200
        yield
        # Cleanup - ensure enabled after tests
        requests.put(
            f"{BASE_URL}/api/ai-analyzer/admin/settings",
            json={
                "updates": {"enable_price_suggestions": True},
                "admin_id": "test_admin"
            }
        )

    def test_price_suggestion_with_full_details(self):
        """Test POST /api/ai-analyzer/price-suggestion with complete product details"""
        payload = {
            "category": "Electronics",
            "subcategory": "Phones",
            "brand": "Samsung",
            "model": "Galaxy S21",
            "condition": "good",
            "detected_features": ["128GB", "5G"],
            "user_id": "test_user_123"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ai-analyzer/price-suggestion",
            json=payload,
            timeout=60
        )
        print(f"POST /api/ai-analyzer/price-suggestion (full details) - Status: {response.status_code}")
        data = response.json()
        print(f"Response: {data}")
        
        # Verify success
        assert response.status_code == 200
        assert data.get("success") == True
        
        # Verify price_suggestion structure
        price_suggestion = data.get("price_suggestion")
        assert price_suggestion is not None
        
        # Verify required fields exist
        assert "min_price" in price_suggestion
        assert "max_price" in price_suggestion
        assert "recommended_price" in price_suggestion
        assert "currency" in price_suggestion
        assert "confidence" in price_suggestion
        assert "reasoning" in price_suggestion
        assert "tip" in price_suggestion
        assert "based_on_listings" in price_suggestion
        
        # Verify data types
        assert isinstance(price_suggestion["min_price"], (int, float))
        assert isinstance(price_suggestion["max_price"], (int, float))
        assert isinstance(price_suggestion["recommended_price"], (int, float))
        assert isinstance(price_suggestion["currency"], str)
        assert isinstance(price_suggestion["reasoning"], str)
        assert isinstance(price_suggestion["tip"], str)
        
        # Verify price logic: min <= recommended <= max
        assert price_suggestion["min_price"] <= price_suggestion["recommended_price"]
        assert price_suggestion["recommended_price"] <= price_suggestion["max_price"]
        
        # Verify market data structure
        assert "market_data" in data
        assert "similar_listings_count" in data
        
        print("✓ Price suggestion with full details returns all required fields")

    def test_price_suggestion_with_minimal_details(self):
        """Test price suggestion works with minimal input (AI fallback)"""
        payload = {
            "category": "Fashion",
            "brand": "Nike"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ai-analyzer/price-suggestion",
            json=payload,
            timeout=60
        )
        print(f"POST /api/ai-analyzer/price-suggestion (minimal) - Status: {response.status_code}")
        data = response.json()
        print(f"Response: {data}")
        
        assert response.status_code == 200
        assert data.get("success") == True
        
        price_suggestion = data.get("price_suggestion")
        assert price_suggestion is not None
        
        # Should still have all required fields
        assert "min_price" in price_suggestion
        assert "max_price" in price_suggestion
        assert "recommended_price" in price_suggestion
        assert "reasoning" in price_suggestion
        assert "tip" in price_suggestion
        
        # AI should handle missing fields gracefully
        print("✓ Price suggestion works with minimal input (AI fallback)")

    def test_price_suggestion_includes_reasoning_and_tip(self):
        """Test that price suggestion includes meaningful reasoning and tip"""
        payload = {
            "category": "Electronics",
            "brand": "Apple",
            "model": "iPhone 12",
            "condition": "like_new"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ai-analyzer/price-suggestion",
            json=payload,
            timeout=60
        )
        print(f"POST /api/ai-analyzer/price-suggestion (reasoning/tip) - Status: {response.status_code}")
        data = response.json()
        
        assert response.status_code == 200
        assert data.get("success") == True
        
        price_suggestion = data.get("price_suggestion")
        
        # Verify reasoning is not empty and is meaningful
        reasoning = price_suggestion.get("reasoning", "")
        assert len(reasoning) > 10, "Reasoning should be meaningful and not empty"
        
        # Verify tip is not empty and is meaningful
        tip = price_suggestion.get("tip", "")
        assert len(tip) > 10, "Tip should be meaningful and not empty"
        
        print(f"Reasoning: {reasoning}")
        print(f"Tip: {tip}")
        print("✓ Price suggestion includes meaningful reasoning and tip")

    def test_price_suggestion_currency_default(self):
        """Test that price suggestion returns EUR as default currency"""
        payload = {
            "category": "Home",
            "brand": "IKEA"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ai-analyzer/price-suggestion",
            json=payload,
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        
        price_suggestion = data.get("price_suggestion")
        assert price_suggestion.get("currency") == "EUR"
        
        print("✓ Price suggestion defaults to EUR currency")

    def test_price_suggestion_based_on_listings_field(self):
        """Test that based_on_listings field is present"""
        payload = {
            "category": "Sports",
            "brand": "Adidas",
            "model": "Running Shoes"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ai-analyzer/price-suggestion",
            json=payload,
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        
        price_suggestion = data.get("price_suggestion")
        assert "based_on_listings" in price_suggestion
        assert isinstance(price_suggestion["based_on_listings"], int)
        
        # Also verify similar_listings_count in response
        assert "similar_listings_count" in data
        
        print("✓ based_on_listings field is present and valid")


class TestPriceSuggestionAdminToggle:
    """Test admin enable/disable toggle for price suggestions"""

    def test_verify_enable_price_suggestions_setting(self):
        """Test GET /api/ai-analyzer/admin/settings shows enable_price_suggestions"""
        response = requests.get(f"{BASE_URL}/api/ai-analyzer/admin/settings")
        print(f"GET /api/ai-analyzer/admin/settings - Status: {response.status_code}")
        data = response.json()
        
        assert response.status_code == 200
        assert "enable_price_suggestions" in data
        assert isinstance(data["enable_price_suggestions"], bool)
        
        print(f"enable_price_suggestions = {data['enable_price_suggestions']}")
        print("✓ Admin settings include enable_price_suggestions field")

    def test_price_suggestion_respects_disabled_setting(self):
        """Test that price suggestions are blocked when admin disables them"""
        # Step 1: Disable price suggestions
        disable_response = requests.put(
            f"{BASE_URL}/api/ai-analyzer/admin/settings",
            json={
                "updates": {"enable_price_suggestions": False},
                "admin_id": "test_admin"
            }
        )
        assert disable_response.status_code == 200
        print("Price suggestions disabled")
        
        # Step 2: Try to get price suggestion - should fail
        suggestion_response = requests.post(
            f"{BASE_URL}/api/ai-analyzer/price-suggestion",
            json={
                "category": "Electronics",
                "brand": "Samsung"
            },
            timeout=30
        )
        print(f"POST /api/ai-analyzer/price-suggestion (disabled) - Status: {suggestion_response.status_code}")
        data = suggestion_response.json()
        print(f"Response: {data}")
        
        assert suggestion_response.status_code == 200
        assert data.get("success") == False
        assert "disabled" in data.get("error", "").lower()
        
        # Step 3: Re-enable price suggestions
        enable_response = requests.put(
            f"{BASE_URL}/api/ai-analyzer/admin/settings",
            json={
                "updates": {"enable_price_suggestions": True},
                "admin_id": "test_admin"
            }
        )
        assert enable_response.status_code == 200
        print("Price suggestions re-enabled")
        
        # Step 4: Verify price suggestion now works
        enabled_response = requests.post(
            f"{BASE_URL}/api/ai-analyzer/price-suggestion",
            json={
                "category": "Electronics",
                "brand": "Samsung"
            },
            timeout=60
        )
        enabled_data = enabled_response.json()
        print(f"POST /api/ai-analyzer/price-suggestion (enabled) - Status: {enabled_response.status_code}")
        
        assert enabled_response.status_code == 200
        assert enabled_data.get("success") == True
        
        print("✓ Price suggestions respect admin enable/disable toggle")

    def test_admin_can_toggle_price_suggestions(self):
        """Test that admin can enable/disable price suggestions via settings"""
        # Disable
        response1 = requests.put(
            f"{BASE_URL}/api/ai-analyzer/admin/settings",
            json={
                "updates": {"enable_price_suggestions": False},
                "admin_id": "test_admin"
            }
        )
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1.get("enable_price_suggestions") == False
        
        # Enable
        response2 = requests.put(
            f"{BASE_URL}/api/ai-analyzer/admin/settings",
            json={
                "updates": {"enable_price_suggestions": True},
                "admin_id": "test_admin"
            }
        )
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2.get("enable_price_suggestions") == True
        
        print("✓ Admin can toggle price suggestions setting")


class TestPriceSuggestionMarketData:
    """Test market data handling in price suggestions"""

    def test_market_data_structure(self):
        """Test market_data field structure in price suggestion response"""
        payload = {
            "category": "Electronics",
            "brand": "Sony",
            "model": "PlayStation 5"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ai-analyzer/price-suggestion",
            json=payload,
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        market_data = data.get("market_data")
        assert market_data is not None
        
        # Verify market_data structure
        expected_fields = ["count", "min_price", "max_price", "avg_price", "median_price", "sold_count", "active_count"]
        for field in expected_fields:
            assert field in market_data, f"market_data missing field: {field}"
        
        print("✓ Market data structure is complete")


class TestPriceSuggestionEdgeCases:
    """Test edge cases and error handling"""

    def test_price_suggestion_empty_body(self):
        """Test price suggestion with empty request body"""
        response = requests.post(
            f"{BASE_URL}/api/ai-analyzer/price-suggestion",
            json={},
            timeout=60
        )
        print(f"POST /api/ai-analyzer/price-suggestion (empty) - Status: {response.status_code}")
        
        # Should still return a response (AI handles it)
        assert response.status_code == 200
        data = response.json()
        # Should either succeed with generic suggestion or return appropriate error
        assert "success" in data
        
        print("✓ Empty body handled gracefully")

    def test_price_suggestion_with_various_conditions(self):
        """Test price suggestions handle different condition values"""
        conditions = ["new", "like_new", "good", "fair", "poor"]
        
        for condition in conditions:
            payload = {
                "category": "Electronics",
                "brand": "Dell",
                "model": "XPS 15",
                "condition": condition
            }
            
            response = requests.post(
                f"{BASE_URL}/api/ai-analyzer/price-suggestion",
                json=payload,
                timeout=60
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") == True
            print(f"  Condition '{condition}': recommended_price = {data['price_suggestion'].get('recommended_price')}")
        
        print("✓ All condition values handled correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
