"""
Test Growth Engine Complete API Suite
Tests for all SEO Core, Content Engine, ASO Engine, and Growth Analytics Dashboard endpoints
Focus: AI SEO Growth Engine for Avida marketplace
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://loader-less-launch.preview.emergentagent.com').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@marketplace.com"
ADMIN_PASSWORD = "Admin@123456"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture
def auth_headers(admin_token):
    """Return headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


# =============================================================================
# SEO CORE TESTS - PUBLIC ENDPOINTS (No auth required)
# =============================================================================

class TestSEOCoreSitemap:
    """Test SEO Core - Sitemap.xml generation"""

    def test_sitemap_xml_generation(self):
        """Test /api/growth/seo-core/sitemap.xml returns valid XML sitemap"""
        response = requests.get(f"{BASE_URL}/api/growth/seo-core/sitemap.xml")
        assert response.status_code == 200, f"Sitemap failed: {response.status_code} - {response.text}"
        
        # Verify content type is XML
        content_type = response.headers.get("content-type", "")
        assert "xml" in content_type.lower() or "text/plain" in content_type.lower(), f"Expected XML, got {content_type}"
        
        # Verify XML structure
        content = response.text
        assert '<?xml version="1.0" encoding="UTF-8"?>' in content, "Missing XML declaration"
        assert '<urlset' in content, "Missing urlset element"
        assert 'http://www.sitemaps.org/schemas/sitemap/0.9' in content, "Missing sitemap namespace"
        
        # Verify it contains URL entries
        assert '<url>' in content, "No URL entries in sitemap"
        assert '<loc>' in content, "No loc elements in sitemap"
        
        print(f"Sitemap generated successfully, length: {len(content)} characters")


class TestSEOCoreRobotsTxt:
    """Test SEO Core - Robots.txt generation"""

    def test_robots_txt_generation(self):
        """Test /api/growth/seo-core/robots.txt returns valid robots.txt"""
        response = requests.get(f"{BASE_URL}/api/growth/seo-core/robots.txt")
        assert response.status_code == 200, f"Robots.txt failed: {response.status_code} - {response.text}"
        
        content = response.text
        
        # Verify robots.txt structure
        assert "User-agent:" in content, "Missing User-agent directive"
        assert "Allow:" in content or "Disallow:" in content, "Missing Allow/Disallow directives"
        assert "Sitemap:" in content, "Missing Sitemap directive"
        
        # Verify expected sections
        assert "/api/" in content, "Should disallow /api/"
        assert "/admin/" in content, "Should disallow /admin/"
        
        # Verify AI crawler rules
        assert "GPTBot" in content, "Missing GPTBot rules for AI search engines"
        
        print(f"Robots.txt generated successfully, content:\n{content[:500]}...")


class TestSEOCoreOrganizationSchema:
    """Test SEO Core - Organization Schema.org structured data"""

    def test_organization_schema(self):
        """Test /api/growth/seo-core/schema/organization returns valid schema"""
        response = requests.get(f"{BASE_URL}/api/growth/seo-core/schema/organization")
        assert response.status_code == 200, f"Organization schema failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "schema" in data, "Missing 'schema' in response"
        assert "json_ld" in data, "Missing 'json_ld' in response"
        
        schema = data["schema"]
        
        # Verify Schema.org organization fields
        assert schema.get("@context") == "https://schema.org", "Invalid @context"
        assert schema.get("@type") == "Organization", "Invalid @type"
        assert "name" in schema, "Missing organization name"
        assert schema.get("name") == "Avida", "Organization name should be Avida"
        assert "url" in schema, "Missing organization URL"
        assert "description" in schema, "Missing organization description"
        
        # Verify target countries are in areaServed
        assert "areaServed" in schema, "Missing areaServed"
        served_areas = schema.get("areaServed", [])
        assert len(served_areas) >= 6, f"Expected 6+ countries, got {len(served_areas)}"
        
        # Verify JSON-LD script tag
        json_ld = data["json_ld"]
        assert '<script type="application/ld+json">' in json_ld, "Invalid JSON-LD format"
        
        print(f"Organization schema valid: {schema.get('name')} - {len(served_areas)} countries")


class TestSEOCoreFAQSchema:
    """Test SEO Core - FAQ Schema.org structured data"""

    def test_faq_schema(self):
        """Test /api/growth/seo-core/schema/faq returns valid FAQ schema"""
        response = requests.get(f"{BASE_URL}/api/growth/seo-core/schema/faq")
        assert response.status_code == 200, f"FAQ schema failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "faqs" in data, "Missing 'faqs' list"
        assert "schema" in data, "Missing 'schema' object"
        assert "json_ld" in data, "Missing 'json_ld' string"
        
        faqs = data["faqs"]
        schema = data["schema"]
        
        # Verify FAQs exist
        assert len(faqs) > 0, "No FAQs returned"
        
        # Verify FAQ structure
        for faq in faqs:
            assert "question" in faq, "FAQ missing question"
            assert "answer" in faq, "FAQ missing answer"
            assert len(faq["question"]) > 0, "Empty question"
            assert len(faq["answer"]) > 0, "Empty answer"
        
        # Verify Schema.org structure
        assert schema.get("@context") == "https://schema.org", "Invalid @context"
        assert schema.get("@type") == "FAQPage", "Invalid @type"
        assert "mainEntity" in schema, "Missing mainEntity"
        
        # Verify JSON-LD format
        json_ld = data["json_ld"]
        assert '<script type="application/ld+json">' in json_ld, "Invalid JSON-LD format"
        
        print(f"FAQ schema valid: {len(faqs)} FAQs returned")


# =============================================================================
# CONTENT ENGINE TESTS
# =============================================================================

class TestContentEnginePosts:
    """Test Content Engine - Blog posts endpoint"""

    def test_get_blog_posts_public(self):
        """Test /api/growth/content/posts returns posts (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/growth/content/posts")
        assert response.status_code == 200, f"Get posts failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "posts" in data, "Missing 'posts' in response"
        assert "total" in data, "Missing 'total' count"
        assert "limit" in data, "Missing 'limit' field"
        assert "offset" in data, "Missing 'offset' field"
        
        # Verify data types
        assert isinstance(data["posts"], list), "Posts should be a list"
        assert isinstance(data["total"], int), "Total should be an integer"
        
        print(f"Content posts retrieved: {data['total']} total posts, returned {len(data['posts'])}")

    def test_get_posts_with_filters(self):
        """Test blog posts filtering by status"""
        response = requests.get(f"{BASE_URL}/api/growth/content/posts?status=draft&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify all returned posts match the filter
        for post in data["posts"]:
            assert post.get("status") == "draft", f"Post status mismatch: {post.get('status')}"


class TestContentEngineAnalytics:
    """Test Content Engine - Analytics endpoint (requires admin auth)"""

    def test_analytics_requires_auth(self):
        """Test /api/growth/content/analytics requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/growth/content/analytics")
        assert response.status_code == 401, "Analytics should require auth"

    def test_analytics_with_auth(self, auth_headers):
        """Test /api/growth/content/analytics returns valid analytics"""
        response = requests.get(f"{BASE_URL}/api/growth/content/analytics", headers=auth_headers)
        assert response.status_code == 200, f"Analytics failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # Verify response structure
        required_fields = ["total_posts", "published_posts", "draft_posts", "by_country", "by_category", "recent_posts"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify data types
        assert isinstance(data["total_posts"], int), "total_posts should be int"
        assert isinstance(data["published_posts"], int), "published_posts should be int"
        assert isinstance(data["draft_posts"], int), "draft_posts should be int"
        assert isinstance(data["by_country"], dict), "by_country should be dict"
        assert isinstance(data["by_category"], dict), "by_category should be dict"
        assert isinstance(data["recent_posts"], list), "recent_posts should be list"
        
        print(f"Content analytics: {data['total_posts']} total, {data['published_posts']} published, {data['draft_posts']} drafts")


# =============================================================================
# ASO ENGINE TESTS (Requires admin auth)
# =============================================================================

class TestASOEngineKeywords:
    """Test ASO Engine - Keywords endpoint"""

    def test_keywords_requires_auth(self):
        """Test /api/growth/aso/keywords/TZ requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/growth/aso/keywords/TZ")
        assert response.status_code == 401, "Keywords should require auth"

    def test_keywords_for_tanzania(self, auth_headers):
        """Test /api/growth/aso/keywords/TZ returns keywords for Tanzania"""
        response = requests.get(f"{BASE_URL}/api/growth/aso/keywords/TZ", headers=auth_headers)
        assert response.status_code == 200, f"Keywords TZ failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "region" in data, "Missing region"
        assert data["region"] == "TZ", "Region should be TZ"
        assert "keywords" in data, "Missing keywords"
        assert "competitors" in data, "Missing competitors"
        
        # Verify keyword categories
        keywords = data["keywords"]
        assert "high_volume" in keywords, "Missing high_volume keywords"
        assert "medium_volume" in keywords, "Missing medium_volume keywords"
        assert "low_competition" in keywords, "Missing low_competition keywords"
        
        print(f"ASO Keywords for TZ: {len(keywords.get('high_volume', []))} high volume, {len(keywords.get('low_competition', []))} low competition")

    def test_keywords_for_kenya(self, auth_headers):
        """Test /api/growth/aso/keywords/KE returns keywords for Kenya"""
        response = requests.get(f"{BASE_URL}/api/growth/aso/keywords/KE", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["region"] == "KE"
        assert "keywords" in data

    def test_keywords_for_germany(self, auth_headers):
        """Test /api/growth/aso/keywords/DE returns keywords for Germany"""
        response = requests.get(f"{BASE_URL}/api/growth/aso/keywords/DE", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["region"] == "DE"
        assert "keywords" in data


class TestASOEngineCompetitorAnalysis:
    """Test ASO Engine - Competitor Analysis endpoint"""

    def test_competitor_analysis_requires_auth(self):
        """Test /api/growth/aso/competitor-analysis/TZ requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/growth/aso/competitor-analysis/TZ")
        assert response.status_code == 401, "Competitor analysis should require auth"

    def test_competitor_analysis_tanzania(self, auth_headers):
        """Test /api/growth/aso/competitor-analysis/TZ returns competitor data"""
        response = requests.get(f"{BASE_URL}/api/growth/aso/competitor-analysis/TZ", headers=auth_headers)
        assert response.status_code == 200, f"Competitor analysis failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "region" in data, "Missing region"
        assert data["region"] == "TZ", "Region should be TZ"
        assert "competitors" in data, "Missing competitors"
        assert "insights" in data, "Missing insights"
        assert "keyword_gaps" in data, "Missing keyword_gaps"
        
        # Verify competitors list
        competitors = data["competitors"]
        assert isinstance(competitors, list), "Competitors should be a list"
        
        # Verify insights
        insights = data["insights"]
        assert isinstance(insights, list), "Insights should be a list"
        assert len(insights) > 0, "Should have at least one insight"
        
        print(f"Competitor analysis for TZ: {len(competitors)} competitors, {len(insights)} insights")


class TestASOEngineMetadata:
    """Test ASO Engine - Metadata endpoint"""

    def test_metadata_requires_auth(self):
        """Test /api/growth/aso/metadata requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/growth/aso/metadata")
        assert response.status_code == 401, "Metadata should require auth"

    def test_get_aso_metadata(self, auth_headers):
        """Test /api/growth/aso/metadata returns metadata list"""
        response = requests.get(f"{BASE_URL}/api/growth/aso/metadata", headers=auth_headers)
        assert response.status_code == 200, f"Metadata failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "metadata" in data, "Missing metadata"
        assert isinstance(data["metadata"], list), "Metadata should be a list"
        
        print(f"ASO Metadata: {len(data['metadata'])} metadata versions")


# =============================================================================
# GROWTH ANALYTICS DASHBOARD TESTS (Requires admin auth)
# =============================================================================

class TestGrowthAnalyticsDashboard:
    """Test Growth Analytics - Dashboard endpoint"""

    def test_dashboard_requires_auth(self):
        """Test /api/growth/analytics/dashboard requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/growth/analytics/dashboard")
        assert response.status_code == 401, "Dashboard should require auth"

    def test_dashboard_returns_valid_data(self, auth_headers):
        """Test /api/growth/analytics/dashboard returns comprehensive data"""
        response = requests.get(f"{BASE_URL}/api/growth/analytics/dashboard", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # Verify overview section
        assert "overview" in data, "Missing overview"
        overview = data["overview"]
        assert "total_blog_posts" in overview, "Missing total_blog_posts"
        assert "published_posts" in overview, "Missing published_posts"
        assert "total_active_listings" in overview, "Missing total_active_listings"
        assert "ai_citations" in overview, "Missing ai_citations"
        
        # Verify traffic section
        assert "traffic" in data, "Missing traffic"
        traffic = data["traffic"]
        assert "total_visits" in traffic, "Missing total_visits"
        assert "organic_visits" in traffic, "Missing organic_visits"
        assert "organic_percentage" in traffic, "Missing organic_percentage"
        
        # Verify top content
        assert "top_content" in data, "Missing top_content"
        assert isinstance(data["top_content"], list), "top_content should be list"
        
        # Verify top keywords
        assert "top_keywords" in data, "Missing top_keywords"
        assert isinstance(data["top_keywords"], list), "top_keywords should be list"
        
        # Verify timestamp
        assert "timestamp" in data, "Missing timestamp"
        
        print(f"Growth Dashboard: {overview['total_blog_posts']} posts, {traffic['total_visits']} total visits, {traffic['organic_percentage']}% organic")


class TestGrowthAnalyticsTargets:
    """Test Growth Analytics - Targets endpoint"""

    def test_targets_requires_auth(self):
        """Test /api/growth/analytics/targets requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/growth/analytics/targets")
        assert response.status_code == 401, "Targets should require auth"

    def test_targets_returns_valid_data(self, auth_headers):
        """Test /api/growth/analytics/targets returns growth targets"""
        response = requests.get(f"{BASE_URL}/api/growth/analytics/targets", headers=auth_headers)
        assert response.status_code == 200, f"Targets failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # Verify keyword targets
        assert "keyword_targets" in data, "Missing keyword_targets"
        keyword_targets = data["keyword_targets"]
        assert isinstance(keyword_targets, list), "keyword_targets should be list"
        assert len(keyword_targets) > 0, "Should have at least one keyword target"
        
        for target in keyword_targets:
            assert "keyword" in target, "Target missing keyword"
            assert "target_position" in target, "Target missing target_position"
        
        # Verify traffic target
        assert "traffic_target" in data, "Missing traffic_target"
        traffic_target = data["traffic_target"]
        assert "organic_increase_percentage" in traffic_target, "Missing organic_increase_percentage"
        
        # Verify AI citation target
        assert "ai_citation_target" in data, "Missing ai_citation_target"
        ai_target = data["ai_citation_target"]
        assert "current_citations" in ai_target, "Missing current_citations"
        assert "target_citations" in ai_target, "Missing target_citations"
        
        # Verify content target
        assert "content_target" in data, "Missing content_target"
        content_target = data["content_target"]
        assert "posts_per_week" in content_target, "Missing posts_per_week"
        assert "current_published" in content_target, "Missing current_published"
        assert "target_total" in content_target, "Missing target_total"
        
        print(f"Growth Targets: {len(keyword_targets)} keyword targets, {ai_target['target_citations']} AI citation target, {content_target['posts_per_week']} posts/week target")


# =============================================================================
# ADMIN AUTHENTICATION TEST
# =============================================================================

class TestAdminAuthentication:
    """Test admin authentication for all protected endpoints"""

    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token"
        assert "admin" in data, "Missing admin data"
        assert data["admin"]["email"] == ADMIN_EMAIL, "Email mismatch"
        
        print(f"Admin login successful: {data['admin']['email']} - role: {data['admin'].get('role', 'N/A')}")

    def test_admin_login_invalid(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, "Should reject invalid credentials"
