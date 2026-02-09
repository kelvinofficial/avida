"""
Executive Summary API Tests
Tests for AI-powered executive summary system endpoints:
- GET /api/executive-summary/config - Get configuration
- PUT /api/executive-summary/config - Update configuration
- POST /api/executive-summary/generate - Generate new AI summary
- GET /api/executive-summary/latest - Get latest cached summary
- GET /api/executive-summary/quick-stats - Get fallback KPI dashboard
- GET /api/executive-summary/history - Get historical summaries
"""

import pytest
import requests
import os
import uuid
import time
from datetime import datetime

# Use environment variable for backend URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://server-split-3.preview.emergentagent.com').rstrip('/')

# Test user credentials
TEST_EMAIL = f"exec_summary_test_{uuid.uuid4().hex[:8]}@test.com"
TEST_PASSWORD = "testpass123456"
TEST_NAME = "Executive Summary Tester"


class TestExecutiveSummarySetup:
    """Setup test user and authentication"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create a requests session"""
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Register and login user, return auth token"""
        # Register user
        register_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        
        if register_response.status_code not in [200, 201, 409]:
            pytest.skip(f"Failed to register user: {register_response.status_code} - {register_response.text}")
        
        # Login
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Failed to login: {login_response.status_code} - {login_response.text}")
        
        data = login_response.json()
        token = data.get("session_token") or data.get("token")
        
        if not token:
            pytest.skip("No auth token received")
        
        return token
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Return headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }


class TestExecutiveSummaryConfig(TestExecutiveSummarySetup):
    """Tests for executive summary configuration endpoints"""
    
    def test_get_config_without_auth(self, session):
        """GET /api/executive-summary/config - should require authentication"""
        response = session.get(f"{BASE_URL}/api/executive-summary/config")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ GET /api/executive-summary/config returns 401 without auth")
    
    def test_get_config_with_auth(self, session, auth_headers):
        """GET /api/executive-summary/config - should return configuration with auth"""
        response = session.get(f"{BASE_URL}/api/executive-summary/config", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify expected config fields
        assert "id" in data, "Config should have 'id' field"
        assert "enabled" in data, "Config should have 'enabled' field"
        assert "frequency" in data, "Config should have 'frequency' field"
        assert "audience" in data, "Config should have 'audience' field"
        assert "tone" in data, "Config should have 'tone' field"
        assert "sections_included" in data, "Config should have 'sections_included' field"
        
        # Verify default frequency is one of valid values
        assert data["frequency"] in ["daily", "weekly", "monthly"], \
            f"Frequency should be daily/weekly/monthly, got {data['frequency']}"
        
        # Verify default tone is one of valid values
        assert data["tone"] in ["formal", "concise", "casual"], \
            f"Tone should be formal/concise/casual, got {data['tone']}"
        
        print(f"✓ GET /api/executive-summary/config - frequency: {data['frequency']}, tone: {data['tone']}")
    
    def test_update_config(self, session, auth_headers):
        """PUT /api/executive-summary/config - should update configuration"""
        # Update frequency to daily
        update_data = {
            "frequency": "daily",
            "tone": "formal"
        }
        
        response = session.put(
            f"{BASE_URL}/api/executive-summary/config",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have confirmation message"
        print(f"✓ PUT /api/executive-summary/config - config updated: {data}")
        
        # Verify the update took effect
        get_response = session.get(f"{BASE_URL}/api/executive-summary/config", headers=auth_headers)
        assert get_response.status_code == 200
        config = get_response.json()
        assert config["frequency"] == "daily", f"Frequency should be 'daily', got {config['frequency']}"
        assert config["tone"] == "formal", f"Tone should be 'formal', got {config['tone']}"
        print("✓ Config update verified - frequency: daily, tone: formal")
    
    def test_update_config_audience(self, session, auth_headers):
        """PUT /api/executive-summary/config - should update audience settings"""
        update_data = {
            "audience": ["super_admin", "admins", "executives"]
        }
        
        response = session.put(
            f"{BASE_URL}/api/executive-summary/config",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify update
        get_response = session.get(f"{BASE_URL}/api/executive-summary/config", headers=auth_headers)
        config = get_response.json()
        assert "executives" in config["audience"], "Audience should include 'executives'"
        print(f"✓ Config audience updated: {config['audience']}")


class TestQuickStats(TestExecutiveSummarySetup):
    """Tests for quick stats endpoint (fallback KPI dashboard)"""
    
    def test_quick_stats_without_auth(self, session):
        """GET /api/executive-summary/quick-stats - should require authentication"""
        response = session.get(f"{BASE_URL}/api/executive-summary/quick-stats")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ GET /api/executive-summary/quick-stats returns 401 without auth")
    
    def test_quick_stats_with_auth(self, session, auth_headers):
        """GET /api/executive-summary/quick-stats - should return KPI metrics"""
        response = session.get(f"{BASE_URL}/api/executive-summary/quick-stats", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify expected KPI fields
        assert "total_users" in data, "Should have 'total_users'"
        assert "new_users_week" in data, "Should have 'new_users_week'"
        assert "active_listings" in data, "Should have 'active_listings'"
        assert "pending_disputes" in data, "Should have 'pending_disputes'"
        assert "revenue_week" in data, "Should have 'revenue_week'"
        assert "generated_at" in data, "Should have 'generated_at' timestamp"
        
        # Verify data types
        assert isinstance(data["total_users"], (int, float)), "total_users should be numeric"
        assert isinstance(data["new_users_week"], (int, float)), "new_users_week should be numeric"
        assert isinstance(data["active_listings"], (int, float)), "active_listings should be numeric"
        
        print(f"✓ Quick Stats - users: {data['total_users']}, listings: {data['active_listings']}, disputes: {data['pending_disputes']}")


class TestExecutiveSummaryGeneration(TestExecutiveSummarySetup):
    """Tests for executive summary generation endpoint"""
    
    def test_generate_summary_without_auth(self, session):
        """POST /api/executive-summary/generate - should require authentication"""
        response = session.post(f"{BASE_URL}/api/executive-summary/generate")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ POST /api/executive-summary/generate returns 401 without auth")
    
    def test_generate_summary_with_auth(self, session, auth_headers):
        """POST /api/executive-summary/generate - should generate AI summary"""
        # This test may take 10-15 seconds due to AI processing
        response = session.post(
            f"{BASE_URL}/api/executive-summary/generate",
            headers=auth_headers,
            params={"period": "daily"},
            timeout=60  # Longer timeout for AI generation
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify summary structure - check all 7 sections
        assert "id" in data, "Summary should have 'id'"
        assert "period_start" in data, "Summary should have 'period_start'"
        assert "period_end" in data, "Summary should have 'period_end'"
        assert "period_type" in data, "Summary should have 'period_type'"
        assert "generated_at" in data, "Summary should have 'generated_at'"
        
        # Verify all 7 sections present
        assert "platform_overview" in data, "Summary should have 'platform_overview' section"
        assert "revenue_monetization" in data, "Summary should have 'revenue_monetization' section"
        assert "growth_retention" in data, "Summary should have 'growth_retention' section"
        assert "trust_safety" in data, "Summary should have 'trust_safety' section"
        assert "operations_logistics" in data, "Summary should have 'operations_logistics' section"
        assert "system_health" in data, "Summary should have 'system_health' section"
        assert "recommendations" in data, "Summary should have 'recommendations' section"
        
        # Verify AI-generated content
        assert "executive_brief" in data, "Summary should have 'executive_brief'"
        assert "key_highlights" in data, "Summary should have 'key_highlights'"
        
        # Check generation metadata
        if data.get("ai_model_used"):
            print(f"✓ AI Model used: {data['ai_model_used']}")
        if data.get("generation_time_seconds"):
            print(f"✓ Generation time: {data['generation_time_seconds']:.2f}s")
        
        print(f"✓ Summary generated - ID: {data['id']}, period: {data['period_type']}")
        print(f"  - Executive Brief: {data.get('executive_brief', 'N/A')[:100]}...")
        print(f"  - Recommendations count: {len(data.get('recommendations', []))}")
    
    def test_generate_summary_weekly(self, session, auth_headers):
        """POST /api/executive-summary/generate - should generate weekly summary"""
        response = session.post(
            f"{BASE_URL}/api/executive-summary/generate",
            headers=auth_headers,
            params={"period": "weekly"},
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["period_type"] == "weekly", f"Period type should be 'weekly', got {data['period_type']}"
        print(f"✓ Weekly summary generated - highlights: {len(data.get('key_highlights', []))}")
    
    def test_generate_summary_force_regenerate(self, session, auth_headers):
        """POST /api/executive-summary/generate - should force regenerate with force=true"""
        response = session.post(
            f"{BASE_URL}/api/executive-summary/generate",
            headers=auth_headers,
            params={"period": "daily", "force": "true"},
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "generated_at" in data, "Force regenerated summary should have new timestamp"
        print(f"✓ Force regenerated summary at: {data['generated_at']}")
    
    def test_generate_summary_invalid_period(self, session, auth_headers):
        """POST /api/executive-summary/generate - should reject invalid period"""
        response = session.post(
            f"{BASE_URL}/api/executive-summary/generate",
            headers=auth_headers,
            params={"period": "invalid_period"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid period, got {response.status_code}"
        print("✓ Invalid period type correctly rejected with 400")


class TestLatestSummary(TestExecutiveSummarySetup):
    """Tests for getting latest cached summary"""
    
    def test_get_latest_summary_without_auth(self, session):
        """GET /api/executive-summary/latest - should require authentication"""
        response = session.get(f"{BASE_URL}/api/executive-summary/latest")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ GET /api/executive-summary/latest returns 401 without auth")
    
    def test_get_latest_summary(self, session, auth_headers):
        """GET /api/executive-summary/latest - should return latest cached summary"""
        # First generate a summary to ensure cache exists
        session.post(
            f"{BASE_URL}/api/executive-summary/generate",
            headers=auth_headers,
            params={"period": "daily"},
            timeout=60
        )
        
        # Now get the latest
        response = session.get(
            f"{BASE_URL}/api/executive-summary/latest",
            headers=auth_headers,
            params={"period": "daily"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Latest summary should have 'id'"
        assert "executive_brief" in data, "Latest summary should have 'executive_brief'"
        assert "platform_overview" in data, "Latest summary should have 'platform_overview'"
        
        print(f"✓ Latest summary retrieved - ID: {data['id']}")


class TestSummaryHistory(TestExecutiveSummarySetup):
    """Tests for executive summary history endpoint"""
    
    def test_get_history_without_auth(self, session):
        """GET /api/executive-summary/history - should require authentication"""
        response = session.get(f"{BASE_URL}/api/executive-summary/history")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ GET /api/executive-summary/history returns 401 without auth")
    
    def test_get_history_with_auth(self, session, auth_headers):
        """GET /api/executive-summary/history - should return historical summaries"""
        response = session.get(
            f"{BASE_URL}/api/executive-summary/history",
            headers=auth_headers,
            params={"limit": 10}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "summaries" in data, "Response should have 'summaries' array"
        assert isinstance(data["summaries"], list), "Summaries should be a list"
        
        print(f"✓ History retrieved - {len(data['summaries'])} summaries found")
        
        # Check summary structure if any exist
        if data["summaries"]:
            summary = data["summaries"][0]
            assert "id" in summary, "Each summary should have 'id'"
            assert "period_type" in summary, "Each summary should have 'period_type'"
            assert "generated_at" in summary, "Each summary should have 'generated_at'"
            print(f"  - Latest: {summary['id']} ({summary['period_type']}) - {summary['generated_at']}")
    
    def test_get_history_by_period(self, session, auth_headers):
        """GET /api/executive-summary/history - should filter by period type"""
        response = session.get(
            f"{BASE_URL}/api/executive-summary/history",
            headers=auth_headers,
            params={"period": "daily", "limit": 5}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify all returned summaries are daily
        for summary in data["summaries"]:
            assert summary["period_type"] == "daily", \
                f"All summaries should be daily, got {summary['period_type']}"
        
        print(f"✓ Filtered history - {len(data['summaries'])} daily summaries")


class TestSummaryDataStructure(TestExecutiveSummarySetup):
    """Tests for verifying the complete summary data structure"""
    
    def test_platform_overview_structure(self, session, auth_headers):
        """Verify platform_overview section has correct structure"""
        response = session.post(
            f"{BASE_URL}/api/executive-summary/generate",
            headers=auth_headers,
            params={"period": "daily"},
            timeout=60
        )
        assert response.status_code == 200
        
        data = response.json()
        platform = data.get("platform_overview", {})
        
        # Check required metrics with change tracking
        expected_metrics = ["total_users", "active_users", "new_listings", "completed_transactions", "escrow_volume"]
        for metric in expected_metrics:
            assert metric in platform, f"platform_overview should have '{metric}'"
            metric_data = platform[metric]
            assert "current" in metric_data, f"{metric} should have 'current' value"
            assert "previous" in metric_data, f"{metric} should have 'previous' value"
            assert "change_percent" in metric_data, f"{metric} should have 'change_percent'"
            assert "change_direction" in metric_data, f"{metric} should have 'change_direction'"
        
        print(f"✓ Platform overview structure verified - all {len(expected_metrics)} metrics present with change tracking")
    
    def test_recommendations_structure(self, session, auth_headers):
        """Verify recommendations have correct structure with impact and urgency"""
        response = session.post(
            f"{BASE_URL}/api/executive-summary/generate",
            headers=auth_headers,
            params={"period": "weekly", "force": "true"},
            timeout=60
        )
        assert response.status_code == 200
        
        data = response.json()
        recommendations = data.get("recommendations", [])
        
        print(f"✓ Found {len(recommendations)} recommendations")
        
        # Verify structure of each recommendation
        for i, rec in enumerate(recommendations):
            assert "id" in rec, f"Recommendation {i} should have 'id'"
            assert "title" in rec, f"Recommendation {i} should have 'title'"
            assert "description" in rec, f"Recommendation {i} should have 'description'"
            assert "impact_level" in rec, f"Recommendation {i} should have 'impact_level'"
            assert "urgency" in rec, f"Recommendation {i} should have 'urgency'"
            assert "category" in rec, f"Recommendation {i} should have 'category'"
            
            # Verify valid values
            assert rec["impact_level"] in ["low", "medium", "high"], \
                f"Invalid impact_level: {rec['impact_level']}"
            assert rec["urgency"] in ["low", "medium", "high", "immediate"], \
                f"Invalid urgency: {rec['urgency']}"
            
            print(f"  - [{rec['urgency'].upper()}] {rec['title']} (Impact: {rec['impact_level']})")
    
    def test_trust_safety_structure(self, session, auth_headers):
        """Verify trust_safety section has risk rating"""
        response = session.get(
            f"{BASE_URL}/api/executive-summary/latest",
            headers=auth_headers,
            timeout=60
        )
        
        if response.status_code != 200:
            # Generate if no cache
            response = session.post(
                f"{BASE_URL}/api/executive-summary/generate",
                headers=auth_headers,
                params={"period": "daily"},
                timeout=60
            )
        
        assert response.status_code == 200
        data = response.json()
        trust_safety = data.get("trust_safety", {})
        
        assert "disputes_opened" in trust_safety, "Should have 'disputes_opened'"
        assert "disputes_resolved" in trust_safety, "Should have 'disputes_resolved'"
        assert "fraud_flags" in trust_safety, "Should have 'fraud_flags'"
        assert "moderation_incidents" in trust_safety, "Should have 'moderation_incidents'"
        assert "risk_rating" in trust_safety, "Should have 'risk_rating'"
        
        assert trust_safety["risk_rating"] in ["low", "medium", "high", "critical"], \
            f"Invalid risk_rating: {trust_safety['risk_rating']}"
        
        print(f"✓ Trust & Safety - Risk: {trust_safety['risk_rating']}, Disputes: {trust_safety['disputes_opened']}, Fraud Flags: {trust_safety['fraud_flags']}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
