"""
Authority Building System
PR campaign management, backlink tracking, outreach management, and brand monitoring
Enhanced with automated opportunity suggestions and competitor analysis
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Header
from pydantic import BaseModel, Field
from typing import Optional, List, Callable, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import random
import re

# Pydantic Models
class OutreachCampaignCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    campaign_type: str = Field(..., description="pr, guest_post, link_building, partnership, media")
    target_domains: Optional[List[str]] = []
    target_region: Optional[str] = None
    status: str = Field(default="draft", description="draft, active, paused, completed")
    goal: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    notes: Optional[str] = ""

class OutreachContactCreate(BaseModel):
    campaign_id: str
    domain: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_role: Optional[str] = None
    domain_authority: Optional[int] = None
    status: str = Field(default="identified", description="identified, contacted, responded, negotiating, linked, declined")
    outreach_template_id: Optional[str] = None
    notes: Optional[str] = ""
    last_contact_date: Optional[datetime] = None
    follow_up_date: Optional[datetime] = None

class OutreachTemplateCreate(BaseModel):
    name: str
    template_type: str = Field(..., description="initial_outreach, follow_up, thank_you, guest_post_pitch, pr_pitch")
    subject: str
    body: str
    tags: Optional[List[str]] = []

class BacklinkCreate(BaseModel):
    source_url: str
    source_domain: str
    target_url: str
    anchor_text: Optional[str] = None
    domain_authority: Optional[int] = None
    status: str = Field(default="active", description="active, lost, pending")
    link_type: str = Field(default="dofollow", description="dofollow, nofollow, sponsored, ugc")
    discovered_date: Optional[datetime] = None
    campaign_id: Optional[str] = None
    notes: Optional[str] = ""


class CompetitorProfile(BaseModel):
    domain: str
    name: Optional[str] = None
    description: Optional[str] = None
    is_primary: bool = Field(default=False)


class BacklinkGapRequest(BaseModel):
    competitors: List[str]
    include_common: bool = Field(default=True, description="Include domains linking to multiple competitors")


# Simulated competitor database for realistic demo data
COMPETITOR_PROFILES = {
    "jiji.co.tz": {
        "name": "Jiji Tanzania",
        "category": "classifieds",
        "estimated_da": 45,
        "estimated_backlinks": 2500,
        "regions": ["TZ"]
    },
    "jiji.co.ke": {
        "name": "Jiji Kenya", 
        "category": "classifieds",
        "estimated_da": 52,
        "estimated_backlinks": 4200,
        "regions": ["KE"]
    },
    "olx.co.za": {
        "name": "OLX South Africa",
        "category": "classifieds",
        "estimated_da": 58,
        "estimated_backlinks": 8500,
        "regions": ["ZA"]
    },
    "pigiame.co.ke": {
        "name": "PigiaMe",
        "category": "classifieds",
        "estimated_da": 38,
        "estimated_backlinks": 1200,
        "regions": ["KE"]
    },
    "zoom.co.tz": {
        "name": "ZoomTanzania",
        "category": "classifieds",
        "estimated_da": 32,
        "estimated_backlinks": 800,
        "regions": ["TZ"]
    },
    "jumia.com": {
        "name": "Jumia",
        "category": "ecommerce",
        "estimated_da": 72,
        "estimated_backlinks": 45000,
        "regions": ["NG", "KE", "TZ", "UG", "ZA"]
    },
    "kilimall.co.ke": {
        "name": "Kilimall",
        "category": "ecommerce",
        "estimated_da": 48,
        "estimated_backlinks": 3200,
        "regions": ["KE", "UG"]
    }
}

# Simulated backlink sources database
BACKLINK_SOURCES_DB = [
    {"domain": "techcrunch.com", "da": 94, "category": "tech_news", "difficulty": "very_hard"},
    {"domain": "forbes.com", "da": 95, "category": "business", "difficulty": "very_hard"},
    {"domain": "bloomberg.com", "da": 93, "category": "finance", "difficulty": "very_hard"},
    {"domain": "bbc.com", "da": 96, "category": "news", "difficulty": "very_hard"},
    {"domain": "cnn.com", "da": 94, "category": "news", "difficulty": "very_hard"},
    {"domain": "medium.com", "da": 96, "category": "blog_platform", "difficulty": "easy"},
    {"domain": "linkedin.com", "da": 99, "category": "professional", "difficulty": "medium"},
    {"domain": "twitter.com", "da": 94, "category": "social", "difficulty": "easy"},
    {"domain": "reddit.com", "da": 97, "category": "forum", "difficulty": "medium"},
    {"domain": "quora.com", "da": 93, "category": "qa", "difficulty": "medium"},
    {"domain": "crunchbase.com", "da": 91, "category": "business_db", "difficulty": "medium"},
    {"domain": "g2.com", "da": 86, "category": "reviews", "difficulty": "medium"},
    {"domain": "trustpilot.com", "da": 93, "category": "reviews", "difficulty": "easy"},
    {"domain": "wikipedia.org", "da": 100, "category": "encyclopedia", "difficulty": "very_hard"},
    {"domain": "github.com", "da": 96, "category": "developer", "difficulty": "medium"},
    {"domain": "producthunt.com", "da": 89, "category": "startup", "difficulty": "medium"},
    {"domain": "techmoran.com", "da": 45, "category": "africa_tech", "difficulty": "easy"},
    {"domain": "disrupt-africa.com", "da": 52, "category": "africa_tech", "difficulty": "easy"},
    {"domain": "techcabal.com", "da": 55, "category": "africa_tech", "difficulty": "easy"},
    {"domain": "weetracker.com", "da": 48, "category": "africa_tech", "difficulty": "easy"},
    {"domain": "iafrikan.com", "da": 42, "category": "africa_tech", "difficulty": "easy"},
    {"domain": "venturesafrica.com", "da": 50, "category": "africa_business", "difficulty": "easy"},
    {"domain": "howwemadeitinafrica.com", "da": 55, "category": "africa_business", "difficulty": "medium"},
    {"domain": "nation.africa", "da": 72, "category": "africa_news", "difficulty": "medium"},
    {"domain": "thecitizen.co.tz", "da": 55, "category": "tz_news", "difficulty": "easy"},
    {"domain": "dailynews.co.tz", "da": 48, "category": "tz_news", "difficulty": "easy"},
    {"domain": "standardmedia.co.ke", "da": 68, "category": "ke_news", "difficulty": "medium"},
    {"domain": "businessdailyafrica.com", "da": 62, "category": "ke_business", "difficulty": "medium"},
    {"domain": "news24.com", "da": 78, "category": "za_news", "difficulty": "medium"},
]


def generate_competitor_backlink_profile(competitor_domain: str) -> Dict[str, Any]:
    """Generate a detailed simulated backlink profile for a competitor"""
    profile = COMPETITOR_PROFILES.get(competitor_domain, {
        "name": competitor_domain,
        "category": "unknown",
        "estimated_da": random.randint(25, 55),
        "estimated_backlinks": random.randint(500, 5000),
        "regions": ["GLOBAL"]
    })
    
    # Generate backlinks
    num_backlinks = min(profile.get("estimated_backlinks", 1000), 50)  # Limit for demo
    backlinks = []
    
    # Select sources based on competitor profile
    available_sources = BACKLINK_SOURCES_DB.copy()
    
    for _ in range(num_backlinks):
        if not available_sources:
            break
        source = random.choice(available_sources)
        
        # Higher DA competitors get more high-DA backlinks
        if profile.get("estimated_da", 40) > 50 or random.random() > 0.3:
            backlinks.append({
                "source_domain": source["domain"],
                "source_da": source["da"],
                "link_type": "dofollow" if random.random() > 0.4 else "nofollow",
                "anchor_text": generate_anchor_text(competitor_domain),
                "category": source["category"],
                "first_seen": (datetime.now(timezone.utc) - timedelta(days=random.randint(30, 730))).isoformat(),
                "last_seen": datetime.now(timezone.utc).isoformat(),
                "status": "active"
            })
    
    # Calculate metrics
    dofollow_count = len([b for b in backlinks if b["link_type"] == "dofollow"])
    avg_da = sum(b["source_da"] for b in backlinks) / max(len(backlinks), 1)
    
    return {
        "domain": competitor_domain,
        "profile": profile,
        "metrics": {
            "total_backlinks": len(backlinks),
            "dofollow_count": dofollow_count,
            "nofollow_count": len(backlinks) - dofollow_count,
            "average_da": round(avg_da, 1),
            "referring_domains": len(set(b["source_domain"] for b in backlinks)),
            "estimated_organic_traffic": random.randint(5000, 50000)
        },
        "backlinks": sorted(backlinks, key=lambda x: x["source_da"], reverse=True),
        "top_anchors": get_top_anchors(backlinks),
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


def generate_anchor_text(domain: str) -> str:
    """Generate realistic anchor text variations"""
    variations = [
        domain,
        domain.split('.')[0],
        f"click here",
        f"visit {domain.split('.')[0]}",
        f"{domain.split('.')[0]} marketplace",
        f"buy and sell on {domain.split('.')[0]}",
        f"best classifieds site",
        f"online marketplace",
        f"sell items online",
        f"free classifieds"
    ]
    return random.choice(variations)


def get_top_anchors(backlinks: List[Dict]) -> List[Dict]:
    """Get top anchor texts from backlinks"""
    anchor_counts = {}
    for bl in backlinks:
        anchor = bl.get("anchor_text", "")
        anchor_counts[anchor] = anchor_counts.get(anchor, 0) + 1
    
    return [
        {"anchor": k, "count": v, "percentage": round(v / len(backlinks) * 100, 1)}
        for k, v in sorted(anchor_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    ]

class KeywordAnalysisRequest(BaseModel):
    keywords: List[str]
    region: Optional[str] = None


# Campaign type colors
CAMPAIGN_TYPE_COLORS = {
    "pr": "#E91E63",
    "guest_post": "#9C27B0",
    "link_building": "#3F51B5",
    "partnership": "#00BCD4",
    "media": "#FF9800"
}

# Status colors
OUTREACH_STATUS_COLORS = {
    "identified": "#9E9E9E",
    "contacted": "#2196F3",
    "responded": "#FF9800",
    "negotiating": "#673AB7",
    "linked": "#4CAF50",
    "declined": "#F44336"
}

# Predefined opportunity databases for demo/suggestions
BACKLINK_OPPORTUNITIES_DB = {
    "TZ": [
        {"domain": "thecitizen.co.tz", "da": 55, "type": "news", "contact_type": "editorial", "topics": ["business", "technology", "local news"]},
        {"domain": "ippmedia.com", "da": 52, "type": "news", "contact_type": "editorial", "topics": ["current affairs", "business"]},
        {"domain": "dailynews.co.tz", "da": 48, "type": "news", "contact_type": "editorial", "topics": ["national news", "economy"]},
        {"domain": "michuzi.com", "da": 42, "type": "blog", "contact_type": "blogger", "topics": ["entertainment", "lifestyle"]},
        {"domain": "jamiiforums.com", "da": 58, "type": "forum", "contact_type": "community", "topics": ["discussions", "tech", "business"]},
    ],
    "KE": [
        {"domain": "nation.africa", "da": 72, "type": "news", "contact_type": "editorial", "topics": ["news", "business", "technology"]},
        {"domain": "standardmedia.co.ke", "da": 68, "type": "news", "contact_type": "editorial", "topics": ["news", "lifestyle"]},
        {"domain": "techweez.com", "da": 45, "type": "blog", "contact_type": "blogger", "topics": ["technology", "startups"]},
        {"domain": "capitalfm.co.ke", "da": 52, "type": "media", "contact_type": "editorial", "topics": ["entertainment", "business"]},
        {"domain": "kenyans.co.ke", "da": 48, "type": "blog", "contact_type": "blogger", "topics": ["news", "entertainment"]},
    ],
    "DE": [
        {"domain": "handelsblatt.com", "da": 82, "type": "news", "contact_type": "editorial", "topics": ["business", "finance", "economy"]},
        {"domain": "gruenderszene.de", "da": 65, "type": "blog", "contact_type": "editorial", "topics": ["startups", "technology"]},
        {"domain": "t3n.de", "da": 70, "type": "blog", "contact_type": "editorial", "topics": ["technology", "digital", "startups"]},
        {"domain": "deutsche-startups.de", "da": 55, "type": "blog", "contact_type": "blogger", "topics": ["startups", "vc", "founders"]},
        {"domain": "foerderland.de", "da": 48, "type": "blog", "contact_type": "blogger", "topics": ["entrepreneurs", "startups"]},
    ],
    "UG": [
        {"domain": "monitor.co.ug", "da": 62, "type": "news", "contact_type": "editorial", "topics": ["news", "business"]},
        {"domain": "newvision.co.ug", "da": 58, "type": "news", "contact_type": "editorial", "topics": ["national news", "economy"]},
        {"domain": "chimpreports.com", "da": 45, "type": "news", "contact_type": "editorial", "topics": ["news", "politics"]},
    ],
    "NG": [
        {"domain": "guardian.ng", "da": 68, "type": "news", "contact_type": "editorial", "topics": ["news", "business", "technology"]},
        {"domain": "techcabal.com", "da": 55, "type": "blog", "contact_type": "editorial", "topics": ["technology", "startups", "africa"]},
        {"domain": "nairametrics.com", "da": 52, "type": "blog", "contact_type": "editorial", "topics": ["finance", "business", "economy"]},
        {"domain": "bellanaija.com", "da": 65, "type": "blog", "contact_type": "blogger", "topics": ["lifestyle", "entertainment"]},
    ],
    "ZA": [
        {"domain": "news24.com", "da": 78, "type": "news", "contact_type": "editorial", "topics": ["news", "business", "tech"]},
        {"domain": "businesstech.co.za", "da": 62, "type": "blog", "contact_type": "editorial", "topics": ["technology", "business"]},
        {"domain": "mybroadband.co.za", "da": 65, "type": "blog", "contact_type": "editorial", "topics": ["technology", "telecom"]},
        {"domain": "ventureburn.com", "da": 48, "type": "blog", "contact_type": "blogger", "topics": ["startups", "entrepreneurs"]},
    ],
    "GLOBAL": [
        {"domain": "techcrunch.com", "da": 94, "type": "news", "contact_type": "editorial", "topics": ["technology", "startups", "vc"]},
        {"domain": "forbes.com", "da": 95, "type": "news", "contact_type": "editorial", "topics": ["business", "entrepreneurs"]},
        {"domain": "entrepreneur.com", "da": 90, "type": "blog", "contact_type": "editorial", "topics": ["entrepreneurs", "startups"]},
        {"domain": "medium.com", "da": 96, "type": "platform", "contact_type": "self-publish", "topics": ["any"]},
        {"domain": "linkedin.com", "da": 99, "type": "platform", "contact_type": "self-publish", "topics": ["professional", "business"]},
    ]
}

PR_OPPORTUNITY_CATEGORIES = [
    {
        "category": "Product Launch",
        "description": "Announce new features, app updates, or major releases",
        "outlets": ["tech blogs", "local news", "business media"],
        "timing": "Best on Tuesday-Thursday mornings"
    },
    {
        "category": "Milestone Announcement",
        "description": "User milestones, transactions processed, market expansion",
        "outlets": ["business media", "industry publications"],
        "timing": "Quarterly or when significant milestone reached"
    },
    {
        "category": "Partnership News",
        "description": "Strategic partnerships, integrations, collaborations",
        "outlets": ["business media", "partner's media channels"],
        "timing": "Upon signing or launch"
    },
    {
        "category": "Thought Leadership",
        "description": "Expert opinions on marketplace trends, safety tips, industry insights",
        "outlets": ["op-ed sections", "industry blogs", "LinkedIn"],
        "timing": "Ongoing, tie to current events"
    },
    {
        "category": "Community Impact",
        "description": "Success stories, economic impact, social initiatives",
        "outlets": ["local news", "lifestyle media", "social media"],
        "timing": "Human interest stories anytime"
    },
    {
        "category": "Awards & Recognition",
        "description": "Industry awards, certifications, rankings",
        "outlets": ["press release distribution", "social media"],
        "timing": "Upon receiving award"
    }
]


def extract_domain_from_url(url: str) -> str:
    """Extract domain from URL"""
    url = url.lower().strip()
    url = re.sub(r'^https?://', '', url)
    url = re.sub(r'^www\.', '', url)
    return url.split('/')[0]


def generate_competitor_backlinks(competitor_domain: str) -> List[Dict[str, Any]]:
    """Generate simulated competitor backlink data"""
    common_sources = [
        {"domain": "techcrunch.com", "da": 94, "type": "dofollow"},
        {"domain": "linkedin.com", "da": 99, "type": "nofollow"},
        {"domain": "medium.com", "da": 96, "type": "nofollow"},
        {"domain": "twitter.com", "da": 94, "type": "nofollow"},
        {"domain": "facebook.com", "da": 96, "type": "nofollow"},
        {"domain": "youtube.com", "da": 100, "type": "nofollow"},
        {"domain": "crunchbase.com", "da": 91, "type": "dofollow"},
        {"domain": "g2.com", "da": 86, "type": "dofollow"},
        {"domain": "capterra.com", "da": 88, "type": "dofollow"},
    ]
    
    # Add some random regional sources
    regions = list(BACKLINK_OPPORTUNITIES_DB.keys())
    for region in random.sample(regions, min(3, len(regions))):
        if region != "GLOBAL":
            opps = BACKLINK_OPPORTUNITIES_DB[region]
            for opp in random.sample(opps, min(2, len(opps))):
                common_sources.append({
                    "domain": opp["domain"],
                    "da": opp["da"],
                    "type": "dofollow" if random.random() > 0.3 else "nofollow"
                })
    
    results = []
    for src in random.sample(common_sources, min(12, len(common_sources))):
        results.append({
            "source_domain": src["domain"],
            "domain_authority": src["da"],
            "link_type": src["type"],
            "anchor_text": f"{competitor_domain} review" if random.random() > 0.5 else competitor_domain,
            "first_seen": (datetime.now(timezone.utc) - timedelta(days=random.randint(30, 365))).isoformat(),
            "status": "active"
        })
    
    return sorted(results, key=lambda x: x["domain_authority"], reverse=True)


def create_authority_building_router(db, get_current_user: Callable):
    """Create authority building router"""
    
    router = APIRouter(prefix="/growth/authority", tags=["Authority Building"])
    
    async def require_admin(authorization: str = Header(None)):
        if not authorization:
            raise HTTPException(status_code=401, detail="Admin access required")
        return True

    # ==================== CAMPAIGNS ====================
    
    @router.post("/campaigns")
    async def create_campaign(campaign: OutreachCampaignCreate, admin=Depends(require_admin)):
        """Create a new outreach campaign"""
        campaign_doc = {
            "id": str(uuid.uuid4()),
            "name": campaign.name,
            "description": campaign.description,
            "campaign_type": campaign.campaign_type,
            "target_domains": campaign.target_domains or [],
            "target_region": campaign.target_region,
            "status": campaign.status,
            "goal": campaign.goal,
            "start_date": campaign.start_date,
            "end_date": campaign.end_date,
            "budget": campaign.budget,
            "notes": campaign.notes,
            "stats": {
                "total_contacts": 0,
                "contacted": 0,
                "responded": 0,
                "linked": 0,
                "declined": 0
            },
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.outreach_campaigns.insert_one(campaign_doc)
        
        return {
            "success": True,
            "message": "Campaign created",
            "campaign": serialize_campaign(campaign_doc)
        }

    @router.get("/campaigns")
    async def get_campaigns(
        status: Optional[str] = Query(None),
        campaign_type: Optional[str] = Query(None),
        limit: int = Query(50, ge=1, le=200),
        admin=Depends(require_admin)
    ):
        """Get all outreach campaigns"""
        query = {}
        if status:
            query["status"] = status
        if campaign_type:
            query["campaign_type"] = campaign_type
        
        campaigns = await db.outreach_campaigns.find(query).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        return {
            "campaigns": [serialize_campaign(c) for c in campaigns],
            "total": len(campaigns)
        }

    @router.get("/campaigns/{campaign_id}")
    async def get_campaign(campaign_id: str, admin=Depends(require_admin)):
        """Get a single campaign with its contacts"""
        campaign = await db.outreach_campaigns.find_one({"id": campaign_id})
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        contacts = await db.outreach_contacts.find({"campaign_id": campaign_id}).to_list(length=500)
        
        return {
            "campaign": serialize_campaign(campaign),
            "contacts": [serialize_contact(c) for c in contacts]
        }

    @router.put("/campaigns/{campaign_id}")
    async def update_campaign(campaign_id: str, campaign: OutreachCampaignCreate, admin=Depends(require_admin)):
        """Update a campaign"""
        existing = await db.outreach_campaigns.find_one({"id": campaign_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        update_data = {k: v for k, v in campaign.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await db.outreach_campaigns.update_one({"id": campaign_id}, {"$set": update_data})
        updated = await db.outreach_campaigns.find_one({"id": campaign_id})
        
        return {"success": True, "campaign": serialize_campaign(updated)}

    @router.delete("/campaigns/{campaign_id}")
    async def delete_campaign(campaign_id: str, admin=Depends(require_admin)):
        """Delete a campaign and its contacts"""
        result = await db.outreach_campaigns.delete_one({"id": campaign_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Delete associated contacts
        await db.outreach_contacts.delete_many({"campaign_id": campaign_id})
        
        return {"success": True, "message": "Campaign and contacts deleted"}

    # ==================== CONTACTS ====================
    
    @router.post("/contacts")
    async def create_contact(contact: OutreachContactCreate, admin=Depends(require_admin)):
        """Add a contact to a campaign"""
        campaign = await db.outreach_campaigns.find_one({"id": contact.campaign_id})
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        contact_doc = {
            "id": str(uuid.uuid4()),
            "campaign_id": contact.campaign_id,
            "domain": contact.domain,
            "contact_name": contact.contact_name,
            "contact_email": contact.contact_email,
            "contact_role": contact.contact_role,
            "domain_authority": contact.domain_authority,
            "status": contact.status,
            "outreach_template_id": contact.outreach_template_id,
            "notes": contact.notes,
            "last_contact_date": contact.last_contact_date,
            "follow_up_date": contact.follow_up_date,
            "history": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.outreach_contacts.insert_one(contact_doc)
        
        # Update campaign stats
        await update_campaign_stats(db, contact.campaign_id)
        
        return {"success": True, "contact": serialize_contact(contact_doc)}

    @router.put("/contacts/{contact_id}")
    async def update_contact(contact_id: str, contact: OutreachContactCreate, admin=Depends(require_admin)):
        """Update a contact"""
        existing = await db.outreach_contacts.find_one({"id": contact_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        old_status = existing.get("status")
        update_data = {k: v for k, v in contact.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        # Add to history if status changed
        if contact.status and contact.status != old_status:
            history_entry = {
                "from_status": old_status,
                "to_status": contact.status,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "notes": contact.notes
            }
            await db.outreach_contacts.update_one(
                {"id": contact_id},
                {"$push": {"history": history_entry}}
            )
        
        await db.outreach_contacts.update_one({"id": contact_id}, {"$set": update_data})
        updated = await db.outreach_contacts.find_one({"id": contact_id})
        
        # Update campaign stats
        await update_campaign_stats(db, updated["campaign_id"])
        
        return {"success": True, "contact": serialize_contact(updated)}

    @router.delete("/contacts/{contact_id}")
    async def delete_contact(contact_id: str, admin=Depends(require_admin)):
        """Delete a contact"""
        contact = await db.outreach_contacts.find_one({"id": contact_id})
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        campaign_id = contact["campaign_id"]
        await db.outreach_contacts.delete_one({"id": contact_id})
        
        # Update campaign stats
        await update_campaign_stats(db, campaign_id)
        
        return {"success": True, "message": "Contact deleted"}

    # ==================== TEMPLATES ====================
    
    @router.post("/templates")
    async def create_template(template: OutreachTemplateCreate, admin=Depends(require_admin)):
        """Create an outreach email template"""
        template_doc = {
            "id": str(uuid.uuid4()),
            "name": template.name,
            "template_type": template.template_type,
            "subject": template.subject,
            "body": template.body,
            "tags": template.tags or [],
            "usage_count": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.outreach_templates.insert_one(template_doc)
        
        return {"success": True, "template": serialize_template(template_doc)}

    @router.get("/templates")
    async def get_templates(
        template_type: Optional[str] = Query(None),
        admin=Depends(require_admin)
    ):
        """Get all outreach templates"""
        query = {}
        if template_type:
            query["template_type"] = template_type
        
        templates = await db.outreach_templates.find(query).to_list(length=100)
        
        # If no templates exist, return default templates
        if not templates:
            templates = get_default_templates()
            for t in templates:
                await db.outreach_templates.insert_one(t)
        
        return {"templates": [serialize_template(t) for t in templates]}

    @router.delete("/templates/{template_id}")
    async def delete_template(template_id: str, admin=Depends(require_admin)):
        """Delete a template"""
        result = await db.outreach_templates.delete_one({"id": template_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Template not found")
        return {"success": True, "message": "Template deleted"}

    # ==================== BACKLINKS ====================
    
    @router.post("/backlinks")
    async def add_backlink(backlink: BacklinkCreate, admin=Depends(require_admin)):
        """Manually add a discovered backlink"""
        backlink_doc = {
            "id": str(uuid.uuid4()),
            "source_url": backlink.source_url,
            "source_domain": backlink.source_domain,
            "target_url": backlink.target_url,
            "anchor_text": backlink.anchor_text,
            "domain_authority": backlink.domain_authority,
            "status": backlink.status,
            "link_type": backlink.link_type,
            "discovered_date": backlink.discovered_date or datetime.now(timezone.utc),
            "campaign_id": backlink.campaign_id,
            "notes": backlink.notes,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.backlinks.insert_one(backlink_doc)
        
        return {"success": True, "backlink": serialize_backlink(backlink_doc)}

    @router.get("/backlinks")
    async def get_backlinks(
        status: Optional[str] = Query(None),
        link_type: Optional[str] = Query(None),
        limit: int = Query(100, ge=1, le=500),
        admin=Depends(require_admin)
    ):
        """Get all tracked backlinks"""
        query = {}
        if status:
            query["status"] = status
        if link_type:
            query["link_type"] = link_type
        
        backlinks = await db.backlinks.find(query).sort("discovered_date", -1).limit(limit).to_list(length=limit)
        
        return {
            "backlinks": [serialize_backlink(b) for b in backlinks],
            "total": len(backlinks),
            "stats": await get_backlink_stats(db)
        }

    @router.put("/backlinks/{backlink_id}")
    async def update_backlink(backlink_id: str, backlink: BacklinkCreate, admin=Depends(require_admin)):
        """Update backlink status"""
        existing = await db.backlinks.find_one({"id": backlink_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Backlink not found")
        
        update_data = {k: v for k, v in backlink.dict().items() if v is not None}
        await db.backlinks.update_one({"id": backlink_id}, {"$set": update_data})
        updated = await db.backlinks.find_one({"id": backlink_id})
        
        return {"success": True, "backlink": serialize_backlink(updated)}

    # ==================== DASHBOARD ====================
    
    @router.get("/dashboard")
    async def get_authority_dashboard(admin=Depends(require_admin)):
        """Get authority building dashboard overview"""
        
        # Campaign stats
        campaigns = await db.outreach_campaigns.find({}).to_list(length=1000)
        active_campaigns = [c for c in campaigns if c.get("status") == "active"]
        
        # Contact stats
        all_contacts = await db.outreach_contacts.find({}).to_list(length=5000)
        contacts_by_status = {}
        for c in all_contacts:
            status = c.get("status", "identified")
            contacts_by_status[status] = contacts_by_status.get(status, 0) + 1
        
        # Backlink stats
        backlink_stats = await get_backlink_stats(db)
        
        # Recent activity
        recent_contacts = await db.outreach_contacts.find({}).sort("updated_at", -1).limit(10).to_list(length=10)
        
        return {
            "campaigns": {
                "total": len(campaigns),
                "active": len(active_campaigns),
                "by_type": count_by_field(campaigns, "campaign_type")
            },
            "outreach": {
                "total_contacts": len(all_contacts),
                "by_status": contacts_by_status,
                "conversion_rate": round((contacts_by_status.get("linked", 0) / max(len(all_contacts), 1)) * 100, 1)
            },
            "backlinks": backlink_stats,
            "recent_activity": [serialize_contact(c) for c in recent_contacts]
        }

    # ==================== AUTOMATED SUGGESTIONS ====================
    
    @router.get("/suggestions/backlink-opportunities")
    async def get_backlink_opportunities(
        region: Optional[str] = Query(None, description="Region code: TZ, KE, DE, UG, NG, ZA"),
        include_global: bool = Query(True, description="Include global opportunities"),
        admin=Depends(require_admin)
    ):
        """Get automated backlink opportunity suggestions based on region"""
        opportunities = []
        
        # Get existing contacts to filter out
        existing_contacts = await db.outreach_contacts.find({}, {"domain": 1}).to_list(length=5000)
        existing_domains = {c.get("domain", "").lower() for c in existing_contacts}
        
        # Get opportunities for specified region or all regions
        regions_to_check = [region.upper()] if region else list(BACKLINK_OPPORTUNITIES_DB.keys())
        
        for reg in regions_to_check:
            if reg in BACKLINK_OPPORTUNITIES_DB:
                for opp in BACKLINK_OPPORTUNITIES_DB[reg]:
                    if opp["domain"].lower() not in existing_domains:
                        opportunities.append({
                            **opp,
                            "region": reg,
                            "relevance_score": random.randint(70, 95),
                            "suggested_approach": "guest_post" if opp["type"] == "blog" else "pr_pitch",
                            "estimated_effort": "medium" if opp["da"] < 60 else "high"
                        })
        
        # Include global opportunities if requested
        if include_global and "GLOBAL" not in regions_to_check:
            for opp in BACKLINK_OPPORTUNITIES_DB.get("GLOBAL", []):
                if opp["domain"].lower() not in existing_domains:
                    opportunities.append({
                        **opp,
                        "region": "GLOBAL",
                        "relevance_score": random.randint(60, 85),
                        "suggested_approach": "pr_pitch" if opp["type"] == "news" else "guest_post",
                        "estimated_effort": "high"
                    })
        
        # Sort by DA
        opportunities.sort(key=lambda x: x["da"], reverse=True)
        
        return {
            "opportunities": opportunities,
            "total": len(opportunities),
            "target_regions": ["TZ", "KE", "DE", "UG", "NG", "ZA"]
        }

    @router.get("/suggestions/pr-opportunities")
    async def get_pr_opportunities(admin=Depends(require_admin)):
        """Get PR opportunity categories and recommendations"""
        return {
            "categories": PR_OPPORTUNITY_CATEGORIES,
            "recommendations": [
                {
                    "type": "immediate",
                    "title": "Publish a How-To Guide",
                    "description": "Create educational content about safe online buying/selling to position Avida as an authority",
                    "estimated_impact": "high",
                    "effort": "medium"
                },
                {
                    "type": "quarterly",
                    "title": "Share Market Insights Report",
                    "description": "Publish a quarterly report on marketplace trends in East Africa - data journalists love this",
                    "estimated_impact": "high",
                    "effort": "high"
                },
                {
                    "type": "ongoing",
                    "title": "User Success Stories",
                    "description": "Feature success stories of sellers who grew their business using Avida",
                    "estimated_impact": "medium",
                    "effort": "low"
                },
                {
                    "type": "immediate",
                    "title": "Safety Initiative Announcement",
                    "description": "Launch a safety campaign or feature and announce to media - great for brand trust",
                    "estimated_impact": "high",
                    "effort": "medium"
                }
            ],
            "pitch_calendar": {
                "Q1": ["New Year features", "Tax season prep for sellers"],
                "Q2": ["Spring cleaning/selling season", "Student back-to-school (Southern Hemisphere)"],
                "Q3": ["Mid-year marketplace trends", "Holiday prep early bird"],
                "Q4": ["Holiday shopping guide", "Year-end statistics"]
            }
        }

    @router.post("/analyze/competitor-backlinks")
    async def analyze_competitor_backlinks(
        competitor_domain: str = Query(..., description="Competitor domain to analyze"),
        admin=Depends(require_admin)
    ):
        """Analyze competitor backlinks to find opportunities"""
        domain = extract_domain_from_url(competitor_domain)
        
        # Generate simulated competitor backlinks
        backlinks = generate_competitor_backlinks(domain)
        
        # Find opportunities (sources that link to competitor but not to us)
        our_backlinks = await db.backlinks.find({}, {"source_domain": 1}).to_list(length=5000)
        our_sources = {b.get("source_domain", "").lower() for b in our_backlinks}
        
        opportunities = []
        for bl in backlinks:
            if bl["source_domain"].lower() not in our_sources:
                opportunities.append({
                    **bl,
                    "opportunity_type": "competitor_has",
                    "action": f"Reach out to {bl['source_domain']} - they link to your competitor"
                })
        
        return {
            "competitor": domain,
            "total_backlinks": len(backlinks),
            "backlinks": backlinks[:15],
            "opportunities": opportunities[:10],
            "summary": {
                "dofollow_count": len([b for b in backlinks if b["link_type"] == "dofollow"]),
                "avg_domain_authority": round(sum(b["domain_authority"] for b in backlinks) / max(len(backlinks), 1), 1),
                "top_source_da": max(b["domain_authority"] for b in backlinks) if backlinks else 0
            },
            "is_simulated_data": True
        }

    @router.post("/analyze/domain-authority")
    async def check_domain_authority(
        domain: str = Query(..., description="Domain to check"),
        admin=Depends(require_admin)
    ):
        """Check domain authority for a given domain (simulated)"""
        domain = extract_domain_from_url(domain)
        
        # Look up in our database first
        known_domains = {}
        for region_opps in BACKLINK_OPPORTUNITIES_DB.values():
            for opp in region_opps:
                known_domains[opp["domain"].lower()] = opp["da"]
        
        if domain.lower() in known_domains:
            da = known_domains[domain.lower()]
        else:
            # Generate a plausible DA based on domain characteristics
            if any(tld in domain for tld in [".gov", ".edu"]):
                da = random.randint(60, 85)
            elif any(brand in domain for brand in ["google", "facebook", "amazon", "microsoft"]):
                da = random.randint(90, 100)
            elif len(domain) < 10:
                da = random.randint(40, 70)
            else:
                da = random.randint(20, 50)
        
        return {
            "domain": domain,
            "domain_authority": da,
            "page_authority": da - random.randint(5, 15),
            "spam_score": random.randint(1, 15),
            "backlinks_count": random.randint(100, 50000),
            "linking_domains": random.randint(50, 5000),
            "quality_rating": "high" if da > 60 else "medium" if da > 35 else "low",
            "recommendation": "Good target for outreach" if da > 40 else "Consider higher DA targets",
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "is_simulated_data": True
        }

    @router.post("/analyze/keywords")
    async def analyze_keywords_for_opportunities(
        request: KeywordAnalysisRequest,
        admin=Depends(require_admin)
    ):
        """Analyze keywords to find content and link building opportunities"""
        keywords = request.keywords[:10]  # Limit to 10 keywords
        region = request.region
        
        results = []
        for keyword in keywords:
            kw_lower = keyword.lower()
            
            # Generate opportunities based on keyword
            content_ideas = [
                f"Complete Guide to {keyword}",
                f"How to {keyword} Safely",
                f"{keyword}: Tips for Buyers and Sellers",
                f"Top 10 {keyword} Mistakes to Avoid"
            ]
            
            # Find relevant sites
            relevant_sites = []
            search_regions = [region.upper()] if region else ["TZ", "KE", "DE", "UG", "NG", "ZA"]
            for reg in search_regions:
                for opp in BACKLINK_OPPORTUNITIES_DB.get(reg, []):
                    if any(topic in kw_lower for topic in opp["topics"]) or "business" in opp["topics"]:
                        relevant_sites.append({
                            "domain": opp["domain"],
                            "da": opp["da"],
                            "region": reg,
                            "relevance": "high" if any(topic in kw_lower for topic in opp["topics"]) else "medium"
                        })
            
            results.append({
                "keyword": keyword,
                "search_volume_estimate": random.randint(500, 15000),
                "competition": random.choice(["low", "medium", "high"]),
                "content_ideas": content_ideas[:3],
                "relevant_sites": sorted(relevant_sites, key=lambda x: x["da"], reverse=True)[:5],
                "link_building_approach": "Create authoritative content targeting this keyword, then reach out to relevant sites"
            })
        
        return {
            "keywords_analyzed": len(keywords),
            "results": results,
            "overall_strategy": "Focus on creating high-quality, expert content for these keywords and build backlinks through guest posting and PR"
        }

    @router.get("/insights/health-score")
    async def get_authority_health_score(admin=Depends(require_admin)):
        """Get overall authority building health score and recommendations"""
        
        # Get current stats
        campaigns = await db.outreach_campaigns.find({}).to_list(length=100)
        contacts = await db.outreach_contacts.find({}).to_list(length=5000)
        backlinks = await db.backlinks.find({}).to_list(length=5000)
        
        active_campaigns = len([c for c in campaigns if c.get("status") == "active"])
        total_contacts = len(contacts)
        linked_contacts = len([c for c in contacts if c.get("status") == "linked"])
        active_backlinks = len([b for b in backlinks if b.get("status") == "active"])
        dofollow_backlinks = len([b for b in backlinks if b.get("link_type") == "dofollow"])
        
        # Calculate health score components
        campaign_score = min(active_campaigns * 25, 100)  # Max 4 active campaigns = 100
        outreach_score = min(total_contacts * 2, 100) if total_contacts > 0 else 0
        conversion_score = (linked_contacts / max(total_contacts, 1)) * 100
        backlink_score = min(active_backlinks * 5, 100)  # 20 backlinks = 100
        quality_score = (dofollow_backlinks / max(active_backlinks, 1)) * 100 if active_backlinks > 0 else 50
        
        overall_score = round((campaign_score * 0.2 + outreach_score * 0.2 + conversion_score * 0.25 + backlink_score * 0.2 + quality_score * 0.15), 0)
        
        recommendations = []
        if active_campaigns < 2:
            recommendations.append({
                "priority": "high",
                "action": "Start more outreach campaigns",
                "reason": "Active campaigns drive consistent backlink acquisition"
            })
        if total_contacts < 20:
            recommendations.append({
                "priority": "high",
                "action": "Add more outreach contacts",
                "reason": "More prospects = more opportunities for links"
            })
        if conversion_score < 15:
            recommendations.append({
                "priority": "medium",
                "action": "Improve outreach templates",
                "reason": f"Current conversion rate is {round(conversion_score, 1)}% - aim for 15%+"
            })
        if active_backlinks < 10:
            recommendations.append({
                "priority": "high",
                "action": "Focus on acquiring more backlinks",
                "reason": "You need more referring domains for SEO impact"
            })
        if quality_score < 60:
            recommendations.append({
                "priority": "medium",
                "action": "Target more dofollow links",
                "reason": "Only {:.0f}% of your backlinks are dofollow".format(quality_score)
            })
        
        return {
            "overall_score": overall_score,
            "grade": "A" if overall_score >= 80 else "B" if overall_score >= 60 else "C" if overall_score >= 40 else "D",
            "components": {
                "campaign_activity": round(campaign_score, 0),
                "outreach_volume": round(outreach_score, 0),
                "conversion_rate": round(conversion_score, 1),
                "backlink_quantity": round(backlink_score, 0),
                "backlink_quality": round(quality_score, 1)
            },
            "stats": {
                "active_campaigns": active_campaigns,
                "total_contacts": total_contacts,
                "linked_contacts": linked_contacts,
                "active_backlinks": active_backlinks,
                "dofollow_backlinks": dofollow_backlinks
            },
            "recommendations": recommendations[:5],
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

    return router


# Helper functions
def serialize_campaign(campaign: dict) -> dict:
    return {
        "id": campaign.get("id"),
        "name": campaign.get("name"),
        "description": campaign.get("description"),
        "campaign_type": campaign.get("campaign_type"),
        "target_domains": campaign.get("target_domains", []),
        "target_region": campaign.get("target_region"),
        "status": campaign.get("status"),
        "goal": campaign.get("goal"),
        "start_date": campaign.get("start_date").isoformat() if campaign.get("start_date") else None,
        "end_date": campaign.get("end_date").isoformat() if campaign.get("end_date") else None,
        "budget": campaign.get("budget"),
        "notes": campaign.get("notes"),
        "stats": campaign.get("stats", {}),
        "color": CAMPAIGN_TYPE_COLORS.get(campaign.get("campaign_type"), "#607D8B"),
        "created_at": campaign.get("created_at").isoformat() if campaign.get("created_at") else None
    }

def serialize_contact(contact: dict) -> dict:
    return {
        "id": contact.get("id"),
        "campaign_id": contact.get("campaign_id"),
        "domain": contact.get("domain"),
        "contact_name": contact.get("contact_name"),
        "contact_email": contact.get("contact_email"),
        "contact_role": contact.get("contact_role"),
        "domain_authority": contact.get("domain_authority"),
        "status": contact.get("status"),
        "status_color": OUTREACH_STATUS_COLORS.get(contact.get("status"), "#9E9E9E"),
        "notes": contact.get("notes"),
        "last_contact_date": contact.get("last_contact_date").isoformat() if contact.get("last_contact_date") else None,
        "follow_up_date": contact.get("follow_up_date").isoformat() if contact.get("follow_up_date") else None,
        "history": contact.get("history", []),
        "created_at": contact.get("created_at").isoformat() if contact.get("created_at") else None
    }

def serialize_template(template: dict) -> dict:
    return {
        "id": template.get("id"),
        "name": template.get("name"),
        "template_type": template.get("template_type"),
        "subject": template.get("subject"),
        "body": template.get("body"),
        "tags": template.get("tags", []),
        "usage_count": template.get("usage_count", 0)
    }

def serialize_backlink(backlink: dict) -> dict:
    return {
        "id": backlink.get("id"),
        "source_url": backlink.get("source_url"),
        "source_domain": backlink.get("source_domain"),
        "target_url": backlink.get("target_url"),
        "anchor_text": backlink.get("anchor_text"),
        "domain_authority": backlink.get("domain_authority"),
        "status": backlink.get("status"),
        "link_type": backlink.get("link_type"),
        "discovered_date": backlink.get("discovered_date").isoformat() if backlink.get("discovered_date") else None,
        "campaign_id": backlink.get("campaign_id")
    }

async def update_campaign_stats(db, campaign_id: str):
    """Update campaign statistics based on contacts"""
    contacts = await db.outreach_contacts.find({"campaign_id": campaign_id}).to_list(length=1000)
    
    stats = {
        "total_contacts": len(contacts),
        "contacted": sum(1 for c in contacts if c.get("status") in ["contacted", "responded", "negotiating", "linked", "declined"]),
        "responded": sum(1 for c in contacts if c.get("status") in ["responded", "negotiating", "linked"]),
        "linked": sum(1 for c in contacts if c.get("status") == "linked"),
        "declined": sum(1 for c in contacts if c.get("status") == "declined")
    }
    
    await db.outreach_campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"stats": stats, "updated_at": datetime.now(timezone.utc)}}
    )

async def get_backlink_stats(db) -> dict:
    """Get backlink statistics"""
    backlinks = await db.backlinks.find({}).to_list(length=5000)
    
    total = len(backlinks)
    active = sum(1 for b in backlinks if b.get("status") == "active")
    lost = sum(1 for b in backlinks if b.get("status") == "lost")
    dofollow = sum(1 for b in backlinks if b.get("link_type") == "dofollow")
    avg_da = round(sum(b.get("domain_authority", 0) for b in backlinks) / max(total, 1), 1)
    
    return {
        "total": total,
        "active": active,
        "lost": lost,
        "dofollow": dofollow,
        "nofollow": total - dofollow,
        "average_domain_authority": avg_da
    }

def count_by_field(items: list, field: str) -> dict:
    """Count items by a field value"""
    result = {}
    for item in items:
        value = item.get(field, "unknown")
        result[value] = result.get(value, 0) + 1
    return result

def get_default_templates() -> list:
    """Return default outreach templates"""
    return [
        {
            "id": str(uuid.uuid4()),
            "name": "Guest Post Pitch",
            "template_type": "guest_post_pitch",
            "subject": "Guest Post Opportunity - [Topic]",
            "body": """Hi {contact_name},

I'm reaching out from Avida, a leading classifieds marketplace in East Africa.

I noticed your website {domain} covers topics related to [topic area], and I'd love to contribute a guest post that would provide value to your readers.

Some topic ideas I had in mind:
- [Topic 1]
- [Topic 2]
- [Topic 3]

I can provide a well-researched, original article of 1,500-2,000 words with relevant statistics and actionable insights.

Would you be interested in reviewing a draft?

Best regards,
{sender_name}
Avida Marketing Team""",
            "tags": ["guest_post", "content"],
            "usage_count": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "PR Pitch - New Feature",
            "template_type": "pr_pitch",
            "subject": "Story Idea: [Headline]",
            "body": """Dear {contact_name},

I'm writing from Avida, the fastest-growing classifieds platform in Africa.

We've just launched [feature/initiative] that is helping [target audience] in [region] to [benefit].

Key highlights:
- [Stat 1]
- [Stat 2]
- [Quote from user/leader]

I'd be happy to arrange an interview with our CEO or provide additional data for a story.

Is this something that might interest your readers?

Best,
{sender_name}
PR Team, Avida""",
            "tags": ["pr", "media"],
            "usage_count": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Link Building Outreach",
            "template_type": "initial_outreach",
            "subject": "Resource Suggestion for Your Article",
            "body": """Hi {contact_name},

I came across your article on "{article_title}" and found it really informative!

I noticed you mentioned [topic], and thought you might find our comprehensive guide on [related topic] useful for your readers: [URL]

It covers:
- [Point 1]
- [Point 2]
- [Point 3]

If you think it would add value to your article, I'd be honored if you considered adding it as a resource.

Either way, keep up the great work!

Best,
{sender_name}""",
            "tags": ["link_building", "outreach"],
            "usage_count": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Follow-up Email",
            "template_type": "follow_up",
            "subject": "Re: [Previous Subject]",
            "body": """Hi {contact_name},

I wanted to follow up on my previous email about [topic].

I understand you're busy, so I'll keep this brief. I think [proposal] could really benefit your audience because [reason].

Would you have 5 minutes for a quick call this week to discuss?

Best regards,
{sender_name}""",
            "tags": ["follow_up"],
            "usage_count": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Thank You - Link Placed",
            "template_type": "thank_you",
            "subject": "Thank You!",
            "body": """Hi {contact_name},

I just wanted to drop a quick note to thank you for including our link in your article.

We really appreciate the support and will be sure to share the article with our audience as well.

If there's ever anything we can help you with, please don't hesitate to reach out.

Best,
{sender_name}
Avida Team""",
            "tags": ["thank_you", "relationship"],
            "usage_count": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    ]
