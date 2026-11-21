'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import L from 'leaflet';

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number, address?: string) => void;
}

export default function LocationPickerMap({ lat, lng, onChange }: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  // Reverse geocode via Nominatim
  const reverseGeocode = async (latitude: number, longitude: number) => {
    setAddressLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        const address =
          data.display_name ||
          `${data.address?.road || data.address?.suburb || 'Erode'}, Tamil Nadu`;
        onChange(latitude, longitude, address);
      } else {
        onChange(latitude, longitude);
      }
    } catch {
      onChange(latitude, longitude);
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Fix default marker icon paths in Leaflet
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([lat, lng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #ef4444; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
               </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const marker = L.marker([lat, lng], {
        draggable: true,
        icon: customIcon,
      }).addTo(map);

      marker.on('dragend', (e) => {
        const position = e.target.getLatLng();
        reverseGeocode(position.lat, position.lng);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      mapInstanceRef.current.setView([lat, lng], 14);
      markerRef.current?.setLatLng([lat, lng]);
    }

    return () => {
      // Keep instance alive during hot-reloads
    };
  }, []);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
          markerRef.current.setLatLng([latitude, longitude]);
        }
        reverseGeocode(latitude, longitude);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        // Fallback: stay in Erode
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="relative w-full h-[260px] sm:h-[300px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Geolocation Button overlay */}
      <div className="absolute top-3 right-3 z-[400] flex gap-2">
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/95 dark:bg-slate-800/95 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition"
        >
          {isLocating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
          ) : (
            <Navigation className="w-3.5 h-3.5 text-sky-600" />
          )}
          <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
        </button>
      </div>

      {/* Drag instruction chip */}
      <div className="absolute bottom-3 left-3 z-[400] bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 shadow-sm">
        <MapPin className="w-3 h-3 text-red-400" />
        <span>
          {addressLoading ? 'Fetching address...' : 'Drag pin or click map to adjust exact spot'}
        </span>
      </div>
    </div>
  );
}

