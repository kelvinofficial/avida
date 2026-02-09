"""
Backend tests for Scheduled Deployments feature in Config Manager
Tests: Create, List, Execute, Cancel, Rollback scheduled deployments
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

# Use the public URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cohort-qa-system.preview.emergentagent.com/api')

class TestScheduledDeployments:
    """Scheduled Deployments endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.environment = "production"
        self.api_client = requests.Session()
        self.api_client.headers.update({"Content-Type": "application/json"})
        self.created_deployment_ids = []
    
    def teardown_method(self):
        """Cleanup test-created deployments"""
        for deployment_id in self.created_deployment_ids:
            try:
                # Try to cancel the deployment first
                self.api_client.post(
                    f"{BASE_URL}/config-manager/scheduled-deployments/{deployment_id}/cancel",
                    json={"cancelled_by": "test_cleanup"}
                )
            except:
                pass
    
    def test_list_scheduled_deployments(self):
        """Test GET /api/config-manager/scheduled-deployments"""
        response = self.api_client.get(
            f"{BASE_URL}/config-manager/scheduled-deployments?environment={self.environment}"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify structure of existing deployments
        if len(data) > 0:
            deployment = data[0]
            assert "id" in deployment
            assert "name" in deployment
            assert "status" in deployment
            assert "scheduled_at" in deployment
            assert "config_type" in deployment
            assert "enable_auto_rollback" in deployment
            print(f"Found {len(data)} existing scheduled deployments")
    
    def test_create_scheduled_deployment_feature_flag(self):
        """Test POST /api/config-manager/scheduled-deployments with feature flags"""
        # Schedule for 1 hour from now
        scheduled_at = (datetime.utcnow() + timedelta(hours=1)).isoformat() + "Z"
        
        deployment_data = {
            "name": "TEST_Feature_Flag_Deployment",
            "description": "Testing scheduled feature flag deployment",
            "environment": self.environment,
            "config_type": "feature_flag",
            "config_changes": {
                "escrow_system": True,
                "online_checkout": True
            },
            "scheduled_at": scheduled_at,
            "duration_hours": 24,
            "enable_auto_rollback": True,
            "rollback_on_error_rate": 5.0,
            "rollback_on_metric_drop": 20.0,
            "metric_to_monitor": "checkout_conversion",
            "created_by": "test_admin"
        }
        
        response = self.api_client.post(
            f"{BASE_URL}/config-manager/scheduled-deployments",
            json=deployment_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["name"] == deployment_data["name"]
        assert data["config_type"] == "feature_flag"
        assert data["status"] == "pending"
        assert data["enable_auto_rollback"] == True
        assert data["rollback_on_error_rate"] == 5.0
        assert data["rollback_on_metric_drop"] == 20.0
        
        self.created_deployment_ids.append(data["id"])
        print(f"Created deployment with ID: {data['id']}")
    
    def test_create_scheduled_deployment_global_setting(self):
        """Test POST /api/config-manager/scheduled-deployments with global settings"""
        scheduled_at = (datetime.utcnow() + timedelta(hours=2)).isoformat() + "Z"
        
        deployment_data = {
            "name": "TEST_Global_Setting_Deployment",
            "description": "Testing scheduled global settings deployment",
            "environment": self.environment,
            "config_type": "global_setting",
            "config_changes": {
                "commission_percentage": 3.0
            },
            "scheduled_at": scheduled_at,
            "duration_hours": 0,  # Permanent
            "enable_auto_rollback": False,
            "created_by": "test_admin"
        }
        
        response = self.api_client.post(
            f"{BASE_URL}/config-manager/scheduled-deployments",
            json=deployment_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["config_type"] == "global_setting"
        assert data["enable_auto_rollback"] == False
        
        self.created_deployment_ids.append(data["id"])
        print(f"Created global setting deployment with ID: {data['id']}")
    
    def test_create_and_cancel_deployment(self):
        """Test creating and cancelling a deployment"""
        scheduled_at = (datetime.utcnow() + timedelta(hours=3)).isoformat() + "Z"
        
        # Create deployment
        deployment_data = {
            "name": "TEST_Cancel_Deployment",
            "description": "Testing deployment cancellation",
            "environment": self.environment,
            "config_type": "feature_flag",
            "config_changes": {"ai_descriptions": True},
            "scheduled_at": scheduled_at,
            "enable_auto_rollback": True,
            "created_by": "test_admin"
        }
        
        create_response = self.api_client.post(
            f"{BASE_URL}/config-manager/scheduled-deployments",
            json=deployment_data
        )
        
        assert create_response.status_code == 200
        deployment_id = create_response.json()["id"]
        self.created_deployment_ids.append(deployment_id)
        
        # Cancel the deployment
        cancel_response = self.api_client.post(
            f"{BASE_URL}/config-manager/scheduled-deployments/{deployment_id}/cancel",
            json={"cancelled_by": "test_admin"}
        )
        
        assert cancel_response.status_code == 200, f"Expected 200, got {cancel_response.status_code}: {cancel_response.text}"
        
        # Verify status is cancelled
        list_response = self.api_client.get(
            f"{BASE_URL}/config-manager/scheduled-deployments?environment={self.environment}"
        )
        deployments = list_response.json()
        cancelled = next((d for d in deployments if d["id"] == deployment_id), None)
        
        if cancelled:
            assert cancelled["status"] == "cancelled", f"Expected status 'cancelled', got '{cancelled['status']}'"
        print(f"Successfully cancelled deployment {deployment_id}")
    
    def test_create_and_execute_deployment(self):
        """Test creating and immediately executing a deployment"""
        scheduled_at = (datetime.utcnow() + timedelta(hours=4)).isoformat() + "Z"
        
        # Create deployment
        deployment_data = {
            "name": "TEST_Execute_Deployment",
            "description": "Testing immediate deployment execution",
            "environment": self.environment,
            "config_type": "feature_flag",
            "config_changes": {"price_negotiation": True},
            "scheduled_at": scheduled_at,
            "enable_auto_rollback": True,
            "created_by": "test_admin"
        }
        
        create_response = self.api_client.post(
            f"{BASE_URL}/config-manager/scheduled-deployments",
            json=deployment_data
        )
        
        assert create_response.status_code == 200
        deployment_id = create_response.json()["id"]
        self.created_deployment_ids.append(deployment_id)
        
        # Execute the deployment immediately
        execute_response = self.api_client.post(
            f"{BASE_URL}/config-manager/scheduled-deployments/{deployment_id}/execute",
            json={"executed_by": "test_admin"}
        )
        
        assert execute_response.status_code == 200, f"Expected 200, got {execute_response.status_code}: {execute_response.text}"
        
        execute_data = execute_response.json()
        assert execute_data.get("status") == "active" or "deployed_at" in execute_data
        print(f"Successfully executed deployment {deployment_id}")
        
        # Now rollback the deployment
        rollback_response = self.api_client.post(
            f"{BASE_URL}/config-manager/scheduled-deployments/{deployment_id}/rollback",
            json={
                "reason": "Test rollback",
                "rolled_back_by": "test_admin"
            }
        )
        
        assert rollback_response.status_code == 200, f"Expected 200, got {rollback_response.status_code}: {rollback_response.text}"
        print(f"Successfully rolled back deployment {deployment_id}")
    
    def test_deployment_validation_missing_name(self):
        """Test that creating deployment without name fails"""
        scheduled_at = (datetime.utcnow() + timedelta(hours=5)).isoformat() + "Z"
        
        deployment_data = {
            # "name": missing
            "environment": self.environment,
            "config_type": "feature_flag",
            "config_changes": {},
            "scheduled_at": scheduled_at,
            "created_by": "test_admin"
        }
        
        response = self.api_client.post(
            f"{BASE_URL}/config-manager/scheduled-deployments",
            json=deployment_data
        )
        
        # Should fail validation
        assert response.status_code in [400, 422], f"Expected 400 or 422, got {response.status_code}"
        print("Correctly rejected deployment without name")
    
    def test_list_deployments_by_status(self):
        """Test filtering deployments by status"""
        # List pending deployments
        response = self.api_client.get(
            f"{BASE_URL}/config-manager/scheduled-deployments?environment={self.environment}&status=pending"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned deployments should be pending
        for deployment in data:
            assert deployment["status"] == "pending", f"Expected pending status, got {deployment['status']}"
        
        print(f"Found {len(data)} pending deployments")


class TestConfigManagerHealth:
    """Config Manager health check tests"""
    
    def test_health_check(self):
        """Test GET /api/config-manager/health/{environment}"""
        response = requests.get(f"{BASE_URL}/config-manager/health/production")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert data["status"] in ["healthy", "degraded", "unhealthy"]
        assert "checks" in data
        assert "warnings" in data
        assert "last_check" in data
        
        print(f"Config health status: {data['status']}")


class TestFeatureFlags:
    """Feature flags tests to verify integration with scheduled deployments"""
    
    def test_list_feature_flags(self):
        """Test GET /api/config-manager/features/{environment}"""
        response = requests.get(f"{BASE_URL}/config-manager/features/production")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0, "Should have at least some feature flags"
        
        # Verify structure
        flag = data[0]
        assert "feature_id" in flag
        assert "enabled" in flag
        assert "environment" in flag
        
        print(f"Found {len(data)} feature flags")
    
    def test_toggle_feature_flag(self):
        """Test PUT /api/config-manager/features/{environment}/{feature_id}"""
        # Get current state
        response = requests.get(f"{BASE_URL}/config-manager/features/production")
        flags = response.json()
        
        if len(flags) > 0:
            # Find a feature to toggle
            test_feature = flags[0]
            feature_id = test_feature["feature_id"]
            current_state = test_feature["enabled"]
            
            # Toggle the feature
            toggle_response = requests.put(
                f"{BASE_URL}/config-manager/features/production/{feature_id}",
                json={
                    "enabled": not current_state,
                    "scope": "global",
                    "rollout_percentage": 100,
                    "updated_by": "test_admin"
                }
            )
            
            assert toggle_response.status_code == 200
            
            # Toggle back
            requests.put(
                f"{BASE_URL}/config-manager/features/production/{feature_id}",
                json={
                    "enabled": current_state,
                    "scope": "global",
                    "rollout_percentage": 100,
                    "updated_by": "test_admin"
                }
            )
            
            print(f"Successfully toggled feature flag: {feature_id}")


class TestGlobalSettings:
    """Global settings tests"""
    
    def test_get_global_settings(self):
        """Test GET /api/config-manager/global/{environment}"""
        response = requests.get(f"{BASE_URL}/config-manager/global/production")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields
        assert "platform_name" in data
        assert "default_currency" in data
        assert "commission_percentage" in data
        assert "escrow_duration_days" in data
        
        print(f"Platform name: {data.get('platform_name')}")
        print(f"Commission: {data.get('commission_percentage')}%")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
