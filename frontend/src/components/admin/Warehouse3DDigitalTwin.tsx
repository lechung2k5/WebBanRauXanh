'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Layers,
  Move3d,
  ArrowRightLeft,
  Package,
  Snowflake,
  Wrench,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Printer,
  QrCode,
  Thermometer,
  Droplets,
  AlertTriangle,
} from 'lucide-react';
import {
  buildCrateBarcodeCode,
  buildCrateQrPayload,
  buildQrImageUrl,
  printCrateLabels,
} from '@/utils/crateLabelPrinter';
import {
  WarehouseBinDto,
  WarehouseLayoutDto,
  WarehouseZoneDto,
  WarehouseZoneTelemetryDto,
} from '@/services/fleetDispatchApi';

interface Warehouse3DDigitalTwinProps {
  layout: WarehouseLayoutDto | null;
  zoneTelemetryMap?: Record<string, WarehouseZoneTelemetryDto>;
  onMoveContract?: (contract: any, currentBin: WarehouseBinDto) => void;
  onSelectBin?: (bin: WarehouseBinDto, zone: WarehouseZoneDto) => void;
}

interface BinRack3D {
  bin: WarehouseBinDto;
  zone: WarehouseZoneDto;
  usedKg: number;
  maxKg: number;
  lotCount: number;
  x: number;
  z: number;
}

type CameraPreset = 'FRONT' | 'BACK' | 'OVERVIEW' | 'TOP' | 'AISLE';

const CAMERA_PRESETS: Record<CameraPreset, { yaw: number; pitch: number; zoom: number; label: string }> = {
  FRONT: { yaw: 0.08, pitch: 0.36, zoom: 1.0, label: 'Mặt Trước' },
  BACK: { yaw: Math.PI - 0.1, pitch: 0.38, zoom: 1.0, label: 'Mặt Sau' },
  OVERVIEW: { yaw: 0.58, pitch: 0.48, zoom: 0.92, label: 'Toàn Cảnh' },
  TOP: { yaw: 0.0, pitch: 1.28, zoom: 0.9, label: 'Mặt Bằng' },
  AISLE: { yaw: 0.0, pitch: 0.24, zoom: 1.18, label: 'Lối Đi' },
};

export type StorageUrgency = {
  level: 'NORMAL' | 'WARNING' | 'LATE';
  label: string;
  targetDateStr: string | null;
  hoursRemaining: number;
};

/**
 * Tính trạng thái lưu kho dựa trên ngày Buyer cần nhận hàng (buyer_delivery_date / hub_delivery_date)
 * so với thời điểm hiện tại.
 */
export function getContractStorageUrgency(contract: any): StorageUrgency {
  if (!contract) {
    return { level: 'NORMAL', label: 'Bình thường', targetDateStr: null, hoursRemaining: 48 };
  }

  if (contract.qc_status === 'QC_FAILED' || contract.status === 'QC_FAILED') {
    const rawDate = contract.buyer_delivery_date || contract.hub_delivery_date || null;
    return {
      level: 'LATE',
      label: 'QC Không Đạt — Chờ Hoàn Trả',
      targetDateStr: rawDate ? String(rawDate).slice(0, 10) : null,
      hoursRemaining: 0,
    };
  }

  const rawDate = contract.buyer_delivery_date || contract.hub_delivery_date || null;
  const now = Date.now();

  if (rawDate) {
    const datePart = String(rawDate).slice(0, 10);
    const deadlineMs = new Date(`${datePart}T23:59:59`).getTime();
    if (!Number.isNaN(deadlineMs)) {
      const hoursRemaining = Math.round((deadlineMs - now) / (1000 * 60 * 60));
      if (hoursRemaining <= 0) {
        return {
          level: 'LATE',
          label: `Trễ hạn giao (${datePart})`,
          targetDateStr: datePart,
          hoursRemaining,
        };
      }
      if (hoursRemaining <= 24) {
        return {
          level: 'WARNING',
          label: `Nguy cơ trễ (còn ${hoursRemaining}h)`,
          targetDateStr: datePart,
          hoursRemaining,
        };
      }
      const daysLeft = Math.ceil(hoursRemaining / 24);
      return {
        level: 'NORMAL',
        label: `Bình thường (còn ${daysLeft} ngày)`,
        targetDateStr: datePart,
        hoursRemaining,
      };
    }
  }

  const maxDays = Number(contract.max_storage_days) || 2;
  const inboundMs = contract.hub_inbound_at ? new Date(contract.hub_inbound_at).getTime() : now;
  const deadlineMs = inboundMs + maxDays * 24 * 60 * 60 * 1000;
  const hoursRemaining = Math.round((deadlineMs - now) / (1000 * 60 * 60));

  if (hoursRemaining <= 0) {
    return { level: 'LATE', label: 'Quá hạn lưu kho', targetDateStr: null, hoursRemaining };
  }
  if (hoursRemaining <= 12) {
    return { level: 'WARNING', label: `Nguy cơ trễ (còn ${hoursRemaining}h)`, targetDateStr: null, hoursRemaining };
  }
  return { level: 'NORMAL', label: `Bình thường (còn ${hoursRemaining}h)`, targetDateStr: null, hoursRemaining };
}

export default function Warehouse3DDigitalTwin({
  layout,
  zoneTelemetryMap,
  onMoveContract,
  onSelectBin,
}: Warehouse3DDigitalTwinProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<'3D' | '2.5D'>('3D');
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [preset, setPreset] = useState<CameraPreset>('OVERVIEW');
  const [yaw, setYaw] = useState(CAMERA_PRESETS.OVERVIEW.yaw);
  const [pitch, setPitch] = useState(CAMERA_PRESETS.OVERVIEW.pitch);
  const [zoom, setZoom] = useState(CAMERA_PRESETS.OVERVIEW.zoom);
  const [showMist, setShowMist] = useState(true);
  const [selectedBinId, setSelectedBinId] = useState<number | null>(null);
  const [selectedCrate, setSelectedCrate] = useState<{
    bin: WarehouseBinDto;
    contract: any;
    crateIndex: number;
    totalCrates: number;
  } | null>(null);
  const [highlightedContractCode, setHighlightedContractCode] = useState<string | null>(null);

  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });
  const hitBoxesRef = useRef<Array<{ binId: number; x1: number; y1: number; x2: number; y2: number }>>([]);
  const crateHitBoxesRef = useRef<
    Array<{
      bin: WarehouseBinDto;
      contract: any;
      crateIndex: number;
      totalCrates: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }>
  >([]);

  const zones = useMemo(() => layout?.zones || [], [layout]);

  const activeZone = useMemo(() => {
    if (zones.length === 0) return null;
    return zones.find((z) => z.id === selectedZoneId) || zones[0];
  }, [zones, selectedZoneId]);

  useEffect(() => {
    if (zones.length > 0 && (!selectedZoneId || !zones.some((z) => z.id === selectedZoneId))) {
      setSelectedZoneId(zones[0].id);
    }
  }, [zones, selectedZoneId]);

  // Mỗi Bin trong Zone là 1 kệ 3D nhiều tầng riêng biệt
  const binRacks = useMemo<BinRack3D[]>(() => {
    if (!activeZone) return [];
    const bins = activeZone.bins || [];
    const cols = Math.max(2, Math.ceil(bins.length / 2));
    const spacingX = 165;
    const spacingZ = 210;

    return bins.map((bin, idx) => {
      const row = idx < cols ? 0 : 1;
      const col = idx < cols ? idx : idx - cols;
      const offsetX = (col - (cols - 1) / 2) * spacingX;
      const offsetZ = (row === 0 ? -0.5 : 0.5) * spacingZ;
      return {
        bin,
        zone: activeZone,
        usedKg: Number(bin.usedKg || 0),
        maxKg: Number(bin.maxWeightKg || 0),
        lotCount: bin.contracts?.length || 0,
        x: offsetX,
        z: offsetZ,
      };
    });
  }, [activeZone]);

  const activeBinRack = useMemo(
    () => binRacks.find((r) => r.bin.id === selectedBinId) || binRacks[0] || null,
    [binRacks, selectedBinId]
  );

  const applyPreset = (p: CameraPreset) => {
    setPreset(p);
    setYaw(CAMERA_PRESETS[p].yaw);
    setPitch(CAMERA_PRESETS[p].pitch);
    setZoom(CAMERA_PRESETS[p].zoom);
  };

  // Gắn non-passive wheel listener để zoom mượt bằng con lăn chuột mà không cuộn trang
  useEffect(() => {
    if (viewMode !== '3D') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((prev) => Math.max(0.55, Math.min(1.85, prev - e.deltaY * 0.001)));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== '3D') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame = 0;
    let t = 0;

    // Hệ tọa độ 3D chuẩn game (Y hướng lên, nhìn từ trên xuống khi pitch > 0)
    const project = (wx: number, wy: number, wz: number, w: number, h: number) => {
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const rx = wx * cosY - wz * sinY;
      const rz1 = wx * sinY + wz * cosY;

      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const ry = wy * cosP + rz1 * sinP;
      const rz = -wy * sinP + rz1 * cosP;

      const camDist = 860 / zoom;
      const depth = camDist + rz;
      const scale = Math.max(0.15, 680 / Math.max(140, depth));
      return {
        sx: w / 2 + rx * scale,
        sy: h * 0.56 - ry * scale,
        scale,
        depth,
      };
    };

    const drawQuad = (
      pts: Array<{ sx: number; sy: number }>,
      fill: string,
      stroke?: string,
      lineWidth = 1
    ) => {
      ctx.beginPath();
      ctx.moveTo(pts[0].sx, pts[0].sy);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    const drawLine3D = (
      x1: number, y1: number, z1: number,
      x2: number, y2: number, z2: number,
      color: string, width: number, w: number, h: number
    ) => {
      const a = project(x1, y1, z1, w, h);
      const b = project(x2, y2, z2, w, h);
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    };

    const drawBox = (
      cx: number,
      cy: number,
      cz: number,
      bw: number,
      bh: number,
      bd: number,
      colors: { top: string; front: string; side: string; stroke?: string; barcode?: boolean; highlight?: boolean },
      w: number,
      h: number
    ) => {
      const hw = bw / 2;
      const hd = bd / 2;
      const p = [
        project(cx - hw, cy, cz - hd, w, h),
        project(cx + hw, cy, cz - hd, w, h),
        project(cx + hw, cy, cz + hd, w, h),
        project(cx - hw, cy, cz + hd, w, h),
        project(cx - hw, cy + bh, cz - hd, w, h),
        project(cx + hw, cy + bh, cz - hd, w, h),
        project(cx + hw, cy + bh, cz + hd, w, h),
        project(cx - hw, cy + bh, cz + hd, w, h),
      ];

      // Sắp xếp 6 mặt theo chiều sâu trung bình (vẽ mặt xa trước, mặt gần sau -> luôn đặc 100% ở mọi góc xoay)
      const faces = [
        { pts: [p[0], p[1], p[2], p[3]], fill: colors.side, isFront: false },
        { pts: [p[0], p[1], p[5], p[4]], fill: colors.front, isFront: true },
        { pts: [p[3], p[2], p[6], p[7]], fill: colors.front, isFront: true },
        { pts: [p[0], p[3], p[7], p[4]], fill: colors.side, isFront: false },
        { pts: [p[1], p[2], p[6], p[5]], fill: colors.side, isFront: false },
        { pts: [p[4], p[5], p[6], p[7]], fill: colors.top, isFront: false },
      ]
        .map((f) => ({
          ...f,
          avgDepth: (f.pts[0].depth + f.pts[1].depth + f.pts[2].depth + f.pts[3].depth) / 4,
        }))
        .sort((a, b) => b.avgDepth - a.avgDepth);

      const strokeColor = colors.highlight ? '#fef08a' : colors.stroke;
      const strokeW = colors.highlight ? 2.2 : 1;
      for (const f of faces) {
        drawQuad(f.pts, f.fill, strokeColor, strokeW);
      }

      if (colors.barcode) {
        const cosY = Math.cos(yaw);
        const faceZ = cosY >= 0 ? cz - hd - 0.5 : cz + hd + 0.5;
        const tag = project(cx, cy + bh * 0.55, faceZ, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(tag.sx - 5 * tag.scale, tag.sy - 2.5 * tag.scale, 10 * tag.scale, 4.5 * tag.scale);
      }

      const xs = p.map((pt) => pt.sx);
      const ys = p.map((pt) => pt.sy);
      return {
        x1: Math.min(...xs),
        y1: Math.min(...ys),
        x2: Math.max(...xs),
        y2: Math.max(...ys),
      };
    };

    const render = () => {
      t += 0.018;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx.save();
      ctx.clearRect(0, 0, w, h);

      // Nền phòng lạnh Digital Twin
      const bg = ctx.createRadialGradient(w / 2, h * 0.45, 50, w / 2, h * 0.5, w * 0.8);
      bg.addColorStop(0, '#0f2d4a');
      bg.addColorStop(0.55, '#071728');
      bg.addColorStop(1, '#030a14');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const floorHalfW = Math.max(360, Math.ceil(binRacks.length / 2) * 110 + 140);
      const floorHalfD = 260;
      const gridStep = 36;

      // Spotlight phản chiếu ở lối đi giữa
      const centerFloor = project(0, 0, 0, w, h);
      const spot = ctx.createRadialGradient(
        centerFloor.sx,
        centerFloor.sy,
        10,
        centerFloor.sx,
        centerFloor.sy,
        280 * centerFloor.scale
      );
      spot.addColorStop(0, 'rgba(186, 230, 253, 0.34)');
      spot.addColorStop(0.5, 'rgba(56, 189, 248, 0.12)');
      spot.addColorStop(1, 'rgba(7, 23, 40, 0)');
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, w, h);

      // Lưới sàn 3D
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.lineWidth = 1;
      for (let gx = -floorHalfW; gx <= floorHalfW; gx += gridStep) {
        drawLine3D(gx, 0, -floorHalfD, gx, 0, floorHalfD, 'rgba(56, 189, 248, 0.15)', 1, w, h);
      }
      for (let gz = -floorHalfD; gz <= floorHalfD; gz += gridStep) {
        drawLine3D(-floorHalfW, 0, gz, floorHalfW, 0, gz, 'rgba(56, 189, 248, 0.15)', 1, w, h);
      }

      // Vạch kẻ an toàn màu vàng quanh khu vực kệ
      const yPts = [
        project(-floorHalfW + 28, 1, -floorHalfD + 28, w, h),
        project(floorHalfW - 28, 1, -floorHalfD + 28, w, h),
        project(floorHalfW - 28, 1, floorHalfD - 28, w, h),
        project(-floorHalfW + 28, 1, floorHalfD - 28, w, h),
      ];
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.78)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(yPts[0].sx, yPts[0].sy);
      yPts.slice(1).forEach((pt) => ctx.lineTo(pt.sx, pt.sy));
      ctx.closePath();
      ctx.stroke();

      // Khung buồng lạnh cyan
      const wallTop = 210;
      const wPts = [
        project(-floorHalfW, wallTop, -floorHalfD, w, h),
        project(floorHalfW, wallTop, -floorHalfD, w, h),
        project(floorHalfW, wallTop, floorHalfD, w, h),
        project(-floorHalfW, wallTop, floorHalfD, w, h),
      ];
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(wPts[0].sx, wPts[0].sy);
      wPts.slice(1).forEach((pt) => ctx.lineTo(pt.sx, pt.sy));
      ctx.closePath();
      ctx.stroke();

      for (const [cx, cz] of [
        [-floorHalfW, -floorHalfD],
        [floorHalfW, -floorHalfD],
        [floorHalfW, floorHalfD],
        [-floorHalfW, floorHalfD],
      ]) {
        drawLine3D(cx, 0, cz, cx, wallTop, cz, 'rgba(103, 232, 249, 0.25)', 1.2, w, h);
      }

      // Sắp xếp từng kệ Bin theo chiều sâu
      const sortedBins = [...binRacks]
        .map((r) => ({ r, depth: project(r.x, 60, r.z, w, h).depth }))
        .sort((a, b) => b.depth - a.depth);

      const newHitBoxes: Array<{ binId: number; x1: number; y1: number; x2: number; y2: number }> = [];
      const newCrateHitBoxes: typeof crateHitBoxesRef.current = [];

      for (const { r } of sortedBins) {
        const { bin } = r;
        const tiers = 4; // Mỗi Bin là 1 kệ 4 tầng chứa hàng
        const rackW = 112;
        const rackD = 52;
        const tierH = 36;
        const rackH = tiers * tierH + 14;
        const isSelected = activeBinRack?.bin.id === bin.id;

        if (isSelected) {
          const base = project(r.x, 2, r.z, w, h);
          ctx.beginPath();
          ctx.ellipse(base.sx, base.sy, 74 * base.scale, 36 * base.scale, 0, 0, Math.PI * 2);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Đế kệ
        drawBox(
          r.x,
          0,
          r.z,
          rackW + 6,
          4,
          rackD + 6,
          { top: '#1e293b', front: '#0f172a', side: '#090d16', stroke: 'rgba(148,163,184,0.2)' },
          w,
          h
        );

        // 4 cột thép
        for (const [px, pz] of [
          [-rackW / 2 + 3, -rackD / 2 + 3],
          [rackW / 2 - 3, -rackD / 2 + 3],
          [-rackW / 2 + 3, rackD / 2 - 3],
          [rackW / 2 - 3, rackD / 2 - 3],
        ]) {
          drawBox(
            r.x + px,
            0,
            r.z + pz,
            5,
            rackH,
            5,
            { top: '#475569', front: '#1e293b', side: '#0f172a' },
            w,
            h
          );
        }

        // Thanh giằng chéo 2 bên hông kệ
        for (let tIdx = 0; tIdx < tiers; tIdx++) {
          const yLow = tIdx * tierH + 6;
          const yHigh = (tIdx + 1) * tierH;
          for (const sideX of [-rackW / 2 + 3, rackW / 2 - 3]) {
            drawLine3D(
              r.x + sideX, yLow, r.z - rackD / 2 + 4,
              r.x + sideX, yHigh, r.z + rackD / 2 - 4,
              'rgba(100, 116, 139, 0.5)', 1.1, w, h
            );
            drawLine3D(
              r.x + sideX, yHigh, r.z - rackD / 2 + 4,
              r.x + sideX, yLow, r.z + rackD / 2 - 4,
              'rgba(100, 116, 139, 0.5)', 1.1, w, h
            );
          }
        }

        // Số lượng thùng hiển thị tỷ lệ 1:1 theo packageCount thực tế của các lô trong Bin
        const exactPackages =
          bin.status === 'ACTIVE'
            ? Number(bin.packageCount || 0) || (r.usedKg > 0 ? Math.max(1, Math.round(r.usedKg / 15)) : 0)
            : 0;
        const colsPerTier = exactPackages > 24 ? 6 : exactPackages > 16 ? 5 : 4;
        const rowsPerTier = 2;
        const perTierCap = colsPerTier * rowsPerTier;
        const crateW = exactPackages > 24 ? 13 : exactPackages > 16 ? 16 : 20;
        const crateH = 13;
        const crateD = 18;

        // Ánh xạ từng thùng hàng (1..exactPackages) tới hợp đồng tương ứng trong Bin
        const crateContracts: any[] = [];
        if (bin.contracts && bin.contracts.length > 0) {
          for (const c of bin.contracts) {
            const cnt = Number(c.package_count || 0) || Math.max(1, Math.round(Number(c.inbound_net_weight_kg || c.offered_weight_kg || 15) / 15));
            for (let k = 0; k < cnt; k++) {
              crateContracts.push(c);
            }
          }
        }
        let crateGlobalIdx = 0;

        for (let tIdx = 0; tIdx < tiers; tIdx++) {
          const shelfY = tIdx * tierH + 8;
          drawBox(
            r.x,
            shelfY,
            r.z,
            rackW,
            4,
            rackD,
            {
              top: isSelected ? '#1d4ed8' : '#1e3a5f',
              front: '#172554',
              side: '#0f172a',
              stroke: 'rgba(148, 163, 184, 0.38)',
            },
            w,
            h
          );

          const cratesOnThisTier = Math.max(0, Math.min(perTierCap, exactPackages - tIdx * perTierCap));
          const extraOverflow =
            tIdx === tiers - 1 && exactPackages > tiers * perTierCap
              ? exactPackages - tiers * perTierCap
              : 0;
          const totalOnTier = cratesOnThisTier + extraOverflow;

          // Tạo danh sách thùng trên tầng này và sắp xếp theo chiều sâu để thùng gần luôn đè lên thùng xa
          const tierCrates: Array<{
            cx: number;
            cy: number;
            cz: number;
            cIdx: number;
            globalIdx: number;
            depth: number;
          }> = [];
          for (let cIdx = 0; cIdx < totalOnTier; cIdx++) {
            const stackLayer = Math.floor(cIdx / perTierCap);
            const posInLayer = cIdx % perTierCap;
            const colIdx = posInLayer % colsPerTier;
            const rowIdx = Math.floor(posInLayer / colsPerTier);

            const spanX = rackW - 22;
            const stepX = colsPerTier > 1 ? spanX / (colsPerTier - 1) : 0;
            const cx = r.x - spanX / 2 + colIdx * stepX;
            const cz = r.z + (rowIdx === 0 ? -11 : 11);
            const cy = shelfY + 4 + stackLayer * (crateH + 1);
            crateGlobalIdx += 1;
            tierCrates.push({
              cx,
              cy,
              cz,
              cIdx,
              globalIdx: crateGlobalIdx,
              depth: project(cx, cy + crateH / 2, cz, w, h).depth,
            });
          }
          tierCrates.sort((a, b) => b.depth - a.depth);

          for (const tc of tierCrates) {
            const contract = crateContracts[tc.globalIdx - 1] || bin.contracts?.[0] || null;
            const isContractHighlighted = Boolean(
              highlightedContractCode && contract?.contract_code === highlightedContractCode
            );
            const isCrateSel =
              (selectedCrate?.bin.id === bin.id && selectedCrate?.crateIndex === tc.globalIdx) ||
              isContractHighlighted;
            const urgency = getContractStorageUrgency(contract);
            const boxColors = isContractHighlighted
              ? { top: '#34d399', front: '#10b981', side: '#047857', stroke: '#ecfdf5', barcode: true, highlight: true }
              : urgency.level === 'LATE'
              ? { top: '#ef4444', front: '#dc2626', side: '#991b1b', stroke: 'rgba(255,255,255,0.28)', barcode: true, highlight: isCrateSel }
              : urgency.level === 'WARNING'
              ? { top: '#facc15', front: '#eab308', side: '#a16207', stroke: 'rgba(255,255,255,0.28)', barcode: true, highlight: isCrateSel }
              : { top: '#deb887', front: '#c2935b', side: '#8d5f32', stroke: 'rgba(255,255,255,0.25)', barcode: true, highlight: isCrateSel };
            const bbox = drawBox(
              tc.cx,
              tc.cy,
              tc.cz,
              crateW,
              crateH,
              crateD,
              boxColors,
              w,
              h
            );
            if (contract) {
              newCrateHitBoxes.push({
                bin,
                contract,
                crateIndex: tc.globalIdx,
                totalCrates: exactPackages,
                ...bbox,
              });
            }
          }
        }

        // Nhãn nổi phía trên từng kệ Bin
        const topLabel = project(r.x, rackH + 30, r.z, w, h);
        const labelText = `${bin.binCode} (${exactPackages} thùng · ${Math.round(r.usedKg)} kg)`;
        ctx.font = `700 ${Math.max(10, Math.round(11 * dpr))}px ui-sans-serif, system-ui, sans-serif`;
        const textW = ctx.measureText(labelText).width + 20 * dpr;
        const boxH = 23 * dpr;
        const bx = topLabel.sx - textW / 2;
        const by = topLabel.sy - boxH / 2;

        ctx.fillStyle =
          bin.status !== 'ACTIVE'
            ? 'rgba(100, 116, 139, 0.92)'
            : r.lotCount > 0
            ? 'rgba(225, 29, 72, 0.92)'
            : 'rgba(56, 189, 248, 0.92)';
        ctx.beginPath();
        ctx.roundRect(bx, by, textW, boxH, 7 * dpr);
        ctx.fill();
        if (isSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, topLabel.sx, topLabel.sy);

        const baseCenter = project(r.x, rackH / 2, r.z, w, h);
        newHitBoxes.push({
          binId: bin.id,
          x1: Math.min(bx, baseCenter.sx - 64 * baseCenter.scale),
          y1: by,
          x2: Math.max(bx + textW, baseCenter.sx + 64 * baseCenter.scale),
          y2: baseCenter.sy + 72 * baseCenter.scale,
        });
      }

      if (showMist) {
        for (let i = 0; i < 12; i++) {
          const mx = (i * 119 + t * 18) % w;
          const my = h * 0.65 + Math.sin(t + i) * 26;
          ctx.fillStyle = 'rgba(186, 230, 253, 0.04)';
          ctx.beginPath();
          ctx.arc(mx, my, 24 + (i % 3) * 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      hitBoxesRef.current = newHitBoxes;
      crateHitBoxesRef.current = newCrateHitBoxes;
      ctx.restore();
      animFrame = requestAnimationFrame(render);
    };

    animFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrame);
  }, [viewMode, binRacks, yaw, pitch, zoom, showMist, activeBinRack, selectedCrate, highlightedContractCode]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cx = (e.clientX - rect.left) * dpr;
    const cy = (e.clientY - rect.top) * dpr;

    const crateHit = [...crateHitBoxesRef.current].reverse().find(
      (b) => cx >= b.x1 && cx <= b.x2 && cy >= b.y1 && cy <= b.y2
    );
    if (crateHit) {
      setSelectedBinId(crateHit.bin.id);
      setHighlightedContractCode(crateHit.contract?.contract_code || null);
      setSelectedCrate({
        bin: crateHit.bin,
        contract: crateHit.contract,
        crateIndex: crateHit.crateIndex,
        totalCrates: crateHit.totalCrates,
      });
      return;
    }

    const hit = [...hitBoxesRef.current].reverse().find(
      (b) => cx >= b.x1 && cx <= b.x2 && cy >= b.y1 && cy <= b.y2
    );
    if (hit) {
      setSelectedCrate(null);
      setSelectedBinId(hit.binId);
      const found = binRacks.find((r) => r.bin.id === hit.binId);
      if (found) onSelectBin?.(found.bin, found.zone);
    }
  };

  const activeLiveTelemetry = activeZone ? zoneTelemetryMap?.[activeZone.zoneCode.toUpperCase()] : undefined;
  const hasAnyIotAlert = Object.values(zoneTelemetryMap || {}).some((t) => Boolean(t?.alert));

  return (
    <div
      className={`rounded-3xl bg-[#071526] shadow-xl overflow-hidden text-white transition-all ${
        activeLiveTelemetry?.alert || hasAnyIotAlert
          ? 'border-2 border-rose-500 ring-4 ring-rose-500/25'
          : 'border border-slate-800'
      }`}
    >
      {/* Header Toolbar */}
      <div className="px-5 py-3.5 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-3 bg-[#091c33]">
        <div className="flex items-center gap-2.5">
          <Box className="w-5 h-5 text-sky-400" />
          <div>
            <h3 className="text-xs sm:text-sm font-black tracking-wide uppercase text-sky-100">
              Không Gian 3D Digital Twin — {activeZone?.zoneName || 'Buồng Lạnh'} ({binRacks.length} Kệ Bin · 4 Tầng/Kệ)
            </h3>
            <p className="text-[11px] text-slate-400">
              Mỗi ô Bin là 1 kệ thép 4 tầng · Kéo chuột xoay góc nhìn · Cuộn hoặc bấm nút +/- để thu phóng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('3D')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === '3D' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Move3d className="w-3.5 h-3.5" />
            <span>3D Toàn Cảnh</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('2.5D')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === '2.5D' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sơ Đồ Kệ 2.5D</span>
          </button>
        </div>
      </div>

      {/* Zone Selector + Camera + Zoom Bar */}
      <div className="px-5 py-2.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 bg-[#08192c]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Chọn Buồng Lạnh:</span>
          {zones.map((z) => {
            const isSel = activeZone?.id === z.id;
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => {
                  setSelectedZoneId(z.id);
                  setSelectedBinId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  isSel
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{z.zoneCode}</span>
                <span className="font-mono text-[10px] opacity-85">
                  ({Math.round(z.usedKg)}/{Math.round(z.capacityKg)} kg)
                </span>
              </button>
            );
          })}
        </div>

        {viewMode === '3D' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(CAMERA_PRESETS) as CameraPreset[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  preset === key
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {CAMERA_PRESETS[key].label}
              </button>
            ))}

            <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-700">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.85, Number((z + 0.14).toFixed(2))))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.55, Number((z - 0.14).toFixed(2))))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyPreset('OVERVIEW')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Đặt lại góc nhìn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowMist((v) => !v)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition cursor-pointer ${
                showMist
                  ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400'
              }`}
            >
              <Snowflake className="w-3.5 h-3.5" />
              <span>Khí Lạnh</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Viewport + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 relative min-h-[480px]">
          {viewMode === '3D' ? (
            <>
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseDown={(e) => {
                dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
              }}
              onMouseMove={(e) => {
                if (!dragRef.current.active) return;
                const dx = e.clientX - dragRef.current.lastX;
                const dy = e.clientY - dragRef.current.lastY;
                dragRef.current.lastX = e.clientX;
                dragRef.current.lastY = e.clientY;
                setYaw((prev) => prev + dx * 0.008);
                setPitch((prev) => Math.max(0.1, Math.min(1.42, prev + dy * 0.006)));
              }}
              onMouseUp={() => {
                dragRef.current.active = false;
              }}
              onMouseLeave={() => {
                dragRef.current.active = false;
              }}
              className="w-full h-[500px] block cursor-grab active:cursor-grabbing"
            />

            {/* Overlay cảm biến Nhiệt độ & Độ ẩm Realtime trong không gian 3D */}
            {activeZone && (() => {
              const live = zoneTelemetryMap?.[activeZone.zoneCode.toUpperCase()];
              const tempVal = live ? Number(live.temperature) : Number(((activeZone.tempMin + activeZone.tempMax) / 2).toFixed(1));
              const humVal = live ? Number(live.humidity) : activeZone.humidityTarget;
              const isAlert = Boolean(live?.alert);
              return (
                <div
                  className={`absolute top-3 left-3 rounded-2xl px-3.5 py-2.5 backdrop-blur-md shadow-lg text-xs space-y-1 pointer-events-none ${
                    isAlert
                      ? 'bg-rose-950/95 border-2 border-rose-400 ring-4 ring-rose-500/30 text-rose-100 animate-pulse shadow-rose-950/60'
                      : 'bg-slate-900/85 border border-sky-400/40 text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isAlert && (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-300 opacity-90" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-400" />
                      </span>
                    )}
                    <span className="font-mono font-black text-sky-300">{activeZone.zoneCode}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 font-bold">
                      {live?.source || 'BASELINE'}
                    </span>
                    {isAlert && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-black">
                        CẢNH BÁO
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 font-mono font-bold">
                    <span className="flex items-center gap-1 text-emerald-300">
                      <Thermometer className="w-3.5 h-3.5" />
                      {tempVal.toFixed(1)}°C
                    </span>
                    <span className="flex items-center gap-1 text-sky-300">
                      <Droplets className="w-3.5 h-3.5" />
                      {humVal.toFixed(1)}%
                    </span>
                  </div>
                  {isAlert && live?.alertMessage && (
                    <div className="text-[10px] text-rose-200 font-semibold max-w-[240px]">
                      {live.alertMessage}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Card nổi hiển thị hàng hóa bên trong thùng khi người dùng ấn vào thùng 3D */}
            {selectedCrate && (
              <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 bg-slate-900/95 backdrop-blur-md border border-amber-400/60 rounded-2xl p-4 shadow-2xl space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-700">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                      Hàng Hóa Bên Trong Thùng #{selectedCrate.crateIndex}/{selectedCrate.totalCrates}
                    </span>
                    <strong className="text-sm font-bold text-white block">
                      {selectedCrate.contract.product_name || 'Nông sản VietGAP'}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCrate(null)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Hợp đồng:</span>
                    <strong className="font-mono text-sky-300">{selectedCrate.contract.contract_code}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Vị trí kệ:</span>
                    <strong className="font-mono text-emerald-300">{selectedCrate.bin.binCode}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tổng sản lượng lô:</span>
                    <strong className="font-mono text-white">
                      {Number(
                        selectedCrate.contract.inbound_net_weight_kg ||
                          selectedCrate.contract.actual_harvest_weight_kg ||
                          selectedCrate.contract.offered_weight_kg ||
                          0
                      )}{' '}
                      kg ({selectedCrate.contract.package_count || selectedCrate.totalCrates} thùng)
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Quy cách đóng gói:</span>
                    <strong className="text-slate-200">
                      {selectedCrate.contract.package_type || 'Thùng xốp niêm phong'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Nhà vườn:</span>
                    <span className="text-slate-200">{selectedCrate.contract.farmer_name || 'Nhà vườn'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Trạng thái QC:</span>
                    <strong className={
                      selectedCrate.contract.qc_status === 'QC_PASSED'
                        ? 'text-emerald-300'
                        : selectedCrate.contract.qc_status === 'QC_FAILED'
                        ? 'text-rose-400'
                        : 'text-amber-300'
                    }>
                      {selectedCrate.contract.qc_status === 'QC_PASSED'
                        ? 'Đạt chuẩn QC'
                        : selectedCrate.contract.qc_status === 'QC_FAILED'
                        ? 'Không đạt QC'
                        : 'Chờ / Đang QC'}
                    </strong>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-800">
                    <span className="text-slate-400 block">Tiến độ lưu kho & Hạn giao Buyer:</span>
                    {(() => {
                      const u = getContractStorageUrgency(selectedCrate.contract);
                      return (
                        <strong className={
                          u.level === 'LATE'
                            ? 'text-rose-400'
                            : u.level === 'WARNING'
                            ? 'text-amber-300'
                            : 'text-emerald-300'
                        }>
                          {u.label}{u.targetDateStr ? ` (Hạn nhận: ${u.targetDateStr})` : ''}
                        </strong>
                      );
                    })()}
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={buildQrImageUrl(
                          buildCrateQrPayload(
                            selectedCrate.contract.contract_code,
                            selectedCrate.bin.binCode,
                            selectedCrate.crateIndex
                          ),
                          72
                        )}
                        alt="QR thùng hàng"
                        className="w-12 h-12 rounded-lg bg-white p-0.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 block">Mã Barcode / Tem Thùng:</span>
                        <strong className="font-mono text-xs text-emerald-300 block">
                          {buildCrateBarcodeCode(selectedCrate.contract.contract_code, selectedCrate.crateIndex)}
                        </strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        printCrateLabels(
                          [
                            {
                              contractCode: selectedCrate.contract.contract_code,
                              productName: selectedCrate.contract.product_name || 'Nông sản VietGAP',
                              buyerName: selectedCrate.contract.buyer_company || selectedCrate.contract.buyer_name || 'Khách sỉ HoNa',
                              zoneName: activeZone?.zoneName,
                              binCode: selectedCrate.bin.binCode,
                              crateIndex: selectedCrate.crateIndex,
                              totalCrates: selectedCrate.totalCrates,
                              weightKg: Number(
                                selectedCrate.contract.inbound_net_weight_kg ||
                                  selectedCrate.contract.actual_harvest_weight_kg ||
                                  selectedCrate.contract.offered_weight_kg ||
                                  0
                              ),
                            },
                          ],
                          `Tem Thùng #${selectedCrate.crateIndex} · ${selectedCrate.contract.contract_code}`
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>In Tem QR/Barcode</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
              {binRacks.map(({ bin, usedKg, maxKg, lotCount }) => {
                const isSel = activeBinRack?.bin.id === bin.id;
                const pct = maxKg > 0 ? Math.min(100, Math.round((usedKg / maxKg) * 100)) : 0;
                return (
                  <div
                    key={bin.id}
                    onClick={() => {
                      setSelectedBinId(bin.id);
                      if (activeZone) onSelectBin?.(bin, activeZone);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition space-y-2.5 ${
                      isSel
                        ? 'bg-sky-950/70 border-sky-400'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-sky-300">
                        {bin.binCode} ({bin.rackCode})
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {lotCount} lô · {Math.round(usedKg)}/{Math.round(maxKg)} kg ({pct}%)
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((tier) => {
                        const filled = usedKg > 0 && pct >= (tier - 1) * 25;
                        return (
                          <div
                            key={tier}
                            className={`p-2 rounded-lg border text-center text-[10px] font-bold ${
                              filled
                                ? 'border-amber-500/50 bg-amber-500/20 text-amber-200'
                                : 'border-slate-700 bg-slate-800/40 text-slate-500'
                            }`}
                          >
                            Tầng {tier}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Side Inspector: Chi tiết Bin & Các Lô Hàng Trong Kệ */}
        <div className="border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#091a2e] p-4 space-y-3 max-h-[500px] overflow-y-auto">
          {activeZone ? (
            <>
              <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-sky-400 block">
                    {activeZone.zoneCode} · {activeZone.tempMin}°C–{activeZone.tempMax}°C
                  </span>
                  <h4 className="text-sm font-black text-white">
                    {activeBinRack ? `Kệ ${activeBinRack.bin.binCode} (4 Tầng)` : activeZone.zoneName}
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-sky-300">
                  {Math.round(activeZone.usedKg)} / {Math.round(activeZone.capacityKg)} kg
                </span>
              </div>

              <div className="space-y-2.5">
                {binRacks.map(({ bin }) => {
                  const isBinSel = activeBinRack?.bin.id === bin.id;
                  const pct = Math.min(100, Math.round(Number(bin.utilizationPct || 0)));
                  return (
                    <div
                      key={bin.id}
                      onClick={() => {
                        setSelectedBinId(bin.id);
                        onSelectBin?.(bin, activeZone);
                      }}
                      className={`p-3 rounded-2xl border transition cursor-pointer space-y-2 ${
                        isBinSel
                          ? 'bg-slate-800/90 border-sky-400'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <strong className="font-mono text-white">
                          {bin.binCode} <span className="text-slate-400 font-normal">({bin.rackCode})</span>
                        </strong>
                        {bin.status !== 'ACTIVE' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 flex items-center gap-1">
                            <Wrench className="w-3 h-3" /> Bảo trì
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] text-emerald-300">
                            {Math.round(bin.usedKg)} / {Math.round(bin.maxWeightKg)} kg ({pct}%)
                          </span>
                        )}
                      </div>

                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pct >= 85 ? 'bg-rose-500' : pct > 0 ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {bin.contracts && bin.contracts.length > 0 ? (
                        <div className="space-y-1.5 pt-1">
                          {bin.contracts.map((c: any) => {
                            const isContractSel = highlightedContractCode === c.contract_code;
                            return (
                              <div
                                key={c.id}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setSelectedBinId(bin.id);
                                  setHighlightedContractCode((prev) =>
                                    prev === c.contract_code ? null : c.contract_code
                                  );
                                }}
                                title="Bấm để tô xanh các thùng của đơn này trên sơ đồ 3D"
                                className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-[11px] cursor-pointer transition-all ${
                                  isContractSel
                                    ? 'bg-emerald-950/80 border-emerald-400 ring-1 ring-emerald-400/70'
                                    : 'bg-slate-950/70 border-slate-800 hover:border-emerald-500/60'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className={`font-mono font-bold flex items-center gap-1.5 ${isContractSel ? 'text-emerald-300' : 'text-amber-300'}`}>
                                    <Package className="w-3 h-3 shrink-0" />
                                    <span>{c.contract_code}</span>
                                    {isContractSel && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-sans">
                                        Đang tô xanh 3D
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-slate-300 truncate">
                                    {c.product_name} ·{' '}
                                    <strong className="text-white">
                                      {Number(c.inbound_net_weight_kg || c.actual_harvest_weight_kg || c.offered_weight_kg || 0)} kg
                                    </strong>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      const pkgs = Math.max(1, Number(c.package_count || 7));
                                      const totalW = Number(c.inbound_net_weight_kg || c.actual_harvest_weight_kg || c.offered_weight_kg || 0);
                                      const items = Array.from({ length: pkgs }, (_, idx) => ({
                                        contractCode: c.contract_code,
                                        productName: c.product_name || 'Nông sản VietGAP',
                                        buyerName: c.buyer_company || c.buyer_name || 'Khách sỉ HoNa',
                                        zoneName: activeZone?.zoneName,
                                        binCode: bin.binCode,
                                        crateIndex: idx + 1,
                                        totalCrates: pkgs,
                                        weightKg: totalW,
                                      }));
                                      printCrateLabels(items, `Tem QR & Barcode · ${c.contract_code} (${pkgs} thùng)`);
                                    }}
                                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                    title="In trọn bộ tem QR & Barcode cho tất cả thùng của đơn này"
                                  >
                                    <QrCode className="w-3 h-3" />
                                    <span>In Tem</span>
                                  </button>
                                  {onMoveContract && (
                                    <button
                                      type="button"
                                      onClick={(ev) => {
                                        ev.stopPropagation();
                                        onMoveContract(c, bin);
                                      }}
                                      className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                      title="Chuyển lô hàng sang ô kệ khác"
                                    >
                                      <ArrowRightLeft className="w-3 h-3" />
                                      <span>Chuyển</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">Kệ đang trống</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400">Chưa có dữ liệu kệ lưu trữ cho Zone này.</p>
          )}
        </div>
      </div>
    </div>
  );
}
