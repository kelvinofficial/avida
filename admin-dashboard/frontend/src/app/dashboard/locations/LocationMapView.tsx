'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Box, Typography, IconButton, Paper, Tooltip } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
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

// Custom marker icon
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

interface City {
  country_code: string;
  region_code: string;
  district_code: string;
  city_code: string;
  name: string;
  lat: number;
  lng: number;
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

interface District {
  country_code: string;
  region_code: string;
  district_code: string;
  name: string;
}

interface LocationMapViewProps {
  cities: City[];
  selectedCountry: Country | null;
  selectedRegion: Region | null;
  selectedDistrict: District | null;
  onMarkerDrag: (city: City, newLat: number, newLng: number) => void;
  onMapClick: (lat: number, lng: number) => void;
  onCityEdit: (city: City) => void;
  onCityDelete: (city: City) => void;
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

// Component to fit bounds when cities change
function FitBounds({ cities }: { cities: City[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (cities.length > 0) {
      const validCities = cities.filter(c => c.lat && c.lng);
      if (validCities.length > 0) {
        const bounds = L.latLngBounds(validCities.map(c => [c.lat, c.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }
  }, [cities, map]);
  
  return null;
}

// Draggable marker component
function DraggableMarker({ 
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
      icon={createCustomIcon('#2563eb')}
    >
      <Popup>
        <Box sx={{ minWidth: 150 }}>
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

export default function LocationMapView({
  cities,
  selectedCountry,
  selectedRegion,
  selectedDistrict,
  onMarkerDrag,
  onMapClick,
  onCityEdit,
  onCityDelete,
}: LocationMapViewProps) {
  // Filter cities with valid coordinates
  const validCities = useMemo(() => 
    cities.filter(c => c.lat && c.lng && !isNaN(c.lat) && !isNaN(c.lng)),
    [cities]
  );

  // Calculate center based on cities or default to world center
  const center = useMemo(() => {
    if (validCities.length > 0) {
      const avgLat = validCities.reduce((sum, c) => sum + c.lat, 0) / validCities.length;
      const avgLng = validCities.reduce((sum, c) => sum + c.lng, 0) / validCities.length;
      return [avgLat, avgLng] as [number, number];
    }
    // Default centers for common regions
    if (selectedCountry?.code === 'TZ') return [-6.7924, 39.2083] as [number, number]; // Dar es Salaam
    if (selectedCountry?.code === 'KE') return [-1.2921, 36.8219] as [number, number]; // Nairobi
    if (selectedCountry?.code === 'US') return [39.8283, -98.5795] as [number, number]; // US center
    if (selectedCountry?.code === 'DE') return [51.1657, 10.4515] as [number, number]; // Germany
    return [0, 20] as [number, number]; // Africa-centric world view
  }, [validCities, selectedCountry]);

  const zoom = validCities.length > 0 ? 6 : 3;

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Instructions overlay */}
      {selectedDistrict && (
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
            Click anywhere on the map to add a new city
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
          
          {/* Click handler for adding new cities */}
          <MapClickHandler onClick={onMapClick} enabled={!!selectedDistrict} />
          
          {/* Auto-fit bounds when cities change */}
          <FitBounds cities={validCities} />
          
          {/* City markers */}
          {validCities.map((city) => (
            <DraggableMarker
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
      <Box sx={{ mt: 2, display: 'flex', gap: 3, alignItems: 'center', justifyContent: 'center' }}>
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
            City Location
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {validCities.length} cities displayed
        </Typography>
      </Box>
    </Box>
  );
}
