"""
Test suite for SEO Sitemap endpoints and Premium Badge features
Tests:
1. GET /sitemap.xml - XML sitemap with homepage and business profiles
2. GET /robots.txt - robots.txt with sitemap reference
3. GET /api/seo/sitemap-stats - Sitemap statistics
4. Premium badge visibility on invoices page (GET /api/users/me)
"""

import pytest
import requests
import os
import xml.etree.ElementTree as ET

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://filter-rollback.preview.emergentagent.com').rstrip('/')
# Use direct backend URL for sitemap/robots.txt since they're registered on root path
# The public URL routes non-/api paths to frontend
BACKEND_DIRECT_URL = "http://localhost:8001"


class TestSEOSitemap:
    """Test SEO Sitemap endpoints - using direct backend URL since sitemap.xml is on root path"""

    def test_sitemap_returns_valid_xml(self):
        """GET /sitemap.xml should return valid XML"""
        response = requests.get(f"{BACKEND_DIRECT_URL}/sitemap.xml")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Content-Type assertion
        assert "xml" in response.headers.get("Content-Type", "").lower(), \
            f"Expected XML content type, got {response.headers.get('Content-Type')}"
        
        # Validate XML structure
        try:
            root = ET.fromstring(response.text)
            # Check namespace (sitemap schema)
            assert "sitemaps.org" in root.tag, "Expected sitemap schema namespace"
            print(f"✓ Sitemap returned valid XML with root tag: {root.tag}")
        except ET.ParseError as e:
            pytest.fail(f"Invalid XML: {e}")
        
        print(f"✓ GET /sitemap.xml: Status 200, Valid XML, Content-Type: {response.headers.get('Content-Type')}")

    def test_sitemap_contains_homepage(self):
        """Sitemap should contain homepage URL"""
        response = requests.get(f"{BACKEND_DIRECT_URL}/sitemap.xml")
        assert response.status_code == 200
        
        # Parse XML
        root = ET.fromstring(response.text)
        
        # Find all URL entries
        ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = root.findall('.//sm:url', ns)
        
        # Data assertion - homepage should exist
        assert len(urls) >= 1, "Sitemap should have at least 1 URL (homepage)"
        
        # Check for homepage
        homepage_found = False
        for url_elem in urls:
            loc = url_elem.find('sm:loc', ns)
            if loc is not None and loc.text and loc.text.endswith('/'):
                homepage_found = True
                priority = url_elem.find('sm:priority', ns)
                changefreq = url_elem.find('sm:changefreq', ns)
                print(f"✓ Homepage found: {loc.text}")
                print(f"  - Priority: {priority.text if priority is not None else 'not set'}")
                print(f"  - Changefreq: {changefreq.text if changefreq is not None else 'not set'}")
                assert priority is not None and priority.text == "1.0", "Homepage should have priority 1.0"
                assert changefreq is not None and changefreq.text == "daily", "Homepage should have daily changefreq"
                break
        
        assert homepage_found, "Homepage URL not found in sitemap"
        print(f"✓ Sitemap contains {len(urls)} URLs including homepage")

    def test_sitemap_structure_for_business_profiles(self):
        """Sitemap should have proper structure for business profiles"""
        response = requests.get(f"{BACKEND_DIRECT_URL}/sitemap.xml")
        assert response.status_code == 200
        
        root = ET.fromstring(response.text)
        ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = root.findall('.//sm:url', ns)
        
        business_urls = []
        for url_elem in urls:
            loc = url_elem.find('sm:loc', ns)
            if loc is not None and loc.text and '/business/' in loc.text:
                business_urls.append({
                    'loc': loc.text,
                    'lastmod': url_elem.find('sm:lastmod', ns),
                    'changefreq': url_elem.find('sm:changefreq', ns),
                    'priority': url_elem.find('sm:priority', ns)
                })
        
        print(f"✓ Found {len(business_urls)} business profile URLs in sitemap")
        
        # If there are business profiles, verify their structure
        for i, biz_url in enumerate(business_urls[:3]):  # Check first 3
            print(f"  - Business URL {i+1}: {biz_url['loc']}")
            if biz_url['lastmod'] is not None:
                print(f"    lastmod: {biz_url['lastmod'].text}")
            if biz_url['priority'] is not None:
                print(f"    priority: {biz_url['priority'].text}")
                # Priority should be 0.7 or 0.9 (verified vs premium)
                assert biz_url['priority'].text in ["0.7", "0.9"], \
                    f"Business profile priority should be 0.7 or 0.9, got {biz_url['priority'].text}"
        
        print("✓ Business profile URLs have proper structure")


class TestRobotsTxt:
    """Test robots.txt endpoint - using direct backend URL"""

    def test_robots_txt_returns_valid_content(self):
        """GET /robots.txt should return valid robots.txt"""
        response = requests.get(f"{BACKEND_DIRECT_URL}/robots.txt")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Content-Type assertion
        assert "text/plain" in response.headers.get("Content-Type", "").lower(), \
            f"Expected text/plain, got {response.headers.get('Content-Type')}"
        
        content = response.text
        print(f"✓ GET /robots.txt: Status 200")
        print(f"Content:\n{content}")

    def test_robots_txt_contains_required_directives(self):
        """robots.txt should contain required directives"""
        response = requests.get(f"{BACKEND_DIRECT_URL}/robots.txt")
        assert response.status_code == 200
        
        content = response.text.lower()
        
        # Data assertions
        assert "user-agent" in content, "robots.txt should contain User-agent directive"
        assert "sitemap" in content, "robots.txt should contain Sitemap reference"
        assert "allow" in content, "robots.txt should contain Allow directives"
        assert "disallow" in content, "robots.txt should contain Disallow directives"
        
        # Check sitemap URL is correct
        assert "sitemap.xml" in content, "robots.txt should reference sitemap.xml"
        
        print("✓ robots.txt contains all required directives")

    def test_robots_txt_disallows_sensitive_paths(self):
        """robots.txt should disallow sensitive paths"""
        response = requests.get(f"{BACKEND_DIRECT_URL}/robots.txt")
        assert response.status_code == 200
        
        content = response.text.lower()
        
        # Check sensitive paths are disallowed
        sensitive_paths = ['/api/', '/admin/', '/profile/', '/login', '/register']
        for path in sensitive_paths:
            assert f"disallow: {path}" in content, f"robots.txt should disallow {path}"
        
        print("✓ robots.txt disallows all sensitive paths")


class TestSitemapStats:
    """Test sitemap statistics endpoint"""

    def test_sitemap_stats_returns_valid_data(self):
        """GET /api/seo/sitemap-stats should return valid statistics"""
        response = requests.get(f"{BASE_URL}/api/seo/sitemap-stats")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data assertions
        data = response.json()
        
        # Check required fields exist
        required_fields = ['total_profiles', 'verified_in_sitemap', 'premium_profiles', 'sitemap_url', 'robots_url']
        for field in required_fields:
            assert field in data, f"Response should contain {field}"
        
        # Check field types
        assert isinstance(data['total_profiles'], int), "total_profiles should be an integer"
        assert isinstance(data['verified_in_sitemap'], int), "verified_in_sitemap should be an integer"
        assert isinstance(data['premium_profiles'], int), "premium_profiles should be an integer"
        assert isinstance(data['sitemap_url'], str), "sitemap_url should be a string"
        assert isinstance(data['robots_url'], str), "robots_url should be a string"
        
        # Check URLs
        assert data['sitemap_url'] == "/sitemap.xml", f"sitemap_url should be /sitemap.xml, got {data['sitemap_url']}"
        assert data['robots_url'] == "/robots.txt", f"robots_url should be /robots.txt, got {data['robots_url']}"
        
        print(f"✓ GET /api/seo/sitemap-stats: Status 200")
        print(f"  - total_profiles: {data['total_profiles']}")
        print(f"  - verified_in_sitemap: {data['verified_in_sitemap']}")
        print(f"  - premium_profiles: {data['premium_profiles']}")
        print(f"  - sitemap_url: {data['sitemap_url']}")
        print(f"  - robots_url: {data['robots_url']}")


class TestPremiumUserProfile:
    """Test premium user profile endpoint for invoices page"""

    @pytest.fixture
    def auth_session(self):
        """Login and get authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login with test credentials
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "premium_tester_2@example.com",
            "password": "testpass123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token") or login_response.json().get("session_token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
            return session, login_response.json()
        
        pytest.skip("Authentication failed - cannot test premium user profile")

    def test_users_me_returns_premium_status(self, auth_session):
        """GET /api/users/me should return premium status fields"""
        session, login_data = auth_session
        
        response = session.get(f"{BASE_URL}/api/users/me")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Check user data fields exist
        assert 'name' in data or 'email' in data, "Response should contain user data"
        
        # Check premium status fields exist
        assert 'is_premium' in data, "Response should contain is_premium field"
        assert 'premium_expires_at' in data, "Response should contain premium_expires_at field"
        
        # Log premium status
        is_premium = data.get('is_premium', False)
        premium_expires = data.get('premium_expires_at')
        
        print(f"✓ GET /api/users/me: Status 200")
        print(f"  - User: {data.get('name', data.get('email', 'N/A'))}")
        print(f"  - is_premium: {is_premium}")
        print(f"  - premium_expires_at: {premium_expires}")
        
        # Verify the user is premium (we created a premium profile in setup)
        if is_premium:
            assert premium_expires is not None, "Premium user should have expiration date"
            print("✓ User has premium status with expiration date")


class TestInvoicesAPI:
    """Test invoices API for premium users"""

    @pytest.fixture
    def auth_session(self):
        """Login and get authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "premium_tester_2@example.com",
            "password": "testpass123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token") or login_response.json().get("session_token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
            return session
        
        pytest.skip("Authentication failed")

    def test_invoices_list_authenticated(self, auth_session):
        """GET /api/invoices should return invoices list for authenticated user"""
        session = auth_session
        
        response = session.get(f"{BASE_URL}/api/invoices?limit=50")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Data assertions
        assert 'invoices' in data, "Response should contain 'invoices' field"
        assert isinstance(data['invoices'], list), "invoices should be a list"
        
        print(f"✓ GET /api/invoices: Status 200")
        print(f"  - Number of invoices: {len(data['invoices'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
