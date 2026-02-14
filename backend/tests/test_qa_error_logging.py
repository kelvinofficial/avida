"""
QA Error Logging API Tests
===========================
Tests for frontend error logging integration with the QA & Reliability system.

Tests cover:
- POST /api/qa/errors/log - Log frontend errors
- GET /api/qa/errors - List errors with filtering
- GET /api/qa/errors/reference/{reference_id} - Lookup by reference ID
- GET /api/qa/health - System health status
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shimmer-perf.preview.emergentagent.com')


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestQAHealthEndpoint:
    """Tests for GET /api/qa/health - System health status"""
    
    def test_health_endpoint_returns_200(self, api_client):
        """Test health endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/qa/health")
        assert response.status_code == 200
        print("✓ GET /api/qa/health returns 200")
    
    def test_health_response_structure(self, api_client):
        """Test health response has expected structure"""
        response = api_client.get(f"{BASE_URL}/api/qa/health")
        data = response.json()
        
        # Check overall status
        assert "overall_status" in data
        assert data["overall_status"] in ["healthy", "degraded", "down"]
        
        # Check services
        assert "services" in data
        assert "database" in data["services"]
        assert "api" in data["services"]
        
        # Check error stats
        assert "errors" in data
        assert "last_hour" in data["errors"]
        assert "last_24h" in data["errors"]
        
        print(f"✓ Health response structure valid - overall_status: {data['overall_status']}")
    
    def test_service_health_details(self, api_client):
        """Test individual service health details"""
        response = api_client.get(f"{BASE_URL}/api/qa/health")
        data = response.json()
        
        for service_name, service_data in data["services"].items():
            assert "status" in service_data
            assert "latency_ms" in service_data
            assert "last_check" in service_data
            assert service_data["status"] in ["healthy", "degraded", "down"]
        
        print(f"✓ All services have valid health data: {list(data['services'].keys())}")


class TestQAErrorLogging:
    """Tests for POST /api/qa/errors/log - Frontend error logging"""
    
    def test_log_error_returns_reference_id(self, api_client):
        """Test logging an error returns a reference ID"""
        payload = {
            "category": "frontend",
            "feature": "TEST_component",
            "error_type": "TestError",
            "message": "Test error for API verification",
            "severity": "warning",
            "session_id": f"TEST_session_{uuid.uuid4().hex[:8]}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/qa/errors/log", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "reference_id" in data
        assert data["reference_id"].startswith("ERR-")
        
        print(f"✓ Error logged with reference_id: {data['reference_id']}")
    
    def test_log_api_error_category(self, api_client):
        """Test logging an API error with endpoint info"""
        payload = {
            "category": "api",
            "feature": "listings",
            "error_type": "APIError",
            "message": "[404] Resource not found - /api/listings/invalid_id",
            "severity": "warning",
            "endpoint": "/api/listings/invalid_id",
            "session_id": f"TEST_session_{uuid.uuid4().hex[:8]}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/qa/errors/log", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "reference_id" in data
        print(f"✓ API error logged with reference_id: {data['reference_id']}")
    
    def test_log_critical_error(self, api_client):
        """Test logging a critical severity error"""
        payload = {
            "category": "frontend",
            "feature": "TEST_checkout",
            "error_type": "CriticalError",
            "message": "TEST critical error for severity testing",
            "severity": "critical",
            "stack_trace": "Error: TEST critical error\n    at TestComponent.render\n    at processChild",
            "session_id": f"TEST_session_{uuid.uuid4().hex[:8]}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/qa/errors/log", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "reference_id" in data
        print(f"✓ Critical error logged with reference_id: {data['reference_id']}")
    
    def test_log_error_with_user_id(self, api_client):
        """Test logging an error with user ID"""
        payload = {
            "category": "frontend",
            "feature": "TEST_profile",
            "error_type": "UserError",
            "message": "TEST error with user context",
            "severity": "info",
            "user_id": "TEST_user_12345",
            "session_id": f"TEST_session_{uuid.uuid4().hex[:8]}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/qa/errors/log", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "reference_id" in data
        print(f"✓ Error with user_id logged: {data['reference_id']}")
    
    def test_log_error_minimal_payload(self, api_client):
        """Test logging an error with minimal required fields"""
        payload = {
            "category": "frontend",
            "feature": "TEST_minimal",
            "error_type": "MinimalError",
            "message": "TEST minimal error payload"
        }
        
        response = api_client.post(f"{BASE_URL}/api/qa/errors/log", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "reference_id" in data
        print(f"✓ Minimal error logged: {data['reference_id']}")


class TestQAErrorRetrieval:
    """Tests for GET /api/qa/errors - Error log retrieval with filtering"""
    
    def test_get_errors_returns_200(self, api_client):
        """Test getting errors returns 200"""
        response = api_client.get(f"{BASE_URL}/api/qa/errors")
        assert response.status_code == 200
        print("✓ GET /api/qa/errors returns 200")
    
    def test_get_errors_response_structure(self, api_client):
        """Test error list response structure"""
        response = api_client.get(f"{BASE_URL}/api/qa/errors")
        data = response.json()
        
        assert "logs" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert "pages" in data
        
        assert isinstance(data["logs"], list)
        assert isinstance(data["total"], int)
        
        print(f"✓ Error list response valid - total: {data['total']}, pages: {data['pages']}")
    
    def test_error_log_structure(self, api_client):
        """Test individual error log structure"""
        response = api_client.get(f"{BASE_URL}/api/qa/errors?limit=1")
        data = response.json()
        
        if data["logs"]:
            error = data["logs"][0]
            
            # Required fields
            assert "id" in error
            assert "reference_id" in error
            assert "timestamp" in error
            assert "severity" in error
            assert "category" in error
            assert "feature" in error
            assert "error_type" in error
            assert "message" in error
            assert "resolved" in error
            
            # Optional fields should be present (can be null)
            assert "stack_trace" in error
            assert "user_id" in error
            assert "session_id" in error
            assert "endpoint" in error
            
            print(f"✓ Error log structure valid - reference_id: {error['reference_id']}")
        else:
            print("✓ Error list is empty - structure check skipped")
    
    def test_filter_by_severity(self, api_client):
        """Test filtering errors by severity"""
        response = api_client.get(f"{BASE_URL}/api/qa/errors?severity=warning")
        assert response.status_code == 200
        
        data = response.json()
        for error in data["logs"]:
            assert error["severity"] == "warning"
        
        print(f"✓ Severity filter works - {len(data['logs'])} warning errors")
    
    def test_filter_by_category(self, api_client):
        """Test filtering errors by category"""
        response = api_client.get(f"{BASE_URL}/api/qa/errors?category=frontend")
        assert response.status_code == 200
        
        data = response.json()
        for error in data["logs"]:
            assert error["category"] == "frontend"
        
        print(f"✓ Category filter works - {len(data['logs'])} frontend errors")
    
    def test_filter_by_resolved_status(self, api_client):
        """Test filtering errors by resolved status"""
        response = api_client.get(f"{BASE_URL}/api/qa/errors?resolved=false")
        assert response.status_code == 200
        
        data = response.json()
        for error in data["logs"]:
            assert error["resolved"] == False
        
        print(f"✓ Resolved filter works - {len(data['logs'])} unresolved errors")
    
    def test_pagination(self, api_client):
        """Test error list pagination"""
        response = api_client.get(f"{BASE_URL}/api/qa/errors?page=1&limit=2")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["logs"]) <= 2
        assert data["page"] == 1
        assert data["limit"] == 2
        
        print(f"✓ Pagination works - returned {len(data['logs'])} of max 2")


class TestQAErrorReferenceID:
    """Tests for GET /api/qa/errors/reference/{reference_id} - Lookup by reference"""
    
    def test_get_error_by_reference_id(self, api_client):
        """Test looking up error by reference ID"""
        # First log an error to get a reference ID
        payload = {
            "category": "frontend",
            "feature": "TEST_reference_lookup",
            "error_type": "TestError",
            "message": "Test error for reference ID lookup",
            "severity": "info"
        }
        
        log_response = api_client.post(f"{BASE_URL}/api/qa/errors/log", json=payload)
        reference_id = log_response.json()["reference_id"]
        
        # Now look it up
        response = api_client.get(f"{BASE_URL}/api/qa/errors/reference/{reference_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["reference_id"] == reference_id
        assert data["message"] == payload["message"]
        assert data["category"] == payload["category"]
        
        print(f"✓ Error lookup by reference_id works: {reference_id}")
    
    def test_get_nonexistent_reference_returns_404(self, api_client):
        """Test looking up non-existent reference ID returns 404"""
        response = api_client.get(f"{BASE_URL}/api/qa/errors/reference/ERR-NOTFOUND")
        assert response.status_code == 404
        print("✓ Non-existent reference_id returns 404")


class TestQAErrorFlow:
    """End-to-end tests for error logging flow"""
    
    def test_full_error_logging_flow(self, api_client):
        """Test complete error logging and retrieval flow"""
        unique_id = uuid.uuid4().hex[:8]
        session_id = f"TEST_flow_session_{unique_id}"
        
        # 1. Log an error
        payload = {
            "category": "api",
            "feature": f"TEST_flow_{unique_id}",
            "error_type": "FlowTestError",
            "message": f"End-to-end test error {unique_id}",
            "severity": "warning",
            "session_id": session_id,
            "endpoint": f"/api/test/{unique_id}"
        }
        
        log_response = api_client.post(f"{BASE_URL}/api/qa/errors/log", json=payload)
        assert log_response.status_code == 200
        reference_id = log_response.json()["reference_id"]
        print(f"  1. Logged error with reference: {reference_id}")
        
        # 2. Verify it appears in error list
        list_response = api_client.get(f"{BASE_URL}/api/qa/errors?limit=10")
        assert list_response.status_code == 200
        found = any(e["reference_id"] == reference_id for e in list_response.json()["logs"])
        assert found, "Error not found in list"
        print("  2. Error found in list")
        
        # 3. Look up by reference ID
        lookup_response = api_client.get(f"{BASE_URL}/api/qa/errors/reference/{reference_id}")
        assert lookup_response.status_code == 200
        error_data = lookup_response.json()
        assert error_data["session_id"] == session_id
        assert error_data["endpoint"] == payload["endpoint"]
        print("  3. Error retrieved by reference ID")
        
        # 4. Check health shows error count
        health_response = api_client.get(f"{BASE_URL}/api/qa/health")
        assert health_response.status_code == 200
        print("  4. Health endpoint shows error stats")
        
        print("✓ Full error logging flow completed successfully")


class TestAPIErrorSimulation:
    """Tests that simulate API errors being logged"""
    
    def test_log_404_error(self, api_client):
        """Test logging a 404 error from API"""
        payload = {
            "category": "api",
            "feature": "listings",
            "error_type": "NotFoundError",
            "message": "[404] Listing not found",
            "severity": "warning",
            "endpoint": "/api/listings/invalid_listing_id"
        }
        
        response = api_client.post(f"{BASE_URL}/api/qa/errors/log", json=payload)
        assert response.status_code == 200
        print(f"✓ 404 error logged: {response.json()['reference_id']}")
    
    def test_log_500_error(self, api_client):
        """Test logging a 500 error from API"""
        payload = {
            "category": "api",
            "feature": "checkout",
            "error_type": "InternalServerError",
            "message": "[500] Internal server error during checkout",
            "severity": "critical",
            "endpoint": "/api/checkout",
            "stack_trace": "Error: Database connection failed\n    at checkout.process"
        }
        
        response = api_client.post(f"{BASE_URL}/api/qa/errors/log", json=payload)
        assert response.status_code == 200
        print(f"✓ 500 error logged: {response.json()['reference_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
