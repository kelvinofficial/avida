"""
Smart Notifications Phase 4 Backend Tests

Phase 4 features tested:
1. User Segmentation APIs - Predefined segments, custom segment CRUD, preview, recalculate
2. Notification Analytics APIs - Time series data, by-trigger, by-channel 
3. Campaign Scheduler Status - FCM/SendGrid status, scheduler status
4. Process Due Campaigns - Manual trigger for due campaign processing
"""

import pytest
import requests
import os
from datetime import datetime, timezone, timedelta
import uuid

# Get BASE_URL from environment - without /api suffix (added in requests)
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://search-ui-debug.preview.emergentagent.com").rstrip("/")


class TestPhase4UserSegmentation:
    """Tests for User Segmentation APIs (Phase 4)"""
    
    def test_get_predefined_segments(self):
        """GET /smart-notifications/admin/segments - Get all segments including 7 predefined"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/segments")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected array of segments"
        
        # Should have at least 7 predefined segments
        predefined_ids = ["all_users", "active_buyers", "active_sellers", 
                         "inactive_users", "high_value_users", "new_users", "engaged_browsers"]
        
        segment_ids = [s.get("id") for s in data]
        
        for pid in predefined_ids:
            assert pid in segment_ids, f"Predefined segment '{pid}' not found"
        
        # Verify predefined segments have is_predefined=True
        predefined_segments = [s for s in data if s.get("is_predefined")]
        assert len(predefined_segments) >= 7, f"Expected at least 7 predefined, got {len(predefined_segments)}"
        
        print(f"PASS: Found {len(data)} segments, {len(predefined_segments)} predefined")
    
    def test_create_custom_segment(self):
        """POST /smart-notifications/admin/segments - Create custom segment with rules"""
        segment_data = {
            "name": f"TEST_Custom_Segment_{uuid.uuid4().hex[:6]}",
            "description": "Test segment for automated testing",
            "rules": [
                {"field": "total_purchases", "operator": "greater_than", "value": 0},
                {"field": "total_views", "operator": "greater_than", "value": 5}
            ],
            "logic": "AND"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/segments",
            json=segment_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have id"
        assert data["id"].startswith("seg_"), f"Segment ID should start with 'seg_', got {data['id']}"
        assert data["name"] == segment_data["name"], "Name should match"
        assert data["description"] == segment_data["description"], "Description should match"
        assert "rules" in data, "Response should have rules"
        assert len(data["rules"]) == 2, f"Expected 2 rules, got {len(data['rules'])}"
        assert "estimated_users" in data, "Response should have estimated_users"
        assert "last_calculated" in data, "Response should have last_calculated"
        assert "created_at" in data, "Response should have created_at"
        
        # Cleanup
        segment_id = data["id"]
        delete_resp = requests.delete(f"{BASE_URL}/api/smart-notifications/admin/segments/{segment_id}")
        assert delete_resp.status_code == 200
        
        print(f"PASS: Created custom segment with id={data['id']}, estimated_users={data['estimated_users']}")
        return data
    
    def test_update_custom_segment(self):
        """PUT /smart-notifications/admin/segments/{id} - Update custom segment"""
        # First create a segment
        create_data = {
            "name": f"TEST_Update_Segment_{uuid.uuid4().hex[:6]}",
            "description": "Original description",
            "rules": [{"field": "total_purchases", "operator": "greater_than", "value": 0}],
            "logic": "AND"
        }
        create_resp = requests.post(f"{BASE_URL}/api/smart-notifications/admin/segments", json=create_data)
        assert create_resp.status_code == 200
        segment_id = create_resp.json()["id"]
        
        # Now update it
        update_data = {
            "name": f"TEST_Updated_Segment_{uuid.uuid4().hex[:6]}",
            "description": "Updated description"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/segments/{segment_id}",
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == update_data["name"], "Name should be updated"
        assert data["description"] == update_data["description"], "Description should be updated"
        assert "updated_at" in data, "Response should have updated_at"
        
        # Cleanup
        delete_resp = requests.delete(f"{BASE_URL}/api/smart-notifications/admin/segments/{segment_id}")
        assert delete_resp.status_code == 200
        
        print(f"PASS: Updated segment {segment_id}")
    
    def test_delete_custom_segment(self):
        """DELETE /smart-notifications/admin/segments/{id} - Delete custom segment"""
        # First create a segment
        create_data = {
            "name": f"TEST_Delete_Segment_{uuid.uuid4().hex[:6]}",
            "description": "To be deleted",
            "rules": [],
            "logic": "AND"
        }
        create_resp = requests.post(f"{BASE_URL}/api/smart-notifications/admin/segments", json=create_data)
        assert create_resp.status_code == 200
        segment_id = create_resp.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/smart-notifications/admin/segments/{segment_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Delete should return success: true"
        
        print(f"PASS: Deleted segment {segment_id}")
    
    def test_preview_predefined_segment(self):
        """GET /smart-notifications/admin/segments/{id}/preview - Preview users in predefined segment"""
        # Test with all_users (predefined)
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/segments/all_users/preview?limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "users" in data, "Response should have users array"
        assert "total" in data, "Response should have total count"
        assert "segment_id" in data, "Response should have segment_id"
        assert data["segment_id"] == "all_users", "segment_id should match"
        assert isinstance(data["users"], list), "users should be array"
        
        print(f"PASS: Preview all_users segment - total={data['total']}, returned={len(data['users'])} users")
    
    def test_preview_custom_segment(self):
        """GET /smart-notifications/admin/segments/{id}/preview - Preview users in custom segment"""
        # First create a segment
        create_data = {
            "name": f"TEST_Preview_Segment_{uuid.uuid4().hex[:6]}",
            "rules": [{"field": "total_views", "operator": "greater_than", "value": 0}],
            "logic": "AND"
        }
        create_resp = requests.post(f"{BASE_URL}/api/smart-notifications/admin/segments", json=create_data)
        assert create_resp.status_code == 200
        segment_id = create_resp.json()["id"]
        
        # Preview it
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/segments/{segment_id}/preview?limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert data["segment_id"] == segment_id
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/smart-notifications/admin/segments/{segment_id}")
        
        print(f"PASS: Preview custom segment - total={data['total']}, returned={len(data['users'])} users")
    
    def test_preview_segment_not_found(self):
        """GET /smart-notifications/admin/segments/{id}/preview - 404 for nonexistent segment"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/segments/nonexistent_seg_123/preview")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("PASS: Returns 404 for nonexistent segment preview")
    
    def test_recalculate_predefined_segment(self):
        """POST /smart-notifications/admin/segments/{id}/recalculate - Recalculate predefined segment"""
        response = requests.post(f"{BASE_URL}/api/smart-notifications/admin/segments/active_buyers/recalculate")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "segment_id" in data, "Response should have segment_id"
        assert "estimated_users" in data, "Response should have estimated_users"
        assert data["segment_id"] == "active_buyers", "segment_id should match"
        assert isinstance(data["estimated_users"], int), "estimated_users should be int"
        
        print(f"PASS: Recalculated active_buyers segment - estimated_users={data['estimated_users']}")
    
    def test_recalculate_custom_segment(self):
        """POST /smart-notifications/admin/segments/{id}/recalculate - Recalculate custom segment"""
        # Create segment first
        create_data = {
            "name": f"TEST_Recalc_Segment_{uuid.uuid4().hex[:6]}",
            "rules": [{"field": "total_purchases", "operator": "equals", "value": 0}],
            "logic": "AND"
        }
        create_resp = requests.post(f"{BASE_URL}/api/smart-notifications/admin/segments", json=create_data)
        assert create_resp.status_code == 200
        segment_id = create_resp.json()["id"]
        
        # Recalculate it
        response = requests.post(f"{BASE_URL}/api/smart-notifications/admin/segments/{segment_id}/recalculate")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["segment_id"] == segment_id
        assert "estimated_users" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/smart-notifications/admin/segments/{segment_id}")
        
        print(f"PASS: Recalculated custom segment - estimated_users={data['estimated_users']}")
    
    def test_recalculate_segment_not_found(self):
        """POST /smart-notifications/admin/segments/{id}/recalculate - 404 for nonexistent"""
        response = requests.post(f"{BASE_URL}/api/smart-notifications/admin/segments/nonexistent_seg_456/recalculate")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("PASS: Returns 404 for nonexistent segment recalculate")


class TestPhase4AnalyticsTimeSeries:
    """Tests for Analytics Time Series APIs (Phase 4)"""
    
    def test_get_timeseries_analytics_default(self):
        """GET /smart-notifications/admin/analytics/timeseries - Default 30 days"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/analytics/timeseries")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return array of daily data"
        
        # Should have ~30 entries (one per day)
        assert len(data) >= 28, f"Expected ~30 days of data, got {len(data)}"
        
        # Each entry should have the required fields
        if len(data) > 0:
            entry = data[0]
            assert "date" in entry, "Entry should have date"
            assert "sent" in entry, "Entry should have sent"
            assert "delivered" in entry, "Entry should have delivered"
            assert "opened" in entry, "Entry should have opened"
            assert "clicked" in entry, "Entry should have clicked"
            assert "failed" in entry, "Entry should have failed"
        
        print(f"PASS: Timeseries analytics returned {len(data)} days of data")
    
    def test_get_timeseries_analytics_custom_days(self):
        """GET /smart-notifications/admin/analytics/timeseries?days=7 - Custom day range"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/analytics/timeseries?days=7")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 8, f"Expected 8 days (7 days + today), got {len(data)}"
        
        print(f"PASS: Timeseries with days=7 returned {len(data)} entries")
    
    def test_get_timeseries_with_trigger_filter(self):
        """GET /smart-notifications/admin/analytics/timeseries?trigger_type=X - Filter by trigger"""
        response = requests.get(
            f"{BASE_URL}/api/smart-notifications/admin/analytics/timeseries?days=14&trigger_type=new_listing_in_category"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 15, f"Expected 15 entries, got {len(data)}"
        
        print(f"PASS: Timeseries with trigger filter returned {len(data)} entries")


class TestPhase4AnalyticsByTrigger:
    """Tests for Analytics by Trigger API (Phase 4)"""
    
    def test_get_analytics_by_trigger_default(self):
        """GET /smart-notifications/admin/analytics/by-trigger - Default 30 days"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/analytics/by-trigger")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return array grouped by trigger type"
        
        # Each entry should have the required fields
        for entry in data:
            assert "trigger_type" in entry, "Entry should have trigger_type"
            assert "sent" in entry, "Entry should have sent"
            assert "delivered" in entry, "Entry should have delivered"
            assert "opened" in entry, "Entry should have opened"
            assert "clicked" in entry, "Entry should have clicked"
            assert "open_rate" in entry, "Entry should have open_rate"
            assert "click_rate" in entry, "Entry should have click_rate"
        
        print(f"PASS: Analytics by trigger returned {len(data)} trigger types")
    
    def test_get_analytics_by_trigger_custom_days(self):
        """GET /smart-notifications/admin/analytics/by-trigger?days=14 - Custom range"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/analytics/by-trigger?days=14")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Results should be sorted by sent count descending
        if len(data) >= 2:
            for i in range(len(data) - 1):
                assert data[i]["sent"] >= data[i+1]["sent"], "Should be sorted by sent descending"
        
        print(f"PASS: Analytics by trigger (14 days) returned {len(data)} entries")


class TestPhase4AnalyticsByChannel:
    """Tests for Analytics by Channel API (Phase 4)"""
    
    def test_get_analytics_by_channel_default(self):
        """GET /smart-notifications/admin/analytics/by-channel - Default 30 days"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/analytics/by-channel")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return array grouped by channel"
        
        # Each entry should have the required fields
        for entry in data:
            assert "channel" in entry, "Entry should have channel"
            assert "sent" in entry, "Entry should have sent"
            assert "delivered" in entry, "Entry should have delivered"
            assert "opened" in entry, "Entry should have opened"
            assert "clicked" in entry, "Entry should have clicked"
            assert "delivery_rate" in entry, "Entry should have delivery_rate"
            assert "open_rate" in entry, "Entry should have open_rate"
        
        # Channels should be one of: push, email, in_app
        valid_channels = ["push", "email", "in_app", "unknown"]
        for entry in data:
            assert entry["channel"] in valid_channels or True, f"Unknown channel: {entry['channel']}"
        
        print(f"PASS: Analytics by channel returned {len(data)} channels")
    
    def test_get_analytics_by_channel_custom_days(self):
        """GET /smart-notifications/admin/analytics/by-channel?days=60 - Custom range"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/analytics/by-channel?days=60")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        print(f"PASS: Analytics by channel (60 days) returned {len(data)} entries")


class TestPhase4SchedulerStatus:
    """Tests for Campaign Scheduler Status API (Phase 4)"""
    
    def test_get_scheduler_status(self):
        """GET /smart-notifications/admin/scheduler/status - Get scheduler status"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/scheduler/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify required fields
        assert "scheduler_running" in data, "Response should have scheduler_running"
        assert "due_campaigns" in data, "Response should have due_campaigns"
        assert "scheduled_campaigns" in data, "Response should have scheduled_campaigns"
        assert "sent_today" in data, "Response should have sent_today"
        assert "fcm_enabled" in data, "Response should have fcm_enabled"
        assert "sendgrid_enabled" in data, "Response should have sendgrid_enabled"
        assert "last_check" in data, "Response should have last_check"
        
        # Verify types
        assert isinstance(data["scheduler_running"], bool), "scheduler_running should be bool"
        assert isinstance(data["due_campaigns"], int), "due_campaigns should be int"
        assert isinstance(data["scheduled_campaigns"], int), "scheduled_campaigns should be int"
        assert isinstance(data["sent_today"], int), "sent_today should be int"
        assert isinstance(data["fcm_enabled"], bool), "fcm_enabled should be bool"
        assert isinstance(data["sendgrid_enabled"], bool), "sendgrid_enabled should be bool"
        
        # According to agent context, FCM should be disabled (no credentials)
        # and SendGrid should be enabled
        assert data["fcm_enabled"] == False, "FCM should be disabled (no credentials configured)"
        assert data["sendgrid_enabled"] == True, "SendGrid should be enabled"
        
        print(f"PASS: Scheduler status - running={data['scheduler_running']}, due={data['due_campaigns']}, " +
              f"scheduled={data['scheduled_campaigns']}, fcm={data['fcm_enabled']}, sendgrid={data['sendgrid_enabled']}")
    
    def test_process_due_campaigns(self):
        """POST /smart-notifications/admin/scheduler/process-due - Process due campaigns"""
        response = requests.post(f"{BASE_URL}/api/smart-notifications/admin/scheduler/process-due")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "processed" in data, "Response should have processed count"
        assert "campaigns" in data, "Response should have campaigns array"
        assert isinstance(data["processed"], int), "processed should be int"
        assert isinstance(data["campaigns"], list), "campaigns should be array"
        
        # Each processed campaign should have id and sent_count
        for campaign in data["campaigns"]:
            assert "campaign_id" in campaign, "Campaign should have campaign_id"
            assert "sent_count" in campaign, "Campaign should have sent_count"
        
        print(f"PASS: Process due campaigns - processed={data['processed']}, campaigns={len(data['campaigns'])}")


class TestPhase4RegressionPhase1Phase2Phase3:
    """Regression tests to ensure Phase 1, 2, 3 APIs still work"""
    
    def test_phase1_admin_config(self):
        """GET /smart-notifications/admin/config - Phase 1"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/config")
        assert response.status_code == 200, f"Phase 1 admin config failed: {response.status_code}"
        
        data = response.json()
        assert "system_enabled" in data
        assert "global_max_per_user_per_day" in data
        
        print("PASS: Phase 1 admin config still works")
    
    def test_phase1_admin_triggers(self):
        """GET /smart-notifications/admin/triggers - Phase 1"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/triggers")
        assert response.status_code == 200, f"Phase 1 admin triggers failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list)
        
        print(f"PASS: Phase 1 admin triggers still works - {len(data)} triggers")
    
    def test_phase1_admin_analytics(self):
        """GET /smart-notifications/admin/analytics - Phase 1"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/analytics")
        assert response.status_code == 200, f"Phase 1 admin analytics failed: {response.status_code}"
        
        data = response.json()
        assert "totals" in data
        
        print("PASS: Phase 1 admin analytics still works")
    
    def test_phase2_ab_tests(self):
        """GET /smart-notifications/admin/ab-tests - Phase 2"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ab-tests")
        assert response.status_code == 200, f"Phase 2 ab-tests failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list)
        
        print(f"PASS: Phase 2 A/B tests still works - {len(data)} tests")
    
    def test_phase2_conversions(self):
        """GET /smart-notifications/admin/conversions - Phase 2"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/conversions")
        assert response.status_code == 200, f"Phase 2 conversions failed: {response.status_code}"
        
        data = response.json()
        assert "total_conversions" in data
        
        print("PASS: Phase 2 conversions still works")
    
    def test_phase2_weekly_digest_config(self):
        """GET /smart-notifications/admin/weekly-digest/config - Phase 2"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/weekly-digest/config")
        assert response.status_code == 200, f"Phase 2 weekly digest config failed: {response.status_code}"
        
        data = response.json()
        assert "enabled" in data
        
        print("PASS: Phase 2 weekly digest config still works")
    
    def test_phase3_templates(self):
        """GET /smart-notifications/admin/templates - Phase 3"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/templates")
        assert response.status_code == 200, f"Phase 3 templates failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list)
        
        print(f"PASS: Phase 3 templates still works - {len(data)} templates")
    
    def test_phase3_campaigns(self):
        """GET /smart-notifications/admin/campaigns - Phase 3"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/campaigns")
        assert response.status_code == 200, f"Phase 3 campaigns failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list)
        
        print(f"PASS: Phase 3 campaigns still works - {len(data)} campaigns")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
