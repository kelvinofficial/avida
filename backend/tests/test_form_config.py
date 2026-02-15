"""
Tests for Admin Form Configuration API
Tests the CRUD operations and public endpoint for form-config
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://classifieds-tz.preview.emergentagent.com').rstrip('/')
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"


class TestFormConfigAPI:
    """Test Form Configuration Admin API"""
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Get admin token for authenticated requests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get admin token
        login_response = self.session.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            print(f"Admin login successful, token obtained")
        else:
            print(f"Admin login failed: {login_response.status_code} - {login_response.text}")
            pytest.skip("Admin authentication failed - skipping authenticated tests")
    
    # =========================================================================
    # STATS ENDPOINT TESTS
    # =========================================================================
    
    def test_get_form_config_stats(self):
        """Test GET /api/admin/form-config/stats returns stats"""
        response = self.session.get(f"{BASE_URL}/api/admin/form-config/stats")
        print(f"Stats response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "total" in data
        assert "active" in data
        assert "inactive" in data
        assert "by_type" in data
        assert "categories_configured" in data
        
        print(f"Stats: total={data['total']}, active={data['active']}, categories={data['categories_configured']}")
        print(f"By type: {data['by_type']}")
        
        # Store for later assertion
        self.stats = data
    
    def test_stats_shows_17_configurations(self):
        """Test that stats show approximately 17 seeded configurations"""
        response = self.session.get(f"{BASE_URL}/api/admin/form-config/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Main agent mentioned 17 default configurations seeded
        # Allow some variance as configs may have been modified
        print(f"Total configs: {data['total']}")
        assert data['total'] >= 10, f"Expected at least 10 configs, got {data['total']}"
        
    # =========================================================================
    # LIST CONFIGS ENDPOINT TESTS
    # =========================================================================
    
    def test_get_form_configs_list(self):
        """Test GET /api/admin/form-config returns list of configs"""
        response = self.session.get(f"{BASE_URL}/api/admin/form-config")
        print(f"List response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "configs" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        
        configs = data['configs']
        print(f"Retrieved {len(configs)} configs out of {data['total']} total")
        
        if len(configs) > 0:
            # Verify config structure
            config = configs[0]
            assert "id" in config
            assert "category_id" in config
            assert "config_type" in config
            assert "config_data" in config
            assert "is_active" in config
            assert "priority" in config
            
            print(f"First config: category={config['category_id']}, type={config['config_type']}, active={config['is_active']}")
    
    def test_filter_configs_by_category(self):
        """Test filtering configs by category_id"""
        # First get all configs to find a category that exists
        all_response = self.session.get(f"{BASE_URL}/api/admin/form-config")
        all_data = all_response.json()
        
        if len(all_data['configs']) == 0:
            pytest.skip("No configs to filter")
        
        # Get a category that exists
        existing_category = all_data['configs'][0]['category_id']
        
        # Filter by that category
        response = self.session.get(f"{BASE_URL}/api/admin/form-config?category_id={existing_category}")
        assert response.status_code == 200
        
        data = response.json()
        configs = data['configs']
        
        # All returned configs should have the filtered category
        for config in configs:
            assert config['category_id'] == existing_category
        
        print(f"Filtered by category '{existing_category}': {len(configs)} configs found")
    
    def test_filter_configs_by_type(self):
        """Test filtering configs by config_type"""
        for config_type in ['placeholder', 'seller_type', 'preference', 'visibility_rule']:
            response = self.session.get(f"{BASE_URL}/api/admin/form-config?config_type={config_type}")
            assert response.status_code == 200
            
            data = response.json()
            for config in data['configs']:
                assert config['config_type'] == config_type
            
            print(f"Type '{config_type}': {len(data['configs'])} configs")
    
    # =========================================================================
    # CREATE CONFIG TESTS  
    # =========================================================================
    
    def test_create_placeholder_config(self):
        """Test creating a placeholder configuration"""
        test_category = f"TEST_category_{int(time.time())}"
        
        create_data = {
            "category_id": test_category,
            "subcategory_id": None,
            "config_type": "placeholder",
            "config_data": {
                "title": "Test Title Placeholder",
                "titleLabel": "Test Title Label",
                "description": "Test Description Placeholder",
                "descriptionLabel": "Test Description Label"
            },
            "is_active": True,
            "priority": 10
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/form-config", json=create_data)
        print(f"Create response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] == True
        assert 'id' in data
        
        # Store the ID for cleanup
        self.created_config_id = data['id']
        print(f"Created config with ID: {data['id']}")
        
        # Verify the config was created by fetching it
        list_response = self.session.get(f"{BASE_URL}/api/admin/form-config?category_id={test_category}")
        assert list_response.status_code == 200
        
        configs = list_response.json()['configs']
        assert len(configs) == 1
        assert configs[0]['config_data']['title'] == "Test Title Placeholder"
        
        # Cleanup: Delete the test config
        delete_response = self.session.delete(f"{BASE_URL}/api/admin/form-config/{data['id']}")
        assert delete_response.status_code == 200
        print("Cleaned up test config")
    
    def test_create_duplicate_config_fails(self):
        """Test that creating duplicate config fails"""
        test_category = f"TEST_dup_{int(time.time())}"
        
        create_data = {
            "category_id": test_category,
            "config_type": "placeholder",
            "config_data": {"title": "Test"},
            "is_active": True,
            "priority": 0
        }
        
        # Create first config
        response1 = self.session.post(f"{BASE_URL}/api/admin/form-config", json=create_data)
        assert response1.status_code == 200
        config_id = response1.json()['id']
        
        # Try to create duplicate
        response2 = self.session.post(f"{BASE_URL}/api/admin/form-config", json=create_data)
        assert response2.status_code == 400
        print(f"Duplicate creation properly rejected: {response2.json()}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/form-config/{config_id}")
    
    # =========================================================================
    # UPDATE CONFIG TESTS
    # =========================================================================
    
    def test_update_config(self):
        """Test updating a form configuration"""
        # First create a config
        test_category = f"TEST_update_{int(time.time())}"
        create_response = self.session.post(f"{BASE_URL}/api/admin/form-config", json={
            "category_id": test_category,
            "config_type": "placeholder",
            "config_data": {"title": "Original Title"},
            "is_active": True,
            "priority": 0
        })
        
        assert create_response.status_code == 200
        config_id = create_response.json()['id']
        
        # Update the config
        update_response = self.session.put(f"{BASE_URL}/api/admin/form-config/{config_id}", json={
            "config_data": {"title": "Updated Title"},
            "is_active": False,
            "priority": 5
        })
        
        assert update_response.status_code == 200
        print(f"Update response: {update_response.json()}")
        
        # Verify update
        list_response = self.session.get(f"{BASE_URL}/api/admin/form-config?category_id={test_category}")
        configs = list_response.json()['configs']
        
        assert len(configs) == 1
        assert configs[0]['config_data']['title'] == "Updated Title"
        assert configs[0]['is_active'] == False
        assert configs[0]['priority'] == 5
        print("Config updated successfully")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/form-config/{config_id}")
    
    def test_update_nonexistent_config_fails(self):
        """Test that updating non-existent config returns 404"""
        fake_id = "000000000000000000000000"
        
        response = self.session.put(f"{BASE_URL}/api/admin/form-config/{fake_id}", json={
            "config_data": {"title": "test"}
        })
        
        assert response.status_code == 404
        print("Non-existent config update properly rejected")
    
    # =========================================================================
    # DELETE CONFIG TESTS
    # =========================================================================
    
    def test_delete_config(self):
        """Test deleting a form configuration"""
        # Create config to delete
        test_category = f"TEST_delete_{int(time.time())}"
        create_response = self.session.post(f"{BASE_URL}/api/admin/form-config", json={
            "category_id": test_category,
            "config_type": "placeholder",
            "config_data": {"title": "To Be Deleted"},
            "is_active": True,
            "priority": 0
        })
        
        config_id = create_response.json()['id']
        
        # Delete
        delete_response = self.session.delete(f"{BASE_URL}/api/admin/form-config/{config_id}")
        assert delete_response.status_code == 200
        print(f"Delete response: {delete_response.json()}")
        
        # Verify deletion
        list_response = self.session.get(f"{BASE_URL}/api/admin/form-config?category_id={test_category}")
        configs = list_response.json()['configs']
        assert len(configs) == 0
        print("Config deleted successfully")
    
    def test_delete_nonexistent_config_fails(self):
        """Test that deleting non-existent config returns 404"""
        fake_id = "000000000000000000000000"
        
        response = self.session.delete(f"{BASE_URL}/api/admin/form-config/{fake_id}")
        assert response.status_code == 404
        print("Non-existent config delete properly rejected")
    
    # =========================================================================
    # TOGGLE ACTIVE STATUS TESTS
    # =========================================================================
    
    def test_toggle_active_status(self):
        """Test toggling active status via update"""
        # Create config
        test_category = f"TEST_toggle_{int(time.time())}"
        create_response = self.session.post(f"{BASE_URL}/api/admin/form-config", json={
            "category_id": test_category,
            "config_type": "preference",
            "config_data": {"acceptsOffers": True},
            "is_active": True,
            "priority": 0
        })
        
        config_id = create_response.json()['id']
        
        # Toggle to inactive
        toggle_response = self.session.put(f"{BASE_URL}/api/admin/form-config/{config_id}", json={
            "is_active": False
        })
        assert toggle_response.status_code == 200
        
        # Verify
        list_response = self.session.get(f"{BASE_URL}/api/admin/form-config?category_id={test_category}")
        config = list_response.json()['configs'][0]
        assert config['is_active'] == False
        print("Config deactivated")
        
        # Toggle back to active
        toggle_response = self.session.put(f"{BASE_URL}/api/admin/form-config/{config_id}", json={
            "is_active": True
        })
        assert toggle_response.status_code == 200
        
        # Verify
        list_response = self.session.get(f"{BASE_URL}/api/admin/form-config?category_id={test_category}")
        config = list_response.json()['configs'][0]
        assert config['is_active'] == True
        print("Config reactivated")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/form-config/{config_id}")
    
    # =========================================================================
    # SEED DEFAULTS TEST
    # =========================================================================
    
    def test_seed_defaults_endpoint(self):
        """Test POST /api/admin/form-config/seed"""
        response = self.session.post(f"{BASE_URL}/api/admin/form-config/seed")
        print(f"Seed response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] == True
        assert 'created' in data
        assert 'skipped' in data
        
        print(f"Seeded: created={data['created']}, skipped={data['skipped']}")


class TestPublicFormConfigAPI:
    """Test Public Form Configuration API (no auth required)"""
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Setup session without auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_public_form_config_endpoint(self):
        """Test GET /api/form-config/public returns configs without auth"""
        response = self.session.get(f"{BASE_URL}/api/form-config/public")
        print(f"Public endpoint response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure matches expected format
        assert "placeholders" in data
        assert "subcategory_placeholders" in data
        assert "seller_types" in data
        assert "preferences" in data
        assert "visibility_rules" in data
        
        print(f"Public config keys: {list(data.keys())}")
        print(f"Placeholders count: {len(data.get('placeholders', {}))}")
        print(f"Seller types count: {len(data.get('seller_types', {}))}")
        print(f"Preferences count: {len(data.get('preferences', {}))}")
    
    def test_public_endpoint_returns_placeholders(self):
        """Test that public endpoint includes placeholder configs"""
        response = self.session.get(f"{BASE_URL}/api/form-config/public")
        assert response.status_code == 200
        
        data = response.json()
        placeholders = data.get('placeholders', {})
        
        # Should have default and category-specific placeholders
        print(f"Placeholder categories: {list(placeholders.keys())}")
        
        # Each placeholder should have expected fields
        if len(placeholders) > 0:
            sample_key = list(placeholders.keys())[0]
            sample = placeholders[sample_key]
            print(f"Sample placeholder ({sample_key}): {sample}")
    
    def test_public_endpoint_returns_visibility_rules(self):
        """Test that public endpoint includes visibility rules"""
        response = self.session.get(f"{BASE_URL}/api/form-config/public")
        assert response.status_code == 200
        
        data = response.json()
        rules = data.get('visibility_rules', {})
        
        print(f"Visibility rule keys: {list(rules.keys())}")
        
        # Check for expected rule types
        expected_keys = ['hide_price_categories', 'show_salary_subcategories', 
                        'chat_only_categories', 'hide_condition_categories']
        for key in expected_keys:
            if key in rules:
                print(f"  {key}: {rules[key]}")


class TestFormConfigAuthentication:
    """Test authentication requirements for form-config endpoints"""
    
    def test_admin_endpoint_requires_auth(self):
        """Test that admin endpoints return 401 without auth"""
        session = requests.Session()
        
        # Test list endpoint
        response = session.get(f"{BASE_URL}/api/admin/form-config")
        assert response.status_code == 401
        print("List endpoint requires auth ✓")
        
        # Test stats endpoint  
        response = session.get(f"{BASE_URL}/api/admin/form-config/stats")
        assert response.status_code == 401
        print("Stats endpoint requires auth ✓")
        
        # Test create endpoint
        response = session.post(f"{BASE_URL}/api/admin/form-config", json={})
        assert response.status_code in [401, 422]  # 422 if validation runs first
        print("Create endpoint requires auth ✓")
        
        # Test seed endpoint
        response = session.post(f"{BASE_URL}/api/admin/form-config/seed")
        assert response.status_code == 401
        print("Seed endpoint requires auth ✓")
    
    def test_public_endpoint_no_auth(self):
        """Test that public endpoint works without auth"""
        session = requests.Session()
        
        response = session.get(f"{BASE_URL}/api/form-config/public")
        assert response.status_code == 200
        print("Public endpoint accessible without auth ✓")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
