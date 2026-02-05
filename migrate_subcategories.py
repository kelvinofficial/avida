"""
Script to migrate existing listings to use new category and subcategory structure.
Updates old category IDs to new ones and assigns appropriate subcategories.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.avida

# Mapping from old category IDs to new category IDs
CATEGORY_MAPPING = {
    "vehicles": "auto_vehicles",
    "realestate": "properties",
    "property": "properties",
    "electronics": "electronics",
    "home": "home_furniture",
    "fashion": "fashion_beauty",
    "services": "jobs_services",
    "jobs": "jobs_services",
    "family": "kids_baby",
    "beauty": "fashion_beauty",
    "leisure": "sports_hobbies",
    "animals": "pets",
    "misc": "electronics",  # Default misc to electronics
    "industrial": "auto_vehicles",  # Map industrial to auto (heavy machinery)
    "agriculture": "auto_vehicles",  # Map agriculture to auto (heavy machinery)
}

# Default subcategory mapping based on category and keywords in title/description
def get_subcategory_for_listing(listing):
    """Determine the best subcategory based on listing data"""
    category_id = listing.get("category_id", "")
    old_subcategory = listing.get("subcategory", "")
    title = (listing.get("title") or "").lower()
    description = (listing.get("description") or "").lower()
    attributes = listing.get("attributes", {}) or {}
    
    # Get new category ID
    new_category = CATEGORY_MAPPING.get(category_id, category_id)
    
    # AUTO & VEHICLES
    if new_category == "auto_vehicles":
        if old_subcategory == "Cars" or "car" in title or "audi" in title or "bmw" in title or "mercedes" in title or "toyota" in title or "honda" in title or "ford" in title:
            return "cars"
        elif "motorcycle" in title or "scooter" in title or "bike" in title:
            return "motorcycles_scooters"
        elif "truck" in title or "trailer" in title:
            return "trucks_trailers"
        elif "boat" in title or "yacht" in title or "jet ski" in title:
            return "watercraft_boats"
        elif "bus" in title or "minibus" in title:
            return "buses_microbuses"
        elif "excavator" in title or "bulldozer" in title or "crane" in title or "forklift" in title:
            return "heavy_machinery"
        elif "part" in title or "accessory" in title or "tire" in title or "wheel" in title:
            return "vehicle_parts"
        else:
            return "cars"  # Default to cars
    
    # PROPERTIES
    elif new_category == "properties":
        purpose = attributes.get("purpose", "").lower()
        property_type = attributes.get("property_type", "").lower()
        
        if "rent" in title or purpose == "rent":
            if "commercial" in title or "office" in title or "shop" in title:
                return "commercial_rent"
            elif "land" in title or "plot" in title:
                return "land_plots_rent"
            elif "short" in title or "vacation" in title or "holiday" in title:
                return "short_let"
            else:
                return "houses_apartments_rent"
        elif "sale" in title or purpose == "sale":
            if "commercial" in title or "office" in title or "shop" in title:
                return "commercial_sale"
            elif "land" in title or "plot" in title:
                return "land_plots_sale"
            elif "new build" in title or "off plan" in title:
                return "new_builds"
            else:
                return "houses_apartments_sale"
        elif "event" in title or "venue" in title or "workstation" in title:
            return "event_centres"
        else:
            return "houses_apartments_rent"  # Default
    
    # ELECTRONICS
    elif new_category == "electronics":
        if "laptop" in title or "computer" in title or "pc" in title or "macbook" in title or "desktop" in title:
            return "laptops_computers"
        elif "phone" in title or "iphone" in title or "samsung" in title or "mobile" in title:
            return "mobile_phones"  # Will be moved to phones_tablets
        elif "tv" in title or "television" in title or "dvd" in title:
            return "tv_dvd"
        elif "console" in title or "playstation" in title or "xbox" in title or "nintendo" in title:
            return "video_game_consoles"
        elif "camera" in title or "dslr" in title or "canon" in title or "nikon" in title:
            return "photo_video_cameras"
        elif "headphone" in title or "earphone" in title or "airpod" in title or "earbud" in title:
            return "headphones"
        elif "speaker" in title or "audio" in title or "sound" in title:
            return "audio_music"
        elif "monitor" in title or "display" in title:
            return "computer_monitors"
        elif "gpu" in title or "graphics" in title or "ram" in title or "ssd" in title or "cpu" in title:
            return "computer_hardware"
        elif "keyboard" in title or "mouse" in title or "webcam" in title:
            return "computer_accessories"
        elif "printer" in title or "scanner" in title:
            return "printers_scanners"
        elif "router" in title or "wifi" in title or "network" in title:
            return "networking"
        elif "security" in title or "cctv" in title or "surveillance" in title:
            return "security_surveillance"
        elif "game" in title and "video" not in title:
            return "video_games"
        else:
            return "laptops_computers"  # Default
    
    # PHONES & TABLETS
    elif new_category == "phones_tablets":
        if "tablet" in title or "ipad" in title:
            return "tablets"
        elif "watch" in title or "smartwatch" in title:
            return "smart_watches"
        elif "case" in title or "charger" in title or "cable" in title or "accessory" in title:
            return "phone_accessories"
        elif "headphone" in title or "earphone" in title or "airpod" in title:
            return "phones_headphones"
        else:
            return "mobile_phones"
    
    # HOME & FURNITURE
    elif new_category == "home_furniture":
        if "sofa" in title or "chair" in title or "table" in title or "bed" in title or "desk" in title or "wardrobe" in title:
            return "furniture"
        elif "lamp" in title or "light" in title or "chandelier" in title:
            return "lighting"
        elif "washing" in title or "dryer" in title or "refrigerator" in title or "fridge" in title or "vacuum" in title:
            return "home_appliances"
        elif "blender" in title or "microwave" in title or "coffee" in title or "toaster" in title or "oven" in title:
            return "kitchen_appliances"
        elif "pot" in title or "pan" in title or "dish" in title or "cutlery" in title:
            return "kitchenware"
        elif "garden" in title or "outdoor" in title or "lawn" in title or "plant" in title:
            return "garden_supplies"
        else:
            return "furniture"  # Default
    
    # FASHION & BEAUTY
    elif new_category == "fashion_beauty":
        if "dress" in title or "shirt" in title or "pants" in title or "jacket" in title or "clothing" in title:
            return "clothing"
        elif "shoe" in title or "sneaker" in title or "boot" in title or "heel" in title:
            return "shoes"
        elif "bag" in title or "handbag" in title or "backpack" in title or "purse" in title:
            return "bags"
        elif "watch" in title:
            return "watches"
        elif "ring" in title or "necklace" in title or "earring" in title or "bracelet" in title or "jewelry" in title:
            return "jewelry"
        elif "perfume" in title or "fragrance" in title or "cologne" in title:
            return "perfumes"
        elif "makeup" in title or "lipstick" in title or "foundation" in title or "mascara" in title:
            return "makeup"
        elif "skincare" in title or "cream" in title or "serum" in title or "moisturizer" in title:
            return "skincare"
        elif "shampoo" in title or "hair" in title or "conditioner" in title:
            return "haircare"
        else:
            return "clothing"  # Default
    
    # JOBS & SERVICES
    elif new_category == "jobs_services":
        if "job" in title or "hiring" in title or "position" in title or "vacancy" in title:
            return "job_listings"
        elif "cleaning" in title or "plumber" in title or "electrician" in title or "painter" in title or "handyman" in title:
            return "home_services"
        elif "dj" in title or "photographer" in title or "catering" in title or "event" in title:
            return "events_entertainment"
        elif "trainer" in title or "yoga" in title or "massage" in title or "fitness" in title:
            return "health_wellness"
        else:
            return "professional_services"  # Default
    
    # PETS
    elif new_category == "pets":
        if "dog" in title or "puppy" in title:
            return "dogs"
        elif "cat" in title or "kitten" in title:
            return "cats"
        elif "bird" in title or "parrot" in title or "budgie" in title:
            return "birds"
        elif "fish" in title or "aquarium" in title:
            return "fish_aquarium"
        elif "rabbit" in title or "hamster" in title or "guinea" in title:
            return "small_animals"
        elif "food" in title or "toy" in title or "bed" in title or "cage" in title or "supply" in title:
            return "pet_supplies"
        else:
            return "dogs"  # Default
    
    # SPORTS & HOBBIES
    elif new_category == "sports_hobbies":
        if "bicycle" in title or "bike" in title or "cycling" in title:
            return "bicycles"
        elif "guitar" in title or "piano" in title or "drum" in title or "instrument" in title:
            return "musical_instruments"
        elif "book" in title or "comic" in title or "magazine" in title:
            return "books_comics"
        elif "collectible" in title or "antique" in title or "vintage" in title or "art" in title:
            return "collectibles"
        elif "tent" in title or "camping" in title or "hiking" in title or "outdoor" in title:
            return "outdoor_camping"
        elif "treadmill" in title or "dumbbell" in title or "weight" in title or "fitness" in title:
            return "fitness_equipment"
        else:
            return "sports_equipment"  # Default
    
    # KIDS & BABY
    elif new_category == "kids_baby":
        if "stroller" in title or "car seat" in title or "carrier" in title:
            return "baby_gear"
        elif "crib" in title or "high chair" in title or "changing" in title:
            return "baby_furniture"
        elif "toy" in title or "lego" in title or "game" in title or "puzzle" in title:
            return "toys"
        elif "clothing" in title or "dress" in title or "shoe" in title:
            return "kids_clothing"
        elif "bottle" in title or "breast" in title or "formula" in title or "feeding" in title:
            return "feeding_nursing"
        elif "maternity" in title or "pregnant" in title:
            return "maternity"
        else:
            return "toys"  # Default
    
    return None


async def migrate_listings():
    """Update all listings with proper category and subcategory"""
    print("Starting listing migration...")
    
    # Get all listings
    cursor = db.listings.find({})
    listings = await cursor.to_list(length=1000)
    
    print(f"Found {len(listings)} listings to process")
    
    updated_count = 0
    skipped_count = 0
    
    for listing in listings:
        listing_id = listing.get("id")
        old_category = listing.get("category_id", "")
        old_subcategory = listing.get("subcategory")
        
        # Get new category ID
        new_category = CATEGORY_MAPPING.get(old_category, old_category)
        
        # Get appropriate subcategory
        new_subcategory = get_subcategory_for_listing(listing)
        
        # Check if update is needed
        needs_update = False
        update_fields = {}
        
        if old_category != new_category:
            update_fields["category_id"] = new_category
            needs_update = True
        
        if new_subcategory and (not old_subcategory or old_subcategory != new_subcategory):
            update_fields["subcategory"] = new_subcategory
            needs_update = True
        
        if needs_update:
            result = await db.listings.update_one(
                {"id": listing_id},
                {"$set": update_fields}
            )
            if result.modified_count > 0:
                print(f"  Updated: {listing.get('title', 'Unknown')[:40]}")
                print(f"    Category: {old_category} -> {new_category}")
                print(f"    Subcategory: {old_subcategory} -> {new_subcategory}")
                updated_count += 1
        else:
            skipped_count += 1
    
    print(f"\nMigration complete!")
    print(f"  Updated: {updated_count} listings")
    print(f"  Skipped: {skipped_count} listings (already up to date)")


async def migrate_properties():
    """Update property collection with proper subcategories"""
    print("\nMigrating properties collection...")
    
    cursor = db.properties.find({})
    properties = await cursor.to_list(length=1000)
    
    print(f"Found {len(properties)} properties to process")
    
    updated_count = 0
    
    for prop in properties:
        prop_id = prop.get("id")
        purpose = (prop.get("purpose") or "").lower()
        property_type = (prop.get("property_type") or "").lower()
        title = (prop.get("title") or "").lower()
        old_subcategory = prop.get("subcategory")
        
        # Determine subcategory
        if purpose == "rent" or "rent" in title:
            if "commercial" in title or "office" in title or "shop" in title:
                new_subcategory = "commercial_rent"
            elif "land" in title or "plot" in title:
                new_subcategory = "land_plots_rent"
            elif "short" in title or "vacation" in title:
                new_subcategory = "short_let"
            else:
                new_subcategory = "houses_apartments_rent"
        elif purpose == "sale" or "sale" in title:
            if "commercial" in title or "office" in title:
                new_subcategory = "commercial_sale"
            elif "land" in title or "plot" in title:
                new_subcategory = "land_plots_sale"
            elif "new build" in title or "off plan" in title:
                new_subcategory = "new_builds"
            else:
                new_subcategory = "houses_apartments_sale"
        else:
            new_subcategory = "houses_apartments_rent"  # Default
        
        if not old_subcategory or old_subcategory != new_subcategory:
            result = await db.properties.update_one(
                {"id": prop_id},
                {"$set": {"subcategory": new_subcategory}}
            )
            if result.modified_count > 0:
                print(f"  Updated property: {prop.get('title', 'Unknown')[:40]} -> {new_subcategory}")
                updated_count += 1
    
    print(f"Properties migration complete! Updated: {updated_count}")


async def migrate_autos():
    """Update autos collection with proper subcategories"""
    print("\nMigrating autos collection...")
    
    cursor = db.autos.find({})
    autos = await cursor.to_list(length=1000)
    
    print(f"Found {len(autos)} autos to process")
    
    updated_count = 0
    
    for auto in autos:
        auto_id = auto.get("id")
        title = (auto.get("title") or "").lower()
        vehicle_type = (auto.get("vehicle_type") or "").lower()
        old_subcategory = auto.get("subcategory")
        
        # Determine subcategory
        if "motorcycle" in title or "scooter" in title or vehicle_type == "motorcycle":
            new_subcategory = "motorcycles_scooters"
        elif "truck" in title or "trailer" in title or vehicle_type == "truck":
            new_subcategory = "trucks_trailers"
        elif "boat" in title or "yacht" in title or vehicle_type == "boat":
            new_subcategory = "watercraft_boats"
        elif "bus" in title or vehicle_type == "bus":
            new_subcategory = "buses_microbuses"
        elif "excavator" in title or "bulldozer" in title or vehicle_type == "machinery":
            new_subcategory = "heavy_machinery"
        elif "part" in title or "accessory" in title:
            new_subcategory = "vehicle_parts"
        else:
            new_subcategory = "cars"  # Default to cars
        
        if not old_subcategory or old_subcategory != new_subcategory:
            result = await db.autos.update_one(
                {"id": auto_id},
                {"$set": {"subcategory": new_subcategory}}
            )
            if result.modified_count > 0:
                print(f"  Updated auto: {auto.get('title', 'Unknown')[:40]} -> {new_subcategory}")
                updated_count += 1
    
    print(f"Autos migration complete! Updated: {updated_count}")


async def main():
    print("=" * 60)
    print("LISTING MIGRATION - Adding subcategories to existing listings")
    print("=" * 60)
    
    await migrate_listings()
    await migrate_properties()
    await migrate_autos()
    
    print("\n" + "=" * 60)
    print("ALL MIGRATIONS COMPLETE!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
