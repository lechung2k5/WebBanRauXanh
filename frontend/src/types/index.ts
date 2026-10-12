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
