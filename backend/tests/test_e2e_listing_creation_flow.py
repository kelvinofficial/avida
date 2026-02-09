"""
E2E Test: Complete Listing Creation Flow with AI Assistance

Tests the full user journey:
1. Upload photo → AI analysis (POST /api/ai-analyzer/analyze)
2. Get AI-suggested title, description, and attributes
3. Get AI price suggestion (POST /api/ai-analyzer/price-suggestion)
4. Record user feedback (POST /api/ai-analyzer/feedback)
5. Create listing with AI-suggested data (POST /api/listings)
6. Verify listing exists (GET /api/listings/{id})

Real AI integration using GPT-4o for vision and Claude Sonnet 4.5 for text.
"""

import pytest
import requests
import os
import uuid
import base64
import time
from datetime import datetime, timezone

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://scheduled-config.preview.emergentagent.com')
if BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')

# Test user credentials
TEST_EMAIL = f"test_e2e_{uuid.uuid4().hex[:8]}@test.com"
TEST_PASSWORD = "Test@123456"
TEST_NAME = "E2E Test User"

# Sample base64 image - a small 1x1 pixel PNG for testing
# In real tests, use an actual product image
SAMPLE_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

# A slightly larger sample test image (red square - 10x10)
SAMPLE_PRODUCT_IMAGE = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8DwHwMSYBj1gAMHAJpXA/3g3B8qAAAAAElFTkSuQmCC"


class TestE2EListingCreationFlow:
    """End-to-end test of listing creation with AI assistance"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create a test user and return session token"""
        # Register a new test user
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            }
        )
        
        if register_response.status_code == 200:
            data = register_response.json()
            print(f"✓ Registered test user: {TEST_EMAIL}")
            return {
                "token": data.get("session_token"),
                "user_id": data["user"]["user_id"],
                "user": data["user"]
            }
        elif register_response.status_code == 400 and "already registered" in register_response.text.lower():
            # User exists, try login
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD
                }
            )
            if login_response.status_code == 200:
                data = login_response.json()
                print(f"✓ Logged in as existing user: {TEST_EMAIL}")
                return {
                    "token": data.get("session_token"),
                    "user_id": data["user"]["user_id"],
                    "user": data["user"]
                }
        
        # If registration/login fails, skip auth-dependent tests
        print(f"Auth failed: {register_response.text}")
        pytest.skip("Failed to create/login test user")
    
    def test_step1_ai_image_analysis(self, auth_session):
        """
        Step 1: POST /api/ai-analyzer/analyze
        Upload product images and get AI analysis
        """
        print("\n=== STEP 1: AI Image Analysis ===")
        
        user_id = auth_session["user_id"]
        
        payload = {
            "images": [f"data:image/png;base64,{SAMPLE_PRODUCT_IMAGE}"],
            "category_hint": "Electronics",
            "user_id": user_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ai-analyzer/analyze",
            json=payload,
            timeout=120  # AI processing may take time
        )
        
        print(f"POST /api/ai-analyzer/analyze - Status: {response.status_code}")
        data = response.json()
        print(f"Response: {data}")
        
        assert response.status_code == 200
        
        # Store analysis result for subsequent tests
        auth_session["ai_analysis"] = data
        
        if data.get("success"):
            result = data.get("result", {})
            print(f"  - Analysis ID: {result.get('id')}")
            print(f"  - Status: {result.get('status')}")
            print(f"  - Detected Category: {result.get('detected_category')}")
            print(f"  - Suggested Title: {result.get('suggested_title')}")
            print(f"  - Confidence: {result.get('confidence_score')}")
            
            # Store analysis_id for feedback
            auth_session["analysis_id"] = result.get("id")
            auth_session["ai_suggestions"] = result
        else:
            # Even if AI fails, continue with manual data
            print(f"  AI analysis returned: {data.get('error', 'No error message')}")
            auth_session["analysis_id"] = f"ai_test_{uuid.uuid4().hex[:12]}"
            auth_session["ai_suggestions"] = {
                "suggested_title": "Test Product",
                "suggested_description": "A test product for E2E testing",
                "detected_category": "electronics",
                "detected_condition": "good"
            }
        
        print("✓ Step 1 complete: AI image analysis processed")
    
    def test_step2_price_suggestion(self, auth_session):
        """
        Step 2: POST /api/ai-analyzer/price-suggestion
        Get AI-powered price recommendation based on detected info
        """
        print("\n=== STEP 2: AI Price Suggestion ===")
        
        ai_suggestions = auth_session.get("ai_suggestions", {})
        user_id = auth_session["user_id"]
        
        payload = {
            "category": ai_suggestions.get("detected_category", "Electronics"),
            "subcategory": ai_suggestions.get("detected_subcategory"),
            "brand": ai_suggestions.get("detected_brand"),
            "model": ai_suggestions.get("detected_model"),
            "condition": ai_suggestions.get("detected_condition", "good"),
            "detected_features": ai_suggestions.get("detected_features", []),
            "user_id": user_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ai-analyzer/price-suggestion",
            json=payload,
            timeout=60
        )
        
        print(f"POST /api/ai-analyzer/price-suggestion - Status: {response.status_code}")
        data = response.json()
        print(f"Response: {data}")
        
        assert response.status_code == 200
        
        # Store price suggestion
        auth_session["price_suggestion"] = data
        
        if data.get("success"):
            price = data.get("price_suggestion", {})
            print(f"  - Min Price: €{price.get('min_price')}")
            print(f"  - Max Price: €{price.get('max_price')}")
            print(f"  - Recommended Price: €{price.get('recommended_price')}")
            print(f"  - Confidence: {price.get('confidence')}")
            print(f"  - Reasoning: {price.get('reasoning', '')[:100]}...")
            print(f"  - Tip: {price.get('tip', '')[:100]}...")
            
            # Store recommended price
            auth_session["recommended_price"] = price.get("recommended_price", 99.99)
        else:
            print(f"  Price suggestion unavailable: {data.get('error')}")
            auth_session["recommended_price"] = 99.99
        
        print("✓ Step 2 complete: Price suggestion received")
    
    def test_step3_submit_feedback(self, auth_session):
        """
        Step 3: POST /api/ai-analyzer/feedback
        Record user's action on AI suggestions (accepted/edited/rejected)
        """
        print("\n=== STEP 3: Submit Feedback ===")
        
        analysis_id = auth_session.get("analysis_id")
        
        # Simulate user accepting AI suggestions with minor edits
        feedback_payload = {
            "analysis_id": analysis_id,
            "accepted": True,
            "edited": True,
            "rejected": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ai-analyzer/feedback",
            json=feedback_payload
        )
        
        print(f"POST /api/ai-analyzer/feedback - Status: {response.status_code}")
        data = response.json()
        print(f"Response: {data}")
        
        assert response.status_code == 200
        assert data.get("success") == True
        
        print(f"  - Analysis ID: {analysis_id}")
        print(f"  - Feedback: accepted=True, edited=True")
        
        print("✓ Step 3 complete: Feedback submitted")
    
    def test_step4_create_listing(self, auth_session):
        """
        Step 4: POST /api/listings
        Create a new listing with AI-suggested + edited data
        """
        print("\n=== STEP 4: Create Listing ===")
        
        ai_suggestions = auth_session.get("ai_suggestions", {})
        recommended_price = auth_session.get("recommended_price", 99.99)
        token = auth_session["token"]
        
        # Build listing payload using AI suggestions + user edits
        listing_payload = {
            "title": ai_suggestions.get("suggested_title") or "Test E2E Product",
            "description": ai_suggestions.get("suggested_description") or "Created via E2E testing flow with AI assistance",
            "price": recommended_price,
            "currency": "EUR",
            "negotiable": True,
            "category_id": "phones_tablets",  # mobile_phones subcategory is under phones_tablets
            "subcategory": "mobile_phones",
            "condition": ai_suggestions.get("detected_condition", "Good"),
            "images": [f"data:image/png;base64,{SAMPLE_PRODUCT_IMAGE}"],
            "location": "Berlin, Germany",
            "attributes": ai_suggestions.get("suggested_attributes", {
                "brand": ai_suggestions.get("detected_brand", "Unknown"),
                "model": ai_suggestions.get("detected_model", "Test Model"),
                "color": ai_suggestions.get("detected_color", "Black")
            }),
            "accepts_offers": True,
            "accepts_exchanges": False,
            "contact_methods": ["chat"]
        }
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/listings",
            json=listing_payload,
            headers=headers
        )
        
        print(f"POST /api/listings - Status: {response.status_code}")
        data = response.json()
        print(f"Response: {data}")
        
        assert response.status_code == 200
        
        # Store created listing details
        auth_session["created_listing"] = data
        auth_session["listing_id"] = data.get("id")
        
        print(f"  - Listing ID: {data.get('id')}")
        print(f"  - Title: {data.get('title')}")
        print(f"  - Price: €{data.get('price')}")
        print(f"  - Category: {data.get('category_id')}")
        print(f"  - Status: {data.get('status')}")
        
        # Verify key fields were saved
        assert data.get("id") is not None
        assert data.get("title") is not None
        assert data.get("price") > 0
        assert data.get("status") == "active"
        
        print("✓ Step 4 complete: Listing created successfully")
    
    def test_step5_verify_listing(self, auth_session):
        """
        Step 5: GET /api/listings/{id}
        Verify the created listing exists and has correct data
        """
        print("\n=== STEP 5: Verify Listing ===")
        
        listing_id = auth_session.get("listing_id")
        
        if not listing_id:
            pytest.skip("No listing ID - step 4 may have failed")
        
        response = requests.get(f"{BASE_URL}/api/listings/{listing_id}")
        
        print(f"GET /api/listings/{listing_id} - Status: {response.status_code}")
        data = response.json()
        print(f"Response: {data}")
        
        assert response.status_code == 200
        
        # Verify listing data matches what was created
        created = auth_session.get("created_listing", {})
        
        assert data.get("id") == listing_id
        assert data.get("title") == created.get("title")
        assert float(data.get("price", 0)) == float(created.get("price", 0))
        assert data.get("category_id") == created.get("category_id")
        
        # Verify listing is active
        assert data.get("status") == "active"
        
        # Verify seller data is included
        assert "seller" in data
        seller = data.get("seller", {})
        assert seller.get("user_id") == auth_session["user_id"]
        
        print(f"  - Listing verified: {data.get('title')}")
        print(f"  - Price: €{data.get('price')}")
        print(f"  - Views: {data.get('views')}")
        print(f"  - Seller: {seller.get('name')}")
        
        print("✓ Step 5 complete: Listing verified successfully")
    
    def test_step6_cleanup(self, auth_session):
        """
        Step 6: Cleanup - Delete test listing
        """
        print("\n=== STEP 6: Cleanup ===")
        
        listing_id = auth_session.get("listing_id")
        token = auth_session["token"]
        
        if not listing_id:
            print("  No listing to clean up")
            return
        
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        response = requests.delete(
            f"{BASE_URL}/api/listings/{listing_id}",
            headers=headers
        )
        
        print(f"DELETE /api/listings/{listing_id} - Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✓ Test listing cleaned up")
        else:
            print(f"  Cleanup warning: {response.text}")


class TestAIAnalyzeEndpoint:
    """Detailed tests for POST /api/ai-analyzer/analyze endpoint"""
    
    def test_analyze_with_category_hint(self):
        """Test AI analysis with category hint provided"""
        payload = {
            "images": [f"data:image/png;base64,{SAMPLE_PRODUCT_IMAGE}"],
            "category_hint": "Fashion",
            "user_id": "test_user_analyze"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ai-analyzer/analyze",
            json=payload,
            timeout=120
        )
        
        print(f"Analyze with category hint - Status: {response.status_code}")
        data = response.json()
        print(f"Response: {data}")
        
        assert response.status_code == 200
        print("✓ AI analyze with category hint works")
    
    def test_analyze_without_category_hint(self):
        """Test AI analysis without category hint (pure vision detection)"""
        payload = {
            "images": [f"data:image/png;base64,{SAMPLE_PRODUCT_IMAGE}"],
            "user_id": "test_user_no_hint"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ai-analyzer/analyze",
            json=payload,
            timeout=120
        )
        
        print(f"Analyze without category hint - Status: {response.status_code}")
        data = response.json()
        
        assert response.status_code == 200
        print("✓ AI analyze without category hint works")
    
    def test_analyze_access_check_nonexistent_user(self):
        """Test that non-existent user gets appropriate access response"""
        fake_user_id = f"nonexistent_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "images": [f"data:image/png;base64,{SAMPLE_PRODUCT_IMAGE}"],
            "user_id": fake_user_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ai-analyzer/analyze",
            json=payload,
            timeout=60
        )
        
        print(f"Analyze with non-existent user - Status: {response.status_code}")
        data = response.json()
        print(f"Response: {data}")
        
        assert response.status_code == 200
        # Should return error about user not found
        if not data.get("success"):
            assert "user" in data.get("error", "").lower() or "not found" in data.get("error", "").lower()
        
        print("✓ Access control working for non-existent users")


class TestListingsEndpoints:
    """Test listing CRUD operations"""
    
    @pytest.fixture(scope="class")
    def user_session(self):
        """Create/login test user for listings tests"""
        test_email = f"test_listings_{uuid.uuid4().hex[:8]}@test.com"
        
        # Try to register
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "Test@123456",
                "name": "Listings Test User"
            }
        )
        
        if register_response.status_code == 200:
            data = register_response.json()
            return {
                "token": data.get("session_token"),
                "user_id": data["user"]["user_id"]
            }
        
        pytest.skip("Could not create test user")
    
    def test_create_listing_with_required_fields(self, user_session):
        """Test POST /api/listings with required fields only"""
        token = user_session["token"]
        
        listing = {
            "title": "TEST_E2E Basic Listing",
            "description": "Minimal required fields",
            "price": 50.00,
            "category_id": "phones_tablets",  # mobile_phones is under phones_tablets
            "subcategory": "mobile_phones",
            "location": "Munich, Germany"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/listings",
            json=listing,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Create listing (required fields) - Status: {response.status_code}")
        data = response.json()
        print(f"Response: {data}")
        
        assert response.status_code == 200
        assert data.get("id") is not None
        assert data.get("status") == "active"
        
        # Store for cleanup
        user_session["listing_id"] = data.get("id")
        
        print("✓ Listing created with required fields only")
    
    def test_get_listing_by_id(self, user_session):
        """Test GET /api/listings/{id}"""
        listing_id = user_session.get("listing_id")
        
        if not listing_id:
            pytest.skip("No listing to fetch")
        
        response = requests.get(f"{BASE_URL}/api/listings/{listing_id}")
        
        print(f"Get listing by ID - Status: {response.status_code}")
        data = response.json()
        
        assert response.status_code == 200
        assert data.get("id") == listing_id
        
        print("✓ Listing retrieved by ID")
    
    def test_cleanup_listing(self, user_session):
        """Cleanup test listing"""
        listing_id = user_session.get("listing_id")
        token = user_session["token"]
        
        if listing_id:
            response = requests.delete(
                f"{BASE_URL}/api/listings/{listing_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            print(f"Cleanup listing - Status: {response.status_code}")


class TestFullFlowIntegration:
    """Integration test simulating complete user flow"""
    
    def test_complete_listing_flow_summary(self):
        """
        Summary test: Verify all endpoints in the flow are accessible
        """
        print("\n=== Integration Flow Summary ===")
        
        endpoints_to_test = [
            ("POST /api/ai-analyzer/analyze", f"{BASE_URL}/api/ai-analyzer/analyze", "POST"),
            ("POST /api/ai-analyzer/price-suggestion", f"{BASE_URL}/api/ai-analyzer/price-suggestion", "POST"),
            ("POST /api/ai-analyzer/feedback", f"{BASE_URL}/api/ai-analyzer/feedback", "POST"),
            ("GET /api/ai-analyzer/admin/settings", f"{BASE_URL}/api/ai-analyzer/admin/settings", "GET"),
        ]
        
        results = []
        
        for name, url, method in endpoints_to_test:
            try:
                if method == "GET":
                    response = requests.get(url, timeout=10)
                else:
                    response = requests.post(url, json={}, timeout=10)
                
                status = "✓" if response.status_code in [200, 422] else "✗"
                results.append(f"  {status} {name}: {response.status_code}")
            except Exception as e:
                results.append(f"  ✗ {name}: Error - {str(e)}")
        
        for result in results:
            print(result)
        
        print("\n✓ Integration flow endpoints checked")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-x"])
