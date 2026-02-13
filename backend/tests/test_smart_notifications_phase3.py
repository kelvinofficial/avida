"""
Smart Notification System - Phase 3 Tests
Tests for Email Templates and Scheduled Campaigns APIs

Features tested:
1. Email Templates CRUD - GET, POST, PUT, DELETE /api/smart-notifications/admin/templates
2. Scheduled Campaigns CRUD - GET, POST, PUT, DELETE /api/smart-notifications/admin/campaigns
3. Campaign Actions - cancel and send immediately
4. Verify Phase 1 & 2 APIs still work
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta, timezone

# Base URL from environment
BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://local-assets-bundle.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# =============================================================================
# PHASE 3: EMAIL TEMPLATES CRUD TESTS
# =============================================================================

class TestEmailTemplatesAPI:
    """Tests for Email Templates CRUD operations"""
    
    created_template_ids = []
    
    def test_get_templates_empty_or_list(self, api_client):
        """Test GET /api/smart-notifications/admin/templates - returns templates list"""
        response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/templates")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"GET templates: Found {len(data)} templates")
    
    def test_create_template(self, api_client):
        """Test POST /api/smart-notifications/admin/templates - creates template"""
        template_data = {
            "name": f"TEST_Template_{uuid.uuid4().hex[:8]}",
            "subject": "Welcome to {{app_name}}!",
            "html_content": "<html><body><h1>Welcome {{user_name}}!</h1><p>Thanks for joining us.</p></body></html>",
            "trigger_type": "promotional",
            "is_active": True
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/smart-notifications/admin/templates",
            json=template_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Data assertions
        assert "id" in data, "Response should have 'id'"
        assert data["id"].startswith("tpl_"), f"Template ID should start with 'tpl_', got {data['id']}"
        assert data["name"] == template_data["name"], "Name should match"
        assert data["subject"] == template_data["subject"], "Subject should match"
        assert data["html_content"] == template_data["html_content"], "HTML content should match"
        assert "created_at" in data, "Should have created_at"
        assert "updated_at" in data, "Should have updated_at"
        
        # Save for cleanup
        self.__class__.created_template_ids.append(data["id"])
        print(f"CREATE template: Created {data['id']}")
        
        # Verify persistence with GET
        get_response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/templates")
        assert get_response.status_code == 200
        templates = get_response.json()
        created_template = next((t for t in templates if t["id"] == data["id"]), None)
        assert created_template is not None, "Created template should be in GET response"
        assert created_template["name"] == template_data["name"], "Persisted name should match"
    
    def test_update_template(self, api_client):
        """Test PUT /api/smart-notifications/admin/templates/{id} - updates template"""
        # First create a template
        create_response = api_client.post(
            f"{BASE_URL}/api/smart-notifications/admin/templates",
            json={
                "name": f"TEST_UpdateTemplate_{uuid.uuid4().hex[:8]}",
                "subject": "Original Subject",
                "html_content": "<p>Original Content</p>",
                "is_active": True
            }
        )
        assert create_response.status_code == 200
        template_id = create_response.json()["id"]
        self.__class__.created_template_ids.append(template_id)
        
        # Update the template
        updates = {
            "subject": "Updated Subject",
            "html_content": "<p>Updated Content with {{variable}}</p>",
            "is_active": False
        }
        
        update_response = api_client.put(
            f"{BASE_URL}/api/smart-notifications/admin/templates/{template_id}",
            json=updates
        )
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        data = update_response.json()
        
        # Verify updates applied
        assert data["subject"] == updates["subject"], "Subject should be updated"
        assert data["html_content"] == updates["html_content"], "HTML content should be updated"
        assert data["is_active"] == updates["is_active"], "is_active should be updated"
        assert "updated_at" in data, "Should have updated_at"
        
        print(f"UPDATE template: Updated {template_id}")
        
        # Verify persistence with GET
        get_response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/templates")
        templates = get_response.json()
        updated_template = next((t for t in templates if t["id"] == template_id), None)
        assert updated_template is not None, "Updated template should exist"
        assert updated_template["subject"] == updates["subject"], "Persisted subject should match update"
    
    def test_delete_template(self, api_client):
        """Test DELETE /api/smart-notifications/admin/templates/{id} - deletes template"""
        # First create a template
        create_response = api_client.post(
            f"{BASE_URL}/api/smart-notifications/admin/templates",
            json={
                "name": f"TEST_DeleteTemplate_{uuid.uuid4().hex[:8]}",
                "subject": "To be deleted",
                "html_content": "<p>Delete me</p>"
            }
        )
        assert create_response.status_code == 200
        template_id = create_response.json()["id"]
        
        # Delete the template
        delete_response = api_client.delete(
            f"{BASE_URL}/api/smart-notifications/admin/templates/{template_id}"
        )
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        data = delete_response.json()
        assert data.get("success") == True, "Delete should return success: true"
        
        print(f"DELETE template: Deleted {template_id}")
        
        # Verify removal with GET
        get_response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/templates")
        templates = get_response.json()
        deleted_template = next((t for t in templates if t["id"] == template_id), None)
        assert deleted_template is None, "Deleted template should not be in GET response"
    
    def test_delete_nonexistent_template(self, api_client):
        """Test DELETE for non-existent template returns success: false"""
        response = api_client.delete(
            f"{BASE_URL}/api/smart-notifications/admin/templates/nonexistent_template_id"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == False, "Delete non-existent should return success: false"


# =============================================================================
# PHASE 3: SCHEDULED CAMPAIGNS CRUD TESTS
# =============================================================================

class TestScheduledCampaignsAPI:
    """Tests for Scheduled Campaigns CRUD operations"""
    
    created_campaign_ids = []
    
    def test_get_campaigns_empty_or_list(self, api_client):
        """Test GET /api/smart-notifications/admin/campaigns - returns campaigns list"""
        response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/campaigns")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"GET campaigns: Found {len(data)} campaigns")
    
    def test_create_campaign(self, api_client):
        """Test POST /api/smart-notifications/admin/campaigns - creates scheduled campaign"""
        scheduled_time = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        campaign_data = {
            "title": f"TEST_Campaign_{uuid.uuid4().hex[:8]}",
            "body": "Check out our latest deals!",
            "trigger_type": "promotional",
            "channels": ["push", "email"],
            "target_segments": ["all_users"],
            "scheduled_at": scheduled_time
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns",
            json=campaign_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Data assertions
        assert "id" in data, "Response should have 'id'"
        assert data["id"].startswith("camp_"), f"Campaign ID should start with 'camp_', got {data['id']}"
        assert data["title"] == campaign_data["title"], "Title should match"
        assert data["body"] == campaign_data["body"], "Body should match"
        assert data["status"] == "scheduled", "Status should be 'scheduled'"
        assert data["sent_count"] == 0, "sent_count should be 0 initially"
        assert "created_at" in data, "Should have created_at"
        
        # Save for cleanup
        self.__class__.created_campaign_ids.append(data["id"])
        print(f"CREATE campaign: Created {data['id']}")
        
        # Verify persistence with GET
        get_response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/campaigns")
        assert get_response.status_code == 200
        campaigns = get_response.json()
        created_campaign = next((c for c in campaigns if c["id"] == data["id"]), None)
        assert created_campaign is not None, "Created campaign should be in GET response"
        assert created_campaign["title"] == campaign_data["title"], "Persisted title should match"
    
    def test_update_scheduled_campaign(self, api_client):
        """Test PUT /api/smart-notifications/admin/campaigns/{id} - updates scheduled campaign"""
        # First create a campaign
        scheduled_time = (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat()
        create_response = api_client.post(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns",
            json={
                "title": f"TEST_UpdateCampaign_{uuid.uuid4().hex[:8]}",
                "body": "Original body",
                "trigger_type": "promotional",
                "channels": ["push"],
                "target_segments": ["active_buyers"],
                "scheduled_at": scheduled_time
            }
        )
        assert create_response.status_code == 200
        campaign_id = create_response.json()["id"]
        self.__class__.created_campaign_ids.append(campaign_id)
        
        # Update the campaign
        new_scheduled_time = (datetime.now(timezone.utc) + timedelta(hours=72)).isoformat()
        updates = {
            "title": "Updated Campaign Title",
            "body": "Updated campaign body with new message",
            "target_segments": ["all_users", "active_sellers"],
            "scheduled_at": new_scheduled_time
        }
        
        update_response = api_client.put(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns/{campaign_id}",
            json=updates
        )
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        data = update_response.json()
        
        # Verify updates applied
        assert data["title"] == updates["title"], "Title should be updated"
        assert data["body"] == updates["body"], "Body should be updated"
        assert data["target_segments"] == updates["target_segments"], "Target segments should be updated"
        assert "updated_at" in data, "Should have updated_at"
        
        print(f"UPDATE campaign: Updated {campaign_id}")
        
        # Verify persistence with GET
        get_response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/campaigns")
        campaigns = get_response.json()
        updated_campaign = next((c for c in campaigns if c["id"] == campaign_id), None)
        assert updated_campaign is not None, "Updated campaign should exist"
        assert updated_campaign["title"] == updates["title"], "Persisted title should match update"
    
    def test_update_nonexistent_campaign(self, api_client):
        """Test PUT for non-existent campaign returns 404"""
        response = api_client.put(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns/nonexistent_campaign_id",
            json={"title": "Updated"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
    
    def test_cancel_campaign(self, api_client):
        """Test POST /api/smart-notifications/admin/campaigns/{id}/cancel - cancels campaign"""
        # First create a campaign
        scheduled_time = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        create_response = api_client.post(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns",
            json={
                "title": f"TEST_CancelCampaign_{uuid.uuid4().hex[:8]}",
                "body": "To be cancelled",
                "trigger_type": "promotional",
                "channels": ["push"],
                "scheduled_at": scheduled_time
            }
        )
        assert create_response.status_code == 200
        campaign_id = create_response.json()["id"]
        self.__class__.created_campaign_ids.append(campaign_id)
        
        # Cancel the campaign
        cancel_response = api_client.post(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns/{campaign_id}/cancel"
        )
        
        assert cancel_response.status_code == 200, f"Expected 200, got {cancel_response.status_code}: {cancel_response.text}"
        data = cancel_response.json()
        assert data.get("success") == True, "Cancel should return success: true"
        
        print(f"CANCEL campaign: Cancelled {campaign_id}")
        
        # Verify status changed to cancelled
        get_response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/campaigns")
        campaigns = get_response.json()
        cancelled_campaign = next((c for c in campaigns if c["id"] == campaign_id), None)
        assert cancelled_campaign is not None, "Cancelled campaign should exist"
        assert cancelled_campaign["status"] == "cancelled", "Status should be 'cancelled'"
        assert "cancelled_at" in cancelled_campaign, "Should have cancelled_at timestamp"
    
    def test_cancel_nonexistent_campaign(self, api_client):
        """Test cancel for non-existent campaign returns 404"""
        response = api_client.post(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns/nonexistent_campaign_id/cancel"
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
    
    def test_cannot_cancel_already_cancelled_campaign(self, api_client):
        """Test cannot cancel an already cancelled campaign"""
        # First create and cancel a campaign
        scheduled_time = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        create_response = api_client.post(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns",
            json={
                "title": f"TEST_DoubleCancelCampaign_{uuid.uuid4().hex[:8]}",
                "body": "To be cancelled twice",
                "trigger_type": "promotional",
                "channels": ["push"],
                "scheduled_at": scheduled_time
            }
        )
        campaign_id = create_response.json()["id"]
        self.__class__.created_campaign_ids.append(campaign_id)
        
        # Cancel first time
        api_client.post(f"{BASE_URL}/api/smart-notifications/admin/campaigns/{campaign_id}/cancel")
        
        # Try to cancel again
        second_cancel_response = api_client.post(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns/{campaign_id}/cancel"
        )
        
        assert second_cancel_response.status_code == 400, f"Expected 400 for double cancel, got {second_cancel_response.status_code}"
    
    def test_send_campaign_immediately(self, api_client):
        """Test POST /api/smart-notifications/admin/campaigns/{id}/send - sends campaign immediately"""
        # First create a campaign
        scheduled_time = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        create_response = api_client.post(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns",
            json={
                "title": f"TEST_SendCampaign_{uuid.uuid4().hex[:8]}",
                "body": "Sending now!",
                "trigger_type": "promotional",
                "channels": ["push", "email"],
                "target_segments": ["all_users"],
                "scheduled_at": scheduled_time
            }
        )
        assert create_response.status_code == 200
        campaign_id = create_response.json()["id"]
        self.__class__.created_campaign_ids.append(campaign_id)
        
        # Send the campaign immediately
        send_response = api_client.post(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns/{campaign_id}/send"
        )
        
        assert send_response.status_code == 200, f"Expected 200, got {send_response.status_code}: {send_response.text}"
        data = send_response.json()
        assert data.get("success") == True, "Send should return success: true"
        assert "sent_count" in data, "Should have sent_count in response"
        
        print(f"SEND campaign: Sent {campaign_id}, count: {data.get('sent_count')}")
        
        # Verify status changed to sent
        get_response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/campaigns")
        campaigns = get_response.json()
        sent_campaign = next((c for c in campaigns if c["id"] == campaign_id), None)
        assert sent_campaign is not None, "Sent campaign should exist"
        assert sent_campaign["status"] == "sent", "Status should be 'sent'"
        assert "sent_at" in sent_campaign, "Should have sent_at timestamp"
    
    def test_send_nonexistent_campaign(self, api_client):
        """Test send for non-existent campaign returns 404"""
        response = api_client.post(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns/nonexistent_campaign_id/send"
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
    
    def test_cannot_send_already_sent_campaign(self, api_client):
        """Test cannot send an already sent campaign"""
        # First create and send a campaign
        scheduled_time = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        create_response = api_client.post(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns",
            json={
                "title": f"TEST_DoubleSendCampaign_{uuid.uuid4().hex[:8]}",
                "body": "To be sent twice",
                "trigger_type": "promotional",
                "channels": ["push"],
                "scheduled_at": scheduled_time
            }
        )
        campaign_id = create_response.json()["id"]
        self.__class__.created_campaign_ids.append(campaign_id)
        
        # Send first time
        api_client.post(f"{BASE_URL}/api/smart-notifications/admin/campaigns/{campaign_id}/send")
        
        # Try to send again
        second_send_response = api_client.post(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns/{campaign_id}/send"
        )
        
        assert second_send_response.status_code == 400, f"Expected 400 for double send, got {second_send_response.status_code}"
    
    def test_cannot_update_sent_campaign(self, api_client):
        """Test cannot update a sent campaign"""
        # First create and send a campaign
        scheduled_time = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        create_response = api_client.post(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns",
            json={
                "title": f"TEST_UpdateSentCampaign_{uuid.uuid4().hex[:8]}",
                "body": "Original",
                "trigger_type": "promotional",
                "channels": ["push"],
                "scheduled_at": scheduled_time
            }
        )
        campaign_id = create_response.json()["id"]
        self.__class__.created_campaign_ids.append(campaign_id)
        
        # Send the campaign
        api_client.post(f"{BASE_URL}/api/smart-notifications/admin/campaigns/{campaign_id}/send")
        
        # Try to update
        update_response = api_client.put(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns/{campaign_id}",
            json={"title": "Updated title"}
        )
        
        assert update_response.status_code == 400, f"Expected 400 for updating sent campaign, got {update_response.status_code}"
    
    def test_delete_campaign(self, api_client):
        """Test DELETE /api/smart-notifications/admin/campaigns/{id} - deletes campaign"""
        # First create a campaign
        scheduled_time = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        create_response = api_client.post(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns",
            json={
                "title": f"TEST_DeleteCampaign_{uuid.uuid4().hex[:8]}",
                "body": "To be deleted",
                "trigger_type": "promotional",
                "channels": ["push"],
                "scheduled_at": scheduled_time
            }
        )
        assert create_response.status_code == 200
        campaign_id = create_response.json()["id"]
        
        # Delete the campaign
        delete_response = api_client.delete(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns/{campaign_id}"
        )
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        data = delete_response.json()
        assert data.get("success") == True, "Delete should return success: true"
        
        print(f"DELETE campaign: Deleted {campaign_id}")
        
        # Verify removal with GET
        get_response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/campaigns")
        campaigns = get_response.json()
        deleted_campaign = next((c for c in campaigns if c["id"] == campaign_id), None)
        assert deleted_campaign is None, "Deleted campaign should not be in GET response"
    
    def test_delete_nonexistent_campaign(self, api_client):
        """Test DELETE for non-existent campaign returns success: false"""
        response = api_client.delete(
            f"{BASE_URL}/api/smart-notifications/admin/campaigns/nonexistent_campaign_id"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == False, "Delete non-existent should return success: false"


# =============================================================================
# PHASE 1 & 2 REGRESSION TESTS
# =============================================================================

class TestPhase1APIRegression:
    """Verify Phase 1 APIs still work"""
    
    def test_admin_config_works(self, api_client):
        """Test GET /api/smart-notifications/admin/config still works"""
        response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "system_enabled" in data, "Should have system_enabled field"
        print("Phase 1 API: admin/config works")
    
    def test_triggers_api_works(self, api_client):
        """Test GET /api/smart-notifications/admin/triggers still works"""
        response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/triggers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print("Phase 1 API: admin/triggers works")
    
    def test_analytics_api_works(self, api_client):
        """Test GET /api/smart-notifications/admin/analytics still works"""
        response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/analytics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "totals" in data, "Should have totals field"
        print("Phase 1 API: admin/analytics works")


class TestPhase2APIRegression:
    """Verify Phase 2 APIs still work"""
    
    def test_ab_tests_api_works(self, api_client):
        """Test GET /api/smart-notifications/admin/ab-tests still works"""
        response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/ab-tests")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print("Phase 2 API: admin/ab-tests works")
    
    def test_conversions_api_works(self, api_client):
        """Test GET /api/smart-notifications/admin/conversions still works"""
        response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/conversions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "total_conversions" in data, "Should have total_conversions field"
        print("Phase 2 API: admin/conversions works")
    
    def test_weekly_digest_config_api_works(self, api_client):
        """Test GET /api/smart-notifications/admin/weekly-digest/config still works"""
        response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/weekly-digest/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "enabled" in data, "Should have enabled field"
        print("Phase 2 API: admin/weekly-digest/config works")


# =============================================================================
# TEST WITH PROVIDED TEST IDs
# =============================================================================

class TestProvidedTestData:
    """Test with the provided template and campaign IDs"""
    
    def test_provided_template_exists(self, api_client):
        """Check if tpl_480162313e70 template exists"""
        response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/templates")
        assert response.status_code == 200
        
        templates = response.json()
        provided_template = next((t for t in templates if t["id"] == "tpl_480162313e70"), None)
        
        if provided_template:
            print(f"Found provided template: {provided_template.get('name', 'N/A')}")
            assert provided_template["id"] == "tpl_480162313e70"
        else:
            print("Provided template tpl_480162313e70 not found (may have been deleted)")
            # Not a failure, just informational
    
    def test_provided_campaign_exists(self, api_client):
        """Check if camp_1f2c2f267db9 campaign exists"""
        response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/campaigns")
        assert response.status_code == 200
        
        campaigns = response.json()
        provided_campaign = next((c for c in campaigns if c["id"] == "camp_1f2c2f267db9"), None)
        
        if provided_campaign:
            print(f"Found provided campaign: {provided_campaign.get('title', 'N/A')}, status: {provided_campaign.get('status', 'N/A')}")
            assert provided_campaign["id"] == "camp_1f2c2f267db9"
        else:
            print("Provided campaign camp_1f2c2f267db9 not found (may have been deleted)")
            # Not a failure, just informational


# =============================================================================
# CLEANUP
# =============================================================================

class TestCleanup:
    """Cleanup test data at the end"""
    
    def test_cleanup_test_templates(self, api_client):
        """Clean up TEST_ prefixed templates"""
        response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/templates")
        if response.status_code == 200:
            templates = response.json()
            for template in templates:
                if template.get("name", "").startswith("TEST_"):
                    api_client.delete(f"{BASE_URL}/api/smart-notifications/admin/templates/{template['id']}")
                    print(f"Cleaned up template: {template['id']}")
        print("Template cleanup complete")
    
    def test_cleanup_test_campaigns(self, api_client):
        """Clean up TEST_ prefixed campaigns"""
        response = api_client.get(f"{BASE_URL}/api/smart-notifications/admin/campaigns")
        if response.status_code == 200:
            campaigns = response.json()
            for campaign in campaigns:
                if campaign.get("title", "").startswith("TEST_"):
                    api_client.delete(f"{BASE_URL}/api/smart-notifications/admin/campaigns/{campaign['id']}")
                    print(f"Cleaned up campaign: {campaign['id']}")
        print("Campaign cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
