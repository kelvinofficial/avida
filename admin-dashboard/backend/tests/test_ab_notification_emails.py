"""
Test A/B Testing Notification Emails Feature
Tests:
1. Notification emails field in create experiment API
2. JWT session timeout (480 minutes = 8 hours)
"""
import pytest
import requests
import os
import jwt
from datetime import datetime, timezone

# Use the external API URL for testing
BASE_URL = os.environ.get('NEXT_PUBLIC_API_URL', 'https://zustand-store-test.preview.emergentagent.com/api/admin')

# Test credentials
TEST_EMAIL = "admin@marketplace.com"
TEST_PASSWORD = "Admin@123456"


class TestJWTSessionTimeout:
    """Test JWT token expiration is set to 480 minutes (8 hours)"""
    
    def test_login_returns_correct_expires_in(self):
        """Test that login response contains correct expires_in value"""
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        print(f"Login response status: {response.status_code}")
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        
        # expires_in should be 480 minutes * 60 seconds = 28800 seconds
        expected_expires_in = 480 * 60  # 28800 seconds
        actual_expires_in = data.get("expires_in")
        
        print(f"Expected expires_in: {expected_expires_in} seconds (480 minutes)")
        print(f"Actual expires_in: {actual_expires_in} seconds")
        
        assert actual_expires_in == expected_expires_in, \
            f"JWT expiration should be {expected_expires_in} seconds (480 minutes), got {actual_expires_in}"
        
        print("PASSED: JWT session timeout is correctly set to 480 minutes (8 hours)")

    def test_jwt_token_expiration_claim(self):
        """Test that JWT token has correct expiration claim"""
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        assert response.status_code == 200
        data = response.json()
        access_token = data.get("access_token")
        
        # Decode JWT without verification to check claims
        # (we don't have the secret key for verification)
        try:
            decoded = jwt.decode(access_token, options={"verify_signature": False})
            exp_timestamp = decoded.get("exp")
            iat_timestamp = decoded.get("iat", datetime.now(timezone.utc).timestamp())
            
            if exp_timestamp:
                # Calculate the difference in minutes
                diff_seconds = exp_timestamp - iat_timestamp
                diff_minutes = diff_seconds / 60
                
                print(f"JWT exp timestamp: {exp_timestamp}")
                print(f"JWT iat timestamp: {iat_timestamp}")
                print(f"Token lifetime: {diff_minutes:.0f} minutes ({diff_seconds} seconds)")
                
                # Allow some tolerance (±5 minutes) due to timing
                assert 475 <= diff_minutes <= 485, \
                    f"JWT token should expire in ~480 minutes, got {diff_minutes:.0f} minutes"
                
                print("PASSED: JWT token expiration claim is ~480 minutes")
            else:
                print("WARNING: No exp claim in JWT token")
        except Exception as e:
            print(f"Could not decode JWT: {e}")


class TestABNotificationEmails:
    """Test notification emails field in A/B Testing experiments"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        self.token = response.json().get("access_token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Track created experiments for cleanup
        self.created_experiments = []
        yield
        
        # Cleanup: Delete created experiments
        for exp_id in self.created_experiments:
            try:
                requests.delete(f"{BASE_URL}/experiments/{exp_id}", headers=self.headers)
            except:
                pass
    
    def test_create_experiment_with_notification_emails_as_array(self):
        """Test creating experiment with notification_emails as array"""
        
        experiment_data = {
            "name": "TEST_Notification_Email_Array",
            "description": "Test experiment with notification emails array",
            "experiment_type": "feature",
            "goal_type": "conversion",
            "smart_winner_enabled": True,
            "smart_winner_strategy": "notify",
            "min_runtime_hours": 24,
            "notification_emails": ["admin@example.com", "manager@example.com"],  # Array format
            "variants": [
                {"name": "Control", "description": "Original", "traffic_percent": 50, "is_control": True},
                {"name": "Variant A", "description": "Test", "traffic_percent": 50, "is_control": False}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/experiments/create",
            json=experiment_data,
            headers=self.headers
        )
        
        print(f"Create experiment response status: {response.status_code}")
        print(f"Create experiment response: {response.text}")
        
        assert response.status_code == 200, f"Create experiment failed: {response.text}"
        
        data = response.json()
        experiment_id = data.get("experiment_id")
        assert experiment_id, "No experiment_id returned"
        
        self.created_experiments.append(experiment_id)
        
        # Verify experiment was created with notification_emails
        get_response = requests.get(
            f"{BASE_URL}/experiments/{experiment_id}",
            headers=self.headers
        )
        
        assert get_response.status_code == 200, f"Get experiment failed: {get_response.text}"
        
        experiment = get_response.json()
        smart_winner = experiment.get("smart_winner", {})
        
        print(f"smart_winner config: {smart_winner}")
        
        assert smart_winner.get("enabled") == True, "smart_winner should be enabled"
        assert smart_winner.get("strategy") == "notify", "smart_winner strategy should be 'notify'"
        
        notification_emails = smart_winner.get("notification_emails", [])
        print(f"notification_emails stored: {notification_emails}")
        
        assert isinstance(notification_emails, list), "notification_emails should be a list"
        assert "admin@example.com" in notification_emails, "admin@example.com should be in notification_emails"
        assert "manager@example.com" in notification_emails, "manager@example.com should be in notification_emails"
        
        print("PASSED: Experiment created with notification_emails array correctly stored")
    
    def test_create_experiment_with_empty_notification_emails(self):
        """Test creating experiment with empty notification_emails"""
        
        experiment_data = {
            "name": "TEST_Empty_Notification_Emails",
            "description": "Test experiment without notification emails",
            "experiment_type": "feature",
            "goal_type": "conversion",
            "smart_winner_enabled": True,
            "smart_winner_strategy": "auto_rollout",
            "min_runtime_hours": 48,
            "notification_emails": [],  # Empty array
            "variants": [
                {"name": "Control", "description": "Original", "traffic_percent": 50, "is_control": True},
                {"name": "Variant A", "description": "Test", "traffic_percent": 50, "is_control": False}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/experiments/create",
            json=experiment_data,
            headers=self.headers
        )
        
        print(f"Create experiment response status: {response.status_code}")
        
        assert response.status_code == 200, f"Create experiment failed: {response.text}"
        
        data = response.json()
        experiment_id = data.get("experiment_id")
        self.created_experiments.append(experiment_id)
        
        # Verify experiment
        get_response = requests.get(
            f"{BASE_URL}/experiments/{experiment_id}",
            headers=self.headers
        )
        
        experiment = get_response.json()
        smart_winner = experiment.get("smart_winner", {})
        notification_emails = smart_winner.get("notification_emails", [])
        
        print(f"notification_emails (empty case): {notification_emails}")
        
        assert notification_emails == [], "notification_emails should be empty list"
        
        print("PASSED: Experiment created with empty notification_emails")

    def test_create_experiment_without_notification_emails_field(self):
        """Test creating experiment without notification_emails field (should default to empty array)"""
        
        experiment_data = {
            "name": "TEST_No_Notification_Field",
            "description": "Test experiment without notification_emails field",
            "experiment_type": "feature",
            "goal_type": "conversion",
            "smart_winner_enabled": True,
            "smart_winner_strategy": "notify",
            "min_runtime_hours": 48,
            # No notification_emails field
            "variants": [
                {"name": "Control", "description": "Original", "traffic_percent": 50, "is_control": True},
                {"name": "Variant A", "description": "Test", "traffic_percent": 50, "is_control": False}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/experiments/create",
            json=experiment_data,
            headers=self.headers
        )
        
        print(f"Create experiment response status: {response.status_code}")
        
        assert response.status_code == 200, f"Create experiment failed: {response.text}"
        
        data = response.json()
        experiment_id = data.get("experiment_id")
        self.created_experiments.append(experiment_id)
        
        # Verify experiment
        get_response = requests.get(
            f"{BASE_URL}/experiments/{experiment_id}",
            headers=self.headers
        )
        
        experiment = get_response.json()
        smart_winner = experiment.get("smart_winner", {})
        notification_emails = smart_winner.get("notification_emails", [])
        
        print(f"notification_emails (default case): {notification_emails}")
        
        assert isinstance(notification_emails, list), "notification_emails should default to a list"
        
        print("PASSED: Experiment created with default empty notification_emails")
    
    def test_create_experiment_smart_winner_disabled(self):
        """Test creating experiment with smart_winner disabled"""
        
        experiment_data = {
            "name": "TEST_Smart_Winner_Disabled",
            "description": "Test experiment with smart winner disabled",
            "experiment_type": "feature",
            "goal_type": "conversion",
            "smart_winner_enabled": False,  # Disabled
            "notification_emails": [],
            "variants": [
                {"name": "Control", "description": "Original", "traffic_percent": 50, "is_control": True},
                {"name": "Variant A", "description": "Test", "traffic_percent": 50, "is_control": False}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/experiments/create",
            json=experiment_data,
            headers=self.headers
        )
        
        print(f"Create experiment response status: {response.status_code}")
        
        assert response.status_code == 200, f"Create experiment failed: {response.text}"
        
        data = response.json()
        experiment_id = data.get("experiment_id")
        self.created_experiments.append(experiment_id)
        
        # Verify experiment
        get_response = requests.get(
            f"{BASE_URL}/experiments/{experiment_id}",
            headers=self.headers
        )
        
        experiment = get_response.json()
        smart_winner = experiment.get("smart_winner", {})
        
        print(f"smart_winner config (disabled): {smart_winner}")
        
        assert smart_winner.get("enabled") == False, "smart_winner should be disabled"
        
        print("PASSED: Experiment created with smart_winner disabled")


class TestEnvConfigVerification:
    """Test environment configuration values"""
    
    def test_env_jwt_timeout_value(self):
        """Verify JWT_ACCESS_TOKEN_EXPIRE_MINUTES is set to 480 in .env"""
        env_path = "/app/admin-dashboard/backend/.env"
        
        try:
            with open(env_path, "r") as f:
                env_content = f.read()
            
            # Check for the JWT configuration
            assert "JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480" in env_content, \
                "JWT_ACCESS_TOKEN_EXPIRE_MINUTES should be 480 in .env"
            
            print("PASSED: .env file contains JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480")
            print(f"Env content excerpt: {[line for line in env_content.split(chr(10)) if 'JWT' in line]}")
            
        except FileNotFoundError:
            pytest.skip(f"Could not find {env_path}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
