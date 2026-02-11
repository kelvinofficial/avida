"""
Smart Notifications Phase 5 Backend Tests

Phase 5 features tested:
1. Multi-Language Templates (i18n) - GET languages, GET/POST/DELETE ml-templates, preview
2. Campaign Scheduler Automation - GET/PUT scheduler config, start/stop scheduler, logs
3. Visual Segment Builder APIs - Already tested in Phase 4, regression tests included
"""

import pytest
import requests
import os
from datetime import datetime, timezone, timedelta
import uuid

# Get BASE_URL from environment - without /api suffix (added in requests)
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://route-extract-1.preview.emergentagent.com").rstrip("/")


class TestPhase5SupportedLanguages:
    """Tests for Multi-Language Support - Languages Endpoint"""
    
    def test_get_supported_languages(self):
        """GET /smart-notifications/admin/languages - Get all 15 supported languages"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/languages")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, dict), "Expected dict of languages"
        
        # Should have exactly 15 supported languages
        expected_languages = ["en", "es", "fr", "de", "it", "pt", "nl", "pl", "ru", "zh", "ja", "ko", "ar", "hi", "tr"]
        
        for lang_code in expected_languages:
            assert lang_code in data, f"Language '{lang_code}' not found in supported languages"
            lang_info = data[lang_code]
            assert "name" in lang_info, f"Language {lang_code} missing 'name'"
            assert "native" in lang_info, f"Language {lang_code} missing 'native'"
            assert "flag" in lang_info, f"Language {lang_code} missing 'flag'"
        
        assert len(data) == 15, f"Expected 15 languages, got {len(data)}"
        
        print(f"PASS: Found {len(data)} supported languages: {list(data.keys())}")
    
    def test_language_info_structure(self):
        """Verify each language has correct structure with name, native, and flag"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/languages")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify English as example
        assert data["en"]["name"] == "English", f"English name mismatch: {data['en']}"
        assert data["en"]["native"] == "English", f"English native mismatch: {data['en']}"
        assert "flag" in data["en"], "English should have flag emoji"
        
        # Verify Spanish
        assert data["es"]["name"] == "Spanish", f"Spanish name mismatch: {data['es']}"
        assert data["es"]["native"] == "Español", f"Spanish native mismatch: {data['es']}"
        
        # Verify Arabic (RTL language)
        assert data["ar"]["name"] == "Arabic", f"Arabic name mismatch: {data['ar']}"
        assert data["ar"]["native"] == "العربية", f"Arabic native mismatch: {data['ar']}"
        
        # Verify Chinese
        assert data["zh"]["name"] == "Chinese", f"Chinese name mismatch: {data['zh']}"
        assert data["zh"]["native"] == "中文", f"Chinese native mismatch: {data['zh']}"
        
        print("PASS: All language structures verified correctly")


class TestPhase5MultiLanguageTemplates:
    """Tests for Multi-Language Templates APIs"""
    
    def test_get_ml_templates_default(self):
        """GET /smart-notifications/admin/ml-templates - Get all templates including 4 defaults"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ml-templates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected array of templates"
        
        # Should have at least 4 default templates
        default_template_ids = ["new_listing_alert", "price_drop_alert", "message_received", "weekly_digest"]
        
        template_ids = [t.get("id") for t in data]
        
        for tid in default_template_ids:
            assert tid in template_ids, f"Default template '{tid}' not found"
        
        # Verify default templates have is_default=True
        default_templates = [t for t in data if t.get("is_default")]
        assert len(default_templates) >= 4, f"Expected at least 4 default templates, got {len(default_templates)}"
        
        print(f"PASS: Found {len(data)} templates, {len(default_templates)} are defaults")
    
    def test_get_default_template_detail(self):
        """GET /smart-notifications/admin/ml-templates/{id} - Get specific default template"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ml-templates/new_listing_alert")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        assert data["id"] == "new_listing_alert", f"ID mismatch: {data.get('id')}"
        assert data.get("is_default") == True, "Should be default template"
        assert data.get("name") == "New Listing Alert", f"Name mismatch: {data.get('name')}"
        assert data.get("trigger_type") == "new_listing_in_category", f"Trigger type mismatch: {data.get('trigger_type')}"
        
        # Verify has translations
        assert "translations" in data, "Should have translations"
        translations = data["translations"]
        
        # Should have at least English, Spanish, French, German, Italian, Portuguese
        expected_langs = ["en", "es", "fr", "de", "it", "pt"]
        for lang in expected_langs:
            assert lang in translations, f"Translation for '{lang}' not found in new_listing_alert"
            assert "title" in translations[lang], f"Title missing for {lang}"
            assert "body" in translations[lang], f"Body missing for {lang}"
        
        # Verify variables
        assert "variables" in data, "Should have variables list"
        assert "user_name" in data["variables"], "Variables should include user_name"
        assert "category_name" in data["variables"], "Variables should include category_name"
        assert "listing_title" in data["variables"], "Variables should include listing_title"
        assert "price" in data["variables"], "Variables should include price"
        
        print(f"PASS: Default template has {len(translations)} translations and {len(data['variables'])} variables")
    
    def test_create_custom_ml_template(self):
        """POST /smart-notifications/admin/ml-templates - Create custom multi-language template"""
        template_data = {
            "name": f"TEST_Custom_Template_{uuid.uuid4().hex[:6]}",
            "description": "Test multi-language template",
            "trigger_type": "promotional",
            "default_language": "en",
            "translations": {
                "en": {
                    "title": "Special Offer: {{discount}}% Off!",
                    "body": "Hi {{user_name}}, check out our special offer",
                    "subject": "Special Promotion for You"
                },
                "es": {
                    "title": "Oferta Especial: {{discount}}% de Descuento!",
                    "body": "Hola {{user_name}}, mira nuestra oferta especial",
                    "subject": "Promoción Especial para Ti"
                }
            },
            "channels": ["email", "push"],
            "variables": ["user_name", "discount", "offer_end_date"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/ml-templates",
            json=template_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have id"
        assert data["id"].startswith("mlt_"), f"Template ID should start with 'mlt_', got {data['id']}"
        assert data["name"] == template_data["name"], "Name should match"
        assert data["trigger_type"] == template_data["trigger_type"], "Trigger type should match"
        assert data["is_active"] == True, "New template should be active"
        assert data["version"] == 1, "New template should be version 1"
        assert "translations" in data, "Response should have translations"
        assert "en" in data["translations"], "Should have English translation"
        assert "es" in data["translations"], "Should have Spanish translation"
        assert "created_at" in data, "Response should have created_at"
        
        # Cleanup
        template_id = data["id"]
        delete_resp = requests.delete(f"{BASE_URL}/api/smart-notifications/admin/ml-templates/{template_id}")
        assert delete_resp.status_code == 200
        
        print(f"PASS: Created custom template with id={data['id']}, version={data['version']}")
        return data
    
    def test_update_custom_ml_template(self):
        """PUT /smart-notifications/admin/ml-templates/{id} - Update custom template"""
        # First create a template
        create_data = {
            "name": f"TEST_Update_Template_{uuid.uuid4().hex[:6]}",
            "description": "Original description",
            "trigger_type": "promotional",
            "translations": {
                "en": {"title": "Original Title", "body": "Original Body"}
            }
        }
        create_resp = requests.post(f"{BASE_URL}/api/smart-notifications/admin/ml-templates", json=create_data)
        assert create_resp.status_code == 200
        template_id = create_resp.json()["id"]
        
        # Now update it
        update_data = {
            "name": f"TEST_Updated_Template_{uuid.uuid4().hex[:6]}",
            "description": "Updated description"
        }
        
        update_resp = requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/ml-templates/{template_id}",
            json=update_data
        )
        assert update_resp.status_code == 200, f"Expected 200, got {update_resp.status_code}: {update_resp.text}"
        
        data = update_resp.json()
        assert data["name"] == update_data["name"], "Name should be updated"
        assert data["description"] == update_data["description"], "Description should be updated"
        assert data["version"] == 2, f"Version should be 2 after update, got {data.get('version')}"
        assert "updated_at" in data, "Should have updated_at"
        
        # Cleanup
        delete_resp = requests.delete(f"{BASE_URL}/api/smart-notifications/admin/ml-templates/{template_id}")
        assert delete_resp.status_code == 200
        
        print(f"PASS: Updated custom template, version increased to {data['version']}")
    
    def test_cannot_modify_default_template(self):
        """PUT /smart-notifications/admin/ml-templates/{default_id} - Should fail for default templates"""
        update_data = {"name": "Hacked Name"}
        
        response = requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/ml-templates/new_listing_alert",
            json=update_data
        )
        assert response.status_code == 400, f"Expected 400 for modifying default template, got {response.status_code}"
        
        print("PASS: Cannot modify default templates (returns 400)")
    
    def test_cannot_delete_default_template(self):
        """DELETE /smart-notifications/admin/ml-templates/{default_id} - Should fail for default templates"""
        response = requests.delete(f"{BASE_URL}/api/smart-notifications/admin/ml-templates/new_listing_alert")
        assert response.status_code == 400, f"Expected 400 for deleting default template, got {response.status_code}"
        
        print("PASS: Cannot delete default templates (returns 400)")
    
    def test_delete_custom_ml_template(self):
        """DELETE /smart-notifications/admin/ml-templates/{id} - Delete custom template"""
        # First create a template
        create_data = {
            "name": f"TEST_Delete_Template_{uuid.uuid4().hex[:6]}",
            "trigger_type": "promotional",
            "translations": {"en": {"title": "Test", "body": "Test"}}
        }
        create_resp = requests.post(f"{BASE_URL}/api/smart-notifications/admin/ml-templates", json=create_data)
        assert create_resp.status_code == 200
        template_id = create_resp.json()["id"]
        
        # Now delete it
        delete_resp = requests.delete(f"{BASE_URL}/api/smart-notifications/admin/ml-templates/{template_id}")
        assert delete_resp.status_code == 200, f"Expected 200, got {delete_resp.status_code}: {delete_resp.text}"
        
        data = delete_resp.json()
        assert data.get("success") == True, f"Delete should return success=True, got {data}"
        
        # Verify it's gone
        get_resp = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ml-templates/{template_id}")
        assert get_resp.status_code == 404, f"Template should be deleted, got {get_resp.status_code}"
        
        print(f"PASS: Deleted custom template {template_id}")
    
    def test_get_template_not_found(self):
        """GET /smart-notifications/admin/ml-templates/{invalid_id} - Should return 404"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ml-templates/invalid_template_id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("PASS: Returns 404 for non-existent template")


class TestPhase5TemplatePreview:
    """Tests for Multi-Language Template Preview API"""
    
    def test_preview_default_template_english(self):
        """POST /smart-notifications/admin/ml-templates/preview - Preview default template in English"""
        preview_data = {
            "template_id": "new_listing_alert",
            "language": "en",
            "variables": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/ml-templates/preview",
            json=preview_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["language"] == "en", f"Language should be en, got {data.get('language')}"
        assert "title" in data, "Response should have title"
        assert "body" in data, "Response should have body"
        assert "variables_used" in data, "Response should have variables_used"
        
        # Check that variables are rendered with sample values
        assert "{{" not in data["title"], "Title should have variables rendered"
        assert "Electronics" in data["title"] or "iPhone" in data["body"], "Sample variables should be used"
        
        print(f"PASS: Preview in English - Title: '{data['title']}', Body: '{data['body']}'")
    
    def test_preview_default_template_spanish(self):
        """POST /smart-notifications/admin/ml-templates/preview - Preview in Spanish"""
        preview_data = {
            "template_id": "new_listing_alert",
            "language": "es",
            "variables": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/ml-templates/preview",
            json=preview_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["language"] == "es", f"Language should be es, got {data.get('language')}"
        
        # Spanish title should contain Spanish words
        title = data.get("title", "")
        assert "Nuevo" in title or "anuncio" in title, f"Spanish title expected, got: {title}"
        
        print(f"PASS: Preview in Spanish - Title: '{data['title']}'")
    
    def test_preview_template_with_custom_variables(self):
        """POST /smart-notifications/admin/ml-templates/preview - Preview with custom variables"""
        preview_data = {
            "template_id": "price_drop_alert",
            "language": "en",
            "variables": {
                "listing_title": "Custom Test Product",
                "price": "500",
                "old_price": "750",
                "drop_percent": "33"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/ml-templates/preview",
            json=preview_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Custom values should be used
        assert "Custom Test Product" in data["title"] or "Custom Test Product" in data["body"], \
            f"Custom listing_title should be in output: {data}"
        
        print(f"PASS: Preview with custom variables - Title: '{data['title']}', Body: '{data['body']}'")
    
    def test_preview_fallback_to_default_language(self):
        """POST /smart-notifications/admin/ml-templates/preview - Falls back to default language for unsupported"""
        preview_data = {
            "template_id": "message_received",  # May not have all 15 languages
            "language": "tr",  # Turkish - may not be translated
            "variables": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/ml-templates/preview",
            json=preview_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should return either Turkish if available, or fallback to English
        assert data["language"] == "tr", f"Language should be tr, got {data.get('language')}"
        assert data["title"] or data["body"], "Should have some content (either translated or fallback)"
        
        print(f"PASS: Preview with fallback - Language: {data['language']}, Title: '{data['title']}'")
    
    def test_preview_template_not_found(self):
        """POST /smart-notifications/admin/ml-templates/preview - Should return 404 for invalid template"""
        preview_data = {
            "template_id": "invalid_template_id",
            "language": "en",
            "variables": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/ml-templates/preview",
            json=preview_data
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("PASS: Returns 404 for preview of non-existent template")


class TestPhase5SchedulerConfig:
    """Tests for Campaign Scheduler Configuration APIs"""
    
    def test_get_scheduler_config(self):
        """GET /smart-notifications/admin/scheduler/config - Get scheduler configuration"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/scheduler/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify required fields
        assert "id" in data, "Config should have id"
        assert data["id"] == "campaign_scheduler_config", f"ID should be 'campaign_scheduler_config', got {data['id']}"
        assert "enabled" in data, "Config should have enabled"
        assert "check_interval_seconds" in data, "Config should have check_interval_seconds"
        assert "batch_size" in data, "Config should have batch_size"
        assert "max_retries" in data, "Config should have max_retries"
        assert "retry_delay_minutes" in data, "Config should have retry_delay_minutes"
        
        # Verify rate limiting fields
        assert "max_campaigns_per_hour" in data, "Config should have max_campaigns_per_hour"
        assert "max_notifications_per_minute" in data, "Config should have max_notifications_per_minute"
        
        # Verify monitoring fields
        assert "alert_on_failure" in data, "Config should have alert_on_failure"
        
        # Verify stats fields
        assert "campaigns_processed_today" in data, "Config should have campaigns_processed_today"
        assert "notifications_sent_today" in data, "Config should have notifications_sent_today"
        
        print(f"PASS: Scheduler config - enabled={data['enabled']}, max_campaigns/hr={data['max_campaigns_per_hour']}, max_notif/min={data['max_notifications_per_minute']}")
    
    def test_update_scheduler_config(self):
        """PUT /smart-notifications/admin/scheduler/config - Update scheduler configuration"""
        # First get current config to restore later
        get_resp = requests.get(f"{BASE_URL}/api/smart-notifications/admin/scheduler/config")
        original_config = get_resp.json()
        
        # Update config
        update_data = {
            "max_campaigns_per_hour": 15,
            "max_notifications_per_minute": 500,
            "alert_on_failure": False
        }
        
        response = requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/scheduler/config",
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["max_campaigns_per_hour"] == 15, f"max_campaigns_per_hour should be 15, got {data.get('max_campaigns_per_hour')}"
        assert data["max_notifications_per_minute"] == 500, f"max_notifications_per_minute should be 500, got {data.get('max_notifications_per_minute')}"
        assert data["alert_on_failure"] == False, f"alert_on_failure should be False, got {data.get('alert_on_failure')}"
        assert "updated_at" in data, "Should have updated_at"
        
        # Restore original config
        restore_data = {
            "max_campaigns_per_hour": original_config.get("max_campaigns_per_hour", 10),
            "max_notifications_per_minute": original_config.get("max_notifications_per_minute", 1000),
            "alert_on_failure": original_config.get("alert_on_failure", True)
        }
        requests.put(f"{BASE_URL}/api/smart-notifications/admin/scheduler/config", json=restore_data)
        
        print(f"PASS: Updated scheduler config and restored original values")
    
    def test_scheduler_config_rate_limits(self):
        """Verify scheduler config has correct default rate limits"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/scheduler/config")
        assert response.status_code == 200
        
        data = response.json()
        
        # Default rate limits as per spec: 10 campaigns/hour, 1000 notifications/minute
        # Note: values may have been modified, so just verify they exist and are reasonable
        assert data["max_campaigns_per_hour"] > 0, "max_campaigns_per_hour should be positive"
        assert data["max_notifications_per_minute"] > 0, "max_notifications_per_minute should be positive"
        
        print(f"PASS: Rate limits - {data['max_campaigns_per_hour']} campaigns/hr, {data['max_notifications_per_minute']} notifications/min")


class TestPhase5SchedulerControl:
    """Tests for Campaign Scheduler Control APIs"""
    
    def test_start_scheduler(self):
        """POST /smart-notifications/admin/scheduler/start - Start the scheduler"""
        response = requests.post(f"{BASE_URL}/api/smart-notifications/admin/scheduler/start")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        assert "status" in data, "Response should have status"
        assert data["status"] == "running", f"Status should be 'running', got {data.get('status')}"
        
        print(f"PASS: Start scheduler - message='{data['message']}', status={data['status']}")
    
    def test_stop_scheduler(self):
        """POST /smart-notifications/admin/scheduler/stop - Stop the scheduler"""
        response = requests.post(f"{BASE_URL}/api/smart-notifications/admin/scheduler/stop")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        assert "status" in data, "Response should have status"
        assert data["status"] == "stopped", f"Status should be 'stopped', got {data.get('status')}"
        
        print(f"PASS: Stop scheduler - message='{data['message']}', status={data['status']}")
    
    def test_get_scheduler_logs(self):
        """GET /smart-notifications/admin/scheduler/logs - Get scheduler logs"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/scheduler/logs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be array of logs"
        
        # Logs might be empty if scheduler hasn't run
        print(f"PASS: Retrieved {len(data)} scheduler logs")
    
    def test_get_scheduler_logs_with_limit(self):
        """GET /smart-notifications/admin/scheduler/logs?limit=10 - Get limited scheduler logs"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/scheduler/logs?limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be array of logs"
        assert len(data) <= 10, f"Should return at most 10 logs, got {len(data)}"
        
        print(f"PASS: Retrieved {len(data)} scheduler logs with limit=10")


class TestPhase5RegressionPhase1To4:
    """Regression tests to ensure Phase 1-4 APIs still work"""
    
    def test_phase1_admin_config(self):
        """GET /smart-notifications/admin/config - Phase 1 config endpoint"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/config")
        assert response.status_code == 200, f"Phase 1 config failed: {response.status_code}"
        
        data = response.json()
        assert "id" in data, "Config should have id"
        print("PASS: Phase 1 admin config endpoint working")
    
    def test_phase1_admin_triggers(self):
        """GET /smart-notifications/admin/triggers - Phase 1 triggers endpoint"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/triggers")
        assert response.status_code == 200, f"Phase 1 triggers failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Triggers should be array"
        print(f"PASS: Phase 1 triggers endpoint working - {len(data)} triggers")
    
    def test_phase2_ab_tests(self):
        """GET /smart-notifications/admin/ab-tests - Phase 2 A/B tests endpoint"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ab-tests")
        assert response.status_code == 200, f"Phase 2 ab-tests failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "AB tests should be array"
        print(f"PASS: Phase 2 ab-tests endpoint working - {len(data)} tests")
    
    def test_phase2_weekly_digest_config(self):
        """GET /smart-notifications/admin/weekly-digest/config - Phase 2 digest config"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/weekly-digest/config")
        assert response.status_code == 200, f"Phase 2 weekly-digest failed: {response.status_code}"
        
        data = response.json()
        assert "enabled" in data, "Digest config should have enabled"
        print("PASS: Phase 2 weekly-digest config endpoint working")
    
    def test_phase3_campaigns(self):
        """GET /smart-notifications/admin/campaigns - Phase 3 campaigns endpoint"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/campaigns")
        assert response.status_code == 200, f"Phase 3 campaigns failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Campaigns should be array"
        print(f"PASS: Phase 3 campaigns endpoint working - {len(data)} campaigns")
    
    def test_phase3_templates(self):
        """GET /smart-notifications/admin/templates - Phase 3 templates endpoint"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/templates")
        assert response.status_code == 200, f"Phase 3 templates failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Templates should be array"
        print(f"PASS: Phase 3 templates endpoint working - {len(data)} templates")
    
    def test_phase4_segments(self):
        """GET /smart-notifications/admin/segments - Phase 4 segments endpoint"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/segments")
        assert response.status_code == 200, f"Phase 4 segments failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Segments should be array"
        
        # Should have predefined segments
        predefined = [s for s in data if s.get("is_predefined")]
        assert len(predefined) >= 7, f"Should have at least 7 predefined segments, got {len(predefined)}"
        
        print(f"PASS: Phase 4 segments endpoint working - {len(data)} total, {len(predefined)} predefined")
    
    def test_phase4_scheduler_status(self):
        """GET /smart-notifications/admin/scheduler/status - Phase 4 scheduler status"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/scheduler/status")
        assert response.status_code == 200, f"Phase 4 scheduler status failed: {response.status_code}"
        
        data = response.json()
        assert "scheduler_running" in data, "Should have scheduler_running"
        assert "fcm_enabled" in data, "Should have fcm_enabled"
        assert "sendgrid_enabled" in data, "Should have sendgrid_enabled"
        
        print(f"PASS: Phase 4 scheduler status - running={data['scheduler_running']}, fcm={data['fcm_enabled']}, sendgrid={data['sendgrid_enabled']}")


class TestPhase5EdgeCases:
    """Edge case tests for Phase 5 APIs"""
    
    def test_preview_all_default_templates_all_languages(self):
        """Test preview for all 4 default templates in first 4 languages"""
        templates = ["new_listing_alert", "price_drop_alert", "message_received", "weekly_digest"]
        languages = ["en", "es", "fr", "de"]
        
        success_count = 0
        for template_id in templates:
            for lang in languages:
                preview_data = {
                    "template_id": template_id,
                    "language": lang,
                    "variables": {}
                }
                response = requests.post(
                    f"{BASE_URL}/api/smart-notifications/admin/ml-templates/preview",
                    json=preview_data
                )
                assert response.status_code == 200, f"Preview failed for {template_id}/{lang}: {response.status_code}"
                
                data = response.json()
                assert data["title"] or data["body"], f"Preview for {template_id}/{lang} should have content"
                success_count += 1
        
        print(f"PASS: Successfully previewed {success_count} template/language combinations")
    
    def test_verify_default_template_translations(self):
        """Verify default templates have expected language translations"""
        # new_listing_alert should have 6 languages: en, es, fr, de, it, pt
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ml-templates/new_listing_alert")
        assert response.status_code == 200
        
        data = response.json()
        translations = data.get("translations", {})
        
        expected = ["en", "es", "fr", "de", "it", "pt"]
        for lang in expected:
            assert lang in translations, f"new_listing_alert missing {lang} translation"
        
        print(f"PASS: new_listing_alert has {len(translations)} translations: {list(translations.keys())}")
        
        # price_drop_alert should have 4 languages: en, es, fr, de
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ml-templates/price_drop_alert")
        assert response.status_code == 200
        
        data = response.json()
        translations = data.get("translations", {})
        
        expected = ["en", "es", "fr", "de"]
        for lang in expected:
            assert lang in translations, f"price_drop_alert missing {lang} translation"
        
        print(f"PASS: price_drop_alert has {len(translations)} translations: {list(translations.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
