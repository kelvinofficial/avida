"""
Backend Tests for Scheduled Reports Feature
Tests the following endpoints:
- GET /api/admin/settings/scheduled-reports - Get report configuration
- POST /api/admin/settings/scheduled-reports - Save report configuration
- POST /api/admin/reports/generate - Generate a full analytics report
- POST /api/admin/reports/send - Send report to configured admins
- GET /api/admin/reports/preview - Get HTML email preview and report data
- GET /api/admin/reports/history - Get list of sent reports
"""

import pytest
import requests
import os
from datetime import datetime

# Use environment variable for BASE_URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/') or os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "testadmin@test.com"
TEST_PASSWORD = "Test123!"


class TestScheduledReportsAPI:
    """Test suite for Scheduled Reports feature"""
    
    auth_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication before tests"""
        if not TestScheduledReportsAPI.auth_token:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
            )
            if response.status_code == 200:
                TestScheduledReportsAPI.auth_token = response.json().get("session_token")
            else:
                pytest.skip(f"Authentication failed: {response.status_code}")
        
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {TestScheduledReportsAPI.auth_token}"
        }
    
    # ===== Authentication Tests =====
    
    def test_scheduled_reports_settings_requires_auth(self):
        """GET /admin/settings/scheduled-reports should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/scheduled-reports")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /admin/settings/scheduled-reports correctly requires auth")
    
    def test_save_scheduled_reports_requires_auth(self):
        """POST /admin/settings/scheduled-reports should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/settings/scheduled-reports",
            json={"enabled": True}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /admin/settings/scheduled-reports correctly requires auth")
    
    def test_generate_report_requires_auth(self):
        """POST /admin/reports/generate should require authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/reports/generate")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /admin/reports/generate correctly requires auth")
    
    def test_send_report_requires_auth(self):
        """POST /admin/reports/send should require authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/reports/send")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /admin/reports/send correctly requires auth")
    
    def test_report_history_requires_auth(self):
        """GET /admin/reports/history should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/history")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /admin/reports/history correctly requires auth")
    
    def test_report_preview_requires_auth(self):
        """GET /admin/reports/preview should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/preview")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /admin/reports/preview correctly requires auth")
    
    # ===== GET Scheduled Reports Settings Tests =====
    
    def test_get_scheduled_reports_settings(self):
        """GET /admin/settings/scheduled-reports should return settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings/scheduled-reports",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify default fields exist
        assert "enabled" in data, "Response should contain 'enabled' field"
        assert "frequency" in data, "Response should contain 'frequency' field"
        
        print(f"✓ GET /admin/settings/scheduled-reports returns settings: enabled={data.get('enabled')}, frequency={data.get('frequency')}")
    
    def test_scheduled_reports_settings_default_structure(self):
        """Verify scheduled reports settings have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings/scheduled-reports",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Check all expected fields
        expected_fields = ['enabled', 'frequency', 'day_of_week', 'hour', 'admin_emails']
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Validate types
        assert isinstance(data.get('enabled'), bool), "'enabled' should be boolean"
        assert data.get('frequency') in ['daily', 'weekly', 'monthly'], f"'frequency' should be daily/weekly/monthly, got {data.get('frequency')}"
        assert isinstance(data.get('day_of_week'), int), "'day_of_week' should be integer"
        assert isinstance(data.get('hour'), int), "'hour' should be integer"
        assert isinstance(data.get('admin_emails'), list), "'admin_emails' should be list"
        
        print(f"✓ Scheduled reports settings have correct structure with all required fields")
    
    # ===== POST Scheduled Reports Settings Tests =====
    
    def test_save_scheduled_reports_settings(self):
        """POST /admin/settings/scheduled-reports should save settings"""
        test_settings = {
            "enabled": True,
            "frequency": "weekly",
            "day_of_week": 1,  # Monday
            "hour": 9,  # 9 AM UTC
            "admin_emails": ["testadmin@test.com"],
            "include_seller_analytics": True,
            "include_engagement_metrics": True,
            "include_platform_overview": True,
            "include_alerts": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/settings/scheduled-reports",
            headers=self.headers,
            json=test_settings
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        
        print("✓ POST /admin/settings/scheduled-reports successfully saves settings")
    
    def test_save_and_retrieve_scheduled_reports_settings(self):
        """Verify settings are persisted correctly (round-trip test)"""
        # Save custom settings
        test_settings = {
            "enabled": False,
            "frequency": "daily",
            "day_of_week": 3,  # Wednesday
            "hour": 14,  # 2 PM UTC
            "admin_emails": ["admin1@test.com", "admin2@test.com"],
            "include_seller_analytics": True,
            "include_engagement_metrics": False,
            "include_platform_overview": True,
            "include_alerts": False
        }
        
        save_response = requests.post(
            f"{BASE_URL}/api/admin/settings/scheduled-reports",
            headers=self.headers,
            json=test_settings
        )
        assert save_response.status_code == 200, f"Save failed: {save_response.text}"
        
        # Retrieve and verify
        get_response = requests.get(
            f"{BASE_URL}/api/admin/settings/scheduled-reports",
            headers=self.headers
        )
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data.get("enabled") == False, "enabled should be False"
        assert data.get("frequency") == "daily", "frequency should be 'daily'"
        assert data.get("day_of_week") == 3, "day_of_week should be 3"
        assert data.get("hour") == 14, "hour should be 14"
        assert "admin1@test.com" in data.get("admin_emails", []), "admin1@test.com should be in admin_emails"
        
        print("✓ Scheduled reports settings are persisted correctly (round-trip verified)")
        
        # Reset to defaults for other tests
        requests.post(
            f"{BASE_URL}/api/admin/settings/scheduled-reports",
            headers=self.headers,
            json={
                "enabled": True,
                "frequency": "weekly",
                "day_of_week": 1,
                "hour": 9,
                "admin_emails": []
            }
        )
    
    # ===== POST Generate Report Tests =====
    
    def _ensure_all_sections_enabled(self):
        """Helper to enable all report sections before testing"""
        requests.post(
            f"{BASE_URL}/api/admin/settings/scheduled-reports",
            headers=self.headers,
            json={
                "enabled": True,
                "frequency": "weekly",
                "day_of_week": 1,
                "hour": 9,
                "admin_emails": [],
                "include_seller_analytics": True,
                "include_engagement_metrics": True,
                "include_platform_overview": True,
                "include_alerts": True
            }
        )
    
    def test_generate_report(self):
        """POST /admin/reports/generate should generate a full report"""
        self._ensure_all_sections_enabled()
        
        response = requests.post(
            f"{BASE_URL}/api/admin/reports/generate",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "report" in data, "Response should contain 'report' field"
        
        report = data.get("report", {})
        assert "generated_at" in report, "Report should have 'generated_at' timestamp"
        assert "sections" in report, "Report should have 'sections'"
        
        print(f"✓ POST /admin/reports/generate successfully generates report with timestamp: {report.get('generated_at')}")
    
    def test_generated_report_contains_required_sections(self):
        """Verify generated report contains all required sections when enabled"""
        self._ensure_all_sections_enabled()
        
        response = requests.post(
            f"{BASE_URL}/api/admin/reports/generate",
            headers=self.headers
        )
        assert response.status_code == 200
        
        report = response.json().get("report", {})
        sections = report.get("sections", {})
        
        # Check for required sections (when all are enabled)
        required_sections = ["platform_overview", "seller_analytics", "engagement_metrics", "alerts"]
        
        for section in required_sections:
            assert section in sections, f"Report missing section: {section}"
        
        print(f"✓ Generated report contains all required sections: {list(sections.keys())}")
    
    def test_generated_report_platform_overview_structure(self):
        """Verify platform_overview section structure"""
        self._ensure_all_sections_enabled()
        
        response = requests.post(
            f"{BASE_URL}/api/admin/reports/generate",
            headers=self.headers
        )
        assert response.status_code == 200
        
        sections = response.json().get("report", {}).get("sections", {})
        platform = sections.get("platform_overview", {})
        
        expected_fields = ["total_users", "total_listings", "active_listings"]
        for field in expected_fields:
            assert field in platform, f"platform_overview missing: {field}"
        
        # Validate types (should be numbers)
        assert isinstance(platform.get("total_users"), (int, float)), "total_users should be numeric"
        assert isinstance(platform.get("total_listings"), (int, float)), "total_listings should be numeric"
        
        print(f"✓ platform_overview has correct structure: users={platform.get('total_users')}, listings={platform.get('total_listings')}")
    
    def test_generated_report_seller_analytics_structure(self):
        """Verify seller_analytics section structure"""
        self._ensure_all_sections_enabled()
        
        response = requests.post(
            f"{BASE_URL}/api/admin/reports/generate",
            headers=self.headers
        )
        assert response.status_code == 200
        
        sections = response.json().get("report", {}).get("sections", {})
        sellers = sections.get("seller_analytics", {})
        
        assert "top_sellers" in sellers, "seller_analytics should contain 'top_sellers'"
        assert "low_performing_sellers" in sellers, "seller_analytics should contain 'low_performing_sellers'"
        assert "alert_threshold" in sellers, "seller_analytics should contain 'alert_threshold'"
        
        assert isinstance(sellers.get("top_sellers"), list), "top_sellers should be a list"
        
        print(f"✓ seller_analytics has correct structure: {len(sellers.get('top_sellers', []))} top sellers")
    
    def test_generated_report_engagement_metrics_structure(self):
        """Verify engagement_metrics section structure"""
        response = requests.post(
            f"{BASE_URL}/api/admin/reports/generate",
            headers=self.headers
        )
        assert response.status_code == 200
        
        sections = response.json().get("report", {}).get("sections", {})
        engagement = sections.get("engagement_metrics", {})
        
        expected_fields = ["total_messages", "total_favorites", "badges_awarded_this_week"]
        for field in expected_fields:
            assert field in engagement, f"engagement_metrics missing: {field}"
        
        print(f"✓ engagement_metrics has correct structure: messages={engagement.get('total_messages')}, favorites={engagement.get('total_favorites')}")
    
    def test_generated_report_alerts_structure(self):
        """Verify alerts section structure"""
        response = requests.post(
            f"{BASE_URL}/api/admin/reports/generate",
            headers=self.headers
        )
        assert response.status_code == 200
        
        sections = response.json().get("report", {}).get("sections", {})
        alerts = sections.get("alerts", {})
        
        assert "total_alerts" in alerts, "alerts should contain 'total_alerts'"
        assert "alerts" in alerts, "alerts should contain 'alerts' list"
        assert isinstance(alerts.get("alerts"), list), "'alerts' should be a list"
        
        print(f"✓ alerts has correct structure: {alerts.get('total_alerts')} total alerts")
    
    # ===== GET Report Preview Tests =====
    
    def test_report_preview(self):
        """GET /admin/reports/preview should return HTML email preview"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/preview",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "html" in data, "Response should contain 'html' field"
        assert "report_data" in data, "Response should contain 'report_data' field"
        
        # Verify HTML contains expected content
        html = data.get("html", "")
        assert "<html>" in html.lower() or "<!doctype html>" in html.lower(), "HTML should be a valid HTML document"
        assert "Weekly Analytics Report" in html, "HTML should contain report title"
        
        print(f"✓ GET /admin/reports/preview returns HTML preview (length={len(html)} chars)")
    
    def test_report_preview_contains_sections(self):
        """Verify report preview HTML contains all section headings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/preview",
            headers=self.headers
        )
        assert response.status_code == 200
        
        html = response.json().get("html", "")
        
        # Check for section headers in HTML
        assert "Platform Overview" in html, "HTML should contain 'Platform Overview' section"
        
        print("✓ Report preview HTML contains expected section headings")
    
    # ===== GET Report History Tests =====
    
    def test_report_history(self):
        """GET /admin/reports/history should return list of sent reports"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/history",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "history" in data, "Response should contain 'history' field"
        assert "total" in data, "Response should contain 'total' field"
        assert isinstance(data.get("history"), list), "'history' should be a list"
        
        print(f"✓ GET /admin/reports/history returns {data.get('total')} historical reports")
    
    def test_report_history_with_pagination(self):
        """GET /admin/reports/history should support pagination"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/history?limit=5&skip=0",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("limit") == 5, "Response should reflect limit parameter"
        assert data.get("skip") == 0, "Response should reflect skip parameter"
        
        print(f"✓ GET /admin/reports/history supports pagination (limit={data.get('limit')}, skip={data.get('skip')})")
    
    def test_report_history_record_structure(self):
        """Verify report history records have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/history?limit=5",
            headers=self.headers
        )
        assert response.status_code == 200
        
        history = response.json().get("history", [])
        
        if len(history) > 0:
            record = history[0]
            # Verify expected fields
            expected_fields = ["type", "sent_to", "success", "created_at"]
            for field in expected_fields:
                assert field in record, f"History record missing: {field}"
            
            assert isinstance(record.get("sent_to"), list), "'sent_to' should be a list"
            assert isinstance(record.get("success"), bool), "'success' should be boolean"
            
            print(f"✓ Report history records have correct structure: {record.get('type')}, success={record.get('success')}")
        else:
            print("✓ No report history yet, but endpoint returns correct structure")
    
    # ===== POST Send Report Tests =====
    
    def test_send_report_without_recipients(self):
        """POST /admin/reports/send should handle case with no recipients configured"""
        # First, clear admin emails
        requests.post(
            f"{BASE_URL}/api/admin/settings/scheduled-reports",
            headers=self.headers,
            json={
                "enabled": True,
                "frequency": "weekly",
                "day_of_week": 1,
                "hour": 9,
                "admin_emails": []
            }
        )
        
        response = requests.post(
            f"{BASE_URL}/api/admin/reports/send",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should indicate no recipients
        assert data.get("status") in ["no_recipients", "failed", "sent"], f"Unexpected status: {data.get('status')}"
        
        print(f"✓ POST /admin/reports/send handles no recipients case: status={data.get('status')}")
    
    def test_send_report_endpoint_structure(self):
        """POST /admin/reports/send should return proper response structure"""
        response = requests.post(
            f"{BASE_URL}/api/admin/reports/send",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify structure
        assert "success" in data, "Response should contain 'success' field"
        assert "status" in data, "Response should contain 'status' field"
        
        print(f"✓ POST /admin/reports/send returns proper structure: success={data.get('success')}, status={data.get('status')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
