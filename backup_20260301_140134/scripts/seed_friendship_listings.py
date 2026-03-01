#!/usr/bin/env python3
"""
Seed Friendship & Dating listings
Creates 20 sample listings for the Friendship & Dating category.
"""
import asyncio
import random
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'avida_marketplace')

# Friendship & Dating subcategories and their listings
LISTINGS_DATA = [
    # Friendship & Social
    {
        "subcategory": "friendship_social",
        "listings": [
            {"title": "Looking for hiking buddies", "description": "Love outdoor activities and looking for friends to go hiking on weekends. Open to all experience levels!", "price": 0, "attributes": {"seeking": "Activity Partners", "interests": "Hiking, Nature, Photography", "age_range": "25-40"}},
            {"title": "Coffee chat partners wanted", "description": "New to the city and looking for people to grab coffee and chat. Enjoy discussing books, tech, and culture.", "price": 0, "attributes": {"seeking": "Friends", "interests": "Coffee, Books, Technology", "age_range": "22-35"}},
        ]
    },
    # Looking for Friends
    {
        "subcategory": "looking_for_friends",
        "listings": [
            {"title": "Movie night group", "description": "Starting a movie night group - weekly gatherings to watch and discuss films. All genres welcome!", "price": 0, "attributes": {"friendship_type": "Activity Partners", "interests": "Movies, Film Discussion"}},
            {"title": "Board game enthusiasts wanted", "description": "Looking for people to join board game nights. Have a collection of 50+ games!", "price": 0, "attributes": {"friendship_type": "Casual Friends", "interests": "Board Games, Strategy Games"}},
        ]
    },
    # Professional Networking
    {
        "subcategory": "professional_networking",
        "listings": [
            {"title": "Tech startup founders - let's connect", "description": "Building a network of early-stage founders. Share experiences, advice, and opportunities.", "price": 0, "attributes": {"industry": "Technology", "purpose": "Business Partners"}},
            {"title": "Marketing professionals meetup", "description": "Monthly meetup for marketing professionals to share strategies and network.", "price": 0, "attributes": {"industry": "Marketing", "purpose": "Career Advice"}},
        ]
    },
    # Roommate Search
    {
        "subcategory": "roommate_search",
        "listings": [
            {"title": "Roommate needed - downtown apartment", "description": "Looking for a clean and respectful roommate for a 2BR apartment in downtown. Shared spaces, private bedroom.", "price": 650, "attributes": {"location": "Downtown", "budget": "$600-700/month", "move_in": "Next month"}},
            {"title": "Female roommate wanted", "description": "Seeking female roommate for quiet suburban house. Pet-friendly, parking available.", "price": 550, "attributes": {"location": "Suburbs", "budget": "$500-600/month", "move_in": "Immediate"}},
        ]
    },
    # Study Buddies
    {
        "subcategory": "study_buddies",
        "listings": [
            {"title": "Coding bootcamp study group", "description": "Preparing for a coding bootcamp. Looking for study partners to practice together.", "price": 0, "attributes": {"subject": "Programming", "level": "Self-Study"}},
            {"title": "University exam prep group", "description": "Forming a study group for upcoming final exams. Library sessions and online reviews.", "price": 0, "attributes": {"subject": "Various", "level": "University"}},
        ]
    },
    # Dating & Relationships
    {
        "subcategory": "dating_relationships",
        "listings": [
            {"title": "Genuine connection sought", "description": "Looking for a meaningful relationship with someone who values communication and adventure.", "price": 0, "attributes": {"looking_for": "Serious Relationship", "age_preference": "28-38"}},
            {"title": "Let's grab dinner", "description": "Professional looking to meet someone special. Enjoy fine dining, travel, and good conversation.", "price": 0, "attributes": {"looking_for": "Long-term Partner", "age_preference": "30-45"}},
        ]
    },
    # Activity Partners
    {
        "subcategory": "activity_partners",
        "listings": [
            {"title": "Tennis partner needed", "description": "Intermediate player looking for regular tennis partner. Weekday evenings preferred.", "price": 0, "attributes": {"activity": "Sports", "frequency": "Weekly"}},
            {"title": "Running buddy wanted", "description": "Training for a half marathon. Looking for someone at similar pace to run together.", "price": 0, "attributes": {"activity": "Gym", "frequency": "Daily"}},
        ]
    },
    # Travel Companions
    {
        "subcategory": "travel_companions",
        "listings": [
            {"title": "Backpacking through Southeast Asia", "description": "Planning a 3-week trip through Thailand, Vietnam, and Cambodia. Looking for travel companion.", "price": 0, "attributes": {"destination": "Asia", "travel_style": "Backpacking", "duration": "3 weeks"}},
            {"title": "European road trip buddy", "description": "Renting a car and exploring Western Europe this summer. Split costs and experiences!", "price": 0, "attributes": {"destination": "Europe", "travel_style": "Mid-range", "duration": "2 weeks"}},
        ]
    },
    # Gaming Partners
    {
        "subcategory": "gaming_partners",
        "listings": [
            {"title": "Looking for Valorant teammates", "description": "Diamond rank looking for teammates to grind ranked. Prefer players with mics.", "price": 0, "attributes": {"platform": "PC", "games": "Valorant, CS2"}},
            {"title": "Casual gaming friends", "description": "Play various games casually. Looking for chill people to game with after work.", "price": 0, "attributes": {"platform": "PlayStation", "games": "FIFA, GTA, Call of Duty"}},
        ]
    },
    # Language Exchange
    {
        "subcategory": "language_exchange",
        "listings": [
            {"title": "Spanish-English language exchange", "description": "Native Spanish speaker looking to practice English. Can help you with Spanish in return!", "price": 0, "attributes": {"native_language": "Spanish", "learning_language": "English", "level": "Intermediate"}},
            {"title": "Japanese conversation practice", "description": "Learning Japanese and looking for native speakers to practice with. Can teach English!", "price": 0, "attributes": {"native_language": "English", "learning_language": "Japanese", "level": "Beginner"}},
        ]
    },
]

# Test seller data
TEST_SELLER = {
    "id": "test-seller-friendship",
    "name": "Community Member",
    "email": "community@test.com",
    "phone": "+1234567890",
    "verified": True,
    "avatar": None,
    "sellerType": "individual"
}

async def seed_listings():
    """Seed friendship & dating listings"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    created_count = 0
    
    for group in LISTINGS_DATA:
        subcategory = group["subcategory"]
        
        for listing_data in group["listings"]:
            listing = {
                "id": str(uuid.uuid4()),
                "title": listing_data["title"],
                "description": listing_data["description"],
                "price": listing_data.get("price", 0),
                "currency": "EUR",
                "category_id": "friendship_dating",
                "subcategory": subcategory,
                "condition": "new",
                "location": {
                    "city": random.choice(["Test City", "Munich", "Berlin", "Hamburg"]),
                    "country": "Germany",
                    "lat": 48.137154 + random.uniform(-0.1, 0.1),
                    "lng": 11.576124 + random.uniform(-0.1, 0.1)
                },
                "images": [],
                "seller": TEST_SELLER,
                "seller_id": TEST_SELLER["id"],
                "attributes": listing_data.get("attributes", {}),
                "priceNegotiable": True,
                "negotiable": True,
                "acceptsOffers": random.choice([True, False]),
                "exchangePossible": False,
                "status": "active",
                "featured": random.choice([True, False]),
                "views": random.randint(5, 100),
                "saves": random.randint(0, 20),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            
            # Check if similar listing exists
            existing = await db.listings.find_one({"title": listing["title"], "category_id": "friendship_dating"})
            if not existing:
                await db.listings.insert_one(listing)
                created_count += 1
                print(f"Created: {listing['title']}")
            else:
                print(f"Skipped (exists): {listing['title']}")
    
    print(f"\nTotal created: {created_count} listings")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_listings())
