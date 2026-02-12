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
from datetime import datetime

# Use environment variable for backend URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://classifieds-dynamic.preview.emergentagent.com').rstrip('/')

# Module-level session and auth token
_auth_session = None
_auth_token = None
_test_email = f"exec_summary_test_{uuid.uuid4().hex[:8]}@test.com"
_test_password = "testpass123456"
_test_name = "Executive Summary Tester"


def get_auth_session():
    """Get or create authenticated session"""
    global _auth_session, _auth_token
    
    if _auth_session is None:
        _auth_session = requests.Session()
        
        # Register user
        _auth_session.post(f"{BASE_URL}/api/auth/register", json={
            "email": _test_email,
            "password": _test_password,
            "name": _test_name
        })
        
        # Login
        login_response = _auth_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": _test_email,
            "password": _test_password
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            _auth_token = data.get("session_token") or data.get("token")
    
    return _auth_session


def get_auth_headers():
    """Get auth headers"""
    get_auth_session()  # Ensure session is created
    if _auth_token:
        return {"Authorization": f"Bearer {_auth_token}", "Content-Type": "application/json"}
    return {}


def get_unauthenticated_session():
    """Get a fresh session without authentication"""
    return requests.Session()


# =============================================================================
# Authentication Tests
# =============================================================================

class TestAuthenticationRequired:
    """Tests to verify all endpoints require authentication"""
    
    def test_config_requires_auth(self):
        """GET /api/executive-summary/config - should require authentication"""
        session = get_unauthenticated_session()
        response = session.get(f"{BASE_URL}/api/executive-summary/config")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: GET /api/executive-summary/config returns 401 without auth")
    
    def test_quick_stats_requires_auth(self):
        """GET /api/executive-summary/quick-stats - should require authentication"""
        session = get_unauthenticated_session()
        response = session.get(f"{BASE_URL}/api/executive-summary/quick-stats")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: GET /api/executive-summary/quick-stats returns 401 without auth")
    
    def test_generate_requires_auth(self):
        """POST /api/executive-summary/generate - should require authentication"""
        session = get_unauthenticated_session()
        response = session.post(f"{BASE_URL}/api/executive-summary/generate")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: POST /api/executive-summary/generate returns 401 without auth")
    
    def test_latest_requires_auth(self):
        """GET /api/executive-summary/latest - should require authentication"""
        session = get_unauthenticated_session()
        response = session.get(f"{BASE_URL}/api/executive-summary/latest")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: GET /api/executive-summary/latest returns 401 without auth")
    
    def test_history_requires_auth(self):
        """GET /api/executive-summary/history - should require authentication"""
        session = get_unauthenticated_session()
        response = session.get(f"{BASE_URL}/api/executive-summary/history")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: GET /api/executive-summary/history returns 401 without auth")


# =============================================================================
# Configuration Tests
# =============================================================================

class TestExecutiveSummaryConfig:
    """Tests for executive summary configuration endpoints"""
    
    def test_get_config_with_auth(self):
        """GET /api/executive-summary/config - should return configuration with auth"""
        session = get_auth_session()
        response = session.get(f"{BASE_URL}/api/executive-summary/config", headers=get_auth_headers())
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify expected config fields
        assert "id" in data, "Config should have 'id' field"
        assert "enabled" in data, "Config should have 'enabled' field"
        assert "frequency" in data, "Config should have 'frequency' field"
        assert "audience" in data, "Config should have 'audience' field"
        assert "tone" in data, "Config should have 'tone' field"
        assert "sections_included" in data, "Config should have 'sections_included' field"
        
        # Verify valid values
        assert data["frequency"] in ["daily", "weekly", "monthly"], \
            f"Frequency should be daily/weekly/monthly, got {data['frequency']}"
        assert data["tone"] in ["formal", "concise", "casual"], \
            f"Tone should be formal/concise/casual, got {data['tone']}"
        
        print(f"PASS: GET config - frequency: {data['frequency']}, tone: {data['tone']}")
    
    def test_update_config_frequency(self):
        """PUT /api/executive-summary/config - should update frequency setting"""
        session = get_auth_session()
        update_data = {"frequency": "weekly", "tone": "concise"}
        
        response = session.put(
            f"{BASE_URL}/api/executive-summary/config",
            headers=get_auth_headers(),
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the update
        get_response = session.get(f"{BASE_URL}/api/executive-summary/config", headers=get_auth_headers())
        config = get_response.json()
        assert config["frequency"] == "weekly", f"Frequency should be 'weekly', got {config['frequency']}"
        assert config["tone"] == "concise", f"Tone should be 'concise', got {config['tone']}"
        
        print(f"PASS: PUT config updated - frequency: weekly, tone: concise")
    
    def test_update_config_audience(self):
        """PUT /api/executive-summary/config - should update audience settings"""
        session = get_auth_session()
        update_data = {"audience": ["super_admin", "admins", "executives"]}
        
        response = session.put(
            f"{BASE_URL}/api/executive-summary/config",
            headers=get_auth_headers(),
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify update
        get_response = session.get(f"{BASE_URL}/api/executive-summary/config", headers=get_auth_headers())
        config = get_response.json()
        assert "executives" in config["audience"], "Audience should include 'executives'"
        
        print(f"PASS: Config audience updated: {config['audience']}")


# =============================================================================
# Quick Stats Tests
# =============================================================================

class TestQuickStats:
    """Tests for quick stats endpoint (fallback KPI dashboard)"""
    
    def test_quick_stats_with_auth(self):
        """GET /api/executive-summary/quick-stats - should return KPI metrics"""
        session = get_auth_session()
        response = session.get(f"{BASE_URL}/api/executive-summary/quick-stats", headers=get_auth_headers())
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
        
        print(f"PASS: Quick Stats - users: {data['total_users']}, listings: {data['active_listings']}, disputes: {data['pending_disputes']}")


# =============================================================================
# Summary Generation Tests
# =============================================================================

class TestExecutiveSummaryGeneration:
    """Tests for executive summary generation endpoint"""
    
    def test_generate_summary_daily(self):
        """POST /api/executive-summary/generate - should generate daily AI summary"""
        session = get_auth_session()
        response = session.post(
            f"{BASE_URL}/api/executive-summary/generate",
            headers=get_auth_headers(),
            params={"period": "daily"},
            timeout=90  # AI generation can take time
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify summary structure
        assert "id" in data, "Summary should have 'id'"
        assert "period_type" in data, "Summary should have 'period_type'"
        assert data["period_type"] == "daily", f"Period type should be 'daily', got {data['period_type']}"
        
        # Verify all 7 sections present
        sections = ["platform_overview", "revenue_monetization", "growth_retention", 
                   "trust_safety", "operations_logistics", "system_health", "recommendations"]
        for section in sections:
            assert section in data, f"Summary should have '{section}' section"
        
        # Verify AI-generated content
        assert "executive_brief" in data, "Summary should have 'executive_brief'"
        assert "key_highlights" in data, "Summary should have 'key_highlights'"
        
        print(f"PASS: Daily summary generated - ID: {data['id']}")
        print(f"  - Executive Brief: {(data.get('executive_brief') or 'N/A')[:100]}...")
        print(f"  - Key Highlights: {len(data.get('key_highlights', []))}")
        print(f"  - Recommendations: {len(data.get('recommendations', []))}")
        if data.get("generation_time_seconds"):
            print(f"  - Generation Time: {data['generation_time_seconds']:.2f}s")
    
    def test_generate_summary_weekly(self):
        """POST /api/executive-summary/generate - should generate weekly summary"""
        session = get_auth_session()
        response = session.post(
            f"{BASE_URL}/api/executive-summary/generate",
            headers=get_auth_headers(),
            params={"period": "weekly"},
            timeout=90
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["period_type"] == "weekly", f"Period type should be 'weekly', got {data['period_type']}"
        
        print(f"PASS: Weekly summary generated - highlights: {len(data.get('key_highlights', []))}")
    
    def test_generate_summary_monthly(self):
        """POST /api/executive-summary/generate - should generate monthly summary"""
        session = get_auth_session()
        response = session.post(
            f"{BASE_URL}/api/executive-summary/generate",
            headers=get_auth_headers(),
            params={"period": "monthly"},
            timeout=90
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["period_type"] == "monthly", f"Period type should be 'monthly', got {data['period_type']}"
        
        print(f"PASS: Monthly summary generated")
    
    def test_generate_summary_force_regenerate(self):
        """POST /api/executive-summary/generate - force=true should regenerate cached summary"""
        session = get_auth_session()
        response = session.post(
            f"{BASE_URL}/api/executive-summary/generate",
            headers=get_auth_headers(),
            params={"period": "daily", "force": "true"},
            timeout=90
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "generated_at" in data, "Force regenerated summary should have timestamp"
        
        print(f"PASS: Force regenerated at: {data['generated_at']}")
    
    def test_generate_summary_invalid_period(self):
        """POST /api/executive-summary/generate - should reject invalid period"""
        session = get_auth_session()
        response = session.post(
            f"{BASE_URL}/api/executive-summary/generate",
            headers=get_auth_headers(),
            params={"period": "invalid_period"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid period, got {response.status_code}"
        
        print("PASS: Invalid period type correctly rejected with 400")


# =============================================================================
# Latest Summary Tests
# =============================================================================

class TestLatestSummary:
    """Tests for getting latest cached summary"""
    
    def test_get_latest_summary(self):
        """GET /api/executive-summary/latest - should return latest cached summary"""
        session = get_auth_session()
        response = session.get(
            f"{BASE_URL}/api/executive-summary/latest",
            headers=get_auth_headers(),
            params={"period": "daily"},
            timeout=90  # May generate if no cache
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Latest summary should have 'id'"
        assert "executive_brief" in data, "Latest summary should have 'executive_brief'"
        assert "platform_overview" in data, "Latest summary should have 'platform_overview'"
        
        print(f"PASS: Latest summary retrieved - ID: {data['id']}")


# =============================================================================
# History Tests
# =============================================================================

class TestSummaryHistory:
    """Tests for executive summary history endpoint"""
    
    def test_get_history_with_auth(self):
        """GET /api/executive-summary/history - should return historical summaries"""
        session = get_auth_session()
        response = session.get(
            f"{BASE_URL}/api/executive-summary/history",
            headers=get_auth_headers(),
            params={"limit": 10}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "summaries" in data, "Response should have 'summaries' array"
        assert isinstance(data["summaries"], list), "Summaries should be a list"
        
        print(f"PASS: History retrieved - {len(data['summaries'])} summaries found")
        
        if data["summaries"]:
            summary = data["summaries"][0]
            assert "id" in summary, "Each summary should have 'id'"
            assert "period_type" in summary, "Each summary should have 'period_type'"
            print(f"  - Latest: {summary['id']} ({summary['period_type']})")
    
    def test_get_history_filtered_by_period(self):
        """GET /api/executive-summary/history - should filter by period type"""
        session = get_auth_session()
        response = session.get(
            f"{BASE_URL}/api/executive-summary/history",
            headers=get_auth_headers(),
            params={"period": "daily", "limit": 5}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        for summary in data["summaries"]:
            assert summary["period_type"] == "daily", f"All summaries should be daily"
        
        print(f"PASS: Filtered history - {len(data['summaries'])} daily summaries")


# =============================================================================
# Data Structure Validation Tests
# =============================================================================

class TestSummaryDataStructure:
    """Tests for verifying summary data structure and content"""
    
    def test_platform_overview_section(self):
        """Verify platform_overview section has metric change tracking"""
        session = get_auth_session()
        response = session.get(
            f"{BASE_URL}/api/executive-summary/latest",
            headers=get_auth_headers(),
            timeout=90
        )
        assert response.status_code == 200
        
        data = response.json()
        platform = data.get("platform_overview", {})
        
        # Check required metrics
        metrics = ["total_users", "active_users", "new_listings", "completed_transactions", "escrow_volume"]
        for metric in metrics:
            assert metric in platform, f"platform_overview should have '{metric}'"
            metric_data = platform[metric]
            assert "current" in metric_data, f"{metric} should have 'current'"
            assert "previous" in metric_data, f"{metric} should have 'previous'"
            assert "change_percent" in metric_data, f"{metric} should have 'change_percent'"
            assert "change_direction" in metric_data, f"{metric} should have 'change_direction'"
            assert metric_data["change_direction"] in ["up", "down", "flat"], \
                f"Invalid change_direction: {metric_data['change_direction']}"
        
        print(f"PASS: Platform overview - all {len(metrics)} metrics with change tracking")
    
    def test_recommendations_section(self):
        """Verify recommendations have impact and urgency levels"""
        session = get_auth_session()
        response = session.get(
            f"{BASE_URL}/api/executive-summary/latest",
            headers=get_auth_headers(),
            timeout=90
        )
        assert response.status_code == 200
        
        data = response.json()
        recommendations = data.get("recommendations", [])
        
        print(f"Found {len(recommendations)} recommendations")
        
        for i, rec in enumerate(recommendations):
            assert "id" in rec, f"Recommendation {i} should have 'id'"
            assert "title" in rec, f"Recommendation {i} should have 'title'"
            assert "description" in rec, f"Recommendation {i} should have 'description'"
            assert "impact_level" in rec, f"Recommendation {i} should have 'impact_level'"
            assert "urgency" in rec, f"Recommendation {i} should have 'urgency'"
            assert "category" in rec, f"Recommendation {i} should have 'category'"
            
            assert rec["impact_level"] in ["low", "medium", "high"], \
                f"Invalid impact_level: {rec['impact_level']}"
            assert rec["urgency"] in ["low", "medium", "high", "immediate"], \
                f"Invalid urgency: {rec['urgency']}"
            
            print(f"  - [{rec['urgency'].upper()}] {rec['title'][:50]}...")
        
        print("PASS: All recommendations have valid structure")
    
    def test_trust_safety_section(self):
        """Verify trust_safety section has risk rating"""
        session = get_auth_session()
        response = session.get(
            f"{BASE_URL}/api/executive-summary/latest",
            headers=get_auth_headers(),
            timeout=90
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
        
        print(f"PASS: Trust & Safety - Risk: {trust_safety['risk_rating']}, Disputes: {trust_safety['disputes_opened']}")
    
    def test_revenue_section(self):
        """Verify revenue_monetization section structure"""
        session = get_auth_session()
        response = session.get(
            f"{BASE_URL}/api/executive-summary/latest",
            headers=get_auth_headers(),
            timeout=90
        )
        assert response.status_code == 200
        
        data = response.json()
        revenue = data.get("revenue_monetization", {})
        
        metrics = ["total_revenue", "commission_earned", "boost_revenue", "banner_revenue", "transport_fees", "average_order_value"]
        for metric in metrics:
            assert metric in revenue, f"revenue_monetization should have '{metric}'"
        
        print(f"PASS: Revenue section - all {len(metrics)} metrics present")
    
    def test_summary_includes_all_7_sections(self):
        """Verify summary includes all 7 required sections"""
        session = get_auth_session()
        response = session.get(
            f"{BASE_URL}/api/executive-summary/latest",
            headers=get_auth_headers(),
            timeout=90
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # All 7 sections that should be present
        required_sections = [
            "platform_overview",
            "revenue_monetization", 
            "growth_retention",
            "trust_safety",
            "operations_logistics",
            "system_health",
            "recommendations"
        ]
        
        missing_sections = [s for s in required_sections if s not in data or data[s] is None]
        assert len(missing_sections) == 0, f"Missing sections: {missing_sections}"
        
        print(f"PASS: All 7 sections present: {required_sections}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
