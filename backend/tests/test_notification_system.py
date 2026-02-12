"""
Test Suite for Multi-Channel Notification System
Tests templates, logs, transport partners, OTP verification, tracking links, and user preferences
Providers are in SANDBOX mode so actual sending will fail but APIs should return proper responses
"""

import pytest
import requests
import os
import json
import uuid
from datetime import datetime

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://desktop-profile-hub.preview.emergentagent.com').rstrip('/')


class TestNotificationTemplates:
    """Tests for notification templates management"""
    
    def test_get_templates_returns_list(self):
        """GET /api/notifications/admin/templates - Returns list of notification templates"""
        response = requests.get(f"{BASE_URL}/api/notifications/admin/templates")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have default templates initialized"
        
        # Validate template structure
        template = data[0]
        assert "id" in template, "Template should have id"
        assert "event" in template, "Template should have event"
        assert "recipient_type" in template, "Template should have recipient_type"
        assert "channel" in template, "Template should have channel"
        assert "body" in template, "Template should have body"
        assert "is_active" in template, "Template should have is_active flag"
    
    def test_get_templates_filter_by_channel(self):
        """GET /api/notifications/admin/templates - Filter by channel"""
        response = requests.get(f"{BASE_URL}/api/notifications/admin/templates", params={"channel": "sms"})
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned templates should be SMS
        for template in data:
            assert template["channel"] == "sms", f"Expected SMS channel, got {template['channel']}"
    
    def test_get_templates_filter_by_event(self):
        """GET /api/notifications/admin/templates - Filter by event"""
        response = requests.get(f"{BASE_URL}/api/notifications/admin/templates", params={"event": "order_placed"})
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned templates should be for order_placed event
        for template in data:
            assert template["event"] == "order_placed", f"Expected order_placed event, got {template['event']}"
    
    def test_create_template(self):
        """POST /api/notifications/admin/templates - Create new template"""
        unique_id = str(uuid.uuid4())[:8]
        template_data = {
            "event": "test_event",
            "recipient_type": "buyer",
            "channel": "sms",
            "body": f"TEST_{unique_id} - Test notification for order {{{{order_id}}}}",
            "language": "en",
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/notifications/admin/templates",
            json=template_data
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "id" in data, "Response should contain template id"
        assert data["event"] == "test_event", "Event should match"
        assert data["recipient_type"] == "buyer", "Recipient type should match"
        assert data["channel"] == "sms", "Channel should match"
        assert "TEST_" in data["body"], "Body should contain test marker"
        
        # Store ID for cleanup
        self.created_template_id = data["id"]
    
    def test_update_template(self):
        """PUT /api/notifications/admin/templates/{template_id} - Update template"""
        # First, get a template to update
        get_response = requests.get(f"{BASE_URL}/api/notifications/admin/templates")
        assert get_response.status_code == 200
        templates = get_response.json()
        assert len(templates) > 0, "Need at least one template to test update"
        
        template_id = templates[0]["id"]
        original_body = templates[0]["body"]
        
        # Update the template body
        update_data = {
            "body": f"{original_body} [UPDATED]"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/notifications/admin/templates/{template_id}",
            json=update_data
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "[UPDATED]" in data["body"], "Body should contain updated marker"
        
        # Revert the change
        revert_data = {"body": original_body}
        requests.put(f"{BASE_URL}/api/notifications/admin/templates/{template_id}", json=revert_data)
    
    def test_update_nonexistent_template_returns_404(self):
        """PUT /api/notifications/admin/templates/{template_id} - 404 for invalid ID"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/admin/templates/nonexistent_id_12345",
            json={"body": "test"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestNotificationLogs:
    """Tests for notification logs"""
    
    def test_get_logs_returns_paginated_response(self):
        """GET /api/notifications/admin/logs - Get notification logs with filtering"""
        response = requests.get(f"{BASE_URL}/api/notifications/admin/logs")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions - paginated structure
        data = response.json()
        assert "logs" in data, "Response should contain logs array"
        assert "total" in data, "Response should contain total count"
        assert "page" in data, "Response should contain page number"
        assert "pages" in data, "Response should contain pages count"
        
        assert isinstance(data["logs"], list), "Logs should be a list"
        assert isinstance(data["total"], int), "Total should be an integer"
        assert data["page"] == 1, "Default page should be 1"
    
    def test_get_logs_with_pagination(self):
        """GET /api/notifications/admin/logs - Test pagination parameters"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/logs",
            params={"page": 1, "limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
    
    def test_get_logs_filter_by_event(self):
        """GET /api/notifications/admin/logs - Filter by event type"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/logs",
            params={"event": "order_placed"}
        )
        
        assert response.status_code == 200
        data = response.json()
        # Even if no logs match, the response should be valid
        assert "logs" in data
    
    def test_get_logs_filter_by_status(self):
        """GET /api/notifications/admin/logs - Filter by status"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/logs",
            params={"status": "sent"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data


class TestTransportPartners:
    """Tests for transport partner management"""
    
    def test_get_transport_partners_returns_list(self):
        """GET /api/notifications/admin/transport-partners - Get transport partners list"""
        response = requests.get(f"{BASE_URL}/api/notifications/admin/transport-partners")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "partners" in data, "Response should contain partners array"
        assert "total" in data, "Response should contain total count"
        assert "page" in data, "Response should contain page number"
        
        assert isinstance(data["partners"], list), "Partners should be a list"
    
    def test_get_transport_partners_with_pagination(self):
        """GET /api/notifications/admin/transport-partners - Test pagination"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/transport-partners",
            params={"page": 1, "limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
    
    def test_create_transport_partner(self):
        """POST /api/notifications/admin/transport-partners - Create transport partner"""
        unique_id = str(uuid.uuid4())[:8]
        partner_data = {
            "name": f"TEST_{unique_id} Driver",
            "phone": f"+25571234{unique_id[:4]}",
            "vehicle_type": "motorcycle",
            "vehicle_plate": f"T {unique_id[:3]} XYZ",
            "status": "available"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/notifications/admin/transport-partners",
            json=partner_data
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "id" in data, "Response should contain partner id"
        assert data["id"].startswith("tp_"), "Partner ID should have tp_ prefix"
        assert data["name"] == partner_data["name"], "Name should match"
        assert data["phone"] == partner_data["phone"], "Phone should match"
        assert data["vehicle_type"] == "motorcycle", "Vehicle type should match"
        assert data["status"] == "available", "Status should be available"
        assert data["is_active"] == True, "Should be active by default"
        assert "notification_preferences" in data, "Should have notification preferences"
        
        # Store ID for other tests
        self.created_partner_id = data["id"]
        return data["id"]
    
    def test_update_transport_partner(self):
        """PUT /api/notifications/admin/transport-partners/{partner_id} - Update partner"""
        # First, get existing partners
        get_response = requests.get(f"{BASE_URL}/api/notifications/admin/transport-partners")
        assert get_response.status_code == 200
        partners = get_response.json()["partners"]
        
        if len(partners) == 0:
            # Create a partner first
            partner_id = self.test_create_transport_partner()
        else:
            partner_id = partners[0]["id"]
        
        # Update the partner
        update_data = {
            "status": "busy",
            "vehicle_type": "car"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/notifications/admin/transport-partners/{partner_id}",
            json=update_data
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data["status"] == "busy", "Status should be updated to busy"
        assert data["vehicle_type"] == "car", "Vehicle type should be updated to car"
        
        # Revert the change
        revert_data = {"status": "available", "vehicle_type": "motorcycle"}
        requests.put(f"{BASE_URL}/api/notifications/admin/transport-partners/{partner_id}", json=revert_data)
    
    def test_update_nonexistent_partner_returns_404(self):
        """PUT /api/notifications/admin/transport-partners/{partner_id} - 404 for invalid ID"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/admin/transport-partners/nonexistent_id_12345",
            json={"status": "busy"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_filter_partners_by_status(self):
        """GET /api/notifications/admin/transport-partners - Filter by status"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/transport-partners",
            params={"status": "available"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned partners should have available status
        for partner in data["partners"]:
            assert partner["status"] == "available"


class TestTrackingLinks:
    """Tests for tracking link functionality"""
    
    def test_invalid_tracking_code_returns_404(self):
        """GET /api/notifications/track/{short_code} - 404 for invalid code"""
        response = requests.get(f"{BASE_URL}/api/notifications/track/INVALID123")
        
        # Status assertion - should return 404
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "detail" in data, "Response should contain detail message"
        assert "Invalid or expired" in data["detail"], "Should indicate invalid/expired link"
    
    def test_empty_tracking_code_returns_404(self):
        """GET /api/notifications/track/{short_code} - 404 for empty code"""
        response = requests.get(f"{BASE_URL}/api/notifications/track/X")
        
        assert response.status_code == 404


class TestDeliveryOTP:
    """Tests for delivery OTP verification"""
    
    def test_verify_invalid_otp_returns_error(self):
        """POST /api/notifications/delivery/verify-otp - Invalid OTP returns error"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/delivery/verify-otp",
            json={
                "order_id": "test_order_123",
                "otp_code": "000000"
            }
        )
        
        # Status assertion - should return 200 with validation result
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "valid" in data, "Response should contain valid field"
        assert data["valid"] == False, "Invalid OTP should return valid=False"
        assert "error" in data, "Response should contain error message"
        assert data["error"] == "Invalid OTP", "Should indicate invalid OTP"
    
    def test_verify_otp_with_nonexistent_order(self):
        """POST /api/notifications/delivery/verify-otp - Nonexistent order returns invalid"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/delivery/verify-otp",
            json={
                "order_id": f"nonexistent_order_{uuid.uuid4().hex[:8]}",
                "otp_code": "123456"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == False
    
    def test_verify_otp_missing_fields_error(self):
        """POST /api/notifications/delivery/verify-otp - Missing fields return error"""
        # Missing otp_code
        response = requests.post(
            f"{BASE_URL}/api/notifications/delivery/verify-otp",
            json={"order_id": "test_order"}
        )
        
        # Should return validation error (422) for missing required field
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"


class TestNotificationPreferences:
    """Tests for user notification preferences"""
    
    def test_get_preferences_returns_defaults(self):
        """GET /api/notifications/preferences - User notification preferences"""
        response = requests.get(f"{BASE_URL}/api/notifications/preferences")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "sms" in data, "Should have sms preference"
        assert "whatsapp" in data, "Should have whatsapp preference"
        assert "email" in data, "Should have email preference"
        assert "preferred_channel" in data, "Should have preferred_channel"
        
        # Default values check
        assert data["sms"] == True, "SMS should be enabled by default"
        assert data["whatsapp"] == True, "WhatsApp should be enabled by default"
        assert data["preferred_channel"] == "sms", "Default preferred channel should be sms"


class TestTemplateValidation:
    """Tests for template data validation"""
    
    def test_default_templates_count(self):
        """Verify default templates are initialized (should be 13 total)"""
        response = requests.get(f"{BASE_URL}/api/notifications/admin/templates")
        
        assert response.status_code == 200
        data = response.json()
        
        # Per main agent: 13 default templates should be auto-initialized
        assert len(data) >= 13, f"Expected at least 13 default templates, got {len(data)}"
    
    def test_sms_and_whatsapp_templates_exist(self):
        """Verify both SMS and WhatsApp templates exist"""
        response = requests.get(f"{BASE_URL}/api/notifications/admin/templates")
        
        assert response.status_code == 200
        data = response.json()
        
        channels = set(t["channel"] for t in data)
        assert "sms" in channels, "Should have SMS templates"
        assert "whatsapp" in channels, "Should have WhatsApp templates"
    
    def test_all_event_types_have_templates(self):
        """Verify core events have templates"""
        response = requests.get(f"{BASE_URL}/api/notifications/admin/templates")
        
        assert response.status_code == 200
        data = response.json()
        
        events = set(t["event"] for t in data)
        
        # Core events that should have templates
        expected_events = [
            "order_placed",
            "payment_successful",
            "out_for_delivery",
            "delivered",
            "delivery_otp",
            "escrow_released",
            "dispute_opened"
        ]
        
        for event in expected_events:
            assert event in events, f"Missing template for event: {event}"


class TestTransportPartnerValidation:
    """Tests for transport partner data validation"""
    
    def test_partner_has_required_fields(self):
        """Verify transport partner has all required fields"""
        response = requests.get(f"{BASE_URL}/api/notifications/admin/transport-partners")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["partners"]) > 0:
            partner = data["partners"][0]
            required_fields = [
                "id", "name", "phone", "status", "is_active",
                "rating", "total_deliveries", "notification_preferences"
            ]
            
            for field in required_fields:
                assert field in partner, f"Partner missing required field: {field}"
    
    def test_partner_id_format(self):
        """Verify transport partner ID has correct format"""
        response = requests.get(f"{BASE_URL}/api/notifications/admin/transport-partners")
        
        assert response.status_code == 200
        data = response.json()
        
        for partner in data["partners"]:
            assert partner["id"].startswith("tp_"), f"Partner ID should start with tp_: {partner['id']}"


# Health check test
class TestHealthCheck:
    """Basic health check to ensure API is accessible"""
    
    def test_health_endpoint(self):
        """GET /api/health - Health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
