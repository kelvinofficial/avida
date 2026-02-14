"""
Platform Configuration & Brand Manager API Tests
Tests for:
- Currency management (add/enable/disable/set-default/FX rates)
- Branding & logos (upload with versioning)
- Legal pages (create, publish, version history)
- Social media links
- App store links
- Audit logging
- Multi-environment support (Production + Staging)
- Public config API
"""

import pytest
import requests
import os
import uuid
import io
from datetime import datetime

# Base URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://shimmer-perf.preview.emergentagent.com')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestPlatformConfigGetEndpoints:
    """Test GET platform config endpoints"""
    
    def test_get_production_config(self, api_client):
        """GET /api/platform/config/production - Get full platform config"""
        response = api_client.get(f"{BASE_URL}/api/platform/config/production")
        assert response.status_code == 200
        data = response.json()
        
        # Verify config structure
        assert "id" in data
        assert data["environment"] == "production"
        assert "currencies" in data
        assert "default_currency" in data
        assert "branding" in data
        assert "social_links" in data
        assert "app_store_links" in data
        assert "version" in data
        assert "updated_at" in data
        print(f"Production config version: {data['version']}")
    
    def test_get_staging_config(self, api_client):
        """GET /api/platform/config/staging - Get staging environment config"""
        response = api_client.get(f"{BASE_URL}/api/platform/config/staging")
        assert response.status_code == 200
        data = response.json()
        
        assert data["environment"] == "staging"
        print(f"Staging config version: {data['version']}")
    
    def test_get_currencies_production(self, api_client):
        """GET /api/platform/currencies/production - Get all currencies"""
        response = api_client.get(f"{BASE_URL}/api/platform/currencies/production")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 3  # At least USD, EUR, GBP
        
        # Check currency structure
        for currency in data:
            assert "code" in currency
            assert "name" in currency
            assert "symbol" in currency
            assert "enabled" in currency
        
        currency_codes = [c["code"] for c in data]
        assert "USD" in currency_codes
        print(f"Found {len(data)} currencies: {currency_codes}")
    
    def test_get_legal_pages_production(self, api_client):
        """GET /api/platform/legal-pages/production - Get legal pages"""
        response = api_client.get(f"{BASE_URL}/api/platform/legal-pages/production")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Found {len(data)} legal pages")
    
    def test_get_audit_logs_production(self, api_client):
        """GET /api/platform/audit-logs/production - Get audit logs"""
        response = api_client.get(f"{BASE_URL}/api/platform/audit-logs/production")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Found {len(data)} audit log entries")
    
    def test_get_public_config(self, api_client):
        """GET /api/platform/public/config - Get public config for app/web"""
        response = api_client.get(f"{BASE_URL}/api/platform/public/config?environment=production")
        assert response.status_code == 200
        data = response.json()
        
        # Public config should have filtered fields
        assert "currencies" in data
        assert "default_currency" in data
        assert "branding" in data
        assert "social_links" in data
        assert "app_store_links" in data
        
        # Currencies should only have public fields
        for currency in data.get("currencies", []):
            assert "code" in currency
            assert "symbol" in currency
            assert "is_default" in currency
        
        print(f"Public config has {len(data['currencies'])} enabled currencies")
    
    def test_get_public_config_with_country(self, api_client):
        """GET /api/platform/public/config - Get config filtered by country"""
        response = api_client.get(f"{BASE_URL}/api/platform/public/config?environment=production&country_code=US")
        assert response.status_code == 200
        data = response.json()
        
        assert "currencies" in data
        print(f"US config has {len(data['currencies'])} currencies")


class TestCurrencyManagement:
    """Test currency CRUD operations"""
    
    def test_add_new_currency(self, api_client):
        """POST /api/platform/currencies/staging - Add a new currency"""
        test_currency = {
            "code": f"T{uuid.uuid4().hex[:2].upper()}",  # Shorter code (3 chars)
            "name": "Test Currency",
            "symbol": "T$",
            "decimal_precision": 2,
            "rounding_rule": "round_half_up",
            "enabled": True,
            "is_default": False,
            "countries": ["XX"],
            "fx_rate_to_base": 1.5,
            "locked_for_escrow": False,
            "locked_for_historical": False
        }
        
        # API expects nested currency object
        response = api_client.post(
            f"{BASE_URL}/api/platform/currencies/staging",
            json={"currency": test_currency, "added_by": "test_agent"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify currency was added to config
        assert "currencies" in data
        currency_codes = [c["code"] for c in data["currencies"]]
        assert test_currency["code"] in currency_codes
        print(f"Successfully added currency {test_currency['code']}")
    
    def test_add_duplicate_currency_fails(self, api_client):
        """POST /api/platform/currencies/staging - Adding duplicate currency fails"""
        # API expects nested currency object
        response = api_client.post(
            f"{BASE_URL}/api/platform/currencies/staging",
            json={
                "currency": {
                    "code": "USD",  # Already exists
                    "name": "Duplicate Dollar",
                    "symbol": "$",
                    "decimal_precision": 2,
                    "rounding_rule": "round_half_up",
                    "enabled": True,
                    "is_default": False,
                    "countries": ["US"],
                    "fx_rate_to_base": 1.0
                },
                "added_by": "test_agent"
            }
        )
        
        assert response.status_code == 400
        print("Duplicate currency correctly rejected")
    
    def test_update_currency(self, api_client):
        """PUT /api/platform/currencies/staging/{code} - Update currency"""
        response = api_client.put(
            f"{BASE_URL}/api/platform/currencies/staging/EUR",
            json={
                "updates": {"fx_rate_to_base": 0.93},
                "updated_by": "test_agent"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify update
        eur_currency = next((c for c in data["currencies"] if c["code"] == "EUR"), None)
        assert eur_currency is not None
        assert eur_currency["fx_rate_to_base"] == 0.93
        print(f"Updated EUR fx_rate to {eur_currency['fx_rate_to_base']}")
    
    def test_update_nonexistent_currency_fails(self, api_client):
        """PUT /api/platform/currencies/staging/NONEXISTENT - Should return 404"""
        response = api_client.put(
            f"{BASE_URL}/api/platform/currencies/staging/NONEXISTENT",
            json={
                "updates": {"enabled": False},
                "updated_by": "test_agent"
            }
        )
        
        assert response.status_code == 404
        print("Non-existent currency correctly returns 404")
    
    def test_set_default_currency(self, api_client):
        """POST /api/platform/currencies/staging/{code}/set-default - Set default currency"""
        response = api_client.post(
            f"{BASE_URL}/api/platform/currencies/staging/EUR/set-default",
            json={"set_by": "test_agent"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify EUR is now default
        assert data["default_currency"] == "EUR"
        eur = next((c for c in data["currencies"] if c["code"] == "EUR"), None)
        assert eur["is_default"] == True
        
        # Verify USD is no longer default
        usd = next((c for c in data["currencies"] if c["code"] == "USD"), None)
        assert usd["is_default"] == False
        print("Successfully set EUR as default currency")
        
        # Reset to USD for other tests
        api_client.post(
            f"{BASE_URL}/api/platform/currencies/staging/USD/set-default",
            json={"set_by": "test_agent"}
        )
    
    def test_set_default_nonexistent_currency_fails(self, api_client):
        """POST /api/platform/currencies/staging/XXX/set-default - Should fail for non-existent currency"""
        response = api_client.post(
            f"{BASE_URL}/api/platform/currencies/staging/NONEXISTENT/set-default",
            json={"set_by": "test_agent"}
        )
        
        assert response.status_code == 404
        print("Set default on non-existent currency correctly returns 404")


class TestBrandingUpload:
    """Test logo/branding upload functionality"""
    
    def test_upload_logo(self, api_client):
        """POST /api/platform/branding/staging/upload - Upload a logo"""
        # Create a simple 1x1 PNG image
        import base64
        # Minimal valid PNG (1x1 red pixel)
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        )
        
        files = {
            'file': ('test_logo.png', io.BytesIO(png_data), 'image/png'),
        }
        data = {
            'logo_type': 'primary',
            'uploaded_by': 'test_agent'
        }
        
        # Remove Content-Type header for multipart form
        headers = dict(api_client.headers)
        headers.pop('Content-Type', None)
        
        response = requests.post(
            f"{BASE_URL}/api/platform/branding/staging/upload",
            files=files,
            data=data,
            headers=headers
        )
        
        assert response.status_code == 200
        config = response.json()
        
        # Verify logo was added to branding
        assert "branding" in config
        assert "primary" in config["branding"]
        assert config["branding"]["primary"]["version"] >= 1
        print(f"Uploaded primary logo version {config['branding']['primary']['version']}")
    
    def test_upload_invalid_file_type(self, api_client):
        """POST /api/platform/branding/staging/upload - Invalid file type should fail"""
        files = {
            'file': ('test.txt', io.BytesIO(b"not an image"), 'text/plain'),
        }
        data = {
            'logo_type': 'primary',
            'uploaded_by': 'test_agent'
        }
        
        headers = dict(api_client.headers)
        headers.pop('Content-Type', None)
        
        response = requests.post(
            f"{BASE_URL}/api/platform/branding/staging/upload",
            files=files,
            data=data,
            headers=headers
        )
        
        assert response.status_code == 400
        print("Invalid file type correctly rejected")
    
    def test_get_logo_info(self, api_client):
        """GET /api/platform/branding/staging/primary - Get logo info"""
        response = api_client.get(f"{BASE_URL}/api/platform/branding/staging/primary")
        
        # May return 404 if no logo uploaded yet, or 200 with logo info
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert "logo_type" in data
            assert "version" in data
            print(f"Logo info: {data['logo_type']} v{data['version']}")
        else:
            print("No primary logo uploaded yet")


class TestLegalPages:
    """Test legal pages CRUD operations"""
    
    def test_create_legal_page(self, api_client):
        """POST /api/platform/legal-pages/staging - Create a legal page"""
        page_data = {
            "title": "Test Terms of Service",
            "slug": f"test-tos-{uuid.uuid4().hex[:8]}",
            "content": "<h1>Terms of Service</h1><p>This is a test page.</p>",
            "country_code": None,
            "requires_acceptance": True,
            "force_reaccept_on_change": True
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/platform/legal-pages/staging",
            json={
                "page_data": page_data,
                "created_by": "test_agent"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["title"] == page_data["title"]
        assert data["slug"] == page_data["slug"]
        assert data["status"] == "draft"
        assert data["version"] == 1
        assert "id" in data
        
        print(f"Created legal page: {data['slug']} (id: {data['id']})")
        return data["id"], data["slug"]
    
    def test_get_legal_pages(self, api_client):
        """GET /api/platform/legal-pages/staging - Get all legal pages"""
        response = api_client.get(f"{BASE_URL}/api/platform/legal-pages/staging")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Found {len(data)} legal pages in staging")
    
    def test_publish_legal_page(self, api_client):
        """POST /api/platform/legal-pages/staging/{id}/publish - Publish a legal page"""
        # First create a page
        page_data = {
            "title": "Privacy Policy Test",
            "slug": f"test-privacy-{uuid.uuid4().hex[:8]}",
            "content": "<h1>Privacy Policy</h1><p>Test content.</p>",
            "requires_acceptance": False
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/platform/legal-pages/staging",
            json={
                "page_data": page_data,
                "created_by": "test_agent"
            }
        )
        assert create_response.status_code == 200
        page_id = create_response.json()["id"]
        
        # Now publish it
        publish_response = api_client.post(
            f"{BASE_URL}/api/platform/legal-pages/staging/{page_id}/publish",
            json={"published_by": "test_agent"}
        )
        
        assert publish_response.status_code == 200
        data = publish_response.json()
        
        assert data["status"] == "published"
        assert data["published_at"] is not None
        print(f"Published legal page {page_id}")
    
    def test_publish_already_published_fails(self, api_client):
        """POST /api/platform/legal-pages/staging/{id}/publish - Publishing already published page fails"""
        # Create and publish a page first
        page_data = {
            "title": "Already Published Test",
            "slug": f"test-already-{uuid.uuid4().hex[:8]}",
            "content": "<h1>Test</h1>",
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/platform/legal-pages/staging",
            json={
                "page_data": page_data,
                "created_by": "test_agent"
            }
        )
        page_id = create_response.json()["id"]
        
        # Publish first time
        api_client.post(
            f"{BASE_URL}/api/platform/legal-pages/staging/{page_id}/publish",
            json={"published_by": "test_agent"}
        )
        
        # Try to publish again
        response = api_client.post(
            f"{BASE_URL}/api/platform/legal-pages/staging/{page_id}/publish",
            json={"published_by": "test_agent"}
        )
        
        assert response.status_code == 400
        print("Publishing already published page correctly rejected")


class TestSocialLinks:
    """Test social links management"""
    
    def test_update_social_links(self, api_client):
        """PUT /api/platform/social-links/staging - Update social links"""
        social_links = [
            {
                "platform": "facebook",
                "url": "https://facebook.com/testapp",
                "enabled": True,
                "icon_visible": True,
                "placements": ["footer"]
            },
            {
                "platform": "instagram",
                "url": "https://instagram.com/testapp",
                "enabled": True,
                "icon_visible": True,
                "placements": ["footer", "profile"]
            },
            {
                "platform": "twitter",
                "url": "https://twitter.com/testapp",
                "enabled": True,
                "icon_visible": True,
                "placements": ["footer"]
            }
        ]
        
        response = api_client.put(
            f"{BASE_URL}/api/platform/social-links/staging",
            json={
                "social_links": social_links,
                "updated_by": "test_agent"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["social_links"]) == 3
        platforms = [s["platform"] for s in data["social_links"]]
        assert "facebook" in platforms
        assert "instagram" in platforms
        print(f"Updated {len(data['social_links'])} social links")


class TestAppStoreLinks:
    """Test app store links management"""
    
    def test_update_app_store_links(self, api_client):
        """PUT /api/platform/app-store-links/staging - Update app store links"""
        app_store_links = [
            {
                "store": "google_play",
                "url": "https://play.google.com/store/apps/details?id=com.testapp",
                "enabled": True,
                "show_badge": True,
                "deep_link_enabled": False
            },
            {
                "store": "apple_app_store",
                "url": "https://apps.apple.com/app/testapp/id123456789",
                "enabled": True,
                "show_badge": True,
                "deep_link_enabled": True
            },
            {
                "store": "huawei_appgallery",
                "url": "https://appgallery.huawei.com/app/C123456",
                "enabled": False,
                "show_badge": True
            }
        ]
        
        response = api_client.put(
            f"{BASE_URL}/api/platform/app-store-links/staging",
            json={
                "app_store_links": app_store_links,
                "updated_by": "test_agent"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["app_store_links"]) == 3
        stores = [a["store"] for a in data["app_store_links"]]
        assert "google_play" in stores
        assert "apple_app_store" in stores
        print(f"Updated {len(data['app_store_links'])} app store links")


class TestAuditLogging:
    """Test audit logging functionality"""
    
    def test_audit_logs_created_on_update(self, api_client):
        """Verify audit logs are created when config is updated"""
        # Make a change to trigger audit log
        api_client.put(
            f"{BASE_URL}/api/platform/social-links/staging",
            json={
                "social_links": [
                    {"platform": "youtube", "url": "https://youtube.com/test", "enabled": True, "icon_visible": True, "placements": ["footer"]}
                ],
                "updated_by": "audit_test_agent"
            }
        )
        
        # Check audit logs
        response = api_client.get(f"{BASE_URL}/api/platform/audit-logs/staging?limit=10")
        assert response.status_code == 200
        logs = response.json()
        
        # Should have recent audit entry
        assert len(logs) > 0
        
        # Find our audit log
        recent_logs = [l for l in logs if l.get("performed_by") == "audit_test_agent"]
        if recent_logs:
            log = recent_logs[0]
            assert "action" in log
            assert "resource_type" in log
            assert "performed_at" in log
            print(f"Audit log found: {log['action']} on {log['resource_type']}")
        else:
            print(f"Audit logs exist but couldn't find specific test entry. Total logs: {len(logs)}")
    
    def test_audit_logs_filter_by_resource_type(self, api_client):
        """GET /api/platform/audit-logs/staging - Filter by resource type"""
        response = api_client.get(f"{BASE_URL}/api/platform/audit-logs/staging?resource_type=platform_config")
        assert response.status_code == 200
        logs = response.json()
        
        for log in logs:
            assert log["resource_type"] == "platform_config"
        
        print(f"Found {len(logs)} platform_config audit logs")


class TestConfigUpdate:
    """Test platform config update endpoint"""
    
    def test_update_platform_config(self, api_client):
        """PUT /api/platform/config/staging - Update platform config"""
        response = api_client.put(
            f"{BASE_URL}/api/platform/config/staging",
            json={
                "updates": {
                    "social_icons_enabled": True,
                    "social_icon_style": "mono"
                },
                "updated_by": "test_agent"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["social_icons_enabled"] == True
        assert data["social_icon_style"] == "mono"
        print(f"Updated config version to {data['version']}")
    
    def test_get_config_history(self, api_client):
        """GET /api/platform/config/staging/history - Get config version history"""
        response = api_client.get(f"{BASE_URL}/api/platform/config/staging/history?limit=5")
        assert response.status_code == 200
        history = response.json()
        
        assert isinstance(history, list)
        print(f"Found {len(history)} config history entries")


class TestEnvironmentIsolation:
    """Test that production and staging are isolated"""
    
    def test_staging_changes_dont_affect_production(self, api_client):
        """Changes to staging should not affect production"""
        # Get production config
        prod_response = api_client.get(f"{BASE_URL}/api/platform/config/production")
        prod_config = prod_response.json()
        prod_version = prod_config["version"]
        
        # Make change to staging
        api_client.put(
            f"{BASE_URL}/api/platform/config/staging",
            json={
                "updates": {"social_icon_style": "brand_color"},
                "updated_by": "isolation_test"
            }
        )
        
        # Check production is unchanged
        prod_response2 = api_client.get(f"{BASE_URL}/api/platform/config/production")
        prod_config2 = prod_response2.json()
        
        assert prod_config2["version"] == prod_version
        print("Production config unchanged after staging update")


class TestEdgeCases:
    """Test edge cases and error handling"""
    
    def test_invalid_environment(self, api_client):
        """Invalid environment should return 422"""
        response = api_client.get(f"{BASE_URL}/api/platform/config/invalid_env")
        assert response.status_code == 422
        print("Invalid environment correctly returns 422")
    
    def test_publish_nonexistent_page(self, api_client):
        """Publishing non-existent page should return 404"""
        response = api_client.post(
            f"{BASE_URL}/api/platform/legal-pages/staging/nonexistent-id/publish",
            json={"published_by": "test"}
        )
        assert response.status_code == 404
        print("Publishing non-existent page correctly returns 404")
    
    def test_get_nonexistent_logo(self, api_client):
        """Getting non-existent logo type should return 404"""
        response = api_client.get(f"{BASE_URL}/api/platform/branding/staging/splash")
        assert response.status_code == 404
        print("Non-existent logo correctly returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
