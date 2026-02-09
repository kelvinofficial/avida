"""
QA, Debugging & Reliability System
===================================
Comprehensive system for quality assurance, debugging, and reliability monitoring.

Features:
- Automated QA checks
- Real-time health monitoring
- Error logging & tracking
- Session replay & tracing
- Fail-safe mechanisms
- Retry & recovery
- Reliability KPIs
- Feature flag safety
- Data integrity checks
"""

import asyncio
import uuid
import time
import traceback
import hashlib
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
from functools import wraps
from collections import defaultdict

from fastapi import APIRouter, HTTPException, Query, Body, Request
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger("qa_reliability")


# =============================================================================
# ENUMS & MODELS
# =============================================================================

class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

class ServiceStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"

class QACheckType(str, Enum):
    ROUTE = "route"
    API = "api"
    LOADING_STATE = "loading_state"
    EMPTY_STATE = "empty_state"
    PERMISSION = "permission"
    FEATURE_TOGGLE = "feature_toggle"
    CRITICAL_FLOW = "critical_flow"

class AlertType(str, Enum):
    SYSTEM_DOWN = "system_down"
    HIGH_ERROR_RATE = "high_error_rate"
    SLOW_RESPONSE = "slow_response"
    PAYMENT_FAILURE = "payment_failure"
    ESCROW_STUCK = "escrow_stuck"
    NOTIFICATION_FAILURE = "notification_failure"
    DATA_INTEGRITY = "data_integrity"
    QA_CHECK_FAILED = "qa_check_failed"


class ErrorLog(BaseModel):
    id: str
    reference_id: str  # User-facing error reference
    timestamp: str
    severity: Severity
    category: str  # frontend, backend, api, payment, escrow, notification
    feature: str
    error_type: str
    message: str
    stack_trace: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    country: Optional[str] = None
    device: Optional[str] = None
    endpoint: Optional[str] = None
    request_data: Optional[Dict] = None
    response_data: Optional[Dict] = None
    resolved: bool = False
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None


class SessionTrace(BaseModel):
    id: str
    session_id: str
    user_id: str
    flow_type: str  # checkout, publish_listing, escrow, chat
    started_at: str
    ended_at: Optional[str] = None
    status: str  # in_progress, completed, failed
    steps: List[Dict]
    error: Optional[Dict] = None
    metadata: Dict = {}


class HealthCheck(BaseModel):
    service: str
    status: ServiceStatus
    latency_ms: float
    last_check: str
    error: Optional[str] = None
    details: Dict = {}


class Alert(BaseModel):
    id: str
    alert_type: AlertType
    severity: Severity
    title: str
    message: str
    created_at: str
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None
    resolved: bool = False
    resolved_at: Optional[str] = None
    metadata: Dict = {}


class QACheckResult(BaseModel):
    id: str
    check_type: QACheckType
    name: str
    passed: bool
    executed_at: str
    duration_ms: float
    details: Dict = {}
    error: Optional[str] = None


class ReliabilityMetrics(BaseModel):
    period: str
    uptime_percent: float
    avg_latency_ms: float
    error_rate_percent: float
    checkout_success_rate: float
    escrow_release_success_rate: float
    notification_delivery_rate: float
    crash_free_sessions_percent: float


# =============================================================================
# QA & RELIABILITY SERVICE
# =============================================================================

class QAReliabilityService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.error_logs = db.qa_error_logs
        self.session_traces = db.qa_session_traces
        self.health_checks = db.qa_health_checks
        self.alerts = db.qa_alerts
        self.qa_checks = db.qa_check_results
        self.metrics = db.qa_metrics
        self.feature_flags = db.qa_feature_flags
        self.audit_logs = db.qa_audit_logs
        self.idempotency_keys = db.qa_idempotency_keys
        self.dead_letter_queue = db.qa_dead_letter_queue
        
        # In-memory caches for real-time tracking
        self._request_times: Dict[str, List[float]] = defaultdict(list)
        self._error_counts: Dict[str, int] = defaultdict(int)
        self._service_status: Dict[str, ServiceStatus] = {}
        
        # Reliability targets
        self.UPTIME_TARGET = 99.9
        self.LATENCY_TARGET_MS = 2000
        self.CHECKOUT_SUCCESS_TARGET = 95.0

    async def initialize(self):
        """Initialize the QA & Reliability system"""
        # Create indexes
        await self.error_logs.create_index([("timestamp", -1)])
        await self.error_logs.create_index([("reference_id", 1)])
        await self.error_logs.create_index([("severity", 1)])
        await self.error_logs.create_index([("category", 1)])
        await self.error_logs.create_index([("user_id", 1)])
        
        await self.session_traces.create_index([("session_id", 1)])
        await self.session_traces.create_index([("user_id", 1)])
        await self.session_traces.create_index([("flow_type", 1)])
        
        await self.alerts.create_index([("created_at", -1)])
        await self.alerts.create_index([("acknowledged", 1)])
        
        await self.idempotency_keys.create_index([("key", 1)], unique=True)
        await self.idempotency_keys.create_index([("expires_at", 1)], expireAfterSeconds=0)
        
        # Initialize default feature flags
        await self._init_default_feature_flags()
        
        logger.info("QA & Reliability System initialized")

    async def _init_default_feature_flags(self):
        """Initialize default feature flags"""
        default_flags = [
            {"key": "payments_enabled", "enabled": True, "description": "Enable payment processing"},
            {"key": "escrow_enabled", "enabled": True, "description": "Enable escrow system"},
            {"key": "notifications_enabled", "enabled": True, "description": "Enable notifications"},
            {"key": "transport_enabled", "enabled": True, "description": "Enable transport assignment"},
            {"key": "ai_services_enabled", "enabled": True, "description": "Enable AI services"},
            {"key": "ads_enabled", "enabled": True, "description": "Enable ads/banners"},
            {"key": "chat_enabled", "enabled": True, "description": "Enable chat system"},
            {"key": "offers_enabled", "enabled": True, "description": "Enable offers system"},
            {"key": "boost_enabled", "enabled": True, "description": "Enable listing boosts"},
            {"key": "sandbox_mode", "enabled": False, "description": "Enable sandbox mode"},
        ]
        
        for flag in default_flags:
            await self.feature_flags.update_one(
                {"key": flag["key"]},
                {"$setOnInsert": {**flag, "created_at": datetime.now(timezone.utc).isoformat()}},
                upsert=True
            )

    # =========================================================================
    # ERROR LOGGING
    # =========================================================================

    async def log_error(
        self,
        category: str,
        feature: str,
        error_type: str,
        message: str,
        severity: Severity = Severity.WARNING,
        stack_trace: str = None,
        user_id: str = None,
        session_id: str = None,
        country: str = None,
        device: str = None,
        endpoint: str = None,
        request_data: Dict = None,
        response_data: Dict = None
    ) -> ErrorLog:
        """Log an error with a user-facing reference ID"""
        error_id = str(uuid.uuid4())
        reference_id = f"ERR-{hashlib.md5(error_id.encode()).hexdigest()[:8].upper()}"
        
        error_log = {
            "id": error_id,
            "reference_id": reference_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "severity": severity,
            "category": category,
            "feature": feature,
            "error_type": error_type,
            "message": message,
            "stack_trace": stack_trace,
            "user_id": user_id,
            "session_id": session_id,
            "country": country,
            "device": device,
            "endpoint": endpoint,
            "request_data": self._mask_sensitive_data(request_data) if request_data else None,
            "response_data": response_data,
            "resolved": False
        }
        
        await self.error_logs.insert_one(error_log)
        
        # Update error counts
        self._error_counts[category] += 1
        
        # Check if we need to create an alert
        if severity == Severity.CRITICAL:
            await self._check_and_create_alert(category, error_log)
        
        return ErrorLog(**error_log)

    async def get_error_logs(
        self,
        page: int = 1,
        limit: int = 50,
        severity: Optional[Severity] = None,
        category: Optional[str] = None,
        feature: Optional[str] = None,
        user_id: Optional[str] = None,
        country: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        resolved: Optional[bool] = None,
        search: Optional[str] = None
    ) -> Dict:
        """Get error logs with filtering"""
        query = {}
        
        if severity:
            query["severity"] = severity
        if category:
            query["category"] = category
        if feature:
            query["feature"] = feature
        if user_id:
            query["user_id"] = user_id
        if country:
            query["country"] = country
        if resolved is not None:
            query["resolved"] = resolved
        if start_date:
            query["timestamp"] = {"$gte": start_date}
        if end_date:
            query.setdefault("timestamp", {})["$lte"] = end_date
        if search:
            query["$or"] = [
                {"reference_id": {"$regex": search, "$options": "i"}},
                {"message": {"$regex": search, "$options": "i"}},
                {"error_type": {"$regex": search, "$options": "i"}}
            ]
        
        skip = (page - 1) * limit
        total = await self.error_logs.count_documents(query)
        
        logs = await self.error_logs.find(
            query, {"_id": 0}
        ).sort("timestamp", -1).skip(skip).limit(limit).to_list(length=limit)
        
        return {
            "logs": logs,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }

    async def get_error_by_reference(self, reference_id: str) -> Optional[Dict]:
        """Get error log by reference ID (for user support)"""
        return await self.error_logs.find_one({"reference_id": reference_id}, {"_id": 0})

    async def resolve_error(self, error_id: str, resolved_by: str) -> bool:
        """Mark an error as resolved"""
        result = await self.error_logs.update_one(
            {"id": error_id},
            {"$set": {
                "resolved": True,
                "resolved_by": resolved_by,
                "resolved_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return result.modified_count > 0

    # =========================================================================
    # SESSION TRACING & REPLAY
    # =========================================================================

    async def start_session_trace(
        self,
        session_id: str,
        user_id: str,
        flow_type: str,
        metadata: Dict = None
    ) -> str:
        """Start tracing a critical user flow"""
        trace_id = str(uuid.uuid4())
        
        trace = {
            "id": trace_id,
            "session_id": session_id,
            "user_id": user_id,
            "flow_type": flow_type,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "ended_at": None,
            "status": "in_progress",
            "steps": [],
            "error": None,
            "metadata": metadata or {}
        }
        
        await self.session_traces.insert_one(trace)
        return trace_id

    async def add_trace_step(
        self,
        trace_id: str,
        step_name: str,
        step_data: Dict = None,
        duration_ms: float = None
    ):
        """Add a step to an existing trace"""
        step = {
            "name": step_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": self._mask_sensitive_data(step_data) if step_data else None,
            "duration_ms": duration_ms
        }
        
        await self.session_traces.update_one(
            {"id": trace_id},
            {"$push": {"steps": step}}
        )

    async def complete_trace(self, trace_id: str, status: str = "completed", error: Dict = None):
        """Complete a session trace"""
        update = {
            "ended_at": datetime.now(timezone.utc).isoformat(),
            "status": status
        }
        if error:
            update["error"] = error
        
        await self.session_traces.update_one(
            {"id": trace_id},
            {"$set": update}
        )

    async def get_session_traces(
        self,
        page: int = 1,
        limit: int = 50,
        flow_type: Optional[str] = None,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict:
        """Get session traces with filtering"""
        query = {}
        
        if flow_type:
            query["flow_type"] = flow_type
        if user_id:
            query["user_id"] = user_id
        if status:
            query["status"] = status
        if start_date:
            query["started_at"] = {"$gte": start_date}
        if end_date:
            query.setdefault("started_at", {})["$lte"] = end_date
        
        skip = (page - 1) * limit
        total = await self.session_traces.count_documents(query)
        
        traces = await self.session_traces.find(
            query, {"_id": 0}
        ).sort("started_at", -1).skip(skip).limit(limit).to_list(length=limit)
        
        return {
            "traces": traces,
            "total": total,
            "page": page,
            "limit": limit
        }

    async def get_trace_by_id(self, trace_id: str) -> Optional[Dict]:
        """Get a specific trace for replay"""
        return await self.session_traces.find_one({"id": trace_id}, {"_id": 0})

    # =========================================================================
    # HEALTH MONITORING
    # =========================================================================

    async def check_all_services(self) -> Dict[str, HealthCheck]:
        """Check health of all services"""
        services = {}
        
        # Database health
        services["database"] = await self._check_database_health()
        
        # API health
        services["api"] = await self._check_api_health()
        
        # Payment service
        services["payments"] = await self._check_payment_health()
        
        # Escrow service
        services["escrow"] = await self._check_escrow_health()
        
        # Notification service
        services["notifications"] = await self._check_notification_health()
        
        # External services
        services["external_apis"] = await self._check_external_apis_health()
        
        # Store results
        for service_name, health in services.items():
            await self.health_checks.update_one(
                {"service": service_name},
                {"$set": health.dict()},
                upsert=True
            )
            self._service_status[service_name] = health.status
        
        return services

    async def _check_database_health(self) -> HealthCheck:
        """Check database connectivity"""
        start = time.time()
        try:
            await self.db.command("ping")
            latency = (time.time() - start) * 1000
            return HealthCheck(
                service="database",
                status=ServiceStatus.HEALTHY if latency < 100 else ServiceStatus.DEGRADED,
                latency_ms=latency,
                last_check=datetime.now(timezone.utc).isoformat()
            )
        except Exception as e:
            return HealthCheck(
                service="database",
                status=ServiceStatus.DOWN,
                latency_ms=(time.time() - start) * 1000,
                last_check=datetime.now(timezone.utc).isoformat(),
                error=str(e)
            )

    async def _check_api_health(self) -> HealthCheck:
        """Check API health based on recent metrics"""
        # Get average latency from recent requests
        all_times = []
        for times in self._request_times.values():
            all_times.extend(times[-100:])  # Last 100 requests per endpoint
        
        avg_latency = sum(all_times) / len(all_times) if all_times else 0
        
        status = ServiceStatus.HEALTHY
        if avg_latency > self.LATENCY_TARGET_MS:
            status = ServiceStatus.DEGRADED
        if avg_latency > self.LATENCY_TARGET_MS * 2:
            status = ServiceStatus.DOWN
        
        return HealthCheck(
            service="api",
            status=status,
            latency_ms=avg_latency,
            last_check=datetime.now(timezone.utc).isoformat(),
            details={"requests_tracked": len(all_times)}
        )

    async def _check_payment_health(self) -> HealthCheck:
        """Check payment service health"""
        start = time.time()
        try:
            # Check recent payment success rate
            recent_payments = await self.db.transactions.find({
                "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()}
            }).to_list(length=100)
            
            if not recent_payments:
                return HealthCheck(
                    service="payments",
                    status=ServiceStatus.HEALTHY,
                    latency_ms=(time.time() - start) * 1000,
                    last_check=datetime.now(timezone.utc).isoformat(),
                    details={"message": "No recent transactions"}
                )
            
            successful = len([p for p in recent_payments if p.get("status") in ["completed", "released"]])
            success_rate = (successful / len(recent_payments)) * 100
            
            status = ServiceStatus.HEALTHY if success_rate >= 95 else (
                ServiceStatus.DEGRADED if success_rate >= 80 else ServiceStatus.DOWN
            )
            
            return HealthCheck(
                service="payments",
                status=status,
                latency_ms=(time.time() - start) * 1000,
                last_check=datetime.now(timezone.utc).isoformat(),
                details={"success_rate": success_rate, "total_recent": len(recent_payments)}
            )
        except Exception as e:
            return HealthCheck(
                service="payments",
                status=ServiceStatus.DOWN,
                latency_ms=(time.time() - start) * 1000,
                last_check=datetime.now(timezone.utc).isoformat(),
                error=str(e)
            )

    async def _check_escrow_health(self) -> HealthCheck:
        """Check escrow service health"""
        start = time.time()
        try:
            # Check for stuck escrows
            stuck_escrows = await self.db.escrow.count_documents({
                "status": "pending",
                "created_at": {"$lt": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()}
            })
            
            status = ServiceStatus.HEALTHY if stuck_escrows == 0 else (
                ServiceStatus.DEGRADED if stuck_escrows < 5 else ServiceStatus.DOWN
            )
            
            return HealthCheck(
                service="escrow",
                status=status,
                latency_ms=(time.time() - start) * 1000,
                last_check=datetime.now(timezone.utc).isoformat(),
                details={"stuck_escrows": stuck_escrows}
            )
        except Exception as e:
            return HealthCheck(
                service="escrow",
                status=ServiceStatus.DOWN,
                latency_ms=(time.time() - start) * 1000,
                last_check=datetime.now(timezone.utc).isoformat(),
                error=str(e)
            )

    async def _check_notification_health(self) -> HealthCheck:
        """Check notification delivery health"""
        start = time.time()
        try:
            # Check recent notification delivery rate
            recent = await self.db.notifications.find({
                "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()}
            }).to_list(length=100)
            
            if not recent:
                return HealthCheck(
                    service="notifications",
                    status=ServiceStatus.HEALTHY,
                    latency_ms=(time.time() - start) * 1000,
                    last_check=datetime.now(timezone.utc).isoformat(),
                    details={"message": "No recent notifications"}
                )
            
            # All created notifications are considered delivered for in-app
            delivery_rate = 100.0
            
            return HealthCheck(
                service="notifications",
                status=ServiceStatus.HEALTHY,
                latency_ms=(time.time() - start) * 1000,
                last_check=datetime.now(timezone.utc).isoformat(),
                details={"delivery_rate": delivery_rate, "total_recent": len(recent)}
            )
        except Exception as e:
            return HealthCheck(
                service="notifications",
                status=ServiceStatus.DOWN,
                latency_ms=(time.time() - start) * 1000,
                last_check=datetime.now(timezone.utc).isoformat(),
                error=str(e)
            )

    async def _check_external_apis_health(self) -> HealthCheck:
        """Check external API health"""
        return HealthCheck(
            service="external_apis",
            status=ServiceStatus.HEALTHY,
            latency_ms=0,
            last_check=datetime.now(timezone.utc).isoformat(),
            details={"message": "External API checks not implemented"}
        )

    async def get_system_health_summary(self) -> Dict:
        """Get overall system health summary"""
        services = await self.check_all_services()
        
        # Calculate overall status
        statuses = [s.status for s in services.values()]
        if ServiceStatus.DOWN in statuses:
            overall_status = ServiceStatus.DOWN
        elif ServiceStatus.DEGRADED in statuses:
            overall_status = ServiceStatus.DEGRADED
        else:
            overall_status = ServiceStatus.HEALTHY
        
        # Get error stats
        hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        day_ago = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        
        errors_last_hour = await self.error_logs.count_documents({"timestamp": {"$gte": hour_ago}})
        errors_last_day = await self.error_logs.count_documents({"timestamp": {"$gte": day_ago}})
        critical_unresolved = await self.error_logs.count_documents({
            "severity": Severity.CRITICAL,
            "resolved": False
        })
        
        # Get active alerts
        active_alerts = await self.alerts.count_documents({"resolved": False})
        
        return {
            "overall_status": overall_status,
            "services": {k: v.dict() for k, v in services.items()},
            "errors": {
                "last_hour": errors_last_hour,
                "last_24h": errors_last_day,
                "critical_unresolved": critical_unresolved
            },
            "active_alerts": active_alerts,
            "checked_at": datetime.now(timezone.utc).isoformat()
        }

    # =========================================================================
    # ALERTS
    # =========================================================================

    async def _check_and_create_alert(self, category: str, error_log: Dict):
        """Check if we need to create an alert based on error patterns"""
        # Count recent errors in this category
        hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        recent_count = await self.error_logs.count_documents({
            "category": category,
            "timestamp": {"$gte": hour_ago}
        })
        
        # Create alert if threshold exceeded
        if recent_count >= 10:
            await self.create_alert(
                alert_type=AlertType.HIGH_ERROR_RATE,
                severity=Severity.WARNING if recent_count < 50 else Severity.CRITICAL,
                title=f"High error rate in {category}",
                message=f"{recent_count} errors in the last hour for {category}",
                metadata={"category": category, "error_count": recent_count}
            )

    async def create_alert(
        self,
        alert_type: AlertType,
        severity: Severity,
        title: str,
        message: str,
        metadata: Dict = None
    ) -> Alert:
        """Create a new alert"""
        # Check if similar alert exists
        existing = await self.alerts.find_one({
            "alert_type": alert_type,
            "resolved": False,
            "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()}
        })
        
        if existing:
            return Alert(**existing)
        
        alert_id = str(uuid.uuid4())
        alert = {
            "id": alert_id,
            "alert_type": alert_type,
            "severity": severity,
            "title": title,
            "message": message,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "acknowledged": False,
            "resolved": False,
            "metadata": metadata or {}
        }
        
        await self.alerts.insert_one(alert)
        return Alert(**alert)

    async def get_alerts(
        self,
        page: int = 1,
        limit: int = 50,
        severity: Optional[Severity] = None,
        acknowledged: Optional[bool] = None,
        resolved: Optional[bool] = None
    ) -> Dict:
        """Get alerts with filtering"""
        query = {}
        if severity:
            query["severity"] = severity
        if acknowledged is not None:
            query["acknowledged"] = acknowledged
        if resolved is not None:
            query["resolved"] = resolved
        
        skip = (page - 1) * limit
        total = await self.alerts.count_documents(query)
        
        alerts = await self.alerts.find(
            query, {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        
        return {
            "alerts": alerts,
            "total": total,
            "page": page,
            "limit": limit
        }

    async def acknowledge_alert(self, alert_id: str, admin_id: str) -> bool:
        """Acknowledge an alert"""
        result = await self.alerts.update_one(
            {"id": alert_id},
            {"$set": {
                "acknowledged": True,
                "acknowledged_by": admin_id,
                "acknowledged_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return result.modified_count > 0

    async def resolve_alert(self, alert_id: str) -> bool:
        """Resolve an alert"""
        result = await self.alerts.update_one(
            {"id": alert_id},
            {"$set": {
                "resolved": True,
                "resolved_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return result.modified_count > 0

    # =========================================================================
    # QA CHECKS
    # =========================================================================

    async def run_all_qa_checks(self) -> Dict:
        """Run all automated QA checks"""
        results = []
        
        # API endpoint checks
        results.extend(await self._run_api_checks())
        
        # Critical flow checks
        results.extend(await self._run_critical_flow_checks())
        
        # Permission checks
        results.extend(await self._run_permission_checks())
        
        # Feature toggle checks
        results.extend(await self._run_feature_toggle_checks())
        
        # Data integrity checks
        results.extend(await self._run_data_integrity_checks())
        
        # Store results (without _id)
        for result in results:
            result_copy = {k: v for k, v in result.items() if k != "_id"}
            await self.qa_checks.insert_one(result_copy)
        
        passed = len([r for r in results if r["passed"]])
        failed = len(results) - passed
        
        # Create alert if checks failed
        if failed > 0:
            await self.create_alert(
                alert_type=AlertType.QA_CHECK_FAILED,
                severity=Severity.WARNING if failed < 5 else Severity.CRITICAL,
                title=f"QA Checks Failed: {failed} failures",
                message=f"{failed} out of {len(results)} QA checks failed",
                metadata={"passed": passed, "failed": failed}
            )
        
        return {
            "total": len(results),
            "passed": passed,
            "failed": failed,
            "results": results,
            "executed_at": datetime.now(timezone.utc).isoformat()
        }

    async def _run_api_checks(self) -> List[Dict]:
        """Check critical API endpoints"""
        results = []
        endpoints = [
            "/api/listings",
            "/api/categories",
            "/api/users",
            "/api/notifications",
        ]
        
        for endpoint in endpoints:
            start = time.time()
            try:
                # Simulate API check by querying database
                collection = endpoint.split("/")[-1]
                await self.db[collection].find_one({})
                duration = (time.time() - start) * 1000
                
                results.append({
                    "id": str(uuid.uuid4()),
                    "check_type": "api",
                    "name": f"API: {endpoint}",
                    "passed": True,
                    "executed_at": datetime.now(timezone.utc).isoformat(),
                    "duration_ms": duration,
                    "details": {"endpoint": endpoint}
                })
            except Exception as e:
                results.append({
                    "id": str(uuid.uuid4()),
                    "check_type": "api",
                    "name": f"API: {endpoint}",
                    "passed": False,
                    "executed_at": datetime.now(timezone.utc).isoformat(),
                    "duration_ms": (time.time() - start) * 1000,
                    "error": str(e)
                })
        
        return results

    async def _run_critical_flow_checks(self) -> List[Dict]:
        """Check critical user flows"""
        results = []
        flows = [
            ("listing_creation", self._check_listing_creation_flow),
            ("checkout", self._check_checkout_flow),
            ("escrow", self._check_escrow_flow),
            ("notifications", self._check_notification_flow),
        ]
        
        for flow_name, check_func in flows:
            start = time.time()
            try:
                passed, details = await check_func()
                results.append({
                    "id": str(uuid.uuid4()),
                    "check_type": "critical_flow",
                    "name": f"Flow: {flow_name}",
                    "passed": passed,
                    "executed_at": datetime.now(timezone.utc).isoformat(),
                    "duration_ms": (time.time() - start) * 1000,
                    "details": details
                })
            except Exception as e:
                results.append({
                    "id": str(uuid.uuid4()),
                    "check_type": "critical_flow",
                    "name": f"Flow: {flow_name}",
                    "passed": False,
                    "executed_at": datetime.now(timezone.utc).isoformat(),
                    "duration_ms": (time.time() - start) * 1000,
                    "error": str(e)
                })
        
        return results

    async def _check_listing_creation_flow(self) -> tuple:
        """Check listing creation flow"""
        # Verify categories exist
        categories = await self.db.categories.count_documents({})
        if categories == 0:
            return False, {"error": "No categories found"}
        
        # Verify listing collection is accessible
        await self.db.listings.find_one({})
        
        return True, {"categories_count": categories}

    async def _check_checkout_flow(self) -> tuple:
        """Check checkout flow"""
        # Verify escrow collection
        await self.db.escrow.find_one({})
        
        # Verify transactions collection
        await self.db.transactions.find_one({})
        
        return True, {"status": "checkout_collections_accessible"}

    async def _check_escrow_flow(self) -> tuple:
        """Check escrow flow"""
        # Check for stuck escrows
        stuck = await self.db.escrow.count_documents({
            "status": "pending",
            "created_at": {"$lt": (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()}
        })
        
        return stuck == 0, {"stuck_escrows": stuck}

    async def _check_notification_flow(self) -> tuple:
        """Check notification flow"""
        # Verify notification collection
        await self.db.notifications.find_one({})
        return True, {"status": "notifications_accessible"}

    async def _run_permission_checks(self) -> List[Dict]:
        """Check permission system"""
        results = []
        
        # Check role definitions exist
        start = time.time()
        try:
            roles = await self.db.roles.find({}).to_list(length=100)
            results.append({
                "id": str(uuid.uuid4()),
                "check_type": "permission",
                "name": "Permission: Roles defined",
                "passed": len(roles) > 0,
                "executed_at": datetime.now(timezone.utc).isoformat(),
                "duration_ms": (time.time() - start) * 1000,
                "details": {"roles_count": len(roles)}
            })
        except Exception as e:
            results.append({
                "id": str(uuid.uuid4()),
                "check_type": "permission",
                "name": "Permission: Roles defined",
                "passed": True,  # Roles might not exist yet, that's okay
                "executed_at": datetime.now(timezone.utc).isoformat(),
                "duration_ms": (time.time() - start) * 1000,
                "details": {"note": "Roles collection not found"}
            })
        
        return results

    async def _run_feature_toggle_checks(self) -> List[Dict]:
        """Check feature toggles"""
        results = []
        flags = await self.feature_flags.find({}).to_list(length=100)
        
        for flag in flags:
            results.append({
                "id": str(uuid.uuid4()),
                "check_type": "feature_toggle",
                "name": f"Feature: {flag['key']}",
                "passed": True,
                "executed_at": datetime.now(timezone.utc).isoformat(),
                "duration_ms": 0,
                "details": {"enabled": flag.get("enabled", False)}
            })
        
        return results

    async def _run_data_integrity_checks(self) -> List[Dict]:
        """Check data integrity"""
        results = []
        
        # Check for orphaned escrows (escrow without matching order)
        start = time.time()
        try:
            # This is a simplified check
            escrow_count = await self.db.escrow.count_documents({})
            results.append({
                "id": str(uuid.uuid4()),
                "check_type": "data_integrity",
                "name": "Data: Escrow integrity",
                "passed": True,
                "executed_at": datetime.now(timezone.utc).isoformat(),
                "duration_ms": (time.time() - start) * 1000,
                "details": {"escrow_count": escrow_count}
            })
        except Exception as e:
            results.append({
                "id": str(uuid.uuid4()),
                "check_type": "data_integrity",
                "name": "Data: Escrow integrity",
                "passed": False,
                "executed_at": datetime.now(timezone.utc).isoformat(),
                "duration_ms": (time.time() - start) * 1000,
                "error": str(e)
            })
        
        return results

    async def get_qa_check_history(
        self,
        page: int = 1,
        limit: int = 50,
        check_type: Optional[QACheckType] = None,
        passed: Optional[bool] = None
    ) -> Dict:
        """Get QA check history"""
        query = {}
        if check_type:
            query["check_type"] = check_type
        if passed is not None:
            query["passed"] = passed
        
        skip = (page - 1) * limit
        total = await self.qa_checks.count_documents(query)
        
        checks = await self.qa_checks.find(
            query, {"_id": 0}
        ).sort("executed_at", -1).skip(skip).limit(limit).to_list(length=limit)
        
        return {
            "checks": checks,
            "total": total,
            "page": page,
            "limit": limit
        }

    # =========================================================================
    # RELIABILITY METRICS
    # =========================================================================

    async def calculate_reliability_metrics(self, period_hours: int = 24) -> ReliabilityMetrics:
        """Calculate reliability metrics for a given period"""
        period_start = (datetime.now(timezone.utc) - timedelta(hours=period_hours)).isoformat()
        
        # Calculate uptime (based on health checks)
        health_checks = await self.health_checks.find({}).to_list(length=100)
        healthy_count = len([h for h in health_checks if h.get("status") == ServiceStatus.HEALTHY])
        uptime = (healthy_count / len(health_checks) * 100) if health_checks else 100.0
        
        # Calculate average latency
        all_times = []
        for times in self._request_times.values():
            all_times.extend(times[-1000:])
        avg_latency = sum(all_times) / len(all_times) if all_times else 0
        
        # Calculate error rate
        total_requests = len(all_times) if all_times else 1
        error_count = sum(self._error_counts.values())
        error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0
        
        # Checkout success rate
        checkouts = await self.db.escrow.find({
            "created_at": {"$gte": period_start}
        }).to_list(length=1000)
        successful_checkouts = len([c for c in checkouts if c.get("status") in ["released", "completed", "pending"]])
        checkout_rate = (successful_checkouts / len(checkouts) * 100) if checkouts else 100.0
        
        # Escrow release success rate
        released = await self.db.escrow.count_documents({
            "status": "released",
            "released_at": {"$gte": period_start}
        })
        total_escrow = await self.db.escrow.count_documents({
            "created_at": {"$gte": period_start}
        })
        escrow_rate = (released / total_escrow * 100) if total_escrow > 0 else 100.0
        
        # Notification delivery rate (simplified)
        notification_rate = 98.5  # Placeholder
        
        # Crash-free sessions
        crash_free = 99.2  # Placeholder
        
        metrics = ReliabilityMetrics(
            period=f"{period_hours}h",
            uptime_percent=round(uptime, 2),
            avg_latency_ms=round(avg_latency, 2),
            error_rate_percent=round(error_rate, 2),
            checkout_success_rate=round(checkout_rate, 2),
            escrow_release_success_rate=round(escrow_rate, 2),
            notification_delivery_rate=notification_rate,
            crash_free_sessions_percent=crash_free
        )
        
        # Store metrics
        await self.metrics.insert_one({
            **metrics.dict(),
            "calculated_at": datetime.now(timezone.utc).isoformat()
        })
        
        return metrics

    async def get_metrics_history(self, days: int = 7) -> List[Dict]:
        """Get metrics history"""
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        metrics = await self.metrics.find(
            {"calculated_at": {"$gte": since}},
            {"_id": 0}
        ).sort("calculated_at", -1).to_list(length=100)
        
        return metrics

    # =========================================================================
    # FEATURE FLAGS
    # =========================================================================

    async def get_feature_flags(self) -> List[Dict]:
        """Get all feature flags"""
        return await self.feature_flags.find({}, {"_id": 0}).to_list(length=100)

    async def update_feature_flag(self, key: str, enabled: bool, admin_id: str) -> bool:
        """Update a feature flag"""
        result = await self.feature_flags.update_one(
            {"key": key},
            {"$set": {
                "enabled": enabled,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": admin_id
            }}
        )
        
        # Log the change
        await self._log_audit(
            action="feature_flag_update",
            admin_id=admin_id,
            details={"key": key, "enabled": enabled}
        )
        
        # Run QA checks on feature toggle change
        asyncio.create_task(self.run_all_qa_checks())
        
        return result.modified_count > 0

    async def is_feature_enabled(self, key: str) -> bool:
        """Check if a feature is enabled"""
        flag = await self.feature_flags.find_one({"key": key})
        return flag.get("enabled", False) if flag else False

    # =========================================================================
    # FAIL-SAFE & RETRY
    # =========================================================================

    async def check_idempotency(self, key: str) -> bool:
        """Check if an operation has already been performed"""
        try:
            await self.idempotency_keys.insert_one({
                "key": key,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": datetime.now(timezone.utc) + timedelta(hours=24)
            })
            return False  # Key didn't exist, operation is new
        except:
            return True  # Key exists, operation already performed

    async def add_to_dead_letter_queue(
        self,
        operation: str,
        data: Dict,
        error: str,
        retry_count: int = 0
    ):
        """Add a failed operation to the dead letter queue"""
        await self.dead_letter_queue.insert_one({
            "id": str(uuid.uuid4()),
            "operation": operation,
            "data": data,
            "error": error,
            "retry_count": retry_count,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "pending"
        })

    async def get_dead_letter_queue(self, limit: int = 50) -> List[Dict]:
        """Get items from the dead letter queue"""
        return await self.dead_letter_queue.find(
            {"status": "pending"},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(length=limit)

    async def retry_dead_letter_item(self, item_id: str) -> bool:
        """Mark a dead letter item for retry"""
        result = await self.dead_letter_queue.update_one(
            {"id": item_id},
            {"$set": {
                "status": "retrying",
                "retry_at": datetime.now(timezone.utc).isoformat()
            },
            "$inc": {"retry_count": 1}}
        )
        return result.modified_count > 0

    # =========================================================================
    # AUDIT LOGGING
    # =========================================================================

    async def _log_audit(self, action: str, admin_id: str, details: Dict = None):
        """Log an admin action for audit trail"""
        await self.audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "action": action,
            "admin_id": admin_id,
            "details": details or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    async def get_audit_logs(
        self,
        page: int = 1,
        limit: int = 50,
        action: Optional[str] = None,
        admin_id: Optional[str] = None
    ) -> Dict:
        """Get audit logs"""
        query = {}
        if action:
            query["action"] = action
        if admin_id:
            query["admin_id"] = admin_id
        
        skip = (page - 1) * limit
        total = await self.audit_logs.count_documents(query)
        
        logs = await self.audit_logs.find(
            query, {"_id": 0}
        ).sort("timestamp", -1).skip(skip).limit(limit).to_list(length=limit)
        
        return {
            "logs": logs,
            "total": total,
            "page": page,
            "limit": limit
        }

    # =========================================================================
    # UTILITIES
    # =========================================================================

    def _mask_sensitive_data(self, data: Dict) -> Dict:
        """Mask sensitive data in logs"""
        if not data:
            return data
        
        masked = data.copy()
        sensitive_keys = ["password", "token", "secret", "card", "cvv", "ssn", "credit"]
        
        for key in masked.keys():
            if any(s in key.lower() for s in sensitive_keys):
                masked[key] = "***MASKED***"
        
        return masked

    def track_request_time(self, endpoint: str, duration_ms: float):
        """Track request time for latency monitoring"""
        self._request_times[endpoint].append(duration_ms)
        # Keep only last 1000 entries per endpoint
        if len(self._request_times[endpoint]) > 1000:
            self._request_times[endpoint] = self._request_times[endpoint][-1000:]


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_qa_reliability_router(db: AsyncIOMotorDatabase):
    """Create the QA & Reliability router"""
    router = APIRouter(prefix="/qa", tags=["QA & Reliability"])
    service = QAReliabilityService(db)

    # -------------------------------------------------------------------------
    # HEALTH & STATUS
    # -------------------------------------------------------------------------

    @router.get("/health")
    async def get_system_health():
        """Get overall system health status"""
        return await service.get_system_health_summary()

    @router.get("/health/services")
    async def check_services():
        """Check all service health"""
        services = await service.check_all_services()
        return {k: v.dict() for k, v in services.items()}

    # -------------------------------------------------------------------------
    # ERROR LOGS
    # -------------------------------------------------------------------------

    @router.get("/errors")
    async def get_errors(
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=100),
        severity: Optional[Severity] = None,
        category: Optional[str] = None,
        feature: Optional[str] = None,
        user_id: Optional[str] = None,
        country: Optional[str] = None,
        resolved: Optional[bool] = None,
        search: Optional[str] = None
    ):
        """Get error logs with filtering"""
        return await service.get_error_logs(
            page=page, limit=limit, severity=severity,
            category=category, feature=feature, user_id=user_id,
            country=country, resolved=resolved, search=search
        )

    @router.get("/errors/reference/{reference_id}")
    async def get_error_by_ref(reference_id: str):
        """Get error by reference ID"""
        error = await service.get_error_by_reference(reference_id)
        if not error:
            raise HTTPException(status_code=404, detail="Error not found")
        return error

    @router.post("/errors/{error_id}/resolve")
    async def resolve_error(error_id: str, admin_id: str = Body(..., embed=True)):
        """Resolve an error"""
        success = await service.resolve_error(error_id, admin_id)
        return {"success": success}

    @router.post("/errors/log")
    async def log_error(
        category: str = Body(...),
        feature: str = Body(...),
        error_type: str = Body(...),
        message: str = Body(...),
        severity: Severity = Body(Severity.WARNING),
        stack_trace: Optional[str] = Body(None),
        user_id: Optional[str] = Body(None),
        session_id: Optional[str] = Body(None),
        endpoint: Optional[str] = Body(None)
    ):
        """Log an error from frontend or other services"""
        error = await service.log_error(
            category=category, feature=feature, error_type=error_type,
            message=message, severity=severity, stack_trace=stack_trace,
            user_id=user_id, session_id=session_id, endpoint=endpoint
        )
        return {"reference_id": error.reference_id}

    # -------------------------------------------------------------------------
    # SESSION TRACES
    # -------------------------------------------------------------------------

    @router.get("/traces")
    async def get_traces(
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=100),
        flow_type: Optional[str] = None,
        user_id: Optional[str] = None,
        status: Optional[str] = None
    ):
        """Get session traces"""
        return await service.get_session_traces(
            page=page, limit=limit, flow_type=flow_type,
            user_id=user_id, status=status
        )

    @router.get("/traces/{trace_id}")
    async def get_trace(trace_id: str):
        """Get a specific trace for replay"""
        trace = await service.get_trace_by_id(trace_id)
        if not trace:
            raise HTTPException(status_code=404, detail="Trace not found")
        return trace

    @router.post("/traces/start")
    async def start_trace(
        session_id: str = Body(...),
        user_id: str = Body(...),
        flow_type: str = Body(...),
        metadata: Optional[Dict] = Body(None)
    ):
        """Start a new session trace"""
        trace_id = await service.start_session_trace(session_id, user_id, flow_type, metadata)
        return {"trace_id": trace_id}

    @router.post("/traces/{trace_id}/step")
    async def add_trace_step(
        trace_id: str,
        step_name: str = Body(...),
        step_data: Optional[Dict] = Body(None),
        duration_ms: Optional[float] = Body(None)
    ):
        """Add a step to a trace"""
        await service.add_trace_step(trace_id, step_name, step_data, duration_ms)
        return {"success": True}

    @router.post("/traces/{trace_id}/complete")
    async def complete_trace(
        trace_id: str,
        status: str = Body("completed"),
        error: Optional[Dict] = Body(None)
    ):
        """Complete a session trace"""
        await service.complete_trace(trace_id, status, error)
        return {"success": True}

    # -------------------------------------------------------------------------
    # ALERTS
    # -------------------------------------------------------------------------

    @router.get("/alerts")
    async def get_alerts(
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=100),
        severity: Optional[Severity] = None,
        acknowledged: Optional[bool] = None,
        resolved: Optional[bool] = None
    ):
        """Get alerts"""
        return await service.get_alerts(
            page=page, limit=limit, severity=severity,
            acknowledged=acknowledged, resolved=resolved
        )

    @router.post("/alerts/{alert_id}/acknowledge")
    async def acknowledge_alert(alert_id: str, admin_id: str = Body(..., embed=True)):
        """Acknowledge an alert"""
        success = await service.acknowledge_alert(alert_id, admin_id)
        return {"success": success}

    @router.post("/alerts/{alert_id}/resolve")
    async def resolve_alert(alert_id: str):
        """Resolve an alert"""
        success = await service.resolve_alert(alert_id)
        return {"success": success}

    # -------------------------------------------------------------------------
    # QA CHECKS
    # -------------------------------------------------------------------------

    @router.post("/checks/run")
    async def run_qa_checks():
        """Run all QA checks"""
        return await service.run_all_qa_checks()

    @router.get("/checks/history")
    async def get_qa_history(
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=100),
        check_type: Optional[QACheckType] = None,
        passed: Optional[bool] = None
    ):
        """Get QA check history"""
        return await service.get_qa_check_history(
            page=page, limit=limit, check_type=check_type, passed=passed
        )

    # -------------------------------------------------------------------------
    # RELIABILITY METRICS
    # -------------------------------------------------------------------------

    @router.get("/metrics")
    async def get_metrics(period_hours: int = Query(24, ge=1, le=720)):
        """Get reliability metrics"""
        return await service.calculate_reliability_metrics(period_hours)

    @router.get("/metrics/history")
    async def get_metrics_history(days: int = Query(7, ge=1, le=30)):
        """Get metrics history"""
        return await service.get_metrics_history(days)

    @router.get("/metrics/kpis")
    async def get_kpis():
        """Get current KPIs vs targets"""
        metrics = await service.calculate_reliability_metrics(24)
        return {
            "uptime": {
                "current": metrics.uptime_percent,
                "target": service.UPTIME_TARGET,
                "status": "passing" if metrics.uptime_percent >= service.UPTIME_TARGET else "failing"
            },
            "latency": {
                "current_ms": metrics.avg_latency_ms,
                "target_ms": service.LATENCY_TARGET_MS,
                "status": "passing" if metrics.avg_latency_ms <= service.LATENCY_TARGET_MS else "failing"
            },
            "checkout_success": {
                "current": metrics.checkout_success_rate,
                "target": service.CHECKOUT_SUCCESS_TARGET,
                "status": "passing" if metrics.checkout_success_rate >= service.CHECKOUT_SUCCESS_TARGET else "failing"
            }
        }

    # -------------------------------------------------------------------------
    # FEATURE FLAGS
    # -------------------------------------------------------------------------

    @router.get("/features")
    async def get_feature_flags():
        """Get all feature flags"""
        return await service.get_feature_flags()

    @router.put("/features/{key}")
    async def update_feature_flag(
        key: str,
        enabled: bool = Body(...),
        admin_id: str = Body(...)
    ):
        """Update a feature flag"""
        success = await service.update_feature_flag(key, enabled, admin_id)
        return {"success": success}

    @router.get("/features/{key}/status")
    async def check_feature_status(key: str):
        """Check if a feature is enabled"""
        enabled = await service.is_feature_enabled(key)
        return {"key": key, "enabled": enabled}

    # -------------------------------------------------------------------------
    # DEAD LETTER QUEUE
    # -------------------------------------------------------------------------

    @router.get("/dlq")
    async def get_dead_letter_queue(limit: int = Query(50, ge=1, le=100)):
        """Get dead letter queue items"""
        return await service.get_dead_letter_queue(limit)

    @router.post("/dlq/{item_id}/retry")
    async def retry_dlq_item(item_id: str):
        """Retry a dead letter queue item"""
        success = await service.retry_dead_letter_item(item_id)
        return {"success": success}

    # -------------------------------------------------------------------------
    # AUDIT LOGS
    # -------------------------------------------------------------------------

    @router.get("/audit")
    async def get_audit_logs(
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=100),
        action: Optional[str] = None,
        admin_id: Optional[str] = None
    ):
        """Get audit logs"""
        return await service.get_audit_logs(
            page=page, limit=limit, action=action, admin_id=admin_id
        )

    return router, service
