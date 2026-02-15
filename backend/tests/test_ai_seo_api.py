"""
Test AI SEO API endpoints
Tests AI-powered SEO generation for classifieds marketplace
"""

import pytest
import requests
import os

# Get base URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://marketplace-hub-264.preview.emergentagent.com')
ADMIN_BASE_URL = f"{BASE_URL}/api/admin"
MAIN_API_URL = f"{BASE_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@marketplace.com"
ADMIN_PASSWORD = "password123"


class TestAdminAuth:
    """Test admin authentication for AI SEO endpoints"""
    
    def test_admin_login(self, api_client):
        """Test admin login returns JWT token"""
        response = api_client.post(f"{ADMIN_BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["access_token"], "access_token is empty"
        print(f"Admin login successful, got token")


class TestAISeoStats:
    """Test AI SEO stats endpoint"""
    
    def test_get_ai_seo_stats_authenticated(self, admin_client):
        """GET /api/ai-seo/stats - should return stats with admin JWT"""
        response = admin_client.get(f"{MAIN_API_URL}/ai-seo/stats")
        
        assert response.status_code == 200, f"Stats request failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total_generations" in data, "Missing total_generations field"
        assert "total_applied" in data, "Missing total_applied field"
        assert "last_24h_generations" in data, "Missing last_24h_generations field"
        assert "listings_with_ai_seo" in data, "Missing listings_with_ai_seo field"
        
        # Verify types
        assert isinstance(data["total_generations"], int), "total_generations should be int"
        assert isinstance(data["total_applied"], int), "total_applied should be int"
        
        print(f"AI SEO stats: generations={data['total_generations']}, applied={data['total_applied']}")
    
    def test_get_ai_seo_stats_unauthenticated(self, api_client):
        """GET /api/ai-seo/stats - should fail without auth"""
        response = api_client.get(f"{MAIN_API_URL}/ai-seo/stats")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("Correctly rejected unauthenticated request")


class TestAISeoGeneration:
    """Test AI SEO generation endpoints"""
    
    def test_generate_seo_for_listing_data(self, admin_client):
        """POST /api/ai-seo/generate - generate SEO from listing data"""
        payload = {
            "title": "iPhone 15 Pro Max 256GB",
            "description": "Brand new sealed iPhone 15 Pro Max. Never opened, comes with warranty.",
            "price": 1200.0,
            "currency": "EUR",
            "category": "Electronics",
            "condition": "new",
            "location": "Dar es Salaam, Tanzania"
        }
        
        response = admin_client.post(f"{MAIN_API_URL}/ai-seo/generate", json=payload)
        
        assert response.status_code == 200, f"Generation failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Response should have success: true"
        assert "seo_suggestions" in data, "Missing seo_suggestions field"
        
        suggestions = data["seo_suggestions"]
        assert "meta_title" in suggestions, "Missing meta_title in suggestions"
        assert "meta_description" in suggestions, "Missing meta_description in suggestions"
        assert "keywords" in suggestions, "Missing keywords in suggestions"
        
        # Verify content quality
        assert len(suggestions["meta_title"]) > 20, "meta_title too short"
        assert len(suggestions["meta_description"]) > 50, "meta_description too short"
        assert isinstance(suggestions["keywords"], list), "keywords should be a list"
        
        print(f"Generated SEO - Title: {suggestions['meta_title'][:50]}...")
        print(f"Keywords: {suggestions['keywords'][:5]}")
    
    def test_generate_seo_missing_required_fields(self, admin_client):
        """POST /api/ai-seo/generate - should validate required fields"""
        # Missing price and title
        payload = {
            "description": "Test description",
            "currency": "EUR"
        }
        
        response = admin_client.post(f"{MAIN_API_URL}/ai-seo/generate", json=payload)
        
        # Should return 422 (validation error) or 400
        assert response.status_code in [400, 422], f"Expected validation error, got {response.status_code}"
        print("Correctly rejected missing required fields")
    
    def test_generate_seo_unauthenticated(self, api_client):
        """POST /api/ai-seo/generate - should require auth"""
        payload = {
            "title": "Test Product",
            "description": "Test description",
            "price": 100.0
        }
        
        response = api_client.post(f"{MAIN_API_URL}/ai-seo/generate", json=payload)
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Correctly required authentication")


class TestAISeoHistory:
    """Test AI SEO history endpoints"""
    
    def test_get_seo_history_for_listing(self, admin_client, test_listing_id):
        """GET /api/ai-seo/history/{listing_id} - get generation history"""
        if not test_listing_id:
            pytest.skip("No test listing available")
        
        response = admin_client.get(f"{MAIN_API_URL}/ai-seo/history/{test_listing_id}")
        
        assert response.status_code == 200, f"History request failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "listing_id" in data, "Missing listing_id field"
        assert "history" in data, "Missing history field"
        assert isinstance(data["history"], list), "history should be a list"
        
        print(f"History for listing {test_listing_id}: {len(data['history'])} entries")
    
    def test_get_seo_history_nonexistent_listing(self, admin_client):
        """GET /api/ai-seo/history/{listing_id} - nonexistent listing should return empty history"""
        fake_id = "nonexistent-listing-id-12345"
        
        response = admin_client.get(f"{MAIN_API_URL}/ai-seo/history/{fake_id}")
        
        # Should return 200 with empty history, not 404
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("history") == [], "Should return empty history for nonexistent listing"
        print("Correctly returned empty history for nonexistent listing")


class TestAISeoApply:
    """Test applying AI-generated SEO to listings"""
    
    def test_apply_ai_seo_to_listing(self, admin_client, test_listing_id):
        """POST /api/ai-seo/apply/{listing_id} - apply SEO to listing"""
        if not test_listing_id:
            pytest.skip("No test listing available")
        
        payload = {
            "listing_id": test_listing_id,
            "meta_title": "TEST - iPhone 15 Pro Max | Best Price | Dar es Salaam",
            "meta_description": "TEST - Buy iPhone 15 Pro Max at the best price in Dar es Salaam. Brand new, sealed box with warranty. Free delivery available.",
            "og_title": "iPhone 15 Pro Max - Great Deal!",
            "og_description": "Brand new iPhone at an amazing price. Limited stock!",
            "keywords": ["iphone", "smartphone", "electronics", "dar es salaam", "best price"]
        }
        
        response = admin_client.post(f"{MAIN_API_URL}/ai-seo/apply/{test_listing_id}", json=payload)
        
        assert response.status_code == 200, f"Apply SEO failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Response should have success: true"
        assert "seo_data" in data, "Missing seo_data field"
        
        seo_data = data["seo_data"]
        assert seo_data["meta_title"] == payload["meta_title"], "meta_title not saved correctly"
        assert seo_data.get("ai_generated") == True, "ai_generated should be True"
        
        print(f"Successfully applied AI SEO to listing {test_listing_id}")
    
    def test_apply_ai_seo_listing_mismatch(self, admin_client, test_listing_id):
        """POST /api/ai-seo/apply/{listing_id} - listing ID mismatch should fail"""
        if not test_listing_id:
            pytest.skip("No test listing available")
        
        # Mismatched listing IDs
        payload = {
            "listing_id": "different-listing-id",
            "meta_title": "Test Title",
            "meta_description": "Test Description"
        }
        
        response = admin_client.post(f"{MAIN_API_URL}/ai-seo/apply/{test_listing_id}", json=payload)
        
        assert response.status_code == 400, f"Expected 400 for ID mismatch, got {response.status_code}"
        print("Correctly rejected mismatched listing IDs")
    
    def test_apply_ai_seo_nonexistent_listing(self, admin_client):
        """POST /api/ai-seo/apply/{listing_id} - nonexistent listing should fail"""
        fake_id = "nonexistent-listing-id-12345"
        
        payload = {
            "listing_id": fake_id,
            "meta_title": "Test Title",
            "meta_description": "Test Description"
        }
        
        response = admin_client.post(f"{MAIN_API_URL}/ai-seo/apply/{fake_id}", json=payload)
        
        assert response.status_code == 404, f"Expected 404 for nonexistent listing, got {response.status_code}"
        print("Correctly returned 404 for nonexistent listing")


class TestAISeoGenerateForListing:
    """Test generating SEO for existing listings"""
    
    def test_generate_seo_for_existing_listing(self, admin_client, test_listing_id):
        """POST /api/ai-seo/generate-for-listing/{listing_id}"""
        if not test_listing_id:
            pytest.skip("No test listing available")
        
        response = admin_client.post(f"{MAIN_API_URL}/ai-seo/generate-for-listing/{test_listing_id}")
        
        assert response.status_code == 200, f"Generation failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Response should have success: true"
        assert "listing_id" in data, "Missing listing_id field"
        assert "ai_suggestions" in data, "Missing ai_suggestions field"
        
        suggestions = data["ai_suggestions"]
        assert "meta_title" in suggestions, "Missing meta_title in suggestions"
        assert "meta_description" in suggestions, "Missing meta_description in suggestions"
        
        print(f"Generated SEO for listing {test_listing_id}")
        print(f"Title: {suggestions['meta_title']}")
    
    def test_generate_seo_nonexistent_listing(self, admin_client):
        """POST /api/ai-seo/generate-for-listing/{listing_id} - nonexistent listing should fail"""
        fake_id = "nonexistent-listing-id-12345"
        
        response = admin_client.post(f"{MAIN_API_URL}/ai-seo/generate-for-listing/{fake_id}")
        
        assert response.status_code == 404, f"Expected 404 for nonexistent listing, got {response.status_code}"
        print("Correctly returned 404 for nonexistent listing")


class TestAISeoCategorySeo:
    """Test category SEO generation"""
    
    def test_generate_category_seo(self, admin_client):
        """POST /api/ai-seo/generate-category - generate SEO for category"""
        payload = {
            "category_name": "Electronics",
            "category_id": "electronics",
            "listing_count": 150
        }
        
        response = admin_client.post(f"{MAIN_API_URL}/ai-seo/generate-category", json=payload)
        
        assert response.status_code == 200, f"Category SEO generation failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Response should have success: true"
        assert "seo_suggestions" in data, "Missing seo_suggestions field"
        
        suggestions = data["seo_suggestions"]
        assert "meta_title" in suggestions, "Missing meta_title in suggestions"
        assert "meta_description" in suggestions, "Missing meta_description in suggestions"
        
        print(f"Generated category SEO: {suggestions['meta_title']}")


# Fixtures
@pytest.fixture(scope="function")
def api_client():
    """Fresh requests session without auth for each test"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token():
    """Get admin JWT token"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(f"{ADMIN_BASE_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code != 200:
        print(f"Admin login failed: {response.status_code} - {response.text}")
        pytest.skip("Admin login failed - skipping authenticated tests")
        return None
    
    data = response.json()
    token = data.get("access_token")
    print(f"Got admin token: {token[:20]}..." if token else "No token received")
    return token


@pytest.fixture(scope="function")
def admin_client(admin_token):
    """Session with admin auth header - fresh for each test"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    if admin_token:
        session.headers.update({"Authorization": f"Bearer {admin_token}"})
    return session


@pytest.fixture(scope="module")
def test_listing_id(admin_token):
    """Get a test listing ID for testing"""
    try:
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {admin_token}"
        })
        
        # Try main API listings first
        response = session.get(f"{MAIN_API_URL}/listings?limit=1")
        if response.status_code == 200:
            data = response.json()
            listings = data.get("listings", [])
            if listings:
                listing_id = listings[0].get("id")
                print(f"Using test listing: {listing_id}")
                return listing_id
    except Exception as e:
        print(f"Failed to get test listing: {e}")
    
    print("No test listing available")
    return None
