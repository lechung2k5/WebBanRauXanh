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

import bhxProductsRaw from '../../public/data/bhx_products.json';

const FALLBACK_PRODUCTS: Product[] = (bhxProductsRaw as any[]).map((p, index) => ({
  id: p.id || index + 1,
  name: p.name,
  slug: p.slug,
  description: p.description,
  price: Number(p.price) || 0,
  originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
  discountPercent: p.discountPercent ? Number(p.discountPercent) : undefined,
  stockQuantity: p.stockQuantity || 100,
  unit: p.unit || 'gói',
  imageUrl: p.imageUrl,
  origin: p.origin || 'Việt Nam',
  brand: p.brand || 'Bách Hóa XANH',
  category: p.category,
  categorySlug: p.categorySlug,
  isOrganic: p.isOrganic ?? true,
  isFeatured: index < 8,
  isActive: true,
  rating: p.rating || 4.8,
  reviewCount: p.reviewCount || 100,
  categoryId: p.categorySlug === 'nam-tuoi' ? 3 : p.categorySlug === 'cu' ? 2 : 1,
  categoryName: p.category || (p.categorySlug === 'nam-tuoi' ? 'Nấm Tươi' : p.categorySlug === 'cu' ? 'Củ & Quả' : 'Rau Sạch'),
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
): Promise<{ products: Product[]; totalElements: number; totalPages: number }> => {
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
