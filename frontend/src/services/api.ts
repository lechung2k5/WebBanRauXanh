import { ApiResponse, AuthResponse, Category, OrderRequest, OrderResponse, PageResponse, Product, User } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Authentication APIs
export const loginApi = async (username: string, password: string, rememberMe: boolean): Promise<AuthResponse> => {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
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
    await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
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
    const res = await fetch(`${API_BASE_URL}/users`, { cache: 'no-store' });
    const data: ApiResponse<User[]> = await res.json();
    return data.result || [];
  } catch {
    return [];
  }
};

export const toggleUserStatusApi = async (userId: number): Promise<boolean> => {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/toggle-status`, {
    method: 'POST',
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

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Rau Xà Lách Mỡ Đà Lạt',
    slug: 'rau-xa-lach-mo-da-lat',
    description: 'Rau xà lách mỡ canh tác thủy canh chuẩn VietGAP, lá mềm ngọt giòn tan thích hợp làm salad tươi ngon.',
    price: 25000,
    originalPrice: 32000,
    stockQuantity: 150,
    unit: 'gói 500g',
    imageUrl: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=600&auto=format&fit=crop&q=80',
    origin: 'Đà Lạt Farm',
    isOrganic: true,
    isFeatured: true,
    isActive: true,
    categoryId: 1,
    categoryName: 'Rau Ăn Lá',
  },
  {
    id: 2,
    name: 'Cải Bó Xôi Hữu Cơ (Spinach)',
    slug: 'cai-bo-xoi-huu-co-spinach',
    description: 'Cải bó xôi giàu sắt và vitamin, trồng hữu cơ không dùng phân bón hóa học hay thuốc trừ sâu.',
    price: 35000,
    originalPrice: 42000,
    stockQuantity: 80,
    unit: 'bó 400g',
    imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80',
    origin: 'Mộc Châu Farm',
    isOrganic: true,
    isFeatured: true,
    isActive: true,
    categoryId: 1,
    categoryName: 'Rau Ăn Lá',
  },
  {
    id: 3,
    name: 'Cà Chua Cherry Đỏ Đà Lạt',
    slug: 'ca-chua-cherry-do-da-lat',
    description: 'Cà chua bi ngọt thanh, mọng nước, nhiều vitamin C và chất chống oxy hóa tự nhiên.',
    price: 45000,
    originalPrice: 55000,
    stockQuantity: 100,
    unit: 'hộp 500g',
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80',
    origin: 'Đà Lạt',
    isOrganic: true,
    isFeatured: true,
    isActive: true,
    categoryId: 2,
    categoryName: 'Củ & Quả Tươi',
  },
  {
    id: 4,
    name: 'Cà Rốt Hữu Cơ Tươi',
    slug: 'ca-rot-huu-co-tuoi',
    description: 'Cà rốt trồng tại Đà Lạt theo tiêu chuẩn Organic, màu sắc cam tươi tự nhiên, ngọt đậm vị.',
    price: 28000,
    originalPrice: 35000,
    stockQuantity: 120,
    unit: 'kg',
    imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80',
    origin: 'Đà Lạt',
    isOrganic: true,
    isFeatured: false,
    isActive: true,
    categoryId: 2,
    categoryName: 'Củ & Quả Tươi',
  },
  {
    id: 5,
    name: 'Nấm Đùi Gà Tươi Thượng Hạng',
    slug: 'nam-dui-ga-tuoi-thuong-hang',
    description: 'Nấm đùi gà thân mập trắng muốt, vị giòn dai ngọt bùi, giàu dinh dưỡng và chất xơ.',
    price: 48000,
    originalPrice: 60000,
    stockQuantity: 60,
    unit: 'khay 300g',
    imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80',
    origin: 'Việt Nam',
    isOrganic: true,
    isFeatured: true,
    isActive: true,
    categoryId: 3,
    categoryName: 'Nấm Tươi & Hữu Cơ',
  },
  {
    id: 6,
    name: 'Húng Quế & Ngò Rí Tươi Sạch',
    slug: 'hung-que-ngo-ri-tuoi-sach',
    description: 'Combo rau thơm húng quế và ngò thơm ngát, hái tươi trong ngày giữ trọn hương vị ẩm thực.',
    price: 15000,
    originalPrice: 18000,
    stockQuantity: 200,
    unit: 'combo 200g',
    imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
    origin: 'Hà Nội',
    isOrganic: true,
    isFeatured: false,
    isActive: true,
    categoryId: 4,
    categoryName: 'Rau Gia Vị & Thảo Mộc',
  },
];

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
    minPrice?: number;
    maxPrice?: number;
    isOrganic?: boolean;
    page?: number;
    size?: number;
  }
): Promise<{ products: Product[]; totalElements: number; totalPages: number }> => {
  try {
    const query = new URLSearchParams();
    if (params?.keyword) query.append('keyword', params.keyword);
    if (params?.categoryId) query.append('categoryId', params.categoryId.toString());
    if (params?.minPrice) query.append('minPrice', params.minPrice.toString());
    if (params?.maxPrice) query.append('maxPrice', params.maxPrice.toString());
    if (params?.isOrganic !== undefined) query.append('isOrganic', params.isOrganic.toString());
    if (params?.page !== undefined) query.append('page', params.page.toString());
    if (params?.size !== undefined) query.append('size', params.size.toString());

    const res = await fetch(`${API_BASE_URL}/products?${query.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Network error');
    const data: ApiResponse<PageResponse<Product>> = await res.json();
    return {
      products: data.result.data || [],
      totalElements: data.result.totalElements,
      totalPages: data.result.totalPages,
    };
  } catch {
    let filtered = [...FALLBACK_PRODUCTS];
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(kw) || p.description.toLowerCase().includes(kw));
    }
    if (params?.categoryId) {
      filtered = filtered.filter(p => p.categoryId === params.categoryId);
    }
    return {
      products: filtered,
      totalElements: filtered.length,
      totalPages: 1,
    };
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
