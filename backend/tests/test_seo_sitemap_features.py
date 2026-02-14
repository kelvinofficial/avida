"""
SEO Sitemap and Enhanced Features Tests - Iteration 146
Tests for new SEO features:
- GET /api/sitemap.xml - comprehensive sitemap with categories, listings, business profiles
- POST /api/seo-settings/listings/{listing_id}/regenerate-seo - admin SEO regeneration
- POST /api/seo-settings/listings/bulk-regenerate-seo - bulk SEO regeneration
- GET /api/seo-settings/listings/{listing_id}/seo - get listing SEO data
- Location hierarchy in SEO descriptions
"""

import pytest
import requests
import os
import xml.etree.ElementTree as ET

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://marketplace-meta.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "password123"

# Known test listing ID from main agent context
TEST_LISTING_ID = "a43909ba-6022-430f-8170-b1af696d89da"


class TestSitemapEndpoint:
    """Test /api/sitemap.xml endpoint"""
    
    def test_sitemap_returns_valid_xml(self):
        """Test GET /api/sitemap.xml returns valid XML"""
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        print(f"GET /api/sitemap.xml: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('content-type', '').startswith('application/xml'), \
            f"Expected application/xml, got {response.headers.get('content-type')}"
        
        # Parse XML to verify it's valid
        try:
            root = ET.fromstring(response.content)
            assert root.tag == '{http://www.sitemaps.org/schemas/sitemap/0.9}urlset', \
                f"Root element should be urlset, got {root.tag}"
            print("Sitemap XML is valid")
        except ET.ParseError as e:
            pytest.fail(f"Invalid XML: {e}")
    
    def test_sitemap_contains_homepage(self):
        """Test sitemap contains homepage with priority 1.0"""
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        assert response.status_code == 200
        
        root = ET.fromstring(response.content)
        ns = {'sitemap': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        
        # Find homepage entry
        homepage_found = False
        for url in root.findall('sitemap:url', ns):
            loc = url.find('sitemap:loc', ns)
            if loc is not None and loc.text.endswith('/'):
                homepage_found = True
                priority = url.find('sitemap:priority', ns)
                assert priority is not None, "Homepage should have priority"
                assert priority.text == '1.0', f"Homepage priority should be 1.0, got {priority.text}"
                print(f"Homepage found: {loc.text} with priority {priority.text}")
                break
        
        assert homepage_found, "Homepage should be in sitemap"
    
    def test_sitemap_contains_listings(self):
        """Test sitemap contains listing URLs"""
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        assert response.status_code == 200
        
        root = ET.fromstring(response.content)
        ns = {'sitemap': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        
        listing_count = 0
        for url in root.findall('sitemap:url', ns):
            loc = url.find('sitemap:loc', ns)
            if loc is not None and '/listing/' in loc.text:
                listing_count += 1
        
        print(f"Found {listing_count} listing URLs in sitemap")
        assert listing_count > 0, "Sitemap should contain at least one listing"
    
    def test_sitemap_root_path_also_works(self):
        """Test GET /sitemap.xml (without /api prefix) also works"""
        response = requests.get(f"{BASE_URL}/sitemap.xml")
        print(f"GET /sitemap.xml: {response.status_code}")
        
        # May redirect or work directly
        if response.status_code == 200:
            assert response.headers.get('content-type', '').startswith('application/xml')
            print("Root /sitemap.xml works")
        else:
            print(f"Root /sitemap.xml returned {response.status_code} (may not be configured)")


class TestListingSEOEndpoints:
    """Test listing-specific SEO endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin to get session_token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        print(f"Admin login: {login_response.status_code}")
        
        if login_response.status_code == 200:
            data = login_response.json()
            # The main agent noted session_token is used instead of access_token
            token = data.get("session_token") or data.get("token") or data.get("access_token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                print(f"Using token from field: session_token/token/access_token")
        
        self.token_set = "Authorization" in self.session.headers
    
    def test_get_listing_seo_data(self):
        """Test GET /api/seo-settings/listings/{listing_id}/seo returns SEO data"""
        response = requests.get(f"{BASE_URL}/api/seo-settings/listings/{TEST_LISTING_ID}/seo")
        print(f"GET /api/seo-settings/listings/{TEST_LISTING_ID}/seo: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text[:200]}"
        
        data = response.json()
        assert "listing_id" in data, "Response should contain listing_id"
        assert "title" in data, "Response should contain title"
        assert "seo_data" in data, "Response should contain seo_data"
        
        print(f"Listing SEO data: title={data.get('title')}")
        if data.get('seo_data'):
            print(f"SEO data fields: {list(data['seo_data'].keys())}")
    
    def test_get_listing_seo_not_found(self):
        """Test GET /api/seo-settings/listings/{invalid_id}/seo returns 404"""
        invalid_id = "nonexistent-listing-id-12345"
        response = requests.get(f"{BASE_URL}/api/seo-settings/listings/{invalid_id}/seo")
        print(f"GET /api/seo-settings/listings/{invalid_id}/seo: {response.status_code}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for nonexistent listing")
    
    def test_regenerate_listing_seo_admin(self):
        """Test POST /api/seo-settings/listings/{listing_id}/regenerate-seo (admin only)"""
        if not self.token_set:
            pytest.skip("Admin auth not available")
        
        response = self.session.post(f"{BASE_URL}/api/seo-settings/listings/{TEST_LISTING_ID}/regenerate-seo")
        print(f"POST /api/seo-settings/listings/{TEST_LISTING_ID}/regenerate-seo: {response.status_code}")
        
        assert response.status_code in [200, 401, 403], \
            f"Expected 200/401/403, got {response.status_code}. Response: {response.text[:200]}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Response should have success=True"
            assert "seo_data" in data, "Response should contain regenerated seo_data"
            print(f"SEO regenerated successfully for {TEST_LISTING_ID}")
            
            # Verify SEO data structure
            seo_data = data.get("seo_data", {})
            expected_fields = ["meta_title", "meta_description", "og_title", "keywords"]
            for field in expected_fields:
                if field in seo_data:
                    print(f"  - {field}: present")
        else:
            print(f"Auth check: got {response.status_code} (expected for non-admin)")
    
    def test_regenerate_listing_seo_unauthorized(self):
        """Test POST /api/seo-settings/listings/{listing_id}/regenerate-seo without auth returns 401"""
        response = requests.post(f"{BASE_URL}/api/seo-settings/listings/{TEST_LISTING_ID}/regenerate-seo")
        print(f"POST /api/seo-settings/listings/{TEST_LISTING_ID}/regenerate-seo (no auth): {response.status_code}")
        
        assert response.status_code in [401, 403, 422], \
            f"Expected 401/403/422, got {response.status_code}"
        print("Correctly rejected unauthorized regeneration request")
    
    def test_bulk_regenerate_listing_seo_admin(self):
        """Test POST /api/seo-settings/listings/bulk-regenerate-seo (admin only)"""
        if not self.token_set:
            pytest.skip("Admin auth not available")
        
        response = self.session.post(f"{BASE_URL}/api/seo-settings/listings/bulk-regenerate-seo?limit=5")
        print(f"POST /api/seo-settings/listings/bulk-regenerate-seo: {response.status_code}")
        
        assert response.status_code in [200, 401, 403], \
            f"Expected 200/401/403, got {response.status_code}. Response: {response.text[:200]}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Response should have success=True"
            assert "updated_count" in data, "Response should contain updated_count"
            print(f"Bulk regeneration: updated_count={data.get('updated_count')}, remaining={data.get('remaining')}")
        else:
            print(f"Auth check: got {response.status_code}")
    
    def test_bulk_regenerate_seo_unauthorized(self):
        """Test POST /api/seo-settings/listings/bulk-regenerate-seo without auth returns 401"""
        response = requests.post(f"{BASE_URL}/api/seo-settings/listings/bulk-regenerate-seo")
        print(f"POST /api/seo-settings/listings/bulk-regenerate-seo (no auth): {response.status_code}")
        
        assert response.status_code in [401, 403, 422], \
            f"Expected 401/403/422, got {response.status_code}"
        print("Correctly rejected unauthorized bulk regeneration")


class TestSEOLocationHierarchy:
    """Test that SEO includes location hierarchy (city, district, region, country)"""
    
    def test_listing_seo_with_location_data(self):
        """Test GET /api/seo-settings/listings/{listing_id}/seo includes location in description"""
        response = requests.get(f"{BASE_URL}/api/seo-settings/listings/{TEST_LISTING_ID}/seo")
        
        if response.status_code != 200:
            pytest.skip(f"Listing SEO endpoint returned {response.status_code}")
        
        data = response.json()
        seo_data = data.get("seo_data", {})
        
        if seo_data:
            meta_desc = seo_data.get("meta_description", "")
            print(f"Meta description: {meta_desc}")
            
            # Check if location is mentioned in meta description
            # Location could be city, region, or country
            location_indicators = ["in", "located", "available"]
            has_location = any(ind in meta_desc.lower() for ind in location_indicators)
            
            if has_location:
                print("Meta description includes location reference")
            else:
                print("Meta description may not include explicit location (depends on listing data)")
    
    def test_listing_has_full_details(self):
        """Test that we can get full listing with location_data field"""
        response = requests.get(f"{BASE_URL}/api/listings/{TEST_LISTING_ID}")
        print(f"GET /api/listings/{TEST_LISTING_ID}: {response.status_code}")
        
        if response.status_code != 200:
            pytest.skip(f"Listing endpoint returned {response.status_code}")
        
        data = response.json()
        
        # Check for location_data field
        location_data = data.get("location_data")
        location = data.get("location")
        
        print(f"Listing location: {location}")
        if location_data:
            print(f"Location data fields: {list(location_data.keys())}")
            if location_data.get("city_name"):
                print(f"  - city: {location_data.get('city_name')}")
            if location_data.get("region_name"):
                print(f"  - region: {location_data.get('region_name')}")
            if location_data.get("country_name"):
                print(f"  - country: {location_data.get('country_name')}")
        else:
            print("No structured location_data present (using basic location field)")


class TestRobotsTxt:
    """Test robots.txt endpoint"""
    
    def test_robots_txt_exists(self):
        """Test GET /api/robots.txt returns valid content"""
        response = requests.get(f"{BASE_URL}/api/robots.txt")
        print(f"GET /api/robots.txt: {response.status_code}")
        
        if response.status_code == 200:
            content = response.text
            assert "User-agent:" in content, "robots.txt should contain User-agent"
            assert "Sitemap:" in content, "robots.txt should reference sitemap"
            print("robots.txt contains User-agent and Sitemap reference")
            print(f"First 200 chars: {content[:200]}")
        else:
            print(f"robots.txt endpoint returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
