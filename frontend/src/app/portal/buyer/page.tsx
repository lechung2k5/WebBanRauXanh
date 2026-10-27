'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import B2BNegotiationModal from '@/components/B2BNegotiationModal';
import { Product } from '@/types';
import { getProducts, getStoredUser, getBuyerContractsApi, getBuyerTelemetryApi, getBuyerQcReportApi } from '@/services/api';
import { Search, LayoutDashboard, PackageSearch, ShieldCheck, RefreshCw, CreditCard, Thermometer, Droplets, Truck, CheckCircle2, PenLine, FileText, Upload, Download, MessageSquareQuote, Send, Check } from 'lucide-react';

export default function BuyerPortalPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [rfqCount, setRfqCount] = useState(0);
  const [activeSection, setActiveSection] = useState<'lots' | 'negotiation' | 'escrow' | 'qc' | 'telemetry' | 'epod' | 'invoices'>('lots');
  const [escrowProduct, setEscrowProduct] = useState<Product | null>(null);
  const [depositPaid, setDepositPaid] = useState(false);
  const [telemetry, setTelemetry] = useState({ temperature: 4.2, humidity: 82, updatedAt: '' });
  const [receivedWeight, setReceivedWeight] = useState(4800);
  const [epodSigned, setEpodSigned] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [finalPaid, setFinalPaid] = useState(false);
  const signatureRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [contracts, setContracts] = useState<Array<{ id: number; contractCode: string; totalAmount: number; depositAmount: number; status: string; depositStatus: string }>>([]);
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [qcReports, setQcReports] = useState<Array<Record<string, unknown>>>([]);
  const [telemetrySource, setTelemetrySource] = useState<'api' | 'demo'>('demo');
  const [selectedNegotiation, setSelectedNegotiation] = useState('RFQ-20261026-001');
  const [negotiationMessage, setNegotiationMessage] = useState('');

  const mockNegotiations = [
    { code: 'RFQ-20261026-001', product: 'Cà chua Beef Đà Lạt', supplier: 'HTX Nông nghiệp Đơn Dương', quantity: '3.500 kg', offer: '13.500 đ/kg', counter: '13.200 đ/kg', status: 'Đang phản hồi', time: '10 phút trước' },
    { code: 'RFQ-20261025-014', product: 'Cải thảo VietGAP', supplier: 'Liên minh Rau Sạch Đà Lạt', quantity: '2.000 kg', offer: '9.800 đ/kg', counter: '10.000 đ/kg', status: 'Chờ Buyer xác nhận', time: 'Hôm qua' },
    { code: 'RFQ-20261024-007', product: 'Khoai tây vàng', supplier: 'LangBiang Farm', quantity: '5.000 kg', offer: '18.000 đ/kg', counter: '—', status: 'Đã gửi RFQ', time: '2 ngày trước' },
  ];
  const currentNegotiation = mockNegotiations.find((item) => item.code === selectedNegotiation) || mockNegotiations[0];

  useEffect(() => {
    const user = getStoredUser();
    if (!user || !user.roles?.includes('ROLE_BUYER')) {
      router.replace('/dang-nhap?redirect=/portal/buyer');
      return;
    }
    try {
      setRfqCount(JSON.parse(localStorage.getItem('b2b_rfq_history') || '[]').length);
    } catch {}
  }, [router]);

  useEffect(() => {
    getBuyerContractsApi().then((items) => {
      setContracts(items);
      if (items.length > 0) setSelectedContractId(items[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const loadLots = async () => {
      setLoading(true);
      const result = await getProducts({ keyword: keyword || undefined, categorySlug: category === 'ALL' ? undefined : category, status: 'OPEN', size: 24 });
      setProducts(result.products);
      setLoading(false);
    };
    loadLots();
  }, [keyword, category]);

  useEffect(() => {
    if (activeSection !== 'telemetry') return;
    const loadTelemetry = async () => {
      if (selectedContractId) {
        try {
          const items = await getBuyerTelemetryApi(selectedContractId);
          const latest = items[0];
          if (latest) {
            setTelemetry({ temperature: Number(latest.temperature), humidity: Number(latest.humidity), updatedAt: latest.recordedAt });
            setTelemetrySource('api');
            return;
          }
        } catch {}
      }
      setTelemetry({ temperature: Number((3.4 + Math.random() * 2).toFixed(1)), humidity: Math.round(78 + Math.random() * 10), updatedAt: new Date().toISOString() });
      setTelemetrySource('demo');
    };
    loadTelemetry();
    const timer = window.setInterval(loadTelemetry, 4000);
    return () => window.clearInterval(timer);
  }, [activeSection, selectedContractId]);

  useEffect(() => {
    if (activeSection !== 'qc' || !selectedContractId) return;
    getBuyerQcReportApi(selectedContractId).then(setQcReports).catch(() => setQcReports([]));
  }, [activeSection, selectedContractId]);

  const stats = useMemo(() => ({
    lots: products.length,
    available: products.reduce((sum, product) => sum + (product.availableVolume || product.stockQuantity || 0), 0),
    regions: new Set(products.map((product) => product.regionName || product.region || product.farmLocation).filter(Boolean)).size,
  }), [products]);

  return (
    <div className="min-h-screen bg-[#F5FAFC] flex flex-col">
      <Header />
      <main className="max-w-[1240px] mx-auto px-4 py-8 w-full flex-1">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <aside className="w-full lg:w-64 bg-[#0C4A6E] text-white rounded-3xl p-5 lg:sticky lg:top-24">
            <div className="flex items-center gap-2 mb-7"><LayoutDashboard className="w-5 h-5 text-[#7DD3FC]" /><span className="font-bold">Buyer Portal</span></div>
            <nav className="space-y-2 text-sm">
              <button type="button" onClick={() => setActiveSection('lots')} className={`w-full text-left px-3 py-2.5 rounded-xl font-bold ${activeSection === 'lots' ? 'bg-white/15' : 'text-blue-100 hover:bg-white/10'}`}>Tổng quan & Nguồn cung</button>
              <div className="px-3 py-2.5 rounded-xl text-blue-100 flex justify-between"><span>RFQ của tôi</span><span>{rfqCount}</span></div>
              <button type="button" onClick={() => setActiveSection('negotiation')} className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 ${activeSection === 'negotiation' ? 'bg-white/15 font-bold' : 'text-blue-100 hover:bg-white/10'}`}><MessageSquareQuote className="w-4 h-4" /> Phòng đàm phán</button>
              <button type="button" onClick={() => setActiveSection('escrow')} className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 ${activeSection === 'escrow' ? 'bg-white/15 font-bold' : 'text-blue-100 hover:bg-white/10'}`}><CreditCard className="w-4 h-4" /> Ký quỹ VietQR 30%</button>
              <button type="button" onClick={() => setActiveSection('telemetry')} className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 ${activeSection === 'telemetry' ? 'bg-white/15 font-bold' : 'text-blue-100 hover:bg-white/10'}`}><Truck className="w-4 h-4" /> Theo dõi xe lạnh IoT</button>
              <button type="button" onClick={() => setActiveSection('qc')} className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 ${activeSection === 'qc' ? 'bg-white/15 font-bold' : 'text-blue-100 hover:bg-white/10'}`}><ShieldCheck className="w-4 h-4" /> Báo cáo kiểm định QC</button>
              <button type="button" onClick={() => setActiveSection('epod')} className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 ${activeSection === 'epod' ? 'bg-white/15 font-bold' : 'text-blue-100 hover:bg-white/10'}`}><PenLine className="w-4 h-4" /> Ký nhận ePOD</button>
              <button type="button" onClick={() => setActiveSection('invoices')} className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 ${activeSection === 'invoices' ? 'bg-white/15 font-bold' : 'text-blue-100 hover:bg-white/10'}`}><FileText className="w-4 h-4" /> Hóa đơn & chứng từ</button>
              <Link href="/san-pham" className="block px-3 py-2.5 rounded-xl text-blue-100 hover:bg-white/10">Xem sàn nông sản</Link>
            </nav>
            <div className="mt-8 pt-5 border-t border-white/15 text-xs text-blue-100 space-y-3">
              <p className="flex gap-2"><ShieldCheck className="w-4 h-4 shrink-0 text-[#FDBA74]" /> Nguồn hàng được kiểm duyệt</p>
              <p className="flex gap-2"><PackageSearch className="w-4 h-4 shrink-0 text-[#FDBA74]" /> Giá sỉ theo sản lượng</p>
            </div>
          </aside>

          <section className="flex-1 min-w-0 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div><p className="text-xs font-bold text-[#0284C7] uppercase tracking-wider">ROLE BUYER / B2B</p><h1 className="font-heading text-2xl sm:text-3xl font-black text-[#0C4A6E] mt-1">Nguồn cung nông sản sỉ</h1><p className="text-sm text-slate-500 mt-1">Tìm lô hàng phù hợp và gửi đề xuất giá trực tiếp tới nông trại/HTX.</p></div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs"><div className="bg-sky-50 rounded-xl px-3 py-2"><b className="block text-lg text-[#0C4A6E]">{stats.lots}</b>Lô đang mở</div><div className="bg-sky-50 rounded-xl px-3 py-2"><b className="block text-lg text-[#0C4A6E]">{stats.available.toLocaleString('vi-VN')}</b>Kg sẵn có</div><div className="bg-sky-50 rounded-xl px-3 py-2"><b className="block text-lg text-[#0C4A6E]">{stats.regions}</b>Vùng trồng</div></div>
              </div>
            </div>

            {activeSection === 'lots' && <div className="bg-white rounded-2xl p-4 border border-sky-100 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm tên nông sản, HTX, mã PUC..." className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-sky-500" /></div>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-44 px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700"><option value="ALL">Tất cả ngành hàng</option><option value="rau-sach">Rau ăn lá</option><option value="cu">Củ & quả</option><option value="nam-tuoi">Nấm tươi</option></select>
              <button type="button" onClick={() => { setKeyword(''); setCategory('ALL'); }} className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4" /> Xóa lọc</button>
            </div>}

            {activeSection === 'lots' && (loading ? <div className="py-16 text-center text-slate-500">Đang tải nguồn cung...</div> : products.length === 0 ? <div className="bg-white rounded-2xl p-12 text-center text-slate-500">Không tìm thấy lô nông sản phù hợp.</div> : <div className="space-y-4">{products.map((product) => <div key={product.id} className="relative"><ProductCard product={product} onNegotiate={setSelectedProduct} /><button type="button" onClick={() => { setEscrowProduct(product); setDepositPaid(false); setActiveSection('escrow'); }} className="absolute bottom-4 right-4 px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold shadow hover:bg-orange-600 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Xem QR cọc 30%</button></div>)}</div>)}

            {activeSection === 'negotiation' && <div className="bg-white rounded-3xl border border-sky-100 shadow-sm overflow-hidden"><div className="p-6 border-b border-slate-100"><p className="text-xs font-bold text-sky-600 uppercase tracking-wider">RFQ workspace · Bản mẫu</p><h2 className="font-heading text-2xl font-black text-[#0C4A6E] mt-1">Đàm phán hai chiều</h2><p className="text-sm text-slate-500 mt-1">Theo dõi đề xuất, phản giá và chốt điều kiện mua với nhà cung cấp.</p></div><div className="grid lg:grid-cols-[280px_1fr] min-h-[560px]"><div className="border-r border-slate-100 bg-slate-50 p-3 space-y-2">{mockNegotiations.map((item) => <button type="button" key={item.code} onClick={() => setSelectedNegotiation(item.code)} className={`w-full text-left p-3 rounded-2xl border transition-all ${selectedNegotiation === item.code ? 'bg-white border-sky-400 shadow-sm' : 'border-transparent hover:bg-white'}`}><div className="flex justify-between gap-2"><strong className="text-xs text-[#0C4A6E]">{item.code}</strong><span className="text-[10px] text-slate-400">{item.time}</span></div><p className="text-sm font-bold text-slate-700 mt-2">{item.product}</p><p className="text-[11px] text-slate-500 mt-1 truncate">{item.supplier}</p><div className="mt-2 flex items-center justify-between"><span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">{item.status}</span><span className="text-[10px] text-slate-500">{item.quantity}</span></div></button>)}</div><div className="flex flex-col"><div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="text-xs text-slate-500">Phiên đàm phán</p><h3 className="font-bold text-[#0C4A6E]">{currentNegotiation.product}</h3><p className="text-xs text-slate-500 mt-1">{currentNegotiation.supplier} · {currentNegotiation.quantity}</p></div><div className="text-right"><p className="text-xs text-slate-500">Giá đề xuất / phản giá</p><p className="font-black text-orange-600">{currentNegotiation.offer} → {currentNegotiation.counter}</p></div></div><div className="flex-1 p-5 space-y-4 bg-white"><div className="flex justify-end"><div className="max-w-[78%] p-3 rounded-2xl rounded-tr-sm bg-sky-100 text-sm text-slate-700"><p className="text-[10px] text-sky-700 font-bold mb-1">Bạn · Hôm nay 09:42</p>Chào HTX, Buyer đề xuất mua {currentNegotiation.quantity} với giá {currentNegotiation.offer}, giao về kho TP.HCM.</div></div><div className="flex justify-start"><div className="max-w-[78%] p-3 rounded-2xl rounded-tl-sm bg-slate-100 text-sm text-slate-700"><p className="text-[10px] text-slate-500 font-bold mb-1">{currentNegotiation.supplier} · Hôm nay 09:51</p>Cảm ơn Buyer. Với tiêu chuẩn VietGAP và vận chuyển lạnh, chúng tôi có thể phản giá {currentNegotiation.counter}. Giá đã bao gồm đóng gói tại trạm.</div></div><div className="flex justify-end"><div className="max-w-[78%] p-3 rounded-2xl rounded-tr-sm bg-sky-100 text-sm text-slate-700"><p className="text-[10px] text-sky-700 font-bold mb-1">Hệ thống · Demo</p>Đây là phiên đàm phán mẫu. Tin nhắn chưa được gửi lên backend.</div></div></div><div className="p-4 border-t border-slate-100 bg-slate-50"><div className="flex gap-2"><input value={negotiationMessage} onChange={(e) => setNegotiationMessage(e.target.value)} placeholder="Nhập phản hồi cho nhà cung cấp..." className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:outline-none focus:border-sky-500" /><button type="button" onClick={() => { setNegotiationMessage(''); alert('Tin nhắn đã được thêm vào bản demo.'); }} className="px-4 rounded-xl bg-[#0C4A6E] text-white font-bold text-sm flex items-center gap-2"><Send className="w-4 h-4" /> Gửi</button></div><div className="mt-3 flex flex-col sm:flex-row gap-2"><button type="button" onClick={() => alert('Đã chấp nhận giá phản hồi trong bản demo.')} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Chấp nhận giá {currentNegotiation.counter}</button><button type="button" onClick={() => alert('Đã mở form gửi giá đề xuất mới trong bản demo.')} className="px-4 py-2.5 rounded-xl border border-sky-300 text-sky-700 text-xs font-bold">Gửi counter-offer mới</button></div></div></div></div></div>}

            {activeSection === 'escrow' && <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm space-y-5">
              <div><p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Escrow / VietQR giả lập</p><h2 className="font-heading text-2xl font-black text-[#0C4A6E] mt-1">Ký quỹ bảo chứng 30%</h2><p className="text-sm text-slate-500 mt-1">Tiền cọc được giữ tại tài khoản trung gian cho tới khi hàng được nghiệm thu.</p></div>
              {!escrowProduct ? <div className="grid md:grid-cols-2 gap-3">{products.slice(0, 6).map((product) => <button type="button" key={product.id} onClick={() => { setEscrowProduct(product); setDepositPaid(false); }} className="text-left p-4 border border-slate-200 rounded-2xl hover:border-orange-400"><p className="font-bold text-[#0C4A6E]">{product.name}</p><p className="text-xs text-slate-500 mt-1">{product.farmName || 'HTX liên kết'} · MOQ {product.moq || 500} kg</p><p className="text-sm font-black text-orange-600 mt-2">Chọn lô để tạo QR</p></button>)}</div> : <div className="grid md:grid-cols-2 gap-6 items-center"><div className="space-y-3"><button type="button" onClick={() => setEscrowProduct(null)} className="text-xs text-sky-700 hover:underline">← Chọn lô khác</button><h3 className="font-bold text-lg text-[#0C4A6E]">{escrowProduct.name}</h3><p className="text-sm text-slate-500">Giá tham chiếu: {new Intl.NumberFormat('vi-VN').format(escrowProduct.price)} đ/kg</p><div className="p-4 rounded-2xl bg-orange-50 border border-orange-100"><p className="text-xs text-slate-500">Giá trị tạm tính theo MOQ</p><p className="text-xl font-black text-[#0C4A6E]">{new Intl.NumberFormat('vi-VN').format((escrowProduct.price || 0) * (escrowProduct.moq || 500))} đ</p><p className="text-sm font-bold text-orange-600 mt-1">Cọc 30%: {new Intl.NumberFormat('vi-VN').format(Math.round((escrowProduct.price || 0) * (escrowProduct.moq || 500) * 0.3))} đ</p></div><button type="button" onClick={() => { setDepositPaid(true); localStorage.setItem(`b2b_escrow_${escrowProduct.id}`, 'PAID'); }} className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm">{depositPaid ? 'Đã xác nhận thanh toán giả lập' : 'Giả lập đã quét và thanh toán QR'}</button></div><div className="text-center"><img src={`https://api.vietqr.io/image/970422-0987654321-compact2.jpg?amount=${Math.round((escrowProduct.price || 0) * (escrowProduct.moq || 500) * 0.3)}&addInfo=COC%20${escrowProduct.id}`} alt="VietQR cọc 30%" className="w-56 h-56 mx-auto object-contain rounded-2xl border border-slate-200" /><p className="text-xs text-slate-500 mt-2">MB Bank · STK 0987654321</p><p className={`text-xs font-bold mt-2 ${depositPaid ? 'text-emerald-600' : 'text-orange-600'}`}>{depositPaid ? 'Đã cọc · Tiền đang được bảo chứng' : 'Chưa thanh toán · Chờ xác nhận'}</p></div></div>}
            </div>}

            {activeSection === 'telemetry' && <div className="space-y-5"><div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm"><div className="flex justify-between items-start"><div><p className="text-xs font-bold text-sky-600 uppercase tracking-wider">Cold-chain monitoring</p><h2 className="font-heading text-2xl font-black text-[#0C4A6E] mt-1">Theo dõi xe lạnh IoT</h2><p className="text-sm text-slate-500 mt-1">Nguồn dữ liệu: {telemetrySource === 'api' ? 'Backend IoT' : 'Demo vì chưa có bản ghi'}</p></div><span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Đang kết nối</span></div><div className="my-4"><select value={selectedContractId || ''} onChange={(e) => setSelectedContractId(Number(e.target.value) || null)} className="w-full sm:w-80 rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Chọn hợp đồng theo dõi</option>{contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.contractCode} · {contract.status}</option>)}</select></div><div className="grid sm:grid-cols-3 gap-4 mt-6"><div className="p-4 rounded-2xl bg-sky-50"><Thermometer className="w-5 h-5 text-sky-600" /><p className="text-xs text-slate-500 mt-2">Nhiệt độ hiện tại</p><p className="text-2xl font-black text-[#0C4A6E]">{telemetry.temperature}°C</p><p className="text-xs text-emerald-600 font-bold">Ngưỡng an toàn 2–6°C</p></div><div className="p-4 rounded-2xl bg-sky-50"><Droplets className="w-5 h-5 text-sky-600" /><p className="text-xs text-slate-500 mt-2">Độ ẩm</p><p className="text-2xl font-black text-[#0C4A6E]">{telemetry.humidity}%</p><p className="text-xs text-slate-500">Cập nhật liên tục</p></div><div className="p-4 rounded-2xl bg-emerald-50"><CheckCircle2 className="w-5 h-5 text-emerald-600" /><p className="text-xs text-slate-500 mt-2">Trạng thái xe</p><p className="text-lg font-black text-emerald-700">{telemetry.temperature >= 2 && telemetry.temperature <= 6 ? 'Bình thường' : 'Cảnh báo nhiệt độ'}</p><p className="text-xs text-slate-500">Cập nhật {telemetry.updatedAt ? new Date(telemetry.updatedAt).toLocaleTimeString('vi-VN') : '—'}</p></div></div></div><div className="bg-white rounded-3xl p-6 border border-sky-100"><div className="flex items-center gap-2 text-sm font-bold text-[#0C4A6E]"><Truck className="w-4 h-4" /> Chuyến xe đang theo dõi</div><div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50"><div><p className="font-bold text-sm">Xe lạnh 51D-246.88 · Tuyến Đà Lạt → Kho Buyer</p><p className="text-xs text-slate-500 mt-1">Đang vận chuyển · ETA dự kiến 2 giờ 15 phút</p></div><span className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">An toàn</span></div></div></div>}

            {activeSection === 'qc' && <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-5"><div><p className="text-xs font-bold text-sky-600 uppercase tracking-wider">Hub QC</p><h2 className="font-heading text-2xl font-black text-[#0C4A6E] mt-1">Báo cáo kiểm định</h2><p className="text-sm text-slate-500 mt-1">Dữ liệu được lấy từ backend theo hợp đồng.</p></div><select value={selectedContractId || ''} onChange={(e) => setSelectedContractId(Number(e.target.value) || null)} className="w-full sm:w-80 rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Chọn hợp đồng</option>{contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.contractCode}</option>)}</select>{!selectedContractId ? <p className="text-sm text-slate-500">Chưa có hợp đồng để xem báo cáo QC.</p> : qcReports.length === 0 ? <p className="text-sm text-slate-500">Chưa có bản ghi kiểm định.</p> : <div className="space-y-3">{qcReports.map((report, index) => <div key={index} className="grid sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 text-sm"><div><span className="text-xs text-slate-500">Khối lượng nhận</span><strong className="block">{String(report.receivedWeightKg)} kg</strong></div><div><span className="text-xs text-slate-500">Đạt chuẩn</span><strong className="block text-emerald-700">{String(report.qualifiedWeightKg)} kg</strong></div><div><span className="text-xs text-slate-500">Loại</span><strong className="block text-orange-600">{String(report.rejectedWeightKg)} kg</strong></div><div><span className="text-xs text-slate-500">Brix / Độ ẩm</span><strong className="block">{String(report.brixDegree ?? '—')} / {String(report.moisturePercent ?? '—')}</strong></div></div>)}</div>}</div>}

            {activeSection === 'epod' && <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-5"><div><p className="text-xs font-bold text-sky-600 uppercase tracking-wider">Electronic Proof of Delivery</p><h2 className="font-heading text-2xl font-black text-[#0C4A6E] mt-1">Ký nhận hàng ePOD</h2><p className="text-sm text-slate-500 mt-1">Kiểm đếm thực nhận, ký xác nhận và đính kèm ảnh hàng hóa.</p></div><div className="grid sm:grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-700 mb-1.5">Khối lượng thực nhận (kg)</label><input type="number" min="0" value={receivedWeight} onChange={(e) => setReceivedWeight(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm focus:outline-none focus:border-sky-500" /><p className="text-xs text-slate-500 mt-1">Khối lượng theo chuyến: 5.000 kg</p></div><div><label className="block text-xs font-bold text-slate-700 mb-1.5">Ảnh đối chứng hàng hóa</label><label className="flex items-center justify-center gap-2 h-[48px] rounded-xl border border-dashed border-sky-300 bg-sky-50 text-sm font-bold text-sky-700 cursor-pointer"><Upload className="w-4 h-4" /> {proofImage ? 'Đã chọn ảnh' : 'Chọn ảnh'}<input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setProofImage(URL.createObjectURL(file)); }} /></label></div></div><div><div className="flex items-center justify-between mb-2"><label className="text-xs font-bold text-slate-700">Chữ ký điện tử</label><button type="button" onClick={() => { const canvas = signatureRef.current; const context = canvas?.getContext('2d'); if (canvas && context) { context.clearRect(0, 0, canvas.width, canvas.height); } }} className="text-xs text-sky-700 hover:underline">Xóa chữ ký</button></div><canvas ref={signatureRef} width={700} height={180} onMouseDown={(e) => { const canvas = signatureRef.current; if (!canvas) return; const rect = canvas.getBoundingClientRect(); const context = canvas.getContext('2d'); if (!context) return; context.beginPath(); context.moveTo((e.clientX - rect.left) * canvas.width / rect.width, (e.clientY - rect.top) * canvas.height / rect.height); setIsDrawing(true); }} onMouseMove={(e) => { if (!isDrawing) return; const canvas = signatureRef.current; if (!canvas) return; const rect = canvas.getBoundingClientRect(); const context = canvas.getContext('2d'); if (!context) return; context.lineWidth = 3; context.strokeStyle = '#0C4A6E'; context.lineTo((e.clientX - rect.left) * canvas.width / rect.width, (e.clientY - rect.top) * canvas.height / rect.height); context.stroke(); }} onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)} className="w-full h-36 border border-dashed border-slate-300 rounded-2xl bg-slate-50 cursor-crosshair" /></div>{proofImage && <img src={proofImage} alt="Ảnh đối chứng" className="w-32 h-24 object-cover rounded-xl border border-slate-200" />}<div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 text-sm"><div className="flex justify-between"><span>Hao hụt ghi nhận</span><strong>{Math.max(0, 5000 - receivedWeight).toLocaleString('vi-VN')} kg</strong></div><div className="flex justify-between mt-1"><span>Tỷ lệ hao hụt</span><strong>{((Math.max(0, 5000 - receivedWeight) / 5000) * 100).toFixed(1)}%</strong></div></div><button type="button" onClick={() => { setEpodSigned(true); localStorage.setItem('b2b_epod_status', 'SIGNED'); }} className="w-full py-3 rounded-xl bg-[#0C4A6E] hover:bg-[#083B59] text-white font-bold text-sm">{epodSigned ? 'Đã ký ePOD thành công' : 'Ký xác nhận ePOD'}</button></div>}

            {activeSection === 'invoices' && <div className="space-y-5"><div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm"><p className="text-xs font-bold text-sky-600 uppercase tracking-wider">Final settlement</p><h2 className="font-heading text-2xl font-black text-[#0C4A6E] mt-1">Thanh toán 70% còn lại</h2><p className="text-sm text-slate-500 mt-1">Số tiền được cấn trừ theo khối lượng thực nhận trên ePOD.</p><div className="mt-5 grid sm:grid-cols-3 gap-3 text-sm"><div className="p-4 rounded-2xl bg-slate-50"><span className="text-slate-500 text-xs">Giá trị hợp đồng</span><strong className="block mt-1 text-[#0C4A6E]">15.000.000 đ</strong></div><div className="p-4 rounded-2xl bg-orange-50"><span className="text-slate-500 text-xs">Đã cọc 30%</span><strong className="block mt-1 text-orange-600">4.500.000 đ</strong></div><div className="p-4 rounded-2xl bg-sky-50"><span className="text-slate-500 text-xs">Còn phải thanh toán</span><strong className="block mt-1 text-[#0C4A6E]">{new Intl.NumberFormat('vi-VN').format(Math.max(0, 10500000 - Math.max(0, 5000 - receivedWeight) * 3000))} đ</strong></div></div><div className="mt-5 flex flex-col sm:flex-row gap-5 items-center"><img src="https://api.vietqr.io/image/970422-0987654321-compact2.jpg?amount=10500000&addInfo=THANHTOAN%20HD2026" alt="VietQR thanh toán cuối" className="w-48 h-48 object-contain rounded-2xl border border-slate-200" /><div className="flex-1"><p className="text-sm font-bold text-[#0C4A6E]">Quét VietQR để thanh toán phần còn lại</p><p className="text-xs text-slate-500 mt-1">Đây là thanh toán giả lập, không phát sinh giao dịch thật.</p><button type="button" disabled={!epodSigned} onClick={() => { setFinalPaid(true); localStorage.setItem('b2b_final_payment', 'PAID'); }} className="mt-4 px-5 py-3 rounded-xl bg-orange-500 text-white text-sm font-bold disabled:opacity-40">{finalPaid ? 'Đã xác nhận thanh toán' : epodSigned ? 'Giả lập đã thanh toán 70%' : 'Cần ký ePOD trước'}</button></div></div></div><div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm"><h3 className="font-bold text-[#0C4A6E] flex items-center gap-2"><FileText className="w-4 h-4" /> Hóa đơn & chứng từ</h3><div className="mt-4 space-y-3"><div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50"><div><p className="text-sm font-bold">Hóa đơn GTGT dịch vụ sàn</p><p className="text-xs text-slate-500">HD-DV-2026-0001 · Bản demo</p></div><button type="button" onClick={() => alert('Chức năng tải hóa đơn sẽ được kết nối khi backend phát hành chứng từ.')} className="text-xs font-bold text-sky-700 flex items-center gap-1"><Download className="w-4 h-4" /> Tải xuống</button></div><div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50"><div><p className="text-sm font-bold">Bảng kê nguồn gốc nông sản</p><p className="text-xs text-slate-500">LOT-2026-001 · Bản demo</p></div><button type="button" onClick={() => alert('Chứng từ nguồn gốc đang ở chế độ giả lập.')} className="text-xs font-bold text-sky-700 flex items-center gap-1"><Download className="w-4 h-4" /> Tải xuống</button></div></div></div></div>}
          </section>
        </div>
      </main>
      <Footer />
      <B2BNegotiationModal product={selectedProduct} isOpen={Boolean(selectedProduct)} onClose={() => setSelectedProduct(null)} onSuccess={() => setRfqCount((count) => count + 1)} />
    </div>
  );
}
