"""
Deployment Templates API Tests
Tests for the templates feature in Config Manager:
- GET /api/config-manager/templates - List all templates
- GET /api/config-manager/templates/{id} - Get specific template
- POST /api/config-manager/templates - Create custom template
- POST /api/config-manager/templates/{id}/use - Create deployment from template
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vendor-portal-90.preview.emergentagent.com/api').rstrip('/')


class TestDeploymentTemplates:
    """Test deployment templates CRUD operations"""
    
    created_template_ids = []
    created_deployment_ids = []
    
    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        """Setup before and cleanup after tests"""
        yield
        # Cleanup created test templates
        for template_id in self.created_template_ids:
            try:
                requests.delete(f"{BASE_URL}/config-manager/templates/{template_id}")
            except:
                pass
        # Cleanup created test deployments
        for deployment_id in self.created_deployment_ids:
            try:
                requests.post(
                    f"{BASE_URL}/config-manager/scheduled-deployments/{deployment_id}/cancel",
                    json={"cancelled_by": "test_cleanup"}
                )
            except:
                pass
    
    def test_list_all_templates(self):
        """Test GET /api/config-manager/templates - List all deployment templates"""
        response = requests.get(f"{BASE_URL}/config-manager/templates")
        assert response.status_code == 200
        
        templates = response.json()
        assert isinstance(templates, list)
        assert len(templates) >= 6  # 6 system templates expected
        
        # Verify template structure
        template = templates[0]
        assert "id" in template
        assert "name" in template
        assert "description" in template
        assert "icon" in template
        assert "category" in template
        assert "config_type" in template
        assert "config_changes" in template
        assert "is_system" in template
        assert "usage_count" in template
        print(f"SUCCESS: Found {len(templates)} templates")
    
    def test_system_templates_present(self):
        """Test that all 6 default system templates are present"""
        response = requests.get(f"{BASE_URL}/config-manager/templates")
        assert response.status_code == 200
        
        templates = response.json()
        template_names = [t["name"] for t in templates]
        
        expected_templates = [
            "Black Friday Sale",
            "Holiday Season",
            "Maintenance Mode",
            "New Feature Rollout",
            "Flash Sale Event",
            "Seller Onboarding Campaign"
        ]
        
        for expected in expected_templates:
            assert expected in template_names, f"Missing system template: {expected}"
        print(f"SUCCESS: All {len(expected_templates)} system templates present")
    
    def test_get_specific_template(self):
        """Test GET /api/config-manager/templates/{id} - Get specific template"""
        # First get list to get a template ID
        response = requests.get(f"{BASE_URL}/config-manager/templates")
        templates = response.json()
        template_id = templates[0]["id"]
        
        # Get specific template
        response = requests.get(f"{BASE_URL}/config-manager/templates/{template_id}")
        assert response.status_code == 200
        
        template = response.json()
        assert template["id"] == template_id
        assert "name" in template
        assert "config_changes" in template
        print(f"SUCCESS: Retrieved template '{template['name']}'")
    
    def test_get_nonexistent_template(self):
        """Test GET with non-existent template ID returns 404"""
        response = requests.get(f"{BASE_URL}/config-manager/templates/nonexistent-id-123")
        assert response.status_code == 404
        print("SUCCESS: Non-existent template returns 404")
    
    def test_create_custom_template(self):
        """Test POST /api/config-manager/templates - Create new custom template"""
        payload = {
            "name": "TEST_Weekend_Sale",
            "description": "Test weekend promotion template",
            "config_type": "feature_flag",
            "config_changes": {
                "boosts_credits": True,
                "push_notifications": True
            },
            "created_by": "test_admin",
            "icon": "local_offer",
            "category": "promotion",
            "default_duration_hours": 48,
            "enable_auto_rollback": True,
            "rollback_on_error_rate": 5.0,
            "rollback_on_metric_drop": 20.0,
            "metric_to_monitor": "checkout_conversion"
        }
        
        response = requests.post(
            f"{BASE_URL}/config-manager/templates",
            json=payload
        )
        assert response.status_code == 200
        
        template = response.json()
        self.created_template_ids.append(template["id"])
        
        assert template["name"] == payload["name"]
        assert template["description"] == payload["description"]
        assert template["config_type"] == payload["config_type"]
        assert template["is_system"] == False  # Custom templates are not system
        assert template["usage_count"] == 0
        assert template["config_changes"] == payload["config_changes"]
        print(f"SUCCESS: Created custom template '{template['name']}'")
    
    def test_use_template_to_create_deployment(self):
        """Test POST /api/config-manager/templates/{id}/use - Create deployment from template"""
        # Get Black Friday Sale template
        response = requests.get(f"{BASE_URL}/config-manager/templates")
        templates = response.json()
        black_friday = next(t for t in templates if t["name"] == "Black Friday Sale")
        
        # Schedule deployment 2 hours from now
        scheduled_at = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        
        payload = {
            "environment": "staging",
            "scheduled_at": scheduled_at,
            "created_by": "test_admin"
        }
        
        response = requests.post(
            f"{BASE_URL}/config-manager/templates/{black_friday['id']}/use",
            json=payload
        )
        assert response.status_code == 200
        
        deployment = response.json()
        self.created_deployment_ids.append(deployment["id"])
        
        # Verify deployment was created with template settings
        assert deployment["environment"] == "staging"
        assert deployment["status"] == "pending"
        assert deployment["config_type"] == black_friday["config_type"]
        assert deployment["config_changes"] == black_friday["config_changes"]
        assert deployment["enable_auto_rollback"] == black_friday["enable_auto_rollback"]
        assert "Black Friday Sale" in deployment["name"]
        print(f"SUCCESS: Created deployment '{deployment['name']}' from template")
    
    def test_use_template_with_overrides(self):
        """Test using template with custom overrides"""
        # Get Holiday Season template
        response = requests.get(f"{BASE_URL}/config-manager/templates")
        templates = response.json()
        holiday = next(t for t in templates if t["name"] == "Holiday Season")
        
        # Schedule with overrides
        scheduled_at = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()
        
        payload = {
            "environment": "development",
            "scheduled_at": scheduled_at,
            "created_by": "test_admin",
            "name_override": "TEST_Custom Holiday Event",
            "description_override": "Customized holiday deployment",
            "duration_override": 24
        }
        
        response = requests.post(
            f"{BASE_URL}/config-manager/templates/{holiday['id']}/use",
            json=payload
        )
        assert response.status_code == 200
        
        deployment = response.json()
        self.created_deployment_ids.append(deployment["id"])
        
        # Verify overrides were applied
        assert deployment["name"] == "TEST_Custom Holiday Event"
        assert deployment["description"] == "Customized holiday deployment"
        assert deployment["duration_hours"] == 24  # Override duration
        assert deployment["config_changes"] == holiday["config_changes"]  # Original changes
        print(f"SUCCESS: Created deployment with overrides")
    
    def test_use_nonexistent_template(self):
        """Test using non-existent template returns 404"""
        scheduled_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        
        payload = {
            "environment": "staging",
            "scheduled_at": scheduled_at,
            "created_by": "test_admin"
        }
        
        response = requests.post(
            f"{BASE_URL}/config-manager/templates/nonexistent-id/use",
            json=payload
        )
        assert response.status_code == 404
        print("SUCCESS: Using non-existent template returns 404")
    
    def test_template_usage_count_increments(self):
        """Test that template usage_count increments when used"""
        # Get a system template
        response = requests.get(f"{BASE_URL}/config-manager/templates")
        templates = response.json()
        flash_sale = next(t for t in templates if t["name"] == "Flash Sale Event")
        original_usage = flash_sale["usage_count"]
        
        # Use the template
        scheduled_at = (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat()
        payload = {
            "environment": "development",
            "scheduled_at": scheduled_at,
            "created_by": "test_admin"
        }
        
        response = requests.post(
            f"{BASE_URL}/config-manager/templates/{flash_sale['id']}/use",
            json=payload
        )
        assert response.status_code == 200
        deployment = response.json()
        self.created_deployment_ids.append(deployment["id"])
        
        # Check usage count increased
        response = requests.get(f"{BASE_URL}/config-manager/templates/{flash_sale['id']}")
        updated_template = response.json()
        assert updated_template["usage_count"] == original_usage + 1
        assert updated_template["last_used_at"] is not None
        print(f"SUCCESS: Usage count incremented from {original_usage} to {updated_template['usage_count']}")
    
    def test_cannot_delete_system_template(self):
        """Test that system templates cannot be deleted"""
        # Get a system template
        response = requests.get(f"{BASE_URL}/config-manager/templates")
        templates = response.json()
        system_template = next(t for t in templates if t["is_system"] == True)
        
        # Try to delete it
        response = requests.delete(f"{BASE_URL}/config-manager/templates/{system_template['id']}")
        assert response.status_code == 403
        
        data = response.json()
        assert "cannot be deleted" in data.get("detail", "").lower()
        print("SUCCESS: System templates cannot be deleted")
    
    def test_can_delete_custom_template(self):
        """Test that custom templates can be deleted"""
        # First create a custom template
        payload = {
            "name": "TEST_Deletable_Template",
            "description": "Template to be deleted",
            "config_type": "feature_flag",
            "config_changes": {"ai_descriptions": True},
            "created_by": "test_admin"
        }
        
        response = requests.post(f"{BASE_URL}/config-manager/templates", json=payload)
        assert response.status_code == 200
        template = response.json()
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/config-manager/templates/{template['id']}")
        assert response.status_code == 200
        
        # Verify it's gone
        response = requests.get(f"{BASE_URL}/config-manager/templates/{template['id']}")
        assert response.status_code == 404
        print("SUCCESS: Custom templates can be deleted")


class TestTemplateCategories:
    """Test template category filtering"""
    
    def test_filter_by_category_promotion(self):
        """Test filtering templates by category"""
        response = requests.get(f"{BASE_URL}/config-manager/templates?category=promotion")
        assert response.status_code == 200
        
        templates = response.json()
        # All returned templates should be promotion category
        for template in templates:
            if template["category"] == "promotion":
                print(f"Found promotion template: {template['name']}")
        print(f"SUCCESS: Category filter works")
    
    def test_template_categories_correct(self):
        """Test that templates have correct category assignments"""
        response = requests.get(f"{BASE_URL}/config-manager/templates")
        templates = response.json()
        
        expected_categories = {
            "Black Friday Sale": "promotion",
            "Holiday Season": "seasonal",
            "Maintenance Mode": "maintenance",
            "New Feature Rollout": "feature",
            "Flash Sale Event": "promotion",
            "Seller Onboarding Campaign": "promotion"
        }
        
        for name, expected_cat in expected_categories.items():
            template = next((t for t in templates if t["name"] == name), None)
            if template:
                assert template["category"] == expected_cat, f"{name} should be {expected_cat}"
                print(f"SUCCESS: {name} has correct category '{expected_cat}'")


class TestTemplateConfigTypes:
    """Test template config types and changes"""
    
    def test_black_friday_config_changes(self):
        """Test Black Friday template has correct config changes"""
        response = requests.get(f"{BASE_URL}/config-manager/templates")
        templates = response.json()
        
        black_friday = next(t for t in templates if t["name"] == "Black Friday Sale")
        
        expected_changes = {
            "boosts_credits": True,
            "price_negotiation": True,
            "banners_ads": True,
            "push_notifications": True
        }
        
        assert black_friday["config_changes"] == expected_changes
        assert black_friday["config_type"] == "feature_flag"
        assert black_friday["default_duration_hours"] == 72  # 3 days
        print("SUCCESS: Black Friday template config is correct")
    
    def test_maintenance_mode_config_changes(self):
        """Test Maintenance Mode template has correct config changes"""
        response = requests.get(f"{BASE_URL}/config-manager/templates")
        templates = response.json()
        
        maintenance = next(t for t in templates if t["name"] == "Maintenance Mode")
        
        expected_changes = {
            "online_checkout": False,
            "escrow_system": False,
            "verified_sellers": False
        }
        
        assert maintenance["config_changes"] == expected_changes
        assert maintenance["enable_auto_rollback"] == False  # Manual rollback for maintenance
        assert maintenance["default_duration_hours"] == 4  # Short maintenance window
        print("SUCCESS: Maintenance Mode template config is correct")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
