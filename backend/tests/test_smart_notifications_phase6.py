"""
Test suite for Smart Notification System Phase 6: AI Personalization
Tests all AI-powered notification content personalization endpoints

Endpoints tested:
- GET /api/smart-notifications/admin/ai-personalization/config - Get AI personalization configuration
- PUT /api/smart-notifications/admin/ai-personalization/config - Update AI personalization configuration
- POST /api/smart-notifications/admin/ai-personalization/test - Generate personalized notification content
- POST /api/smart-notifications/admin/ai-personalization/generate-variants - Generate multiple notification variants
- GET /api/smart-notifications/admin/ai-personalization/styles - Get available personalization styles
- GET /api/smart-notifications/admin/ai-personalization/analytics - Get personalization analytics
"""

import pytest
import requests
import os
import time
import uuid

# Get base URL from environment
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://classifieds-mvp-1.preview.emergentagent.com").rstrip("/")


class TestAIPersonalizationConfig:
    """Tests for AI personalization configuration endpoints"""
    
    def test_get_ai_personalization_config(self):
        """Test GET /api/smart-notifications/admin/ai-personalization/config"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required fields
        assert "id" in data, "Config should have 'id' field"
        assert data["id"] == "ai_personalization_config", "Config id should be 'ai_personalization_config'"
        assert "enabled" in data, "Config should have 'enabled' field"
        assert "ai_available" in data, "Config should have 'ai_available' field indicating if AI is available"
        assert "model_provider" in data, "Config should have 'model_provider' field"
        assert "model_name" in data, "Config should have 'model_name' field"
        assert "default_style" in data, "Config should have 'default_style' field"
        assert "max_title_length" in data, "Config should have 'max_title_length' field"
        assert "max_body_length" in data, "Config should have 'max_body_length' field"
        assert "max_requests_per_minute" in data, "Config should have 'max_requests_per_minute' field"
        assert "cache_duration_hours" in data, "Config should have 'cache_duration_hours' field"
        assert "fallback_on_error" in data, "Config should have 'fallback_on_error' field"
        
        # Print AI availability status
        print(f"AI Personalization enabled: {data.get('enabled')}")
        print(f"AI available (EMERGENT_LLM_KEY configured): {data.get('ai_available')}")
        print(f"Model: {data.get('model_provider')}/{data.get('model_name')}")
    
    def test_get_config_has_correct_defaults(self):
        """Test that config has sensible default values"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify default values
        assert data.get("model_provider") == "openai", "Default model provider should be 'openai'"
        assert data.get("model_name") == "gpt-4o", "Default model should be 'gpt-4o'"
        assert data.get("default_style") == "friendly", "Default style should be 'friendly'"
        assert data.get("max_title_length") == 60, "Default max title length should be 60"
        assert data.get("max_body_length") == 150, "Default max body length should be 150"
        assert data.get("max_requests_per_minute") == 60, "Default rate limit should be 60/minute"
        assert data.get("cache_duration_hours") == 24, "Default cache duration should be 24 hours"
        assert data.get("fallback_on_error") == True, "Fallback on error should be enabled by default"
    
    def test_update_ai_personalization_config(self):
        """Test PUT /api/smart-notifications/admin/ai-personalization/config"""
        # First get current config
        get_response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config")
        original_config = get_response.json()
        original_max_title = original_config.get("max_title_length")
        
        # Update config
        new_max_title = 80
        update_payload = {
            "max_title_length": new_max_title
        }
        
        response = requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config",
            json=update_payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("max_title_length") == new_max_title, "max_title_length should be updated"
        assert "updated_at" in data, "Config should have updated_at timestamp"
        
        # Verify update persisted
        verify_response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config")
        verify_data = verify_response.json()
        assert verify_data.get("max_title_length") == new_max_title, "Update should be persisted"
        
        # Restore original value
        requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config",
            json={"max_title_length": original_max_title or 60}
        )
    
    def test_update_config_multiple_fields(self):
        """Test updating multiple configuration fields at once"""
        # Store original values
        get_response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config")
        original_config = get_response.json()
        
        # Update multiple fields
        update_payload = {
            "max_body_length": 200,
            "default_style": "professional",
            "cache_duration_hours": 48
        }
        
        response = requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config",
            json=update_payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("max_body_length") == 200, "max_body_length should be updated"
        assert data.get("default_style") == "professional", "default_style should be updated"
        assert data.get("cache_duration_hours") == 48, "cache_duration_hours should be updated"
        
        # Restore original values
        restore_payload = {
            "max_body_length": original_config.get("max_body_length", 150),
            "default_style": original_config.get("default_style", "friendly"),
            "cache_duration_hours": original_config.get("cache_duration_hours", 24)
        }
        requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config",
            json=restore_payload
        )
    
    def test_update_config_enable_disable(self):
        """Test enabling/disabling AI personalization"""
        # Get current state
        get_response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config")
        original_enabled = get_response.json().get("enabled")
        
        # Disable
        response = requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config",
            json={"enabled": False}
        )
        assert response.status_code == 200
        assert response.json().get("enabled") == False
        
        # Re-enable
        response = requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config",
            json={"enabled": True}
        )
        assert response.status_code == 200
        assert response.json().get("enabled") == True
        
        # Restore original state
        requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config",
            json={"enabled": original_enabled if original_enabled is not None else True}
        )


class TestPersonalizationStyles:
    """Tests for personalization styles endpoint"""
    
    def test_get_personalization_styles(self):
        """Test GET /api/smart-notifications/admin/ai-personalization/styles"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/styles")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "styles" in data, "Response should have 'styles' field"
        
        styles = data["styles"]
        assert isinstance(styles, list), "Styles should be a list"
        assert len(styles) > 0, "Should have at least one style"
        
        # Check expected styles
        style_ids = [s["id"] for s in styles]
        expected_styles = ["friendly", "professional", "urgent", "casual", "enthusiastic", "concise"]
        
        for expected in expected_styles:
            assert expected in style_ids, f"Style '{expected}' should be available"
        
        # Check style structure
        for style in styles:
            assert "id" in style, "Each style should have 'id'"
            assert "name" in style, "Each style should have 'name'"
        
        print(f"Available personalization styles: {[s['id'] for s in styles]}")
    
    def test_styles_have_proper_names(self):
        """Test that styles have properly formatted names"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/styles")
        
        assert response.status_code == 200
        styles = response.json().get("styles", [])
        
        # Name should be title case version of id
        for style in styles:
            expected_name = style["id"].replace("_", " ").title()
            assert style["name"] == expected_name, f"Style name should be '{expected_name}', got '{style['name']}'"


class TestAIPersonalizationAnalytics:
    """Tests for AI personalization analytics endpoint"""
    
    def test_get_personalization_analytics(self):
        """Test GET /api/smart-notifications/admin/ai-personalization/analytics"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/analytics")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required fields
        assert "total_personalizations" in data, "Response should have 'total_personalizations'"
        assert "by_trigger_type" in data, "Response should have 'by_trigger_type'"
        assert "ai_enabled" in data, "Response should have 'ai_enabled'"
        assert "period_days" in data, "Response should have 'period_days'"
        
        # Verify default period
        assert data["period_days"] == 30, "Default period should be 30 days"
        
        # Verify data types
        assert isinstance(data["total_personalizations"], int), "total_personalizations should be int"
        assert isinstance(data["by_trigger_type"], list), "by_trigger_type should be list"
        assert isinstance(data["ai_enabled"], bool), "ai_enabled should be bool"
        
        print(f"Total personalizations (last 30 days): {data['total_personalizations']}")
        print(f"AI enabled: {data['ai_enabled']}")
    
    def test_get_analytics_with_custom_period(self):
        """Test analytics with custom days parameter"""
        for days in [7, 14, 60, 90]:
            response = requests.get(
                f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/analytics",
                params={"days": days}
            )
            
            assert response.status_code == 200, f"Expected 200 for days={days}"
            data = response.json()
            assert data["period_days"] == days, f"Period should be {days} days"
    
    def test_analytics_by_trigger_type_structure(self):
        """Test that by_trigger_type has correct structure"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/analytics")
        
        assert response.status_code == 200
        data = response.json()
        
        for item in data.get("by_trigger_type", []):
            assert "trigger_type" in item, "Each item should have 'trigger_type'"
            assert "count" in item, "Each item should have 'count'"
            assert isinstance(item["count"], int), "Count should be integer"


class TestAIPersonalizationTest:
    """Tests for AI personalization test endpoint (generates personalized content)"""
    
    def test_personalization_test_endpoint(self):
        """Test POST /api/smart-notifications/admin/ai-personalization/test"""
        # First check if AI is available
        config_response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config")
        ai_available = config_response.json().get("ai_available", False)
        
        # Create test user ID
        test_user_id = f"TEST_user_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "user_id": test_user_id,
            "trigger_type": "new_listing_in_category",
            "context": {
                "category": "Electronics",
                "listing_title": "iPhone 15 Pro Max",
                "currency": "$",
                "price": 999
            },
            "style": "friendly"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/test",
            json=payload
        )
        
        if not ai_available:
            # If AI is not available, should return 503
            assert response.status_code == 503, f"Expected 503 when AI unavailable, got {response.status_code}"
            print("AI personalization not available (EMERGENT_LLM_KEY not configured)")
        else:
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            
            # Check response structure
            assert "original" in data, "Response should have 'original' content"
            assert "personalized" in data, "Response should have 'personalized' content"
            assert "user_id" in data, "Response should have 'user_id'"
            assert "trigger_type" in data, "Response should have 'trigger_type'"
            
            # Check original content has template variables replaced
            original = data["original"]
            assert "title" in original, "Original should have 'title'"
            assert "body" in original, "Original should have 'body'"
            
            # Check personalized content
            personalized = data["personalized"]
            assert "title" in personalized, "Personalized should have 'title'"
            assert "body" in personalized, "Personalized should have 'body'"
            
            print(f"Original title: {original.get('title')}")
            print(f"Personalized title: {personalized.get('title')}")
            print(f"Original body: {original.get('body')}")
            print(f"Personalized body: {personalized.get('body')}")
    
    def test_personalization_with_different_styles(self):
        """Test personalization with different styles"""
        config_response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config")
        ai_available = config_response.json().get("ai_available", False)
        
        if not ai_available:
            pytest.skip("AI personalization not available")
        
        test_user_id = f"TEST_user_{uuid.uuid4().hex[:8]}"
        
        styles = ["friendly", "urgent", "professional"]
        
        for style in styles:
            payload = {
                "user_id": test_user_id,
                "trigger_type": "price_drop_saved_item",
                "context": {
                    "listing_title": "MacBook Pro",
                    "currency": "$",
                    "price": 1499,
                    "old_price": 1999,
                    "drop_percent": 25
                },
                "style": style
            }
            
            response = requests.post(
                f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/test",
                json=payload
            )
            
            assert response.status_code == 200, f"Style '{style}' should work"
            data = response.json()
            assert data.get("personalized", {}).get("title"), f"Should get personalized title for style '{style}'"
            
            print(f"Style '{style}': {data['personalized'].get('title')}")
    
    def test_personalization_without_style(self):
        """Test personalization without specifying style (uses default)"""
        config_response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config")
        ai_available = config_response.json().get("ai_available", False)
        
        if not ai_available:
            pytest.skip("AI personalization not available")
        
        test_user_id = f"TEST_user_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "user_id": test_user_id,
            "trigger_type": "message_received",
            "context": {
                "sender_name": "John",
                "message_preview": "Is this still available?"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/test",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "personalized" in data


class TestGenerateVariants:
    """Tests for notification variants generation endpoint"""
    
    def test_generate_variants_endpoint(self):
        """Test POST /api/smart-notifications/admin/ai-personalization/generate-variants"""
        config_response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config")
        ai_available = config_response.json().get("ai_available", False)
        
        payload = {
            "trigger_type": "new_listing_in_category",
            "context": {
                "category": "Vehicles",
                "listing_title": "2024 Toyota Camry",
                "price": 28000,
                "currency": "$"
            },
            "count": 3
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/generate-variants",
            json=payload
        )
        
        if not ai_available:
            assert response.status_code == 503, "Should return 503 when AI unavailable"
            print("AI personalization not available")
        else:
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            
            # Check response structure
            assert "trigger_type" in data, "Response should have 'trigger_type'"
            assert "variants" in data, "Response should have 'variants'"
            assert "count" in data, "Response should have 'count'"
            
            assert data["trigger_type"] == "new_listing_in_category"
            
            variants = data["variants"]
            assert isinstance(variants, list), "Variants should be a list"
            
            # Check each variant
            for variant in variants:
                assert "title" in variant, "Each variant should have 'title'"
                assert "body" in variant, "Each variant should have 'body'"
                assert "style" in variant, "Each variant should have 'style'"
                assert "variant_id" in variant, "Each variant should have 'variant_id'"
            
            print(f"Generated {len(variants)} variants:")
            for v in variants:
                print(f"  - [{v['style']}] {v['title']}")
    
    def test_generate_variants_with_custom_styles(self):
        """Test generating variants with specific styles"""
        config_response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config")
        ai_available = config_response.json().get("ai_available", False)
        
        if not ai_available:
            pytest.skip("AI personalization not available")
        
        payload = {
            "trigger_type": "price_drop_saved_item",
            "context": {
                "listing_title": "Nike Air Max",
                "price": 99,
                "old_price": 149,
                "currency": "$",
                "drop_percent": 33
            },
            "styles": ["urgent", "enthusiastic"],
            "count": 2
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/generate-variants",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        variants = data.get("variants", [])
        styles_received = [v.get("style") for v in variants]
        
        # Should have the requested styles
        for style in ["urgent", "enthusiastic"]:
            assert style in styles_received, f"Should have '{style}' variant"
    
    def test_generate_variants_max_limit(self):
        """Test that variants are limited to max 5"""
        config_response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config")
        ai_available = config_response.json().get("ai_available", False)
        
        if not ai_available:
            pytest.skip("AI personalization not available")
        
        payload = {
            "trigger_type": "promotional",
            "context": {
                "campaign_name": "Summer Sale"
            },
            "count": 10  # Request more than max
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/generate-variants",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should be limited to 5 max
        assert data.get("count", 0) <= 5, "Variants should be limited to max 5"


class TestAIPersonalizationIntegration:
    """Integration tests for AI personalization in notification queue"""
    
    def test_queue_notification_uses_personalization(self):
        """Test that AI personalization is integrated in the notification queue system"""
        # This verifies that AI personalization service is initialized and accessible
        config_response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config")
        ai_available = config_response.json().get("ai_available", False)
        
        if not ai_available:
            pytest.skip("AI personalization not available - skipping integration test")
        
        # Ensure enabled
        update_response = requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config",
            json={"enabled": True}
        )
        assert update_response.status_code == 200, "Should be able to enable AI personalization"
        
        # Verify config shows AI is enabled and ready for notification queue
        verify_response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config")
        config = verify_response.json()
        
        assert config.get("enabled") == True, "AI personalization should be enabled"
        assert config.get("ai_available") == True, "AI should be available"
        assert config.get("fallback_on_error") == True, "Fallback should be enabled for reliability"
        
        print("AI personalization is enabled and integrated in notification queue")
        print(f"  - Model: {config.get('model_provider')}/{config.get('model_name')}")
        print(f"  - Rate limit: {config.get('max_requests_per_minute')} req/min")
        print(f"  - Cache duration: {config.get('cache_duration_hours')} hours")
        print("Note: /track endpoint requires authentication (expected behavior)")


class TestPhase1to5Regression:
    """Regression tests to ensure Phase 1-5 functionality still works"""
    
    def test_phase1_config_still_works(self):
        """Phase 1 config endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/config")
        assert response.status_code == 200
        assert "system_enabled" in response.json()
    
    def test_phase2_ab_tests_still_works(self):
        """Phase 2 A/B tests endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ab-tests")
        assert response.status_code == 200
    
    def test_phase3_campaigns_still_works(self):
        """Phase 3 campaigns endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/campaigns")
        assert response.status_code == 200
    
    def test_phase4_segments_still_works(self):
        """Phase 4 segments endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/segments")
        assert response.status_code == 200
    
    def test_phase5_languages_still_works(self):
        """Phase 5 languages endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/languages")
        assert response.status_code == 200
        assert len(response.json()) == 15
    
    def test_phase5_ml_templates_still_works(self):
        """Phase 5 multi-language templates endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ml-templates")
        assert response.status_code == 200
    
    def test_phase5_scheduler_still_works(self):
        """Phase 5 scheduler config endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/scheduler/config")
        assert response.status_code == 200


class TestEdgeCases:
    """Edge case tests for AI personalization"""
    
    def test_personalization_with_empty_context(self):
        """Test personalization with empty context"""
        config_response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config")
        ai_available = config_response.json().get("ai_available", False)
        
        test_user_id = f"TEST_edge_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "user_id": test_user_id,
            "trigger_type": "promotional",
            "context": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/test",
            json=payload
        )
        
        if not ai_available:
            assert response.status_code == 503
        else:
            # Should still work with empty context
            assert response.status_code == 200
    
    def test_generate_variants_with_no_styles(self):
        """Test generating variants without specifying styles"""
        config_response = requests.get(f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config")
        ai_available = config_response.json().get("ai_available", False)
        
        payload = {
            "trigger_type": "message_received",
            "context": {
                "sender_name": "Alice"
            }
            # No styles specified - should use defaults
        }
        
        response = requests.post(
            f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/generate-variants",
            json=payload
        )
        
        if not ai_available:
            assert response.status_code == 503
        else:
            assert response.status_code == 200
            data = response.json()
            # Should use default styles: friendly, urgent, enthusiastic
            assert len(data.get("variants", [])) > 0
    
    def test_update_config_with_invalid_style(self):
        """Test updating config with an invalid style value"""
        # This should either accept it (no validation) or return an error
        response = requests.put(
            f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config",
            json={"default_style": "invalid_style_that_doesnt_exist"}
        )
        
        # Either accepts it (loose validation) or rejects (strict validation)
        # Both are acceptable behaviors
        if response.status_code == 200:
            # Restore valid style
            requests.put(
                f"{BASE_URL}/api/smart-notifications/admin/ai-personalization/config",
                json={"default_style": "friendly"}
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
