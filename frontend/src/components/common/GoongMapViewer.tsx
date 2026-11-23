'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Coordinates,
  GOONG_MAP_STYLE_URL,
  decodePolyline,
  getRouteDirections,
  getRouteStaticMapUrl,
  RouteDirectionResult,
} from '@/services/goongMapService';
import {
  MapPin,
  Truck,
  Navigation,
  ExternalLink,
  Thermometer,
  Clock,
  Layers,
  Maximize2,
  Minimize2,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface GoongMapViewerProps {
  origin?: {
    lat: number;
    lng: number;
    name?: string;
  };
  destination?: {
    lat: number;
    lng: number;
    name?: string;
  };
  center?: Coordinates;
  zoom?: number;
  height?: number;
  truckCode?: string;
  driverName?: string;
  temperature?: number;
  humidity?: number;
  statusBadge?: string;
  title?: string;
  className?: string;
}

// Hàm tải MapLibre GL JS & CSS nhẹ qua CDN (Zero-install, không tốn RAM máy)
interface MapLibreGlobal {
  Map: new (options: Record<string, unknown>) => {
    on: (event: string, callback: () => void) => void;
    remove: () => void;
    addControl: (control: unknown, position?: string) => void;
    addSource: (id: string, source: unknown) => void;
    addLayer: (layer: unknown) => void;
    getSource: (id: string) => unknown;
    fitBounds: (bounds: unknown, options?: unknown) => void;
  };
  NavigationControl: new () => unknown;
  Marker: new (options?: { element?: HTMLElement; color?: string }) => {
    setLngLat: (coords: [number, number]) => {
      setPopup: (popup: unknown) => {
        addTo: (map: unknown) => unknown;
      };
      addTo: (map: unknown) => unknown;
    };
  };
  Popup: new (options?: { offset?: number }) => {
    setHTML: (html: string) => unknown;
  };
  LngLatBounds: new () => {
    extend: (coords: [number, number]) => void;
  };
}

function loadMapLibreScript(): Promise<MapLibreGlobal> {
  return new Promise((resolve, reject) => {
    const win = typeof window !== 'undefined' ? (window as unknown as { maplibregl?: MapLibreGlobal }) : {};
    if (win.maplibregl) {
      resolve(win.maplibregl);
      return;
    }

    if (typeof document !== 'undefined') {
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
        else reject(new Error('MapLibre GL failed to attach to window'));
      };
      script.onerror = () => reject(new Error('Failed to load MapLibre GL from CDN'));
      document.head.appendChild(script);
    } else {
      reject(new Error('Window is undefined'));
    }
  });
}

export const GoongMapViewer: React.FC<GoongMapViewerProps> = ({
  origin = { lat: 11.9404, lng: 108.4583, name: 'Trạm Trung Chuyển Đức Trọng - Đà Lạt' },
  destination = { lat: 10.8231, lng: 106.6297, name: 'Kho Tổng Hợp Thủ Đức - TP.HCM' },
  center,
  zoom = 9,
  height = 360,
  truckCode,
  driverName,
  temperature,
  humidity,
  statusBadge = 'Đang vận tải chuỗi lạnh',
  title = 'Lộ Trình Xe Vận Tải Lạnh HoNa Express (Goong Maps)',
  className = '',
}) => {
  const [routeInfo, setRouteInfo] = useState<RouteDirectionResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [mapMode, setMapMode] = useState<'interactive' | 'static'>('interactive');
  const [mapLibreLoading, setMapLibreLoading] = useState(false);
  const [mapLibreError, setMapLibreError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageFallbackError, setImageFallbackError] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  // Tính tọa độ trung tâm giữa Origin và Destination nếu không truyền center
  const mapCenter: Coordinates = center || {
    lat: (origin.lat + destination.lat) / 2,
    lng: (origin.lng + destination.lng) / 2,
  };

  // 1. Tính toán khoảng cách & lộ trình qua Goong Direction API
  useEffect(() => {
    let isMounted = true;
    const fetchDirections = async () => {
      setLoadingRoute(true);
      try {
        const res = await getRouteDirections(origin, destination, 'truck');
        if (isMounted && res) {
          setRouteInfo(res);
        }
      } catch (err) {
        console.warn('Goong Direction API notice:', err);
      } finally {
        if (isMounted) setLoadingRoute(false);
      }
    };

    void fetchDirections();
    return () => {
      isMounted = false;
    };
  }, [origin.lat, origin.lng, destination.lat, destination.lng]);

  // 2. Khởi tạo MapLibre GL JS tương tác động khi ở mode 'interactive'
  useEffect(() => {
    if (mapMode !== 'interactive' || !mapContainerRef.current) return;

    let isMounted = true;
    setMapLibreLoading(true);
    setMapLibreError(false);

    loadMapLibreScript()
      .then((maplibregl) => {
        if (!isMounted || !mapContainerRef.current) return;

        // Xóa map cũ nếu có
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch {
            // bỏ qua
          }
          mapInstanceRef.current = null;
        }

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: GOONG_MAP_STYLE_URL,
          center: [mapCenter.lng, mapCenter.lat],
          zoom: zoom,
        });

        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        map.on('load', () => {
          if (!isMounted) return;
          setMapLibreLoading(false);

          // Tạo Marker A (Xuất phát)
          const elOrigin = document.createElement('div');
          elOrigin.className = 'flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-lg border-2 border-white ring-2 ring-emerald-400';
          elOrigin.innerText = 'A';
          new maplibregl.Marker({ element: elOrigin })
            .setLngLat([origin.lng, origin.lat])
            .setPopup(
              new maplibregl.Popup({ offset: 15 }).setHTML(
                `<div style="font-family:sans-serif;font-size:12px;padding:4px;">
                  <strong style="color:#059669;">Điểm Xuất Phát (A)</strong>
                  <p style="margin:2px 0 0;color:#374151;">${origin.name || 'Trạm Trung Chuyển'}</p>
                </div>`
              )
            )
            .addTo(map);

          // Tạo Marker B (Đích đến)
          const elDest = document.createElement('div');
          elDest.className = 'flex items-center justify-center w-7 h-7 rounded-full bg-rose-600 text-white font-bold text-xs shadow-lg border-2 border-white ring-2 ring-rose-400';
          elDest.innerText = 'B';
          new maplibregl.Marker({ element: elDest })
            .setLngLat([destination.lng, destination.lat])
            .setPopup(
              new maplibregl.Popup({ offset: 15 }).setHTML(
                `<div style="font-family:sans-serif;font-size:12px;padding:4px;">
                  <strong style="color:#e11d48;">Điểm Giao Nhận (B)</strong>
                  <p style="margin:2px 0 0;color:#374151;">${destination.name || 'Kho Nhận Hàng'}</p>
                </div>`
              )
            )
            .addTo(map);

          // Vẽ Route Polyline nếu đã giải mã được tọa độ
          const coords = routeInfo?.polyline ? decodePolyline(routeInfo.polyline) : [];
          if (coords.length > 0) {
            map.addSource('route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: coords,
                },
              },
            });

            map.addLayer({
              id: 'route-line',
              type: 'line',
              source: 'route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': '#10542C',
                'line-width': 5,
                'line-opacity': 0.85,
              },
            });

            // Tự động căn góc nhìn (Fit Bounds)
            const bounds = new maplibregl.LngLatBounds();
            coords.forEach((c) => bounds.extend(c));
            map.fitBounds(bounds, { padding: 40 });
          } else {
            const bounds = new maplibregl.LngLatBounds();
            bounds.extend([origin.lng, origin.lat]);
            bounds.extend([destination.lng, destination.lat]);
            map.fitBounds(bounds, { padding: 50 });
          }
        });

        mapInstanceRef.current = map;
      })
      .catch((err) => {
        console.warn('MapLibre GL init error, falling back to static map:', err);
        if (isMounted) {
          setMapLibreError(true);
          setMapLibreLoading(false);
          setMapMode('static');
        }
      });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
      }
    };
  }, [mapMode, origin.lat, origin.lng, destination.lat, destination.lng, routeInfo?.polyline, zoom, mapCenter.lat, mapCenter.lng]);

  // Sinh URL bản đồ tĩnh Goong Route Static Map chuẩn
  const staticMapUrl = getRouteStaticMapUrl({
    origin,
    destination,
    width: 800,
    height: isFullscreen ? 600 : height,
    vehicle: 'truck',
    color: '#10542C',
  });

  const goongWebUrl = `https://maps.goong.io/?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;

  const currentHeight = isFullscreen ? 560 : height;

  return (
    <div
      className={`bg-white rounded-3xl border border-[#EAECE8] overflow-hidden shadow-sm transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl flex flex-col' : ''
      } ${className}`}
    >
      {/* Header bản đồ */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#10542C]/5 to-transparent border-b border-[#F0F2ED] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h4 className="font-heading font-black text-sm sm:text-base text-[#10542C] flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#10542C]" /> {title}
            </h4>
          </div>
          <p className="text-[11px] text-[#6B7280] mt-0.5">
            Bản đồ số lộ trình vận chuyển nông sản ({mapMode === 'interactive' ? 'Bản đồ tương tác' : 'Ảnh lộ trình tĩnh'})
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {temperature !== undefined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Thermometer className="w-3.5 h-3.5 text-emerald-600" />
              Thùng xe: {temperature}°C
            </span>
          )}

          {truckCode && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold text-slate-800 bg-slate-100 rounded-lg">
              {truckCode}
            </span>
          )}

          {/* Toggle chế độ Tương tác / Tĩnh */}
          <button
            type="button"
            onClick={() => {
              setImageFallbackError(false);
              setMapMode((prev) => (prev === 'interactive' ? 'static' : 'interactive'));
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer text-[#10542C] bg-white border-[#CDE5CB] hover:bg-[#EAF5E9]"
            title="Đổi chế độ hiển thị bản đồ"
          >
            <Layers className="w-3 h-3 text-[#10542C]" />
            <span>{mapMode === 'interactive' ? 'Bản Đồ Động' : 'Ảnh Lộ Trình'}</span>
          </button>

          {/* Mở trang Goong Maps */}
          <a
            href={goongWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#10542C] bg-[#EAF6EE] hover:bg-[#D7EED6] rounded-lg transition-colors cursor-pointer"
          >
            <span>Mở Goong</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Nút Phóng to toàn màn hình */}
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Thông tin lộ trình & Trạm */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#F0F2ED] bg-[#FDFEFC] text-xs shrink-0">
        <div className="p-3.5 flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
            A
          </div>
          <div>
            <span className="text-[10px] text-[#6B7280] uppercase tracking-wider block">Trạm xuất phát:</span>
            <p className="font-bold text-[#2C3E2E] line-clamp-1">{origin.name}</p>
          </div>
        </div>

        <div className="p-3.5 flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
            B
          </div>
          <div>
            <span className="text-[10px] text-[#6B7280] uppercase tracking-wider block">Kho nhận hàng:</span>
            <p className="font-bold text-[#2C3E2E] line-clamp-1">{destination.name}</p>
          </div>
        </div>
      </div>

      {/* Thanh đo đạc khoảng cách & thời gian di chuyển (Direction stats) */}
      <div className="px-4 py-2.5 bg-[#F4F8F5] border-y border-[#EAECE8] flex items-center justify-between text-xs font-semibold text-[#2C3E2E] flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[#10542C]">
            <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            Quãng đường: {loadingRoute ? 'Đang tính...' : routeInfo?.distanceText || '305 km'}
          </span>
          <span className="flex items-center gap-1.5 text-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Thời gian di chuyển: {loadingRoute ? '...' : routeInfo?.durationText || '6 giờ 30 phút'}
          </span>
        </div>

        <span className="text-[11px] text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full font-bold">
          {statusBadge}
        </span>
      </div>

      {/* Khung hiển thị Bản đồ */}
      <div className="relative w-full overflow-hidden bg-slate-100 grow" style={{ height: currentHeight }}>
        {/* Chế độ Bản đồ Tương Tác MapLibre Vector Tiles */}
        {mapMode === 'interactive' && (
          <div ref={mapContainerRef} className="w-full h-full" />
        )}

        {/* Chế độ Ảnh Lộ Trình Tĩnh hoặc Fallback */}
        {mapMode === 'static' && !imageFallbackError && (
          <img
            src={staticMapUrl}
            alt="Bản đồ lộ trình Goong Maps"
            className="w-full h-full object-cover select-none"
            onError={() => {
              setImageFallbackError(true);
            }}
          />
        )}

        {/* Chế độ Vector Graphic Fallback khi cả MapLibre và Static ảnh gặp sự cố */}
        {(imageFallbackError || (mapMode === 'static' && imageFallbackError)) && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50/50 via-slate-50 to-emerald-100/30 p-6 text-center select-none relative">
            <div className="w-full max-w-md bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b pb-2">
                <span className="flex items-center gap-1 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Điểm A: Đức Trọng
                </span>
                <span className="text-slate-400">⟶</span>
                <span className="flex items-center gap-1 text-rose-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Điểm B: Thủ Đức
                </span>
              </div>

              {/* Sơ đồ tuyến đường minh họa */}
              <div className="py-2 flex items-center justify-center">
                <svg className="w-full h-16" viewBox="0 0 300 60" fill="none">
                  <path d="M 20 40 Q 150 10 280 40" stroke="#10542C" strokeWidth="4" strokeDasharray="6 4" />
                  <circle cx="20" cy="40" r="8" fill="#10B981" stroke="#fff" strokeWidth="2" />
                  <circle cx="280" cy="40" r="8" fill="#F43F5E" stroke="#fff" strokeWidth="2" />
                  <circle cx="150" cy="25" r="10" fill="#10542C" stroke="#fff" strokeWidth="2" />
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>Khoảng cách: <strong>{routeInfo?.distanceText || '305 km'}</strong></span>
                <span>Thời gian: <strong>{routeInfo?.durationText || '6 giờ 30 phút'}</strong></span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setImageFallbackError(false);
                  setMapMode('interactive');
                }}
                className="w-full py-2 bg-[#10542C] text-white text-xs font-bold rounded-xl hover:bg-[#0C3E20] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tải lại Bản đồ Tương tác Goong Tiles
              </button>
            </div>
          </div>
        )}

        {/* Loading Spinner khi tải MapLibre */}
        {mapMode === 'interactive' && mapLibreLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-xs font-semibold text-[#10542C] z-10">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Đang tải bản đồ lộ trình...</span>
          </div>
        )}

        {/* Overlay Chú thích Marker & Goong Branding */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-md border border-[#EAECE8] text-[11px] flex items-center gap-2 pointer-events-none z-10">
          <span className="flex items-center gap-1 text-emerald-700 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> A: Trạm xuất phát
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1 text-rose-700 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> B: Điểm giao hàng
          </span>
        </div>

        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg shadow-sm border border-[#EAECE8] text-[10px] font-bold text-[#10542C] flex items-center gap-1 pointer-events-none z-10">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>Bản đồ số vận tải HoNa Express</span>
        </div>
      </div>
    </div>
  );
};

export default GoongMapViewer;
