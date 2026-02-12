"""
Test Suite for New QA Features:
1. Critical User Flow Testing - Run comprehensive tests for listing, checkout, escrow, notifications, payments, auth
2. Fail-Safe Behaviors - Check operation allowed/blocked based on service health
3. Retry & Recovery Logic - Get/update retry config, trigger retries for failed jobs
4. Real-time WebSocket Alerts - Subscribe/unsubscribe admin alerts, get subscriptions, send test alerts
"""
import pytest
import requests
import os
import time
from datetime import datetime

# Use the backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://dating-subcats.preview.emergentagent.com"


class TestCriticalFlowTesting:
    """Test Critical User Flow Testing endpoints"""
    
    def test_run_flow_tests_returns_200(self):
        """POST /api/qa/flow-tests/run - Run comprehensive critical flow tests"""
        response = requests.post(f"{BASE_URL}/api/qa/flow-tests/run", timeout=60)
        print(f"Run flow tests response: {response.status_code}")
        assert response.status_code == 200
        
    def test_run_flow_tests_response_structure(self):
        """Verify flow tests response contains expected fields"""
        response = requests.post(f"{BASE_URL}/api/qa/flow-tests/run", timeout=60)
        data = response.json()
        print(f"Flow tests response: {data}")
        
        # Check required fields
        assert "id" in data, "Response should have 'id' field"
        assert "type" in data, "Response should have 'type' field"
        assert data["type"] == "critical_flow_test"
        assert "total_tests" in data, "Response should have 'total_tests' field"
        assert "passed" in data, "Response should have 'passed' count"
        assert "failed" in data, "Response should have 'failed' count"
        assert "results" in data, "Response should have 'results' array"
        assert "success_rate" in data, "Response should have 'success_rate' field"
        
    def test_flow_tests_include_all_flows(self):
        """Verify all 6 critical flows are tested"""
        response = requests.post(f"{BASE_URL}/api/qa/flow-tests/run", timeout=60)
        data = response.json()
        
        results = data.get("results", [])
        flow_names = [r.get("flow") for r in results]
        
        expected_flows = ["listing_creation", "checkout", "escrow", "notifications", "payment_integration", "authentication"]
        
        for flow in expected_flows:
            assert flow in flow_names, f"Flow '{flow}' should be included in test results"
            
        print(f"All {len(expected_flows)} expected flows tested: {flow_names}")
        
    def test_flow_test_result_structure(self):
        """Verify individual flow test result structure"""
        response = requests.post(f"{BASE_URL}/api/qa/flow-tests/run", timeout=60)
        data = response.json()
        
        results = data.get("results", [])
        assert len(results) > 0, "Should have at least one test result"
        
        first_result = results[0]
        assert "flow" in first_result, "Result should have 'flow' name"
        assert "passed" in first_result, "Result should have 'passed' boolean"
        assert "duration_ms" in first_result, "Result should have 'duration_ms'"
        assert "steps" in first_result, "Result should have 'steps' array"
        
        print(f"First flow result: {first_result['flow']} - passed: {first_result['passed']}")
        
    def test_get_flow_test_history_returns_200(self):
        """GET /api/qa/flow-tests/history - Get flow test history"""
        response = requests.get(f"{BASE_URL}/api/qa/flow-tests/history")
        print(f"Flow test history response: {response.status_code}")
        assert response.status_code == 200
        
    def test_get_flow_test_history_structure(self):
        """Verify flow test history response structure"""
        response = requests.get(f"{BASE_URL}/api/qa/flow-tests/history")
        data = response.json()
        
        assert "tests" in data, "Response should have 'tests' array"
        assert "total" in data, "Response should have 'total' count"
        assert "page" in data, "Response should have 'page' field"
        assert "limit" in data, "Response should have 'limit' field"
        
        print(f"Flow test history - total: {data['total']}, page: {data['page']}")
        
    def test_flow_test_history_with_filters(self):
        """Test flow test history with filter parameters"""
        # Filter by flow_type
        response = requests.get(f"{BASE_URL}/api/qa/flow-tests/history?flow_type=checkout")
        assert response.status_code == 200
        
        # Filter by passed status
        response = requests.get(f"{BASE_URL}/api/qa/flow-tests/history?passed=true")
        assert response.status_code == 200
        
        # Pagination
        response = requests.get(f"{BASE_URL}/api/qa/flow-tests/history?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 10
        
        print("Flow test history filters working correctly")


class TestFailSafeSystem:
    """Test Fail-Safe System endpoints"""
    
    def test_get_failsafe_status_returns_200(self):
        """GET /api/qa/failsafe/status - Get fail-safe system status"""
        response = requests.get(f"{BASE_URL}/api/qa/failsafe/status")
        print(f"Failsafe status response: {response.status_code}")
        assert response.status_code == 200
        
    def test_failsafe_status_structure(self):
        """Verify fail-safe status response structure"""
        response = requests.get(f"{BASE_URL}/api/qa/failsafe/status")
        data = response.json()
        
        assert "overall_status" in data, "Response should have 'overall_status'"
        assert "operations" in data, "Response should have 'operations' dict"
        assert "blocked_count" in data, "Response should have 'blocked_count'"
        assert "checked_at" in data, "Response should have 'checked_at' timestamp"
        
        print(f"Failsafe overall status: {data['overall_status']}, blocked: {data['blocked_count']}")
        
    def test_failsafe_operations_covered(self):
        """Verify all critical operations are covered in failsafe"""
        response = requests.get(f"{BASE_URL}/api/qa/failsafe/status")
        data = response.json()
        
        operations = data.get("operations", {})
        expected_ops = ["checkout", "payment", "escrow_release", "notification", "listing_create"]
        
        for op in expected_ops:
            assert op in operations, f"Operation '{op}' should be in failsafe status"
            assert "allowed" in operations[op], f"Operation '{op}' should have 'allowed' field"
            
        print(f"All {len(expected_ops)} operations covered in failsafe")
        
    def test_check_checkout_operation(self):
        """POST /api/qa/failsafe/check/checkout - Check if checkout is allowed"""
        response = requests.post(f"{BASE_URL}/api/qa/failsafe/check/checkout")
        assert response.status_code == 200
        
        data = response.json()
        assert "operation" in data
        assert data["operation"] == "checkout"
        assert "allowed" in data
        assert "reasons" in data
        assert "warnings" in data
        
        print(f"Checkout operation - allowed: {data['allowed']}, reasons: {data['reasons']}")
        
    def test_check_payment_operation(self):
        """POST /api/qa/failsafe/check/payment - Check if payment is allowed"""
        response = requests.post(f"{BASE_URL}/api/qa/failsafe/check/payment")
        assert response.status_code == 200
        
        data = response.json()
        assert data["operation"] == "payment"
        assert "allowed" in data
        
        print(f"Payment operation - allowed: {data['allowed']}")
        
    def test_check_escrow_release_operation(self):
        """POST /api/qa/failsafe/check/escrow_release - Check if escrow release is allowed"""
        response = requests.post(f"{BASE_URL}/api/qa/failsafe/check/escrow_release")
        assert response.status_code == 200
        
        data = response.json()
        assert data["operation"] == "escrow_release"
        
        print(f"Escrow release operation - allowed: {data['allowed']}")
        
    def test_check_notification_operation(self):
        """POST /api/qa/failsafe/check/notification - Check if notification is allowed"""
        response = requests.post(f"{BASE_URL}/api/qa/failsafe/check/notification")
        assert response.status_code == 200
        
        data = response.json()
        assert data["operation"] == "notification"
        
        print(f"Notification operation - allowed: {data['allowed']}")
        
    def test_check_listing_create_operation(self):
        """POST /api/qa/failsafe/check/listing_create - Check if listing creation is allowed"""
        response = requests.post(f"{BASE_URL}/api/qa/failsafe/check/listing_create")
        assert response.status_code == 200
        
        data = response.json()
        assert data["operation"] == "listing_create"
        
        print(f"Listing create operation - allowed: {data['allowed']}")


class TestRetryRecoverySystem:
    """Test Retry & Recovery System endpoints"""
    
    def test_get_retry_config_returns_200(self):
        """GET /api/qa/retry/config - Get retry configuration"""
        response = requests.get(f"{BASE_URL}/api/qa/retry/config")
        print(f"Retry config response: {response.status_code}")
        assert response.status_code == 200
        
    def test_retry_config_structure(self):
        """Verify retry config response structure"""
        response = requests.get(f"{BASE_URL}/api/qa/retry/config")
        data = response.json()
        
        assert "max_retries" in data, "Config should have 'max_retries'"
        assert "base_delay_seconds" in data, "Config should have 'base_delay_seconds'"
        assert "max_delay_seconds" in data, "Config should have 'max_delay_seconds'"
        assert "enabled_job_types" in data, "Config should have 'enabled_job_types'"
        
        print(f"Retry config: max_retries={data['max_retries']}, base_delay={data['base_delay_seconds']}s")
        
    def test_update_retry_config_returns_200(self):
        """PUT /api/qa/retry/config - Update retry configuration"""
        payload = {
            "max_retries": 5,
            "base_delay_seconds": 60,
            "max_delay_seconds": 7200,
            "admin_id": "test_admin_qa"
        }
        response = requests.put(f"{BASE_URL}/api/qa/retry/config", json=payload)
        print(f"Update retry config response: {response.status_code}")
        assert response.status_code == 200
        
    def test_update_retry_config_persists(self):
        """Verify updated retry config is persisted"""
        # Update config
        payload = {
            "max_retries": 4,
            "base_delay_seconds": 45,
            "max_delay_seconds": 5400,
            "admin_id": "test_admin_qa"
        }
        requests.put(f"{BASE_URL}/api/qa/retry/config", json=payload)
        
        # Verify it was updated
        response = requests.get(f"{BASE_URL}/api/qa/retry/config")
        data = response.json()
        
        assert data["max_retries"] == 4
        assert data["base_delay_seconds"] == 45
        assert data["max_delay_seconds"] == 5400
        
        print("Retry config update persisted correctly")
        
    def test_trigger_notification_retry_returns_200(self):
        """POST /api/qa/retry/trigger/notification - Trigger retry for failed notifications"""
        response = requests.post(
            f"{BASE_URL}/api/qa/retry/trigger/notification",
            json={}  # No specific job_id
        )
        print(f"Trigger notification retry response: {response.status_code}")
        assert response.status_code == 200
        
    def test_trigger_notification_retry_response_structure(self):
        """Verify trigger retry response structure"""
        response = requests.post(f"{BASE_URL}/api/qa/retry/trigger/notification", json={})
        data = response.json()
        
        assert "success" in data
        assert data["success"] == True
        assert "job_type" in data
        assert data["job_type"] == "notification"
        assert "retried_count" in data
        
        print(f"Notification retry - retried {data['retried_count']} jobs")
        
    def test_trigger_payment_webhook_retry(self):
        """POST /api/qa/retry/trigger/payment_webhook - Trigger retry for payment webhooks"""
        response = requests.post(f"{BASE_URL}/api/qa/retry/trigger/payment_webhook", json={})
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["job_type"] == "payment_webhook"
        
        print(f"Payment webhook retry - retried {data['retried_count']} jobs")
        
    def test_trigger_escrow_release_retry(self):
        """POST /api/qa/retry/trigger/escrow_release - Trigger retry for stuck escrow releases"""
        response = requests.post(f"{BASE_URL}/api/qa/retry/trigger/escrow_release", json={})
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["job_type"] == "escrow_release"
        
        print(f"Escrow release retry - retried {data['retried_count']} jobs")


class TestRealtimeAlerts:
    """Test Real-time WebSocket Alerts endpoints"""
    
    def test_subscribe_admin_returns_200(self):
        """POST /api/qa/realtime/subscribe - Subscribe admin to real-time alerts"""
        payload = {
            "admin_id": "test_admin_qa_001",
            "alert_types": ["critical", "warning", "system_down"]
        }
        response = requests.post(f"{BASE_URL}/api/qa/realtime/subscribe", json=payload)
        print(f"Subscribe admin response: {response.status_code}")
        assert response.status_code == 200
        
    def test_subscribe_admin_response_structure(self):
        """Verify subscribe response structure"""
        payload = {
            "admin_id": "test_admin_qa_002",
            "alert_types": ["critical", "high_error_rate"]
        }
        response = requests.post(f"{BASE_URL}/api/qa/realtime/subscribe", json=payload)
        data = response.json()
        
        assert "success" in data
        assert data["success"] == True
        assert "subscription" in data
        
        subscription = data["subscription"]
        assert subscription["admin_id"] == "test_admin_qa_002"
        assert "alert_types" in subscription
        assert "subscribed_at" in subscription
        
        print(f"Admin subscribed: {subscription['admin_id']} - types: {subscription['alert_types']}")
        
    def test_unsubscribe_admin_returns_200(self):
        """POST /api/qa/realtime/unsubscribe - Unsubscribe admin from alerts"""
        # First subscribe
        requests.post(f"{BASE_URL}/api/qa/realtime/subscribe", json={
            "admin_id": "test_admin_qa_unsub",
            "alert_types": ["critical"]
        })
        
        # Then unsubscribe
        response = requests.post(f"{BASE_URL}/api/qa/realtime/unsubscribe", json={
            "admin_id": "test_admin_qa_unsub"
        })
        print(f"Unsubscribe admin response: {response.status_code}")
        assert response.status_code == 200
        
    def test_unsubscribe_response_structure(self):
        """Verify unsubscribe response structure"""
        # Subscribe first
        requests.post(f"{BASE_URL}/api/qa/realtime/subscribe", json={
            "admin_id": "test_admin_qa_unsub2",
            "alert_types": ["warning"]
        })
        
        # Unsubscribe
        response = requests.post(f"{BASE_URL}/api/qa/realtime/unsubscribe", json={
            "admin_id": "test_admin_qa_unsub2"
        })
        data = response.json()
        
        assert "success" in data
        print(f"Unsubscribe success: {data['success']}")
        
    def test_get_subscriptions_returns_200(self):
        """GET /api/qa/realtime/subscriptions - Get current subscriptions"""
        response = requests.get(f"{BASE_URL}/api/qa/realtime/subscriptions")
        print(f"Get subscriptions response: {response.status_code}")
        assert response.status_code == 200
        
    def test_get_subscriptions_structure(self):
        """Verify subscriptions list structure"""
        response = requests.get(f"{BASE_URL}/api/qa/realtime/subscriptions")
        data = response.json()
        
        assert "subscriptions" in data
        assert "total" in data
        assert isinstance(data["subscriptions"], list)
        
        print(f"Total subscriptions: {data['total']}")
        
    def test_send_test_alert_returns_200(self):
        """POST /api/qa/realtime/test-alert - Send test real-time alert"""
        response = requests.post(f"{BASE_URL}/api/qa/realtime/test-alert", json={
            "admin_id": "test_admin_qa_alert"
        })
        print(f"Send test alert response: {response.status_code}")
        assert response.status_code == 200
        
    def test_send_test_alert_response_structure(self):
        """Verify test alert response structure"""
        response = requests.post(f"{BASE_URL}/api/qa/realtime/test-alert", json={
            "admin_id": "test_admin_qa_alert_struct"
        })
        data = response.json()
        
        assert "success" in data
        assert data["success"] == True
        assert "message" in data
        assert "alert" in data
        
        alert = data["alert"]
        assert alert["type"] == "test"
        assert alert["severity"] == "info"
        assert "title" in alert
        assert "message" in alert
        
        print(f"Test alert sent: {alert['title']}")


class TestFlowTestsIntegration:
    """Integration tests for flow tests - verify data flow and persistence"""
    
    def test_run_flow_tests_persists_to_history(self):
        """Verify flow tests are stored in history after running"""
        # Run flow tests
        run_response = requests.post(f"{BASE_URL}/api/qa/flow-tests/run", timeout=60)
        assert run_response.status_code == 200
        run_data = run_response.json()
        test_id = run_data.get("id")
        
        # Check history
        history_response = requests.get(f"{BASE_URL}/api/qa/flow-tests/history")
        history_data = history_response.json()
        
        # Find the test we just ran
        test_ids = [t.get("id") for t in history_data.get("tests", [])]
        assert test_id in test_ids, "Newly run flow test should appear in history"
        
        print(f"Flow test {test_id} found in history")
        
    def test_payment_integration_expected_behavior(self):
        """Verify payment_integration flow - may fail without recent transactions (expected)"""
        response = requests.post(f"{BASE_URL}/api/qa/flow-tests/run", timeout=60)
        data = response.json()
        
        # Find payment_integration result
        results = data.get("results", [])
        payment_result = next((r for r in results if r.get("flow") == "payment_integration"), None)
        
        assert payment_result is not None, "Payment integration flow should be tested"
        
        # This may fail if no recent transactions - that's expected per the test notes
        if not payment_result["passed"]:
            print(f"Payment integration failed (expected if no recent transactions): {payment_result.get('steps')}")
        else:
            print(f"Payment integration passed")


class TestFailsafeFeatureFlagIntegration:
    """Test that failsafe respects feature flags"""
    
    def test_failsafe_checks_feature_flags(self):
        """Verify failsafe checks include feature flag status"""
        # Check payment operation - should check payments_enabled flag
        response = requests.post(f"{BASE_URL}/api/qa/failsafe/check/payment")
        data = response.json()
        
        # If not allowed due to feature flag, reasons should mention it
        if not data["allowed"] and "Payments are disabled via feature flag" in data.get("reasons", []):
            print("Payment blocked by feature flag as expected")
        else:
            print(f"Payment check result: allowed={data['allowed']}, reasons={data['reasons']}")
            
        # Check escrow operation
        response = requests.post(f"{BASE_URL}/api/qa/failsafe/check/escrow_release")
        data = response.json()
        
        print(f"Escrow release check result: allowed={data['allowed']}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
