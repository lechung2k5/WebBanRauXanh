'use client';

import React, { useEffect, useMemo, useState } from 'react';
<<<<<<< HEAD
import { Bell, CheckCheck, MessageSquareText } from 'lucide-react';
=======
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, MessageSquareText, Package } from 'lucide-react';
>>>>>>> origin/nhut-tan
import {
  getSyncNotifications,
  markAllSyncNotificationsRead,
  markSyncNotificationRead,
  subscribeB2bNotifications,
  subscribeB2bSyncEvents,
  type B2bNotification,
} from '@/services/b2bSyncService';

export default function B2BNotificationBell({ audience, tone = 'dark' }: { audience: 'BUYER' | 'FARMER' | 'ADMIN'; tone?: 'dark' | 'light' }) {
<<<<<<< HEAD
=======
  const router = useRouter();
>>>>>>> origin/nhut-tan
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<B2bNotification[]>([]);

  const refresh = () => setItems(getSyncNotifications(audience));
  useEffect(() => {
    refresh();
    const unsubscribeNotification = subscribeB2bNotifications(refresh);
    const unsubscribeSync = subscribeB2bSyncEvents(refresh);
    return () => {
      unsubscribeNotification();
      unsubscribeSync();
    };
  }, [audience]);

  const unread = useMemo(() => items.filter((item) => !item.read).length, [items]);

<<<<<<< HEAD
=======
  const handleNotificationClick = (item: B2bNotification) => {
    markSyncNotificationRead(item.id);
    setOpen(false);

    if (item.type?.startsWith('LOT_') || item.lotCode || item.lotId || item.rfqCode?.startsWith('LOT-')) {
      if (audience === 'ADMIN') {
        const queryParams = new URLSearchParams();

        // Trích xuất mã lô và ID lô chuẩn xác
        let targetLotCode = item.lotCode || (item.rfqCode?.startsWith('LOT-') ? item.rfqCode : undefined);
        if (!targetLotCode) {
          const match = (item.message || '').match(/LOT-[A-Za-z0-9-]+/) || (item.title || '').match(/LOT-[A-Za-z0-9-]+/);
          if (match) targetLotCode = match[0];
        }

        const targetLotId = item.lotId;

        queryParams.set('tab', 'lots');
        if (targetLotId) queryParams.set('editLotId', String(targetLotId));
        if (targetLotCode) queryParams.set('lotCode', targetLotCode);

        // Bắn custom event để nếu Admin đang ở sẵn mục Nguồn cung & danh mục thì form mở ngay tức thì và highlight 2 giây
        try {
          window.dispatchEvent(
            new CustomEvent('open_admin_lot_edit', {
              detail: { lotId: targetLotId, lotCode: targetLotCode },
            })
          );
        } catch {}

        router.push(`/admin/harvest-lots?${queryParams.toString()}`);
      } else if (audience === 'FARMER') {
        router.push('/portal/farmer');
      }
      return;
    }

    if (audience === 'ADMIN') {
      router.push('/admin/contracts');
    } else if (audience === 'FARMER') {
      router.push('/portal/farmer');
    } else if (audience === 'BUYER') {
      router.push('/portal/buyer');
    }
  };

>>>>>>> origin/nhut-tan
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`relative flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${tone === 'light' ? 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100' : 'border-white/20 bg-white/10 text-white hover:bg-white/20'}`}
<<<<<<< HEAD
        aria-label="Thông báo đàm phán"
      >
        <Bell className="h-4 w-4" />
        <span className="hidden sm:inline">Thông báo</span>
        {unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white text-center">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <strong className="text-sm">Thông báo đàm phán</strong>
            {unread > 0 && (
              <button type="button" onClick={() => markAllSyncNotificationsRead(audience)} className="flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-900">
=======
        aria-label="Thông báo hệ thống"
      >
        <Bell className="h-4 w-4" />
        <span className="hidden sm:inline">Thông báo</span>
        {unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white text-center font-bold animate-pulse">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-[#FDFDFB]">
            <strong className="text-sm font-heading font-black text-[#10542C]">Thông báo hệ thống</strong>
            {unread > 0 && (
              <button type="button" onClick={() => markAllSyncNotificationsRead(audience)} className="flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 cursor-pointer">
>>>>>>> origin/nhut-tan
                <CheckCheck className="h-3.5 w-3.5" /> Đã đọc hết
              </button>
            )}
          </div>
<<<<<<< HEAD
          <div className="max-h-80 overflow-y-auto">
=======
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
>>>>>>> origin/nhut-tan
            {items.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">Chưa có thông báo mới.</p>
            ) : items.map((item) => (
              <button
                type="button"
                key={item.id}
<<<<<<< HEAD
                onClick={() => markSyncNotificationRead(item.id)}
                className={`w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${item.read ? 'opacity-65' : 'bg-sky-50/60'}`}
              >
                <div className="flex gap-2">
                  <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{item.message}</p>
=======
                onClick={() => handleNotificationClick(item)}
                className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition cursor-pointer ${item.read ? 'opacity-70 bg-white' : 'bg-emerald-50/40'}`}
              >
                <div className="flex gap-2.5 items-start">
                  {item.type?.startsWith('LOT_') ? (
                    <div className="p-1.5 bg-emerald-100 text-[#10542C] rounded-lg shrink-0 mt-0.5">
                      <Package className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg shrink-0 mt-0.5">
                      <MessageSquareText className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center justify-between">
                      <span>{item.title}</span>
                      {!item.read && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{item.message}</p>
>>>>>>> origin/nhut-tan
                    <p className="mt-1 text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString('vi-VN')}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
