'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, MessageSquareText } from 'lucide-react';
import {
  getSyncNotifications,
  markAllSyncNotificationsRead,
  markSyncNotificationRead,
  subscribeB2bNotifications,
  subscribeB2bSyncEvents,
  type B2bNotification,
} from '@/services/b2bSyncService';

export default function B2BNotificationBell({ audience, tone = 'dark' }: { audience: 'BUYER' | 'FARMER'; tone?: 'dark' | 'light' }) {
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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`relative flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${tone === 'light' ? 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100' : 'border-white/20 bg-white/10 text-white hover:bg-white/20'}`}
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
                <CheckCheck className="h-3.5 w-3.5" /> Đã đọc hết
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">Chưa có thông báo mới.</p>
            ) : items.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => markSyncNotificationRead(item.id)}
                className={`w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${item.read ? 'opacity-65' : 'bg-sky-50/60'}`}
              >
                <div className="flex gap-2">
                  <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{item.message}</p>
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
