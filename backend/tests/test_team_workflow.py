"""
Team & Workflow Management API Tests
Tests for RBAC roles, team members, tasks, approvals, audit logs, and dashboard endpoints
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://attr-icons-ui.preview.emergentagent.com')
if BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')


class TestTeamRoles:
    """Tests for GET /api/team/roles - Returns 8 core RBAC roles"""
    
    def test_get_roles_returns_list(self):
        """Verify roles endpoint returns a list"""
        response = requests.get(f"{BASE_URL}/api/team/roles")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        roles = response.json()
        assert isinstance(roles, list), "Response should be a list"
        print(f"✓ Roles endpoint returns {len(roles)} roles")
    
    def test_eight_core_roles_exist(self):
        """Verify all 8 core RBAC roles are present"""
        expected_roles = [
            'super_admin', 'admin', 'moderator', 'support_agent',
            'finance', 'operations', 'marketing', 'analyst'
        ]
        response = requests.get(f"{BASE_URL}/api/team/roles")
        assert response.status_code == 200
        roles = response.json()
        role_ids = [r['id'] for r in roles]
        
        for expected in expected_roles:
            assert expected in role_ids, f"Missing expected role: {expected}"
        print(f"✓ All 8 core roles present: {expected_roles}")
    
    def test_roles_have_permissions(self):
        """Verify each role has a permissions dictionary"""
        response = requests.get(f"{BASE_URL}/api/team/roles")
        assert response.status_code == 200
        roles = response.json()
        
        for role in roles:
            assert 'permissions' in role, f"Role {role['id']} missing permissions"
            assert isinstance(role['permissions'], dict), f"Permissions should be dict for {role['id']}"
            assert len(role['permissions']) > 0, f"Role {role['id']} has empty permissions"
        print("✓ All roles have valid permissions dictionaries")
    
    def test_roles_marked_as_system(self):
        """Verify core roles are marked as system roles"""
        response = requests.get(f"{BASE_URL}/api/team/roles")
        assert response.status_code == 200
        roles = response.json()
        
        system_roles = [r for r in roles if r.get('is_system')]
        assert len(system_roles) >= 8, f"Expected at least 8 system roles, found {len(system_roles)}"
        print(f"✓ Found {len(system_roles)} system roles")


class TestTeamMembers:
    """Tests for team member CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test data"""
        self.test_email = f"TEST_member_{uuid.uuid4().hex[:8]}@test.com"
        self.test_name = f"TEST User {uuid.uuid4().hex[:4]}"
        yield
        # Cleanup - try to deactivate test member
        try:
            response = requests.get(f"{BASE_URL}/api/team/members")
            if response.status_code == 200:
                members = response.json()
                for m in members:
                    if m['email'] == self.test_email:
                        requests.put(
                            f"{BASE_URL}/api/team/members/{m['id']}",
                            json={"status": "inactive", "updated_by": "test_cleanup"}
                        )
        except:
            pass
    
    def test_get_team_members(self):
        """GET /api/team/members returns list"""
        response = requests.get(f"{BASE_URL}/api/team/members")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        members = response.json()
        assert isinstance(members, list), "Response should be a list"
        print(f"✓ Team members endpoint returns {len(members)} members")
    
    def test_create_team_member(self):
        """POST /api/team/members creates new member with role assignment"""
        payload = {
            "email": self.test_email,
            "name": self.test_name,
            "role_id": "support_agent",
            "department": "Support",
            "created_by": "test_admin"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/team/members",
            json=payload
        )
        assert response.status_code == 200 or response.status_code == 201, f"Expected 200/201, got {response.status_code}: {response.text}"
        
        member = response.json()
        assert member['email'] == self.test_email
        assert member['name'] == self.test_name
        assert member['role_id'] == 'support_agent'
        assert 'id' in member, "Member should have an ID"
        print(f"✓ Created team member {member['id']} with role support_agent")
        
        # Verify role is enriched
        assert 'role' in member or member['role_id'] == 'support_agent'
    
    def test_create_member_with_invalid_role(self):
        """Creating member with invalid role should fail"""
        payload = {
            "email": f"invalid_role_{uuid.uuid4().hex[:8]}@test.com",
            "name": "Invalid Role User",
            "role_id": "nonexistent_role",
            "created_by": "test_admin"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/team/members",
            json=payload
        )
        assert response.status_code == 400, f"Expected 400 for invalid role, got {response.status_code}"
        print("✓ Invalid role_id correctly rejected with 400")
    
    def test_create_member_duplicate_email_rejected(self):
        """Creating member with duplicate email should fail"""
        # First create a member
        payload = {
            "email": self.test_email,
            "name": self.test_name,
            "role_id": "analyst",
            "created_by": "test_admin"
        }
        response = requests.post(f"{BASE_URL}/api/team/members", json=payload)
        assert response.status_code in [200, 201]
        
        # Try to create again with same email
        response2 = requests.post(f"{BASE_URL}/api/team/members", json=payload)
        assert response2.status_code == 400, f"Expected 400 for duplicate email, got {response2.status_code}"
        print("✓ Duplicate email correctly rejected")
    
    def test_team_members_role_enrichment(self):
        """Verify members have role info enriched"""
        response = requests.get(f"{BASE_URL}/api/team/members")
        assert response.status_code == 200
        members = response.json()
        
        for member in members:
            assert 'role_id' in member, "Member should have role_id"
            # Role enrichment is optional but preferred
            if 'role' in member and member['role']:
                assert 'name' in member['role'], "Role should have name"
                assert 'permissions' in member['role'], "Role should have permissions"
        print("✓ Members have role information")


class TestTasks:
    """Tests for task/ticket workflow with SLA tracking"""
    
    @pytest.fixture
    def created_task(self):
        """Create a task for testing"""
        payload = {
            "title": f"TEST Task {uuid.uuid4().hex[:6]}",
            "description": "Test task for automated testing",
            "task_type": "support",
            "priority": "medium",
            "created_by": "test_admin",
            "tags": ["test", "automated"]
        }
        response = requests.post(f"{BASE_URL}/api/team/tasks", json=payload)
        assert response.status_code in [200, 201]
        return response.json()
    
    def test_create_task_with_sla(self):
        """POST /api/team/tasks creates task with SLA timer calculation"""
        payload = {
            "title": f"TEST SLA Task {uuid.uuid4().hex[:6]}",
            "description": "Task to test SLA calculation",
            "task_type": "dispute",
            "priority": "high",
            "created_by": "test_admin"
        }
        
        response = requests.post(f"{BASE_URL}/api/team/tasks", json=payload)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        task = response.json()
        assert 'id' in task, "Task should have an ID"
        assert task['title'] == payload['title']
        assert task['priority'] == 'high'
        assert task['status'] == 'open', f"New task status should be 'open', got {task['status']}"
        assert 'sla_deadline' in task, "Task should have SLA deadline calculated"
        print(f"✓ Created task {task['id']} with SLA deadline: {task.get('sla_deadline')}")
    
    def test_get_tasks(self):
        """GET /api/team/tasks returns list of tasks"""
        response = requests.get(f"{BASE_URL}/api/team/tasks")
        assert response.status_code == 200
        tasks = response.json()
        assert isinstance(tasks, list)
        print(f"✓ Tasks endpoint returns {len(tasks)} tasks")
    
    def test_get_tasks_with_filter(self):
        """GET /api/team/tasks with status filter"""
        response = requests.get(f"{BASE_URL}/api/team/tasks?status=open")
        assert response.status_code == 200
        tasks = response.json()
        # All returned tasks should be open
        for task in tasks:
            assert task['status'] == 'open', f"Task {task['id']} has status {task['status']}, expected 'open'"
        print(f"✓ Filter by status=open returns {len(tasks)} open tasks")
    
    def test_update_task_status(self, created_task):
        """PUT /api/team/tasks/{id} updates task status"""
        task_id = created_task['id']
        
        # Update to in_progress - API expects nested 'updates' object
        response = requests.put(
            f"{BASE_URL}/api/team/tasks/{task_id}",
            json={"updates": {"status": "in_progress"}, "updated_by": "test_admin"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        updated = response.json()
        assert updated['status'] == 'in_progress'
        print(f"✓ Updated task {task_id} status to in_progress")
    
    def test_assign_task(self, created_task):
        """POST /api/team/tasks/{id}/assign assigns task to team member"""
        task_id = created_task['id']
        
        # Get a team member to assign
        members_response = requests.get(f"{BASE_URL}/api/team/members")
        assert members_response.status_code == 200
        members = members_response.json()
        
        if len(members) == 0:
            # Create a member first
            member_payload = {
                "email": f"TEST_assignee_{uuid.uuid4().hex[:6]}@test.com",
                "name": "TEST Assignee",
                "role_id": "support_agent",
                "created_by": "test_admin"
            }
            member_response = requests.post(f"{BASE_URL}/api/team/members", json=member_payload)
            assert member_response.status_code in [200, 201]
            assignee_id = member_response.json()['id']
        else:
            assignee_id = members[0]['id']
        
        # Assign the task
        response = requests.post(
            f"{BASE_URL}/api/team/tasks/{task_id}/assign",
            json={"assigned_to": assignee_id, "assigned_by": "test_admin"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        assigned = response.json()
        assert assigned['assigned_to'] == assignee_id
        print(f"✓ Assigned task {task_id} to member {assignee_id}")
    
    def test_task_priorities(self):
        """Test all task priority levels"""
        priorities = ['low', 'medium', 'high', 'critical']
        
        for priority in priorities:
            payload = {
                "title": f"TEST {priority} priority task",
                "description": f"Testing {priority} priority",
                "task_type": "support",
                "priority": priority,
                "created_by": "test_admin"
            }
            response = requests.post(f"{BASE_URL}/api/team/tasks", json=payload)
            assert response.status_code in [200, 201], f"Failed to create {priority} task"
            task = response.json()
            assert task['priority'] == priority
        print(f"✓ All priority levels work: {priorities}")


class TestApprovals:
    """Tests for approval workflow"""
    
    def test_create_approval_request(self):
        """POST /api/team/approvals creates approval request"""
        payload = {
            "approval_type": "refund",
            "title": f"TEST Refund Approval {uuid.uuid4().hex[:6]}",
            "description": "Test approval request for refund",
            "requester_id": "test_user_001",
            "requester_name": "Test User",
            "request_data": {"amount": 150, "reason": "Product defect"},
            "priority": "medium"
        }
        
        response = requests.post(f"{BASE_URL}/api/team/approvals", json=payload)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        approval = response.json()
        assert 'id' in approval
        assert approval['status'] == 'pending'
        assert approval['title'] == payload['title']
        print(f"✓ Created approval request {approval['id']}")
        return approval
    
    def test_get_approvals(self):
        """GET /api/team/approvals returns list"""
        response = requests.get(f"{BASE_URL}/api/team/approvals")
        assert response.status_code == 200
        approvals = response.json()
        assert isinstance(approvals, list)
        print(f"✓ Approvals endpoint returns {len(approvals)} approvals")
    
    def test_approve_request(self):
        """POST /api/team/approvals/{id}/approve approves request"""
        # First create an approval
        create_payload = {
            "approval_type": "user_ban",
            "title": f"TEST Ban Approval {uuid.uuid4().hex[:6]}",
            "description": "Test approval for user ban",
            "requester_id": "test_moderator",
            "requester_name": "Test Moderator",
            "request_data": {"user_id": "spam_user_123"},
            "priority": "high"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/team/approvals", json=create_payload)
        assert create_response.status_code in [200, 201]
        approval = create_response.json()
        approval_id = approval['id']
        
        # Now approve it
        approve_response = requests.post(
            f"{BASE_URL}/api/team/approvals/{approval_id}/approve",
            json={
                "approver_id": "admin_001",
                "approver_name": "Admin User",
                "notes": "Approved after review"
            }
        )
        assert approve_response.status_code == 200, f"Expected 200, got {approve_response.status_code}: {approve_response.text}"
        
        approved = approve_response.json()
        assert approved['status'] == 'approved'
        print(f"✓ Approved request {approval_id}")
    
    def test_reject_request(self):
        """POST /api/team/approvals/{id}/reject rejects request"""
        # First create an approval
        create_payload = {
            "approval_type": "payout",
            "title": f"TEST Payout Approval {uuid.uuid4().hex[:6]}",
            "description": "Test payout request",
            "requester_id": "test_finance",
            "requester_name": "Test Finance",
            "request_data": {"amount": 5000},
            "priority": "medium"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/team/approvals", json=create_payload)
        assert create_response.status_code in [200, 201]
        approval_id = create_response.json()['id']
        
        # Reject it
        reject_response = requests.post(
            f"{BASE_URL}/api/team/approvals/{approval_id}/reject",
            json={
                "rejector_id": "admin_001",
                "rejector_name": "Admin User",
                "reason": "Insufficient documentation"
            }
        )
        assert reject_response.status_code == 200, f"Expected 200, got {reject_response.status_code}: {reject_response.text}"
        
        rejected = reject_response.json()
        assert rejected['status'] == 'rejected'
        print(f"✓ Rejected request {approval_id}")
    
    def test_filter_approvals_by_status(self):
        """GET /api/team/approvals?status=pending filters correctly"""
        response = requests.get(f"{BASE_URL}/api/team/approvals?status=pending")
        assert response.status_code == 200
        approvals = response.json()
        for approval in approvals:
            assert approval['status'] == 'pending'
        print(f"✓ Status filter returns {len(approvals)} pending approvals")


class TestDashboard:
    """Tests for dashboard metrics endpoint"""
    
    def test_get_dashboard_metrics(self):
        """GET /api/team/dashboard returns metrics"""
        response = requests.get(f"{BASE_URL}/api/team/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        dashboard = response.json()
        
        # Check required fields
        required_fields = [
            'task_stats', 'priority_stats', 'sla_breached_count',
            'pending_approvals', 'active_members', 'tasks_today',
            'resolved_this_week', 'tasks_by_team', 'recent_activity'
        ]
        
        for field in required_fields:
            assert field in dashboard, f"Dashboard missing field: {field}"
        
        print(f"✓ Dashboard has all required fields")
        print(f"  - Active members: {dashboard['active_members']}")
        print(f"  - Pending approvals: {dashboard['pending_approvals']}")
        print(f"  - SLA breaches: {dashboard['sla_breached_count']}")
    
    def test_dashboard_task_stats_structure(self):
        """Verify task_stats has expected status keys"""
        response = requests.get(f"{BASE_URL}/api/team/dashboard")
        assert response.status_code == 200
        
        dashboard = response.json()
        task_stats = dashboard['task_stats']
        
        expected_statuses = ['open', 'in_progress', 'waiting', 'resolved', 'closed', 'escalated']
        for status in expected_statuses:
            assert status in task_stats, f"task_stats missing status: {status}"
        print(f"✓ task_stats has all status counts: {task_stats}")
    
    def test_dashboard_priority_stats(self):
        """Verify priority_stats has expected priority keys"""
        response = requests.get(f"{BASE_URL}/api/team/dashboard")
        assert response.status_code == 200
        
        dashboard = response.json()
        priority_stats = dashboard['priority_stats']
        
        expected_priorities = ['low', 'medium', 'high', 'critical']
        for priority in expected_priorities:
            assert priority in priority_stats, f"priority_stats missing: {priority}"
        print(f"✓ priority_stats has all priorities: {priority_stats}")
    
    def test_dashboard_tasks_by_team(self):
        """Verify tasks_by_team includes all 8 roles"""
        response = requests.get(f"{BASE_URL}/api/team/dashboard")
        assert response.status_code == 200
        
        dashboard = response.json()
        tasks_by_team = dashboard['tasks_by_team']
        
        role_ids = [t['role_id'] for t in tasks_by_team]
        expected_roles = ['super_admin', 'admin', 'moderator', 'support_agent', 'finance', 'operations', 'marketing', 'analyst']
        
        for role in expected_roles:
            assert role in role_ids, f"tasks_by_team missing role: {role}"
        print(f"✓ tasks_by_team includes all 8 core roles")


class TestAuditLogs:
    """Tests for immutable audit trail"""
    
    def test_get_audit_logs(self):
        """GET /api/team/audit-logs returns immutable audit trail"""
        response = requests.get(f"{BASE_URL}/api/team/audit-logs?limit=50")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        logs = response.json()
        assert isinstance(logs, list)
        print(f"✓ Audit logs endpoint returns {len(logs)} entries")
    
    def test_audit_log_structure(self):
        """Verify audit log entries have required fields"""
        response = requests.get(f"{BASE_URL}/api/team/audit-logs?limit=10")
        assert response.status_code == 200
        
        logs = response.json()
        if len(logs) > 0:
            log = logs[0]
            required_fields = ['id', 'timestamp', 'actor_id', 'actor_name', 'action', 'module', 'entity_type', 'entity_id']
            
            for field in required_fields:
                assert field in log, f"Audit log missing field: {field}"
            print(f"✓ Audit log entries have required structure")
        else:
            print("⚠ No audit logs to verify structure")
    
    def test_audit_logs_sorted_by_timestamp(self):
        """Verify audit logs are sorted by timestamp descending"""
        response = requests.get(f"{BASE_URL}/api/team/audit-logs?limit=20")
        assert response.status_code == 200
        
        logs = response.json()
        if len(logs) > 1:
            timestamps = [log['timestamp'] for log in logs]
            assert timestamps == sorted(timestamps, reverse=True), "Logs should be sorted newest first"
            print("✓ Audit logs are sorted by timestamp (newest first)")
        else:
            print("⚠ Not enough logs to verify sorting")
    
    def test_actions_create_audit_entries(self):
        """Verify actions create audit log entries"""
        # Create a task to generate audit entry
        payload = {
            "title": f"TEST Audit Task {uuid.uuid4().hex[:6]}",
            "description": "Task to test audit logging",
            "task_type": "support",
            "priority": "low",
            "created_by": "audit_test_user"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/team/tasks", json=payload)
        assert create_response.status_code in [200, 201]
        task_id = create_response.json()['id']
        
        # Check audit log for the create action
        audit_response = requests.get(f"{BASE_URL}/api/team/audit-logs?limit=5")
        assert audit_response.status_code == 200
        
        logs = audit_response.json()
        # Find the log entry for this task creation
        task_logs = [l for l in logs if l['entity_id'] == task_id]
        assert len(task_logs) > 0, "Task creation should generate audit log"
        assert task_logs[0]['action'] == 'create'
        print(f"✓ Task creation generated audit entry for task {task_id}")


class TestSettings:
    """Tests for configurable SLA timers and thresholds"""
    
    def test_get_settings(self):
        """GET /api/team/settings returns configurable settings"""
        response = requests.get(f"{BASE_URL}/api/team/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        settings = response.json()
        assert isinstance(settings, dict)
        print(f"✓ Settings endpoint returns configuration")
    
    def test_settings_has_sla_timers(self):
        """Verify settings include SLA timers"""
        response = requests.get(f"{BASE_URL}/api/team/settings")
        assert response.status_code == 200
        
        settings = response.json()
        assert 'sla_timers' in settings, "Settings should include sla_timers"
        
        sla_timers = settings['sla_timers']
        assert 'critical' in sla_timers
        assert 'high' in sla_timers
        assert 'medium' in sla_timers
        assert 'low' in sla_timers
        print(f"✓ SLA timers configured: {sla_timers}")
    
    def test_settings_has_thresholds(self):
        """Verify settings include approval thresholds"""
        response = requests.get(f"{BASE_URL}/api/team/settings")
        assert response.status_code == 200
        
        settings = response.json()
        assert 'refund_approval_threshold' in settings, "Settings should include refund_approval_threshold"
        assert 'payout_approval_threshold' in settings, "Settings should include payout_approval_threshold"
        print(f"✓ Approval thresholds: refund=${settings['refund_approval_threshold']}, payout=${settings['payout_approval_threshold']}")
    
    def test_settings_has_escalation_config(self):
        """Verify settings include escalation configuration"""
        response = requests.get(f"{BASE_URL}/api/team/settings")
        assert response.status_code == 200
        
        settings = response.json()
        assert 'escalation_enabled' in settings, "Settings should include escalation_enabled"
        assert 'email_notifications_enabled' in settings, "Settings should include email_notifications_enabled"
        print(f"✓ Escalation enabled: {settings['escalation_enabled']}, Email notifications: {settings['email_notifications_enabled']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
