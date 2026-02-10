"""
Seed Test Listings with Location Data
Creates sample listings across multiple countries and cities
Run with: python seed_test_listings.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Sample listings data with full location information
SAMPLE_LISTINGS = [
    # Tanzania - Dar es Salaam
    {
        "title": "Modern 2BR Apartment in Mikocheni",
        "description": "Spacious 2 bedroom apartment with ocean view. Modern finishes, 24/7 security, parking available.",
        "price": 450,
        "category_id": "properties",
        "subcategory": "apartments",
        "condition": "new",
        "images": ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"],
        "location_data": {
            "country_code": "TZ",
            "region_code": "DSM",
            "district_code": "KIN",
            "city_code": "MIK",
            "city_name": "Mikocheni",
            "region_name": "Dar es Salaam",
            "district_name": "Kinondoni",
            "lat": -6.7638,
            "lng": 39.2637,
            "location_text": "Mikocheni, Kinondoni, Dar es Salaam"
        }
    },
    {
        "title": "Toyota Land Cruiser V8 2019",
        "description": "Well maintained Land Cruiser V8, low mileage, full service history. Perfect for Tanzanian roads.",
        "price": 85000,
        "category_id": "auto",
        "subcategory": "cars",
        "condition": "used",
        "images": ["https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800"],
        "location_data": {
            "country_code": "TZ",
            "region_code": "DSM",
            "district_code": "KIN",
            "city_code": "MSA",
            "city_name": "Msasani",
            "region_name": "Dar es Salaam",
            "district_name": "Kinondoni",
            "lat": -6.7555,
            "lng": 39.2673,
            "location_text": "Msasani, Kinondoni, Dar es Salaam"
        }
    },
    # Kenya - Nairobi
    {
        "title": "iPhone 15 Pro Max 256GB",
        "description": "Brand new iPhone 15 Pro Max, sealed in box. 1 year warranty included.",
        "price": 1200,
        "category_id": "electronics",
        "subcategory": "phones",
        "condition": "new",
        "images": ["https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800"],
        "location_data": {
            "country_code": "KE",
            "region_code": "NAI",
            "district_code": "NAI",
            "city_code": "WES",
            "city_name": "Westlands",
            "region_name": "Nairobi",
            "district_name": "Nairobi City",
            "lat": -1.2637,
            "lng": 36.8044,
            "location_text": "Westlands, Nairobi City, Nairobi"
        }
    },
    {
        "title": "Luxury Villa in Karen",
        "description": "5 bedroom villa with swimming pool, garden, and staff quarters. Gated community.",
        "price": 2500,
        "category_id": "properties",
        "subcategory": "houses",
        "condition": "used",
        "images": ["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800"],
        "location_data": {
            "country_code": "KE",
            "region_code": "NAI",
            "district_code": "NAI",
            "city_code": "KAR",
            "city_name": "Karen",
            "region_name": "Nairobi",
            "district_name": "Nairobi City",
            "lat": -1.3197,
            "lng": 36.7134,
            "location_text": "Karen, Nairobi City, Nairobi"
        }
    },
    # South Africa - Johannesburg
    {
        "title": "MacBook Pro M3 14-inch",
        "description": "MacBook Pro with M3 chip, 16GB RAM, 512GB SSD. Like new condition.",
        "price": 1800,
        "category_id": "electronics",
        "subcategory": "computers",
        "condition": "used",
        "images": ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800"],
        "location_data": {
            "country_code": "ZA",
            "region_code": "GT",
            "district_code": "JHB",
            "city_code": "SAN",
            "city_name": "Sandton",
            "region_name": "Gauteng",
            "district_name": "City of Johannesburg",
            "lat": -26.1076,
            "lng": 28.0567,
            "location_text": "Sandton, City of Johannesburg, Gauteng"
        }
    },
    {
        "title": "BMW X5 M Sport 2022",
        "description": "Stunning BMW X5 M Sport, fully loaded, panoramic roof, heads-up display.",
        "price": 65000,
        "category_id": "auto",
        "subcategory": "cars",
        "condition": "used",
        "images": ["https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800"],
        "location_data": {
            "country_code": "ZA",
            "region_code": "GT",
            "district_code": "PTA",
            "city_code": "PTA",
            "city_name": "Pretoria",
            "region_name": "Gauteng",
            "district_name": "City of Tshwane",
            "lat": -25.7479,
            "lng": 28.2293,
            "location_text": "Pretoria, City of Tshwane, Gauteng"
        }
    },
    # Nigeria - Lagos
    {
        "title": "Samsung Galaxy S24 Ultra",
        "description": "Latest Samsung flagship phone, 512GB storage, titanium frame.",
        "price": 1100,
        "category_id": "electronics",
        "subcategory": "phones",
        "condition": "new",
        "images": ["https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800"],
        "location_data": {
            "country_code": "NG",
            "region_code": "LA",
            "district_code": "LIS",
            "city_code": "VIC",
            "city_name": "Victoria Island",
            "region_name": "Lagos",
            "district_name": "Lagos Island",
            "lat": 6.4281,
            "lng": 3.4219,
            "location_text": "Victoria Island, Lagos Island, Lagos"
        }
    },
    {
        "title": "Office Space in Lekki",
        "description": "Premium office space, 200sqm, fully furnished with AC and internet.",
        "price": 3000,
        "category_id": "properties",
        "subcategory": "commercial",
        "condition": "new",
        "images": ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=800"],
        "location_data": {
            "country_code": "NG",
            "region_code": "LA",
            "district_code": "LEK",
            "city_code": "LEK",
            "city_name": "Lekki",
            "region_name": "Lagos",
            "district_name": "Lekki",
            "lat": 6.4698,
            "lng": 3.5852,
            "location_text": "Lekki, Lekki, Lagos"
        }
    },
    # Germany - Berlin
    {
        "title": "Vintage Leather Sofa Set",
        "description": "Beautiful vintage leather sofa set, 3-seater + 2 armchairs. Perfect condition.",
        "price": 800,
        "category_id": "home",
        "subcategory": "furniture",
        "condition": "used",
        "images": ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800"],
        "location_data": {
            "country_code": "DE",
            "region_code": "BE",
            "district_code": "MIT",
            "city_code": "BER",
            "city_name": "Berlin Mitte",
            "region_name": "Berlin",
            "district_name": "Mitte",
            "lat": 52.5200,
            "lng": 13.4050,
            "location_text": "Berlin Mitte, Mitte, Berlin"
        }
    },
    {
        "title": "Electric Mountain Bike",
        "description": "High-end e-MTB, Bosch motor, 625Wh battery, Fox suspension.",
        "price": 3500,
        "category_id": "auto",
        "subcategory": "bikes",
        "condition": "used",
        "images": ["https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800"],
        "location_data": {
            "country_code": "DE",
            "region_code": "BE",
            "district_code": "KRZ",
            "city_code": "KRZ",
            "city_name": "Kreuzberg",
            "region_name": "Berlin",
            "district_name": "Kreuzberg",
            "lat": 52.4989,
            "lng": 13.4044,
            "location_text": "Kreuzberg, Kreuzberg, Berlin"
        }
    },
    # United States - New York
    {
        "title": "PlayStation 5 + 10 Games",
        "description": "PS5 Digital Edition with 10 top games. All in excellent condition.",
        "price": 450,
        "category_id": "electronics",
        "subcategory": "gaming",
        "condition": "used",
        "images": ["https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800"],
        "location_data": {
            "country_code": "US",
            "region_code": "NY",
            "district_code": "NYC",
            "city_code": "MAN",
            "city_name": "Manhattan",
            "region_name": "New York",
            "district_name": "New York City",
            "lat": 40.7831,
            "lng": -73.9712,
            "location_text": "Manhattan, New York City, New York"
        }
    },
    {
        "title": "Vintage Watch Collection",
        "description": "Collection of 5 vintage watches including Omega, Seiko, and Tissot.",
        "price": 2500,
        "category_id": "fashion",
        "subcategory": "accessories",
        "condition": "used",
        "images": ["https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800"],
        "location_data": {
            "country_code": "US",
            "region_code": "NY",
            "district_code": "NYC",
            "city_code": "BRK",
            "city_name": "Brooklyn",
            "region_name": "New York",
            "district_name": "New York City",
            "lat": 40.6782,
            "lng": -73.9442,
            "location_text": "Brooklyn, New York City, New York"
        }
    },
    # Australia - Sydney
    {
        "title": "Surfboard - Firewire Seaside",
        "description": "Firewire Seaside 5'10\", perfect for intermediate surfers. Barely used.",
        "price": 650,
        "category_id": "sports",
        "subcategory": "water-sports",
        "condition": "used",
        "images": ["https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800"],
        "location_data": {
            "country_code": "AU",
            "region_code": "NSW",
            "district_code": "SYD",
            "city_code": "BON",
            "city_name": "Bondi",
            "region_name": "New South Wales",
            "district_name": "Sydney",
            "lat": -33.8914,
            "lng": 151.2743,
            "location_text": "Bondi, Sydney, New South Wales"
        }
    },
    {
        "title": "Canon EOS R5 Camera Kit",
        "description": "Canon EOS R5 with 24-70mm f/2.8 lens, extra batteries, and bag.",
        "price": 4200,
        "category_id": "electronics",
        "subcategory": "cameras",
        "condition": "used",
        "images": ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"],
        "location_data": {
            "country_code": "AU",
            "region_code": "NSW",
            "district_code": "SYD",
            "city_code": "SYD",
            "city_name": "Sydney",
            "region_name": "New South Wales",
            "district_name": "Sydney",
            "lat": -33.8688,
            "lng": 151.2093,
            "location_text": "Sydney, Sydney, New South Wales"
        }
    },
    # Canada - Toronto
    {
        "title": "Snowboard + Bindings + Boots",
        "description": "Complete snowboard setup. Burton Custom 158, Cartel bindings, Ion boots size 10.",
        "price": 500,
        "category_id": "sports",
        "subcategory": "winter-sports",
        "condition": "used",
        "images": ["https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800"],
        "location_data": {
            "country_code": "CA",
            "region_code": "ON",
            "district_code": "TOR",
            "city_code": "TOR",
            "city_name": "Toronto",
            "region_name": "Ontario",
            "district_name": "Toronto",
            "lat": 43.6532,
            "lng": -79.3832,
            "location_text": "Toronto, Toronto, Ontario"
        }
    },
    {
        "title": "Herman Miller Aeron Chair",
        "description": "Ergonomic office chair, size B, fully loaded. Work from home essential.",
        "price": 750,
        "category_id": "home",
        "subcategory": "furniture",
        "condition": "used",
        "images": ["https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800"],
        "location_data": {
            "country_code": "CA",
            "region_code": "BC",
            "district_code": "VAN",
            "city_code": "VAN",
            "city_name": "Vancouver",
            "region_name": "British Columbia",
            "district_name": "Vancouver",
            "lat": 49.2827,
            "lng": -123.1207,
            "location_text": "Vancouver, Vancouver, British Columbia"
        }
    },
    # Netherlands - Amsterdam
    {
        "title": "Dutch City Bike - Gazelle",
        "description": "Classic Gazelle city bike, 3-speed, perfect for Amsterdam streets.",
        "price": 250,
        "category_id": "auto",
        "subcategory": "bikes",
        "condition": "used",
        "images": ["https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800"],
        "location_data": {
            "country_code": "NL",
            "region_code": "NH",
            "district_code": "AMS",
            "city_code": "AMS",
            "city_name": "Amsterdam",
            "region_name": "North Holland",
            "district_name": "Amsterdam",
            "lat": 52.3676,
            "lng": 4.9041,
            "location_text": "Amsterdam, Amsterdam, North Holland"
        }
    },
    # Uganda - Kampala
    {
        "title": "Honda Forza 300 Scooter",
        "description": "Honda Forza 300, 2021 model, low kilometers, perfect city transport.",
        "price": 4500,
        "category_id": "auto",
        "subcategory": "motorcycles",
        "condition": "used",
        "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
        "location_data": {
            "country_code": "UG",
            "region_code": "KLA",
            "district_code": "KLA",
            "city_code": "KOL",
            "city_name": "Kololo",
            "region_name": "Central Region",
            "district_name": "Kampala",
            "lat": 0.3297,
            "lng": 32.5933,
            "location_text": "Kololo, Kampala, Central Region"
        }
    },
    # Ghana - Accra
    {
        "title": "Generator - 10KVA Diesel",
        "description": "Perkins 10KVA diesel generator, soundproof, automatic transfer switch.",
        "price": 3000,
        "category_id": "electronics",
        "subcategory": "power",
        "condition": "new",
        "images": ["https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800"],
        "location_data": {
            "country_code": "GH",
            "region_code": "GR",
            "district_code": "ACC",
            "city_code": "ACC",
            "city_name": "Accra",
            "region_name": "Greater Accra",
            "district_name": "Accra Metropolitan",
            "lat": 5.6037,
            "lng": -0.1870,
            "location_text": "Accra, Accra Metropolitan, Greater Accra"
        }
    },
    # Zambia - Lusaka
    {
        "title": "Commercial Plot - 1 Acre",
        "description": "Prime commercial land on Great East Road, title deed available.",
        "price": 150000,
        "category_id": "properties",
        "subcategory": "land",
        "condition": "new",
        "images": ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800"],
        "location_data": {
            "country_code": "ZM",
            "region_code": "LS",
            "district_code": "LSK",
            "city_code": "LSK",
            "city_name": "Lusaka",
            "region_name": "Lusaka Province",
            "district_name": "Lusaka",
            "lat": -15.3875,
            "lng": 28.3228,
            "location_text": "Lusaka, Lusaka, Lusaka Province"
        }
    },
    # Zimbabwe - Harare
    {
        "title": "Office Furniture Set",
        "description": "Complete office setup: Executive desk, chair, bookshelf, and filing cabinet.",
        "price": 600,
        "category_id": "home",
        "subcategory": "furniture",
        "condition": "used",
        "images": ["https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800"],
        "location_data": {
            "country_code": "ZW",
            "region_code": "HR",
            "district_code": "HRE",
            "city_code": "BOR",
            "city_name": "Borrowdale",
            "region_name": "Harare",
            "district_name": "Harare",
            "lat": -17.7636,
            "lng": 31.0878,
            "location_text": "Borrowdale, Harare, Harare"
        }
    },
]

# Default seller user ID (will be created if doesn't exist)
DEFAULT_SELLER_ID = "seed_seller_001"


async def ensure_seller_exists(db):
    """Create a default seller user if it doesn't exist"""
    existing = await db.users.find_one({"user_id": DEFAULT_SELLER_ID})
    if not existing:
        await db.users.insert_one({
            "user_id": DEFAULT_SELLER_ID,
            "email": "seller@example.com",
            "name": "Demo Seller",
            "picture": "https://ui-avatars.com/api/?name=Demo+Seller&background=2E7D32&color=fff",
            "role": "user",
            "verified": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "settings": {
                "notifications": {"push": True, "email": True}
            }
        })
        print(f"Created default seller user: {DEFAULT_SELLER_ID}")
    return DEFAULT_SELLER_ID


async def seed_listings():
    """Seed test listings with location data"""
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ.get('DB_NAME', 'classifieds_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Ensure seller exists
    seller_id = await ensure_seller_exists(db)
    
    # Check how many listings already exist
    existing_count = await db.listings.count_documents({"user_id": seller_id})
    print(f"Existing seeded listings: {existing_count}")
    
    created_count = 0
    skipped_count = 0
    
    for listing_data in SAMPLE_LISTINGS:
        # Check if similar listing already exists (by title and location)
        existing = await db.listings.find_one({
            "title": listing_data["title"],
            "location_data.city_code": listing_data["location_data"]["city_code"]
        })
        
        if existing:
            skipped_count += 1
            continue
        
        # Create GeoJSON point for geospatial queries
        geo_point = None
        if listing_data["location_data"].get("lat") and listing_data["location_data"].get("lng"):
            geo_point = {
                "type": "Point",
                "coordinates": [listing_data["location_data"]["lng"], listing_data["location_data"]["lat"]]
            }
        
        # Build the full listing document
        listing_id = str(uuid.uuid4())
        new_listing = {
            "id": listing_id,
            "user_id": seller_id,
            "title": listing_data["title"],
            "description": listing_data["description"],
            "price": listing_data["price"],
            "currency": "USD",
            "negotiable": True,
            "category_id": listing_data["category_id"],
            "subcategory": listing_data.get("subcategory"),
            "condition": listing_data.get("condition", "used"),
            "images": listing_data.get("images", []),
            "location": listing_data["location_data"]["location_text"],
            "location_data": listing_data["location_data"],
            "geo_point": geo_point,
            "attributes": {},
            "status": "active",
            "featured": False,
            "views": 0,
            "favorites_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "accepts_offers": True,
            "accepts_exchanges": False,
            "contact_methods": ["in_app_chat"],
        }
        
        await db.listings.insert_one(new_listing)
        created_count += 1
        
        city = listing_data["location_data"]["city_name"]
        country = listing_data["location_data"]["country_code"]
        print(f"  Created: {listing_data['title']} ({city}, {country})")
    
    print(f"\nSeeding complete!")
    print(f"  Created: {created_count} new listings")
    print(f"  Skipped: {skipped_count} existing listings")
    print(f"  Total seeded listings: {existing_count + created_count}")
    
    # Show summary by country
    print("\nListings by country:")
    pipeline = [
        {"$match": {"location_data.country_code": {"$exists": True}}},
        {"$group": {"_id": "$location_data.country_code", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    async for doc in db.listings.aggregate(pipeline):
        print(f"  {doc['_id']}: {doc['count']} listings")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_listings())
