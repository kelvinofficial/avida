"""
CSV Import System for Users

Allows admins to bulk import users from CSV files with:
- Full field support: name, email, phone, role, location, password, is_verified
- Default password with force change on first login
- Configurable duplicate handling (skip, update, or per-import choice)
- Support for user and seller roles
- Max 1000 users per import
- Validation, preview, and progress tracking
"""

import csv
import io
import uuid
import re
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any
from enum import Enum
from pydantic import BaseModel, Field, EmailStr

from fastapi import APIRouter, HTTPException, UploadFile, File, Body, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
import bcrypt

logger = logging.getLogger(__name__)

# Constants
MAX_IMPORT_ROWS = 1000
DEFAULT_PASSWORD = "Welcome123!"
ALLOWED_ROLES = ["user", "seller"]
REQUIRED_FIELDS = ["name", "email"]
OPTIONAL_FIELDS = ["phone", "role", "location", "password", "is_verified"]
ALL_FIELDS = REQUIRED_FIELDS + OPTIONAL_FIELDS


class DuplicateStrategy(str, Enum):
    SKIP = "skip"
    UPDATE = "update"


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
    updated: int = 0
    errors: List[ValidationError] = []


class CSVImportService:
    """Service for handling CSV user imports"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.users = db.users
        self.import_jobs = db.csv_import_jobs
        self.import_logs = db.csv_import_logs
    
    def _hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def _validate_email(self, email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    def _validate_phone(self, phone: str) -> bool:
        """Validate phone format (basic validation)"""
        if not phone:
            return True  # Phone is optional
        # Remove common formatting
        cleaned = re.sub(r'[\s\-\(\)]', '', phone)
        # Should be digits, optionally starting with +
        return bool(re.match(r'^\+?\d{9,15}$', cleaned))
    
    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone number format"""
        if not phone:
            return ""
        # Remove formatting
        cleaned = re.sub(r'[\s\-\(\)]', '', phone)
        # Add + if not present and starts with country code
        if cleaned and not cleaned.startswith('+'):
            # Assume Tanzania if no country code
            if len(cleaned) == 9:
                cleaned = '+255' + cleaned
            elif len(cleaned) == 10 and cleaned.startswith('0'):
                cleaned = '+255' + cleaned[1:]
        return cleaned
    
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
    
    async def validate_rows(self, rows: List[Dict]) -> Dict:
        """Validate all rows and return validation results"""
        errors: List[ValidationError] = []
        valid_rows = []
        
        # Collect all emails and phones for duplicate checking
        emails_in_csv = {}
        phones_in_csv = {}
        
        for row in rows:
            row_num = row.get('_row_number', 0)
            row_errors = []
            
            # Validate name
            name = row.get('name', '').strip()
            if not name:
                row_errors.append(ValidationError(
                    row=row_num, field='name', value=name,
                    error='Name is required'
                ))
            elif len(name) < 2:
                row_errors.append(ValidationError(
                    row=row_num, field='name', value=name,
                    error='Name must be at least 2 characters'
                ))
            
            # Validate email
            email = row.get('email', '').strip().lower()
            if not email:
                row_errors.append(ValidationError(
                    row=row_num, field='email', value=email,
                    error='Email is required'
                ))
            elif not self._validate_email(email):
                row_errors.append(ValidationError(
                    row=row_num, field='email', value=email,
                    error='Invalid email format'
                ))
            elif email in emails_in_csv:
                row_errors.append(ValidationError(
                    row=row_num, field='email', value=email,
                    error=f'Duplicate email in CSV (also on row {emails_in_csv[email]})'
                ))
            else:
                emails_in_csv[email] = row_num
            
            # Validate phone (optional but must be valid if provided)
            phone = row.get('phone', '').strip()
            if phone:
                if not self._validate_phone(phone):
                    row_errors.append(ValidationError(
                        row=row_num, field='phone', value=phone,
                        error='Invalid phone format'
                    ))
                else:
                    normalized_phone = self._normalize_phone(phone)
                    if normalized_phone in phones_in_csv:
                        row_errors.append(ValidationError(
                            row=row_num, field='phone', value=phone,
                            error=f'Duplicate phone in CSV (also on row {phones_in_csv[normalized_phone]})'
                        ))
                    else:
                        phones_in_csv[normalized_phone] = row_num
            
            # Validate role
            role = row.get('role', 'user').strip().lower()
            if role and role not in ALLOWED_ROLES:
                row_errors.append(ValidationError(
                    row=row_num, field='role', value=role,
                    error=f'Invalid role. Allowed: {", ".join(ALLOWED_ROLES)}'
                ))
            
            # Validate is_verified
            is_verified = row.get('is_verified', '').strip().lower()
            if is_verified and is_verified not in ['true', 'false', '1', '0', 'yes', 'no', '']:
                row_errors.append(ValidationError(
                    row=row_num, field='is_verified', value=is_verified,
                    error='is_verified must be true/false, yes/no, or 1/0'
                ))
            
            if row_errors:
                errors.extend(row_errors)
            else:
                valid_rows.append(row)
        
        return {
            "total_rows": len(rows),
            "valid_rows": len(valid_rows),
            "error_count": len(errors),
            "errors": [e.dict() for e in errors],
            "valid_data": valid_rows
        }
    
    async def check_duplicates(self, rows: List[Dict]) -> Dict:
        """Check for duplicates against existing database records"""
        duplicates = []
        
        for row in rows:
            row_num = row.get('_row_number', 0)
            email = row.get('email', '').strip().lower()
            phone = self._normalize_phone(row.get('phone', ''))
            
            # Check email
            existing_by_email = await self.users.find_one({"email": email})
            if existing_by_email:
                duplicates.append({
                    "row": row_num,
                    "field": "email",
                    "value": email,
                    "existing_user_id": existing_by_email.get("user_id"),
                    "existing_name": existing_by_email.get("name")
                })
            
            # Check phone
            if phone:
                existing_by_phone = await self.users.find_one({"phone": phone})
                if existing_by_phone and (not existing_by_email or existing_by_phone.get("user_id") != existing_by_email.get("user_id")):
                    duplicates.append({
                        "row": row_num,
                        "field": "phone",
                        "value": phone,
                        "existing_user_id": existing_by_phone.get("user_id"),
                        "existing_name": existing_by_phone.get("name")
                    })
        
        return {
            "duplicate_count": len(duplicates),
            "duplicates": duplicates
        }
    
    async def import_users(
        self,
        rows: List[Dict],
        duplicate_strategy: DuplicateStrategy,
        admin_id: str,
        job_id: Optional[str] = None
    ) -> ImportResult:
        """Import users from validated rows"""
        result = ImportResult(total_rows=len(rows))
        
        if not job_id:
            job_id = str(uuid.uuid4())
        
        # Update job status
        await self.import_jobs.update_one(
            {"id": job_id},
            {"$set": {"status": ImportStatus.IMPORTING, "progress": 0}},
            upsert=True
        )
        
        for i, row in enumerate(rows):
            try:
                row_num = row.get('_row_number', i + 2)
                email = row.get('email', '').strip().lower()
                phone = self._normalize_phone(row.get('phone', ''))
                
                # Check for existing user
                existing = await self.users.find_one({
                    "$or": [
                        {"email": email},
                        {"phone": phone} if phone else {"_id": None}
                    ]
                })
                
                if existing:
                    if duplicate_strategy == DuplicateStrategy.SKIP:
                        result.skipped += 1
                        result.errors.append(ValidationError(
                            row=row_num, field='email', value=email,
                            error=f'User already exists (skipped)'
                        ))
                        continue
                    elif duplicate_strategy == DuplicateStrategy.UPDATE:
                        # Update existing user
                        update_data = self._prepare_user_data(row, is_update=True)
                        await self.users.update_one(
                            {"user_id": existing["user_id"]},
                            {"$set": update_data}
                        )
                        result.updated += 1
                        continue
                
                # Create new user
                user_data = self._prepare_user_data(row, is_update=False)
                await self.users.insert_one(user_data)
                result.imported += 1
                
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
                    value=str(row),
                    error=str(e)
                ))
        
        result.valid_rows = result.imported + result.updated + result.skipped
        
        # Update job status
        await self.import_jobs.update_one(
            {"id": job_id},
            {"$set": {
                "status": ImportStatus.COMPLETED,
                "progress": 100,
                "result": result.dict(),
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Log the import
        await self._log_import(job_id, admin_id, result)
        
        return result
    
    def _prepare_user_data(self, row: Dict, is_update: bool = False) -> Dict:
        """Prepare user data for insertion or update"""
        # Parse is_verified
        is_verified_str = row.get('is_verified', '').strip().lower()
        is_verified = is_verified_str in ['true', '1', 'yes']
        
        # Get password
        password = row.get('password', '').strip()
        if not password:
            password = DEFAULT_PASSWORD
        
        data = {
            "name": row.get('name', '').strip(),
            "email": row.get('email', '').strip().lower(),
            "phone": self._normalize_phone(row.get('phone', '')),
            "role": row.get('role', 'user').strip().lower() or 'user',
            "location": row.get('location', '').strip(),
            "is_verified": is_verified,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "imported_via_csv": True,
        }
        
        if not is_update:
            # Add fields only for new users
            data.update({
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "password": self._hash_password(password),
                "must_change_password": password == DEFAULT_PASSWORD,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "status": "active",
                "avatar": None,
                "bio": None,
                "settings": {
                    "notifications_enabled": True,
                    "email_notifications": True,
                    "sms_notifications": False
                }
            })
        
        return data
    
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
    
    async def get_sample_csv(self) -> str:
        """Generate sample CSV template"""
        headers = ALL_FIELDS
        sample_rows = [
            {
                "name": "John Doe",
                "email": "john.doe@example.com",
                "phone": "+255712345678",
                "role": "user",
                "location": "Dar es Salaam",
                "password": "",
                "is_verified": "false"
            },
            {
                "name": "Jane Smith",
                "email": "jane.smith@example.com",
                "phone": "+255798765432",
                "role": "seller",
                "location": "Arusha",
                "password": "CustomPass123",
                "is_verified": "true"
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

def create_csv_import_router(db: AsyncIOMotorDatabase):
    """Create CSV import API router"""
    router = APIRouter(prefix="/csv-import", tags=["CSV Import"])
    service = CSVImportService(db)
    
    @router.post("/upload")
    async def upload_csv(
        file: UploadFile = File(...),
        admin_id: str = Query(...)
    ):
        """Upload and parse CSV file"""
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV")
        
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")
        
        try:
            parsed = await service.parse_csv(content)
            return {
                "success": True,
                "filename": file.filename,
                "headers": parsed["headers"],
                "total_rows": parsed["total_rows"],
                "preview": parsed["rows"][:5],  # First 5 rows for preview
                "truncated": parsed["truncated"],
                "data": parsed["rows"]  # Full data for validation
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    @router.post("/validate")
    async def validate_csv(
        rows: List[Dict] = Body(...)
    ):
        """Validate CSV data"""
        validation = await service.validate_rows(rows)
        return validation
    
    @router.post("/check-duplicates")
    async def check_duplicates(
        rows: List[Dict] = Body(...)
    ):
        """Check for duplicates in database"""
        return await service.check_duplicates(rows)
    
    @router.post("/import")
    async def import_users(
        rows: List[Dict] = Body(...),
        duplicate_strategy: DuplicateStrategy = Body(DuplicateStrategy.SKIP),
        admin_id: str = Body(...)
    ):
        """Import validated users"""
        if len(rows) > MAX_IMPORT_ROWS:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum {MAX_IMPORT_ROWS} rows per import"
            )
        
        # Create job
        job = await service.create_import_job(admin_id, "import", len(rows))
        
        # Run import
        result = await service.import_users(rows, duplicate_strategy, admin_id, job["id"])
        
        return {
            "success": True,
            "job_id": job["id"],
            "result": result.dict()
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
    
    @router.get("/template")
    async def download_template():
        """Download CSV template"""
        from fastapi.responses import Response
        
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
            "default_password": DEFAULT_PASSWORD,
            "field_descriptions": {
                "name": "User's full name (required)",
                "email": "Email address (required, must be unique)",
                "phone": "Phone number with country code (optional)",
                "role": f"User role: {', '.join(ALLOWED_ROLES)} (default: user)",
                "location": "User's location/city (optional)",
                "password": f"Password (optional, default: {DEFAULT_PASSWORD})",
                "is_verified": "Account verified status: true/false (default: false)"
            }
        }
    
    return router, service
