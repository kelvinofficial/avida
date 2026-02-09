"""
Platform Configuration & Brand Manager
Centralized configuration service for:
- Currency management
- Branding & logos
- Static & legal pages
- External links & social media
- App store links
- Multi-environment support
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body, Query, Depends
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from enum import Enum
import uuid
import os
import json
import logging
import shutil
from pathlib import Path

logger = logging.getLogger(__name__)

# =========================================================================
# ENUMS
# =========================================================================

class Environment(str, Enum):
    PRODUCTION = "production"
    STAGING = "staging"

class PageStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class SocialPlatform(str, Enum):
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    TWITTER = "twitter"
    TIKTOK = "tiktok"
    LINKEDIN = "linkedin"
    YOUTUBE = "youtube"

class IconStyle(str, Enum):
    MONO = "mono"
    BRAND_COLOR = "brand_color"

class LogoType(str, Enum):
    PRIMARY = "primary"
    DARK = "dark"
    LIGHT = "light"
    APP_ICON = "app_icon"
    FAVICON = "favicon"
    EMAIL = "email"
    SPLASH = "splash"

class LinkPlacement(str, Enum):
    FOOTER = "footer"
    HEADER = "header"
    PROFILE = "profile"
    SHARE_DIALOG = "share_dialog"

# =========================================================================
# PYDANTIC MODELS
# =========================================================================

class CurrencyConfig(BaseModel):
    code: str = Field(..., description="ISO 4217 currency code")
    name: str
    symbol: str
    decimal_precision: int = Field(default=2, ge=0, le=4)
    rounding_rule: str = Field(default="round_half_up", description="round_half_up, round_down, round_up")
    enabled: bool = True
    is_default: bool = False
    countries: List[str] = Field(default_factory=list, description="ISO country codes where this currency applies")
    fx_rate_to_base: float = Field(default=1.0, description="Exchange rate to base currency")
    fx_rate_updated_at: Optional[str] = None
    locked_for_escrow: bool = False
    locked_for_historical: bool = False

class BrandingConfig(BaseModel):
    logo_type: LogoType
    file_path: str
    original_filename: str
    mime_type: str
    uploaded_at: str
    version: int = 1
    is_active: bool = True

class LegalPageContent(BaseModel):
    title: str
    slug: str
    content: str  # HTML content from WYSIWYG editor
    country_code: Optional[str] = None  # None for global, or ISO code for country-specific
    status: PageStatus = PageStatus.DRAFT
    version: int = 1
    requires_acceptance: bool = False
    force_reaccept_on_change: bool = False
    created_at: str
    updated_at: str
    published_at: Optional[str] = None
    created_by: str
    updated_by: str

class SocialLink(BaseModel):
    platform: SocialPlatform
    url: str
    enabled: bool = True
    icon_visible: bool = True
    placements: List[LinkPlacement] = Field(default_factory=lambda: [LinkPlacement.FOOTER])

class AppStoreLink(BaseModel):
    store: str  # google_play, apple_app_store, huawei_appgallery
    url: str
    country_code: Optional[str] = None  # None for global
    enabled: bool = True
    show_badge: bool = True
    deep_link_enabled: bool = False

class ExternalLink(BaseModel):
    id: str
    name: str
    url: str
    icon: Optional[str] = None
    enabled: bool = True
    placements: List[LinkPlacement] = Field(default_factory=list)

class AuditLogEntry(BaseModel):
    id: str
    action: str
    resource_type: str
    resource_id: str
    changes: Dict[str, Any]
    performed_by: str
    performed_at: str
    environment: Environment

class PlatformConfig(BaseModel):
    """Master configuration document"""
    id: str = "platform_config"
    environment: Environment
    
    # Currency settings
    currencies: List[CurrencyConfig] = Field(default_factory=list)
    default_currency: str = "USD"
    
    # Branding
    branding: Dict[str, BrandingConfig] = Field(default_factory=dict)
    
    # Social links
    social_links: List[SocialLink] = Field(default_factory=list)
    social_icon_style: IconStyle = IconStyle.BRAND_COLOR
    social_icons_enabled: bool = True
    
    # App store links
    app_store_links: List[AppStoreLink] = Field(default_factory=list)
    
    # External links
    external_links: List[ExternalLink] = Field(default_factory=list)
    
    # Config metadata
    version: int = 1
    updated_at: str
    updated_by: str

# =========================================================================
# SERVICE CLASS
# =========================================================================

class PlatformConfigService:
    """Centralized Platform Configuration Service"""
    
    def __init__(self, db):
        self.db = db
        self.config_collection = db.platform_config
        self.legal_pages_collection = db.legal_pages
        self.audit_log_collection = db.platform_audit_log
        self.user_acceptances_collection = db.user_legal_acceptances
        
        # Local file storage for uploads
        self.upload_dir = Path("/app/backend/uploads/branding")
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Config cache
        self._config_cache: Dict[str, PlatformConfig] = {}
        self._cache_timestamp: Dict[str, datetime] = {}
        self._cache_ttl = 60  # seconds
    
    # -------------------------------------------------------------------------
    # AUDIT LOGGING
    # -------------------------------------------------------------------------
    
    async def _log_audit(
        self,
        action: str,
        resource_type: str,
        resource_id: str,
        changes: Dict[str, Any],
        performed_by: str,
        environment: Environment
    ):
        """Log all configuration changes"""
        entry = {
            "id": str(uuid.uuid4()),
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "changes": changes,
            "performed_by": performed_by,
            "performed_at": datetime.now(timezone.utc).isoformat(),
            "environment": environment.value
        }
        await self.audit_log_collection.insert_one(entry)
        logger.info(f"Audit: {action} on {resource_type}/{resource_id} by {performed_by}")
    
    async def get_audit_logs(
        self,
        environment: Environment,
        resource_type: Optional[str] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict]:
        """Get audit logs with filtering"""
        query = {"environment": environment.value}
        if resource_type:
            query["resource_type"] = resource_type
        
        cursor = self.audit_log_collection.find(
            query, {"_id": 0}
        ).sort("performed_at", -1).skip(skip).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    # -------------------------------------------------------------------------
    # CONFIG MANAGEMENT
    # -------------------------------------------------------------------------
    
    async def get_config(self, environment: Environment) -> Dict:
        """Get platform config with caching and fail-safe"""
        cache_key = environment.value
        now = datetime.now(timezone.utc)
        
        # Check cache
        if cache_key in self._config_cache:
            cache_time = self._cache_timestamp.get(cache_key)
            if cache_time and (now - cache_time).total_seconds() < self._cache_ttl:
                return self._config_cache[cache_key]
        
        # Fetch from DB
        config = await self.config_collection.find_one(
            {"id": f"platform_config_{environment.value}"},
            {"_id": 0}
        )
        
        if not config:
            # Return default config (fail-safe)
            config = self._get_default_config(environment)
            await self.config_collection.insert_one(config)
        
        # Update cache
        self._config_cache[cache_key] = config
        self._cache_timestamp[cache_key] = now
        
        return config
    
    def _get_default_config(self, environment: Environment) -> Dict:
        """Get default configuration"""
        return {
            "id": f"platform_config_{environment.value}",
            "environment": environment.value,
            "currencies": [
                {
                    "code": "USD",
                    "name": "US Dollar",
                    "symbol": "$",
                    "decimal_precision": 2,
                    "rounding_rule": "round_half_up",
                    "enabled": True,
                    "is_default": True,
                    "countries": ["US"],
                    "fx_rate_to_base": 1.0,
                    "locked_for_escrow": False,
                    "locked_for_historical": False
                },
                {
                    "code": "EUR",
                    "name": "Euro",
                    "symbol": "€",
                    "decimal_precision": 2,
                    "rounding_rule": "round_half_up",
                    "enabled": True,
                    "is_default": False,
                    "countries": ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "PT", "IE", "FI"],
                    "fx_rate_to_base": 0.92,
                    "locked_for_escrow": False,
                    "locked_for_historical": False
                },
                {
                    "code": "GBP",
                    "name": "British Pound",
                    "symbol": "£",
                    "decimal_precision": 2,
                    "rounding_rule": "round_half_up",
                    "enabled": True,
                    "is_default": False,
                    "countries": ["GB"],
                    "fx_rate_to_base": 0.79,
                    "locked_for_escrow": False,
                    "locked_for_historical": False
                }
            ],
            "default_currency": "USD",
            "branding": {},
            "social_links": [],
            "social_icon_style": "brand_color",
            "social_icons_enabled": True,
            "app_store_links": [],
            "external_links": [],
            "version": 1,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "system"
        }
    
    async def update_config(
        self,
        environment: Environment,
        updates: Dict[str, Any],
        updated_by: str
    ) -> Dict:
        """Update platform config with versioning"""
        current = await self.get_config(environment)
        
        # Increment version
        new_version = current.get("version", 1) + 1
        
        # Prepare update
        updates["version"] = new_version
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        updates["updated_by"] = updated_by
        
        # Store old version for rollback
        await self.db.platform_config_history.insert_one({
            **current,
            "archived_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Update current config
        await self.config_collection.update_one(
            {"id": f"platform_config_{environment.value}"},
            {"$set": updates},
            upsert=True
        )
        
        # Clear cache
        if environment.value in self._config_cache:
            del self._config_cache[environment.value]
        
        # Log audit
        await self._log_audit(
            action="update_config",
            resource_type="platform_config",
            resource_id=environment.value,
            changes=updates,
            performed_by=updated_by,
            environment=environment
        )
        
        return await self.get_config(environment)
    
    async def rollback_config(
        self,
        environment: Environment,
        to_version: int,
        rolled_back_by: str
    ) -> Dict:
        """Rollback to a previous config version"""
        # Find the version in history
        historical = await self.db.platform_config_history.find_one(
            {
                "id": f"platform_config_{environment.value}",
                "version": to_version
            },
            {"_id": 0}
        )
        
        if not historical:
            raise HTTPException(status_code=404, detail=f"Version {to_version} not found")
        
        # Remove history metadata
        historical.pop("archived_at", None)
        
        # Save current as new history entry
        current = await self.get_config(environment)
        await self.db.platform_config_history.insert_one({
            **current,
            "archived_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Update version and metadata
        historical["version"] = current.get("version", 1) + 1
        historical["updated_at"] = datetime.now(timezone.utc).isoformat()
        historical["updated_by"] = rolled_back_by
        
        # Replace current config
        await self.config_collection.replace_one(
            {"id": f"platform_config_{environment.value}"},
            historical
        )
        
        # Clear cache
        if environment.value in self._config_cache:
            del self._config_cache[environment.value]
        
        # Log audit
        await self._log_audit(
            action="rollback_config",
            resource_type="platform_config",
            resource_id=environment.value,
            changes={"rolled_back_to_version": to_version},
            performed_by=rolled_back_by,
            environment=environment
        )
        
        return await self.get_config(environment)
    
    async def get_config_history(
        self,
        environment: Environment,
        limit: int = 20
    ) -> List[Dict]:
        """Get config version history"""
        cursor = self.db.platform_config_history.find(
            {"id": f"platform_config_{environment.value}"},
            {"_id": 0}
        ).sort("archived_at", -1).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    # -------------------------------------------------------------------------
    # CURRENCY MANAGEMENT
    # -------------------------------------------------------------------------
    
    async def get_currencies(self, environment: Environment) -> List[Dict]:
        """Get all currencies"""
        config = await self.get_config(environment)
        return config.get("currencies", [])
    
    async def add_currency(
        self,
        environment: Environment,
        currency: CurrencyConfig,
        added_by: str
    ) -> Dict:
        """Add a new currency"""
        config = await self.get_config(environment)
        currencies = config.get("currencies", [])
        
        # Check if currency already exists
        if any(c["code"] == currency.code for c in currencies):
            raise HTTPException(status_code=400, detail=f"Currency {currency.code} already exists")
        
        currencies.append(currency.dict())
        
        return await self.update_config(
            environment,
            {"currencies": currencies},
            added_by
        )
    
    async def update_currency(
        self,
        environment: Environment,
        currency_code: str,
        updates: Dict[str, Any],
        updated_by: str
    ) -> Dict:
        """Update a currency"""
        config = await self.get_config(environment)
        currencies = config.get("currencies", [])
        
        # Find and update currency
        updated = False
        for i, c in enumerate(currencies):
            if c["code"] == currency_code:
                # Check if locked
                if c.get("locked_for_escrow") and "locked_for_escrow" not in updates:
                    # Don't allow changes to locked currencies except unlocking
                    if any(k not in ["enabled", "locked_for_escrow"] for k in updates.keys()):
                        raise HTTPException(
                            status_code=400,
                            detail="Currency is locked for escrow. Only enable/disable allowed."
                        )
                
                currencies[i] = {**c, **updates}
                updated = True
                break
        
        if not updated:
            raise HTTPException(status_code=404, detail=f"Currency {currency_code} not found")
        
        return await self.update_config(
            environment,
            {"currencies": currencies},
            updated_by
        )
    
    async def set_default_currency(
        self,
        environment: Environment,
        currency_code: str,
        set_by: str
    ) -> Dict:
        """Set the default platform currency"""
        config = await self.get_config(environment)
        currencies = config.get("currencies", [])
        
        # Verify currency exists and is enabled
        currency_exists = False
        for c in currencies:
            if c["code"] == currency_code:
                if not c.get("enabled", True):
                    raise HTTPException(status_code=400, detail="Cannot set disabled currency as default")
                currency_exists = True
            c["is_default"] = (c["code"] == currency_code)
        
        if not currency_exists:
            raise HTTPException(status_code=404, detail=f"Currency {currency_code} not found")
        
        return await self.update_config(
            environment,
            {"currencies": currencies, "default_currency": currency_code},
            set_by
        )
    
    async def update_fx_rate(
        self,
        environment: Environment,
        currency_code: str,
        fx_rate: float,
        updated_by: str
    ) -> Dict:
        """Manually update FX rate"""
        return await self.update_currency(
            environment,
            currency_code,
            {
                "fx_rate_to_base": fx_rate,
                "fx_rate_updated_at": datetime.now(timezone.utc).isoformat()
            },
            updated_by
        )
    
    # -------------------------------------------------------------------------
    # BRANDING MANAGEMENT
    # -------------------------------------------------------------------------
    
    async def upload_logo(
        self,
        environment: Environment,
        logo_type: LogoType,
        file: UploadFile,
        uploaded_by: str
    ) -> Dict:
        """Upload a logo with versioning"""
        # Validate file type
        allowed_types = ["image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/x-icon"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail=f"Invalid file type: {file.content_type}")
        
        # Create versioned filename
        config = await self.get_config(environment)
        branding = config.get("branding", {})
        current_version = branding.get(logo_type.value, {}).get("version", 0)
        new_version = current_version + 1
        
        # Generate unique filename
        ext = Path(file.filename).suffix or ".png"
        filename = f"{logo_type.value}_v{new_version}_{environment.value}{ext}"
        file_path = self.upload_dir / filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Update config
        branding[logo_type.value] = {
            "logo_type": logo_type.value,
            "file_path": str(file_path),
            "original_filename": file.filename,
            "mime_type": file.content_type,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "version": new_version,
            "is_active": True
        }
        
        return await self.update_config(
            environment,
            {"branding": branding},
            uploaded_by
        )
    
    async def get_logo(self, environment: Environment, logo_type: LogoType) -> Optional[Dict]:
        """Get logo info"""
        config = await self.get_config(environment)
        return config.get("branding", {}).get(logo_type.value)
    
    async def rollback_logo(
        self,
        environment: Environment,
        logo_type: LogoType,
        to_version: int,
        rolled_back_by: str
    ) -> Dict:
        """Rollback to a previous logo version"""
        # Find previous version file
        ext_patterns = [".png", ".jpg", ".jpeg", ".svg", ".webp", ".ico"]
        for ext in ext_patterns:
            old_file = self.upload_dir / f"{logo_type.value}_v{to_version}_{environment.value}{ext}"
            if old_file.exists():
                config = await self.get_config(environment)
                branding = config.get("branding", {})
                current_version = branding.get(logo_type.value, {}).get("version", 0)
                
                branding[logo_type.value] = {
                    "logo_type": logo_type.value,
                    "file_path": str(old_file),
                    "original_filename": old_file.name,
                    "mime_type": f"image/{ext[1:]}",
                    "uploaded_at": datetime.now(timezone.utc).isoformat(),
                    "version": current_version + 1,
                    "is_active": True,
                    "rolled_back_from": to_version
                }
                
                return await self.update_config(
                    environment,
                    {"branding": branding},
                    rolled_back_by
                )
        
        raise HTTPException(status_code=404, detail=f"Version {to_version} not found for {logo_type.value}")
    
    # -------------------------------------------------------------------------
    # LEGAL PAGES MANAGEMENT
    # -------------------------------------------------------------------------
    
    async def get_legal_pages(
        self,
        environment: Environment,
        status: Optional[PageStatus] = None,
        country_code: Optional[str] = None
    ) -> List[Dict]:
        """Get all legal pages"""
        query = {"environment": environment.value}
        if status:
            query["status"] = status.value
        if country_code:
            query["$or"] = [
                {"country_code": country_code},
                {"country_code": None}
            ]
        
        cursor = self.legal_pages_collection.find(query, {"_id": 0})
        return await cursor.to_list(length=100)
    
    async def get_legal_page(
        self,
        environment: Environment,
        slug: str,
        country_code: Optional[str] = None,
        version: Optional[int] = None
    ) -> Optional[Dict]:
        """Get a specific legal page"""
        query = {
            "environment": environment.value,
            "slug": slug
        }
        
        if version:
            query["version"] = version
        else:
            query["status"] = PageStatus.PUBLISHED.value
        
        # Try country-specific first, then global
        if country_code:
            query["country_code"] = country_code
            page = await self.legal_pages_collection.find_one(query, {"_id": 0})
            if page:
                return page
            
            # Fallback to global
            query["country_code"] = None
        
        return await self.legal_pages_collection.find_one(query, {"_id": 0})
    
    async def create_legal_page(
        self,
        environment: Environment,
        page_data: Dict,
        created_by: str
    ) -> Dict:
        """Create a new legal page"""
        now = datetime.now(timezone.utc).isoformat()
        
        page = {
            "id": str(uuid.uuid4()),
            "environment": environment.value,
            **page_data,
            "version": 1,
            "status": PageStatus.DRAFT.value,
            "created_at": now,
            "updated_at": now,
            "created_by": created_by,
            "updated_by": created_by
        }
        
        await self.legal_pages_collection.insert_one(page)
        
        await self._log_audit(
            action="create_legal_page",
            resource_type="legal_page",
            resource_id=page["id"],
            changes=page_data,
            performed_by=created_by,
            environment=environment
        )
        
        page.pop("_id", None)
        return page
    
    async def update_legal_page(
        self,
        environment: Environment,
        page_id: str,
        updates: Dict,
        updated_by: str
    ) -> Dict:
        """Update a legal page (creates new version if published)"""
        current = await self.legal_pages_collection.find_one(
            {"id": page_id, "environment": environment.value},
            {"_id": 0}
        )
        
        if not current:
            raise HTTPException(status_code=404, detail="Page not found")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # If page is published, create new draft version
        if current.get("status") == PageStatus.PUBLISHED.value:
            # Archive current
            await self.db.legal_pages_history.insert_one({
                **current,
                "archived_at": now
            })
            
            # Create new draft
            new_page = {
                **current,
                **updates,
                "version": current.get("version", 1) + 1,
                "status": PageStatus.DRAFT.value,
                "updated_at": now,
                "updated_by": updated_by,
                "previous_version": current.get("version", 1)
            }
            
            await self.legal_pages_collection.replace_one(
                {"id": page_id, "environment": environment.value},
                new_page
            )
        else:
            # Update existing draft
            updates["updated_at"] = now
            updates["updated_by"] = updated_by
            
            await self.legal_pages_collection.update_one(
                {"id": page_id, "environment": environment.value},
                {"$set": updates}
            )
        
        await self._log_audit(
            action="update_legal_page",
            resource_type="legal_page",
            resource_id=page_id,
            changes=updates,
            performed_by=updated_by,
            environment=environment
        )
        
        return await self.legal_pages_collection.find_one(
            {"id": page_id, "environment": environment.value},
            {"_id": 0}
        )
    
    async def publish_legal_page(
        self,
        environment: Environment,
        page_id: str,
        published_by: str
    ) -> Dict:
        """Publish a legal page"""
        page = await self.legal_pages_collection.find_one(
            {"id": page_id, "environment": environment.value},
            {"_id": 0}
        )
        
        if not page:
            raise HTTPException(status_code=404, detail="Page not found")
        
        if page.get("status") == PageStatus.PUBLISHED.value:
            raise HTTPException(status_code=400, detail="Page is already published")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Check if this is a legal page that requires re-acceptance
        force_reaccept = page.get("force_reaccept_on_change", False)
        
        await self.legal_pages_collection.update_one(
            {"id": page_id, "environment": environment.value},
            {
                "$set": {
                    "status": PageStatus.PUBLISHED.value,
                    "published_at": now,
                    "updated_at": now,
                    "updated_by": published_by
                }
            }
        )
        
        # If force re-acceptance is enabled, invalidate all previous acceptances
        if force_reaccept:
            await self.user_acceptances_collection.update_many(
                {
                    "page_slug": page.get("slug"),
                    "environment": environment.value
                },
                {
                    "$set": {
                        "invalidated_at": now,
                        "invalidated_reason": f"New version {page.get('version')} published"
                    }
                }
            )
        
        await self._log_audit(
            action="publish_legal_page",
            resource_type="legal_page",
            resource_id=page_id,
            changes={"status": "published", "force_reaccept": force_reaccept},
            performed_by=published_by,
            environment=environment
        )
        
        return await self.legal_pages_collection.find_one(
            {"id": page_id, "environment": environment.value},
            {"_id": 0}
        )
    
    async def get_legal_page_history(
        self,
        environment: Environment,
        slug: str,
        limit: int = 20
    ) -> List[Dict]:
        """Get version history for a legal page"""
        cursor = self.db.legal_pages_history.find(
            {"slug": slug, "environment": environment.value},
            {"_id": 0}
        ).sort("archived_at", -1).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    async def record_user_acceptance(
        self,
        environment: Environment,
        user_id: str,
        page_slug: str,
        page_version: int
    ) -> Dict:
        """Record user's acceptance of a legal page"""
        now = datetime.now(timezone.utc).isoformat()
        
        acceptance = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "page_slug": page_slug,
            "page_version": page_version,
            "environment": environment.value,
            "accepted_at": now,
            "invalidated_at": None,
            "invalidated_reason": None
        }
        
        await self.user_acceptances_collection.insert_one(acceptance)
        acceptance.pop("_id", None)
        return acceptance
    
    async def check_user_acceptance(
        self,
        environment: Environment,
        user_id: str,
        page_slug: str
    ) -> Dict:
        """Check if user has accepted the current version of a legal page"""
        # Get current published page
        page = await self.get_legal_page(environment, page_slug)
        if not page:
            return {"needs_acceptance": False, "page_not_found": True}
        
        if not page.get("requires_acceptance", False):
            return {"needs_acceptance": False}
        
        # Check for valid acceptance
        acceptance = await self.user_acceptances_collection.find_one(
            {
                "user_id": user_id,
                "page_slug": page_slug,
                "environment": environment.value,
                "invalidated_at": None
            },
            {"_id": 0}
        )
        
        if not acceptance:
            return {
                "needs_acceptance": True,
                "page_slug": page_slug,
                "page_version": page.get("version"),
                "page_title": page.get("title")
            }
        
        # Check if acceptance is for current version
        if acceptance.get("page_version") != page.get("version"):
            return {
                "needs_acceptance": True,
                "page_slug": page_slug,
                "page_version": page.get("version"),
                "page_title": page.get("title"),
                "previous_acceptance_version": acceptance.get("page_version")
            }
        
        return {"needs_acceptance": False, "accepted_at": acceptance.get("accepted_at")}
    
    # -------------------------------------------------------------------------
    # SOCIAL & EXTERNAL LINKS
    # -------------------------------------------------------------------------
    
    async def update_social_links(
        self,
        environment: Environment,
        social_links: List[Dict],
        updated_by: str
    ) -> Dict:
        """Update social media links"""
        return await self.update_config(
            environment,
            {"social_links": social_links},
            updated_by
        )
    
    async def update_social_settings(
        self,
        environment: Environment,
        icon_style: IconStyle,
        icons_enabled: bool,
        updated_by: str
    ) -> Dict:
        """Update social icon settings"""
        return await self.update_config(
            environment,
            {
                "social_icon_style": icon_style.value,
                "social_icons_enabled": icons_enabled
            },
            updated_by
        )
    
    async def update_app_store_links(
        self,
        environment: Environment,
        app_store_links: List[Dict],
        updated_by: str
    ) -> Dict:
        """Update app store links"""
        return await self.update_config(
            environment,
            {"app_store_links": app_store_links},
            updated_by
        )
    
    async def update_external_links(
        self,
        environment: Environment,
        external_links: List[Dict],
        updated_by: str
    ) -> Dict:
        """Update external links"""
        return await self.update_config(
            environment,
            {"external_links": external_links},
            updated_by
        )
    
    # -------------------------------------------------------------------------
    # PUBLIC API FOR APP/WEB
    # -------------------------------------------------------------------------
    
    async def get_public_config(self, environment: Environment, country_code: Optional[str] = None) -> Dict:
        """Get public-facing config for app/web"""
        config = await self.get_config(environment)
        
        # Filter currencies for country if provided
        currencies = config.get("currencies", [])
        if country_code:
            # Return country-specific currency first, then default
            country_currencies = [c for c in currencies if country_code in c.get("countries", [])]
            if country_currencies:
                currencies = country_currencies
            else:
                currencies = [c for c in currencies if c.get("is_default")]
        
        # Build branding URLs
        branding = {}
        for logo_type, logo_info in config.get("branding", {}).items():
            if logo_info.get("is_active"):
                # Convert file path to URL
                file_path = logo_info.get("file_path", "")
                filename = Path(file_path).name if file_path else ""
                branding[logo_type] = {
                    "url": f"/api/platform/assets/branding/{filename}",
                    "version": logo_info.get("version")
                }
        
        return {
            "currencies": [
                {
                    "code": c["code"],
                    "name": c["name"],
                    "symbol": c["symbol"],
                    "decimal_precision": c["decimal_precision"],
                    "is_default": c["is_default"]
                }
                for c in currencies if c.get("enabled")
            ],
            "default_currency": config.get("default_currency", "USD"),
            "branding": branding,
            "social_links": [
                {
                    "platform": s["platform"],
                    "url": s["url"],
                    "placements": s.get("placements", [])
                }
                for s in config.get("social_links", []) if s.get("enabled") and s.get("icon_visible")
            ] if config.get("social_icons_enabled") else [],
            "social_icon_style": config.get("social_icon_style", "brand_color"),
            "app_store_links": [
                {
                    "store": a["store"],
                    "url": a["url"],
                    "show_badge": a.get("show_badge", True)
                }
                for a in config.get("app_store_links", [])
                if a.get("enabled") and (not country_code or not a.get("country_code") or a.get("country_code") == country_code)
            ],
            "external_links": [
                {
                    "id": e["id"],
                    "name": e["name"],
                    "url": e["url"],
                    "placements": e.get("placements", [])
                }
                for e in config.get("external_links", []) if e.get("enabled")
            ]
        }


# =========================================================================
# API ROUTER
# =========================================================================

def create_platform_config_router(db):
    """Create platform config router"""
    router = APIRouter(prefix="/platform", tags=["Platform Configuration"])
    service = PlatformConfigService(db)
    
    # -------------------------------------------------------------------------
    # CONFIG ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.get("/config/{environment}")
    async def get_config(environment: Environment):
        """Get full platform config (admin only)"""
        return await service.get_config(environment)
    
    @router.put("/config/{environment}")
    async def update_config(
        environment: Environment,
        updates: Dict[str, Any] = Body(...),
        updated_by: str = Body("admin")
    ):
        """Update platform config"""
        return await service.update_config(environment, updates, updated_by)
    
    @router.post("/config/{environment}/rollback")
    async def rollback_config(
        environment: Environment,
        to_version: int = Body(..., embed=True),
        rolled_back_by: str = Body("admin", embed=True)
    ):
        """Rollback to a previous config version"""
        return await service.rollback_config(environment, to_version, rolled_back_by)
    
    @router.get("/config/{environment}/history")
    async def get_config_history(
        environment: Environment,
        limit: int = Query(20, ge=1, le=100)
    ):
        """Get config version history"""
        return await service.get_config_history(environment, limit)
    
    # -------------------------------------------------------------------------
    # CURRENCY ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.get("/currencies/{environment}")
    async def get_currencies(environment: Environment):
        """Get all currencies"""
        return await service.get_currencies(environment)
    
    @router.post("/currencies/{environment}")
    async def add_currency(
        environment: Environment,
        currency: CurrencyConfig,
        added_by: str = Body("admin")
    ):
        """Add a new currency"""
        return await service.add_currency(environment, currency, added_by)
    
    @router.put("/currencies/{environment}/{currency_code}")
    async def update_currency(
        environment: Environment,
        currency_code: str,
        updates: Dict[str, Any] = Body(...),
        updated_by: str = Body("admin")
    ):
        """Update a currency"""
        return await service.update_currency(environment, currency_code, updates, updated_by)
    
    @router.post("/currencies/{environment}/{currency_code}/set-default")
    async def set_default_currency(
        environment: Environment,
        currency_code: str,
        set_by: str = Body("admin", embed=True)
    ):
        """Set the default platform currency"""
        return await service.set_default_currency(environment, currency_code, set_by)
    
    @router.put("/currencies/{environment}/{currency_code}/fx-rate")
    async def update_fx_rate(
        environment: Environment,
        currency_code: str,
        fx_rate: float = Body(..., embed=True),
        updated_by: str = Body("admin", embed=True)
    ):
        """Update FX rate for a currency"""
        return await service.update_fx_rate(environment, currency_code, fx_rate, updated_by)
    
    # -------------------------------------------------------------------------
    # BRANDING ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.post("/branding/{environment}/upload")
    async def upload_logo(
        environment: Environment,
        logo_type: LogoType = Form(...),
        file: UploadFile = File(...),
        uploaded_by: str = Form("admin")
    ):
        """Upload a logo"""
        return await service.upload_logo(environment, logo_type, file, uploaded_by)
    
    @router.get("/branding/{environment}/{logo_type}")
    async def get_logo(environment: Environment, logo_type: LogoType):
        """Get logo info"""
        logo = await service.get_logo(environment, logo_type)
        if not logo:
            raise HTTPException(status_code=404, detail="Logo not found")
        return logo
    
    @router.post("/branding/{environment}/{logo_type}/rollback")
    async def rollback_logo(
        environment: Environment,
        logo_type: LogoType,
        to_version: int = Body(..., embed=True),
        rolled_back_by: str = Body("admin", embed=True)
    ):
        """Rollback to a previous logo version"""
        return await service.rollback_logo(environment, logo_type, to_version, rolled_back_by)
    
    # -------------------------------------------------------------------------
    # LEGAL PAGES ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.get("/legal-pages/{environment}")
    async def get_legal_pages(
        environment: Environment,
        status: Optional[PageStatus] = None,
        country_code: Optional[str] = None
    ):
        """Get all legal pages"""
        return await service.get_legal_pages(environment, status, country_code)
    
    @router.get("/legal-pages/{environment}/{slug}")
    async def get_legal_page(
        environment: Environment,
        slug: str,
        country_code: Optional[str] = None,
        version: Optional[int] = None
    ):
        """Get a specific legal page"""
        page = await service.get_legal_page(environment, slug, country_code, version)
        if not page:
            raise HTTPException(status_code=404, detail="Page not found")
        return page
    
    @router.post("/legal-pages/{environment}")
    async def create_legal_page(
        environment: Environment,
        page_data: Dict = Body(...),
        created_by: str = Body("admin")
    ):
        """Create a new legal page"""
        return await service.create_legal_page(environment, page_data, created_by)
    
    @router.put("/legal-pages/{environment}/{page_id}")
    async def update_legal_page(
        environment: Environment,
        page_id: str,
        updates: Dict = Body(...),
        updated_by: str = Body("admin")
    ):
        """Update a legal page"""
        return await service.update_legal_page(environment, page_id, updates, updated_by)
    
    @router.post("/legal-pages/{environment}/{page_id}/publish")
    async def publish_legal_page(
        environment: Environment,
        page_id: str,
        published_by: str = Body("admin", embed=True)
    ):
        """Publish a legal page"""
        return await service.publish_legal_page(environment, page_id, published_by)
    
    @router.get("/legal-pages/{environment}/{slug}/history")
    async def get_legal_page_history(
        environment: Environment,
        slug: str,
        limit: int = Query(20, ge=1, le=100)
    ):
        """Get version history for a legal page"""
        return await service.get_legal_page_history(environment, slug, limit)
    
    # -------------------------------------------------------------------------
    # SOCIAL & EXTERNAL LINKS ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.put("/social-links/{environment}")
    async def update_social_links(
        environment: Environment,
        social_links: List[Dict] = Body(...),
        updated_by: str = Body("admin")
    ):
        """Update social media links"""
        return await service.update_social_links(environment, social_links, updated_by)
    
    @router.put("/social-settings/{environment}")
    async def update_social_settings(
        environment: Environment,
        icon_style: IconStyle = Body(...),
        icons_enabled: bool = Body(...),
        updated_by: str = Body("admin")
    ):
        """Update social icon settings"""
        return await service.update_social_settings(environment, icon_style, icons_enabled, updated_by)
    
    @router.put("/app-store-links/{environment}")
    async def update_app_store_links(
        environment: Environment,
        app_store_links: List[Dict] = Body(...),
        updated_by: str = Body("admin")
    ):
        """Update app store links"""
        return await service.update_app_store_links(environment, app_store_links, updated_by)
    
    @router.put("/external-links/{environment}")
    async def update_external_links(
        environment: Environment,
        external_links: List[Dict] = Body(...),
        updated_by: str = Body("admin")
    ):
        """Update external links"""
        return await service.update_external_links(environment, external_links, updated_by)
    
    # -------------------------------------------------------------------------
    # AUDIT LOG ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.get("/audit-logs/{environment}")
    async def get_audit_logs(
        environment: Environment,
        resource_type: Optional[str] = None,
        limit: int = Query(100, ge=1, le=500),
        skip: int = Query(0, ge=0)
    ):
        """Get audit logs"""
        return await service.get_audit_logs(environment, resource_type, limit, skip)
    
    # -------------------------------------------------------------------------
    # PUBLIC ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.get("/public/config")
    async def get_public_config(
        environment: Environment = Query(Environment.PRODUCTION),
        country_code: Optional[str] = None
    ):
        """Get public-facing config for app/web"""
        return await service.get_public_config(environment, country_code)
    
    @router.get("/public/legal/{slug}")
    async def get_public_legal_page(
        slug: str,
        environment: Environment = Query(Environment.PRODUCTION),
        country_code: Optional[str] = None
    ):
        """Get a public legal page"""
        page = await service.get_legal_page(environment, slug, country_code)
        if not page:
            raise HTTPException(status_code=404, detail="Page not found")
        
        # Return only public fields
        return {
            "title": page.get("title"),
            "slug": page.get("slug"),
            "content": page.get("content"),
            "version": page.get("version"),
            "published_at": page.get("published_at"),
            "requires_acceptance": page.get("requires_acceptance", False)
        }
    
    @router.post("/public/legal/{slug}/accept")
    async def accept_legal_page(
        slug: str,
        user_id: str = Body(..., embed=True),
        environment: Environment = Body(Environment.PRODUCTION, embed=True)
    ):
        """Record user's acceptance of a legal page"""
        page = await service.get_legal_page(environment, slug)
        if not page:
            raise HTTPException(status_code=404, detail="Page not found")
        
        return await service.record_user_acceptance(
            environment,
            user_id,
            slug,
            page.get("version", 1)
        )
    
    @router.get("/public/legal/{slug}/check-acceptance")
    async def check_legal_acceptance(
        slug: str,
        user_id: str,
        environment: Environment = Query(Environment.PRODUCTION)
    ):
        """Check if user needs to accept a legal page"""
        return await service.check_user_acceptance(environment, user_id, slug)
    
    # -------------------------------------------------------------------------
    # ASSET SERVING
    # -------------------------------------------------------------------------
    
    from fastapi.responses import FileResponse
    
    @router.get("/assets/branding/{filename}")
    async def serve_branding_asset(filename: str):
        """Serve branding assets"""
        file_path = service.upload_dir / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Asset not found")
        
        # Determine content type
        content_types = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".svg": "image/svg+xml",
            ".webp": "image/webp",
            ".ico": "image/x-icon"
        }
        content_type = content_types.get(file_path.suffix.lower(), "application/octet-stream")
        
        return FileResponse(
            file_path,
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=86400"}  # Cache for 24 hours
        )
    
    return router, service
