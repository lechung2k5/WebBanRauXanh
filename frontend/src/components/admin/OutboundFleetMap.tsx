'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapPin,
  Truck,
  Navigation,
  Thermometer,
  Maximize2,
  CheckCircle2,
  Layers,
  X,
} from 'lucide-react';
import {
  FleetVehicleDto,
  OutboundDeliveryTripDto,
  WarehouseHubDto,
} from '@/services/fleetDispatchApi';
import {
  Coordinates,
  GOONG_MAP_STYLE_URL,
  decodePolyline,
  geocodeAddress,
  getRouteDirections,
} from '@/services/goongMapService';

interface OutboundFleetMapProps {
  mode?: 'OUTBOUND' | 'INBOUND';
  hub: WarehouseHubDto;
  vehicles: FleetVehicleDto[];
  trips: Array<OutboundDeliveryTripDto | any>;
  coldAssets?: any[];
  focusedTripId?: number | null;
  onSelectTrip?: (tripId: number | null) => void;
}

type FleetFilter = 'ALL' | 'TRUCK' | 'VAN' | 'ON_DELIVERY' | 'AVAILABLE';

const HUB_DEFAULT_COORDS: Record<number, Coordinates> = {
  1: { lat: 10.9733, lng: 106.5162 }, // Hub Củ Chi - TP.HCM
  2: { lat: 11.7346, lng: 108.3712 }, // Hub Đức Trọng - Lâm Đồng
  3: { lat: 10.3315, lng: 106.0342 }, // Hub Cái Bè - Tiền Giang
  4: { lat: 12.9125, lng: 108.2643 }, // Hub Buôn Hồ - Đắk Lắk
  5: { lat: 21.0368, lng: 105.9154 }, // Hub Hà Nội
};

// Hash ổn định theo chuỗi để tạo offset tọa độ hợp lý quanh khu vực khi chưa geocode được
function hashOffset(seed: string, scale = 0.035): { dLat: number; dLng: number } {
  let h1 = 0;
  let h2 = 0;
  for (let i = 0; i < seed.length; i++) {
    h1 = (h1 * 31 + seed.charCodeAt(i)) % 1000;
    h2 = (h2 * 17 + seed.charCodeAt(i) * 3) % 1000;
  }
  return {
    dLat: ((h1 / 1000) - 0.5) * 2 * scale,
    dLng: ((h2 / 1000) - 0.5) * 2 * scale,
  };
}

function loadMapLibreScript(): Promise<any> {
  return new Promise((resolve, reject) => {
    const win = typeof window !== 'undefined' ? (window as any) : {};
    if (win.maplibregl) {
      resolve(win.maplibregl);
      return;
    }
    if (typeof document === 'undefined') {
      reject(new Error('Window is undefined'));
      return;
    }
    if (!document.getElementById('maplibre-gl-css')) {
      const link = document.createElement('link');
      link.id = 'maplibre-gl-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';
      document.head.appendChild(link);
    }
    if (document.getElementById('maplibre-gl-script')) {
      const check = setInterval(() => {
        if (win.maplibregl) {
          clearInterval(check);
          resolve(win.maplibregl);
        }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.id = 'maplibre-gl-script';
    script.src = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js';
    script.async = true;
    script.onload = () => {
      if (win.maplibregl) resolve(win.maplibregl);
      else reject(new Error('MapLibre GL failed to load'));
    };
    script.onerror = () => reject(new Error('Failed to load MapLibre GL from CDN'));
    document.head.appendChild(script);
  });
}

interface VehiclePinData {
  key: string;
  vehicleId: number;
  plateNumber: string;
  vehicleModel: string;
  vehicleType: string;
  driverName: string;
  tempText: string;
  tempSafe: boolean;
  status: 'ON_DELIVERY' | 'ASSIGNED' | 'AVAILABLE';
  trip: any | null;
  coords: Coordinates;
  destinationCoords: Coordinates | null;
  destinationAddress: string;
  stopsCount: number;
}

export default function OutboundFleetMap({
  mode = 'OUTBOUND',
  hub,
  vehicles,
  trips,
  coldAssets = [],
  focusedTripId,
  onSelectTrip,
}: OutboundFleetMapProps) {
  const isInbound = mode === 'INBOUND';
  const getStopAddr = (s: any): string =>
    (isInbound ? s?.pickupAddress || s?.deliveryAddressSnapshot : s?.deliveryAddressSnapshot || s?.pickupAddress) || '';
  const getStopLabel = (s: any, fallback: string): string =>
    (isInbound ? s?.farmerName || s?.contactNameSnapshot : s?.contactNameSnapshot || s?.farmerName) || fallback;
  const getStopSeq = (s: any, idx: number): number => Number(s?.stopSequence ?? s?.stopOrder ?? idx + 1);
  const [fleetFilter, setFleetFilter] = useState<FleetFilter>('ALL');
  const [selectedPinKey, setSelectedPinKey] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [geocodedMap, setGeocodedMap] = useState<Record<string, Coordinates>>({});
  const [routeSummary, setRouteSummary] = useState<{
    distanceKm: number;
    durationMinutes: number;
    vehicleLabel: string;
  } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const geocodeCacheRef = useRef<Record<string, Coordinates>>({});

  const hubCoords: Coordinates = useMemo(
    () => HUB_DEFAULT_COORDS[hub?.id || 2] || HUB_DEFAULT_COORDS[2],
    [hub?.id]
  );

  // Geocode các địa chỉ giao hàng của chuyến đang hoạt động (có cache tránh gọi trùng)
  useEffect(() => {
    let cancelled = false;
    const addresses = new Set<string>();
    trips.forEach((t) => {
      if (t.status === 'CANCELLED' || t.status === 'COMPLETED') return;
      t.stops?.forEach((s: any) => {
        const addr = getStopAddr(s);
        if (addr && !geocodeCacheRef.current[addr]) {
          addresses.add(addr);
        }
      });
    });

    if (addresses.size === 0) return;

    (async () => {
      const updates: Record<string, Coordinates> = {};
      for (const addr of Array.from(addresses).slice(0, 8)) {
        const res = await geocodeAddress(addr);
        if (res && !cancelled) {
          geocodeCacheRef.current[addr] = res;
          updates[addr] = res;
        }
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setGeocodedMap((prev) => ({ ...prev, ...updates }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [trips]);

  // Chuẩn hóa danh sách marker xe để hiển thị trên bản đồ
  const vehiclePins = useMemo<VehiclePinData[]>(() => {
    const activeTrips = trips.filter((t) => t.status !== 'CANCELLED' && t.status !== 'COMPLETED');
    const tripByVehicleId = new Map<number, OutboundDeliveryTripDto>();
    activeTrips.forEach((t) => {
      if (t.vehicle?.id && !tripByVehicleId.has(t.vehicle.id)) {
        tripByVehicleId.set(t.vehicle.id, t);
      }
    });

    const mergedVehicles = [...vehicles];
    activeTrips.forEach((t) => {
      if (t.vehicle && !mergedVehicles.some((v) => v.id === t.vehicle.id)) {
        mergedVehicles.push(t.vehicle);
      }
    });

    return mergedVehicles.map((v, idx) => {
      const trip = tripByVehicleId.get(v.id) || null;
      const firstStop = trip?.stops?.[0] || null;
      const destAddr = getStopAddr(firstStop);
      const destCoords = destAddr ? geocodedMap[destAddr] || null : null;

      // Tìm nhiệt độ thực tế từ IoT coldAssets hoặc fallback theo minTemp-maxTemp
      const matchedAsset = coldAssets.find(
        (a) =>
          String(a.assetCode || a.plateNumber || '').toUpperCase() ===
          String(v.plateNumber || '').toUpperCase()
      );
      const rawTemp =
        matchedAsset?.currentTemp ??
        (v.minTemp != null && v.maxTemp != null ? Number(((v.minTemp + v.maxTemp) / 2).toFixed(1)) : 3.5);
      const tempNum = Number(rawTemp);
      const tempSafe = tempNum >= -5 && tempNum <= 10;

      const driverName = trip?.driver?.fullName || `Xe ${v.plateNumber}`;
      const shortDriver = driverName.split(' ').slice(-1)[0] || driverName;

      let status: 'ON_DELIVERY' | 'ASSIGNED' | 'AVAILABLE' = 'AVAILABLE';
      if (
        trip?.status === 'ON_DELIVERY' ||
        trip?.status === 'ON_TRIP' ||
        trip?.status === 'DEPARTED' ||
        trip?.status === 'IN_PROGRESS' ||
        trip?.status === 'RETURNING' ||
        v.status === 'ON_TRIP'
      ) {
        status = 'ON_DELIVERY';
      } else if (trip?.status === 'ASSIGNED' || trip?.status === 'ACKNOWLEDGED' || v.status === 'ASSIGNED') {
        status = 'ASSIGNED';
      }

      // Ưu tiên vị trí GPS thực tế từ thiết bị tài xế nếu có; chỉ fallback về tuyến/Hub khi chưa có GPS
      let coords: Coordinates;
      const tripLat = Number((trip as any)?.currentLat ?? 0);
      const tripLng = Number((trip as any)?.currentLng ?? 0);
      if (tripLat && tripLng) {
        coords = { lat: tripLat, lng: tripLng };
      } else if (status !== 'AVAILABLE' && destCoords) {
        const ratio = status === 'ON_DELIVERY' ? 0.55 : 0.18;
        coords = {
          lat: hubCoords.lat + (destCoords.lat - hubCoords.lat) * ratio,
          lng: hubCoords.lng + (destCoords.lng - hubCoords.lng) * ratio,
        };
      } else {
        const off = hashOffset(`${v.plateNumber}-${idx}`, status === 'AVAILABLE' ? 0.014 : 0.045);
        coords = {
          lat: hubCoords.lat + off.dLat,
          lng: hubCoords.lng + off.dLng,
        };
      }

      return {
        key: `veh-${v.id}`,
        vehicleId: v.id,
        plateNumber: v.plateNumber,
        vehicleModel: v.vehicleModel || 'Xe Tải Lạnh',
        vehicleType: v.vehicleType || 'REFRIGERATED_TRUCK',
        driverName,
        tempText: `${shortDriver} • ${tempNum.toFixed(1)}°C`,
        tempSafe,
        status,
        trip,
        coords,
        destinationCoords: destCoords,
        destinationAddress: destAddr,
        stopsCount: trip?.totalStops || trip?.stops?.length || 0,
      };
    });
  }, [vehicles, trips, coldAssets, geocodedMap, hubCoords]);

  const counts = useMemo(() => {
    const truck = vehiclePins.filter((p) => p.vehicleType.includes('TRUCK')).length;
    const van = vehiclePins.filter((p) => !p.vehicleType.includes('TRUCK')).length;
    const onDelivery = vehiclePins.filter((p) => p.status === 'ON_DELIVERY').length;
    const available = vehiclePins.filter((p) => p.status === 'AVAILABLE').length;
    const safePct =
      vehiclePins.length > 0
        ? Math.round((vehiclePins.filter((p) => p.tempSafe).length / vehiclePins.length) * 100)
        : 100;
    return { total: vehiclePins.length, truck, van, onDelivery, available, safePct };
  }, [vehiclePins]);

  const filteredPins = useMemo(() => {
    return vehiclePins.filter((p) => {
      if (fleetFilter === 'TRUCK') return p.vehicleType.includes('TRUCK');
      if (fleetFilter === 'VAN') return !p.vehicleType.includes('TRUCK');
      if (fleetFilter === 'ON_DELIVERY') return p.status === 'ON_DELIVERY' || p.status === 'ASSIGNED';
      if (fleetFilter === 'AVAILABLE') return p.status === 'AVAILABLE';
      return true;
    });
  }, [vehiclePins, fleetFilter]);

  const selectedPin = useMemo(() => {
    if (focusedTripId) {
      const byTrip = vehiclePins.find((p) => p.trip?.id === focusedTripId);
      if (byTrip) return byTrip;
    }
    return vehiclePins.find((p) => p.key === selectedPinKey) || null;
  }, [vehiclePins, selectedPinKey, focusedTripId]);

  // Khởi tạo MapLibre GL JS 1 lần duy nhất
  useEffect(() => {
    let isMounted = true;
    if (!mapContainerRef.current) return;

    loadMapLibreScript()
      .then((maplibregl) => {
        if (!isMounted || !mapContainerRef.current) return;
        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: GOONG_MAP_STYLE_URL,
          center: [hubCoords.lng, hubCoords.lat],
          zoom: 11.5,
          attributionControl: false,
        });
        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.on('load', () => {
          if (isMounted) setMapReady(true);
        });
        mapInstanceRef.current = map;
      })
      .catch(() => {
        if (isMounted) setMapError(true);
      });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      setMapReady(false);
    };
  }, []);

  // Re-center khi đổi Hub
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    map.flyTo({ center: [hubCoords.lng, hubCoords.lat], zoom: 11.5, duration: 700 });
  }, [hubCoords, mapReady]);

  // Render markers & route polyline khi danh sách pin hoặc lựa chọn thay đổi
  useEffect(() => {
    const map = mapInstanceRef.current;
    const win = typeof window !== 'undefined' ? (window as any) : {};
    const maplibregl = win.maplibregl;
    if (!map || !mapReady || !maplibregl) return;

    // Xóa các marker cũ
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. Marker Hub trung tâm
    const hubEl = document.createElement('div');
    hubEl.className = 'flex flex-col items-center cursor-pointer';
    hubEl.innerHTML = `
      <div style="width:36px;height:36px;border-radius:9999px;background:#10542C;border:3px solid #ffffff;box-shadow:0 4px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:15px;">
        🏭
      </div>
      <div style="margin-top:3px;padding:2px 8px;border-radius:9999px;background:#064e3b;color:#ecfdf5;font-size:10px;font-weight:700;border:1px solid #34d399;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
        ${hub?.hubCode || 'HUB'}
      </div>
    `;
    const hubMarker = new maplibregl.Marker({ element: hubEl })
      .setLngLat([hubCoords.lng, hubCoords.lat])
      .addTo(map);
    markersRef.current.push(hubMarker);

    // 2. Markers từng xe
    filteredPins.forEach((pin) => {
      const isSel = selectedPin?.key === pin.key;
      const bgCircle =
        pin.status === 'ON_DELIVERY'
          ? '#ea580c'
          : pin.status === 'ASSIGNED'
          ? '#0284c7'
          : '#059669';

      const el = document.createElement('div');
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.alignItems = 'center';
      el.innerHTML = `
        <div style="width:${isSel ? 38 : 32}px;height:${isSel ? 38 : 32}px;border-radius:9999px;background:${bgCircle};border:${isSel ? '3px solid #fde047' : '2.5px solid #ffffff'};box-shadow:0 4px 12px rgba(0,0,0,0.38);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;transition:transform 0.15s;">
          🚚
        </div>
        <div style="margin-top:2px;padding:2px 8px;border-radius:9999px;background:${isSel ? '#0f172a' : 'rgba(15,23,42,0.92)'};color:#f8fafc;font-size:10px;font-weight:700;border:1px solid ${isSel ? '#fde047' : 'rgba(148,163,184,0.45)'};white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.35);">
          ${pin.tempText}
        </div>
      `;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedPinKey(pin.key);
        if (onSelectTrip) onSelectTrip(pin.trip?.id || null);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pin.coords.lng, pin.coords.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });

    // 3. Nếu đang chọn một xe có điểm giao -> hiển thị marker các điểm giao & vẽ đường bộ ngắn nhất theo loại xe
    const drawRoute = async () => {
      setRouteSummary(null);
      try {
        if (map.getLayer('outbound-route-line')) map.removeLayer('outbound-route-line');
        if (map.getSource('outbound-route')) map.removeSource('outbound-route');
      } catch {
        // ignore if not present
      }

      if (!selectedPin || !selectedPin.trip) return;

      const sortedStops = [...(selectedPin.trip.stops || [])].sort(
        (a: any, b: any) => getStopSeq(a, 0) - getStopSeq(b, 0)
      );
      const stopPoints: Array<{ coords: Coordinates; seq: number; label: string }> = [];
      for (const s of sortedStops) {
        const addr = getStopAddr(s);
        if (!addr) continue;
        let c: Coordinates | null = geocodedMap[addr] || geocodeCacheRef.current[addr] || null;
        if (!c) {
          c = await geocodeAddress(addr);
          if (c) geocodeCacheRef.current[addr] = c;
        }
        if (c) {
          stopPoints.push({
            coords: c,
            seq: getStopSeq(s, stopPoints.length),
            label: getStopLabel(s, addr),
          });
        }
      }

      if (stopPoints.length === 0 && selectedPin.destinationCoords) {
        stopPoints.push({
          coords: selectedPin.destinationCoords,
          seq: 1,
          label: selectedPin.destinationAddress || (isInbound ? 'Điểm lấy hàng' : 'Điểm giao'),
        });
      }
      if (stopPoints.length === 0 || !mapInstanceRef.current) return;

      // Xác định loại phương tiện cho Goong Direction API
      const vType = (selectedPin.vehicleType || '').toUpperCase();
      const goongVehicle: 'truck' | 'car' | 'bike' = vType.includes('BIKE') || vType.includes('MOTOR')
        ? 'bike'
        : vType.includes('VAN') || vType.includes('PICKUP') || vType.includes('CAR')
        ? 'car'
        : 'truck';
      const vehicleLabel =
        goongVehicle === 'bike' ? 'Xe máy lạnh' : goongVehicle === 'car' ? 'Xe Van / Bán tải' : 'Xe tải lạnh';

      // Đánh dấu marker từng điểm giao
      stopPoints.forEach((sp) => {
        const destEl = document.createElement('div');
        destEl.innerHTML = `
          <div style="width:30px;height:30px;border-radius:9999px;background:#7c3aed;border:2.5px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;">
            ${sp.seq}
          </div>
        `;
        const destMarker = new maplibregl.Marker({ element: destEl })
          .setLngLat([sp.coords.lng, sp.coords.lat])
          .addTo(map);
        markersRef.current.push(destMarker);
      });

      const fetchRoadSegment = async (
        from: Coordinates,
        to: Coordinates
      ): Promise<{ coords: [number, number][]; km: number; mins: number }> => {
        // 1. Goong Direction theo đúng loại phương tiện
        let dir = await getRouteDirections(from, to, goongVehicle);
        if (!dir && goongVehicle === 'truck') {
          dir = await getRouteDirections(from, to, 'car');
        }
        if (dir?.polyline) {
          const decoded = decodePolyline(dir.polyline);
          if (decoded.length > 1) {
            return { coords: decoded, km: dir.distanceKm, mins: dir.durationMinutes };
          }
        }
        // 2. Fallback OSRM đường bộ thực tế (không vẽ đường chim bay)
        try {
          const profile = goongVehicle === 'bike' ? 'bike' : 'driving';
          const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
          const res = await fetch(osrmUrl);
          if (res.ok) {
            const data = await res.json();
            const r = data?.routes?.[0];
            if (r?.geometry?.coordinates?.length > 1) {
              return {
                coords: r.geometry.coordinates as [number, number][],
                km: Math.round((r.distance / 1000) * 10) / 10,
                mins: Math.round(r.duration / 60),
              };
            }
          }
        } catch {
          // ignore network error
        }
        return {
          coords: [
            [from.lng, from.lat],
            [to.lng, to.lat],
          ],
          km: 0,
          mins: 0,
        };
      };

      const allRouteCoords: [number, number][] = [];
      let totalKm = 0;
      let totalMins = 0;
      let prevPoint: Coordinates = hubCoords;

      for (const sp of stopPoints) {
        const seg = await fetchRoadSegment(prevPoint, sp.coords);
        if (allRouteCoords.length > 0 && seg.coords.length > 0) {
          allRouteCoords.push(...seg.coords.slice(1));
        } else {
          allRouteCoords.push(...seg.coords);
        }
        totalKm += seg.km;
        totalMins += seg.mins;
        prevPoint = sp.coords;
      }

      if (!mapInstanceRef.current || allRouteCoords.length < 2) return;
      setRouteSummary({
        distanceKm: Math.round(totalKm * 10) / 10,
        durationMinutes: totalMins,
        vehicleLabel,
      });

      try {
        map.addSource('outbound-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: allRouteCoords,
            },
          },
        });
        map.addLayer({
          id: 'outbound-route-line',
          type: 'line',
          source: 'outbound-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#2563eb',
            'line-width': 4.5,
            'line-opacity': 0.9,
          },
        });

        const bounds = new maplibregl.LngLatBounds();
        allRouteCoords.forEach((pt) => bounds.extend(pt));
        map.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 700 });
      } catch {
        // ignore map style race
      }
    };

    void drawRoute();
  }, [filteredPins, mapReady, hubCoords, hub?.hubCode, selectedPin, onSelectTrip]);

  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    const win = typeof window !== 'undefined' ? (window as any) : {};
    const maplibregl = win.maplibregl;
    if (!map || !maplibregl) return;

    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([hubCoords.lng, hubCoords.lat]);
    filteredPins.forEach((p) => bounds.extend([p.coords.lng, p.coords.lat]));
    map.fitBounds(bounds, { padding: 70, maxZoom: 13.5, duration: 700 });
  };

  return (
    <div className="bg-[#071728] rounded-3xl overflow-hidden border border-slate-800 shadow-xl text-white">
      {/* Header Control Tower tối màu */}
      <div className="px-5 py-4 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
            <Navigation className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-wide uppercase text-white">
                {isInbound ? 'GIÁM SÁT ĐỘI XE & LỘ TRÌNH LẤY HÀNG RẪY' : 'GIÁM SÁT ĐỘI XE & TIẾN ĐỘ GIAO HÀNG'}
              </h2>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {counts.total} XE ĐANG HOẠT ĐỘNG
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isInbound
                ? 'Theo dõi trực tiếp vị trí phương tiện, lộ trình thu gom tại nhà vườn và kiểm soát nhiệt độ bảo quản nông sản về kho'
                : 'Theo dõi trực tiếp vị trí phương tiện, lộ trình giao hàng và kiểm soát nhiệt độ bảo quản nông sản trên đường giao'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          <button
            type="button"
            onClick={handleFitAll}
            className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition flex items-center gap-1.5 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Xem Toàn Bộ ({filteredPins.length} Xe)</span>
          </button>
          <span className="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Trực Tuyến: {counts.total} Xe</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sky-300 flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5" />
            <span>Bảo quản đạt chuẩn: {counts.safePct}%</span>
          </span>
        </div>
      </div>

      {/* Thanh Bộ lọc đội xe */}
      <div className="px-5 py-2.5 bg-[#0a1e33] border-b border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-slate-400 font-bold mr-1 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          Bộ lọc đội xe:
        </span>
        {[
          { id: 'ALL' as const, label: `Tất Cả (${counts.total})` },
          { id: 'TRUCK' as const, label: `Xe Tải Lạnh (${counts.truck})` },
          { id: 'VAN' as const, label: `Xe Bán Tải / Van (${counts.van})` },
          { id: 'ON_DELIVERY' as const, label: `${isInbound ? 'Đang Thu Gom' : 'Đang Giao Hàng'} (${counts.onDelivery})` },
          { id: 'AVAILABLE' as const, label: `Sẵn Sàng Tại Kho (${counts.available})` },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFleetFilter(f.id)}
            className={`px-3 py-1 rounded-full font-bold transition cursor-pointer border ${
              fleetFilter === f.id
                ? 'bg-sky-500 text-white border-sky-400 shadow-xs'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Vùng bản đồ */}
      <div className="relative w-full h-[380px] sm:h-[430px] bg-slate-900">
        {mapError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
            <MapPin className="w-8 h-8 text-slate-500" />
            <span>Không thể tải bản đồ Goong Maps (kiểm tra kết nối mạng).</span>
          </div>
        ) : (
          <div ref={mapContainerRef} className="w-full h-full" />
        )}

        {/* Popup nổi góc trên bên trái khi chọn 1 xe */}
        {selectedPin && (
          <div className="absolute top-3 left-3 z-10 w-80 max-w-[calc(100%-24px)] bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-3.5 shadow-2xl space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedPin.status === 'ON_DELIVERY'
                      ? 'bg-orange-500/20 text-orange-400'
                      : selectedPin.status === 'ASSIGNED'
                      ? 'bg-sky-500/20 text-sky-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <strong className="text-xs font-bold text-white">{selectedPin.driverName}</strong>
                    <span className="font-mono text-[10px] text-sky-300">({selectedPin.plateNumber})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">{hub?.hubName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPinKey(null);
                  if (onSelectTrip) onSelectTrip(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-800 space-y-1">
              {selectedPin.trip ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold">
                      • Đã gán {selectedPin.stopsCount} {isInbound ? 'điểm lấy' : 'điểm giao'} ({selectedPin.trip.tripCode})
                    </span>
                    <span className="font-mono text-[10px] text-amber-300">{selectedPin.tempText.split('•')[1]}</span>
                  </div>
                  {selectedPin.destinationAddress && (
                    <p className="text-[10px] text-slate-400 line-clamp-2">
                      Tuyến: {hub?.hubCode} → {selectedPin.destinationAddress}
                    </p>
                  )}
                  {routeSummary && routeSummary.distanceKm > 0 && (
                    <p className="text-[10px] font-bold text-sky-300 pt-0.5">
                      Lộ trình {routeSummary.vehicleLabel}: {routeSummary.distanceKm} km · ~{routeSummary.durationMinutes} phút
                    </p>
                  )}
                  {(selectedPin.trip as any)?.currentLat && (selectedPin.trip as any)?.currentLng && (
                    <p className="text-[10px] font-mono text-emerald-300 pt-0.5">
                      GPS Tài xế: {Number((selectedPin.trip as any).currentLat).toFixed(5)}, {Number((selectedPin.trip as any).currentLng).toFixed(5)}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between text-emerald-300">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Xe đang sẵn sàng nhận chuyến tại kho
                  </span>
                  <span className="font-mono text-[10px]">{selectedPin.tempText.split('•')[1]}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
