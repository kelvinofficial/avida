"""
SEO A/B Testing System for Meta Descriptions
Allows testing different meta descriptions and titles to optimize CTR
"""
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
import uuid
import math

class SEOVariant(BaseModel):
    name: str
    meta_title: str
    meta_description: str
    traffic_percent: float = 50.0
    is_control: bool = False

class SEOExperimentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    listing_id: Optional[str] = None  # If testing for a specific listing
    category_id: Optional[str] = None  # If testing for a category page
    page_type: str = "listing"  # listing, category, search, home
    variants: List[SEOVariant]
    min_impressions: int = 100  # Minimum impressions before declaring winner
    confidence_level: float = 0.95  # Statistical confidence required

class SEOExperimentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    variants: Optional[List[SEOVariant]] = None
    min_impressions: Optional[int] = None
    confidence_level: Optional[float] = None

class TrackEventRequest(BaseModel):
    experiment_id: str
    variant_id: str
    event_type: str  # impression, click
    page_url: Optional[str] = None
    referrer: Optional[str] = None

def create_seo_ab_testing_router(db, get_current_user, require_admin):
    router = APIRouter()
    
    def calculate_statistical_significance(control_impressions: int, control_clicks: int,
                                           variant_impressions: int, variant_clicks: int) -> dict:
        """
        Calculate statistical significance using z-test for proportions
        """
        if control_impressions < 1 or variant_impressions < 1:
            return {"significant": False, "z_score": 0, "p_value": 1, "confidence": 0}
        
        # Calculate conversion rates
        p1 = control_clicks / control_impressions if control_impressions > 0 else 0
        p2 = variant_clicks / variant_impressions if variant_impressions > 0 else 0
        
        # Pooled proportion
        p_pooled = (control_clicks + variant_clicks) / (control_impressions + variant_impressions)
        
        # Standard error
        if p_pooled == 0 or p_pooled == 1:
            return {"significant": False, "z_score": 0, "p_value": 1, "confidence": 0}
        
        se = math.sqrt(p_pooled * (1 - p_pooled) * (1/control_impressions + 1/variant_impressions))
        
        if se == 0:
            return {"significant": False, "z_score": 0, "p_value": 1, "confidence": 0}
        
        # Z-score
        z = (p2 - p1) / se
        
        # P-value (two-tailed)
        # Approximate using normal distribution
        def norm_cdf(x):
            return 0.5 * (1 + math.erf(x / math.sqrt(2)))
        
        p_value = 2 * (1 - norm_cdf(abs(z)))
        confidence = (1 - p_value) * 100
        
        return {
            "significant": p_value < 0.05,
            "z_score": round(z, 4),
            "p_value": round(p_value, 4),
            "confidence": round(confidence, 2),
            "control_ctr": round(p1 * 100, 2),
            "variant_ctr": round(p2 * 100, 2),
            "improvement": round((p2 - p1) / p1 * 100, 2) if p1 > 0 else 0
        }
    
    # ==================== ADMIN ENDPOINTS ====================
    
    @router.post("/seo-ab/experiments", tags=["SEO A/B Testing"])
    async def create_experiment(data: SEOExperimentCreate, request: Request):
        """Create a new SEO A/B test experiment"""
        await require_admin(request)
        
        # Validate traffic percentages sum to 100
        total_traffic = sum(v.traffic_percent for v in data.variants)
        if abs(total_traffic - 100) > 0.01:
            raise HTTPException(status_code=400, detail=f"Traffic must total 100% (currently {total_traffic}%)")
        
        # Ensure at least 2 variants
        if len(data.variants) < 2:
            raise HTTPException(status_code=400, detail="At least 2 variants required")
        
        # Ensure exactly one control
        controls = [v for v in data.variants if v.is_control]
        if len(controls) != 1:
            raise HTTPException(status_code=400, detail="Exactly one control variant required")
        
        experiment_id = str(uuid.uuid4())
        variants = []
        
        for v in data.variants:
            variant_id = str(uuid.uuid4())
            variants.append({
                "id": variant_id,
                "name": v.name,
                "meta_title": v.meta_title,
                "meta_description": v.meta_description,
                "traffic_percent": v.traffic_percent,
                "is_control": v.is_control,
                "impressions": 0,
                "clicks": 0,
                "ctr": 0.0
            })
        
        experiment = {
            "id": experiment_id,
            "name": data.name,
            "description": data.description,
            "listing_id": data.listing_id,
            "category_id": data.category_id,
            "page_type": data.page_type,
            "variants": variants,
            "min_impressions": data.min_impressions,
            "confidence_level": data.confidence_level,
            "status": "draft",  # draft, running, paused, completed
            "winner_variant_id": None,
            "results": None,
            "created_at": datetime.now(timezone.utc),
            "started_at": None,
            "completed_at": None
        }
        
        await db.seo_ab_experiments.insert_one(experiment)
        
        return {
            "id": experiment_id,
            "message": "Experiment created successfully",
            "variants": len(variants)
        }
    
    @router.get("/seo-ab/experiments", tags=["SEO A/B Testing"])
    async def list_experiments(
        request: Request,
        status: str = None,
        page_type: str = None,
        skip: int = 0,
        limit: int = 20
    ):
        """List all SEO A/B experiments"""
        await require_admin(request)
        
        query = {}
        if status:
            query["status"] = status
        if page_type:
            query["page_type"] = page_type
        
        cursor = db.seo_ab_experiments.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        experiments = await cursor.to_list(length=limit)
        total = await db.seo_ab_experiments.count_documents(query)
        
        return {
            "experiments": experiments,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    
    @router.get("/seo-ab/experiments/{experiment_id}", tags=["SEO A/B Testing"])
    async def get_experiment(experiment_id: str, request: Request):
        """Get detailed experiment results"""
        await require_admin(request)
        
        experiment = await db.seo_ab_experiments.find_one({"id": experiment_id}, {"_id": 0})
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")
        
        # Calculate real-time statistics
        if experiment["status"] == "running":
            control = next((v for v in experiment["variants"] if v["is_control"]), None)
            
            for variant in experiment["variants"]:
                variant["ctr"] = round((variant["clicks"] / variant["impressions"] * 100) if variant["impressions"] > 0 else 0, 2)
                
                if control and not variant["is_control"]:
                    stats = calculate_statistical_significance(
                        control["impressions"], control["clicks"],
                        variant["impressions"], variant["clicks"]
                    )
                    variant["statistics"] = stats
        
        return experiment
    
    @router.post("/seo-ab/experiments/{experiment_id}/start", tags=["SEO A/B Testing"])
    async def start_experiment(experiment_id: str, request: Request):
        """Start an experiment"""
        await require_admin(request)
        
        experiment = await db.seo_ab_experiments.find_one({"id": experiment_id})
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")
        
        if experiment["status"] not in ["draft", "paused"]:
            raise HTTPException(status_code=400, detail=f"Cannot start experiment in {experiment['status']} status")
        
        await db.seo_ab_experiments.update_one(
            {"id": experiment_id},
            {"$set": {
                "status": "running",
                "started_at": datetime.now(timezone.utc) if not experiment.get("started_at") else experiment["started_at"]
            }}
        )
        
        return {"message": "Experiment started"}
    
    @router.post("/seo-ab/experiments/{experiment_id}/pause", tags=["SEO A/B Testing"])
    async def pause_experiment(experiment_id: str, request: Request):
        """Pause a running experiment"""
        await require_admin(request)
        
        experiment = await db.seo_ab_experiments.find_one({"id": experiment_id})
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")
        
        if experiment["status"] != "running":
            raise HTTPException(status_code=400, detail="Only running experiments can be paused")
        
        await db.seo_ab_experiments.update_one(
            {"id": experiment_id},
            {"$set": {"status": "paused"}}
        )
        
        return {"message": "Experiment paused"}
    
    @router.post("/seo-ab/experiments/{experiment_id}/stop", tags=["SEO A/B Testing"])
    async def stop_experiment(experiment_id: str, request: Request, winner_variant_id: str = None):
        """Stop an experiment and optionally declare a winner"""
        await require_admin(request)
        
        experiment = await db.seo_ab_experiments.find_one({"id": experiment_id})
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")
        
        if experiment["status"] not in ["running", "paused"]:
            raise HTTPException(status_code=400, detail=f"Cannot stop experiment in {experiment['status']} status")
        
        # Calculate final results
        control = next((v for v in experiment["variants"] if v["is_control"]), None)
        results = []
        
        for variant in experiment["variants"]:
            ctr = (variant["clicks"] / variant["impressions"] * 100) if variant["impressions"] > 0 else 0
            result = {
                "variant_id": variant["id"],
                "variant_name": variant["name"],
                "impressions": variant["impressions"],
                "clicks": variant["clicks"],
                "ctr": round(ctr, 2),
                "is_control": variant["is_control"]
            }
            
            if control and not variant["is_control"]:
                stats = calculate_statistical_significance(
                    control["impressions"], control["clicks"],
                    variant["impressions"], variant["clicks"]
                )
                result["statistics"] = stats
            
            results.append(result)
        
        # Auto-select winner if not provided
        if not winner_variant_id:
            # Find variant with highest CTR that is statistically significant
            best_variant = None
            best_ctr = -1
            
            for r in results:
                if r.get("statistics", {}).get("significant", False) and r["ctr"] > best_ctr:
                    best_ctr = r["ctr"]
                    best_variant = r["variant_id"]
            
            winner_variant_id = best_variant
        
        await db.seo_ab_experiments.update_one(
            {"id": experiment_id},
            {"$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc),
                "winner_variant_id": winner_variant_id,
                "results": results
            }}
        )
        
        return {
            "message": "Experiment completed",
            "winner_variant_id": winner_variant_id,
            "results": results
        }
    
    @router.delete("/seo-ab/experiments/{experiment_id}", tags=["SEO A/B Testing"])
    async def delete_experiment(experiment_id: str, request: Request):
        """Delete an experiment"""
        await require_admin(request)
        
        experiment = await db.seo_ab_experiments.find_one({"id": experiment_id})
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")
        
        if experiment["status"] == "running":
            raise HTTPException(status_code=400, detail="Cannot delete running experiment. Stop it first.")
        
        await db.seo_ab_experiments.delete_one({"id": experiment_id})
        await db.seo_ab_events.delete_many({"experiment_id": experiment_id})
        
        return {"message": "Experiment deleted"}
    
    @router.get("/seo-ab/overview", tags=["SEO A/B Testing"])
    async def get_overview(request: Request):
        """Get overview statistics for all experiments"""
        await require_admin(request)
        
        pipeline = [
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        
        status_counts = await db.seo_ab_experiments.aggregate(pipeline).to_list(length=10)
        status_dict = {s["_id"]: s["count"] for s in status_counts}
        
        # Get total events
        total_impressions = await db.seo_ab_events.count_documents({"event_type": "impression"})
        total_clicks = await db.seo_ab_events.count_documents({"event_type": "click"})
        
        # Get experiments with winners
        with_winners = await db.seo_ab_experiments.count_documents({"winner_variant_id": {"$ne": None}})
        
        return {
            "total_experiments": sum(status_dict.values()),
            "draft": status_dict.get("draft", 0),
            "running": status_dict.get("running", 0),
            "paused": status_dict.get("paused", 0),
            "completed": status_dict.get("completed", 0),
            "with_winners": with_winners,
            "total_impressions": total_impressions,
            "total_clicks": total_clicks,
            "overall_ctr": round((total_clicks / total_impressions * 100) if total_impressions > 0 else 0, 2)
        }
    
    # ==================== PUBLIC ENDPOINTS (For tracking) ====================
    
    @router.post("/seo-ab/track", tags=["SEO A/B Testing"])
    async def track_event(data: TrackEventRequest, request: Request):
        """Track an impression or click event for an experiment"""
        experiment = await db.seo_ab_experiments.find_one({
            "id": data.experiment_id,
            "status": "running"
        })
        
        if not experiment:
            # Silently fail for non-existent or non-running experiments
            return {"tracked": False}
        
        # Verify variant exists
        variant = next((v for v in experiment["variants"] if v["id"] == data.variant_id), None)
        if not variant:
            return {"tracked": False}
        
        # Track the event
        event = {
            "id": str(uuid.uuid4()),
            "experiment_id": data.experiment_id,
            "variant_id": data.variant_id,
            "event_type": data.event_type,
            "page_url": data.page_url,
            "referrer": data.referrer,
            "user_agent": request.headers.get("user-agent", ""),
            "ip_address": request.client.host if request.client else None,
            "timestamp": datetime.now(timezone.utc)
        }
        
        await db.seo_ab_events.insert_one(event)
        
        # Update variant counts
        field = "impressions" if data.event_type == "impression" else "clicks"
        await db.seo_ab_experiments.update_one(
            {"id": data.experiment_id, "variants.id": data.variant_id},
            {"$inc": {f"variants.$.{field}": 1}}
        )
        
        return {"tracked": True}
    
    @router.get("/seo-ab/get-variant", tags=["SEO A/B Testing"])
    async def get_variant_for_page(
        page_type: str = "listing",
        listing_id: str = None,
        category_id: str = None
    ):
        """
        Get the assigned variant for a page (used by frontend to render the correct meta tags).
        Uses consistent hashing based on a cookie or random assignment.
        """
        # Find running experiments for this page
        query = {
            "status": "running",
            "page_type": page_type
        }
        
        if listing_id:
            query["$or"] = [
                {"listing_id": listing_id},
                {"listing_id": None}  # Global listing experiments
            ]
        if category_id:
            query["$or"] = [
                {"category_id": category_id},
                {"category_id": None}  # Global category experiments
            ]
        
        experiment = await db.seo_ab_experiments.find_one(query, {"_id": 0})
        
        if not experiment:
            return {"experiment": None, "variant": None}
        
        # Assign variant based on traffic weights
        import random
        rand = random.random() * 100
        cumulative = 0
        assigned_variant = None
        
        for variant in experiment["variants"]:
            cumulative += variant["traffic_percent"]
            if rand <= cumulative:
                assigned_variant = {
                    "id": variant["id"],
                    "name": variant["name"],
                    "meta_title": variant["meta_title"],
                    "meta_description": variant["meta_description"],
                    "is_control": variant["is_control"]
                }
                break
        
        # Fallback to first variant
        if not assigned_variant and experiment["variants"]:
            variant = experiment["variants"][0]
            assigned_variant = {
                "id": variant["id"],
                "name": variant["name"],
                "meta_title": variant["meta_title"],
                "meta_description": variant["meta_description"],
                "is_control": variant["is_control"]
            }
        
        return {
            "experiment_id": experiment["id"],
            "experiment_name": experiment["name"],
            "variant": assigned_variant
        }
    
    @router.post("/seo-ab/check-winners", tags=["SEO A/B Testing"])
    async def check_for_winners(request: Request):
        """Check all running experiments for statistical significance"""
        await require_admin(request)
        
        experiments = await db.seo_ab_experiments.find({"status": "running"}, {"_id": 0}).to_list(length=100)
        
        results = []
        for exp in experiments:
            control = next((v for v in exp["variants"] if v["is_control"]), None)
            if not control:
                continue
            
            # Check if minimum impressions reached
            total_impressions = sum(v["impressions"] for v in exp["variants"])
            if total_impressions < exp["min_impressions"]:
                results.append({
                    "experiment_id": exp["id"],
                    "name": exp["name"],
                    "status": "insufficient_data",
                    "impressions": total_impressions,
                    "required": exp["min_impressions"]
                })
                continue
            
            # Check each variant for significance
            winner = None
            for variant in exp["variants"]:
                if variant["is_control"]:
                    continue
                
                stats = calculate_statistical_significance(
                    control["impressions"], control["clicks"],
                    variant["impressions"], variant["clicks"]
                )
                
                if stats["significant"] and stats["improvement"] > 0:
                    if not winner or stats["improvement"] > winner.get("improvement", 0):
                        winner = {
                            "variant_id": variant["id"],
                            "variant_name": variant["name"],
                            **stats
                        }
            
            if winner:
                results.append({
                    "experiment_id": exp["id"],
                    "name": exp["name"],
                    "status": "winner_found",
                    "winner": winner
                })
            else:
                results.append({
                    "experiment_id": exp["id"],
                    "name": exp["name"],
                    "status": "no_winner_yet",
                    "impressions": total_impressions
                })
        
        return {
            "checked": len(experiments),
            "results": results
        }
    
    return router
