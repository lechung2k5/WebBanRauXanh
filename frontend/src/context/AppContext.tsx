'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, AuthResponse, Category } from '@/types';
import { getCurrentUserApi, logoutApi, getCategories } from '@/services/api';

interface AppContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: number | string, quantity: number) => void;
  removeFromCart: (productId: number | string) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  currentUser: AuthResponse | null;
  authLoading: boolean;
  refreshUser: () => Promise<void>;
  setCurrentUser: (user: AuthResponse | null) => void;
  logout: () => Promise<void>;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isAuthOpen: boolean;
  setIsAuthOpen: (open: boolean) => void;
  isLocationOpen: boolean;
  setIsLocationOpen: (open: boolean) => void;
  currentLocation: string;
  setCurrentLocation: (loc: string) => void;
  categories: Category[];
  isAiOpen: boolean;
  setIsAiOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const refreshUser = async () => { try { setCurrentUser(await getCurrentUserApi()); } catch { setCurrentUser(null); } finally { setAuthLoading(false); } };
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('Phường Bến Nghé, Quận 1, TP.HCM');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAiOpen, setIsAiOpen] = useState(false);

  // Load cart from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('xanhfarm_cart');
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
    } catch {
      // ignore
    }
    localStorage.removeItem('xanhfarm_user');
    sessionStorage.removeItem('xanhfarm_user');
    void refreshUser();
    const sync = () => void refreshUser();
    window.addEventListener('focus', sync);
    const channel = new BroadcastChannel('hona-auth');
    channel.onmessage = sync;


    // Load categories
    getCategories().then(setCategories).catch(() => {});
    return () => { window.removeEventListener('focus', sync); channel.close(); };
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('xanhfarm_cart', JSON.stringify(cartItems));
    } catch {
      // ignore
    }
  }, [cartItems]);

  const addToCart = (product: Product, quantity = 1) => {
    window.location.assign('/lo-hang');
  };

  const updateQuantity = (productId: number | string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId: number | string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const logout = async () => {
    await logoutApi(); setCurrentUser(null);
    const channel = new BroadcastChannel('hona-auth'); channel.postMessage('logout'); channel.close();
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return (
    <AppContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartCount,
        cartTotal,
        currentUser,
        authLoading,
        refreshUser,
        setCurrentUser,
        logout,
        isCartOpen,
        setIsCartOpen,
        isAuthOpen,
        setIsAuthOpen,
        isLocationOpen,
        setIsLocationOpen,
        currentLocation,
        setCurrentLocation,
        categories,
        isAiOpen,
        setIsAiOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
