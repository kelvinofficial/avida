"""
Email Verification Feature Tests
Tests for POST /api/auth/register, GET /api/auth/verify-email/{token}, 
POST /api/auth/resend-verification, and GET /api/auth/check-verification/{email}
"""

import pytest
import requests
import uuid
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://listing-core.preview.emergentagent.com')


class TestEmailVerificationRegistration:
    """Tests for registration with email verification"""
    
    def test_register_returns_email_verification_required(self):
        """Test that registration returns email_verification_required flag"""
        test_email = f"test_register_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "testpass123",
                "name": "Test User"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify email_verification_required flag
        assert "email_verification_required" in data, "Response missing email_verification_required field"
        assert data["email_verification_required"] == True, "email_verification_required should be True"
        
        # Verify message mentions email verification
        assert "message" in data, "Response missing message field"
        assert "verify" in data["message"].lower() or "email" in data["message"].lower(), "Message should mention verification"
        
        # Verify user data is returned
        assert "user" in data, "Response missing user field"
        assert data["user"]["email"] == test_email.lower(), "Email should be lowercase"
        
        # Verify session token is still returned (user can log in but may have limited access)
        assert "session_token" in data, "Response missing session_token"
        
    def test_register_duplicate_email(self):
        """Test registration with existing email returns proper error"""
        # First register
        test_email = f"test_dup_{uuid.uuid4().hex[:8]}@test.com"
        
        response1 = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "testpass123",
                "name": "First User"
            }
        )
        assert response1.status_code == 200
        
        # Try to register again with same email
        response2 = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "testpass456",
                "name": "Second User"
            }
        )
        
        assert response2.status_code == 400, f"Expected 400, got {response2.status_code}"
        data = response2.json()
        assert "detail" in data
        assert "already" in data["detail"].lower() or "registered" in data["detail"].lower()


class TestVerifyEmail:
    """Tests for GET /api/auth/verify-email/{token}"""
    
    def test_verify_email_invalid_token(self):
        """Test verification with invalid token returns error"""
        response = requests.get(f"{BASE_URL}/api/auth/verify-email/invalid_token_12345")
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()
    
    def test_verify_email_empty_token(self):
        """Test verification with empty token returns error"""
        response = requests.get(f"{BASE_URL}/api/auth/verify-email/")
        
        # Should return 404 (route not found), 422 (validation error), 405 (method not allowed), or 307 (redirect)
        assert response.status_code in [404, 422, 307, 405], f"Expected 404/422/307/405, got {response.status_code}"
    
    def test_verify_email_expired_token_message(self):
        """Test that expired token returns appropriate message"""
        # Using a random but valid-looking token
        fake_token = "abcdefghijklmnopqrstuvwxyz1234567890_-="
        response = requests.get(f"{BASE_URL}/api/auth/verify-email/{fake_token}")
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        # Should mention invalid or expired
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()


class TestResendVerification:
    """Tests for POST /api/auth/resend-verification"""
    
    def test_resend_verification_success(self):
        """Test resend verification for existing unverified user"""
        # First create a user
        test_email = f"test_resend_{uuid.uuid4().hex[:8]}@test.com"
        
        requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "testpass123",
                "name": "Test User"
            }
        )
        
        # Request verification email resend
        response = requests.post(
            f"{BASE_URL}/api/auth/resend-verification",
            json={"email": test_email}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        # Message should be generic (to prevent enumeration)
        assert "email" in data["message"].lower() or "verification" in data["message"].lower()
    
    def test_resend_verification_nonexistent_email(self):
        """Test resend verification for non-existent email (should return success to prevent enumeration)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/resend-verification",
            json={"email": f"nonexistent_{uuid.uuid4().hex}@test.com"}
        )
        
        # Should return success to prevent email enumeration
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data
    
    def test_resend_verification_google_user(self):
        """Test that resend verification handles Google auth users gracefully"""
        # Note: This would require a Google-authenticated user in the DB
        # For now, just test that the endpoint handles the email gracefully
        response = requests.post(
            f"{BASE_URL}/api/auth/resend-verification",
            json={"email": "some_google_user@gmail.com"}
        )
        
        # Should return success (or message about Google accounts)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data


class TestCheckVerification:
    """Tests for GET /api/auth/check-verification/{email}"""
    
    def test_check_verification_existing_user(self):
        """Test check verification status for existing user"""
        # First create a user
        test_email = f"test_check_{uuid.uuid4().hex[:8]}@test.com"
        
        requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "testpass123",
                "name": "Test User"
            }
        )
        
        # Check verification status
        response = requests.get(f"{BASE_URL}/api/auth/check-verification/{test_email}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "email" in data, "Response missing email field"
        assert data["email"] == test_email.lower(), "Email should match (lowercase)"
        
        assert "email_verified" in data, "Response missing email_verified field"
        assert data["email_verified"] == False, "Newly registered user should not be verified"
        
        assert "auth_provider" in data, "Response missing auth_provider field"
        assert data["auth_provider"] == "email", "Auth provider should be 'email'"
    
    def test_check_verification_nonexistent_user(self):
        """Test check verification status for non-existent user returns 404"""
        response = requests.get(f"{BASE_URL}/api/auth/check-verification/nonexistent_{uuid.uuid4().hex}@test.com")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
    
    def test_check_verification_url_encoded_email(self):
        """Test check verification handles URL-encoded email properly"""
        test_email = f"test+special_{uuid.uuid4().hex[:8]}@test.com"
        
        # Register user with special characters in email
        requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "testpass123",
                "name": "Test User"
            }
        )
        
        # Check with URL-encoded email
        import urllib.parse
        encoded_email = urllib.parse.quote(test_email)
        response = requests.get(f"{BASE_URL}/api/auth/check-verification/{encoded_email}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"


class TestEmailVerificationFlow:
    """End-to-end flow tests for email verification"""
    
    def test_full_registration_check_resend_flow(self):
        """Test the complete registration -> check status -> resend flow"""
        test_email = f"test_flow_{uuid.uuid4().hex[:8]}@test.com"
        
        # Step 1: Register
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "testpass123",
                "name": "Flow Test User"
            }
        )
        assert register_response.status_code == 200
        assert register_response.json()["email_verification_required"] == True
        
        # Step 2: Check verification status (should be False)
        check_response = requests.get(f"{BASE_URL}/api/auth/check-verification/{test_email}")
        assert check_response.status_code == 200
        assert check_response.json()["email_verified"] == False
        
        # Step 3: Resend verification
        resend_response = requests.post(
            f"{BASE_URL}/api/auth/resend-verification",
            json={"email": test_email}
        )
        assert resend_response.status_code == 200
        
        # Step 4: Verify invalid token handling
        verify_response = requests.get(f"{BASE_URL}/api/auth/verify-email/fake_token")
        assert verify_response.status_code == 400


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
