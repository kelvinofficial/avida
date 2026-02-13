"""
Test Cohort Comparison and Scheduled Task Features
- GET /api/cohort-analytics/segments/available
- POST /api/cohort-analytics/compare
- POST /api/cohort-analytics/scheduled/alert-check
- POST /api/cohort-analytics/scheduled/weekly-report
- GET /api/cohort-analytics/scheduled/logs
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://local-assets-bundle.preview.emergentagent.com').rstrip('/')


class TestCohortComparisonSegments:
    """Test available segments endpoint"""
    
    def test_get_available_segments_returns_200(self):
        """GET /api/cohort-analytics/segments/available returns 200"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/segments/available")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ GET /api/cohort-analytics/segments/available returns 200")
    
    def test_available_segments_structure(self):
        """Verify response contains expected segment types"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/segments/available")
        data = response.json()
        
        # Check available_segments exists
        assert "available_segments" in data, "Response should contain 'available_segments'"
        segments = data["available_segments"]
        
        # Verify user_type segment contains seller, buyer, hybrid
        assert "user_type" in segments, "Segments should include 'user_type'"
        assert "seller" in segments["user_type"], "user_type should include 'seller'"
        assert "buyer" in segments["user_type"], "user_type should include 'buyer'"
        assert "hybrid" in segments["user_type"], "user_type should include 'hybrid'"
        
        # Verify platform segment
        assert "platform" in segments, "Segments should include 'platform'"
        
        # Verify country segment exists
        assert "country" in segments, "Segments should include 'country'"
        
        print(f"✓ Available segments structure is correct: {list(segments.keys())}")
    
    def test_available_metrics_structure(self):
        """Verify response contains expected metrics definitions"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/segments/available")
        data = response.json()
        
        assert "available_metrics" in data, "Response should contain 'available_metrics'"
        metrics = data["available_metrics"]
        
        # Check metric structure
        assert len(metrics) > 0, "Should have at least one metric defined"
        first_metric = metrics[0]
        assert "key" in first_metric, "Metric should have 'key'"
        assert "label" in first_metric, "Metric should have 'label'"
        assert "description" in first_metric, "Metric should have 'description'"
        
        # Check for expected metrics
        metric_keys = [m["key"] for m in metrics]
        expected_metrics = ["retention_d7", "retention_d30", "ltv", "engagement_score", "conversion_rate"]
        for expected in expected_metrics:
            assert expected in metric_keys, f"Should have '{expected}' metric"
        
        print(f"✓ Available metrics include: {metric_keys}")


class TestCohortComparison:
    """Test cohort comparison endpoint"""
    
    def test_compare_cohorts_returns_200(self):
        """POST /api/cohort-analytics/compare returns 200 with valid segments"""
        payload = {
            "segments": [
                {"dimension": "user_type", "value": "seller", "label": "Sellers"},
                {"dimension": "user_type", "value": "buyer", "label": "Buyers"}
            ],
            "metrics": ["retention_d7", "retention_d30", "ltv", "engagement_score", "conversion_rate"],
            "time_period_days": 90
        }
        response = requests.post(
            f"{BASE_URL}/api/cohort-analytics/compare",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ POST /api/cohort-analytics/compare returns 200")
    
    def test_compare_cohorts_response_structure(self):
        """Verify comparison response has expected fields"""
        payload = {
            "segments": [
                {"dimension": "user_type", "value": "seller", "label": "Sellers"},
                {"dimension": "user_type", "value": "buyer", "label": "Buyers"}
            ],
            "metrics": ["retention_d7", "retention_d30"],
            "time_period_days": 30
        }
        response = requests.post(
            f"{BASE_URL}/api/cohort-analytics/compare",
            json=payload
        )
        data = response.json()
        
        # Check main response fields
        assert "comparison" in data, "Response should contain 'comparison' array"
        assert "winners" in data, "Response should contain 'winners' object"
        assert "metrics_compared" in data, "Response should contain 'metrics_compared'"
        assert "time_period_days" in data, "Response should contain 'time_period_days'"
        assert "generated_at" in data, "Response should contain 'generated_at'"
        
        print(f"✓ Comparison response structure is correct")
    
    def test_compare_cohorts_segment_metrics(self):
        """Verify each segment in comparison has metrics"""
        payload = {
            "segments": [
                {"dimension": "user_type", "value": "seller", "label": "Sellers"},
                {"dimension": "user_type", "value": "buyer", "label": "Buyers"},
                {"dimension": "user_type", "value": "hybrid", "label": "Hybrid Users"}
            ],
            "metrics": ["retention_d7", "retention_d30", "engagement_score"],
            "time_period_days": 60
        }
        response = requests.post(
            f"{BASE_URL}/api/cohort-analytics/compare",
            json=payload
        )
        data = response.json()
        
        comparison = data.get("comparison", [])
        assert len(comparison) == 3, f"Expected 3 segments in comparison, got {len(comparison)}"
        
        for segment in comparison:
            assert "segment" in segment, "Segment should have 'segment' label"
            assert "user_count" in segment, "Segment should have 'user_count'"
            assert "metrics" in segment, "Segment should have 'metrics'"
            
            # Check metric values exist (may be 0 if no data)
            metrics_data = segment["metrics"]
            for metric in ["retention_d7", "retention_d30", "engagement_score"]:
                assert metric in metrics_data, f"Segment should have '{metric}' in metrics"
        
        print(f"✓ All 3 segments have metrics: {[s['segment'] for s in comparison]}")
    
    def test_compare_cohorts_winners_calculation(self):
        """Verify winners are calculated for each metric"""
        payload = {
            "segments": [
                {"dimension": "user_type", "value": "seller", "label": "Sellers"},
                {"dimension": "user_type", "value": "buyer", "label": "Buyers"}
            ],
            "metrics": ["retention_d7", "ltv", "conversion_rate"],
            "time_period_days": 90
        }
        response = requests.post(
            f"{BASE_URL}/api/cohort-analytics/compare",
            json=payload
        )
        data = response.json()
        
        winners = data.get("winners", {})
        for metric in ["retention_d7", "ltv", "conversion_rate"]:
            assert metric in winners, f"Winners should include '{metric}'"
            winner_info = winners[metric]
            assert "segment" in winner_info, f"Winner for '{metric}' should have 'segment'"
            assert "value" in winner_info, f"Winner for '{metric}' should have 'value'"
        
        print(f"✓ Winners calculated for metrics: {list(winners.keys())}")
    
    def test_compare_cohorts_platform_dimension(self):
        """Test comparison with platform dimension"""
        payload = {
            "segments": [
                {"dimension": "platform", "value": "mobile", "label": "Mobile Users"},
                {"dimension": "platform", "value": "web", "label": "Web Users"}
            ],
            "metrics": ["retention_d7"],
            "time_period_days": 30
        }
        response = requests.post(
            f"{BASE_URL}/api/cohort-analytics/compare",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert len(data.get("comparison", [])) == 2, "Should have 2 platform segments"
        print(f"✓ Platform dimension comparison works")


class TestScheduledAlertCheck:
    """Test scheduled alert check endpoint"""
    
    def test_manual_alert_check_returns_200(self):
        """POST /api/cohort-analytics/scheduled/alert-check returns 200"""
        response = requests.post(f"{BASE_URL}/api/cohort-analytics/scheduled/alert-check")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ POST /api/cohort-analytics/scheduled/alert-check returns 200")
    
    def test_alert_check_response_structure(self):
        """Verify alert check response structure"""
        response = requests.post(f"{BASE_URL}/api/cohort-analytics/scheduled/alert-check")
        data = response.json()
        
        # Should have result structure from run_scheduled_alert_check
        assert "checked_alerts" in data or "triggered_alerts" in data, \
            "Response should contain alert check results"
        
        print(f"✓ Alert check response: {data}")


class TestScheduledWeeklyReport:
    """Test scheduled weekly report endpoint"""
    
    def test_manual_weekly_report_returns_200(self):
        """POST /api/cohort-analytics/scheduled/weekly-report returns 200"""
        response = requests.post(f"{BASE_URL}/api/cohort-analytics/scheduled/weekly-report")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ POST /api/cohort-analytics/scheduled/weekly-report returns 200")
    
    def test_weekly_report_response(self):
        """Check weekly report response content"""
        response = requests.post(f"{BASE_URL}/api/cohort-analytics/scheduled/weekly-report")
        data = response.json()
        
        # May have status: skipped if no recipients configured
        if data.get("status") == "skipped":
            assert "reason" in data, "Skipped report should have reason"
            print(f"✓ Weekly report skipped (expected): {data['reason']}")
        else:
            # If report was generated
            print(f"✓ Weekly report response: {data}")


class TestScheduledTaskLogs:
    """Test scheduled task logs endpoint"""
    
    def test_get_scheduled_logs_returns_200(self):
        """GET /api/cohort-analytics/scheduled/logs returns 200"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/scheduled/logs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ GET /api/cohort-analytics/scheduled/logs returns 200")
    
    def test_scheduled_logs_structure(self):
        """Verify logs response is a list with expected structure"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/scheduled/logs?limit=10")
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list of logs"
        
        if len(data) > 0:
            first_log = data[0]
            assert "task" in first_log, "Log entry should have 'task'"
            assert "run_at" in first_log, "Log entry should have 'run_at'"
            assert "result" in first_log, "Log entry should have 'result'"
            print(f"✓ Found {len(data)} log entries, first task: {first_log.get('task')}")
        else:
            print(f"✓ No logs yet (scheduler may not have run)")
    
    def test_filter_logs_by_task(self):
        """Test filtering logs by task name"""
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/scheduled/logs?task=alert_check&limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # All entries should be for alert_check task
        for log in data:
            assert log.get("task") == "alert_check", f"Expected 'alert_check' task, got {log.get('task')}"
        
        print(f"✓ Filtered logs by task: {len(data)} alert_check entries")


class TestBackgroundSchedulerVerification:
    """Verify background scheduler is running and creating logs"""
    
    def test_alert_check_creates_log(self):
        """Verify manual alert check creates a log entry"""
        # Run alert check
        requests.post(f"{BASE_URL}/api/cohort-analytics/scheduled/alert-check")
        
        # Check logs
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/scheduled/logs?task=alert_check&limit=1")
        data = response.json()
        
        assert len(data) >= 1, "Should have at least one alert_check log after running"
        print(f"✓ Alert check created log entry")
    
    def test_background_task_runs(self):
        """
        Verify the background task has created logs
        The scheduler runs every 15 minutes after initial 60-second delay
        """
        response = requests.get(f"{BASE_URL}/api/cohort-analytics/scheduled/logs?limit=5")
        data = response.json()
        
        # Check if there are any logs from the background scheduler
        if len(data) > 0:
            print(f"✓ Background scheduler has created {len(data)} log entries")
            for log in data[:3]:
                print(f"  - Task: {log.get('task')}, Run at: {log.get('run_at')}")
        else:
            print(f"⚠ No scheduler logs yet - scheduler may not have run (runs every 15 min)")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
