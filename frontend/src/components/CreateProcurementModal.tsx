"use client";
import Link from 'next/link';
import type { B2BProcurementRequest } from '@/types';
export default function CreateProcurementModal({isOpen,onClose}:{isOpen:boolean;onClose:()=>void;onSubmitSuccess?:(request:B2BProcurementRequest)=>void}) {
 if(!isOpen)return null;
 return <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-5"><section className="bg-white rounded-3xl p-6 max-w-md space-y-4"><h2 className="font-bold text-xl">Gửi yêu cầu thu mua</h2><p className="text-sm">Chọn lô phù hợp và gửi RFQ từ tài khoản thương lái đã được duyệt.</p><Link className="block bg-green-900 text-white p-3 rounded-xl text-center" href="/lo-hang">Xem lô chào bán</Link><button onClick={onClose}>Đóng</button></section></div>;
}
