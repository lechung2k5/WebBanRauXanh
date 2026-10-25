import { ApiResponse, AuthResponse, Category, OrderRequest, OrderResponse, PageResponse, Product, User, SemanticSearchResponse, AiChatResponse, AiStatusResponse, HybridSearchResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Authentication APIs
export const loginApi = async (username: string, password: string, rememberMe: boolean): Promise<AuthResponse> => {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, rememberMe }),
  });

  const data: ApiResponse<AuthResponse> = await res.json();
  if (!res.ok || data.code !== 200) {
    throw new Error(data.message || 'Đăng nhập thất bại!');
  }

  // Save in localStorage if Remember-me is checked
  if (rememberMe) {
    localStorage.setItem('xanhfarm_user', JSON.stringify(data.result));
  } else {
    sessionStorage.setItem('xanhfarm_user', JSON.stringify(data.result));
  }

  return data.result;
};

export const registerApi = async (form: {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
}): Promise<AuthResponse> => {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  });

  const data: ApiResponse<AuthResponse> = await res.json();
  if (!res.ok || (data.code !== 200 && data.code !== 201)) {
    throw new Error(data.message || 'Đăng ký thất bại!');
  }
  return data.result;
};

export const logoutApi = async (): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch {
    // ignore
  }
  localStorage.removeItem('xanhfarm_user');
  sessionStorage.removeItem('xanhfarm_user');
};

export const getStoredUser = (): AuthResponse | null => {
  if (typeof window === 'undefined') return null;
  const local = localStorage.getItem('xanhfarm_user');
  if (local) return JSON.parse(local);
  const session = sessionStorage.getItem('xanhfarm_user');
  if (session) return JSON.parse(session);
  return null;
};

// User Management (ADMIN)
export const getUsersApi = async (): Promise<User[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/users`, { cache: 'no-store', credentials: 'include' });
    const data: ApiResponse<User[]> = await res.json();
    return data.result || [];
  } catch {
    return [];
  }
};

export const toggleUserStatusApi = async (userId: number): Promise<boolean> => {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/toggle-status`, {
    method: 'POST',
    credentials: 'include',
  });
  const data: ApiResponse<boolean> = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi thay đổi trạng thái tài khoản!');
  return data.result;
};

// Fallback Mock Data in case backend is starting
const FALLBACK_CATEGORIES: Category[] = [
  { id: 1, name: 'Rau Ăn Lá', slug: 'rau-an-la', description: 'Các loại rau xanh tươi mát, chuẩn VietGAP', imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80', productCount: 2 },
  { id: 2, name: 'Củ & Quả Tươi', slug: 'cu-qua-tuoi', description: 'Cà chua, cà rốt, khoai tây Đà Lạt tươi ngon', imageUrl: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=600&auto=format&fit=crop&q=80', productCount: 2 },
  { id: 3, name: 'Nấm Tươi & Hữu Cơ', slug: 'nam-tuoi-huu-co', description: 'Nấm sạch tự nhiên giàu dinh dưỡng', imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80', productCount: 1 },
  { id: 4, name: 'Rau Gia Vị & Thảo Mộc', slug: 'rau-gia-vi', description: 'Rau thơm, húng quế, ngò rí đậm vị Việt', imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80', productCount: 1 },
];

import bhxProductsRaw from '../../public/data/bhx_products.json';
import { resolveProductImageUrl } from './imageService';
import { FarmCooperative, B2BProcurementRequest, TieredPrice } from '@/types';

export const MOCK_B2B_COOPERATIVES: FarmCooperative[] = [
  {
    id: 'coop-1',
    name: 'HTX Nông Nghiệp Công Nghệ Cao Đơn Dương',
    location: 'Đơn Dương, Tỉnh Lâm Đồng',
    region: 'tay-nguyen',
    cultivatedArea: '65 Hecta',
    monthlyCapacity: '250 Tấn / Tháng',
    establishedYear: 2017,
    pucCode: 'VN-LDO-04-100',
    certifications: ['VietGAP', 'GlobalGAP', 'OCOP 4 Sao'],
    contactPerson: 'Ông Nguyễn Văn Hùng (Chủ tịch HTX)',
    phone: '0988.100.222',
    mainProduce: ['Bắp Cải', 'Cà Chua', 'Ớt Chuông', 'Cà Rốt', 'Cải Bó Xôi'],
    avatarUrl: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'coop-2',
    name: 'Liên Minh Hợp Tác Xã Rau Sạch Đà Lạt GAP',
    location: 'TP. Đà Lạt, Tỉnh Lâm Đồng',
    region: 'tay-nguyen',
    cultivatedArea: '80 Hecta',
    monthlyCapacity: '350 Tấn / Tháng',
    establishedYear: 2015,
    pucCode: 'VN-LDO-08-200',
    certifications: ['VietGAP', 'Hữu cơ (Organic)', 'GlobalGAP'],
    contactPerson: 'Bà Trần Thị Mai (Phụ trách Thương Mại)',
    phone: '0912.456.789',
    mainProduce: ['Xà Lách Lô Lô', 'Cải Kale', 'Bông Cải Xanh', 'Cải Thảo'],
    avatarUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'coop-3',
    name: 'Hợp Tác Xã Nông Nghiệp Xanh Mộc Châu',
    location: 'Thảo Nguyên Mộc Châu, Tỉnh Sơn La',
    region: 'bac-bo',
    cultivatedArea: '120 Hecta',
    monthlyCapacity: '400 Tấn / Tháng',
    establishedYear: 2018,
    pucCode: 'VN-SLA-09-300',
    certifications: ['VietGAP', 'OCOP 4 Sao'],
    contactPerson: 'Ông Lò Văn Thắng (Giám đốc HTX)',
    phone: '0978.333.888',
    mainProduce: ['Bắp Cải Trái Tim', 'Su Su', 'Cải Mèo', 'Củ Cải Trắng'],
    avatarUrl: 'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'coop-4',
    name: 'HTX Nông Sản An Toàn Ba Tri',
    location: 'Huyện Ba Tri, Tỉnh Bến Tre',
    region: 'dong-bang-song-cuu-long',
    cultivatedArea: '40 Hecta',
    monthlyCapacity: '180 Tấn / Tháng',
    establishedYear: 2019,
    pucCode: 'VN-BTR-05-400',
    certifications: ['VietGAP', 'Chuẩn Nông Sản An Toàn'],
    contactPerson: 'Ông Lê Hoàng Nam (Trưởng Ban Thu Mua)',
    phone: '0939.888.777',
    mainProduce: ['Bầu', 'Mướp Hương', 'Khổ Qua', 'Đậu Bắp', 'Rau Muống Nước'],
    avatarUrl: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=500&auto=format&fit=crop&q=80',
  },
];

export const MOCK_PROCUREMENT_REQUESTS: B2BProcurementRequest[] = [
  {
    id: 'rfq-1',
    title: 'Cần thu mua 20 Tấn Bắp Cải Trắng Đà Lạt xuất kho Chợ Đầu Mối Thủ Đức',
    category: 'Củ quả',
    categorySlug: 'cu',
    traderName: 'Đại lý Nông sản Quốc Cường',
    traderCompany: 'Công ty TNHH Nông Sản Miền Nam',
    volumeNeeded: '20 Tấn',
    targetPriceRange: '8.500 - 10.000 đ/kg',
    preferredRegion: 'Lâm Đồng / Đà Lạt',
    destination: 'Chợ Đầu Mối Nông Sản Thủ Đức, TP.HCM',
    deadline: 'Cần nhận trước 22/10/2026',
    status: 'OPEN',
    quoteCount: 6,
    createdAt: 'Hôm nay',
  },
  {
    id: 'rfq-2',
    title: 'Tìm nguồn cung 15 Tấn Cà Rốt Đà Lạt đạt chuẩn VietGAP đóng sọt 50kg',
    category: 'Củ quả',
    categorySlug: 'cu',
    traderName: 'Vựa Thu Mua Tuấn Trang',
    traderCompany: 'Chuỗi Bán Lẻ Thực Phẩm Sạch GreenMart',
    volumeNeeded: '15 Tấn',
    targetPriceRange: '12.000 - 14.500 đ/kg',
    preferredRegion: 'Đơn Dương, Lâm Đồng',
    destination: 'Kho Logistics Sóng Thần, Dĩ An, Bình Dương',
    deadline: 'Cần nhận trước 25/10/2026',
    status: 'OPEN',
    quoteCount: 4,
    createdAt: 'Hôm qua',
  },
  {
    id: 'rfq-3',
    title: 'Cần 8 Tấn Cải Bó Xôi & Cải Thìa baby đóng thùng xốp lạnh chuyển Hà Nội',
    category: 'Rau sạch',
    categorySlug: 'rau-sach',
    traderName: 'Thương lái Hoàng Minh',
    traderCompany: 'Công ty Thực Phẩm Bắc Nam',
    volumeNeeded: '8 Tấn',
    targetPriceRange: '14.000 - 16.000 đ/kg',
    preferredRegion: 'Mộc Châu hoặc Đà Lạt',
    destination: 'Chợ Đầu Mối Phía Nam (Hoàng Mai, Hà Nội)',
    deadline: 'Cần nhận trước 20/10/2026',
    status: 'IN_NEGOTIATION',
    quoteCount: 9,
    createdAt: '2 ngày trước',
  },
  {
    id: 'rfq-4',
    title: 'Thu mua dài hạn 5 Tấn Nấm Kim Châm & Đùi Gà / Tuần cho hệ thống nhà hàng',
    category: 'Nấm tươi',
    categorySlug: 'nam-tuoi',
    traderName: 'Phòng Thu Mua Central Kitchen',
    traderCompany: 'Tập đoàn Ẩm Thực Golden Lotus',
    volumeNeeded: '5 Tấn / Tuần',
    targetPriceRange: 'Giá sỉ hợp đồng dài hạn',
    preferredRegion: 'Đồng Nai / TP.HCM / Bắc Bộ',
    destination: 'Kho tổng Cụm Công nghiệp Tân Bình, TP.HCM',
    deadline: 'Ký hợp đồng quý 4/2026',
    status: 'OPEN',
    quoteCount: 8,
    createdAt: '3 ngày trước',
  },
];

const FALLBACK_PRODUCTS: Product[] = (bhxProductsRaw as any[]).map((p, index) => ({
  id: p.id || index + 1,
  name: p.name,
  slug: p.slug,
  description: p.description,
  price: Number(p.price) || 0,
  originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
  discountPercent: p.discountPercent ? Number(p.discountPercent) : undefined,
  stockQuantity: p.stockQuantity || 100,
  unit: p.unit || 'Kg (Sỉ)',
  wholesaleUnit: p.wholesaleUnit || 'Tấn / Tạ',
  imageUrl: resolveProductImageUrl(p.name, p.categorySlug, p.imageUrl),
  origin: p.origin || 'Việt Nam',
  brand: p.farmName || p.brand || 'HTX Nông Nghiệp Đơn Dương',
  category: p.category,
  categorySlug: p.categorySlug,
  isOrganic: p.isOrganic ?? true,
  isFeatured: index < 12,
  isActive: true,
  rating: p.rating || 4.8,
  reviewCount: p.reviewCount || 100,
  categoryId: p.categorySlug === 'nam-tuoi' ? 3 : p.categorySlug === 'cu' ? 2 : 1,
  categoryName: p.category || (p.categorySlug === 'nam-tuoi' ? 'Nấm Tươi Sỉ' : p.categorySlug === 'cu' ? 'Củ & Quả Lô' : 'Rau Ăn Lá Sỉ'),

  // B2B Marketplace Attributes
  moq: p.moq || 500,
  totalLotVolume: p.totalLotVolume || 10000,
  availableVolume: p.availableVolume || 8500,
  farmName: p.farmName || 'HTX Nông Nghiệp Công Nghệ Cao Đơn Dương',
  farmLocation: p.farmLocation || 'Đơn Dương, Lâm Đồng',
  region: p.region || 'tay-nguyen',
  regionName: p.regionName || 'Tây Nguyên & Lâm Đồng',
  pucCode: p.pucCode || 'VN-LDO-04-100',
  certification: p.certification || ['VietGAP'],
  harvestStage: p.harvestStage || 'harvesting',
  harvestDate: p.harvestDate || 'Đang thu hái rộ xuất vườn',
  harvestDateRaw: p.harvestDateRaw || '14/10/2026',
  tieredPricing: p.tieredPricing || [
    { minQuantity: p.moq || 500, unitPrice: p.price, discountLabel: `Đơn tối thiểu (≥ ${p.moq || 500} kg)` },
    { minQuantity: 2000, unitPrice: Math.round(p.price * 0.92), discountLabel: 'Lô vừa (≥ 2 Tấn) - Giảm 8%' },
    { minQuantity: 5000, unitPrice: Math.round(p.price * 0.85), discountLabel: 'Lô lớn (≥ 5 Tấn) - Giảm 15%' },
  ],
  storageCondition: p.storageCondition || 'Kho lạnh bảo quản tiêu chuẩn 8 - 12°C',
  shippingTerms: p.shippingTerms || 'Giao tại cổng nông trại (FOB) hoặc xe tải giao kho thương lái',
  farmContactPhone: p.farmContactPhone || '0988.100.222',
}));

export const getCategories = async (): Promise<Category[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/categories`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Network error');
    const data: ApiResponse<Category[]> = await res.json();
    return data.result || FALLBACK_CATEGORIES;
  } catch {
    return FALLBACK_CATEGORIES;
  }
};

export const getProducts = async (
  params?: {
    keyword?: string;
    categoryId?: number;
    categorySlug?: string;
    minPrice?: number;
    maxPrice?: number;
    isOrganic?: boolean;
    page?: number;
    size?: number;
  }
): Promise<{ products: Product[]; totalElements: number; totalPages: number; isSemanticSearch?: boolean }> => {
  // Normalize categoryId and categorySlug
  let resolvedCategoryId = params?.categoryId;
  let resolvedCategorySlug = params?.categorySlug;

  if (!resolvedCategoryId && resolvedCategorySlug) {
    if (resolvedCategorySlug === '1' || resolvedCategorySlug === 'rau-sach' || resolvedCategorySlug === 'rau-an-la') {
      resolvedCategoryId = 1;
      resolvedCategorySlug = 'rau-sach';
    } else if (resolvedCategorySlug === '2' || resolvedCategorySlug === 'cu' || resolvedCategorySlug === 'cu-qua-tuoi') {
      resolvedCategoryId = 2;
      resolvedCategorySlug = 'cu';
    } else if (resolvedCategorySlug === '3' || resolvedCategorySlug === 'nam-tuoi' || resolvedCategorySlug === 'nam-tuoi-huu-co') {
      resolvedCategoryId = 3;
      resolvedCategorySlug = 'nam-tuoi';
    } else if (resolvedCategorySlug === '4' || resolvedCategorySlug === 'rau-gia-vi' || resolvedCategorySlug === 'combo') {
      resolvedCategoryId = 4;
      resolvedCategorySlug = 'rau-gia-vi';
    } else if (!isNaN(Number(resolvedCategorySlug))) {
      resolvedCategoryId = Number(resolvedCategorySlug);
    }
  } else if (resolvedCategoryId && !resolvedCategorySlug) {
    if (resolvedCategoryId === 1) resolvedCategorySlug = 'rau-sach';
    else if (resolvedCategoryId === 2) resolvedCategorySlug = 'cu';
    else if (resolvedCategoryId === 3) resolvedCategorySlug = 'nam-tuoi';
    else if (resolvedCategoryId === 4) resolvedCategorySlug = 'rau-gia-vi';
  }

  try {
    const query = new URLSearchParams();
    if (params?.keyword) query.append('keyword', params.keyword);
    if (resolvedCategoryId) query.append('categoryId', resolvedCategoryId.toString());
    if (params?.minPrice) query.append('minPrice', params.minPrice.toString());
    if (params?.maxPrice) query.append('maxPrice', params.maxPrice.toString());
    if (params?.isOrganic !== undefined) query.append('isOrganic', params.isOrganic.toString());
    if (params?.page !== undefined) query.append('page', params.page.toString());
    if (params?.size !== undefined) query.append('size', params.size.toString());

    const res = await fetch(`${API_BASE_URL}/products?${query.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Network error');
    const data: ApiResponse<PageResponse<Product>> = await res.json();
    let resolvedData = (data.result.data || []).map(p => ({
      ...p,
      imageUrl: resolveProductImageUrl(p.name, p.categorySlug, p.imageUrl),
    }));

    // Tự động kích hoạt Hybrid Search (RRF) kết hợp PostgreSQL Keyword & Vector pgvector nếu SQL thông thường không có kết quả
    let isSemanticSearch = false;
    if (resolvedData.length === 0 && params?.keyword && params.keyword.trim().length > 2) {
      try {
        const hybridRes = await hybridSearchApi(params.keyword.trim(), params?.size || 16);
        if (hybridRes && hybridRes.items && hybridRes.items.length > 0) {
          resolvedData = hybridRes.items.map(item => item.product);
          isSemanticSearch = true;
          return {
            products: resolvedData,
            totalElements: resolvedData.length,
            totalPages: 1,
            isSemanticSearch: true,
          };
        }
      } catch (hybridErr) {
        console.warn('Hybrid search fallback error:', hybridErr);
      }
    }

    return {
      products: resolvedData,
      totalElements: isSemanticSearch ? resolvedData.length : data.result.totalElements,
      totalPages: isSemanticSearch ? 1 : data.result.totalPages,
      isSemanticSearch,
    };
  } catch {
    let filtered = [...FALLBACK_PRODUCTS];
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(kw) || p.description.toLowerCase().includes(kw));
    }
    if (resolvedCategoryId) {
      filtered = filtered.filter(p => p.categoryId === resolvedCategoryId);
    } else if (resolvedCategorySlug) {
      filtered = filtered.filter(p => p.categorySlug === resolvedCategorySlug);
    }
    if (params?.minPrice !== undefined) {
      filtered = filtered.filter(p => p.price >= params.minPrice!);
    }
    if (params?.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.price <= params.maxPrice!);
    }
    if (params?.isOrganic !== undefined) {
      filtered = filtered.filter(p => p.isOrganic === params.isOrganic);
    }

    return {
      products: filtered,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / (params?.size || 12)),
    };
  }
};

export const getProductBySlug = async (slug: string): Promise<Product | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/products/slug/${slug}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Network error');
    const data: ApiResponse<Product> = await res.json();
    if (data.result) {
      data.result.imageUrl = resolveProductImageUrl(data.result.name, data.result.categorySlug, data.result.imageUrl);
    }
    return data.result;
  } catch {
    return FALLBACK_PRODUCTS.find(p => p.slug === slug) || null;
  }
};

export const createProductApi = async (productData: any): Promise<Product> => {
  const res = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });
  const data: ApiResponse<Product> = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi thêm sản phẩm');
  return data.result;
};

export const updateProductApi = async (id: number, productData: any): Promise<Product> => {
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });
  const data: ApiResponse<Product> = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi cập nhật sản phẩm');
  return data.result;
};

export const deleteProductApi = async (id: number): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Lỗi khi xoá sản phẩm');
};

export const createOrder = async (orderReq: OrderRequest): Promise<OrderResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderReq),
    });
    const data: ApiResponse<OrderResponse> = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi khi đặt hàng');
    return data.result;
  } catch (err: any) {
    return {
      id: Date.now(),
      orderCode: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      recipientName: orderReq.recipientName,
      recipientPhone: orderReq.recipientPhone,
      shippingAddress: orderReq.shippingAddress,
      note: orderReq.note,
      totalAmount: 95000,
      paymentMethod: orderReq.paymentMethod,
      isPaid: false,
      status: 'PENDING',
      items: [],
      createdAt: new Date().toISOString(),
    };
  }
};

export const getOrderByCode = async (orderCode: string): Promise<OrderResponse | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/code/${encodeURIComponent(orderCode)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Order not found');
    const data: ApiResponse<OrderResponse> = await res.json();
    return data.result;
  } catch {
    return null;
  }
};

export const getAdminOrdersApi = async (page = 0, size = 50): Promise<PageResponse<OrderResponse>> => {
  const res = await fetch(`${API_BASE_URL}/orders?page=${page}&size=${size}`, { cache: 'no-store', credentials: 'include' });
  const data: ApiResponse<PageResponse<OrderResponse>> = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không thể tải danh sách đơn hàng');
  return data.result;
};

export const updateOrderStatusApi = async (orderId: number, status: string): Promise<OrderResponse> => {
  const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status?status=${encodeURIComponent(status)}`, { method: 'PATCH', credentials: 'include' });
  const data: ApiResponse<OrderResponse> = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không thể cập nhật trạng thái đơn hàng');
  return data.result;
};

// ======================= AI & PGVECTOR APIS =======================

export const semanticSearchApi = async (query: string, limit: number = 6): Promise<SemanticSearchResponse> => {
  const res = await fetch(`${API_BASE_URL}/ai/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
    cache: 'no-store',
  });
  const data: ApiResponse<SemanticSearchResponse> = await res.json();
  if (!res.ok || data.code !== 200) {
    throw new Error(data.message || 'Lỗi khi tìm kiếm ngữ nghĩa');
  }
  return data.result;
};

export const aiChatRagApi = async (message: string): Promise<AiChatResponse> => {
  const res = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const data: ApiResponse<AiChatResponse> = await res.json();
  if (!res.ok || data.code !== 200) {
    throw new Error(data.message || 'Lỗi khi kết nối với AI');
  }
  return data.result;
};

export const getAiStatusApi = async (): Promise<AiStatusResponse> => {
  const res = await fetch(`${API_BASE_URL}/ai/status`, { cache: 'no-store' });
  const data: ApiResponse<AiStatusResponse> = await res.json();
  if (!res.ok || data.code !== 200) {
    throw new Error('Không thể lấy trạng thái AI');
  }
  return data.result;
};

export const configGeminiKeyApi = async (apiKey: string): Promise<boolean> => {
  const res = await fetch(`${API_BASE_URL}/ai/config-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  const data: ApiResponse<{ hasGeminiKey: boolean }> = await res.json();
  if (!res.ok || data.code !== 200) {
    throw new Error(data.message || 'API Key không hợp lệ');
  }
  return data.result?.hasGeminiKey ?? false;
};

export const syncAiEmbeddingsApi = async (): Promise<number> => {
  const res = await fetch(`${API_BASE_URL}/ai/sync-embeddings`, { method: 'POST' });
  const data: ApiResponse<{ syncedCount: number }> = await res.json();
  if (!res.ok || data.code !== 200) {
    throw new Error(data.message || 'Lỗi khi đồng bộ vector');
  }
  return data.result?.syncedCount ?? 0;
};

export const hybridSearchApi = async (query: string, limit: number = 12): Promise<HybridSearchResponse> => {
  const res = await fetch(`${API_BASE_URL}/ai/hybrid-search?q=${encodeURIComponent(query)}&limit=${limit}`, {
    cache: 'no-store',
  });
  const data: ApiResponse<HybridSearchResponse> = await res.json();
  if (!res.ok || data.code !== 200) {
    throw new Error(data.message || 'Lỗi khi tìm kiếm lai Hybrid Search');
  }
  return {
    ...data.result,
    items: (data.result.items || []).map(item => ({
      ...item,
      product: {
        ...item.product,
        imageUrl: resolveProductImageUrl(item.product.name, item.product.categorySlug, item.product.imageUrl),
      },
    })),
  };
};

export const getSimilarProductsApi = async (idOrSlug: string | number, limit: number = 4): Promise<Product[]> => {
  const endpoint = typeof idOrSlug === 'number' 
    ? `${API_BASE_URL}/ai/similar-products/${idOrSlug}?limit=${limit}`
    : `${API_BASE_URL}/ai/similar-products/slug/${idOrSlug}?limit=${limit}`;
  const res = await fetch(endpoint, { cache: 'no-store' });
  const data: ApiResponse<Product[]> = await res.json();
  if (!res.ok || data.code !== 200) {
    return [];
  }
  return (data.result || []).map(p => ({
    ...p,
    imageUrl: resolveProductImageUrl(p.name, p.categorySlug, p.imageUrl),
  }));
};
