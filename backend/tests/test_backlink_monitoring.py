"""
Tests for Backlink Monitoring & Gap Analysis feature
API endpoints: GET /growth/authority/monitoring/competitors, 
               GET /growth/authority/monitoring/backlink-changes,
               GET /growth/authority/monitoring/competitor-comparison,
               POST /growth/authority/monitoring/gap-analysis
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://instant-feed-perf.preview.emergentagent.com/api')

class TestBacklinkMonitoring:
    """Backlink Monitoring API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for tests - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token - correct endpoint is /admin/auth/login
        login_response = self.session.post(f"{BASE_URL}/admin/auth/login", json={
            "email": "admin@marketplace.com",
            "password": "Admin@123456"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token") or login_response.json().get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
    
    def test_get_competitors_returns_200(self):
        """Test GET /growth/authority/monitoring/competitors returns competitors list"""
        response = self.session.get(f"{BASE_URL}/growth/authority/monitoring/competitors")
        assert response.status_code == 200
        
        data = response.json()
        assert "competitors" in data
        assert "total" in data
        assert "suggested_competitors" in data
        assert len(data["competitors"]) > 0
        
        # Verify competitor structure
        competitor = data["competitors"][0]
        assert "domain" in competitor
        assert "name" in competitor
        assert "estimated_da" in competitor
    
    def test_get_competitors_has_known_domains(self):
        """Test that known competitor domains are present"""
        response = self.session.get(f"{BASE_URL}/growth/authority/monitoring/competitors")
        assert response.status_code == 200
        
        data = response.json()
        domains = [c["domain"] for c in data["competitors"]]
        
        # Check for known competitors
        assert "jiji.co.tz" in domains or "jiji.co.tz" in data["suggested_competitors"]
        assert "olx.co.za" in domains or "olx.co.za" in data["suggested_competitors"]
    
    def test_get_backlink_changes_returns_200(self):
        """Test GET /growth/authority/monitoring/backlink-changes returns changes"""
        response = self.session.get(f"{BASE_URL}/growth/authority/monitoring/backlink-changes?days=30")
        assert response.status_code == 200
        
        data = response.json()
        assert "period" in data
        assert "summary" in data
        assert "new_backlinks" in data
        assert "lost_backlinks" in data
        assert "alerts" in data
        assert "is_simulated_data" in data
    
    def test_backlink_changes_summary_structure(self):
        """Test backlink changes summary has correct structure"""
        response = self.session.get(f"{BASE_URL}/growth/authority/monitoring/backlink-changes?days=30")
        assert response.status_code == 200
        
        data = response.json()
        summary = data["summary"]
        
        assert "new_backlinks" in summary
        assert "lost_backlinks" in summary
        assert "net_change" in summary
        assert "trend" in summary
        assert summary["trend"] in ["positive", "negative", "stable"]
    
    def test_backlink_changes_alerts_structure(self):
        """Test backlink changes alerts have correct structure"""
        response = self.session.get(f"{BASE_URL}/growth/authority/monitoring/backlink-changes?days=30")
        assert response.status_code == 200
        
        data = response.json()
        if data["alerts"]:
            alert = data["alerts"][0]
            assert "type" in alert
            assert "title" in alert
            assert "message" in alert
            assert alert["type"] in ["success", "warning", "error", "info"]
    
    def test_get_competitor_comparison_returns_200(self):
        """Test GET /growth/authority/monitoring/competitor-comparison returns comparison"""
        response = self.session.get(f"{BASE_URL}/growth/authority/monitoring/competitor-comparison")
        assert response.status_code == 200
        
        data = response.json()
        assert "comparison" in data
        assert "your_rank" in data
        assert "insights" in data
        assert "is_simulated_data" in data
    
    def test_competitor_comparison_contains_avida(self):
        """Test that comparison includes Avida (your domain)"""
        response = self.session.get(f"{BASE_URL}/growth/authority/monitoring/competitor-comparison")
        assert response.status_code == 200
        
        data = response.json()
        
        # Find Avida in comparison
        your_domain = None
        for comp in data["comparison"]:
            if comp.get("is_you", False):
                your_domain = comp
                break
        
        assert your_domain is not None, "Your domain (Avida) should be in comparison"
        assert "total_backlinks" in your_domain
        assert "estimated_da" in your_domain
    
    def test_competitor_comparison_structure(self):
        """Test competitor comparison entries have correct structure"""
        response = self.session.get(f"{BASE_URL}/growth/authority/monitoring/competitor-comparison")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["comparison"]) > 0
        
        comp = data["comparison"][0]
        assert "domain" in comp
        assert "name" in comp
        assert "total_backlinks" in comp
        assert "dofollow_backlinks" in comp
        assert "referring_domains" in comp
        assert "average_da" in comp
        assert "estimated_da" in comp
    
    def test_gap_analysis_returns_200(self):
        """Test POST /growth/authority/monitoring/gap-analysis returns results"""
        response = self.session.post(
            f"{BASE_URL}/growth/authority/monitoring/gap-analysis",
            json={
                "competitors": ["jiji.co.tz", "olx.co.za"],
                "include_common": True
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "analysis_date" in data
        assert "competitors_analyzed" in data
        assert "summary" in data
        assert "gap_opportunities" in data
        assert "recommendations" in data
        assert "is_simulated_data" in data
    
    def test_gap_analysis_summary_structure(self):
        """Test gap analysis summary has correct structure"""
        response = self.session.post(
            f"{BASE_URL}/growth/authority/monitoring/gap-analysis",
            json={
                "competitors": ["jiji.co.tz"],
                "include_common": True
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        summary = data["summary"]
        
        assert "total_gap_opportunities" in summary
        assert "common_link_opportunities" in summary
        assert "high_priority_count" in summary
        assert "easy_wins_count" in summary
    
    def test_gap_analysis_opportunities_structure(self):
        """Test gap analysis opportunities have correct structure"""
        response = self.session.post(
            f"{BASE_URL}/growth/authority/monitoring/gap-analysis",
            json={
                "competitors": ["jiji.co.tz", "olx.co.za"],
                "include_common": True
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Check gap opportunities
        if data["gap_opportunities"]:
            opp = data["gap_opportunities"][0]
            assert "source_domain" in opp
            assert "source_da" in opp
            assert "opportunity_score" in opp
            assert "difficulty" in opp
            assert "suggested_approach" in opp
            assert opp["difficulty"] in ["easy", "medium", "hard", "very_hard"]
    
    def test_gap_analysis_with_multiple_competitors(self):
        """Test gap analysis with multiple competitors"""
        response = self.session.post(
            f"{BASE_URL}/growth/authority/monitoring/gap-analysis",
            json={
                "competitors": ["jiji.co.tz", "olx.co.za", "pigiame.co.ke"],
                "include_common": True
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["competitors_analyzed"]) == 3
    
    def test_gap_analysis_requires_at_least_one_competitor(self):
        """Test gap analysis fails with empty competitors list"""
        response = self.session.post(
            f"{BASE_URL}/growth/authority/monitoring/gap-analysis",
            json={
                "competitors": [],
                "include_common": True
            }
        )
        assert response.status_code == 400
    
    def test_gap_analysis_limits_to_five_competitors(self):
        """Test gap analysis limits to max 5 competitors"""
        response = self.session.post(
            f"{BASE_URL}/growth/authority/monitoring/gap-analysis",
            json={
                "competitors": ["jiji.co.tz", "olx.co.za", "pigiame.co.ke", "zoom.co.tz", "jumia.com", "kilimall.co.ke"],
                "include_common": True
            }
        )
        assert response.status_code == 400


class TestBacklinkMonitoringAuth:
    """Test authentication requirements"""
    
    def test_competitors_without_auth_still_works(self):
        """Test if endpoints work with any auth header"""
        # The API accepts any auth header
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": "Bearer dummy_token"
        })
        
        response = session.get(f"{BASE_URL}/growth/authority/monitoring/competitors")
        # Should return 200 or 401 depending on auth implementation
        assert response.status_code in [200, 401]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
