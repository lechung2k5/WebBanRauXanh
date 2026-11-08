'use client';

import React from 'react';
import { Clock, MessageSquareText } from 'lucide-react';
import { getRfqStatusMeta } from '@/utils/rfqStatus';

export interface RfqHistoryEvent {
  id: number;
  actor_role?: string;
  action?: string;
  status_from?: string;
  status_to?: string;
  quantity_kg?: number;
  price_per_kg?: number;
  message?: string;
  created_at?: string;
}

const actionLabels: Record<string, string> = {
  CREATED: 'Tạo yêu cầu',
  COUNTER: 'Gửi đề xuất mới',
  ACCEPT: 'Chấp nhận đề xuất',
  REJECT: 'Từ chối đề xuất',
};

export default function RfqHistoryTimeline({ events }: { events: RfqHistoryEvent[] }) {
  if (!events.length) return <p className="text-xs text-slate-500 py-3">Chưa có lịch sử đàm phán.</p>;

  return (
    <div className="space-y-3">
      {events.map((event, index) => {
        const nextStatus = getRfqStatusMeta(event.status_to);
        return (
          <div key={event.id || index} className="relative pl-7">
            {index < events.length - 1 && <span className="absolute left-[7px] top-5 bottom-[-14px] w-px bg-slate-200" />}
            <span className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-sky-500 ring-4 ring-sky-50" />
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-slate-800">
                  {event.actor_role === 'FARMER' ? 'Người bán' : 'Người mua'} · {actionLabels[event.action || ''] || event.action}
                </strong>
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {event.created_at ? new Date(event.created_at).toLocaleString('vi-VN') : '—'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-slate-500">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${nextStatus.className}`}>{nextStatus.label}</span>
                {event.price_per_kg != null && <span>{Number(event.price_per_kg).toLocaleString('vi-VN')} đ/kg</span>}
                {event.quantity_kg != null && <span>{Number(event.quantity_kg).toLocaleString('vi-VN')} kg</span>}
              </div>
              {event.message && <p className="text-slate-600 flex items-start gap-1"><MessageSquareText className="w-3.5 h-3.5 mt-0.5 shrink-0" />{event.message}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
