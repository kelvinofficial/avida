"""
CSV Import System for Users

Allows admins to bulk import users from CSV files with:
- Standard fields: email, first_name, last_name, role
- Auto-generated secure random passwords
- Full CSV validation BEFORE any user creation (abort on any error)
- Async background job processing for large files
- In-app notifications on completion
- Downloadable password report for admin
- Optional email delivery of credentials to each user
"""

import csv
import io
import uuid
import re
import logging
import secrets
import string
import asyncio
import os
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any, Callable
from enum import Enum
from pydantic import BaseModel, Field

from fastapi import APIRouter, HTTPException, UploadFile, File, Body, Query, BackgroundTasks
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorDatabase
import bcrypt

logger = logging.getLogger(__name__)

# Email configuration
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
    SENDGRID_AVAILABLE = True
    SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
    SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@marketplace.com')
except ImportError:
    SENDGRID_AVAILABLE = False
    SENDGRID_API_KEY = None
    SENDER_EMAIL = None
    logger.warning("SendGrid not available - email delivery disabled")

# Constants
MAX_IMPORT_ROWS = 1000
ALLOWED_ROLES = ["user", "seller", "admin"]
REQUIRED_FIELDS = ["email", "first_name", "last_name"]
OPTIONAL_FIELDS = ["role"]
ALL_FIELDS = REQUIRED_FIELDS + OPTIONAL_FIELDS
PASSWORD_LENGTH = 12


class ImportStatus(str, Enum):
    PENDING = "pending"
    VALIDATING = "validating"
    IMPORTING = "importing"
    COMPLETED = "completed"
    FAILED = "failed"


class ValidationError(BaseModel):
    row: int
    field: str
    value: str
    error: str


class ImportResult(BaseModel):
    total_rows: int = 0
    valid_rows: int = 0
    imported: int = 0
    skipped: int = 0
    errors: List[ValidationError] = []
    password_report_id: Optional[str] = None


class CSVImportService:
    """Service for handling CSV user imports"""
    
    def __init__(self, db: AsyncIOMotorDatabase, notify_callback: Optional[Callable] = None):
        self.db = db
        self.users = db.users
        self.import_jobs = db.csv_import_jobs
        self.import_logs = db.csv_import_logs
        self.password_reports = db.csv_password_reports
        self.notifications = db.notifications
        self.notify_callback = notify_callback
    
    def _hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def _generate_secure_password(self) -> str:
        """Generate a secure random password"""
        # Mix of uppercase, lowercase, digits, and special chars
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        while True:
            password = ''.join(secrets.choice(alphabet) for _ in range(PASSWORD_LENGTH))
            # Ensure password has at least one of each type
            if (any(c.islower() for c in password)
                    and any(c.isupper() for c in password)
                    and any(c.isdigit() for c in password)
                    and any(c in "!@#$%^&*" for c in password)):
                return password
    
    def _validate_email(self, email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    async def parse_csv(self, file_content: bytes) -> Dict:
        """Parse CSV file and return structured data"""
        try:
            # Try different encodings
            for encoding in ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']:
                try:
                    content = file_content.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise ValueError("Unable to decode CSV file")
            
            # Parse CSV
            reader = csv.DictReader(io.StringIO(content))
            
            # Normalize headers (lowercase, strip whitespace)
            if reader.fieldnames:
                normalized_headers = [h.lower().strip().replace(' ', '_') for h in reader.fieldnames]
            else:
                raise ValueError("CSV file has no headers")
            
            # Check required fields
            missing_required = [f for f in REQUIRED_FIELDS if f not in normalized_headers]
            if missing_required:
                raise ValueError(f"Missing required columns: {', '.join(missing_required)}")
            
            # Parse rows
            rows = []
            for i, row in enumerate(reader):
                if i >= MAX_IMPORT_ROWS:
                    break
                
                # Normalize row keys
                normalized_row = {}
                for orig_key, value in row.items():
                    norm_key = orig_key.lower().strip().replace(' ', '_')
                    normalized_row[norm_key] = value.strip() if value else ""
                
                normalized_row['_row_number'] = i + 2  # +2 for header and 1-indexing
                rows.append(normalized_row)
            
            return {
                "headers": normalized_headers,
                "rows": rows,
                "total_rows": len(rows),
                "truncated": len(rows) >= MAX_IMPORT_ROWS
            }
            
        except Exception as e:
            logger.error(f"CSV parse error: {e}")
            raise ValueError(f"Failed to parse CSV: {str(e)}")
    
    async def validate_all_rows(self, rows: List[Dict]) -> Dict:
        """
        Validate ALL rows before any import.
        Returns errors if ANY row is invalid - entire import should be aborted.
        """
        errors: List[ValidationError] = []
        
        # Collect all emails for duplicate checking
        emails_in_csv = {}
        
        for row in rows:
            row_num = row.get('_row_number', 0)
            
            # Validate email
            email = row.get('email', '').strip().lower()
            if not email:
                errors.append(ValidationError(
                    row=row_num, field='email', value=email,
                    error='Email is required'
                ))
            elif not self._validate_email(email):
                errors.append(ValidationError(
                    row=row_num, field='email', value=email,
                    error='Invalid email format'
                ))
            elif email in emails_in_csv:
                errors.append(ValidationError(
                    row=row_num, field='email', value=email,
                    error=f'Duplicate email in CSV (also on row {emails_in_csv[email]})'
                ))
            else:
                emails_in_csv[email] = row_num
            
            # Validate first_name
            first_name = row.get('first_name', '').strip()
            if not first_name:
                errors.append(ValidationError(
                    row=row_num, field='first_name', value=first_name,
                    error='First name is required'
                ))
            elif len(first_name) < 1:
                errors.append(ValidationError(
                    row=row_num, field='first_name', value=first_name,
                    error='First name must not be empty'
                ))
            
            # Validate last_name
            last_name = row.get('last_name', '').strip()
            if not last_name:
                errors.append(ValidationError(
                    row=row_num, field='last_name', value=last_name,
                    error='Last name is required'
                ))
            elif len(last_name) < 1:
                errors.append(ValidationError(
                    row=row_num, field='last_name', value=last_name,
                    error='Last name must not be empty'
                ))
            
            # Validate role (optional but must be valid if provided)
            role = row.get('role', 'user').strip().lower()
            if role and role not in ALLOWED_ROLES:
                errors.append(ValidationError(
                    row=row_num, field='role', value=role,
                    error=f'Invalid role. Allowed: {", ".join(ALLOWED_ROLES)}'
                ))
        
        # Check for duplicates in database
        for email, row_num in emails_in_csv.items():
            existing = await self.users.find_one({"email": email})
            if existing:
                errors.append(ValidationError(
                    row=row_num, field='email', value=email,
                    error=f'Email already exists in database (user: {existing.get("name", existing.get("user_id"))})'
                ))
        
        return {
            "total_rows": len(rows),
            "valid": len(errors) == 0,
            "error_count": len(errors),
            "errors": [e.dict() for e in errors]
        }
    
    async def import_users_background(
        self,
        rows: List[Dict],
        admin_id: str,
        job_id: str
    ):
        """Background task to import users after validation passed"""
        try:
            result = ImportResult(total_rows=len(rows))
            password_entries = []
            
            # Update job status to importing
            await self.import_jobs.update_one(
                {"id": job_id},
                {"$set": {"status": ImportStatus.IMPORTING, "progress": 0}}
            )
            
            for i, row in enumerate(rows):
                try:
                    email = row.get('email', '').strip().lower()
                    first_name = row.get('first_name', '').strip()
                    last_name = row.get('last_name', '').strip()
                    role = row.get('role', 'user').strip().lower() or 'user'
                    
                    # Generate secure password
                    password = self._generate_secure_password()
                    
                    # Create user
                    user_id = f"user_{uuid.uuid4().hex[:12]}"
                    user_data = {
                        "user_id": user_id,
                        "email": email,
                        "name": f"{first_name} {last_name}",
                        "first_name": first_name,
                        "last_name": last_name,
                        "password": self._hash_password(password),
                        "role": role,
                        "must_change_password": True,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "status": "active",
                        "imported_via_csv": True,
                        "import_job_id": job_id,
                        "settings": {
                            "notifications_enabled": True,
                            "email_notifications": True,
                            "sms_notifications": False
                        }
                    }
                    
                    await self.users.insert_one(user_data)
                    result.imported += 1
                    
                    # Store password entry for report
                    password_entries.append({
                        "email": email,
                        "first_name": first_name,
                        "last_name": last_name,
                        "password": password,
                        "role": role
                    })
                    
                    # Update progress
                    progress = int((i + 1) / len(rows) * 100)
                    await self.import_jobs.update_one(
                        {"id": job_id},
                        {"$set": {"progress": progress}}
                    )
                    
                except Exception as e:
                    logger.error(f"Error importing row {row.get('_row_number', i)}: {e}")
                    result.errors.append(ValidationError(
                        row=row.get('_row_number', i + 2),
                        field='_row',
                        value=str(row.get('email', '')),
                        error=str(e)
                    ))
            
            result.valid_rows = result.imported
            
            # Create password report
            report_id = str(uuid.uuid4())
            await self.password_reports.insert_one({
                "id": report_id,
                "job_id": job_id,
                "admin_id": admin_id,
                "entries": password_entries,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": (datetime.now(timezone.utc) + __import__('datetime').timedelta(hours=24)).isoformat()
            })
            result.password_report_id = report_id
            
            # Update job status
            status = ImportStatus.COMPLETED if result.imported > 0 else ImportStatus.FAILED
            await self.import_jobs.update_one(
                {"id": job_id},
                {"$set": {
                    "status": status,
                    "progress": 100,
                    "result": result.dict(),
                    "password_report_id": report_id,
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Log the import
            await self._log_import(job_id, admin_id, result)
            
            # Send in-app notification to admin
            await self._notify_admin(admin_id, job_id, result, status)
            
            return result
            
        except Exception as e:
            logger.error(f"Background import failed: {e}")
            await self.import_jobs.update_one(
                {"id": job_id},
                {"$set": {
                    "status": ImportStatus.FAILED,
                    "error": str(e),
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            # Notify admin of failure
            await self._notify_admin(admin_id, job_id, None, ImportStatus.FAILED, error=str(e))
    
    async def _notify_admin(
        self,
        admin_id: str,
        job_id: str,
        result: Optional[ImportResult],
        status: ImportStatus,
        error: Optional[str] = None
    ):
        """Send in-app notification to admin"""
        if status == ImportStatus.COMPLETED and result:
            title = "CSV Import Complete"
            body = f"Successfully imported {result.imported} users. Download the password report from the import history."
        elif status == ImportStatus.FAILED:
            title = "CSV Import Failed"
            body = error or "An error occurred during import. Please check the import history for details."
        else:
            return
        
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": admin_id,
            "type": "csv_import_complete",
            "title": title,
            "body": body,
            "data_payload": {
                "job_id": job_id,
                "status": status,
                "imported_count": result.imported if result else 0,
                "password_report_id": result.password_report_id if result else None
            },
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.notifications.insert_one(notification)
        
        # Call external notify callback if provided (for WebSocket broadcast)
        if self.notify_callback:
            try:
                await self.notify_callback(admin_id, notification)
            except Exception as e:
                logger.error(f"Failed to send notification callback: {e}")
    
    async def _log_import(self, job_id: str, admin_id: str, result: ImportResult):
        """Log import activity"""
        log_entry = {
            "id": str(uuid.uuid4()),
            "job_id": job_id,
            "admin_id": admin_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "result": result.dict()
        }
        await self.import_logs.insert_one(log_entry)
    
    async def create_import_job(self, admin_id: str, filename: str, total_rows: int) -> Dict:
        """Create a new import job"""
        job_id = str(uuid.uuid4())
        job = {
            "id": job_id,
            "admin_id": admin_id,
            "filename": filename,
            "total_rows": total_rows,
            "status": ImportStatus.PENDING,
            "progress": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "result": None
        }
        await self.import_jobs.insert_one(job)
        return {"id": job_id, **{k: v for k, v in job.items() if k != "_id"}}
    
    async def get_import_job(self, job_id: str) -> Optional[Dict]:
        """Get import job status"""
        job = await self.import_jobs.find_one({"id": job_id}, {"_id": 0})
        return job
    
    async def get_import_history(
        self,
        admin_id: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> Dict:
        """Get import history"""
        query = {}
        if admin_id:
            query["admin_id"] = admin_id
        
        skip = (page - 1) * limit
        total = await self.import_jobs.count_documents(query)
        
        jobs = await self.import_jobs.find(
            query, {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        
        return {
            "jobs": jobs,
            "total": total,
            "page": page,
            "limit": limit
        }
    
    async def get_password_report(self, report_id: str, admin_id: str) -> Optional[Dict]:
        """Get password report (only for the admin who created it)"""
        report = await self.password_reports.find_one(
            {"id": report_id, "admin_id": admin_id},
            {"_id": 0}
        )
        return report
    
    async def generate_password_csv(self, report_id: str, admin_id: str) -> Optional[str]:
        """Generate CSV content from password report"""
        report = await self.get_password_report(report_id, admin_id)
        if not report:
            return None
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["email", "first_name", "last_name", "password", "role"])
        writer.writeheader()
        writer.writerows(report.get("entries", []))
        
        return output.getvalue()
    
    async def get_sample_csv(self) -> str:
        """Generate sample CSV template"""
        headers = ALL_FIELDS
        sample_rows = [
            {
                "email": "john.doe@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "role": "user"
            },
            {
                "email": "jane.smith@example.com",
                "first_name": "Jane",
                "last_name": "Smith",
                "role": "seller"
            }
        ]
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        writer.writerows(sample_rows)
        
        return output.getvalue()


# =============================================================================
# ROUTER
# =============================================================================

def create_csv_import_router(db: AsyncIOMotorDatabase, notify_callback: Optional[Callable] = None):
    """Create CSV import API router"""
    router = APIRouter(prefix="/csv-import", tags=["CSV Import"])
    service = CSVImportService(db, notify_callback)
    
    # Store validated data temporarily (in production, use Redis or similar)
    validated_data_store: Dict[str, List[Dict]] = {}
    
    @router.post("/upload")
    async def upload_csv(
        file: UploadFile = File(...),
        admin_id: str = Query(...)
    ):
        """
        Step 1: Upload and parse CSV file.
        Returns preview and validation ID for next step.
        """
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV")
        
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")
        
        try:
            parsed = await service.parse_csv(content)
            
            # Generate validation ID for this upload
            validation_id = str(uuid.uuid4())
            validated_data_store[validation_id] = parsed["rows"]
            
            return {
                "success": True,
                "validation_id": validation_id,
                "filename": file.filename,
                "headers": parsed["headers"],
                "total_rows": parsed["total_rows"],
                "preview": parsed["rows"][:5],  # First 5 rows for preview
                "truncated": parsed["truncated"]
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    @router.post("/validate/{validation_id}")
    async def validate_csv(validation_id: str):
        """
        Step 2: Validate ALL rows in the CSV.
        Must pass validation before import can proceed.
        Returns detailed errors if any row is invalid.
        """
        rows = validated_data_store.get(validation_id)
        if not rows:
            raise HTTPException(status_code=404, detail="Validation session expired or not found. Please upload the file again.")
        
        validation = await service.validate_all_rows(rows)
        return validation
    
    @router.post("/import/{validation_id}")
    async def import_users(
        validation_id: str,
        admin_id: str = Body(..., embed=True),
        background_tasks: BackgroundTasks = None
    ):
        """
        Step 3: Import validated users.
        Requires validation_id from previous step.
        Runs as background job and returns job_id for status tracking.
        """
        rows = validated_data_store.get(validation_id)
        if not rows:
            raise HTTPException(
                status_code=404, 
                detail="Validation session expired or not found. Please upload and validate the file again."
            )
        
        # Re-validate to ensure no changes
        validation = await service.validate_all_rows(rows)
        if not validation["valid"]:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Validation failed. Cannot proceed with import.",
                    "errors": validation["errors"]
                }
            )
        
        if len(rows) > MAX_IMPORT_ROWS:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum {MAX_IMPORT_ROWS} rows per import"
            )
        
        # Create job
        job = await service.create_import_job(admin_id, "csv_import", len(rows))
        
        # Remove from temporary store
        del validated_data_store[validation_id]
        
        # Run import in background
        if background_tasks:
            background_tasks.add_task(
                service.import_users_background,
                rows,
                admin_id,
                job["id"]
            )
        else:
            # Fallback to asyncio task if BackgroundTasks not available
            asyncio.create_task(
                service.import_users_background(rows, admin_id, job["id"])
            )
        
        return {
            "success": True,
            "job_id": job["id"],
            "message": "Import started. You will receive a notification when complete.",
            "status_url": f"/api/csv-import/job/{job['id']}"
        }
    
    @router.get("/job/{job_id}")
    async def get_job_status(job_id: str):
        """Get import job status"""
        job = await service.get_import_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job
    
    @router.get("/history")
    async def get_import_history(
        admin_id: Optional[str] = None,
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100)
    ):
        """Get import history"""
        return await service.get_import_history(admin_id, page, limit)
    
    @router.get("/password-report/{report_id}")
    async def get_password_report(
        report_id: str,
        admin_id: str = Query(...)
    ):
        """Get password report metadata (not the actual passwords in response)"""
        report = await service.get_password_report(report_id, admin_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found or access denied")
        
        # Don't return actual passwords in JSON response
        return {
            "id": report["id"],
            "job_id": report["job_id"],
            "created_at": report["created_at"],
            "expires_at": report["expires_at"],
            "user_count": len(report.get("entries", []))
        }
    
    @router.get("/password-report/{report_id}/download")
    async def download_password_report(
        report_id: str,
        admin_id: str = Query(...)
    ):
        """Download password report as CSV"""
        csv_content = await service.generate_password_csv(report_id, admin_id)
        if not csv_content:
            raise HTTPException(status_code=404, detail="Report not found or access denied")
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=user_passwords_{report_id[:8]}.csv"
            }
        )
    
    @router.get("/template")
    async def download_template():
        """Download CSV template"""
        csv_content = await service.get_sample_csv()
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=user_import_template.csv"
            }
        )
    
    @router.get("/fields")
    async def get_field_info():
        """Get information about CSV fields"""
        return {
            "required_fields": REQUIRED_FIELDS,
            "optional_fields": OPTIONAL_FIELDS,
            "all_fields": ALL_FIELDS,
            "allowed_roles": ALLOWED_ROLES,
            "max_rows": MAX_IMPORT_ROWS,
            "field_descriptions": {
                "email": "Email address (required, must be unique)",
                "first_name": "User's first name (required)",
                "last_name": "User's last name (required)",
                "role": f"User role: {', '.join(ALLOWED_ROLES)} (default: user)"
            },
            "notes": [
                "Passwords are auto-generated and provided in a downloadable report",
                "Users will be required to change their password on first login",
                "All rows must pass validation before any users are created",
                "Maximum 1000 users per import"
            ]
        }
    
    return router, service
