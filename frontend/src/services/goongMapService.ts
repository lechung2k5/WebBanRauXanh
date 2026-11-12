/**
 * Goong Map Service for HoNa Fresh B2B & B2C
 * Tích hợp bản đồ số Goong: AutoComplete địa chỉ, Geocoding, Đo khoảng cách & Tuyến đường xe tải lạnh
 */

export const GOONG_API_KEY =
  process.env.NEXT_PUBLIC_GOONG_API_KEY || 'MPEqUMBdbR1WFaTmu1JfbmviYgyScrQwQ91fXcGL';
export const GOONG_MAPTILES_KEY =
  process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || 'EIrCceGEt7N0SEv9nMJfM9DySzFRyYygRXYqv61t';

export interface GoongPrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  compound?: {
    district?: string;
    commune?: string;
    province?: string;
  };
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PlaceDetailResult {
  place_id: string;
  formatted_address: string;
  name: string;
  location: Coordinates;
  compound?: {
    district?: string;
    commune?: string;
    province?: string;
  };
}

export interface RouteDirectionResult {
  distanceKm: number;
  distanceText: string;
  durationMinutes: number;
  durationText: string;
  polyline: string;
}

/**
 * Gợi ý địa chỉ tiếng Việt thời gian thực (Places AutoComplete)
 */
export async function searchAddressSuggestions(keyword: string): Promise<GoongPrediction[]> {
  if (!keyword || keyword.trim().length < 2) return [];

  try {
    const url = `https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(
      keyword.trim()
    )}&limit=6`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status === 'OK' && Array.isArray(data.predictions)) {
      return data.predictions as GoongPrediction[];
    }
    return [];
  } catch (error) {
    console.error('Lỗi tìm kiếm địa chỉ Goong:', error);
    return [];
  }
}

/**
 * Lấy tọa độ lat/lng và địa chỉ chi tiết theo place_id
 */
export async function getPlaceDetail(placeId: string): Promise<PlaceDetailResult | null> {
  if (!placeId) return null;

  try {
    const url = `https://rsapi.goong.io/Place/Detail?api_key=${GOONG_API_KEY}&place_id=${encodeURIComponent(
      placeId
    )}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'OK' && data.result) {
      const r = data.result;
      return {
        place_id: r.place_id,
        formatted_address: r.formatted_address || r.name,
        name: r.name,
        location: {
          lat: r.geometry?.location?.lat || 0,
          lng: r.geometry?.location?.lng || 0,
        },
        compound: r.compound,
      };
    }
    return null;
  } catch (error) {
    console.error('Lỗi lấy chi tiết địa chỉ Goong:', error);
    return null;
  }
}

/**
 * Chuyển địa chỉ dạng text thành tọa độ lat/lng (Geocoding)
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  if (!address || !address.trim()) return null;

  try {
    const url = `https://rsapi.goong.io/Geocode?api_key=${GOONG_API_KEY}&address=${encodeURIComponent(
      address.trim()
    )}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const loc = data.results[0].geometry?.location;
      if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        return { lat: loc.lat, lng: loc.lng };
      }
    }
    return null;
  } catch (error) {
    console.error('Lỗi Geocode Goong:', error);
    return null;
  }
}

/**
 * Lấy địa chỉ từ tọa độ GPS (Reverse Geocoding)
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://rsapi.goong.io/Geocode?api_key=${GOONG_API_KEY}&latlng=${lat},${lng}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      return data.results[0].formatted_address || null;
    }
    return null;
  } catch (error) {
    console.error('Lỗi Reverse Geocode Goong:', error);
    return null;
  }
}

/**
 * Tính toán lộ trình đường bộ xe tải lạnh (TMS Direction) giữa 2 điểm
 */
export async function getRouteDirections(
  origin: Coordinates,
  destination: Coordinates,
  vehicle: 'truck' | 'car' | 'bike' = 'truck'
): Promise<RouteDirectionResult | null> {
  try {
    const url = `https://rsapi.goong.io/Direction?api_key=${GOONG_API_KEY}&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&vehicle=${vehicle}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'OK' && Array.isArray(data.routes) && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs?.[0];
      const distanceMeters = leg?.distance?.value || 0;
      const durationSeconds = leg?.duration?.value || 0;

      return {
        distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
        distanceText: leg?.distance?.text || `${Math.round(distanceMeters / 1000)} km`,
        durationMinutes: Math.round(durationSeconds / 60),
        durationText: leg?.duration?.text || `${Math.round(durationSeconds / 60)} phút`,
        polyline: route.overview_polyline?.points || '',
      };
    }
    return null;
  } catch (error) {
    console.error('Lỗi tính lộ trình Goong:', error);
    return null;
  }
}

/**
 * Vector Tiles Style URL dùng cho MapLibre GL JS / Goong JS
 */
export const GOONG_MAP_STYLE_URL = `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAPTILES_KEY}`;

/**
 * Giải mã Google/Goong encoded polyline thành mảng tọa độ [lng, lat] dùng cho GeoJSON
 */
export function decodePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  const poly: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push([lng * 1e-5, lat * 1e-5]);
  }
  return poly;
}

/**
 * Sinh URL bản đồ tĩnh lộ trình Goong Static Map (Route Static Map)
 */
export function getRouteStaticMapUrl({
  origin,
  destination,
  width = 800,
  height = 360,
  vehicle = 'truck',
  color = '#10542C',
}: {
  origin: Coordinates;
  destination: Coordinates;
  width?: number;
  height?: number;
  vehicle?: 'truck' | 'car' | 'bike';
  color?: string;
}): string {
  const encodedColor = encodeURIComponent(color);
  return `https://rsapi.goong.io/staticmap/route?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&vehicle=${vehicle}&width=${width}&height=${height}&color=${encodedColor}&api_key=${GOONG_API_KEY}`;
}

/**
 * Sinh URL bản đồ tĩnh Goong (tương thích backward)
 */
export function getStaticMapUrl({
  center,
  zoom = 14,
  width = 600,
  height = 320,
  markers = [],
}: {
  center: Coordinates;
  zoom?: number;
  width?: number;
  height?: number;
  markers?: Array<{ lat: number; lng: number; color?: string; label?: string }>;
}): string {
  if (markers.length >= 2) {
    return getRouteStaticMapUrl({
      origin: { lat: markers[0].lat, lng: markers[0].lng },
      destination: { lat: markers[1].lat, lng: markers[1].lng },
      width,
      height,
    });
  }
  return getRouteStaticMapUrl({
    origin: center,
    destination: markers[0] ? { lat: markers[0].lat, lng: markers[0].lng } : center,
    width,
    height,
  });
}

