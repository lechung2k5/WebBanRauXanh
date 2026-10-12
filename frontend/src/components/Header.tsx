'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from './Navbar';
import { CartDrawer } from './CartDrawer';
import { AuthModal } from './AuthModal';
import { LocationModal } from './LocationModal';
import { PromotionModal } from './PromotionModal';
import { OrderTrackingModal } from './OrderTrackingModal';
import { useApp } from '@/context/AppContext';

function HeaderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catParam = searchParams.get('category');

  const {
    cartCount,
    cartItems,
    updateQuantity,
    removeFromCart,
    isCartOpen,
    setIsCartOpen,
    isAuthOpen,
    setIsAuthOpen,
    isLocationOpen,
    setIsLocationOpen,
    currentLocation,
    setCurrentLocation,
    currentUser,
    setCurrentUser,
    logout,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);

  useEffect(() => {
    if (!catParam) {
      setSelectedCategory(null);
    } else if (catParam === '1' || catParam === 'rau-sach' || catParam === 'rau-an-la') {
      setSelectedCategory(1);
    } else if (catParam === '2' || catParam === 'cu' || catParam === 'cu-qua-tuoi') {
      setSelectedCategory(2);
    } else if (catParam === '3' || catParam === 'nam-tuoi' || catParam === 'nam-tuoi-huu-co') {
      setSelectedCategory(3);
    } else if (catParam === '4' || catParam === 'combo') {
      setSelectedCategory(4);
    } else {
      setSelectedCategory(Number(catParam) || null);
    }
  }, [catParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/san-pham?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/san-pham');
    }
  };

  const handleCategorySelect = (catId: number | null) => {
    setSelectedCategory(catId);
    if (catId) {
      router.push(`/san-pham?category=${catId}`);
    } else {
      router.push('/san-pham');
    }
  };

  return (
    <>
      <Navbar
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTracking={() => setIsTrackingOpen(true)}
        onOpenPromo={() => setIsPromoOpen(true)}
        onOpenLocation={() => setIsLocationOpen(true)}
        currentLocation={currentLocation}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
        currentUser={currentUser}
        onOpenAuth={() => router.push('/dang-nhap')}
        onLogout={logout}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onOpenCheckout={() => {
          setIsCartOpen(false);
          router.push('/thanh-toan');
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthOpen(false);
        }}
      />

      {/* Location Modal */}
      <LocationModal
        isOpen={isLocationOpen}
        onClose={() => setIsLocationOpen(false)}
        currentLocation={currentLocation}
        onSelectLocation={(loc) => {
          setCurrentLocation(loc);
          setIsLocationOpen(false);
        }}
      />

      {/* Promotion Modal */}
      <PromotionModal
        isOpen={isPromoOpen}
        onClose={() => setIsPromoOpen(false)}
        onApplyCode={() => {
          setIsPromoOpen(false);
        }}
      />

      {/* Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
      />
    </>
  );
}

export const Header: React.FC = () => {
  return (
    <Suspense fallback={<div className="h-[76px] bg-white border-b border-[#EAECE8]" />}>
      <HeaderInner />
    </Suspense>
  );
};
