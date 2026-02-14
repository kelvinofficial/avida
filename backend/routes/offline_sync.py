"""
Offline Sync Routes
Handles syncing of offline-created listings, messages, and other actions
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid
import logging

logger = logging.getLogger("offline_sync")


# =============================================================================
# MODELS
# =============================================================================

class OfflineActionType(str, Enum):
    CREATE_LISTING = "create_listing"
    UPDATE_LISTING = "update_listing"
    DELETE_LISTING = "delete_listing"
    TOGGLE_FAVORITE = "toggle_favorite"
    SEND_MESSAGE = "send_message"
    VIEW_LISTING = "view_listing"
    TRACK_SEARCH = "track_search"
    UPDATE_PROFILE = "update_profile"


class OfflineAction(BaseModel):
    """Single offline action to sync"""
    client_id: str  # Client-generated ID for deduplication
    action_type: OfflineActionType
    payload: Dict[str, Any]
    created_at: str  # ISO timestamp when action was created offline
    retry_count: int = 0


class SyncRequest(BaseModel):
    """Request to sync multiple offline actions"""
    device_id: str
    actions: List[OfflineAction]
    last_sync_timestamp: Optional[str] = None


class SyncResult(BaseModel):
    """Result of a single sync action"""
    client_id: str
    success: bool
    server_id: Optional[str] = None  # Server-generated ID if applicable
    error: Optional[str] = None
    conflict: bool = False
    resolved_data: Optional[Dict[str, Any]] = None


class SyncResponse(BaseModel):
    """Response from sync operation"""
    synced_count: int
    failed_count: int
    conflict_count: int
    results: List[SyncResult]
    server_timestamp: str
    pending_updates: List[Dict[str, Any]] = []  # Data that changed on server since last sync


class CacheRefreshRequest(BaseModel):
    """Request to refresh cached data"""
    last_sync: Optional[str] = None
    include_listings: bool = True
    include_categories: bool = True
    include_favorites: bool = True
    include_messages: bool = False
    listing_limit: int = 100


# =============================================================================
# OFFLINE SYNC SYSTEM
# =============================================================================

class OfflineSyncSystem:
    def __init__(self, db):
        self.db = db
    
    async def sync_actions(
        self,
        user_id: str,
        device_id: str,
        actions: List[OfflineAction],
        last_sync: Optional[str] = None
    ) -> dict:
        """Process and sync offline actions"""
        
        results = []
        synced = 0
        failed = 0
        conflicts = 0
        
        # Sort actions by timestamp to process in order
        sorted_actions = sorted(actions, key=lambda a: a.created_at)
        
        for action in sorted_actions:
            try:
                # Check for duplicate (already processed)
                existing = await self.db.synced_actions.find_one({
                    "client_id": action.client_id,
                    "user_id": user_id
                })
                
                if existing:
                    # Already synced, return existing result
                    results.append(SyncResult(
                        client_id=action.client_id,
                        success=True,
                        server_id=existing.get("server_id"),
                        error=None,
                        conflict=False
                    ))
                    synced += 1
                    continue
                
                # Process action based on type
                result = await self._process_action(user_id, action)
                
                # Store synced action for deduplication
                await self.db.synced_actions.insert_one({
                    "client_id": action.client_id,
                    "user_id": user_id,
                    "device_id": device_id,
                    "action_type": action.action_type.value,
                    "server_id": result.server_id,
                    "success": result.success,
                    "synced_at": datetime.now(timezone.utc).isoformat()
                })
                
                results.append(result)
                
                if result.success:
                    synced += 1
                elif result.conflict:
                    conflicts += 1
                else:
                    failed += 1
                    
            except Exception as e:
                logger.error(f"Failed to sync action {action.client_id}: {e}")
                results.append(SyncResult(
                    client_id=action.client_id,
                    success=False,
                    error=str(e)
                ))
                failed += 1
        
        # Get pending server updates since last sync
        pending_updates = []
        if last_sync:
            pending_updates = await self._get_pending_updates(user_id, last_sync)
        
        return {
            "synced_count": synced,
            "failed_count": failed,
            "conflict_count": conflicts,
            "results": [r.dict() for r in results],
            "server_timestamp": datetime.now(timezone.utc).isoformat(),
            "pending_updates": pending_updates
        }
    
    async def _process_action(self, user_id: str, action: OfflineAction) -> SyncResult:
        """Process a single offline action"""
        
        if action.action_type == OfflineActionType.CREATE_LISTING:
            return await self._sync_create_listing(user_id, action)
        
        elif action.action_type == OfflineActionType.UPDATE_LISTING:
            return await self._sync_update_listing(user_id, action)
        
        elif action.action_type == OfflineActionType.DELETE_LISTING:
            return await self._sync_delete_listing(user_id, action)
        
        elif action.action_type == OfflineActionType.TOGGLE_FAVORITE:
            return await self._sync_toggle_favorite(user_id, action)
        
        elif action.action_type == OfflineActionType.SEND_MESSAGE:
            return await self._sync_send_message(user_id, action)
        
        elif action.action_type == OfflineActionType.VIEW_LISTING:
            return await self._sync_view_listing(user_id, action)
        
        elif action.action_type == OfflineActionType.TRACK_SEARCH:
            return await self._sync_track_search(user_id, action)
        
        elif action.action_type == OfflineActionType.UPDATE_PROFILE:
            return await self._sync_update_profile(user_id, action)
        
        else:
            return SyncResult(
                client_id=action.client_id,
                success=False,
                error=f"Unknown action type: {action.action_type}"
            )
    
    async def _sync_create_listing(self, user_id: str, action: OfflineAction) -> SyncResult:
        """Sync offline-created listing"""
        payload = action.payload
        
        # Generate server ID
        server_id = f"lst_{uuid.uuid4().hex[:12]}"
        
        # Build listing document
        listing = {
            "id": server_id,
            "user_id": user_id,
            "title": payload.get("title"),
            "description": payload.get("description"),
            "price": payload.get("price"),
            "currency": payload.get("currency", "USD"),
            "category": payload.get("category"),
            "subcategory": payload.get("subcategory"),
            "condition": payload.get("condition"),
            "images": payload.get("images", []),
            "location": payload.get("location", {}),
            "attributes": payload.get("attributes", {}),
            "contact_preferences": payload.get("contact_preferences", {}),
            "status": "active",
            "views": 0,
            "is_boosted": False,
            "created_at": action.created_at,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "offline_created": True,
            "client_id": action.client_id
        }
        
        await self.db.listings.insert_one(listing)
        
        return SyncResult(
            client_id=action.client_id,
            success=True,
            server_id=server_id
        )
    
    async def _sync_update_listing(self, user_id: str, action: OfflineAction) -> SyncResult:
        """Sync offline listing update"""
        payload = action.payload
        listing_id = payload.get("listing_id")
        
        if not listing_id:
            return SyncResult(
                client_id=action.client_id,
                success=False,
                error="Missing listing_id"
            )
        
        # Check ownership
        listing = await self.db.listings.find_one({"id": listing_id})
        if not listing:
            return SyncResult(
                client_id=action.client_id,
                success=False,
                error="Listing not found"
            )
        
        if listing.get("user_id") != user_id:
            return SyncResult(
                client_id=action.client_id,
                success=False,
                error="Not authorized"
            )
        
        # Check for conflict (server version is newer)
        server_updated = listing.get("updated_at", "")
        client_updated = action.created_at
        
        if server_updated > client_updated:
            # Conflict - server has newer version
            return SyncResult(
                client_id=action.client_id,
                success=False,
                conflict=True,
                resolved_data={
                    "server_data": {k: v for k, v in listing.items() if k != "_id"},
                    "client_timestamp": client_updated,
                    "server_timestamp": server_updated
                }
            )
        
        # Apply updates
        updates = payload.get("updates", {})
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await self.db.listings.update_one(
            {"id": listing_id},
            {"$set": updates}
        )
        
        return SyncResult(
            client_id=action.client_id,
            success=True,
            server_id=listing_id
        )
    
    async def _sync_delete_listing(self, user_id: str, action: OfflineAction) -> SyncResult:
        """Sync offline listing deletion"""
        listing_id = action.payload.get("listing_id")
        
        if not listing_id:
            return SyncResult(
                client_id=action.client_id,
                success=False,
                error="Missing listing_id"
            )
        
        # Check ownership
        listing = await self.db.listings.find_one({"id": listing_id})
        if not listing:
            # Already deleted or never existed
            return SyncResult(
                client_id=action.client_id,
                success=True,
                server_id=listing_id
            )
        
        if listing.get("user_id") != user_id:
            return SyncResult(
                client_id=action.client_id,
                success=False,
                error="Not authorized"
            )
        
        # Soft delete
        await self.db.listings.update_one(
            {"id": listing_id},
            {
                "$set": {
                    "status": "deleted",
                    "deleted_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return SyncResult(
            client_id=action.client_id,
            success=True,
            server_id=listing_id
        )
    
    async def _sync_toggle_favorite(self, user_id: str, action: OfflineAction) -> SyncResult:
        """Sync offline favorite toggle"""
        listing_id = action.payload.get("listing_id")
        is_favorite = action.payload.get("is_favorite", True)
        
        if not listing_id:
            return SyncResult(
                client_id=action.client_id,
                success=False,
                error="Missing listing_id"
            )
        
        if is_favorite:
            # Add to favorites
            existing = await self.db.favorites.find_one({
                "user_id": user_id,
                "listing_id": listing_id
            })
            
            if not existing:
                await self.db.favorites.insert_one({
                    "id": f"fav_{uuid.uuid4().hex[:12]}",
                    "user_id": user_id,
                    "listing_id": listing_id,
                    "created_at": action.created_at
                })
        else:
            # Remove from favorites
            await self.db.favorites.delete_one({
                "user_id": user_id,
                "listing_id": listing_id
            })
        
        return SyncResult(
            client_id=action.client_id,
            success=True,
            server_id=listing_id
        )
    
    async def _sync_send_message(self, user_id: str, action: OfflineAction) -> SyncResult:
        """Sync offline message"""
        payload = action.payload
        conversation_id = payload.get("conversation_id")
        recipient_id = payload.get("recipient_id")
        listing_id = payload.get("listing_id")
        content = payload.get("content")
        
        if not content:
            return SyncResult(
                client_id=action.client_id,
                success=False,
                error="Message content required"
            )
        
        # Find or create conversation
        if not conversation_id and recipient_id and listing_id:
            # Try to find existing conversation
            conversation = await self.db.conversations.find_one({
                "listing_id": listing_id,
                "participants": {"$all": [user_id, recipient_id]}
            })
            
            if conversation:
                conversation_id = conversation["id"]
            else:
                # Create new conversation
                conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
                await self.db.conversations.insert_one({
                    "id": conversation_id,
                    "listing_id": listing_id,
                    "participants": [user_id, recipient_id],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                })
        
        if not conversation_id:
            return SyncResult(
                client_id=action.client_id,
                success=False,
                error="Could not determine conversation"
            )
        
        # Create message
        message_id = f"msg_{uuid.uuid4().hex[:12]}"
        message = {
            "id": message_id,
            "conversation_id": conversation_id,
            "sender_id": user_id,
            "content": content,
            "type": payload.get("type", "text"),
            "read": False,
            "created_at": action.created_at,
            "offline_created": True,
            "client_id": action.client_id
        }
        
        await self.db.messages.insert_one(message)
        
        # Update conversation
        await self.db.conversations.update_one(
            {"id": conversation_id},
            {
                "$set": {
                    "last_message": content[:100],
                    "last_message_at": action.created_at,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return SyncResult(
            client_id=action.client_id,
            success=True,
            server_id=message_id
        )
    
    async def _sync_view_listing(self, user_id: str, action: OfflineAction) -> SyncResult:
        """Sync offline listing view"""
        listing_id = action.payload.get("listing_id")
        
        if not listing_id:
            return SyncResult(
                client_id=action.client_id,
                success=False,
                error="Missing listing_id"
            )
        
        # Record view
        await self.db.listing_views.insert_one({
            "listing_id": listing_id,
            "viewer_id": user_id,
            "viewed_at": action.created_at,
            "offline_tracked": True
        })
        
        # Increment view count
        await self.db.listings.update_one(
            {"id": listing_id},
            {"$inc": {"views": 1}}
        )
        
        return SyncResult(
            client_id=action.client_id,
            success=True,
            server_id=listing_id
        )
    
    async def _sync_track_search(self, user_id: str, action: OfflineAction) -> SyncResult:
        """Sync offline search tracking"""
        query = action.payload.get("query")
        category = action.payload.get("category")
        
        if not query:
            return SyncResult(
                client_id=action.client_id,
                success=False,
                error="Missing query"
            )
        
        await self.db.search_tracking.insert_one({
            "query": query.lower().strip(),
            "category_id": category,
            "user_id": user_id,
            "searched_at": action.created_at,
            "offline_tracked": True
        })
        
        return SyncResult(
            client_id=action.client_id,
            success=True
        )
    
    async def _sync_update_profile(self, user_id: str, action: OfflineAction) -> SyncResult:
        """Sync offline profile update"""
        updates = action.payload.get("updates", {})
        
        if not updates:
            return SyncResult(
                client_id=action.client_id,
                success=False,
                error="No updates provided"
            )
        
        # Get current profile
        user = await self.db.users.find_one({"user_id": user_id})
        if not user:
            return SyncResult(
                client_id=action.client_id,
                success=False,
                error="User not found"
            )
        
        # Check for conflict
        server_updated = user.get("updated_at", "")
        client_updated = action.created_at
        
        if server_updated > client_updated:
            return SyncResult(
                client_id=action.client_id,
                success=False,
                conflict=True,
                resolved_data={
                    "server_timestamp": server_updated,
                    "message": "Profile was updated on another device"
                }
            )
        
        # Apply updates (only allowed fields)
        allowed_fields = {"name", "phone", "bio", "avatar", "location", "settings"}
        safe_updates = {k: v for k, v in updates.items() if k in allowed_fields}
        safe_updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await self.db.users.update_one(
            {"user_id": user_id},
            {"$set": safe_updates}
        )
        
        return SyncResult(
            client_id=action.client_id,
            success=True,
            server_id=user_id
        )
    
    async def _get_pending_updates(self, user_id: str, last_sync: str) -> List[dict]:
        """Get server updates since last sync"""
        updates = []
        
        # Get updated listings
        listings = await self.db.listings.find({
            "user_id": user_id,
            "updated_at": {"$gt": last_sync}
        }, {"_id": 0}).to_list(50)
        
        for listing in listings:
            updates.append({
                "type": "listing_updated",
                "data": listing
            })
        
        # Get new messages
        conversations = await self.db.conversations.find({
            "participants": user_id
        }, {"id": 1}).to_list(100)
        
        conv_ids = [c["id"] for c in conversations]
        
        if conv_ids:
            messages = await self.db.messages.find({
                "conversation_id": {"$in": conv_ids},
                "created_at": {"$gt": last_sync},
                "sender_id": {"$ne": user_id}  # Only messages from others
            }, {"_id": 0}).to_list(50)
            
            for msg in messages:
                updates.append({
                    "type": "message_received",
                    "data": msg
                })
        
        # Get new favorites on user's listings
        user_listings = await self.db.listings.find({
            "user_id": user_id
        }, {"id": 1}).to_list(100)
        
        listing_ids = [l["id"] for l in user_listings]
        
        if listing_ids:
            new_favorites = await self.db.favorites.find({
                "listing_id": {"$in": listing_ids},
                "created_at": {"$gt": last_sync},
                "user_id": {"$ne": user_id}
            }, {"_id": 0}).to_list(20)
            
            for fav in new_favorites:
                updates.append({
                    "type": "listing_favorited",
                    "data": fav
                })
        
        return updates
    
    async def get_cache_refresh_data(
        self,
        user_id: str,
        last_sync: Optional[str] = None,
        include_listings: bool = True,
        include_categories: bool = True,
        include_favorites: bool = True,
        include_messages: bool = False,
        listing_limit: int = 100
    ) -> dict:
        """Get fresh data for offline cache"""
        
        data = {
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        if include_listings:
            # Get most recent active listings
            listings = await self.db.listings.find(
                {"status": "active"},
                {"_id": 0}
            ).sort("updated_at", -1).limit(listing_limit).to_list(listing_limit)
            data["listings"] = listings
        
        if include_categories:
            categories = await self.db.categories.find({}, {"_id": 0}).to_list(50)
            data["categories"] = categories
        
        if include_favorites and user_id:
            favorites = await self.db.favorites.find(
                {"user_id": user_id},
                {"_id": 0, "listing_id": 1}
            ).to_list(200)
            data["favorites"] = [f["listing_id"] for f in favorites]
        
        if include_messages and user_id:
            # Get recent conversations with last message
            conversations = await self.db.conversations.find(
                {"participants": user_id},
                {"_id": 0}
            ).sort("updated_at", -1).limit(50).to_list(50)
            
            # Enrich with last messages
            for conv in conversations:
                last_msg = await self.db.messages.find_one(
                    {"conversation_id": conv["id"]},
                    {"_id": 0}
                )
                if last_msg:
                    conv["last_message_data"] = last_msg
            
            data["conversations"] = conversations
        
        if user_id:
            # Get user profile
            profile = await self.db.users.find_one(
                {"user_id": user_id},
                {"_id": 0, "password_hash": 0}
            )
            if profile:
                data["profile"] = profile
        
        return data


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_offline_sync_router(db, get_current_user):
    """Create offline sync router"""
    
    router = APIRouter(prefix="/offline", tags=["Offline Sync"])
    sync_system = OfflineSyncSystem(db)
    
    @router.post("/sync")
    async def sync_offline_actions(
        request: Request,
        data: SyncRequest,
        user = Depends(get_current_user)
    ):
        """Sync offline actions to server"""
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        return await sync_system.sync_actions(
            user_id=user.user_id,
            device_id=data.device_id,
            actions=data.actions,
            last_sync=data.last_sync_timestamp
        )
    
    @router.post("/cache-refresh")
    async def refresh_cache(
        data: CacheRefreshRequest,
        user = Depends(get_current_user)
    ):
        """Get fresh data for offline cache"""
        user_id = user.user_id if user else None
        
        return await sync_system.get_cache_refresh_data(
            user_id=user_id,
            last_sync=data.last_sync,
            include_listings=data.include_listings,
            include_categories=data.include_categories,
            include_favorites=data.include_favorites,
            include_messages=data.include_messages,
            listing_limit=data.listing_limit
        )
    
    @router.get("/status")
    async def get_sync_status(
        user = Depends(get_current_user)
    ):
        """Get sync status for current user"""
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Get last sync info
        last_sync = await db.synced_actions.find_one(
            {"user_id": user.user_id},
            sort=[("synced_at", -1)]
        )
        
        # Count pending items
        pending_count = await db.offline_pending.count_documents({
            "user_id": user.user_id
        })
        
        return {
            "user_id": user.user_id,
            "last_sync": last_sync.get("synced_at") if last_sync else None,
            "pending_actions": pending_count,
            "server_time": datetime.now(timezone.utc).isoformat()
        }
    
    return router
