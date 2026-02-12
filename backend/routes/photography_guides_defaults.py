"""
Default photography guides for all categories
These are seeded via the /photography-guides/seed endpoint
"""

DEFAULT_PHOTOGRAPHY_GUIDES = {
    "auto_vehicles": [
        {"icon": "car-outline", "title": "Exterior Shots", "description": "Take photos from all 4 corners, plus front and back"},
        {"icon": "speedometer-outline", "title": "Dashboard & Mileage", "description": "Show odometer clearly with engine running"},
        {"icon": "construct-outline", "title": "Engine Bay", "description": "Clean engine bay photo shows good maintenance"},
        {"icon": "warning-outline", "title": "Any Damage", "description": "Be transparent - show scratches, dents honestly"},
    ],
    "properties": [
        {"icon": "home-outline", "title": "Wide Angles", "description": "Use corners of rooms to capture full space"},
        {"icon": "sunny-outline", "title": "Natural Light", "description": "Shoot during daytime with curtains open"},
        {"icon": "image-outline", "title": "Key Features", "description": "Highlight kitchen, bathrooms, views, balcony"},
        {"icon": "map-outline", "title": "Neighborhood", "description": "Include street view, nearby amenities"},
    ],
    "electronics": [
        {"icon": "phone-portrait-outline", "title": "Clean Background", "description": "Use plain white/neutral background"},
        {"icon": "flash-outline", "title": "Good Lighting", "description": "Avoid harsh shadows, show true colors"},
        {"icon": "apps-outline", "title": "Screen On", "description": "For devices, show working screen"},
        {"icon": "cube-outline", "title": "Box & Accessories", "description": "Include original packaging, chargers, manuals"},
    ],
    "phones_tablets": [
        {"icon": "phone-portrait-outline", "title": "Screen Condition", "description": "Show screen clearly - any scratches or cracks"},
        {"icon": "camera-outline", "title": "Camera Quality", "description": "Include a sample photo taken with the device"},
        {"icon": "cube-outline", "title": "All Angles", "description": "Show front, back, sides, and corners"},
        {"icon": "gift-outline", "title": "Accessories", "description": "Photo all included items - case, charger, box"},
    ],
    "home_furniture": [
        {"icon": "resize-outline", "title": "Scale Reference", "description": "Include common object for size comparison"},
        {"icon": "color-palette-outline", "title": "True Colors", "description": "Use natural light to show actual color"},
        {"icon": "eye-outline", "title": "Close-ups", "description": "Show material texture, patterns, details"},
        {"icon": "alert-circle-outline", "title": "Wear & Tear", "description": "Be honest about any scratches or stains"},
    ],
    "fashion_beauty": [
        {"icon": "shirt-outline", "title": "Flat Lay or Hanger", "description": "Show full garment clearly laid out"},
        {"icon": "body-outline", "title": "Worn Photos", "description": "If possible, show item being worn"},
        {"icon": "pricetag-outline", "title": "Tags & Labels", "description": "Include brand tags, size labels, care instructions"},
        {"icon": "search-outline", "title": "Detail Shots", "description": "Show stitching, buttons, zippers, fabric texture"},
    ],
    "jobs_services": [
        {"icon": "briefcase-outline", "title": "Professional Photo", "description": "Use a clear, professional headshot"},
        {"icon": "albums-outline", "title": "Portfolio", "description": "Show examples of your work or projects"},
        {"icon": "ribbon-outline", "title": "Certifications", "description": "Include photos of relevant certificates"},
        {"icon": "build-outline", "title": "Equipment", "description": "For trades, show your professional tools"},
    ],
    "pets": [
        {"icon": "paw-outline", "title": "Natural Behavior", "description": "Capture pet in natural, relaxed state"},
        {"icon": "sunny-outline", "title": "Good Lighting", "description": "Natural light shows true coat color"},
        {"icon": "camera-outline", "title": "Eye Level", "description": "Get down to pet's level for best shots"},
        {"icon": "heart-outline", "title": "Personality", "description": "Show pet's character - playing, sleeping, curious"},
    ],
    "sports_hobbies": [
        {"icon": "fitness-outline", "title": "Full Item View", "description": "Show complete item with all parts visible"},
        {"icon": "resize-outline", "title": "Size Reference", "description": "Include ruler or common object for scale"},
        {"icon": "checkmark-circle-outline", "title": "Working Condition", "description": "Demonstrate item works if applicable"},
        {"icon": "cube-outline", "title": "Accessories", "description": "Show all included accessories and extras"},
    ],
    "kids_baby": [
        {"icon": "sparkles-outline", "title": "Clean Items", "description": "Clean and sanitize items before photos"},
        {"icon": "shield-checkmark-outline", "title": "Safety Labels", "description": "Show safety certifications and age recommendations"},
        {"icon": "images-outline", "title": "Multiple Angles", "description": "Show all sides and any assembly details"},
        {"icon": "alert-outline", "title": "Wear Signs", "description": "Be transparent about any signs of use"},
    ],
    "health_medical": [
        {"icon": "medkit-outline", "title": "Product Details", "description": "Clear shot of product name and description"},
        {"icon": "calendar-outline", "title": "Expiry Dates", "description": "Show expiration date if applicable"},
        {"icon": "document-text-outline", "title": "Instructions", "description": "Include any instruction sheets or manuals"},
        {"icon": "shield-checkmark-outline", "title": "Certifications", "description": "Show any medical certifications or approvals"},
    ],
    "agriculture": [
        {"icon": "leaf-outline", "title": "Item Condition", "description": "Show current state of equipment/produce"},
        {"icon": "resize-outline", "title": "Scale", "description": "Include size reference for large items"},
        {"icon": "construct-outline", "title": "Working Parts", "description": "For machinery, show key components"},
        {"icon": "location-outline", "title": "Environment", "description": "Show storage conditions or growing environment"},
    ],
    "friendship_dating": [
        {"icon": "happy-outline", "title": "Genuine Smile", "description": "Use recent photos that show the real you"},
        {"icon": "people-outline", "title": "Activity Shots", "description": "Include photos doing hobbies you mentioned"},
        {"icon": "camera-outline", "title": "Quality Photos", "description": "Clear, well-lit photos make better impressions"},
        {"icon": "shield-checkmark-outline", "title": "Stay Safe", "description": "Avoid photos that reveal your exact location"},
    ],
    "community": [
        {"icon": "calendar-outline", "title": "Event Details", "description": "Show venue, date, and time clearly"},
        {"icon": "location-outline", "title": "Location", "description": "Include map or address if relevant"},
        {"icon": "people-outline", "title": "Past Events", "description": "Show photos from previous gatherings"},
        {"icon": "information-circle-outline", "title": "Contact Info", "description": "Make it easy to get more information"},
    ],
    "default": [
        {"icon": "camera-outline", "title": "Good Lighting", "description": "Use natural light when possible"},
        {"icon": "images-outline", "title": "Multiple Angles", "description": "Show item from different perspectives"},
        {"icon": "eye-outline", "title": "Show Details", "description": "Include close-ups of important features"},
        {"icon": "alert-circle-outline", "title": "Be Honest", "description": "Show any defects or wear clearly"},
    ],
}
