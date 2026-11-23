'use client';

import React from 'react';
import AuthForm from './AuthForm';
import type { AuthResponse } from '@/types';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthResponse) => void;
  initialTab?: 'login' | 'register';
}

export function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  initialTab = 'login',
}: AuthModalProps) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Xác thực tài khoản"
    >
      <div className="bg-white rounded-3xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-sm p-2 cursor-pointer rounded-full hover:bg-gray-100"
          onClick={onClose}
          aria-label="Đóng"
        >
          ✕
        </button>
        <AuthForm
          initialMode={initialTab}
          onSuccess={(u) => {
            onAuthSuccess(u);
            onClose();
          }}
        />
      </div>
    </div>
  );
}

export default AuthModal;
