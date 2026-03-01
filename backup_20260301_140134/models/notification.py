"""Notification models."""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid


class NotificationType:
    NEW_MESSAGE = "new_message"
    NEW_OFFER = "new_offer"
    OFFER_ACCEPTED = "offer_accepted"
    OFFER_REJECTED = "offer_rejected"
    LISTING_SOLD = "listing_sold"
    PRICE_DROP = "price_drop"
    NEW_REVIEW = "new_review"
    ACCOUNT_UPDATE = "account_update"
    PROMOTION = "promotion"
    BADGE_EARNED = "badge_earned"
    CHALLENGE_COMPLETED = "challenge_completed"
    MILESTONE_REACHED = "milestone_reached"


class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str
    title: str
    body: str
    data: Dict[str, Any] = {}
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NotificationCreate(BaseModel):
    user_id: str
    type: str
    title: str
    body: str
    data: Dict[str, Any] = {}


class NotificationSettings(BaseModel):
    push_enabled: bool = True
    email_enabled: bool = True
    sms_enabled: bool = False
    listing_updates: bool = True
    messages: bool = True
    offers: bool = True
    marketing: bool = False
    price_alerts: bool = True
