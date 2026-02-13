"""
Config Manager API Tests
Testing multi-environment config, feature flags, country configs, API keys, approvals, and health checks.
"""

import pytest
import requests
import os
import uuid

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://listing-hub-15.preview.emergentagent.com').rstrip('/')

# Test environments
ENVIRONMENTS = ['production', 'staging', 'sandbox', 'development']

# Feature flags list
FEATURE_FLAGS = [
    "escrow_system", "online_checkout", "verified_sellers", "boosts_credits",
    "seller_analytics", "ai_descriptions", "transport_integration", "sms_notifications",
    "whatsapp_notifications", "chat_moderation", "banners_ads", "sandbox_mode",
    "price_negotiation", "multi_currency", "reviews_ratings", "favorites_watchlist",
    "push_notifications", "email_notifications", "location_services", "image_ai_moderation"
]

# Countries to test
COUNTRIES = ['US', 'KE', 'NG', 'ZA', 'GB']


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestConfigManagerGlobalSettings:
    """Tests for Global Settings endpoints"""
    
    def test_get_global_settings_production(self, api_client):
        """GET /api/config-manager/global/{environment} returns global settings"""
        response = api_client.get(f"{BASE_URL}/api/config-manager/global/production")
        assert response.status_code == 200
        
        data = response.json()
        # Validate expected fields
        assert "platform_name" in data
        assert "default_currency" in data
        assert "commission_percentage" in data
        assert "escrow_duration_days" in data
        assert "default_vat_percentage" in data
        assert "rate_limits" in data
        assert "notification_defaults" in data
        
        # Validate rate_limits structure
        rate_limits = data.get("rate_limits", {})
        assert "api_requests_per_minute" in rate_limits
        assert "api_requests_per_hour" in rate_limits
        
        # Validate notification_defaults structure
        notification_defaults = data.get("notification_defaults", {})
        assert "push_enabled" in notification_defaults
        assert "email_enabled" in notification_defaults
        print(f"Global settings retrieved for production: platform={data.get('platform_name')}, currency={data.get('default_currency')}")
    
    @pytest.mark.parametrize("environment", ENVIRONMENTS)
    def test_get_global_settings_all_environments(self, api_client, environment):
        """GET /api/config-manager/global/{environment} works for all environments"""
        response = api_client.get(f"{BASE_URL}/api/config-manager/global/{environment}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("environment") == environment or "platform_name" in data
        print(f"Global settings for {environment}: OK")
    
    def test_update_global_settings_creates_approval(self, api_client):
        """PUT /api/config-manager/global/{environment} creates approval for critical changes"""
        # Try to update commission_percentage (critical config)
        response = api_client.put(
            f"{BASE_URL}/api/config-manager/global/development",
            json={
                "updates": {"commission_percentage": 6.0},
                "updated_by": "TEST_admin",
                "change_notes": "Test critical config change"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        # Critical changes should require approval OR be auto-applied in dev
        if data.get("status") == "pending_approval":
            assert "approval_id" in data
            assert "message" in data
            print(f"Approval required for critical config change: {data.get('message')}")
        else:
            # Non-critical change or auto-approved
            print(f"Global settings updated: {data}")


class TestConfigManagerFeatureFlags:
    """Tests for Feature Flags endpoints"""
    
    def test_get_feature_flags_production(self, api_client):
        """GET /api/config-manager/features/{environment} returns all feature flags"""
        response = api_client.get(f"{BASE_URL}/api/config-manager/features/production")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 20  # Should have 20+ feature flags
        
        # Validate feature flag structure
        if len(data) > 0:
            flag = data[0]
            assert "feature_id" in flag
            assert "enabled" in flag
            assert "scope" in flag
            assert "rollout_percentage" in flag
        
        feature_ids = [f.get("feature_id") for f in data]
        print(f"Found {len(data)} feature flags: {feature_ids[:5]}...")
    
    def test_all_expected_feature_flags_exist(self, api_client):
        """Verify all 20 expected feature flags are present"""
        response = api_client.get(f"{BASE_URL}/api/config-manager/features/production")
        assert response.status_code == 200
        
        data = response.json()
        feature_ids = [f.get("feature_id") for f in data]
        
        for expected_flag in FEATURE_FLAGS:
            assert expected_flag in feature_ids, f"Missing feature flag: {expected_flag}"
        
        print(f"All 20 expected feature flags present")
    
    def test_toggle_feature_flag(self, api_client):
        """PUT /api/config-manager/features/{environment}/{feature_id} toggles feature"""
        # Get current state
        response = api_client.get(f"{BASE_URL}/api/config-manager/features/development")
        assert response.status_code == 200
        flags = response.json()
        
        # Find escrow_system flag
        escrow_flag = next((f for f in flags if f.get("feature_id") == "escrow_system"), None)
        assert escrow_flag is not None, "escrow_system flag not found"
        
        current_state = escrow_flag.get("enabled")
        
        # Toggle the flag
        response = api_client.put(
            f"{BASE_URL}/api/config-manager/features/development/escrow_system",
            json={
                "enabled": not current_state,
                "scope": "global",
                "rollout_percentage": 100,
                "updated_by": "TEST_admin"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("enabled") != current_state
        print(f"Feature flag escrow_system toggled from {current_state} to {not current_state}")
        
        # Restore original state
        api_client.put(
            f"{BASE_URL}/api/config-manager/features/development/escrow_system",
            json={
                "enabled": current_state,
                "scope": "global",
                "rollout_percentage": 100,
                "updated_by": "TEST_admin"
            }
        )
    
    def test_get_available_features(self, api_client):
        """GET /api/config-manager/features/list/available returns feature list"""
        response = api_client.get(f"{BASE_URL}/api/config-manager/features/list/available")
        assert response.status_code == 200
        
        data = response.json()
        assert "features" in data
        assert "roles" in data
        assert len(data.get("features", [])) >= 20
        print(f"Available features: {len(data.get('features', []))}, roles: {data.get('roles')}")


class TestConfigManagerCountryConfigs:
    """Tests for Country Configurations endpoints"""
    
    def test_get_country_configs_production(self, api_client):
        """GET /api/config-manager/countries/{environment} returns country configs"""
        response = api_client.get(f"{BASE_URL}/api/config-manager/countries/production")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 5  # Should have 5 countries
        
        # Validate country config structure
        if len(data) > 0:
            country = data[0]
            assert "country_code" in country
            assert "country_name" in country
            assert "currency_code" in country
            assert "vat_rate" in country
            assert "payment_methods" in country
        
        country_codes = [c.get("country_code") for c in data]
        print(f"Found {len(data)} country configs: {country_codes}")
    
    def test_all_expected_countries_exist(self, api_client):
        """Verify all 5 expected countries (US, KE, NG, ZA, GB) are present"""
        response = api_client.get(f"{BASE_URL}/api/config-manager/countries/production")
        assert response.status_code == 200
        
        data = response.json()
        country_codes = [c.get("country_code") for c in data]
        
        for expected_country in COUNTRIES:
            assert expected_country in country_codes, f"Missing country: {expected_country}"
        
        print(f"All 5 expected countries present: {COUNTRIES}")
    
    def test_country_config_has_payment_methods(self, api_client):
        """Verify countries have payment methods configured"""
        response = api_client.get(f"{BASE_URL}/api/config-manager/countries/production")
        assert response.status_code == 200
        
        data = response.json()
        
        for country in data:
            payment_methods = country.get("payment_methods", [])
            assert len(payment_methods) > 0, f"Country {country.get('country_code')} has no payment methods"
            print(f"{country.get('country_code')}: {payment_methods}")
    
    def test_kenya_has_mobile_money(self, api_client):
        """Verify Kenya (KE) has mobile money providers configured"""
        response = api_client.get(f"{BASE_URL}/api/config-manager/countries/production")
        assert response.status_code == 200
        
        data = response.json()
        kenya = next((c for c in data if c.get("country_code") == "KE"), None)
        
        assert kenya is not None, "Kenya not found in country configs"
        mobile_money = kenya.get("mobile_money_providers", [])
        assert len(mobile_money) > 0, "Kenya should have mobile money providers"
        assert "mpesa" in mobile_money, "Kenya should have M-Pesa"
        print(f"Kenya mobile money providers: {mobile_money}")


class TestConfigManagerAPIKeys:
    """Tests for API Key Management endpoints"""
    
    def test_get_api_keys_production(self, api_client):
        """GET /api/config-manager/api-keys/{environment} returns API keys (masked)"""
        response = api_client.get(f"{BASE_URL}/api/config-manager/api-keys/production")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # If keys exist, validate structure
        if len(data) > 0:
            key = data[0]
            assert "key_id" in key
            assert "service_name" in key
            assert "key_type" in key
            assert "masked_value" in key
            assert "is_active" in key
            # Verify key is masked (should not show full value)
            masked = key.get("masked_value", "")
            assert "*" in masked or len(masked) <= 8, "API key should be masked"
        
        print(f"Found {len(data)} API keys")
    
    def test_add_api_key(self, api_client):
        """POST /api/config-manager/api-keys/{environment} adds a new API key"""
        test_key = f"TEST_sk_test_{uuid.uuid4().hex[:8]}"
        
        response = api_client.post(
            f"{BASE_URL}/api/config-manager/api-keys/development",
            json={
                "service_name": "TEST_stripe",
                "key_type": "api_key",
                "key_value": test_key,
                "set_by": "TEST_admin"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "key_id" in data
        assert data.get("service_name") == "TEST_stripe"
        assert data.get("key_type") == "api_key"
        assert "*" in data.get("masked_value", "")  # Should be masked
        print(f"API key added: {data.get('key_id')}, masked: {data.get('masked_value')}")


class TestConfigManagerHealth:
    """Tests for Health Check endpoints"""
    
    def test_health_check_production(self, api_client):
        """GET /api/config-manager/health/{environment} returns health status"""
        response = api_client.get(f"{BASE_URL}/api/config-manager/health/production")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert data.get("status") in ["healthy", "degraded", "unhealthy"]
        assert "environment" in data
        assert "checks" in data
        assert "warnings" in data
        assert "last_check" in data
        
        checks = data.get("checks", {})
        assert "global_config" in checks
        assert "feature_flags" in checks
        assert "country_configs" in checks
        
        print(f"Health check: status={data.get('status')}, checks={checks}")
    
    @pytest.mark.parametrize("environment", ENVIRONMENTS)
    def test_health_check_all_environments(self, api_client, environment):
        """Health check works for all environments"""
        response = api_client.get(f"{BASE_URL}/api/config-manager/health/{environment}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("environment") == environment
        print(f"Health check {environment}: {data.get('status')}")


class TestConfigManagerSimulation:
    """Tests for Simulation/Preview endpoints"""
    
    def test_simulate_user_experience(self, api_client):
        """GET /api/config-manager/simulate/{environment} returns simulation"""
        response = api_client.get(
            f"{BASE_URL}/api/config-manager/simulate/production",
            params={
                "country_code": "KE",
                "user_role": "seller"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("simulation") == True
        assert "context" in data
        assert "global_settings" in data
        assert "country_config" in data
        assert "feature_flags" in data
        
        context = data.get("context", {})
        assert context.get("country_code") == "KE"
        assert context.get("user_role") == "seller"
        
        print(f"Simulation result for KE seller: {data.get('global_settings')}")
    
    def test_simulate_different_countries(self, api_client):
        """Simulation returns different configs for different countries"""
        responses = {}
        
        for country in ["US", "KE", "NG"]:
            response = api_client.get(
                f"{BASE_URL}/api/config-manager/simulate/production",
                params={"country_code": country, "user_role": "user"}
            )
            assert response.status_code == 200
            responses[country] = response.json()
        
        # Verify different currencies
        us_currency = responses["US"].get("country_config", {}).get("currency_code")
        ke_currency = responses["KE"].get("country_config", {}).get("currency_code")
        ng_currency = responses["NG"].get("country_config", {}).get("currency_code")
        
        assert us_currency == "USD"
        assert ke_currency == "KES"
        assert ng_currency == "NGN"
        print(f"Different currencies: US={us_currency}, KE={ke_currency}, NG={ng_currency}")


class TestConfigManagerExport:
    """Tests for Config Export endpoints"""
    
    def test_export_config(self, api_client):
        """GET /api/config-manager/export/{environment} exports config as JSON"""
        response = api_client.get(f"{BASE_URL}/api/config-manager/export/production")
        assert response.status_code == 200
        
        data = response.json()
        assert "exported_at" in data
        assert "environment" in data
        assert data.get("environment") == "production"
        assert "global_settings" in data
        assert "feature_flags" in data
        assert "country_configs" in data
        
        print(f"Export contains: global_settings, feature_flags={len(data.get('feature_flags', []))}, countries={len(data.get('country_configs', []))}")


class TestConfigManagerApprovals:
    """Tests for Approval Workflow endpoints"""
    
    def test_get_pending_approvals(self, api_client):
        """GET /api/config-manager/approvals/pending returns pending approvals"""
        response = api_client.get(
            f"{BASE_URL}/api/config-manager/approvals/pending",
            params={"environment": "production"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # If approvals exist, validate structure
        if len(data) > 0:
            approval = data[0]
            assert "id" in approval
            assert "config_category" in approval
            assert "config_key" in approval
            assert "status" in approval
            assert "requested_by" in approval
        
        print(f"Found {len(data)} pending approvals")


class TestConfigManagerAuditLogs:
    """Tests for Audit Log endpoints"""
    
    def test_get_audit_logs(self, api_client):
        """GET /api/config-manager/audit-logs returns audit logs"""
        response = api_client.get(
            f"{BASE_URL}/api/config-manager/audit-logs",
            params={"environment": "production", "limit": 50}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # If logs exist, validate structure
        if len(data) > 0:
            log = data[0]
            assert "action" in log
            assert "category" in log
            assert "performed_by" in log
            assert "timestamp" in log
        
        print(f"Found {len(data)} audit log entries")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
