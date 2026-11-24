import { api } from './auth';

export interface WarehouseHubDto {
  id: number;
  hubCode: string;
  hubName: string;
  region: string;
  address: string;
  latitude?: number;
  longitude?: number;
  hotline?: string;
  managerName?: string;
  active: boolean;
}

export const DEFAULT_OFFICIAL_HUBS: WarehouseHubDto[] = [
  {
    id: 1,
    hubCode: 'HUB-CU-CHI',
    hubName: 'Tổng Kho Chuỗi Lạnh Củ Chi (Hub TP.HCM)',
    region: 'Đông Nam Bộ & TP.HCM',
    address: 'Tỉnh Lộ 8, Xã Tân An Hội, Huyện Củ Chi, TP. Hồ Chí Minh',
    latitude: 10.9732,
    longitude: 106.4955,
    hotline: '0901.888.111',
    managerName: 'Trần Anh Tuấn',
    active: true,
  },
  {
    id: 2,
    hubCode: 'HUB-DUC-TRONG',
    hubName: 'Trạm Trung Chuyển Đức Trọng (Hub Lâm Đồng)',
    region: 'Tây Nguyên & Lâm Đồng',
    address: 'QL20, TT. Liên Nghĩa, Huyện Đức Trọng, Lâm Đồng',
    latitude: 11.7345,
    longitude: 108.3752,
    hotline: '0901.888.222',
    managerName: 'Nguyễn Thanh Tùng',
    active: true,
  },
  {
    id: 3,
    hubCode: 'HUB-CAI-BE',
    hubName: 'Trạm Trung Chuyển Cái Bè (Hub ĐBSCL)',
    region: 'Tây Nam Bộ / ĐBSCL',
    address: 'QL1A, Xã An Thái Trung, Huyện Cái Bè, Tiền Giang',
    latitude: 10.3621,
    longitude: 105.9523,
    hotline: '0901.888.333',
    managerName: 'Lê Hữu Nghĩa',
    active: true,
  },
  {
    id: 4,
    hubCode: 'HUB-BUON-HO',
    hubName: 'Kho Nông Sản Buôn Hồ (Hub Đắk Lắk)',
    region: 'Tây Nguyên & Đắk Lắk',
    address: 'QL14, Phường Đoàn Kết, Thị xã Buôn Hồ, Đắk Lắk',
    latitude: 12.9125,
    longitude: 108.2612,
    hotline: '0901.888.444',
    managerName: 'Phạm Minh Đức',
    active: true,
  },
  {
    id: 5,
    hubCode: 'HUB-HA-NOI',
    hubName: 'Kho Logistics Nông Sản Miền Bắc (Hub Hà Nội)',
    region: 'Miền Bắc & Hà Nội',
    address: 'KCN Đài Tư, Phường Sài Đồng, Quận Long Biên, Hà Nội',
    latitude: 21.0315,
    longitude: 105.9184,
    hotline: '0901.888.555',
    managerName: 'Hoàng Đình Nam',
    active: true,
  },
];

export interface FleetVehicleDto {
  id: number;
  plateNumber: string;
  vehicleModel: string;
  vehicleType: string;
  capacityKg: number;
  volumeM3: number;
  minTemp: number;
  maxTemp: number;
  status: 'AVAILABLE' | 'ASSIGNED' | 'ON_TRIP' | 'MAINTENANCE';
  notes?: string;
}

export interface FleetDriverDto {
  id: number;
  driverCode: string;
  fullName: string;
  phone: string;
  licenseNumber: string;
  licenseClass: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'ON_TRIP' | 'OFF_DUTY';
  experienceYears: number;
}

export interface WaitingLotDto {
  id: number;
  contract_code: string;
  lot_id?: number;
  status: string;
  fulfillment_status: string;
  packaging_approved: boolean;
  hub_name?: string;
  farm_pickup_address?: string;
  product_name?: string;
  variety?: string;
  farmer_name?: string;
  farmer_phone?: string;
  farmer_company?: string;
  actual_harvest_weight_kg?: number;
  offered_weight_kg?: number;
  package_count?: number;
  package_type?: string;
  computedWeightKg: number;
  computedVolumeM3: number;
  computedPackageCount: number;
  computedPackageType: string;
  created_at?: string;
}

export interface ProposedStopDto {
  stopOrder: number;
  contractId: number;
  contractCode: string;
  farmerName: string;
  farmerPhone: string;
  pickupAddress: string;
  productName: string;
  weightKg: number;
  volumeM3: number;
  packageCount: number;
  packageType: string;
}

export interface ProposedTripDto {
  tempTripId: string;
  vehicleId: number;
  plateNumber: string;
  vehicleModel: string;
  capacityKg: number;
  volumeM3: number;
  driverId: number;
  driverName: string;
  driverPhone: string;
  licenseClass: string;
  totalWeightKg: number;
  totalVolumeM3: number;
  weightLoadPercentage: number;
  volumeLoadPercentage: number;
  totalPackages: number;
  stops: ProposedStopDto[];
}

export interface UnassignedContractDto {
  contractId: number;
  contractCode: string;
  farmerName: string;
  pickupAddress: string;
  weightKg: number;
  volumeM3: number;
  reasonCode: string;
  reasonDescription: string;
}

export interface DispatchOptimizationResultDto {
  warehouseId: number;
  hubCode: string;
  hubName: string;
  totalWaitingLots: number;
  assignedLotsCount: number;
  unassignedLotsCount: number;
  proposedTrips: ProposedTripDto[];
  unassignedContracts: UnassignedContractDto[];
}

export interface PickupTripStopDto {
  id: number;
  contractId: number;
  contractCode?: string;
  stopOrder: number;
  farmerName: string;
  pickupAddress: string;
  contactPhone: string;
  weightKg: number;
  volumeM3: number;
  packageCount: number;
  status: 'PENDING' | 'ARRIVED' | 'LOADED' | 'ISSUE_REPORTED' | 'SKIPPED' | 'CANCELLED';
  arrivedAt?: string;
  loadedAt?: string;
  actualWeightKg?: number;
  actualPackageCount?: number;
  handoverPhotoUrl?: string;
  handoverSignatureData?: string;
  issueReason?: string;
  issueNotes?: string;
  notes?: string;
  contract?: any;
}

export interface PickupTripDto {
  id: number;
  tripCode: string;
  status: 'ASSIGNED' | 'ACKNOWLEDGED' | 'ON_TRIP' | 'RETURNING' | 'ARRIVED_AT_WAREHOUSE' | 'COMPLETED' | 'CANCELLED' | 'DEPARTED' | 'IN_PROGRESS';
  totalWeightKg: number;
  totalVolumeM3: number;
  totalPackages: number;
  totalStops: number;
  acknowledgedAt?: string;
  departureTime?: string;
  returningTime?: string;
  arrivedWarehouseTime?: string;
  completionTime?: string;
  actualTotalWeightKg?: number;
  actualTotalPackages?: number;
  receivingStaffId?: number;
  receivingNotes?: string;
  cancellationReason?: string;
  createdBy?: string;
  createdAt: string;
  vehicle: FleetVehicleDto;
  driver: FleetDriverDto;
  warehouse: WarehouseHubDto;
  stops: PickupTripStopDto[];
}

export const fleetDispatchApi = {
  // Hubs
  getHubs: () => api<WarehouseHubDto[]>('admin/dispatch/hubs'),
  getHubById: (id: number) => api<WarehouseHubDto>(`admin/dispatch/hubs/${id}`),

  // Vehicles
  getVehicles: (warehouseId: number, status?: string) =>
    api<FleetVehicleDto[]>(`admin/dispatch/vehicles?warehouseId=${warehouseId}${status ? `&status=${status}` : ''}`),
  createVehicle: (data: any) =>
    api<FleetVehicleDto>('admin/dispatch/vehicles', 'POST', data),
  updateVehicleStatus: (id: number, status: string) =>
    api<FleetVehicleDto>(`admin/dispatch/vehicles/${id}/status`, 'PATCH', { status }),

  // Drivers
  getDrivers: (warehouseId: number, status?: string) =>
    api<FleetDriverDto[]>(`admin/dispatch/drivers?warehouseId=${warehouseId}${status ? `&status=${status}` : ''}`),
  createDriver: (data: any) =>
    api<FleetDriverDto>('admin/dispatch/drivers', 'POST', data),
  updateDriverStatus: (id: number, status: string) =>
    api<FleetDriverDto>(`admin/dispatch/drivers/${id}/status`, 'PATCH', { status }),

  // Dispatching
  getWaitingLots: (warehouseId?: number) =>
    api<WaitingLotDto[]>(`admin/dispatch/waiting-lots${warehouseId ? `?warehouseId=${warehouseId}` : ''}`),
  autoOptimize: (warehouseId: number, contractIds?: number[]) =>
    api<DispatchOptimizationResultDto>('admin/dispatch/auto-optimize', 'POST', { warehouseId, contractIds }),
  confirmTrip: (warehouseId: number, vehicleId: number, driverId: number, stops: { contractId: number; stopOrder: number }[]) =>
    api<PickupTripDto>(`admin/dispatch/confirm-trip?warehouseId=${warehouseId}`, 'POST', { vehicleId, driverId, stops }),
  cancelTrip: (tripId: number, cancelReason: string) =>
    api<any>(`admin/dispatch/trips/${tripId}/cancel`, 'POST', { cancelReason }),
  getTrips: (warehouseId: number) =>
    api<PickupTripDto[]>(`admin/dispatch/trips?warehouseId=${warehouseId}`),
  getTripDetail: (id: number) =>
    api<PickupTripDto>(`admin/dispatch/trips/${id}`),

  // Driver actions (Giai đoạn 2 -> 6)
  getMyTrips: () => api<PickupTripDto[]>('driver/pickup-trips/my-trips'),
  acknowledgeTrip: (tripId: number) =>
    api<PickupTripDto>(`driver/pickup-trips/${tripId}/acknowledge`, 'POST'),
  departTrip: (tripId: number) =>
    api<PickupTripDto>(`driver/pickup-trips/${tripId}/depart`, 'POST'),
  arriveStop: (stopId: number) =>
    api<PickupTripStopDto>(`driver/pickup-trips/stops/${stopId}/arrive`, 'POST'),
  loadStop: (
    stopId: number,
    data: {
      actualWeightKg: number;
      actualPackageCount?: number;
      handoverPhotoUrl?: string;
      handoverSignatureData?: string;
      notes?: string;
    }
  ) => api<PickupTripStopDto>(`driver/pickup-trips/stops/${stopId}/load`, 'POST', data),
  reportStopIssue: (
    stopId: number,
    data: {
      issueReason: string;
      issueNotes?: string;
    }
  ) => api<PickupTripStopDto>(`driver/pickup-trips/stops/${stopId}/report-issue`, 'POST', data),
  returnToHub: (tripId: number) =>
    api<PickupTripDto>(`driver/pickup-trips/${tripId}/return-hub`, 'POST'),

  // Legacy driver actions
  markDeparted: (tripId: number) => api<PickupTripDto>(`driver/pickup-trips/${tripId}/depart`, 'POST'),
  updateStopStatus: (stopId: number, status: string, notes?: string) =>
    api<PickupTripStopDto>(`driver/pickup-trips/stops/${stopId}/status`, 'POST', { status, notes }),
  completeTrip: (tripId: number) => api<PickupTripDto>(`driver/pickup-trips/${tripId}/complete`, 'POST'),

  // Warehouse receiving actions (Giai đoạn 7)
  getReceivingTrips: (warehouseId?: number) =>
    api<PickupTripDto[]>(`warehouse/receiving/trips${warehouseId ? `?warehouseId=${warehouseId}` : ''}`)
      .catch(() => api<PickupTripDto[]>(`admin/dispatch/trips${warehouseId ? `?warehouseId=${warehouseId}` : ''}`)),
  getReceivingTripDetail: (tripId: number) =>
    api<PickupTripDto>(`warehouse/receiving/trips/${tripId}`)
      .catch(() => api<PickupTripDto>(`admin/dispatch/trips/${tripId}`)),
  confirmTruckArrival: (tripId: number) =>
    api<PickupTripDto>(`warehouse/receiving/trips/${tripId}/arrive`, 'POST')
      .catch(() => api<PickupTripDto>(`admin/dispatch/trips/${tripId}/arrive`, 'POST')),
  completeReceiving: (
    tripId: number,
    data: {
      actualTotalWeightKg?: number;
      actualTotalPackages?: number;
      receivingNotes?: string;
      lotItems?: {
        contractId: number;
        receivedWeightKg?: number;
        qualifiedWeightKg?: number;
        rejectedWeightKg?: number;
        packageCount?: number;
        coldZone?: string;
        rackBin?: string;
        qcNotes?: string;
      }[];
    }
  ) =>
    api<PickupTripDto>(`warehouse/receiving/trips/${tripId}/complete`, 'POST', data)
      .catch(() => api<PickupTripDto>(`admin/dispatch/trips/${tripId}/complete`, 'POST', data)),
  getHubInventory: (warehouseId?: number) =>
    api<any[]>(`warehouse/receiving/inventory${warehouseId ? `?warehouseId=${warehouseId}` : ''}`)
      .catch(() => api<any[]>(`admin/dispatch/inventory${warehouseId ? `?warehouseId=${warehouseId}` : ''}`)),
  submitWarehouseInboundQc: (contractId: number, data: any) =>
    api<any>(`admin/contracts/${contractId}/warehouse-inbound`, 'POST', data),

  // Outbound Dispatch actions (Phase 1)
  getEligibleOutboundContracts: (hubId: number) =>
    api<EligibleOutboundContractDto[]>(`admin/outbound-dispatch/eligible-contracts?hubId=${hubId}`),
  confirmOutboundTrip: (hubId: number, data: ConfirmOutboundTripRequest) =>
    api<OutboundDeliveryTripDto>(`admin/outbound-dispatch/confirm-trip?hubId=${hubId}`, 'POST', data),
  getOutboundTrips: (hubId: number) =>
    api<OutboundDeliveryTripDto[]>(`admin/outbound-dispatch/trips?hubId=${hubId}`),
  getCompletedDeliveries: (hubId?: number) =>
    api<OutboundDeliveryStopDto[]>(`admin/outbound-dispatch/completed-deliveries${hubId ? `?hubId=${hubId}` : ''}`),
  getOutboundTripDetail: (tripId: number) =>
    api<OutboundDeliveryTripDto>(`admin/outbound-dispatch/trips/${tripId}`),
  cancelOutboundTrip: (tripId: number, reason: string) =>
    api<any>(`admin/outbound-dispatch/trips/${tripId}/cancel`, 'POST', { reason }),

  // Driver Outbound Execution (Phase 2)
  getMyOutboundTrips: () =>
    api<OutboundDeliveryTripDto[]>('driver/outbound-trips/my-trips'),
  getDriverOutboundTripDetail: (tripId: number) =>
    api<OutboundDeliveryTripDto>(`driver/outbound-trips/${tripId}`),
  departOutboundTrip: (tripId: number) =>
    api<OutboundDeliveryTripDto>(`driver/outbound-trips/${tripId}/depart`, 'POST'),
  arriveOutboundStop: (stopId: number) =>
    api<OutboundDeliveryStopDto>(`driver/outbound-trips/stops/${stopId}/arrive`, 'POST'),
  submitDriverOutboundEpod: (stopId: number, data: DriverOutboundEpodRequest) =>
    api<OutboundDeliveryStopDto>(`driver/outbound-trips/stops/${stopId}/submit-epod`, 'POST', data),

  // Buyer Outbound Confirmation & ePOD (Phase 2)
  getBuyerPendingDeliveries: () =>
    api<OutboundDeliveryStopDto[]>('buyer/outbound-deliveries/pending'),
  getBuyerDeliveries: () =>
    api<OutboundDeliveryStopDto[]>('buyer/outbound-deliveries/my-deliveries'),
  getBuyerStopDetail: (stopId: number) =>
    api<OutboundDeliveryStopDto>(`buyer/outbound-deliveries/stops/${stopId}`),
  confirmBuyerEpod: (stopId: number, data: BuyerEpodConfirmRequest) =>
    api<OutboundDeliveryStopDto>(`buyer/outbound-deliveries/stops/${stopId}/confirm-epod`, 'POST', data),

  // Settlement & Quyết toán hợp đồng (Phase 3)
  getSettlementQuote: (contractId: number) =>
    api<any>(`admin/outbound-dispatch/contracts/${contractId}/settlement-quote`),
  confirmSettlement: (contractId: number, data?: any) =>
    api<any>(`admin/outbound-dispatch/contracts/${contractId}/confirm-settlement`, 'POST', data || {}),
};

export interface EligibleOutboundContractDto {
  contractId: number;
  contractCode: string;
  buyerId?: number;
  buyerName: string;
  buyerPhone: string;
  deliveryAddress: string;
  buyerWarehouseId?: number;
  productName: string;
  qualifiedWeightKg: number;
  volumeM3: number;
  packageCount: number;
  hubName: string;
  coldZone: string;
  rackBin: string;
  hubDeliveryDate?: string;
  qcStatus: string;
}

export interface ConfirmOutboundTripRequest {
  vehicleId: number;
  driverId: number;
  notes?: string;
  stops: {
    contractId: number;
    buyerWarehouseId?: number;
    stopSequence?: number;
    deliveryAddress?: string;
    contactName?: string;
    contactPhone?: string;
  }[];
}

export interface DriverOutboundEpodRequest {
  actualDeliveredWeightKg: number;
  rejectedWeightKg?: number;
  rejectionReason?: string;
  driverSignatureData: string;
  driverNotes?: string;
  handoverPhotoUrl?: string;
}

export interface BuyerEpodConfirmRequest {
  buyerSignerName: string;
  buyerSignerPhone: string;
  buyerSignatureData: string;
  buyerNotes?: string;
}

export interface OutboundDeliveryStopDto {
  id: number;
  contractId: number;
  contractCode?: string;
  buyerWarehouseId?: number;
  stopSequence: number;
  deliveryAddressSnapshot: string;
  contactNameSnapshot?: string;
  contactPhoneSnapshot?: string;
  expectedWeightKg: number;
  status: 'PLANNED' | 'ASSIGNED' | 'ARRIVED' | 'DRIVER_SUBMITTED' | 'PENDING_BUYER_CONFIRMATION' | 'BUYER_CONFIRMED' | 'REJECTED' | 'CANCELLED';
  arrivedAt?: string;
  driverSubmittedAt?: string;
  buyerConfirmedAt?: string;
  actualDeliveredWeightKg?: number;
  rejectedWeightKg?: number;
  rejectionReason?: string;
  driverSignatureData?: string;
  driverNotes?: string;
  buyerSignerName?: string;
  buyerSignerPhone?: string;
  buyerSignatureData?: string;
  buyerNotes?: string;
  handoverPhotoUrl?: string;
  createdAt: string;
  tripId?: number;
  tripCode?: string;
  vehiclePlate?: string;
  driverName?: string;
  hubName?: string;
  contract?: any;
}

export interface OutboundDeliveryTripDto {
  id: number;
  tripCode: string;
  status: 'DRAFT' | 'ASSIGNED' | 'ON_DELIVERY' | 'COMPLETED' | 'CANCELLED';
  plannedDepartureAt?: string;
  departedAt?: string;
  completedAt?: string;
  totalLoadedWeightKg: number;
  totalVolumeM3: number;
  totalStops: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  hub: WarehouseHubDto;
  vehicle: FleetVehicleDto;
  driver: FleetDriverDto;
  stops: OutboundDeliveryStopDto[];
}
