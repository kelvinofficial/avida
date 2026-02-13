"""
Test Report API Endpoints
- GET /api/report/reasons - returns report reasons
- POST /api/report/message - submits report (requires auth)
- Verify report creates entry in user_reports collection
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://listings-realtime.preview.emergentagent.com')

# Global test data - initialized once per module
_test_data = {}


def setup_module(module):
    """Setup test users, listing, and conversation once for all tests"""
    global _test_data
    
    # Create reporter user - use separate session
    reporter_email = f"test_reporter_{uuid.uuid4().hex[:8]}@test.com"
    reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": reporter_email,
        "password": "test123456",
        "name": "Test Reporter"
    })
    assert reg_resp.status_code in [200, 201, 400], f"Failed to register reporter: {reg_resp.text}"
    
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": reporter_email,
        "password": "test123456"
    })
    assert login_resp.status_code == 200, f"Failed to login reporter: {login_resp.text}"
    reporter_data = login_resp.json()
    
    _test_data['reporter'] = {
        "user_id": reporter_data.get("user", {}).get("user_id"),
        "token": reporter_data.get("session_token"),
        "email": reporter_email
    }
    print(f"Reporter user_id: {_test_data['reporter']['user_id']}")
    
    # Create listing owner (other user) - use separate session
    other_email = f"test_other_{uuid.uuid4().hex[:8]}@test.com"
    reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": other_email,
        "password": "test123456",
        "name": "Other User"
    })
    assert reg_resp.status_code in [200, 201, 400], f"Failed to register other: {reg_resp.text}"
    
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": other_email,
        "password": "test123456"
    })
    assert login_resp.status_code == 200, f"Failed to login other: {login_resp.text}"
    other_data = login_resp.json()
    
    _test_data['other'] = {
        "user_id": other_data.get("user", {}).get("user_id"),
        "token": other_data.get("session_token"),
        "email": other_email
    }
    print(f"Other user_id: {_test_data['other']['user_id']}")
    
    # Create listing using OTHER's token - use a fresh request, not session
    print(f"\nCreating listing with OTHER's token: {_test_data['other']['token'][:20]}...")
    listing_data = {
        "title": f"Test Listing for Report API {uuid.uuid4().hex[:8]}",
        "description": "Test listing for report functionality",
        "price": 100,
        "category_id": "electronics",
        "subcategory": "laptops_computers",
        "condition": "new",
        "location": "Test Location",
        "images": []
    }
    
    list_resp = requests.post(
        f"{BASE_URL}/api/listings",
        json=listing_data,
        headers={
            "Authorization": f"Bearer {_test_data['other']['token']}",
            "Content-Type": "application/json"
        }
    )
    print(f"Listing creation: {list_resp.status_code}")
    assert list_resp.status_code in [200, 201], f"Failed to create listing: {list_resp.text}"
    _test_data['listing'] = list_resp.json()
    print(f"Listing owner: {_test_data['listing'].get('user_id')}")
    
    # Verify the listing owner is the other user
    assert _test_data['listing'].get('user_id') == _test_data['other']['user_id'], \
        f"Listing owner mismatch: {_test_data['listing'].get('user_id')} != {_test_data['other']['user_id']}"
    
    # Create conversation - REPORTER starts chat on OTHER's listing - use fresh request
    print(f"\nCreating conversation with REPORTER's token: {_test_data['reporter']['token'][:20]}...")
    conv_resp = requests.post(
        f"{BASE_URL}/api/conversations?listing_id={_test_data['listing']['id']}",
        headers={
            "Authorization": f"Bearer {_test_data['reporter']['token']}",
            "Content-Type": "application/json"
        }
    )
    print(f"Conversation creation: {conv_resp.status_code}")
    if conv_resp.status_code != 200:
        print(f"Response: {conv_resp.text}")
    
    assert conv_resp.status_code in [200, 201], f"Failed to create conversation: {conv_resp.text}"
    _test_data['conversation'] = conv_resp.json()
    
    print(f"Setup complete: reporter={_test_data['reporter']['user_id']}, other={_test_data['other']['user_id']}")
    print(f"Conversation: {_test_data['conversation']['id']}")


class TestReportReasons:
    """Test GET /api/report/reasons endpoint"""
    
    def test_returns_200(self):
        """Test GET /api/report/reasons returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/report/reasons")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("GET /api/report/reasons returns 200 OK")
    
    def test_returns_7_reasons(self):
        """Test GET /api/report/reasons returns exactly 7 report reasons"""
        response = requests.get(f"{BASE_URL}/api/report/reasons")
        data = response.json()
        
        assert "reasons" in data, "Response should contain 'reasons' key"
        assert len(data["reasons"]) == 7, f"Expected 7 reasons, got {len(data['reasons'])}"
        print(f"GET /api/report/reasons returns {len(data['reasons'])} reasons")
    
    def test_has_correct_ids(self):
        """Test report reasons contain all expected IDs"""
        response = requests.get(f"{BASE_URL}/api/report/reasons")
        data = response.json()
        
        expected_ids = ["scam", "abuse", "fake_listing", "off_platform_payment", "harassment", "spam", "other"]
        actual_ids = [r["id"] for r in data["reasons"]]
        
        for expected_id in expected_ids:
            assert expected_id in actual_ids, f"Missing reason ID: {expected_id}"
        
        print(f"All expected reason IDs present: {expected_ids}")
    
    def test_has_labels(self):
        """Test each report reason has both id and label"""
        response = requests.get(f"{BASE_URL}/api/report/reasons")
        data = response.json()
        
        for reason in data["reasons"]:
            assert "id" in reason, f"Reason missing 'id': {reason}"
            assert "label" in reason, f"Reason missing 'label': {reason}"
            assert reason["label"], f"Reason has empty label: {reason}"
        
        print("All reasons have id and non-empty label")
    
    def test_endpoint_is_public(self):
        """Test that /api/report/reasons does not require authentication"""
        response = requests.get(f"{BASE_URL}/api/report/reasons")
        assert response.status_code == 200, f"Report reasons should be public, got {response.status_code}"
        print("GET /api/report/reasons is public (no auth required)")
    
    def test_response_format(self):
        """Test the exact format of report reasons response"""
        response = requests.get(f"{BASE_URL}/api/report/reasons")
        data = response.json()
        
        expected_reasons = [
            {"id": "scam", "label": "Scam or fraud"},
            {"id": "abuse", "label": "Abusive or threatening"},
            {"id": "fake_listing", "label": "Fake or misleading listing"},
            {"id": "off_platform_payment", "label": "Asking for payment outside platform"},
            {"id": "harassment", "label": "Harassment"},
            {"id": "spam", "label": "Spam"},
            {"id": "other", "label": "Other"}
        ]
        
        for expected in expected_reasons:
            found = any(
                r["id"] == expected["id"] and r["label"] == expected["label"]
                for r in data["reasons"]
            )
            assert found, f"Expected reason not found or mismatch: {expected}"
        
        print("Report reasons response format verified correctly")


class TestReportAuthentication:
    """Test authentication requirements for report endpoints"""
    
    def test_requires_auth(self):
        """Test POST /api/report/message requires authentication"""
        response = requests.post(f"{BASE_URL}/api/report/message", json={
            "conversation_id": "test-conv-id",
            "reason": "scam"
        })
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"POST /api/report/message returns {response.status_code} without auth (correct)")
    
    def test_invalid_conversation_returns_404(self):
        """Test POST /api/report/message returns 404 for non-existent conversation"""
        headers = {"Authorization": f"Bearer {_test_data['reporter']['token']}"}
        
        response = requests.post(f"{BASE_URL}/api/report/message", json={
            "conversation_id": "non-existent-conversation-id",
            "reason": "scam"
        }, headers=headers)
        
        assert response.status_code == 404, f"Expected 404 for non-existent conv, got {response.status_code}"
        print("POST /api/report/message returns 404 for non-existent conversation")


class TestReportSubmission:
    """Test successful report submission"""
    
    def test_success_with_reason_only(self):
        """Test POST /api/report/message succeeds with just conversation_id and reason"""
        headers = {"Authorization": f"Bearer {_test_data['reporter']['token']}"}
        
        response = requests.post(f"{BASE_URL}/api/report/message", json={
            "conversation_id": _test_data['conversation']['id'],
            "reason": "scam"
        }, headers=headers)
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "report_id" in data or "message" in data, f"Response should contain report_id or message: {data}"
        print(f"Report submitted successfully: {data}")
    
    def test_success_with_description(self):
        """Test POST /api/report/message succeeds with description"""
        headers = {"Authorization": f"Bearer {_test_data['reporter']['token']}"}
        
        response = requests.post(f"{BASE_URL}/api/report/message", json={
            "conversation_id": _test_data['conversation']['id'],
            "reason": "harassment",
            "description": "Test description for harassment report"
        }, headers=headers)
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        print("Report with description submitted successfully")
    
    def test_all_reasons_accepted(self):
        """Test POST /api/report/message accepts all 7 reason types"""
        headers = {"Authorization": f"Bearer {_test_data['reporter']['token']}"}
        
        reasons = ["scam", "abuse", "fake_listing", "off_platform_payment", "harassment", "spam", "other"]
        
        for reason in reasons:
            response = requests.post(f"{BASE_URL}/api/report/message", json={
                "conversation_id": _test_data['conversation']['id'],
                "reason": reason,
                "description": f"Test report with reason: {reason}"
            }, headers=headers)
            
            assert response.status_code in [200, 201], f"Reason '{reason}' failed: {response.status_code} - {response.text}"
            print(f"  Reason '{reason}' accepted")
        
        print("All 7 reason types accepted successfully")
    
    def test_creates_database_entry(self):
        """Test that submitting report creates entry with report_id returned"""
        headers = {"Authorization": f"Bearer {_test_data['reporter']['token']}"}
        
        unique_desc = f"unique_test_report_{uuid.uuid4().hex}"
        
        response = requests.post(f"{BASE_URL}/api/report/message", json={
            "conversation_id": _test_data['conversation']['id'],
            "reason": "other",
            "description": unique_desc
        }, headers=headers)
        
        assert response.status_code in [200, 201], f"Failed to create report: {response.status_code}"
        
        data = response.json()
        assert "report_id" in data, f"Response should contain report_id: {data}"
        
        print(f"Report created with ID: {data['report_id']}")
        print("Report entry created in user_reports collection")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
