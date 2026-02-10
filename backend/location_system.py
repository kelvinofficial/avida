"""
Location System for Avida Marketplace

Features:
- Hierarchical location selection: Country → Region → District → City
- Curated location data for 13 countries
- Geospatial queries with MongoDB 2dsphere index
- Admin location management
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from fastapi import APIRouter, HTTPException, Query, Body, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


# =============================================================================
# MODELS
# =============================================================================

class Country(BaseModel):
    code: str
    name: str
    flag: Optional[str] = None


class Region(BaseModel):
    country_code: str
    region_code: str
    name: str
    lat: Optional[float] = None  # Center point latitude for region
    lng: Optional[float] = None  # Center point longitude for region


class District(BaseModel):
    country_code: str
    region_code: str
    district_code: str
    name: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class City(BaseModel):
    country_code: str
    region_code: str
    district_code: str
    city_code: str
    name: str
    lat: float
    lng: float


class LocationSelection(BaseModel):
    country_code: str
    region_code: str
    district_code: str
    city_code: str
    city_name: str
    lat: float
    lng: float
    location_text: str  # "City, District, Region"


# =============================================================================
# SERVICE
# =============================================================================

class LocationService:
    """Service for managing location data"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.countries = db.location_countries
        self.regions = db.location_regions
        self.districts = db.location_districts
        self.cities = db.location_cities
    
    async def initialize_indexes(self):
        """Create indexes for location collections"""
        await self.countries.create_index("code", unique=True)
        await self.regions.create_index([("country_code", 1), ("region_code", 1)], unique=True)
        await self.districts.create_index([("country_code", 1), ("region_code", 1), ("district_code", 1)], unique=True)
        await self.cities.create_index([("country_code", 1), ("region_code", 1), ("district_code", 1), ("city_code", 1)], unique=True)
        await self.cities.create_index([("country_code", 1), ("name", "text")])
        
        # Create 2dsphere index on listings for geospatial queries
        try:
            await self.db.listings.create_index([("geo_point", "2dsphere")])
            logger.info("Created 2dsphere geospatial index on listings")
        except Exception as e:
            logger.warning(f"Could not create geospatial index: {e}")
        
        logger.info("Location indexes created")
    
    # =========================================================================
    # READ OPERATIONS
    # =========================================================================
    
    async def get_countries(self) -> List[Dict]:
        """Get all countries"""
        countries = await self.countries.find({}, {"_id": 0}).sort("name", 1).to_list(100)
        return countries
    
    async def get_regions(self, country_code: str, search: str = None) -> List[Dict]:
        """Get regions for a country"""
        query = {"country_code": country_code.upper()}
        if search:
            query["name"] = {"$regex": search, "$options": "i"}
        
        regions = await self.regions.find(query, {"_id": 0}).sort("name", 1).to_list(500)
        return regions
    
    async def get_districts(self, country_code: str, region_code: str, search: str = None) -> List[Dict]:
        """Get districts for a region"""
        query = {
            "country_code": country_code.upper(),
            "region_code": region_code.upper()
        }
        if search:
            query["name"] = {"$regex": search, "$options": "i"}
        
        districts = await self.districts.find(query, {"_id": 0}).sort("name", 1).to_list(500)
        return districts
    
    async def get_cities(self, country_code: str, region_code: str, district_code: str, search: str = None) -> List[Dict]:
        """Get cities for a district"""
        query = {
            "country_code": country_code.upper(),
            "region_code": region_code.upper(),
            "district_code": district_code.upper()
        }
        if search:
            query["name"] = {"$regex": search, "$options": "i"}
        
        cities = await self.cities.find(query, {"_id": 0}).sort("name", 1).to_list(1000)
        return cities
    
    async def search_cities(self, country_code: str, search: str, limit: int = 20) -> List[Dict]:
        """Search cities by name across all regions/districts"""
        query = {
            "country_code": country_code.upper(),
            "name": {"$regex": search, "$options": "i"}
        }
        
        cities = await self.cities.find(query, {"_id": 0}).sort("name", 1).limit(limit).to_list(limit)
        
        # Enrich with region/district names
        enriched = []
        for city in cities:
            region = await self.regions.find_one({
                "country_code": city["country_code"],
                "region_code": city["region_code"]
            }, {"_id": 0, "name": 1})
            
            district = await self.districts.find_one({
                "country_code": city["country_code"],
                "region_code": city["region_code"],
                "district_code": city["district_code"]
            }, {"_id": 0, "name": 1})
            
            city["region_name"] = region["name"] if region else ""
            city["district_name"] = district["name"] if district else ""
            city["location_text"] = f"{city['name']}, {city.get('district_name', '')}, {city.get('region_name', '')}"
            enriched.append(city)
        
        return enriched
    
    async def get_city_by_code(self, country_code: str, region_code: str, district_code: str, city_code: str) -> Optional[Dict]:
        """Get a specific city by its codes"""
        city = await self.cities.find_one({
            "country_code": country_code.upper(),
            "region_code": region_code.upper(),
            "district_code": district_code.upper(),
            "city_code": city_code.upper()
        }, {"_id": 0})
        
        if city:
            # Get region and district names
            region = await self.regions.find_one({
                "country_code": city["country_code"],
                "region_code": city["region_code"]
            }, {"_id": 0, "name": 1})
            
            district = await self.districts.find_one({
                "country_code": city["country_code"],
                "region_code": city["region_code"],
                "district_code": city["district_code"]
            }, {"_id": 0, "name": 1})
            
            city["region_name"] = region["name"] if region else ""
            city["district_name"] = district["name"] if district else ""
            city["location_text"] = f"{city['name']}, {city.get('district_name', '')}, {city.get('region_name', '')}"
        
        return city
    
    # =========================================================================
    # ADMIN OPERATIONS
    # =========================================================================
    
    async def add_country(self, code: str, name: str, flag: str = None) -> Dict:
        """Add a new country"""
        doc = {
            "code": code.upper(),
            "name": name,
            "flag": flag,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await self.countries.update_one(
            {"code": code.upper()},
            {"$set": doc},
            upsert=True
        )
        return doc
    
    async def add_region(self, country_code: str, region_code: str, name: str, lat: float = None, lng: float = None) -> Dict:
        """Add a new region"""
        doc = {
            "country_code": country_code.upper(),
            "region_code": region_code.upper(),
            "name": name,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        if lat is not None:
            doc["lat"] = lat
        if lng is not None:
            doc["lng"] = lng
        await self.regions.update_one(
            {"country_code": country_code.upper(), "region_code": region_code.upper()},
            {"$set": doc},
            upsert=True
        )
        return doc
    
    async def add_district(self, country_code: str, region_code: str, district_code: str, name: str, lat: float = None, lng: float = None) -> Dict:
        """Add a new district"""
        doc = {
            "country_code": country_code.upper(),
            "region_code": region_code.upper(),
            "district_code": district_code.upper(),
            "name": name,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        if lat is not None:
            doc["lat"] = lat
        if lng is not None:
            doc["lng"] = lng
        await self.districts.update_one(
            {
                "country_code": country_code.upper(),
                "region_code": region_code.upper(),
                "district_code": district_code.upper()
            },
            {"$set": doc},
            upsert=True
        )
        return doc
    
    async def update_district(self, country_code: str, region_code: str, district_code: str, name: str = None, lat: float = None, lng: float = None) -> bool:
        """Update a district's name or coordinates"""
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        if name is not None:
            update_data["name"] = name
        if lat is not None:
            update_data["lat"] = lat
        if lng is not None:
            update_data["lng"] = lng
        
        result = await self.districts.update_one(
            {
                "country_code": country_code.upper(),
                "region_code": region_code.upper(),
                "district_code": district_code.upper()
            },
            {"$set": update_data}
        )
        return result.modified_count > 0 or result.matched_count > 0
    
    async def add_city(
        self,
        country_code: str,
        region_code: str,
        district_code: str,
        city_code: str,
        name: str,
        lat: float,
        lng: float
    ) -> Dict:
        """Add a new city"""
        doc = {
            "country_code": country_code.upper(),
            "region_code": region_code.upper(),
            "district_code": district_code.upper(),
            "city_code": city_code.upper(),
            "name": name,
            "lat": lat,
            "lng": lng,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await self.cities.update_one(
            {
                "country_code": country_code.upper(),
                "region_code": region_code.upper(),
                "district_code": district_code.upper(),
                "city_code": city_code.upper()
            },
            {"$set": doc},
            upsert=True
        )
        return doc
    
    async def update_city_coordinates(self, country_code: str, region_code: str, district_code: str, city_code: str, lat: float, lng: float) -> bool:
        """Update city coordinates"""
        result = await self.cities.update_one(
            {
                "country_code": country_code.upper(),
                "region_code": region_code.upper(),
                "district_code": district_code.upper(),
                "city_code": city_code.upper()
            },
            {"$set": {"lat": lat, "lng": lng, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return result.modified_count > 0
    
    async def delete_city(self, country_code: str, region_code: str, district_code: str, city_code: str) -> bool:
        """Delete a city"""
        result = await self.cities.delete_one({
            "country_code": country_code.upper(),
            "region_code": region_code.upper(),
            "district_code": district_code.upper(),
            "city_code": city_code.upper()
        })
        return result.deleted_count > 0
    
    async def update_country(self, code: str, name: str = None, flag: str = None) -> bool:
        """Update a country"""
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        if name is not None:
            update_data["name"] = name
        if flag is not None:
            update_data["flag"] = flag
        
        result = await self.countries.update_one(
            {"code": code.upper()},
            {"$set": update_data}
        )
        return result.matched_count > 0
    
    async def update_region(self, country_code: str, region_code: str, name: str) -> bool:
        """Update a region"""
        result = await self.regions.update_one(
            {
                "country_code": country_code.upper(),
                "region_code": region_code.upper()
            },
            {"$set": {"name": name, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return result.matched_count > 0
    
    async def update_city(self, country_code: str, region_code: str, district_code: str, city_code: str,
                          name: str = None, lat: float = None, lng: float = None) -> bool:
        """Update a city"""
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        if name is not None:
            update_data["name"] = name
        if lat is not None:
            update_data["lat"] = lat
        if lng is not None:
            update_data["lng"] = lng
        
        result = await self.cities.update_one(
            {
                "country_code": country_code.upper(),
                "region_code": region_code.upper(),
                "district_code": district_code.upper(),
                "city_code": city_code.upper()
            },
            {"$set": update_data}
        )
        return result.matched_count > 0
    
    async def delete_country(self, code: str) -> bool:
        """Delete a country and all its regions, districts, cities"""
        code = code.upper()
        # Delete all cities in this country
        await self.cities.delete_many({"country_code": code})
        # Delete all districts in this country
        await self.districts.delete_many({"country_code": code})
        # Delete all regions in this country
        await self.regions.delete_many({"country_code": code})
        # Delete the country
        result = await self.countries.delete_one({"code": code})
        return result.deleted_count > 0
    
    async def delete_region(self, country_code: str, region_code: str) -> bool:
        """Delete a region and all its districts, cities"""
        country_code = country_code.upper()
        region_code = region_code.upper()
        # Delete all cities in this region
        await self.cities.delete_many({"country_code": country_code, "region_code": region_code})
        # Delete all districts in this region
        await self.districts.delete_many({"country_code": country_code, "region_code": region_code})
        # Delete the region
        result = await self.regions.delete_one({"country_code": country_code, "region_code": region_code})
        return result.deleted_count > 0
    
    async def delete_district(self, country_code: str, region_code: str, district_code: str) -> bool:
        """Delete a district and all its cities"""
        country_code = country_code.upper()
        region_code = region_code.upper()
        district_code = district_code.upper()
        # Delete all cities in this district
        await self.cities.delete_many({
            "country_code": country_code,
            "region_code": region_code,
            "district_code": district_code
        })
        # Delete the district
        result = await self.districts.delete_one({
            "country_code": country_code,
            "region_code": region_code,
            "district_code": district_code
        })
        return result.deleted_count > 0
    
    async def get_location_stats(self) -> Dict:
        """Get location statistics"""
        countries_count = await self.countries.count_documents({})
        regions_count = await self.regions.count_documents({})
        districts_count = await self.districts.count_documents({})
        cities_count = await self.cities.count_documents({})
        
        return {
            "countries": countries_count,
            "regions": regions_count,
            "districts": districts_count,
            "cities": cities_count
        }
    
    async def get_nearby_listings(
        self,
        lat: float,
        lng: float,
        radius_km: float = 50,
        limit: int = 20,
        skip: int = 0,
        category_id: str = None
    ) -> Dict:
        """
        Get listings near a location using MongoDB geospatial query
        Requires 2dsphere index on listings.geo_point
        """
        listings = self.db.listings
        
        # Build query with geospatial filter
        query = {
            "status": "active",
            "geo_point": {
                "$nearSphere": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": [lng, lat]  # GeoJSON is [lng, lat]
                    },
                    "$maxDistance": radius_km * 1000  # Convert km to meters
                }
            }
        }
        
        if category_id:
            query["category_id"] = category_id
        
        # Execute query
        results = await listings.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
        
        # Calculate distances for each result
        for listing in results:
            if listing.get('location_data') and listing['location_data'].get('lat'):
                listing_lat = listing['location_data']['lat']
                listing_lng = listing['location_data']['lng']
                listing['distance_km'] = self._haversine_distance(lat, lng, listing_lat, listing_lng)
            elif listing.get('geo_point'):
                coords = listing['geo_point'].get('coordinates', [])
                if len(coords) >= 2:
                    listing['distance_km'] = self._haversine_distance(lat, lng, coords[1], coords[0])
        
        # Get total count (for pagination)
        total_query = {
            "status": "active",
            "geo_point": {"$exists": True}
        }
        if category_id:
            total_query["category_id"] = category_id
        total = await listings.count_documents(total_query)
        
        return {
            "listings": results,
            "total": total,
            "center": {"lat": lat, "lng": lng},
            "radius_km": radius_km
        }
    
    def _haversine_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance between two points using Haversine formula"""
        import math
        
        R = 6371  # Earth's radius in km
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)
        
        a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return round(R * c, 1)  # Round to 1 decimal place


# =============================================================================
# ROUTER
# =============================================================================

def create_location_router(db: AsyncIOMotorDatabase):
    """Create location API router"""
    router = APIRouter(prefix="/locations", tags=["Locations"])
    service = LocationService(db)
    
    @router.get("/countries")
    async def get_countries():
        """Get all available countries"""
        return await service.get_countries()
    
    @router.get("/regions")
    async def get_regions(
        country_code: str = Query(..., description="Country code (e.g., TZ, KE)"),
        search: str = Query(None, description="Search by name")
    ):
        """Get regions/states for a country"""
        return await service.get_regions(country_code, search)
    
    @router.get("/districts")
    async def get_districts(
        country_code: str = Query(...),
        region_code: str = Query(...),
        search: str = Query(None)
    ):
        """Get districts for a region"""
        return await service.get_districts(country_code, region_code, search)
    
    @router.get("/cities")
    async def get_cities(
        country_code: str = Query(...),
        region_code: str = Query(...),
        district_code: str = Query(...),
        search: str = Query(None)
    ):
        """Get cities for a district"""
        return await service.get_cities(country_code, region_code, district_code, search)
    
    @router.get("/cities/search")
    async def search_cities(
        country_code: str = Query(...),
        q: str = Query(..., min_length=2, description="Search query"),
        limit: int = Query(20, ge=1, le=50)
    ):
        """Search cities by name across all regions"""
        return await service.search_cities(country_code, q, limit)
    
    @router.get("/city")
    async def get_city(
        country_code: str = Query(...),
        region_code: str = Query(...),
        district_code: str = Query(...),
        city_code: str = Query(...)
    ):
        """Get a specific city by codes"""
        city = await service.get_city_by_code(country_code, region_code, district_code, city_code)
        if not city:
            raise HTTPException(status_code=404, detail="City not found")
        return city
    
    @router.get("/stats")
    async def get_stats():
        """Get location statistics"""
        return await service.get_location_stats()
    
    @router.get("/nearby")
    async def get_nearby_listings(
        lat: float = Query(..., description="Latitude"),
        lng: float = Query(..., description="Longitude"),
        radius_km: float = Query(50, ge=1, le=500, description="Search radius in km"),
        limit: int = Query(20, ge=1, le=100),
        page: int = Query(1, ge=1),
        category_id: str = Query(None, description="Filter by category")
    ):
        """Get listings near a location"""
        skip = (page - 1) * limit
        return await service.get_nearby_listings(lat, lng, radius_km, limit, skip, category_id)
    
    return router, service


def create_admin_location_router(db: AsyncIOMotorDatabase, require_admin):
    """Create admin location management router"""
    router = APIRouter(prefix="/locations", tags=["Admin Locations"])
    service = LocationService(db)
    
    # Read endpoints (needed for admin dashboard)
    @router.get("/stats")
    async def get_stats(admin = Depends(require_admin)):
        """Get location statistics"""
        return await service.get_location_stats()
    
    @router.get("/countries")
    async def get_countries(admin = Depends(require_admin)):
        """Get all available countries"""
        return await service.get_countries()
    
    @router.get("/regions")
    async def get_regions(
        country_code: str = Query(..., description="Country code (e.g., TZ, KE)"),
        search: str = Query(None, description="Search by name"),
        admin = Depends(require_admin)
    ):
        """Get regions/states for a country"""
        return await service.get_regions(country_code, search)
    
    @router.get("/districts")
    async def get_districts(
        country_code: str = Query(...),
        region_code: str = Query(...),
        search: str = Query(None),
        admin = Depends(require_admin)
    ):
        """Get districts for a region"""
        return await service.get_districts(country_code, region_code, search)
    
    @router.get("/cities")
    async def get_cities(
        country_code: str = Query(...),
        region_code: str = Query(...),
        district_code: str = Query(...),
        search: str = Query(None),
        admin = Depends(require_admin)
    ):
        """Get cities for a district"""
        return await service.get_cities(country_code, region_code, district_code, search)
    
    # Write endpoints
    @router.post("/countries")
    async def add_country(
        code: str = Body(...),
        name: str = Body(...),
        flag: str = Body(None),
        admin = Depends(require_admin)
    ):
        """Add a new country"""
        return await service.add_country(code, name, flag)
    
    @router.post("/regions")
    async def add_region(
        country_code: str = Body(...),
        region_code: str = Body(...),
        name: str = Body(...),
        lat: Optional[float] = Body(None),
        lng: Optional[float] = Body(None),
        admin = Depends(require_admin)
    ):
        """Add a new region"""
        return await service.add_region(country_code, region_code, name, lat, lng)
    
    @router.put("/regions/coordinates")
    async def update_region_coordinates(
        country_code: str = Body(...),
        region_code: str = Body(...),
        lat: float = Body(...),
        lng: float = Body(...),
        admin = Depends(require_admin)
    ):
        """Update region coordinates"""
        result = await service.regions.update_one(
            {"country_code": country_code.upper(), "region_code": region_code.upper()},
            {"$set": {"lat": lat, "lng": lng}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Region not found")
        return {"success": True}
    
    @router.post("/districts")
    async def add_district(
        country_code: str = Body(...),
        region_code: str = Body(...),
        district_code: str = Body(...),
        name: str = Body(...),
        admin = Depends(require_admin)
    ):
        """Add a new district"""
        return await service.add_district(country_code, region_code, district_code, name)
    
    @router.post("/cities")
    async def add_city(
        country_code: str = Body(...),
        region_code: str = Body(...),
        district_code: str = Body(...),
        city_code: str = Body(...),
        name: str = Body(...),
        lat: float = Body(...),
        lng: float = Body(...),
        admin = Depends(require_admin)
    ):
        """Add a new city"""
        return await service.add_city(country_code, region_code, district_code, city_code, name, lat, lng)
    
    @router.put("/cities/coordinates")
    async def update_city_coordinates(
        country_code: str = Body(...),
        region_code: str = Body(...),
        district_code: str = Body(...),
        city_code: str = Body(...),
        lat: float = Body(...),
        lng: float = Body(...),
        admin = Depends(require_admin)
    ):
        """Update city coordinates"""
        success = await service.update_city_coordinates(country_code, region_code, district_code, city_code, lat, lng)
        if not success:
            raise HTTPException(status_code=404, detail="City not found")
        return {"success": True}
    
    @router.delete("/cities")
    async def delete_city(
        country_code: str = Query(...),
        region_code: str = Query(...),
        district_code: str = Query(...),
        city_code: str = Query(...),
        admin = Depends(require_admin)
    ):
        """Delete a city"""
        success = await service.delete_city(country_code, region_code, district_code, city_code)
        if not success:
            raise HTTPException(status_code=404, detail="City not found")
        return {"success": True}
    
    # Update endpoints
    @router.put("/countries/{code}")
    async def update_country(
        code: str,
        name: str = Body(None),
        flag: str = Body(None),
        admin = Depends(require_admin)
    ):
        """Update a country"""
        success = await service.update_country(code, name, flag)
        if not success:
            raise HTTPException(status_code=404, detail="Country not found")
        return {"success": True}
    
    @router.put("/regions/{country_code}/{region_code}")
    async def update_region(
        country_code: str,
        region_code: str,
        name: str = Body(...),
        admin = Depends(require_admin)
    ):
        """Update a region"""
        success = await service.update_region(country_code, region_code, name)
        if not success:
            raise HTTPException(status_code=404, detail="Region not found")
        return {"success": True}
    
    @router.put("/districts/{country_code}/{region_code}/{district_code}")
    async def update_district(
        country_code: str,
        region_code: str,
        district_code: str,
        name: str = Body(...),
        admin = Depends(require_admin)
    ):
        """Update a district"""
        success = await service.update_district(country_code, region_code, district_code, name)
        if not success:
            raise HTTPException(status_code=404, detail="District not found")
        return {"success": True}
    
    @router.put("/cities/{country_code}/{region_code}/{district_code}/{city_code}")
    async def update_city(
        country_code: str,
        region_code: str,
        district_code: str,
        city_code: str,
        name: str = Body(None),
        lat: float = Body(None),
        lng: float = Body(None),
        admin = Depends(require_admin)
    ):
        """Update a city"""
        success = await service.update_city(country_code, region_code, district_code, city_code, name, lat, lng)
        if not success:
            raise HTTPException(status_code=404, detail="City not found")
        return {"success": True}
    
    # Delete endpoints
    @router.delete("/countries/{code}")
    async def delete_country(
        code: str,
        admin = Depends(require_admin)
    ):
        """Delete a country and all its regions, districts, cities"""
        success = await service.delete_country(code)
        if not success:
            raise HTTPException(status_code=404, detail="Country not found")
        return {"success": True}
    
    @router.delete("/regions/{country_code}/{region_code}")
    async def delete_region(
        country_code: str,
        region_code: str,
        admin = Depends(require_admin)
    ):
        """Delete a region and all its districts, cities"""
        success = await service.delete_region(country_code, region_code)
        if not success:
            raise HTTPException(status_code=404, detail="Region not found")
        return {"success": True}
    
    @router.delete("/districts/{country_code}/{region_code}/{district_code}")
    async def delete_district(
        country_code: str,
        region_code: str,
        district_code: str,
        admin = Depends(require_admin)
    ):
        """Delete a district and all its cities"""
        success = await service.delete_district(country_code, region_code, district_code)
        if not success:
            raise HTTPException(status_code=404, detail="District not found")
        return {"success": True}
    
    return router, service
