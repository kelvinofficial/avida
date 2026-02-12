"""
Test suite for Admin Vouchers and Listing Moderation features
Tests both voucher management and listing moderation APIs
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

# Use the public URL from environment
BASE_URL = "https://dynamic-listings-2.preview.emergentagent.com/api/admin"

# Test credentials
ADMIN_EMAIL = "admin@marketplace.com"
ADMIN_PASSWORD = "Admin@123456"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for testing"""
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


# =============================================================================
# VOUCHER MANAGEMENT TESTS
# =============================================================================

class TestVoucherManagement:
    """Tests for Voucher CRUD operations"""

    def test_list_vouchers(self, api_client):
        """Test listing all vouchers"""
        response = api_client.get(f"{BASE_URL}/vouchers/list")
        assert response.status_code == 200
        
        data = response.json()
        assert "vouchers" in data
        assert "total" in data
        assert isinstance(data["vouchers"], list)
        print(f"Found {data['total']} vouchers")

    def test_get_voucher_stats(self, api_client):
        """Test getting voucher statistics"""
        response = api_client.get(f"{BASE_URL}/vouchers/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_vouchers" in data
        assert "active_vouchers" in data
        assert "total_redemptions" in data
        assert "total_discount_given" in data
        assert "by_type" in data
        print(f"Stats: {data['total_vouchers']} total, {data['active_vouchers']} active")

    def test_create_voucher(self, api_client):
        """Test creating a new voucher with code TESTCODE50"""
        test_code = f"TESTCODE50_{uuid.uuid4().hex[:6].upper()}"
        voucher_data = {
            "code": test_code,
            "voucher_type": "percent",
            "value": 50,
            "description": "Test 50% discount voucher",
            "max_uses": 10,
            "max_uses_per_user": 1,
            "min_order_amount": 100,
            "new_users_only": False,
            "is_active": True
        }
        
        response = api_client.post(f"{BASE_URL}/vouchers/create", json=voucher_data)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "voucher_id" in data
        assert data["code"] == test_code
        print(f"Created voucher: {data['code']} with ID {data['voucher_id']}")
        return data["voucher_id"]

    def test_get_voucher_details(self, api_client):
        """Test getting single voucher details"""
        # First get list to find a voucher
        list_response = api_client.get(f"{BASE_URL}/vouchers/list")
        assert list_response.status_code == 200
        
        vouchers = list_response.json().get("vouchers", [])
        if not vouchers:
            pytest.skip("No vouchers available to test details")
        
        voucher_id = vouchers[0]["id"]
        response = api_client.get(f"{BASE_URL}/vouchers/{voucher_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "code" in data
        assert "voucher_type" in data
        assert "value" in data
        assert "status" in data
        print(f"Voucher details: {data['code']} - {data['status']}")

    def test_update_voucher(self, api_client):
        """Test updating voucher description"""
        # First create a test voucher
        test_code = f"UPDATE_TEST_{uuid.uuid4().hex[:6].upper()}"
        create_response = api_client.post(f"{BASE_URL}/vouchers/create", json={
            "code": test_code,
            "voucher_type": "amount",
            "value": 25,
            "description": "Original description"
        })
        assert create_response.status_code == 200
        voucher_id = create_response.json()["voucher_id"]
        
        # Update the voucher
        update_data = {
            "description": "Updated description for testing",
            "max_uses": 50
        }
        response = api_client.put(f"{BASE_URL}/vouchers/{voucher_id}", json=update_data)
        assert response.status_code == 200
        
        # Verify update
        get_response = api_client.get(f"{BASE_URL}/vouchers/{voucher_id}")
        assert get_response.status_code == 200
        updated = get_response.json()
        assert updated["description"] == "Updated description for testing"
        assert updated["max_uses"] == 50
        print(f"Updated voucher {voucher_id} successfully")

    def test_delete_voucher(self, api_client):
        """Test deleting a voucher"""
        # First create a test voucher to delete
        test_code = f"DELETE_TEST_{uuid.uuid4().hex[:6].upper()}"
        create_response = api_client.post(f"{BASE_URL}/vouchers/create", json={
            "code": test_code,
            "voucher_type": "amount",
            "value": 10,
            "description": "Voucher to be deleted"
        })
        assert create_response.status_code == 200
        voucher_id = create_response.json()["voucher_id"]
        
        # Delete the voucher
        response = api_client.delete(f"{BASE_URL}/vouchers/{voucher_id}")
        assert response.status_code == 200
        
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/vouchers/{voucher_id}")
        assert get_response.status_code == 404
        print(f"Deleted voucher {voucher_id} successfully")

    def test_filter_vouchers_by_status(self, api_client):
        """Test filtering vouchers by status"""
        response = api_client.get(f"{BASE_URL}/vouchers/list?status=active")
        assert response.status_code == 200
        
        data = response.json()
        for voucher in data.get("vouchers", []):
            assert voucher.get("is_active", False) or voucher.get("status") == "active"
        print(f"Filtered active vouchers: {len(data.get('vouchers', []))}")

    def test_filter_vouchers_by_type(self, api_client):
        """Test filtering vouchers by type"""
        response = api_client.get(f"{BASE_URL}/vouchers/list?voucher_type=percent")
        assert response.status_code == 200
        
        data = response.json()
        for voucher in data.get("vouchers", []):
            assert voucher.get("voucher_type") == "percent"
        print(f"Filtered percent vouchers: {len(data.get('vouchers', []))}")


# =============================================================================
# LISTING MODERATION TESTS
# =============================================================================

class TestListingModeration:
    """Tests for Listing Moderation features"""

    def test_get_moderation_queue(self, api_client):
        """Test getting moderation queue"""
        response = api_client.get(f"{BASE_URL}/listing-moderation/queue")
        assert response.status_code == 200
        
        data = response.json()
        assert "listings" in data
        assert "total" in data
        assert "pending_count" in data
        print(f"Moderation queue: {data['pending_count']} pending, {data['total']} total")

    def test_get_moderation_queue_by_status(self, api_client):
        """Test getting moderation queue filtered by status"""
        for status in ["pending", "approved", "rejected"]:
            response = api_client.get(f"{BASE_URL}/listing-moderation/queue?status={status}")
            assert response.status_code == 200
            
            data = response.json()
            assert "listings" in data
            print(f"Moderation queue ({status}): {len(data.get('listings', []))} listings")

    def test_get_moderation_log(self, api_client):
        """Test getting moderation log/history"""
        response = api_client.get(f"{BASE_URL}/listing-moderation/log")
        assert response.status_code == 200
        
        data = response.json()
        assert "logs" in data
        print(f"Moderation log: {len(data.get('logs', []))} entries")

    def test_get_moderation_settings(self, api_client):
        """Test getting moderation limit settings"""
        response = api_client.get(f"{BASE_URL}/listing-moderation/limits/settings")
        assert response.status_code == 200
        
        data = response.json()
        assert "require_moderation" in data
        assert "auto_approve_verified_users" in data
        assert "auto_approve_premium_users" in data
        assert "default_tier" in data
        assert "tier_limits" in data
        assert "moderation_enabled" in data
        print(f"Moderation settings: enabled={data['moderation_enabled']}, require_moderation={data['require_moderation']}")

    def test_update_moderation_settings(self, api_client):
        """Test updating moderation settings"""
        # Get current settings
        get_response = api_client.get(f"{BASE_URL}/listing-moderation/limits/settings")
        assert get_response.status_code == 200
        current_settings = get_response.json()
        
        # Update settings (toggle moderation_enabled)
        new_settings = {
            "require_moderation": current_settings.get("require_moderation", True),
            "auto_approve_verified_users": current_settings.get("auto_approve_verified_users", True),
            "auto_approve_premium_users": current_settings.get("auto_approve_premium_users", True),
            "default_tier": current_settings.get("default_tier", "free"),
            "tier_limits": current_settings.get("tier_limits", {"free": 5, "basic": 20, "premium": 100}),
            "moderation_enabled": current_settings.get("moderation_enabled", True)
        }
        
        response = api_client.put(f"{BASE_URL}/listing-moderation/limits/settings", json=new_settings)
        assert response.status_code == 200
        print("Moderation settings updated successfully")

    def test_moderation_log_filtering(self, api_client):
        """Test moderation log with limit parameter"""
        response = api_client.get(f"{BASE_URL}/listing-moderation/log?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "logs" in data
        assert len(data.get("logs", [])) <= 10
        print(f"Moderation log with limit: {len(data.get('logs', []))} entries")


# =============================================================================
# INTEGRATION TESTS
# =============================================================================

class TestVoucherModerationIntegration:
    """Integration tests for voucher and moderation features"""

    def test_voucher_crud_flow(self, api_client):
        """Test complete voucher CRUD flow"""
        # Create
        test_code = f"FLOW_TEST_{uuid.uuid4().hex[:6].upper()}"
        create_response = api_client.post(f"{BASE_URL}/vouchers/create", json={
            "code": test_code,
            "voucher_type": "credit",
            "value": 100,
            "description": "CRUD flow test voucher"
        })
        assert create_response.status_code == 200
        voucher_id = create_response.json()["voucher_id"]
        print(f"Created: {voucher_id}")
        
        # Read
        read_response = api_client.get(f"{BASE_URL}/vouchers/{voucher_id}")
        assert read_response.status_code == 200
        assert read_response.json()["code"] == test_code
        print(f"Read: {test_code}")
        
        # Update
        update_response = api_client.put(f"{BASE_URL}/vouchers/{voucher_id}", json={
            "description": "Updated in CRUD flow"
        })
        assert update_response.status_code == 200
        print(f"Updated: {voucher_id}")
        
        # Delete
        delete_response = api_client.delete(f"{BASE_URL}/vouchers/{voucher_id}")
        assert delete_response.status_code == 200
        print(f"Deleted: {voucher_id}")
        
        # Verify deletion
        verify_response = api_client.get(f"{BASE_URL}/vouchers/{voucher_id}")
        assert verify_response.status_code == 404
        print("CRUD flow complete!")

    def test_authentication_required(self):
        """Test that endpoints require authentication"""
        unauthenticated_session = requests.Session()
        unauthenticated_session.headers.update({"Content-Type": "application/json"})
        
        # Vouchers list
        response = unauthenticated_session.get(f"{BASE_URL}/vouchers/list")
        assert response.status_code == 401
        
        # Moderation queue
        response = unauthenticated_session.get(f"{BASE_URL}/listing-moderation/queue")
        assert response.status_code == 401
        
        print("Authentication required check passed!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
