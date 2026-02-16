"""
Test Growth Engine Features - Iteration 168
Testing Multi-Language SEO, Social Distribution, and Content Calendar Recurring Events
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cache-first-dash.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class TestGrowthEngineFeatures:
    """Test all growth engine feature endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token before each test"""
        login_response = requests.post(f"{API_BASE}/admin/auth/login", json={
            "email": "admin@marketplace.com",
            "password": "Admin@123456"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    # ==================== MULTI-LANGUAGE SEO TESTS ====================
    
    def test_multilang_get_languages(self):
        """Test GET /api/growth/multilang/languages"""
        response = requests.get(f"{API_BASE}/growth/multilang/languages", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify languages structure
        assert "languages" in data
        assert "en" in data["languages"], "English should be supported"
        assert "de" in data["languages"], "German should be supported"
        assert "sw" in data["languages"], "Swahili should be supported"
        
        # Verify language properties
        en_lang = data["languages"]["en"]
        assert en_lang["name"] == "English"
        assert "flag" in en_lang
        assert "regions" in en_lang
        print(f"✓ Languages endpoint returned {len(data['languages'])} languages")
    
    def test_multilang_get_status(self):
        """Test GET /api/growth/multilang/status"""
        response = requests.get(f"{API_BASE}/growth/multilang/status", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify status structure
        assert "languages" in data
        assert "recommendations" in data
        
        # Verify language stats
        for lang_code in ["en", "de", "sw"]:
            assert lang_code in data["languages"], f"Missing stats for {lang_code}"
            lang_stats = data["languages"][lang_code]
            assert "coverage_score" in lang_stats
            assert "blog_posts" in lang_stats
            assert "pending_translations" in lang_stats
        print(f"✓ Status endpoint returned stats for {len(data['languages'])} languages")
    
    def test_multilang_seo_keywords_german(self):
        """Test GET /api/growth/multilang/seo-keywords/de"""
        response = requests.get(f"{API_BASE}/growth/multilang/seo-keywords/de", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify keywords structure
        assert data["language"] == "de"
        assert "keywords" in data
        assert "language_info" in data
        assert "usage_tips" in data
        
        # Verify German keywords
        keywords = data["keywords"]
        assert "buy" in keywords, "Missing 'buy' keyword"
        assert keywords["buy"] == "kaufen", f"Incorrect German translation for 'buy': {keywords.get('buy')}"
        assert "marketplace" in keywords
        assert keywords["marketplace"] == "Marktplatz"
        print(f"✓ German SEO keywords returned {len(keywords)} translations")
    
    def test_multilang_seo_keywords_swahili(self):
        """Test GET /api/growth/multilang/seo-keywords/sw"""
        response = requests.get(f"{API_BASE}/growth/multilang/seo-keywords/sw", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["language"] == "sw"
        keywords = data["keywords"]
        assert keywords.get("buy") == "nunua", "Incorrect Swahili for 'buy'"
        assert keywords.get("sell") == "uza", "Incorrect Swahili for 'sell'"
        print(f"✓ Swahili SEO keywords returned {len(keywords)} translations")
    
    def test_multilang_regional_keywords(self):
        """Test GET /api/growth/multilang/regional-keywords"""
        response = requests.get(f"{API_BASE}/growth/multilang/regional-keywords", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "regional_keywords" in data
        regional = data["regional_keywords"]
        
        # Verify regions
        assert "TZ" in regional, "Missing Tanzania keywords"
        assert "KE" in regional, "Missing Kenya keywords"
        assert "DE" in regional, "Missing Germany keywords"
        
        # Verify keyword categories
        tz_keywords = regional["TZ"]
        assert "keywords" in tz_keywords
        assert "vehicles" in tz_keywords["keywords"]
        print(f"✓ Regional keywords returned for {len(regional)} regions")
    
    def test_multilang_translation_tasks(self):
        """Test GET /api/growth/multilang/translation-tasks"""
        response = requests.get(f"{API_BASE}/growth/multilang/translation-tasks", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "tasks" in data
        assert "total" in data
        print(f"✓ Translation tasks endpoint returned {data['total']} tasks")
    
    def test_multilang_create_translation_task(self):
        """Test POST /api/growth/multilang/translation-tasks"""
        payload = {
            "source_language": "en",
            "target_language": "de",
            "content_type": "blog",
            "content_id": "TEST_blog_123",
            "text": "This is a test translation task"
        }
        
        response = requests.post(f"{API_BASE}/growth/multilang/translation-tasks", 
                                 headers=self.headers, json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "task" in data
        assert data["task"]["target_language"] == "de"
        print(f"✓ Created translation task successfully")
    
    # ==================== SOCIAL DISTRIBUTION TESTS ====================
    
    def test_social_get_platforms(self):
        """Test GET /api/growth/social/platforms"""
        response = requests.get(f"{API_BASE}/growth/social/platforms", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "platforms" in data
        platforms = data["platforms"]
        
        # Verify all platforms
        assert "twitter" in platforms
        assert "linkedin" in platforms
        assert "facebook" in platforms
        assert "instagram" in platforms
        
        # Verify platform properties
        twitter = platforms["twitter"]
        assert twitter["name"] == "Twitter/X"
        assert twitter["max_chars"] == 280
        assert twitter["supports_images"] == True
        print(f"✓ Platforms endpoint returned {len(platforms)} platforms")
    
    def test_social_get_posts(self):
        """Test GET /api/growth/social/posts"""
        response = requests.get(f"{API_BASE}/growth/social/posts", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "posts" in data
        assert "total" in data
        assert "by_status" in data
        print(f"✓ Posts endpoint returned {data['total']} posts")
    
    def test_social_get_analytics(self):
        """Test GET /api/growth/social/analytics"""
        response = requests.get(f"{API_BASE}/growth/social/analytics", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "summary" in data
        summary = data["summary"]
        assert "total_posts" in summary
        assert "published" in summary
        assert "scheduled" in summary
        assert "drafts" in summary
        
        assert "by_platform" in data
        assert "is_simulated_data" in data
        print(f"✓ Analytics endpoint returned summary with {summary['total_posts']} total posts")
    
    def test_social_get_queue(self):
        """Test GET /api/growth/social/queue"""
        response = requests.get(f"{API_BASE}/growth/social/queue", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "queue" in data
        assert "total" in data
        assert "period" in data
        print(f"✓ Queue endpoint returned {data['total']} scheduled posts")
    
    def test_social_get_templates(self):
        """Test GET /api/growth/social/templates"""
        response = requests.get(f"{API_BASE}/growth/social/templates", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "templates" in data
        templates = data["templates"]
        
        assert "blog_promotion" in templates
        assert "listing_highlight" in templates
        assert "tip_of_the_day" in templates
        
        # Verify template structure
        blog_templates = templates["blog_promotion"]
        assert "twitter" in blog_templates
        assert "linkedin" in blog_templates
        print(f"✓ Templates endpoint returned {len(templates)} template types")
    
    def test_social_create_post(self):
        """Test POST /api/growth/social/posts - Create a new social post"""
        payload = {
            "title": "TEST_Post for Growth Engine",
            "content": "This is a test post created by the testing agent #testing #automation",
            "platforms": ["twitter", "linkedin"],
            "content_type": "blog_promotion",
            "hashtags": ["test", "automation"]
        }
        
        response = requests.post(f"{API_BASE}/growth/social/posts", 
                                 headers=self.headers, json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "post" in data
        post = data["post"]
        assert post["title"] == "TEST_Post for Growth Engine"
        assert "twitter" in post["platforms"]
        assert "linkedin" in post["platforms"]
        
        # Store post ID for cleanup
        self.created_post_id = post["id"]
        print(f"✓ Created social post with ID: {post['id']}")
        
        # Clean up - delete the test post
        delete_response = requests.delete(
            f"{API_BASE}/growth/social/posts/{post['id']}", 
            headers=self.headers
        )
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test post")
    
    def test_social_create_scheduled_post(self):
        """Test creating a scheduled social post"""
        scheduled_time = (datetime.now() + timedelta(days=2)).isoformat()
        
        payload = {
            "title": "TEST_Scheduled Post",
            "content": "This is a scheduled test post",
            "platforms": ["facebook"],
            "content_type": "announcement",
            "scheduled_time": scheduled_time,
            "status": "scheduled"
        }
        
        response = requests.post(f"{API_BASE}/growth/social/posts", 
                                 headers=self.headers, json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["post"]["status"] in ["scheduled", "draft"]
        post_id = data["post"]["id"]
        print(f"✓ Created scheduled post with ID: {post_id}")
        
        # Clean up
        requests.delete(f"{API_BASE}/growth/social/posts/{post_id}", headers=self.headers)
    
    # ==================== CONTENT CALENDAR TESTS ====================
    
    def test_calendar_get_events(self):
        """Test GET /api/growth/calendar/events"""
        response = requests.get(f"{API_BASE}/growth/calendar/events", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "events" in data
        print(f"✓ Calendar events endpoint returned {len(data['events'])} events")
    
    def test_calendar_get_templates(self):
        """Test GET /api/growth/calendar/templates"""
        response = requests.get(f"{API_BASE}/growth/calendar/templates", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "templates" in data
        print(f"✓ Calendar templates endpoint returned {len(data['templates'])} templates")
    
    def test_calendar_get_stats(self):
        """Test GET /api/growth/calendar/stats"""
        response = requests.get(f"{API_BASE}/growth/calendar/stats", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "total_events" in data
        assert "upcoming_this_week" in data
        print(f"✓ Calendar stats returned: {data.get('total_events', 0)} total events")
    
    def test_calendar_create_recurring_event(self):
        """Test creating a recurring calendar event"""
        start_date = datetime.now() + timedelta(days=1)
        end_date = datetime.now() + timedelta(days=30)
        
        payload = {
            "title": "TEST_Weekly Blog Review",
            "description": "Weekly recurring content review meeting",
            "event_type": "blog",
            "scheduled_date": start_date.isoformat(),
            "status": "scheduled",
            "priority": "medium",
            "recurrence": "weekly",
            "recurrence_end_date": end_date.isoformat()
        }
        
        response = requests.post(f"{API_BASE}/growth/calendar/events", 
                                 headers=self.headers, json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True or "event" in data
        print(f"✓ Created recurring event successfully")
        
        # The event should have created multiple instances
        if "recurring_count" in data:
            print(f"  Created {data['recurring_count']} recurring instances")
    
    # ==================== AUTH REQUIRED TESTS ====================
    
    def test_unauthorized_access(self):
        """Test that endpoints require authentication"""
        endpoints = [
            "/growth/multilang/languages",
            "/growth/multilang/status",
            "/growth/social/platforms",
            "/growth/social/posts"
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{API_BASE}{endpoint}")
            assert response.status_code in [401, 403, 422], \
                f"Endpoint {endpoint} should require auth, got {response.status_code}"
        print(f"✓ All {len(endpoints)} endpoints properly require authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
