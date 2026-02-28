"""
Test Advanced SEO endpoints and Public Blog API
Tests the newly implemented features for AI SEO Growth Engine
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://listing-core.preview.emergentagent.com")

# Test credentials
ADMIN_EMAIL = "admin@marketplace.com"
ADMIN_PASSWORD = "Admin@123456"

# Known published blog posts
BLOG_SLUGS = [
    "used-cars-in-dar-es-salaam-buy-smart-in-tanzania",
    "buying-used-phones-in-dar-es-salaam-smart-tips"
]


class TestBlogPublicAPI:
    """Test public blog API endpoints"""
    
    def test_get_published_posts(self):
        """Test fetching published blog posts"""
        response = requests.get(f"{BASE_URL}/api/growth/content/posts?status=published")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "posts" in data, "Response should contain 'posts' key"
        assert "total" in data, "Response should contain 'total' key"
        assert len(data["posts"]) >= 2, f"Expected at least 2 published posts, got {len(data['posts'])}"
        
        # Validate post structure
        for post in data["posts"]:
            assert "id" in post
            assert "title" in post
            assert "slug" in post
            assert "content" in post
            assert "status" in post
            assert post["status"] == "published"
    
    def test_get_single_post_by_slug(self):
        """Test fetching a single post by slug"""
        slug = BLOG_SLUGS[0]  # Used cars post
        response = requests.get(f"{BASE_URL}/api/growth/content/posts/{slug}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        post = response.json()
        assert post["slug"] == slug
        assert "title" in post
        assert "content" in post
        assert "meta_title" in post
        assert "meta_description" in post
        assert "keywords" in post
        assert "category" in post
        assert post["category"] == "vehicles"
        assert post["target_country"] == "TZ"
    
    def test_get_electronics_post_by_slug(self):
        """Test fetching electronics category post"""
        slug = BLOG_SLUGS[1]  # Used phones post
        response = requests.get(f"{BASE_URL}/api/growth/content/posts/{slug}")
        assert response.status_code == 200
        
        post = response.json()
        assert post["slug"] == slug
        assert post["category"] == "electronics"
        assert "faq_section" in post
        # This post has FAQs
        if post["faq_section"]:
            assert len(post["faq_section"]) >= 1
            for faq in post["faq_section"]:
                assert "question" in faq
                assert "answer" in faq
    
    def test_filter_posts_by_category(self):
        """Test filtering posts by category"""
        response = requests.get(f"{BASE_URL}/api/growth/content/posts?status=published&category=vehicles")
        assert response.status_code == 200
        
        data = response.json()
        for post in data["posts"]:
            assert post["category"] == "vehicles"
    
    def test_filter_posts_by_country(self):
        """Test filtering posts by country"""
        response = requests.get(f"{BASE_URL}/api/growth/content/posts?status=published&country=TZ")
        assert response.status_code == 200
        
        data = response.json()
        for post in data["posts"]:
            assert post["target_country"] == "TZ"
    
    def test_post_not_found(self):
        """Test 404 for non-existent post"""
        response = requests.get(f"{BASE_URL}/api/growth/content/posts/non-existent-post-slug-12345")
        assert response.status_code == 404


class TestAdvancedSEOAuth:
    """Test Advanced SEO endpoints - Authentication required"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    def test_internal_links_analyze(self, admin_token):
        """Test internal links analysis endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/growth/advanced-seo/internal-links/analyze?content_type=blog",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total_suggestions" in data
        assert "suggestions" in data
        assert "analyzed_content_type" in data
        assert data["analyzed_content_type"] == "blog"
    
    def test_internal_links_requires_auth(self):
        """Test that internal links endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/growth/advanced-seo/internal-links/analyze?content_type=blog"
        )
        assert response.status_code == 401


class TestTrendingKeywords:
    """Test Trending Keywords / Predictive SEO endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    def test_get_trending_keywords_all_regions(self, admin_token):
        """Test getting trending keywords for all regions"""
        response = requests.get(
            f"{BASE_URL}/api/growth/advanced-seo/trending/keywords",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "keywords" in data
        assert "total" in data
        assert len(data["keywords"]) > 0
    
    def test_get_trending_keywords_by_region(self, admin_token):
        """Test getting trending keywords for specific region"""
        response = requests.get(
            f"{BASE_URL}/api/growth/advanced-seo/trending/keywords?region=TZ",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        for keyword in data["keywords"]:
            assert keyword["region"] == "TZ"
            assert "keyword" in keyword
            assert "trend_score" in keyword
            assert "search_volume" in keyword
            assert "competition" in keyword
            assert keyword["competition"] in ["low", "medium", "high"]
    
    def test_analyze_content_gaps(self, admin_token):
        """Test content gaps analysis"""
        response = requests.post(
            f"{BASE_URL}/api/growth/advanced-seo/trending/analyze-content-gaps?region=TZ",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "region" in data
        assert data["region"] == "TZ"
        assert "existing_content" in data
        assert "content_gaps" in data
        assert "recommendations" in data


class TestSocialMediaDistribution:
    """Test Social Media Distribution endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture(scope="class")
    def blog_post_id(self):
        """Get a valid blog post ID"""
        response = requests.get(f"{BASE_URL}/api/growth/content/posts?status=published&limit=1")
        if response.status_code == 200:
            posts = response.json().get("posts", [])
            if posts:
                return posts[0]["id"]
        pytest.skip("No published posts found")
    
    def test_generate_social_posts(self, admin_token, blog_post_id):
        """Test generating social media posts from blog content"""
        response = requests.post(
            f"{BASE_URL}/api/growth/advanced-seo/social/generate-posts?content_id={blog_post_id}&content_type=blog",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "posts_generated" in data
        assert data["posts_generated"] >= 1
        assert "posts" in data
        
        for post in data["posts"]:
            assert "id" in post
            assert "platform" in post
            assert "content" in post
            assert "hashtags" in post
            assert post["status"] == "draft"
    
    def test_generate_social_posts_invalid_content(self, admin_token):
        """Test social posts generation with invalid content ID"""
        response = requests.post(
            f"{BASE_URL}/api/growth/advanced-seo/social/generate-posts?content_id=invalid-id-12345&content_type=blog",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404


class TestBacklinkOpportunities:
    """Test Authority Building / Backlink Opportunities endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    def test_get_backlink_opportunities_all(self, admin_token):
        """Test getting backlink opportunities for all regions"""
        response = requests.get(
            f"{BASE_URL}/api/growth/advanced-seo/authority/backlink-opportunities",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "opportunities" in data
        assert "total" in data
        assert "tip" in data
        assert len(data["opportunities"]) > 0
    
    def test_get_backlink_opportunities_by_region(self, admin_token):
        """Test getting backlink opportunities for specific region"""
        response = requests.get(
            f"{BASE_URL}/api/growth/advanced-seo/authority/backlink-opportunities?region=TZ",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        for opp in data["opportunities"]:
            assert opp["region"] == "TZ"
            assert "domain" in opp
            assert "domain_authority" in opp
            assert "contact_method" in opp
            assert "difficulty" in opp


class TestMultiLanguageSEO:
    """Test Multi-language SEO endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    def test_get_multilang_status(self, admin_token):
        """Test getting multi-language SEO status"""
        response = requests.get(
            f"{BASE_URL}/api/growth/advanced-seo/multilang/status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "languages" in data
        assert "recommendations" in data
        
        # Check language structure
        languages = data["languages"]
        assert "en" in languages
        assert "de" in languages
        assert "sw" in languages
        
        for lang, info in languages.items():
            assert "name" in info
            assert "status" in info
            assert "coverage" in info
            assert "content_count" in info
