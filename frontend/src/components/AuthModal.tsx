"use client";
import AuthForm from './AuthForm';
import type { AuthResponse } from '@/types';
export function AuthModal({ isOpen, onClose, onAuthSuccess, initialTab='login' }: { isOpen:boolean; onClose:()=>void; onAuthSuccess:(u:AuthResponse)=>void; initialTab?:'login'|'register' }) {
 if(!isOpen) return null;
 return <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Xác thực tài khoản"><div className="bg-white rounded-3xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto"><button className="float-right text-sm p-2" onClick={onClose} aria-label="Đóng">✕</button><AuthForm initialMode={initialTab} onSuccess={u=>{onAuthSuccess(u);onClose();}} /></div></div>;
}
