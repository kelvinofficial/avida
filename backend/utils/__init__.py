"""
Utility functions and services for the backend.
"""

from .email_service import send_notification_email, build_email_template
from .push_service import (
    send_push_notification,
    send_bulk_push_notifications,
    send_milestone_push_notification,
    check_and_notify_new_milestones
)

__all__ = [
    'send_notification_email',
    'build_email_template',
    'send_push_notification',
    'send_bulk_push_notifications',
    'send_milestone_push_notification',
    'check_and_notify_new_milestones',
]
