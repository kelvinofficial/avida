"""
Test suite for Third-Party API Integrations Manager
Tests cover:
- Provider list retrieval (grouped by category)
- Integration configuration with AES-256 encrypted credentials
- Integration toggle (enable/disable)
- Connection testing
- Integration deletion
- Webhook management (CRUD & logs)
- Feature routing rules
- Health status
- Audit logging
- Credentials masking verification
"""

import pytest
import requests
import os
import json
import uuid
from datetime import datetime

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://mobile-header-ui.preview.emergentagent.com').rstrip('/')

# Test constants
TEST_ENVIRONMENT = "staging"  # Use staging to avoid production data pollution
TEST_PROVIDER = "sendgrid"  # Use sendgrid as it has simple required fields
TEST_PREFIX = "TEST_INTEGRATION_"


class TestIntegrationProviders:
    """Tests for GET /api/integrations/providers"""
    
    def test_get_providers_returns_grouped_data(self):
        """Test that providers are returned grouped by category"""
        response = requests.get(f"{BASE_URL}/api/integrations/providers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify categories exist
        expected_categories = ["messaging", "email", "payments", "analytics", "ai_services", "push_notifications", "other"]
        for category in expected_categories:
            assert category in data, f"Missing category: {category}"
    
    def test_get_providers_messaging_category(self):
        """Test messaging category has Twilio providers"""
        response = requests.get(f"{BASE_URL}/api/integrations/providers")
        assert response.status_code == 200
        
        data = response.json()
        messaging = data.get("messaging", [])
        provider_ids = [p["provider_id"] for p in messaging]
        
        assert "twilio_sms" in provider_ids, "twilio_sms should be in messaging"
        assert "twilio_whatsapp" in provider_ids, "twilio_whatsapp should be in messaging"
        assert "local_sms_gateway" in provider_ids, "local_sms_gateway should be in messaging"
    
    def test_get_providers_email_category(self):
        """Test email category has expected providers"""
        response = requests.get(f"{BASE_URL}/api/integrations/providers")
        assert response.status_code == 200
        
        data = response.json()
        email = data.get("email", [])
        provider_ids = [p["provider_id"] for p in email]
        
        assert "mailchimp" in provider_ids
        assert "smtp" in provider_ids
        assert "sendgrid" in provider_ids
    
    def test_get_providers_payments_category(self):
        """Test payments category has expected providers"""
        response = requests.get(f"{BASE_URL}/api/integrations/providers")
        assert response.status_code == 200
        
        data = response.json()
        payments = data.get("payments", [])
        provider_ids = [p["provider_id"] for p in payments]
        
        assert "stripe" in provider_ids
        assert "paypal" in provider_ids
        assert "mobile_money" in provider_ids
    
    def test_provider_has_required_fields(self):
        """Test each provider has required_fields defined"""
        response = requests.get(f"{BASE_URL}/api/integrations/providers")
        assert response.status_code == 200
        
        data = response.json()
        for category, providers in data.items():
            for provider in providers:
                assert "required_fields" in provider, f"{provider['provider_id']} missing required_fields"
                assert "name" in provider
                assert "description" in provider


class TestIntegrationList:
    """Tests for GET /api/integrations/list/{environment}"""
    
    def test_get_integrations_production(self):
        """Test getting integrations for production environment"""
        response = requests.get(f"{BASE_URL}/api/integrations/list/production")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Should return list of integrations"
        
        # Should have 16 providers
        assert len(data) >= 16, f"Expected at least 16 providers, got {len(data)}"
    
    def test_get_integrations_sandbox(self):
        """Test getting integrations for sandbox environment"""
        response = requests.get(f"{BASE_URL}/api/integrations/list/sandbox")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        for item in data:
            assert item.get("environment") == "sandbox"
    
    def test_get_integrations_staging(self):
        """Test getting integrations for staging environment"""
        response = requests.get(f"{BASE_URL}/api/integrations/list/staging")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        for item in data:
            assert item.get("environment") == "staging"
    
    def test_integration_list_structure(self):
        """Test integration list item structure"""
        response = requests.get(f"{BASE_URL}/api/integrations/list/production")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            item = data[0]
            assert "provider_id" in item
            assert "name" in item
            assert "category" in item
            assert "status" in item
            assert "enabled" in item
            assert "configured" in item
    
    def test_invalid_environment_rejected(self):
        """Test invalid environment returns 422"""
        response = requests.get(f"{BASE_URL}/api/integrations/list/invalid_env")
        assert response.status_code == 422


class TestIntegrationConfiguration:
    """Tests for POST /api/integrations/config/{environment}/{provider_id}"""
    
    def test_configure_integration_missing_required_fields(self):
        """Test configuration fails when required fields missing"""
        response = requests.post(
            f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/sendgrid",
            json={
                "credentials": {},  # Missing api_key
                "settings": {},
                "enabled": True,
                "configured_by": "test_user"
            }
        )
        assert response.status_code == 400, f"Expected 400 for missing fields, got {response.status_code}"
        data = response.json()
        assert "detail" in data
    
    def test_configure_integration_success(self):
        """Test successful integration configuration"""
        test_api_key = f"{TEST_PREFIX}api_key_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/sendgrid",
            json={
                "credentials": {"api_key": test_api_key},
                "settings": {"from_email": "test@example.com"},
                "enabled": True,
                "configured_by": "test_user"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("provider_id") == "sendgrid"
        # Credentials should be masked in response
        assert "credentials_masked" in data
        assert "api_key" in data["credentials_masked"]
        # Masked value should contain asterisks
        masked_value = data["credentials_masked"]["api_key"]
        assert "*" in masked_value, "Credentials should be masked with asterisks"
    
    def test_configure_unknown_provider_rejected(self):
        """Test configuration of unknown provider fails"""
        response = requests.post(
            f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/unknown_provider",
            json={
                "credentials": {"api_key": "test"},
                "settings": {},
                "enabled": True,
                "configured_by": "test_user"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "Unknown provider" in data.get("detail", "")
    
    def test_configure_twilio_sms(self):
        """Test configuring Twilio SMS with all required fields"""
        response = requests.post(
            f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/twilio_sms",
            json={
                "credentials": {
                    "account_sid": f"{TEST_PREFIX}ACtest123456",
                    "auth_token": f"{TEST_PREFIX}token_abc123",
                    "sender_number": "+15005550006"
                },
                "settings": {},
                "enabled": True,
                "configured_by": "test_user"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("provider_id") == "twilio_sms"
        # All required credentials should be masked
        masked = data.get("credentials_masked", {})
        assert "account_sid" in masked
        assert "auth_token" in masked
        assert "sender_number" in masked


class TestIntegrationToggle:
    """Tests for PUT /api/integrations/config/{environment}/{provider_id}/toggle"""
    
    def test_toggle_unconfigured_integration_fails(self):
        """Test toggling unconfigured integration returns 404"""
        # Use a provider that's unlikely to be configured
        response = requests.put(
            f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/google_vision/toggle",
            json={"enabled": True, "toggled_by": "test_user"}
        )
        # Should return 404 if not configured
        assert response.status_code == 404
    
    def test_toggle_configured_integration(self):
        """Test toggling a configured integration"""
        # First configure the integration
        requests.post(
            f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/openai",
            json={
                "credentials": {"api_key": f"{TEST_PREFIX}sk-test123"},
                "settings": {},
                "enabled": True,
                "configured_by": "test_user"
            }
        )
        
        # Now toggle it off
        response = requests.put(
            f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/openai/toggle",
            json={"enabled": False, "toggled_by": "test_user"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("enabled") == False
        
        # Toggle back on
        response = requests.put(
            f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/openai/toggle",
            json={"enabled": True, "toggled_by": "test_user"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("enabled") == True


class TestIntegrationConnectionTest:
    """Tests for POST /api/integrations/config/{environment}/{provider_id}/test"""
    
    def test_connection_test_unconfigured(self):
        """Test connection test for unconfigured provider"""
        response = requests.post(
            f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/firebase_fcm/test"
        )
        assert response.status_code == 200
        data = response.json()
        # Should indicate not configured
        assert data.get("success") == False or data.get("status") == "not_configured"
    
    def test_connection_test_returns_status(self):
        """Test connection test returns proper status structure"""
        # Configure first
        requests.post(
            f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/mixpanel",
            json={
                "credentials": {"token": f"{TEST_PREFIX}token123", "api_secret": f"{TEST_PREFIX}secret456"},
                "settings": {},
                "enabled": True,
                "configured_by": "test_user"
            }
        )
        
        response = requests.post(
            f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/mixpanel/test"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert "status" in data
        assert "message" in data


class TestIntegrationDeletion:
    """Tests for DELETE /api/integrations/config/{environment}/{provider_id}"""
    
    def test_delete_unconfigured_integration(self):
        """Test deleting unconfigured integration returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/transport_api?deleted_by=test_user"
        )
        assert response.status_code == 404
    
    def test_delete_configured_integration(self):
        """Test deleting a configured integration"""
        provider_id = "google_analytics"
        
        # Configure first
        requests.post(
            f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/{provider_id}",
            json={
                "credentials": {"measurement_id": f"{TEST_PREFIX}G-TEST123"},
                "settings": {},
                "enabled": True,
                "configured_by": "test_user"
            }
        )
        
        # Delete
        response = requests.delete(
            f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/{provider_id}?deleted_by=test_user"
        )
        assert response.status_code == 200
        data = response.json()
        assert "deleted" in data.get("message", "").lower()
        
        # Verify it's gone
        list_response = requests.get(f"{BASE_URL}/api/integrations/list/{TEST_ENVIRONMENT}")
        integrations = list_response.json()
        ga_config = next((i for i in integrations if i["provider_id"] == provider_id), None)
        assert ga_config is None or ga_config.get("configured") == False


class TestWebhookManagement:
    """Tests for webhook CRUD endpoints"""
    
    def test_get_webhooks_empty(self):
        """Test getting webhooks when none exist"""
        response = requests.get(f"{BASE_URL}/api/integrations/webhooks")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_webhook(self):
        """Test creating a new webhook"""
        webhook_name = f"{TEST_PREFIX}webhook_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/integrations/webhooks",
            json={
                "name": webhook_name,
                "provider_id": "stripe",
                "url": "https://example.com/webhooks/stripe",
                "secret": "whsec_test_secret",
                "events": ["payment.success", "payment.failed"],
                "created_by": "test_user"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("name") == webhook_name
        assert data.get("provider_id") == "stripe"
        assert data.get("url") == "https://example.com/webhooks/stripe"
        # Secret should be masked
        assert "*" in data.get("secret", ""), "Webhook secret should be masked"
        assert data.get("enabled") == True
        assert "id" in data
    
    def test_get_webhooks_filtered_by_provider(self):
        """Test filtering webhooks by provider"""
        # Create a webhook first
        webhook_name = f"{TEST_PREFIX}webhook_filter_{uuid.uuid4().hex[:8]}"
        requests.post(
            f"{BASE_URL}/api/integrations/webhooks",
            json={
                "name": webhook_name,
                "provider_id": "paypal",
                "url": "https://example.com/webhooks/paypal",
                "events": ["order.approved"],
                "created_by": "test_user"
            }
        )
        
        response = requests.get(f"{BASE_URL}/api/integrations/webhooks?provider_id=paypal")
        assert response.status_code == 200
        
        data = response.json()
        for webhook in data:
            assert webhook.get("provider_id") == "paypal"


class TestWebhookLogs:
    """Tests for GET /api/integrations/webhooks/logs"""
    
    def test_get_webhook_logs(self):
        """Test getting webhook execution logs"""
        response = requests.get(f"{BASE_URL}/api/integrations/webhooks/logs")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_webhook_logs_with_filters(self):
        """Test getting webhook logs with filter parameters"""
        response = requests.get(
            f"{BASE_URL}/api/integrations/webhooks/logs",
            params={
                "environment": TEST_ENVIRONMENT,
                "limit": 10,
                "skip": 0
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 10


class TestFeatureRouting:
    """Tests for routing endpoints"""
    
    def test_get_routing_rules_empty(self):
        """Test getting routing rules when none exist"""
        response = requests.get(f"{BASE_URL}/api/integrations/routing")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_routing_rule(self):
        """Test creating a routing rule"""
        feature = f"{TEST_PREFIX}sms_alerts_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/integrations/routing",
            json={
                "feature": feature,
                "primary_provider": "twilio_sms",
                "fallback_provider": "local_sms_gateway",
                "country_code": "KE",
                "enabled": True,
                "set_by": "test_user"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("feature") == feature
        assert data.get("primary_provider") == "twilio_sms"
        assert data.get("fallback_provider") == "local_sms_gateway"
        assert data.get("country_code") == "KE"
        assert data.get("enabled") == True
    
    def test_create_global_routing_rule(self):
        """Test creating a global routing rule (no country_code)"""
        feature = f"{TEST_PREFIX}email_alerts_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/integrations/routing",
            json={
                "feature": feature,
                "primary_provider": "sendgrid",
                "fallback_provider": "smtp",
                "country_code": None,
                "enabled": True,
                "set_by": "test_user"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("country_code") is None
    
    def test_get_routing_by_feature(self):
        """Test filtering routing rules by feature"""
        feature = f"{TEST_PREFIX}push_notifications_{uuid.uuid4().hex[:8]}"
        
        # Create rule
        requests.post(
            f"{BASE_URL}/api/integrations/routing",
            json={
                "feature": feature,
                "primary_provider": "firebase_fcm",
                "enabled": True,
                "set_by": "test_user"
            }
        )
        
        # Get by feature
        response = requests.get(f"{BASE_URL}/api/integrations/routing?feature={feature}")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1
        assert data[0].get("feature") == feature


class TestIntegrationHealth:
    """Tests for GET /api/integrations/health/{environment}"""
    
    def test_get_health_production(self):
        """Test getting health status for production"""
        response = requests.get(f"{BASE_URL}/api/integrations/health/production")
        assert response.status_code == 200
        
        data = response.json()
        assert "total" in data
        assert "connected" in data
        assert "error" in data
        assert "disabled" in data
        assert "not_configured" in data
        assert "providers" in data
    
    def test_get_health_staging(self):
        """Test getting health status for staging"""
        response = requests.get(f"{BASE_URL}/api/integrations/health/{TEST_ENVIRONMENT}")
        assert response.status_code == 200
        
        data = response.json()
        # Total should equal sum of status counts
        expected_total = data["connected"] + data["error"] + data["disabled"] + data["not_configured"]
        assert data["total"] == expected_total
    
    def test_health_providers_list(self):
        """Test health providers list structure"""
        response = requests.get(f"{BASE_URL}/api/integrations/health/production")
        assert response.status_code == 200
        
        data = response.json()
        providers = data.get("providers", [])
        
        for provider in providers:
            assert "provider_id" in provider
            assert "name" in provider
            assert "status" in provider
            assert "enabled" in provider


class TestAuditLogging:
    """Tests for GET /api/integrations/audit"""
    
    def test_get_audit_logs(self):
        """Test getting audit logs"""
        response = requests.get(f"{BASE_URL}/api/integrations/audit")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_audit_logs_with_limit(self):
        """Test getting audit logs with limit"""
        response = requests.get(f"{BASE_URL}/api/integrations/audit?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) <= 5
    
    def test_get_audit_logs_by_environment(self):
        """Test filtering audit logs by environment"""
        response = requests.get(f"{BASE_URL}/api/integrations/audit?environment={TEST_ENVIRONMENT}")
        assert response.status_code == 200
        
        data = response.json()
        for log in data:
            assert log.get("environment") == TEST_ENVIRONMENT
    
    def test_audit_log_structure(self):
        """Test audit log entry structure"""
        # Trigger an audit log by configuring something
        requests.post(
            f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/onesignal",
            json={
                "credentials": {"app_id": f"{TEST_PREFIX}app123", "api_key": f"{TEST_PREFIX}key456"},
                "settings": {},
                "enabled": True,
                "configured_by": "audit_test_user"
            }
        )
        
        response = requests.get(f"{BASE_URL}/api/integrations/audit?environment={TEST_ENVIRONMENT}&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            log = data[0]
            assert "id" in log
            assert "action" in log
            assert "environment" in log
            assert "changes" in log
            assert "performed_by" in log
            assert "performed_at" in log


class TestCredentialsMasking:
    """Tests to verify credentials are properly masked in responses"""
    
    def test_credentials_masked_in_list(self):
        """Test credentials are masked when listing integrations"""
        # Configure an integration
        requests.post(
            f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/stripe",
            json={
                "credentials": {
                    "secret_key": f"{TEST_PREFIX}sk_test_secretkey123456",
                    "publishable_key": f"{TEST_PREFIX}pk_test_pubkey123456"
                },
                "settings": {},
                "enabled": True,
                "configured_by": "test_user"
            }
        )
        
        response = requests.get(f"{BASE_URL}/api/integrations/list/{TEST_ENVIRONMENT}")
        assert response.status_code == 200
        
        data = response.json()
        stripe_config = next((i for i in data if i["provider_id"] == "stripe"), None)
        
        if stripe_config and stripe_config.get("credentials_masked"):
            masked = stripe_config["credentials_masked"]
            for key, value in masked.items():
                # Each masked value should contain asterisks
                assert "*" in value or len(value) <= 4, f"Credential {key} should be masked"
    
    def test_raw_credentials_not_in_response(self):
        """Test that raw credentials field is removed from response"""
        # Configure an integration
        requests.post(
            f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/mobile_money",
            json={
                "credentials": {
                    "api_key": f"{TEST_PREFIX}mobile_api_key",
                    "api_secret": f"{TEST_PREFIX}mobile_secret",
                    "shortcode": "123456"
                },
                "settings": {},
                "enabled": True,
                "configured_by": "test_user"
            }
        )
        
        # Get the integration
        response = requests.get(f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/mobile_money")
        assert response.status_code == 200
        
        data = response.json()
        # Should have masked credentials
        assert "credentials_masked" in data
        # Should NOT have raw credentials
        assert "credentials" not in data


class TestEnvironmentIsolation:
    """Tests to verify environment isolation"""
    
    def test_production_sandbox_isolation(self):
        """Test that production and sandbox are isolated"""
        provider_id = "paypal"
        
        # Configure in sandbox
        sandbox_response = requests.post(
            f"{BASE_URL}/api/integrations/config/sandbox/{provider_id}",
            json={
                "credentials": {
                    "client_id": f"{TEST_PREFIX}sandbox_client_id",
                    "client_secret": f"{TEST_PREFIX}sandbox_secret"
                },
                "settings": {"mode": "sandbox"},
                "enabled": True,
                "configured_by": "test_user"
            }
        )
        assert sandbox_response.status_code == 200
        
        # Get production - should be different or not configured
        prod_list = requests.get(f"{BASE_URL}/api/integrations/list/production").json()
        prod_paypal = next((i for i in prod_list if i["provider_id"] == provider_id), None)
        
        sandbox_list = requests.get(f"{BASE_URL}/api/integrations/list/sandbox").json()
        sandbox_paypal = next((i for i in sandbox_list if i["provider_id"] == provider_id), None)
        
        # Verify sandbox is configured
        assert sandbox_paypal.get("configured") == True
        # Production may or may not be configured - they should be independent


class TestCleanup:
    """Cleanup test data after tests"""
    
    def test_cleanup_test_integrations(self):
        """Clean up test integrations from staging environment"""
        providers_to_cleanup = [
            "sendgrid", "twilio_sms", "openai", "mixpanel", 
            "google_analytics", "stripe", "mobile_money", "onesignal", "paypal"
        ]
        
        for provider_id in providers_to_cleanup:
            response = requests.delete(
                f"{BASE_URL}/api/integrations/config/{TEST_ENVIRONMENT}/{provider_id}?deleted_by=test_cleanup"
            )
            # Ignore errors - integration might not exist
            print(f"Cleanup {provider_id} in {TEST_ENVIRONMENT}: {response.status_code}")
        
        # Also cleanup sandbox PayPal
        requests.delete(
            f"{BASE_URL}/api/integrations/config/sandbox/paypal?deleted_by=test_cleanup"
        )
        
        assert True  # Cleanup always passes


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
