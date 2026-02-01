#!/usr/bin/env python3
"""
Seed Property Listings Database
Creates 17 sample property listings for the Property Category System
"""

import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta
import random
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

# Property images from Unsplash
PROPERTY_IMAGES = {
    'house': [
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80',
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=80',
    ],
    'apartment': [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80',
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80',
        'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=600&q=80',
    ],
    'office': [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
        'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&q=80',
        'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&q=80',
    ],
    'land': [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80',
        'https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=600&q=80',
        'https://images.unsplash.com/photo-1625244724120-1fd1d34d00f6?w=600&q=80',
    ],
    'warehouse': [
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&q=80',
        'https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&q=80',
    ],
    'shop': [
        'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=80',
        'https://images.unsplash.com/photo-1567449303078-57ad995bd329?w=600&q=80',
    ],
}

GERMAN_CITIES = ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Leipzig']

BERLIN_AREAS = ['Mitte', 'Prenzlauer Berg', 'Kreuzberg', 'Charlottenburg', 'Friedrichshain', 'Neukölln', 'Schöneberg', 'Wedding']
HAMBURG_AREAS = ['Altona', 'Eimsbüttel', 'Hamburg-Nord', 'Wandsbek', 'HafenCity']
MUNICH_AREAS = ['Schwabing', 'Maxvorstadt', 'Haidhausen', 'Bogenhausen', 'Sendling']
FRANKFURT_AREAS = ['Nordend', 'Sachsenhausen', 'Westend', 'Bornheim', 'Bankenviertel']

AREAS_BY_CITY = {
    'Berlin': BERLIN_AREAS,
    'Hamburg': HAMBURG_AREAS,
    'Munich': MUNICH_AREAS,
    'Frankfurt': FRANKFURT_AREAS,
    'Cologne': ['Ehrenfeld', 'Lindenthal', 'Nippes', 'Sülz'],
    'Stuttgart': ['Mitte', 'West', 'Ost', 'Bad Cannstatt'],
    'Düsseldorf': ['Altstadt', 'Carlstadt', 'Pempelfort', 'Bilk'],
    'Leipzig': ['Zentrum', 'Plagwitz', 'Connewitz', 'Lindenau'],
}

# Sample agents/sellers
AGENTS = [
    {
        "id": "agent_1",
        "name": "Berlin Premier Realty",
        "type": "agent",
        "phone": "+49 30 12345678",
        "whatsapp": "+49 151 12345678",
        "isVerified": True,
        "rating": 4.9,
        "listingsCount": 45,
        "memberSince": "2020-03-15",
        "responseTime": "within 1 hour",
    },
    {
        "id": "agent_2",
        "name": "Commercial Realty GmbH",
        "type": "agent",
        "phone": "+49 69 12345678",
        "isVerified": True,
        "rating": 4.7,
        "listingsCount": 120,
        "memberSince": "2019-01-10",
        "responseTime": "within 2 hours",
    },
    {
        "id": "agent_3",
        "name": "Bavaria Land & Property",
        "type": "agent",
        "phone": "+49 89 98765432",
        "isVerified": True,
        "rating": 4.8,
        "listingsCount": 35,
        "memberSince": "2021-06-20",
    },
    {
        "id": "owner_1",
        "name": "Hans Mueller",
        "type": "owner",
        "phone": "+49 30 98765432",
        "isVerified": True,
        "memberSince": "2021-06-10",
    },
    {
        "id": "owner_2",
        "name": "Anna Schmidt",
        "type": "owner",
        "phone": "+49 151 87654321",
        "isVerified": False,
        "memberSince": "2023-01-20",
    },
    {
        "id": "owner_3",
        "name": "Max Weber",
        "type": "owner",
        "phone": "+49 172 11223344",
        "isVerified": True,
        "memberSince": "2022-08-15",
    },
]

def get_random_images(property_type, count=3):
    """Get random images for property type"""
    img_type = property_type
    if property_type in ['residential_plot', 'commercial_plot', 'agricultural_land', 'industrial_land']:
        img_type = 'land'
    elif property_type in ['portion', 'short_let']:
        img_type = 'apartment'
    elif property_type in ['factory', 'event_center', 'building']:
        img_type = 'warehouse'
    
    images = PROPERTY_IMAGES.get(img_type, PROPERTY_IMAGES['apartment'])
    return random.sample(images, min(count, len(images)))

def generate_highlights(property_data):
    """Generate AI-style highlights based on property features"""
    highlights = []
    
    if property_data.get('condition') == 'new':
        highlights.append({"id": "new", "icon": "sparkles", "label": "Newly Built"})
    if property_data.get('condition') == 'renovated':
        highlights.append({"id": "renovated", "icon": "hammer", "label": "Renovated"})
    if property_data.get('furnishing') == 'furnished':
        highlights.append({"id": "furnished", "icon": "bed", "label": "Furnished"})
    
    facilities = property_data.get('facilities', {})
    if facilities.get('gatedEstate'):
        highlights.append({"id": "gated", "icon": "shield-checkmark", "label": "Gated Estate"})
    if facilities.get('parking'):
        highlights.append({"id": "parking", "icon": "car", "label": "Parking"})
    if facilities.get('security'):
        highlights.append({"id": "security", "icon": "lock-closed", "label": "24hr Security"})
    if facilities.get('swimmingPool'):
        highlights.append({"id": "pool", "icon": "water", "label": "Swimming Pool"})
    if facilities.get('gym'):
        highlights.append({"id": "gym", "icon": "fitness", "label": "Gym Access"})
    if property_data.get('verification', {}).get('isVerified'):
        highlights.append({"id": "verified", "icon": "checkmark-circle", "label": "Verified"})
    
    return highlights[:6]

# Property listings data
PROPERTY_LISTINGS = [
    # RENTAL APARTMENTS (5)
    {
        "id": "prop_1",
        "title": "Modern 3BR Apartment in Mitte",
        "description": "Stunning modern apartment in the heart of Berlin. Features high ceilings, hardwood floors, and a private balcony with city views. Recently renovated with premium finishes. Perfect for professionals or families seeking luxury urban living.",
        "purpose": "rent",
        "type": "apartment",
        "price": 2500,
        "currency": "EUR",
        "priceNegotiable": True,
        "pricePerMonth": True,
        "location": {
            "country": "Germany",
            "city": "Berlin",
            "area": "Mitte",
            "estate": "Central Park Residences",
            "address": "Friedrichstraße 123",
        },
        "bedrooms": 3,
        "bathrooms": 2,
        "toilets": 2,
        "size": 120,
        "sizeUnit": "sqm",
        "floorNumber": 5,
        "totalFloors": 8,
        "yearBuilt": 2022,
        "furnishing": "furnished",
        "condition": "new",
        "facilities": {
            "electricity24hr": True, "waterSupply": True, "airConditioning": True,
            "wardrobe": True, "kitchenCabinets": True, "security": True,
            "cctv": True, "gatedEstate": True, "parking": True, "balcony": True,
            "elevator": True, "wifi": True,
        },
        "verification": {"isVerified": True, "docsChecked": True, "addressConfirmed": True, "ownerVerified": True},
        "seller": AGENTS[0],
        "featured": True,
        "sponsored": True,
        "boosted": False,
        "views": 1250,
        "favorites": 89,
        "inquiries": 23,
    },
    {
        "id": "prop_2",
        "title": "Cozy 2BR Apartment in Kreuzberg",
        "description": "Charming apartment in trendy Kreuzberg. Walking distance to cafes, restaurants, and public transport. Ideal for young professionals.",
        "purpose": "rent",
        "type": "apartment",
        "price": 1400,
        "currency": "EUR",
        "priceNegotiable": False,
        "pricePerMonth": True,
        "location": {"country": "Germany", "city": "Berlin", "area": "Kreuzberg"},
        "bedrooms": 2,
        "bathrooms": 1,
        "size": 75,
        "sizeUnit": "sqm",
        "floorNumber": 3,
        "totalFloors": 5,
        "yearBuilt": 2015,
        "furnishing": "unfurnished",
        "condition": "renovated",
        "facilities": {"electricity24hr": True, "waterSupply": True, "balcony": True, "elevator": True},
        "verification": {"isVerified": False},
        "seller": AGENTS[4],
        "featured": False,
        "sponsored": False,
        "boosted": False,
        "views": 345,
        "favorites": 28,
        "inquiries": 8,
    },
    {
        "id": "prop_3",
        "title": "Luxury Studio with Skyline View",
        "description": "Premium studio apartment in Hamburg HafenCity. Floor-to-ceiling windows with stunning harbor views. Modern kitchen and bathroom.",
        "purpose": "rent",
        "type": "apartment",
        "price": 1800,
        "currency": "EUR",
        "priceNegotiable": True,
        "pricePerMonth": True,
        "location": {"country": "Germany", "city": "Hamburg", "area": "HafenCity", "estate": "Elbphilharmonie Quarter"},
        "bedrooms": 1,
        "bathrooms": 1,
        "size": 55,
        "sizeUnit": "sqm",
        "floorNumber": 12,
        "totalFloors": 18,
        "yearBuilt": 2020,
        "furnishing": "furnished",
        "condition": "new",
        "facilities": {
            "electricity24hr": True, "waterSupply": True, "airConditioning": True,
            "security": True, "cctv": True, "gym": True, "elevator": True, "wifi": True,
        },
        "verification": {"isVerified": True, "docsChecked": True, "addressConfirmed": True},
        "seller": AGENTS[1],
        "featured": True,
        "sponsored": False,
        "boosted": True,
        "views": 678,
        "favorites": 45,
        "inquiries": 12,
    },
    {
        "id": "prop_4",
        "title": "Spacious 4BR Family Apartment",
        "description": "Large family apartment in quiet Munich neighborhood. Close to schools, parks, and shopping. Ideal for families with children.",
        "purpose": "rent",
        "type": "apartment",
        "price": 3200,
        "currency": "EUR",
        "priceNegotiable": True,
        "pricePerMonth": True,
        "location": {"country": "Germany", "city": "Munich", "area": "Bogenhausen"},
        "bedrooms": 4,
        "bathrooms": 2,
        "toilets": 3,
        "size": 150,
        "sizeUnit": "sqm",
        "floorNumber": 2,
        "totalFloors": 4,
        "yearBuilt": 2018,
        "furnishing": "semi_furnished",
        "condition": "new",
        "facilities": {
            "electricity24hr": True, "waterSupply": True, "parking": True,
            "balcony": True, "elevator": True, "kitchenCabinets": True,
        },
        "verification": {"isVerified": True, "docsChecked": True},
        "seller": AGENTS[2],
        "featured": False,
        "sponsored": False,
        "boosted": False,
        "views": 432,
        "favorites": 34,
        "inquiries": 9,
    },
    {
        "id": "prop_5",
        "title": "Short-Let Designer Loft",
        "description": "Beautifully designed loft available for short-term rental. Perfect for business travelers or tourists. Fully equipped.",
        "purpose": "rent",
        "type": "short_let",
        "price": 150,
        "currency": "EUR",
        "priceNegotiable": False,
        "pricePerMonth": False,
        "location": {"country": "Germany", "city": "Berlin", "area": "Prenzlauer Berg"},
        "bedrooms": 1,
        "bathrooms": 1,
        "size": 45,
        "sizeUnit": "sqm",
        "yearBuilt": 2019,
        "furnishing": "furnished",
        "condition": "renovated",
        "facilities": {
            "electricity24hr": True, "waterSupply": True, "wifi": True,
            "airConditioning": True, "kitchenCabinets": True,
        },
        "verification": {"isVerified": True, "addressConfirmed": True},
        "seller": AGENTS[5],
        "featured": False,
        "sponsored": True,
        "boosted": False,
        "views": 567,
        "favorites": 23,
        "inquiries": 18,
    },
    
    # HOUSES FOR SALE (4)
    {
        "id": "prop_6",
        "title": "Luxury Villa with Garden",
        "description": "Beautiful family villa with spacious garden, modern kitchen, and 4 bedrooms. Perfect for families looking for space and comfort in an exclusive neighborhood.",
        "purpose": "buy",
        "type": "house",
        "price": 850000,
        "currency": "EUR",
        "priceNegotiable": True,
        "location": {"country": "Germany", "city": "Berlin", "area": "Charlottenburg", "estate": "Westend Gardens"},
        "bedrooms": 4,
        "bathrooms": 3,
        "toilets": 4,
        "size": 280,
        "sizeUnit": "sqm",
        "yearBuilt": 2019,
        "furnishing": "semi_furnished",
        "condition": "new",
        "facilities": {
            "electricity24hr": True, "waterSupply": True, "generator": True,
            "airConditioning": True, "security": True, "gatedEstate": True,
            "parking": True, "swimmingPool": True,
        },
        "verification": {"isVerified": True, "docsChecked": True, "addressConfirmed": True, "ownerVerified": True},
        "seller": AGENTS[3],
        "featured": True,
        "sponsored": False,
        "boosted": True,
        "views": 890,
        "favorites": 67,
        "inquiries": 15,
    },
    {
        "id": "prop_7",
        "title": "Modern Townhouse in Munich",
        "description": "Contemporary townhouse with 3 floors. Private garage, garden terrace, and high-end finishes throughout. Energy-efficient design.",
        "purpose": "buy",
        "type": "house",
        "price": 1200000,
        "currency": "EUR",
        "priceNegotiable": True,
        "location": {"country": "Germany", "city": "Munich", "area": "Schwabing"},
        "bedrooms": 5,
        "bathrooms": 3,
        "toilets": 4,
        "size": 320,
        "sizeUnit": "sqm",
        "yearBuilt": 2021,
        "furnishing": "unfurnished",
        "condition": "new",
        "facilities": {
            "electricity24hr": True, "waterSupply": True, "airConditioning": True,
            "security": True, "parking": True, "balcony": True, "gym": True,
        },
        "verification": {"isVerified": True, "docsChecked": True, "addressConfirmed": True},
        "seller": AGENTS[2],
        "featured": True,
        "sponsored": True,
        "boosted": False,
        "views": 1123,
        "favorites": 98,
        "inquiries": 21,
    },
    {
        "id": "prop_8",
        "title": "Charming Historic Villa",
        "description": "Beautifully restored historic villa from 1920. Original architectural details combined with modern amenities. Large garden with mature trees.",
        "purpose": "buy",
        "type": "house",
        "price": 2100000,
        "currency": "EUR",
        "priceNegotiable": True,
        "location": {"country": "Germany", "city": "Hamburg", "area": "Blankenese"},
        "bedrooms": 6,
        "bathrooms": 4,
        "toilets": 5,
        "size": 450,
        "sizeUnit": "sqm",
        "yearBuilt": 1920,
        "furnishing": "semi_furnished",
        "condition": "renovated",
        "facilities": {
            "electricity24hr": True, "waterSupply": True, "generator": True,
            "security": True, "parking": True, "swimmingPool": True,
        },
        "verification": {"isVerified": True, "docsChecked": True, "addressConfirmed": True, "ownerVerified": True},
        "seller": AGENTS[0],
        "featured": True,
        "sponsored": False,
        "boosted": False,
        "views": 756,
        "favorites": 54,
        "inquiries": 11,
    },
    {
        "id": "prop_9",
        "title": "Family Home with Large Garden",
        "description": "Comfortable family home in peaceful Stuttgart suburb. Large garden, double garage, and close to excellent schools.",
        "purpose": "buy",
        "type": "house",
        "price": 650000,
        "currency": "EUR",
        "priceNegotiable": True,
        "location": {"country": "Germany", "city": "Stuttgart", "area": "Bad Cannstatt"},
        "bedrooms": 4,
        "bathrooms": 2,
        "toilets": 3,
        "size": 200,
        "sizeUnit": "sqm",
        "yearBuilt": 2010,
        "furnishing": "unfurnished",
        "condition": "renovated",
        "facilities": {
            "electricity24hr": True, "waterSupply": True, "parking": True, "balcony": True,
        },
        "verification": {"isVerified": False},
        "seller": AGENTS[5],
        "featured": False,
        "sponsored": False,
        "boosted": False,
        "views": 234,
        "favorites": 19,
        "inquiries": 5,
    },
    
    # LAND (3)
    {
        "id": "prop_10",
        "title": "Residential Plot in Munich Suburbs",
        "description": "Prime residential plot in quiet Munich suburb. Perfect for building your dream home. All utilities available at boundary.",
        "purpose": "buy",
        "type": "residential_plot",
        "price": 320000,
        "currency": "EUR",
        "priceNegotiable": True,
        "location": {"country": "Germany", "city": "Munich", "area": "Grünwald"},
        "size": 800,
        "sizeUnit": "sqm",
        "furnishing": "unfurnished",
        "condition": "new",
        "facilities": {"waterSupply": True, "electricity24hr": True},
        "verification": {"isVerified": True, "docsChecked": True, "addressConfirmed": True},
        "seller": AGENTS[2],
        "featured": True,
        "sponsored": False,
        "boosted": False,
        "views": 432,
        "favorites": 56,
        "inquiries": 9,
    },
    {
        "id": "prop_11",
        "title": "Commercial Plot - Prime Location",
        "description": "Excellent commercial plot near Frankfurt airport. Ideal for warehouse, logistics, or light industrial use. Easy highway access.",
        "purpose": "buy",
        "type": "commercial_plot",
        "price": 890000,
        "currency": "EUR",
        "priceNegotiable": True,
        "location": {"country": "Germany", "city": "Frankfurt", "area": "Sachsenhausen"},
        "size": 2500,
        "sizeUnit": "sqm",
        "furnishing": "unfurnished",
        "condition": "new",
        "facilities": {"electricity24hr": True, "waterSupply": True},
        "verification": {"isVerified": True, "docsChecked": True},
        "seller": AGENTS[1],
        "featured": False,
        "sponsored": True,
        "boosted": True,
        "views": 345,
        "favorites": 23,
        "inquiries": 7,
    },
    {
        "id": "prop_12",
        "title": "Agricultural Land - Brandenburg",
        "description": "Fertile agricultural land ideal for farming or long-term investment. Currently used for crop cultivation.",
        "purpose": "buy",
        "type": "agricultural_land",
        "price": 180000,
        "currency": "EUR",
        "priceNegotiable": True,
        "location": {"country": "Germany", "city": "Berlin", "area": "Brandenburg (outskirts)"},
        "size": 15000,
        "sizeUnit": "sqm",
        "furnishing": "unfurnished",
        "condition": "old",
        "facilities": {"waterSupply": True},
        "verification": {"isVerified": True, "docsChecked": True},
        "seller": AGENTS[3],
        "featured": False,
        "sponsored": False,
        "boosted": False,
        "views": 156,
        "favorites": 12,
        "inquiries": 3,
    },
    
    # COMMERCIAL (5)
    {
        "id": "prop_13",
        "title": "Prime Office Space in Frankfurt",
        "description": "Modern office space in Frankfurt business district. Open floor plan with meeting rooms. Floor-to-ceiling windows with city views.",
        "purpose": "rent",
        "type": "office",
        "price": 5500,
        "currency": "EUR",
        "priceNegotiable": True,
        "pricePerMonth": True,
        "location": {"country": "Germany", "city": "Frankfurt", "area": "Bankenviertel"},
        "size": 200,
        "sizeUnit": "sqm",
        "floorNumber": 12,
        "totalFloors": 25,
        "yearBuilt": 2020,
        "furnishing": "unfurnished",
        "condition": "new",
        "facilities": {
            "electricity24hr": True, "airConditioning": True, "security": True,
            "cctv": True, "parking": True, "elevator": True, "wifi": True,
        },
        "verification": {"isVerified": True, "docsChecked": True},
        "seller": AGENTS[1],
        "featured": False,
        "sponsored": True,
        "boosted": False,
        "views": 567,
        "favorites": 34,
        "inquiries": 12,
    },
    {
        "id": "prop_14",
        "title": "Retail Shop in Shopping District",
        "description": "Prime retail location on busy shopping street. High foot traffic. Suitable for fashion, electronics, or food retail.",
        "purpose": "rent",
        "type": "shop",
        "price": 4200,
        "currency": "EUR",
        "priceNegotiable": True,
        "pricePerMonth": True,
        "location": {"country": "Germany", "city": "Cologne", "area": "Ehrenfeld"},
        "size": 85,
        "sizeUnit": "sqm",
        "yearBuilt": 2015,
        "furnishing": "unfurnished",
        "condition": "renovated",
        "facilities": {
            "electricity24hr": True, "waterSupply": True, "airConditioning": True, "security": True,
        },
        "verification": {"isVerified": True, "addressConfirmed": True},
        "seller": AGENTS[1],
        "featured": False,
        "sponsored": False,
        "boosted": True,
        "views": 289,
        "favorites": 15,
        "inquiries": 6,
    },
    {
        "id": "prop_15",
        "title": "Warehouse for Lease - Industrial Area",
        "description": "Large warehouse with loading docks. Suitable for logistics, distribution, or light manufacturing. 24/7 access.",
        "purpose": "rent",
        "type": "warehouse",
        "price": 8500,
        "currency": "EUR",
        "priceNegotiable": True,
        "pricePerMonth": True,
        "location": {"country": "Germany", "city": "Hamburg", "area": "Wandsbek"},
        "size": 1200,
        "sizeUnit": "sqm",
        "yearBuilt": 2018,
        "furnishing": "unfurnished",
        "condition": "new",
        "facilities": {
            "electricity24hr": True, "waterSupply": True, "security": True,
            "cctv": True, "parking": True,
        },
        "verification": {"isVerified": True, "docsChecked": True},
        "seller": AGENTS[1],
        "featured": False,
        "sponsored": False,
        "boosted": False,
        "views": 198,
        "favorites": 8,
        "inquiries": 4,
    },
    {
        "id": "prop_16",
        "title": "Office Building for Sale",
        "description": "5-story office building with existing tenants. Excellent investment opportunity. Stable rental income. Central Düsseldorf location.",
        "purpose": "buy",
        "type": "building",
        "price": 4500000,
        "currency": "EUR",
        "priceNegotiable": True,
        "location": {"country": "Germany", "city": "Düsseldorf", "area": "Pempelfort"},
        "size": 2800,
        "sizeUnit": "sqm",
        "totalFloors": 5,
        "yearBuilt": 2008,
        "furnishing": "semi_furnished",
        "condition": "renovated",
        "facilities": {
            "electricity24hr": True, "waterSupply": True, "airConditioning": True,
            "security": True, "cctv": True, "parking": True, "elevator": True,
        },
        "verification": {"isVerified": True, "docsChecked": True, "ownerVerified": True},
        "seller": AGENTS[1],
        "featured": True,
        "sponsored": True,
        "boosted": False,
        "views": 456,
        "favorites": 28,
        "inquiries": 8,
    },
    {
        "id": "prop_17",
        "title": "Event Center - Wedding Venue",
        "description": "Beautiful event center perfect for weddings, corporate events, and conferences. Includes kitchen facilities and parking for 100 cars.",
        "purpose": "buy",
        "type": "event_center",
        "price": 1800000,
        "currency": "EUR",
        "priceNegotiable": True,
        "location": {"country": "Germany", "city": "Leipzig", "area": "Connewitz"},
        "size": 850,
        "sizeUnit": "sqm",
        "yearBuilt": 2016,
        "furnishing": "furnished",
        "condition": "new",
        "facilities": {
            "electricity24hr": True, "waterSupply": True, "airConditioning": True,
            "security": True, "parking": True, "wifi": True,
        },
        "verification": {"isVerified": True, "docsChecked": True, "addressConfirmed": True},
        "seller": AGENTS[0],
        "featured": False,
        "sponsored": False,
        "boosted": True,
        "views": 321,
        "favorites": 19,
        "inquiries": 5,
    },
]


async def seed_properties():
    """Insert property listings into MongoDB"""
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        print("Error: MONGO_URL not found in environment variables")
        sys.exit(1)
    
    print(f"Connecting to MongoDB...")
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'classifieds_db')]
    
    # Clear existing properties
    print("Clearing existing property listings...")
    await db.properties.delete_many({})
    await db.property_favorites.delete_many({})
    await db.property_offers.delete_many({})
    await db.property_bookings.delete_many({})
    
    # Add timestamps and images to each property
    now = datetime.now(timezone.utc)
    properties_to_insert = []
    
    for i, prop in enumerate(PROPERTY_LISTINGS):
        # Add images based on type
        prop['images'] = get_random_images(prop['type'], random.randint(2, 4))
        
        # Add timestamps
        days_ago = random.randint(0, 30)
        prop['createdAt'] = (now - timedelta(days=days_ago)).isoformat()
        prop['updatedAt'] = (now - timedelta(days=random.randint(0, days_ago))).isoformat()
        
        # Set status
        prop['status'] = 'active'
        
        # Generate highlights
        prop['highlights'] = generate_highlights(prop)
        
        properties_to_insert.append(prop)
        print(f"  Prepared: {prop['title']}")
    
    # Insert all properties
    print(f"\nInserting {len(properties_to_insert)} properties...")
    result = await db.properties.insert_many(properties_to_insert)
    print(f"✅ Successfully inserted {len(result.inserted_ids)} property listings!")
    
    # Create indexes
    print("\nCreating indexes...")
    await db.properties.create_index([("purpose", 1)])
    await db.properties.create_index([("type", 1)])
    await db.properties.create_index([("location.city", 1)])
    await db.properties.create_index([("location.area", 1)])
    await db.properties.create_index([("price", 1)])
    await db.properties.create_index([("status", 1)])
    await db.properties.create_index([("featured", 1)])
    await db.properties.create_index([("createdAt", -1)])
    print("✅ Indexes created!")
    
    # Print summary
    print("\n" + "="*50)
    print("PROPERTY SEED SUMMARY")
    print("="*50)
    
    # Count by purpose
    rent_count = await db.properties.count_documents({"purpose": "rent"})
    buy_count = await db.properties.count_documents({"purpose": "buy"})
    print(f"For Rent: {rent_count}")
    print(f"For Sale: {buy_count}")
    
    # Count by type
    pipeline = [
        {"$group": {"_id": "$type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    type_counts = await db.properties.aggregate(pipeline).to_list(20)
    print("\nBy Type:")
    for tc in type_counts:
        print(f"  {tc['_id']}: {tc['count']}")
    
    # Count by city
    pipeline = [
        {"$group": {"_id": "$location.city", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    city_counts = await db.properties.aggregate(pipeline).to_list(20)
    print("\nBy City:")
    for cc in city_counts:
        print(f"  {cc['_id']}: {cc['count']}")
    
    print("\n✅ Database seeding complete!")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_properties())
