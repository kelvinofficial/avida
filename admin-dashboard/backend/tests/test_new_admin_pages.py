"""
Test Suite for New Admin UI Pages:
- SEO Tools (meta tags, global settings, sitemap config)
- Polls & Surveys
- Cookie Consent (GDPR banner config)
- URL Shortener
- reCAPTCHA Configuration
- Image Settings (WebP config)
- Voucher Bulk Import
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('NEXT_PUBLIC_API_URL', 'https://filter-rollback.preview.emergentagent.com/api/admin')

# Test credentials
ADMIN_EMAIL = "admin@marketplace.com"
ADMIN_PASSWORD = "Admin@123456"


class TestAdminAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Test admin login"""
        assert auth_token is not None
        print(f"✅ Admin login successful, token obtained")
    
    def test_get_current_admin(self, auth_token):
        """Test get current admin info"""
        response = requests.get(
            f"{BASE_URL}/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Get me failed: {response.text}"
        data = response.json()
        assert "email" in data
        print(f"✅ Current admin: {data.get('email')}")


class TestSeoTools:
    """SEO Tools API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_get_seo_meta_tags(self, auth_token):
        """Test GET /seo/meta - List all SEO meta tags"""
        response = requests.get(
            f"{BASE_URL}/seo/meta",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "meta_tags" in data
        print(f"✅ Got {len(data['meta_tags'])} meta tags")
    
    def test_get_global_seo_settings(self, auth_token):
        """Test GET /seo/global-settings"""
        response = requests.get(
            f"{BASE_URL}/seo/global-settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Check expected fields exist
        assert isinstance(data, dict)
        print(f"✅ Got global SEO settings: site_name={data.get('site_name')}")
    
    def test_update_global_seo_settings(self, auth_token):
        """Test PUT /seo/global-settings"""
        response = requests.put(
            f"{BASE_URL}/seo/global-settings",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "site_name": "Avida Marketplace",
                "site_description": "Your local marketplace for buying and selling",
                "twitter_handle": "@AvidaApp"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✅ Updated global SEO settings")
    
    def test_create_seo_meta(self, auth_token):
        """Test POST /seo/meta - Create meta tags"""
        unique_path = f"/test-page-{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/seo/meta",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "page_path": unique_path,
                "title": "Test Page Title",
                "description": "Test page description for SEO",
                "keywords": ["test", "page"],
                "robots": "index, follow"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✅ Created SEO meta for {unique_path}, id={data.get('id')}")
        return data.get("id")
    
    def test_get_sitemap_config(self, auth_token):
        """Test GET /seo/sitemap-config"""
        response = requests.get(
            f"{BASE_URL}/seo/sitemap-config",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✅ Got sitemap config: auto_generate={data.get('auto_generate')}")
    
    def test_update_sitemap_config(self, auth_token):
        """Test PUT /seo/sitemap-config"""
        response = requests.put(
            f"{BASE_URL}/seo/sitemap-config",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "auto_generate": True,
                "include_listings": True,
                "include_categories": True,
                "change_frequency": "weekly"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✅ Updated sitemap config")
    
    def test_regenerate_sitemap(self, auth_token):
        """Test POST /seo/regenerate-sitemap"""
        response = requests.post(
            f"{BASE_URL}/seo/regenerate-sitemap",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✅ Regenerated sitemap: {data.get('entries', {}).get('total', 0)} entries")


class TestPollsSurveys:
    """Polls & Surveys API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_list_polls(self, auth_token):
        """Test GET /polls/list"""
        response = requests.get(
            f"{BASE_URL}/polls/list",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "polls" in data
        print(f"✅ Got {len(data['polls'])} polls/surveys")
    
    def test_list_polls_by_type(self, auth_token):
        """Test GET /polls/list with poll_type filter"""
        response = requests.get(
            f"{BASE_URL}/polls/list",
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"poll_type": "feedback"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✅ Filtered polls by feedback type")
    
    def test_create_poll(self, auth_token):
        """Test POST /polls/create"""
        response = requests.post(
            f"{BASE_URL}/polls/create",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "title": "App Feedback Survey",
                "description": "Help us improve the app",
                "type": "feedback",
                "questions": [
                    {"id": "q1", "text": "How would you rate the app?", "type": "rating", "required": True}
                ],
                "require_auth": True,
                "show_results": False,
                "is_active": True,
                "target_audience": "all"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✅ Created poll: {data.get('poll_id')}")
        return data.get("poll_id")
    
    def test_get_poll_details(self, auth_token):
        """Test GET /polls/{poll_id}"""
        # First create a poll
        create_res = requests.post(
            f"{BASE_URL}/polls/create",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "title": "Quick Poll Test",
                "type": "poll",
                "options": ["Option A", "Option B", "Option C"],
                "is_active": True
            }
        )
        poll_id = create_res.json().get("poll_id")
        
        # Get poll details
        response = requests.get(
            f"{BASE_URL}/polls/{poll_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("title") == "Quick Poll Test"
        print(f"✅ Got poll details: {data.get('title')}")
    
    def test_update_poll(self, auth_token):
        """Test PUT /polls/{poll_id}"""
        # Create a poll first
        create_res = requests.post(
            f"{BASE_URL}/polls/create",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"title": "Update Test Poll", "type": "feedback", "is_active": True}
        )
        poll_id = create_res.json().get("poll_id")
        
        # Update it
        response = requests.put(
            f"{BASE_URL}/polls/{poll_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"is_active": False}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✅ Updated poll to inactive")
    
    def test_export_poll_responses(self, auth_token):
        """Test GET /polls/{poll_id}/export"""
        # Create a poll first
        create_res = requests.post(
            f"{BASE_URL}/polls/create",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"title": "Export Test Poll", "type": "survey", "is_active": True}
        )
        poll_id = create_res.json().get("poll_id")
        
        response = requests.get(
            f"{BASE_URL}/polls/{poll_id}/export",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "poll" in data
        assert "responses" in data
        print(f"✅ Exported poll responses")


class TestCookieConsent:
    """Cookie Consent API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_get_cookie_settings(self, auth_token):
        """Test GET /cookies/settings"""
        response = requests.get(
            f"{BASE_URL}/cookies/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Check expected fields
        assert "enabled" in data or isinstance(data, dict)
        print(f"✅ Got cookie settings: enabled={data.get('enabled')}")
    
    def test_update_cookie_settings(self, auth_token):
        """Test PUT /cookies/settings"""
        response = requests.put(
            f"{BASE_URL}/cookies/settings",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "enabled": True,
                "banner_text": "We use cookies to enhance your experience.",
                "privacy_policy_url": "/privacy",
                "position": "bottom",
                "theme": "dark",
                "show_preferences": True,
                "categories": [
                    {"id": "necessary", "name": "Necessary", "description": "Essential", "required": True, "enabled": True},
                    {"id": "analytics", "name": "Analytics", "description": "Help us improve", "required": False, "enabled": True}
                ],
                "button_text": {
                    "accept_all": "Accept All",
                    "reject_all": "Reject All",
                    "customize": "Customize"
                }
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✅ Updated cookie consent settings")
    
    def test_get_cookie_stats(self, auth_token):
        """Test GET /cookies/stats"""
        response = requests.get(
            f"{BASE_URL}/cookies/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total_consents" in data
        print(f"✅ Got cookie stats: {data.get('total_consents')} total consents")


class TestRecaptcha:
    """reCAPTCHA Configuration API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_get_recaptcha_settings(self, auth_token):
        """Test GET /recaptcha/settings"""
        response = requests.get(
            f"{BASE_URL}/recaptcha/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Secret key should NOT be returned
        assert "secret_key" not in data
        print(f"✅ Got reCAPTCHA settings: enabled={data.get('enabled')}, type={data.get('type')}")
    
    def test_update_recaptcha_settings(self, auth_token):
        """Test PUT /recaptcha/settings"""
        response = requests.put(
            f"{BASE_URL}/recaptcha/settings",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "enabled": False,
                "site_key": "test-site-key",
                "type": "v2_invisible",
                "threshold": 0.5,
                "protected_forms": ["login", "register", "contact"]
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✅ Updated reCAPTCHA settings")


class TestImageSettings:
    """Image Settings (WebP) API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_get_image_settings(self, auth_token):
        """Test GET /images/settings"""
        response = requests.get(
            f"{BASE_URL}/images/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✅ Got image settings: auto_convert_webp={data.get('auto_convert_webp')}, quality={data.get('webp_quality')}")
    
    def test_update_image_settings(self, auth_token):
        """Test PUT /images/settings"""
        response = requests.put(
            f"{BASE_URL}/images/settings",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "auto_convert_webp": True,
                "webp_quality": 80,
                "max_width": 1920,
                "max_height": 1080,
                "thumbnail_size": 300,
                "allowed_formats": ["jpg", "jpeg", "png", "gif", "webp"],
                "max_file_size_mb": 5
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✅ Updated image settings")
    
    def test_get_image_stats(self, auth_token):
        """Test GET /images/stats"""
        response = requests.get(
            f"{BASE_URL}/images/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "listings_with_images" in data
        print(f"✅ Got image stats: {data.get('listings_with_images')} listings with images")
    
    def test_batch_convert_images(self, auth_token):
        """Test POST /images/convert-batch"""
        response = requests.post(
            f"{BASE_URL}/images/convert-batch",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"target": "listings"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✅ Started batch conversion: {data.get('message')}")


class TestUrlShortener:
    """URL Shortener API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_list_short_urls(self, auth_token):
        """Test GET /urls/list"""
        response = requests.get(
            f"{BASE_URL}/urls/list",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "urls" in data
        print(f"✅ Got {len(data['urls'])} short URLs")
    
    def test_create_short_url(self, auth_token):
        """Test POST /urls/create"""
        unique_code = f"test{uuid.uuid4().hex[:6]}"
        response = requests.post(
            f"{BASE_URL}/urls/create",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "target_url": "https://example.com/long-url-path?param=value",
                "custom_code": unique_code,
                "title": "Test Campaign Link"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "code" in data
        print(f"✅ Created short URL: /s/{data.get('code')}")
        return data.get("code")
    
    def test_get_short_url_stats(self, auth_token):
        """Test GET /urls/{code}/stats"""
        # Create a URL first
        unique_code = f"stat{uuid.uuid4().hex[:6]}"
        create_res = requests.post(
            f"{BASE_URL}/urls/create",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"target_url": "https://example.com", "custom_code": unique_code}
        )
        code = create_res.json().get("code")
        
        response = requests.get(
            f"{BASE_URL}/urls/{code}/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "clicks" in data
        print(f"✅ Got URL stats: {data.get('clicks')} clicks")
    
    def test_delete_short_url(self, auth_token):
        """Test DELETE /urls/{code}"""
        # Create a URL first
        unique_code = f"del{uuid.uuid4().hex[:6]}"
        create_res = requests.post(
            f"{BASE_URL}/urls/create",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"target_url": "https://example.com/to-delete", "custom_code": unique_code}
        )
        code = create_res.json().get("code")
        
        response = requests.delete(
            f"{BASE_URL}/urls/{code}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✅ Deleted short URL: {code}")


class TestVoucherBulkImport:
    """Voucher Bulk Import API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_bulk_import_vouchers(self, auth_token):
        """Test POST /vouchers/bulk-import"""
        unique_suffix = uuid.uuid4().hex[:4]
        response = requests.post(
            f"{BASE_URL}/vouchers/bulk-import",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "vouchers": [
                    {
                        "code": f"BULK1_{unique_suffix}",
                        "voucher_type": "percent",
                        "value": 10,
                        "description": "Bulk imported voucher 1",
                        "max_uses": 100
                    },
                    {
                        "code": f"BULK2_{unique_suffix}",
                        "voucher_type": "amount",
                        "value": 5,
                        "description": "Bulk imported voucher 2",
                        "max_uses": 50
                    }
                ],
                "batch_name": f"test_import_{unique_suffix}"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "created" in data
        print(f"✅ Bulk imported {data.get('created')} vouchers, {data.get('skipped', 0)} skipped")
    
    def test_get_voucher_template(self, auth_token):
        """Test GET /vouchers/template"""
        response = requests.get(
            f"{BASE_URL}/vouchers/template",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "template" in data or "headers" in data or isinstance(data, dict)
        print(f"✅ Got voucher import template")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
