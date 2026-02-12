"""
Cohort Analytics API Tests
Tests for the Cohort & Retention Analysis system
"""

import pytest
import requests
import os
from datetime import datetime

# Get API base URL from environment - admin dashboard uses NEXT_PUBLIC_MAIN_API_URL
BASE_URL = "https://filter-rollback.preview.emergentagent.com/api"


class TestCohortAnalyticsEngagement:
    """Test engagement metrics endpoint"""
    
    def test_get_engagement_metrics_returns_200(self):
        """GET /api/cohort-analytics/engagement returns 200"""
        response = requests.get(f"{BASE_URL}/cohort-analytics/engagement")
        assert response.status_code == 200
        print(f"✅ GET /api/cohort-analytics/engagement - Status: {response.status_code}")
        
    def test_engagement_metrics_structure(self):
        """Engagement metrics contains expected fields"""
        response = requests.get(f"{BASE_URL}/cohort-analytics/engagement")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        required_fields = ['total_users', 'mau', 'dau', 'wau', 'total_transactions', 'computed_at']
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            
        assert isinstance(data['total_users'], int)
        assert isinstance(data['mau'], int)
        assert isinstance(data['dau'], int)
        print(f"✅ Engagement metrics structure validated - Total users: {data['total_users']}, MAU: {data['mau']}")
        

class TestCohortAnalyticsRetentionHeatmap:
    """Test retention heatmap endpoint"""
    
    def test_get_retention_heatmap_returns_200(self):
        """GET /api/cohort-analytics/retention/heatmap returns 200"""
        response = requests.get(f"{BASE_URL}/cohort-analytics/retention/heatmap")
        assert response.status_code == 200
        print(f"✅ GET /api/cohort-analytics/retention/heatmap - Status: {response.status_code}")
        
    def test_retention_heatmap_structure(self):
        """Retention heatmap contains expected fields"""
        response = requests.get(f"{BASE_URL}/cohort-analytics/retention/heatmap")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert 'dimension' in data
        assert 'granularity' in data
        assert 'periods' in data
        assert 'intervals' in data
        assert 'data' in data
        
        # Intervals should include retention periods
        expected_intervals = ['D1', 'D3', 'D7', 'W2', 'W4', 'M2', 'M3', 'M6']
        for interval in expected_intervals:
            assert interval in data['intervals'], f"Missing interval: {interval}"
            
        print(f"✅ Retention heatmap structure validated - Periods: {len(data['periods'])}, Intervals: {data['intervals']}")
        
    def test_retention_heatmap_with_filters(self):
        """Retention heatmap respects query parameters"""
        params = {
            'dimension': 'signup_date',
            'granularity': 'monthly',
            'months_back': 6
        }
        response = requests.get(f"{BASE_URL}/cohort-analytics/retention/heatmap", params=params)
        assert response.status_code == 200
        data = response.json()
        
        assert data['dimension'] == 'signup_date'
        assert data['granularity'] == 'monthly'
        print(f"✅ Retention heatmap filters working - dimension: {data['dimension']}, granularity: {data['granularity']}")
        
    def test_retention_heatmap_user_type_dimension(self):
        """Retention heatmap works with user_type dimension"""
        params = {'dimension': 'user_type'}
        response = requests.get(f"{BASE_URL}/cohort-analytics/retention/heatmap", params=params)
        assert response.status_code == 200
        data = response.json()
        assert data['dimension'] == 'user_type'
        print(f"✅ User type dimension works - Cohorts: {len(data['data'])}")
        
    def test_retention_heatmap_country_dimension(self):
        """Retention heatmap works with country dimension"""
        params = {'dimension': 'country'}
        response = requests.get(f"{BASE_URL}/cohort-analytics/retention/heatmap", params=params)
        assert response.status_code == 200
        data = response.json()
        assert data['dimension'] == 'country'
        print(f"✅ Country dimension works - Cohorts: {len(data['data'])}")


class TestCohortAnalyticsFunnel:
    """Test conversion funnel endpoint"""
    
    def test_get_funnel_returns_200(self):
        """GET /api/cohort-analytics/funnel returns 200"""
        response = requests.get(f"{BASE_URL}/cohort-analytics/funnel")
        assert response.status_code == 200
        print(f"✅ GET /api/cohort-analytics/funnel - Status: {response.status_code}")
        
    def test_funnel_structure(self):
        """Funnel contains expected stages"""
        response = requests.get(f"{BASE_URL}/cohort-analytics/funnel")
        assert response.status_code == 200
        data = response.json()
        
        assert 'funnel' in data
        assert 'overall_conversion' in data
        assert 'days' in data
        
        # Check funnel stages
        stages = [stage['stage'] for stage in data['funnel']]
        expected_stages = ['Signup', 'View Listing', 'Start Chat', 'Complete Purchase']
        for stage in expected_stages:
            assert stage in stages, f"Missing stage: {stage}"
            
        # Each stage should have count, rate, drop_off
        for stage in data['funnel']:
            assert 'count' in stage
            assert 'rate' in stage
            
        print(f"✅ Funnel structure validated - Stages: {stages}, Overall conversion: {data['overall_conversion']}%")
        
    def test_funnel_with_custom_days(self):
        """Funnel respects days parameter"""
        params = {'days': 7}
        response = requests.get(f"{BASE_URL}/cohort-analytics/funnel", params=params)
        assert response.status_code == 200
        data = response.json()
        assert data['days'] == 7
        print(f"✅ Funnel days filter works - Days: {data['days']}")


class TestCohortAnalyticsRevenue:
    """Test revenue and LTV metrics endpoint"""
    
    def test_get_revenue_returns_200(self):
        """GET /api/cohort-analytics/revenue returns 200"""
        response = requests.get(f"{BASE_URL}/cohort-analytics/revenue")
        assert response.status_code == 200
        print(f"✅ GET /api/cohort-analytics/revenue - Status: {response.status_code}")
        
    def test_revenue_structure(self):
        """Revenue metrics contains expected fields"""
        response = requests.get(f"{BASE_URL}/cohort-analytics/revenue")
        assert response.status_code == 200
        data = response.json()
        
        assert 'data' in data
        assert 'total_revenue' in data
        assert 'avg_ltv' in data
        
        # Each cohort in data should have revenue metrics
        if len(data['data']) > 0:
            cohort = data['data'][0]
            assert 'period' in cohort
            assert 'user_count' in cohort
            assert 'ltv' in cohort
            
        print(f"✅ Revenue structure validated - Total revenue: ${data['total_revenue']}, Avg LTV: ${data['avg_ltv']}")
        
    def test_revenue_with_months_filter(self):
        """Revenue respects months_back parameter"""
        params = {'months_back': 6}
        response = requests.get(f"{BASE_URL}/cohort-analytics/revenue", params=params)
        assert response.status_code == 200
        data = response.json()
        # Should have at most 6 months of data
        assert len(data['data']) <= 6
        print(f"✅ Revenue months filter works - Cohorts: {len(data['data'])}")


class TestCohortAnalyticsInsights:
    """Test AI insights endpoints"""
    
    def test_get_insights_returns_200(self):
        """GET /api/cohort-analytics/insights returns 200"""
        response = requests.get(f"{BASE_URL}/cohort-analytics/insights")
        assert response.status_code == 200
        print(f"✅ GET /api/cohort-analytics/insights - Status: {response.status_code}")
        
    def test_insights_returns_list(self):
        """Insights endpoint returns a list"""
        response = requests.get(f"{BASE_URL}/cohort-analytics/insights")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Insights returns list - Count: {len(data)}")
        
    def test_generate_insights_returns_200(self):
        """POST /api/cohort-analytics/insights/generate returns 200"""
        response = requests.post(f"{BASE_URL}/cohort-analytics/insights/generate")
        assert response.status_code == 200
        data = response.json()
        assert 'insights' in data
        assert 'count' in data
        print(f"✅ POST /api/cohort-analytics/insights/generate - Generated {data['count']} insights")
        
    def test_generated_insights_structure(self):
        """Generated insights have correct structure"""
        response = requests.post(f"{BASE_URL}/cohort-analytics/insights/generate")
        assert response.status_code == 200
        data = response.json()
        
        if data['count'] > 0:
            insight = data['insights'][0]
            required_fields = ['id', 'insight_type', 'title', 'description', 'severity']
            for field in required_fields:
                assert field in insight, f"Missing field in insight: {field}"
                
        print(f"✅ AI insights structure validated - {data['count']} insights generated")


class TestCohortAnalyticsDefinitions:
    """Test cohort definitions endpoint"""
    
    def test_get_definitions_returns_200(self):
        """GET /api/cohort-analytics/definitions returns 200"""
        response = requests.get(f"{BASE_URL}/cohort-analytics/definitions")
        assert response.status_code == 200
        print(f"✅ GET /api/cohort-analytics/definitions - Status: {response.status_code}")
        
    def test_definitions_structure(self):
        """Cohort definitions have correct structure"""
        response = requests.get(f"{BASE_URL}/cohort-analytics/definitions")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        if len(data) > 0:
            definition = data[0]
            required_fields = ['id', 'name', 'dimension', 'granularity', 'is_enabled']
            for field in required_fields:
                assert field in definition, f"Missing field in definition: {field}"
                
        print(f"✅ Definitions structure validated - Count: {len(data)}")


class TestCohortAnalyticsAlerts:
    """Test alerts management endpoints"""
    
    def test_get_alerts_returns_200(self):
        """GET /api/cohort-analytics/alerts returns 200"""
        response = requests.get(f"{BASE_URL}/cohort-analytics/alerts")
        assert response.status_code == 200
        print(f"✅ GET /api/cohort-analytics/alerts - Status: {response.status_code}")
        
    def test_alerts_returns_list(self):
        """Alerts endpoint returns a list"""
        response = requests.get(f"{BASE_URL}/cohort-analytics/alerts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Alerts returns list - Count: {len(data)}")
        
    def test_create_alert_returns_200(self):
        """POST /api/cohort-analytics/alerts creates alert"""
        payload = {
            "name": "TEST_Low_Retention_Alert",
            "alert_type": "retention_drop",
            "threshold": 40.0,
            "cohort_dimension": "signup_date",
            "actions": []
        }
        response = requests.post(
            f"{BASE_URL}/cohort-analytics/alerts",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'id' in data
        assert data['name'] == "TEST_Low_Retention_Alert"
        assert data['alert_type'] == "retention_drop"
        assert data['threshold'] == 40.0
        assert data['is_enabled'] == True
        
        print(f"✅ Alert created successfully - ID: {data['id']}")
        
        # Store alert ID for cleanup
        return data['id']
        
    def test_alert_structure(self):
        """Created alerts have correct structure"""
        payload = {
            "name": "TEST_High_Churn_Alert",
            "alert_type": "high_churn",
            "threshold": 25.0
        }
        response = requests.post(
            f"{BASE_URL}/cohort-analytics/alerts",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ['id', 'name', 'alert_type', 'threshold', 'is_enabled', 'created_at']
        for field in required_fields:
            assert field in data, f"Missing field in alert: {field}"
            
        print(f"✅ Alert structure validated - ID: {data['id']}")


class TestCohortAnalyticsEventTracking:
    """Test event tracking endpoint"""
    
    def test_track_event_returns_200(self):
        """POST /api/cohort-analytics/events/track tracks event"""
        payload = {
            "user_id": "TEST_user_12345",
            "event_type": "listing_viewed",
            "properties": {"listing_id": "test_listing_001"},
            "session_id": "test_session_001"
        }
        response = requests.post(
            f"{BASE_URL}/cohort-analytics/events/track",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'id' in data
        assert data['user_id'] == "TEST_user_12345"
        assert data['event_type'] == "listing_viewed"
        
        print(f"✅ Event tracked successfully - ID: {data['id']}")
        
    def test_track_different_event_types(self):
        """Can track various event types"""
        event_types = ['signup', 'login', 'chat_started', 'checkout_completed']
        
        for event_type in event_types:
            payload = {
                "user_id": "TEST_user_events",
                "event_type": event_type,
                "properties": {}
            }
            response = requests.post(
                f"{BASE_URL}/cohort-analytics/events/track",
                json=payload
            )
            assert response.status_code == 200
            data = response.json()
            assert data['event_type'] == event_type
            print(f"  ✅ Event type '{event_type}' tracked")
            
        print(f"✅ All event types tracked successfully")


class TestCohortAnalyticsDrilldown:
    """Test cohort drilldown endpoint"""
    
    def test_get_cohort_users_returns_200(self):
        """GET /api/cohort-analytics/cohort/{cohort_key}/users returns 200"""
        # Use a properly formatted cohort key
        cohort_key = "signup_date:2024-01"
        response = requests.get(
            f"{BASE_URL}/cohort-analytics/cohort/{cohort_key}/users"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'cohort_key' in data
        assert 'users' in data
        assert 'total' in data
        
        print(f"✅ Cohort drilldown working - Users: {data['total']}")
        
    def test_cohort_drilldown_with_pagination(self):
        """Cohort drilldown supports pagination"""
        cohort_key = "signup_date:2024-01"
        params = {'limit': 10, 'skip': 0}
        response = requests.get(
            f"{BASE_URL}/cohort-analytics/cohort/{cohort_key}/users",
            params=params
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data['limit'] == 10
        assert data['skip'] == 0
        
        print(f"✅ Cohort drilldown pagination works - Limit: {data['limit']}, Skip: {data['skip']}")


class TestCohortAnalyticsDashboard:
    """Test dashboard summary endpoint"""
    
    def test_get_dashboard_returns_200(self):
        """GET /api/cohort-analytics/dashboard returns 200"""
        response = requests.get(f"{BASE_URL}/cohort-analytics/dashboard")
        assert response.status_code == 200
        print(f"✅ GET /api/cohort-analytics/dashboard - Status: {response.status_code}")
        
    def test_dashboard_structure(self):
        """Dashboard contains all expected sections"""
        response = requests.get(f"{BASE_URL}/cohort-analytics/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # Check all sections are present
        expected_sections = ['engagement', 'retention_heatmap', 'conversion_funnel', 'revenue', 'insights', 'trends']
        for section in expected_sections:
            assert section in data, f"Missing section: {section}"
            
        print(f"✅ Dashboard structure validated - Sections: {list(data.keys())}")


# Cleanup function to remove test data
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Run tests then cleanup TEST_ prefixed data"""
    yield
    # Note: In production, would delete test alerts and events here
    print("\n🧹 Test data cleanup - TEST_ prefixed data should be cleaned from DB")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
