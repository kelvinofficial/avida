"""
Test Cohort Analytics New Features:
- Weekly Health Reports (generation and email sending)
- Alert Automation with Push Notifications
- User Type Drill-down (seller/buyer/hybrid cohorts)
- Event Tracking Integration
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://desktop-profile-hub.preview.emergentagent.com")
if BASE_URL.endswith("/"):
    BASE_URL = BASE_URL.rstrip("/")


class TestWeeklyReports:
    """Test weekly health report generation and email sending"""

    def test_generate_weekly_report_returns_200(self):
        """GET /api/cohort-analytics/reports/weekly - should return weekly health report"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/reports/weekly")
        print(f"Weekly Report Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_weekly_report_structure(self):
        """Weekly report should have required fields"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/reports/weekly")
        assert response.status_code == 200
        data = response.json()
        
        # Check required top-level fields
        required_fields = [
            "report_id", "report_type", "period_start", "period_end", "generated_at",
            "metrics_summary", "retention_highlights", "funnel_summary", "revenue_summary",
            "recommendations"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            print(f"✓ Field '{field}' present in weekly report")
        
        # Check metrics_summary structure
        metrics = data["metrics_summary"]
        metrics_fields = ["total_users", "mau", "wau", "dau", "dau_mau_ratio"]
        for field in metrics_fields:
            assert field in metrics, f"Missing metrics field: {field}"
        print(f"✓ metrics_summary has all required fields")
        
        # Check retention_highlights structure
        retention = data["retention_highlights"]
        retention_fields = ["avg_d7_retention", "retention_trend", "cohorts_analyzed"]
        for field in retention_fields:
            assert field in retention, f"Missing retention field: {field}"
        print(f"✓ retention_highlights has all required fields")

    def test_send_weekly_report_returns_200(self):
        """POST /api/cohort-analytics/reports/weekly/send - should accept recipients list"""
        recipients = ["admin@example.com", "manager@example.com"]
        response = requests.post(
            f"{BASE_URL}/api/cohort-analytics/reports/weekly/send",
            json=recipients,
            headers={"Content-Type": "application/json"}
        )
        print(f"Send Report Response Status: {response.status_code}")
        # Should return 200 even if SendGrid is not configured (returns report + error message)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "report_id" in data, "Should return report_id"
        assert "recipients" in data, "Should return recipients list"
        assert "send_results" in data, "Should return send_results"
        print(f"✓ Send report returned proper structure with report_id: {data.get('report_id')}")

    def test_get_report_history_returns_200(self):
        """GET /api/cohort-analytics/reports/history - should return previous reports"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/reports/history?limit=5")
        print(f"Report History Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list of reports"
        print(f"✓ Report history returned {len(data)} reports")

    def test_get_report_schedule_returns_200(self):
        """GET /api/cohort-analytics/reports/schedule - should return schedule config"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/reports/schedule")
        print(f"Report Schedule Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "enabled" in data, "Should have 'enabled' field"
        assert "frequency" in data, "Should have 'frequency' field"
        assert "recipients" in data, "Should have 'recipients' field"
        print(f"✓ Schedule config: enabled={data.get('enabled')}, frequency={data.get('frequency')}")

    def test_configure_report_schedule_returns_200(self):
        """POST /api/cohort-analytics/reports/schedule - should configure schedule"""
        schedule_config = {
            "enabled": True,
            "frequency": "weekly",
            "recipients": ["test@example.com"],
            "day_of_week": 1  # Monday
        }
        response = requests.post(
            f"{BASE_URL}/api/cohort-analytics/reports/schedule",
            json=schedule_config,
            headers={"Content-Type": "application/json"}
        )
        print(f"Configure Schedule Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("enabled") == True, "Should be enabled"
        assert data.get("frequency") == "weekly", "Should be weekly"
        print(f"✓ Schedule configured successfully")


class TestAlertAutomation:
    """Test alert automation and push notifications"""

    def test_check_alerts_and_notify_returns_200(self):
        """POST /api/cohort-analytics/alerts/check-and-notify - should check alerts and create notifications"""
        response = requests.post(f"{BASE_URL}/api/cohort-analytics/alerts/check-and-notify")
        print(f"Check Alerts Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_check_alerts_response_structure(self):
        """Check alerts response should have proper structure"""
        response = requests.post(f"{BASE_URL}/api/cohort-analytics/alerts/check-and-notify")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["checked_alerts", "triggered_alerts", "notifications_sent", "checked_at"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            print(f"✓ Field '{field}' present in check alerts response")
        
        assert isinstance(data["triggered_alerts"], list), "triggered_alerts should be a list"
        assert isinstance(data["notifications_sent"], list), "notifications_sent should be a list"
        print(f"✓ Checked {data['checked_alerts']} alerts, {len(data['triggered_alerts'])} triggered")

    def test_create_alert_for_automation(self):
        """Create an alert to test automation"""
        alert_data = {
            "name": "TEST_Low_Retention_Alert",
            "alert_type": "retention_drop",
            "threshold": 80  # High threshold so it triggers
        }
        response = requests.post(
            f"{BASE_URL}/api/cohort-analytics/alerts",
            json=alert_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"Create Alert Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("name") == "TEST_Low_Retention_Alert"
        assert data.get("alert_type") == "retention_drop"
        assert data.get("threshold") == 80
        print(f"✓ Alert created with id: {data.get('id')}")

    def test_get_cohort_notifications_returns_200(self):
        """GET /api/cohort-analytics/notifications - should return notifications"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/notifications")
        print(f"Get Notifications Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list of notifications"
        print(f"✓ Returned {len(data)} notifications")

    def test_get_unread_notifications(self):
        """GET /api/cohort-analytics/notifications?unread_only=true - should filter unread"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/notifications?unread_only=true")
        print(f"Get Unread Notifications Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        # All returned notifications should be unread
        for notification in data:
            assert notification.get("read") == False, "Should only return unread notifications"
        print(f"✓ All {len(data)} notifications are unread")

    def test_mark_notification_read(self):
        """POST /api/cohort-analytics/notifications/{id}/read - should mark as read"""
        # First, trigger alerts to create notifications
        requests.post(f"{BASE_URL}/api/cohort-analytics/alerts/check-and-notify")
        
        # Get notifications
        notifications_resp = requests.get(f"{BASE_URL}/api/cohort-analytics/notifications")
        notifications = notifications_resp.json()
        
        if notifications:
            notification_id = notifications[0].get("id")
            response = requests.post(f"{BASE_URL}/api/cohort-analytics/notifications/{notification_id}/read")
            print(f"Mark Read Response Status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            print(f"✓ Notification {notification_id} marked as read")
        else:
            # Create a notification by checking alerts
            print("✓ No notifications to mark as read (OK - no alerts triggered)")


class TestUserTypeDrilldown:
    """Test user type drill-down for seller/buyer/hybrid cohorts"""

    def test_get_seller_cohort_users(self):
        """GET /api/cohort-analytics/cohort/user_type:seller/users - should return sellers"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/cohort/user_type:seller/users")
        print(f"Seller Cohort Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "users" in data, "Should have 'users' field"
        assert "total" in data, "Should have 'total' field"
        assert "cohort_key" in data, "Should have 'cohort_key' field"
        assert data["cohort_key"] == "user_type:seller", "Cohort key should match"
        print(f"✓ Seller cohort has {data.get('total')} users")

    def test_get_buyer_cohort_users(self):
        """GET /api/cohort-analytics/cohort/user_type:buyer/users - should return buyers"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/cohort/user_type:buyer/users")
        print(f"Buyer Cohort Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "users" in data, "Should have 'users' field"
        assert "total" in data, "Should have 'total' field"
        assert data["cohort_key"] == "user_type:buyer", "Cohort key should match"
        print(f"✓ Buyer cohort has {data.get('total')} users")

    def test_get_hybrid_cohort_users(self):
        """GET /api/cohort-analytics/cohort/user_type:hybrid/users - should return hybrid users"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/cohort/user_type:hybrid/users")
        print(f"Hybrid Cohort Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "users" in data, "Should have 'users' field"
        assert "total" in data, "Should have 'total' field"
        assert data["cohort_key"] == "user_type:hybrid", "Cohort key should match"
        print(f"✓ Hybrid cohort has {data.get('total')} users")

    def test_user_type_drilldown_with_pagination(self):
        """User type drilldown should support pagination"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/cohort/user_type:seller/users?limit=5&skip=0")
        print(f"Paginated Drilldown Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "limit" in data, "Should have 'limit' field"
        assert "skip" in data, "Should have 'skip' field"
        assert len(data.get("users", [])) <= 5, "Should respect limit"
        print(f"✓ Pagination works: limit={data.get('limit')}, skip={data.get('skip')}")


class TestEventTracking:
    """Test event tracking integration across signup/login/listing/purchase flows"""

    def test_track_signup_event(self):
        """POST /api/cohort-analytics/events/track - should track signup event"""
        event_data = {
            "user_id": "TEST_user_signup_001",
            "event_type": "signup",
            "properties": {
                "auth_provider": "email",
                "source": "registration"
            },
            "session_id": "test_session_signup"
        }
        response = requests.post(
            f"{BASE_URL}/api/cohort-analytics/events/track",
            json=event_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"Track Signup Event Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("event_type") == "signup"
        assert data.get("user_id") == "TEST_user_signup_001"
        print(f"✓ Signup event tracked with id: {data.get('id')}")

    def test_track_login_event(self):
        """POST /api/cohort-analytics/events/track - should track login event"""
        event_data = {
            "user_id": "TEST_user_login_001",
            "event_type": "login",
            "properties": {
                "auth_provider": "email"
            }
        }
        response = requests.post(
            f"{BASE_URL}/api/cohort-analytics/events/track",
            json=event_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"Track Login Event Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("event_type") == "login"
        print(f"✓ Login event tracked with id: {data.get('id')}")

    def test_track_listing_created_event(self):
        """POST /api/cohort-analytics/events/track - should track listing_created event"""
        event_data = {
            "user_id": "TEST_user_listing_001",
            "event_type": "listing_created",
            "properties": {
                "listing_id": "TEST_listing_001",
                "category_id": "electronics",
                "price": 199.99
            }
        }
        response = requests.post(
            f"{BASE_URL}/api/cohort-analytics/events/track",
            json=event_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"Track Listing Created Event Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("event_type") == "listing_created"
        assert "listing_id" in data.get("properties", {})
        print(f"✓ Listing created event tracked with id: {data.get('id')}")

    def test_track_checkout_completed_event(self):
        """POST /api/cohort-analytics/events/track - should track checkout_completed event"""
        event_data = {
            "user_id": "TEST_user_checkout_001",
            "event_type": "checkout_completed",
            "properties": {
                "order_id": "TEST_order_001",
                "amount": 299.99,
                "currency": "EUR"
            }
        }
        response = requests.post(
            f"{BASE_URL}/api/cohort-analytics/events/track",
            json=event_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"Track Checkout Event Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("event_type") == "checkout_completed"
        print(f"✓ Checkout completed event tracked with id: {data.get('id')}")

    def test_track_escrow_released_event(self):
        """POST /api/cohort-analytics/events/track - should track escrow_released event"""
        event_data = {
            "user_id": "TEST_seller_escrow_001",
            "event_type": "escrow_released",
            "properties": {
                "order_id": "TEST_order_escrow_001",
                "amount": 199.99,
                "currency": "EUR"
            }
        }
        response = requests.post(
            f"{BASE_URL}/api/cohort-analytics/events/track",
            json=event_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"Track Escrow Released Event Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("event_type") == "escrow_released"
        print(f"✓ Escrow released event tracked with id: {data.get('id')}")

    def test_get_user_events(self):
        """GET /api/cohort-analytics/events/{user_id} - should return user events"""
        # First track an event
        event_data = {
            "user_id": "TEST_user_events_view_001",
            "event_type": "login",
            "properties": {"test": True}
        }
        requests.post(
            f"{BASE_URL}/api/cohort-analytics/events/track",
            json=event_data,
            headers={"Content-Type": "application/json"}
        )
        
        # Then fetch user events
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/events/TEST_user_events_view_001")
        print(f"Get User Events Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list of events"
        print(f"✓ Retrieved {len(data)} events for user")


class TestRetentionHeatmapWithUserType:
    """Test retention heatmap with user_type dimension"""

    def test_heatmap_user_type_dimension(self):
        """GET /api/cohort-analytics/retention/heatmap?dimension=user_type - should return user type cohorts"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/retention/heatmap?dimension=user_type")
        print(f"Heatmap User Type Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "dimension" in data, "Should have 'dimension' field"
        assert data["dimension"] == "user_type", "Dimension should be user_type"
        assert "data" in data, "Should have 'data' field"
        
        # Check if user types are present
        periods = [item.get("period") for item in data.get("data", [])]
        print(f"✓ User type cohorts found: {periods}")

    def test_retention_cohorts_user_type(self):
        """GET /api/cohort-analytics/retention/cohorts?dimension=user_type - should return user type cohorts"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/retention/cohorts?dimension=user_type")
        print(f"Retention Cohorts User Type Response Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list of cohorts"
        
        for cohort in data:
            assert "cohort_key" in cohort, "Each cohort should have cohort_key"
            assert "user_type" in cohort.get("cohort_key", ""), "Cohort key should contain user_type"
            assert "retention_data" in cohort, "Each cohort should have retention_data"
        print(f"✓ Retrieved {len(data)} user type cohorts")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
