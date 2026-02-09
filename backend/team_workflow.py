"""
Team & Workflow Management System
Complete RBAC, Task Management, Approval Flows, and Audit Trail
"""

from fastapi import APIRouter, HTTPException, Body, Query, Depends, UploadFile, File
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from enum import Enum
import uuid
import hashlib
import secrets
import logging
import asyncio

logger = logging.getLogger(__name__)

# ============================================================================
# ENUMS
# ============================================================================

class CoreRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MODERATOR = "moderator"
    SUPPORT_AGENT = "support_agent"
    FINANCE = "finance"
    OPERATIONS = "operations"
    MARKETING = "marketing"
    ANALYST = "analyst"

class PermissionLevel(str, Enum):
    NONE = "none"
    READ = "read"
    WRITE = "write"
    APPROVE = "approve"
    OVERRIDE = "override"

class TaskType(str, Enum):
    DISPUTE = "dispute"
    FRAUD = "fraud"
    BUG = "bug"
    REFUND = "refund"
    REVIEW = "review"
    MODERATION = "moderation"
    VERIFICATION = "verification"
    SUPPORT = "support"
    ESCALATION = "escalation"
    OTHER = "other"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class TaskStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING = "waiting"
    RESOLVED = "resolved"
    CLOSED = "closed"
    ESCALATED = "escalated"

class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class ApprovalType(str, Enum):
    SELLER_VERIFICATION = "seller_verification"
    REFUND = "refund"
    ESCROW_OVERRIDE = "escrow_override"
    USER_BAN = "user_ban"
    BANNER_PUBLISH = "banner_publish"
    FEATURE_TOGGLE = "feature_toggle"
    CONFIG_CHANGE = "config_change"
    PAYOUT = "payout"

# ============================================================================
# PERMISSION MODULES
# ============================================================================

PERMISSION_MODULES = [
    "listings",
    "users",
    "chats_moderation",
    "escrow_disputes",
    "payments_refunds",
    "transport_partners",
    "banners_ads",
    "analytics_cohorts",
    "qa_debugging",
    "sandbox_access",
    "team_management",
    "system_config",
    "audit_logs",
    "approvals",
]

# Default permission matrix for core roles
DEFAULT_ROLE_PERMISSIONS = {
    CoreRole.SUPER_ADMIN: {mod: PermissionLevel.OVERRIDE for mod in PERMISSION_MODULES},
    CoreRole.ADMIN: {
        "listings": PermissionLevel.OVERRIDE,
        "users": PermissionLevel.OVERRIDE,
        "chats_moderation": PermissionLevel.OVERRIDE,
        "escrow_disputes": PermissionLevel.APPROVE,
        "payments_refunds": PermissionLevel.APPROVE,
        "transport_partners": PermissionLevel.WRITE,
        "banners_ads": PermissionLevel.APPROVE,
        "analytics_cohorts": PermissionLevel.READ,
        "qa_debugging": PermissionLevel.WRITE,
        "sandbox_access": PermissionLevel.WRITE,
        "team_management": PermissionLevel.WRITE,
        "system_config": PermissionLevel.WRITE,
        "audit_logs": PermissionLevel.READ,
        "approvals": PermissionLevel.APPROVE,
    },
    CoreRole.MODERATOR: {
        "listings": PermissionLevel.WRITE,
        "users": PermissionLevel.READ,
        "chats_moderation": PermissionLevel.WRITE,
        "escrow_disputes": PermissionLevel.READ,
        "payments_refunds": PermissionLevel.NONE,
        "transport_partners": PermissionLevel.NONE,
        "banners_ads": PermissionLevel.NONE,
        "analytics_cohorts": PermissionLevel.NONE,
        "qa_debugging": PermissionLevel.READ,
        "sandbox_access": PermissionLevel.READ,
        "team_management": PermissionLevel.NONE,
        "system_config": PermissionLevel.NONE,
        "audit_logs": PermissionLevel.NONE,
        "approvals": PermissionLevel.NONE,
    },
    CoreRole.SUPPORT_AGENT: {
        "listings": PermissionLevel.READ,
        "users": PermissionLevel.READ,
        "chats_moderation": PermissionLevel.READ,
        "escrow_disputes": PermissionLevel.WRITE,
        "payments_refunds": PermissionLevel.WRITE,
        "transport_partners": PermissionLevel.READ,
        "banners_ads": PermissionLevel.NONE,
        "analytics_cohorts": PermissionLevel.NONE,
        "qa_debugging": PermissionLevel.READ,
        "sandbox_access": PermissionLevel.READ,
        "team_management": PermissionLevel.NONE,
        "system_config": PermissionLevel.NONE,
        "audit_logs": PermissionLevel.NONE,
        "approvals": PermissionLevel.NONE,
    },
    CoreRole.FINANCE: {
        "listings": PermissionLevel.NONE,
        "users": PermissionLevel.READ,
        "chats_moderation": PermissionLevel.NONE,
        "escrow_disputes": PermissionLevel.APPROVE,
        "payments_refunds": PermissionLevel.APPROVE,
        "transport_partners": PermissionLevel.NONE,
        "banners_ads": PermissionLevel.NONE,
        "analytics_cohorts": PermissionLevel.READ,
        "qa_debugging": PermissionLevel.NONE,
        "sandbox_access": PermissionLevel.NONE,
        "team_management": PermissionLevel.NONE,
        "system_config": PermissionLevel.NONE,
        "audit_logs": PermissionLevel.READ,
        "approvals": PermissionLevel.APPROVE,
    },
    CoreRole.OPERATIONS: {
        "listings": PermissionLevel.READ,
        "users": PermissionLevel.READ,
        "chats_moderation": PermissionLevel.NONE,
        "escrow_disputes": PermissionLevel.READ,
        "payments_refunds": PermissionLevel.NONE,
        "transport_partners": PermissionLevel.WRITE,
        "banners_ads": PermissionLevel.NONE,
        "analytics_cohorts": PermissionLevel.READ,
        "qa_debugging": PermissionLevel.NONE,
        "sandbox_access": PermissionLevel.NONE,
        "team_management": PermissionLevel.NONE,
        "system_config": PermissionLevel.NONE,
        "audit_logs": PermissionLevel.NONE,
        "approvals": PermissionLevel.NONE,
    },
    CoreRole.MARKETING: {
        "listings": PermissionLevel.READ,
        "users": PermissionLevel.READ,
        "chats_moderation": PermissionLevel.NONE,
        "escrow_disputes": PermissionLevel.NONE,
        "payments_refunds": PermissionLevel.NONE,
        "transport_partners": PermissionLevel.NONE,
        "banners_ads": PermissionLevel.WRITE,
        "analytics_cohorts": PermissionLevel.READ,
        "qa_debugging": PermissionLevel.NONE,
        "sandbox_access": PermissionLevel.NONE,
        "team_management": PermissionLevel.NONE,
        "system_config": PermissionLevel.NONE,
        "audit_logs": PermissionLevel.NONE,
        "approvals": PermissionLevel.NONE,
    },
    CoreRole.ANALYST: {
        "listings": PermissionLevel.READ,
        "users": PermissionLevel.READ,
        "chats_moderation": PermissionLevel.READ,
        "escrow_disputes": PermissionLevel.READ,
        "payments_refunds": PermissionLevel.READ,
        "transport_partners": PermissionLevel.READ,
        "banners_ads": PermissionLevel.READ,
        "analytics_cohorts": PermissionLevel.READ,
        "qa_debugging": PermissionLevel.READ,
        "sandbox_access": PermissionLevel.NONE,
        "team_management": PermissionLevel.NONE,
        "system_config": PermissionLevel.NONE,
        "audit_logs": PermissionLevel.READ,
        "approvals": PermissionLevel.NONE,
    },
}

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class TeamMember(BaseModel):
    id: str
    email: EmailStr
    name: str
    avatar_url: Optional[str] = None
    role_id: str  # Reference to role
    is_custom_role: bool = False
    status: Literal["active", "inactive", "suspended"] = "active"
    phone: Optional[str] = None
    department: Optional[str] = None
    
    # Security
    password_hash: Optional[str] = None
    two_factor_enabled: bool = False
    two_factor_secret: Optional[str] = None
    last_login: Optional[str] = None
    login_ip: Optional[str] = None
    login_device: Optional[str] = None
    failed_login_attempts: int = 0
    locked_until: Optional[str] = None
    
    # Shift & Availability
    working_hours: Optional[Dict[str, Any]] = None  # {day: {start, end}}
    is_on_call: bool = False
    timezone: str = "UTC"
    
    # Training
    sandbox_only: bool = False  # Training mode
    
    # Metadata
    created_at: str
    updated_at: str
    created_by: str


class Role(BaseModel):
    id: str
    name: str
    description: str
    is_system: bool = False  # System roles cannot be deleted
    permissions: Dict[str, str]  # module -> permission level
    created_at: str
    updated_at: str
    created_by: str


class Task(BaseModel):
    id: str
    title: str
    description: str
    type: TaskType
    priority: TaskPriority
    status: TaskStatus
    
    # Assignment
    assigned_to: Optional[str] = None  # team_member_id
    assigned_team: Optional[str] = None  # role/department
    created_by: str
    
    # Source
    source_type: Optional[str] = None  # user_report, dispute, chat_flag, qa_error, manual
    source_id: Optional[str] = None  # ID of the source entity
    source_data: Optional[Dict[str, Any]] = None
    
    # SLA
    sla_deadline: Optional[str] = None
    sla_breached: bool = False
    escalation_level: int = 0
    escalated_to: Optional[str] = None
    
    # Resolution
    resolution: Optional[str] = None
    resolved_at: Optional[str] = None
    resolved_by: Optional[str] = None
    
    # Metadata
    tags: List[str] = []
    attachments: List[Dict[str, str]] = []  # [{filename, url, uploaded_by}]
    watchers: List[str] = []  # team_member_ids
    
    created_at: str
    updated_at: str


class TaskComment(BaseModel):
    id: str
    task_id: str
    author_id: str
    author_name: str
    content: str
    mentions: List[str] = []  # @mentioned team_member_ids
    attachments: List[Dict[str, str]] = []
    is_internal: bool = True  # Never visible to users
    created_at: str


class ApprovalRequest(BaseModel):
    id: str
    type: ApprovalType
    title: str
    description: str
    
    # Request details
    requester_id: str
    requester_name: str
    target_entity_type: Optional[str] = None  # user, listing, payment, etc
    target_entity_id: Optional[str] = None
    request_data: Dict[str, Any] = {}  # Specific data for approval
    
    # Approval chain
    required_approvers: List[str] = []  # role_ids or team_member_ids
    approvals: List[Dict[str, Any]] = []  # [{approver_id, approved_at, notes}]
    rejections: List[Dict[str, Any]] = []
    required_approval_count: int = 1
    
    # Status
    status: ApprovalStatus = ApprovalStatus.PENDING
    
    # Metadata
    priority: TaskPriority = TaskPriority.MEDIUM
    expires_at: Optional[str] = None
    created_at: str
    updated_at: str
    completed_at: Optional[str] = None


class WorkflowRule(BaseModel):
    id: str
    name: str
    description: str
    is_active: bool = True
    
    # Trigger conditions
    trigger_type: str  # task_created, dispute_opened, chat_flagged, etc
    trigger_conditions: Dict[str, Any] = {}  # {field: value} matching
    
    # Actions
    actions: List[Dict[str, Any]] = []  # [{action_type, params}]
    # action_types: assign_to_role, assign_to_member, set_priority, send_notification, escalate
    
    # Execution
    execution_order: int = 0
    last_executed: Optional[str] = None
    execution_count: int = 0
    
    created_at: str
    updated_at: str
    created_by: str


class TeamSettings(BaseModel):
    id: str = "default"
    
    # SLA Configuration (in minutes)
    sla_timers: Dict[str, int] = {
        "critical": 60,      # 1 hour
        "high": 240,         # 4 hours
        "medium": 1440,      # 24 hours
        "low": 4320,         # 72 hours
    }
    
    # Approval Thresholds
    refund_approval_threshold: float = 100.0  # Refunds above this need approval
    payout_approval_threshold: float = 500.0
    
    # Escalation Settings
    escalation_enabled: bool = True
    escalation_intervals: Dict[str, int] = {  # minutes after SLA breach
        "level_1": 30,
        "level_2": 60,
        "level_3": 120,
    }
    escalation_targets: Dict[str, str] = {  # escalation_level -> role_id
        "level_1": "admin",
        "level_2": "super_admin",
        "level_3": "super_admin",
    }
    
    # Notifications
    email_notifications_enabled: bool = True
    in_app_notifications_enabled: bool = True
    daily_summary_enabled: bool = True
    daily_summary_time: str = "09:00"  # UTC
    
    # Security
    lockdown_mode: bool = False
    require_2fa: bool = False
    roles_requiring_2fa: List[str] = ["super_admin", "admin", "finance"]  # Roles that must have 2FA
    session_timeout_minutes: int = 480  # 8 hours
    max_failed_logins: int = 5
    
    updated_at: str
    updated_by: str


class AuditLogEntry(BaseModel):
    id: str
    timestamp: str
    
    # Actor
    actor_id: str
    actor_name: str
    actor_role: str
    actor_ip: Optional[str] = None
    actor_device: Optional[str] = None
    
    # Action
    action: str  # create, update, delete, approve, reject, login, etc
    module: str  # team_member, role, task, approval, etc
    entity_type: str
    entity_id: str
    
    # Changes
    before_state: Optional[Dict[str, Any]] = None
    after_state: Optional[Dict[str, Any]] = None
    changes_summary: Optional[str] = None
    
    # Context
    reason: Optional[str] = None
    metadata: Dict[str, Any] = {}


# ============================================================================
# SERVICE CLASS
# ============================================================================

class TeamWorkflowService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.team_members = db.team_members
        self.roles = db.team_roles
        self.tasks = db.team_tasks
        self.task_comments = db.team_task_comments
        self.approvals = db.team_approvals
        self.workflow_rules = db.team_workflow_rules
        self.settings = db.team_settings
        self.audit_log = db.team_audit_log
        self.shifts = db.team_shifts
        self.notifications = db.team_notifications

    # -------------------------------------------------------------------------
    # INITIALIZATION
    # -------------------------------------------------------------------------
    
    async def initialize_system(self):
        """Initialize default roles and settings"""
        # Create default roles
        for role_enum in CoreRole:
            existing = await self.roles.find_one({"id": role_enum.value})
            if not existing:
                now = datetime.now(timezone.utc).isoformat()
                role_data = {
                    "id": role_enum.value,
                    "name": role_enum.value.replace("_", " ").title(),
                    "description": f"System {role_enum.value.replace('_', ' ')} role",
                    "is_system": True,
                    "permissions": {k: v.value for k, v in DEFAULT_ROLE_PERMISSIONS[role_enum].items()},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "system"
                }
                await self.roles.insert_one(role_data)
                logger.info(f"Created default role: {role_enum.value}")
        
        # Create default settings
        existing_settings = await self.settings.find_one({"id": "default"}, {"_id": 0})
        if not existing_settings:
            now = datetime.now(timezone.utc).isoformat()
            settings = TeamSettings(updated_at=now, updated_by="system")
            await self.settings.insert_one(settings.dict())
            logger.info("Created default team settings")
        
        # Create default workflow rules
        default_rules = [
            {
                "name": "Auto-assign disputes to Finance",
                "description": "Automatically assign dispute tasks to Finance team",
                "trigger_type": "task_created",
                "trigger_conditions": {"type": "dispute"},
                "actions": [{"action_type": "assign_to_role", "params": {"role": "finance"}}],
            },
            {
                "name": "Auto-assign chat abuse to Moderation",
                "description": "Route chat moderation flags to moderators",
                "trigger_type": "task_created",
                "trigger_conditions": {"type": "moderation"},
                "actions": [{"action_type": "assign_to_role", "params": {"role": "moderator"}}],
            },
            {
                "name": "Escalate escrow issues to Admin",
                "description": "Escalate escrow-related tasks to senior admin",
                "trigger_type": "task_created",
                "trigger_conditions": {"source_type": "escrow"},
                "actions": [
                    {"action_type": "set_priority", "params": {"priority": "high"}},
                    {"action_type": "assign_to_role", "params": {"role": "admin"}}
                ],
            },
            {
                "name": "Route transport delays to Operations",
                "description": "Assign transport delay tasks to operations team",
                "trigger_type": "task_created",
                "trigger_conditions": {"source_type": "transport_delay"},
                "actions": [{"action_type": "assign_to_role", "params": {"role": "operations"}}],
            },
        ]
        
        for rule_data in default_rules:
            existing = await self.workflow_rules.find_one({"name": rule_data["name"]})
            if not existing:
                now = datetime.now(timezone.utc).isoformat()
                rule = {
                    "id": str(uuid.uuid4()),
                    **rule_data,
                    "is_active": True,
                    "execution_order": 0,
                    "last_executed": None,
                    "execution_count": 0,
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "system"
                }
                await self.workflow_rules.insert_one(rule)
                logger.info(f"Created default workflow rule: {rule_data['name']}")

    # -------------------------------------------------------------------------
    # AUDIT LOGGING
    # -------------------------------------------------------------------------
    
    async def log_audit(
        self,
        actor_id: str,
        actor_name: str,
        actor_role: str,
        action: str,
        module: str,
        entity_type: str,
        entity_id: str,
        before_state: Optional[Dict] = None,
        after_state: Optional[Dict] = None,
        reason: Optional[str] = None,
        actor_ip: Optional[str] = None,
        metadata: Dict = {}
    ):
        """Create immutable audit log entry"""
        changes_summary = None
        if before_state and after_state:
            changes = []
            for key in set(list(before_state.keys()) + list(after_state.keys())):
                old_val = before_state.get(key)
                new_val = after_state.get(key)
                if old_val != new_val:
                    changes.append(f"{key}: {old_val} → {new_val}")
            changes_summary = "; ".join(changes) if changes else None
        
        entry = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "actor_id": actor_id,
            "actor_name": actor_name,
            "actor_role": actor_role,
            "actor_ip": actor_ip,
            "action": action,
            "module": module,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "before_state": before_state,
            "after_state": after_state,
            "changes_summary": changes_summary,
            "reason": reason,
            "metadata": metadata
        }
        
        await self.audit_log.insert_one(entry)
        return entry

    # -------------------------------------------------------------------------
    # TEAM MEMBERS
    # -------------------------------------------------------------------------
    
    async def get_team_members(
        self,
        role_id: Optional[str] = None,
        status: Optional[str] = None,
        department: Optional[str] = None
    ) -> List[Dict]:
        """Get all team members with optional filters"""
        query = {}
        if role_id:
            query["role_id"] = role_id
        if status:
            query["status"] = status
        if department:
            query["department"] = department
        
        members = await self.team_members.find(
            query, {"_id": 0, "password_hash": 0, "two_factor_secret": 0}
        ).sort("name", 1).to_list(length=500)
        
        # Enrich with role info
        for member in members:
            role = await self.roles.find_one({"id": member["role_id"]}, {"_id": 0})
            member["role"] = role
        
        return members
    
    async def get_team_member(self, member_id: str) -> Optional[Dict]:
        """Get a specific team member"""
        member = await self.team_members.find_one(
            {"id": member_id}, {"_id": 0, "password_hash": 0, "two_factor_secret": 0}
        )
        if member:
            role = await self.roles.find_one({"id": member["role_id"]}, {"_id": 0})
            member["role"] = role
        return member
    
    async def create_team_member(
        self,
        email: str,
        name: str,
        role_id: str,
        created_by: str,
        password: Optional[str] = None,
        department: Optional[str] = None,
        phone: Optional[str] = None,
        sandbox_only: bool = False,
        actor_info: Dict = {}
    ) -> Dict:
        """Create a new team member"""
        # Verify role exists
        role = await self.roles.find_one({"id": role_id}, {"_id": 0})
        if not role:
            raise HTTPException(status_code=400, detail="Invalid role_id")
        
        # Check for duplicate email
        existing = await self.team_members.find_one({"email": email}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Hash password if provided
        password_hash = None
        if password:
            password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        member = {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": name,
            "role_id": role_id,
            "is_custom_role": not role.get("is_system", False),
            "status": "active",
            "phone": phone,
            "department": department,
            "password_hash": password_hash,
            "two_factor_enabled": False,
            "sandbox_only": sandbox_only,
            "created_at": now,
            "updated_at": now,
            "created_by": created_by
        }
        
        await self.team_members.insert_one(member.copy())
        
        # Audit log
        await self.log_audit(
            actor_id=actor_info.get("id", created_by),
            actor_name=actor_info.get("name", created_by),
            actor_role=actor_info.get("role", "system"),
            action="create",
            module="team_management",
            entity_type="team_member",
            entity_id=member["id"],
            after_state={"email": email, "name": name, "role": role_id},
            actor_ip=actor_info.get("ip")
        )
        
        # Remove sensitive fields
        member.pop("password_hash", None)
        member["role"] = role
        
        return member
    
    async def update_team_member(
        self,
        member_id: str,
        updates: Dict[str, Any],
        updated_by: str,
        actor_info: Dict = {}
    ) -> Optional[Dict]:
        """Update a team member"""
        member = await self.team_members.find_one({"id": member_id}, {"_id": 0})
        if not member:
            return None
        
        before_state = {k: v for k, v in member.items() if k not in ["password_hash", "two_factor_secret", "_id"]}
        
        # Handle password update
        if "password" in updates:
            updates["password_hash"] = hashlib.sha256(updates.pop("password").encode()).hexdigest()
        
        # Prevent updating certain fields
        updates.pop("id", None)
        updates.pop("created_at", None)
        updates.pop("created_by", None)
        
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await self.team_members.update_one({"id": member_id}, {"$set": updates})
        
        updated = await self.get_team_member(member_id)
        
        # Audit log
        await self.log_audit(
            actor_id=actor_info.get("id", updated_by),
            actor_name=actor_info.get("name", updated_by),
            actor_role=actor_info.get("role", "system"),
            action="update",
            module="team_management",
            entity_type="team_member",
            entity_id=member_id,
            before_state=before_state,
            after_state={k: v for k, v in updated.items() if k != "role"},
            actor_ip=actor_info.get("ip")
        )
        
        return updated
    
    async def deactivate_team_member(
        self,
        member_id: str,
        deactivated_by: str,
        reason: Optional[str] = None,
        actor_info: Dict = {}
    ) -> bool:
        """Deactivate a team member"""
        member = await self.team_members.find_one({"id": member_id}, {"_id": 0})
        if not member:
            return False
        
        await self.team_members.update_one(
            {"id": member_id},
            {"$set": {"status": "inactive", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        await self.log_audit(
            actor_id=actor_info.get("id", deactivated_by),
            actor_name=actor_info.get("name", deactivated_by),
            actor_role=actor_info.get("role", "system"),
            action="deactivate",
            module="team_management",
            entity_type="team_member",
            entity_id=member_id,
            before_state={"status": member.get("status")},
            after_state={"status": "inactive"},
            reason=reason,
            actor_ip=actor_info.get("ip")
        )
        
        return True

    # -------------------------------------------------------------------------
    # ROLES & PERMISSIONS
    # -------------------------------------------------------------------------
    
    async def get_roles(self) -> List[Dict]:
        """Get all roles"""
        return await self.roles.find({}, {"_id": 0}).sort("name", 1).to_list(length=100)
    
    async def get_role(self, role_id: str) -> Optional[Dict]:
        """Get a specific role"""
        return await self.roles.find_one({"id": role_id}, {"_id": 0})
    
    async def create_role(
        self,
        name: str,
        description: str,
        permissions: Dict[str, str],
        created_by: str,
        actor_info: Dict = {}
    ) -> Dict:
        """Create a custom role"""
        # Validate permissions
        for module in permissions:
            if module not in PERMISSION_MODULES:
                raise HTTPException(status_code=400, detail=f"Invalid module: {module}")
            if permissions[module] not in [p.value for p in PermissionLevel]:
                raise HTTPException(status_code=400, detail=f"Invalid permission level: {permissions[module]}")
        
        now = datetime.now(timezone.utc).isoformat()
        role = {
            "id": str(uuid.uuid4()),
            "name": name,
            "description": description,
            "is_system": False,
            "permissions": permissions,
            "created_at": now,
            "updated_at": now,
            "created_by": created_by
        }
        
        await self.roles.insert_one(role.copy())
        
        await self.log_audit(
            actor_id=actor_info.get("id", created_by),
            actor_name=actor_info.get("name", created_by),
            actor_role=actor_info.get("role", "system"),
            action="create",
            module="team_management",
            entity_type="role",
            entity_id=role["id"],
            after_state=role,
            actor_ip=actor_info.get("ip")
        )
        
        return role
    
    async def update_role(
        self,
        role_id: str,
        updates: Dict[str, Any],
        updated_by: str,
        actor_info: Dict = {}
    ) -> Optional[Dict]:
        """Update a role (system roles have limited updates)"""
        role = await self.roles.find_one({"id": role_id})
        if not role:
            return None
        
        before_state = {k: v for k, v in role.items() if k != "_id"}
        
        # System roles can only update permissions, not name/description
        if role.get("is_system"):
            updates = {k: v for k, v in updates.items() if k == "permissions"}
        
        updates.pop("id", None)
        updates.pop("is_system", None)
        updates.pop("created_at", None)
        updates.pop("created_by", None)
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await self.roles.update_one({"id": role_id}, {"$set": updates})
        
        updated = await self.get_role(role_id)
        
        await self.log_audit(
            actor_id=actor_info.get("id", updated_by),
            actor_name=actor_info.get("name", updated_by),
            actor_role=actor_info.get("role", "system"),
            action="update",
            module="team_management",
            entity_type="role",
            entity_id=role_id,
            before_state=before_state,
            after_state=updated,
            actor_ip=actor_info.get("ip")
        )
        
        return updated
    
    async def delete_role(self, role_id: str, actor_info: Dict = {}) -> bool:
        """Delete a custom role (system roles cannot be deleted)"""
        role = await self.roles.find_one({"id": role_id})
        if not role:
            return False
        
        if role.get("is_system"):
            raise HTTPException(status_code=403, detail="System roles cannot be deleted")
        
        # Check if any members have this role
        members_count = await self.team_members.count_documents({"role_id": role_id})
        if members_count > 0:
            raise HTTPException(status_code=400, detail=f"Cannot delete role with {members_count} assigned members")
        
        await self.roles.delete_one({"id": role_id})
        
        await self.log_audit(
            actor_id=actor_info.get("id", "system"),
            actor_name=actor_info.get("name", "system"),
            actor_role=actor_info.get("role", "system"),
            action="delete",
            module="team_management",
            entity_type="role",
            entity_id=role_id,
            before_state=role,
            actor_ip=actor_info.get("ip")
        )
        
        return True
    
    async def check_permission(
        self,
        member_id: str,
        module: str,
        required_level: PermissionLevel
    ) -> bool:
        """Check if a team member has required permission level"""
        member = await self.team_members.find_one({"id": member_id}, {"_id": 0})
        if not member or member.get("status") != "active":
            return False
        
        role = await self.roles.find_one({"id": member["role_id"]})
        if not role:
            return False
        
        member_level = role.get("permissions", {}).get(module, PermissionLevel.NONE.value)
        
        # Permission hierarchy: override > approve > write > read > none
        level_hierarchy = {
            PermissionLevel.NONE.value: 0,
            PermissionLevel.READ.value: 1,
            PermissionLevel.WRITE.value: 2,
            PermissionLevel.APPROVE.value: 3,
            PermissionLevel.OVERRIDE.value: 4,
        }
        
        return level_hierarchy.get(member_level, 0) >= level_hierarchy.get(required_level.value, 0)

    # -------------------------------------------------------------------------
    # TASKS
    # -------------------------------------------------------------------------
    
    async def get_tasks(
        self,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        task_type: Optional[str] = None,
        assigned_to: Optional[str] = None,
        assigned_team: Optional[str] = None,
        created_by: Optional[str] = None,
        sla_breached: Optional[bool] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict]:
        """Get tasks with filters"""
        query = {}
        if status:
            query["status"] = status
        if priority:
            query["priority"] = priority
        if task_type:
            query["type"] = task_type
        if assigned_to:
            query["assigned_to"] = assigned_to
        if assigned_team:
            query["assigned_team"] = assigned_team
        if created_by:
            query["created_by"] = created_by
        if sla_breached is not None:
            query["sla_breached"] = sla_breached
        
        tasks = await self.tasks.find(query, {"_id": 0}).sort(
            [("priority", -1), ("created_at", -1)]
        ).skip(skip).limit(limit).to_list(length=limit)
        
        # Enrich with assignee info
        for task in tasks:
            if task.get("assigned_to"):
                assignee = await self.team_members.find_one(
                    {"id": task["assigned_to"]}, {"_id": 0, "id": 1, "name": 1, "email": 1}
                )
                task["assignee"] = assignee
        
        return tasks
    
    async def get_task(self, task_id: str) -> Optional[Dict]:
        """Get a specific task with comments"""
        task = await self.tasks.find_one({"id": task_id}, {"_id": 0})
        if task:
            # Get comments
            comments = await self.task_comments.find(
                {"task_id": task_id}, {"_id": 0}
            ).sort("created_at", 1).to_list(length=500)
            task["comments"] = comments
            
            # Get assignee info
            if task.get("assigned_to"):
                assignee = await self.team_members.find_one(
                    {"id": task["assigned_to"]}, {"_id": 0, "id": 1, "name": 1, "email": 1}
                )
                task["assignee"] = assignee
        
        return task
    
    async def create_task(
        self,
        title: str,
        description: str,
        task_type: TaskType,
        priority: TaskPriority,
        created_by: str,
        source_type: Optional[str] = None,
        source_id: Optional[str] = None,
        source_data: Optional[Dict] = None,
        assigned_to: Optional[str] = None,
        tags: List[str] = [],
        actor_info: Dict = {}
    ) -> Dict:
        """Create a new task"""
        now = datetime.now(timezone.utc)
        
        # Calculate SLA deadline
        settings = await self.settings.find_one({"id": "default"}, {"_id": 0})
        sla_minutes = settings.get("sla_timers", {}).get(priority.value, 1440) if settings else 1440
        sla_deadline = (now + timedelta(minutes=sla_minutes)).isoformat()
        
        task = {
            "id": str(uuid.uuid4()),
            "title": title,
            "description": description,
            "type": task_type.value,
            "priority": priority.value,
            "status": TaskStatus.OPEN.value,
            "assigned_to": assigned_to,
            "assigned_team": None,
            "created_by": created_by,
            "source_type": source_type,
            "source_id": source_id,
            "source_data": source_data,
            "sla_deadline": sla_deadline,
            "sla_breached": False,
            "escalation_level": 0,
            "tags": tags,
            "attachments": [],
            "watchers": [],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        
        await self.tasks.insert_one(task.copy())
        
        # Apply workflow rules
        await self._apply_workflow_rules(task)
        
        # Re-fetch to get updated task
        task = await self.get_task(task["id"])
        
        await self.log_audit(
            actor_id=actor_info.get("id", created_by),
            actor_name=actor_info.get("name", created_by),
            actor_role=actor_info.get("role", "system"),
            action="create",
            module="tasks",
            entity_type="task",
            entity_id=task["id"],
            after_state={"title": title, "type": task_type.value, "priority": priority.value},
            actor_ip=actor_info.get("ip")
        )
        
        return task
    
    async def update_task(
        self,
        task_id: str,
        updates: Dict[str, Any],
        updated_by: str,
        actor_info: Dict = {}
    ) -> Optional[Dict]:
        """Update a task"""
        task = await self.tasks.find_one({"id": task_id}, {"_id": 0})
        if not task:
            return None
        
        before_state = {k: v for k, v in task.items() if k != "_id"}
        
        updates.pop("id", None)
        updates.pop("created_at", None)
        updates.pop("created_by", None)
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Handle status changes
        if updates.get("status") == TaskStatus.RESOLVED.value and not task.get("resolved_at"):
            updates["resolved_at"] = datetime.now(timezone.utc).isoformat()
            updates["resolved_by"] = updated_by
        
        await self.tasks.update_one({"id": task_id}, {"$set": updates})
        
        updated = await self.get_task(task_id)
        
        await self.log_audit(
            actor_id=actor_info.get("id", updated_by),
            actor_name=actor_info.get("name", updated_by),
            actor_role=actor_info.get("role", "system"),
            action="update",
            module="tasks",
            entity_type="task",
            entity_id=task_id,
            before_state=before_state,
            after_state={k: v for k, v in updated.items() if k not in ["comments", "assignee"]},
            actor_ip=actor_info.get("ip")
        )
        
        return updated
    
    async def assign_task(
        self,
        task_id: str,
        assigned_to: str,
        assigned_by: str,
        actor_info: Dict = {}
    ) -> Optional[Dict]:
        """Assign a task to a team member"""
        task = await self.tasks.find_one({"id": task_id}, {"_id": 0})
        if not task:
            return None
        
        # Verify assignee exists
        assignee = await self.team_members.find_one({"id": assigned_to}, {"_id": 0})
        if not assignee:
            raise HTTPException(status_code=400, detail="Invalid team member ID")
        
        before_assigned = task.get("assigned_to")
        
        await self.tasks.update_one(
            {"id": task_id},
            {"$set": {
                "assigned_to": assigned_to,
                "assigned_team": assignee.get("role_id"),
                "status": TaskStatus.IN_PROGRESS.value if task["status"] == TaskStatus.OPEN.value else task["status"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        updated = await self.get_task(task_id)
        
        await self.log_audit(
            actor_id=actor_info.get("id", assigned_by),
            actor_name=actor_info.get("name", assigned_by),
            actor_role=actor_info.get("role", "system"),
            action="assign",
            module="tasks",
            entity_type="task",
            entity_id=task_id,
            before_state={"assigned_to": before_assigned},
            after_state={"assigned_to": assigned_to, "assigned_name": assignee["name"]},
            actor_ip=actor_info.get("ip")
        )
        
        # Create notification for assignee
        await self._create_notification(
            member_id=assigned_to,
            title="New Task Assigned",
            message=f"You have been assigned task: {task['title']}",
            link=f"/dashboard/team-management/tasks/{task_id}"
        )
        
        return updated
    
    async def add_task_comment(
        self,
        task_id: str,
        author_id: str,
        content: str,
        mentions: List[str] = [],
        attachments: List[Dict] = []
    ) -> Dict:
        """Add internal comment to a task"""
        task = await self.tasks.find_one({"id": task_id}, {"_id": 0})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        author = await self.team_members.find_one({"id": author_id}, {"_id": 0})
        if not author:
            raise HTTPException(status_code=404, detail="Author not found")
        
        comment = {
            "id": str(uuid.uuid4()),
            "task_id": task_id,
            "author_id": author_id,
            "author_name": author["name"],
            "content": content,
            "mentions": mentions,
            "attachments": attachments,
            "is_internal": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.task_comments.insert_one(comment.copy())
        
        # Notify mentioned team members
        for member_id in mentions:
            await self._create_notification(
                member_id=member_id,
                title="You were mentioned",
                message=f"{author['name']} mentioned you in task: {task['title']}",
                link=f"/dashboard/team-management/tasks/{task_id}"
            )
        
        return comment
    
    async def _apply_workflow_rules(self, task: Dict):
        """Apply workflow automation rules to a task"""
        rules = await self.workflow_rules.find(
            {"is_active": True, "trigger_type": "task_created"}
        ).sort("execution_order", 1).to_list(length=100)
        
        for rule in rules:
            if self._matches_conditions(task, rule.get("trigger_conditions", {})):
                await self._execute_rule_actions(task, rule)
                
                # Update rule execution stats
                await self.workflow_rules.update_one(
                    {"id": rule["id"]},
                    {
                        "$set": {"last_executed": datetime.now(timezone.utc).isoformat()},
                        "$inc": {"execution_count": 1}
                    }
                )
    
    def _matches_conditions(self, task: Dict, conditions: Dict) -> bool:
        """Check if task matches rule conditions"""
        for field, value in conditions.items():
            if task.get(field) != value:
                return False
        return True
    
    async def _execute_rule_actions(self, task: Dict, rule: Dict):
        """Execute workflow rule actions"""
        for action in rule.get("actions", []):
            action_type = action.get("action_type")
            params = action.get("params", {})
            
            if action_type == "assign_to_role":
                # Find an available team member with this role
                role_id = params.get("role")
                member = await self.team_members.find_one({
                    "role_id": role_id,
                    "status": "active"
                })
                if member:
                    await self.tasks.update_one(
                        {"id": task["id"]},
                        {"$set": {"assigned_to": member["id"], "assigned_team": role_id}}
                    )
            
            elif action_type == "set_priority":
                await self.tasks.update_one(
                    {"id": task["id"]},
                    {"$set": {"priority": params.get("priority", task["priority"])}}
                )
            
            elif action_type == "assign_to_member":
                member_id = params.get("member_id")
                if member_id:
                    await self.tasks.update_one(
                        {"id": task["id"]},
                        {"$set": {"assigned_to": member_id}}
                    )

    # -------------------------------------------------------------------------
    # APPROVALS
    # -------------------------------------------------------------------------
    
    async def get_approvals(
        self,
        status: Optional[str] = None,
        approval_type: Optional[str] = None,
        requester_id: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """Get approval requests"""
        query = {}
        if status:
            query["status"] = status
        if approval_type:
            query["type"] = approval_type
        if requester_id:
            query["requester_id"] = requester_id
        
        return await self.approvals.find(query, {"_id": 0}).sort(
            [("priority", -1), ("created_at", -1)]
        ).limit(limit).to_list(length=limit)
    
    async def get_approval(self, approval_id: str) -> Optional[Dict]:
        """Get a specific approval request"""
        return await self.approvals.find_one({"id": approval_id}, {"_id": 0})
    
    async def create_approval_request(
        self,
        approval_type: ApprovalType,
        title: str,
        description: str,
        requester_id: str,
        requester_name: str,
        request_data: Dict[str, Any],
        target_entity_type: Optional[str] = None,
        target_entity_id: Optional[str] = None,
        required_approvers: List[str] = [],
        required_approval_count: int = 1,
        priority: TaskPriority = TaskPriority.MEDIUM,
        actor_info: Dict = {}
    ) -> Dict:
        """Create an approval request"""
        now = datetime.now(timezone.utc).isoformat()
        
        approval = {
            "id": str(uuid.uuid4()),
            "type": approval_type.value,
            "title": title,
            "description": description,
            "requester_id": requester_id,
            "requester_name": requester_name,
            "target_entity_type": target_entity_type,
            "target_entity_id": target_entity_id,
            "request_data": request_data,
            "required_approvers": required_approvers,
            "approvals": [],
            "rejections": [],
            "required_approval_count": required_approval_count,
            "status": ApprovalStatus.PENDING.value,
            "priority": priority.value,
            "created_at": now,
            "updated_at": now,
        }
        
        await self.approvals.insert_one(approval.copy())
        
        # Notify required approvers
        for approver_id in required_approvers:
            await self._create_notification(
                member_id=approver_id,
                title="Approval Required",
                message=f"New approval request: {title}",
                link=f"/dashboard/team-management/approvals/{approval['id']}"
            )
        
        await self.log_audit(
            actor_id=actor_info.get("id", requester_id),
            actor_name=actor_info.get("name", requester_name),
            actor_role=actor_info.get("role", "system"),
            action="create",
            module="approvals",
            entity_type="approval_request",
            entity_id=approval["id"],
            after_state={"type": approval_type.value, "title": title},
            actor_ip=actor_info.get("ip")
        )
        
        return approval
    
    async def approve_request(
        self,
        approval_id: str,
        approver_id: str,
        approver_name: str,
        notes: Optional[str] = None,
        actor_info: Dict = {}
    ) -> Optional[Dict]:
        """Approve an approval request"""
        approval = await self.approvals.find_one({"id": approval_id}, {"_id": 0})
        if not approval:
            return None
        
        if approval["status"] != ApprovalStatus.PENDING.value:
            raise HTTPException(status_code=400, detail="Approval is no longer pending")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Add approval
        approval_entry = {
            "approver_id": approver_id,
            "approver_name": approver_name,
            "approved_at": now,
            "notes": notes
        }
        
        new_approvals = approval.get("approvals", []) + [approval_entry]
        
        # Check if enough approvals
        new_status = ApprovalStatus.PENDING.value
        completed_at = None
        if len(new_approvals) >= approval.get("required_approval_count", 1):
            new_status = ApprovalStatus.APPROVED.value
            completed_at = now
        
        await self.approvals.update_one(
            {"id": approval_id},
            {"$set": {
                "approvals": new_approvals,
                "status": new_status,
                "updated_at": now,
                "completed_at": completed_at
            }}
        )
        
        updated = await self.get_approval(approval_id)
        
        await self.log_audit(
            actor_id=actor_info.get("id", approver_id),
            actor_name=actor_info.get("name", approver_name),
            actor_role=actor_info.get("role", "system"),
            action="approve",
            module="approvals",
            entity_type="approval_request",
            entity_id=approval_id,
            before_state={"status": approval["status"]},
            after_state={"status": new_status, "approver": approver_name},
            actor_ip=actor_info.get("ip")
        )
        
        # Notify requester if approved
        if new_status == ApprovalStatus.APPROVED.value:
            await self._create_notification(
                member_id=approval["requester_id"],
                title="Request Approved",
                message=f"Your request '{approval['title']}' has been approved",
                link=f"/dashboard/team-management/approvals/{approval_id}"
            )
        
        return updated
    
    async def reject_request(
        self,
        approval_id: str,
        rejector_id: str,
        rejector_name: str,
        reason: str,
        actor_info: Dict = {}
    ) -> Optional[Dict]:
        """Reject an approval request"""
        approval = await self.approvals.find_one({"id": approval_id}, {"_id": 0})
        if not approval:
            return None
        
        if approval["status"] != ApprovalStatus.PENDING.value:
            raise HTTPException(status_code=400, detail="Approval is no longer pending")
        
        now = datetime.now(timezone.utc).isoformat()
        
        rejection_entry = {
            "rejector_id": rejector_id,
            "rejector_name": rejector_name,
            "rejected_at": now,
            "reason": reason
        }
        
        await self.approvals.update_one(
            {"id": approval_id},
            {"$set": {
                "rejections": approval.get("rejections", []) + [rejection_entry],
                "status": ApprovalStatus.REJECTED.value,
                "updated_at": now,
                "completed_at": now
            }}
        )
        
        updated = await self.get_approval(approval_id)
        
        await self.log_audit(
            actor_id=actor_info.get("id", rejector_id),
            actor_name=actor_info.get("name", rejector_name),
            actor_role=actor_info.get("role", "system"),
            action="reject",
            module="approvals",
            entity_type="approval_request",
            entity_id=approval_id,
            before_state={"status": approval["status"]},
            after_state={"status": ApprovalStatus.REJECTED.value, "rejector": rejector_name, "reason": reason},
            actor_ip=actor_info.get("ip")
        )
        
        # Notify requester
        await self._create_notification(
            member_id=approval["requester_id"],
            title="Request Rejected",
            message=f"Your request '{approval['title']}' has been rejected: {reason}",
            link=f"/dashboard/team-management/approvals/{approval_id}"
        )
        
        return updated

    # -------------------------------------------------------------------------
    # WORKFLOW RULES
    # -------------------------------------------------------------------------
    
    async def get_workflow_rules(self) -> List[Dict]:
        """Get all workflow rules"""
        return await self.workflow_rules.find({}, {"_id": 0}).sort("execution_order", 1).to_list(length=100)
    
    async def create_workflow_rule(
        self,
        name: str,
        description: str,
        trigger_type: str,
        trigger_conditions: Dict[str, Any],
        actions: List[Dict[str, Any]],
        created_by: str,
        actor_info: Dict = {}
    ) -> Dict:
        """Create a workflow automation rule"""
        now = datetime.now(timezone.utc).isoformat()
        
        rule = {
            "id": str(uuid.uuid4()),
            "name": name,
            "description": description,
            "is_active": True,
            "trigger_type": trigger_type,
            "trigger_conditions": trigger_conditions,
            "actions": actions,
            "execution_order": 0,
            "last_executed": None,
            "execution_count": 0,
            "created_at": now,
            "updated_at": now,
            "created_by": created_by
        }
        
        await self.workflow_rules.insert_one(rule.copy())
        
        return rule
    
    async def update_workflow_rule(
        self,
        rule_id: str,
        updates: Dict[str, Any],
        updated_by: str
    ) -> Optional[Dict]:
        """Update a workflow rule"""
        rule = await self.workflow_rules.find_one({"id": rule_id}, {"_id": 0})
        if not rule:
            return None
        
        updates.pop("id", None)
        updates.pop("created_at", None)
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await self.workflow_rules.update_one({"id": rule_id}, {"$set": updates})
        
        return await self.workflow_rules.find_one({"id": rule_id}, {"_id": 0})
    
    async def delete_workflow_rule(self, rule_id: str) -> bool:
        """Delete a workflow rule"""
        result = await self.workflow_rules.delete_one({"id": rule_id})
        return result.deleted_count > 0

    # -------------------------------------------------------------------------
    # SETTINGS
    # -------------------------------------------------------------------------
    
    async def get_settings(self) -> Dict:
        """Get team settings"""
        settings = await self.settings.find_one({"id": "default"}, {"_id": 0})
        if not settings:
            now = datetime.now(timezone.utc).isoformat()
            settings = TeamSettings(updated_at=now, updated_by="system").dict()
            await self.settings.insert_one(settings)
        return settings
    
    async def update_settings(
        self,
        updates: Dict[str, Any],
        updated_by: str,
        actor_info: Dict = {}
    ) -> Dict:
        """Update team settings"""
        current = await self.get_settings()
        before_state = current.copy()
        
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        updates["updated_by"] = updated_by
        
        await self.settings.update_one({"id": "default"}, {"$set": updates})
        
        updated = await self.get_settings()
        
        await self.log_audit(
            actor_id=actor_info.get("id", updated_by),
            actor_name=actor_info.get("name", updated_by),
            actor_role=actor_info.get("role", "system"),
            action="update",
            module="settings",
            entity_type="team_settings",
            entity_id="default",
            before_state=before_state,
            after_state=updated,
            actor_ip=actor_info.get("ip")
        )
        
        return updated

    # -------------------------------------------------------------------------
    # AUDIT LOG
    # -------------------------------------------------------------------------
    
    async def get_audit_logs(
        self,
        module: Optional[str] = None,
        actor_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        action: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """Get audit log entries"""
        query = {}
        if module:
            query["module"] = module
        if actor_id:
            query["actor_id"] = actor_id
        if entity_type:
            query["entity_type"] = entity_type
        if action:
            query["action"] = action
        if start_date:
            query["timestamp"] = {"$gte": start_date}
        if end_date:
            query.setdefault("timestamp", {})["$lte"] = end_date
        
        return await self.audit_log.find(query, {"_id": 0}).sort(
            "timestamp", -1
        ).limit(limit).to_list(length=limit)

    # -------------------------------------------------------------------------
    # DASHBOARD & METRICS
    # -------------------------------------------------------------------------
    
    async def get_dashboard_metrics(self) -> Dict:
        """Get team activity dashboard metrics"""
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        
        # Task counts by status
        task_stats = {}
        for status in TaskStatus:
            count = await self.tasks.count_documents({"status": status.value})
            task_stats[status.value] = count
        
        # Tasks by priority
        priority_stats = {}
        for priority in TaskPriority:
            count = await self.tasks.count_documents({
                "status": {"$nin": [TaskStatus.CLOSED.value, TaskStatus.RESOLVED.value]},
                "priority": priority.value
            })
            priority_stats[priority.value] = count
        
        # SLA breaches
        sla_breached_count = await self.tasks.count_documents({
            "status": {"$nin": [TaskStatus.CLOSED.value, TaskStatus.RESOLVED.value]},
            "sla_breached": True
        })
        
        # Pending approvals
        pending_approvals = await self.approvals.count_documents({
            "status": ApprovalStatus.PENDING.value
        })
        
        # Active team members
        active_members = await self.team_members.count_documents({"status": "active"})
        
        # Tasks created today
        tasks_today = await self.tasks.count_documents({
            "created_at": {"$gte": today_start.isoformat()}
        })
        
        # Tasks resolved this week
        resolved_week = await self.tasks.count_documents({
            "resolved_at": {"$gte": week_start.isoformat()}
        })
        
        # Tasks per team/role
        tasks_by_team = []
        roles = await self.roles.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(length=20)
        for role in roles:
            open_count = await self.tasks.count_documents({
                "assigned_team": role["id"],
                "status": {"$nin": [TaskStatus.CLOSED.value, TaskStatus.RESOLVED.value]}
            })
            tasks_by_team.append({
                "role_id": role["id"],
                "role_name": role["name"],
                "open_tasks": open_count
            })
        
        # Recent activity
        recent_actions = await self.audit_log.find(
            {}, {"_id": 0}
        ).sort("timestamp", -1).limit(10).to_list(length=10)
        
        return {
            "task_stats": task_stats,
            "priority_stats": priority_stats,
            "sla_breached_count": sla_breached_count,
            "pending_approvals": pending_approvals,
            "active_members": active_members,
            "tasks_today": tasks_today,
            "resolved_this_week": resolved_week,
            "tasks_by_team": tasks_by_team,
            "recent_activity": recent_actions,
            "generated_at": now.isoformat()
        }

    # -------------------------------------------------------------------------
    # NOTIFICATIONS
    # -------------------------------------------------------------------------
    
    async def _create_notification(
        self,
        member_id: str,
        title: str,
        message: str,
        link: Optional[str] = None,
        priority: str = "normal"
    ):
        """Create an in-app notification"""
        notification = {
            "id": str(uuid.uuid4()),
            "member_id": member_id,
            "title": title,
            "message": message,
            "link": link,
            "priority": priority,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await self.notifications.insert_one(notification)
    
    async def get_notifications(
        self,
        member_id: str,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict]:
        """Get notifications for a team member"""
        query = {"member_id": member_id}
        if unread_only:
            query["read"] = False
        
        return await self.notifications.find(query, {"_id": 0}).sort(
            "created_at", -1
        ).limit(limit).to_list(length=limit)
    
    async def mark_notification_read(self, notification_id: str) -> bool:
        """Mark a notification as read"""
        result = await self.notifications.update_one(
            {"id": notification_id},
            {"$set": {"read": True}}
        )
        return result.modified_count > 0
    
    async def mark_all_notifications_read(self, member_id: str) -> int:
        """Mark all notifications as read for a member"""
        result = await self.notifications.update_many(
            {"member_id": member_id, "read": False},
            {"$set": {"read": True}}
        )
        return result.modified_count

    # -------------------------------------------------------------------------
    # SHIFT & AVAILABILITY
    # -------------------------------------------------------------------------
    
    async def get_shifts(self, member_id: Optional[str] = None, date: Optional[str] = None) -> List[Dict]:
        """Get shift schedules"""
        query = {}
        if member_id:
            query["member_id"] = member_id
        if date:
            query["date"] = date
        
        return await self.shifts.find(query, {"_id": 0}).sort("date", 1).to_list(length=500)
    
    async def create_shift(
        self,
        member_id: str,
        date: str,
        start_time: str,
        end_time: str,
        shift_type: str = "regular",  # regular, on_call, off
        notes: Optional[str] = None,
        created_by: str = "system"
    ) -> Dict:
        """Create a shift schedule"""
        shift = {
            "id": str(uuid.uuid4()),
            "member_id": member_id,
            "date": date,
            "start_time": start_time,
            "end_time": end_time,
            "shift_type": shift_type,
            "notes": notes,
            "created_by": created_by,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await self.shifts.insert_one(shift.copy())
        return shift
    
    async def update_shift(self, shift_id: str, updates: Dict[str, Any]) -> Optional[Dict]:
        """Update a shift"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await self.shifts.update_one({"id": shift_id}, {"$set": updates})
        return await self.shifts.find_one({"id": shift_id}, {"_id": 0})
    
    async def delete_shift(self, shift_id: str) -> bool:
        """Delete a shift"""
        result = await self.shifts.delete_one({"id": shift_id})
        return result.deleted_count > 0
    
    async def get_on_call_members(self) -> List[Dict]:
        """Get currently on-call team members"""
        now = datetime.now(timezone.utc)
        today = now.strftime("%Y-%m-%d")
        current_time = now.strftime("%H:%M")
        
        # Find members with on_call shifts for today
        on_call_shifts = await self.shifts.find({
            "date": today,
            "shift_type": "on_call",
            "start_time": {"$lte": current_time},
            "end_time": {"$gte": current_time}
        }, {"_id": 0}).to_list(length=50)
        
        member_ids = [s["member_id"] for s in on_call_shifts]
        
        if not member_ids:
            # Fallback to members marked as on_call
            members = await self.team_members.find(
                {"is_on_call": True, "status": "active"}, {"_id": 0, "password_hash": 0}
            ).to_list(length=50)
            return members
        
        members = await self.team_members.find(
            {"id": {"$in": member_ids}, "status": "active"}, {"_id": 0, "password_hash": 0}
        ).to_list(length=50)
        
        return members
    
    async def set_on_call_status(self, member_id: str, is_on_call: bool) -> bool:
        """Set a member's on-call status"""
        result = await self.team_members.update_one(
            {"id": member_id},
            {"$set": {"is_on_call": is_on_call, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return result.modified_count > 0
    
    async def get_available_members_for_assignment(self, role_id: Optional[str] = None) -> List[Dict]:
        """Get available team members for task assignment based on shift schedule"""
        now = datetime.now(timezone.utc)
        today = now.strftime("%Y-%m-%d")
        current_time = now.strftime("%H:%M")
        
        # Get members with active shifts today
        active_shifts = await self.shifts.find({
            "date": today,
            "shift_type": {"$in": ["regular", "on_call"]},
            "start_time": {"$lte": current_time},
            "end_time": {"$gte": current_time}
        }, {"_id": 0}).to_list(length=100)
        
        member_ids = [s["member_id"] for s in active_shifts]
        
        query = {"status": "active", "sandbox_only": False}
        if member_ids:
            query["id"] = {"$in": member_ids}
        if role_id:
            query["role_id"] = role_id
        
        members = await self.team_members.find(
            query, {"_id": 0, "password_hash": 0, "two_factor_secret": 0}
        ).to_list(length=100)
        
        return members

    # -------------------------------------------------------------------------
    # TWO-FACTOR AUTHENTICATION (2FA)
    # -------------------------------------------------------------------------
    
    async def setup_2fa(self, member_id: str) -> Dict:
        """Generate 2FA secret for a team member"""
        import pyotp
        import base64
        
        member = await self.team_members.find_one({"id": member_id}, {"_id": 0})
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        
        # Generate secret
        secret = pyotp.random_base32()
        
        # Store encrypted secret (in production, use proper encryption)
        await self.team_members.update_one(
            {"id": member_id},
            {"$set": {
                "two_factor_secret": secret,
                "two_factor_enabled": False,  # Not enabled until verified
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Generate provisioning URI for QR code
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=member.get("email"),
            issuer_name="Admin Dashboard"
        )
        
        return {
            "secret": secret,
            "provisioning_uri": provisioning_uri,
            "message": "Scan the QR code with your authenticator app, then verify with a code"
        }
    
    async def verify_2fa_setup(self, member_id: str, code: str) -> Dict:
        """Verify 2FA setup with a code from authenticator app"""
        import pyotp
        
        member = await self.team_members.find_one({"id": member_id})
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        
        secret = member.get("two_factor_secret")
        if not secret:
            raise HTTPException(status_code=400, detail="2FA not set up. Call setup_2fa first.")
        
        totp = pyotp.TOTP(secret)
        if totp.verify(code):
            await self.team_members.update_one(
                {"id": member_id},
                {"$set": {
                    "two_factor_enabled": True,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            await self.log_audit(
                actor_id=member_id,
                actor_name=member.get("name"),
                actor_role=member.get("role_id"),
                action="enable_2fa",
                module="security",
                entity_type="team_member",
                entity_id=member_id,
                after_state={"two_factor_enabled": True}
            )
            
            return {"success": True, "message": "2FA enabled successfully"}
        else:
            return {"success": False, "message": "Invalid code. Please try again."}
    
    async def verify_2fa_code(self, member_id: str, code: str) -> bool:
        """Verify 2FA code during login"""
        import pyotp
        
        member = await self.team_members.find_one({"id": member_id})
        if not member or not member.get("two_factor_enabled"):
            return True  # 2FA not enabled, skip verification
        
        secret = member.get("two_factor_secret")
        if not secret:
            return True
        
        totp = pyotp.TOTP(secret)
        return totp.verify(code)
    
    async def disable_2fa(self, member_id: str, admin_id: str) -> Dict:
        """Disable 2FA for a team member (admin action)"""
        member = await self.team_members.find_one({"id": member_id}, {"_id": 0})
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        
        await self.team_members.update_one(
            {"id": member_id},
            {"$set": {
                "two_factor_enabled": False,
                "two_factor_secret": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        await self.log_audit(
            actor_id=admin_id,
            actor_name="Admin",
            actor_role="admin",
            action="disable_2fa",
            module="security",
            entity_type="team_member",
            entity_id=member_id,
            before_state={"two_factor_enabled": True},
            after_state={"two_factor_enabled": False}
        )
        
        return {"success": True, "message": "2FA disabled"}

    # -------------------------------------------------------------------------
    # SANDBOX / TRAINING MODE
    # -------------------------------------------------------------------------
    
    async def get_sandbox_data(self) -> Dict:
        """Get sandbox/training environment data"""
        # Create mock data for training
        mock_tasks = [
            {
                "id": f"sandbox_task_{i}",
                "title": f"Training Task #{i}: {['Handle refund request', 'Review seller verification', 'Moderate chat report', 'Resolve dispute'][i % 4]}",
                "description": "This is a mock task for training purposes. Practice handling this type of request.",
                "type": ["refund", "verification", "moderation", "dispute"][i % 4],
                "priority": ["low", "medium", "high", "critical"][i % 4],
                "status": "open",
                "is_sandbox": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            for i in range(1, 6)
        ]
        
        mock_approvals = [
            {
                "id": f"sandbox_approval_{i}",
                "type": ["refund", "seller_verification", "user_ban"][i % 3],
                "title": f"Training Approval #{i}",
                "description": "This is a mock approval request for training purposes.",
                "requester_name": "Training Bot",
                "status": "pending",
                "request_data": {"amount": (i + 1) * 50, "reason": "Training exercise"},
                "is_sandbox": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            for i in range(1, 4)
        ]
        
        return {
            "tasks": mock_tasks,
            "approvals": mock_approvals,
            "message": "This is sandbox data for training. Actions here do not affect real users or transactions."
        }
    
    async def process_sandbox_action(
        self,
        action_type: str,
        entity_type: str,
        entity_id: str,
        action_data: Dict[str, Any],
        member_id: str
    ) -> Dict:
        """Process a sandbox action (for training)"""
        # Validate this is a sandbox entity
        if not entity_id.startswith("sandbox_"):
            raise HTTPException(status_code=400, detail="Cannot perform sandbox actions on real entities")
        
        # Log the training action
        training_log = {
            "id": str(uuid.uuid4()),
            "member_id": member_id,
            "action_type": action_type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "action_data": action_data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "feedback": self._generate_training_feedback(action_type, action_data)
        }
        
        await self.db.team_training_logs.insert_one(training_log.copy())
        
        return {
            "success": True,
            "message": f"Training action '{action_type}' completed",
            "feedback": training_log["feedback"],
            "entity_id": entity_id
        }
    
    def _generate_training_feedback(self, action_type: str, action_data: Dict) -> str:
        """Generate feedback for training actions"""
        feedback_templates = {
            "approve": "Good job! You approved the request. In production, always verify the details before approving.",
            "reject": "You rejected the request. Make sure to provide a clear reason to the requester.",
            "assign": "Task assigned successfully. Consider workload balance when assigning tasks.",
            "resolve": "Task marked as resolved. Don't forget to add resolution notes for future reference.",
            "escalate": "Escalation initiated. This is appropriate for complex issues requiring senior review."
        }
        return feedback_templates.get(action_type, "Action completed. Review the guidelines for best practices.")
    
    async def get_training_progress(self, member_id: str) -> Dict:
        """Get training progress for a team member"""
        logs = await self.db.team_training_logs.find(
            {"member_id": member_id}, {"_id": 0}
        ).sort("timestamp", -1).to_list(length=100)
        
        action_counts = {}
        for log in logs:
            action = log.get("action_type", "unknown")
            action_counts[action] = action_counts.get(action, 0) + 1
        
        return {
            "member_id": member_id,
            "total_training_actions": len(logs),
            "action_breakdown": action_counts,
            "recent_actions": logs[:10],
            "training_status": "completed" if len(logs) >= 20 else "in_progress"
        }

    # -------------------------------------------------------------------------
    # EMAIL NOTIFICATIONS (SENDGRID)
    # -------------------------------------------------------------------------
    
    async def send_email_notification(
        self,
        to_email: str,
        subject: str,
        content: str,
        template_type: str = "task_assignment"
    ) -> Dict:
        """Send email notification via SendGrid"""
        import os
        import httpx
        
        sendgrid_key = os.environ.get("SENDGRID_API_KEY")
        if not sendgrid_key:
            logger.warning("SendGrid API key not configured")
            return {"success": False, "error": "SendGrid not configured"}
        
        from_email = os.environ.get("SENDGRID_FROM_EMAIL", "noreply@marketplace.com")
        
        # HTML email template
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1B5E20; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">Admin Dashboard</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
                <h2 style="color: #333;">{subject}</h2>
                <div style="background: white; padding: 15px; border-radius: 5px;">
                    {content}
                </div>
                <p style="color: #666; font-size: 12px; margin-top: 20px;">
                    This is an automated notification from the Admin Dashboard.
                    <br>Do not reply to this email.
                </p>
            </div>
        </body>
        </html>
        """
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={
                        "Authorization": f"Bearer {sendgrid_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "personalizations": [{"to": [{"email": to_email}]}],
                        "from": {"email": from_email, "name": "Admin Dashboard"},
                        "subject": subject,
                        "content": [
                            {"type": "text/plain", "value": content},
                            {"type": "text/html", "value": html_content}
                        ]
                    },
                    timeout=30.0
                )
                
                if response.status_code in [200, 202]:
                    logger.info(f"Email sent to {to_email}: {subject}")
                    return {"success": True, "message": "Email sent successfully"}
                else:
                    logger.error(f"SendGrid error: {response.status_code} - {response.text}")
                    return {"success": False, "error": f"SendGrid error: {response.status_code}"}
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_task_assignment_email(self, task: Dict, assignee: Dict):
        """Send email when task is assigned"""
        content = f"""
        <p>You have been assigned a new task:</p>
        <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Task:</strong></td><td>{task.get('title')}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Type:</strong></td><td>{task.get('type')}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Priority:</strong></td><td style="color: {'red' if task.get('priority') == 'critical' else 'orange' if task.get('priority') == 'high' else 'blue'};">{task.get('priority', '').upper()}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>SLA Deadline:</strong></td><td>{task.get('sla_deadline', 'N/A')}</td></tr>
        </table>
        <p style="margin-top: 15px;">
            <a href="/dashboard/team-management/tasks/{task.get('id')}" 
               style="background: #1B5E20; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View Task
            </a>
        </p>
        """
        
        await self.send_email_notification(
            to_email=assignee.get("email"),
            subject=f"[Task Assigned] {task.get('title')}",
            content=content,
            template_type="task_assignment"
        )
    
    async def send_approval_request_email(self, approval: Dict, approvers: List[Dict]):
        """Send email when approval is requested"""
        content = f"""
        <p>A new approval request requires your attention:</p>
        <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Request:</strong></td><td>{approval.get('title')}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Type:</strong></td><td>{approval.get('type')}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Requester:</strong></td><td>{approval.get('requester_name')}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Priority:</strong></td><td>{approval.get('priority', 'medium').upper()}</td></tr>
        </table>
        <p style="margin-top: 15px;">
            <a href="/dashboard/team-management/approvals/{approval.get('id')}" 
               style="background: #1B5E20; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Review Request
            </a>
        </p>
        """
        
        for approver in approvers:
            await self.send_email_notification(
                to_email=approver.get("email"),
                subject=f"[Approval Required] {approval.get('title')}",
                content=content,
                template_type="approval_request"
            )
    
    async def send_sla_breach_alert(self, task: Dict, assigned_member: Optional[Dict] = None):
        """Send email alert when SLA is breached"""
        content = f"""
        <p style="color: #d32f2f;"><strong>SLA BREACH ALERT</strong></p>
        <p>The following task has breached its SLA deadline:</p>
        <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Task:</strong></td><td>{task.get('title')}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Priority:</strong></td><td style="color: red;">{task.get('priority', '').upper()}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>SLA Deadline:</strong></td><td style="color: red;">{task.get('sla_deadline')}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Assigned To:</strong></td><td>{assigned_member.get('name') if assigned_member else 'Unassigned'}</td></tr>
        </table>
        <p style="margin-top: 15px;"><strong>Immediate action required.</strong></p>
        """
        
        # Send to assigned member and their manager
        recipients = []
        if assigned_member:
            recipients.append(assigned_member.get("email"))
        
        # Also notify admins
        admins = await self.team_members.find(
            {"role_id": {"$in": ["admin", "super_admin"]}, "status": "active"},
            {"_id": 0, "email": 1}
        ).to_list(length=10)
        recipients.extend([a.get("email") for a in admins])
        
        for email in set(recipients):
            if email:
                await self.send_email_notification(
                    to_email=email,
                    subject=f"[SLA BREACH] {task.get('title')}",
                    content=content,
                    template_type="sla_breach"
                )


# ============================================================================
# ROUTER FACTORY
# ============================================================================

def create_team_workflow_router(db: AsyncIOMotorDatabase):
    """Create the Team & Workflow Management router"""
    router = APIRouter(prefix="/team", tags=["Team & Workflow Management"])
    service = TeamWorkflowService(db)
    
    # Initialize on startup
    @router.on_event("startup")
    async def startup():
        await service.initialize_system()
    
    # -------------------------------------------------------------------------
    # TEAM MEMBERS
    # -------------------------------------------------------------------------
    
    @router.get("/members")
    async def get_team_members(
        role_id: Optional[str] = None,
        status: Optional[str] = None,
        department: Optional[str] = None
    ):
        """Get all team members"""
        return await service.get_team_members(role_id, status, department)
    
    @router.get("/members/{member_id}")
    async def get_team_member(member_id: str):
        """Get a specific team member"""
        member = await service.get_team_member(member_id)
        if not member:
            raise HTTPException(status_code=404, detail="Team member not found")
        return member
    
    @router.post("/members")
    async def create_team_member(
        email: EmailStr = Body(...),
        name: str = Body(...),
        role_id: str = Body(...),
        created_by: str = Body(...),
        password: Optional[str] = Body(None),
        department: Optional[str] = Body(None),
        phone: Optional[str] = Body(None),
        sandbox_only: bool = Body(False)
    ):
        """Create a new team member"""
        return await service.create_team_member(
            email=email,
            name=name,
            role_id=role_id,
            created_by=created_by,
            password=password,
            department=department,
            phone=phone,
            sandbox_only=sandbox_only
        )
    
    @router.put("/members/{member_id}")
    async def update_team_member(
        member_id: str,
        updates: Dict[str, Any] = Body(...),
        updated_by: str = Body(...)
    ):
        """Update a team member"""
        result = await service.update_team_member(member_id, updates, updated_by)
        if not result:
            raise HTTPException(status_code=404, detail="Team member not found")
        return result
    
    @router.post("/members/{member_id}/deactivate")
    async def deactivate_team_member(
        member_id: str,
        deactivated_by: str = Body(...),
        reason: Optional[str] = Body(None)
    ):
        """Deactivate a team member"""
        result = await service.deactivate_team_member(member_id, deactivated_by, reason)
        if not result:
            raise HTTPException(status_code=404, detail="Team member not found")
        return {"status": "deactivated"}
    
    # -------------------------------------------------------------------------
    # ROLES
    # -------------------------------------------------------------------------
    
    @router.get("/roles")
    async def get_roles():
        """Get all roles"""
        return await service.get_roles()
    
    @router.get("/roles/{role_id}")
    async def get_role(role_id: str):
        """Get a specific role"""
        role = await service.get_role(role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        return role
    
    @router.post("/roles")
    async def create_role(
        name: str = Body(...),
        description: str = Body(...),
        permissions: Dict[str, str] = Body(...),
        created_by: str = Body(...)
    ):
        """Create a custom role"""
        return await service.create_role(name, description, permissions, created_by)
    
    @router.put("/roles/{role_id}")
    async def update_role(
        role_id: str,
        updates: Dict[str, Any] = Body(...),
        updated_by: str = Body(...)
    ):
        """Update a role"""
        result = await service.update_role(role_id, updates, updated_by)
        if not result:
            raise HTTPException(status_code=404, detail="Role not found")
        return result
    
    @router.delete("/roles/{role_id}")
    async def delete_role(role_id: str):
        """Delete a custom role"""
        result = await service.delete_role(role_id)
        if not result:
            raise HTTPException(status_code=404, detail="Role not found")
        return {"status": "deleted"}
    
    @router.get("/permissions/modules")
    async def get_permission_modules():
        """Get list of all permission modules"""
        return {
            "modules": PERMISSION_MODULES,
            "levels": [level.value for level in PermissionLevel]
        }
    
    # -------------------------------------------------------------------------
    # TASKS
    # -------------------------------------------------------------------------
    
    @router.get("/tasks")
    async def get_tasks(
        status: Optional[str] = None,
        priority: Optional[str] = None,
        task_type: Optional[str] = None,
        assigned_to: Optional[str] = None,
        assigned_team: Optional[str] = None,
        sla_breached: Optional[bool] = None,
        limit: int = Query(100, le=500),
        skip: int = 0
    ):
        """Get tasks with filters"""
        return await service.get_tasks(
            status=status,
            priority=priority,
            task_type=task_type,
            assigned_to=assigned_to,
            assigned_team=assigned_team,
            sla_breached=sla_breached,
            limit=limit,
            skip=skip
        )
    
    @router.get("/tasks/{task_id}")
    async def get_task(task_id: str):
        """Get a specific task"""
        task = await service.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return task
    
    @router.post("/tasks")
    async def create_task(
        title: str = Body(...),
        description: str = Body(...),
        task_type: str = Body(...),
        priority: str = Body(...),
        created_by: str = Body(...),
        source_type: Optional[str] = Body(None),
        source_id: Optional[str] = Body(None),
        source_data: Optional[Dict] = Body(None),
        assigned_to: Optional[str] = Body(None),
        tags: List[str] = Body([])
    ):
        """Create a new task"""
        return await service.create_task(
            title=title,
            description=description,
            task_type=TaskType(task_type),
            priority=TaskPriority(priority),
            created_by=created_by,
            source_type=source_type,
            source_id=source_id,
            source_data=source_data,
            assigned_to=assigned_to,
            tags=tags
        )
    
    @router.put("/tasks/{task_id}")
    async def update_task(
        task_id: str,
        updates: Dict[str, Any] = Body(...),
        updated_by: str = Body(...)
    ):
        """Update a task"""
        result = await service.update_task(task_id, updates, updated_by)
        if not result:
            raise HTTPException(status_code=404, detail="Task not found")
        return result
    
    @router.post("/tasks/{task_id}/assign")
    async def assign_task(
        task_id: str,
        assigned_to: str = Body(...),
        assigned_by: str = Body(...)
    ):
        """Assign a task to a team member"""
        return await service.assign_task(task_id, assigned_to, assigned_by)
    
    @router.post("/tasks/{task_id}/comments")
    async def add_task_comment(
        task_id: str,
        author_id: str = Body(...),
        content: str = Body(...),
        mentions: List[str] = Body([]),
        attachments: List[Dict] = Body([])
    ):
        """Add internal comment to a task"""
        return await service.add_task_comment(task_id, author_id, content, mentions, attachments)
    
    # -------------------------------------------------------------------------
    # APPROVALS
    # -------------------------------------------------------------------------
    
    @router.get("/approvals")
    async def get_approvals(
        status: Optional[str] = None,
        approval_type: Optional[str] = None,
        requester_id: Optional[str] = None,
        limit: int = Query(100, le=500)
    ):
        """Get approval requests"""
        return await service.get_approvals(status, approval_type, requester_id, limit)
    
    @router.get("/approvals/{approval_id}")
    async def get_approval(approval_id: str):
        """Get a specific approval request"""
        approval = await service.get_approval(approval_id)
        if not approval:
            raise HTTPException(status_code=404, detail="Approval not found")
        return approval
    
    @router.post("/approvals")
    async def create_approval_request(
        approval_type: str = Body(...),
        title: str = Body(...),
        description: str = Body(...),
        requester_id: str = Body(...),
        requester_name: str = Body(...),
        request_data: Dict[str, Any] = Body({}),
        target_entity_type: Optional[str] = Body(None),
        target_entity_id: Optional[str] = Body(None),
        required_approvers: List[str] = Body([]),
        required_approval_count: int = Body(1),
        priority: str = Body("medium")
    ):
        """Create an approval request"""
        return await service.create_approval_request(
            approval_type=ApprovalType(approval_type),
            title=title,
            description=description,
            requester_id=requester_id,
            requester_name=requester_name,
            request_data=request_data,
            target_entity_type=target_entity_type,
            target_entity_id=target_entity_id,
            required_approvers=required_approvers,
            required_approval_count=required_approval_count,
            priority=TaskPriority(priority)
        )
    
    @router.post("/approvals/{approval_id}/approve")
    async def approve_request(
        approval_id: str,
        approver_id: str = Body(...),
        approver_name: str = Body(...),
        notes: Optional[str] = Body(None)
    ):
        """Approve a request"""
        return await service.approve_request(approval_id, approver_id, approver_name, notes)
    
    @router.post("/approvals/{approval_id}/reject")
    async def reject_request(
        approval_id: str,
        rejector_id: str = Body(...),
        rejector_name: str = Body(...),
        reason: str = Body(...)
    ):
        """Reject a request"""
        return await service.reject_request(approval_id, rejector_id, rejector_name, reason)
    
    # -------------------------------------------------------------------------
    # WORKFLOW RULES
    # -------------------------------------------------------------------------
    
    @router.get("/workflow-rules")
    async def get_workflow_rules():
        """Get all workflow rules"""
        return await service.get_workflow_rules()
    
    @router.post("/workflow-rules")
    async def create_workflow_rule(
        name: str = Body(...),
        description: str = Body(...),
        trigger_type: str = Body(...),
        trigger_conditions: Dict[str, Any] = Body({}),
        actions: List[Dict[str, Any]] = Body([]),
        created_by: str = Body(...)
    ):
        """Create a workflow rule"""
        return await service.create_workflow_rule(
            name=name,
            description=description,
            trigger_type=trigger_type,
            trigger_conditions=trigger_conditions,
            actions=actions,
            created_by=created_by
        )
    
    @router.put("/workflow-rules/{rule_id}")
    async def update_workflow_rule(
        rule_id: str,
        updates: Dict[str, Any] = Body(...),
        updated_by: str = Body(...)
    ):
        """Update a workflow rule"""
        return await service.update_workflow_rule(rule_id, updates, updated_by)
    
    @router.delete("/workflow-rules/{rule_id}")
    async def delete_workflow_rule(rule_id: str):
        """Delete a workflow rule"""
        result = await service.delete_workflow_rule(rule_id)
        if not result:
            raise HTTPException(status_code=404, detail="Rule not found")
        return {"status": "deleted"}
    
    # -------------------------------------------------------------------------
    # SETTINGS
    # -------------------------------------------------------------------------
    
    @router.get("/settings")
    async def get_settings():
        """Get team settings"""
        return await service.get_settings()
    
    @router.put("/settings")
    async def update_settings(
        updates: Dict[str, Any] = Body(...),
        updated_by: str = Body(...)
    ):
        """Update team settings"""
        return await service.update_settings(updates, updated_by)
    
    # -------------------------------------------------------------------------
    # AUDIT LOG
    # -------------------------------------------------------------------------
    
    @router.get("/audit-logs")
    async def get_audit_logs(
        module: Optional[str] = None,
        actor_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        action: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = Query(100, le=1000)
    ):
        """Get audit log entries"""
        return await service.get_audit_logs(
            module=module,
            actor_id=actor_id,
            entity_type=entity_type,
            action=action,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )
    
    # -------------------------------------------------------------------------
    # DASHBOARD
    # -------------------------------------------------------------------------
    
    @router.get("/dashboard")
    async def get_dashboard():
        """Get team activity dashboard metrics"""
        return await service.get_dashboard_metrics()
    
    # -------------------------------------------------------------------------
    # NOTIFICATIONS
    # -------------------------------------------------------------------------
    
    @router.get("/notifications/{member_id}")
    async def get_notifications(
        member_id: str,
        unread_only: bool = False,
        limit: int = Query(50, le=200)
    ):
        """Get notifications for a team member"""
        return await service.get_notifications(member_id, unread_only, limit)
    
    @router.post("/notifications/{notification_id}/read")
    async def mark_notification_read(notification_id: str):
        """Mark a notification as read"""
        result = await service.mark_notification_read(notification_id)
        return {"status": "read" if result else "not_found"}
    
    @router.post("/notifications/{member_id}/read-all")
    async def mark_all_notifications_read(member_id: str):
        """Mark all notifications as read"""
        count = await service.mark_all_notifications_read(member_id)
        return {"marked_read": count}
    
    # -------------------------------------------------------------------------
    # SHIFTS & AVAILABILITY
    # -------------------------------------------------------------------------
    
    @router.get("/shifts")
    async def get_shifts(
        member_id: Optional[str] = None,
        date: Optional[str] = None
    ):
        """Get shift schedules"""
        return await service.get_shifts(member_id, date)
    
    @router.post("/shifts")
    async def create_shift(
        member_id: str = Body(...),
        date: str = Body(...),
        start_time: str = Body(...),
        end_time: str = Body(...),
        shift_type: str = Body("regular"),
        notes: Optional[str] = Body(None),
        created_by: str = Body("admin")
    ):
        """Create a shift schedule"""
        return await service.create_shift(member_id, date, start_time, end_time, shift_type, notes, created_by)
    
    @router.put("/shifts/{shift_id}")
    async def update_shift(
        shift_id: str,
        updates: Dict[str, Any] = Body(...)
    ):
        """Update a shift"""
        result = await service.update_shift(shift_id, updates)
        if not result:
            raise HTTPException(status_code=404, detail="Shift not found")
        return result
    
    @router.delete("/shifts/{shift_id}")
    async def delete_shift(shift_id: str):
        """Delete a shift"""
        result = await service.delete_shift(shift_id)
        if not result:
            raise HTTPException(status_code=404, detail="Shift not found")
        return {"status": "deleted"}
    
    @router.get("/on-call")
    async def get_on_call_members():
        """Get currently on-call team members"""
        return await service.get_on_call_members()
    
    @router.post("/members/{member_id}/on-call")
    async def set_on_call_status(
        member_id: str,
        is_on_call: bool = Body(...)
    ):
        """Set a member's on-call status"""
        result = await service.set_on_call_status(member_id, is_on_call)
        return {"status": "updated" if result else "not_found"}
    
    @router.get("/available-for-assignment")
    async def get_available_members(role_id: Optional[str] = None):
        """Get available team members for task assignment"""
        return await service.get_available_members_for_assignment(role_id)
    
    # -------------------------------------------------------------------------
    # TWO-FACTOR AUTHENTICATION
    # -------------------------------------------------------------------------
    
    @router.post("/2fa/{member_id}/setup")
    async def setup_2fa(member_id: str):
        """Generate 2FA secret for a team member"""
        return await service.setup_2fa(member_id)
    
    @router.post("/2fa/{member_id}/verify-setup")
    async def verify_2fa_setup(
        member_id: str,
        code: str = Body(...)
    ):
        """Verify 2FA setup with a code"""
        return await service.verify_2fa_setup(member_id, code)
    
    @router.post("/2fa/{member_id}/verify")
    async def verify_2fa_code(
        member_id: str,
        code: str = Body(...)
    ):
        """Verify 2FA code during login"""
        is_valid = await service.verify_2fa_code(member_id, code)
        return {"valid": is_valid}
    
    @router.post("/2fa/{member_id}/disable")
    async def disable_2fa(
        member_id: str,
        admin_id: str = Body(...)
    ):
        """Disable 2FA for a team member"""
        return await service.disable_2fa(member_id, admin_id)
    
    # -------------------------------------------------------------------------
    # SANDBOX / TRAINING MODE
    # -------------------------------------------------------------------------
    
    @router.get("/sandbox/data")
    async def get_sandbox_data():
        """Get sandbox/training environment data"""
        return await service.get_sandbox_data()
    
    @router.post("/sandbox/action")
    async def process_sandbox_action(
        action_type: str = Body(...),
        entity_type: str = Body(...),
        entity_id: str = Body(...),
        action_data: Dict[str, Any] = Body({}),
        member_id: str = Body(...)
    ):
        """Process a sandbox action for training"""
        return await service.process_sandbox_action(action_type, entity_type, entity_id, action_data, member_id)
    
    @router.get("/sandbox/progress/{member_id}")
    async def get_training_progress(member_id: str):
        """Get training progress for a team member"""
        return await service.get_training_progress(member_id)
    
    # -------------------------------------------------------------------------
    # EMAIL NOTIFICATIONS
    # -------------------------------------------------------------------------
    
    @router.post("/email/test")
    async def test_email(
        to_email: EmailStr = Body(...),
        subject: str = Body("Test Email"),
        content: str = Body("This is a test email from the Admin Dashboard.")
    ):
        """Send a test email"""
        return await service.send_email_notification(to_email, subject, content)
    
    # -------------------------------------------------------------------------
    # SYSTEM INITIALIZATION
    # -------------------------------------------------------------------------
    
    @router.post("/initialize")
    async def initialize_system():
        """Initialize the team workflow system with default data"""
        await service.initialize_system()
        return {"status": "initialized"}
    
    return router, service
