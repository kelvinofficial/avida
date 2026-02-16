"""
PWA Routes - Serve service worker and manifest for Progressive Web App support
"""
from fastapi import APIRouter
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

def create_pwa_router():
    """Create router for PWA assets"""
    router = APIRouter(prefix="/pwa", tags=["PWA"])
    
    # Path to frontend web assets
    web_path = Path(__file__).parent.parent / "frontend" / "web"
    
    @router.get("/sw.js")
    async def get_service_worker():
        """Serve the service worker JavaScript file"""
        sw_path = web_path / "sw.js"
        if not sw_path.exists():
            logger.error(f"Service worker not found at {sw_path}")
            return JSONResponse(
                status_code=404,
                content={"error": "Service worker not found"}
            )
        return FileResponse(
            sw_path,
            media_type="application/javascript",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Service-Worker-Allowed": "/"
            }
        )
    
    @router.get("/manifest.json")
    async def get_manifest():
        """Serve the PWA manifest"""
        manifest_path = web_path / "manifest.json"
        if not manifest_path.exists():
            logger.error(f"Manifest not found at {manifest_path}")
            return JSONResponse(
                status_code=404,
                content={"error": "Manifest not found"}
            )
        return FileResponse(
            manifest_path,
            media_type="application/manifest+json",
            headers={
                "Cache-Control": "public, max-age=3600"
            }
        )
    
    logger.info("PWA routes created successfully")
    return router
