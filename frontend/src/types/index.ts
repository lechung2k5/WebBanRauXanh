export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  enabled: boolean;
  roles: string[];
}

export interface AuthResponse {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  enabled: boolean;
  roles: string[];
  token?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  productCount?: number;
}

export interface TieredPrice {
  minQuantity: number;
  unitPrice: number;
  discountLabel: string;
}

export interface Product {
  id: number | string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  stockQuantity: number;
  unit: string;
  imageUrl: string;
  origin?: string;
  brand?: string;
  category?: string;
  categorySlug?: string;
  rating?: number;
  reviewCount?: number;
  isOrganic?: boolean;
  isFeatured?: boolean;
  isActive?: boolean;
  categoryId?: number;
  categoryName?: string;

  // B2B Agri-Trade Attributes
  wholesaleUnit?: string;
  moq?: number; // Minimum Order Quantity in kg
  totalLotVolume?: number; // Total lot volume in kg
  availableVolume?: number; // Remaining volume in kg
  farmName?: string;
  farmLocation?: string;
  region?: string;
  regionName?: string;
  pucCode?: string; // Mã số vùng trồng kiểm định
  certification?: string[] | string;
  harvestStage?: 'harvesting' | 'upcoming' | 'pre_order' | 'Đang thu hoạch' | 'Sắp thu hoạch' | 'Chào bán trước vụ' | string;
  harvestDate?: string;
  harvestDateRaw?: string;
  tieredPricing?: TieredPrice[];
  storageCondition?: string;
  shippingTerms?: string;
  farmContactPhone?: string;
}

export interface B2BRFQNegotiation {
  id: string;
  productId: string | number;
  productName: string;
  productImageUrl?: string;
  farmName: string;
  traderName: string;
  traderPhone: string;
  traderCompany?: string;
  requestedQuantity: number; // in kg
  targetPrice: number; // in VND/kg
  deliveryLocation: string;
  deliveryDate: string;
  shippingOption: 'farm_pickup' | 'farm_delivery' | 'cold_storage_truck';
  notes?: string;
  status: 'PENDING' | 'ACCEPTED' | 'COUNTER_OFFER' | 'REJECTED';
  createdAt: string;
}

export interface B2BProcurementRequest {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  traderName: string;
  traderCompany: string;
  volumeNeeded: string;
  targetPriceRange: string;
  preferredRegion: string;
  destination: string;
  deadline: string;
  status: 'OPEN' | 'IN_NEGOTIATION' | 'CLOSED';
  quoteCount: number;
  createdAt: string;
}

export interface FarmCooperative {
  id: string;
  name: string;
  location: string;
  region: string;
  cultivatedArea: string; // e.g. "45 Hecta"
  monthlyCapacity: string; // e.g. "120 Tấn / Tháng"
  establishedYear: number;
  pucCode: string;
  certifications: string[];
  contactPerson: string;
  phone: string;
  mainProduce: string[];
  avatarUrl: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

export interface PageResponse<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalElements: number;
  data: T[];
}

export interface OrderRequest {
  userId?: number;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  note?: string;
  paymentMethod: string;
  items: {
    productId: number | string;
    quantity: number;
  }[];
}

export interface OrderResponse {
  id: number;
  orderCode: string;
  userId?: number;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  note?: string;
  totalAmount: number;
  paymentMethod: string;
  isPaid: boolean;
  status: string;
  items: {
    id: number;
    productId: number | string;
    productName: string;
    productImageUrl: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  createdAt: string;
}

export interface SemanticProductItem {
  product: Product;
  similarity: number;
}

export interface SemanticSearchResponse {
  query: string;
  totalMatches: number;
  items: SemanticProductItem[];
}

export interface AiChatResponse {
  answer: string;
  recommendedProducts: Product[];
  hotDeals: Product[];
  hasGeminiKey: boolean;
  modelUsed: string;
}

export interface AiStatusResponse {
  hasGeminiKey: boolean;
  vectorDimension: number;
  database: string;
}

export interface HybridProductItem {
  product: Product;
  rrfScore: number;
  similarity?: number | null;
  matchType: 'HYBRID' | 'SEMANTIC_VECTOR' | 'KEYWORD_EXACT';
}

export interface HybridSearchResponse {
  query: string;
  totalMatches: number;
  searchStrategy: string;
  items: HybridProductItem[];
}


// ==================== FARMER PORTAL TYPES ====================
export interface TierPricingItem {
  minKg: number;
  pricePerKg: number;
}

export interface HarvestLot {
  id: number;
  lotCode: string;
  productName: string;
  categorySlug: string;
  imageUrl: string;
  pucCode: string;
  harvestDate: string;
  expiryDate: string;
  totalQuantity: number;
  remainingQuantity: number;
  unit: string;
  minTemp: number;
  maxTemp: number;
  tierPricingJson: string;
  tierPricing?: TierPricingItem[];
  status: 'OPEN' | 'NEGOTIATING' | 'SOLD_OUT';
  hubLocation: string;
  farmerName?: string;
  createdAt?: string;
}

export interface RfqItem {
  id: number;
  rfqCode: string;
  harvestLotId: number;
  harvestLotCode: string;
  productName: string;
  buyerName: string;
  buyerPhone: string;
  buyerCompany: string;
  requestedQuantity: number;
  targetPrice: number;
  counterPrice?: number;
  counterQuantity?: number;
  rejectReason?: string;
  deliveryDate: string;
  hubLocation: string;
  status: 'PENDING' | 'ACCEPTED' | 'COUNTER_OFFER' | 'REJECTED';
  createdAt: string;
}

export interface B2BContract {
  id: number;
  contractCode: string;
  rfqId: number;
  rfqCode: string;
  harvestLotId: number;
  lotCode: string;
  productName: string;
  imageUrl?: string;
  buyerName: string;
  buyerPhone: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  depositAmount: number;
  remainingAmount?: number;
  depositStatus: 'PENDING_DEPOSIT' | 'DEPOSIT_PAID';
  fulfillmentStatus: 'WAITING_HARVEST' | 'HARVESTING' | 'HUB_DELIVERED' | 'IN_TRANSIT' | 'COMPLETED';
  depositPaidAt?: string;
  hubDeliveryDate: string;
  hubName: string;
  deliveryTimeSlot?: string;
  truckType?: string;
  deliveryNotes?: string;
  createdAt: string;
  hasQc: boolean;
  pucCode?: string;
  farmName?: string;
  farmerPhone?: string;
  farmerAddress?: string;
  settlementId?: number;
}

export interface QcInspection {
  id: number;
  contractId: number;
  contractCode: string;
  productName: string;
  grossWeight: number;
  netQualifiedWeight: number;
  rejectedWeight: number;
  qualifiedPercent: number;
  brixScore: number;
  moisturePercent: number;
  inspectorName: string;
  qcNotes: string;
  samplePhotoUrl: string;
  inspectedAt: string;
}

export interface Settlement {
  id: number;
  settlementCode: string;
  contractId: number;
  contractCode: string;
  productName: string;
  qualifiedWeight: number;
  unitPrice: number;
  grossAmount: number;
  platformFeePercent: number;
  platformFee: number;
  payoutAmount: number;
  bankAccount: string;
  bankName: string;
  bankAccountName: string;
  bankReference: string;
  isPaid: boolean;
  paidAt?: string;
  taxFormType: 'FORM_01_TNDN' | 'HOA_DON_KCT';
  createdAt: string;
}

export interface FarmerProfile {
  id: number;
  farmName: string;
  farmerType: 'HOUSEHOLD' | 'COOPERATIVE';
  pucCode: string;
  certifications: string;
  certExpiryDate?: string;
  certImageUrl?: string;
  taxCode?: string;
  idCardNumber?: string;
  bankAccount: string;
  bankAccountName: string;
  bankName: string;
  location: string;
  cultivatedArea: string;
  username: string;
  fullName: string;
  phone: string;
  email: string;
}

export interface FarmerStats {
  totalRevenue: number;
  escrowHolding: number;
  openLotsCount: number;
  runningContractsCount: number;
  pendingRfqCount: number;
}

export interface PublicRfqDepositRequest {
  harvestLotId?: number;
  productId?: number;
  productName?: string;
  buyerName: string;
  buyerPhone: string;
  buyerCompany?: string;
  requestedQuantity: number;
  targetPrice: number;
  depositAmount?: number;
  isDepositPaid?: boolean;
  deliveryDate?: string;
  hubLocation?: string;
  shippingOption?: string;
  notes?: string;
}
