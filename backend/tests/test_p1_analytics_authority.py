"""
P1 Enhancement Tests: Analytics Settings Dashboard + Authority Building System
Tests new analytics dashboard views (traffic overview, sources, geo, AI citations, settings)
and authority building features (opportunity suggestions, competitor analysis, health score)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://loader-less-launch.preview.emergentagent.com/api')


class TestAnalyticsSettingsAPIs:
    """Test Analytics Settings Dashboard APIs with demo data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth headers"""
        self.headers = {"Content-Type": "application/json"}
        # Login to get token
        login_response = requests.post(
            f"{BASE_URL}/admin/auth/login",
            json={"email": "admin@marketplace.com", "password": "Admin@123456"},
            headers=self.headers
        )
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.headers["Authorization"] = f"Bearer {token}"
        else:
            pytest.skip("Admin login failed - skipping analytics tests")
    
    def test_dashboard_summary_endpoint(self):
        """Test GET /api/growth/analytics-settings/dashboard-summary"""
        response = requests.get(
            f"{BASE_URL}/growth/analytics-settings/dashboard-summary",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify overview metrics
        assert "overview" in data
        assert "total_users" in data["overview"]
        assert "total_sessions" in data["overview"]
        assert "total_pageviews" in data["overview"]
        assert "avg_bounce_rate" in data["overview"]
        assert "avg_session_duration" in data["overview"]
        
        # Verify top sources
        assert "top_sources" in data
        assert isinstance(data["top_sources"], list)
        if data["top_sources"]:
            assert "source" in data["top_sources"][0]
            assert "sessions" in data["top_sources"][0]
        
        # Verify AI traffic data
        assert "ai_traffic" in data
        assert "total" in data["ai_traffic"]
        assert "aeo_score" in data["ai_traffic"]
        
        # Verify demo data flag
        assert data.get("is_demo_data") == True
        print(f"Dashboard summary: {data['overview']['total_users']} users, {data['overview']['total_pageviews']} pageviews")
    
    def test_traffic_overview_endpoint(self):
        """Test GET /api/growth/analytics-settings/traffic-overview"""
        response = requests.get(
            f"{BASE_URL}/growth/analytics-settings/traffic-overview?days=30",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify summary
        assert "summary" in data
        assert data["summary"]["total_users"] > 0
        assert data["summary"]["total_sessions"] > 0
        
        # Verify daily data
        assert "daily" in data
        assert isinstance(data["daily"], list)
        assert len(data["daily"]) == 30  # Should have 30 days of data
        
        # Verify daily data structure
        if data["daily"]:
            day = data["daily"][0]
            assert "date" in day
            assert "users" in day
            assert "sessions" in day
            assert "pageviews" in day
        
        assert data.get("is_demo_data") == True
        print(f"Traffic overview: {len(data['daily'])} days, {data['summary']['total_users']} total users")
    
    def test_traffic_sources_endpoint(self):
        """Test GET /api/growth/analytics-settings/traffic-sources"""
        response = requests.get(
            f"{BASE_URL}/growth/analytics-settings/traffic-sources",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "sources" in data
        assert isinstance(data["sources"], list)
        assert len(data["sources"]) > 0
        
        # Check source structure
        source = data["sources"][0]
        assert "source" in source
        assert "medium" in source
        assert "sessions" in source
        assert "users" in source
        assert "bounce_rate" in source
        
        # Verify common sources are present
        source_names = [s["source"] for s in data["sources"]]
        assert "google" in source_names or "direct" in source_names
        
        assert data.get("is_demo_data") == True
        print(f"Traffic sources: {len(data['sources'])} sources, top: {data['sources'][0]['source']}")
    
    def test_geo_data_endpoint(self):
        """Test GET /api/growth/analytics-settings/geo-data (Geographic data)"""
        response = requests.get(
            f"{BASE_URL}/growth/analytics-settings/geo-data",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "countries" in data
        assert isinstance(data["countries"], list)
        assert len(data["countries"]) > 0
        
        # Check country structure
        country = data["countries"][0]
        assert "country" in country
        assert "country_code" in country
        assert "users" in country
        assert "sessions" in country
        
        # Verify target markets (TZ, KE, DE should be present)
        country_codes = [c["country_code"] for c in data["countries"]]
        assert any(code in country_codes for code in ["TZ", "KE", "DE"])
        
        assert data.get("is_demo_data") == True
        print(f"Geo data: {len(data['countries'])} countries, top: {data['countries'][0]['country']}")
    
    def test_ai_citations_endpoint(self):
        """Test GET /api/growth/analytics-settings/ai-citations (AEO metrics)"""
        response = requests.get(
            f"{BASE_URL}/growth/analytics-settings/ai-citations",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_ai_traffic" in data
        assert "ai_traffic_growth" in data
        assert "citations_by_source" in data
        assert "aeo_score" in data
        
        # Verify citations by source
        assert isinstance(data["citations_by_source"], list)
        if data["citations_by_source"]:
            citation = data["citations_by_source"][0]
            assert "source" in citation
            assert "referrals" in citation
            assert "icon" in citation
        
        # Verify top cited content
        assert "top_cited_content" in data
        
        assert data.get("is_demo_data") == True
        print(f"AI citations: {data['total_ai_traffic']} total, AEO score: {data['aeo_score']}")
    
    def test_analytics_settings_crud(self):
        """Test GET and PUT /api/growth/analytics-settings"""
        # GET settings
        response = requests.get(
            f"{BASE_URL}/growth/analytics-settings",
            headers=self.headers
        )
        assert response.status_code == 200
        
        settings = response.json()
        assert "ga4_enabled" in settings
        assert "track_page_views" in settings
        
        # PUT settings with valid GA4 ID
        test_settings = {
            "ga4_measurement_id": "G-TEST123456",
            "ga4_enabled": True,
            "track_page_views": True,
            "track_blog_reads": True,
            "track_listing_views": True,
            "track_conversions": True,
            "anonymize_ip": True,
            "demo_mode": True
        }
        
        response = requests.put(
            f"{BASE_URL}/growth/analytics-settings",
            headers=self.headers,
            json=test_settings
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        print("Analytics settings: GET and PUT working")
    
    def test_invalid_ga4_id_rejected(self):
        """Test PUT /api/growth/analytics-settings rejects invalid GA4 ID"""
        invalid_settings = {
            "ga4_measurement_id": "INVALID-ID",
            "ga4_enabled": True
        }
        
        response = requests.put(
            f"{BASE_URL}/growth/analytics-settings",
            headers=self.headers,
            json=invalid_settings
        )
        assert response.status_code == 400
        print("Invalid GA4 ID correctly rejected")


class TestAuthorityBuildingAPIs:
    """Test Authority Building System APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth headers"""
        self.headers = {"Content-Type": "application/json"}
        # Login to get token
        login_response = requests.post(
            f"{BASE_URL}/admin/auth/login",
            json={"email": "admin@marketplace.com", "password": "Admin@123456"},
            headers=self.headers
        )
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.headers["Authorization"] = f"Bearer {token}"
        else:
            pytest.skip("Admin login failed - skipping authority tests")
    
    def test_backlink_opportunities_endpoint(self):
        """Test GET /api/growth/authority/suggestions/backlink-opportunities"""
        response = requests.get(
            f"{BASE_URL}/growth/authority/suggestions/backlink-opportunities",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "opportunities" in data
        assert isinstance(data["opportunities"], list)
        assert len(data["opportunities"]) > 0
        
        # Check opportunity structure
        opp = data["opportunities"][0]
        assert "domain" in opp
        assert "da" in opp  # Domain Authority
        assert "type" in opp
        assert "region" in opp
        
        # Verify target regions are included
        assert "target_regions" in data
        assert "TZ" in data["target_regions"]
        
        print(f"Backlink opportunities: {len(data['opportunities'])} found")
    
    def test_backlink_opportunities_by_region(self):
        """Test GET /api/growth/authority/suggestions/backlink-opportunities?region=TZ"""
        response = requests.get(
            f"{BASE_URL}/growth/authority/suggestions/backlink-opportunities?region=TZ",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "opportunities" in data
        
        # Verify all or most opportunities are from TZ or GLOBAL
        for opp in data["opportunities"]:
            assert opp["region"] in ["TZ", "GLOBAL"], f"Expected TZ or GLOBAL, got {opp['region']}"
        
        print(f"Region-specific opportunities: {len(data['opportunities'])} for TZ")
    
    def test_pr_opportunities_endpoint(self):
        """Test GET /api/growth/authority/suggestions/pr-opportunities"""
        response = requests.get(
            f"{BASE_URL}/growth/authority/suggestions/pr-opportunities",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "categories" in data
        assert "recommendations" in data
        assert "pitch_calendar" in data
        
        # Verify PR categories
        assert isinstance(data["categories"], list)
        assert len(data["categories"]) > 0
        category = data["categories"][0]
        assert "category" in category
        assert "description" in category
        
        # Verify recommendations
        assert isinstance(data["recommendations"], list)
        if data["recommendations"]:
            rec = data["recommendations"][0]
            assert "title" in rec
            assert "description" in rec
            assert "estimated_impact" in rec
        
        # Verify pitch calendar
        assert "Q1" in data["pitch_calendar"]
        
        print(f"PR opportunities: {len(data['categories'])} categories, {len(data['recommendations'])} recommendations")
    
    def test_competitor_backlinks_analysis(self):
        """Test POST /api/growth/authority/analyze/competitor-backlinks"""
        response = requests.post(
            f"{BASE_URL}/growth/authority/analyze/competitor-backlinks?competitor_domain=jiji.co.tz",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "competitor" in data
        assert "total_backlinks" in data
        assert "backlinks" in data
        assert "opportunities" in data
        assert "summary" in data
        
        # Verify competitor domain
        assert data["competitor"] == "jiji.co.tz"
        
        # Verify summary metrics
        assert "dofollow_count" in data["summary"]
        assert "avg_domain_authority" in data["summary"]
        
        # Verify backlinks data
        assert isinstance(data["backlinks"], list)
        if data["backlinks"]:
            bl = data["backlinks"][0]
            assert "source_domain" in bl
            assert "domain_authority" in bl
            assert "link_type" in bl
        
        # Verify it's simulated
        assert data.get("is_simulated_data") == True
        
        print(f"Competitor analysis: {data['competitor']} - {data['total_backlinks']} backlinks, {len(data['opportunities'])} opportunities")
    
    def test_domain_authority_check(self):
        """Test POST /api/growth/authority/analyze/domain-authority"""
        response = requests.post(
            f"{BASE_URL}/growth/authority/analyze/domain-authority?domain=techcrunch.com",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "domain" in data
        assert "domain_authority" in data
        assert "quality_rating" in data
        assert "recommendation" in data
        
        assert data["domain"] == "techcrunch.com"
        assert data["domain_authority"] >= 80  # techcrunch should have high DA
        assert data.get("is_simulated_data") == True
        
        print(f"Domain authority check: {data['domain']} - DA {data['domain_authority']}")
    
    def test_health_score_endpoint(self):
        """Test GET /api/growth/authority/insights/health-score"""
        response = requests.get(
            f"{BASE_URL}/growth/authority/insights/health-score",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "overall_score" in data
        assert "grade" in data
        assert "components" in data
        assert "stats" in data
        assert "recommendations" in data
        
        # Verify grade is valid
        assert data["grade"] in ["A", "B", "C", "D"]
        
        # Verify overall score is between 0-100
        assert 0 <= data["overall_score"] <= 100
        
        # Verify components
        components = data["components"]
        assert "campaign_activity" in components
        assert "outreach_volume" in components
        assert "backlink_quantity" in components
        
        # Verify stats
        stats = data["stats"]
        assert "active_campaigns" in stats
        assert "total_contacts" in stats
        assert "active_backlinks" in stats
        
        # Verify recommendations
        assert isinstance(data["recommendations"], list)
        if data["recommendations"]:
            rec = data["recommendations"][0]
            assert "priority" in rec
            assert "action" in rec
        
        print(f"Health score: {data['overall_score']} (Grade {data['grade']})")
    
    def test_authority_dashboard_endpoint(self):
        """Test GET /api/growth/authority/dashboard"""
        response = requests.get(
            f"{BASE_URL}/growth/authority/dashboard",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "campaigns" in data
        assert "outreach" in data
        assert "backlinks" in data
        
        # Verify campaigns stats
        assert "total" in data["campaigns"]
        assert "active" in data["campaigns"]
        
        # Verify outreach stats
        assert "total_contacts" in data["outreach"]
        assert "by_status" in data["outreach"]
        
        # Verify backlinks stats
        assert "total" in data["backlinks"]
        
        print(f"Authority dashboard: {data['campaigns']['total']} campaigns, {data['outreach']['total_contacts']} contacts")
    
    def test_campaign_crud_flow(self):
        """Test full campaign CRUD flow"""
        campaign_name = f"TEST_Campaign_{uuid.uuid4().hex[:6]}"
        
        # CREATE campaign
        create_response = requests.post(
            f"{BASE_URL}/growth/authority/campaigns",
            headers=self.headers,
            json={
                "name": campaign_name,
                "description": "Test campaign for API testing",
                "campaign_type": "link_building",
                "status": "active",
                "target_region": "TZ"
            }
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        
        data = create_response.json()
        assert data.get("success") == True
        campaign_id = data["campaign"]["id"]
        
        # GET campaigns list
        list_response = requests.get(
            f"{BASE_URL}/growth/authority/campaigns",
            headers=self.headers
        )
        assert list_response.status_code == 200
        campaigns = list_response.json().get("campaigns", [])
        assert any(c["id"] == campaign_id for c in campaigns)
        
        # GET single campaign
        get_response = requests.get(
            f"{BASE_URL}/growth/authority/campaigns/{campaign_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        
        # DELETE campaign
        delete_response = requests.delete(
            f"{BASE_URL}/growth/authority/campaigns/{campaign_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200
        
        print(f"Campaign CRUD flow passed: {campaign_name}")
    
    def test_templates_endpoint(self):
        """Test GET /api/growth/authority/templates returns default templates"""
        response = requests.get(
            f"{BASE_URL}/growth/authority/templates",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "templates" in data
        assert isinstance(data["templates"], list)
        
        # Should have default templates
        if data["templates"]:
            template = data["templates"][0]
            assert "name" in template
            assert "template_type" in template
            assert "subject" in template
            assert "body" in template
        
        print(f"Templates: {len(data['templates'])} available")


class TestAuthenticationRequired:
    """Verify endpoints require authentication"""
    
    def test_analytics_endpoints_require_auth(self):
        """Test analytics endpoints return 401 without auth"""
        endpoints = [
            "/growth/analytics-settings/dashboard-summary",
            "/growth/analytics-settings/traffic-overview",
            "/growth/analytics-settings/traffic-sources",
            "/growth/analytics-settings/geo-data",
            "/growth/analytics-settings/ai-citations",
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 401, f"{endpoint} should require auth, got {response.status_code}"
        
        print("Analytics endpoints correctly require authentication")
    
    def test_authority_endpoints_require_auth(self):
        """Test authority endpoints return 401 without auth"""
        endpoints = [
            "/growth/authority/suggestions/backlink-opportunities",
            "/growth/authority/suggestions/pr-opportunities",
            "/growth/authority/insights/health-score",
            "/growth/authority/dashboard",
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 401, f"{endpoint} should require auth, got {response.status_code}"
        
        print("Authority endpoints correctly require authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
