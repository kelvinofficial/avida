"""
Admin Locations Routes
Handles admin location management (CRUD for countries, regions, districts, cities).
Includes geocoding, boundary lookup, and batch import functionality.
"""

from fastapi import APIRouter, HTTPException, Request, Query, Body
from datetime import datetime, timezone
import httpx
import asyncio
import logging

logger = logging.getLogger(__name__)


def create_admin_locations_router(db, require_auth):
    """Create admin locations router with dependency injection."""
    router = APIRouter(prefix="/admin/locations", tags=["admin-locations"])
    
    # =========================================================================
    # READ OPERATIONS
    # =========================================================================
    
    @router.get("/stats")
    async def admin_location_stats(request: Request):
        """Get location statistics for admin dashboard"""
        from location_system import LocationService
        service = LocationService(db)
        return await service.get_location_stats()

    @router.get("/countries")
    async def admin_location_countries(request: Request):
        """Get all countries for admin dashboard"""
        from location_system import LocationService
        service = LocationService(db)
        return await service.get_countries()

    @router.get("/regions")
    async def admin_location_regions(
        request: Request, 
        country_code: str = Query(...),
        search: str = Query(None)
    ):
        """Get regions for admin dashboard"""
        from location_system import LocationService
        service = LocationService(db)
        return await service.get_regions(country_code, search)

    @router.get("/districts")
    async def admin_location_districts(
        request: Request,
        country_code: str = Query(...),
        region_code: str = Query(...),
        search: str = Query(None)
    ):
        """Get districts for admin dashboard"""
        from location_system import LocationService
        service = LocationService(db)
        return await service.get_districts(country_code, region_code, search)

    @router.get("/cities")
    async def admin_location_cities(
        request: Request,
        country_code: str = Query(...),
        region_code: str = Query(...),
        district_code: str = Query(...),
        search: str = Query(None)
    ):
        """Get cities for admin dashboard"""
        from location_system import LocationService
        service = LocationService(db)
        return await service.get_cities(country_code, region_code, district_code, search)

    # =========================================================================
    # CREATE OPERATIONS
    # =========================================================================

    @router.post("/countries")
    async def admin_add_country(
        request: Request,
        code: str = Body(...),
        name: str = Body(...),
        flag: str = Body(None)
    ):
        """Add a new country"""
        from location_system import LocationService
        service = LocationService(db)
        return await service.add_country(code, name, flag)

    @router.post("/regions")
    async def admin_add_region(
        request: Request,
        country_code: str = Body(...),
        region_code: str = Body(...),
        name: str = Body(...)
    ):
        """Add a new region"""
        from location_system import LocationService
        service = LocationService(db)
        return await service.add_region(country_code, region_code, name)

    @router.post("/districts")
    async def admin_add_district(
        request: Request,
        country_code: str = Body(...),
        region_code: str = Body(...),
        district_code: str = Body(...),
        name: str = Body(...)
    ):
        """Add a new district"""
        from location_system import LocationService
        service = LocationService(db)
        return await service.add_district(country_code, region_code, district_code, name)

    @router.post("/cities")
    async def admin_add_city(
        request: Request,
        country_code: str = Body(...),
        region_code: str = Body(...),
        district_code: str = Body(...),
        city_code: str = Body(...),
        name: str = Body(...),
        lat: float = Body(...),
        lng: float = Body(...)
    ):
        """Add a new city"""
        from location_system import LocationService
        service = LocationService(db)
        return await service.add_city(country_code, region_code, district_code, city_code, name, lat, lng)

    # =========================================================================
    # UPDATE OPERATIONS
    # =========================================================================

    @router.put("/countries/{code}")
    async def admin_update_country(
        code: str,
        request: Request,
        name: str = Body(None),
        flag: str = Body(None)
    ):
        """Update a country"""
        from location_system import LocationService
        service = LocationService(db)
        success = await service.update_country(code, name, flag)
        if not success:
            raise HTTPException(status_code=404, detail="Country not found")
        return {"success": True}

    @router.put("/districts")
    async def admin_update_district(
        request: Request,
        country_code: str = Body(...),
        region_code: str = Body(...),
        district_code: str = Body(...),
        name: str = Body(None),
        lat: float = Body(None),
        lng: float = Body(None)
    ):
        """Update a district's name or coordinates"""
        from location_system import LocationService
        service = LocationService(db)
        success = await service.update_district(country_code, region_code, district_code, name, lat, lng)
        if not success:
            raise HTTPException(status_code=404, detail="District not found")
        return {"success": True}

    @router.put("/cities/{city_code}")
    async def admin_update_city(
        city_code: str,
        request: Request,
        country_code: str = Body(...),
        region_code: str = Body(...),
        district_code: str = Body(...),
        name: str = Body(None),
        lat: float = Body(None),
        lng: float = Body(None)
    ):
        """Update a city's coordinates or name"""
        from location_system import LocationService
        service = LocationService(db)
        success = await service.update_city(country_code, region_code, district_code, city_code, name, lat, lng)
        if not success:
            raise HTTPException(status_code=404, detail="City not found")
        return {"success": True}

    # =========================================================================
    # DELETE OPERATIONS
    # =========================================================================

    @router.delete("/countries/{code}")
    async def admin_delete_country(code: str, request: Request):
        """Delete a country"""
        from location_system import LocationService
        service = LocationService(db)
        success = await service.delete_country(code)
        if not success:
            raise HTTPException(status_code=404, detail="Country not found")
        return {"success": True}

    @router.delete("/regions")
    async def admin_delete_region(
        request: Request,
        country_code: str = Query(...),
        region_code: str = Query(...)
    ):
        """Delete a region"""
        from location_system import LocationService
        service = LocationService(db)
        success = await service.delete_region(country_code, region_code)
        if not success:
            raise HTTPException(status_code=404, detail="Region not found")
        return {"success": True}

    @router.delete("/districts")
    async def admin_delete_district(
        request: Request,
        country_code: str = Query(...),
        region_code: str = Query(...),
        district_code: str = Query(...)
    ):
        """Delete a district"""
        from location_system import LocationService
        service = LocationService(db)
        success = await service.delete_district(country_code, region_code, district_code)
        if not success:
            raise HTTPException(status_code=404, detail="District not found")
        return {"success": True}

    @router.delete("/cities")
    async def admin_delete_city(
        request: Request,
        country_code: str = Query(...),
        region_code: str = Query(...),
        district_code: str = Query(...),
        city_code: str = Query(...)
    ):
        """Delete a city"""
        from location_system import LocationService
        service = LocationService(db)
        success = await service.delete_city(country_code, region_code, district_code, city_code)
        if not success:
            raise HTTPException(status_code=404, detail="City not found")
        return {"success": True}

    # =========================================================================
    # GEOCODING OPERATIONS
    # =========================================================================

    @router.get("/geocode")
    async def admin_geocode_search(
        request: Request,
        query: str = Query(..., description="Address or place name to search"),
        limit: int = Query(5, description="Max results to return")
    ):
        """Search for places using OpenStreetMap Nominatim geocoding"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={
                        "q": query,
                        "format": "json",
                        "limit": limit,
                        "addressdetails": 1
                    },
                    headers={
                        "User-Agent": "AvidaMarketplace/1.0 (admin location manager)"
                    }
                )
                results = response.json()
                return [
                    {
                        "display_name": r.get("display_name"),
                        "lat": float(r.get("lat", 0)),
                        "lng": float(r.get("lon", 0)),
                        "type": r.get("type"),
                        "address": r.get("address", {})
                    }
                    for r in results
                ]
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Geocoding failed: {str(e)}")

    @router.get("/reverse-geocode")
    async def admin_reverse_geocode(
        request: Request,
        lat: float = Query(..., description="Latitude"),
        lng: float = Query(..., description="Longitude")
    ):
        """Reverse geocode coordinates to get address components"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://nominatim.openstreetmap.org/reverse",
                    params={
                        "lat": lat,
                        "lon": lng,
                        "format": "json",
                        "addressdetails": 1,
                        "zoom": 10
                    },
                    headers={
                        "User-Agent": "AvidaMarketplace/1.0 (admin location manager)"
                    }
                )
                result = response.json()
                
                if "error" in result:
                    return {
                        "found": False,
                        "error": result.get("error", "Location not found")
                    }
                
                address = result.get("address", {})
                
                return {
                    "found": True,
                    "display_name": result.get("display_name"),
                    "osm_type": result.get("osm_type"),
                    "osm_id": result.get("osm_id"),
                    "lat": float(result.get("lat", lat)),
                    "lng": float(result.get("lon", lng)),
                    "address": {
                        "country": address.get("country"),
                        "country_code": address.get("country_code", "").upper(),
                        "state": address.get("state") or address.get("province") or address.get("region"),
                        "county": address.get("county") or address.get("state_district"),
                        "city": address.get("city") or address.get("town") or address.get("village") or address.get("municipality"),
                        "suburb": address.get("suburb") or address.get("neighbourhood"),
                        "road": address.get("road"),
                        "postcode": address.get("postcode")
                    }
                }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Reverse geocoding failed: {str(e)}")

    @router.get("/suggest-coordinates")
    async def admin_suggest_coordinates(
        request: Request,
        name: str = Query(..., description="Location name to search"),
        country: str = Query(None, description="Country name for context"),
        region: str = Query(None, description="Region name for context")
    ):
        """Suggest coordinates for a location name"""
        parts = [name]
        if region:
            parts.append(region)
        if country:
            parts.append(country)
        
        search_query = ", ".join(parts)
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={
                        "q": search_query,
                        "format": "json",
                        "limit": 5,
                        "addressdetails": 1
                    },
                    headers={
                        "User-Agent": "AvidaMarketplace/1.0 (admin location manager)"
                    }
                )
                results = response.json()
                
                suggestions = []
                for r in results:
                    address = r.get("address", {})
                    suggestions.append({
                        "display_name": r.get("display_name"),
                        "lat": float(r.get("lat", 0)),
                        "lng": float(r.get("lon", 0)),
                        "type": r.get("type"),
                        "importance": r.get("importance", 0),
                        "matched_country": address.get("country"),
                        "matched_state": address.get("state") or address.get("province"),
                        "matched_county": address.get("county") or address.get("state_district")
                    })
                
                return {
                    "query": search_query,
                    "suggestions": suggestions
                }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Coordinate suggestion failed: {str(e)}")

    # =========================================================================
    # BATCH OPERATIONS
    # =========================================================================

    @router.post("/batch-import")
    async def admin_batch_import_locations(
        request: Request,
        body: dict = Body(..., description="GeoJSON FeatureCollection to import")
    ):
        """Batch import cities from GeoJSON format"""
        from location_system import LocationService
        service = LocationService(db)
        
        geojson = body.get("geojson", body)
        
        if geojson.get("type") != "FeatureCollection":
            raise HTTPException(status_code=400, detail="Invalid GeoJSON: must be FeatureCollection")
        
        features = geojson.get("features", [])
        imported = []
        errors = []
        
        for i, feature in enumerate(features):
            try:
                if feature.get("type") != "Feature":
                    errors.append({"index": i, "error": "Not a Feature"})
                    continue
                
                geometry = feature.get("geometry", {})
                properties = feature.get("properties", {})
                
                if geometry.get("type") != "Point":
                    errors.append({"index": i, "error": "Only Point geometries supported"})
                    continue
                
                coords = geometry.get("coordinates", [])
                if len(coords) < 2:
                    errors.append({"index": i, "error": "Invalid coordinates"})
                    continue
                
                lng, lat = coords[0], coords[1]
                
                country_code = properties.get("country_code")
                region_code = properties.get("region_code")
                district_code = properties.get("district_code")
                city_code = properties.get("city_code") or properties.get("code")
                name = properties.get("name")
                
                if not all([country_code, region_code, district_code, city_code, name]):
                    errors.append({
                        "index": i, 
                        "error": "Missing required properties: country_code, region_code, district_code, city_code/code, name"
                    })
                    continue
                
                await service.add_city(country_code, region_code, district_code, city_code, name, lat, lng)
                imported.append({"city_code": city_code, "name": name, "lat": lat, "lng": lng})
                
            except Exception as e:
                errors.append({"index": i, "error": str(e)})
        
        return {
            "success": True,
            "imported_count": len(imported),
            "error_count": len(errors),
            "imported": imported,
            "errors": errors
        }

    @router.post("/bulk-update-coordinates")
    async def admin_bulk_update_coordinates(request: Request):
        """Bulk update coordinates for districts/cities without coordinates using Nominatim"""
        from location_system import LocationService
        service = LocationService(db)
        
        updated = []
        errors = []
        
        countries = await service.get_countries()
        
        for country in countries:
            try:
                regions = await service.get_regions(country['code'])
                for region in regions:
                    try:
                        districts = await service.get_districts(country['code'], region['region_code'])
                        for district in districts:
                            if district.get('lat') and district.get('lng'):
                                continue
                            
                            search_query = f"{district['name']}, {region['name']}, {country['name']}"
                            try:
                                async with httpx.AsyncClient(timeout=10.0) as client:
                                    response = await client.get(
                                        "https://nominatim.openstreetmap.org/search",
                                        params={"q": search_query, "format": "json", "limit": 1},
                                        headers={"User-Agent": "AvidaMarketplace/1.0"}
                                    )
                                    results = response.json()
                                    
                                    if results:
                                        lat = float(results[0]['lat'])
                                        lng = float(results[0]['lon'])
                                        
                                        await service.update_district(
                                            country['code'], 
                                            region['region_code'],
                                            district['district_code'],
                                            lat=lat, lng=lng
                                        )
                                        updated.append({
                                            "type": "district",
                                            "name": district['name'],
                                            "lat": lat,
                                            "lng": lng,
                                            "search_query": search_query
                                        })
                                    else:
                                        errors.append({
                                            "type": "district",
                                            "name": district['name'],
                                            "error": "No results found"
                                        })
                            except Exception as e:
                                errors.append({
                                    "type": "district",
                                    "name": district['name'],
                                    "error": str(e)
                                })
                            
                            await asyncio.sleep(1)
                            
                    except Exception as e:
                        errors.append({"region": region['name'], "error": str(e)})
            except Exception as e:
                errors.append({"country": country['code'], "error": str(e)})
        
        return {
            "success": True,
            "updated_count": len(updated),
            "error_count": len(errors),
            "updated": updated,
            "errors": errors[:20]
        }

    @router.get("/export")
    async def admin_export_locations(
        request: Request,
        level: str = Query("cities", description="Export level: cities, districts, or all"),
        country_code: str = Query(None, description="Filter by country code"),
        region_code: str = Query(None, description="Filter by region code"),
        district_code: str = Query(None, description="Filter by district code")
    ):
        """Export locations as GeoJSON FeatureCollection"""
        from location_system import LocationService
        service = LocationService(db)
        
        features = []
        
        if level in ["cities", "all"]:
            if country_code and region_code and district_code:
                cities = await service.get_cities(country_code, region_code, district_code)
            elif country_code and region_code:
                cities = []
                districts = await service.get_districts(country_code, region_code)
                for d in districts:
                    try:
                        d_cities = await service.get_cities(country_code, region_code, d['district_code'])
                        for c in d_cities:
                            c['district_code'] = d['district_code']
                            cities.append(c)
                    except:
                        pass
            elif country_code:
                cities = []
                regions = await service.get_regions(country_code)
                for r in regions:
                    try:
                        districts = await service.get_districts(country_code, r['region_code'])
                        for d in districts:
                            try:
                                d_cities = await service.get_cities(country_code, r['region_code'], d['district_code'])
                                for c in d_cities:
                                    c['region_code'] = r['region_code']
                                    c['district_code'] = d['district_code']
                                    cities.append(c)
                            except:
                                pass
                    except:
                        pass
            else:
                cities = []
            
            for city in cities:
                if city.get('lat') and city.get('lng'):
                    features.append({
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [city['lng'], city['lat']]
                        },
                        "properties": {
                            "name": city['name'],
                            "city_code": city.get('city_code'),
                            "country_code": country_code,
                            "region_code": city.get('region_code', region_code),
                            "district_code": city.get('district_code', district_code),
                            "type": "city"
                        }
                    })
        
        if level in ["districts", "all"]:
            if country_code and region_code:
                districts = await service.get_districts(country_code, region_code)
            elif country_code:
                districts = []
                regions = await service.get_regions(country_code)
                for r in regions:
                    try:
                        r_districts = await service.get_districts(country_code, r['region_code'])
                        for d in r_districts:
                            d['region_code'] = r['region_code']
                            districts.append(d)
                    except:
                        pass
            else:
                districts = []
            
            for district in districts:
                if district.get('lat') and district.get('lng'):
                    features.append({
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [district['lng'], district['lat']]
                        },
                        "properties": {
                            "name": district['name'],
                            "district_code": district['district_code'],
                            "country_code": country_code,
                            "region_code": district.get('region_code', region_code),
                            "type": "district"
                        }
                    })
        
        return {
            "type": "FeatureCollection",
            "features": features,
            "properties": {
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "level": level,
                "filters": {
                    "country_code": country_code,
                    "region_code": region_code,
                    "district_code": district_code
                },
                "count": len(features)
            }
        }

    @router.get("/listing-density")
    async def admin_get_listing_density(
        request: Request,
        country_code: str = Query(..., description="Country code to analyze"),
        level: str = Query("district", description="Aggregation level: region, district, or city")
    ):
        """Get listing density by location for heat map visualization"""
        from location_system import LocationService
        service = LocationService(db)
        
        density_data = []
        
        if level == "region":
            regions = await service.get_regions(country_code)
            for region in regions:
                listing_count = await db.listings.count_documents({
                    "location.country_code": country_code,
                    "location.region_code": region['region_code'],
                    "status": "active"
                })
                
                if region.get('lat') and region.get('lng'):
                    density_data.append({
                        "name": region['name'],
                        "code": region['region_code'],
                        "lat": region['lat'],
                        "lng": region['lng'],
                        "listing_count": listing_count,
                        "level": "region"
                    })
        
        elif level == "district":
            regions = await service.get_regions(country_code)
            for region in regions:
                districts = await service.get_districts(country_code, region['region_code'])
                for district in districts:
                    listing_count = await db.listings.count_documents({
                        "location.country_code": country_code,
                        "location.region_code": region['region_code'],
                        "location.district_code": district['district_code'],
                        "status": "active"
                    })
                    
                    if district.get('lat') and district.get('lng'):
                        density_data.append({
                            "name": district['name'],
                            "code": district['district_code'],
                            "region": region['name'],
                            "lat": district['lat'],
                            "lng": district['lng'],
                            "listing_count": listing_count,
                            "level": "district"
                        })
        
        elif level == "city":
            regions = await service.get_regions(country_code)
            for region in regions:
                districts = await service.get_districts(country_code, region['region_code'])
                for district in districts:
                    try:
                        cities = await service.get_cities(country_code, region['region_code'], district['district_code'])
                        for city in cities:
                            listing_count = await db.listings.count_documents({
                                "location.country_code": country_code,
                                "location.region_code": region['region_code'],
                                "location.district_code": district['district_code'],
                                "location.city_code": city.get('city_code'),
                                "status": "active"
                            })
                            
                            if city.get('lat') and city.get('lng'):
                                density_data.append({
                                    "name": city['name'],
                                    "code": city.get('city_code'),
                                    "district": district['name'],
                                    "region": region['name'],
                                    "lat": city['lat'],
                                    "lng": city['lng'],
                                    "listing_count": listing_count,
                                    "level": "city"
                                })
                    except:
                        pass
        
        density_data.sort(key=lambda x: x['listing_count'], reverse=True)
        
        return {
            "country_code": country_code,
            "level": level,
            "data": density_data,
            "total_locations": len(density_data),
            "total_listings": sum(d['listing_count'] for d in density_data)
        }

    @router.get("/auto-detect")
    async def admin_auto_detect_location(
        request: Request,
        lat: float = Query(..., description="Latitude"),
        lng: float = Query(..., description="Longitude")
    ):
        """Auto-detect location hierarchy from coordinates"""
        from location_system import LocationService
        service = LocationService(db)
        
        detected = {
            "country": None,
            "region": None,
            "district": None,
            "nominatim_data": None
        }
        
        nominatim_country_code = None
        nominatim_state = None
        nominatim_district = None
        nominatim_city = None
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://nominatim.openstreetmap.org/reverse",
                    params={
                        "lat": lat,
                        "lon": lng,
                        "format": "json",
                        "addressdetails": 1,
                        "zoom": 10
                    },
                    headers={
                        "User-Agent": "AvidaMarketplace/1.0 (admin location manager)"
                    }
                )
                result = response.json()
                
                if "error" not in result:
                    address = result.get("address", {})
                    detected["nominatim_data"] = {
                        "display_name": result.get("display_name"),
                        "address": address
                    }
                    nominatim_country_code = address.get("country_code", "").upper()
                    nominatim_state = address.get("state") or address.get("province") or address.get("region")
                    nominatim_district = address.get("county") or address.get("state_district")
                    nominatim_city = address.get("city") or address.get("town") or address.get("village")
        except:
            pass
        
        countries = await service.get_countries()
        
        if not nominatim_country_code:
            try:
                import math
                
                def haversine(lat1, lon1, lat2, lon2):
                    R = 6371
                    dlat = math.radians(lat2 - lat1)
                    dlon = math.radians(lon2 - lon1)
                    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
                    c = 2 * math.asin(math.sqrt(a))
                    return R * c
                
                all_cities = []
                for country in countries:
                    try:
                        regions = await service.get_regions(country['code'])
                        for region in regions:
                            try:
                                districts = await service.get_districts(country['code'], region['region_code'])
                                for district in districts:
                                    try:
                                        cities = await service.get_cities(country['code'], region['region_code'], district['district_code'])
                                        for city in cities:
                                            if city.get('lat') and city.get('lng'):
                                                distance = haversine(lat, lng, city['lat'], city['lng'])
                                                all_cities.append({
                                                    'country': country,
                                                    'region': region,
                                                    'district': district,
                                                    'city': city,
                                                    'distance': distance
                                                })
                                    except:
                                        pass
                            except:
                                pass
                    except:
                        pass
                
                if all_cities:
                    all_cities.sort(key=lambda x: x['distance'])
                    nearest = all_cities[0]
                    detected['country'] = nearest['country']
                    detected['region'] = nearest['region']
                    detected['district'] = nearest['district']
                    nominatim_city = nearest['city']['name']
            except:
                pass
        else:
            for country in countries:
                if country['code'] == nominatim_country_code:
                    detected['country'] = country
                    break
            
            if detected['country'] and nominatim_state:
                try:
                    regions = await service.get_regions(detected['country']['code'])
                    for region in regions:
                        if nominatim_state.lower() in region['name'].lower() or region['name'].lower() in nominatim_state.lower():
                            detected['region'] = region
                            break
                except:
                    pass
            
            if detected['region'] and nominatim_district:
                try:
                    districts = await service.get_districts(detected['country']['code'], detected['region']['region_code'])
                    for district in districts:
                        if nominatim_district.lower() in district['name'].lower() or district['name'].lower() in nominatim_district.lower():
                            detected['district'] = district
                            break
                except:
                    pass
        
        return {
            "detected": detected['country'] is not None,
            "country": detected['country'],
            "region": detected['region'],
            "district": detected['district'],
            "nominatim_data": detected['nominatim_data'],
            "suggested_city_name": nominatim_city,
            "coordinates": {"lat": lat, "lng": lng}
        }

    @router.get("/district-boundary")
    async def admin_get_district_boundary(
        request: Request,
        country_code: str = Query(...),
        region_code: str = Query(...),
        district_code: str = Query(...)
    ):
        """Get polygon boundary for a district from OSM via Nominatim"""
        from location_system import LocationService
        service = LocationService(db)
        
        try:
            districts = await service.get_districts(country_code, region_code)
            district = next((d for d in districts if d['district_code'] == district_code), None)
            
            if not district:
                raise HTTPException(status_code=404, detail="District not found")
            
            countries = await service.get_countries()
            country = next((c for c in countries if c['code'] == country_code), None)
            
            regions = await service.get_regions(country_code)
            region = next((r for r in regions if r['region_code'] == region_code), None)
            
            search_query = f"{district['name']}, {region['name'] if region else ''}, {country['name'] if country else ''}"
            
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.get(
                        "https://nominatim.openstreetmap.org/search",
                        params={
                            "q": search_query,
                            "format": "json",
                            "polygon_geojson": 1,
                            "limit": 1
                        },
                        headers={
                            "User-Agent": "AvidaMarketplace/1.0 (admin location manager)"
                        }
                    )
                    results = response.json()
                    
                    if not results:
                        return {
                            "found": False,
                            "district": district['name'],
                            "message": "No boundary found for this district"
                        }
                    
                    result = results[0]
                    geojson = result.get("geojson")
                    
                    return {
                        "found": True,
                        "district": district['name'],
                        "osm_id": result.get("osm_id"),
                        "osm_type": result.get("osm_type"),
                        "display_name": result.get("display_name"),
                        "bounding_box": result.get("boundingbox"),
                        "geojson": geojson,
                        "center": {
                            "lat": float(result.get("lat", 0)),
                            "lng": float(result.get("lon", 0))
                        }
                    }
            except Exception:
                if district.get('lat') and district.get('lng'):
                    return {
                        "found": False,
                        "district": district['name'],
                        "center": {
                            "lat": district['lat'],
                            "lng": district['lng']
                        },
                        "message": "Boundary service unavailable, using district center point",
                        "geojson": None
                    }
                return {
                    "found": False,
                    "district": district['name'],
                    "message": "Boundary service unavailable and no district coordinates stored"
                }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get boundary: {str(e)}")
    
    return router
