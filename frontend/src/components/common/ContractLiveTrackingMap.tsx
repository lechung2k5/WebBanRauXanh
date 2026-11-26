'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { GoongMapViewer } from '@/components/common/GoongMapViewer';
import { Coordinates, geocodeAddress } from '@/services/goongMapService';
import { api } from '@/services/auth';
import { b2bWebSocket } from '@/services/websocketService';

const HUB_COORDS_BY_NAME: Array<{ match: string; coords: Coordinates; label: string }> = [
  { match: 'củ chi', coords: { lat: 10.9733, lng: 106.5162 }, label: 'Tổng Kho Củ Chi (TP.HCM)' },
  { match: 'đức trọng', coords: { lat: 11.7346, lng: 108.3712 }, label: 'Trạm Đức Trọng (Lâm Đồng)' },
  { match: 'cái bè', coords: { lat: 10.3315, lng: 106.0342 }, label: 'Trạm Cái Bè (Tiền Giang)' },
  { match: 'buôn hồ', coords: { lat: 12.9125, lng: 108.2643 }, label: 'Kho Buôn Hồ (Đắk Lắk)' },
  { match: 'hà nội', coords: { lat: 21.0368, lng: 105.9154 }, label: 'Kho Miền Bắc (Hà Nội)' },
];

const geoCache = new Map<string, Coordinates>();

export function resolveHubOrigin(hubName?: string): { lat: number; lng: number; name: string } {
  const lower = String(hubName || '').toLowerCase();
  const found = HUB_COORDS_BY_NAME.find((h) => lower.includes(h.match));
  if (found) return { ...found.coords, name: found.label };
  return { lat: 11.7346, lng: 108.3712, name: hubName || 'Trạm Trung Chuyển Đức Trọng' };
}

interface ContractLiveTrackingMapProps {
  contract: any;
  height?: number;
}

export const ContractLiveTrackingMap: React.FC<ContractLiveTrackingMapProps> = ({
  contract,
  height = 280,
}) => {
  const contractId = Number(contract?.id || 0);
  const contractCode = contract?.contractCode || contract?.contract_code || '';
  const hubName = contract?.hubName || contract?.hub_name || 'Trạm Trung Chuyển Đức Trọng';

  const [liveGps, setLiveGps] = useState<{
    lat?: number;
    lng?: number;
    updatedAt?: string;
    plateNumber?: string;
    driverName?: string;
    deliveryAddress?: string;
    hubName?: string;
    hubLat?: number;
    hubLng?: number;
  }>({});

  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;
    api<any>(`portal/contracts/${contractId}/live-gps`)
      .then((res) => {
        if (!res || cancelled) return;
        const lat = Number(res.lat ?? 0);
        const lng = Number(res.lng ?? 0);
        const hLat = Number(res.hub_lat ?? res.hubLat ?? 0);
        const hLng = Number(res.hub_lng ?? res.hubLng ?? 0);
        setLiveGps({
          lat: lat || undefined,
          lng: lng || undefined,
          updatedAt: res.gps_updated_at || res.gpsUpdatedAt,
          plateNumber: res.plate_number || res.plateNumber,
          driverName: res.driver_name || res.driverName,
          deliveryAddress: res.delivery_address || res.deliveryAddress,
          hubName: res.hub_name || res.hubName,
          hubLat: hLat || undefined,
          hubLng: hLng || undefined,
        });
      })
      .catch(() => {});

    const unsub = b2bWebSocket.subscribeContracts((evt: any) => {
      if (!evt) return;
      const evtContractId = Number(evt.contractId ?? evt.payload?.contractId ?? 0);
      const evtCode = evt.contractCode || evt.payload?.contractCode;
      if (
        (evtContractId && evtContractId === contractId) ||
        (evtCode && contractCode && evtCode === contractCode)
      ) {
        const lat = Number(evt.lat ?? evt.driverGpsLat ?? evt.payload?.lat ?? evt.payload?.driverGpsLat ?? 0);
        const lng = Number(evt.lng ?? evt.driverGpsLng ?? evt.payload?.lng ?? evt.payload?.driverGpsLng ?? 0);
        if (lat && lng) {
          setLiveGps((prev) => ({
            ...prev,
            lat,
            lng,
            updatedAt: evt.gpsUpdatedAt || evt.driverGpsUpdatedAt || new Date().toISOString(),
          }));
        }
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [contractId, contractCode]);

  const deliveryAddress =
    liveGps.deliveryAddress ||
    contract?.deliveryAddress ||
    contract?.delivery_address ||
    'Địa chỉ Thương lái';

  const origin = useMemo(() => {
    if (liveGps.hubLat && liveGps.hubLng) {
      return {
        lat: liveGps.hubLat,
        lng: liveGps.hubLng,
        name: liveGps.hubName || hubName,
      };
    }
    return resolveHubOrigin(liveGps.hubName || hubName);
  }, [hubName, liveGps.hubName, liveGps.hubLat, liveGps.hubLng]);
  const [destCoords, setDestCoords] = useState<Coordinates>(() => {
    return geoCache.get(deliveryAddress) || { lat: 10.8231, lng: 106.6297 };
  });

  useEffect(() => {
    if (!deliveryAddress) return;
    if (geoCache.has(deliveryAddress)) {
      setDestCoords(geoCache.get(deliveryAddress)!);
      return;
    }
    let cancelled = false;
    geocodeAddress(deliveryAddress).then((res) => {
      if (res && !cancelled) {
        geoCache.set(deliveryAddress, res);
        setDestCoords(res);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [deliveryAddress]);

  const gpsLat = Number(liveGps.lat ?? contract?.driverGpsLat ?? contract?.driver_gps_lat ?? 0);
  const gpsLng = Number(liveGps.lng ?? contract?.driverGpsLng ?? contract?.driver_gps_lng ?? 0);
  const gpsUpdatedAt = liveGps.updatedAt || contract?.driverGpsUpdatedAt || contract?.driver_gps_updated_at;
  const truckPlate =
    liveGps.plateNumber ||
    contract?.outboundTruckPlate ||
    contract?.outbound_truck_plate ||
    contract?.truckLicensePlate ||
    'Xe Lạnh HoNa';
  const driverName =
    liveGps.driverName ||
    contract?.outboundDriverName ||
    contract?.outbound_driver_name ||
    'Tài xế HoNa Express';

  const currentPosition =
    gpsLat && gpsLng
      ? { lat: gpsLat, lng: gpsLng, updatedAt: gpsUpdatedAt, label: truckPlate }
      : { lat: origin.lat, lng: origin.lng, updatedAt: gpsUpdatedAt, label: truckPlate };

  return (
    <GoongMapViewer
      origin={origin}
      destination={{ ...destCoords, name: deliveryAddress }}
      currentPosition={currentPosition}
      height={height}
      truckCode={truckPlate}
      driverName={driverName}
      temperature={3.5}
      statusBadge="Đang giao hàng (GPS Live)"
      title={`Lộ Trình Giao Hàng — ${contract?.contractCode || contract?.contract_code || ''}`}
    />
  );
};
