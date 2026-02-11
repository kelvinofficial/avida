"""User-related models."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone


class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    verified: bool = False
    rating: float = 0.0
    total_ratings: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    blocked_users: List[str] = []
    notifications_enabled: bool = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None


class NotificationSettings(BaseModel):
    push_enabled: bool = True
    email_enabled: bool = True
    sms_enabled: bool = False
    listing_updates: bool = True
    messages: bool = True
    offers: bool = True
    marketing: bool = False
    price_alerts: bool = True


class QuietHours(BaseModel):
    enabled: bool = False
    start: str = "22:00"
    end: str = "08:00"


class AlertPreferences(BaseModel):
    sound: bool = True
    vibration: bool = True
    badge_count: bool = True


class PrivacySettings(BaseModel):
    show_online_status: bool = True
    show_last_seen: bool = True
    show_read_receipts: bool = True
    profile_visibility: str = "public"  # public, contacts, private
    show_location: bool = True


class AppPreferences(BaseModel):
    language: str = "en"
    currency: str = "EUR"
    distance_unit: str = "km"
    dark_mode: bool = False


class SecuritySettings(BaseModel):
    two_factor_enabled: bool = False
    login_alerts: bool = True


class UserSettings(BaseModel):
    user_id: str
    notifications: NotificationSettings = Field(default_factory=NotificationSettings)
    quiet_hours: QuietHours = Field(default_factory=QuietHours)
    alerts: AlertPreferences = Field(default_factory=AlertPreferences)
    privacy: PrivacySettings = Field(default_factory=PrivacySettings)
    app: AppPreferences = Field(default_factory=AppPreferences)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    push_token: Optional[str] = None


class UserSettingsUpdate(BaseModel):
    notifications: Optional[NotificationSettings] = None
    quiet_hours: Optional[QuietHours] = None
    alerts: Optional[AlertPreferences] = None
    privacy: Optional[PrivacySettings] = None
    app: Optional[AppPreferences] = None
    security: Optional[SecuritySettings] = None
    push_token: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    picture: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class DeleteAccountRequest(BaseModel):
    password: str
    reason: Optional[str] = None
    feedback: Optional[str] = None


class UserStats(BaseModel):
    total_listings: int = 0
    active_listings: int = 0
    sold_items: int = 0
    total_views: int = 0
    total_favorites: int = 0
    member_since: Optional[datetime] = None
    last_active: Optional[datetime] = None
    response_rate: float = 0.0
    response_time: Optional[str] = None
