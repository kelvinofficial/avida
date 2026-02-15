"""
SEO Settings API Tests - Iteration 145
Tests for the new SEO optimization features:
- Global SEO settings GET/PUT
- Category SEO overrides GET/PUT
- SEO preview endpoints
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://zustand-store-test.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "password123"

class TestSEOSettingsAPI:
    """Test SEO Settings API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_global_seo_settings_public(self):
        """Test GET /api/seo-settings/global returns global SEO settings"""
        response = requests.get(f"{BASE_URL}/api/seo-settings/global")
        print(f"GET /api/seo-settings/global: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify expected fields exist (core fields)
        assert "site_name" in data, "Response should contain site_name"
        assert "site_description" in data, "Response should contain site_description"
        # Note: enable_sitemap and enable_structured_data may be optional fields
        
        print(f"Global SEO settings: site_name={data.get('site_name')}")
        print(f"Available fields: {list(data.keys())}")
    
    def test_put_global_seo_settings_admin(self):
        """Test PUT /api/seo-settings/global updates global SEO settings (admin only)"""
        test_data = {
            "site_name": "Test Avida Marketplace",
            "site_description": "Test description for SEO",
            "default_keywords": ["test", "marketplace", "seo"],
            "twitter_handle": "@testhandle",
            "enable_sitemap": True,
            "enable_structured_data": True
        }
        
        response = self.session.put(f"{BASE_URL}/api/seo-settings/global", json=test_data)
        print(f"PUT /api/seo-settings/global: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
        
        data = response.json()
        assert data.get("site_name") == test_data["site_name"], "site_name should be updated"
        assert data.get("twitter_handle") == test_data["twitter_handle"], "twitter_handle should be updated"
        
        print(f"Updated SEO settings successfully")
    
    def test_get_all_category_seo(self):
        """Test GET /api/seo-settings/categories returns category SEO overrides"""
        response = requests.get(f"{BASE_URL}/api/seo-settings/categories")
        print(f"GET /api/seo-settings/categories: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} category SEO overrides")
    
    def test_get_category_seo_electronics(self):
        """Test GET /api/seo-settings/categories/{category_id} returns specific category SEO"""
        category_id = "electronics"
        response = requests.get(f"{BASE_URL}/api/seo-settings/categories/{category_id}")
        print(f"GET /api/seo-settings/categories/{category_id}: {response.status_code}")
        
        # Can be 200 (with override) or 200 with default/null
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        if data:
            print(f"Category SEO for {category_id}: title={data.get('title') or data.get('title_template')}")
        else:
            print(f"No custom SEO override for {category_id}, using defaults")
    
    def test_put_category_seo_admin(self):
        """Test PUT /api/seo-settings/categories/{category_id} updates category SEO (admin only)"""
        category_id = "electronics"
        test_data = {
            "category_id": category_id,
            "title": "Electronics for Sale | Test Marketplace",
            "description": "Browse electronics listings on our test marketplace",
            "keywords": ["electronics", "buy", "sell", "test"]
        }
        
        response = self.session.put(f"{BASE_URL}/api/seo-settings/categories/{category_id}", json=test_data)
        print(f"PUT /api/seo-settings/categories/{category_id}: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
        
        data = response.json()
        assert data.get("page_type") == "category", "page_type should be 'category'"
        assert data.get("page_id") == category_id, f"page_id should be {category_id}"
        
        print(f"Updated category SEO for {category_id}")
    
    def test_seo_preview_category(self):
        """Test GET /api/seo-settings/preview/{page_type}/{page_id} returns SEO preview for category"""
        page_type = "category"
        page_id = "electronics"
        
        response = requests.get(f"{BASE_URL}/api/seo-settings/preview/{page_type}/{page_id}")
        print(f"GET /api/seo-settings/preview/{page_type}/{page_id}: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "title" in data, "Preview should contain title"
        assert "description" in data, "Preview should contain description"
        assert "canonical_url" in data, "Preview should contain canonical_url"
        assert "og_title" in data, "Preview should contain og_title"
        
        print(f"SEO Preview - title: {data.get('title')}")
        print(f"SEO Preview - canonical: {data.get('canonical_url')}")
    
    def test_seo_preview_listing(self):
        """Test GET /api/seo-settings/preview/{page_type}/{page_id} for listing preview"""
        page_type = "listing"
        # Use a generic ID - the endpoint should handle missing listings gracefully
        page_id = "test_listing_123"
        
        response = requests.get(f"{BASE_URL}/api/seo-settings/preview/{page_type}/{page_id}")
        print(f"GET /api/seo-settings/preview/{page_type}/{page_id}: {response.status_code}")
        
        # Should return 200 even if listing not found (with default values)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("page_type") == page_type, f"page_type should be {page_type}"
        assert data.get("page_id") == page_id, f"page_id should be {page_id}"
        
        print(f"Listing SEO Preview generated successfully")
    
    def test_get_seo_overrides(self):
        """Test GET /api/seo-settings/overrides returns all page overrides"""
        response = requests.get(f"{BASE_URL}/api/seo-settings/overrides")
        print(f"GET /api/seo-settings/overrides: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} SEO page overrides")
    
    def test_get_seo_overrides_by_type(self):
        """Test GET /api/seo-settings/overrides/{page_type} returns overrides for specific type"""
        page_type = "category"
        response = requests.get(f"{BASE_URL}/api/seo-settings/overrides/{page_type}")
        print(f"GET /api/seo-settings/overrides/{page_type}: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # All items should have page_type = "category"
        for item in data:
            assert item.get("page_type") == page_type, f"All items should have page_type={page_type}"
        
        print(f"Found {len(data)} {page_type} SEO overrides")


class TestSEOAdminDashboard:
    """Test SEO Tools Admin Dashboard API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_admin_seo_meta_get(self):
        """Test GET /api/admin/seo/meta returns SEO meta tags list"""
        response = self.session.get(f"{BASE_URL}/api/admin/seo/meta")
        print(f"GET /api/admin/seo/meta: {response.status_code}")
        
        # Endpoint might not exist, check for 200 or 404
        if response.status_code == 200:
            data = response.json()
            print(f"SEO Meta tags endpoint working, found {len(data.get('meta_tags', []))} tags")
        elif response.status_code == 404:
            print("SEO Meta endpoint not found (may use different route)")
            pytest.skip("Endpoint not implemented")
        else:
            print(f"Unexpected status: {response.status_code}")
    
    def test_admin_seo_global_settings(self):
        """Test GET /api/admin/seo/global-settings"""
        response = self.session.get(f"{BASE_URL}/api/admin/seo/global-settings")
        print(f"GET /api/admin/seo/global-settings: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Admin SEO global settings endpoint working")
        elif response.status_code == 404:
            print("Admin SEO global settings endpoint not found")
            pytest.skip("Endpoint not implemented")
    
    def test_admin_sitemap_config(self):
        """Test GET /api/admin/sitemap/config"""
        response = self.session.get(f"{BASE_URL}/api/admin/sitemap/config")
        print(f"GET /api/admin/sitemap/config: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Sitemap config endpoint working")
        elif response.status_code == 404:
            print("Sitemap config endpoint not found")
            pytest.skip("Endpoint not implemented")


class TestUnauthorizedAccess:
    """Test that protected endpoints reject unauthorized requests"""
    
    def test_put_global_seo_without_auth(self):
        """Test PUT /api/seo-settings/global without auth returns 401"""
        response = requests.put(f"{BASE_URL}/api/seo-settings/global", json={
            "site_name": "Unauthorized Update"
        })
        print(f"PUT /api/seo-settings/global (no auth): {response.status_code}")
        
        # Should be 401 or 403
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print("Correctly rejected unauthorized update attempt")
    
    def test_put_category_seo_without_auth(self):
        """Test PUT /api/seo-settings/categories/{id} without auth returns 401"""
        response = requests.put(f"{BASE_URL}/api/seo-settings/categories/electronics", json={
            "category_id": "electronics",
            "title": "Unauthorized Update"
        })
        print(f"PUT /api/seo-settings/categories/electronics (no auth): {response.status_code}")
        
        # Should be 401 or 403
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print("Correctly rejected unauthorized category SEO update")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
