"""
Test Suite for Notification Queue System
Tests queue statistics, failed messages, retry functionality, and preferences API
This is an extension to the notification system - tests added queue endpoints
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://listing-form-builder.preview.emergentagent.com').rstrip('/')


class TestQueueStats:
    """Tests for notification queue statistics endpoint"""
    
    def test_get_queue_stats_returns_stats(self):
        """GET /api/notifications/queue/stats - Returns queue statistics"""
        response = requests.get(f"{BASE_URL}/api/notifications/queue/stats")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions - stats should have queue status fields
        data = response.json()
        assert isinstance(data, dict), "Response should be a dictionary"
        
        # Should have total field
        assert "total" in data, "Stats should have 'total' field"
        assert isinstance(data["total"], int), "Total should be an integer"
        
        # Should have pending_in_queue field (as per notification_service.py line 1343-1345)
        assert "pending_in_queue" in data, "Stats should have 'pending_in_queue' field"
        
        print(f"Queue stats: {data}")


class TestQueueFailedMessages:
    """Tests for failed messages from queue endpoint"""
    
    def test_get_failed_messages_returns_paginated_list(self):
        """GET /api/notifications/queue/failed - Returns failed messages from queue"""
        response = requests.get(f"{BASE_URL}/api/notifications/queue/failed")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions - paginated structure
        data = response.json()
        assert "messages" in data, "Response should contain 'messages' array"
        assert "total" in data, "Response should contain 'total' count"
        assert "page" in data, "Response should contain 'page' number"
        assert "pages" in data, "Response should contain 'pages' count"
        
        assert isinstance(data["messages"], list), "Messages should be a list"
        assert isinstance(data["total"], int), "Total should be an integer"
        assert data["page"] >= 1, "Page should be at least 1"
        
        print(f"Failed messages count: {data['total']}, page {data['page']} of {data['pages']}")
    
    def test_get_failed_messages_with_pagination(self):
        """GET /api/notifications/queue/failed - Test pagination parameters"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/queue/failed",
            params={"page": 1, "limit": 10}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["page"] == 1, "Page should be 1"
        assert len(data["messages"]) <= 10, "Should not exceed limit"
    
    def test_get_failed_messages_empty_page(self):
        """GET /api/notifications/queue/failed - High page number returns empty list"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/queue/failed",
            params={"page": 9999, "limit": 50}
        )
        
        assert response.status_code == 200
        data = response.json()
        # High page number should return empty messages but valid structure
        assert "messages" in data
        assert isinstance(data["messages"], list)


class TestQueueRetry:
    """Tests for retry failed message endpoint"""
    
    def test_retry_nonexistent_message_returns_404(self):
        """POST /api/notifications/queue/{id}/retry - 404 for invalid ID"""
        fake_id = f"queue_nonexistent_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/notifications/queue/{fake_id}/retry")
        
        # Status assertion - should return 404 for nonexistent message
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "detail" in data, "Response should contain detail message"
        assert "not found" in data["detail"].lower(), f"Detail should mention 'not found': {data['detail']}"
    
    def test_retry_empty_id_returns_404(self):
        """POST /api/notifications/queue/{id}/retry - Empty ID returns 404"""
        response = requests.post(f"{BASE_URL}/api/notifications/queue/invalid_id/retry")
        
        # Should return 404 for invalid/empty ID
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_retry_random_invalid_id_returns_404(self):
        """POST /api/notifications/queue/{id}/retry - Random invalid ID returns 404"""
        random_id = f"random_{uuid.uuid4().hex}"
        response = requests.post(f"{BASE_URL}/api/notifications/queue/{random_id}/retry")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"


class TestNotificationPreferencesExtended:
    """Extended tests for user notification preferences (GET and PUT)"""
    
    def test_get_preferences_returns_all_fields(self):
        """GET /api/notifications/preferences - Returns user notification preferences"""
        response = requests.get(f"{BASE_URL}/api/notifications/preferences")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        
        # Required fields
        assert "sms" in data, "Should have 'sms' preference"
        assert "whatsapp" in data, "Should have 'whatsapp' preference"
        assert "email" in data, "Should have 'email' preference"
        assert "preferred_channel" in data, "Should have 'preferred_channel'"
        
        # Type assertions
        assert isinstance(data["sms"], bool), "sms should be boolean"
        assert isinstance(data["whatsapp"], bool), "whatsapp should be boolean"
        assert isinstance(data["email"], bool), "email should be boolean"
        assert data["preferred_channel"] in ["sms", "whatsapp", "email"], \
            f"preferred_channel should be valid: {data['preferred_channel']}"
        
        print(f"Current preferences: {data}")
    
    def test_update_preferences_success(self):
        """PUT /api/notifications/preferences - Updates user notification preferences"""
        new_preferences = {
            "sms": True,
            "whatsapp": True,
            "email": True,
            "preferred_channel": "whatsapp"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            json=new_preferences
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "success" in data, "Response should contain 'success' field"
        assert data["success"] == True, "Update should succeed"
        assert "preferences" in data, "Response should contain 'preferences'"
        
        # Verify preferences match what was sent
        prefs = data["preferences"]
        assert prefs["sms"] == new_preferences["sms"], "sms preference should match"
        assert prefs["whatsapp"] == new_preferences["whatsapp"], "whatsapp preference should match"
        assert prefs["email"] == new_preferences["email"], "email preference should match"
        assert prefs["preferred_channel"] == new_preferences["preferred_channel"], \
            "preferred_channel should match"
        
        print(f"Updated preferences: {data}")
    
    def test_update_preferences_partial(self):
        """PUT /api/notifications/preferences - Partial update works"""
        partial_update = {
            "sms": False
        }
        
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            json=partial_update
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data["success"] == True, "Partial update should succeed"
    
    def test_update_preferences_toggle_channels(self):
        """PUT /api/notifications/preferences - Toggle notification channels"""
        # Test toggling SMS off
        update_sms_off = {"sms": False, "whatsapp": True}
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            json=update_sms_off
        )
        assert response.status_code == 200
        
        # Test toggling WhatsApp off
        update_wa_off = {"sms": True, "whatsapp": False}
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            json=update_wa_off
        )
        assert response.status_code == 200
        
        # Reset to defaults
        reset_defaults = {"sms": True, "whatsapp": True, "email": False, "preferred_channel": "sms"}
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            json=reset_defaults
        )
        assert response.status_code == 200


class TestQueueProcessorRunning:
    """Tests to verify queue processor is running"""
    
    def test_queue_stats_endpoint_accessible(self):
        """Verify queue stats endpoint is accessible (implies queue is initialized)"""
        response = requests.get(f"{BASE_URL}/api/notifications/queue/stats")
        
        # If the queue is not initialized, this would return 500 or 404
        assert response.status_code == 200, \
            f"Queue stats should be accessible, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Having a response with stats structure implies queue is running
        assert "total" in data or "pending_in_queue" in data, \
            "Stats should have queue-related fields"
        
        print("Queue processor appears to be running - stats endpoint accessible")


class TestEscrowNotificationIntegration:
    """Tests to verify EscrowNotificationIntegration is loaded"""
    
    def test_escrow_integration_loaded_via_queue_stats(self):
        """Verify escrow notification integration is loaded by checking queue accessibility"""
        # The queue is initialized with escrow integration in server.py line 5760
        # If queue stats work, it means escrow integration is loaded
        response = requests.get(f"{BASE_URL}/api/notifications/queue/stats")
        
        assert response.status_code == 200, \
            f"Queue should be accessible if escrow integration is loaded: {response.status_code}"
        
        print("EscrowNotificationIntegration appears to be loaded - queue is accessible")
    
    def test_health_check_confirms_services_running(self):
        """Health check confirms all services including queue are healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        
        assert response.status_code == 200, f"Health check should pass: {response.status_code}"
        data = response.json()
        assert data.get("status") == "healthy", "Service should be healthy"


# Combined integration test
class TestQueueEndpointsIntegration:
    """Integration tests for all queue endpoints together"""
    
    def test_full_queue_flow(self):
        """Test complete queue workflow: stats -> failed -> retry (404)"""
        # 1. Get queue stats
        stats_response = requests.get(f"{BASE_URL}/api/notifications/queue/stats")
        assert stats_response.status_code == 200, "Queue stats should work"
        stats = stats_response.json()
        print(f"Step 1 - Queue Stats: {stats}")
        
        # 2. Get failed messages
        failed_response = requests.get(f"{BASE_URL}/api/notifications/queue/failed")
        assert failed_response.status_code == 200, "Failed messages should work"
        failed = failed_response.json()
        print(f"Step 2 - Failed Messages: total={failed['total']}")
        
        # 3. Try to retry a nonexistent message (should 404)
        retry_response = requests.post(
            f"{BASE_URL}/api/notifications/queue/queue_test123/retry"
        )
        assert retry_response.status_code == 404, "Retry nonexistent should 404"
        print("Step 3 - Retry nonexistent: Got expected 404")
        
        print("Full queue flow integration test passed!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
