"""
Chat Moderation System API Tests
Tests for AI-powered content moderation, manual actions, user reporting, and admin dashboard
"""

import pytest
import requests
import uuid
import os
import time
from datetime import datetime

# Get the base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://classifieds-search-1.preview.emergentagent.com').rstrip('/')


class TestReportReasons:
    """Test the public report reasons endpoint"""
    
    def test_get_report_reasons(self):
        """GET /api/report/reasons - should return list of report reasons"""
        response = requests.get(f"{BASE_URL}/api/report/reasons")
        assert response.status_code == 200
        data = response.json()
        
        assert "reasons" in data
        reasons = data["reasons"]
        assert len(reasons) >= 7
        
        # Verify expected reason IDs
        reason_ids = [r["id"] for r in reasons]
        assert "scam" in reason_ids
        assert "abuse" in reason_ids
        assert "fake_listing" in reason_ids
        assert "off_platform_payment" in reason_ids
        assert "harassment" in reason_ids
        assert "spam" in reason_ids
        assert "other" in reason_ids
        
        # Verify structure
        for reason in reasons:
            assert "id" in reason
            assert "label" in reason
            assert isinstance(reason["label"], str)


class TestHelperFunctions:
    """Helper functions for authentication and test setup"""
    
    @staticmethod
    def register_user(email=None, name=None, password="test123456"):
        """Register a new test user"""
        email = email or f"testmod_{uuid.uuid4().hex[:8]}@test.com"
        name = name or f"Test User {uuid.uuid4().hex[:6]}"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": password,
            "name": name
        })
        
        if response.status_code == 200:
            data = response.json()
            return {
                "user_id": data.get("user", {}).get("user_id") or data.get("user_id"),
                "email": email,
                "name": name,
                "token": data.get("session_token"),
                "password": password
            }
        return None
    
    @staticmethod
    def login_user(email, password):
        """Login an existing user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        
        if response.status_code == 200:
            data = response.json()
            return data.get("session_token")
        return None
    
    @staticmethod
    def create_listing(token, title=None):
        """Create a test listing"""
        title = title or f"Test Listing {uuid.uuid4().hex[:6]}"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(f"{BASE_URL}/api/listings", json={
            "title": title,
            "description": "Test listing for moderation testing",
            "price": 100.00,
            "category_id": "electronics",
            "subcategory": "laptops_computers",
            "location": "Test City"
        }, headers=headers)
        
        if response.status_code == 200:
            return response.json()
        return None

    @staticmethod
    def create_conversation(token, listing_id, message="Hello, I'm interested"):
        """Create a conversation for a listing (listing_id is query param)"""
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(
            f"{BASE_URL}/api/conversations?listing_id={listing_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            return response.json()
        return None


class TestModerationStatsEndpoint:
    """Tests for GET /api/moderation/stats"""
    
    def test_stats_requires_auth(self):
        """Stats endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/moderation/stats")
        assert response.status_code == 401
        assert "Not authenticated" in response.json().get("detail", "")
    
    def test_stats_with_auth(self):
        """Stats endpoint should return stats when authenticated"""
        # Register and get token
        user = TestHelperFunctions.register_user()
        if not user:
            pytest.skip("Could not register user")
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        response = requests.get(f"{BASE_URL}/api/moderation/stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats structure
        assert "flags" in data
        assert "reports" in data
        assert "users" in data
        assert "conversations" in data
        assert "actions_24h" in data
        
        # Verify flags structure
        assert "pending" in data["flags"]
        assert "by_risk" in data["flags"]
        
        # Verify reports structure
        assert "pending" in data["reports"]
        assert "by_reason" in data["reports"]
        
        # Verify users structure
        assert "muted" in data["users"]
        assert "banned" in data["users"]
        
        # Verify conversations structure
        assert "frozen" in data["conversations"]


class TestModerationConfigEndpoint:
    """Tests for GET/PUT /api/moderation/config"""
    
    def test_config_requires_auth(self):
        """Config endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/moderation/config")
        assert response.status_code == 401
    
    def test_get_config_with_auth(self):
        """Config endpoint should return configuration when authenticated"""
        user = TestHelperFunctions.register_user()
        if not user:
            pytest.skip("Could not register user")
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        response = requests.get(f"{BASE_URL}/api/moderation/config", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify config structure
        assert "ai_moderation_enabled" in data
        assert "auto_moderation_enabled" in data
        assert "escrow_fraud_detection" in data
        assert "mask_sensitive_data" in data
        assert "rules" in data
        
        # Verify rules structure
        rules = data["rules"]
        assert "auto_warning_threshold" in rules
        assert "auto_mute_duration_hours" in rules
        assert "auto_ban_threshold" in rules
        assert "scam_keywords" in rules
        assert "contact_patterns" in rules


class TestModerationConversationsEndpoint:
    """Tests for GET /api/moderation/conversations"""
    
    def test_conversations_requires_auth(self):
        """Conversations endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/moderation/conversations")
        assert response.status_code == 401
    
    def test_get_conversations_with_auth(self):
        """Conversations endpoint should return list when authenticated"""
        user = TestHelperFunctions.register_user()
        if not user:
            pytest.skip("Could not register user")
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        response = requests.get(f"{BASE_URL}/api/moderation/conversations", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "conversations" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        # Verify it's a list
        assert isinstance(data["conversations"], list)
    
    def test_conversations_with_filters(self):
        """Conversations endpoint should support filtering"""
        user = TestHelperFunctions.register_user()
        if not user:
            pytest.skip("Could not register user")
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        
        # Test pagination
        response = requests.get(
            f"{BASE_URL}/api/moderation/conversations",
            params={"page": 1, "limit": 5},
            headers=headers
        )
        assert response.status_code == 200
        
        # Test status filter
        response = requests.get(
            f"{BASE_URL}/api/moderation/conversations",
            params={"status": "active"},
            headers=headers
        )
        assert response.status_code == 200


class TestModerationFlagsEndpoint:
    """Tests for GET /api/moderation/flags"""
    
    def test_flags_requires_auth(self):
        """Flags endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/moderation/flags")
        assert response.status_code == 401
    
    def test_get_flags_with_auth(self):
        """Flags endpoint should return list when authenticated"""
        user = TestHelperFunctions.register_user()
        if not user:
            pytest.skip("Could not register user")
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        response = requests.get(f"{BASE_URL}/api/moderation/flags", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "flags" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        assert isinstance(data["flags"], list)
    
    def test_flags_filter_by_status(self):
        """Flags endpoint should filter by status"""
        user = TestHelperFunctions.register_user()
        if not user:
            pytest.skip("Could not register user")
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        
        # Test pending status
        response = requests.get(
            f"{BASE_URL}/api/moderation/flags",
            params={"status": "pending"},
            headers=headers
        )
        assert response.status_code == 200
        
        # Test different risk levels
        for risk in ["low", "medium", "high", "critical"]:
            response = requests.get(
                f"{BASE_URL}/api/moderation/flags",
                params={"risk_level": risk},
                headers=headers
            )
            assert response.status_code == 200


class TestModerationReportsEndpoint:
    """Tests for GET /api/moderation/reports"""
    
    def test_reports_requires_auth(self):
        """Reports endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/moderation/reports")
        assert response.status_code == 401
    
    def test_get_reports_with_auth(self):
        """Reports endpoint should return list when authenticated"""
        user = TestHelperFunctions.register_user()
        if not user:
            pytest.skip("Could not register user")
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        response = requests.get(f"{BASE_URL}/api/moderation/reports", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "reports" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        assert isinstance(data["reports"], list)
    
    def test_reports_filter_by_reason(self):
        """Reports endpoint should filter by reason"""
        user = TestHelperFunctions.register_user()
        if not user:
            pytest.skip("Could not register user")
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        
        for reason in ["scam", "abuse", "spam"]:
            response = requests.get(
                f"{BASE_URL}/api/moderation/reports",
                params={"reason": reason},
                headers=headers
            )
            assert response.status_code == 200


class TestModerationActionsEndpoint:
    """Tests for POST /api/moderation/actions"""
    
    def test_actions_requires_auth(self):
        """Actions endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/moderation/actions",
            json={
                "action_type": "warn_user",
                "target_type": "user",
                "target_id": "test_user_123"
            }
        )
        assert response.status_code == 401
    
    def test_warn_user_action(self):
        """Test warning a user"""
        admin = TestHelperFunctions.register_user()
        target_user = TestHelperFunctions.register_user()
        
        if not admin or not target_user:
            pytest.skip("Could not register users")
        
        headers = {"Authorization": f"Bearer {admin['token']}"}
        
        response = requests.post(
            f"{BASE_URL}/api/moderation/actions",
            json={
                "action_type": "warn_user",
                "target_type": "user",
                "target_id": target_user["user_id"],
                "reason": "Test warning for policy violation"
            },
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "action_id" in data
    
    def test_mute_user_action(self):
        """Test muting a user"""
        admin = TestHelperFunctions.register_user()
        target_user = TestHelperFunctions.register_user()
        
        if not admin or not target_user:
            pytest.skip("Could not register users")
        
        headers = {"Authorization": f"Bearer {admin['token']}"}
        
        response = requests.post(
            f"{BASE_URL}/api/moderation/actions",
            json={
                "action_type": "mute_user",
                "target_type": "user",
                "target_id": target_user["user_id"],
                "reason": "Test mute for policy violation",
                "duration_hours": 24
            },
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Action performed" in data["message"]
    
    def test_ban_user_action(self):
        """Test banning a user"""
        admin = TestHelperFunctions.register_user()
        target_user = TestHelperFunctions.register_user()
        
        if not admin or not target_user:
            pytest.skip("Could not register users")
        
        headers = {"Authorization": f"Bearer {admin['token']}"}
        
        response = requests.post(
            f"{BASE_URL}/api/moderation/actions",
            json={
                "action_type": "ban_user",
                "target_type": "user",
                "target_id": target_user["user_id"],
                "reason": "Test ban for repeated violations"
            },
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data


class TestUserReportEndpoint:
    """Tests for POST /api/report/message"""
    
    def test_report_requires_auth(self):
        """Report endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/report/message",
            json={
                "conversation_id": "test_conv_123",
                "reason": "scam"
            }
        )
        assert response.status_code == 401
    
    def test_report_with_invalid_conversation(self):
        """Report should fail with non-existent conversation"""
        user = TestHelperFunctions.register_user()
        if not user:
            pytest.skip("Could not register user")
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        
        response = requests.post(
            f"{BASE_URL}/api/report/message",
            json={
                "conversation_id": "nonexistent_conv_123",
                "reason": "scam"
            },
            headers=headers
        )
        
        assert response.status_code == 404
        assert "Conversation not found" in response.json().get("detail", "")


class TestConversationDetailEndpoint:
    """Tests for GET /api/moderation/conversations/{id}"""
    
    def test_conversation_detail_requires_auth(self):
        """Conversation detail endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/moderation/conversations/test_conv_123")
        assert response.status_code == 401
    
    def test_conversation_detail_not_found(self):
        """Should return 404 for non-existent conversation"""
        user = TestHelperFunctions.register_user()
        if not user:
            pytest.skip("Could not register user")
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        response = requests.get(
            f"{BASE_URL}/api/moderation/conversations/nonexistent_conv_123",
            headers=headers
        )
        
        assert response.status_code == 404


class TestRuleBasedDetection:
    """Tests for rule-based moderation detection patterns"""
    
    def test_scam_keywords_in_config(self):
        """Verify scam keywords are configured"""
        user = TestHelperFunctions.register_user()
        if not user:
            pytest.skip("Could not register user")
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        response = requests.get(f"{BASE_URL}/api/moderation/config", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        scam_keywords = data.get("rules", {}).get("scam_keywords", [])
        
        # Verify expected scam keywords are configured
        expected_keywords = ["western union", "moneygram", "gift card", "wire transfer"]
        for keyword in expected_keywords:
            assert any(kw.lower() == keyword.lower() for kw in scam_keywords), \
                f"Expected '{keyword}' in scam keywords"
    
    def test_contact_patterns_in_config(self):
        """Verify contact patterns are configured"""
        user = TestHelperFunctions.register_user()
        if not user:
            pytest.skip("Could not register user")
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        response = requests.get(f"{BASE_URL}/api/moderation/config", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        contact_patterns = data.get("rules", {}).get("contact_patterns", [])
        
        # Should have patterns for phone numbers and emails
        assert len(contact_patterns) >= 3, "Expected at least 3 contact detection patterns"


class TestGetModerationActionsAuditLog:
    """Tests for GET /api/moderation/actions (audit log)"""
    
    def test_actions_log_requires_auth(self):
        """Actions log should require authentication"""
        response = requests.get(f"{BASE_URL}/api/moderation/actions")
        assert response.status_code == 401
    
    def test_get_actions_log(self):
        """Should return actions audit log"""
        user = TestHelperFunctions.register_user()
        if not user:
            pytest.skip("Could not register user")
        
        headers = {"Authorization": f"Bearer {user['token']}"}
        response = requests.get(f"{BASE_URL}/api/moderation/actions", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "actions" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data


class TestModerationActionsWithConversation:
    """Tests for moderation actions that require a real conversation"""
    
    def test_freeze_and_unfreeze_conversation(self):
        """Test freezing and unfreezing a conversation"""
        # Create seller with listing
        seller = TestHelperFunctions.register_user()
        if not seller:
            pytest.skip("Could not register seller")
        
        listing = TestHelperFunctions.create_listing(seller['token'])
        if not listing:
            pytest.skip("Could not create listing")
        
        # Create buyer and conversation
        buyer = TestHelperFunctions.register_user()
        if not buyer:
            pytest.skip("Could not register buyer")
        
        conversation = TestHelperFunctions.create_conversation(
            buyer['token'], 
            listing['id'],
            "Hi, I'm interested in this item"
        )
        
        if not conversation:
            pytest.skip("Could not create conversation")
        
        conv_id = conversation.get("id")
        if not conv_id:
            pytest.skip("Conversation has no ID")
        
        # Admin freezes the conversation
        admin = TestHelperFunctions.register_user()
        if not admin:
            pytest.skip("Could not register admin")
        
        headers = {"Authorization": f"Bearer {admin['token']}"}
        
        # Freeze conversation
        response = requests.post(
            f"{BASE_URL}/api/moderation/actions",
            json={
                "action_type": "freeze_conversation",
                "target_type": "conversation",
                "target_id": conv_id,
                "reason": "Investigation in progress"
            },
            headers=headers
        )
        
        assert response.status_code == 200
        
        # Unfreeze conversation
        response = requests.post(
            f"{BASE_URL}/api/moderation/actions",
            json={
                "action_type": "unfreeze_conversation",
                "target_type": "conversation",
                "target_id": conv_id,
                "reason": "Investigation complete"
            },
            headers=headers
        )
        
        assert response.status_code == 200


class TestUserReportWorkflow:
    """End-to-end test for user report workflow"""
    
    def test_complete_report_workflow(self):
        """Test creating a report through the user-facing endpoint"""
        # Create seller with listing
        seller = TestHelperFunctions.register_user()
        if not seller:
            pytest.skip("Could not register seller")
        
        listing = TestHelperFunctions.create_listing(seller['token'], "Test Item For Sale")
        if not listing:
            pytest.skip("Could not create listing")
        
        # Create buyer and conversation
        buyer = TestHelperFunctions.register_user()
        if not buyer:
            pytest.skip("Could not register buyer")
        
        conversation = TestHelperFunctions.create_conversation(
            buyer['token'],
            listing['id'],
            "Is this item still available?"
        )
        
        if not conversation:
            pytest.skip("Could not create conversation")
        
        conv_id = conversation.get("id")
        if not conv_id:
            pytest.skip("Conversation has no ID")
        
        # Buyer reports the seller
        headers = {"Authorization": f"Bearer {buyer['token']}"}
        
        response = requests.post(
            f"{BASE_URL}/api/report/message",
            json={
                "conversation_id": conv_id,
                "reason": "scam",
                "description": "Seller asked for payment outside platform"
            },
            headers=headers
        )
        
        # Should succeed
        assert response.status_code == 200
        data = response.json()
        assert "report_id" in data
        assert "message" in data
        
        # Verify report appears in admin view
        admin = TestHelperFunctions.register_user()
        if admin:
            admin_headers = {"Authorization": f"Bearer {admin['token']}"}
            reports_response = requests.get(
                f"{BASE_URL}/api/moderation/reports",
                headers=admin_headers
            )
            assert reports_response.status_code == 200


class TestModeratorNotes:
    """Tests for moderator notes functionality"""
    
    def test_add_note_requires_auth(self):
        """Adding note should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/moderation/notes",
            json={"content": "Test note", "conversation_id": "test123"}
        )
        assert response.status_code == 401
    
    def test_add_and_get_moderator_note(self):
        """Test adding and retrieving moderator notes"""
        admin = TestHelperFunctions.register_user()
        if not admin:
            pytest.skip("Could not register admin")
        
        headers = {"Authorization": f"Bearer {admin['token']}"}
        
        # Add a note
        note_content = f"Test moderation note {uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/moderation/notes",
            json={
                "content": note_content,
                "conversation_id": "test_conv_note_123"
            },
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "note_id" in data
        
        # Get notes
        response = requests.get(
            f"{BASE_URL}/api/moderation/notes",
            params={"conversation_id": "test_conv_note_123"},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "notes" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
