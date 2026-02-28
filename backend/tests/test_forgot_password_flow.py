"""
Test forgot password and reset password flow APIs
Tests: POST /api/auth/forgot-password, POST /api/auth/reset-password, GET /api/auth/verify-reset-token/{token}
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://listing-core.preview.emergentagent.com')

class TestForgotPasswordAPI:
    """Test forgot password endpoint"""
    
    def test_forgot_password_with_valid_email(self):
        """Test forgot password returns success message"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "test@example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "email" in data["message"].lower() or "account" in data["message"].lower()
        print(f"SUCCESS: forgot-password API returns 200 with message: {data['message']}")
    
    def test_forgot_password_with_nonexistent_email(self):
        """Test forgot password with non-existent email - should still return success (security)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": f"nonexistent_{uuid.uuid4().hex[:8]}@example.com"}
        )
        # Should return 200 to prevent email enumeration
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"SUCCESS: forgot-password API returns 200 for non-existent email (prevents enumeration)")
    
    def test_forgot_password_without_email(self):
        """Test forgot password without email field"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={}
        )
        # Should return validation error
        assert response.status_code in [400, 422]
        print(f"SUCCESS: forgot-password API rejects request without email (status: {response.status_code})")
    
    def test_forgot_password_with_invalid_email_format(self):
        """Test forgot password with invalid email format"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "invalid-email-format"}
        )
        # Could return 200 (to prevent enumeration) or 400 (validation)
        # Either is acceptable based on implementation
        assert response.status_code in [200, 400, 422]
        print(f"SUCCESS: forgot-password API handles invalid email format (status: {response.status_code})")


class TestVerifyResetToken:
    """Test verify reset token endpoint"""
    
    def test_verify_invalid_token(self):
        """Test verify reset token with invalid token"""
        invalid_token = "invalid_token_12345"
        response = requests.get(f"{BASE_URL}/api/auth/verify-reset-token/{invalid_token}")
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"SUCCESS: verify-reset-token rejects invalid token with 400")
    
    def test_verify_empty_token(self):
        """Test verify reset token with empty token path"""
        response = requests.get(f"{BASE_URL}/api/auth/verify-reset-token/")
        # Should return 404 or 307 (redirect) or 422 (validation)
        assert response.status_code in [307, 404, 422]
        print(f"SUCCESS: verify-reset-token handles empty token (status: {response.status_code})")


class TestResetPassword:
    """Test reset password endpoint"""
    
    def test_reset_password_with_invalid_token(self):
        """Test reset password with invalid token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={
                "token": "invalid_reset_token_123",
                "new_password": "newpassword123"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"SUCCESS: reset-password rejects invalid token with 400")
    
    def test_reset_password_with_short_password(self):
        """Test reset password with password too short"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={
                "token": "some_token",
                "new_password": "123"  # Less than 6 chars
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        # Should mention password length
        print(f"SUCCESS: reset-password rejects short password with 400")
    
    def test_reset_password_without_token(self):
        """Test reset password without token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"new_password": "validpassword123"}
        )
        assert response.status_code in [400, 422]
        print(f"SUCCESS: reset-password rejects request without token (status: {response.status_code})")


class TestRememberMeLogin:
    """Test login endpoint for remember me functionality"""
    
    def test_login_endpoint_exists(self):
        """Test that login endpoint exists and responds"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "test@example.com",
                "password": "testpassword"
            }
        )
        # Login should return 401 (invalid credentials) or 200 (success)
        # Not 404 (endpoint not found)
        assert response.status_code in [200, 401, 429]
        print(f"SUCCESS: login endpoint exists and responds (status: {response.status_code})")


class TestRegisterAndResetFlow:
    """Test full registration and password reset flow"""
    
    @pytest.fixture(scope="class")
    def test_user_email(self):
        return f"TEST_reset_flow_{uuid.uuid4().hex[:8]}@example.com"
    
    def test_register_user(self, test_user_email):
        """Step 1: Register a test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_user_email,
                "password": "testpassword123",
                "name": "Test Reset User"
            }
        )
        # If user already exists, that's fine
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            data = response.json()
            assert "user" in data
            print(f"SUCCESS: Registered test user {test_user_email}")
        else:
            print(f"INFO: User may already exist or registration limit reached")
    
    def test_request_password_reset(self, test_user_email):
        """Step 2: Request password reset for the test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": test_user_email}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"SUCCESS: Password reset requested for {test_user_email}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
