"use client";
import Link from 'next/link';
import type { Product } from '@/types';
export default function B2BNegotiationModal({product,isOpen,onClose}:{product:Product|null;isOpen:boolean;onClose:()=>void;onSuccess?:()=>void}) {
 if(!isOpen||!product)return null;
 return <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-5"><section className="bg-white rounded-3xl p-6 max-w-md space-y-4"><h2 className="font-bold text-xl">Yêu cầu báo giá · {product.name}</h2><p className="text-sm">Chọn lô đang mở bán để gửi RFQ và theo dõi đàm phán với nông trại.</p><Link href="/lo-hang" className="block bg-green-900 text-white p-3 rounded-xl text-center">Xem lô nông sản</Link><button onClick={onClose}>Đóng</button></section></div>;
}
