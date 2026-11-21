'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import L from 'leaflet';
import { IssueData } from '@/lib/types';
import { Flame, Layers, Eye } from 'lucide-react';

interface TransparencyHeatmapProps {
  issues: IssueData[];
  height?: string;
  onSelectIssue?: (issue: IssueData) => void;
  interactive?: boolean;
}

export default function TransparencyHeatmap({
  issues,
  height = '480px',
  onSelectIssue,
  interactive = true,
}: TransparencyHeatmapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.LayerGroup | null>(null);
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center at Erode Corporation
      const map = L.map(mapContainerRef.current, {
        scrollWheelZoom: interactive,
      }).setView([11.341, 77.7172], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      heatLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }
  }, [interactive]);

  // Update markers and heat layer when issues or filters change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !heatLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    heatLayerRef.current.clearLayers();

    const filteredIssues = issues.filter((issue) => {
      if (statusFilter === 'ALL') return true;
      return issue.status === statusFilter;
    });

    if (heatmapMode) {
      // Render density circles for heatmap mode
      filteredIssues.forEach((issue) => {
        const radius = issue.priorityScore ? Math.max(15, issue.priorityScore * 1.8) : 50;
        const color =
          issue.priority === 'CRITICAL'
            ? '#ef4444'
            : issue.priority === 'HIGH'
              ? '#f97316'
              : issue.priority === 'MEDIUM'
                ? '#f59e0b'
                : '#10b981';

        const circle = L.circle([issue.lat, issue.lng], {
          radius: radius * 3.5,
          color: color,
          fillColor: color,
          fillOpacity: 0.35,
          stroke: false,
        });

        circle.bindTooltip(
          `<strong>${issue.category}</strong> (${issue.priority})<br/>Score: ${issue.priorityScore}/100<br/>${issue.ward}`,
          { direction: 'top' }
        );

        heatLayerRef.current?.addLayer(circle);
      });
    } else {
      // Render standard pin markers
      filteredIssues.forEach((issue) => {
        const statusColor =
          issue.status === 'RESOLVED'
            ? '#10b981'
            : issue.status === 'IN_PROGRESS'
              ? '#a855f7'
              : '#3b82f6';

        const customIcon = L.divIcon({
          className: 'custom-status-marker',
          html: `<div style="background-color: ${statusColor}; width: 22px; height: 22px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
                  ${issue.priority === 'CRITICAL' ? '!' : ''}
                 </div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const marker = L.marker([issue.lat, issue.lng], { icon: customIcon });

        const popupContent = `
          <div style="font-family: inherit; min-width: 200px; padding: 2px;">
            <div style="font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 0.5px;">${issue.trackingId}</div>
            <div style="font-size: 13px; font-weight: 700; margin: 2px 0 6px 0; color: #0f172a; line-height: 1.2;">${issue.title}</div>
            <div style="display: flex; gap: 4px; margin-bottom: 8px;">
              <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; color: #334155;">${issue.category}</span>
              <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${statusColor}18; color: ${statusColor};">${issue.status}</span>
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 8px;">📍 ${issue.ward}</div>
            <a href="/issues/${issue.id}" style="display: inline-block; width: 100%; text-align: center; background: #0284c7; color: white; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; text-decoration: none;">View Timeline &amp; AI Analysis</a>
          </div>
        `;

        marker.bindPopup(popupContent);

        if (onSelectIssue) {
          marker.on('click', () => onSelectIssue(issue));
        }

        markersLayerRef.current?.addLayer(marker);
      });
    }
  }, [issues, heatmapMode, statusFilter]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg">
      <div ref={mapContainerRef} style={{ height }} className="w-full" />

      {/* Floating Map Controls */}
      <div className="absolute top-3 left-3 z-[400] flex flex-wrap items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md">
        {/* Heatmap toggle */}
        <button
          onClick={() => setHeatmapMode(!heatmapMode)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${heatmapMode
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>{heatmapMode ? 'Heatmap Active' : 'Heatmap'}</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />

        {/* Status Filter buttons */}
        <div className="flex items-center gap-1">
          {['ALL', 'REPORTED', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${statusFilter === st
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {st === 'ALL'
                ? 'All'
                : st === 'IN_PROGRESS'
                  ? 'In Progress'
                  : st === 'REPORTED'
                    ? 'Reported'
                    : 'Resolved'}
            </button>
          ))}
        </div>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-3 right-3 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md text-[11px] font-medium flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-slate-700 dark:text-slate-300">Reported</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span className="text-slate-700 dark:text-slate-300">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-700 dark:text-slate-300">Resolved</span>
        </div>
      </div>
    </div>
  );
}

