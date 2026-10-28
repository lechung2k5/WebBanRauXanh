import { ApiResponse, AuthResponse, Category, OrderRequest, OrderResponse, PageResponse, Product, User, SemanticSearchResponse, AiChatResponse, AiStatusResponse, HybridSearchResponse, HarvestLot, HarvestLotRequest, HarvestLotStatusUpdateRequest } from '@/types';

import { api } from './auth';
export { api } from './auth';

const API_BASE_URL = '/api/backend';

export const loginApi = async (username: string, password: string, rememberMe = false) => {
  const res = await api<import('./auth').AuthResult>('auth/login', 'POST', { username, password, rememberMe });
  if (typeof window !== 'undefined' && res && 'roles' in res) {
    if (rememberMe) {
      localStorage.setItem('xanhfarm_user', JSON.stringify(res));
    } else {
      sessionStorage.setItem('xanhfarm_user', JSON.stringify(res));
    }
  }
  return res;
};

export const registerApi = async (form: Record<string, unknown>) => {
  return api<import('./auth').OtpChallenge>('auth/register', 'POST', form);
};

export const logoutApi = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('xanhfarm_user');
    sessionStorage.removeItem('xanhfarm_user');
  }
  try {
    await api('auth/logout', 'POST', {});
  } catch {
    // ignore
  }
};

export const getStoredUser = (): AuthResponse | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('xanhfarm_user') || sessionStorage.getItem('xanhfarm_user');
  if (raw) {
    try {
      const user: AuthResponse = JSON.parse(raw);
      if (user && user.username === 'admin' && user.roles?.includes('ROLE_USER')) {
        user.roles = user.roles.filter((r) => r !== 'ROLE_USER');
      }
      return user;
    } catch {
      return null;
    }
  }
  return null;
};

export const getCurrentUserApi = async (): Promise<AuthResponse> => {
  const user = await api<AuthResponse>('auth/me');
  if (user && typeof window !== 'undefined') {
    if (localStorage.getItem('xanhfarm_user')) {
      localStorage.setItem('xanhfarm_user', JSON.stringify(user));
    }
  }
  return user;
};

// User Management (ADMIN)
export const getUsersApi = async (): Promise<User[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/users`, { cache: 'no-store', credentials: 'include' });
    const data: ApiResponse<User[]> = await res.json();
    const list = data.result || [];
    return list.map((u) => {
      let fullName = u.fullName;
      let address = u.address;
      if (u.username === 'buyer_coop' || (fullName && fullName.includes('?') && fullName.toLowerCase().includes('h'))) {
        fullName = 'Nguyễn Thị Minh Hạnh';
        address = '199-205 Nguyễn Thái Học, Quận 1, TP.HCM';
      } else if (u.username === 'buyer_winmart' || (fullName && fullName.includes('?') && fullName.toLowerCase().includes('nam'))) {
        fullName = 'Phạm Hoàng Nam';
        address = 'Tòa nhà Mplaza Saigon, 39 Lê Duẩn, Bến Nghé, Quận 1, TP.HCM';
      } else if (u.username === 'buyer_lotte' || (fullName && fullName.includes('?') && (fullName.toLowerCase().includes('t') || fullName.toLowerCase().includes('l')))) {
        fullName = 'Lê Trọng Đạt';
        address = '469 Nguyễn Hữu Thọ, Phường Tân Hưng, Quận 7, TP.HCM';
      }
      return { ...u, fullName, address };
    });
  } catch {
    return [];
  }
};

export const toggleUserStatusApi = async (userId: number): Promise<boolean> => {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/toggle-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-HoNa-Request': '1' }, body: '{}',
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

import { FALLBACK_HARVEST_LOTS } from './mockHarvestLots';
export { FALLBACK_HARVEST_LOTS };

export const mapHarvestLotToProduct = (lot: HarvestLot): Product => {
  let tieredPricing: TieredPrice[] = [];
  try {
    if (lot.tierPricingJson) {
      const parsed = typeof lot.tierPricingJson === 'string' ? JSON.parse(lot.tierPricingJson) : lot.tierPricingJson;
      if (Array.isArray(parsed)) {
        tieredPricing = parsed.map((item: any) => ({
          minQuantity: item.minKg || 500,
          unitPrice: item.price || lot.basePricePerKg,
          discountLabel: `Từ ${item.minKg} kg`,
        }));
      }
    }
  } catch {
    // ignore
  }

  const moq = tieredPricing.length > 0 ? tieredPricing[0].minQuantity : 500;
  const certArray = lot.certification
    ? (lot.certification.includes(',') ? lot.certification.split(',').map((c: string) => c.trim()) : [lot.certification])
    : ['VietGAP'];

  const stage =
    lot.status === 'OPEN'
      ? 'Đang thu hoạch'
      : lot.status === 'PENDING_APPROVAL'
      ? 'Sắp thu hoạch'
      : lot.status === 'SOLD_OUT'
      ? 'Đã chốt lô'
      : 'Chào bán trước vụ';

  return {
    id: lot.id,
    name: lot.productName,
    slug: (lot.lotCode || `lot-${lot.id}`).toLowerCase(),
    description:
      lot.auditNote ||
      `Lô nông sản ${lot.productName} (${lot.lotCode}) xuất vườn theo tiêu chuẩn ${lot.certification || 'VietGAP'}. Mã số vùng trồng PUC: ${lot.pucCode}. Địa điểm xuất kho: ${lot.warehouseLocation || lot.region || 'Lâm Đồng'}.`,
    price: Number(lot.basePricePerKg) || 15000,
    originalPrice: Math.round((Number(lot.basePricePerKg) || 15000) * 1.15),
    stockQuantity: Number(lot.availableWeightKg) ?? Number(lot.totalWeightKg) ?? 5000,
    unit: '1 kg',
    wholesaleUnit: 'Tấn',
    imageUrl: lot.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    origin: lot.region || 'Việt Nam',
    brand: lot.farmerName,
    farmName: lot.farmerName,
    farmLocation: lot.warehouseLocation || lot.region || 'Lâm Đồng',
    region: lot.region,
    pucCode: lot.pucCode,
    certification: certArray,
    harvestStage: stage,
    harvestDate: lot.harvestDate,
    harvestDateRaw: lot.harvestDate,
    totalLotVolume: Number(lot.totalWeightKg) || 10000,
    availableVolume: Number(lot.availableWeightKg) ?? Number(lot.totalWeightKg) ?? 8500,
    moq: moq,
    categoryId: lot.categoryId,
    categoryName: lot.category,
    isOrganic: Boolean(lot.certification?.toLowerCase().includes('hữu cơ') || lot.certification?.toLowerCase().includes('organic')),
    isFeatured: lot.status === 'OPEN',
    isActive: lot.status === 'OPEN',
    tieredPricing: tieredPricing,
    storageCondition:
      lot.reqTempMin !== undefined && lot.reqTempMax !== undefined
        ? `Bảo quản ${lot.reqTempMin}°C - ${lot.reqTempMax}°C`
        : 'Kho lạnh 2°C - 8°C',
  };
};

export const FALLBACK_PRODUCTS: Product[] = FALLBACK_HARVEST_LOTS.filter(l => l.status === 'OPEN').map(mapHarvestLotToProduct);

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

export const getPublicHarvestLotsApi = async (params?: {
  keyword?: string;
  status?: string;
  category?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<HarvestLot>> => {
  try {
    const query = new URLSearchParams();
    if (params?.keyword) query.append('keyword', params.keyword);
    // Luôn cố định chỉ lấy các lô đang mở bán (OPEN) cho sàn nông sản
    const status = params?.status || 'OPEN';
    query.append('status', status);
    if (params?.category && params.category !== 'ALL') query.append('category', params.category);
    if (params?.page !== undefined) query.append('page', params.page.toString());
    if (params?.size !== undefined) query.append('size', params.size.toString());

    const res = await fetch(`${API_BASE_URL}/harvest-lots?${query.toString()}`, {
      cache: 'no-store',
    });
    const data: ApiResponse<PageResponse<HarvestLot>> = await res.json();
    if (!res.ok || data.code !== 200) {
      throw new Error(data.message || 'Lỗi khi tải danh sách lô nông sản');
    }
    const openLots = (data.result?.data || []).filter(l => l.status === 'OPEN');
    return {
      ...data.result,
      data: openLots,
      totalElements: openLots.length < (data.result?.totalElements || 0) && params?.status !== 'ALL' ? openLots.length : data.result.totalElements,
    };
  } catch {
    let filtered = [...FALLBACK_HARVEST_LOTS].filter(l => l.status === 'OPEN');
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase();
      filtered = filtered.filter(
        l =>
          l.lotCode.toLowerCase().includes(kw) ||
          l.productName.toLowerCase().includes(kw) ||
          l.farmerName.toLowerCase().includes(kw) ||
          l.pucCode.toLowerCase().includes(kw)
      );
    }
    if (params?.category && params.category !== 'ALL') {
      filtered = filtered.filter(l => l.category === params.category || l.categoryId?.toString() === params.category);
    }

    const page = params?.page || 0;
    const size = params?.size || 12;
    const start = page * size;
    const paged = filtered.slice(start, start + size);

    return {
      currentPage: page,
      totalPages: Math.ceil(filtered.length / size) || 1,
      pageSize: size,
      totalElements: filtered.length,
      data: paged,
    };
  }
};

export const getProducts = async (
  params?: {
    keyword?: string;
    categoryId?: number;
    categorySlug?: string;
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    isOrganic?: boolean;
    page?: number;
    size?: number;
  }
): Promise<{ products: Product[]; totalElements: number; totalPages: number; isSemanticSearch?: boolean }> => {
  let resolvedCategory: string | undefined = undefined;
  if (params?.categoryId) {
    resolvedCategory = params.categoryId.toString();
  } else if (params?.categorySlug) {
    if (params.categorySlug === '1' || params.categorySlug === 'rau-sach' || params.categorySlug === 'rau-an-la') {
      resolvedCategory = '1';
    } else if (params.categorySlug === '2' || params.categorySlug === 'cu' || params.categorySlug === 'cu-qua-tuoi') {
      resolvedCategory = '2';
    } else if (params.categorySlug === '3' || params.categorySlug === 'nam-tuoi' || params.categorySlug === 'nam-tuoi-huu-co') {
      resolvedCategory = '3';
    } else if (params.categorySlug === '4' || params.categorySlug === 'rau-gia-vi' || params.categorySlug === 'combo') {
      resolvedCategory = '4';
    } else {
      resolvedCategory = params.categorySlug;
    }
  }

  const page = params?.page ? Math.max(0, params.page - 1) : 0;
  const size = params?.size || 16;

  try {
    const lotRes = await getPublicHarvestLotsApi({
      keyword: params?.keyword,
      status: 'OPEN', // Chỉ có sản phẩm đang mở bán mới được hiển thị trên sàn
      category: resolvedCategory,
      page,
      size,
    });

    let products = (lotRes.data || [])
      .filter(l => l.status === 'OPEN')
      .map(mapHarvestLotToProduct);

    if (params?.minPrice !== undefined) {
      products = products.filter(p => p.price >= params.minPrice!);
    }
    if (params?.maxPrice !== undefined && params.maxPrice < 150000) {
      products = products.filter(p => p.price <= params.maxPrice!);
    }
    if (params?.isOrganic !== undefined) {
      products = products.filter(p => p.isOrganic === params.isOrganic);
    }

    return {
      products,
      totalElements: products.length,
      totalPages: Math.ceil(products.length / size) || 1,
    };
  } catch (err) {
    console.warn('Error fetching harvest lots for getProducts, using fallback:', err);
    let lots = [...FALLBACK_HARVEST_LOTS].filter(l => l.status === 'OPEN');
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase();
      lots = lots.filter(
        l =>
          l.lotCode.toLowerCase().includes(kw) ||
          l.productName.toLowerCase().includes(kw) ||
          l.farmerName.toLowerCase().includes(kw) ||
          l.pucCode.toLowerCase().includes(kw)
      );
    }
    if (resolvedCategory) {
      lots = lots.filter(l => l.categoryId?.toString() === resolvedCategory || l.category === resolvedCategory);
    }

    let products = lots.map(mapHarvestLotToProduct);
    if (params?.minPrice !== undefined) {
      products = products.filter(p => p.price >= params.minPrice!);
    }
    if (params?.maxPrice !== undefined && params.maxPrice < 150000) {
      products = products.filter(p => p.price <= params.maxPrice!);
    }
    if (params?.isOrganic !== undefined) {
      products = products.filter(p => p.isOrganic === params.isOrganic);
    }

    return {
      products,
      totalElements: products.length,
      totalPages: Math.ceil(products.length / size) || 1,
    };
  }
};

export const getProductBySlug = async (slugOrId: string | number): Promise<Product | null> => {
  try {
    const isNum = !isNaN(Number(slugOrId));
    const endpoint = isNum
      ? `${API_BASE_URL}/harvest-lots/${slugOrId}`
      : `${API_BASE_URL}/harvest-lots/code/${slugOrId}`;
    const res = await fetch(endpoint, { cache: 'no-store' });
    if (res.ok) {
      const data: ApiResponse<HarvestLot> = await res.json();
      if (data.result && data.result.status === 'OPEN') {
        return mapHarvestLotToProduct(data.result);
      }
      if (data.result && data.result.status !== 'OPEN') {
        return null;
      }
    }
  } catch {
    // ignore
  }

  const lot = FALLBACK_HARVEST_LOTS.find(
    l => (l.id.toString() === slugOrId.toString() || l.lotCode.toLowerCase() === slugOrId.toString().toLowerCase()) && l.status === 'OPEN'
  );
  return lot ? mapHarvestLotToProduct(lot) : null;
};

export const createProductApi = async (productData: any): Promise<Product> => {
  const res = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-HoNa-Request': '1' },
    body: JSON.stringify(productData),
  });
  const data: ApiResponse<Product> = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi thêm sản phẩm');
  return data.result;
};

export const updateProductApi = async (id: number, productData: any): Promise<Product> => {
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-HoNa-Request': '1' },
    body: JSON.stringify(productData),
  });
  const data: ApiResponse<Product> = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi cập nhật sản phẩm');
  return data.result;
};

export const deleteProductApi = async (id: number): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-HoNa-Request': '1' }, body: '{}',
  });
  if (!res.ok) throw new Error('Lỗi khi xoá sản phẩm');
};

export const createOrder = async (orderReq: OrderRequest): Promise<OrderResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HoNa-Request': '1' },
      body: JSON.stringify(orderReq),
    });
    const data: ApiResponse<OrderResponse> = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi khi đặt hàng');
    return data.result;
  } catch (err: unknown) {
    throw err;
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

export const getAdminContractsApi = async (): Promise<any[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/contracts`, { cache: 'no-store', credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.result || [];
  } catch {
    return [];
  }
};

export const getAdminOrdersApi = async (_page = 0, _size = 50): Promise<PageResponse<OrderResponse>> => {
  return {
    currentPage: 0,
    totalPages: 0,
    pageSize: 0,
    totalElements: 0,
    data: [],
  };
};

export const updateOrderStatusApi = async (_orderId: number, _status: string): Promise<OrderResponse> => {
  throw new Error('Đơn hàng đã được chuyển đổi hoàn toàn sang Hợp đồng B2B.');
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
    headers: { 'Content-Type': 'application/json', 'X-HoNa-Request': '1' },
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
    headers: { 'Content-Type': 'application/json', 'X-HoNa-Request': '1' },
    body: JSON.stringify({ apiKey }),
  });
  const data: ApiResponse<{ hasGeminiKey: boolean }> = await res.json();
  if (!res.ok || data.code !== 200) {
    throw new Error(data.message || 'API Key không hợp lệ');
  }
  return data.result?.hasGeminiKey ?? false;
};

export const syncAiEmbeddingsApi = async (): Promise<number> => {
  const res = await fetch(`${API_BASE_URL}/ai/sync-embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-HoNa-Request': '1' },
    body: '{}',
  });
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

// ======================= MODULE 2: CATEGORIES CRUD APIS =======================

export const createCategoryApi = async (categoryData: Partial<Category>): Promise<Category> => {
  const res = await fetch(`${API_BASE_URL}/categories`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-HoNa-Request': '1',
    },
    body: JSON.stringify(categoryData),
  });
  const data: ApiResponse<Category> = await res.json();
  if (!res.ok || (data.code !== 200 && data.code !== 201)) {
    throw new Error(data.message || 'Lỗi khi tạo danh mục mới');
  }
  return data.result;
};

export const updateCategoryApi = async (id: number, categoryData: Partial<Category>): Promise<Category> => {
  const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-HoNa-Request': '1',
    },
    body: JSON.stringify(categoryData),
  });
  const data: ApiResponse<Category> = await res.json();
  if (!res.ok || data.code !== 200) {
    throw new Error(data.message || 'Lỗi khi cập nhật danh mục');
  }
  return data.result;
};

export const deleteCategoryApi = async (id: number): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-HoNa-Request': '1',
    },
    body: '{}',
  });
  const data: ApiResponse<void> = await res.json();
  if (!res.ok || data.code !== 200) {
    throw new Error(data.message || 'Lỗi khi xóa danh mục');
  }
};

// ======================= MODULE 2: HARVEST LOTS APIS =======================

const CUSTOM_LOTS_STORAGE_KEY = 'xanhfarm_custom_harvest_lots';

const getStoredCustomLots = (): HarvestLot[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_LOTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveCustomLotToStorage = (lot: HarvestLot) => {
  if (typeof window === 'undefined' || !lot) return;
  try {
    const current = getStoredCustomLots();
    const filtered = current.filter(l => l.id !== lot.id && l.lotCode !== lot.lotCode);
    const updated = [lot, ...filtered];
    localStorage.setItem(CUSTOM_LOTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
};

const removeCustomLotFromStorage = (id: number) => {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredCustomLots();
    const updated = current.filter(l => l.id !== id);
    localStorage.setItem(CUSTOM_LOTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
};

export const getAdminHarvestLotsApi = async (params?: {
  keyword?: string;
  status?: string;
  category?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<HarvestLot>> => {
  try {
    const query = new URLSearchParams();
    if (params?.keyword) query.append('keyword', params.keyword);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.category && params.category !== 'ALL') query.append('category', params.category);
    if (params?.page !== undefined) query.append('page', params.page.toString());
    if (params?.size !== undefined) query.append('size', params.size.toString());

    const res = await fetch(`${API_BASE_URL}/admin/harvest-lots?${query.toString()}`, {
      cache: 'no-store',
      credentials: 'include',
    });
    const data: ApiResponse<PageResponse<HarvestLot>> = await res.json();
    if (!res.ok || data.code !== 200) {
      throw new Error(data.message || 'Lỗi khi tải danh sách lô nông sản');
    }
    return data.result;
  } catch (err) {
    // Fallback filter kết hợp custom lots đã tạo
    const customLots = getStoredCustomLots();
    let combined = [...customLots];
    for (const lot of FALLBACK_HARVEST_LOTS) {
      if (!combined.some(c => c.id === lot.id || c.lotCode === lot.lotCode)) {
        combined.push(lot);
      }
    }
    let filtered = combined;
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase();
      filtered = filtered.filter(
        l =>
          l.lotCode.toLowerCase().includes(kw) ||
          l.productName.toLowerCase().includes(kw) ||
          l.farmerName.toLowerCase().includes(kw) ||
          l.pucCode.toLowerCase().includes(kw)
      );
    }
    if (params?.status && params.status !== 'ALL') {
      filtered = filtered.filter(l => l.status === params.status);
    }
    if (params?.category && params.category !== 'ALL') {
      filtered = filtered.filter(l => l.category === params.category);
    }

    const page = params?.page || 0;
    const size = params?.size || 20;
    const start = page * size;
    const paged = filtered.slice(start, start + size);

    return {
      currentPage: page,
      totalPages: Math.ceil(filtered.length / size) || 1,
      pageSize: size,
      totalElements: filtered.length,
      data: paged,
    };
  }
};

export const getAdminLotStatsApi = async (): Promise<Record<string, number>> => {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/harvest-lots/stats`, {
      cache: 'no-store',
      credentials: 'include',
    });
    const data: ApiResponse<Record<string, number>> = await res.json();
    if (res.ok && data.code === 200) {
      return data.result;
    }
  } catch {
    // ignore
  }

  const customLots = getStoredCustomLots();
  const allLots = [...customLots, ...FALLBACK_HARVEST_LOTS.filter(l => !customLots.some(c => c.id === l.id))];

  return {
    totalLots: allLots.length,
    openLots: allLots.filter(l => l.status === 'OPEN').length,
    pendingLots: allLots.filter(l => l.status === 'PENDING_APPROVAL').length,
    suspendedLots: allLots.filter(l => l.status === 'SUSPENDED').length,
    rejectedLots: allLots.filter(l => l.status === 'REJECTED').length,
    soldOutLots: allLots.filter(l => l.status === 'SOLD_OUT').length,
  };
};

export const getHarvestLotByIdApi = async (id: number): Promise<HarvestLot> => {
  const res = await fetch(`${API_BASE_URL}/admin/harvest-lots/${id}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  const data: ApiResponse<HarvestLot> = await res.json();
  if (!res.ok || data.code !== 200) {
    const customLots = getStoredCustomLots();
    const foundCustom = customLots.find(l => l.id === id);
    if (foundCustom) return foundCustom;
    const found = FALLBACK_HARVEST_LOTS.find(l => l.id === id);
    if (found) return found;
    throw new Error(data.message || 'Không tìm thấy lô nông sản');
  }
  return data.result;
};

export const createHarvestLotApi = async (lotData: HarvestLotRequest): Promise<HarvestLot> => {
  const res = await fetch(`${API_BASE_URL}/admin/harvest-lots`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-HoNa-Request': '1',
    },
    body: JSON.stringify(lotData),
  });
  const data: ApiResponse<HarvestLot> = await res.json();
  if (!res.ok || (data.code !== 200 && data.code !== 201)) {
    throw new Error(data.message || 'Lỗi khi tạo lô nông sản');
  }
  if (data.result) {
    saveCustomLotToStorage(data.result);
  }
  return data.result;
};

export const updateHarvestLotApi = async (id: number, lotData: HarvestLotRequest): Promise<HarvestLot> => {
  const res = await fetch(`${API_BASE_URL}/admin/harvest-lots/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-HoNa-Request': '1',
    },
    body: JSON.stringify(lotData),
  });
  const data: ApiResponse<HarvestLot> = await res.json();
  if (!res.ok || data.code !== 200) {
    throw new Error(data.message || 'Lỗi khi cập nhật lô nông sản');
  }
  if (data.result) {
    saveCustomLotToStorage(data.result);
  }
  return data.result;
};

export const updateHarvestLotStatusApi = async (
  id: number,
  status: string,
  rejectionReason?: string,
  auditNote?: string
): Promise<HarvestLot> => {
  const body: HarvestLotStatusUpdateRequest = {
    status,
    rejectionReason,
    auditNote,
  };
  const res = await fetch(`${API_BASE_URL}/admin/harvest-lots/${id}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-HoNa-Request': '1',
    },
    body: JSON.stringify(body),
  });
  const data: ApiResponse<HarvestLot> = await res.json();
  if (!res.ok || data.code !== 200) {
    throw new Error(data.message || 'Lỗi khi cập nhật trạng thái lô nông sản');
  }
  if (data.result) {
    saveCustomLotToStorage(data.result);
  }
  return data.result;
};

export const deleteHarvestLotApi = async (id: number): Promise<void> => {
  removeCustomLotFromStorage(id);
  const res = await fetch(`${API_BASE_URL}/admin/harvest-lots/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-HoNa-Request': '1',
    },
    body: '{}',
  });
  const data: ApiResponse<void> = await res.json();
  if (!res.ok || data.code !== 200) {
    throw new Error(data.message || 'Lỗi khi xóa lô nông sản');
  }
};
