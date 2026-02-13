"""
Comprehensive QA Dashboard Backend Tests
========================================
Tests for all new QA features:
1. Flow Tests (run and history)
2. Session Replay (start, summary)
3. Data Integrity Checks (run and history)
4. Advanced Monitoring (metrics and thresholds)
5. Fail-safe Status
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://loading-gloss.preview.emergentagent.com')
if not BASE_URL.endswith('/api'):
    BASE_URL = BASE_URL.rstrip('/') + '/api'


class TestFlowTests:
    """Test Critical User Flow Testing endpoints"""
    
    def test_run_flow_tests(self):
        """POST /api/qa/flow-tests/run - Run critical user flow tests"""
        response = requests.post(f"{BASE_URL}/qa/flow-tests/run")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "id" in data, "Response should have test run ID"
        assert "type" in data, "Response should have type"
        assert data["type"] == "critical_flow_test", f"Type should be critical_flow_test, got {data['type']}"
        assert "total_tests" in data, "Response should have total_tests"
        assert "passed" in data, "Response should have passed count"
        assert "failed" in data, "Response should have failed count"
        assert "success_rate" in data, "Response should have success_rate"
        assert "results" in data, "Response should have results array"
        
        # Verify 6 flow tests were run
        assert data["total_tests"] == 6, f"Expected 6 flow tests, got {data['total_tests']}"
        
        # Verify each result has required fields
        expected_flows = ["listing_creation", "checkout", "escrow", "notifications", "payment_integration", "authentication"]
        actual_flows = [r["flow"] for r in data["results"]]
        for flow in expected_flows:
            assert flow in actual_flows, f"Missing flow test: {flow}"
        
        print(f"SUCCESS: Flow tests ran - {data['passed']}/{data['total_tests']} passed ({data['success_rate']}%)")
        return data
    
    def test_get_flow_test_history(self):
        """GET /api/qa/flow-tests/history - Get flow test history"""
        response = requests.get(f"{BASE_URL}/qa/flow-tests/history?limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tests" in data, "Response should have 'tests' array"
        assert "total" in data, "Response should have 'total' count"
        assert "page" in data, "Response should have 'page' number"
        
        # If we have tests, verify their structure
        if data["tests"]:
            test = data["tests"][0]
            assert "id" in test, "Each test should have an id"
            assert "started_at" in test, "Each test should have started_at"
            assert "total_tests" in test, "Each test should have total_tests"
        
        print(f"SUCCESS: Got flow test history - {len(data['tests'])} records, total: {data['total']}")


class TestSessionReplay:
    """Test Session Replay endpoints"""
    
    def test_start_session_recording(self):
        """POST /api/qa/sessions/start - Start session recording"""
        payload = {
            "user_id": "TEST_session_user_001",
            "session_type": "checkout"
        }
        response = requests.post(f"{BASE_URL}/qa/sessions/start", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "session_id" in data, "Response should have session_id"
        assert "status" in data, "Response should have status"
        assert data["status"] == "recording"
        
        print(f"SUCCESS: Started session recording - ID: {data['session_id']}")
    
    def test_get_session_replay_summary(self):
        """GET /api/qa/sessions/summary - Get session replay summary"""
        response = requests.get(f"{BASE_URL}/qa/sessions/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Summary returns data per session type
        assert isinstance(data, dict), "Response should be a dictionary"
        
        # Check if any session types exist
        for session_type, summary in data.items():
            if isinstance(summary, dict):
                # Verify summary structure
                assert "total_recordings" in summary or "count" in summary, f"Summary for {session_type} should have count"
        
        print(f"SUCCESS: Got session replay summary - {len(data)} session types")


class TestDataIntegrity:
    """Test Data Integrity Check endpoints"""
    
    def test_run_data_integrity_checks(self):
        """POST /api/qa/integrity/run - Run data integrity checks"""
        response = requests.post(f"{BASE_URL}/qa/integrity/run")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "id" in data, "Response should have check run ID"
        assert "type" in data and data["type"] == "data_integrity", "Type should be data_integrity"
        assert "total_checks" in data, "Response should have total_checks"
        assert "passed" in data, "Response should have passed count"
        assert "failed" in data, "Response should have failed count"
        assert "issues_found" in data, "Response should have issues_found"
        assert "results" in data, "Response should have results array"
        
        # Verify 8 integrity checks were run
        assert data["total_checks"] == 8, f"Expected 8 integrity checks, got {data['total_checks']}"
        
        # Verify each result has required fields
        for result in data["results"]:
            assert "check" in result, "Each result should have check name"
            assert "passed" in result, "Each result should have passed status"
            assert "issues_count" in result, "Each result should have issues_count"
        
        print(f"SUCCESS: Integrity checks ran - {data['passed']}/{data['total_checks']} passed, {data['issues_found']} issues")
        return data
    
    def test_get_integrity_check_history(self):
        """GET /api/qa/integrity/history - Get integrity check history"""
        response = requests.get(f"{BASE_URL}/qa/integrity/history?limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "checks" in data, "Response should have 'checks' array"
        assert "total" in data, "Response should have 'total' count"
        assert "page" in data, "Response should have 'page' number"
        
        # If we have checks, verify their structure
        if data["checks"]:
            check = data["checks"][0]
            assert "id" in check, "Each check should have an id"
            assert "started_at" in check, "Each check should have started_at"
        
        print(f"SUCCESS: Got integrity check history - {len(data['checks'])} records, total: {data['total']}")


class TestMonitoring:
    """Test Advanced Monitoring endpoints"""
    
    def test_get_current_metrics(self):
        """GET /api/qa/monitoring/metrics - Get current system metrics"""
        response = requests.get(f"{BASE_URL}/qa/monitoring/metrics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify expected metrics are present
        expected_metrics = [
            "error_rate_hourly",
            "avg_api_latency_ms",
            "payment_success_rate",
            "pending_escrows",
            "notification_queue_size",
            "signup_rate_hourly",
            "active_alerts"
        ]
        
        for metric in expected_metrics:
            assert metric in data, f"Missing metric: {metric}"
        
        assert "timestamp" in data, "Response should have timestamp"
        
        print(f"SUCCESS: Got current metrics - Error rate: {data['error_rate_hourly']}, Latency: {data['avg_api_latency_ms']}ms")
        return data
    
    def test_add_monitoring_threshold(self):
        """POST /api/qa/monitoring/thresholds - Add monitoring threshold"""
        payload = {
            "metric_name": "TEST_error_rate_hourly",
            "threshold_type": "above",
            "threshold_value": 100,
            "alert_severity": "warning",
            "admin_id": "test_admin"
        }
        response = requests.post(f"{BASE_URL}/qa/monitoring/thresholds", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Response returns the created threshold object
        assert "metric_name" in data, f"Expected metric_name in response, got {data}"
        assert data["metric_name"] == payload["metric_name"]
        assert "threshold_value" in data
        assert "enabled" in data
        
        print(f"SUCCESS: Added monitoring threshold for {payload['metric_name']}")
    
    def test_get_monitoring_thresholds(self):
        """GET /api/qa/monitoring/thresholds - Get all monitoring thresholds"""
        response = requests.get(f"{BASE_URL}/qa/monitoring/thresholds")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If we have thresholds, verify their structure
        for threshold in data:
            assert "metric_name" in threshold, "Each threshold should have metric_name"
            assert "threshold_type" in threshold, "Each threshold should have threshold_type"
            assert "threshold_value" in threshold, "Each threshold should have threshold_value"
        
        print(f"SUCCESS: Got {len(data)} monitoring thresholds")
    
    def test_delete_monitoring_threshold(self):
        """DELETE /api/qa/monitoring/thresholds/{metric_name} - Delete threshold"""
        # First add a test threshold
        payload = {
            "metric_name": "TEST_delete_threshold",
            "threshold_type": "above",
            "threshold_value": 50,
            "alert_severity": "warning",
            "admin_id": "test_admin"
        }
        requests.post(f"{BASE_URL}/qa/monitoring/thresholds", json=payload)
        
        # Now delete it
        response = requests.delete(f"{BASE_URL}/qa/monitoring/thresholds/TEST_delete_threshold")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        print("SUCCESS: Deleted monitoring threshold")


class TestFailsafe:
    """Test Fail-Safe System endpoints"""
    
    def test_get_failsafe_status(self):
        """GET /api/qa/failsafe/status - Get fail-safe status"""
        response = requests.get(f"{BASE_URL}/qa/failsafe/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "overall_status" in data, "Response should have overall_status"
        assert "operations" in data, "Response should have operations"
        
        # Verify all 5 operations are present
        expected_operations = ["checkout", "payment", "escrow_release", "notification", "listing_create"]
        for op in expected_operations:
            assert op in data["operations"], f"Missing operation: {op}"
            assert "allowed" in data["operations"][op], f"Operation {op} should have 'allowed' field"
        
        print(f"SUCCESS: Got fail-safe status - Overall: {data['overall_status']}")
        return data


class TestSystemHealth:
    """Test System Health and QA endpoints"""
    
    def test_system_health(self):
        """GET /api/qa/health - Get overall system health"""
        response = requests.get(f"{BASE_URL}/qa/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "overall_status" in data, "Response should have overall_status"
        assert "services" in data, "Response should have services"
        
        print(f"SUCCESS: System health - Overall: {data['overall_status']}")
    
    def test_run_qa_checks(self):
        """POST /api/qa/checks/run - Run QA checks"""
        response = requests.post(f"{BASE_URL}/qa/checks/run")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total" in data, "Response should have total"
        assert "passed" in data, "Response should have passed"
        assert "failed" in data, "Response should have failed"
        assert "results" in data, "Response should have results"
        
        print(f"SUCCESS: QA checks - {data['passed']}/{data['total']} passed")


class TestCleanup:
    """Cleanup test data after tests"""
    
    def test_cleanup_test_thresholds(self):
        """Cleanup test monitoring thresholds"""
        # Delete any test thresholds we created
        for metric in ["TEST_error_rate_hourly", "TEST_delete_threshold"]:
            try:
                requests.delete(f"{BASE_URL}/qa/monitoring/thresholds/{metric}")
            except:
                pass
        print("SUCCESS: Cleaned up test thresholds")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
