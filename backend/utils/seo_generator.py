"""
SEO Auto-Generation Utilities
Generates meta descriptions and SEO data for listings automatically
"""

from typing import Dict, Optional, Any
import re


def generate_meta_description(
    title: str,
    price: float,
    currency: str = "EUR",
    location: str = None,
    location_data: Dict[str, Any] = None,
    condition: str = None,
    category_name: str = None,
    max_length: int = 160
) -> str:
    """
    Auto-generate a meta description for a listing based on its attributes.
    
    Args:
        title: Listing title
        price: Listing price
        currency: Currency code (default EUR)
        location: Legacy location text
        location_data: Structured location with city, district, region, country
        condition: Item condition (new, used, etc.)
        category_name: Category name for context
        max_length: Maximum description length (default 160 for SEO)
    
    Returns:
        Generated meta description string
    """
    # Format price
    currency_symbols = {
        "EUR": "€",
        "USD": "$",
        "GBP": "£",
        "KES": "KSh",
        "NGN": "₦",
    }
    symbol = currency_symbols.get(currency, currency + " ")
    formatted_price = f"{symbol}{price:,.0f}"
    
    # Build location string with full hierarchy
    location_parts = []
    if location_data:
        if location_data.get("city_name"):
            location_parts.append(location_data["city_name"])
        if location_data.get("district_name"):
            location_parts.append(location_data["district_name"])
        if location_data.get("region_name"):
            location_parts.append(location_data["region_name"])
        if location_data.get("country_name"):
            location_parts.append(location_data["country_name"])
    
    # Fall back to legacy location
    if not location_parts and location:
        location_parts = [loc.strip() for loc in location.split(",") if loc.strip()]
    
    location_str = ", ".join(location_parts[:3]) if location_parts else ""
    
    # Build condition text
    condition_text = ""
    if condition:
        condition_map = {
            "new": "Brand new",
            "like_new": "Like new",
            "used": "Used",
            "good": "Good condition",
            "fair": "Fair condition",
            "refurbished": "Refurbished"
        }
        condition_text = condition_map.get(condition.lower(), condition.capitalize())
    
    # Generate description variants based on available data
    if location_str and condition_text:
        description = f"{title} for {formatted_price}. {condition_text}. Available in {location_str}. Contact seller now!"
    elif location_str:
        description = f"{title} for {formatted_price}. Available in {location_str}. Contact the seller to buy today!"
    elif condition_text:
        description = f"{title} for {formatted_price}. {condition_text}. Browse similar items on Avida Marketplace."
    else:
        description = f"{title} for {formatted_price}. Find great deals on Avida Marketplace."
    
    # Add category context if space allows
    if category_name and len(description) < max_length - 30:
        category_suffix = f" Shop {category_name.lower()} locally."
        if len(description) + len(category_suffix) <= max_length:
            description += category_suffix
    
    # Truncate if too long
    if len(description) > max_length:
        description = description[:max_length - 3].rsplit(" ", 1)[0] + "..."
    
    return description


def generate_seo_keywords(
    title: str,
    category_name: str = None,
    subcategory: str = None,
    location_data: Dict[str, Any] = None,
    attributes: Dict[str, Any] = None
) -> list:
    """
    Generate SEO keywords for a listing.
    
    Args:
        title: Listing title
        category_name: Category name
        subcategory: Subcategory name
        location_data: Structured location data
        attributes: Listing attributes (brand, model, etc.)
    
    Returns:
        List of keyword strings
    """
    keywords = []
    
    # Extract keywords from title (filter common words)
    stop_words = {"a", "an", "the", "is", "are", "for", "and", "or", "in", "on", "at", "to", "with"}
    title_words = re.findall(r'\b\w+\b', title.lower())
    keywords.extend([w for w in title_words if w not in stop_words and len(w) > 2])
    
    # Add category and subcategory
    if category_name:
        keywords.append(category_name.lower())
    if subcategory:
        keywords.append(subcategory.lower())
    
    # Add location keywords
    if location_data:
        if location_data.get("city_name"):
            keywords.append(location_data["city_name"].lower())
        if location_data.get("region_name"):
            keywords.append(location_data["region_name"].lower())
        if location_data.get("country_name"):
            keywords.append(location_data["country_name"].lower())
    
    # Add attribute values as keywords
    if attributes:
        for key, value in attributes.items():
            if isinstance(value, str) and len(value) > 2:
                keywords.append(value.lower())
    
    # Add common marketplace keywords
    keywords.extend(["buy", "sell", "marketplace", "local"])
    
    # Remove duplicates while preserving order
    seen = set()
    unique_keywords = []
    for k in keywords:
        if k not in seen:
            seen.add(k)
            unique_keywords.append(k)
    
    return unique_keywords[:15]  # Limit to 15 keywords


def generate_og_title(title: str, price: float, currency: str = "EUR") -> str:
    """
    Generate an Open Graph title optimized for social sharing.
    
    Args:
        title: Listing title
        price: Listing price
        currency: Currency code
    
    Returns:
        OG title string
    """
    currency_symbols = {
        "EUR": "€",
        "USD": "$",
        "GBP": "£",
        "KES": "KSh",
        "NGN": "₦",
    }
    symbol = currency_symbols.get(currency, currency + " ")
    formatted_price = f"{symbol}{price:,.0f}"
    
    # Keep title under 60 chars for optimal social display
    max_title_len = 45
    if len(title) > max_title_len:
        title = title[:max_title_len - 3].rsplit(" ", 1)[0] + "..."
    
    return f"{title} - {formatted_price}"


def generate_full_seo_data(
    listing_id: str,
    title: str,
    description: str,
    price: float,
    currency: str = "EUR",
    location: str = None,
    location_data: Dict[str, Any] = None,
    condition: str = None,
    category_name: str = None,
    subcategory: str = None,
    images: list = None,
    attributes: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Generate complete SEO data package for a listing.
    
    Returns:
        Dict with all SEO fields: meta_title, meta_description, og_title, 
        og_description, og_image, keywords, canonical_url
    """
    # Get first image for OG
    og_image = None
    if images and len(images) > 0:
        img = images[0]
        # Handle both URL and base64 images
        if img.startswith("http"):
            og_image = img
        elif img.startswith("data:"):
            og_image = img
    
    # Generate meta description
    meta_description = generate_meta_description(
        title=title,
        price=price,
        currency=currency,
        location=location,
        location_data=location_data,
        condition=condition,
        category_name=category_name
    )
    
    # Generate keywords
    keywords = generate_seo_keywords(
        title=title,
        category_name=category_name,
        subcategory=subcategory,
        location_data=location_data,
        attributes=attributes
    )
    
    # Generate OG title
    og_title = generate_og_title(title, price, currency)
    
    # OG description (shorter than meta, ~100 chars for social)
    og_description = description[:100] + "..." if len(description) > 100 else description
    if location_data and location_data.get("city_name"):
        location_suffix = f" In {location_data['city_name']}."
        if len(og_description) + len(location_suffix) <= 120:
            og_description += location_suffix
    
    return {
        "meta_title": f"{title} | Avida Marketplace",
        "meta_description": meta_description,
        "og_title": og_title,
        "og_description": og_description,
        "og_image": og_image,
        "keywords": keywords,
        "canonical_url": f"/listing/{listing_id}",
    }
