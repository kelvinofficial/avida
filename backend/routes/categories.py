"""
Categories Routes Module
Handles category listing, subcategories, and validation
"""

from typing import List, Optional, Dict
from fastapi import APIRouter, HTTPException
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# DEFAULT CATEGORIES DATA
# =============================================================================

DEFAULT_CATEGORIES = [
    {
        "id": "auto_vehicles",
        "name": "Auto & Vehicles",
        "icon": "car-outline",
        "subcategories": [
            {"id": "vehicle_parts", "name": "Vehicle Parts & Accessories"},
            {"id": "cars", "name": "Cars"},
            {"id": "motorcycles_scooters", "name": "Motorcycles & Scooters"},
            {"id": "buses_microbuses", "name": "Buses & Microbuses"},
            {"id": "trucks_trailers", "name": "Trucks & Trailers"},
            {"id": "heavy_machinery", "name": "Construction & Heavy Machinery"},
            {"id": "watercraft_boats", "name": "Watercraft & Boats"},
            {"id": "car_services", "name": "Car Services"},
        ]
    },
    {
        "id": "properties",
        "name": "Properties",
        "icon": "business-outline",
        "subcategories": [
            {"id": "new_builds", "name": "New Builds"},
            {"id": "houses_apartments_rent", "name": "Houses & Apartments For Rent"},
            {"id": "houses_apartments_sale", "name": "Houses & Apartments For Sale"},
            {"id": "short_let", "name": "Short Let"},
            {"id": "land_plots_rent", "name": "Land & Plots for Rent"},
            {"id": "land_plots_sale", "name": "Land & Plots For Sale"},
            {"id": "event_centres", "name": "Event Centres, Venues & Workstations"},
            {"id": "commercial_rent", "name": "Commercial Property for Rent"},
            {"id": "commercial_sale", "name": "Commercial Property for Sale"},
        ]
    },
    {
        "id": "electronics",
        "name": "Electronics",
        "icon": "laptop-outline",
        "subcategories": [
            {"id": "laptops_computers", "name": "Laptops & Computers"},
            {"id": "tv_dvd", "name": "TV & DVD Equipment"},
            {"id": "video_game_consoles", "name": "Video Game Consoles"},
            {"id": "audio_music", "name": "Audio & Music Equipment"},
            {"id": "headphones", "name": "Headphones"},
            {"id": "photo_video_cameras", "name": "Photo & Video Cameras"},
            {"id": "security_surveillance", "name": "Security & Surveillance"},
            {"id": "networking", "name": "Networking Products"},
            {"id": "printers_scanners", "name": "Printers & Scanners"},
            {"id": "computer_monitors", "name": "Computer Monitors"},
            {"id": "computer_hardware", "name": "Computer Hardware"},
            {"id": "computer_accessories", "name": "Computer Accessories"},
            {"id": "electronics_accessories", "name": "Accessories & Supplies for Electronics"},
            {"id": "video_games", "name": "Video Games"},
            {"id": "software", "name": "Software"},
        ]
    },
    {
        "id": "phones_tablets",
        "name": "Phones & Tablets",
        "icon": "phone-portrait-outline",
        "subcategories": [
            {"id": "mobile_phones", "name": "Mobile Phones"},
            {"id": "phone_accessories", "name": "Accessories for Phones & Tablets"},
            {"id": "smart_watches", "name": "Smart Watches"},
            {"id": "tablets", "name": "Tablets"},
            {"id": "phones_headphones", "name": "Headphones"},
        ]
    },
    {
        "id": "home_furniture",
        "name": "Home, Furniture & Appliances",
        "icon": "home-outline",
        "subcategories": [
            {"id": "furniture", "name": "Furniture"},
            {"id": "home_accessories", "name": "Home Accessories"},
            {"id": "kitchen_appliances", "name": "Kitchen Appliances"},
            {"id": "kitchen_dining", "name": "Kitchen & Dining"},
            {"id": "home_appliances", "name": "Large Home Appliances"},
            {"id": "garden", "name": "Garden"},
        ]
    },
    {
        "id": "fashion_beauty",
        "name": "Fashion & Beauty",
        "icon": "shirt-outline",
        "subcategories": [
            {"id": "bags", "name": "Bags"},
            {"id": "clothing", "name": "Clothing"},
            {"id": "clothing_accessories", "name": "Clothing Accessories"},
            {"id": "jewelry", "name": "Jewelry"},
            {"id": "shoes", "name": "Shoes"},
            {"id": "watches", "name": "Watches"},
            {"id": "health_beauty", "name": "Health & Beauty"},
            {"id": "wedding_wear", "name": "Wedding Wear & Accessories"},
        ]
    },
    {
        "id": "jobs_services",
        "name": "Jobs & Services",
        "icon": "briefcase-outline",
        "subcategories": [
            {"id": "accounting_finance", "name": "Accounting & Finance"},
            {"id": "building_trades", "name": "Building & Trades"},
            {"id": "business_development", "name": "Business Development"},
            {"id": "catering", "name": "Catering"},
            {"id": "childcare", "name": "Childcare & Nanny"},
            {"id": "cleaning", "name": "Cleaning"},
            {"id": "customer_service", "name": "Customer Service"},
            {"id": "driving", "name": "Driving"},
            {"id": "health_beauty_services", "name": "Health & Beauty"},
            {"id": "human_resources", "name": "Human Resources"},
            {"id": "it_computing", "name": "IT & Computing"},
            {"id": "legal", "name": "Legal"},
            {"id": "marketing_communications", "name": "Marketing & Communications"},
            {"id": "office_admin", "name": "Office & Admin"},
            {"id": "recruitment", "name": "Recruitment"},
            {"id": "sales", "name": "Sales"},
            {"id": "teaching", "name": "Teaching"},
            {"id": "travel_tourism", "name": "Travel & Tourism"},
        ]
    },
    {
        "id": "kids_baby",
        "name": "Kids & Baby",
        "icon": "happy-outline",
        "subcategories": [
            {"id": "baby_products", "name": "Baby & Child Care Products"},
            {"id": "kids_clothing", "name": "Children's Clothing"},
            {"id": "kids_shoes", "name": "Children's Shoes"},
            {"id": "baby_gear", "name": "Baby & Toddler Gear"},
            {"id": "kids_furniture", "name": "Children's Furniture"},
            {"id": "toys_games", "name": "Toys & Games"},
            {"id": "prams_strollers", "name": "Prams & Strollers"},
        ]
    },
    {
        "id": "sports_hobbies",
        "name": "Sports & Hobbies",
        "icon": "football-outline",
        "subcategories": [
            {"id": "arts_crafts", "name": "Arts & Crafts"},
            {"id": "bicycles", "name": "Bicycles"},
            {"id": "books_movies_music", "name": "Books, Movies & Music"},
            {"id": "camping_gear", "name": "Camping & Outdoor Gear"},
            {"id": "collectibles", "name": "Collectibles"},
            {"id": "gym_equipment", "name": "Gym & Fitness Equipment"},
            {"id": "musical_instruments", "name": "Musical Instruments"},
            {"id": "sports_equipment", "name": "Sports Equipment"},
        ]
    },
    {
        "id": "pets",
        "name": "Pets",
        "icon": "paw-outline",
        "subcategories": [
            {"id": "dogs_puppies", "name": "Dogs & Puppies"},
            {"id": "cats_kittens", "name": "Cats & Kittens"},
            {"id": "fish", "name": "Fish"},
            {"id": "birds", "name": "Birds"},
            {"id": "pet_accessories", "name": "Pet Accessories"},
            {"id": "other_pets", "name": "Other Pets"},
        ]
    },
    {
        "id": "agriculture",
        "name": "Agriculture & Food",
        "icon": "nutrition-outline",
        "subcategories": [
            {"id": "farm_machinery", "name": "Farm Machinery & Equipment"},
            {"id": "livestock", "name": "Livestock & Poultry"},
            {"id": "feeds_seeds", "name": "Feeds, Supplements & Seeds"},
            {"id": "farm_produce", "name": "Farm Produce"},
            {"id": "food_beverages", "name": "Meals & Drinks"},
        ]
    },
    {
        "id": "commercial_equipment",
        "name": "Commercial Equipment & Tools",
        "icon": "construct-outline",
        "subcategories": [
            {"id": "manufacturing", "name": "Manufacturing Equipment"},
            {"id": "electrical_equipment", "name": "Electrical Equipment & Supplies"},
            {"id": "medical_equipment", "name": "Medical Supplies & Equipment"},
            {"id": "office_furniture", "name": "Office Furniture"},
            {"id": "printing_publishing", "name": "Printing & Publishing Equipment"},
            {"id": "restaurant_catering", "name": "Restaurant & Catering Equipment"},
            {"id": "safety_equipment", "name": "Safety Equipment"},
            {"id": "salon_equipment", "name": "Salon Equipment"},
            {"id": "store_equipment", "name": "Store Equipment"},
            {"id": "industrial_ovens", "name": "Industrial Ovens"},
        ]
    },
    {
        "id": "repair_construction",
        "name": "Repair & Construction",
        "icon": "hammer-outline",
        "subcategories": [
            {"id": "building_materials", "name": "Building Materials"},
            {"id": "doors", "name": "Doors"},
            {"id": "electrical_hand_tools", "name": "Electrical & Hand Tools"},
            {"id": "electrical_fittings", "name": "Electrical Fittings & Wiring"},
            {"id": "plumbing_fixtures", "name": "Plumbing & Water Supply"},
            {"id": "solar_energy", "name": "Solar Energy"},
            {"id": "windows", "name": "Windows"},
        ]
    },
    {
        "id": "friendship_dating",
        "name": "Friendship & Dating",
        "icon": "heart-outline",
        "subcategories": [
            {"id": "looking_for_friends", "name": "Looking for Friends"},
            {"id": "activity_partners", "name": "Activity Partners"},
            {"id": "dating_romance", "name": "Dating & Romance"},
            {"id": "long_term_relationship", "name": "Long-Term Relationship"},
            {"id": "casual_dating", "name": "Casual Dating"},
            {"id": "marriage_minded", "name": "Marriage Minded"},
            {"id": "travel_companions", "name": "Travel Companions"},
            {"id": "language_exchange", "name": "Language Exchange Partners"},
            {"id": "professional_networking", "name": "Professional Networking"},
            {"id": "study_buddies", "name": "Study Buddies"},
            {"id": "roommate_search", "name": "Roommate Search"},
            {"id": "gaming_partners", "name": "Gaming Partners"},
        ],
        "attributes": {
            "age_range": {
                "label": "Age Range",
                "type": "range",
                "min": 18,
                "max": 99,
                "required": False
            },
            "gender": {
                "label": "Gender",
                "type": "select",
                "options": ["Male", "Female", "Non-binary", "Prefer not to say"],
                "required": False
            },
            "looking_for": {
                "label": "Looking For",
                "type": "multi_select",
                "options": ["Men", "Women", "Everyone"],
                "required": False
            },
            "interests": {
                "label": "Interests",
                "type": "multi_select",
                "options": [
                    "Sports & Fitness", "Music", "Movies & TV", "Travel", "Food & Cooking",
                    "Art & Culture", "Technology", "Reading", "Gaming", "Outdoors & Nature",
                    "Photography", "Dancing", "Yoga & Meditation", "Pets & Animals"
                ],
                "required": False
            },
            "availability": {
                "label": "Availability",
                "type": "multi_select",
                "options": ["Weekday Mornings", "Weekday Evenings", "Weekends", "Flexible"],
                "required": False
            },
            "communication_preference": {
                "label": "Preferred Communication",
                "type": "select",
                "options": ["In-app messaging", "Video calls", "Phone calls", "Meet in person"],
                "required": False
            }
        }
    },
]

# Legacy category ID mapping
LEGACY_CATEGORY_MAP = {
    "vehicles": "auto_vehicles",
    "realestate": "properties",
    "home": "home_furniture",
    "fashion": "fashion_beauty",
    "services": "jobs_services",
    "jobs": "jobs_services",
    "family": "kids_baby",
    "beauty": "fashion_beauty",
    "leisure": "sports_hobbies",
    "animals": "pets",
}


# =============================================================================
# VALIDATION HELPERS
# =============================================================================

def validate_category_and_subcategory(category_id: str, subcategory_id: Optional[str]) -> tuple[bool, str]:
    """Validate category and subcategory. Returns (is_valid, error_message)"""
    # Map legacy category IDs
    mapped_category_id = LEGACY_CATEGORY_MAP.get(category_id, category_id)
    
    # Find the category
    category = None
    for cat in DEFAULT_CATEGORIES:
        if cat["id"] == mapped_category_id:
            category = cat
            break
    
    if not category:
        return False, "Invalid category"
    
    # Check if subcategory is required (it is now mandatory)
    if not subcategory_id:
        return False, "Subcategory is required"
    
    # Validate subcategory exists in the category
    subcategory_ids = [sub["id"] for sub in category.get("subcategories", [])]
    if subcategory_id not in subcategory_ids:
        return False, f"Invalid subcategory '{subcategory_id}' for category '{category['name']}'"
    
    return True, ""


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_categories_router(db):
    """
    Create the categories router with dependencies injected
    
    Args:
        db: MongoDB database instance
    
    Returns:
        APIRouter with category endpoints
    """
    router = APIRouter(prefix="/categories", tags=["Categories"])
    
    @router.get("", response_model=List[dict])
    async def get_categories():
        """Get all categories with their subcategories"""
        return DEFAULT_CATEGORIES
    
    @router.get("/{category_id}")
    async def get_category(category_id: str):
        """Get single category with its subcategories"""
        # Check legacy mapping first
        mapped_id = LEGACY_CATEGORY_MAP.get(category_id, category_id)
        
        for cat in DEFAULT_CATEGORIES:
            if cat["id"] == mapped_id:
                return cat
        raise HTTPException(status_code=404, detail="Category not found")
    
    @router.get("/{category_id}/subcategories")
    async def get_subcategories(category_id: str):
        """Get subcategories for a specific category"""
        # Check legacy mapping first
        mapped_id = LEGACY_CATEGORY_MAP.get(category_id, category_id)
        
        for cat in DEFAULT_CATEGORIES:
            if cat["id"] == mapped_id:
                return cat.get("subcategories", [])
        raise HTTPException(status_code=404, detail="Category not found")
    
    @router.get("/{category_id}/subcategory-counts")
    async def get_subcategory_counts(category_id: str):
        """Get listing counts for each subcategory in a category"""
        # Check legacy mapping first
        mapped_id = LEGACY_CATEGORY_MAP.get(category_id, category_id)
        
        # Find the category
        category = None
        for cat in DEFAULT_CATEGORIES:
            if cat["id"] == mapped_id:
                category = cat
                break
        
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Get counts using aggregation
        pipeline = [
            {"$match": {"category_id": mapped_id, "status": "active"}},
            {"$group": {"_id": "$subcategory", "count": {"$sum": 1}}}
        ]
        
        counts_cursor = db.listings.aggregate(pipeline)
        counts_list = await counts_cursor.to_list(length=100)
        
        # Build response with all subcategories (0 count for those without listings)
        result = {}
        for sub in category.get("subcategories", []):
            result[sub["id"]] = 0
        
        # Fill in actual counts
        for item in counts_list:
            if item["_id"] and item["_id"] in result:
                result[item["_id"]] = item["count"]
        
        # Get total for the category
        total = await db.listings.count_documents({"category_id": mapped_id, "status": "active"})
        result["_total"] = total
        
        return result
    
    return router
