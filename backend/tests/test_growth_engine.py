"""
Test Growth Engine APIs - Content Engine and ASO Engine
Tests for AI SEO Growth Engine components
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://homepage-fix-8.preview.emergentagent.com/api')

# Admin credentials
ADMIN_EMAIL = "admin@marketplace.com"
ADMIN_PASSWORD = "Admin@123456"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/admin/auth/login", json={
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


class TestAdminAuth:
    """Test admin authentication"""

    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "admin" in data
        assert data["admin"]["email"] == ADMIN_EMAIL
        assert data["admin"]["role"] == "super_admin"

    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/admin/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestContentEngineAnalytics:
    """Test Content Engine - Analytics endpoint"""

    def test_analytics_requires_auth(self):
        """Analytics endpoint should require admin auth"""
        response = requests.get(f"{BASE_URL}/growth/content/analytics")
        assert response.status_code == 401

    def test_analytics_returns_valid_data(self, auth_headers):
        """Analytics endpoint returns valid structure"""
        response = requests.get(f"{BASE_URL}/growth/content/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "total_posts" in data
        assert "published_posts" in data
        assert "draft_posts" in data
        assert "by_country" in data
        assert "by_category" in data
        assert "recent_posts" in data
        
        # Verify data types
        assert isinstance(data["total_posts"], int)
        assert isinstance(data["published_posts"], int)
        assert isinstance(data["draft_posts"], int)
        assert isinstance(data["by_country"], dict)
        assert isinstance(data["by_category"], dict)
        assert isinstance(data["recent_posts"], list)


class TestContentEnginePosts:
    """Test Content Engine - Blog Posts endpoints"""

    def test_get_posts_without_auth(self):
        """Posts list is publicly accessible"""
        response = requests.get(f"{BASE_URL}/growth/content/posts?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        assert "total" in data
        assert "limit" in data

    def test_get_posts_with_filters(self, auth_headers):
        """Posts can be filtered by status, category, country"""
        response = requests.get(
            f"{BASE_URL}/growth/content/posts?status=draft&limit=5",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        
        # If there are posts, verify they match filter
        for post in data["posts"]:
            assert post["status"] == "draft"

    def test_post_structure_is_valid(self, auth_headers):
        """Verify blog post response structure"""
        response = requests.get(f"{BASE_URL}/growth/content/posts?limit=1", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        if data["posts"]:
            post = data["posts"][0]
            required_fields = ["id", "title", "slug", "content", "category", 
                             "target_country", "status", "created_at"]
            for field in required_fields:
                assert field in post, f"Missing field: {field}"


class TestContentEngineSuggestions:
    """Test Content Engine - Suggestions endpoint"""

    def test_suggestions_requires_auth(self):
        """Suggestions endpoint requires admin auth"""
        response = requests.get(f"{BASE_URL}/growth/content/suggestions")
        assert response.status_code == 401

    def test_suggestions_returns_valid_data(self, auth_headers):
        """Suggestions endpoint returns valid structure"""
        response = requests.get(f"{BASE_URL}/growth/content/suggestions", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "suggestions" in data
        assert isinstance(data["suggestions"], list)
        
        if data["suggestions"]:
            suggestion = data["suggestions"][0]
            assert "title" in suggestion
            assert "type" in suggestion
            assert "priority" in suggestion
            assert "target_country" in suggestion


class TestContentEngineAEO:
    """Test Content Engine - AI Search (AEO) endpoints"""

    def test_aeo_questions_accessible(self, auth_headers):
        """AEO questions endpoint works"""
        response = requests.get(f"{BASE_URL}/growth/content/aeo-questions", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "questions" in data
        assert isinstance(data["questions"], list)
        assert len(data["questions"]) > 0
        
        # Verify structure
        question = data["questions"][0]
        assert "question" in question
        assert "topic" in question


class TestASOEngine:
    """Test ASO Engine endpoints"""

    def test_aso_metadata_endpoint(self, auth_headers):
        """ASO metadata endpoint works"""
        response = requests.get(f"{BASE_URL}/growth/aso/metadata", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "metadata" in data
        assert isinstance(data["metadata"], list)

    def test_aso_analytics_summary(self, auth_headers):
        """ASO analytics summary endpoint works"""
        response = requests.get(f"{BASE_URL}/growth/aso/analytics/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields
        assert "total_impressions" in data
        assert "total_installs" in data
        assert "average_ctr" in data

    def test_aso_keywords_by_region(self, auth_headers):
        """ASO keywords by region endpoint works"""
        regions = ["TZ", "KE", "DE"]
        
        for region in regions:
            response = requests.get(
                f"{BASE_URL}/growth/aso/keywords/{region}",
                headers=auth_headers
            )
            assert response.status_code == 200
            data = response.json()
            
            assert "region" in data
            assert data["region"] == region
            assert "keywords" in data
            assert "high_volume" in data["keywords"]
            assert "medium_volume" in data["keywords"]
            assert "low_competition" in data["keywords"]

    def test_aso_competitor_analysis(self, auth_headers):
        """ASO competitor analysis endpoint works"""
        response = requests.get(
            f"{BASE_URL}/growth/aso/competitor-analysis/TZ",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "region" in data
        assert "competitors" in data
        assert "insights" in data


class TestContentGeneration:
    """Test AI Content Generation (Generate Post endpoint)"""

    def test_generate_post_requires_auth(self):
        """Generate post endpoint requires admin auth"""
        response = requests.post(f"{BASE_URL}/growth/content/generate-post", json={
            "topic": "Test topic",
            "template_type": "buying_guide",
            "target_country": "TZ"
        })
        assert response.status_code == 401

    def test_generate_post_validation(self, auth_headers):
        """Generate post validates required fields"""
        # Missing topic should fail validation
        response = requests.post(
            f"{BASE_URL}/growth/content/generate-post",
            headers=auth_headers,
            json={
                "template_type": "buying_guide",
                "target_country": "TZ"
            }
        )
        assert response.status_code == 422  # Validation error


class TestGrowthEngineDashboard:
    """Test Growth Engine Dashboard endpoint"""

    def test_dashboard_page_accessible(self, auth_headers):
        """Growth Engine related endpoints work"""
        # Test multiple endpoints that dashboard would use
        endpoints = [
            "/growth/content/analytics",
            "/growth/content/suggestions",
            "/growth/aso/analytics/summary"
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=auth_headers)
            assert response.status_code == 200, f"Endpoint {endpoint} failed"
