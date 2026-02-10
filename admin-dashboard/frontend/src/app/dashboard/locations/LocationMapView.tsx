'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Box, Typography, IconButton, Paper, Tooltip, Chip } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, ArrowForward as ArrowIcon } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color: string = '#2563eb') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

const districtIcon = createCustomIcon('#f59e0b'); // Orange for districts
const cityIcon = createCustomIcon('#2563eb'); // Blue for cities

interface City {
  country_code: string;
  region_code: string;
  district_code: string;
  city_code: string;
  name: string;
  lat: number;
  lng: number;
}

interface District {
  country_code: string;
  region_code: string;
  district_code: string;
  name: string;
  lat?: number;
  lng?: number;
}

interface Country {
  code: string;
  name: string;
  flag?: string;
}

interface Region {
  country_code: string;
  region_code: string;
  name: string;
}

interface LocationMapViewProps {
  cities: City[];
  districts?: District[];
  selectedCountry: Country | null;
  selectedRegion: Region | null;
  selectedDistrict: District | null;
  onMarkerDrag: (city: City, newLat: number, newLng: number) => void;
  onMapClick: (lat: number, lng: number) => void;
  onCityEdit: (city: City) => void;
  onCityDelete: (city: City) => void;
  onDistrictClick?: (district: District) => void;
  onDistrictEdit?: (district: District) => void;
}

// Component to handle map click events
function MapClickHandler({ onClick, enabled }: { onClick: (lat: number, lng: number) => void; enabled: boolean }) {
  useMapEvents({
    click: (e) => {
      if (enabled) {
        onClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Component to fit bounds when markers change
function FitBounds({ cities, districts }: { cities: City[]; districts?: District[] }) {
  const map = useMap();
  
  useEffect(() => {
    const allPoints: [number, number][] = [];
    
    // Add city coordinates
    cities.filter(c => c.lat && c.lng).forEach(c => {
      allPoints.push([c.lat, c.lng]);
    });
    
    // Add district coordinates
    districts?.filter(d => d.lat && d.lng).forEach(d => {
      allPoints.push([d.lat!, d.lng!]);
    });
    
    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [cities, districts, map]);
  
  return null;
}

// Draggable city marker component
function DraggableCityMarker({ 
  city, 
  onDragEnd, 
  onEdit, 
  onDelete 
}: { 
  city: City; 
  onDragEnd: (lat: number, lng: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          onDragEnd(lat, lng);
        }
      },
    }),
    [onDragEnd],
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[city.lat, city.lng]}
      ref={markerRef}
      icon={cityIcon}
    >
      <Popup>
        <Box sx={{ minWidth: 150 }}>
          <Chip label="City" size="small" color="primary" sx={{ mb: 1 }} />
          <Typography variant="subtitle2" fontWeight="bold">
            {city.name}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            Code: {city.city_code}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            Lat: {city.lat.toFixed(4)}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            Lng: {city.lng.toFixed(4)}
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
            <Tooltip title="Edit City">
              <IconButton size="small" onClick={onEdit}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete City">
              <IconButton size="small" color="error" onClick={onDelete}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic', color: 'info.main' }}>
            Drag marker to update location
          </Typography>
        </Box>
      </Popup>
    </Marker>
  );
}

// District marker component (clickable to drill down)
function DistrictMarker({ 
  district, 
  onClick,
  onEdit
}: { 
  district: District; 
  onClick?: () => void;
  onEdit?: () => void;
}) {
  if (!district.lat || !district.lng) return null;
  
  return (
    <Marker
      position={[district.lat, district.lng]}
      icon={districtIcon}
    >
      <Popup>
        <Box sx={{ minWidth: 150 }}>
          <Chip label="District" size="small" color="warning" sx={{ mb: 1 }} />
          <Typography variant="subtitle2" fontWeight="bold">
            {district.name}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            Code: {district.district_code}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            Lat: {district.lat.toFixed(4)}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            Lng: {district.lng.toFixed(4)}
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
            {onClick && (
              <Tooltip title="View Cities">
                <IconButton size="small" color="primary" onClick={onClick}>
                  <ArrowIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onEdit && (
              <Tooltip title="Edit District">
                <IconButton size="small" onClick={onEdit}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Popup>
    </Marker>
  );
}

export default function LocationMapView({
  cities,
  districts = [],
  selectedCountry,
  selectedRegion,
  selectedDistrict,
  onMarkerDrag,
  onMapClick,
  onCityEdit,
  onCityDelete,
  onDistrictClick,
  onDistrictEdit,
}: LocationMapViewProps) {
  // Filter cities with valid coordinates
  const validCities = useMemo(() => 
    cities.filter(c => c.lat && c.lng && !isNaN(c.lat) && !isNaN(c.lng)),
    [cities]
  );

  // Filter districts with valid coordinates
  const validDistricts = useMemo(() =>
    districts.filter(d => d.lat && d.lng && !isNaN(d.lat!) && !isNaN(d.lng!)),
    [districts]
  );

  // Calculate center based on markers or default to world center
  const center = useMemo(() => {
    const allPoints: [number, number][] = [];
    
    validCities.forEach(c => allPoints.push([c.lat, c.lng]));
    validDistricts.forEach(d => allPoints.push([d.lat!, d.lng!]));
    
    if (allPoints.length > 0) {
      const avgLat = allPoints.reduce((sum, p) => sum + p[0], 0) / allPoints.length;
      const avgLng = allPoints.reduce((sum, p) => sum + p[1], 0) / allPoints.length;
      return [avgLat, avgLng] as [number, number];
    }
    
    // Default centers for common regions
    if (selectedCountry?.code === 'TZ') return [-6.7924, 39.2083] as [number, number];
    if (selectedCountry?.code === 'KE') return [-1.2921, 36.8219] as [number, number];
    if (selectedCountry?.code === 'US') return [39.8283, -98.5795] as [number, number];
    if (selectedCountry?.code === 'DE') return [51.1657, 10.4515] as [number, number];
    return [0, 20] as [number, number];
  }, [validCities, validDistricts, selectedCountry]);

  const zoom = (validCities.length + validDistricts.length) > 0 ? 6 : 3;
  
  // Check if we can add items
  const canAddCity = !!selectedDistrict;
  const canAddDistrict = !!selectedRegion && !selectedDistrict;

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Instructions overlay */}
      {(canAddCity || canAddDistrict) && (
        <Paper 
          elevation={3}
          sx={{ 
            position: 'absolute', 
            top: 10, 
            left: 60, 
            zIndex: 1000, 
            p: 1.5, 
            bgcolor: 'rgba(255,255,255,0.95)',
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" color="primary">
            Click anywhere on the map to add a new {canAddCity ? 'city' : 'district'}
          </Typography>
        </Paper>
      )}
      
      {/* Map container */}
      <Box 
        sx={{ 
          height: 500, 
          borderRadius: 2, 
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          '& .leaflet-container': {
            height: '100%',
            width: '100%',
            borderRadius: 2,
          },
        }}
      >
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Click handler for adding new items */}
          <MapClickHandler onClick={onMapClick} enabled={canAddCity || canAddDistrict} />
          
          {/* Auto-fit bounds when markers change */}
          <FitBounds cities={validCities} districts={validDistricts} />
          
          {/* District markers (shown when viewing a region) */}
          {validDistricts.map((district) => (
            <DistrictMarker
              key={`${district.country_code}-${district.region_code}-${district.district_code}`}
              district={district}
              onClick={() => onDistrictClick?.(district)}
              onEdit={() => onDistrictEdit?.(district)}
            />
          ))}
          
          {/* City markers */}
          {validCities.map((city) => (
            <DraggableCityMarker
              key={`${city.country_code}-${city.region_code}-${city.district_code}-${city.city_code}`}
              city={city}
              onDragEnd={(lat, lng) => onMarkerDrag(city, lat, lng)}
              onEdit={() => onCityEdit(city)}
              onDelete={() => onCityDelete(city)}
            />
          ))}
        </MapContainer>
      </Box>
      
      {/* Legend */}
      <Box sx={{ mt: 2, display: 'flex', gap: 3, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        {validDistricts.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box 
              sx={{ 
                width: 16, 
                height: 16, 
                bgcolor: '#f59e0b', 
                borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)',
                border: '2px solid white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} 
            />
            <Typography variant="caption" color="text.secondary">
              District ({validDistricts.length})
            </Typography>
          </Box>
        )}
        {validCities.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box 
              sx={{ 
                width: 16, 
                height: 16, 
                bgcolor: '#2563eb', 
                borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)',
                border: '2px solid white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} 
            />
            <Typography variant="caption" color="text.secondary">
              City ({validCities.length})
            </Typography>
          </Box>
        )}
        <Typography variant="caption" color="text.secondary">
          Total: {validCities.length + validDistricts.length} markers
        </Typography>
      </Box>
    </Box>
  );
}
