/**
 * Utility chuẩn hóa định dạng ngày tháng, tiền tệ, khối lượng và trạng thái tiếng Việt
 * Tuân thủ yêu cầu Fix-17_11.md:
 * - Định dạng ngày chuẩn: dd/MM/yyyy
 * - 100% nhãn trạng thái hiển thị bằng Tiếng Việt
 */

/**
 * Định dạng ngày theo chuẩn Việt Nam dd/MM/yyyy hoặc dd/MM/yyyy HH:mm
 */
export function formatDateVi(
  input: string | number | Date | null | undefined,
  includeTime: boolean = false
): string {
  if (!input) return '---';

  try {
    const d = typeof input === 'object' && input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) {
      // Thử parse định dạng yyyy-MM-dd
      if (typeof input === 'string') {
        const parts = input.split(/[-T ]/);
        if (parts.length >= 3 && parts[0].length === 4) {
          const day = parts[2].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[0];
          return `${day}/${month}/${year}`;
        }
      }
      return String(input);
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    if (!includeTime) {
      return `${day}/${month}/${year}`;
    }

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(input);
  }
}

/**
 * Định dạng tiền tệ VND an toàn
 */
export function formatCurrencyVi(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 đ';
  return `${amount.toLocaleString('vi-VN')} đ`;
}

/**
 * Định dạng khối lượng Kg an toàn
 */
export function formatWeightVi(kg: number | null | undefined): string {
  if (kg === null || kg === undefined || isNaN(kg)) return '0 kg';
  return `${kg.toLocaleString('vi-VN')} kg`;
}

export interface StatusMeta {
  label: string;
  bgClass: string;
  textClass: string;
  badgeClass: string;
}

/**
 * Ánh xạ 100% trạng thái sang Tiếng Việt chuẩn B2B
 */
export function formatStatusVi(rawStatus: string | null | undefined): StatusMeta {
  if (!rawStatus) {
    return {
      label: 'Chưa xác định',
      bgClass: 'bg-gray-100',
      textClass: 'text-gray-600',
      badgeClass: 'bg-gray-100 text-gray-700 border border-gray-200',
    };
  }

  const s = String(rawStatus).trim().toUpperCase();

  // 1. Trạng thái Lô nông sản (Harvest Lot)
  if (s === 'OPEN' || s === 'APPROVED' || s === 'AVAILABLE') {
    return {
      label: 'Đang mở bán sỉ',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-700',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    };
  }
  if (s === 'PENDING' || s === 'SUBMITTED' || s === 'WAITING_APPROVAL' || s === 'DRAFT') {
    return {
      label: 'Chờ Ban Quản Trị duyệt',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
    };
  }
  if (s === 'REJECTED') {
    return {
      label: 'Từ chối kiểm duyệt',
      bgClass: 'bg-rose-50',
      textClass: 'text-rose-700',
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
    };
  }
  if (s === 'SUSPENDED') {
    return {
      label: 'Tạm khóa kiểm tra',
      bgClass: 'bg-orange-50',
      textClass: 'text-orange-700',
      badgeClass: 'bg-orange-50 text-orange-700 border border-orange-200',
    };
  }
  if (s === 'SOLD_OUT' || s === 'CLOSED') {
    return {
      label: 'Đã bán hết',
      bgClass: 'bg-slate-100',
      textClass: 'text-slate-600',
      badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
    };
  }

  // 2. Trạng thái RFQ / Đàm phán
  if (s === 'WAITING_FARMER') {
    return {
      label: 'Chờ nhà vườn phản hồi',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
    };
  }
  if (s === 'WAITING_BUYER' || s === 'COUNTER_OFFER') {
    return {
      label: 'Chờ người mua phản hồi',
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-700',
      badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200',
    };
  }
  if (s === 'ACCEPTED') {
    return {
      label: 'Đã chốt giá đàm phán',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-700',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    };
  }
  if (s === 'CANCELLED') {
    return {
      label: 'Đã hủy đàm phán',
      bgClass: 'bg-gray-100',
      textClass: 'text-gray-600',
      badgeClass: 'bg-gray-100 text-gray-600 border border-gray-200',
    };
  }
  if (s === 'EXPIRED') {
    return {
      label: 'Đã hết hạn đàm phán',
      bgClass: 'bg-slate-100',
      textClass: 'text-slate-600',
      badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
    };
  }

  // 3. Trạng thái Hợp đồng & Tiến độ bàn giao (Fulfillment Steps)
  if (s === 'WAITING_DEPOSIT' || s === 'DEPOSIT_PENDING') {
    return {
      label: 'Chờ đặt cọc 30% Escrow',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
    };
  }
  if (s === 'DEPOSIT_PAID' || s === 'WAITING_HARVEST') {
    return {
      label: 'Đã nhận cọc 30% · Chờ thu hoạch',
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-700',
      badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
    };
  }
  if (s === 'HARVESTING' || s === 'HARVEST_IN_PROGRESS') {
    return {
      label: 'Đang thu hoạch & phân loại',
      bgClass: 'bg-cyan-50',
      textClass: 'text-cyan-700',
      badgeClass: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
    };
  }
  if (s === 'PACKAGED' || s === 'PACKAGING_DONE' || s === 'READY_FOR_PICKUP') {
    return {
      label: 'Đã đóng gói · Chờ điều phối vận chuyển',
      bgClass: 'bg-indigo-50',
      textClass: 'text-indigo-700',
      badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    };
  }
  if (s === 'DISPATCHING' || s === 'TRUCK_ASSIGNED') {
    return {
      label: 'Đã điều phối xe lạnh',
      bgClass: 'bg-purple-50',
      textClass: 'text-purple-700',
      badgeClass: 'bg-purple-50 text-purple-700 border border-purple-200',
    };
  }
  if (s === 'IN_TRANSIT' || s === 'SHIPPING') {
    return {
      label: 'Đang vận chuyển xe lạnh',
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-700',
      badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200',
    };
  }
  if (s === 'DELIVERED' || s === 'WAITING_EPOD') {
    return {
      label: 'Đã tới điểm nhận · Chờ ký ePOD',
      bgClass: 'bg-orange-50',
      textClass: 'text-orange-700',
      badgeClass: 'bg-orange-50 text-orange-700 border border-orange-200',
    };
  }
  if (s === 'EPOD_SIGNED' || s === 'WAITING_FINAL_PAYMENT') {
    return {
      label: 'Đã ký ePOD · Chờ quyết toán 70%',
      bgClass: 'bg-teal-50',
      textClass: 'text-teal-700',
      badgeClass: 'bg-teal-50 text-teal-700 border border-teal-200',
    };
  }
  if (s === 'FINAL_PAID' || s === 'COMPLETED') {
    return {
      label: 'Hoàn tất đơn hàng · Đã giải ngân',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-700',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    };
  }

  // Mặc định: Trả về chuỗi nguyên gốc nếu không khớp
  return {
    label: rawStatus,
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-700',
    badgeClass: 'bg-gray-100 text-gray-700 border border-gray-200',
  };
}

/**
 * Tên tiếng Việt cho 3 phương án vận chuyển chuẩn hóa
 */
export const SHIPPING_OPTIONS_VI = {
  PA1: {
    code: 'PA1',
    id: 'HONAFRESH_DIRECT',
    name: 'Phương án 1 - Xe lạnh chuyên dụng Hona Fresh (Giao thẳng tận nơi)',
    shortName: 'Hona Fresh Giao Thẳng',
    description: 'Xe tải thùng lạnh Hona Fresh đến tận vườn bốc hàng và chuyển thẳng về kho người mua.',
    requiresFreight: true,
  },
  PA2: {
    code: 'PA2',
    id: 'HONAFRESH_HUB',
    name: 'Phương án 2 - Vận chuyển qua Trạm Trung Chuyển (Hub Cross-docking)',
    shortName: 'Qua Trạm Trung Chuyển (Hub)',
    description: 'Hàng được đưa về trạm sơ chế & bảo quản lạnh tập trung của Hona Fresh trước khi phân phối.',
    requiresFreight: true,
  },
  PA3: {
    code: 'PA3',
    id: 'BUYER_SELF_PICKUP',
    name: 'Phương án 3 - Người mua tự điều xe đến nhận tại vườn (Tự vận chuyển)',
    shortName: 'Người Mua Tự Vận Chuyển',
    description: 'Thương lái tự bố trí phương tiện và nhân công đến lấy hàng tại vườn, không phát sinh cước xe.',
    requiresFreight: false,
  },
};
