"""
Data Privacy & Compliance Center
Centralized management for:
- GDPR & African data protection compliance
- Data Subject Access Requests (DSAR)
- Consent management
- Data retention policies
- Audit logging
- Breach & incident management
"""

from fastapi import APIRouter, HTTPException, Body, Query, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional, Literal
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
import os
import json
import csv
import io
import logging
import hashlib
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# =========================================================================
# ENUMS & CONSTANTS
# =========================================================================

class ComplianceRegulation(str, Enum):
    GDPR = "gdpr"  # EU General Data Protection Regulation
    POPIA = "popia"  # South Africa Protection of Personal Information Act
    NDPR = "ndpr"  # Nigeria Data Protection Regulation
    DPA_KENYA = "dpa_kenya"  # Kenya Data Protection Act
    PLATFORM = "platform"  # Internal platform policies

class DSARType(str, Enum):
    ACCESS = "access"  # Right to access
    EXPORT = "export"  # Right to portability
    DELETION = "deletion"  # Right to erasure
    RECTIFICATION = "rectification"  # Right to correction
    RESTRICTION = "restriction"  # Right to restrict processing

class DSARStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    APPROVED = "approved"
    COMPLETED = "completed"
    REJECTED = "rejected"
    EXPIRED = "expired"

class ConsentCategory(str, Enum):
    MARKETING = "marketing"
    ANALYTICS = "analytics"
    NOTIFICATIONS = "notifications"
    PERSONALIZED_ADS = "personalized_ads"
    THIRD_PARTY_SHARING = "third_party_sharing"
    LOCATION_TRACKING = "location_tracking"

class DataCategory(str, Enum):
    PROFILE = "profile"
    LISTINGS = "listings"
    CHATS = "chats"
    ORDERS = "orders"
    PAYMENTS = "payments"
    LOCATION = "location"
    DEVICE = "device"
    ANALYTICS = "analytics"
    NOTIFICATIONS = "notifications"
    AUDIT_LOGS = "audit_logs"

class IncidentSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class UserRole(str, Enum):
    USER = "user"
    SELLER = "seller"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"
    COMPLIANCE_OFFICER = "compliance_officer"
    SUPPORT = "support"
    MODERATOR = "moderator"
    FINANCE = "finance"
    TRANSPORT_PARTNER = "transport_partner"

class LegalDocumentType(str, Enum):
    PRIVACY_POLICY = "privacy_policy"
    TERMS_OF_SERVICE = "terms_of_service"
    COOKIE_POLICY = "cookie_policy"
    DPA = "data_processing_agreement"
    ACCEPTABLE_USE = "acceptable_use"

class SandboxMode(str, Enum):
    OFF = "off"
    ON = "on"

# Roles allowed to access compliance endpoints
COMPLIANCE_ROLES = [UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.ADMIN]

# Default SLA in days per request type
DEFAULT_SLA_DAYS = {
    DSARType.ACCESS: 30,
    DSARType.EXPORT: 30,
    DSARType.DELETION: 30,
    DSARType.RECTIFICATION: 30,
    DSARType.RESTRICTION: 30,
}

# Data fields that should be masked by default
SENSITIVE_FIELDS = [
    "password", "password_hash", "api_key", "secret", "token",
    "credit_card", "card_number", "cvv", "ssn", "national_id",
    "bank_account", "routing_number", "phone", "email", "address",
    "ip_address", "device_id", "location"
]

# Role-based data access permissions
ROLE_DATA_ACCESS = {
    UserRole.SUPPORT: [DataCategory.PROFILE, DataCategory.ORDERS],
    UserRole.MODERATOR: [DataCategory.CHATS, DataCategory.LISTINGS],
    UserRole.FINANCE: [DataCategory.PAYMENTS, DataCategory.ORDERS],
    UserRole.ADMIN: list(DataCategory),
}

# Third-party data processors
THIRD_PARTY_PROCESSORS = [
    {
        "id": "stripe",
        "name": "Stripe",
        "type": "payment_processor",
        "data_shared": ["name", "email", "payment_info", "transaction_data"],
        "purpose": "Payment processing",
        "country": "USA",
        "gdpr_compliant": True,
        "dpa_signed": True
    },
    {
        "id": "twilio",
        "name": "Twilio",
        "type": "messaging",
        "data_shared": ["phone_number", "message_content"],
        "purpose": "SMS & WhatsApp messaging",
        "country": "USA",
        "gdpr_compliant": True,
        "dpa_signed": True
    },
    {
        "id": "sendgrid",
        "name": "SendGrid",
        "type": "email",
        "data_shared": ["email", "name"],
        "purpose": "Transactional emails",
        "country": "USA",
        "gdpr_compliant": True,
        "dpa_signed": True
    },
    {
        "id": "mailchimp",
        "name": "Mailchimp",
        "type": "marketing",
        "data_shared": ["email", "name", "preferences"],
        "purpose": "Marketing campaigns",
        "country": "USA",
        "gdpr_compliant": True,
        "dpa_signed": True
    },
    {
        "id": "google_analytics",
        "name": "Google Analytics",
        "type": "analytics",
        "data_shared": ["anonymous_usage_data", "device_info"],
        "purpose": "Usage analytics",
        "country": "USA",
        "gdpr_compliant": True,
        "dpa_signed": True
    },
    {
        "id": "firebase",
        "name": "Firebase",
        "type": "push_notifications",
        "data_shared": ["device_token", "app_usage"],
        "purpose": "Push notifications",
        "country": "USA",
        "gdpr_compliant": True,
        "dpa_signed": True
    },
]


# =========================================================================
# PYDANTIC MODELS
# =========================================================================

class DSARRequest(BaseModel):
    """Data Subject Access Request"""
    id: str
    user_id: str
    user_email: str
    user_name: Optional[str] = None
    request_type: DSARType
    status: DSARStatus = DSARStatus.PENDING
    regulation: ComplianceRegulation = ComplianceRegulation.GDPR
    data_categories: List[DataCategory] = Field(default_factory=list)
    reason: Optional[str] = None
    submitted_at: str
    deadline: str
    processed_at: Optional[str] = None
    processed_by: Optional[str] = None
    notes: Optional[str] = None
    export_file: Optional[str] = None

class ConsentRecord(BaseModel):
    """User consent record"""
    id: str
    user_id: str
    category: ConsentCategory
    granted: bool
    timestamp: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    policy_version: Optional[str] = None

class DataRetentionPolicy(BaseModel):
    """Data retention policy"""
    id: str
    data_category: DataCategory
    retention_days: int
    country_code: Optional[str] = None  # None for global
    auto_purge: bool = True
    soft_delete: bool = True
    description: Optional[str] = None
    created_at: str
    updated_at: str

class PrivacyIncident(BaseModel):
    """Data breach/incident record"""
    id: str
    title: str
    description: str
    severity: IncidentSeverity
    affected_users: int = 0
    affected_data: List[DataCategory] = Field(default_factory=list)
    discovered_at: str
    reported_at: Optional[str] = None
    resolved_at: Optional[str] = None
    actions_taken: List[str] = Field(default_factory=list)
    notifications_sent: bool = False
    reported_to_authority: bool = False
    created_by: str
    status: Literal["open", "investigating", "mitigated", "resolved", "closed"] = "open"

class PrivacyPolicy(BaseModel):
    """Privacy policy version"""
    id: str
    version: str
    title: str
    content: str
    country_code: Optional[str] = None
    effective_date: str
    requires_consent: bool = True
    created_at: str
    created_by: str

class LegalDocument(BaseModel):
    """Legal document model for Legal Text Management"""
    id: str
    document_type: str  # privacy_policy, terms_of_service, cookie_policy, dpa, acceptable_use
    version: str
    title: str
    content: str  # HTML content
    summary: Optional[str] = None  # Plain text summary
    country_code: Optional[str] = None  # Null = global
    language: str = "en"
    status: str = "draft"  # draft, published, archived
    effective_date: Optional[str] = None
    requires_acceptance: bool = True
    force_reaccept: bool = False  # Force all users to re-accept
    changelog: Optional[str] = None  # What changed from previous version
    previous_version_id: Optional[str] = None
    created_at: str
    created_by: str
    published_at: Optional[str] = None
    published_by: Optional[str] = None

class UserAcceptance(BaseModel):
    """User acceptance record for legal documents"""
    id: str
    user_id: str
    document_id: str
    document_type: str
    document_version: str
    accepted_at: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    country_code: Optional[str] = None

class SandboxConfig(BaseModel):
    """Sandbox mode configuration"""
    enabled: bool = False
    fake_users_count: int = 100
    fake_dsar_count: int = 25
    fake_incidents_count: int = 5
    include_pii_samples: bool = False
    reset_on_disable: bool = True
    created_at: Optional[str] = None
    enabled_by: Optional[str] = None

class ComplianceAuditLog(BaseModel):
    """Immutable compliance audit log"""
    id: str
    action: str
    actor_id: str
    actor_role: str
    target_user_id: Optional[str] = None
    data_categories: List[str] = Field(default_factory=list)
    details: Dict[str, Any] = Field(default_factory=dict)
    ip_address: Optional[str] = None
    timestamp: str
    checksum: str  # For immutability verification


# =========================================================================
# SERVICE CLASS
# =========================================================================

class ComplianceService:
    """Data Privacy & Compliance Service"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        
        # Collections
        self.dsar_collection = db.compliance_dsar
        self.consent_collection = db.compliance_consent
        self.retention_collection = db.compliance_retention
        self.incidents_collection = db.compliance_incidents
        self.policies_collection = db.compliance_policies
        self.audit_collection = db.compliance_audit
        self.user_policy_acceptance = db.compliance_policy_acceptance
        self.deleted_data_collection = db.compliance_deleted_data  # Soft delete storage
    
    # -------------------------------------------------------------------------
    # AUDIT LOGGING (Immutable)
    # -------------------------------------------------------------------------
    
    async def _log_audit(
        self,
        action: str,
        actor_id: str,
        actor_role: str,
        target_user_id: Optional[str] = None,
        data_categories: List[str] = None,
        details: Dict[str, Any] = None,
        ip_address: Optional[str] = None
    ):
        """Create immutable audit log entry"""
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Create checksum for immutability
        log_data = {
            "action": action,
            "actor_id": actor_id,
            "actor_role": actor_role,
            "target_user_id": target_user_id,
            "data_categories": data_categories or [],
            "details": details or {},
            "timestamp": timestamp
        }
        checksum = hashlib.sha256(json.dumps(log_data, sort_keys=True).encode()).hexdigest()
        
        entry = {
            "id": str(uuid.uuid4()),
            **log_data,
            "ip_address": ip_address,
            "checksum": checksum
        }
        
        await self.audit_collection.insert_one(entry)
        logger.info(f"Compliance Audit: {action} by {actor_id} ({actor_role})")
        return entry
    
    async def get_audit_logs(
        self,
        actor_id: Optional[str] = None,
        target_user_id: Optional[str] = None,
        action: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict]:
        """Get audit logs with filtering"""
        query = {}
        if actor_id:
            query["actor_id"] = actor_id
        if target_user_id:
            query["target_user_id"] = target_user_id
        if action:
            query["action"] = action
        if start_date:
            query["timestamp"] = {"$gte": start_date}
        if end_date:
            if "timestamp" in query:
                query["timestamp"]["$lte"] = end_date
            else:
                query["timestamp"] = {"$lte": end_date}
        
        cursor = self.audit_collection.find(
            query, {"_id": 0}
        ).sort("timestamp", -1).skip(skip).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    def verify_audit_integrity(self, log_entry: Dict) -> bool:
        """Verify audit log hasn't been tampered with"""
        log_data = {
            "action": log_entry["action"],
            "actor_id": log_entry["actor_id"],
            "actor_role": log_entry["actor_role"],
            "target_user_id": log_entry.get("target_user_id"),
            "data_categories": log_entry.get("data_categories", []),
            "details": log_entry.get("details", {}),
            "timestamp": log_entry["timestamp"]
        }
        expected_checksum = hashlib.sha256(json.dumps(log_data, sort_keys=True).encode()).hexdigest()
        return expected_checksum == log_entry.get("checksum")
    
    # -------------------------------------------------------------------------
    # DSAR MANAGEMENT
    # -------------------------------------------------------------------------
    
    async def create_dsar(
        self,
        user_id: str,
        user_email: str,
        request_type: DSARType,
        regulation: ComplianceRegulation = ComplianceRegulation.GDPR,
        data_categories: List[DataCategory] = None,
        reason: Optional[str] = None,
        user_name: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict:
        """Create a new DSAR request"""
        now = datetime.now(timezone.utc)
        sla_days = DEFAULT_SLA_DAYS.get(request_type, 30)
        deadline = now + timedelta(days=sla_days)
        
        request = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_email": user_email,
            "user_name": user_name,
            "request_type": request_type.value,
            "status": DSARStatus.PENDING.value,
            "regulation": regulation.value,
            "data_categories": [c.value for c in (data_categories or list(DataCategory))],
            "reason": reason,
            "submitted_at": now.isoformat(),
            "deadline": deadline.isoformat(),
            "processed_at": None,
            "processed_by": None,
            "notes": None,
            "export_file": None
        }
        
        await self.dsar_collection.insert_one(request)
        
        # Audit log
        await self._log_audit(
            action="dsar_created",
            actor_id=user_id,
            actor_role="user",
            target_user_id=user_id,
            data_categories=[c.value for c in (data_categories or [])],
            details={"request_type": request_type.value, "regulation": regulation.value},
            ip_address=ip_address
        )
        
        request.pop("_id", None)
        return request
    
    async def get_dsar_requests(
        self,
        status: Optional[DSARStatus] = None,
        request_type: Optional[DSARType] = None,
        user_id: Optional[str] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict]:
        """Get DSAR requests with filtering"""
        query = {}
        if status:
            query["status"] = status.value
        if request_type:
            query["request_type"] = request_type.value
        if user_id:
            query["user_id"] = user_id
        
        cursor = self.dsar_collection.find(
            query, {"_id": 0}
        ).sort("submitted_at", -1).skip(skip).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    async def get_dsar_by_id(self, request_id: str) -> Optional[Dict]:
        """Get a single DSAR request"""
        return await self.dsar_collection.find_one(
            {"id": request_id}, {"_id": 0}
        )
    
    async def update_dsar_status(
        self,
        request_id: str,
        status: DSARStatus,
        processed_by: str,
        notes: Optional[str] = None,
        export_file: Optional[str] = None
    ) -> Dict:
        """Update DSAR request status"""
        updates = {
            "status": status.value,
            "processed_by": processed_by,
            "notes": notes
        }
        
        if status in [DSARStatus.COMPLETED, DSARStatus.REJECTED]:
            updates["processed_at"] = datetime.now(timezone.utc).isoformat()
        
        if export_file:
            updates["export_file"] = export_file
        
        result = await self.dsar_collection.update_one(
            {"id": request_id},
            {"$set": updates}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Get request details for audit
        request = await self.get_dsar_by_id(request_id)
        
        # Audit log
        await self._log_audit(
            action=f"dsar_status_updated",
            actor_id=processed_by,
            actor_role="admin",
            target_user_id=request.get("user_id") if request else None,
            details={"request_id": request_id, "new_status": status.value}
        )
        
        return await self.get_dsar_by_id(request_id)
    
    async def get_dsar_statistics(self) -> Dict:
        """Get DSAR statistics"""
        pipeline = [
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        cursor = self.dsar_collection.aggregate(pipeline)
        results = await cursor.to_list(length=100)
        
        stats = {status.value: 0 for status in DSARStatus}
        for r in results:
            stats[r["_id"]] = r["count"]
        
        # Count overdue requests
        now = datetime.now(timezone.utc).isoformat()
        overdue = await self.dsar_collection.count_documents({
            "status": {"$in": [DSARStatus.PENDING.value, DSARStatus.IN_PROGRESS.value]},
            "deadline": {"$lt": now}
        })
        
        stats["overdue"] = overdue
        stats["total"] = sum(v for k, v in stats.items() if k != "overdue")
        
        return stats
    
    # -------------------------------------------------------------------------
    # DATA EXPORT
    # -------------------------------------------------------------------------
    
    async def export_user_data(
        self,
        user_id: str,
        data_categories: List[DataCategory],
        format: Literal["json", "csv"] = "json",
        actor_id: str = None,
        actor_role: str = "admin"
    ) -> Dict:
        """Export user data in specified format"""
        export_data = {}
        
        for category in data_categories:
            data = await self._get_user_data_by_category(user_id, category)
            export_data[category.value] = data
        
        # Audit log
        await self._log_audit(
            action="data_export",
            actor_id=actor_id or user_id,
            actor_role=actor_role,
            target_user_id=user_id,
            data_categories=[c.value for c in data_categories],
            details={"format": format}
        )
        
        if format == "json":
            return {
                "format": "json",
                "data": export_data,
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "user_id": user_id
            }
        elif format == "csv":
            # Convert to CSV format
            csv_data = {}
            for category, data in export_data.items():
                if isinstance(data, list) and len(data) > 0:
                    output = io.StringIO()
                    if isinstance(data[0], dict):
                        writer = csv.DictWriter(output, fieldnames=data[0].keys())
                        writer.writeheader()
                        writer.writerows(data)
                    csv_data[category] = output.getvalue()
                elif isinstance(data, dict):
                    output = io.StringIO()
                    writer = csv.writer(output)
                    for key, value in data.items():
                        writer.writerow([key, value])
                    csv_data[category] = output.getvalue()
            
            return {
                "format": "csv",
                "data": csv_data,
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "user_id": user_id
            }
    
    async def _get_user_data_by_category(
        self,
        user_id: str,
        category: DataCategory
    ) -> Any:
        """Get user data by category with masking"""
        if category == DataCategory.PROFILE:
            user = await self.db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
            return self._mask_sensitive_fields(user) if user else {}
        
        elif category == DataCategory.LISTINGS:
            cursor = self.db.listings.find({"seller_id": user_id}, {"_id": 0})
            listings = await cursor.to_list(length=1000)
            return [self._mask_sensitive_fields(l) for l in listings]
        
        elif category == DataCategory.CHATS:
            cursor = self.db.messages.find(
                {"$or": [{"sender_id": user_id}, {"receiver_id": user_id}]},
                {"_id": 0}
            )
            messages = await cursor.to_list(length=1000)
            return messages
        
        elif category == DataCategory.ORDERS:
            cursor = self.db.escrow_transactions.find(
                {"$or": [{"buyer_id": user_id}, {"seller_id": user_id}]},
                {"_id": 0}
            )
            orders = await cursor.to_list(length=1000)
            return [self._mask_sensitive_fields(o) for o in orders]
        
        elif category == DataCategory.PAYMENTS:
            cursor = self.db.payments.find({"user_id": user_id}, {"_id": 0})
            payments = await cursor.to_list(length=1000)
            # Heavy masking for payment data
            return [self._mask_payment_data(p) for p in payments]
        
        elif category == DataCategory.NOTIFICATIONS:
            cursor = self.db.notifications.find({"user_id": user_id}, {"_id": 0})
            return await cursor.to_list(length=1000)
        
        elif category == DataCategory.AUDIT_LOGS:
            cursor = self.audit_collection.find(
                {"$or": [{"actor_id": user_id}, {"target_user_id": user_id}]},
                {"_id": 0}
            )
            return await cursor.to_list(length=1000)
        
        return []
    
    def _mask_sensitive_fields(self, data: Dict) -> Dict:
        """Mask sensitive fields in data"""
        if not data:
            return data
        
        masked = dict(data)
        for field in SENSITIVE_FIELDS:
            if field in masked:
                value = masked[field]
                if isinstance(value, str) and len(value) > 4:
                    masked[field] = "*" * (len(value) - 4) + value[-4:]
                else:
                    masked[field] = "****"
        return masked
    
    def _mask_payment_data(self, data: Dict) -> Dict:
        """Heavy masking for payment data"""
        if not data:
            return data
        
        masked = {
            "transaction_id": data.get("transaction_id"),
            "amount": data.get("amount"),
            "currency": data.get("currency"),
            "status": data.get("status"),
            "created_at": data.get("created_at"),
            "payment_method": "****" if data.get("payment_method") else None
        }
        return masked
    
    # -------------------------------------------------------------------------
    # RIGHT TO BE FORGOTTEN
    # -------------------------------------------------------------------------
    
    async def delete_user_data(
        self,
        user_id: str,
        anonymize: bool = True,
        deleted_by: str = None,
        reason: str = None
    ) -> Dict:
        """Delete or anonymize user data"""
        deleted_categories = []
        anonymized_categories = []
        preserved_categories = []
        
        # Get user data before deletion for audit
        user = await self.db.users.find_one({"user_id": user_id}, {"_id": 0})
        
        if anonymize:
            # Anonymize instead of delete
            anonymous_id = f"deleted_user_{hashlib.md5(user_id.encode()).hexdigest()[:8]}"
            
            # Anonymize profile
            await self.db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "name": "Deleted User",
                    "email": f"{anonymous_id}@deleted.local",
                    "phone": None,
                    "profile_image": None,
                    "address": None,
                    "deleted_at": datetime.now(timezone.utc).isoformat(),
                    "is_deleted": True
                }}
            )
            anonymized_categories.append(DataCategory.PROFILE.value)
            
            # Anonymize listings (keep for marketplace history)
            await self.db.listings.update_many(
                {"seller_id": user_id},
                {"$set": {
                    "seller_name": "Deleted User",
                    "seller_contact": None,
                    "is_seller_deleted": True
                }}
            )
            anonymized_categories.append(DataCategory.LISTINGS.value)
            
            # Anonymize chat messages
            await self.db.messages.update_many(
                {"sender_id": user_id},
                {"$set": {"sender_name": "Deleted User"}}
            )
            anonymized_categories.append(DataCategory.CHATS.value)
            
            # Preserve orders for legal/financial records
            preserved_categories.append(DataCategory.ORDERS.value)
            preserved_categories.append(DataCategory.PAYMENTS.value)
            
        else:
            # Soft delete - move to deleted data collection
            for category in [DataCategory.PROFILE, DataCategory.LISTINGS, DataCategory.CHATS, DataCategory.NOTIFICATIONS]:
                data = await self._get_user_data_by_category(user_id, category)
                if data:
                    await self.deleted_data_collection.insert_one({
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "category": category.value,
                        "data": data,
                        "deleted_at": datetime.now(timezone.utc).isoformat(),
                        "deleted_by": deleted_by,
                        "reason": reason,
                        "can_restore_until": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
                    })
                    deleted_categories.append(category.value)
            
            # Delete from main collections
            await self.db.users.delete_one({"user_id": user_id})
            await self.db.listings.delete_many({"seller_id": user_id})
            await self.db.messages.delete_many({"sender_id": user_id})
            await self.db.notifications.delete_many({"user_id": user_id})
            
            # Preserve orders for legal records
            preserved_categories.append(DataCategory.ORDERS.value)
            preserved_categories.append(DataCategory.PAYMENTS.value)
        
        # Audit log
        await self._log_audit(
            action="user_data_deleted",
            actor_id=deleted_by or "system",
            actor_role="admin",
            target_user_id=user_id,
            data_categories=deleted_categories + anonymized_categories,
            details={
                "anonymize": anonymize,
                "reason": reason,
                "deleted": deleted_categories,
                "anonymized": anonymized_categories,
                "preserved": preserved_categories
            }
        )
        
        return {
            "user_id": user_id,
            "anonymized": anonymize,
            "deleted_categories": deleted_categories,
            "anonymized_categories": anonymized_categories,
            "preserved_categories": preserved_categories,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def restore_deleted_data(
        self,
        user_id: str,
        restored_by: str
    ) -> Dict:
        """Restore soft-deleted user data"""
        # Find deleted data
        cursor = self.deleted_data_collection.find(
            {
                "user_id": user_id,
                "can_restore_until": {"$gt": datetime.now(timezone.utc).isoformat()}
            }
        )
        deleted_records = await cursor.to_list(length=100)
        
        if not deleted_records:
            raise HTTPException(status_code=404, detail="No restorable data found")
        
        restored_categories = []
        
        for record in deleted_records:
            category = record["category"]
            data = record["data"]
            
            if category == DataCategory.PROFILE.value and isinstance(data, dict):
                await self.db.users.insert_one(data)
            elif category == DataCategory.LISTINGS.value and isinstance(data, list):
                if data:
                    await self.db.listings.insert_many(data)
            elif category == DataCategory.CHATS.value and isinstance(data, list):
                if data:
                    await self.db.messages.insert_many(data)
            
            restored_categories.append(category)
        
        # Remove from deleted collection
        await self.deleted_data_collection.delete_many({"user_id": user_id})
        
        # Audit log
        await self._log_audit(
            action="user_data_restored",
            actor_id=restored_by,
            actor_role="admin",
            target_user_id=user_id,
            data_categories=restored_categories,
            details={"restored_count": len(restored_categories)}
        )
        
        return {
            "user_id": user_id,
            "restored_categories": restored_categories,
            "restored_at": datetime.now(timezone.utc).isoformat()
        }
    
    # -------------------------------------------------------------------------
    # CONSENT MANAGEMENT
    # -------------------------------------------------------------------------
    
    async def record_consent(
        self,
        user_id: str,
        category: ConsentCategory,
        granted: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        policy_version: Optional[str] = None
    ) -> Dict:
        """Record user consent"""
        record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "category": category.value,
            "granted": granted,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "ip_address": ip_address,
            "user_agent": user_agent,
            "policy_version": policy_version
        }
        
        await self.consent_collection.insert_one(record)
        
        # Audit log
        await self._log_audit(
            action="consent_updated",
            actor_id=user_id,
            actor_role="user",
            target_user_id=user_id,
            details={"category": category.value, "granted": granted},
            ip_address=ip_address
        )
        
        record.pop("_id", None)
        return record
    
    async def get_user_consents(self, user_id: str) -> Dict[str, Any]:
        """Get current consent status for a user"""
        # Get latest consent for each category
        consents = {}
        
        for category in ConsentCategory:
            latest = await self.consent_collection.find_one(
                {"user_id": user_id, "category": category.value},
                {"_id": 0},
                sort=[("timestamp", -1)]
            )
            consents[category.value] = {
                "granted": latest.get("granted", False) if latest else False,
                "timestamp": latest.get("timestamp") if latest else None,
                "policy_version": latest.get("policy_version") if latest else None
            }
        
        return consents
    
    async def get_consent_history(
        self,
        user_id: str,
        category: Optional[ConsentCategory] = None,
        limit: int = 100
    ) -> List[Dict]:
        """Get consent history for a user"""
        query = {"user_id": user_id}
        if category:
            query["category"] = category.value
        
        cursor = self.consent_collection.find(
            query, {"_id": 0}
        ).sort("timestamp", -1).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    async def bulk_update_consents(
        self,
        user_id: str,
        consents: Dict[str, bool],
        ip_address: Optional[str] = None,
        policy_version: Optional[str] = None
    ) -> Dict:
        """Update multiple consents at once"""
        results = []
        for category_str, granted in consents.items():
            try:
                category = ConsentCategory(category_str)
                result = await self.record_consent(
                    user_id, category, granted, ip_address, None, policy_version
                )
                results.append(result)
            except ValueError:
                pass  # Skip invalid categories
        
        return {
            "user_id": user_id,
            "updated": len(results),
            "consents": results
        }
    
    # -------------------------------------------------------------------------
    # DATA RETENTION POLICIES
    # -------------------------------------------------------------------------
    
    async def get_retention_policies(
        self,
        country_code: Optional[str] = None
    ) -> List[Dict]:
        """Get data retention policies"""
        query = {}
        if country_code:
            query["$or"] = [
                {"country_code": country_code},
                {"country_code": None}
            ]
        
        cursor = self.retention_collection.find(query, {"_id": 0})
        return await cursor.to_list(length=100)
    
    async def set_retention_policy(
        self,
        data_category: DataCategory,
        retention_days: int,
        country_code: Optional[str] = None,
        auto_purge: bool = True,
        soft_delete: bool = True,
        description: Optional[str] = None,
        set_by: str = "admin"
    ) -> Dict:
        """Set or update a retention policy"""
        now = datetime.now(timezone.utc).isoformat()
        
        policy = {
            "data_category": data_category.value,
            "retention_days": retention_days,
            "country_code": country_code,
            "auto_purge": auto_purge,
            "soft_delete": soft_delete,
            "description": description,
            "updated_at": now
        }
        
        existing = await self.retention_collection.find_one({
            "data_category": data_category.value,
            "country_code": country_code
        })
        
        if existing:
            await self.retention_collection.update_one(
                {"data_category": data_category.value, "country_code": country_code},
                {"$set": policy}
            )
            policy["id"] = existing.get("id")
        else:
            policy["id"] = str(uuid.uuid4())
            policy["created_at"] = now
            await self.retention_collection.insert_one(policy)
        
        # Audit log
        await self._log_audit(
            action="retention_policy_updated",
            actor_id=set_by,
            actor_role="admin",
            data_categories=[data_category.value],
            details={"retention_days": retention_days, "country_code": country_code}
        )
        
        return policy
    
    async def delete_retention_policy(
        self,
        data_category: DataCategory,
        country_code: Optional[str] = None,
        deleted_by: str = "admin"
    ):
        """Delete a retention policy"""
        result = await self.retention_collection.delete_one({
            "data_category": data_category.value,
            "country_code": country_code
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Policy not found")
        
        # Audit log
        await self._log_audit(
            action="retention_policy_deleted",
            actor_id=deleted_by,
            actor_role="admin",
            data_categories=[data_category.value],
            details={"country_code": country_code}
        )
    
    async def run_retention_purge(self, dry_run: bool = True) -> Dict:
        """Run data retention purge job"""
        policies = await self.get_retention_policies()
        purge_results = []
        
        for policy in policies:
            category = policy["data_category"]
            retention_days = policy["retention_days"]
            cutoff_date = (datetime.now(timezone.utc) - timedelta(days=retention_days)).isoformat()
            
            # Find expired data
            collection_map = {
                DataCategory.CHATS.value: ("messages", "created_at"),
                DataCategory.NOTIFICATIONS.value: ("notifications", "created_at"),
                DataCategory.ANALYTICS.value: ("analytics_events", "timestamp"),
                DataCategory.AUDIT_LOGS.value: None,  # Never auto-purge audit logs
            }
            
            if category in collection_map and collection_map[category]:
                coll_name, date_field = collection_map[category]
                collection = self.db[coll_name]
                
                count = await collection.count_documents({
                    date_field: {"$lt": cutoff_date}
                })
                
                if not dry_run and count > 0 and policy.get("auto_purge"):
                    if policy.get("soft_delete"):
                        # Move to deleted collection
                        cursor = collection.find({date_field: {"$lt": cutoff_date}})
                        docs = await cursor.to_list(length=10000)
                        if docs:
                            for doc in docs:
                                doc.pop("_id", None)
                            await self.deleted_data_collection.insert_many([
                                {
                                    "id": str(uuid.uuid4()),
                                    "category": category,
                                    "data": doc,
                                    "deleted_at": datetime.now(timezone.utc).isoformat(),
                                    "deleted_by": "retention_job",
                                    "reason": f"Retention policy: {retention_days} days",
                                    "can_restore_until": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
                                }
                                for doc in docs
                            ])
                    
                    await collection.delete_many({date_field: {"$lt": cutoff_date}})
                
                purge_results.append({
                    "category": category,
                    "retention_days": retention_days,
                    "cutoff_date": cutoff_date,
                    "affected_count": count,
                    "purged": not dry_run and count > 0
                })
        
        return {
            "dry_run": dry_run,
            "executed_at": datetime.now(timezone.utc).isoformat(),
            "results": purge_results
        }
    
    # -------------------------------------------------------------------------
    # INCIDENT MANAGEMENT
    # -------------------------------------------------------------------------
    
    async def create_incident(
        self,
        title: str,
        description: str,
        severity: IncidentSeverity,
        affected_users: int = 0,
        affected_data: List[DataCategory] = None,
        created_by: str = "admin"
    ) -> Dict:
        """Create a data incident report"""
        incident = {
            "id": str(uuid.uuid4()),
            "title": title,
            "description": description,
            "severity": severity.value,
            "affected_users": affected_users,
            "affected_data": [d.value for d in (affected_data or [])],
            "discovered_at": datetime.now(timezone.utc).isoformat(),
            "reported_at": None,
            "resolved_at": None,
            "actions_taken": [],
            "notifications_sent": False,
            "reported_to_authority": False,
            "created_by": created_by,
            "status": "open"
        }
        
        await self.incidents_collection.insert_one(incident)
        
        # Audit log
        await self._log_audit(
            action="incident_created",
            actor_id=created_by,
            actor_role="admin",
            data_categories=[d.value for d in (affected_data or [])],
            details={"incident_id": incident["id"], "severity": severity.value}
        )
        
        incident.pop("_id", None)
        return incident
    
    async def get_incidents(
        self,
        status: Optional[str] = None,
        severity: Optional[IncidentSeverity] = None,
        limit: int = 100
    ) -> List[Dict]:
        """Get incidents with filtering"""
        query = {}
        if status:
            query["status"] = status
        if severity:
            query["severity"] = severity.value
        
        cursor = self.incidents_collection.find(
            query, {"_id": 0}
        ).sort("discovered_at", -1).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    async def update_incident(
        self,
        incident_id: str,
        updates: Dict[str, Any],
        updated_by: str
    ) -> Dict:
        """Update an incident"""
        allowed_updates = [
            "status", "actions_taken", "resolved_at", "reported_at",
            "notifications_sent", "reported_to_authority", "notes"
        ]
        
        filtered_updates = {k: v for k, v in updates.items() if k in allowed_updates}
        
        result = await self.incidents_collection.update_one(
            {"id": incident_id},
            {"$set": filtered_updates}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        # Audit log
        await self._log_audit(
            action="incident_updated",
            actor_id=updated_by,
            actor_role="admin",
            details={"incident_id": incident_id, "updates": list(filtered_updates.keys())}
        )
        
        return await self.incidents_collection.find_one({"id": incident_id}, {"_id": 0})
    
    async def add_incident_action(
        self,
        incident_id: str,
        action: str,
        added_by: str
    ) -> Dict:
        """Add an action to an incident"""
        action_entry = {
            "action": action,
            "added_by": added_by,
            "added_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await self.incidents_collection.update_one(
            {"id": incident_id},
            {"$push": {"actions_taken": action_entry}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        return await self.incidents_collection.find_one({"id": incident_id}, {"_id": 0})
    
    # -------------------------------------------------------------------------
    # PRIVACY POLICIES
    # -------------------------------------------------------------------------
    
    async def create_privacy_policy(
        self,
        version: str,
        title: str,
        content: str,
        effective_date: str,
        country_code: Optional[str] = None,
        requires_consent: bool = True,
        created_by: str = "admin"
    ) -> Dict:
        """Create a new privacy policy version"""
        policy = {
            "id": str(uuid.uuid4()),
            "version": version,
            "title": title,
            "content": content,
            "country_code": country_code,
            "effective_date": effective_date,
            "requires_consent": requires_consent,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": created_by
        }
        
        await self.policies_collection.insert_one(policy)
        
        # Audit log
        await self._log_audit(
            action="privacy_policy_created",
            actor_id=created_by,
            actor_role="admin",
            details={"version": version, "country_code": country_code}
        )
        
        policy.pop("_id", None)
        return policy
    
    async def get_privacy_policies(
        self,
        country_code: Optional[str] = None,
        active_only: bool = True
    ) -> List[Dict]:
        """Get privacy policies"""
        query = {}
        if country_code:
            query["$or"] = [
                {"country_code": country_code},
                {"country_code": None}
            ]
        if active_only:
            query["effective_date"] = {"$lte": datetime.now(timezone.utc).isoformat()}
        
        cursor = self.policies_collection.find(
            query, {"_id": 0}
        ).sort("effective_date", -1)
        
        return await cursor.to_list(length=100)
    
    async def get_current_policy(self, country_code: Optional[str] = None) -> Optional[Dict]:
        """Get the current active privacy policy"""
        now = datetime.now(timezone.utc).isoformat()
        
        # Try country-specific first
        if country_code:
            policy = await self.policies_collection.find_one(
                {
                    "country_code": country_code,
                    "effective_date": {"$lte": now}
                },
                {"_id": 0},
                sort=[("effective_date", -1)]
            )
            if policy:
                return policy
        
        # Fallback to global
        return await self.policies_collection.find_one(
            {
                "country_code": None,
                "effective_date": {"$lte": now}
            },
            {"_id": 0},
            sort=[("effective_date", -1)]
        )
    
    async def record_policy_acceptance(
        self,
        user_id: str,
        policy_id: str,
        policy_version: str,
        ip_address: Optional[str] = None
    ) -> Dict:
        """Record user acceptance of a privacy policy"""
        acceptance = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "policy_id": policy_id,
            "policy_version": policy_version,
            "accepted_at": datetime.now(timezone.utc).isoformat(),
            "ip_address": ip_address
        }
        
        await self.user_policy_acceptance.insert_one(acceptance)
        
        # Audit log
        await self._log_audit(
            action="policy_accepted",
            actor_id=user_id,
            actor_role="user",
            target_user_id=user_id,
            details={"policy_version": policy_version},
            ip_address=ip_address
        )
        
        acceptance.pop("_id", None)
        return acceptance
    
    async def check_policy_acceptance(
        self,
        user_id: str,
        country_code: Optional[str] = None
    ) -> Dict:
        """Check if user has accepted the current policy"""
        current_policy = await self.get_current_policy(country_code)
        
        if not current_policy:
            return {"needs_acceptance": False, "reason": "no_policy_found"}
        
        acceptance = await self.user_policy_acceptance.find_one(
            {
                "user_id": user_id,
                "policy_version": current_policy["version"]
            },
            {"_id": 0}
        )
        
        if acceptance:
            return {
                "needs_acceptance": False,
                "accepted_at": acceptance.get("accepted_at"),
                "policy_version": current_policy["version"]
            }
        
        return {
            "needs_acceptance": True,
            "policy_id": current_policy["id"],
            "policy_version": current_policy["version"],
            "policy_title": current_policy["title"]
        }
    
    # -------------------------------------------------------------------------
    # THIRD-PARTY PROCESSORS
    # -------------------------------------------------------------------------
    
    def get_third_party_processors(self) -> List[Dict]:
        """Get list of third-party data processors"""
        return THIRD_PARTY_PROCESSORS
    
    # -------------------------------------------------------------------------
    # COMPLIANCE DASHBOARD
    # -------------------------------------------------------------------------
    
    async def get_compliance_dashboard(self) -> Dict:
        """Get compliance dashboard summary"""
        now = datetime.now(timezone.utc)
        
        # DSAR statistics
        dsar_stats = await self.get_dsar_statistics()
        
        # Pending requests with SLA info
        pending_requests = await self.dsar_collection.find(
            {"status": {"$in": [DSARStatus.PENDING.value, DSARStatus.IN_PROGRESS.value]}},
            {"_id": 0}
        ).sort("deadline", 1).to_list(length=10)
        
        # Calculate days until deadline
        for req in pending_requests:
            deadline = datetime.fromisoformat(req["deadline"].replace("Z", "+00:00"))
            days_left = (deadline - now).days
            req["days_until_deadline"] = days_left
            req["is_urgent"] = days_left <= 7
            req["is_overdue"] = days_left < 0
        
        # Open incidents
        open_incidents = await self.incidents_collection.count_documents(
            {"status": {"$in": ["open", "investigating"]}}
        )
        
        critical_incidents = await self.incidents_collection.count_documents(
            {"status": {"$in": ["open", "investigating"]}, "severity": "critical"}
        )
        
        # Recent audit activity
        recent_audits = await self.audit_collection.find(
            {}, {"_id": 0}
        ).sort("timestamp", -1).limit(5).to_list(length=5)
        
        return {
            "dsar_summary": {
                "pending": dsar_stats.get("pending", 0),
                "in_progress": dsar_stats.get("in_progress", 0),
                "completed": dsar_stats.get("completed", 0),
                "overdue": dsar_stats.get("overdue", 0),
                "total": dsar_stats.get("total", 0)
            },
            "upcoming_deadlines": pending_requests,
            "incidents": {
                "open": open_incidents,
                "critical": critical_incidents
            },
            "recent_audit_activity": recent_audits,
            "risk_indicators": {
                "overdue_requests": dsar_stats.get("overdue", 0) > 0,
                "critical_incidents": critical_incidents > 0,
                "high_pending_count": dsar_stats.get("pending", 0) > 10
            },
            "generated_at": now.isoformat()
        }


# =========================================================================
# API ROUTER
# =========================================================================

def create_compliance_router(db):
    """Create compliance router"""
    router = APIRouter(prefix="/compliance", tags=["Data Privacy & Compliance"])
    service = ComplianceService(db)
    
    # -------------------------------------------------------------------------
    # DASHBOARD
    # -------------------------------------------------------------------------
    
    @router.get("/dashboard")
    async def get_dashboard():
        """Get compliance dashboard summary"""
        return await service.get_compliance_dashboard()
    
    # -------------------------------------------------------------------------
    # DSAR ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.get("/dsar")
    async def get_dsar_requests(
        status: Optional[DSARStatus] = None,
        request_type: Optional[DSARType] = None,
        user_id: Optional[str] = None,
        limit: int = Query(100, le=500),
        skip: int = Query(0, ge=0)
    ):
        """Get DSAR requests"""
        return await service.get_dsar_requests(status, request_type, user_id, limit, skip)
    
    @router.get("/dsar/stats")
    async def get_dsar_stats():
        """Get DSAR statistics"""
        return await service.get_dsar_statistics()
    
    @router.get("/dsar/{request_id}")
    async def get_dsar(request_id: str):
        """Get a single DSAR request"""
        request = await service.get_dsar_by_id(request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        return request
    
    @router.post("/dsar")
    async def create_dsar(
        user_id: str = Body(...),
        user_email: str = Body(...),
        request_type: DSARType = Body(...),
        regulation: ComplianceRegulation = Body(ComplianceRegulation.GDPR),
        data_categories: List[DataCategory] = Body(None),
        reason: Optional[str] = Body(None),
        user_name: Optional[str] = Body(None)
    ):
        """Create a new DSAR request"""
        return await service.create_dsar(
            user_id, user_email, request_type, regulation, data_categories, reason, user_name
        )
    
    @router.put("/dsar/{request_id}/status")
    async def update_dsar_status(
        request_id: str,
        status: DSARStatus = Body(...),
        processed_by: str = Body("admin"),
        notes: Optional[str] = Body(None),
        export_file: Optional[str] = Body(None)
    ):
        """Update DSAR request status"""
        return await service.update_dsar_status(request_id, status, processed_by, notes, export_file)
    
    # -------------------------------------------------------------------------
    # DATA EXPORT ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.post("/export/{user_id}")
    async def export_user_data(
        user_id: str,
        data_categories: List[DataCategory] = Body(...),
        format: Literal["json", "csv"] = Body("json"),
        actor_id: str = Body("admin")
    ):
        """Export user data"""
        return await service.export_user_data(user_id, data_categories, format, actor_id)
    
    # -------------------------------------------------------------------------
    # DELETION ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.post("/delete/{user_id}")
    async def delete_user_data(
        user_id: str,
        anonymize: bool = Body(True),
        deleted_by: str = Body("admin"),
        reason: Optional[str] = Body(None)
    ):
        """Delete or anonymize user data"""
        return await service.delete_user_data(user_id, anonymize, deleted_by, reason)
    
    @router.post("/restore/{user_id}")
    async def restore_user_data(
        user_id: str,
        restored_by: str = Body("admin")
    ):
        """Restore soft-deleted user data"""
        return await service.restore_deleted_data(user_id, restored_by)
    
    # -------------------------------------------------------------------------
    # CONSENT ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.get("/consent/{user_id}")
    async def get_user_consents(user_id: str):
        """Get user consent status"""
        return await service.get_user_consents(user_id)
    
    @router.get("/consent/{user_id}/history")
    async def get_consent_history(
        user_id: str,
        category: Optional[ConsentCategory] = None,
        limit: int = Query(100, le=500)
    ):
        """Get user consent history"""
        return await service.get_consent_history(user_id, category, limit)
    
    @router.post("/consent/{user_id}")
    async def record_consent(
        user_id: str,
        category: ConsentCategory = Body(...),
        granted: bool = Body(...),
        ip_address: Optional[str] = Body(None),
        policy_version: Optional[str] = Body(None)
    ):
        """Record user consent"""
        return await service.record_consent(user_id, category, granted, ip_address, None, policy_version)
    
    @router.put("/consent/{user_id}/bulk")
    async def bulk_update_consents(
        user_id: str,
        consents: Dict[str, bool] = Body(...),
        ip_address: Optional[str] = Body(None),
        policy_version: Optional[str] = Body(None)
    ):
        """Bulk update user consents"""
        return await service.bulk_update_consents(user_id, consents, ip_address, policy_version)
    
    # -------------------------------------------------------------------------
    # RETENTION POLICY ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.get("/retention")
    async def get_retention_policies(country_code: Optional[str] = None):
        """Get data retention policies"""
        return await service.get_retention_policies(country_code)
    
    @router.post("/retention")
    async def set_retention_policy(
        data_category: DataCategory = Body(...),
        retention_days: int = Body(...),
        country_code: Optional[str] = Body(None),
        auto_purge: bool = Body(True),
        soft_delete: bool = Body(True),
        description: Optional[str] = Body(None),
        set_by: str = Body("admin")
    ):
        """Set a retention policy"""
        return await service.set_retention_policy(
            data_category, retention_days, country_code, auto_purge, soft_delete, description, set_by
        )
    
    @router.delete("/retention")
    async def delete_retention_policy(
        data_category: DataCategory = Query(...),
        country_code: Optional[str] = Query(None),
        deleted_by: str = Query("admin")
    ):
        """Delete a retention policy"""
        await service.delete_retention_policy(data_category, country_code, deleted_by)
        return {"message": "Policy deleted"}
    
    @router.post("/retention/purge")
    async def run_retention_purge(dry_run: bool = Body(True)):
        """Run retention purge job"""
        return await service.run_retention_purge(dry_run)
    
    # -------------------------------------------------------------------------
    # INCIDENT ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.get("/incidents")
    async def get_incidents(
        status: Optional[str] = None,
        severity: Optional[IncidentSeverity] = None,
        limit: int = Query(100, le=500)
    ):
        """Get incidents"""
        return await service.get_incidents(status, severity, limit)
    
    @router.post("/incidents")
    async def create_incident(
        title: str = Body(...),
        description: str = Body(...),
        severity: IncidentSeverity = Body(...),
        affected_users: int = Body(0),
        affected_data: List[DataCategory] = Body(None),
        created_by: str = Body("admin")
    ):
        """Create an incident"""
        return await service.create_incident(
            title, description, severity, affected_users, affected_data, created_by
        )
    
    @router.put("/incidents/{incident_id}")
    async def update_incident(
        incident_id: str,
        updates: Dict[str, Any] = Body(...),
        updated_by: str = Body("admin")
    ):
        """Update an incident"""
        return await service.update_incident(incident_id, updates, updated_by)
    
    @router.post("/incidents/{incident_id}/action")
    async def add_incident_action(
        incident_id: str,
        action: str = Body(..., embed=True),
        added_by: str = Body("admin", embed=True)
    ):
        """Add an action to an incident"""
        return await service.add_incident_action(incident_id, action, added_by)
    
    # -------------------------------------------------------------------------
    # PRIVACY POLICY ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.get("/policies")
    async def get_privacy_policies(
        country_code: Optional[str] = None,
        active_only: bool = True
    ):
        """Get privacy policies"""
        return await service.get_privacy_policies(country_code, active_only)
    
    @router.get("/policies/current")
    async def get_current_policy(country_code: Optional[str] = None):
        """Get current active privacy policy"""
        policy = await service.get_current_policy(country_code)
        if not policy:
            raise HTTPException(status_code=404, detail="No active policy found")
        return policy
    
    @router.post("/policies")
    async def create_privacy_policy(
        version: str = Body(...),
        title: str = Body(...),
        content: str = Body(...),
        effective_date: str = Body(...),
        country_code: Optional[str] = Body(None),
        requires_consent: bool = Body(True),
        created_by: str = Body("admin")
    ):
        """Create a privacy policy"""
        return await service.create_privacy_policy(
            version, title, content, effective_date, country_code, requires_consent, created_by
        )
    
    @router.post("/policies/accept")
    async def accept_policy(
        user_id: str = Body(...),
        policy_id: str = Body(...),
        policy_version: str = Body(...),
        ip_address: Optional[str] = Body(None)
    ):
        """Record policy acceptance"""
        return await service.record_policy_acceptance(user_id, policy_id, policy_version, ip_address)
    
    @router.get("/policies/check/{user_id}")
    async def check_policy_acceptance(
        user_id: str,
        country_code: Optional[str] = None
    ):
        """Check if user needs to accept policy"""
        return await service.check_policy_acceptance(user_id, country_code)
    
    # -------------------------------------------------------------------------
    # THIRD-PARTY PROCESSORS
    # -------------------------------------------------------------------------
    
    @router.get("/third-party")
    async def get_third_party_processors():
        """Get list of third-party data processors"""
        return service.get_third_party_processors()
    
    # -------------------------------------------------------------------------
    # AUDIT ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.get("/audit")
    async def get_audit_logs(
        actor_id: Optional[str] = None,
        target_user_id: Optional[str] = None,
        action: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = Query(100, le=500),
        skip: int = Query(0, ge=0)
    ):
        """Get compliance audit logs"""
        return await service.get_audit_logs(
            actor_id, target_user_id, action, start_date, end_date, limit, skip
        )
    
    return router, service
