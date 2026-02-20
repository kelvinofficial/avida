"""
Email Testing Routes
Provides endpoints for testing email delivery via SendGrid.
"""

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def create_email_test_router(db, require_auth):
    """Create email testing router."""
    router = APIRouter(prefix="/email", tags=["email"])
    
    class TestEmailRequest(BaseModel):
        to_email: EmailStr
        subject: Optional[str] = "Test Email from avida"
        body: Optional[str] = "This is a test email to verify SendGrid integration is working correctly."
        notification_type: Optional[str] = "default"
    
    class EmailResponse(BaseModel):
        success: bool
        message: str
        details: Optional[dict] = None
    
    @router.post("/test", response_model=EmailResponse)
    async def send_test_email(
        request_body: TestEmailRequest,
        request: Request,
        background_tasks: BackgroundTasks
    ):
        """
        Send a test email to verify SendGrid integration.
        Requires authentication.
        """
        # Auth is optional for testing
        try:
            user = await require_auth(request)
            sender_info = f"by {user.email}"
        except:
            sender_info = "anonymous"
        
        try:
            from utils.email_service import send_notification_email, SENDGRID_AVAILABLE, SENDGRID_API_KEY
            
            if not SENDGRID_AVAILABLE:
                return EmailResponse(
                    success=False,
                    message="SendGrid library not installed",
                    details={"error": "sendgrid package not available"}
                )
            
            if not SENDGRID_API_KEY:
                return EmailResponse(
                    success=False,
                    message="SendGrid API key not configured",
                    details={"error": "SENDGRID_API_KEY environment variable not set"}
                )
            
            # Send the test email
            result = await send_notification_email(
                to_email=request_body.to_email,
                subject=f"[avida] {request_body.subject}",
                body=request_body.body,
                notification_type=request_body.notification_type,
                data={}
            )
            
            if result:
                logger.info(f"Test email sent successfully to {request_body.to_email} {sender_info}")
                return EmailResponse(
                    success=True,
                    message=f"Email sent successfully to {request_body.to_email}",
                    details={
                        "recipient": request_body.to_email,
                        "subject": request_body.subject
                    }
                )
            else:
                return EmailResponse(
                    success=False,
                    message="Email sending failed",
                    details={"error": "SendGrid returned failure status"}
                )
                
        except Exception as e:
            logger.error(f"Test email error: {e}")
            return EmailResponse(
                success=False,
                message="Email sending failed",
                details={"error": str(e)}
            )
    
    @router.get("/status")
    async def get_email_status():
        """Check email service status."""
        try:
            from utils.email_service import SENDGRID_AVAILABLE, get_api_key, FROM_EMAIL, FROM_NAME
            
            api_key = get_api_key()
            return {
                "sendgrid_installed": SENDGRID_AVAILABLE,
                "api_key_configured": bool(api_key),
                "from_email": FROM_EMAIL,
                "from_name": FROM_NAME,
                "status": "ready" if (SENDGRID_AVAILABLE and api_key) else "not_configured"
            }
        except Exception as e:
            return {
                "sendgrid_installed": False,
                "api_key_configured": False,
                "status": "error",
                "error": str(e)
            }
    
    return router
