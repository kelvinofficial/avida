#!/usr/bin/env python3
"""
Comprehensive Marketplace Data Seeder
Creates 10 realistic listings per category for the Avida Classifieds App
"""

import asyncio
import os
import uuid
import random
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# German cities for realistic locations
GERMAN_CITIES = [
    "Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", 
    "Stuttgart", "Düsseldorf", "Leipzig", "Dresden", "Hannover",
    "Nuremberg", "Bremen", "Essen", "Dortmund", "Bonn"
]

# Realistic image URLs from Unsplash
def get_images(category, count=3):
    """Get category-specific placeholder images"""
    image_map = {
        "auto": [
            "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800",
            "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800",
            "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800",
            "https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800",
            "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800"
        ],
        "mobile": [
            "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800",
            "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800",
            "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800"
        ],
        "property": [
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
            "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800"
        ],
        "electronics": [
            "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800",
            "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800",
            "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800"
        ],
        "bikes": [
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
            "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800",
            "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800"
        ],
        "furniture": [
            "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800",
            "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800",
            "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800"
        ],
        "fashion": [
            "https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=800",
            "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800",
            "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800"
        ],
        "beauty": [
            "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800",
            "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800",
            "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800"
        ],
        "kids": [
            "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800",
            "https://images.unsplash.com/photo-1566140967404-b8b3932483f5?w=800",
            "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=800"
        ],
        "animals": [
            "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800",
            "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800",
            "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800"
        ],
        "industrial": [
            "https://images.unsplash.com/photo-1504917595217-d4dc5ebb6122?w=800",
            "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800",
            "https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=800"
        ],
        "agriculture": [
            "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800",
            "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800",
            "https://images.unsplash.com/photo-1592982537447-6f2a6a0c7c18?w=800"
        ],
        "jobs": [
            "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800",
            "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800"
        ],
        "services": [
            "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800",
            "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800"
        ],
        "leisure": [
            "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800",
            "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800",
            "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800"
        ]
    }
    return random.sample(image_map.get(category, image_map["electronics"]), min(count, len(image_map.get(category, []))))

def random_date(days_back=30):
    """Generate random date within last N days"""
    return datetime.now(timezone.utc) - timedelta(days=random.randint(1, days_back), hours=random.randint(0, 23))

def random_location():
    """Generate random German city with distance"""
    city = random.choice(GERMAN_CITIES)
    distance = round(random.uniform(0.5, 25), 1)
    return f"{city}, {distance} km"

# ============ SELLERS DATA ============
SELLERS = [
    {"id": "seller_auto_1", "name": "Hans Weber", "verified": True, "type": "Dealer"},
    {"id": "seller_auto_2", "name": "AutoHaus München", "verified": True, "type": "Company"},
    {"id": "seller_mobile_1", "name": "TechStore Berlin", "verified": True, "type": "Company"},
    {"id": "seller_mobile_2", "name": "Lisa Schmidt", "verified": False, "type": "Individual"},
    {"id": "seller_prop_1", "name": "ImmoReal GmbH", "verified": True, "type": "Company"},
    {"id": "seller_prop_2", "name": "Michael Braun", "verified": True, "type": "Individual"},
    {"id": "seller_elec_1", "name": "ElektroMarkt", "verified": True, "type": "Company"},
    {"id": "seller_elec_2", "name": "Peter Müller", "verified": False, "type": "Individual"},
    {"id": "seller_bike_1", "name": "BikePlanet", "verified": True, "type": "Dealer"},
    {"id": "seller_bike_2", "name": "Thomas Fischer", "verified": True, "type": "Individual"},
    {"id": "seller_furn_1", "name": "MöbelDesign", "verified": True, "type": "Company"},
    {"id": "seller_furn_2", "name": "Anna Klein", "verified": False, "type": "Individual"},
    {"id": "seller_fash_1", "name": "StyleBoutique", "verified": True, "type": "Company"},
    {"id": "seller_fash_2", "name": "Maria Hoffmann", "verified": True, "type": "Individual"},
    {"id": "seller_beauty_1", "name": "BeautyCorner", "verified": True, "type": "Company"},
    {"id": "seller_kids_1", "name": "KinderWelt", "verified": True, "type": "Company"},
    {"id": "seller_animal_1", "name": "PetLove Berlin", "verified": True, "type": "Dealer"},
    {"id": "seller_ind_1", "name": "IndustrieMarkt", "verified": True, "type": "Company"},
    {"id": "seller_agri_1", "name": "BauernHof Schmidt", "verified": True, "type": "Company"},
    {"id": "seller_job_1", "name": "TechCorp GmbH", "verified": True, "type": "Company"},
    {"id": "seller_service_1", "name": "HandyService", "verified": True, "type": "Individual"},
    {"id": "seller_leisure_1", "name": "SportClub Hamburg", "verified": True, "type": "Company"},
]

def get_seller():
    seller = random.choice(SELLERS)
    return {
        "seller_id": seller["id"],
        "seller_name": seller["name"],
        "seller_verified": seller["verified"],
        "seller_type": seller["type"]
    }

# ============ AUTO / VEHICLE LISTINGS ============
def generate_auto_listings():
    listings = []
    auto_data = [
        {"brand": "BMW", "model": "320i M Sport", "year": 2022, "mileage": 28500, "fuel": "Petrol", "transmission": "Automatic", "engine": "2.0L", "color": "Alpine White", "price": 38900},
        {"brand": "Mercedes-Benz", "model": "C200 AMG Line", "year": 2021, "mileage": 35000, "fuel": "Diesel", "transmission": "Automatic", "engine": "2.0L", "color": "Obsidian Black", "price": 42500},
        {"brand": "Audi", "model": "A4 Avant", "year": 2023, "mileage": 12000, "fuel": "Petrol", "transmission": "Automatic", "engine": "2.0 TFSI", "color": "Glacier White", "price": 47800},
        {"brand": "Volkswagen", "model": "Golf GTI", "year": 2022, "mileage": 22000, "fuel": "Petrol", "transmission": "Manual", "engine": "2.0 TSI", "color": "Tornado Red", "price": 35900},
        {"brand": "Porsche", "model": "911 Carrera", "year": 2020, "mileage": 18500, "fuel": "Petrol", "transmission": "PDK", "engine": "3.0L Twin-Turbo", "color": "GT Silver", "price": 125000},
        {"brand": "Tesla", "model": "Model 3 Long Range", "year": 2023, "mileage": 8500, "fuel": "Electric", "transmission": "Automatic", "engine": "Dual Motor", "color": "Pearl White", "price": 48900},
        {"brand": "Ford", "model": "Mustang GT", "year": 2021, "mileage": 15000, "fuel": "Petrol", "transmission": "Manual", "engine": "5.0L V8", "color": "Race Red", "price": 52000},
        {"brand": "Toyota", "model": "RAV4 Hybrid", "year": 2022, "mileage": 32000, "fuel": "Hybrid", "transmission": "CVT", "engine": "2.5L Hybrid", "color": "Lunar Rock", "price": 36500},
        {"brand": "Mini", "model": "Cooper S", "year": 2023, "mileage": 5000, "fuel": "Petrol", "transmission": "Automatic", "engine": "2.0L Turbo", "color": "British Racing Green", "price": 34900},
        {"brand": "Volvo", "model": "XC60 Recharge", "year": 2022, "mileage": 28000, "fuel": "Plug-in Hybrid", "transmission": "Automatic", "engine": "2.0L PHEV", "color": "Crystal White", "price": 55800},
    ]
    
    for i, car in enumerate(auto_data):
        seller = get_seller()
        listings.append({
            "id": f"auto_{i+1}",
            "user_id": seller["seller_id"],
            "title": f"{car['brand']} {car['model']} - {car['year']}",
            "description": f"Excellent condition {car['brand']} {car['model']}. {car['fuel']} engine with {car['transmission']} transmission. Well maintained with full service history. {car['mileage']:,} km. No accidents, single owner.",
            "price": car["price"],
            "currency": "EUR",
            "negotiable": random.choice([True, False]),
            "category_id": "vehicles",
            "subcategory": "Cars",
            "condition": random.choice(["Excellent", "Good", "Like New"]),
            "location": random_location(),
            "images": get_images("auto", random.randint(3, 5)),
            "attributes": {
                "brand": car["brand"],
                "model": car["model"],
                "year": car["year"],
                "mileage": car["mileage"],
                "fuel_type": car["fuel"],
                "transmission": car["transmission"],
                "engine_size": car["engine"],
                "color": car["color"],
                "body_type": random.choice(["Sedan", "SUV", "Coupe", "Wagon", "Hatchback"])
            },
            "status": "active",
            "featured": i < 3,
            "views": random.randint(50, 500),
            "favorites_count": random.randint(5, 50),
            "created_at": random_date(),
            "updated_at": datetime.now(timezone.utc),
            **seller
        })
    return listings

# ============ MOBILE & TABLETS LISTINGS ============
def generate_mobile_listings():
    listings = []
    mobile_data = [
        {"brand": "Apple", "model": "iPhone 15 Pro Max", "storage": "256GB", "ram": "8GB", "screen": "6.7 inch", "battery": "98%", "price": 1099},
        {"brand": "Samsung", "model": "Galaxy S24 Ultra", "storage": "512GB", "ram": "12GB", "screen": "6.8 inch", "battery": "100%", "price": 1249},
        {"brand": "Apple", "model": "iPhone 14", "storage": "128GB", "ram": "6GB", "screen": "6.1 inch", "battery": "92%", "price": 699},
        {"brand": "Google", "model": "Pixel 8 Pro", "storage": "256GB", "ram": "12GB", "screen": "6.7 inch", "battery": "100%", "price": 899},
        {"brand": "OnePlus", "model": "12", "storage": "256GB", "ram": "16GB", "screen": "6.82 inch", "battery": "100%", "price": 799},
        {"brand": "Apple", "model": "iPad Pro 12.9", "storage": "512GB", "ram": "16GB", "screen": "12.9 inch", "battery": "95%", "price": 1299},
        {"brand": "Samsung", "model": "Galaxy Tab S9+", "storage": "256GB", "ram": "12GB", "screen": "12.4 inch", "battery": "100%", "price": 899},
        {"brand": "Xiaomi", "model": "14 Ultra", "storage": "512GB", "ram": "16GB", "screen": "6.73 inch", "battery": "100%", "price": 1199},
        {"brand": "Apple", "model": "iPhone 13 Mini", "storage": "256GB", "ram": "4GB", "screen": "5.4 inch", "battery": "87%", "price": 549},
        {"brand": "Samsung", "model": "Galaxy Z Fold5", "storage": "512GB", "ram": "12GB", "screen": "7.6 inch", "battery": "96%", "price": 1599},
    ]
    
    for i, phone in enumerate(mobile_data):
        seller = get_seller()
        warranty = random.choice(["6 months", "12 months", "No warranty", "AppleCare+"])
        listings.append({
            "id": f"mobile_{i+1}",
            "user_id": seller["seller_id"],
            "title": f"{phone['brand']} {phone['model']} {phone['storage']}",
            "description": f"{phone['brand']} {phone['model']} in excellent condition. {phone['storage']} storage, {phone['battery']} battery health. Comes with original box and accessories. {warranty} warranty remaining.",
            "price": phone["price"],
            "currency": "EUR",
            "negotiable": True,
            "category_id": "electronics",
            "subcategory": "Phones",
            "condition": random.choice(["Like New", "Excellent", "Good"]),
            "location": random_location(),
            "images": get_images("mobile", random.randint(2, 4)),
            "attributes": {
                "brand": phone["brand"],
                "model": phone["model"],
                "storage": phone["storage"],
                "ram": phone["ram"],
                "screen_size": phone["screen"],
                "battery_health": phone["battery"],
                "warranty": warranty,
                "color": random.choice(["Black", "White", "Blue", "Gold", "Silver", "Purple"])
            },
            "status": "active",
            "featured": i < 2,
            "views": random.randint(100, 800),
            "favorites_count": random.randint(10, 80),
            "created_at": random_date(),
            "updated_at": datetime.now(timezone.utc),
            **seller
        })
    return listings

# ============ PROPERTIES LISTINGS ============
def generate_property_listings():
    listings = []
    property_data = [
        {"type": "Apartment", "rooms": 3, "beds": 2, "baths": 1, "sqm": 85, "furnished": True, "parking": True, "year": 2018, "price": 1850, "purpose": "rent"},
        {"type": "House", "rooms": 5, "beds": 4, "baths": 2, "sqm": 180, "furnished": False, "parking": True, "year": 2015, "price": 485000, "purpose": "sale"},
        {"type": "Studio", "rooms": 1, "beds": 1, "baths": 1, "sqm": 35, "furnished": True, "parking": False, "year": 2020, "price": 890, "purpose": "rent"},
        {"type": "Penthouse", "rooms": 4, "beds": 3, "baths": 2, "sqm": 150, "furnished": True, "parking": True, "year": 2022, "price": 3500, "purpose": "rent"},
        {"type": "Apartment", "rooms": 2, "beds": 1, "baths": 1, "sqm": 55, "furnished": False, "parking": True, "year": 2019, "price": 225000, "purpose": "sale"},
        {"type": "Villa", "rooms": 7, "beds": 5, "baths": 4, "sqm": 320, "furnished": False, "parking": True, "year": 2010, "price": 890000, "purpose": "sale"},
        {"type": "Loft", "rooms": 2, "beds": 1, "baths": 1, "sqm": 75, "furnished": True, "parking": False, "year": 2021, "price": 1650, "purpose": "rent"},
        {"type": "Townhouse", "rooms": 4, "beds": 3, "baths": 2, "sqm": 140, "furnished": False, "parking": True, "year": 2016, "price": 395000, "purpose": "sale"},
        {"type": "Apartment", "rooms": 4, "beds": 3, "baths": 2, "sqm": 110, "furnished": False, "parking": True, "year": 2017, "price": 2200, "purpose": "rent"},
        {"type": "Commercial", "rooms": 10, "beds": 0, "baths": 2, "sqm": 250, "furnished": False, "parking": True, "year": 2014, "price": 4500, "purpose": "rent"},
    ]
    
    for i, prop in enumerate(property_data):
        seller = get_seller()
        price_text = f"€{prop['price']}/month" if prop['purpose'] == 'rent' else f"€{prop['price']:,}"
        listings.append({
            "id": f"property_{i+1}",
            "user_id": seller["seller_id"],
            "title": f"{prop['type']} - {prop['rooms']} Rooms - {prop['sqm']}m²",
            "description": f"Beautiful {prop['type'].lower()} with {prop['rooms']} rooms, {prop['beds']} bedrooms and {prop['baths']} bathrooms. Total area {prop['sqm']}m². {'Fully furnished.' if prop['furnished'] else 'Unfurnished.'} {'Parking space included.' if prop['parking'] else ''} Built in {prop['year']}. Available immediately.",
            "price": prop["price"],
            "currency": "EUR",
            "negotiable": prop['purpose'] == 'sale',
            "category_id": "realestate",
            "subcategory": prop['type'],
            "condition": "Good",
            "location": random_location(),
            "images": get_images("property", random.randint(3, 5)),
            "attributes": {
                "property_type": prop["type"],
                "bedrooms": prop["beds"],
                "bathrooms": prop["baths"],
                "size_sqm": prop["sqm"],
                "furnished": prop["furnished"],
                "parking": prop["parking"],
                "year_built": prop["year"],
                "availability": random.choice(["Immediately", "From next month", "Negotiable"]),
                "purpose": prop["purpose"],
                "floor": random.randint(0, 10) if prop["type"] in ["Apartment", "Penthouse", "Studio"] else None
            },
            "status": "active",
            "featured": i < 3,
            "views": random.randint(200, 1500),
            "favorites_count": random.randint(20, 150),
            "created_at": random_date(),
            "updated_at": datetime.now(timezone.utc),
            **seller
        })
    return listings

# ============ ELECTRONICS LISTINGS ============
def generate_electronics_listings():
    listings = []
    electronics_data = [
        {"brand": "Sony", "model": "PlayStation 5", "category": "Gaming", "price": 449, "warranty": "12 months"},
        {"brand": "Apple", "model": "MacBook Pro 14 M3", "category": "Computers", "price": 1899, "warranty": "AppleCare+"},
        {"brand": "LG", "model": "OLED65C3", "category": "TV", "price": 1599, "warranty": "24 months"},
        {"brand": "Sony", "model": "WH-1000XM5", "category": "Audio", "price": 299, "warranty": "12 months"},
        {"brand": "Canon", "model": "EOS R6 Mark II", "category": "Cameras", "price": 2399, "warranty": "24 months"},
        {"brand": "Microsoft", "model": "Xbox Series X", "category": "Gaming", "price": 429, "warranty": "12 months"},
        {"brand": "Dell", "model": "XPS 15 9530", "category": "Computers", "price": 1649, "warranty": "24 months"},
        {"brand": "Samsung", "model": "Neo QLED 8K 65", "category": "TV", "price": 2999, "warranty": "36 months"},
        {"brand": "Bose", "model": "QuietComfort Ultra", "category": "Audio", "price": 379, "warranty": "12 months"},
        {"brand": "Sony", "model": "Alpha 7 IV", "category": "Cameras", "price": 2199, "warranty": "24 months"},
    ]
    
    for i, elec in enumerate(electronics_data):
        seller = get_seller()
        listings.append({
            "id": f"electronics_{i+1}",
            "user_id": seller["seller_id"],
            "title": f"{elec['brand']} {elec['model']}",
            "description": f"{elec['brand']} {elec['model']} in excellent condition. Full working order with all original accessories. {elec['warranty']} warranty. Perfect for {elec['category'].lower()} enthusiasts.",
            "price": elec["price"],
            "currency": "EUR",
            "negotiable": True,
            "category_id": "electronics",
            "subcategory": elec["category"],
            "condition": random.choice(["Like New", "Excellent", "Good"]),
            "location": random_location(),
            "images": get_images("electronics", random.randint(2, 4)),
            "attributes": {
                "brand": elec["brand"],
                "model": elec["model"],
                "category": elec["category"],
                "warranty": elec["warranty"],
                "power_type": random.choice(["AC", "Battery", "USB-C", "Rechargeable"]),
                "accessories_included": random.choice([True, False]),
                "original_box": random.choice([True, False])
            },
            "status": "active",
            "featured": i < 2,
            "views": random.randint(80, 600),
            "favorites_count": random.randint(15, 100),
            "created_at": random_date(),
            "updated_at": datetime.now(timezone.utc),
            **seller
        })
    return listings

# ============ BIKES LISTINGS ============
def generate_bikes_listings():
    listings = []
    bikes_data = [
        {"brand": "Canyon", "type": "Road Bike", "model": "Aeroad CF SL", "frame": "56cm", "gears": 22, "brakes": "Disc", "wheels": "700c", "price": 2899},
        {"brand": "Trek", "type": "Mountain Bike", "model": "Fuel EX 9.8", "frame": "M", "gears": 12, "brakes": "Disc", "wheels": "29 inch", "price": 4599},
        {"brand": "Specialized", "type": "E-Bike", "model": "Turbo Vado SL", "frame": "L", "gears": 11, "brakes": "Hydraulic Disc", "wheels": "700c", "price": 3999},
        {"brand": "Giant", "type": "Hybrid Bike", "model": "Escape 1", "frame": "M", "gears": 18, "brakes": "Disc", "wheels": "700c", "price": 849},
        {"brand": "Brompton", "type": "Folding Bike", "model": "C Line Explore", "frame": "One Size", "gears": 6, "brakes": "Rim", "wheels": "16 inch", "price": 1895},
        {"brand": "Santa Cruz", "type": "Mountain Bike", "model": "Hightower", "frame": "L", "gears": 12, "brakes": "Disc", "wheels": "29 inch", "price": 5299},
        {"brand": "Cube", "type": "E-Bike", "model": "Stereo Hybrid", "frame": "20 inch", "gears": 12, "brakes": "Disc", "wheels": "29 inch", "price": 4199},
        {"brand": "Bianchi", "type": "Road Bike", "model": "Oltre XR4", "frame": "55cm", "gears": 24, "brakes": "Disc", "wheels": "700c", "price": 8999},
        {"brand": "BMC", "type": "Gravel Bike", "model": "Kaius 01", "frame": "54cm", "gears": 22, "brakes": "Disc", "wheels": "700c", "price": 5499},
        {"brand": "Cannondale", "type": "Urban Bike", "model": "Quick Neo SL", "frame": "M", "gears": 10, "brakes": "Disc", "wheels": "700c", "price": 2799},
    ]
    
    for i, bike in enumerate(bikes_data):
        seller = get_seller()
        listings.append({
            "id": f"bike_{i+1}",
            "user_id": seller["seller_id"],
            "title": f"{bike['brand']} {bike['model']} {bike['type']}",
            "description": f"Premium {bike['brand']} {bike['model']} {bike['type'].lower()}. Frame size {bike['frame']}, {bike['gears']}-speed with {bike['brakes']} brakes and {bike['wheels']} wheels. Excellent condition, regularly serviced.",
            "price": bike["price"],
            "currency": "EUR",
            "negotiable": True,
            "category_id": "vehicles",
            "subcategory": "Bicycles",
            "condition": random.choice(["Excellent", "Good", "Like New"]),
            "location": random_location(),
            "images": get_images("bikes", random.randint(2, 4)),
            "attributes": {
                "brand": bike["brand"],
                "bike_type": bike["type"],
                "model": bike["model"],
                "frame_size": bike["frame"],
                "gear_count": bike["gears"],
                "brake_type": bike["brakes"],
                "wheel_size": bike["wheels"],
                "weight": f"{random.randint(8, 25)} kg"
            },
            "status": "active",
            "featured": i < 2,
            "views": random.randint(60, 400),
            "favorites_count": random.randint(10, 60),
            "created_at": random_date(),
            "updated_at": datetime.now(timezone.utc),
            **seller
        })
    return listings

# ============ SERVICES LISTINGS ============
def generate_services_listings():
    listings = []
    services_data = [
        {"service": "House Cleaning", "experience": 8, "pricing": "Hourly", "area": "Berlin", "response": "Within 24h", "price": 35},
        {"service": "Plumbing Repair", "experience": 15, "pricing": "Per Job", "area": "Munich", "response": "Same Day", "price": 75},
        {"service": "Moving Service", "experience": 10, "pricing": "Fixed Price", "area": "Hamburg", "response": "Within 48h", "price": 299},
        {"service": "Private Tutoring", "experience": 5, "pricing": "Hourly", "area": "Frankfurt", "response": "Within 24h", "price": 45},
        {"service": "Garden Maintenance", "experience": 12, "pricing": "Per Visit", "area": "Cologne", "response": "Within 48h", "price": 85},
        {"service": "IT Support", "experience": 7, "pricing": "Hourly", "area": "Berlin", "response": "Same Day", "price": 60},
        {"service": "Photography", "experience": 6, "pricing": "Per Event", "area": "Munich", "response": "Within 24h", "price": 250},
        {"service": "Personal Training", "experience": 8, "pricing": "Per Session", "area": "Hamburg", "response": "Same Day", "price": 55},
        {"service": "Electrical Work", "experience": 20, "pricing": "Per Job", "area": "Stuttgart", "response": "Within 24h", "price": 85},
        {"service": "Interior Design", "experience": 10, "pricing": "Project Based", "area": "Düsseldorf", "response": "Within 48h", "price": 150},
    ]
    
    for i, service in enumerate(services_data):
        seller = get_seller()
        certifications = random.choice(["Certified Professional", "Licensed & Insured", "TÜV Certified", "Chamber of Commerce Member", "None"])
        listings.append({
            "id": f"service_{i+1}",
            "user_id": seller["seller_id"],
            "title": f"Professional {service['service']} Service",
            "description": f"Experienced professional offering {service['service'].lower()} services. {service['experience']} years of experience. Service area: {service['area']} and surrounding areas. Fast response time - {service['response']}. {certifications}. Satisfaction guaranteed.",
            "price": service["price"],
            "currency": "EUR",
            "negotiable": True,
            "category_id": "services",
            "subcategory": service["service"].split()[0],
            "condition": "N/A",
            "location": f"{service['area']}, Germany",
            "images": get_images("services", 2),
            "attributes": {
                "service_type": service["service"],
                "experience_years": service["experience"],
                "availability": random.choice(["Weekdays", "Weekends", "Flexible", "24/7"]),
                "pricing_model": service["pricing"],
                "service_area": service["area"],
                "response_time": service["response"],
                "certifications": certifications
            },
            "status": "active",
            "featured": i < 2,
            "views": random.randint(40, 300),
            "favorites_count": random.randint(5, 40),
            "created_at": random_date(),
            "updated_at": datetime.now(timezone.utc),
            **seller
        })
    return listings

# ============ JOBS LISTINGS ============
def generate_jobs_listings():
    listings = []
    jobs_data = [
        {"title": "Senior Software Engineer", "type": "Full-time", "salary": "75,000 - 95,000", "exp": "5+ years", "edu": "Bachelor's", "remote": True, "industry": "Technology"},
        {"title": "Marketing Manager", "type": "Full-time", "salary": "55,000 - 70,000", "exp": "3+ years", "edu": "Bachelor's", "remote": False, "industry": "Marketing"},
        {"title": "Graphic Designer", "type": "Part-time", "salary": "30,000 - 40,000", "exp": "2+ years", "edu": "Bachelor's", "remote": True, "industry": "Design"},
        {"title": "Financial Analyst", "type": "Full-time", "salary": "60,000 - 80,000", "exp": "3+ years", "edu": "Master's", "remote": False, "industry": "Finance"},
        {"title": "Customer Service Rep", "type": "Full-time", "salary": "32,000 - 38,000", "exp": "1+ years", "edu": "High School", "remote": True, "industry": "Customer Service"},
        {"title": "Data Scientist", "type": "Full-time", "salary": "70,000 - 90,000", "exp": "4+ years", "edu": "Master's", "remote": True, "industry": "Technology"},
        {"title": "HR Manager", "type": "Full-time", "salary": "50,000 - 65,000", "exp": "5+ years", "edu": "Bachelor's", "remote": False, "industry": "Human Resources"},
        {"title": "Sales Representative", "type": "Full-time", "salary": "40,000 - 60,000", "exp": "2+ years", "edu": "Bachelor's", "remote": False, "industry": "Sales"},
        {"title": "Web Developer", "type": "Contract", "salary": "50,000 - 70,000", "exp": "3+ years", "edu": "Bachelor's", "remote": True, "industry": "Technology"},
        {"title": "Project Manager", "type": "Full-time", "salary": "65,000 - 85,000", "exp": "5+ years", "edu": "Bachelor's", "remote": False, "industry": "Management"},
    ]
    
    for i, job in enumerate(jobs_data):
        seller = get_seller()
        listings.append({
            "id": f"job_{i+1}",
            "user_id": seller["seller_id"],
            "title": f"{job['title']} - {job['type']}",
            "description": f"We are looking for a talented {job['title']} to join our team. {job['type']} position with competitive salary range €{job['salary']}. Requirements: {job['exp']} experience, {job['edu']} degree preferred. {'Remote work available.' if job['remote'] else 'On-site position.'} Join a dynamic team in the {job['industry']} industry.",
            "price": 0,
            "currency": "EUR",
            "negotiable": False,
            "category_id": "jobs",
            "subcategory": job["type"],
            "condition": "N/A",
            "location": random_location(),
            "images": get_images("jobs", 2),
            "attributes": {
                "job_title": job["title"],
                "job_type": job["type"],
                "salary_range": f"€{job['salary']}",
                "experience_required": job["exp"],
                "education_level": job["edu"],
                "remote": job["remote"],
                "industry": job["industry"],
                "benefits": random.choice(["Health Insurance, 401k", "Flexible Hours, Home Office", "Training, Career Growth", "Company Car, Bonus"])
            },
            "status": "active",
            "featured": i < 2,
            "views": random.randint(100, 800),
            "favorites_count": random.randint(20, 100),
            "created_at": random_date(),
            "updated_at": datetime.now(timezone.utc),
            **seller
        })
    return listings

# ============ FURNITURE LISTINGS ============
def generate_furniture_listings():
    listings = []
    furniture_data = [
        {"type": "Sofa", "material": "Leather", "dims": "240x90x85 cm", "color": "Cognac Brown", "weight": "65 kg", "price": 1299},
        {"type": "Dining Table", "material": "Solid Oak", "dims": "180x90x76 cm", "color": "Natural", "weight": "45 kg", "price": 899},
        {"type": "Bed Frame", "material": "Walnut Wood", "dims": "200x180x40 cm", "color": "Dark Walnut", "weight": "55 kg", "price": 749},
        {"type": "Office Desk", "material": "MDF with Metal", "dims": "160x80x75 cm", "color": "White/Black", "weight": "35 kg", "price": 449},
        {"type": "Wardrobe", "material": "Particle Board", "dims": "250x60x220 cm", "color": "White", "weight": "120 kg", "price": 599},
        {"type": "Armchair", "material": "Velvet", "dims": "85x80x95 cm", "color": "Forest Green", "weight": "25 kg", "price": 449},
        {"type": "Coffee Table", "material": "Marble & Steel", "dims": "120x60x45 cm", "color": "White/Gold", "weight": "40 kg", "price": 549},
        {"type": "Bookshelf", "material": "Pine Wood", "dims": "80x30x200 cm", "color": "Natural Pine", "weight": "35 kg", "price": 299},
        {"type": "TV Stand", "material": "Engineered Wood", "dims": "180x40x50 cm", "color": "Anthracite", "weight": "28 kg", "price": 349},
        {"type": "Dining Chairs (Set of 4)", "material": "Beech Wood & Fabric", "dims": "45x50x90 cm", "color": "Gray/Natural", "weight": "6 kg each", "price": 399},
    ]
    
    for i, furn in enumerate(furniture_data):
        seller = get_seller()
        assembly = random.choice([True, False])
        listings.append({
            "id": f"furniture_{i+1}",
            "user_id": seller["seller_id"],
            "title": f"{furn['type']} - {furn['material']}",
            "description": f"Beautiful {furn['type'].lower()} made from {furn['material'].lower()}. Dimensions: {furn['dims']}. Color: {furn['color']}. Weight: {furn['weight']}. {'Assembly required.' if assembly else 'Fully assembled.'} Excellent condition, minor wear consistent with age.",
            "price": furn["price"],
            "currency": "EUR",
            "negotiable": True,
            "category_id": "home",
            "subcategory": "Furniture",
            "condition": random.choice(["Excellent", "Good", "Like New"]),
            "location": random_location(),
            "images": get_images("furniture", random.randint(2, 4)),
            "attributes": {
                "furniture_type": furn["type"],
                "material": furn["material"],
                "dimensions": furn["dims"],
                "color": furn["color"],
                "weight": furn["weight"],
                "assembly_required": assembly,
                "brand": random.choice(["IKEA", "West Elm", "BoConcept", "Habitat", "Muuto", "Custom Made"])
            },
            "status": "active",
            "featured": i < 2,
            "views": random.randint(50, 400),
            "favorites_count": random.randint(10, 60),
            "created_at": random_date(),
            "updated_at": datetime.now(timezone.utc),
            **seller
        })
    return listings

# ============ FASHION LISTINGS ============
def generate_fashion_listings():
    listings = []
    fashion_data = [
        {"brand": "Gucci", "category": "Women", "item": "Handbag", "size": "Medium", "color": "Black", "material": "Leather", "price": 1499},
        {"brand": "Hugo Boss", "category": "Men", "item": "Suit", "size": "50 EU", "color": "Navy Blue", "material": "Wool", "price": 599},
        {"brand": "Nike", "category": "Unisex", "item": "Sneakers", "size": "42 EU", "color": "White/Red", "material": "Leather/Mesh", "price": 129},
        {"brand": "Zara", "category": "Women", "item": "Dress", "size": "M", "color": "Burgundy", "material": "Silk", "price": 79},
        {"brand": "Rolex", "category": "Men", "item": "Watch", "size": "41mm", "color": "Silver/Blue", "material": "Stainless Steel", "price": 8999},
        {"brand": "Burberry", "category": "Unisex", "item": "Trench Coat", "size": "L", "color": "Beige", "material": "Cotton", "price": 899},
        {"brand": "Louis Vuitton", "category": "Women", "item": "Wallet", "size": "Small", "color": "Monogram Brown", "material": "Canvas/Leather", "price": 549},
        {"brand": "Adidas", "category": "Men", "item": "Track Jacket", "size": "XL", "color": "Black/White", "material": "Polyester", "price": 89},
        {"brand": "Prada", "category": "Women", "item": "Sunglasses", "size": "One Size", "color": "Tortoise", "material": "Acetate", "price": 299},
        {"brand": "Tommy Hilfiger", "category": "Men", "item": "Polo Shirt", "size": "L", "color": "White", "material": "Cotton", "price": 69},
    ]
    
    for i, item in enumerate(fashion_data):
        seller = get_seller()
        original = random.choice([True, True, True, False])
        listings.append({
            "id": f"fashion_{i+1}",
            "user_id": seller["seller_id"],
            "title": f"{item['brand']} {item['item']} - {item['category']}",
            "description": f"{'Authentic' if original else 'High quality'} {item['brand']} {item['item'].lower()} for {item['category'].lower()}. Size: {item['size']}. Color: {item['color']}. Material: {item['material']}. {'Original with authenticity card.' if original else ''} Excellent condition.",
            "price": item["price"],
            "currency": "EUR",
            "negotiable": True,
            "category_id": "fashion",
            "subcategory": item["item"],
            "condition": random.choice(["Like New", "Excellent", "Good"]),
            "location": random_location(),
            "images": get_images("fashion", random.randint(2, 4)),
            "attributes": {
                "brand": item["brand"],
                "category": item["category"],
                "size": item["size"],
                "color": item["color"],
                "material": item["material"],
                "original": original,
                "item_type": item["item"]
            },
            "status": "active",
            "featured": i < 2,
            "views": random.randint(80, 600),
            "favorites_count": random.randint(15, 80),
            "created_at": random_date(),
            "updated_at": datetime.now(timezone.utc),
            **seller
        })
    return listings

# ============ BEAUTY & PERSONAL LISTINGS ============
def generate_beauty_listings():
    listings = []
    beauty_data = [
        {"product": "Skincare Set", "brand": "La Mer", "type": "All Skin Types", "qty": "4 pieces", "price": 399},
        {"product": "Perfume", "brand": "Chanel No. 5", "type": "Eau de Parfum", "qty": "100ml", "price": 149},
        {"product": "Hair Dryer", "brand": "Dyson Supersonic", "type": "All Hair Types", "qty": "1 unit", "price": 349},
        {"product": "Makeup Palette", "brand": "Charlotte Tilbury", "type": "Eye Shadow", "qty": "12 colors", "price": 65},
        {"product": "Electric Shaver", "brand": "Braun Series 9", "type": "Men's Grooming", "qty": "1 unit", "price": 229},
        {"product": "Facial Serum", "brand": "Estée Lauder", "type": "Anti-Aging", "qty": "50ml", "price": 89},
        {"product": "Hair Straightener", "brand": "ghd Platinum+", "type": "All Hair Types", "qty": "1 unit", "price": 219},
        {"product": "Lipstick Set", "brand": "MAC", "type": "Matte Collection", "qty": "6 pieces", "price": 99},
        {"product": "Body Lotion", "brand": "Jo Malone", "type": "Moisturizing", "qty": "250ml", "price": 55},
        {"product": "Cologne", "brand": "Dior Sauvage", "type": "Eau de Toilette", "qty": "100ml", "price": 95},
    ]
    
    for i, item in enumerate(beauty_data):
        seller = get_seller()
        authentic = random.choice([True, True, True, False])
        expiry = (datetime.now() + timedelta(days=random.randint(180, 730))).strftime("%Y-%m")
        listings.append({
            "id": f"beauty_{i+1}",
            "user_id": seller["seller_id"],
            "title": f"{item['brand']} {item['product']}",
            "description": f"{'Authentic' if authentic else 'Quality'} {item['brand']} {item['product'].lower()}. {item['type']}. Quantity: {item['qty']}. {'Brand new, sealed.' if random.choice([True, False]) else 'Lightly used, 90% remaining.'} Expiry date: {expiry}.",
            "price": item["price"],
            "currency": "EUR",
            "negotiable": True,
            "category_id": "misc",
            "subcategory": "Beauty",
            "condition": random.choice(["New", "Like New"]),
            "location": random_location(),
            "images": get_images("beauty", random.randint(2, 3)),
            "attributes": {
                "product_type": item["product"],
                "brand": item["brand"],
                "skin_hair_type": item["type"],
                "usage_state": random.choice(["New/Sealed", "Lightly Used", "Half Used"]),
                "expiry_date": expiry,
                "authenticity": authentic,
                "quantity": item["qty"]
            },
            "status": "active",
            "featured": i < 2,
            "views": random.randint(40, 300),
            "favorites_count": random.randint(8, 50),
            "created_at": random_date(),
            "updated_at": datetime.now(timezone.utc),
            **seller
        })
    return listings

# ============ LEISURE & ACTIVITIES LISTINGS ============
def generate_leisure_listings():
    listings = []
    leisure_data = [
        {"activity": "Skiing Lessons", "duration": "2 hours", "level": "Beginner", "equip": True, "group": "1-4", "price": 89},
        {"activity": "Tennis Court Rental", "duration": "1 hour", "level": "All Levels", "equip": False, "group": "2-4", "price": 35},
        {"activity": "Yoga Retreat", "duration": "Weekend", "level": "Intermediate", "equip": True, "group": "8-12", "price": 299},
        {"activity": "Golf Membership", "duration": "1 year", "level": "All Levels", "equip": False, "group": "Individual", "price": 1899},
        {"activity": "Scuba Diving Course", "duration": "3 days", "level": "Beginner", "equip": True, "group": "4-6", "price": 449},
        {"activity": "Cooking Class", "duration": "3 hours", "level": "All Levels", "equip": True, "group": "6-10", "price": 75},
        {"activity": "Rock Climbing Session", "duration": "2 hours", "level": "Intermediate", "equip": True, "group": "2-6", "price": 55},
        {"activity": "Photography Workshop", "duration": "Full Day", "level": "All Levels", "equip": False, "group": "8-15", "price": 129},
        {"activity": "Sailing Course", "duration": "5 days", "level": "Beginner", "equip": True, "group": "4-8", "price": 699},
        {"activity": "Dance Classes", "duration": "8 weeks", "level": "Beginner", "equip": False, "group": "10-20", "price": 159},
    ]
    
    for i, activity in enumerate(leisure_data):
        seller = get_seller()
        availability = random.choice(["Weekends only", "Daily", "Weekdays", "By Appointment"])
        listings.append({
            "id": f"leisure_{i+1}",
            "user_id": seller["seller_id"],
            "title": f"{activity['activity']} - {activity['level']}",
            "description": f"Join our {activity['activity'].lower()} for {activity['level'].lower()} level participants. Duration: {activity['duration']}. Group size: {activity['group']} people. {'Equipment included.' if activity['equip'] else 'Bring your own equipment.'} Professional instructors with years of experience.",
            "price": activity["price"],
            "currency": "EUR",
            "negotiable": False,
            "category_id": "misc",
            "subcategory": "Sports",
            "condition": "N/A",
            "location": random_location(),
            "images": get_images("leisure", random.randint(2, 3)),
            "attributes": {
                "activity_type": activity["activity"],
                "duration": activity["duration"],
                "skill_level": activity["level"],
                "equipment_included": activity["equip"],
                "group_size": activity["group"],
                "availability_dates": availability,
                "location_details": random.choice(["Indoor", "Outdoor", "Mixed"])
            },
            "status": "active",
            "featured": i < 2,
            "views": random.randint(30, 250),
            "favorites_count": random.randint(5, 40),
            "created_at": random_date(),
            "updated_at": datetime.now(timezone.utc),
            **seller
        })
    return listings

# ============ KIDS LISTINGS ============
def generate_kids_listings():
    listings = []
    kids_data = [
        {"item": "Stroller", "brand": "Bugaboo Fox 3", "age": "0-3 years", "material": "Aluminum/Fabric", "price": 899},
        {"item": "Car Seat", "brand": "Cybex Sirona", "age": "0-4 years", "material": "Plastic/Fabric", "price": 449},
        {"item": "Crib", "brand": "Stokke Sleepi", "age": "0-3 years", "material": "Beech Wood", "price": 799},
        {"item": "High Chair", "brand": "Tripp Trapp", "age": "6 months+", "material": "Oak Wood", "price": 259},
        {"item": "Play Mat", "brand": "Skip Hop", "age": "0-2 years", "material": "Foam/Fabric", "price": 89},
        {"item": "Baby Monitor", "brand": "Nanit Pro", "age": "0-3 years", "material": "Plastic", "price": 299},
        {"item": "LEGO Set", "brand": "LEGO Technic", "age": "8+ years", "material": "Plastic", "price": 149},
        {"item": "Bicycle", "brand": "Woom 4", "age": "6-8 years", "material": "Aluminum", "price": 449},
        {"item": "Swing Set", "brand": "TP Toys", "age": "3-10 years", "material": "Wood/Metal", "price": 599},
        {"item": "Art Supplies Set", "brand": "Crayola", "age": "3+ years", "material": "Various", "price": 45},
    ]
    
    for i, item in enumerate(kids_data):
        seller = get_seller()
        safety = random.choice([True, True, True, False])
        gender_neutral = random.choice([True, True, False])
        listings.append({
            "id": f"kids_{i+1}",
            "user_id": seller["seller_id"],
            "title": f"{item['brand']} {item['item']}",
            "description": f"Quality {item['brand']} {item['item'].lower()} suitable for ages {item['age']}. Material: {item['material']}. {'Safety certified.' if safety else ''} {'Gender neutral design.' if gender_neutral else ''} Excellent condition, well maintained.",
            "price": item["price"],
            "currency": "EUR",
            "negotiable": True,
            "category_id": "family",
            "subcategory": item["item"],
            "condition": random.choice(["Excellent", "Good", "Like New"]),
            "location": random_location(),
            "images": get_images("kids", random.randint(2, 4)),
            "attributes": {
                "item_type": item["item"],
                "age_range": item["age"],
                "brand": item["brand"],
                "material": item["material"],
                "safety_certified": safety,
                "gender_neutral": gender_neutral,
                "condition_notes": random.choice(["No scratches", "Minor wear", "Like new"])
            },
            "status": "active",
            "featured": i < 2,
            "views": random.randint(50, 350),
            "favorites_count": random.randint(10, 55),
            "created_at": random_date(),
            "updated_at": datetime.now(timezone.utc),
            **seller
        })
    return listings

# ============ ANIMALS LISTINGS ============
def generate_animals_listings():
    listings = []
    animals_data = [
        {"animal": "Dog", "breed": "Golden Retriever", "age": "8 months", "gender": "Male", "price": 1200},
        {"animal": "Cat", "breed": "Maine Coon", "age": "1 year", "gender": "Female", "price": 800},
        {"animal": "Dog", "breed": "French Bulldog", "age": "6 months", "gender": "Male", "price": 2500},
        {"animal": "Cat", "breed": "British Shorthair", "age": "2 years", "gender": "Male", "price": 600},
        {"animal": "Dog", "breed": "German Shepherd", "age": "4 months", "gender": "Female", "price": 1500},
        {"animal": "Rabbit", "breed": "Holland Lop", "age": "6 months", "gender": "Female", "price": 75},
        {"animal": "Bird", "breed": "Cockatiel", "age": "1 year", "gender": "Male", "price": 150},
        {"animal": "Fish", "breed": "Koi Collection", "age": "2-3 years", "gender": "Mixed", "price": 350},
        {"animal": "Hamster", "breed": "Syrian", "age": "3 months", "gender": "Female", "price": 25},
        {"animal": "Dog", "breed": "Labrador Retriever", "age": "10 months", "gender": "Female", "price": 900},
    ]
    
    for i, animal in enumerate(animals_data):
        seller = get_seller()
        vaccinated = random.choice([True, True, True, False])
        listings.append({
            "id": f"animal_{i+1}",
            "user_id": seller["seller_id"],
            "title": f"{animal['breed']} {animal['animal']} - {animal['age']} old",
            "description": f"Adorable {animal['breed']} {animal['animal'].lower()}, {animal['age']} old, {animal['gender'].lower()}. {'Fully vaccinated and dewormed.' if vaccinated else 'Vaccinations pending.'} Healthy, playful, and well-socialized. Raised in loving home environment. Comes with health certificate.",
            "price": animal["price"],
            "currency": "EUR",
            "negotiable": False,
            "category_id": "misc",
            "subcategory": "Pets",
            "condition": "N/A",
            "location": random_location(),
            "images": get_images("animals", random.randint(2, 4)),
            "attributes": {
                "animal_type": animal["animal"],
                "breed": animal["breed"],
                "age": animal["age"],
                "gender": animal["gender"],
                "vaccinated": vaccinated,
                "health_status": random.choice(["Excellent", "Good", "Healthy"]),
                "microchipped": random.choice([True, False])
            },
            "status": "active",
            "featured": i < 2,
            "views": random.randint(100, 700),
            "favorites_count": random.randint(20, 100),
            "created_at": random_date(),
            "updated_at": datetime.now(timezone.utc),
            **seller
        })
    return listings

# ============ INDUSTRIAL MACHINES LISTINGS ============
def generate_industrial_listings():
    listings = []
    industrial_data = [
        {"machine": "CNC Milling Machine", "brand": "Haas", "model": "VF-2", "year": 2019, "hours": 4500, "power": "22 kW", "price": 65000},
        {"machine": "Forklift", "brand": "Toyota", "model": "8FGU25", "year": 2020, "hours": 3200, "power": "42 kW", "price": 18500},
        {"machine": "Industrial Robot", "brand": "KUKA", "model": "KR 16", "year": 2021, "hours": 2800, "power": "7 kW", "price": 45000},
        {"machine": "Laser Cutter", "brand": "Trumpf", "model": "TruLaser 3030", "year": 2018, "hours": 6500, "power": "6 kW", "price": 120000},
        {"machine": "3D Printer Industrial", "brand": "Stratasys", "model": "F770", "year": 2022, "hours": 1500, "power": "3 kW", "price": 35000},
        {"machine": "Hydraulic Press", "brand": "Schuler", "model": "SMG 200", "year": 2017, "hours": 8000, "power": "55 kW", "price": 85000},
        {"machine": "Injection Molding", "brand": "Arburg", "model": "520 A", "year": 2020, "hours": 4200, "power": "40 kW", "price": 95000},
        {"machine": "Welding Robot", "brand": "Fanuc", "model": "Arc Mate 100iC", "year": 2021, "hours": 3000, "power": "8 kW", "price": 55000},
        {"machine": "Air Compressor", "brand": "Atlas Copco", "model": "GA 75", "year": 2019, "hours": 12000, "power": "75 kW", "price": 15000},
        {"machine": "Conveyor System", "brand": "Siemens", "model": "Custom", "year": 2020, "hours": 8500, "power": "15 kW", "price": 28000},
    ]
    
    for i, machine in enumerate(industrial_data):
        seller = get_seller()
        certified = random.choice([True, True, False])
        listings.append({
            "id": f"industrial_{i+1}",
            "user_id": seller["seller_id"],
            "title": f"{machine['brand']} {machine['machine']} - {machine['model']}",
            "description": f"{machine['brand']} {machine['machine']}, model {machine['model']}, manufactured in {machine['year']}. Operating hours: {machine['hours']:,}. Power rating: {machine['power']}. {'TÜV certified.' if certified else 'Certification available upon request.'} Well maintained with full service history. Can be inspected at our facility.",
            "price": machine["price"],
            "currency": "EUR",
            "negotiable": True,
            "category_id": "misc",
            "subcategory": "Industrial",
            "condition": random.choice(["Excellent", "Good", "Operational"]),
            "location": random_location(),
            "images": get_images("industrial", random.randint(2, 4)),
            "attributes": {
                "machine_type": machine["machine"],
                "brand": machine["brand"],
                "model": machine["model"],
                "year": machine["year"],
                "operating_hours": machine["hours"],
                "power_rating": machine["power"],
                "certification": certified,
                "warranty": random.choice(["3 months", "6 months", "As-is"])
            },
            "status": "active",
            "featured": i < 2,
            "views": random.randint(20, 150),
            "favorites_count": random.randint(2, 20),
            "created_at": random_date(),
            "updated_at": datetime.now(timezone.utc),
            **seller
        })
    return listings

# ============ AGRICULTURE LISTINGS ============
def generate_agriculture_listings():
    listings = []
    agri_data = [
        {"item": "Tractor", "type": "Machine", "brand": "John Deere 6130R", "qty": "1", "hours": 2500, "organic": False, "price": 75000},
        {"item": "Wheat Seeds", "type": "Crop", "brand": "Premium Winter Wheat", "qty": "500 kg", "hours": None, "organic": True, "price": 450},
        {"item": "Combine Harvester", "type": "Machine", "brand": "Claas Lexion 770", "qty": "1", "hours": 1800, "organic": False, "price": 185000},
        {"item": "Holstein Cows", "type": "Livestock", "brand": "Dairy Cattle", "qty": "10 head", "hours": None, "organic": False, "price": 15000},
        {"item": "Apple Trees", "type": "Plants", "brand": "Gala Variety", "qty": "50 trees", "hours": None, "organic": True, "price": 2500},
        {"item": "Irrigation System", "type": "Equipment", "brand": "Valley Center Pivot", "qty": "1 set", "hours": 3500, "organic": False, "price": 45000},
        {"item": "Organic Fertilizer", "type": "Supplies", "brand": "CompostMax", "qty": "5 tons", "hours": None, "organic": True, "price": 1200},
        {"item": "Potato Planter", "type": "Machine", "brand": "Grimme GL 430", "qty": "1", "hours": 900, "organic": False, "price": 32000},
        {"item": "Free-Range Chickens", "type": "Livestock", "brand": "Laying Hens", "qty": "100 birds", "hours": None, "organic": True, "price": 2000},
        {"item": "Greenhouse", "type": "Structure", "brand": "Commercial Glass", "qty": "1000 sqm", "hours": None, "organic": False, "price": 85000},
    ]
    
    for i, item in enumerate(agri_data):
        seller = get_seller()
        listings.append({
            "id": f"agri_{i+1}",
            "user_id": seller["seller_id"],
            "title": f"{item['brand'] if item['type'] != 'Machine' else item['item']} - {item['qty']}",
            "description": f"{item['item']} available for sale. {item['brand']}. Quantity: {item['qty']}. {f'Operating hours: {item[\"hours\"]:,}.' if item['hours'] else ''} {'Certified organic.' if item['organic'] else ''} Located in rural area, transport can be arranged.",
            "price": item["price"],
            "currency": "EUR",
            "negotiable": True,
            "category_id": "misc",
            "subcategory": "Agriculture",
            "condition": random.choice(["Excellent", "Good", "Operational"]) if item["type"] == "Machine" else "Fresh",
            "location": random_location(),
            "images": get_images("agriculture", random.randint(2, 4)),
            "attributes": {
                "item_type": item["type"],
                "crop_machine_livestock": item["item"],
                "brand": item["brand"],
                "quantity": item["qty"],
                "usage_hours": item["hours"],
                "organic": item["organic"],
                "harvest_date": (datetime.now() - timedelta(days=random.randint(1, 60))).strftime("%Y-%m-%d") if item["type"] == "Crop" else None
            },
            "status": "active",
            "featured": i < 2,
            "views": random.randint(15, 120),
            "favorites_count": random.randint(2, 15),
            "created_at": random_date(),
            "updated_at": datetime.now(timezone.utc),
            **seller
        })
    return listings


# ============ MAIN SEEDING FUNCTION ============
async def seed_all_categories():
    """Main function to seed all categories"""
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client.classifieds_db
    
    print("=" * 60)
    print("AVIDA MARKETPLACE - COMPREHENSIVE DATA SEEDER")
    print("=" * 60)
    
    # Generate all listings
    all_listings = []
    
    generators = [
        ("Auto/Vehicle", generate_auto_listings),
        ("Mobile & Tablets", generate_mobile_listings),
        ("Properties", generate_property_listings),
        ("Electronics", generate_electronics_listings),
        ("Bikes", generate_bikes_listings),
        ("Services", generate_services_listings),
        ("Jobs", generate_jobs_listings),
        ("Furniture", generate_furniture_listings),
        ("Fashion", generate_fashion_listings),
        ("Beauty & Personal", generate_beauty_listings),
        ("Leisure & Activities", generate_leisure_listings),
        ("Kids", generate_kids_listings),
        ("Animals", generate_animals_listings),
        ("Industrial Machines", generate_industrial_listings),
        ("Agriculture", generate_agriculture_listings),
    ]
    
    for category_name, generator in generators:
        listings = generator()
        all_listings.extend(listings)
        print(f"✓ Generated {len(listings)} listings for {category_name}")
    
    # Clear existing listings and insert new ones
    print("\n" + "-" * 60)
    print("Inserting into database...")
    
    # Delete existing seeded listings (keep user-created ones)
    await db.listings.delete_many({
        "id": {"$regex": "^(auto_|mobile_|property_|electronics_|bike_|service_|job_|furniture_|fashion_|beauty_|leisure_|kids_|animal_|industrial_|agri_)"}
    })
    
    # Insert all listings
    if all_listings:
        await db.listings.insert_many(all_listings)
    
    # Create sellers in users collection
    print("\nCreating seller profiles...")
    for seller in SELLERS:
        await db.users.update_one(
            {"user_id": seller["id"]},
            {"$set": {
                "user_id": seller["id"],
                "name": seller["name"],
                "email": f"{seller['id']}@avida.de",
                "verified": seller["verified"],
                "seller_type": seller["type"],
                "picture": f"https://ui-avatars.com/api/?name={seller['name'].replace(' ', '+')}&background=2E7D32&color=fff",
                "rating": round(random.uniform(4.0, 5.0), 1),
                "total_ratings": random.randint(5, 100),
                "location": random.choice(GERMAN_CITIES) + ", Germany",
                "created_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(30, 365))).isoformat(),
                "followers": [],
                "following": [],
                "reviews": []
            }},
            upsert=True
        )
    
    # Summary
    total = await db.listings.count_documents({})
    print("\n" + "=" * 60)
    print(f"SEEDING COMPLETE!")
    print(f"Total listings in database: {total}")
    print(f"Categories seeded: {len(generators)}")
    print(f"Sellers created: {len(SELLERS)}")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_all_categories())
