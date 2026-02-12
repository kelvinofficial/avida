"""
Email Service Module
Handles sending notification emails via SendGrid.
"""

import os
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Check if SendGrid is available
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, Email, To
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False
    logger.warning("SendGrid not installed. Email notifications will be disabled.")

# Configuration
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "noreply@avida.app")


async def send_notification_email(
    to_email: str, 
    subject: str, 
    body: str,
    notification_type: str = "default",
    data: Dict[str, Any] = {}
) -> bool:
    """
    Send email notification via SendGrid.
    
    Args:
        to_email: Recipient email address
        subject: Email subject line
        body: Email body text
        notification_type: Type of notification for styling (default, security_alert, offer_received, etc.)
        data: Additional data for email template (listing_id, conversation_id, etc.)
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    if not SENDGRID_AVAILABLE:
        logger.info(f"SendGrid not available. Email would be sent to {to_email}: {subject}")
        return False
    
    if not SENDGRID_API_KEY:
        logger.warning("SendGrid API key not configured")
        return False
    
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        
        # Build HTML email content
        html_content = build_email_template(subject, body, notification_type, data)
        
        message = Mail(
            from_email=Email(FROM_EMAIL, "avida Marketplace"),
            to_emails=To(to_email),
            subject=subject,
            html_content=html_content
        )
        
        response = sg.send(message)
        
        if response.status_code in [200, 201, 202]:
            logger.info(f"Email sent successfully to {to_email}")
            return True
        else:
            logger.warning(f"Email send failed with status {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


def build_email_template(subject: str, body: str, notification_type: str, data: Dict[str, Any]) -> str:
    """
    Build HTML email template.
    
    Args:
        subject: Email subject for header
        body: Email body text
        notification_type: Type of notification for color styling
        data: Additional data for CTA buttons
    
    Returns:
        str: Complete HTML email template
    """
    
    # Color based on notification type
    accent_color = "#2E7D32"  # Default green
    if notification_type in ["security_alert"]:
        accent_color = "#D32F2F"
    elif notification_type in ["offer_received", "offer_accepted"]:
        accent_color = "#1976D2"
    elif notification_type in ["price_drop", "better_deal"]:
        accent_color = "#FF6F00"
    
    # CTA button if applicable
    cta_button = ""
    if data.get("listing_id"):
        cta_button = f'''
        <a href="https://avida.app/listing/{data['listing_id']}" 
           style="display: inline-block; background-color: {accent_color}; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 8px; 
                  font-weight: 600; margin-top: 16px;">
            View Listing
        </a>
        '''
    elif data.get("conversation_id"):
        cta_button = f'''
        <a href="https://avida.app/chat/{data['conversation_id']}" 
           style="display: inline-block; background-color: {accent_color}; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 8px; 
                  font-weight: 600; margin-top: 16px;">
            View Message
        </a>
        '''
    
    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f5f5f5;">
            <tr>
                <td style="padding: 40px 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background-color: {accent_color}; padding: 24px; text-align: center;">
                                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">avida</h1>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 32px;">
                                <h2 style="margin: 0 0 16px 0; color: #212121; font-size: 20px;">{subject.replace('[avida] ', '')}</h2>
                                <p style="margin: 0; color: #757575; font-size: 16px; line-height: 1.6;">{body}</p>
                                {cta_button}
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f5f5f5; padding: 24px; text-align: center;">
                                <p style="margin: 0 0 8px 0; color: #757575; font-size: 14px;">
                                    You received this email because you have notifications enabled.
                                </p>
                                <p style="margin: 0; color: #9e9e9e; font-size: 12px;">
                                    <a href="https://avida.app/settings" style="color: {accent_color}; text-decoration: none;">Manage notification preferences</a>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    '''
